"use client";

import { useState, useSyncExternalStore } from "react";
import { readPendingAudit } from "@/src/lib/onboarding/url";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { Twitter, Linkedin, Mail, Eye, EyeOff } from "@/src/components/ui/lucide-icons";
import { GoogleIcon } from "@/src/components/icons/google-icon";
import {
  mapSupabaseAuthError,
  validateSignupFields,
  hasErrors,
  type SignupFieldErrors,
} from "@/src/lib/auth/error-map";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  // Set by the homepage's "Check my site free" form. Read on the client
  // only; the server render shows the default line.
  const pendingSite = useSyncExternalStore(noSubscribe, pendingHost, () => null);
  const supabase = createClient();
  const { toast } = useToast();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const errors = validateSignupFields({ fullName, email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setLoading(true);
    const siteUrl = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      setFormError(mapSupabaseAuthError(error.message));
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
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

  if (emailSent) {
    return (
      <div className="animate-in text-center">
        <Mail className="mx-auto mb-4 h-6 w-6 text-text-3" aria-hidden />
        <h1 className="text-display-s text-text">Check your email</h1>
        <p className="mt-3 text-body text-text-2">
          We sent a confirmation link to{" "}
          <span className="font-medium text-text">{email}</span>.
          Click the link to verify your account and get started.
        </p>
        <p className="mt-6 text-body-s text-text-3">
          Didn&apos;t receive it? Check your spam folder, or{" "}
          <button
            type="button"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              const siteUrl = window.location.origin;
              const { error } = await supabase.auth.resend({
                type: "signup",
                email: email.trim(),
                options: {
                  emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
                },
              });
              setResending(false);
              if (error) {
                toast(mapSupabaseAuthError(error.message), "error");
              } else {
                toast("Verification email sent again. Check your inbox.", "success");
              }
            }}
            className="hover-link text-accent hover:text-accent-hover disabled:opacity-50"
          >
            {resending ? "Sending…" : "resend the verification email"}
          </button>
          .
        </p>
        <p className="mt-4 text-body-s text-text-2">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="hover-link text-accent hover:text-accent-hover"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="mb-8 text-center">
        <h1 className="text-display-s text-text">Create your account</h1>
        <p className="mt-3 text-body text-text-2">
          {pendingSite
            ? `We'll check ${pendingSite} as soon as you're in.`
            : "Free to start. Your marketing, done every week."}
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
      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <Input
          label="Full name"
          type="text"
          placeholder="Michael Doe"
          autoComplete="name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
          }}
          error={fieldErrors.fullName}
          aria-invalid={!!fieldErrors.fullName}
        />
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
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
            {formError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-body-s text-text-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="hover-link text-accent hover:text-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

const noSubscribe = () => () => {};
function pendingHost(): string | null {
  const url = readPendingAudit();
  return url ? new URL(url).hostname.replace(/^www\./, "") : null;
}
