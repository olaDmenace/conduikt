"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Twitter, Linkedin, Mail } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
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
            onClick={() => setEmailSent(false)}
            className="text-accent-secondary hover:text-accent-secondary-hover transition-colors"
          >
            try signing up again
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#C88550]">
          <span className="text-xl font-bold text-surface-0">C</span>
        </div>
        <h1 className="text-h1">Create your account</h1>
        <p className="mt-2 text-body text-text-secondary">
          Start automating your marketing with AI
        </p>
      </div>

      {/* Social login — coming soon */}
      <div className="mb-6 space-y-3">
        <button
          type="button"
          disabled
          title="X login coming soon"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-3 bg-surface-1 px-4 py-2.5 text-small font-medium text-text-tertiary opacity-50 cursor-not-allowed"
        >
          <Twitter className="h-4 w-4" />
          Continue with X
          <span className="ml-auto rounded bg-surface-2 px-1.5 py-0.5 text-[0.6875rem] text-text-tertiary">Soon</span>
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
      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          placeholder="Olayinka Doe"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
            {error}
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
