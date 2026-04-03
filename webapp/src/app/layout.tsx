import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Roboto_Condensed, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { siteConfig } from "@/lib/site";

const headingFont = Roboto_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700"],
});

const bodyFont = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const REPO_URL = siteConfig.repoUrl;
const ISSUES_URL = `${REPO_URL}/issues`;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  inLanguage: "de-DE",
  url: siteConfig.url,
  description: siteConfig.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  sameAs: [siteConfig.repoUrl],
  featureList: [
    "Wettbewerbe von fussball.de importieren",
    "Spielergebnisse frei bearbeiten",
    "Live-Tabelle sofort neu berechnen",
    "Spieltage und Paarungen übersichtlich prüfen",
  ],
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.shortName,
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.shortName,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  verification: siteConfig.googleSiteVerification
    ? {
        google: siteConfig.googleSiteVerification,
      }
    : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${headingFont.variable} ${bodyFont.variable}`}
        suppressHydrationWarning
      >
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="siteShell">
          <header className="siteHeader">
            <div className="siteHeaderInner">
              <span className="siteWordmark">Tabellenrechner</span>
              <span className="siteSub">für fussball.de</span>
            </div>
          </header>

          <div className="siteMain">{children}</div>

          <footer className="siteFooter">
            <div className="siteFooterInner">
              <a
                className="siteFooterIconLink"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub-Repository öffnen"
                title="GitHub-Repository"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.31 6.84 9.66.5.1.66-.22.66-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.09 0-1.13.39-2.05 1.03-2.78-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.06A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.91-1.34 2.75-1.06 2.75-1.06.55 1.42.2 2.47.1 2.73.64.73 1.03 1.65 1.03 2.78 0 3.96-2.34 4.82-4.57 5.08.36.32.68.95.68 1.91 0 1.38-.01 2.5-.01 2.84 0 .27.17.59.67.49A10.23 10.23 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z"
                  />
                </svg>
              </a>
              <a
                className="siteFooterIconLink"
                href={ISSUES_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Verbesserung über GitHub melden"
                title="Verbesserung melden"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19 3H5a2 2 0 0 0-2 2v17l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-6 11h-2v-2h2v2Zm0-4h-2V6h2v4Z"
                  />
                </svg>
              </a>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
