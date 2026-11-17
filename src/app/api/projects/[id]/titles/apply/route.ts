import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isResponse, requireProjectOwner } from "@/src/lib/missing-pages/api";
import { getPublishTarget } from "@/src/lib/hosted-pages/publish";
import { applyTitlesToWordPress, MAX_H1_CHARS, MAX_TITLE_CHARS, MAX_TITLE_PAGES, type TitleProposal } from "@/src/lib/seo/titles";

export const maxDuration = 120;

const ApplySchema = z.object({
  assetId: z.uuid().optional(),
  rows: z
    .array(
      z.object({
        url: z.url(),
        title: z.string().trim().min(1).max(MAX_TITLE_CHARS + 10),
        h1: z.string().trim().max(MAX_H1_CHARS + 10).optional(),
      })
    )
    .min(1, "Tick at least one row")
    .max(MAX_TITLE_PAGES),
});

// POST: apply accepted rows. With a WordPress connection the title goes to
// the page (WordPress prints it as the H1); otherwise the rows come back
// for the owner to paste by hand. Either way the proposal asset remembers
// what was accepted.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireProjectOwner(id);
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const raw = await request.json().catch(() => null);
  const parsed = ApplySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Send the rows to apply", code: "INVALID_INPUT" }, { status: 400 });
  }
  const { assetId, rows } = parsed.data;

  const target = await getPublishTarget(supabase, id);
  const now = new Date().toISOString();

  let applied: Array<{ url: string; title: string; link: string }> = [];
  let failed: Array<{ url: string; error: string }> = [];
  let manual: Array<{ url: string; title: string; h1?: string }> = [];

  if (target?.kind === "wordpress") {
    const out = await applyTitlesToWordPress(target.connection, rows);
    applied = out.applied;
    failed = out.failed;
  } else {
    manual = rows;
  }

  // Remember the decisions on the proposal, so a reload shows them.
  if (assetId) {
    const { data: asset } = await supabase.from("assets").select("id, content").eq("id", assetId).eq("project_id", id).eq("type", "seo_titles").maybeSingle();
    const proposal = asset?.content as TitleProposal | undefined;
    if (asset && proposal && Array.isArray(proposal.rows)) {
      const appliedUrls = new Set(applied.map((a) => a.url));
      const sentUrls = new Set(rows.map((r) => r.url));
      const next = {
        ...proposal,
        rows: proposal.rows.map((r) =>
          sentUrls.has(r.url)
            ? {
                ...r,
                accepted: true,
                proposedTitle: rows.find((x) => x.url === r.url)?.title ?? r.proposedTitle,
                proposedH1: rows.find((x) => x.url === r.url)?.h1 ?? r.proposedH1,
                appliedAt: appliedUrls.has(r.url) ? now : r.appliedAt ?? null,
              }
            : r
        ),
      };
      await supabase.from("assets").update({ content: next, status: applied.length > 0 ? "published" : "draft" }).eq("id", asset.id);
    }
  }

  return NextResponse.json({
    target: target?.kind ?? "none",
    applied,
    failed,
    manual,
    note:
      target?.kind === "wordpress"
        ? "Titles were set on your WordPress pages. WordPress shows the title as the main heading on most themes."
        : "No connected site, so copy these into your site's page settings by hand.",
  });
}
