"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Success: redirect to target or profile
      router.push(nextPath.startsWith("/") ? nextPath : "/profile");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function fillAdminDemo() {
    setEmail("admin@earnkaro.com");
    setPassword("admin123456");
  }

  return (
    <div className="mx-auto my-6 max-w-md px-4 pb-16">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5">
        {/* Top Header Card */}
        <div className="bg-gradient-to-tr from-[#134024] to-[#169443] px-6 py-8 text-white text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-4 ring-white/20 shadow-md">
            <svg className="h-8 w-8 fill-white" viewBox="0 0 24 24">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-10 4-4.22 4.22-3.1 9.5-3 10 .3.4.8.7 1.3.7 1.1 0 1.9-.9 1.9-2 0-3 3-5 5-7z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            Log In to EarnKaro
          </h1>
          <p className="mt-1 text-xs text-emerald-100">
            Earn extra income by sharing festive deals & brand links
          </p>
        </div>

        {/* Login Form Body */}
        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 ring-1 ring-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-ink uppercase tracking-wide">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl bg-[#F4F6F5] py-3 pl-10 pr-11 text-sm text-ink placeholder:text-ink-soft/60 outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-[#169443] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-soft hover:text-ink"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#169443] py-3.5 font-bold text-white shadow-md hover:bg-[#13803a] active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="mt-5 rounded-2xl bg-emerald-50/80 p-3 text-xs text-emerald-900 ring-1 ring-emerald-200/60">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-[#169443]" />
                Admin Credentials
              </span>
              <button
                type="button"
                onClick={fillAdminDemo}
                className="font-bold text-[#169443] hover:underline"
              >
                Auto-fill Admin
              </button>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              Email: <code className="bg-emerald-100 px-1 py-0.5 rounded">admin@earnkaro.com</code> (Grants access to /admin)
            </p>
          </div>

          {/* Switch to Signup */}
          <div className="mt-6 text-center text-xs text-ink-soft">
            Don't have an account yet?{" "}
            <Link
              href={`/signup${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="font-bold text-[#169443] hover:underline"
            >
              Sign Up for Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
