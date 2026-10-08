"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { CheckCircle2 } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";

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
      <Shell>
        <CheckCircle2 className="mx-auto h-6 w-6 text-teal" aria-hidden />
        <h1 className="text-display-s text-text">Email confirmed</h1>
        <p className="text-body text-text-2">
          Your account is verified. Taking you to your dashboard…
        </p>
      </Shell>
    );
  }

  if (verifiedButNoSession) {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto h-6 w-6 text-teal" aria-hidden />
        <h1 className="text-display-s text-text">Email verified</h1>
        <p className="text-body text-text-2">
          Your account is confirmed. Sign in with your email and password to get started.
        </p>
        <Button asChild className="mt-2">
          <a href="/login">Sign in</a>
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <h1 className="text-display-s text-text">We couldn&apos;t confirm your email</h1>
        <p role="alert" className="text-body text-danger">{error}</p>
        <Button asChild variant="outline" className="mt-2">
          <a href="/login">Back to sign in</a>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="inline-flex items-center justify-center gap-2 text-body text-text-2" role="status">
        <span className="live-dot" aria-hidden />
        Confirming your account…
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-12">
      <Link
        href="/"
        aria-label="Conduikt home"
        className="mb-10 flex items-center gap-2.5 text-text"
      >
        <Image src="/conduikt-icon.png" alt="" width={32} height={32} priority className="h-8 w-8" />
        <span className="font-display text-lg font-medium tracking-tight">Conduikt</span>
      </Link>
      <div className="mx-auto w-full max-w-[400px] space-y-4 text-center">{children}</div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="inline-flex items-center justify-center gap-2 text-body text-text-2" role="status">
            <span className="live-dot" aria-hidden />
            Loading…
          </p>
        </Shell>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
