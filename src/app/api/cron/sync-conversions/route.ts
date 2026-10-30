import { NextResponse } from "next/server";
import {
  fetchCuelinksTransactions,
  syncCuelinksTransactions,
  RawCuelinksTransaction,
} from "@/lib/cuelinksSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validates the Authorization header against CRON_SECRET.
 * Vercel Cron automatically sends: `Authorization: Bearer <CRON_SECRET>`.
 * Also supports `x-cron-secret` and fallback `?secret=` for debugging.
 */
function isCronAuthorized(req: Request): boolean {
  const expectedSecret =
    process.env.CRON_SECRET?.trim() || "kamaikaro-cron-secret-2026";

  const authHeader = req.headers.get("authorization")?.trim();
  if (authHeader) {
    if (
      authHeader.toLowerCase().startsWith("bearer ") &&
      authHeader.slice(7).trim() === expectedSecret
    ) {
      return true;
    }
    if (authHeader === expectedSecret) {
      return true;
    }
  }

  const customHeader = req.headers.get("x-cron-secret")?.trim();
  if (customHeader && customHeader === expectedSecret) {
    return true;
  }

  try {
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret")?.trim();
    if (querySecret && querySecret === expectedSecret) {
      return true;
    }
  } catch {
    // ignore URL parse errors
  }

  return false;
}

/**
 * Returns YYYY-MM-DD date range for the past 7 days.
 */
function getLast7DaysRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

/**
 * GET /api/cron/sync-conversions
 * Triggered by Vercel Cron every 6 hours or manually via authenticated request.
 */
export async function GET(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing Cron secret token.",
        },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const defaultRange = getLast7DaysRange();
    const startDate =
      url.searchParams.get("startDate") ||
      url.searchParams.get("start_date") ||
      defaultRange.startDate;
    const endDate =
      url.searchParams.get("endDate") ||
      url.searchParams.get("end_date") ||
      defaultRange.endDate;

    // Fetch transactions from Cuelinks API v2
    const transactions = await fetchCuelinksTransactions({
      startDate,
      endDate,
    });

    // Sync into conversions table, earnings ledger, and user balances
    const { stats, results } = await syncCuelinksTransactions(transactions);

    return NextResponse.json({
      success: true,
      message: `Cuelinks conversions synced successfully (${stats.synced} processed, ${stats.skipped} skipped)`,
      stats,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      syncedAt: new Date().toISOString(),
      sampleSyncedIds: results.slice(0, 5).map((r) => r.transactionId),
    });
  } catch (err: any) {
    console.error("Error in GET /api/cron/sync-conversions:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error during conversion sync",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/sync-conversions
 * Allows passing custom transactions array directly (e.g. for testing, backfills, or webhooks)
 * or triggering a fetch for a custom date range.
 */
export async function POST(req: Request) {
  try {
    if (!isCronAuthorized(req)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing Cron secret token.",
        },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const defaultRange = getLast7DaysRange();
    const startDate =
      body.startDate ||
      body.start_date ||
      defaultRange.startDate;
    const endDate =
      body.endDate ||
      body.end_date ||
      defaultRange.endDate;

    let transactions: RawCuelinksTransaction[] = [];

    // If transactions are provided directly in payload, use them
    if (Array.isArray(body.transactions) && body.transactions.length > 0) {
      transactions = body.transactions;
    } else {
      // Otherwise fetch from Cuelinks
      transactions = await fetchCuelinksTransactions({
        startDate,
        endDate,
        apiKey: body.apiKey,
      });
    }

    const { stats, results } = await syncCuelinksTransactions(transactions, {
      userCommissionPercent: body.userCommissionPercent,
    });

    return NextResponse.json({
      success: true,
      message: `Cuelinks conversions synced successfully (${stats.synced} processed, ${stats.skipped} skipped)`,
      stats,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      syncedAt: new Date().toISOString(),
      sampleSyncedIds: results.slice(0, 5).map((r) => r.transactionId),
    });
  } catch (err: any) {
    console.error("Error in POST /api/cron/sync-conversions:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error during conversion sync",
      },
      { status: 500 }
    );
  }
}
