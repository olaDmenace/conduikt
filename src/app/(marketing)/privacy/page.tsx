import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Conduikt",
  description: "How Conduikt collects, uses, and protects your data.",
  alternates: { canonical: "https://conduikt.com/privacy/" },
};

export default function PrivacyPage() {
  const lastUpdated = "February 18, 2026";

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-16 md:px-10 md:pt-24">
        {/* Header */}
        <div className="mb-12 max-w-[760px] border-b border-line pb-8">
          <p className="mb-4 text-label text-accent">Legal</p>
          <h1 className="mb-3 text-display-m text-text">Privacy policy</h1>
          <p className="text-body-s text-text-3">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose-conduikt">

          <section>
            <h2>1. Who we are</h2>
            <p>
              Conduikt is an AI-powered marketing automation platform operated by
              Technicity Digital. Our registered address is Lagos, Nigeria. You can
              reach us at{" "}
              <a
                href="mailto:hello@conduikt.com"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2>2. Information we collect</h2>
            <p>
              We collect information you provide directly when you create an account,
              use our services, or contact us:
            </p>
            <ul className="list-disc">
              <li>Account information (name, email address, password)</li>
              <li>Profile data and marketing preferences</li>
              <li>Content you create or upload within the platform</li>
              <li>Payment information (processed securely by Lemon Squeezy — we do not store card details)</li>
              <li>Usage data, log files, and analytics (e.g., pages visited, features used)</li>
            </ul>
          </section>

          <section>
            <h2>3. How we use your information</h2>
            <ul className="list-disc">
              <li>To provide and improve the Conduikt platform</li>
              <li>To process payments and manage your subscription</li>
              <li>To generate AI-powered content based on your project context</li>
              <li>To send transactional emails (account confirmation, password reset)</li>
              <li>To send product updates and marketing communications (you can opt out at any time)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. AI processing</h2>
            <p>
              Conduikt uses Anthropic&apos;s Claude API to generate content. Prompts sent
              to Claude may include context from your project (e.g., brand name,
              industry, target audience). This data is processed by Anthropic in
              accordance with their{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy policy
              </a>
              . We do not use your content to train AI models.
            </p>
          </section>

          <section>
            <h2>5. Data sharing</h2>
            <p>
              We do not sell your personal data. We share data only with trusted
              service providers who help us operate the platform:
            </p>
            <ul className="list-disc">
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Anthropic</strong> — AI content generation</li>
              <li><strong>Lemon Squeezy</strong> — payment processing</li>
              <li><strong>Vercel</strong> — hosting and infrastructure</li>
            </ul>
          </section>

          <section>
            <h2>6. Data retention & deletion</h2>
            <p>
              We retain your data for as long as your account is active or as needed
              to provide our services. You can request full deletion of your account
              and associated data at any time — see our{" "}
              <Link href="/data-deletion">
                user data deletion page
              </Link>{" "}
              for the process and timeline.
            </p>
          </section>

          <section>
            <h2>7. Your rights</h2>
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:hello@conduikt.com"
              >
                hello@conduikt.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2>8. Cookies</h2>
            <p>
              We use essential cookies to maintain your login session. We do not use
              tracking or advertising cookies. You can disable cookies in your browser
              settings, though this may affect platform functionality.
            </p>
          </section>

          <section>
            <h2>9. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted
              connections (HTTPS), hashed passwords, and row-level security on our
              database. No method of transmission over the internet is 100% secure,
              but we take reasonable precautions to protect your data.
            </p>
          </section>

          <section>
            <h2>10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you
              of significant changes by email or by posting a notice within the
              platform. Continued use of Conduikt after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              Questions about this Privacy Policy? Email us at{" "}
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
        <Link href="/terms" className="hover-link hover:text-text">
          Terms of service
        </Link>
      </div>
    </div>
  );
}
