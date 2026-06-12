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
      // Check onboarding state before redirecting — users who signed up but
      // never completed onboarding must be sent back to /onboarding, not /dashboard.
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

  return (
    <div className="min-h-screen bg-[#0C111B] flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col relative overflow-hidden bg-[#0E1420] border-r border-[#2A3444]">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D6B36A]/5 via-transparent to-[#0C111B]/80" />

        {/* Decorative book stack visual */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Books stacked effect */}
            <div className="w-48 h-64 rounded-2xl bg-[#1C2637] border border-[#2A3444] shadow-2xl transform -rotate-6 absolute -left-6 top-4 opacity-40" />
            <div className="w-48 h-64 rounded-2xl bg-[#151C2B] border border-[#2A3444] shadow-2xl transform -rotate-2 absolute -left-2 top-2 opacity-60" />
            <div className="w-48 h-64 rounded-2xl bg-[#1C2637] border border-[#D6B36A]/20 shadow-2xl flex flex-col items-center justify-center gap-5 p-8">
              <div className="w-10 h-10 rounded-xl bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
                <Zap size={18} className="text-[#D6B36A]" fill="#D6B36A" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-[#D6B36A] font-bold text-sm tracking-[0.2em] uppercase">Focus</p>
                <div className="w-8 h-px bg-[#2A3444] mx-auto" />
                <p className="text-[#D6B36A] font-bold text-sm tracking-[0.2em] uppercase">Consistency</p>
                <div className="w-8 h-px bg-[#2A3444] mx-auto" />
                <p className="text-[#D6B36A] font-bold text-sm tracking-[0.2em] uppercase">Progress</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-10 left-0 right-0 text-center px-8">
          <p className="text-[#7E8AA0] text-xs">DuePulse — Built for students, by a student.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Logo */}
        <div className="w-full max-w-sm mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-[#D6B36A]/15 border border-[#D6B36A]/30 flex items-center justify-center">
              <Zap size={14} className="text-[#D6B36A]" fill="#D6B36A" />
            </div>
            <span className="font-bold text-lg text-[#F6F1E8] tracking-tight">DuePulse</span>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[#F6F1E8] font-bold text-2xl mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[#AAB4C4] text-sm">
              {mode === "signin"
                ? "Sign in to continue to your dashboard."
                : "Start syncing your Canvas deadlines."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#AAB4C4] text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-[#2A3444] bg-[#0C111B] text-[#F6F1E8] placeholder:text-[#7E8AA0] focus-visible:ring-[#D6B36A] focus-visible:border-[#D6B36A]/60 h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#AAB4C4] text-sm font-medium">
                  Password
                </Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-[#D6B36A] text-xs hover:text-[#E0BF78] transition-colors bg-transparent"
                  >
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
                  className="rounded-xl border-[#2A3444] bg-[#0C111B] text-[#F6F1E8] placeholder:text-[#7E8AA0] focus-visible:ring-[#D6B36A] focus-visible:border-[#D6B36A]/60 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8AA0] hover:text-[#AAB4C4] transition-colors bg-transparent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            {mode === "signin" && (
              <div className="flex items-center gap-2.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2A3444] bg-[#0C111B] accent-[#D6B36A]"
                />
                <Label htmlFor="remember-me" className="text-[#AAB4C4] text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-[#C97064] text-sm bg-[#C97064]/10 border border-[#C97064]/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              id="auth-submit-btn"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold shadow-none transition-all duration-200 hover:scale-[1.01]"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign In"
                  : "Sign Up"}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-[#AAB4C4] text-sm mt-5">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="text-[#D6B36A] hover:text-[#E0BF78] font-medium transition-colors bg-transparent"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {/* Back to homepage */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-[#7E8AA0] hover:text-[#AAB4C4] text-sm transition-colors"
            >
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
