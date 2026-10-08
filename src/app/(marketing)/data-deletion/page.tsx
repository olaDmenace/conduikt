import Link from "next/link";

export const metadata = {
  title: "User Data Deletion — Conduikt",
  description:
    "How to request deletion of your Conduikt account and any data we hold about you, including data collected via connected third-party platforms.",
  alternates: { canonical: "https://conduikt.com/data-deletion/" },
};

export default function DataDeletionPage() {
  const lastUpdated = "April 15, 2026";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-16 md:px-10 md:pt-24">
        {/* Header */}
        <div className="mb-12 max-w-[760px] border-b border-line pb-8">
          <p className="mb-4 text-label text-accent">Legal</p>
          <h1 className="mb-3 text-display-m text-text">
            User data deletion
          </h1>
          <p className="text-body-s text-text-3">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose-conduikt">
          <section>
            <h2>
              1. Your right to be forgotten
            </h2>
            <p>
              You can request full deletion of your Conduikt account and every
              piece of data we hold about you at any time. This includes your
              profile, projects, generated content, scheduled posts, uploaded
              media, connected social account tokens, and any data we collected
              from connected third-party platforms (X, LinkedIn, Google Search
              Console).
            </p>
          </section>

          <section>
            <h2>
              2. Option A — Self-serve from Settings
            </h2>
            <p>
              If you have an active Conduikt account, the fastest way is:
            </p>
            <ol className="list-decimal">
              <li>
                Sign in to Conduikt and open{" "}
                <Link href="/settings">
                  Settings
                </Link>
                .
              </li>
              <li>
                Under <strong>Integrations</strong>,
                disconnect any connected social accounts. This revokes the
                stored tokens immediately.
              </li>
              <li>
                Email us (see below) to trigger full account deletion. We
                confirm within 48 hours and purge your data within 30 days.
              </li>
            </ol>
          </section>

          <section>
            <h2>
              3. Option B — Email request
            </h2>
            <p>
              Send an email to{" "}
              <a
                href="mailto:hello@conduikt.com?subject=Data%20Deletion%20Request"
              >
                hello@conduikt.com
              </a>{" "}
              with the subject line{" "}
              <strong>
                &quot;Data Deletion Request&quot;
              </strong>{" "}
              from the email address associated with your Conduikt account.
              Include:
            </p>
            <ul className="list-disc">
              <li>Your full name on the account</li>
              <li>
                The third-party platforms you connected (so we can confirm each
                integration&apos;s data is removed)
              </li>
              <li>
                Whether you want a copy of your data before deletion (optional)
              </li>
            </ul>
          </section>

          <section>
            <h2>
              4. What we delete
            </h2>
            <ul className="list-disc">
              <li>
                Your profile row in our database, including name, email, plan,
                and brand settings
              </li>
              <li>
                All projects, generated content, drafts, scheduled posts,
                published assets, and uploaded media
              </li>
              <li>
                All connected-account records, including OAuth tokens for X,
                LinkedIn, and Google Search Console
              </li>
              <li>AI generation logs and usage history tied to your user ID</li>
              <li>Notifications, webhook configs, and API activity logs</li>
            </ul>
          </section>

          <section>
            <h2>
              5. Data we retain
            </h2>
            <p>
              We may retain a small amount of data for legal and accounting
              obligations only — specifically, invoice records required by tax
              law. These records contain transaction amounts and dates but no
              platform content or connected-account data.
            </p>
          </section>

          <section>
            <h2>
              6. Revoking access directly from the platform
            </h2>
            <p>
              You can also revoke Conduikt&apos;s access to your social accounts
              from the platforms themselves, independent of any request to us:
            </p>
            <ul className="list-disc">
              <li>
                <strong>X (Twitter)</strong> —
                Settings → Security → Apps and sessions → Connected apps →
                Revoke Conduikt
              </li>
              <li>
                <strong>LinkedIn</strong> —
                Settings → Data privacy → Permitted services → Remove Conduikt
              </li>
              <li>
                <strong>Google</strong> —{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Third-party apps with account access
                </a>{" "}
                → Conduikt → Remove access
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Timeline</h2>
            <p>
              We acknowledge deletion requests within 48 hours and complete
              deletion within 30 days. You will receive an email confirmation
              once the deletion is complete.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>
              Questions about this process? Email{" "}
              <a
                href="mailto:hello@conduikt.com"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>
        </div>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8 text-body-s text-text-3">
        <span>© {new Date().getFullYear()} Conduikt · Technicity Digital</span>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="hover-link hover:text-text"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="hover-link hover:text-text"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
