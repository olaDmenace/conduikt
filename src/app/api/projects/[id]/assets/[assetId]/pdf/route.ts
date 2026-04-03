import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GrowthPlaybookDocument } from "@/src/lib/pdf/growth-playbook";
import { BlogPostDocument } from "@/src/lib/pdf/blog-post";
import { GenericContentDocument } from "@/src/lib/pdf/generic-content";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id, assetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", id)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();

  const projectName = project?.name ?? "Project";
  const date = new Date(asset.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = asset.content as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: any;
  let filename = `conduikt-${asset.type}-${assetId.slice(0, 8)}.pdf`;

  if (asset.type === "growth_playbook") {
    const parsed = (content?.parsed ?? content) as Record<string, unknown>;
    doc = React.createElement(GrowthPlaybookDocument, {
      projectName,
      date,
      data: parsed,
    });
    const title = (parsed?.title as string) ?? asset.title ?? "Growth Playbook";
    filename = `${title.slice(0, 40).replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
  } else if (asset.type === "blog_post") {
    const parsed = (content?.parsed ?? content) as Record<string, unknown>;
    doc = React.createElement(BlogPostDocument, {
      projectName,
      date,
      data: parsed,
    });
    const slug = (parsed?.slug as string) ?? "blog-post";
    filename = `${slug.slice(0, 40)}.pdf`;
  } else {
    // Generic fallback for all other types
    let rawContent = "";
    if (typeof content?.raw === "string") rawContent = content.raw;
    else rawContent = JSON.stringify(content, null, 2);

    doc = React.createElement(GenericContentDocument, {
      title: asset.title ?? "",
      type: asset.type,
      projectName,
      date,
      rawContent,
    });
    filename = `conduikt-${asset.type}-${assetId.slice(0, 8)}.pdf`;
  }

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
