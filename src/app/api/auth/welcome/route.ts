import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { sendWelcomeEmail } from "@/src/lib/email";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const name =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";

  try {
    await sendWelcomeEmail(user.email, name);
  } catch {
    // Non-critical — don't fail the confirmation flow
  }

  // Referral attribution — consume cookie set by /r/{code}
  try {
    const cookieStore = await cookies();
    const refCode = cookieStore.get("conduikt_ref")?.value;
    if (refCode) {
      const svc = createServiceClient();
      const { data: link } = await svc
        .from("referral_links")
        .select("id, active")
        .eq("code", refCode)
        .maybeSingle();

      if (link?.active) {
        // Set referred_via on profile (idempotent — only if not already set)
        await svc
          .from("profiles")
          .update({
            referred_via: link.id,
            referred_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .is("referred_via", null);

        // Insert conversion row (unique on user_id — ignore conflicts)
        await svc
          .from("referral_conversions")
          .insert({
            referral_link_id: link.id,
            user_id: user.id,
            current_plan: "free",
          });

        // Clear cookie
        cookieStore.set("conduikt_ref", "", { maxAge: 0, path: "/" });
      }
    }
  } catch {
    // Non-critical — attribution failure shouldn't block welcome
  }

  return NextResponse.json({ ok: true });
}
