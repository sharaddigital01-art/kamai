"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Send,
  ShieldCheck,
  ShieldAlert,
  Eye,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Power,
  LoaderCircle,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { UserProfileModal } from "./UserProfileModal";

export interface AdminUserData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  referralCode: string;
  subIdPrefix: string;
  subId: string;
  createdAt: string;
  isSuspended: boolean;
  telegramConfig?: {
    connected: boolean;
    channelId?: string;
    channelTitle?: string;
    botActive?: boolean;
    customTag?: string;
    autoPost?: boolean;
  };
  payoutAccount?: {
    upiId?: string;
    accountName?: string;
  } | null;
  lifetimeProfitPaise: number;
  lifetimeProfitInr: number;
  clicksCount: number;
  ordersCount: number;
}

interface UserManagementTabProps {
  users: AdminUserData[];
  stats?: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    telegramConnected: number;
  };
  loading: boolean;
  onRefresh: () => Promise<void>;
  onToggleSuspend: (userId: string, currentSuspended: boolean) => Promise<void>;
  actionLoading?: string | null;
}

export function UserManagementTab({
  users,
  stats,
  loading,
  onRefresh,
  onToggleSuspend,
  actionLoading,
}: UserManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "telegram">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [copiedSubId, setCopiedSubId] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    // Status filter
    if (statusFilter === "active" && u.isSuspended) return false;
    if (statusFilter === "suspended" && !u.isSuspended) return false;
    if (statusFilter === "telegram" && !u.telegramConfig?.connected) return false;

    // Search query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (u.name || "").toLowerCase().includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    const subIdMatch = (u.subId || "").toLowerCase().includes(q);
    const prefixMatch = (u.subIdPrefix || "").toLowerCase().includes(q);
    const refMatch = (u.referralCode || "").toLowerCase().includes(q);

    return nameMatch || emailMatch || subIdMatch || prefixMatch || refMatch;
  });

  const handleCopySubId = (subId: string) => {
    navigator.clipboard.writeText(subId);
    setCopiedSubId(subId);
    setTimeout(() => setCopiedSubId(null), 2000);
  };

  const totalUsers = stats?.totalUsers ?? users.length;
  const activeUsers = stats?.activeUsers ?? users.filter((u) => !u.isSuspended).length;
  const suspendedUsers = stats?.suspendedUsers ?? users.filter((u) => u.isSuspended).length;
  const tgConnected = stats?.telegramConnected ?? users.filter((u) => u.telegramConfig?.connected).length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4 Summary Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="h-4 w-4 text-[#169443]" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink">{totalUsers}</div>
          <p className="text-[11px] text-ink-muted mt-0.5">Registered partners</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{activeUsers}</div>
          <p className="text-[11px] text-ink-muted mt-0.5">Good standing accounts</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-600">{suspendedUsers}</div>
          <p className="text-[11px] text-ink-muted mt-0.5">Blocked from routing</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Telegram Bots</span>
            <Send className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-600">{tgConnected}</div>
          <p className="text-[11px] text-ink-muted mt-0.5">Channels connected</p>
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
            placeholder="Search by user name, email, or SubID..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 rounded-xl bg-canvas p-1 border border-black/5">
            {(
              [
                { id: "all", label: "All Users" },
                { id: "active", label: "Active" },
                { id: "suspended", label: "Suspended" },
                { id: "telegram", label: "Telegram" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  statusFilter === f.id
                    ? "bg-white text-ink shadow-xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50"
            title="Refresh Users"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#169443]" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-black/5 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-canvas/60 text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Assigned SubID</th>
                <th className="py-3.5 px-4">Telegram Bot</th>
                <th className="py-3.5 px-4 text-right">Lifetime Profit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm text-ink">No users found</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {searchTerm ? "Try adjusting your search criteria" : "Registered users will appear here"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const initial = ((u.name || u.email || "P").charAt(0) || "P").toUpperCase();
                  const isSuspended = u.isSuspended;
                  const tg = u.telegramConfig;
                  const isUpdating = actionLoading === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-canvas/40 transition group"
                    >
                      {/* User Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas font-black text-xs text-[#134024] ring-1 ring-black/5">
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-ink truncate max-w-[160px] sm:max-w-[200px]">
                              {u.name || "Kamai Karo Partner"}
                            </div>
                            <div className="text-[11px] text-ink-soft truncate max-w-[160px] sm:max-w-[200px]">
                              {u.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-ink-soft">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Assigned SubID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-mono text-[11px] font-semibold text-ink border border-black/5">
                          <span>{u.subId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySubId(u.subId)}
                            className="text-ink-muted hover:text-ink transition p-0.5"
                            title="Copy SubID"
                          >
                            {copiedSubId === u.subId ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Telegram Connection Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tg?.connected ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
                            <Send className="h-3 w-3 text-sky-500" />
                            <span className="truncate max-w-[110px]">
                              {tg.channelTitle || tg.channelId || "Connected"}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-500">
                            Disconnected
                          </span>
                        )}
                      </td>

                      {/* Lifetime Profit */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-display font-black text-sm text-[#169443]">
                          {formatINR(u.lifetimeProfitPaise || 0)}
                        </span>
                        <div className="text-[10px] text-ink-muted">
                          {u.ordersCount || 0} orders · {u.clicksCount || 0} clicks
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isSuspended
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <ShieldAlert className="h-2.5 w-2.5" /> Suspended
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-2.5 w-2.5" /> Active
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition"
                            title="View Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleSuspend(u.id, isSuspended)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isSuspended
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                            } disabled:opacity-50`}
                            title={isSuspended ? "Activate Account" : "Suspend Account"}
                          >
                            {isUpdating ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            <span>{isSuspended ? "Activate" : "Suspend"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onToggleSuspend={async (userId, currentSuspended) => {
            await onToggleSuspend(userId, currentSuspended);
            setSelectedUser((prev) =>
              prev && prev.id === userId ? { ...prev, isSuspended: !currentSuspended } : prev
            );
          }}
          isUpdating={actionLoading === selectedUser.id}
        />
      )}
    </div>
  );
}
