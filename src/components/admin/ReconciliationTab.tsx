"use client";

import { useState } from "react";
import {
  TrendingUp,
  MousePointerClick,
  Coins,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Sparkles,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  LoaderCircle,
} from "lucide-react";
import { formatINR } from "@/lib/money";

export interface ReconciliationData {
  clicksToday: number;
  totalClicks: number;
  lifetimeGrossPaise: number;
  distributedUserProfitPaise: number;
  platformNetProfitPaise: number;
  pendingCutPaise: number;
  approvedCutPaise: number;
  rejectedCutPaise: number;
  recentOrders: Array<{
    id: string;
    orderId: string;
    storeName: string;
    userName: string;
    userEmail: string;
    subId: string;
    orderAmountPaise: number;
    commissionPaise: number;
    userAmountPaise: number;
    adminCutPaise: number;
    status: string;
    date: string;
  }>;
}

interface ReconciliationTabProps {
  data: ReconciliationData;
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

export function ReconciliationTab({
  data,
  loading,
  onRefresh,
  notify,
}: ReconciliationTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // File drop handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadError(null);
    }
  };

  const handleUploadSync = async () => {
    if (!file && !csvPasteText.trim()) {
      setUploadError("Please choose a CSV file or paste report content.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/admin/amazon-sync", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/admin/amazon-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText: csvPasteText }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error || "Failed to process commission CSV report.");
      } else {
        setSyncSummary(json);
        setFile(null);
        setCsvPasteText("");
        notify(`Successfully reconciled ${json.processedCount || 0} orders!`);
        await onRefresh();
      }
    } catch (err: any) {
      setUploadError(err?.message || "An error occurred while uploading report.");
    } finally {
      setUploading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      window.location.href = "/admin/api/export-orders";
      notify("Exporting tracked orders CSV...");
    } catch {
      notify("Failed to initiate CSV download");
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  const filteredOrders = (data.recentOrders || []).filter((o) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (o.orderId || "").toLowerCase().includes(q) ||
      (o.storeName || "").toLowerCase().includes(q) ||
      (o.subId || "").toLowerCase().includes(q) ||
      (o.userName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Clicks */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Tracked Clicks</span>
            <MousePointerClick className="h-4 w-4 text-[#169443]" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink">
            {data.clicksToday}
            <span className="text-xs font-normal text-ink-muted ml-1.5">today</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5">
            {data.totalClicks} lifetime link redirects
          </p>
        </div>

        {/* Lifetime Gross Earnings */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Commission</span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-ink">
            {formatINR(data.lifetimeGrossPaise || 0)}
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Total affiliate revenue earned
          </p>
        </div>

        {/* Distributed User Profit (70%) */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-semibold uppercase tracking-wider">User Profit (70%)</span>
            <span className="text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-200 px-1.5 py-0.5 text-emerald-800">
              Partners
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#169443]">
            {formatINR(data.distributedUserProfitPaise || 0)}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Allocated into user wallets
          </p>
        </div>

        {/* Platform Net Profit (30%) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#134024] to-[#0c2b18] p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-xs font-semibold uppercase tracking-wider">Platform Cut (30%)</span>
            <span className="text-[10px] font-black uppercase tracking-wider rounded-md bg-[#22c55e]/20 px-1.5 py-0.5 text-[#22c55e] border border-[#22c55e]/30">
              Admin Net
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {formatINR(data.platformNetProfitPaise || 0)}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-200/90 mt-1">
            <span>Appr: {formatINR(data.approvedCutPaise || 0)}</span>
            <span>·</span>
            <span>Pend: {formatINR(data.pendingCutPaise || 0)}</span>
          </div>
        </div>
      </div>

      {/* Quick CSV Upload Card & Reconciliation Parser */}
      <div className="rounded-3xl border border-black/5 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-[#169443] ring-1 ring-black/5">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display font-black text-base text-ink">
                Quick CSV Reconciliation & Order Ingestion
              </h2>
              <p className="text-xs text-ink-soft">
                Upload Amazon Associates Fee Report or Cuelinks CSV to attribute commissions via SubID.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPaste(!showPaste)}
              className="text-xs font-semibold text-ink-soft hover:text-ink flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/10 bg-canvas hover:bg-neutral-100 transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{showPaste ? "Upload File Instead" : "Paste Raw CSV"}</span>
            </button>
          </div>
        </div>

        {/* Upload Dropzone or Textarea */}
        {!showPaste ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragActive
                ? "border-[#169443] bg-emerald-50/50"
                : file
                ? "border-emerald-500 bg-emerald-50/20"
                : "border-black/15 bg-canvas/40 hover:bg-canvas"
            }`}
          >
            <input
              id="csv-file-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                  setUploadError(null);
                }
              }}
              className="sr-only"
            />
            <label
              htmlFor="csv-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <Upload className="h-8 w-8 text-[#169443] opacity-80" />
              {file ? (
                <div>
                  <p className="font-bold text-xs text-ink">{file.name}</p>
                  <p className="text-[11px] text-ink-muted">
                    {(file.size / 1024).toFixed(1)} KB · Ready to parse & reconcile
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-xs text-ink">
                    Drop Amazon / Affiliate CSV file here or <span className="text-[#169443] underline">browse</span>
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Supports Amazon Associates Fee Report & Cuelinks Conversion CSVs
                  </p>
                </div>
              )}
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={csvPasteText}
              onChange={(e) => setCsvPasteText(e.target.value)}
              placeholder="Paste raw CSV lines here (with header columns: Date, Tracking Tag / ascsubtag, Items, Commission / Ad Fee)..."
              rows={4}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
            />
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleUploadSync}
            disabled={uploading || (!file && !csvPasteText.trim())}
            className="flex items-center gap-1.5 rounded-xl bg-[#169443] hover:bg-[#134024] text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50 shadow-xs"
          >
            {uploading ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Reconciling Orders...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Run Reconciler
              </>
            )}
          </button>
        </div>

        {/* Sync Summary Modal / Results Box */}
        {syncSummary && (
          <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h4 className="font-bold text-xs text-emerald-950">
                  Reconciliation Completed Successfully
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSyncSummary(null)}
                className="text-emerald-800 hover:text-emerald-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl bg-white/80 p-2.5">
                <span className="text-ink-soft text-[10px] uppercase font-bold">Processed</span>
                <div className="font-black text-ink">{syncSummary.processedCount || 0} orders</div>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5">
                <span className="text-ink-soft text-[10px] uppercase font-bold">Total Sales Value</span>
                <div className="font-black text-ink">
                  ₹{Number(syncSummary.totalItemPrice || 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5">
                <span className="text-emerald-800 text-[10px] uppercase font-bold">User Profit (70%)</span>
                <div className="font-black text-[#169443]">
                  ₹{Number(syncSummary.totalUserProfit || 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl bg-white/80 p-2.5">
                <span className="text-ink-soft text-[10px] uppercase font-bold">Admin Cut (30%)</span>
                <div className="font-black text-ink">
                  ₹{Number(syncSummary.totalAdminCut || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders Table & Export Action */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-black/5 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders by ID, store, SubID, or user..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-canvas transition shadow-xs"
              title="Download Orders CSV"
            >
              <Download className={`h-3.5 w-3.5 text-[#169443] ${isExporting ? "animate-bounce" : ""}`} />
              <span>Export Orders CSV</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#169443]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Table of Orders */}
        <div className="rounded-3xl border border-black/5 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-canvas/60 text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Order ID & Store</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">SubID & Partner</th>
                  <th className="py-3.5 px-4 text-right">Order Amount</th>
                  <th className="py-3.5 px-4 text-right">Gross Comm.</th>
                  <th className="py-3.5 px-4 text-right">User Profit (70%)</th>
                  <th className="py-3.5 px-4 text-right">Admin Cut (30%)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-muted">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm text-ink">No tracked orders recorded</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {searchTerm ? "No orders match your filter" : "Orders will appear here once tracked or synced via CSV"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const st = (o.status || "").toUpperCase();
                    const isConfirmed = st === "CONFIRMED" || st === "APPROVED" || st === "PAID";
                    const isPending = st === "PENDING" || st === "OPEN";

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-canvas/40 transition group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-ink">
                            {o.orderId || o.id.slice(0, 8)}
                          </div>
                          <div className="text-[11px] text-ink-soft font-medium">
                            {o.storeName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-ink-soft">
                          {new Date(o.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-block rounded-md bg-canvas px-2 py-0.5 font-mono text-[11px] font-bold text-ink border border-black/5">
                            {o.subId || "direct"}
                          </div>
                          <div className="text-[10px] text-ink-muted truncate max-w-[120px]">
                            {o.userName || o.userEmail}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-ink">
                          {formatINR(o.orderAmountPaise || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-ink">
                          {formatINR(o.commissionPaise || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-display font-black text-[#169443]">
                          {formatINR(o.userAmountPaise || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-display font-bold text-emerald-900">
                          {formatINR(o.adminCutPaise || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              isConfirmed
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isPending
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            {isConfirmed ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : isPending ? (
                              <Clock className="h-2.5 w-2.5" />
                            ) : (
                              <XCircle className="h-2.5 w-2.5" />
                            )}
                            <span>{st}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
