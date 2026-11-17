import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlan } from "@/src/lib/plans";

// Branding for the public /unsubscribe and /confirm pages.
//
// Agency-tier owners get a white-label page: the project's own name and
// logo, no Conduikt name or icon anywhere. Everyone else gets the
// Conduikt frame. Resolved from the contact token -> audience -> project
// -> owner profile, all under the service client (these pages have no
// session).

export interface PublicPageBrand {
  /** True when the page must not mention Conduikt. */
  whiteLabel: boolean;
  name: string;
  logoUrl: string | null;
}

export const CONDUIKT_BRAND: PublicPageBrand = {
  whiteLabel: false,
  name: "Conduikt",
  logoUrl: "/conduikt-icon.png",
};

export interface BrandSources {
  plan: string | null | undefined;
  projectName?: string | null;
  clientName?: string | null;
  clientLogoUrl?: string | null;
  profileLogoUrl?: string | null;
}

/** Pure: decide the brand from the owner's plan and what they've set up. */
export function pickPublicBrand(src: BrandSources): PublicPageBrand {
  if (normalizePlan(src.plan) !== "agency") return CONDUIKT_BRAND;
  const name = (src.clientName ?? "").trim() || (src.projectName ?? "").trim() || "";
  const logoUrl = (src.clientLogoUrl ?? "").trim() || (src.profileLogoUrl ?? "").trim() || null;
  if (!name && !logoUrl) return CONDUIKT_BRAND;
  return { whiteLabel: true, name: name || "", logoUrl };
}

/**
 * Looks the brand up for a contact row. `tokenColumn` says which token the
 * page was opened with. Any lookup failure falls back to the Conduikt frame.
 */
export async function resolvePublicBrandForToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  tokenColumn: "unsubscribe_token" | "confirm_token",
  token: string
): Promise<PublicPageBrand> {
  try {
    const { data: contact } = await supabase
      .from("audience_contacts")
      .select("audience_id")
      .eq(tokenColumn, token)
      .maybeSingle();
    if (!contact?.audience_id) return CONDUIKT_BRAND;

    const { data: audience } = await supabase
      .from("audiences")
      .select("project_id, user_id")
      .eq("id", contact.audience_id)
      .maybeSingle();
    if (!audience) return CONDUIKT_BRAND;

    const [{ data: project }, { data: profile }] = await Promise.all([
      supabase
        .from("projects")
        .select("name, client_name, client_logo_url")
        .eq("id", audience.project_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("plan, brand_logo_url")
        .eq("id", audience.user_id)
        .maybeSingle(),
    ]);

    return pickPublicBrand({
      plan: profile?.plan,
      projectName: project?.name,
      clientName: project?.client_name,
      clientLogoUrl: project?.client_logo_url,
      profileLogoUrl: profile?.brand_logo_url,
    });
  } catch {
    return CONDUIKT_BRAND;
  }
}
