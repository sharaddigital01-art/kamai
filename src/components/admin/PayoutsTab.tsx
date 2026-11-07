"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { MarkPaidModal } from "./MarkPaidModal";
import { RejectWithdrawalModal } from "./RejectWithdrawalModal";

export interface AdminWithdrawalData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amountPaise: number;
  status: "REQUESTED" | "PROCESSING" | "PAID" | "FAILED";
  method: string;
  upiId: string;
  accountHolder?: string | null;
  utr?: string | null;
  failureReason?: string | null;
  requestedAt: string;
  paidAt?: string | null;
}

interface PayoutsTabProps {
  withdrawals: AdminWithdrawalData[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onMarkPaid: (id: string, utr: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  actionLoading?: string | null;
}

export function PayoutsTab({
  withdrawals,
  loading,
  onRefresh,
  onMarkPaid,
  onReject,
  actionLoading,
}: PayoutsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "failed">("pending");
  const [markPaidTarget, setMarkPaidTarget] = useState<AdminWithdrawalData | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawalData | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  const pendingWithdrawals = withdrawals.filter(
    (w) => w.status === "REQUESTED" || w.status === "PROCESSING"
  );
  const paidWithdrawals = withdrawals.filter((w) => w.status === "PAID");
  const failedWithdrawals = withdrawals.filter((w) => w.status === "FAILED");

  const pendingTotalPaise = pendingWithdrawals.reduce((sum, w) => sum + (w.amountPaise || 0), 0);
  const paidTotalPaise = paidWithdrawals.reduce((sum, w) => sum + (w.amountPaise || 0), 0);
  const totalVolumePaise = withdrawals.reduce((sum, w) => sum + (w.amountPaise || 0), 0);

  const filteredWithdrawals = withdrawals.filter((w) => {
    // Status filter
    if (statusFilter === "pending" && w.status !== "REQUESTED" && w.status !== "PROCESSING") return false;
    if (statusFilter === "paid" && w.status !== "PAID") return false;
    if (statusFilter === "failed" && w.status !== "FAILED") return false;

    // Search query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (w.userName || "").toLowerCase().includes(q);
    const emailMatch = (w.userEmail || "").toLowerCase().includes(q);
    const upiMatch = (w.upiId || "").toLowerCase().includes(q);
    const utrMatch = (w.utr || "").toLowerCase().includes(q);

    return nameMatch || emailMatch || upiMatch || utrMatch;
  });

  const handleCopyUpi = (upi: string) => {
    navigator.clipboard.writeText(upi);
    setCopiedUpi(upi);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending UPI Payouts</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">
            {formatINR(pendingTotalPaise)}
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {pendingWithdrawals.length} request{pendingWithdrawals.length === 1 ? "" : "s"} waiting for UTR
          </p>
        </div>

        {/* Paid Card */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Payouts</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">
            {formatINR(paidTotalPaise)}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            {paidWithdrawals.length} successfully paid out
          </p>
        </div>

        {/* Total Volume */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Lifetime Volume</span>
            <CreditCard className="h-4 w-4 text-ink-muted" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink">
            {formatINR(totalVolumePaise)}
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {withdrawals.length} total withdrawal entries
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user, email, UPI ID, or UTR..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 rounded-xl bg-canvas p-1 border border-black/5">
            {(
              [
                {
                  id: "pending",
                  label: "Pending",
                  count: pendingWithdrawals.length,
                },
                {
                  id: "paid",
                  label: "Paid",
                  count: paidWithdrawals.length,
                },
                {
                  id: "failed",
                  label: "Rejected",
                  count: failedWithdrawals.length,
                },
                {
                  id: "all",
                  label: "All",
                  count: withdrawals.length,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  statusFilter === f.id
                    ? "bg-white text-ink shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>{f.label}</span>
                {f.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      f.id === "pending"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-neutral-200 text-ink-soft"
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50"
            title="Refresh Payouts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#169443]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="rounded-3xl border border-black/5 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-canvas/60 text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">UPI / Payout Account</th>
                <th className="py-3.5 px-4">Requested Date</th>
                <th className="py-3.5 px-4 text-right">Requested Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">UTR / Remarks</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm text-ink">No withdrawal requests found</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {statusFilter === "pending"
                        ? "Great job! All pending payouts are cleared."
                        : "Requests will appear here when partners withdraw."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => {
                  const isPending = w.status === "REQUESTED" || w.status === "PROCESSING";
                  const isPaid = w.status === "PAID";
                  const isFailed = w.status === "FAILED";

                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-canvas/40 transition group"
                    >
                      {/* User Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink">
                          {w.userName}
                        </div>
                        <div className="text-[11px] text-ink-soft truncate max-w-[160px]">
                          {w.userEmail}
                        </div>
                      </td>

                      {/* UPI ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1 font-mono text-[11px] font-semibold text-ink border border-black/5">
                          <span>{w.upiId || "No UPI"}</span>
                          {w.upiId && (
                            <button
                              type="button"
                              onClick={() => handleCopyUpi(w.upiId)}
                              className="text-ink-muted hover:text-ink transition p-0.5"
                              title="Copy UPI ID"
                            >
                              {copiedUpi === w.upiId ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {w.accountHolder && (
                          <div className="text-[10px] text-ink-muted mt-0.5">
                            Holder: {w.accountHolder}
                          </div>
                        )}
                      </td>

                      {/* Requested Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-ink-soft">
                        <div>
                          {new Date(w.requestedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {new Date(w.requestedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-display font-black text-sm text-ink">
                          {formatINR(w.amountPaise || 0)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : isPaid
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {isPending && <Clock className="h-2.5 w-2.5" />}
                          {isPaid && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {isFailed && <XCircle className="h-2.5 w-2.5" />}
                          <span>{w.status}</span>
                        </span>
                      </td>

                      {/* UTR / Remarks */}
                      <td className="py-3.5 px-4 text-xs">
                        {w.utr ? (
                          <div className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-block">
                            UTR: {w.utr}
                          </div>
                        ) : w.failureReason ? (
                          <div className="text-[11px] text-red-600 line-clamp-1" title={w.failureReason}>
                            Reason: {w.failureReason}
                          </div>
                        ) : (
                          <span className="text-ink-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setMarkPaidTarget(w)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#169443] hover:bg-[#134024] text-white px-2.5 py-1 text-xs font-bold transition shadow-xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Paid</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRejectTarget(w)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 text-xs font-semibold transition"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-muted">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {markPaidTarget && (
        <MarkPaidModal
          withdrawal={markPaidTarget}
          isOpen={Boolean(markPaidTarget)}
          onClose={() => setMarkPaidTarget(null)}
          onConfirm={async (id, utr) => {
            await onMarkPaid(id, utr);
            setMarkPaidTarget(null);
          }}
          isSubmitting={actionLoading === markPaidTarget.id}
        />
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectWithdrawalModal
          withdrawal={rejectTarget}
          isOpen={Boolean(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          onConfirm={async (id, reason) => {
            await onReject(id, reason);
            setRejectTarget(null);
          }}
          isSubmitting={actionLoading === rejectTarget.id}
        />
      )}
    </div>
  );
}
