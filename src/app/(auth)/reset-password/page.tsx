"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    // Handle PKCE flow: ?code= query param
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setError("This reset link is invalid or has expired. Please request a new one.");
          } else {
            setSessionReady(true);
          }
          setVerifying(false);
        });
      return;
    }

    // Handle implicit flow: #access_token= hash fragment
    // Supabase JS SDK picks up the hash automatically and fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setSessionReady(true);
          setVerifying(false);
        }
      }
    );

    // Give the hash fragment a moment to be processed
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSessionReady(true);
        } else {
          setError("This reset link is invalid or has expired. Please request a new one.");
        }
        setVerifying(false);
      });
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    toast("Password updated successfully!", "success");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="animate-in">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#C88550]">
          <span className="text-xl font-bold text-surface-0">C</span>
        </div>
        <h1 className="text-h1">Set new password</h1>
        <p className="mt-2 text-body text-text-secondary">
          {done
            ? "Password updated — redirecting you to the dashboard"
            : "Choose a strong password for your account"}
        </p>
      </div>

      {/* Verifying token */}
      {verifying && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <p className="text-body text-text-secondary">Verifying reset link…</p>
        </div>
      )}

      {/* Invalid / expired link */}
      {!verifying && !sessionReady && !done && (
        <div className="space-y-6">
          <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-4 text-small text-error text-center">
            {error}
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push("/forgot-password")}
          >
            Request a new reset link
          </Button>
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
          <p className="text-body text-text-primary">
            Your password has been updated.
          </p>
        </div>
      )}

      {/* Password form */}
      {!verifying && sessionReady && !done && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9 text-text-tertiary hover:text-text-primary transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <Input
            label="Confirm new password"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {/* Strength hints */}
          {password.length > 0 && (
            <ul className="space-y-1 text-small">
              <li className={password.length >= 8 ? "text-success" : "text-text-tertiary"}>
                {password.length >= 8 ? "✓" : "·"} At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? "text-success" : "text-text-tertiary"}>
                {/[A-Z]/.test(password) ? "✓" : "·"} One uppercase letter
              </li>
              <li className={/[0-9]/.test(password) ? "text-success" : "text-text-tertiary"}>
                {/[0-9]/.test(password) ? "✓" : "·"} One number
              </li>
            </ul>
          )}

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-small text-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Update password
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
