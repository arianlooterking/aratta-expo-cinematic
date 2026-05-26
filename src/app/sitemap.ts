import type { MetadataRoute } from "next";
import { languages } from "@/lib/lang";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://arattaexpo.ir";
  return languages.map((lang) => ({
    url: `${base}/${lang}`,
    lastModified: new Date("2026-05-26"),
    changeFrequency: "weekly",
    priority: lang === "fa" ? 1 : 0.9,
    alternates: {
      languages: {
        fa: `${base}/fa`,
        en: `${base}/en`,
      },
    },
  }));
}
