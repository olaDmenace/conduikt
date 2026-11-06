import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encryptToken } from "@/src/lib/crypto/tokens";
import { assertPublicUrl, BlockedUrlError } from "@/src/lib/security/safe-fetch";
import { normaliseBaseUrl, testWordPressConnection } from "@/src/lib/integrations/wordpress";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { hostedPagePath, hostedSiteUrl, slugify } from "@/src/lib/hosted-pages/templates";

// Where this project's pages go live. One row per kind: 'hosted' needs only
// a site slug; 'wordpress' needs the site, a user and an Application
// Password (stored encrypted, tested before saving, never returned).

const hostedSchema = z.object({
  kind: z.literal("hosted"),
  siteSlug: z.string().min(2).max(40),
});

const wordpressSchema = z.object({
  kind: z.literal("wordpress"),
  baseUrl: z.string().min(4).max(200),
  username: z.string().min(1).max(100),
  appPassword: z.string().min(8).max(200),
});

const RESERVED = new Set(["www", "app", "api", "admin", "mail", "conduikt", "dashboard", "login", "signup", "static", "assets", "p"]);

function publicConnection(row: { id: string; kind: string; site_slug: string | null; base_url: string | null; username: string | null; updated_at?: string }) {
  return {
    id: row.id,
    kind: row.kind,
    siteSlug: row.site_slug,
    siteUrl: row.site_slug ? hostedSiteUrl(row.site_slug) : null,
    sitePath: row.site_slug ? hostedPagePath(row.site_slug) : null,
    baseUrl: row.base_url,
    username: row.username,
    updatedAt: row.updated_at ?? null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { data } = await ctx.supabase.from("site_connections").select("id, kind, site_slug, base_url, username, updated_at").eq("project_id", id);
  return NextResponse.json({ connections: (data ?? []).map(publicConnection), suggestedSiteSlug: slugify(ctx.project.name, 40) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const body = await request.json().catch(() => null);
  const parsed = z.discriminatedUnion("kind", [hostedSchema, wordpressSchema]).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the form: something is missing or too short" }, { status: 400 });

  if (parsed.data.kind === "hosted") {
    const siteSlug = slugify(parsed.data.siteSlug, 40);
    if (siteSlug.length < 2 || RESERVED.has(siteSlug)) return NextResponse.json({ error: "Pick a different site name" }, { status: 400 });
    const { data, error } = await supabase
      .from("site_connections")
      .upsert({ project_id: id, kind: "hosted", site_slug: siteSlug }, { onConflict: "project_id,kind" })
      .select("id, kind, site_slug, base_url, username, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That site name is taken. Try another" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ connection: publicConnection(data) });
  }

  let baseUrl: string;
  try {
    baseUrl = normaliseBaseUrl(parsed.data.baseUrl);
    await assertPublicUrl(baseUrl);
  } catch (err) {
    return NextResponse.json({ error: err instanceof BlockedUrlError ? `That address will not work: ${err.message}` : "That does not look like a website address" }, { status: 400 });
  }

  const test = await testWordPressConnection({ baseUrl, username: parsed.data.username, appPassword: parsed.data.appPassword });
  if (!test.ok) return NextResponse.json({ error: test.error }, { status: 422 });

  const { data, error } = await supabase
    .from("site_connections")
    .upsert(
      { project_id: id, kind: "wordpress", base_url: baseUrl, username: parsed.data.username, secret_encrypted: encryptToken(parsed.data.appPassword) },
      { onConflict: "project_id,kind" }
    )
    .select("id, kind, site_slug, base_url, username, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: publicConnection(data), connectedAs: test.name });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "hosted" && kind !== "wordpress") return NextResponse.json({ error: "Say which connection: hosted or wordpress" }, { status: 400 });
  const { error } = await ctx.supabase.from("site_connections").delete().eq("project_id", id).eq("kind", kind);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: kind });
}
