const DEFAULT_SITE_URL = "https://tabellenrechner.vercel.app";

function normalizeSiteUrl(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") || DEFAULT_SITE_URL;
}

export const siteConfig = {
  name: "Tabellenrechner für fussball.de",
  shortName: "Tabellenrechner",
  description:
    "Tabellenrechner für Amateurfußball: fussball.de-Wettbewerbe importieren, Ergebnisse bearbeiten und Live-Tabellen sofort neu berechnen.",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  locale: "de_DE",
  keywords: [
    "Tabellenrechner",
    "fussball.de",
    "Amateurfußball",
    "Fußball Tabelle",
    "Live Tabelle",
    "Spieltag Rechner",
    "Kreisliga Tabelle",
    "Tabellenrechner Fußball",
  ],
  repoUrl: "https://github.com/Loues000/Tabellenrechner",
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION,
} as const;
