import type { Metadata } from "next";
import { createServiceClient } from "@/src/lib/supabase/service";
import { confirmContactByToken, isWellFormedConfirmToken } from "@/src/lib/email/confirm";
import { CONDUIKT_BRAND, resolvePublicBrandForToken } from "@/src/lib/email/public-brand";
import { PublicShell, publicTitle } from "@/src/app/unsubscribe/public-shell";

interface PageProps {
  searchParams: Promise<{ token?: string; state?: string }>;
}

type Outcome = "confirmed" | "already" | "expired" | "invalid" | "not_pending" | "error";

function outcomeFromState(state: string | undefined): Outcome | null {
  switch (state) {
    case "done":
      return "confirmed";
    case "already":
    case "expired":
    case "invalid":
    case "not_pending":
    case "error":
      return state;
    default:
      return null;
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { token } = await searchParams;
  const brand =
    token && isWellFormedConfirmToken(token)
      ? await resolvePublicBrandForToken(createServiceClient(), "confirm_token", token)
      : CONDUIKT_BRAND;
  return {
    title: publicTitle("Confirm your email", brand),
    robots: { index: false, follow: false },
  };
}

// Double opt-in landing page. GET /confirm?token=X
//
// The confirmation email links straight here. Opening the page confirms
// the contact (flip to 'subscribed', record confirmed_at, enrol in the
// waiting email series) and shows the result. /api/confirm does the same
// for programmatic callers and redirects here with ?state=.
//
// Branding follows the unsubscribe page: Agency-tier owners get their own
// brand with no Conduikt name or logo.

export default async function ConfirmPage({ searchParams }: PageProps) {
  const { token, state } = await searchParams;

  if (!token) {
    return (
      <PublicShell brand={CONDUIKT_BRAND}>
        <h1 className="mb-3 text-heading text-text">This link isn&apos;t complete</h1>
        <p className="text-body text-text-2">
          The link is missing part of its address. Open the link from the
          confirmation email again, or sign up once more to get a new one.
        </p>
      </PublicShell>
    );
  }

  const supabase = createServiceClient();
  // The token stays on the row after confirming, so the brand resolves on
  // the redirect from /api/confirm and on a reload of this page too.
  const brand = await resolvePublicBrandForToken(supabase, "confirm_token", token);

  // Already handled by /api/confirm (redirect with ?state=): don't re-run.
  let outcome: Outcome | null = outcomeFromState(state);
  let email: string | null = null;
  if (!outcome) {
    const result = await confirmContactByToken(supabase, token);
    outcome = result.state;
    if (result.ok) email = result.email;
  }

  if (outcome === "confirmed" || outcome === "already") {
    return (
      <PublicShell brand={brand}>
        <p className="mb-3 text-label text-teal">Done</p>
        <h1 className="mb-3 text-heading text-text">You&apos;re subscribed</h1>
        <p className="mb-2 text-body text-text-2">
          {email ? (
            <>
              Thanks for confirming. Emails will come to{" "}
              <span className="break-all font-mono text-text">{email}</span>.
            </>
          ) : (
            "Thanks for confirming. You're on the list."
          )}
        </p>
        <p className="text-body-s text-text-3">
          Every email has an unsubscribe link at the bottom if you change your mind.
        </p>
      </PublicShell>
    );
  }

  if (outcome === "expired") {
    return (
      <PublicShell brand={brand}>
        <h1 className="mb-3 text-heading text-text">This link has expired</h1>
        <p className="text-body text-text-2">
          Confirmation links stop working after two weeks. Sign up again and
          we&apos;ll send you a fresh one.
        </p>
      </PublicShell>
    );
  }

  if (outcome === "not_pending") {
    return (
      <PublicShell brand={brand}>
        <h1 className="mb-3 text-heading text-text">This address isn&apos;t on the list</h1>
        <p className="text-body text-text-2">
          This address unsubscribed, or emails to it stopped going through, after
          this link was sent. We haven&apos;t changed anything. If you&apos;d like to
          hear from us again, sign up once more.
        </p>
      </PublicShell>
    );
  }

  if (outcome === "error") {
    return (
      <PublicShell brand={brand}>
        <h1 className="mb-3 text-heading text-text">Something went wrong</h1>
        <p className="text-body text-text-2">
          We couldn&apos;t confirm your email just now. Open the link again in a minute.
        </p>
      </PublicShell>
    );
  }

  return (
    <PublicShell brand={brand}>
      <h1 className="mb-3 text-heading text-text">This link doesn&apos;t work</h1>
      <p className="text-body text-text-2">
        We couldn&apos;t find a sign-up for this link. The address may have
        been removed, or the link was copied incompletely. Sign up again to
        get a new one.
      </p>
    </PublicShell>
  );
}
