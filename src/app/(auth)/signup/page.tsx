"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { Twitter, Linkedin, Mail, Eye, EyeOff } from "lucide-react";
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

  if (emailSent) {
    return (
      <div className="animate-in text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-h1">Check your email</h1>
        <p className="mt-3 text-body text-text-secondary">
          We sent a confirmation link to{" "}
          <span className="font-medium text-text-primary">{email}</span>.
          Click the link to verify your account and get started.
        </p>
        <p className="mt-6 text-small text-text-tertiary">
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
                toast("Verification email resent! Check your inbox.", "success");
              }
            }}
            className="text-accent-secondary hover:text-accent-secondary-hover transition-colors disabled:opacity-50"
          >
            {resending ? "Sending..." : "resend the verification email"}
          </button>
          .
        </p>
        <p className="mt-4 text-small text-text-secondary">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="text-accent-secondary hover:text-accent-secondary-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Image
          src="/conduikt-icon.png"
          alt="Conduikt"
          width={56}
          height={56}
          priority
          className="mx-auto mb-4 h-14 w-14"
        />
        <h1 className="text-h1">Create your account</h1>
        <p className="mt-2 text-body text-text-secondary">
          Start automating your marketing with AI
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
            placeholder="Min 8 characters"
            autoComplete="new-password"
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
            {formError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-small text-text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent-secondary hover:text-accent-secondary-hover transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
