import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopData — Shopify data operations, simplified",
  description:
    "Import, export, and bulk-update Shopify data with spreadsheet-friendly workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
