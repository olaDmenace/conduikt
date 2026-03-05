import { createServerClient } from "@supabase/ssr";

/**
 * Service-role Supabase client for server contexts that don't have user cookies
 * (webhooks, cron jobs, Inngest functions, etc.).
 * Bypasses RLS — use with care.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
