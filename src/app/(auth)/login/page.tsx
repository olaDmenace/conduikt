"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { Twitter, Linkedin, Eye, EyeOff } from "lucide-react";
import {
  mapSupabaseAuthError,
  isEmailNotConfirmedError,
  validateLoginFields,
  hasErrors,
  type LoginFieldErrors,
} from "@/src/lib/auth/error-map";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState(() => {
    if (typeof window === "undefined") return "";
    const urlError = new URLSearchParams(window.location.search).get("error");
    return urlError ? mapSupabaseAuthError(urlError) : "";
  });
  const [formErrorIsUnconfirmed, setFormErrorIsUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormErrorIsUnconfirmed(false);

    const errors = validateLoginFields({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setFormError(mapSupabaseAuthError(error.message));
      setFormErrorIsUnconfirmed(isEmailNotConfirmedError(error.message));
      setLoading(false);
      return;
    }

    toast("Welcome back! Signed in successfully.", "success");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setFieldErrors({ email: "Please enter your email above first." });
      return;
    }
    setResending(true);
    const siteUrl = window.location.origin;
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      },
    });
    setResending(false);
    if (resendError) {
      toast(mapSupabaseAuthError(resendError.message), "error");
    } else {
      toast("Confirmation email sent! Check your inbox.", "success");
    }
  }

  return (
    <div className="animate-in">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4945A] to-[#C88550]">
          <span className="text-xl font-bold text-on-accent">C</span>
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
          onClick={async () => {
            try {
              const siteUrl = window.location.origin;
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "linkedin_oidc",
                options: { redirectTo: `${siteUrl}/auth/confirm?next=/dashboard` },
              });
              if (error) toast(error.message === "Unsupported provider: provider is not enabled" ? "LinkedIn login is not available right now. Please use email and password." : error.message, "error");
            } catch {
              toast("Something went wrong. Please try again.", "error");
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-3 bg-surface-1 px-4 py-2.5 text-small font-medium text-text-primary hover:bg-surface-2 transition-colors"
        >
          <Linkedin className="h-4 w-4" />
          Continue with LinkedIn
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
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          error={fieldErrors.email}
          aria-invalid={!!fieldErrors.email}
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            error={fieldErrors.password}
            aria-invalid={!!fieldErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-10 text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {formError && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
            <p>{formError}</p>
            {formErrorIsUnconfirmed && (
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
