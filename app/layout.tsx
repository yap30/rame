import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AccessibilityToolbar } from "@/components/accessibility-toolbar";
import { Ga4 } from "@/components/ga4";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RAME — Platform Event Komunitas",
    template: "%s · RAME",
  },
  description: "Platform white-label untuk event komunitas: journey, gamification, verifikasi QR, dan kredensial digital via e.id.",
};

export const viewport: Viewport = {
  themeColor: "#1e3a34",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          <Nav />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <AccessibilityToolbar />
        </Providers>
        <Ga4 />
      </body>
    </html>
  );
}
