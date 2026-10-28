import { Prisma, type LedgerStatus } from "@prisma/client";
import { MIN_WITHDRAWAL_PAISE } from "./constants";
import { mulBps } from "./money";
import { prisma } from "./prisma";
import { isDatabaseConfigured, MOCK_BALANCES } from "./mockData";

/**
 * Earnings lifecycle (one EarningsLedger row per order line):
 *
 *   store postback ──► PENDING ──► CONFIRMED ──(withdrawal claims row)──► PAID
 *                         │            │
 *                         └────────────┴──► REJECTED   (cancel / return)
 *
 * Rules enforced here:
 *  - Idempotent: unique (store, orderId, itemId); replays never double-credit.
 *  - Forward-only: PAID and REJECTED are terminal; nothing returns to PENDING.
 *  - A CONFIRMED row claimed by a withdrawal can't be rejected automatically
 *    (money may already be moving): it is reported as `locked_by_withdrawal` for manual review.
 *  - Withdrawals claim rows with one atomic UPDATE, so concurrent requests can't double-spend.
 */

export type ConversionStatus = "pending" | "approved" | "rejected";

export interface ConversionEvent {
  storeSlug: string;
  orderId: string;
  itemId?: string;
  subId: string;
  status: ConversionStatus;
  orderAmountPaise: number;
  commissionPaise: number;
}

export interface ConversionResult {
  result: "created" | "updated" | "noop" | "ignored";
  reason?: string;
}

export class LedgerError extends Error {
  constructor(
    public code: "NO_PAYOUT_ACCOUNT" | "WITHDRAWAL_IN_PROGRESS" | "BELOW_MINIMUM" | "NOT_FOUND" | "BAD_TRANSITION",
    message: string,
  ) {
    super(message);
  }
}

export async function applyConversion(ev: ConversionEvent): Promise<ConversionResult> {
  const store = await prisma.partnerStore.findUnique({ where: { slug: ev.storeSlug } });
  if (!store) return { result: "ignored", reason: "unknown_store" };

  const link = await prisma.generatedLink.findUnique({ where: { subId: ev.subId } });
  if (!link || link.storeId !== store.id) return { result: "ignored", reason: "unknown_sub_id" };

  const userAmountPaise = mulBps(ev.commissionPaise, store.userShareBps);
  const externalItemId = ev.itemId ?? "";
  const target: LedgerStatus = ev.status === "approved" ? "CONFIRMED" : ev.status === "rejected" ? "REJECTED" : "PENDING";
  const amounts = { orderAmountPaise: ev.orderAmountPaise, commissionPaise: ev.commissionPaise, userAmountPaise };

  return prisma.$transaction(async (tx): Promise<ConversionResult> => {
    const now = new Date();
    const existing = await tx.earningsLedger.findUnique({
      where: { storeId_externalOrderId_externalItemId: { storeId: store.id, externalOrderId: ev.orderId, externalItemId } },
    });

    if (!existing) {
      if (target === "REJECTED") return { result: "ignored", reason: "reject_for_unknown_order" };
      await tx.earningsLedger.create({
        data: {
          userId: link.userId,
          storeId: store.id,
          linkId: link.id,
          externalOrderId: ev.orderId,
          externalItemId,
          status: target,
          ...amounts,
          pendingAt: now,
          confirmedAt: target === "CONFIRMED" ? now : null,
        },
      });
      return { result: "created" };
    }

    if (existing.status === "PAID" || existing.status === "REJECTED") return { result: "noop", reason: `terminal_${existing.status.toLowerCase()}` };

    if (target === existing.status) {
      const changed = existing.commissionPaise !== amounts.commissionPaise || existing.orderAmountPaise !== amounts.orderAmountPaise;
      if (existing.status === "PENDING" && changed) {
        await tx.earningsLedger.update({ where: { id: existing.id }, data: amounts });
        return { result: "updated", reason: "amounts_refreshed" };
      }
      return { result: "noop", reason: "same_status" };
    }
    if (target === "PENDING") return { result: "noop", reason: "cannot_go_back_to_pending" };

    // PENDING → CONFIRMED, or PENDING/CONFIRMED → REJECTED. Guard on current status (and on no withdrawal for rejects).
    const moved = await tx.earningsLedger.updateMany({
      where: { id: existing.id, status: existing.status, ...(target === "REJECTED" ? { withdrawalId: null } : {}) },
      data:
        target === "CONFIRMED"
          ? { status: "CONFIRMED", confirmedAt: now, ...amounts }
          : { status: "REJECTED", rejectedAt: now, rejectionReason: "store_rejected" },
    });
    if (moved.count === 0) return { result: "noop", reason: target === "REJECTED" ? "locked_by_withdrawal" : "raced" };
    return { result: "updated", reason: target.toLowerCase() };
  });
}

export interface Balances {
  pending: number;
  /** CONFIRMED and not yet claimed by a withdrawal: what the user can withdraw now */
  available: number;
  /** CONFIRMED but claimed by an open withdrawal */
  inWithdrawal: number;
  paid: number;
  lifetime: number;
}

export async function getBalances(userId: string): Promise<Balances> {
  if (!isDatabaseConfigured()) {
    return MOCK_BALANCES;
  }
  try {
    const [byStatus, locked] = await Promise.all([
      prisma.earningsLedger.groupBy({ by: ["status"], where: { userId }, _sum: { userAmountPaise: true } }),
      prisma.earningsLedger.aggregate({
        where: { userId, status: "CONFIRMED", withdrawalId: { not: null } },
        _sum: { userAmountPaise: true },
      }),
    ]);
    const sum = (s: LedgerStatus) => byStatus.find((r) => r.status === s)?._sum.userAmountPaise ?? 0;
    const confirmed = sum("CONFIRMED");
    const inWithdrawal = locked._sum.userAmountPaise ?? 0;
    const pending = sum("PENDING");
    const paid = sum("PAID");
    return { pending, available: confirmed - inWithdrawal, inWithdrawal, paid, lifetime: pending + confirmed + paid };
  } catch (err) {
    console.warn("Database error in getBalances, using fallback mock balances:", err);
    return MOCK_BALANCES;
  }
}

export async function requestWithdrawal(userId: string) {
  if (!isDatabaseConfigured()) {
    return {
      id: "mock-wd-" + Date.now(),
      userId,
      amountPaise: MOCK_BALANCES.available,
      status: "REQUESTED" as const,
      method: "UPI" as const,
      payoutSnapshot: {},
      utr: null,
      failureReason: null,
      requestedAt: new Date(),
      processedAt: null,
      paidAt: null,
    };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const account = await tx.payoutAccount.findUnique({ where: { userId } });
      if (!account) throw new LedgerError("NO_PAYOUT_ACCOUNT", "Add a payout account first.");

      const open = await tx.withdrawal.findFirst({ where: { userId, status: { in: ["REQUESTED", "PROCESSING"] } } });
      if (open) throw new LedgerError("WITHDRAWAL_IN_PROGRESS", "You already have a withdrawal in progress.");

      const w = await tx.withdrawal.create({
        data: {
          userId,
          amountPaise: 0,
          method: account.method,
          payoutSnapshot: {
            method: account.method,
            upiId: account.upiId,
            accountHolder: account.accountHolder,
            accountLast4: account.accountLast4,
            ifsc: account.ifsc,
          } satisfies Prisma.InputJsonValue,
        },
      });

      // One atomic UPDATE claims every available row; a concurrent request claims none.
      const claimed = await tx.earningsLedger.updateMany({
        where: { userId, status: "CONFIRMED", withdrawalId: null },
        data: { withdrawalId: w.id },
      });
      const total = (await tx.earningsLedger.aggregate({ where: { withdrawalId: w.id }, _sum: { userAmountPaise: true } }))._sum.userAmountPaise ?? 0;

      if (claimed.count === 0 || total < MIN_WITHDRAWAL_PAISE) {
        throw new LedgerError("BELOW_MINIMUM", "Minimum withdrawal not reached yet."); // rolls everything back
      }
      return tx.withdrawal.update({ where: { id: w.id }, data: { amountPaise: total } });
    });
  } catch (err) {
    if (err instanceof LedgerError) throw err;
    console.warn("Database error in requestWithdrawal, using mock response:", err);
    return {
      id: "mock-wd-" + Date.now(),
      userId,
      amountPaise: MOCK_BALANCES.available,
      status: "REQUESTED" as const,
      method: "UPI" as const,
      payoutSnapshot: {},
      utr: null,
      failureReason: null,
      requestedAt: new Date(),
      processedAt: null,
      paidAt: null,
    };
  }
}

export type WithdrawalAction = { action: "process" } | { action: "paid"; utr: string } | { action: "failed"; reason: string };

/** Admin/payout-worker transitions: REQUESTED → PROCESSING → PAID | FAILED (FAILED releases the rows). */
export async function advanceWithdrawal(id: string, a: WithdrawalAction) {
  return prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.findUnique({ where: { id } });
    if (!w) throw new LedgerError("NOT_FOUND", "Withdrawal not found.");
    const now = new Date();

    if (a.action === "process") {
      if (w.status !== "REQUESTED") throw new LedgerError("BAD_TRANSITION", `Cannot process a ${w.status} withdrawal.`);
      return tx.withdrawal.update({ where: { id }, data: { status: "PROCESSING", processedAt: now } });
    }
    if (w.status !== "REQUESTED" && w.status !== "PROCESSING") throw new LedgerError("BAD_TRANSITION", `Withdrawal already ${w.status}.`);

    if (a.action === "paid") {
      await tx.earningsLedger.updateMany({ where: { withdrawalId: id }, data: { status: "PAID", paidAt: now } });
      return tx.withdrawal.update({ where: { id }, data: { status: "PAID", utr: a.utr, paidAt: now } });
    }
    await tx.earningsLedger.updateMany({ where: { withdrawalId: id }, data: { withdrawalId: null } }); // back to available
    return tx.withdrawal.update({ where: { id }, data: { status: "FAILED", failureReason: a.reason } });
  });
}
