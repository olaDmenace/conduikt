import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sequences, error } = await supabase
    .from("email_sequences")
    .select(
      `
      id,
      name,
      type,
      status,
      created_at,
      email_sequence_steps ( id )
    `
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (sequences ?? []).map((seq) => ({
    ...seq,
    step_count: Array.isArray(seq.email_sequence_steps)
      ? seq.email_sequence_steps.length
      : 0,
    email_sequence_steps: undefined,
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, steps } = body;

  if (!name || !steps?.length) {
    return NextResponse.json(
      { error: "name and steps are required" },
      { status: 400 }
    );
  }

  // Create the sequence
  const { data: sequence, error: seqError } = await supabase
    .from("email_sequences")
    .insert({
      project_id: id,
      name,
      type: type || "nurture",
      status: "draft",
    })
    .select()
    .single();

  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }

  // Create steps and their asset records
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Create asset for the email content
    const { data: asset } = await supabase
      .from("assets")
      .insert({
        project_id: id,
        type: "email",
        channel: "email",
        title: step.subject,
        content: {
          subject: step.subject,
          preview_text: step.preview_text || "",
          html: step.html || "",
          cta_text: step.cta_text || "",
          cta_url: step.cta_url || "",
        },
        status: "draft",
      })
      .select("id")
      .single();

    await supabase.from("email_sequence_steps").insert({
      sequence_id: sequence.id,
      step_order: i + 1,
      subject: step.subject,
      delay_days: step.delay_days ?? (i === 0 ? 0 : 2),
      asset_id: asset?.id || null,
    });
  }

  return NextResponse.json(sequence, { status: 201 });
}
