import Link from "next/link";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Conduikt",
  description: "The terms governing your use of the Conduikt platform.",
};

export default function TermsPage() {
  const lastUpdated = "February 18, 2026";

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Nav */}
      <header className="border-b border-surface-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-primary font-semibold"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#C88550]">
              <span className="text-sm font-bold text-surface-0">C</span>
            </div>
            Conduikt
          </Link>
          <Link
            href="/login"
            className="text-small text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-display mb-3 text-text-primary">Terms of Service</h1>
          <p className="text-body text-text-secondary">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-10 text-text-secondary">

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">1. Acceptance of terms</h2>
            <p className="text-body leading-relaxed">
              By creating an account or using Conduikt (the &quot;Service&quot;), you agree
              to be bound by these Terms of Service. If you do not agree, do not use
              the Service. These terms apply to all users including individuals and
              organisations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">2. Description of service</h2>
            <p className="text-body leading-relaxed">
              Conduikt is an AI-powered marketing automation platform that helps users
              generate content, conduct SEO audits, and manage marketing assets.
              The Service is operated by Technicity Digital, Lagos, Nigeria.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">3. Accounts</h2>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>One person or legal entity may not maintain more than one free account.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">4. Acceptable use</h2>
            <p className="text-body leading-relaxed">You agree not to use Conduikt to:</p>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>Generate spam, misleading content, or content that violates third-party rights</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to reverse-engineer, scrape, or exploit the platform</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with the security or integrity of the Service</li>
            </ul>
            <p className="text-body leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these
              terms without prior notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">5. Payment and subscriptions</h2>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>Paid plans are billed as described on our pricing page.</li>
              <li>All payments are processed by Lemon Squeezy. By purchasing, you agree to their terms.</li>
              <li>Prices are in USD and exclusive of applicable taxes.</li>
              <li>We do not offer refunds except where required by applicable law.</li>
              <li>We reserve the right to change pricing with 30 days&apos; notice to existing subscribers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">6. AI-generated content</h2>
            <p className="text-body leading-relaxed">
              Content generated by Conduikt&apos;s AI features is provided as-is for
              informational and creative purposes. You are responsible for reviewing
              and verifying AI-generated content before publishing it. We do not
              guarantee the accuracy, completeness, or suitability of AI outputs.
              You own the content you generate through the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">7. Intellectual property</h2>
            <p className="text-body leading-relaxed">
              The Conduikt platform, including its design, code, and branding, is
              owned by Technicity Digital. You retain ownership of content you create
              using the Service. By using the Service, you grant us a limited licence
              to process your content solely to provide the Service to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">8. Availability and service changes</h2>
            <p className="text-body leading-relaxed">
              We strive for high availability but do not guarantee uninterrupted
              access. We may modify, suspend, or discontinue features of the Service
              at any time. We will provide reasonable notice for significant changes
              that affect paid subscribers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">9. Limitation of liability</h2>
            <p className="text-body leading-relaxed">
              To the maximum extent permitted by law, Technicity Digital shall not be
              liable for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of Conduikt. Our total liability to you
              shall not exceed the amount you paid us in the 12 months preceding the
              claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">10. Termination</h2>
            <p className="text-body leading-relaxed">
              You may cancel your account at any time from your account settings.
              We may terminate or suspend your account immediately for breach of these
              terms. Upon termination, your right to use the Service ceases and we
              may delete your data after a 30-day grace period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">11. Governing law</h2>
            <p className="text-body leading-relaxed">
              These terms are governed by the laws of the Federal Republic of Nigeria.
              Any disputes shall be resolved in the courts of Lagos State, Nigeria.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">12. Contact</h2>
            <p className="text-body leading-relaxed">
              Questions about these terms? Contact us at{" "}
              <a
                href="mailto:hello@conduikt.io"
                className="text-accent hover:underline"
              >
                hello@conduikt.io
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-surface-2 pt-8 flex items-center justify-between text-small text-text-tertiary">
          <span>© {new Date().getFullYear()} Conduikt · Technicity Digital</span>
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
