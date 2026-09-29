import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "PostPilot AI",
    template: "%s · PostPilot",
  },
  description:
    "Your AI social media team: strategist, copywriter, designer, and scheduler in one.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
