"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "@/src/components/ui/lucide-icons";
import { mapSupabaseAuthError } from "@/src/lib/auth/error-map";

interface ResetFieldErrors {
  password?: string;
  confirmPassword?: string;
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    async function verifyToken() {
      // Handle PKCE flow: ?code= query param
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("This reset link is invalid or has expired. Please request a new one.");
        } else {
          setSessionReady(true);
        }
        setVerifying(false);
        return;
      }

      // Handle implicit flow: #access_token= hash fragment
      // Parse the hash directly — do NOT rely on onAuthStateChange which can
      // miss the PASSWORD_RECOVERY event due to listener attachment timing.
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") ?? "";
      const type = hashParams.get("type");

      if (accessToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError("This reset link is invalid or has expired. Please request a new one.");
        } else {
          setSessionReady(true);
          // Clear the hash so the token isn't reused
          window.history.replaceState(null, "", window.location.pathname);
        }
        setVerifying(false);
        return;
      }

      // No code or hash — check if there's already an active recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setError("This reset link is invalid or has expired. Please request a new one.");
      }
      setVerifying(false);
    }

    verifyToken();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const next: ResetFieldErrors = {};
    if (!password) {
      next.password = "Please enter a password.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (password && password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);
    if (next.password || next.confirmPassword) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(mapSupabaseAuthError(error.message));
      setLoading(false);
      return;
    }

    setDone(true);
    toast("Password updated.", "success");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="animate-in">
      <div className="mb-8 text-center">
        <h1 className="text-display-s text-text">Set a new password</h1>
        <p className="mt-3 text-body text-text-2">
          {done
            ? "Password updated. Taking you to your dashboard."
            : "Choose a strong password for your account."}
        </p>
      </div>

      {/* Verifying token */}
      {verifying && (
        <div className="space-y-4" role="status" aria-label="Checking your reset link">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <p className="text-center text-body-s text-text-3">Checking your reset link…</p>
        </div>
      )}

      {/* Invalid / expired link */}
      {!verifying && !sessionReady && !done && (
        <div className="space-y-6">
          <div role="alert" className="rounded-md border border-line bg-surface-2 px-4 py-4 text-center text-body-s text-danger">
            {error}
          </div>
          <Button
            variant="outline"
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
          <CheckCircle2 className="h-6 w-6 text-teal" aria-hidden />
          <p className="text-body text-text">
            Your password has been updated.
          </p>
        </div>
      )}

      {/* Password form */}
      {!verifying && sessionReady && !done && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="relative">
            <Input
              label="New password"
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

          <Input
            label="Confirm new password"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
            }}
            error={fieldErrors.confirmPassword}
            aria-invalid={!!fieldErrors.confirmPassword}
          />

          {/* Strength hints */}
          {password.length > 0 && (
            <ul className="space-y-1 text-body-s">
              <li className={password.length >= 8 ? "text-teal" : "text-text-3"}>
                {password.length >= 8 ? "✓" : "·"} At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? "text-teal" : "text-text-3"}>
                {/[A-Z]/.test(password) ? "✓" : "·"} One uppercase letter
              </li>
              <li className={/[0-9]/.test(password) ? "text-teal" : "text-text-3"}>
                {/[0-9]/.test(password) ? "✓" : "·"} One number
              </li>
            </ul>
          )}

          {error && (
            <div role="alert" className="rounded-md border border-line bg-surface-2 px-4 py-3 text-body-s text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? (
              "Updating…"
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
