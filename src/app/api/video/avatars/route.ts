import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getUGCAvatars } from "@/src/lib/integrations/heygen";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gender = request.nextUrl.searchParams.get("gender") as
    | "male"
    | "female"
    | null;

  try {
    const avatars = await getUGCAvatars(gender ?? undefined);
    return NextResponse.json(avatars);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch avatars";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
