// Timing for the hall around the stand: the neighbouring stands are built in
// the background, staggered and slower than ours, and their lights come on one
// stand after another once our own show lighting is on. Values are scroll
// progress 0..1 (read-only use of the stand's timeline). Windows that start
// below 0 are already under way in the opening frame.

import { BOOTH_TIMELINE as T, FINALE_AT, clamp01 } from "./timeline";

type W = readonly [number, number];

export const SURROUNDINGS = {
  rotunda: { ring: [-0.16, 0.22], wall: [-0.2, 0.52], column: [0.44, 0.56], halo: [0.5, 0.68], dress: [0.7, 0.84], lights: [0.624, 0.662] },
  portal: { arches: [-0.14, 0.3], panels: [0.24, 0.5], mark: [0.5, 0.58], dress: [0.68, 0.8], lights: [0.64, 0.676] },
  ribbon: { fins: [-0.3, 0.46], frame: [0.38, 0.56], dress: [0.72, 0.86], lights: [0.654, 0.69] },
  pergola: { fins: [-0.24, 0.42], pylon: [0.4, 0.54], dress: [0.74, 0.86], lights: [0.668, 0.704] },
  dome: { ribs: [-0.36, 0.56], rings: [0.52, 0.64], lights: [0.682, 0.72] },
  /** Far rows and the hall's own decorative lights. */
  far: { lights: [0.6, 0.74] },
  /** Scissor lift and crates: on site in the opening frame, gone before the show. */
  lift: { out: [0.34, 0.42] },
  crates: { out: [0.62, 0.68] },
  /** Dusk outside the curtain wall deepens to night by the finale. */
  dusk: [0.4, FINALE_AT],
  /** The pool of light on the empty plot fades as the raised floor covers it. */
  plotPool: [T.pedestals[0], T.finish[1]],
} as const satisfies Record<string, Record<string, W> | W>;

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 0..1 level of a set of lights coming on across a window. */
export const lightsOn = (p: number, win: W) => smooth(win[0], win[1], p);

/** The i-th of n parts in a window, each taking `span` of the window's share (overlap > 1). */
export function stagger(win: W, i: number, n: number, span = 2.2): [number, number] {
  const step = (win[1] - win[0]) / (n - 1 + span);
  const a = win[0] + i * step;
  return [a, a + step * span];
}

/** Outside the glass: 0 = dusk (build-up), 1 = night (opening evening). */
export const nightLevel = (p: number) => smooth(SURROUNDINGS.dusk[0], SURROUNDINGS.dusk[1], p);
