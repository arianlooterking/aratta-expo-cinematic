import type { Lang } from "@/lib/lang";
import { daysUntil, num } from "./format.ts";
import { exhibitionStatusLabel } from "./i18n.ts";
import type { ExhibitionStatus } from "./types";

/** "12 days to opening" style line for an exhibition. */
export function countdownText(lang: Lang, e: { starts_on: string | null; ends_on: string | null; status: ExhibitionStatus }) {
  if (!e.starts_on) return exhibitionStatusLabel[e.status][lang];
  const toStart = daysUntil(e.starts_on);
  const toEnd = e.ends_on ? daysUntil(e.ends_on) : toStart;
  if (toStart > 1) return lang === "fa" ? `${num(lang, toStart)} روز تا افتتاح` : `${toStart} days to opening`;
  if (toStart === 1) return lang === "fa" ? "افتتاح فردا" : "Opens tomorrow";
  if (toStart === 0) return lang === "fa" ? "افتتاح امروز" : "Opens today";
  if (toEnd >= 0) return lang === "fa" ? `روز ${num(lang, 1 - toStart)} نمایشگاه` : `Show day ${1 - toStart}`;
  return lang === "fa" ? `${num(lang, -toEnd)} روز از پایان` : `Ended ${-toEnd} days ago`;
}

