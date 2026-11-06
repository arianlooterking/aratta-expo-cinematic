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

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

/** A paragraph as plain prose: no emoji bullets, no doubled button labels. */
export function cleanParagraph(value: string) {
  let text = value.replace(EMOJI, "").replace(/\s+/g, " ").trim();
  // WordPress buttons were captured as "Label" + "Label".
  const half = text.length / 2;
  if (Number.isInteger(half) && text.slice(0, half) === text.slice(half)) {
    text = text.slice(0, half).trim();
  }
  return text.replace(/^[\s\-–—:•*]+/, "").trim();
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Persian digits in Persian prose; numbers inside Latin names (KIMEX 2025) stay as they are. */
export function persianDigits(text: string) {
  return text.replace(/\d+/g, (run, offset: number) => {
    const before = text.slice(0, offset).trimEnd().slice(-1);
    const after = text.slice(offset + run.length).trimStart().charAt(0);
    if (/[A-Za-z]/.test(before) || /[A-Za-z]/.test(after)) return run;
    return run.replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
  });
}

function words(value: string) {
  return new Set(
    normalizeSearch(value)
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1),
  );
}

/** The first real sentence of an entry, for cards and descriptions. */
export function archiveExcerpt(entry: { title: string; paragraphs: string[] }, max = 220) {
  const title = words(entry.title);
  // Skip paragraphs that only repeat the title, like "Notice: ... postponed".
  const repeatsTitle = (paragraph: string) => {
    const own = words(paragraph);
    let shared = 0;
    for (const word of own) if (title.has(word)) shared += 1;
    return own.size === 0 || shared / own.size >= 0.7;
  };
  const candidates = entry.paragraphs
    .map(cleanParagraph)
    .filter((p) => p.length >= 60 && !repeatsTitle(p));
  let text = candidates[0] ?? "";
  if (!text) return "";
  // A lead-in such as "... announced:" reads better with what it introduces.
  if (/[:：]$/.test(text) && candidates[1]) text = `${text} ${candidates[1]}`;
  text = persianDigits(text);
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text;
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
