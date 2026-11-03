// Proposes how each sheet should be imported. The proposal is written to a
// JSON file that a person reviews (exhibition, hall, kind) before applying.
import { looksLikeHallMap, parseHallMap } from "./hall-map.mjs";
import { normalizeText } from "./normalize.mjs";
import { columnOf, readHeader } from "./tables.mjs";

const TOPICS = [
  [/زنجیره مس و فولاد|مس\s*و?\s*فولاد/, "copper-steel", "نمایشگاه زنجیره مس و فولاد"],
  [/هرمزگان/, "hormozgan-steel", "نمایشگاه فولاد هرمزگان"],
  [/سیرجان/, "sirjan-mining", "نمایشگاه معدن سیرجان"],
  [/معدن/, "kerman-mining", "نمایشگاه معدن کرمان"],
  [/فولاد/, "kerman-steel", "نمایشگاه فولاد کرمان"],
  [/خودرو/, "kerman-auto", "نمایشگاه خودرو"],
  [/شیرینی|شکلات/, "kerman-confectionery", "نمایشگاه شیرینی و شکلات"],
  [/آیدکس|ایدکس/, "idex-kerman", "نمایشگاه آیدکس کرمان"],
  [/همایش/, "conference", "همایش"],
];

const HALLS = [
  [/خواجو/, "سالن خواجوی کرمانی"],
  [/باستانی|پاریزی/, "سالن باستانی پاریزی"],
  [/سالن\s*مس/, "سالن مس"],
];

const OVERLAY = /کف\s?سازی|پارتیشن|غرفه\s?سازی|تجهیزات رزرو/;

export function guessExhibition(sheetName, fallbackYear) {
  const name = normalizeText(sheetName);
  const topic = TOPICS.find(([re]) => re.test(name));
  const year = name.match(/14\d\d/)?.[0] ?? fallbackYear ?? null;
  if (!topic) return null;
  return { slug: `${topic[1]}-${year ?? "unknown"}`, name_fa: topic[2], year_label: year };
}

export function guessHall(sheetName) {
  const name = normalizeText(sheetName);
  return HALLS.find(([re]) => re.test(name))?.[1] ?? null;
}

/** @param {import("exceljs").Workbook} workbook */
export function proposePlan(workbook, { defaultYear = null } = {}) {
  const sheets = [];
  const exhibitions = new Map();
  const people = new Set();

  for (const ws of workbook.worksheets) {
    const name = ws.name;
    const clean = normalizeText(name);
    const header = readHeader(ws);
    const mapLike = looksLikeHallMap(ws);
    let kind = "skip";
    let reason = null;

    if (mapLike && OVERLAY.test(clean)) {
      kind = "skip";
      reason = "Copy of a hall drawing used for flooring/partitions/build; review by hand";
    } else if (mapLike) {
      kind = "hall_map";
    } else if (/ضمانت/.test(clean)) {
      kind = "guarantees";
    } else if (/پرواز/.test(clean)) {
      kind = "guests";
    } else if (/تجهیزات/.test(clean) && header) {
      const hasItems = [...header.columns.values()].filter((c) => c.role === "item").length >= 3;
      kind = hasItems ? "equipment_matrix" : "equipment_list";
    } else if (/پیش\s?فاکتور/.test(clean) && header) {
      kind = columnOf(header, "area") || columnOf(header, "total") || columnOf(header, "subtotal")
        ? "invoices"
        : "crm";
    } else if (/غرفه\s?سازی|کف\s?سازی/.test(clean) && header) {
      kind = "booth_build";
    } else if (/پیامک|اسامی شرکت|لیست شرکت/.test(clean) && header) {
      kind = "contacts";
    } else if (/crm|کارگاه/i.test(clean) && header) {
      kind = "crm";
    } else if (!header && !mapLike) {
      reason = ws.actualRowCount ? "No recognisable header row" : "Empty sheet";
    }

    if (header) {
      for (const c of header.columns.values()) if (c.role === "person" && c.person) people.add(c.person);
    }

    let exhibition = guessExhibition(name, defaultYear);
    if (mapLike && (!exhibition || !exhibition.year_label)) {
      // Hall drawings usually carry the exhibition's full title in a banner.
      const title = parseHallMap(ws).title ?? "";
      const year =
        exhibition?.year_label ?? clean.match(/14\d\d/)?.[0] ?? title.match(/14\d\d/)?.[0] ?? defaultYear;
      exhibition = guessExhibition(`${exhibition ? clean : title} ${year ?? ""}`, defaultYear) ?? exhibition;
    }

    if (exhibition && kind !== "skip") exhibitions.set(exhibition.slug, exhibition);
    sheets.push({
      sheet: name,
      kind,
      exhibition: kind === "skip" ? null : (exhibition?.slug ?? null),
      hall: kind === "hall_map" ? (guessHall(name) ?? clean) : null,
      ...(reason ? { reason } : {}),
    });
  }

  return {
    version: 1,
    currency: "IRR",
    vatRate: 0.1,
    note:
      "Review every sheet: set kind to skip to ignore it, fix the exhibition slug, and map salesperson names to staff emails.",
    exhibitions: [...exhibitions.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    salespeople: Object.fromEntries([...people].sort().map((p) => [p, null])),
    sheets,
  };
}
