import type { MetadataRoute } from "next";
import { languages } from "@/lib/lang";
import { siteUrl } from "@/lib/seo";

const publicPages = [
  "",
  "about",
  "exhibitions",
  "registration",
  "forms",
  "equipment",
  "participants",
  "news",
  "industry-news",
  "gallery",
  "contact",
  "search",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return languages.flatMap((lang) =>
    publicPages.map((page) => {
      const path = page ? `/${lang}/${page}` : `/${lang}`;
      return {
        url: `${siteUrl}${path}`,
        lastModified: new Date("2026-06-27"),
        changeFrequency: page === "news" || page === "industry-news" ? "weekly" : "monthly",
        priority: page === "" ? (lang === "fa" ? 1 : 0.9) : page === "industry-news" ? 0.78 : 0.72,
        alternates: {
          languages: {
            fa: `${siteUrl}/fa${page ? `/${page}` : ""}`,
            en: `${siteUrl}/en${page ? `/${page}` : ""}`,
          },
        },
      } satisfies MetadataRoute.Sitemap[number];
    }),
  );
}
