import Image from "next/image";
import type { PublicPageBrand } from "@/src/lib/email/public-brand";

// Frame for the public, no-session pages (/unsubscribe, /confirm).
// Inline so these pages don't pull in the marketing or dashboard layouts.
//
// Agency-tier owners get their own brand here (name + logo, no Conduikt
// anywhere); everyone else gets the Conduikt frame.
export function PublicShell({ brand, children }: { brand: PublicPageBrand; children: React.ReactNode }) {
  const logo = brand.logoUrl;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5 text-text">
        {logo ? (
          brand.whiteLabel ? (
            // Customer logos live on arbitrary hosts, so a plain <img> is
            // used: next/image would need every host allow-listed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-8 w-auto max-w-[160px]" />
          ) : (
            <Image src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          )
        ) : null}
        {brand.name ? (
          <span className="font-display text-lg font-medium tracking-tight">{brand.name}</span>
        ) : null}
      </div>
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 md:p-8">{children}</div>
    </div>
  );
}

export function publicTitle(page: string, brand: PublicPageBrand): string {
  return brand.name ? `${page} — ${brand.name}` : page;
}
