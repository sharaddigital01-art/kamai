"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  LoaderCircle,
  Settings,
  Radio,
  Plus,
  X,
  Power,
  ShieldCheck,
  Info,
  LogIn,
  UserPlus,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  subIdPrefix: string;
  referralCode: string;
}

interface TelegramConfig {
  id?: string;
  telegramUserId: string | null;
  telegramUsername: string | null;
  sessionString: string | null;
  targetChannelId: string | null;
  targetChannelName: string | null;
  targetChannels?: any[];
  sourceChannels: string[];
  isActive: boolean;
}

export default function TelegramBotPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<TelegramConfig>({
    telegramUserId: null,
    telegramUsername: null,
    sessionString: null,
    targetChannelId: "",
    targetChannelName: "",
    targetChannels: [],
    sourceChannels: [],
    isActive: true,
  });

  const [presetChannels, setPresetChannels] = useState<string[]>([
    "@lootdealsindia",
    "@flipkart_loot_offers",
    "@amazon_great_indian_deals",
    "@fashion_discount_hub",
    "@earnkaro_hot_deals",
  ]);

  const [customChannelInput, setCustomChannelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Kamaikaro_B0T";

  async function loadData() {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.authenticated && authData.user) {
          setUser(authData.user);

          // Fetch telegram config for this user
          const cfgRes = await fetch(`/api/telegram/user-config?userId=${encodeURIComponent(authData.user.id)}`);
          if (cfgRes.ok) {
            const cfgData = await cfgRes.json();

            // Check user's TelegramChannelConfig by userId. If the user already has a session or active status or telegramUserId, show "Status: Connected" with their live data.
            const isUserConnected = Boolean(
              cfgData.connected ||
              cfgData.isTelegramConnected ||
              cfgData.sessionString ||
              cfgData.telegramUserId ||
              (cfgData.isActive && (cfgData.targetChannelId || (Array.isArray(cfgData.targetChannels) && cfgData.targetChannels.length > 0)))
            );
            setConnected(isUserConnected);

            // Format source channels cleanly (supports both strings and JSON objects from Telegram dialogs)
            let rawSource = cfgData.sourceChannels || [];
            if (!Array.isArray(rawSource)) rawSource = [];
            const formattedSource = rawSource
              .map((c: any) => {
                if (typeof c === "string") return c;
                if (!c) return "";
                if (c.username) return `@${c.username.replace(/^@/, "")}`;
                if (c.title) return c.title;
                if (c.id) return String(c.id);
                return "";
              })
              .filter(Boolean);

            // Extract target channel if stored in targetChannels or direct fields
            let targetId = cfgData.targetChannelId || "";
            let targetName = cfgData.targetChannelName || "";
            if (!targetId && Array.isArray(cfgData.targetChannels) && cfgData.targetChannels.length > 0) {
              const firstTgt = cfgData.targetChannels[0];
              if (typeof firstTgt === "string") {
                targetId = firstTgt;
                targetName = firstTgt;
              } else if (firstTgt && typeof firstTgt === "object") {
                targetId = firstTgt.username
                  ? `@${firstTgt.username.replace(/^@/, "")}`
                  : String(firstTgt.id || "");
                targetName = firstTgt.title || targetId;
              }
            }

            setConfig({
              telegramUserId: cfgData.telegramUserId || null,
              telegramUsername: cfgData.telegramUsername || null,
              sessionString: cfgData.sessionString || null,
              targetChannelId: targetId,
              targetChannelName: targetName,
              targetChannels: cfgData.targetChannels || [],
              sourceChannels: formattedSource,
              isActive: cfgData.isActive !== undefined ? cfgData.isActive : true,
            });

            if (cfgData.defaultSourceChannels) {
              setPresetChannels(cfgData.defaultSourceChannels);
            }
          }
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.warn("Failed to load Telegram bot configuration:", err);
    } finally {
      setAuthLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const deepLink = user
    ? `https://t.me/${botUsername.replace(/^@/, "")}?start=AUTH_${user.id}`
    : `https://t.me/${botUsername.replace(/^@/, "")}`;

  function handleCopyDeepLink() {
    navigator.clipboard?.writeText(deepLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleAddCustomChannel(e: React.FormEvent) {
    e.preventDefault();
    let tag = customChannelInput.trim();
    if (!tag) return;

    // Normalize: ensure @ prefix or -100 id
    if (!tag.startsWith("@") && !tag.startsWith("-100")) {
      const match = tag.match(/t\.me\/([a-zA-Z0-9_]+)/i);
      tag = match ? `@${match[1]}` : `@${tag}`;
    }

    if (!config.sourceChannels.includes(tag)) {
      setConfig((prev) => ({
        ...prev,
        sourceChannels: [...prev.sourceChannels, tag],
      }));
    }
    setCustomChannelInput("");
  }

  function handleTogglePreset(channel: string) {
    setConfig((prev) => {
      const exists = prev.sourceChannels.includes(channel);
      return {
        ...prev,
        sourceChannels: exists
          ? prev.sourceChannels.filter((c) => c !== channel)
          : [...prev.sourceChannels, channel],
      };
    });
  }

  function handleRemoveChannel(channel: string) {
    setConfig((prev) => ({
      ...prev,
      sourceChannels: prev.sourceChannels.filter((c) => c !== channel),
    }));
  }

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/telegram/save-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          targetChannelId: config.targetChannelId?.trim() || null,
          targetChannelName: config.targetChannelName?.trim() || null,
          sourceChannels: config.sourceChannels,
          isActive: config.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to save settings." });
      } else {
        setFeedback({ type: "success", text: "Settings saved successfully! Bot sync updated." });
        setConnected(true);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback({ type: "error", text: "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnectBot() {
    if (!confirm("Are you sure you want to disconnect this Telegram account?")) return;
    setDisconnecting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/telegram/save-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          disconnect: true,
        }),
      });

      if (res.ok) {
        setConnected(false);
        setConfig((prev) => ({
          ...prev,
          telegramUserId: null,
          telegramUsername: null,
          sessionString: null,
          isActive: false,
        }));
        setFeedback({ type: "success", text: "Telegram account unlinked successfully." });
      } else {
        setFeedback({ type: "error", text: "Failed to disconnect account." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error disconnecting." });
    } finally {
      setDisconnecting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-[#169443]" />
      </div>
    );
  }

  // Guest State: prompt to log in or create account first
  if (!user) {
    return (
      <div className="space-y-6 pt-4 pb-16 max-w-xl mx-auto px-4">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#0088cc] via-[#1075a3] to-[#134024] p-6 text-white shadow-lg text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
            <Send className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-black text-white">
            Telegram Bot Deal Automation
          </h1>
          <p className="mt-1 text-xs text-sky-100 max-w-sm mx-auto">
            Log in to link your Telegram deal channel. Our bot automatically listens to top deal channels, converts all affiliate links with your Cuelinks ID, and posts them to your channel 24/7!
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?next=/telegram-bot"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-3 font-bold text-ink hover:bg-emerald-300 transition shadow-md active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Log In</span>
            </Link>
            <Link
              href="/signup?next=/telegram-bot"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white/20 px-6 py-3 font-bold text-white hover:bg-white/30 transition ring-1 ring-white/30 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sampleCurl = `curl -X GET "${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/telegram/user-config?telegramId=${config.telegramUserId || "TELEGRAM_USER_ID"}"`;

  return (
    <div className="space-y-6 pt-2 pb-20 max-w-xl mx-auto px-3 sm:px-4">
      {/* Top Banner Header */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-tr from-[#134024] via-[#0b533a] to-[#0088cc] p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white ring-2 ring-white/30 shadow-md">
              <Send className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-black text-white leading-tight">
                  Telegram Bot Automation
                </h1>
              </div>
              <p className="text-xs text-sky-100 mt-0.5">
                Auto-convert & auto-post festive deals to your channel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 active:scale-95 transition"
            title="Refresh status"
            aria-label="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/25 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {connected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </>
              ) : (
                <span className="inline-flex rounded-full h-3 w-3 bg-amber-400" />
              )}
            </span>
            <span className="text-xs font-bold text-white">
              Status:{" "}
              <strong className={connected ? "text-emerald-300" : "text-amber-300"}>
                {connected ? "Connected" : "Disconnected (Setup Required)"}
              </strong>
            </span>
          </div>

          {connected && (
            <div className="flex flex-wrap items-center gap-1.5">
              {config.sessionString && (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  Session Active
                </span>
              )}
              {config.telegramUsername && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-sky-200 ring-1 ring-white/30">
                  @{config.telegramUsername}
                </span>
              )}
              {config.telegramUserId && !config.telegramUsername && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-mono text-sky-200 ring-1 ring-white/30">
                  ID: {config.telegramUserId}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 rounded-2xl p-4 text-xs font-semibold ring-1 transition animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
              : "bg-red-50 text-red-900 ring-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SECTION 1: Connect Telegram Bot */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="bg-canvas/50 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5 flex items-center justify-between">
          <span>Step 1 · Bot Connection & Login</span>
          <span className="font-mono text-[10px] text-ink-soft">@{botUsername}</span>
        </div>

        <div className="p-5 space-y-4">
          {!connected ? (
            <>
              <p className="text-xs text-ink-soft leading-relaxed">
                Connect your Telegram account with one click. The bot will recognize your EarnKaro user ID and automatically tag every conversion with your unique tracking subID (<strong className="font-mono text-ink">{user.subIdPrefix}_tg</strong>).
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0088cc] py-3.5 px-4 font-bold text-white shadow-md hover:bg-[#0077b3] active:scale-[0.99] transition"
                >
                  <Send className="h-4 w-4" />
                  <span>Open in Telegram (@{botUsername})</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyDeepLink}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#F4F6F5] px-4 py-3 text-xs font-bold text-ink hover:bg-black/10 active:scale-95 transition ring-1 ring-black/10"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>

              {/* 3-Step Setup Instructions */}
              <div className="rounded-2xl bg-sky-50/70 p-4 text-xs text-sky-950 ring-1 ring-sky-200/80 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-[#0088cc]">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>How to connect in 30 seconds:</span>
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-sky-900 text-[11px]">
                  <li>Click <strong>&quot;Open in Telegram&quot;</strong> above to chat with @{botUsername}.</li>
                  <li>Click <strong>&quot;START&quot;</strong> or send <code>/login</code> in Telegram to log in and select your channels.</li>
                  <li>Add @{botUsername} as an <strong>Administrator</strong> in your deal channel with &quot;Post Messages&quot; permission.</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm mt-0.5">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-ink flex items-center gap-2">
                      <span>
                        {config.telegramUsername
                          ? `@${config.telegramUsername}`
                          : config.telegramUserId
                          ? `Telegram User (${config.telegramUserId})`
                          : "Telegram Automation Linked"}
                      </span>
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Connected
                      </span>
                    </h4>
                    <p className="text-[11px] text-ink-soft font-mono mt-0.5">
                      {config.telegramUserId ? `ID: ${config.telegramUserId} · ` : ""}
                      SubID: <strong className="text-ink">{user.subIdPrefix}_tg</strong>
                      {config.sessionString ? " · Telethon Session: Active" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-ink-soft ring-1 ring-black/5">
                        {config.sourceChannels.length} Source Channels
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-ink-soft ring-1 ring-black/5">
                        Target: {config.targetChannelName || config.targetChannelId || "Configured"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl px-3 py-1.5 text-xs font-bold text-[#0088cc] hover:bg-sky-100/70 active:scale-95 transition ring-1 ring-sky-200"
                  >
                    Open Bot
                  </a>
                  <button
                    type="button"
                    onClick={handleDisconnectBot}
                    disabled={disconnecting}
                    className="rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100/70 active:scale-95 transition ring-1 ring-red-200"
                  >
                    {disconnecting ? "Unlinking..." : "Unlink"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Target & Source Channel Settings */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Target Channel */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-canvas/50 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5 flex items-center justify-between">
            <span>Step 2 · Your Target Deal Channel</span>
            <Radio className="h-3.5 w-3.5 text-[#169443]" />
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                Target Channel Username or ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. @my_loot_deals or -1001234567890"
                  value={config.targetChannelId || ""}
                  onChange={(e) => setConfig((p) => ({ ...p, targetChannelId: e.target.value }))}
                  className="w-full rounded-2xl bg-[#F4F6F5] py-3 px-4 text-sm font-medium text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition font-mono"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Where the bot will post all converted deals. Make sure you have added @{botUsername} as an Admin in this channel!
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                Channel Name (Friendly Label)
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul's Loot Deals"
                value={config.targetChannelName || ""}
                onChange={(e) => setConfig((p) => ({ ...p, targetChannelName: e.target.value }))}
                className="w-full rounded-2xl bg-[#F4F6F5] py-2.5 px-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
              />
            </div>

            {/* Display target channels list if multiple are configured */}
            {Array.isArray(config.targetChannels) && config.targetChannels.length > 0 && (
              <div className="pt-2 border-t border-black/5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
                  Saved Bot Target Channels:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {config.targetChannels.map((tgt: any, idx: number) => {
                    const title = typeof tgt === "string" ? tgt : (tgt.title || tgt.username || tgt.id);
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
                      >
                        <Radio className="h-3 w-3 text-emerald-600" />
                        <span>{title}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Channels */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-canvas/50 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-faint border-b border-black/5 flex items-center justify-between">
            <span>Step 3 · Source Channels to Listen From</span>
            <span className="text-xs text-[#169443] font-bold">{config.sourceChannels.length} Selected</span>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-ink-soft">
              Whenever any of these channels post deals, the bot extracts the product links, converts them with your affiliate credentials, and auto-posts them to your target channel.
            </p>

            {/* Quick Pick Presets */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-2">
                Platform Preset Deal Channels:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetChannels.map((chan) => {
                  const isSelected = config.sourceChannels.includes(chan);
                  return (
                    <button
                      key={chan}
                      type="button"
                      onClick={() => handleTogglePreset(chan)}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition ${
                        isSelected
                          ? "bg-emerald-100 text-[#134024] ring-1 ring-[#169443] font-bold"
                          : "bg-black/5 text-ink-soft hover:bg-black/10"
                      }`}
                    >
                      <span>{chan}</span>
                      {isSelected ? <Check className="h-3 w-3 text-[#169443]" /> : <Plus className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Channels List */}
            {config.sourceChannels.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-2">
                  Active Source List:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {config.sourceChannels.map((chan) => (
                    <span
                      key={chan}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#134024] px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                    >
                      <span>{chan}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(chan)}
                        className="rounded p-0.5 hover:bg-white/20 active:scale-95"
                        aria-label={`Remove ${chan}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Channel */}
            <div className="pt-2 border-t border-black/5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
                Add Custom Deal Channel:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="@custom_deal_channel"
                  value={customChannelInput}
                  onChange={(e) => setCustomChannelInput(e.target.value)}
                  className="flex-1 rounded-xl bg-[#F4F6F5] py-2 px-3 text-xs font-mono text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-1 focus:ring-[#169443]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomChannel}
                  className="rounded-xl bg-[#134024] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#169443] active:scale-95 transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Toggle Switch & Save */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  config.isActive ? "bg-emerald-100 text-[#169443]" : "bg-black/5 text-ink-soft"
                }`}
              >
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-ink">Auto-Convert & Auto-Post</h3>
                <p className="text-[11px] text-ink-soft">
                  {config.isActive ? "Live: deals will automatically post to your channel" : "Paused: deals are paused"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfig((p) => ({ ...p, isActive: !p.isActive }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.isActive ? "bg-[#169443]" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={config.isActive}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  config.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-black/5">
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Automation Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 4: Developer / Worker Bot API Contract Card */}
      <div className="overflow-hidden rounded-3xl bg-[#1C2127] text-white shadow-sm ring-1 ring-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h4 className="font-mono text-xs font-bold text-white">Worker Bot API Sync</h4>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 ring-1 ring-emerald-500/30">
            HTTP REST
          </span>
        </div>

        <p className="text-[11px] text-gray-300 leading-relaxed">
          Your external Python bot (Telethon / Pyrogram / Aiogram) can query active channel configurations and tracking subIDs in real-time via:
        </p>

        <div className="relative rounded-2xl bg-black/50 p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
          <code>{sampleCurl}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(sampleCurl);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="absolute top-2 right-2 rounded bg-white/10 p-1 text-white hover:bg-white/20 active:scale-95"
            title="Copy cURL"
          >
            {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
