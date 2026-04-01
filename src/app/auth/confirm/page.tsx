"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Loader2 } from "lucide-react";

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next") ?? "/dashboard";

    async function confirm() {
      const supabase = createClient();

      let confirmed = false;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) confirmed = true;
      }

      if (!confirmed && tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "signup" | "recovery" | "email" | "invite",
          token_hash: tokenHash,
        });
        if (!error) confirmed = true;
      }

      if (confirmed) {
        if (type === "signup" || !type) {
          fetch("/api/auth/welcome", { method: "POST" }).catch(() => {});
        }
        router.replace(type === "recovery" ? "/reset-password" : next);
        return;
      }

      setError("The confirmation link is invalid or has expired.");
    }

    confirm();
  }, [searchParams, router]);

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
