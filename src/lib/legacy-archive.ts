import archive from "@/data/legacy-content.json";
import type { Lang } from "@/lib/lang";

export type ArchiveEntry = (typeof archive.entries)[number];
export const archiveEntries = archive.entries;
export const archiveAssets = archive.assets;
export const archiveMigratedAt = archive.migratedAt;
export const publicArchive = archiveEntries.filter(
  (entry) => entry.kind !== "page",
);
export const archiveDocuments = archiveAssets.filter((asset) =>
  /\.(pdf|xlsx?|docx?|zip)$/i.test(asset.src),
);

export function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u200c]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function archiveDate(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.slice(0, 10) + "T12:00:00Z"));
}

export function localizeSourceLink(href: string, lang: Lang): string {
  try {
    const url = new URL(href, "https://arattaexpo.ir");
    if (!["arattaexpo.ir", "www.arattaexpo.ir"].includes(url.hostname))
      return href;
    const pathname = decodeURIComponent(url.pathname);
    const entry = archiveEntries.find((item) => item.legacyPath === pathname);
    const asset = archiveAssets.find(
      (item) =>
        decodeURIComponent(new URL(item.sourceUrl).pathname) === pathname,
    );
    if (asset) return asset.src;
    if (entry) {
      const mapped = (archive.pathMap as Record<string, string>)[pathname];
      return (mapped || `/fa/archive/${entry.id}`).replace(/^\/fa/, `/${lang}`);
    }
    if (pathname === "/") return `/${lang}`;
    if (href.startsWith("/fa/")) return href.replace(/^\/fa/, `/${lang}`);
    return href;
  } catch {
    return href;
  }
}

export const archiveLabels = {
  fa: {
    all: "همه مطالب",
    news: "اخبار",
    exhibition: "نمایشگاه‌ها",
    report: "گزارش‌ها و ویدئو",
    page: "صفحات قدیمی",
    catalogue: "کتاب‌های نمایشگاهی",
  },
  en: {
    all: "All articles",
    news: "News",
    exhibition: "Exhibitions",
    report: "Reports & video",
    page: "Original pages",
    catalogue: "Exhibition books",
  },
};
