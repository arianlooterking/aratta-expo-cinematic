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
 * Camera path: one slow crane move from the open front of the stand. The
 * camera never goes beside, behind, over or inside the stand. Keys are in
 * cylindrical form around the plot centre (0, 0): `azimuth` in degrees from
 * the front axis (+z) toward +x, `distance` horizontal metres, `height` metres.
 * Azimuth and height only ever decrease (the camera swings slowly from the
 * front-right toward the centre line and comes down from above the plan to eye
 * height); detail beats are dollies along the view axis plus a slow drift of
 * the look-at point toward the part being built. The path ends where the
 * finale's front elevation takes over (see camera.ts).
 */
export const CAMERA_KEYS: Array<{ at: number; azimuth: number; distance: number; height: number; target: Vec3 }> = [
  // Opening: about (9, 8.4, 31) looking at (0, 3, 0), shared with the hall.
  { at: 0, azimuth: 16.2, distance: 32.3, height: 8.4, target: [0, 3, 0] },
  // 1 Plan: the look-at drops to the floor so the tape and plan read from above.
  { at: 0.1, azimuth: 15.2, distance: 29.2, height: 8.35, target: [0.2, 0.6, 0.4] },
  // 2 Rigging: a little closer; the truss rises toward the camera's height.
  { at: 0.2, azimuth: 14.0, distance: 26.8, height: 8.2, target: [0.3, 0.9, 0.4] },
  // 3 Raised floor: the steepest look over the panels.
  { at: 0.3, azimuth: 12.8, distance: 25.6, height: 7.8, target: [0.2, 0.4, 0.4] },
  // 4 Structure: down to deck height; the look-at follows the deck and tower up.
  { at: 0.4, azimuth: 11.6, distance: 24.8, height: 5.9, target: [-0.4, 2.0, -0.8] },
  // 5 Walls and glass.
  { at: 0.5, azimuth: 10.4, distance: 24.2, height: 5.0, target: [-0.3, 2.1, -1.0] },
  // 6 Power and light: just above eye level, the whole stand lighting up.
  { at: 0.6, azimuth: 9.2, distance: 23.0, height: 3.6, target: [0.1, 2.3, -1.2] },
  // 7 LED wall: near-frontal at a calm medium distance, a slow push of about 1 m.
  { at: 0.664, azimuth: 8.4, distance: 16.4, height: 3.2, target: [1.6, 2.15, -2.6] },
  { at: 0.716, azimuth: 7.6, distance: 15.4, height: 3.05, target: [2.0, 2.1, -3.0] },
  // Mark and sign: back out, the look-at rises toward the tower and the sign ring.
  { at: 0.77, azimuth: 5.8, distance: 18.2, height: 3.0, target: [0.8, 3.2, -1.2] },
  // 8 Hosting: the front zone, easing back to the finale's distance.
  { at: 0.835, azimuth: 3.8, distance: 21.0, height: 2.97, target: [0.3, 3.0, -0.3] },
  { at: 0.9, azimuth: 2.0, distance: 23.4, height: 2.95, target: [0, 2.95, 0] },
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
