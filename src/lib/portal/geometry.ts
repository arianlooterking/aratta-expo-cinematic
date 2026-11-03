// Plan geometry in metres. The hall's top-left corner is (0, 0); x grows to
// the right and y grows down, as drawn on the plan (not mirrored for RTL).

export type Rect = { x: number; y: number; width: number; depth: number };
export type View = { x: number; y: number; scale: number };

export function snap(value: number, step: number) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Normalised rectangle between two points, snapped to the grid. */
export function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }, step: number): Rect {
  const x1 = snap(Math.min(a.x, b.x), step);
  const y1 = snap(Math.min(a.y, b.y), step);
  const x2 = snap(Math.max(a.x, b.x), step);
  const y2 = snap(Math.max(a.y, b.y), step);
  return { x: round(x1), y: round(y1), width: round(x2 - x1), depth: round(y2 - y1) };
}

/** Keep a rectangle inside the hall. */
export function clampRect(r: Rect, hall: { width_m: number; depth_m: number }): Rect {
  const width = Math.min(r.width, hall.width_m);
  const depth = Math.min(r.depth, hall.depth_m);
  return {
    x: round(Math.max(0, Math.min(hall.width_m - width, r.x))),
    y: round(Math.max(0, Math.min(hall.depth_m - depth, r.y))),
    width: round(width),
    depth: round(depth),
  };
}

export function overlaps(a: Rect, b: Rect, tolerance = 0.01) {
  return a.x + a.width - tolerance > b.x && b.x + b.width - tolerance > a.x && a.y + a.depth - tolerance > b.y && b.y + b.depth - tolerance > a.y;
}

/** Ids of booths that overlap another booth. */
export function overlapping<T extends Rect & { id: string }>(rects: readonly T[]): Set<string> {
  const out = new Set<string>();
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].x >= sorted[i].x + sorted[i].width) break;
      if (overlaps(sorted[i], sorted[j])) {
        out.add(sorted[i].id);
        out.add(sorted[j].id);
      }
    }
  }
  return out;
}

/**
 * The view that fits the hall (plus a margin) in a viewport of the given pixel
 * size. `insetTop` keeps a band at the top free, for a floating toolbar.
 */
export function fitView(
  hall: { width_m: number; depth_m: number },
  size: { width: number; height: number },
  marginPx = 32,
  insetTop = 0,
): View {
  const w = Math.max(1, size.width - marginPx * 2);
  const h = Math.max(1, size.height - insetTop - marginPx * 2);
  const scale = Math.max(2, Math.min(w / hall.width_m, h / hall.depth_m));
  return {
    scale,
    x: (size.width - hall.width_m * scale) / 2,
    y: insetTop + (size.height - insetTop - hall.depth_m * scale) / 2,
  };
}

/** The view that centres a rectangle at a comfortable zoom. */
export function focusView(r: Rect, size: { width: number; height: number }, current: View): View {
  const scale = Math.max(current.scale, Math.min(60, Math.min(size.width / (r.width * 4), size.height / (r.depth * 4))));
  return {
    scale,
    x: size.width / 2 - (r.x + r.width / 2) * scale,
    y: size.height / 2 - (r.y + r.depth / 2) * scale,
  };
}

export const MIN_SCALE = 2;
export const MAX_SCALE = 120;

/** Zoom by a factor around a screen point, keeping that point fixed. */
export function zoomAt(view: View, factor: number, point: { x: number; y: number }): View {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * factor));
  const f = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * f, y: point.y - (point.y - view.y) * f };
}

export function toPlan(view: View, screen: { x: number; y: number }) {
  return { x: (screen.x - view.x) / view.scale, y: (screen.y - view.y) / view.scale };
}

/**
 * Text that fits a booth: font size in metres and the label shortened to fit
 * the width. Persian and Latin glyphs average about 0.55 em wide.
 */
export function fitLabel(text: string, width: number, depth: number, maxSize: number) {
  const size = Math.max(0.28, Math.min(maxSize, depth * 0.22, width / 4));
  const maxChars = Math.max(3, Math.floor((width * 0.9) / (size * 0.5)));
  const label = text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…` : text;
  return { size, label };
}

/** The next free code after the highest one with the same letter prefix ("B12" → "B13"). */
export function nextCode(codes: readonly string[], prefix?: string) {
  const parsed = codes
    .map((c) => /^([^\d]*)(\d+)$/.exec(c.trim()))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ prefix: m[1], n: Number(m[2]), width: m[2].length }));
  const pool = prefix === undefined ? parsed : parsed.filter((p) => p.prefix === prefix);
  if (!pool.length) return `${prefix ?? "A"}${"01"}`;
  const top = pool.reduce((a, b) => (b.n > a.n ? b : a));
  const used = new Set(codes.map((c) => c.trim()));
  let n = top.n + 1;
  let code = `${top.prefix}${String(n).padStart(top.width, "0")}`;
  while (used.has(code)) {
    n += 1;
    code = `${top.prefix}${String(n).padStart(top.width, "0")}`;
  }
  return code;
}
