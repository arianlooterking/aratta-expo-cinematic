import type { Lang } from "../lib/lang.ts";

// Companies named in Aratta's own published reports. Every name below comes
// from an archived post (see `source`), so the site only repeats what Aratta
// already published: supporters of a past edition, or exhibitors reported at
// one. Nothing here claims a current sponsorship. To add a name, add it with
// the archive post that mentions it.

type Text = { fa: string; en: string };

export type PartnerName = { name: Text; source: number };

export type PartnerGroup = {
  key: "supporters" | "exhibitors";
  title: Text;
  note: Text;
  names: PartnerName[];
};

export const partnerGroups: PartnerGroup[] = [
  {
    key: "supporters",
    title: { fa: "حامیان دوره‌های گذشته", en: "Supporters of past editions" },
    note: {
      fa: "حامیان دومین نمایشگاه نهضت تولید سیرجان، آبان ۱۴۰۳",
      en: "Supporters of the 2nd Sirjan production exhibition, November 2024",
    },
    names: [
      { name: { fa: "معدنی و صنعتی گل‌گهر", en: "Gol-E-Gohar Mining & Industrial Co." }, source: 5679 },
      { name: { fa: "سنگ آهن گهر زمین", en: "Gohar Zamin Iron Ore Co." }, source: 5679 },
      { name: { fa: "جهان فولاد سیرجان", en: "Jahan Foulad Sirjan" }, source: 5679 },
      { name: { fa: "توسعه آهن و فولاد گل‌گهر", en: "Golgohar Iron & Steel Development Co." }, source: 5679 },
    ],
  },
  {
    key: "exhibitors",
    title: { fa: "از مشارکت‌کنندگان دوره‌های گذشته", en: "Among past exhibitors" },
    note: {
      fa: "به نقل از گزارش‌های پنجمین کیمکس (۱۴۰۰) و سیمکس ۲۰۲۰",
      en: "As reported for the 5th KIMEX (2021) and SIMEX 2020",
    },
    names: [
      { name: { fa: "شرکت ملی صنایع مس ایران", en: "National Iranian Copper Industries" }, source: 5514 },
      { name: { fa: "ذوب آهن اصفهان", en: "Esfahan Steel Company" }, source: 5514 },
      { name: { fa: "گروه فولاد مبارکه", en: "Mobarakeh Steel Group" }, source: 4949 },
      { name: { fa: "فولاد هرمزگان", en: "Hormozgan Steel" }, source: 4949 },
      { name: { fa: "آلومینای ایران", en: "Iran Alumina" }, source: 5514 },
      { name: { fa: "فن‌آور معادن و فلزات (MMTE)", en: "MMTE (Mines & Metals Engineering)" }, source: 5514 },
      { name: { fa: "توکا فولاد", en: "Tooka Steel" }, source: 4949 },
      { name: { fa: "جهاد نصر کرمان", en: "Jahad Nasr Kerman" }, source: 5514 },
      { name: { fa: "فولاد سیرجان ایرانیان", en: "Iranian Sirjan Steel" }, source: 5514 },
      { name: { fa: "ایرانول", en: "Iranol" }, source: 5514 },
      { name: { fa: "میدکو", en: "MIDHCO" }, source: 5514 },
      { name: { fa: "فولادسنگ مبارکه", en: "Foulad Sang Mobarakeh" }, source: 4949 },
    ],
  },
];

export function partnerSourceHref(lang: Lang, source: number) {
  return `/${lang}/archive/${source}`;
}
