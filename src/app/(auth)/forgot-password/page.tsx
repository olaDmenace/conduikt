"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { ArrowLeft, Mail } from "lucide-react";
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
    toast("Password reset email sent! Check your inbox.", "success");
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
        <h1 className="text-h1">Reset password</h1>
        <p className="mt-2 text-body text-text-secondary">
          {sent
            ? "Check your email for a reset link"
            : "Enter your email and we'll send you a reset link"}
        </p>
      </div>

      {sent ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center rounded-xl border border-success/20 bg-success/10 p-6">
            <Mail className="h-10 w-10 text-success mb-3" />
            <p className="text-body text-text-primary text-center">
              We sent a password reset link to{" "}
              <span className="font-medium text-accent">{email}</span>
            </p>
            <p className="mt-2 text-small text-text-secondary text-center">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
          </div>
          <Button
            variant="secondary"
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
            <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
              {formError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-small text-accent-secondary hover:text-accent-secondary-hover transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
