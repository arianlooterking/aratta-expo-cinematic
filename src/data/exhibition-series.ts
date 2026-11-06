import type { CalendarLang, PublicExhibition } from "../lib/public-calendar.ts";

// Aratta's recurring exhibition series, taken from the published archive.
// Next editions have no announced dates, so startsOn stays null: the website
// shows "dates to be announced" and offers a notify-me email, never a guess.
// When a manager lists the next edition from the staff portal, that live entry
// (with real dates) is shown above these.

type SeriesText = { name: string; summary: string; city: string; venue: string; sectors: string[]; lastEdition: string; notice?: string };

type SeriesSpec = {
  key: string;
  color: string;
  image: string;
  /** Site path (without the language prefix) or full URL for the latest official page. */
  sourceHref: string;
  postponed?: boolean;
  fa: SeriesText;
  en: SeriesText;
};

const SERIES: SeriesSpec[] = [
  {
    key: "kimex",
    color: "#c8a25a",
    image: "/archive-covers/mining-machinery-archive.webp",
    sourceHref: "/archive/5807",
    postponed: true,
    fa: {
      name: "نمایشگاه بین‌المللی معدن، صنایع معدنی و ماشین‌آلات (KIMEX)",
      summary: "رویداد اصلی معدن کرمان: معدن و صنایع معدنی، ماشین‌آلات راه‌سازی و معدنی، تجهیزات و خدمات وابسته.",
      city: "کرمان",
      venue: "محل دائمی نمایشگاه‌های بین‌المللی کرمان",
      sectors: ["معدن", "ماشین‌آلات", "تجهیزات"],
      lastEdition: "نهمین دوره (KIMEX 2025)، ۱۲ تا ۱۵ مرداد ۱۴۰۴",
      notice: "دهمین دوره که برای ۲۶ تا ۲۹ مرداد ۱۴۰۵ برنامه‌ریزی شده بود، تا اطلاع بعدی به تعویق افتاده است.",
    },
    en: {
      name: "Kerman International Mining, Mineral Industries and Machinery Exhibition (KIMEX)",
      summary: "Kerman's flagship mining event: mining and mineral industries, road and mining machinery, related equipment and services.",
      city: "Kerman",
      venue: "Kerman International Fairground",
      sectors: ["Mining", "Machinery", "Equipment"],
      lastEdition: "9th edition (KIMEX 2025), August 3–6, 2025",
      notice: "The 10th edition, planned for 17–20 August 2026, has been postponed until further notice.",
    },
  },
  {
    key: "steel-copper-supply-chain",
    color: "#5b8def",
    image: "/archive-covers/steel-copper-energy-archive.webp",
    sourceHref: "/exhibitions",
    fa: {
      name: "نمایشگاه زنجیره تامین فولاد، مس، انرژی و تجهیزات",
      summary: "فولاد و مس، انرژی، فلزات آهنی و غیرآهنی و تامین‌کنندگان تجهیزات صنایع بزرگ استان.",
      city: "کرمان",
      venue: "محل دائمی نمایشگاه‌های بین‌المللی کرمان",
      sectors: ["فولاد", "مس", "انرژی"],
      lastEdition: "پنجمین دوره، ۸ تا ۱۱ بهمن ۱۴۰۳",
    },
    en: {
      name: "Steel, Copper, Energy and Equipment Supply Chain Exhibition",
      summary: "Steel and copper, energy, ferrous and non-ferrous metals, and equipment suppliers to the province's major industries.",
      city: "Kerman",
      venue: "Kerman International Fairground",
      sectors: ["Steel", "Copper", "Energy"],
      lastEdition: "5th edition, January 27–30, 2025",
    },
  },
  {
    key: "sirjan-production",
    color: "#3fa66a",
    image: "/archive-covers/mineral-production-archive.webp",
    sourceHref: "/exhibitions",
    fa: {
      name: "نمایشگاه نهضت تولید در معدن، صنایع معدنی و زنجیره فولاد و مس سیرجان",
      summary: "رویداد منطقه‌ای سیرجان در پارک گهر، در کنار مجموعه‌های گل گهر و صنایع معدنی و فولادی منطقه.",
      city: "سیرجان",
      venue: "پارک گهر",
      sectors: ["معدن", "فولاد", "زنجیره تولید"],
      lastEdition: "دومین دوره نهضت تولید، ۱۹ تا ۲۲ آبان ۱۴۰۳",
    },
    en: {
      name: "Sirjan Production Movement in Mining, Mineral Industries and the Steel and Copper Chain",
      summary: "Sirjan's regional event at Gohar Park, alongside Gol Gohar and the region's mining and steel operators.",
      city: "Sirjan",
      venue: "Gohar Park",
      sectors: ["Mining", "Steel", "Production chain"],
      lastEdition: "2nd Production Movement edition, November 9–12, 2024",
    },
  },
];

export function getExhibitionSeries(lang: CalendarLang): PublicExhibition[] {
  return SERIES.map((s) => {
    const t = s[lang];
    return {
      key: s.key,
      source: "series",
      name: t.name,
      summary: t.summary,
      city: t.city,
      venue: t.venue,
      startsOn: null,
      endsOn: null,
      registrationOpen: false,
      sectors: t.sectors,
      color: s.color,
      image: s.image,
      lastEdition: t.lastEdition,
      notice: t.notice,
      postponed: Boolean(s.postponed),
      sourceHref: s.sourceHref.startsWith("/") ? `/${lang}${s.sourceHref}` : s.sourceHref,
    };
  });
}
