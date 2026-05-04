"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
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
    toast("Password updated successfully!", "success");
    setTimeout(() => router.push("/dashboard"), 1500);
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
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
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
              className="absolute right-3 top-9 text-text-tertiary hover:text-text-primary transition-colors"
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
