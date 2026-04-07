import type { Metadata } from "next";
import { DM_Serif_Display, Outfit, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/src/components/ui/toast";
import "@/src/styles/globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://conduikt.com"),
  title: {
    default: "Conduikt: AI Marketing Automation for SaaS Founders",
    template: "%s | Conduikt",
  },
  description:
    "Connect your site. Get a marketing team that never sleeps. AI-powered marketing automation for founders, marketers, and agencies.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://conduikt.com/",
    languages: {
      en: "https://conduikt.com/",
    },
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
    title: "Conduikt: AI Marketing Automation for SaaS Founders",
    description:
      "Connect your site. Get a marketing team that never sleeps. AI-powered marketing automation for founders, marketers, and agencies.",
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
    site: "@conduikiHQ",
    title: "Conduikt: AI Marketing Automation for SaaS Founders",
    description:
      "Connect your site. Get a marketing team that never sleeps. AI-powered marketing automation for founders, marketers, and agencies.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('conduikt-ui')||'{}');var theme=(t.state&&t.state.theme)||'dark';document.documentElement.className=theme;document.documentElement.setAttribute('data-theme',theme)}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${dmSerif.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased grain`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
