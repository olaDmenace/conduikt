import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { verifyProjectOwnership } from "@/src/lib/auth/verify-ownership";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; seqId: string }> }
) {
  const { id, seqId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownedProject = await verifyProjectOwnership(supabase, id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: sequence, error } = await supabase
    .from("email_sequences")
    .select(
      `
      *,
      email_sequence_steps (
        id,
        step_order,
        subject,
        delay_days,
        asset_id,
        assets (
          id,
          content,
          title,
          status
        )
      )
    `
    )
    .eq("id", seqId)
    .eq("project_id", id)
    .single();

  if (error || !sequence) {
    return NextResponse.json(
      { error: "Sequence not found" },
      { status: 404 }
    );
  }

  // Sort steps by step_order
  if (Array.isArray(sequence.email_sequence_steps)) {
    sequence.email_sequence_steps.sort(
      (a: { step_order: number }, b: { step_order: number }) =>
        a.step_order - b.step_order
    );
  }

  return NextResponse.json(sequence);
}
