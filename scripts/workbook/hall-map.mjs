// Reads a hall plan drawn in Excel: each merged block is a booth or a plan
// feature, one cell is one metre, and the fill colour carries sales status.
import { cellText, normalizeText } from "./normalize.mjs";

const CODE = /(?:^|[^A-Za-z0-9])([A-Za-z]{1,3})\s?-?\s?(\d{1,3}[A-Za-z]?)(?![A-Za-z0-9])/;
const AREA = /(\d+(?:[.,]\d+)?)\s*(?:m²|m2|m(?![A-Za-z])|M(?![A-Za-z])|متر(?:مربع)?)/;

const FEATURE_WORDS = [
  [/ورودی|entrance/i, "entrance"],
  [/بار\s?انداز|loading/i, "loading"],
  [/درب|exit|خروج/i, "door"],
  [/ستون|column/i, "column"],
  [/راهرو|aisle/i, "aisle"],
  [/سرویس|wc|آبدارخانه/i, "service"],
  [/سن\b|stage|جایگاه/i, "stage"],
  [/فضای|محوطه|zone/i, "zone"],
];

export function parseRange(ref) {
  const [a, b = a] = ref.split(":");
  const parse = (cell) => {
    const m = cell.match(/^([A-Z]+)(\d+)$/);
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col, row: Number(m[2]) };
  };
  const p = parse(a);
  const q = parse(b);
  return {
    c1: Math.min(p.col, q.col),
    c2: Math.max(p.col, q.col),
    r1: Math.min(p.row, q.row),
    r2: Math.max(p.row, q.row),
  };
}

export function fillArgb(fill) {
  if (!fill || fill.type !== "pattern" || fill.pattern !== "solid") return null;
  const argb = fill.fgColor?.argb;
  return typeof argb === "string" ? argb.toUpperCase() : null;
}

function colourClass(argb) {
  if (!argb) return "none";
  const rgb = argb.slice(-6);
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  if (r > 235 && g > 235 && b > 235) return "white";
  if (r < 0x70 && g < 0x70 && b < 0x70) return "dark";
  if (g > r + 30 && g > b + 30) return "green";
  if (r > 200 && g > 200 && b < 120) return "yellow";
  if (r > 180 && g < 140 && b > 120) return "pink";
  return "other";
}

/** Split a booth label like "k11 12m کوماتسو مرکزی" into its parts. */
export function parseBoothLabel(raw) {
  const text = normalizeText(raw);
  let rest = ` ${text} `;
  let code = null;
  const codeMatch = rest.match(CODE);
  if (codeMatch) {
    code = `${codeMatch[1]}${codeMatch[2]}`.toUpperCase();
    rest = rest.replace(codeMatch[0], (m) => m.replace(`${codeMatch[1]}`, " ").replace(codeMatch[2], " "));
  }
  let area = null;
  const areaMatch = rest.match(AREA);
  if (areaMatch) {
    area = Number(areaMatch[1].replace(",", "."));
    rest = rest.replace(areaMatch[0], " ");
  } else if (code) {
    const bare = rest.match(/(?:^|\s)(\d{2,4})(?:\s|$)/);
    if (bare) {
      area = Number(bare[1]);
      rest = rest.replace(bare[0], " ");
    }
  }
  const held = /رزرو/.test(rest);
  const company = normalizeText(rest.replace(/رزرو/g, " ").replace(/^[\s().،,:\-_]+|[\s().،,:\-_]+$/g, "")) || null;
  return { code, area, company, held };
}

/**
 * @param {import("exceljs").Worksheet} ws
 * @param {{ cellSize?: number }} [options]
 */
export function parseHallMap(ws, options = {}) {
  const cell = options.cellSize ?? 1;
  const rtl = Boolean(ws.views?.[0]?.rightToLeft);
  const merges = (ws.model.merges ?? []).map(parseRange);
  const warnings = [];
  const blocks = [];
  let title = null;

  for (const m of merges) {
    const source = ws.getCell(m.r1, m.c1);
    const text = cellText(source.value);
    const colour = colourClass(fillArgb(source.fill));
    const width = m.c2 - m.c1 + 1;
    const depth = m.r2 - m.r1 + 1;
    const label = parseBoothLabel(text);

    if (text && width >= 20 && /نمایشگاه|سالن/.test(text) && !label.code && !label.area) {
      title = title ?? text;
      continue;
    }
    if (text && /^سالن\s/.test(text) && !label.code) {
      blocks.push({ type: "feature", kind: "label", label: text, m });
      continue;
    }
    if (/راهرو|ورودی|بار\s?انداز/.test(text)) {
      const kind = /راهرو/.test(text) ? "aisle" : /ورودی/.test(text) ? "entrance" : "loading";
      blocks.push({ type: "feature", kind, label: text, m });
      continue;
    }
    if (label.code || label.area || (label.company && colour === "green")) {
      blocks.push({ type: "booth", label, colour, m, text });
      continue;
    }
    const feature = FEATURE_WORDS.find(([re]) => re.test(text));
    if (feature) {
      blocks.push({ type: "feature", kind: feature[1], label: text, m });
    } else if (!text && colour === "dark" && width * depth <= 4) {
      blocks.push({ type: "feature", kind: "column", label: null, m });
    } else if (!text && (colour === "dark" || colour === "other")) {
      blocks.push({ type: "feature", kind: "service", label: null, m });
    } else if (text) {
      blocks.push({ type: "feature", kind: "label", label: text, m });
    }
  }

  if (!blocks.length) return { title, rtl, width: 0, depth: 0, booths: [], features: [], warnings };

  const minC = Math.min(...blocks.map((b) => b.m.c1));
  const maxC = Math.max(...blocks.map((b) => b.m.c2));
  const minR = Math.min(...blocks.map((b) => b.m.r1));
  const maxR = Math.max(...blocks.map((b) => b.m.r2));
  const place = (m) => ({
    x: (rtl ? maxC - m.c2 : m.c1 - minC) * cell,
    y: (m.r1 - minR) * cell,
    width: (m.c2 - m.c1 + 1) * cell,
    depth: (m.r2 - m.r1 + 1) * cell,
  });

  const booths = [];
  const features = [];
  const seen = new Map();
  let autoNumber = 0;

  for (const block of blocks) {
    if (block.type === "feature") {
      features.push({ kind: block.kind, label: block.label, ...place(block.m) });
      continue;
    }
    const { label, colour } = block;
    let code = label.code;
    if (!code) {
      autoNumber += 1;
      code = `X${autoNumber}`;
      warnings.push(`Booth without a code got ${code}: "${block.text}"`);
    }
    if (seen.has(code)) {
      const n = seen.get(code) + 1;
      seen.set(code, n);
      warnings.push(`Duplicate booth code ${code}; renamed to ${code}-${n}`);
      code = `${code}-${n}`;
    } else {
      seen.set(code, 1);
    }
    const geometry = place(block.m);
    const drawnArea = geometry.width * geometry.depth;
    if (label.area && Math.abs(label.area - drawnArea) > Math.max(2, drawnArea * 0.15)) {
      warnings.push(`${code}: label says ${label.area} m² but the drawing is ${drawnArea} m²; kept the label`);
    }
    const status = label.held || colour === "yellow"
      ? "held"
      : colour === "green"
        ? "contracted"
        : label.company
          ? "reserved"
          : "available";
    booths.push({
      code,
      ...geometry,
      area: label.area ?? drawnArea,
      areaFromLabel: label.area !== null,
      company: label.company,
      status,
    });
  }

  return {
    title,
    rtl,
    width: (maxC - minC + 1) * cell,
    depth: (maxR - minR + 1) * cell,
    booths,
    features,
    warnings,
  };
}

/** A sheet looks like a hall drawing when many merged blocks read as booths. */
export function looksLikeHallMap(ws) {
  const merges = ws.model.merges ?? [];
  if (merges.length < 8) return false;
  let boothish = 0;
  for (const ref of merges) {
    const m = parseRange(ref);
    const text = cellText(ws.getCell(m.r1, m.c1).value);
    const label = parseBoothLabel(text);
    if (label.code || label.area) boothish += 1;
  }
  return boothish >= 5;
}
