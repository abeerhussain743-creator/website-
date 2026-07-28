import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { AnimatedCursor } from "@/components/layout/AnimatedCursor";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { AIAssistant } from "@/components/layout/AIAssistant";
import { FloatingDock } from "@/components/layout/FloatingDock";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { SITE } from "@/lib/constants";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "AI",
    "enterprise AI",
    "AI automation",
    "AI agents",
    "business operating system",
    "Aether",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    title: `${SITE.name} — The Future Operating System for Modern Businesses`,
    description: SITE.description,
    type: "website",
    siteName: SITE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Future of AI`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} h-full antialiased`}>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          rel="stylesheet"
        />
        <style>{`:root { --font-satoshi: "Satoshi", ui-sans-serif, system-ui, sans-serif; }`}</style>
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <SmoothScroll>
          <ScrollProgress />
          <AnimatedCursor />
          <Navbar />
          <main className="relative flex-1">{children}</main>
          <Footer />
          <FloatingDock />
          <CommandPalette />
          <AIAssistant />
          <div className="noise-overlay" aria-hidden />
        </SmoothScroll>
      </body>
    </html>
  );
}
