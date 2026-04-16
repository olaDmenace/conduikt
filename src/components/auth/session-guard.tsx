"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { useToast } from "@/src/components/ui/toast";

/**
 * Listens for Supabase auth state changes on the client.
 * If the session expires while the user has the tab open
 * (e.g., after hours of inactivity), shows a toast and
 * redirects to /login instead of silently failing on the
 * next API call.
 */
export function SessionGuard() {
  const router = useRouter();
  const { toast } = useToast();
  const wasSignedIn = useRef(true);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && wasSignedIn.current) {
        toast("Your session has expired. Please log in again.", "warning");
        router.push("/login");
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        wasSignedIn.current = true;
      }

      if (event === "SIGNED_OUT") {
        wasSignedIn.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, toast]);

  return null;
}
