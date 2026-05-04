import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Serif_Display, Outfit, JetBrains_Mono } from "next/font/google";
import "@/src/styles/globals.css";
import { softwareAppJsonLd, faqJsonLd } from "@/src/lib/seo/homepage-schema";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0C0C0E" },
    { media: "(prefers-color-scheme: light)", color: "#F5F2ED" },
  ],
  colorScheme: "dark light",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://conduikt.com/#organization",
  name: "Conduikt",
  alternateName: ["Conduikt AI", "Conduikt Marketing"],
  legalName: "Conduikt",
  url: "https://conduikt.com/",
  description:
    "Conduikt is an AI marketing automation platform for SaaS founders. It audits websites, generates SEO content, publishes to LinkedIn and X, and runs email marketing campaigns from one dashboard.",
  foundingDate: "2025",
  slogan: "AI Marketing Automation for SaaS Founders",
  logo: {
    "@type": "ImageObject",
    url: "https://conduikt.com/icon-512.png",
    width: 512,
    height: 512,
  },
  image: "https://conduikt.com/og-image.png",
  founder: {
    "@type": "Person",
    name: "Olayinka Fagbenro",
    url: "https://www.linkedin.com/in/olayinkafagbenro/",
    sameAs: [
      "https://www.linkedin.com/in/olayinkafagbenro/",
      "https://x.com/olayinkafag",
    ],
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@conduikt.com",
      availableLanguage: ["en"],
      areaServed: "Worldwide",
    },
  ],
  parentOrganization: {
    "@type": "Organization",
    name: "Technicity Digital",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lagos",
    addressCountry: "NG",
  },
  sameAs: [
    "https://x.com/conduikt",
    "https://www.facebook.com/conduikt",
    "https://www.linkedin.com/company/conduikt-ai/",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://conduikt.com"),
  title: {
    default: "Conduikt: AI Marketing Automation for SaaS Founders",
    template: "%s | Conduikt",
  },
  description:
    "Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and runs email marketing campaigns from one dashboard. AI marketing automation built for SaaS founders. Start free.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://conduikt.com/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Conduikt: AI Marketing Automation for SaaS Founders",
    description:
      "Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and runs email marketing campaigns from one dashboard. AI marketing automation built for SaaS founders. Start free.",
    url: "https://conduikt.com/",
    siteName: "Conduikt",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Conduikt AI marketing dashboard showing SEO audit, content generation, and multi-channel publishing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@conduikt",
    creator: "@olayinkafag",
    title: "Conduikt: AI Marketing Automation for SaaS Founders",
    description:
      "Conduikt audits your site, generates SEO content, publishes to LinkedIn and X, and produces ready-to-export email sequences. AI marketing automation built for SaaS founders.",
    images: [
      {
        url: "/og-image.png",
        alt: "Conduikt AI marketing dashboard showing SEO audit, content generation, and multi-channel publishing",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('conduikt-ui')||'{}');var theme=(t.state&&t.state.theme)||'dark';document.documentElement.className=theme;document.documentElement.setAttribute('data-theme',theme)}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <link rel="preconnect" href="https://api.producthunt.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://api.producthunt.com" />
        <meta name="application-name" content="Conduikt" />
        <meta name="apple-mobile-web-app-title" content="Conduikt" />
      </head>
      <body
        className={`${dmSerif.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased grain`}
      >
        {children}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="lazyOnload"
            />
            <Script id="gtag-init" strategy="lazyOnload">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
