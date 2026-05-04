import { createServiceClient } from "@/src/lib/supabase/service";
import type { Metadata } from "next";

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
        <h1 className="text-h2 text-text-primary mb-3">
          Invalid unsubscribe link
        </h1>
        <p className="text-text-secondary">
          This link is missing a token. If you'd like to unsubscribe, please
          use the link in the most recent email you received from us.
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
        <h1 className="text-h2 text-text-primary mb-3">Link expired</h1>
        <p className="text-text-secondary">
          This unsubscribe link is no longer valid. If you keep receiving
          emails from us, please reply to one of them and we'll handle it.
        </p>
      </Shell>
    );
  }

  if (done === "1" || contact.status === "unsubscribed") {
    return (
      <Shell>
        <p className="text-small font-mono text-accent mb-2">DONE</p>
        <h1 className="text-h2 text-text-primary mb-3">
          You've been unsubscribed
        </h1>
        <p className="text-text-secondary mb-2">
          We won't send any more marketing emails to{" "}
          <span className="text-text-primary font-mono">{contact.email}</span>.
        </p>
        <p className="text-text-tertiary text-small">
          You may still receive transactional emails (e.g., billing, password
          resets) since those aren't part of marketing campaigns.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-h2 text-text-primary mb-3">Unsubscribe?</h1>
      <p className="text-text-secondary mb-6">
        We'll stop sending marketing emails to{" "}
        <span className="text-text-primary font-mono">{contact.email}</span>.
        You can resubscribe later by signing up again.
      </p>
      <form action="/api/unsubscribe" method="POST" className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="w-full rounded-lg bg-accent text-white px-5 py-3 text-body font-medium hover:bg-accent/90 transition-colors"
        >
          Confirm unsubscribe
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Inline shell so this page doesn't pull in the marketing/dashboard
  // layouts — this is a public, standalone surface.
  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-2 p-8 shadow-lg">
        {children}
      </div>
    </div>
  );
}

