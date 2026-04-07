"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { Twitter, Linkedin, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const isEmailNotConfirmed = error.toLowerCase().includes("email not confirmed");

  // Surface errors passed back from /auth/confirm redirect
  useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) setError(urlError);
    }
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    toast("Welcome back! Signed in successfully.", "success");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError("Please enter your email address above, then click resend.");
      return;
    }
    setResending(true);
    const siteUrl = window.location.origin;
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      },
    });
    setResending(false);
    if (resendError) {
      toast(resendError.message, "error");
    } else {
      toast("Confirmation email sent! Check your inbox.", "success");
    }
  }

  return (
    <div className="animate-in">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#C88550]">
          <span className="text-xl font-bold text-surface-0">C</span>
        </div>
        <h1 className="text-h1">Welcome back</h1>
        <p className="mt-2 text-body text-text-secondary">
          Sign in to your Conduikt account
        </p>
      </div>

      {/* Social login */}
      <div className="mb-6 space-y-3">
        <button
          type="button"
          onClick={async () => {
            try {
              const siteUrl = window.location.origin;
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "twitter",
                options: { redirectTo: `${siteUrl}/auth/confirm?next=/dashboard` },
              });
              if (error) toast(error.message === "Unsupported provider: provider is not enabled" ? "X login is not available right now. Please use email and password." : error.message, "error");
            } catch {
              toast("Something went wrong. Please try again.", "error");
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-3 bg-surface-1 px-4 py-2.5 text-small font-medium text-text-primary hover:bg-surface-2 transition-colors"
        >
          <Twitter className="h-4 w-4" />
          Continue with X
        </button>
        <button
          type="button"
          disabled
          title="LinkedIn login coming soon"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-3 bg-surface-1 px-4 py-2.5 text-small font-medium text-text-tertiary opacity-50 cursor-not-allowed"
        >
          <Linkedin className="h-4 w-4" />
          Continue with LinkedIn
          <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 text-[0.6875rem] text-text-tertiary">Soon</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-3" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-0 px-3 text-small text-text-tertiary">or</span>
        </div>
      </div>

      {/* Email / password form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-10 text-text-tertiary hover:text-text-primary transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
            <p>{error}</p>
            {isEmailNotConfirmed && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="mt-2 font-medium text-accent-secondary hover:text-accent-secondary-hover transition-colors disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-small text-accent-secondary hover:text-accent-secondary-hover transition-colors"
        >
          Forgot your password?
        </Link>
      </div>

      <p className="mt-4 text-center text-small text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-accent-secondary hover:text-accent-secondary-hover transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
