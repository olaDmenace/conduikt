import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";

// Public GET — returns the (safe) subset of a form's config so the
// embed JS can render without needing a separate authenticated round-trip.
//
// Returns: { id, name, headline, fields, submit_label, thank_you_message }
// Does NOT return: project_id, user_id, audience_id, sequence_id, etc.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const supabase = createServiceClient();

  const { data: form } = await supabase
    .from("lead_forms")
    .select("id, name, headline, fields, submit_label, thank_you_message, is_active")
    .eq("id", formId)
    .maybeSingle();

  if (!form || !form.is_active) {
    return NextResponse.json(
      { error: "Form not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    {
      id: form.id,
      name: form.name,
      headline: form.headline,
      fields: form.fields,
      submit_label: form.submit_label,
      thank_you_message: form.thank_you_message,
    },
    { headers: CORS_HEADERS }
  );
}
