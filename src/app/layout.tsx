import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { MobileShell } from "@/components/MobileShell";
import { Providers } from "@/components/Providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "FirSquad — Gym accountability & challenges",
  description:
    "Your squad, your gym — track check-ins, challenges, and streaks together.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FirSquad",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9f6e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plusJakarta.variable}`}>
      <body className="font-sans">
        <Providers>
          <MobileShell>{children}</MobileShell>
        </Providers>
      </body>
    </html>
  );
}
