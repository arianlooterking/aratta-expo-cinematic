import type { Lang } from "@/lib/lang";

export const brandAssets = {
  fa: {
    logo: "/brand-v2/aratta-tab.png",
    logoLight: "/brand-v2/aratta-tab.png",
    fullLogo: "/brand-v2/aratta-logo-en-horizontal.png",
    tab: "/brand-v2/aratta-tab.png",
    tabLight: "/brand-v2/aratta-tab.png",
    pin: "/brand-v2/aratta-tab.png",
    pinLight: "/brand-v2/aratta-tab.png",
  },
  en: {
    logo: "/brand-v2/aratta-tab.png",
    logoLight: "/brand-v2/aratta-tab.png",
    fullLogo: "/brand-v2/aratta-logo-en-horizontal.png",
    tab: "/brand-v2/aratta-tab.png",
    tabLight: "/brand-v2/aratta-tab.png",
    pin: "/brand-v2/aratta-tab.png",
    pinLight: "/brand-v2/aratta-tab.png",
  },
} as const;

export function getBrandAssets(lang: Lang) {
  return brandAssets[lang];
}
