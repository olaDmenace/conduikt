"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { ArrowLeft, Mail } from "@/src/components/ui/lucide-icons";
import { mapSupabaseAuthError } from "@/src/lib/auth/error-map";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Please enter your email.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setFieldError("Please enter a valid email address.");
      return;
    }
    setFieldError(undefined);
    setLoading(true);

    const siteUrl = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${siteUrl}/auth/confirm?type=recovery`,
    });

    if (error) {
      setFormError(mapSupabaseAuthError(error.message));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast("Password reset email sent. Check your inbox.", "success");
  }

  return (
    <div className="animate-in">
      <div className="mb-8 text-center">
        <h1 className="text-display-s text-text">Reset your password</h1>
        <p className="mt-3 text-body text-text-2">
          {sent
            ? "Check your email for a reset link."
            : "Enter your email and we'll send you a reset link."}
        </p>
      </div>

      {sent ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center rounded-lg border border-line bg-surface p-6 text-center">
            <Mail className="mb-3 h-5 w-5 text-teal" aria-hidden />
            <p className="text-body text-text">
              We sent a password reset link to{" "}
              <span className="font-medium text-text">{email}</span>
            </p>
            <p className="mt-2 text-body-s text-text-2">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSent(false)}
          >
            Try a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            error={fieldError}
            aria-invalid={!!fieldError}
          />

          {formError && (
            <div role="alert" className="rounded-md border border-line bg-surface-2 px-4 py-3 text-body-s text-danger">
              {formError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="hover-link inline-flex items-center gap-1.5 text-body-s text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
