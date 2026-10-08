"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { Twitter, Linkedin, Eye, EyeOff } from "@/src/components/ui/lucide-icons";
import { GoogleIcon } from "@/src/components/icons/google-icon";
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

    toast("Welcome back. You're signed in.", "success");
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
      toast("Confirmation email sent. Check your inbox.", "success");
    }
  }

  async function signInWith(provider: "google" | "twitter" | "linkedin_oidc", name: string) {
    try {
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${siteUrl}/auth/confirm?next=/dashboard` },
      });
      if (error) toast(error.message === "Unsupported provider: provider is not enabled" ? `${name} login is not available right now. Please use email and password.` : error.message, "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8 text-center">
        <h1 className="text-display-s text-text">Sign in</h1>
        <p className="mt-3 text-body text-text-2">
          Welcome back. Sign in to your Conduikt account.
        </p>
      </div>

      {/* Social login */}
      <div className="mb-6 space-y-2.5">
        <Button type="button" variant="quiet" className="w-full" onClick={() => signInWith("google", "Google")}>
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>
        <Button type="button" variant="quiet" className="w-full" onClick={() => signInWith("twitter", "X")}>
          <Twitter className="h-4 w-4" />
          Continue with X
        </Button>
        <Button type="button" variant="quiet" className="w-full" onClick={() => signInWith("linkedin_oidc", "LinkedIn")}>
          <Linkedin className="h-4 w-4" />
          Continue with LinkedIn
        </Button>
      </div>

      {/* Divider */}
      <div className="mb-6 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-line" />
        <span className="text-label text-text-3">or</span>
        <div className="h-px flex-1 bg-line" />
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
            placeholder="Your password"
            autoComplete="current-password"
            className="pr-10"
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
            className="absolute right-3 top-[37px] text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
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
          <div role="alert" className="rounded-md border border-line bg-surface-2 px-4 py-3 text-body-s text-danger">
            <p>{formError}</p>
            {formErrorIsUnconfirmed && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="hover-link mt-2 font-medium text-accent hover:text-accent-hover disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/forgot-password"
          className="hover-link text-body-s text-accent hover:text-accent-hover"
        >
          Forgot your password?
        </Link>
      </div>

      <p className="mt-3 text-center text-body-s text-text-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="hover-link text-accent hover:text-accent-hover"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
