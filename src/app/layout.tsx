import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arattaexpo.ir"),
  title: {
    default: "Aratta Expo | شرکت توسعه تجارت اَرَت",
    template: "%s | Aratta Expo",
  },
  description:
    "A bilingual cinematic redesign for Aratta Expo, an Iranian exhibition organizer for mining, steel, copper, and industrial trade events.",
  applicationName: "Aratta Expo Cinematic",
  authors: [{ name: "Aratta Expo" }],
  icons: {
    icon: [
      { url: "/brand/aratta-tab-fa.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/aratta-tab-en.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/aratta-tab-fa.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: "Aratta Expo | شرکت توسعه تجارت اَرَت",
    description:
      "Bilingual exhibition organizer experience with archived event data, official downloads, gallery, registration inquiry, and contact paths.",
    type: "website",
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    images: ["/concepts/aratta-hero-concept.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
