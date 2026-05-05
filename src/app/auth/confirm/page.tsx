"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [verifiedButNoSession, setVerifiedButNoSession] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next") ?? "/dashboard";
    const urlError = searchParams.get("error_description") || searchParams.get("error");

    // Also check hash fragment (some Supabase flows put tokens there)
    const hash = typeof window !== "undefined" ? window.location.hash : "";

    async function confirm() {
      const supabase = createClient();

      // If there's an error in the URL params, show it
      if (urlError) {
        setError(urlError);
        return;
      }

      let confirmed = false;
      let pkceAttempted = false;

      // Try PKCE code exchange first
      if (code) {
        pkceAttempted = true;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) confirmed = true;
      }

      // Try token_hash (magic link / OTP flow)
      if (!confirmed && tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "recovery" | "email" | "invite",
          token_hash: tokenHash,
        });
        if (!error) confirmed = true;
      }

      // Try hash fragment (implicit flow fallback)
      if (!confirmed && hash && hash.includes("access_token")) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) confirmed = true;
      }

      // Check if user is already signed in
      if (!confirmed) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) confirmed = true;
      }

      if (confirmed) {
        if (type === "signup" || !type) {
          fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});
          setConfirmed(true);
          setTimeout(() => {
            router.replace(next);
          }, 2000);
          return;
        }
        router.replace(type === "recovery" ? "/reset-password" : next);
        return;
      }

      // PKCE code was present but exchange failed — this usually means the
      // email link was opened in a different browser/tab than the signup.
      // Supabase already verified the email on their end before redirecting
      // here, so the account IS confirmed — we just can't create a session.
      if (pkceAttempted) {
        setVerifiedButNoSession(true);
        return;
      }

      setError(
        "The confirmation link is invalid or has expired. Please request a new one from the login page."
      );
    }

    confirm();
  }, [searchParams, router]);

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Email confirmed!</h1>
          <p className="text-body text-text-secondary">
            Your account is verified. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (verifiedButNoSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Email verified!</h1>
          <p className="text-body text-text-secondary">
            Your account has been confirmed. Please sign in with your email and password to get started.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 rounded-lg bg-gradient-to-br from-[#D9663A] to-[#B24E27] px-6 py-2.5 text-small font-medium text-on-accent hover:brightness-110 transition-all"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-sm space-y-4 text-center">
          <p className="text-body text-error">{error}</p>
          <a
            href="/login"
            className="text-small text-accent-secondary hover:text-accent-secondary-hover transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-body text-text-secondary">Confirming your account...</p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-body text-text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
