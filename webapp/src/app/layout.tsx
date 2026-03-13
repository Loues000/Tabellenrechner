import type { Metadata } from "next";
import { Roboto_Condensed, Roboto } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Tabellenrechner fuer fussball.de",
  description:
    "Importiert Wettbewerbe von fussball.de und berechnet eine Live-Tabelle aus frei editierbaren Spielergebnissen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <header className="siteHeader">
          <div className="siteHeaderInner">
            <span className="siteWordmark">Tabellenrechner</span>
            <span className="siteSub">für fussball.de</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
