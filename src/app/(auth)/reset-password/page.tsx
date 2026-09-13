"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  // Login redirects here as /reset-password?email=... after sending the code.
  // Reading location once in an initializer avoids a useSearchParams+Suspense wrapper.
  const [email, setEmail] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("email") ?? ""
      : ""
  );
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // The emailed code IS the verification — no link click, no PKCE verifier,
    // so mail-scanner prefetch and cross-browser opens can't break the flow.
    // But verifyOtp CONSUMES the code: if a previous submit verified fine and
    // only the new password failed the strength rules, a recovery session
    // already exists and re-verifying would find the code burned. Skip the
    // verify whenever this browser already holds a session for this email.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.email?.toLowerCase() !== email.trim().toLowerCase()) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });

      if (verifyError) {
        setLoading(false);
        setError("That code is invalid or expired — request a new one from the sign-in page.");
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
  }

  const inputCls =
    "rounded-xl border-[#334155] bg-[#0F172A] text-[#F8FAFC] placeholder:text-[#64748B] focus-visible:ring-[#6366F1] focus-visible:border-[#6366F1]/60 h-11";

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* ── Left decorative panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col relative overflow-hidden bg-[#0B1120] border-r border-[#334155]/70">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/8 via-transparent to-[#08111F]/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-48 h-64 rounded-2xl bg-[#1E293B] border border-[#334155] shadow-2xl transform -rotate-6 absolute -left-6 top-4 opacity-30" />
            <div className="w-48 h-64 rounded-2xl bg-[#1E293B] border border-[#334155] shadow-2xl transform -rotate-2 absolute -left-2 top-2 opacity-60" />
            <div className="w-48 h-64 rounded-2xl bg-[#243044] border border-[#6366F1]/20 shadow-2xl flex flex-col items-center justify-center gap-5 p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_25px_rgba(99,102,241,0.25)]">
                <Zap size={18} className="text-[#818CF8]" fill="#818CF8" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-[#818CF8] font-bold text-sm tracking-[0.2em] uppercase">Focus</p>
                <div className="w-8 h-px bg-[#334155] mx-auto" />
                <p className="text-[#818CF8] font-bold text-sm tracking-[0.2em] uppercase">Consistency</p>
                <div className="w-8 h-px bg-[#334155] mx-auto" />
                <p className="text-[#818CF8] font-bold text-sm tracking-[0.2em] uppercase">Progress</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-0 right-0 text-center px-8">
          <p className="text-[#64748B] text-xs">DuePulse — Built for students, by a student.</p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#6366F1]/40 bg-[#6366F1]/15 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Zap size={14} className="text-[#818CF8]" fill="#818CF8" />
            </div>
            <span className="font-bold text-lg text-[#F8FAFC] tracking-tight">DuePulse</span>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-[#F8FAFC] font-bold text-2xl mb-1">Reset your password</h1>
            <p className="text-[#94A3B8] text-sm">
              We emailed you a reset code. Enter it below, then choose a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#CBD5E1] text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-[#CBD5E1] text-sm font-medium">Reset code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,8}"
                maxLength={8}
                placeholder="12345678"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                required
                className={`${inputCls} tracking-[0.5em] font-mono`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#CBD5E1] text-sm font-medium">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors bg-transparent"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-[#CBD5E1] text-sm font-medium">Confirm password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-[#EF4444] text-sm bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold shadow-[0_8px_25px_rgba(99,102,241,0.3)] transition-all duration-200 hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Verify code & update password"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link href="/login" className="text-[#64748B] hover:text-[#94A3B8] text-sm transition-colors">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
