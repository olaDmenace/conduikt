import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { sendWelcomeEmail } from "@/src/lib/email";

export async function POST() {
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

  return NextResponse.json({ ok: true });
}
