/**
 * Reading halls out of an uploaded venue map. Shared by the server route
 * (which asks the model and cleans its answer) and the new-exhibition form
 * (which shows the halls for staff to check before anything is saved).
 */

/** Part of the uploaded image a hall covers, as 0..1 fractions of its width and height. */
export type HallBox = { x: number; y: number; w: number; h: number };

export type HallDraft = {
  key: string;
  name_fa: string;
  name_en: string;
  /** Metres; null when the drawing gives no size and staff haven't typed one. */
  width_m: number | null;
  depth_m: number | null;
  box: HallBox | null;
  /** 1-based PDF page the hall is drawn on, when the map is a PDF. */
  page: number | null;
  booths: number | null;
  note: string;
  source: "read" | "manual";
};

export type VenueReading = {
  summary: string;
  confidence: number;
  halls: HallDraft[];
};

export const MAX_HALLS = 40;
export const DEFAULT_HALL_SIZE = { width_m: 60, depth_m: 36 };

export const VENUE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export type VenueMimeType = (typeof VENUE_MIME_TYPES)[number];
export const MAX_VENUE_FILE_BYTES = 10 * 1024 * 1024;

export function isVenueMimeType(value: string): value is VenueMimeType {
  return (VENUE_MIME_TYPES as readonly string[]).includes(value);
}

/** Checks the first bytes so a renamed file can't pose as an image or PDF. */
export function matchesVenueSignature(bytes: Uint8Array, mime: VenueMimeType) {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  switch (mime) {
    case "image/png":
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return starts([0xff, 0xd8, 0xff]);
    case "image/webp":
      return starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8);
    case "application/pdf":
      return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
}

/** JSON schema the model must answer in (structured output). */
export const venueReadingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "confidence", "halls"],
  properties: {
    summary: { type: "string", description: "One or two sentences in Persian about what the drawing shows." },
    confidence: { type: "number", description: "0 to 1: how sure you are about the list of halls." },
    halls: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name_fa", "name_en", "width_m", "depth_m", "box", "page", "booths", "note"],
        properties: {
          name_fa: { type: "string", description: "Hall name in Persian, as written or a faithful translation." },
          name_en: { type: "string", description: "Hall name in English, or an empty string." },
          width_m: { type: ["number", "null"], description: "Hall width in metres if the drawing gives it or it can be worked out; otherwise null." },
          depth_m: { type: ["number", "null"], description: "Hall depth in metres if known; otherwise null." },
          box: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "w", "h"],
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  w: { type: "number" },
                  h: { type: "number" },
                },
              },
            ],
            description: "Where the hall's outline sits on the page, as fractions 0..1 of the page width and height from the top-left corner.",
          },
          page: { type: ["integer", "null"], description: "1-based page number for PDFs, null for images." },
          booths: { type: ["integer", "null"], description: "Number of booths drawn inside the hall, if they can be counted; otherwise null." },
          note: { type: "string", description: "Short Persian note for staff (uncertainty, odd shape, outdoor area). Empty if nothing to add." },
        },
      },
    },
  },
} as const;

export const venueReadingPrompt = `You are helping the staff of Aratta Expo (اَرَتَ), an exhibition organiser in Kerman, Iran, set up a new exhibition.
The attached file is a venue map, hall plan, hand sketch or brochure page for an exhibition ground.

List every separate exhibition hall (سالن) or exhibition area in it: indoor halls, pavilions, and outdoor exhibition zones that hold booths. A venue can have just one hall or a dozen or more. Do not list corridors, parking, toilets, offices, prayer rooms, restaurants or entrances as halls.

For each hall:
- name_fa: the name as written (Persian if it is in Persian). If the drawing only numbers them, use "سالن ۱", "سالن ۲" and so on. Keep real names such as "سالن خواجوی کرمانی".
- name_en: an English name if one is written or the Persian name translates simply, else "".
- width_m and depth_m: only when the drawing states dimensions, a scale bar or measured booths that let you work them out. Do not guess sizes from nothing: use null.
- box: the hall outline's position on the page as fractions of page width and height (x, y = top-left corner). Use null if you can't place it.
- page: page number for multi-page PDFs, null for images.
- booths: how many booths are drawn inside, if they are clearly countable; else null.
- note: a short Persian note for staff when something is uncertain, else "".

Order halls the way the venue numbers them, or right-to-left and top-to-bottom if there is no numbering.
If the file is not a venue map at all, return an empty halls list and say so in summary. Write the summary in Persian.`;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function cleanText(value: unknown, max = 80) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanMetres(value: unknown) {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n) || n < 3 || n > 2000) return null;
  return Math.round(n * 10) / 10;
}

function cleanCount(value: unknown, max: number) {
  const n = typeof value === "number" ? Math.round(value) : Number.NaN;
  return Number.isFinite(n) && n >= 1 && n <= max ? n : null;
}

function cleanBox(value: unknown): HallBox | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const nums = ["x", "y", "w", "h"].map((k) => (typeof v[k] === "number" && Number.isFinite(v[k]) ? (v[k] as number) : Number.NaN));
  if (nums.some(Number.isNaN)) return null;
  // Some answers come back in percent; bring them to fractions.
  const scale = nums.some((n) => n > 1.5) ? 100 : 1;
  let [x, y, w, h] = nums.map((n) => n / scale);
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  w = clamp(w, 0, 1 - x);
  h = clamp(h, 0, 1 - y);
  if (w < 0.02 || h < 0.02) return null;
  return { x, y, w, h };
}

let keySeed = 0;
export function hallKey() {
  keySeed += 1;
  return `hall-${Date.now().toString(36)}-${keySeed}`;
}

export function blankHall(index: number, lang: "fa" | "en" = "fa"): HallDraft {
  return {
    key: hallKey(),
    name_fa: lang === "fa" ? `سالن ${new Intl.NumberFormat("fa-IR").format(index + 1)}` : `سالن ${index + 1}`,
    name_en: `Hall ${index + 1}`,
    width_m: null,
    depth_m: null,
    box: null,
    page: null,
    booths: null,
    note: "",
    source: "manual",
  };
}

/** Turns whatever the model returned into a safe list the form can show. */
export function normalizeVenueReading(raw: unknown): VenueReading | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.halls)) return null;
  const halls: HallDraft[] = [];
  for (const item of r.halls.slice(0, MAX_HALLS)) {
    if (!item || typeof item !== "object") continue;
    const h = item as Record<string, unknown>;
    const nameFa = cleanText(h.name_fa) || cleanText(h.name_en);
    if (!nameFa) continue;
    halls.push({
      key: hallKey(),
      name_fa: nameFa,
      name_en: cleanText(h.name_en),
      width_m: cleanMetres(h.width_m),
      depth_m: cleanMetres(h.depth_m),
      box: cleanBox(h.box),
      page: cleanCount(h.page, 600),
      booths: cleanCount(h.booths, 2000),
      note: cleanText(h.note, 200),
      source: "read",
    });
  }
  const confidence = typeof r.confidence === "number" && Number.isFinite(r.confidence) ? clamp(r.confidence, 0, 1) : 0.5;
  return { summary: cleanText(r.summary, 400), confidence, halls };
}

/**
 * Size to save for a hall. When only one side is known, the other follows the
 * outline's shape on the drawing; with nothing known, a typical 60 × 36 m hall.
 */
export function resolvedSize(hall: Pick<HallDraft, "width_m" | "depth_m" | "box">, imageAspect: number | null = null) {
  const ratio = hall.box && imageAspect ? (hall.box.h / hall.box.w) * imageAspect : null;
  let width = hall.width_m;
  let depth = hall.depth_m;
  if (width && !depth) depth = ratio ? Math.round(width * ratio * 10) / 10 : Math.round(width * 0.6 * 10) / 10;
  if (depth && !width) width = ratio ? Math.round((depth / ratio) * 10) / 10 : Math.round((depth / 0.6) * 10) / 10;
  if (!width || !depth) {
    width = DEFAULT_HALL_SIZE.width_m;
    depth = ratio ? Math.round(width * ratio * 10) / 10 : DEFAULT_HALL_SIZE.depth_m;
  }
  return { width_m: clamp(width, 4, 2000), depth_m: clamp(depth, 4, 2000) };
}
