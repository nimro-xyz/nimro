import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/config/brand";
import { JsonLd } from "@/components/JsonLd";
import { ChainProvider } from "@/components/providers/ChainProvider";
import { JobsProvider } from "@/components/jobs/JobsProvider";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { HOME_DESCRIPTION, HOME_TITLE, siteLd } from "@/lib/seo";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: HOME_TITLE, template: `%s | ${BRAND.name}` },
  description: HOME_DESCRIPTION,
  applicationName: BRAND.name,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: BRAND.url, siteName: BRAND.name, title: HOME_TITLE, description: HOME_DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary_large_image", site: BRAND.xHandle, creator: BRAND.xHandle, title: HOME_TITLE, description: HOME_DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#080808", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <JsonLd data={siteLd} />
      </head>
      <body>
        <WalletProvider>
          <WalletModalProvider>
            <ChainProvider>
              <JobsProvider>{children}</JobsProvider>
            </ChainProvider>
          </WalletModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
