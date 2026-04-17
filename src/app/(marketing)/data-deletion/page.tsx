import Link from "next/link";
import { Trash2 } from "lucide-react";

export const metadata = {
  title: "User Data Deletion — Conduikt",
  description:
    "How to request deletion of your Conduikt account and any data we hold about you, including data collected via connected third-party platforms.",
  alternates: { canonical: "https://conduikt.com/data-deletion/" },
};

export default function DataDeletionPage() {
  const lastUpdated = "April 15, 2026";

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Trash2 className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-display mb-3 text-text-primary">
            User Data Deletion
          </h1>
          <p className="text-body text-text-secondary">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-text-secondary">
          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              1. Your right to be forgotten
            </h2>
            <p className="text-body leading-relaxed">
              You can request full deletion of your Conduikt account and every
              piece of data we hold about you at any time. This includes your
              profile, projects, generated content, scheduled posts, uploaded
              media, connected social account tokens, and any data we collected
              from connected third-party platforms (X, LinkedIn, Google Search
              Console).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              2. Option A — Self-serve from Settings
            </h2>
            <p className="text-body leading-relaxed">
              If you have an active Conduikt account, the fastest way is:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-body">
              <li>
                Sign in to Conduikt and open{" "}
                <Link href="/settings" className="text-accent hover:underline">
                  Settings
                </Link>
                .
              </li>
              <li>
                Under <strong className="text-text-primary">Integrations</strong>,
                disconnect any connected social accounts. This revokes the
                stored tokens immediately.
              </li>
              <li>
                Email us (see below) to trigger full account deletion. We
                confirm within 48 hours and purge your data within 30 days.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              3. Option B — Email request
            </h2>
            <p className="text-body leading-relaxed">
              Send an email to{" "}
              <a
                href="mailto:hello@conduikt.com?subject=Data%20Deletion%20Request"
                className="text-accent hover:underline"
              >
                hello@conduikt.com
              </a>{" "}
              with the subject line{" "}
              <strong className="text-text-primary">
                &quot;Data Deletion Request&quot;
              </strong>{" "}
              from the email address associated with your Conduikt account.
              Include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body">
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

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              4. What we delete
            </h2>
            <ul className="list-disc list-inside space-y-2 text-body">
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

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              5. Data we retain
            </h2>
            <p className="text-body leading-relaxed">
              We may retain a small amount of data for legal and accounting
              obligations only — specifically, invoice records required by tax
              law. These records contain transaction amounts and dates but no
              platform content or connected-account data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">
              6. Revoking access directly from the platform
            </h2>
            <p className="text-body leading-relaxed">
              You can also revoke Conduikt&apos;s access to your social accounts
              from the platforms themselves, independent of any request to us:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>
                <strong className="text-text-primary">X (Twitter)</strong> —
                Settings → Security → Apps and sessions → Connected apps →
                Revoke Conduikt
              </li>
              <li>
                <strong className="text-text-primary">LinkedIn</strong> —
                Settings → Data privacy → Permitted services → Remove Conduikt
              </li>
              <li>
                <strong className="text-text-primary">Google</strong> —{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Third-party apps with account access
                </a>{" "}
                → Conduikt → Remove access
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">7. Timeline</h2>
            <p className="text-body leading-relaxed">
              We acknowledge deletion requests within 48 hours and complete
              deletion within 30 days. You will receive an email confirmation
              once the deletion is complete.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">8. Contact</h2>
            <p className="text-body leading-relaxed">
              Questions about this process? Email{" "}
              <a
                href="mailto:hello@conduikt.com"
                className="text-accent hover:underline"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>
        </div>

      <div className="mt-16 border-t border-border-subtle pt-8 flex items-center justify-between text-small text-text-tertiary">
        <span>© {new Date().getFullYear()} Conduikt · Technicity Digital</span>
        <div className="flex gap-4">
          <Link
            href="/privacy"
            className="hover:text-text-secondary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:text-text-secondary transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
