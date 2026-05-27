import type { Lang } from "@/lib/lang";

export const siteUrl = "https://aratta-expo-cinematic.vercel.app";

export const socialPreviewImage = {
  url: "/og/aratta-expo-booth-preview.png",
  width: 1672,
  height: 941,
} as const;

export const siteName = "Aratta Expo";

export const languageSeo: Record<
  Lang,
  {
    title: string;
    shortTitle: string;
    description: string;
    imageAlt: string;
    locale: string;
    alternateLocale: string;
  }
> = {
  fa: {
    title: "شرکت توسعه تجارت اَرَت | سامانه نمایشگاه های صنعتی",
    shortTitle: "شرکت توسعه تجارت اَرَت",
    description:
      "تجربه رسمی و دوزبانه اَرَت برای نمایشگاه های معدن، فولاد، مس، فرم های رسمی، گالری و مسیرهای تماس قابل بررسی.",
    imageAlt: "غرفه صنعتی اَرَت اکسپو با هویت دو زبانه و نورپردازی حرفه ای",
    locale: "fa_IR",
    alternateLocale: "en_US",
  },
  en: {
    title: "Aratta Expo | Industrial & Mining Exhibition Systems",
    shortTitle: "Aratta Expo",
    description:
      "A premium bilingual exhibition platform for mining, steel, copper, official forms, galleries, and verified contact paths.",
    imageAlt: "Aratta Expo industrial booth with bilingual identity and premium lighting",
    locale: "en_US",
    alternateLocale: "fa_IR",
  },
};

export function getLanguageSeo(lang: Lang) {
  return languageSeo[lang];
}
