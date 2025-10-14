import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import { DataProvider } from "./components/DataProvider";
import { WalletProvider } from "./components/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://poly.chriscentral.com'),
  title: "PolyEvent - Browse Polymarket Events & Markets",
  description: "Explore and analyze Polymarket prediction markets. View real-time events, market prices, volume, liquidity, and trends.",
  keywords: ["Polymarket", "prediction markets", "crypto", "betting", "events", "markets", "DeFi"],
  authors: [{ name: "Chris Muktar", url: "https://chriscentral.com" }],
  openGraph: {
    title: "PolyEvent - Browse Polymarket Events & Markets",
    description: "Explore and analyze Polymarket prediction markets. View real-time events, market prices, volume, liquidity, and trends.",
    siteName: "PolyEvent",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PolyEvent - Polymarket Browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PolyEvent - Browse Polymarket Events & Markets",
    description: "Explore and analyze Polymarket prediction markets. View real-time events, market prices, volume, liquidity, and trends.",
    creator: "@chrismuktar",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Script id="userbird-analytics" strategy="afterInteractive">
          {`
            (function() {
              window.userbirdq = window.userbirdq || [];
              window.USERBIRD_SITE_ID = 'GWCfbpDW';
              var script = document.createElement('script');
              script.defer = true;
              script.setAttribute('data-site', window.USERBIRD_SITE_ID);
              script.src = "https://cdn.userbird.com/analytics.min.js";
              var currentScript = document.currentScript || document.getElementsByTagName('script')[0];
              currentScript.parentNode.insertBefore(script, currentScript);
            })();
          `}
        </Script>
        <WalletProvider>
          <DataProvider>
            <Navigation />
            {children}
            <Footer />
          </DataProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
