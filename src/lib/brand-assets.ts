import type { Lang } from "@/lib/lang";

// The company's official logo (public/brand-v3), the same artwork in both
// languages. Its dark blocks are drawn for a black field, so on dark surfaces
// show `logo` on a black tile with rounded corners.
const official = {
  /** The logo cropped to its own bounds, transparent field. */
  logo: "/brand-v3/aratta-logo-official-tight.png",
  logoLight: "/brand-v3/aratta-logo-official-tight.png",
  /** Square, on black, as the company supplied it. */
  fullLogo: "/brand-v3/aratta-logo-official.png",
  /** App and browser icons: the logo on black. */
  tab: "/brand-v3/aratta-icon-512.png",
  tabLight: "/brand-v3/aratta-icon-512.png",
  icon192: "/brand-v3/aratta-icon-192.png",
  pin: "/brand-v3/aratta-logo-official-tight.png",
  pinLight: "/brand-v3/aratta-logo-official-tight.png",
} as const;

export const brandAssets = {
  fa: official,
  en: official,
} as const;

/** Alt text for the logo where it stands on its own. */
export const brandLogoAlt = {
  fa: "لوگوی شرکت نمایشگاهی توسعه تجارت اَرَتَ",
  en: "Aratta Trade Development Company logo",
} as const;

export function getBrandAssets(lang: Lang) {
  return brandAssets[lang];
}
