// Marketing kit PDF download. Auth-required so the kit can later be
// joined to referral / share-tracking metadata, and so it doesn't get
// harvested by scrapers.
//
// The PDF itself is non-personalised — every advocate gets the same
// pitch — so we don't need any project context, just an authenticated
// user.

import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { MarketingOnePagerDocument } from "@/src/lib/pdf/marketing-onepager";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doc = React.createElement(MarketingOnePagerDocument);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="conduikt-one-pager.pdf"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
