import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentFits — A home that fits your budget",
  description:
    "Discover affordable rental leads around Atlanta, compare known monthly costs, and keep the sources together.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
