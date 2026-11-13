import type { Metadata } from "next";
import { Geist, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";
import { getBrandAssets } from "@/lib/brand-assets";
import type { Lang } from "@/lib/lang";
import { getLanguageSeo, siteName, siteUrl, socialPreviewImage } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const persianSans = Vazirmatn({
  variable: "--font-persian",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export function getRootMetadata(lang: Lang): Metadata {
  const seo = getLanguageSeo(lang);
  const brand = getBrandAssets(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.title,
      template: "%s",
    },
    description: seo.description,
    applicationName: "Aratta Expo Cinematic",
    authors: [{ name: "Aratta Expo" }],
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: brand.icon192, sizes: "192x192", type: "image/png" },
        { url: brand.tab, sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      siteName,
      url: `/${lang}`,
      type: "website",
      locale: seo.locale,
      alternateLocale: [seo.alternateLocale],
      images: [{ ...socialPreviewImage, alt: seo.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [socialPreviewImage.url],
    },
  };
}

export function DocumentShell({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <html
      lang={lang}
      dir={lang === "fa" ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${persianSans.variable} h-full antialiased`}
      // The inline script at the top of <body> sets data-theme before first
      // paint and before React hydrates; the server markup is the same for both.
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
