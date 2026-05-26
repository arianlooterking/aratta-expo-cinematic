import type { Lang } from "@/lib/lang";

export const brandAssets = {
  fa: {
    logo: "/brand/aratta-logo-fa-lockup.png",
    fullLogo: "/brand/aratta-logo-fa.png",
    tab: "/brand/aratta-tab-fa.png",
    pin: "/brand/aratta-pin-fa.png",
  },
  en: {
    logo: "/brand/aratta-logo-en-lockup.png",
    fullLogo: "/brand/aratta-logo-en.png",
    tab: "/brand/aratta-tab-en.png",
    pin: "/brand/aratta-pin-en.png",
  },
} as const;

export function getBrandAssets(lang: Lang) {
  return brandAssets[lang];
}
