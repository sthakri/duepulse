"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    const { error: authError } = result;

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "signup") {
      const { data } = result;
      if (data?.session) {
        router.push("/onboarding");
      } else {
        setError("Check your email for a confirmation link before signing in.");
      }
    } else {
      const supabase = createClient();
      const {
        data: { user: signedInUser },
      } = await supabase.auth.getUser();
      const { data: profile } = signedInUser
        ? await supabase
            .from("profiles")
            .select("onboarding_complete, canvas_token")
            .eq("id", signedInUser.id)
            .single()
        : { data: null };

      if (profile?.onboarding_complete && profile?.canvas_token) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }

  const inputCls =
    "rounded-xl border-[#334155] bg-[#0F172A] text-[#F8FAFC] placeholder:text-[#64748B] focus-visible:ring-[#6366F1] focus-visible:border-[#6366F1]/60 h-11";

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* ── Left decorative panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col relative overflow-hidden bg-[#0B1120] border-r border-[#334155]/70">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/8 via-transparent to-[#08111F]/60" />

        {/* Decorative visual */}
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
        {/* Logo */}
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
            <h1 className="text-[#F8FAFC] font-bold text-2xl mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[#94A3B8] text-sm">
              {mode === "signin"
                ? "Sign in to continue to your dashboard."
                : "Start syncing your Canvas deadlines."}
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
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#CBD5E1] text-sm font-medium">Password</Label>
                {mode === "signin" && (
                  <button type="button" className="text-[#6366F1] text-xs hover:text-[#818CF8] transition-colors bg-transparent">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {mode === "signin" && (
              <div className="flex items-center gap-2.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#334155] bg-[#0F172A] accent-[#6366F1]"
                />
                <Label htmlFor="remember-me" className="text-[#94A3B8] text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
            )}

            {error && (
              <p className="text-[#EF4444] text-sm bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold shadow-[0_8px_25px_rgba(99,102,241,0.3)] transition-all duration-200 hover:scale-[1.01] disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-[#94A3B8] text-sm mt-5">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
              className="text-[#6366F1] hover:text-[#818CF8] font-medium transition-colors bg-transparent"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="text-center mt-6">
            <Link href="/" className="text-[#64748B] hover:text-[#94A3B8] text-sm transition-colors">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
