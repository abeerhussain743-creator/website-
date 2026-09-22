import type { Metadata } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const title = "Axion — AI Automation Company | Agents, Workflows & Intelligent Systems";
const description =
  "Axion builds AI automation systems, custom AI agents, workflow automation, and intelligent software that eliminate repetitive work and run real businesses.";

export const metadata: Metadata = {
  metadataBase: new URL("https://axion.systems"),
  title: {
    default: title,
    template: "%s · Axion",
  },
  description,
  keywords: [
    "AI automation company",
    "AI automation services",
    "AI agents",
    "business automation",
    "AI workflow automation",
    "AI automation agency",
    "AI software development",
    "AI business solutions",
    "ecommerce automation",
    "AI consulting",
  ],
  authors: [{ name: "Axion" }],
  creator: "Axion",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://axion.systems",
    siteName: "Axion",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://axion.systems",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Axion",
    url: "https://axion.systems",
    description,
    email: "hello@axion.systems",
    sameAs: [],
    knowsAbout: [
      "AI automation",
      "AI agents",
      "Business process automation",
      "Workflow automation",
      "E-commerce automation",
    ],
  };

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="bg-bg text-text antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
