import type { MetadataRoute } from "next";
import { getPublishedBlogPosts } from "@/data/aratta-content";
import { languages } from "@/lib/lang";
import { siteUrl } from "@/lib/seo";
import { publicArchive } from "@/lib/legacy-archive";

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
  "blog",
  "gallery",
  "contact",
  "search",
  "archive",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const pageEntries = languages.flatMap((lang) =>
    publicPages.map((page) => {
      const path = page ? `/${lang}/${page}` : `/${lang}`;
      return {
        url: `${siteUrl}${path}`,
        lastModified: new Date("2026-09-13"),
        changeFrequency:
          page === "news" || page === "industry-news" || page === "blog"
            ? "weekly"
            : "monthly",
        priority:
          page === ""
            ? lang === "fa"
              ? 1
              : 0.9
            : page === "blog" || page === "industry-news"
              ? 0.78
              : 0.72,
        alternates: {
          languages: {
            fa: `${siteUrl}/fa${page ? `/${page}` : ""}`,
            en: `${siteUrl}/en${page ? `/${page}` : ""}`,
          },
        },
      } satisfies MetadataRoute.Sitemap[number];
    }),
  );

  const blogEntries = languages.flatMap((lang) =>
    getPublishedBlogPosts(lang).map((post) => ({
      url: `${siteUrl}/${lang}/blog/${post.slug}`,
      lastModified: new Date("2026-07-15"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          fa: `${siteUrl}/fa/blog/${post.slug}`,
          en: `${siteUrl}/en/blog/${post.slug}`,
        },
      },
    })),
  );

  const archiveEntries = languages.flatMap((lang) =>
    publicArchive.map((entry) => ({
      url: `${siteUrl}/${lang}/archive/${entry.id}`,
      lastModified: new Date(entry.modifiedAt),
      changeFrequency: "yearly" as const,
      priority: 0.6,
      alternates: {
        languages: {
          fa: `${siteUrl}/fa/archive/${entry.id}`,
          en: `${siteUrl}/en/archive/${entry.id}`,
        },
      },
    })),
  );
  return [...pageEntries, ...blogEntries, ...archiveEntries];
}
