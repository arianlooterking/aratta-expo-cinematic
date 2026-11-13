import type { Lang } from "../lib/lang.ts";

// One map of the public site, shared by the header menu and the footer so the
// two never drift apart. Ids are route slugs under /[lang]; "home" is the root.

type Text = { fa: string; en: string };

export type NavLink = { id: string; label: Text; hint?: Text };
export type NavGroup = { key: string; title: Text; links: NavLink[] };

/** Shown inline in the desktop header, in this order. */
export const primaryNav: NavLink[] = [
  { id: "exhibitions", label: { fa: "نمایشگاه‌ها", en: "Exhibitions" } },
  { id: "plans", label: { fa: "پلان‌ها", en: "Plans" } },
  { id: "registration", label: { fa: "ثبت‌نام", en: "Registration" } },
  { id: "equipment", label: { fa: "اجاره تجهیزات", en: "Equipment" } },
  { id: "news", label: { fa: "اخبار", en: "News" } },
  { id: "gallery", label: { fa: "گالری", en: "Gallery" } },
  { id: "about", label: { fa: "درباره ما", en: "About" } },
  { id: "contact", label: { fa: "تماس", en: "Contact" } },
];

export const navGroups: NavGroup[] = [
  {
    key: "events",
    title: { fa: "نمایشگاه‌ها", en: "Exhibitions" },
    links: [
      { id: "exhibitions", label: { fa: "تقویم نمایشگاه‌ها", en: "Exhibition calendar" }, hint: { fa: "دوره‌های پیش رو و برگزارشده", en: "Upcoming and past editions" } },
      { id: "plans", label: { fa: "پلان‌ها و راهنمای غرفه", en: "Plans and stand guide" }, hint: { fa: "سالن‌ها، انواع غرفه و درخواست پلان", en: "Halls, stand types, plan requests" } },
      { id: "participants", label: { fa: "مشارکت‌کنندگان", en: "Participants" }, hint: { fa: "فهرست رسمی و حامیان", en: "Official lists and supporters" } },
      { id: "archive", label: { fa: "آرشیو کامل", en: "Complete archive" }, hint: { fa: "همه خبرها و گزارش‌ها", en: "Every news item and report" } },
    ],
  },
  {
    key: "exhibit",
    title: { fa: "حضور در نمایشگاه", en: "Exhibit with us" },
    links: [
      { id: "registration", label: { fa: "ثبت‌نام و درخواست غرفه", en: "Registration and booths" }, hint: { fa: "درخواست سه‌مرحله‌ای غرفه", en: "Three-step booth request" } },
      { id: "forms", label: { fa: "فرم‌ها و فایل‌ها", en: "Forms and files" }, hint: { fa: "فرم رسمی و کاتالوگ‌ها", en: "Official forms and catalogues" } },
      { id: "equipment", label: { fa: "اجاره تجهیزات", en: "Equipment rental" }, hint: { fa: "مبلمان، نمایشگر، برق", en: "Furniture, screens, power" } },
    ],
  },
  {
    key: "media",
    title: { fa: "رسانه", en: "Media" },
    links: [
      { id: "news", label: { fa: "اخبار اَرَتَ", en: "Aratta news" } },
      { id: "industry-news", label: { fa: "اخبار صنعت", en: "Industry news" } },
      { id: "blog", label: { fa: "مجله اَرَتَ", en: "Aratta journal" } },
      { id: "gallery", label: { fa: "گالری تصاویر", en: "Photo gallery" } },
    ],
  },
  {
    key: "company",
    title: { fa: "شرکت", en: "Company" },
    links: [
      { id: "home", label: { fa: "صفحه اصلی", en: "Home" } },
      { id: "about", label: { fa: "درباره اَرَتَ", en: "About Aratta" } },
      { id: "contact", label: { fa: "تماس با ما", en: "Contact us" } },
      { id: "search", label: { fa: "جستجو در سایت", en: "Search the site" } },
    ],
  },
];

export function navHref(lang: Lang, id: string) {
  return id === "home" ? `/${lang}` : `/${lang}/${id}`;
}

/** True when `pathname` is the page for `id` (or one of its sub-pages). */
export function isActiveNav(pathname: string | null, lang: Lang, id: string) {
  if (!pathname) return false;
  const href = navHref(lang, id);
  if (id === "home") return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function telHref(phone: string) {
  // 034-91305910 -> tel:+983491305910
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("0") ? `tel:+98${digits.slice(1)}` : `tel:${digits}`;
}
