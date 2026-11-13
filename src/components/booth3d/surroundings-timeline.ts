// Timing and layout for the hall around the stand. The hall fills up in step
// with our own build: every neighbouring stand has its own staggered build
// (floor, frame, walls, fascia, lights on, screens waking) spread over the
// chapters, so something is always quietly happening in the background, work
// gear arrives and leaves as the build goes, and by the finale every stand is
// lit and dressed: a show about to open. Values are scroll progress 0..1
// (read-only use of the stand's timeline). Windows that start below 0 are
// already under way in the opening frame.
//
// Keep-clear rule (the camera relies on it): the camera works on the front side
// of the stand, within 60 degrees either side of the front axis (+z), out to
// 40 m, from overhead down to eye level. Nothing taller than 0.5 m stands in
// that sector, and nothing hangs over the stand or in front of it below 12 m.

import { BOOTH_TIMELINE as T, FINALE_AT, clamp01 } from "./timeline";

type W = readonly [number, number];

/** Phases of one modular neighbour, in build order. */
export type ShellPlan = {
  floor: W;
  frame: W;
  walls: W;
  fascia: W;
  lights: W;
  screens: W;
  dress: W;
  /** A fabric banner hoisted over the stand (optional). */
  banner?: W;
};

/**
 * One modular neighbour's phases from a start and a pace (progress per phase
 * step). Each phase overlaps the next a little so the build never stops.
 */
export function shellPlan(start: number, pace: number, opts: { lightsAt?: number; banner?: number } = {}): ShellPlan {
  const at = (k: number, len = 1.4): W => [start + k * pace, start + (k + len) * pace];
  const lightsAt = opts.lightsAt ?? start + 5 * pace;
  const plan: ShellPlan = {
    floor: at(0, 1.2),
    frame: at(1, 1.6),
    walls: at(2.4, 1.8),
    fascia: at(4, 1),
    lights: [lightsAt, lightsAt + 0.04],
    screens: [lightsAt + 0.03, lightsAt + 0.08],
    dress: [Math.max(lightsAt + 0.06, start + 5.4 * pace), Math.max(lightsAt + 0.06, start + 5.4 * pace) + 0.1],
  };
  if (opts.banner !== undefined) plan.banner = [opts.banner, opts.banner + 0.07];
  return plan;
}

export const SURROUNDINGS = {
  // Bespoke neighbours (see neighbours.ts). Builds start in different chapters.
  rotunda: { floor: [-0.1, 0.02], ring: [0.02, 0.16], wall: [0.14, 0.4], column: [0.38, 0.47], halo: [0.45, 0.56], dress: [0.7, 0.82], lights: [0.58, 0.63] },
  portal: { floor: [0.05, 0.1], arches: [0.1, 0.32], panels: [0.3, 0.5], mark: [0.5, 0.57], dress: [0.72, 0.82], lights: [0.61, 0.66], screens: [0.64, 0.71] },
  ribbon: { floor: [0.18, 0.24], fins: [0.22, 0.52], frame: [0.48, 0.6], dress: [0.76, 0.86], lights: [0.66, 0.71] },
  pergola: { floor: [-0.1, 0.0], posts: [0.0, 0.12], fins: [0.12, 0.36], walls: [0.34, 0.44], pylon: [0.42, 0.54], dress: [0.78, 0.87], lights: [0.63, 0.68], screens: [0.68, 0.74] },
  dome: { floor: [0.24, 0.3], ribs: [0.3, 0.6], rings: [0.58, 0.68], lights: [0.7, 0.76] },
  // Modular neighbours: each starts in its own chapter.
  mediaLeft: shellPlan(0.02, 0.06, { lightsAt: 0.5, banner: 0.42 }),
  twinRight: shellPlan(0.12, 0.06, { lightsAt: 0.56, banner: 0.6 }),
  sideLeft: shellPlan(0.3, 0.05, { lightsAt: 0.67 }),
  sideRight: shellPlan(-0.12, 0.06, { lightsAt: 0.46 }),
  pavilion: shellPlan(0.42, 0.055, { lightsAt: 0.74 }),
  /** Far rows and the hall's own decorative lights: three groups across the second half. */
  far: { lights: [0.6, 0.74], groups: [[0.34, 0.4], [0.52, 0.58], [0.72, 0.78]] },
  /** Scissor lift and crates in site.ts: on site in the opening frame, gone before the show. */
  lift: { out: [0.34, 0.42] },
  crates: { out: [0.62, 0.68] },
  /** Dusk outside the curtain wall deepens to night by the finale. */
  dusk: [0.4, FINALE_AT],
  /** The pool of light on the empty plot fades as the raised floor covers it. */
  plotPool: [T.pedestals[0], T.finish[1]],
} as const;

/**
 * Work gear around the neighbours: each piece rolls in (`in`) and leaves
 * (`out`). Staggered so that something is always arriving or leaving until
 * the hosting chapter; all gone before the finale.
 */
export const GEAR: ReadonlyArray<{ kind: "pallet" | "crates" | "lift" | "truck"; x: number; z: number; yaw: number; in: W; out: W }> = [
  { kind: "pallet", x: -13.6, z: -7.2, yaw: 0.3, in: [-0.1, -0.05], out: [0.26, 0.31] },
  { kind: "crates", x: -24.2, z: -8.6, yaw: -0.2, in: [0.06, 0.11], out: [0.46, 0.51] },
  { kind: "lift", x: 22.6, z: -9.4, yaw: 1.4, in: [0.16, 0.22], out: [0.6, 0.66] },
  { kind: "truck", x: 19.8, z: -9.3, yaw: -0.5, in: [0.3, 0.35], out: [0.66, 0.7] },
  { kind: "pallet", x: -14.8, z: -11.2, yaw: 0.1, in: [0.2, 0.25], out: [0.56, 0.6] },
  { kind: "crates", x: 21.4, z: -1.2, yaw: 0.25, in: [0.4, 0.45], out: [0.76, 0.8] },
  { kind: "truck", x: -22.8, z: 3.2, yaw: 2.2, in: [0.5, 0.55], out: [0.8, 0.84] },
  { kind: "crates", x: -1.6, z: -20.8, yaw: 0.05, in: [0.46, 0.5], out: [0.82, 0.86] },
];

/**
 * Footprints (centre, size along x and z before `yaw`, top height) of every
 * neighbour and of the tall pieces around them, for the keep-clear test.
 */
export const NEIGHBOUR_FOOTPRINTS: ReadonlyArray<{ name: string; x: number; z: number; w: number; d: number; h: number; yaw?: number }> = [
  { name: "rotunda", x: -17, z: -1.5, w: 11.4, d: 11.4, h: 6.2 },
  { name: "portal", x: 11.5, z: -13.5, w: 13, d: 7, h: 6 },
  { name: "ribbon", x: -6, z: -15.5, w: 14, d: 7, h: 5.4 },
  { name: "pergola", x: 15.9, z: -4, w: 8.2, d: 8, h: 6.1 },
  { name: "dome", x: 13, z: -23.5, w: 9.4, d: 9.4, h: 4.6 },
  { name: "mediaLeft", x: -28, z: -13, w: 8, d: 6, h: 9 },
  { name: "twinRight", x: 27.5, z: -13.5, w: 9, d: 6, h: 9 },
  { name: "sideLeft", x: -29, z: 1.5, w: 6, d: 7, h: 4.5, yaw: Math.PI / 2 },
  { name: "sideRight", x: 28.5, z: 0.5, w: 6, d: 7, h: 4.5, yaw: -Math.PI / 2 },
  { name: "pavilion", x: -9, z: -24.6, w: 10, d: 5, h: 4.6 },
  ...GEAR.map((g, i) => ({ name: `gear-${i}-${g.kind}`, x: g.x, z: g.z, w: 2.8, d: 2.8, h: g.kind === "lift" ? 2.4 : 1.6, yaw: g.yaw })),
];

/** Keep-clear sector in front of the stand (with a small margin): true if a ground point lies in it. */
export function inKeepClear(x: number, z: number, margin = 2) {
  const r = Math.hypot(x, z);
  if (r > 40 + margin) return false;
  if (r < 0.001) return true;
  const azimuth = (Math.atan2(Math.abs(x), z) * 180) / Math.PI;
  return azimuth < 60 + margin;
}

/** Corners of a footprint on the floor (world x, z). */
export function footprintCorners(f: { x: number; z: number; w: number; d: number; yaw?: number }) {
  const c = Math.cos(f.yaw ?? 0);
  const s = Math.sin(f.yaw ?? 0);
  const out: Array<[number, number]> = [];
  for (const [lx, lz] of [
    [-f.w / 2, -f.d / 2],
    [f.w / 2, -f.d / 2],
    [f.w / 2, f.d / 2],
    [-f.w / 2, f.d / 2],
  ]) out.push([f.x + lx * c + lz * s, f.z - lx * s + lz * c]);
  return out;
}

const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 0..1 level of a set of lights coming on across a window. */
export const lightsOn = (p: number, win: W) => smooth(win[0], win[1], p);

/** 1 while a piece of gear is on site, easing in and out across its windows. */
export const onSite = (p: number, arrive: W, leave: W) => smooth(arrive[0], arrive[1], p) * (1 - smooth(leave[0], leave[1], p));

/** The i-th of n parts in a window, each taking `span` of the window's share (overlap > 1). */
export function stagger(win: W, i: number, n: number, span = 2.2): [number, number] {
  const step = (win[1] - win[0]) / (n - 1 + span);
  const a = win[0] + i * step;
  return [a, a + step * span];
}

/** Outside the glass: 0 = dusk (build-up), 1 = night (opening evening). */
export const nightLevel = (p: number) => smooth(SURROUNDINGS.dusk[0], SURROUNDINGS.dusk[1], p);

/**
 * Every window of the surroundings (stand phases and gear), for the tests:
 * the background must never stand still for long between the opening and the hosting chapter.
 */
export function surroundingWindows(): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  for (const [key, value] of Object.entries(SURROUNDINGS)) {
    if (key === "dusk" || key === "plotPool" || key === "lift" || key === "crates") continue;
    for (const [phase, win] of Object.entries(value as Record<string, unknown>)) {
      if (phase === "groups") for (const g of win as W[]) out.push(g);
      else out.push(win as W);
    }
  }
  for (const g of GEAR) out.push(g.in, g.out);
  return out;
}
