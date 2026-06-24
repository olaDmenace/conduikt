import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import brackets from "@/src/lib/x-playbook/brackets.json";

// API for the /dashboard/x-playbook admin page.
// GET  → returns templates that need human input + the user's current values
// PATCH → upserts a single (ref, field_name, value) row

interface HumanField {
  name: string;
  label: string;
  hint?: string;
}

interface BracketTemplate {
  ref: string;
  day: number;
  slot: "A" | "B" | "C";
  needs: string[];
  humanFields?: HumanField[];
  text: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const humanTemplates = (brackets.templates as BracketTemplate[]).filter(
    (t) => t.needs.includes("human") && (t.humanFields?.length ?? 0) > 0
  );

  const refs = humanTemplates.map((t) => t.ref);
  const { data: rows, error } = await supabase
    .from("x_playbook_bracket_inputs")
    .select("ref, field_name, value, updated_at")
    .in("ref", refs);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group existing values by (ref, field_name)
  const valuesByRef: Record<string, Record<string, { value: string; updatedAt: string }>> = {};
  for (const r of rows ?? []) {
    if (!valuesByRef[r.ref]) valuesByRef[r.ref] = {};
    valuesByRef[r.ref][r.field_name] = { value: r.value, updatedAt: r.updated_at };
  }

  // Compute fireAt for each template
  const slotUtc = brackets.slotUtc as Record<string, string>;
  const startDate = brackets.startDate;
  const items = humanTemplates.map((t) => {
    const date = new Date(`${startDate}T${slotUtc[t.slot]}:00Z`);
    date.setUTCDate(date.getUTCDate() + (t.day - 1));
    return {
      ref: t.ref,
      day: t.day,
      slot: t.slot,
      fireAt: date.toISOString(),
      preview: t.text,
      fields: t.humanFields ?? [],
      values: valuesByRef[t.ref] ?? {},
    };
  });

  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ref?: unknown; field_name?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = typeof body.ref === "string" ? body.ref.trim() : "";
  const fieldName = typeof body.field_name === "string" ? body.field_name.trim() : "";
  const value = typeof body.value === "string" ? body.value.trim() : "";

  if (!ref || !fieldName) {
    return NextResponse.json(
      { error: "ref and field_name are required" },
      { status: 400 }
    );
  }

  // Validate against brackets.json — never accept a field we don't know about.
  const template = (brackets.templates as BracketTemplate[]).find((t) => t.ref === ref);
  if (!template || !(template.humanFields ?? []).some((f) => f.name === fieldName)) {
    return NextResponse.json(
      { error: `unknown bracket field: ${ref}/${fieldName}` },
      { status: 400 }
    );
  }

  if (value === "") {
    // Empty value = clear the row (lets the user "uncheck" a field).
    const { error } = await supabase
      .from("x_playbook_bracket_inputs")
      .delete()
      .eq("ref", ref)
      .eq("field_name", fieldName);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const { error } = await supabase.from("x_playbook_bracket_inputs").upsert(
    {
      ref,
      field_name: fieldName,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ref,field_name" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
