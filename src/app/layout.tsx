import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Serif_Display, Outfit, JetBrains_Mono } from "next/font/google";
import "@/src/styles/globals.css";

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
  themeColor: "#0E0E10",
  colorScheme: "dark",
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
    "Conduikt is an AI marketing automation platform for SaaS founders. It audits websites, generates SEO content, and publishes across LinkedIn, X, and email from one dashboard.",
  foundingDate: "2025",
  slogan: "AI Marketing Automation for SaaS Founders",
  logo: {
    "@type": "ImageObject",
    url: "https://conduikt.com/favicon.png",
    width: 256,
    height: 256,
  },
  image: "https://conduikt.com/og-image.png",
  founder: {
    "@type": "Person",
    name: "Olayinka Fagbenro",
  },
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
    "https://fb.com/conduikt",
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
    "Conduikt audits your site, generates SEO content, and publishes across LinkedIn, X, and email — AI marketing automation built for SaaS founders. Start free.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://conduikt.com/",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "256x256", type: "image/png" },
    ],
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
      "Conduikt audits your site, generates SEO content, and publishes across LinkedIn, X, and email — AI marketing automation built for SaaS founders. Start free.",
    url: "https://conduikt.com/",
    siteName: "Conduikt",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Conduikt: AI Marketing Automation for SaaS Founders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@conduikt",
    title: "Conduikt: AI Marketing Automation for SaaS Founders",
    description:
      "Conduikt audits your site, generates SEO content, and publishes across LinkedIn, X, and email — AI marketing automation built for SaaS founders.",
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
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
