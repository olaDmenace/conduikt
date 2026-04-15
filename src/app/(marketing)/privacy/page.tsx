import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Conduikt",
  description: "How Conduikt collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const lastUpdated = "February 18, 2026";

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-display mb-3 text-text-primary">Privacy Policy</h1>
          <p className="text-body text-text-secondary">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-text-secondary">

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">1. Who we are</h2>
            <p className="text-body leading-relaxed">
              Conduikt is an AI-powered marketing automation platform operated by
              Technicity Digital. Our registered address is Lagos, Nigeria. You can
              reach us at{" "}
              <a
                href="mailto:hello@conduikt.com"
                className="text-accent hover:underline"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">2. Information we collect</h2>
            <p className="text-body leading-relaxed">
              We collect information you provide directly when you create an account,
              use our services, or contact us:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>Account information (name, email address, password)</li>
              <li>Profile data and marketing preferences</li>
              <li>Content you create or upload within the platform</li>
              <li>Payment information (processed securely by Lemon Squeezy — we do not store card details)</li>
              <li>Usage data, log files, and analytics (e.g., pages visited, features used)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">3. How we use your information</h2>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>To provide and improve the Conduikt platform</li>
              <li>To process payments and manage your subscription</li>
              <li>To generate AI-powered content based on your project context</li>
              <li>To send transactional emails (account confirmation, password reset)</li>
              <li>To send product updates and marketing communications (you can opt out at any time)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">4. AI processing</h2>
            <p className="text-body leading-relaxed">
              Conduikt uses Anthropic&apos;s Claude API to generate content. Prompts sent
              to Claude may include context from your project (e.g., brand name,
              industry, target audience). This data is processed by Anthropic in
              accordance with their{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                privacy policy
              </a>
              . We do not use your content to train AI models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">5. Data sharing</h2>
            <p className="text-body leading-relaxed">
              We do not sell your personal data. We share data only with trusted
              service providers who help us operate the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong className="text-text-primary">Supabase</strong> — database and authentication</li>
              <li><strong className="text-text-primary">Anthropic</strong> — AI content generation</li>
              <li><strong className="text-text-primary">Lemon Squeezy</strong> — payment processing</li>
              <li><strong className="text-text-primary">Vercel</strong> — hosting and infrastructure</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">6. Data retention & deletion</h2>
            <p className="text-body leading-relaxed">
              We retain your data for as long as your account is active or as needed
              to provide our services. You can request full deletion of your account
              and associated data at any time — see our{" "}
              <Link href="/data-deletion" className="text-accent hover:underline">
                User Data Deletion page
              </Link>{" "}
              for the process and timeline.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">7. Your rights</h2>
            <p className="text-body leading-relaxed">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-body leading-relaxed">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:hello@conduikt.com"
                className="text-accent hover:underline"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">8. Cookies</h2>
            <p className="text-body leading-relaxed">
              We use essential cookies to maintain your login session. We do not use
              tracking or advertising cookies. You can disable cookies in your browser
              settings, though this may affect platform functionality.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">9. Security</h2>
            <p className="text-body leading-relaxed">
              We implement industry-standard security measures including encrypted
              connections (HTTPS), hashed passwords, and row-level security on our
              database. No method of transmission over the internet is 100% secure,
              but we take reasonable precautions to protect your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">10. Changes to this policy</h2>
            <p className="text-body leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you
              of significant changes by email or by posting a notice within the
              platform. Continued use of Conduikt after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-h2 text-text-primary">11. Contact</h2>
            <p className="text-body leading-relaxed">
              Questions about this Privacy Policy? Email us at{" "}
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
        <Link href="/terms" className="hover:text-text-secondary transition-colors">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
