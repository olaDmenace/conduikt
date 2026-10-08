import { createServiceClient } from "@/src/lib/supabase/service";
import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Unsubscribe — Conduikt",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string; done?: string }>;
}

// Server Component. GET /unsubscribe?token=X — confirm page.
// GET /unsubscribe?token=X&done=1 — confirmation after the API flipped them.
//
// The actual flip happens at /api/unsubscribe (POST). The form on this page
// posts there, which then redirects back here with done=1.

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token, done } = await searchParams;

  if (!token) {
    return (
      <Shell>
        <h1 className="mb-3 text-heading text-text">
          This unsubscribe link isn&apos;t complete
        </h1>
        <p className="text-body text-text-2">
          The link is missing part of its address. To unsubscribe, use the
          link in the most recent email you received from us.
        </p>
      </Shell>
    );
  }

  const supabase = createServiceClient();
  const { data: contact } = await supabase
    .from("audience_contacts")
    .select("id, email, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!contact) {
    return (
      <Shell>
        <h1 className="mb-3 text-heading text-text">This link has expired</h1>
        <p className="text-body text-text-2">
          This unsubscribe link no longer works. If you keep receiving
          emails from us, reply to one of them and we&apos;ll handle it.
        </p>
      </Shell>
    );
  }

  if (done === "1" || contact.status === "unsubscribed") {
    return (
      <Shell>
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
      </Shell>
    );
  }

  return (
    <Shell>
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Inline shell so this page doesn't pull in the marketing/dashboard
  // layouts: this is a public, standalone surface.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5 text-text">
        <Image src="/conduikt-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
        <span className="font-display text-lg font-medium tracking-tight">Conduikt</span>
      </div>
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
