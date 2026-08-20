import type { Metadata } from "next";
import "./globals.css";
import "./mova-popover.css";
import "./effect-config-range.css";
import "./mini-app-glass.css";
import "./homepage-background.css";
import { Roboto, Roboto_Mono } from "next/font/google";
import AppShell from "../components/AppShell";
import { ThemeProvider } from "../contexts/ThemeContext";
import { MockAuthProvider } from "../contexts/MockAuthContext";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { MockEntitlementsProvider } from "../contexts/MockEntitlementsContext";
import GlobalAccountModals from "../components/GlobalAccountModals";
import ErrorBoundary from "../components/ErrorBoundary";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700"],
  variable: "--font-roboto-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.mova-atletica.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mova Atlética — Motion Analysis",
  description: "Motion analysis software for everyone.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Mova Atlética — Motion Analysis",
    description: "Motion analysis software for everyone.",
    url: "/",
    siteName: "Mova Atlética",
    type: "website",
    images: [
      {
        url: "/images/sports/pull-ups.png",
        width: 1024,
        height: 1024,
        alt: "Athlete performing a pull-up — Mova Atlética",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mova Atlética — Motion Analysis",
    description: "Motion analysis software for everyone.",
    images: ["/images/sports/pull-ups.png"],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoMono.variable} antialiased`}
    >
      <body className={`${robotoMono.className} antialiased`}>
        <div id="homepage-canvas-mount" aria-hidden="true" />
        <div id="app-root">
          <ErrorBoundary>
            <ThemeProvider>
              <MockAuthProvider>
                <MockEntitlementsProvider>
                  <LocaleProvider>
                    <AppShell>{children}</AppShell>
                    <GlobalAccountModals />
                  </LocaleProvider>
                </MockEntitlementsProvider>
              </MockAuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
