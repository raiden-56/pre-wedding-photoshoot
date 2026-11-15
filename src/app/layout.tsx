import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });

const siteUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Saanjh Studio — Pre-Wedding & Wedding Photography", template: "%s · Saanjh Studio" },
  description: "Editorial pre-wedding and wedding photography across India — Goa, Udaipur, Jaipur, Kerala, Coorg and the mountains. Private digital galleries for every couple.",
  openGraph: { type: "website", siteName: "Saanjh Studio", images: ["/photos/32.jpg"] },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#F7F4EF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
