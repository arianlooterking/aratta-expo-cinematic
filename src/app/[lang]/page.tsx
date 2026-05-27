import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { BoothBuildHero } from "@/components/BoothBuildHero";
import { HomeSections } from "@/components/HomeSections";
import { SiteChrome } from "@/components/SiteChrome";
import { getContent } from "@/data/aratta-content";
import { getBrandAssets } from "@/lib/brand-assets";
import { isLang, languages, type Lang } from "@/lib/lang";
import { getLanguageSeo, siteName, socialPreviewImage } from "@/lib/seo";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) {
    return {};
  }

  const content = getContent(rawLang);
  const brand = getBrandAssets(rawLang);
  const seo = getLanguageSeo(rawLang);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${rawLang}`,
      languages: {
        fa: "/fa",
        en: "/en",
      },
    },
    icons: {
      icon: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
      apple: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/${rawLang}`,
      siteName,
      locale: seo.locale,
      alternateLocale: [seo.alternateLocale],
      type: "website",
      images: [{ ...socialPreviewImage, alt: seo.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [socialPreviewImage.url],
    },
    other: {
      "content-language": content.lang,
    },
  };
}

export default async function LangPage({ params }: PageProps) {
  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) {
    notFound();
  }

  const lang = rawLang as Lang;
  const content = getContent(lang);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: lang === "fa" ? "شرکت توسعه تجارت اَرَت" : "Aratta Trade Development Company",
    alternateName: "Aratta Expo",
    url: "https://arattaexpo.ir",
    email: "info@arattaexpo.ir",
    telephone: content.contact.phones,
    hasMap: content.contact.mapsUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: lang === "fa" ? "کرمان" : "Kerman",
      streetAddress: content.contact.address,
    },
    event: content.exhibitions.items.map((event) => ({
      "@type": "Event",
      name: event.title,
      eventStatus: "https://schema.org/EventCompleted",
      location: event.location,
      description: event.summary,
    })),
  };

  return (
    <>
      <Script
        id="aratta-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteChrome content={content} />
      <main dir={content.dir} lang={content.lang}>
        <BoothBuildHero content={content} />
        <HomeSections content={content} />
      </main>
    </>
  );
}
