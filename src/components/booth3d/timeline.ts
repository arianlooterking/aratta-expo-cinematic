// One timeline drives both the 3D build and the copy beside it, so the words
// always describe what the visitor is watching. Values are scroll progress 0..1.

export const CHAPTER_STARTS = [0, 0.13, 0.26, 0.39, 0.52, 0.65, 0.78] as const;
export const FINALE_AT = 0.91;

export const BOOTH_TIMELINE = {
  footprint: [0.03, 0.11],
  blueprint: [0.14, 0.21],
  blueprintOut: [0.36, 0.44],
  platform: [0.27, 0.32],
  deck: [0.31, 0.37],
  columns: [0.4, 0.45],
  beams: [0.44, 0.5],
  walls: [0.53, 0.58],
  glass: [0.58, 0.63],
  mark: [0.66, 0.71],
  sign: [0.7, 0.74],
  screen: [0.73, 0.77],
  furniture: [0.79, 0.91],
  lights: [0.82, 0.91],
} as const satisfies Record<string, readonly [number, number]>;

type Vec3 = [number, number, number];

export const CAMERA_KEYS: Array<{ at: number; position: Vec3; target: Vec3 }> = [
  { at: 0, position: [0, 7.5, 27], target: [0, 1.2, 0] },
  { at: 0.1, position: [3, 17, 17], target: [0, 0, 0] },
  { at: 0.2, position: [0.8, 22, 8], target: [0, 0, 0.3] },
  { at: 0.32, position: [-14, 7, 15], target: [0, 0.4, 0] },
  { at: 0.46, position: [-16, 5.6, 8.5], target: [0, 1.6, 0] },
  { at: 0.6, position: [13.5, 6, 14.5], target: [0, 1.6, -0.8] },
  { at: 0.7, position: [5, 3, 10], target: [-1.1, 1.9, -3.2] },
  { at: 0.78, position: [7.5, 3, 8.5], target: [-3.2, 1.6, 0.4] },
  { at: 0.88, position: [-5, 4.2, 16], target: [0, 1.2, 0] },
  { at: 1, position: [15.5, 8.5, 20.5], target: [0, 1, 0] },
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

/** Which chapter is on screen for a progress value (-1 = intro, 7 = finale). */
export function chapterAt(progress: number) {
  if (progress < 0.035) return -1;
  if (progress >= FINALE_AT) return CHAPTER_STARTS.length;
  let index = 0;
  for (let i = 0; i < CHAPTER_STARTS.length; i += 1) if (progress >= CHAPTER_STARTS[i]) index = i;
  return index;
}
