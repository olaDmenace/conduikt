import { createServiceClient } from "@/src/lib/supabase/service";
import type { Metadata } from "next";
import { Button } from "@/src/components/ui/button";
import { CONDUIKT_BRAND, resolvePublicBrandForToken } from "@/src/lib/email/public-brand";
import { PublicShell, publicTitle } from "./public-shell";

interface PageProps {
  searchParams: Promise<{ token?: string; done?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { token } = await searchParams;
  const brand = token
    ? await resolvePublicBrandForToken(createServiceClient(), "unsubscribe_token", token)
    : CONDUIKT_BRAND;
  return {
    title: publicTitle("Unsubscribe", brand),
    robots: { index: false, follow: false },
  };
}

// Server Component. GET /unsubscribe?token=X — confirm page.
// GET /unsubscribe?token=X&done=1 — confirmation after the API flipped them.
//
// The actual flip happens at /api/unsubscribe (POST). The form on this page
// posts there, which then redirects back here with done=1.
//
// Branding: Agency-tier owners see their own project brand here, with no
// Conduikt name or logo (see src/lib/email/public-brand.ts).

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token, done } = await searchParams;

  if (!token) {
    return (
      <PublicShell brand={CONDUIKT_BRAND}>
        <h1 className="mb-3 text-heading text-text">
          This unsubscribe link isn&apos;t complete
        </h1>
        <p className="text-body text-text-2">
          The link is missing part of its address. To unsubscribe, use the
          link in the most recent email you received from us.
        </p>
      </PublicShell>
    );
  }

  const supabase = createServiceClient();
  const [{ data: contact }, brand] = await Promise.all([
    supabase
      .from("audience_contacts")
      .select("id, email, status")
      .eq("unsubscribe_token", token)
      .maybeSingle(),
    resolvePublicBrandForToken(supabase, "unsubscribe_token", token),
  ]);

  if (!contact) {
    return (
      <PublicShell brand={brand}>
        <h1 className="mb-3 text-heading text-text">This link has expired</h1>
        <p className="text-body text-text-2">
          This unsubscribe link no longer works. If you keep receiving
          emails from us, reply to one of them and we&apos;ll handle it.
        </p>
      </PublicShell>
    );
  }

  if (done === "1" || contact.status === "unsubscribed") {
    return (
      <PublicShell brand={brand}>
        <p className="mb-3 text-label text-teal">Done</p>
        <h1 className="mb-3 text-heading text-text">
          You&apos;ve been unsubscribed
        </h1>
        <p className="mb-2 text-body text-text-2">
          We won&apos;t send any more marketing emails to{" "}
          <span className="break-all font-mono text-text">{contact.email}</span>.
        </p>
        <p className="text-body-s text-text-3">
          You may still get account emails (like billing or password
          resets), since those aren&apos;t marketing.
        </p>
      </PublicShell>
    );
  }

  return (
    <PublicShell brand={brand}>
      <h1 className="mb-3 text-heading text-text">Unsubscribe?</h1>
      <p className="mb-6 text-body text-text-2">
        We&apos;ll stop sending marketing emails to{" "}
        <span className="break-all font-mono text-text">{contact.email}</span>.
        You can subscribe again later by signing up again.
      </p>
      <form action="/api/unsubscribe" method="POST" className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" className="w-full">
          Confirm unsubscribe
        </Button>
      </form>
    </PublicShell>
  );
}
