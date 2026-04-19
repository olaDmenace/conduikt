"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { isSigningOut } from "@/src/lib/auth/signing-out";
import { useToast } from "@/src/components/ui/toast";

const HEARTBEAT_MS = 4 * 60 * 1000; // Check every 4 minutes

/**
 * Guards the authenticated session on the client side.
 *
 * Three detection mechanisms:
 * 1. onAuthStateChange — catches Supabase-initiated sign-outs
 * 2. Visibility change — checks session when user returns to the tab
 * 3. Periodic heartbeat — catches silent expiry while tab is active
 *
 * On expiry: shows a warning toast and redirects to /login.
 */
export function SessionGuard() {
  const router = useRouter();
  const { toast } = useToast();
  const redirecting = useRef(false);

  const handleExpired = useCallback(() => {
    if (redirecting.current) return;
    redirecting.current = true;
    toast("Your session has expired. Please log in again.", "warning");
    router.push("/login");
  }, [router, toast]);

  const checkSession = useCallback(async () => {
    if (redirecting.current) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      handleExpired();
    }
  }, [handleExpired]);

  useEffect(() => {
    const supabase = createClient();

    // 1. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Skip when the user intentionally signed out — handleLogout owns
      // the redirect and toast in that case, and we don't want to race it
      // or show the "session expired" warning.
      if (event === "SIGNED_OUT" && !isSigningOut()) {
        handleExpired();
      }
    });

    // 2. Visibility change — check when user returns to tab
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 3. Periodic heartbeat while tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    }, HEARTBEAT_MS);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [handleExpired, checkSession]);

  return null;
}
