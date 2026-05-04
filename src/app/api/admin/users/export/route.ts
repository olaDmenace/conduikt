import { NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { requireAdmin } from "@/src/lib/admin/auth";

// GET /api/admin/users/export
// Returns a CSV with one row per registered Conduikt user. Admin-only.
//
// Columns: email, full_name, plan, role, created_at
//
// Use case: dogfood the email-marketing flow on your own user list. Download
// here, then paste into Audiences > Import CSV. Don't actually broadcast to
// users without checking your TOS / consent first — these are sign-up emails,
// not opted-in marketing contacts.

function escapeCsvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the value contains a comma, quote, or newline.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createServiceClient();

  // Profiles holds plan + role + full_name. Email lives on auth.users —
  // we hit it via the admin API since it's not exposed via PostgREST.
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, full_name, plan, role, created_at")
    .order("created_at", { ascending: false });

  if (profilesErr) {
    return NextResponse.json({ error: profilesErr.message }, { status: 500 });
  }

  // Resolve emails via auth admin. listUsers paginates at 1000/page —
  // for any user list bigger than that we'd need to iterate. Conduikt is
  // small enough today that one page covers it; flag as a TODO if we ever
  // exceed.
  const emailMap = new Map<string, string>();
  let page = 1;
  // Cap at 10 pages = 10k users to avoid runaway loops.
  while (page <= 10) {
    const { data: usersPage, error: usersErr } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (usersErr) {
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }
    for (const u of usersPage?.users ?? []) {
      if (u.id && u.email) emailMap.set(u.id, u.email);
    }
    if (!usersPage || usersPage.users.length < 1000) break;
    page++;
  }

  const header = "email,full_name,plan,role,created_at";
  const rows = (profiles ?? []).map((p) => {
    const email = emailMap.get(p.id) ?? "";
    return [
      escapeCsvField(email),
      escapeCsvField(p.full_name),
      escapeCsvField(p.plan ?? "free"),
      escapeCsvField(p.role ?? "user"),
      escapeCsvField(p.created_at),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `conduikt-users-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
