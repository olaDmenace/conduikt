import Link from "next/link";
import { MarketingNav } from "@/src/components/marketing/marketing-nav";

// docs/DESIGN.md §Marketing site structure · band 10. Sand footer with a
// top line: copyright, Compare, Blog, Guides, Privacy, Terms, Delete my
// data. The Product Hunt badge lives here now, not in the hero.
const FOOTER_LINKS = [
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Blog" },
  { href: "/guides", label: "Guides" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/data-deletion", label: "Delete my data" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ground text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-ink-text"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="pt-[72px]">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-7 text-[13px] text-text-3 md:px-10">
          <span>© {new Date().getFullYear()} Conduikt · Technicity Digital</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover-link hover:text-text">
                {l.label}
              </Link>
            ))}
          </nav>
          <a
            href="https://www.producthunt.com/products/conduikt?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-conduikt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1119957&theme=light"
              alt="Conduikt on Product Hunt"
              width={200}
              height={43}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}
