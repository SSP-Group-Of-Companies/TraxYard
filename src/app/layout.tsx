import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "./components/SessionWrapper";
import GlobalLayoutWrapper from "./components/shared/GlobalLayoutWrapper";

// ---- Fonts (CSS variables) ----
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ---- THEME (from your palette) ----
// Navy for dark ink, blue+green brand accents, near-white surface.
const BRAND_PRIMARY = "#0B1A2A"; // deep navy
// const BRAND_ACCENT_A = "#0B1A2A";
// const BRAND_ACCENT_B = "#00B36B";
const SURFACE = "#F9FAFB"; // near-white

// If you have a public URL, add it here for absolute OG URLs (optional)
const BASE_URL =
  process.env.NEXT_PUBLIC_PORTAL_BASE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "";

// ---- Viewport (mobile-first, safe scaling) ----
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SURFACE },
    { media: "(prefers-color-scheme: dark)", color: BRAND_PRIMARY },
  ],
  colorScheme: "light",
};

// ---- Metadata ----
export const metadata: Metadata = {
  metadataBase: BASE_URL ? new URL(BASE_URL) : undefined,
  title: {
    default: "TraxYard",
    template: "%s • TraxYard",
  },
  applicationName: "TraxYard",
  description: "Yard inventory management system",
  keywords: ["TraxYard", "SSP", "Yard", "Trailer", "Inventory", "Logistics"],
  authors: [{ name: "SSP Programming" }],
  creator: "SSP Programming",
  publisher: "SSP",
  robots: {
    index: true,
    follow: true,
  },
  // Favicons / Icons
  icons: {
    icon: [
      // Uses your PNG favicon
      { url: "/logos/Favicon.png", type: "image/png", sizes: "any" },
    ],
    shortcut: [{ url: "/logos/Favicon.png" }],
    apple: [{ url: "/logos/Favicon.png" }], // okay to reuse until you add a dedicated apple-touch-icon
  },
  // Open Graph (link previews: Slack/Teams/LinkedIn)
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TraxYard",
    title: "TraxYard",
    description: "Yard inventory management system",
    images: [
      {
        url: "/logos/SSP-Truck-LineFullLogo.png",
        width: 1200,
        height: 630,
        alt: "TraxYard • SSP",
      },
    ],
  },
  // Twitter Card (X)
  twitter: {
    card: "summary_large_image",
    title: "TraxYard",
    description: "Yard inventory management system",
    images: ["/logos/SSP-Truck-LineFullLogo.png"],
  },
  // iOS standalone (optional—keeps status bar readable)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TraxYard",
  },
  // Misc UX
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[${SURFACE}] text-[${BRAND_PRIMARY}] min-h-dvh`}
      >
        <SessionWrapper>
          <Suspense fallback={null}>
            <GlobalLayoutWrapper>{children}</GlobalLayoutWrapper>
          </Suspense>
        </SessionWrapper>
      </body>
    </html>
  );
}
