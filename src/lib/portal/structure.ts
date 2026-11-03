/**
 * Pure helpers for the hall structure: corridors, columns, entrances and doors.
 * Everything is in metres on the plan. y grows downwards (the top wall is y = 0).
 */
import type { Rect } from "./geometry.ts";

export type HallSize = { width_m: number; depth_m: number };
export type Wall = "top" | "bottom" | "left" | "right";

const r2 = (v: number) => Math.round(v * 100) / 100;

function fit(r: Rect, hall: HallSize): Rect {
  const width = Math.min(Math.max(r.width, 0.1), hall.width_m);
  const depth = Math.min(Math.max(r.depth, 0.1), hall.depth_m);
  return {
    x: r2(Math.min(Math.max(r.x, 0), hall.width_m - width)),
    y: r2(Math.min(Math.max(r.y, 0), hall.depth_m - depth)),
    width: r2(width),
    depth: r2(depth),
  };
}

/** The walkable width of a corridor: its short side. */
export function clearWidth(r: Pick<Rect, "width" | "depth">) {
  return r2(Math.min(r.width, r.depth));
}

/** Columns spaced evenly along a corridor, on its centre line or on both edges. */
export function columnsAlong(aisle: Rect, count: number, size = 0.6, placement: "centre" | "edges" = "centre"): Rect[] {
  const n = Math.max(0, Math.min(200, Math.floor(count)));
  if (!n) return [];
  const s = Math.max(0.1, Math.min(size, aisle.width, aisle.depth));
  const horizontal = aisle.width >= aisle.depth;
  const length = horizontal ? aisle.width : aisle.depth;
  const step = length / n;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const along = (horizontal ? aisle.x : aisle.y) + step * (i + 0.5) - s / 2;
    const lanes =
      placement === "centre"
        ? [(horizontal ? aisle.y + aisle.depth / 2 : aisle.x + aisle.width / 2) - s / 2]
        : horizontal
          ? [aisle.y, aisle.y + aisle.depth - s]
          : [aisle.x, aisle.x + aisle.width - s];
    for (const lane of lanes) {
      out.push(horizontal ? { x: r2(along), y: r2(lane), width: r2(s), depth: r2(s) } : { x: r2(lane), y: r2(along), width: r2(s), depth: r2(s) });
    }
  }
  return out;
}

/** Copies of a shape repeated across (to the right) or down, centre to centre. Copies outside the hall are dropped. */
export function repeatRect(r: Rect, copies: number, spacing: number, direction: "across" | "down", hall: HallSize): Rect[] {
  const n = Math.max(0, Math.min(200, Math.floor(copies)));
  const gap = Math.max(spacing, 0.1);
  const out: Rect[] = [];
  for (let i = 1; i <= n; i++) {
    const next = direction === "across" ? { ...r, x: r2(r.x + gap * i) } : { ...r, y: r2(r.y + gap * i) };
    if (next.x + next.width > hall.width_m + 0.001 || next.y + next.depth > hall.depth_m + 0.001) break;
    out.push(next);
  }
  return out;
}

/** Moves an entrance or door flush to a wall, with its long side along that wall. */
export function snapToWall(r: Rect, wall: Wall, hall: HallSize): Rect {
  const long = Math.max(r.width, r.depth);
  const short = Math.min(r.width, r.depth);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.depth / 2;
  if (wall === "top" || wall === "bottom") {
    return fit({ x: cx - long / 2, y: wall === "top" ? 0 : hall.depth_m - short, width: long, depth: short }, hall);
  }
  return fit({ x: wall === "left" ? 0 : hall.width_m - short, y: cy - long / 2, width: short, depth: long }, hall);
}

/** Which wall a shape touches, if any (within 5 cm). */
export function wallOf(r: Rect, hall: HallSize): Wall | null {
  const eps = 0.05;
  if (r.y <= eps) return "top";
  if (r.y + r.depth >= hall.depth_m - eps) return "bottom";
  if (r.x <= eps) return "left";
  if (r.x + r.width >= hall.width_m - eps) return "right";
  return null;
}

/** Turns a shape 90 degrees around its centre and keeps it inside the hall. */
export function turn(r: Rect, hall: HallSize): Rect {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.depth / 2;
  return fit({ x: cx - r.depth / 2, y: cy - r.width / 2, width: r.depth, depth: r.width }, hall);
}

/** Applies a typed change to one side and keeps the shape inside the hall. */
export function resize(r: Rect, patch: Partial<Rect>, hall: HallSize): Rect {
  return fit({ ...r, ...patch }, hall);
}
