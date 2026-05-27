import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { getLanguageSeo, siteName, siteUrl, socialPreviewImage } from "@/lib/seo";
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

const defaultSeo = getLanguageSeo("fa");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultSeo.title,
    template: "%s",
  },
  description: defaultSeo.description,
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
    title: defaultSeo.title,
    description: defaultSeo.description,
    siteName,
    url: "/fa",
    type: "website",
    locale: defaultSeo.locale,
    alternateLocale: [defaultSeo.alternateLocale],
    images: [{ ...socialPreviewImage, alt: defaultSeo.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSeo.title,
    description: defaultSeo.description,
    images: [socialPreviewImage.url],
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
