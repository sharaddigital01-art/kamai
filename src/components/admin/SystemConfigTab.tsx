"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Percent,
  Coins,
  Tag,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LoaderCircle,
  Sliders,
} from "lucide-react";
import { formatINR } from "@/lib/money";

export interface SystemSettings {
  userSplitPct: number;
  adminCutPct: number;
  minWithdrawalInr: number;
  amazonMasterTag: string;
}

interface SystemConfigTabProps {
  initialSettings?: SystemSettings;
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

export function SystemConfigTab({
  initialSettings,
  loading,
  onRefresh,
  notify,
}: SystemConfigTabProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    userSplitPct: 70,
    adminCutPct: 30,
    minWithdrawalInr: 50,
    amazonMasterTag: "kamaikaro02-21",
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleUserSplitChange = (val: number) => {
    const clamped = Math.max(10, Math.min(95, val));
    setSettings((prev) => ({
      ...prev,
      userSplitPct: clamped,
      adminCutPct: 100 - clamped,
    }));
  };

  const handleResetDefaults = () => {
    setSettings({
      userSplitPct: 70,
      adminCutPct: 30,
      minWithdrawalInr: 50,
      amazonMasterTag: "kamaikaro02-21",
    });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.userSplitPct + settings.adminCutPct !== 100) {
      setErrorMsg("User Split and Admin Cut percentages must equal 100%.");
      return;
    }
    if (settings.minWithdrawalInr < 10) {
      setErrorMsg("Minimum withdrawal threshold must be at least ₹10.");
      return;
    }
    if (!settings.amazonMasterTag.trim()) {
      setErrorMsg("Active Amazon Master Tag cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/admin/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Failed to update platform settings.");
      } else {
        setSavedSuccess(true);
        notify("System & Platform configuration saved successfully!");
        setTimeout(() => setSavedSuccess(false), 3000);
        await onRefresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // Sample commission calculation based on split
  const sampleCommission = 1000;
  const sampleUserProfit = Math.round((sampleCommission * settings.userSplitPct) / 100);
  const sampleAdminCut = sampleCommission - sampleUserProfit;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Revenue Split Configuration */}
        <div className="rounded-3xl border border-black/5 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-[#169443] ring-1 ring-black/5">
                <Sliders className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-black text-base text-ink">
                  Revenue Share Commission Split
                </h3>
                <p className="text-xs text-ink-soft">
                  Configure dynamic platform fee and affiliate profit sharing between partners and Kamaikaro.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              Active Split: {settings.userSplitPct}% / {settings.adminCutPct}%
            </span>
          </div>

          {/* Interactive Split Slider */}
          <div className="space-y-3 bg-canvas/40 p-4 rounded-2xl border border-black/5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#169443]">
                Partner User Split: {settings.userSplitPct}%
              </span>
              <span className="text-emerald-950">
                Platform Admin Cut: {settings.adminCutPct}%
              </span>
            </div>

            <input
              type="range"
              min={20}
              max={90}
              step={1}
              value={settings.userSplitPct}
              onChange={(e) => handleUserSplitChange(Number(e.target.value))}
              className="w-full h-2.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#169443]"
            />

            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Min Partner Split (20%)</span>
              <span>Default (70% / 30%)</span>
              <span>Max Partner Split (90%)</span>
            </div>
          </div>

          {/* Commission Calculation Preview */}
          <div className="rounded-2xl bg-white p-4 border border-black/5 space-y-2">
            <div className="text-xs font-bold text-ink-soft uppercase tracking-wider">
              Live Preview: Split on ₹1,000 Affiliate Commission
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-800">
                  User Wallet Allocation ({settings.userSplitPct}%)
                </span>
                <div className="text-xl font-black text-[#169443] mt-0.5">
                  ₹{sampleUserProfit.toFixed(2)}
                </div>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  Credited as confirmed earnings
                </p>
              </div>

              <div className="rounded-xl bg-[#0c2b18]/5 p-3 border border-black/5">
                <span className="text-[10px] font-bold uppercase text-ink-soft">
                  Platform Admin Net Cut ({settings.adminCutPct}%)
                </span>
                <div className="text-xl font-black text-ink mt-0.5">
                  ₹{sampleAdminCut.toFixed(2)}
                </div>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  Retained for platform operations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Routing Rules */}
        <div className="rounded-3xl border border-black/5 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-black/5 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-amber-600 ring-1 ring-black/5">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-black text-base text-ink">
                Payout & Tracking Parameters
              </h3>
              <p className="text-xs text-ink-soft">
                Manage global withdrawal thresholds and master Amazon Associates routing tags.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Minimum Withdrawal */}
            <div className="space-y-1.5">
              <label htmlFor="min-withdrawal" className="font-bold text-xs text-ink flex items-center gap-1.5">
                <span>Minimum UPI Withdrawal Threshold</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-ink-soft">
                  ₹
                </span>
                <input
                  id="min-withdrawal"
                  type="number"
                  min={10}
                  max={5000}
                  value={settings.minWithdrawalInr}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      minWithdrawalInr: Number(e.target.value),
                    }))
                  }
                  className="w-full pl-8 pr-4 py-2.5 text-xs font-bold rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
                />
              </div>
              <p className="text-[11px] text-ink-muted">
                Partners must have at least ₹{settings.minWithdrawalInr} confirmed balance to request payout.
              </p>
            </div>

            {/* Master Amazon Tag */}
            <div className="space-y-1.5">
              <label htmlFor="master-tag" className="font-bold text-xs text-ink flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#169443]" />
                <span>Active Amazon Master Associate Tag</span>
              </label>
              <input
                id="master-tag"
                type="text"
                value={settings.amazonMasterTag}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    amazonMasterTag: e.target.value.trim(),
                  }))
                }
                placeholder="e.g. kamaikaro02-21"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-black/10 bg-canvas focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#169443]/30 focus:border-[#169443] transition"
              />
              <p className="text-[11px] text-ink-muted">
                Primary tag appended to all direct Amazon links along with &ascsubtag={"{subid}"}.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Settings saved successfully and applied to runtime system.</span>
          </div>
        )}

        {/* Form Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/10 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-canvas transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#169443] hover:bg-[#134024] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Saving Config...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Platform Config</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
