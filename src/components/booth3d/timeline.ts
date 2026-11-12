// One timeline drives both the 3D build and the copy beside it, so the words
// always describe what the visitor is watching. Values are scroll progress 0..1.
// The build follows the real order on a show floor: plan, rigging, floor,
// structure, walls, power and light, brand and media, then hosting.

export const CHAPTER_STARTS = [0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77] as const;
export const FINALE_AT = 0.9;

export const BOOTH_TIMELINE = {
  // 1 Plot and plan
  tape: [0.03, 0.07],
  standNumber: [0.06, 0.08],
  plan: [0.07, 0.105],
  planOut: [0.235, 0.27],
  // 2 Rigging
  truss: [0.115, 0.15],
  couplers: [0.135, 0.158],
  fixtures: [0.152, 0.172],
  chains: [0.166, 0.182],
  rigRise: [0.182, 0.214],
  // 3 Raised floor
  pedestals: [0.224, 0.248],
  level: [0.244, 0.258],
  trunking: [0.25, 0.268],
  panels: [0.264, 0.298],
  edge: [0.294, 0.31],
  ramp: [0.3, 0.314],
  finish: [0.306, 0.33],
  // 4 Structure
  columns: [0.334, 0.355],
  deck: [0.352, 0.384],
  balustrade: [0.378, 0.398],
  deckLift: [0.398, 0.42],
  stair: [0.414, 0.432],
  towerFrames: [0.388, 0.438],
  // 5 Walls, timber and glass
  frames: [0.444, 0.478],
  cladding: [0.47, 0.502],
  slats: [0.494, 0.52],
  glass: [0.5, 0.52],
  doors: [0.515, 0.524],
  // 6 Power and light: the board goes live, a pulse runs the cable routes and
  // each fixture fires when it arrives (cove strips, lightboxes, then the
  // truss spots one by one as the pulse runs round the truss).
  power: [0.553, 0.562],
  pulse: [0.561, 0.574],
  ledLines: [0.572, 0.594],
  lightboxes: [0.59, 0.606],
  feeder: [0.604, 0.614],
  spots: [0.614, 0.652],
  // The work floods are struck once the stand's own power is on.
  floodsOut: [0.568, 0.58],
  // Build-phase props (flight cases, panel pallet, ladder, drum) leave before the brand.
  siteOut: [0.645, 0.66],
  // 7 Brand and media
  ledTiles: [0.664, 0.704],
  ledBoot: [0.704, 0.722],
  mark: [0.714, 0.742],
  sign: [0.736, 0.766],
  // 8 Hosting
  counter: [0.774, 0.798],
  vitrines: [0.79, 0.82],
  bar: [0.808, 0.83],
  lounge: [0.818, 0.85],
  upstairs: [0.838, 0.864],
  plants: [0.854, 0.88],
  brochures: [0.872, 0.892],
} as const satisfies Record<string, readonly [number, number]>;

export type TimelineKey = keyof typeof BOOTH_TIMELINE;

type Vec3 = [number, number, number];

/**
 * Camera path: wide shots alternate with close details (a coupler pinning,
 * pedestals levelling, LED tiles landing). `close` keys keep their framing on
 * portrait screens instead of stepping back as far as the wide ones.
 */
export const CAMERA_KEYS: Array<{ at: number; position: Vec3; target: Vec3; close?: boolean }> = [
  { at: 0, position: [0, 9.5, 34], target: [0, 2.6, 0] },
  { at: 0.05, position: [1.5, 15, 15], target: [0, 0, 0.8] },
  { at: 0.1, position: [-1, 16.5, 9.5], target: [0, 0, 0.6] },
  // 2 Rigging: low and close while the truss is pinned at chest height, then back for the rise.
  { at: 0.135, position: [-6.8, 2.6, 10.5], target: [0.2, 1.1, 1.4] },
  { at: 0.158, position: [7.4, 1.75, 6.0], target: [4.9, 1.05, 3.5], close: true },
  { at: 0.2, position: [11.5, 2.4, 16.5], target: [0, 3.5, 0.5] },
  // 3 Floor: low at the front-right corner so the void shows, then the panel wave and finish.
  { at: 0.235, position: [6.75, 0.55, 5.45], target: [5.0, 0.06, 3.75], close: true },
  { at: 0.28, position: [9.5, 3.6, 11.0], target: [1.4, 0.1, 1.2] },
  { at: 0.322, position: [8.8, 2.6, 10.5], target: [0.8, 0.2, 1.0] },
  // 4 Structure.
  { at: 0.36, position: [-11.5, 4.2, 8.5], target: [-3.5, 1.4, -2.4] },
  { at: 0.405, position: [-9.5, 3.6, 5.5], target: [-3.5, 2.3, -3.0], close: true },
  // 5 Walls: a wide three-quarter view from the open front, then the glass room.
  { at: 0.44, position: [7.5, 4.4, 13.5], target: [-0.8, 2.0, -3.0] },
  { at: 0.48, position: [7.0, 3.6, 12.5], target: [-1.2, 1.9, -3.0] },
  { at: 0.525, position: [-1.9, 1.6, 2.7], target: [-4.5, 1.25, -1.5], close: true },
  // 6 Power and light.
  { at: 0.58, position: [-8.5, 3.6, 15.5], target: [0, 2.0, 0] },
  { at: 0.635, position: [9.5, 2.0, 13.5], target: [0, 4.0, -0.5] },
  // 7 Brand: the LED wall whole, the mark close, then the sign.
  { at: 0.69, position: [3.6, 2.3, 4.2], target: [4.05, 2.05, -4.4], close: true },
  { at: 0.73, position: [0.55, 4.75, 0.6], target: [0.45, 4.55, -4.0], close: true },
  { at: 0.762, position: [-7.5, 2.4, 13.5], target: [0.4, 5.0, 0.4] },
  // 8 Hosting.
  { at: 0.8, position: [4.6, 1.9, 10.0], target: [0.4, 1.0, 3.0] },
  { at: 0.835, position: [6.6, 2.0, 3.6], target: [5.1, 1.1, -0.4], close: true },
  { at: 0.866, position: [0.6, 4.9, 2.4], target: [-3.5, 3.4, -3], close: true },
  // Finale: an architectural three-quarter view from the open front corner, eye height 3 m.
  { at: 0.9, position: [11.0, 3.1, 20.2], target: [-0.3, 2.9, 0] },
  { at: 1, position: [15.6, 3.3, 17.0], target: [-0.3, 2.9, 0] },
];

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const window01 = (p: number, start: number, end: number) => clamp01((p - start) / (end - start));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number, overshoot = 1.70158) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
};
/** Purposeful travel with a small settle at the end (about 2% overshoot). */
export const settle = (t: number) => easeOutBack(t, 0.55);
/** A short bright pulse centred on `at`, used for the glint where parts lock. */
export const pulse = (p: number, at: number, width = 0.006) => {
  const d = (p - at) / width;
  return d < -1 || d > 2.2 ? 0 : d < 0 ? 1 + d : Math.max(0, 1 - d / 2.2);
};

/** Which chapter is on screen for a progress value (-1 = intro, 8 = finale). */
export function chapterAt(progress: number) {
  if (progress < 0.03) return -1;
  if (progress >= FINALE_AT) return CHAPTER_STARTS.length;
  let index = 0;
  for (let i = 0; i < CHAPTER_STARTS.length; i += 1) if (progress >= CHAPTER_STARTS[i]) index = i;
  return index;
}

// ------------------------------------------------------------------ light levels
// Pure functions of progress, shared by the LED shader, decals and real lights.

const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** The distribution board is live. */
export const powerLevel = (p: number) => window01(p, BOOTH_TIMELINE.power[0], BOOTH_TIMELINE.power[1]);
/** Position of the LED sweep front (same units as the LED shader). */
export const ledSweep = (p: number) => -2 + 22 * easeInOutCubic(window01(p, BOOTH_TIMELINE.ledLines[0], BOOTH_TIMELINE.ledLines[1]));
export const ledLevel = (p: number) => (p > BOOTH_TIMELINE.ledLines[0] ? 1 : 0);
/** How lit a hidden LED line is at a world position (mirrors the shader). */
export const ledAt = (p: number, x: number, y: number, z: number) => {
  const d = x + 6 + (4.5 - z) * 0.55 + y * 0.35;
  const s = ledSweep(p);
  return ledLevel(p) * (1 - smooth(s - 0.8, s, d));
};
export const lightboxLevel = (p: number) => easeOutCubic(window01(p, BOOTH_TIMELINE.lightboxes[0], BOOTH_TIMELINE.lightboxes[1]));
/** Where each truss spot sits along the pulse's run round the truss (0..1), set by the rig. */
export const SPOT_ORDER: number[] = [];
/** Truss spots fire one by one as the pulse reaches them, each with a brief warm-up flicker. */
export const spotLevel = (p: number, i: number, n: number) => {
  const [a, b] = BOOTH_TIMELINE.spots;
  const k = SPOT_ORDER.length === n ? SPOT_ORDER[i] : i / n;
  const s = a + k * (b - a - 0.004);
  const t = window01(p, s, s + 0.0035);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * (0.7 + 0.3 * Math.sin(t * 46));
};
/** Front of the travelling power pulse round the truss (0..1). */
export const trussPulse = (p: number) => window01(p, BOOTH_TIMELINE.spots[0], BOOTH_TIMELINE.spots[1] - 0.004);
/** Overall stand lighting (0 = hall work light, 1 = show lighting). */
export const showLight = (p: number) => smooth(BOOTH_TIMELINE.ledLines[0], BOOTH_TIMELINE.spots[1], p);
/** Hall work lights: full through the build, dimmed to about a third for the show. */
export const hallLight = (p: number) => 1 - 0.68 * smooth(BOOTH_TIMELINE.power[0], BOOTH_TIMELINE.lightboxes[1], p);
/** Build-phase props are on site from the rigging until just before the brand chapter. */
export const siteProps = (p: number) => (p < 0.112 ? 0 : 1 - window01(p, BOOTH_TIMELINE.siteOut[0], BOOTH_TIMELINE.siteOut[1]));
