// Camera path: one slow, continuous crane move on the open front side of the
// stand (see CAMERA_KEYS). Azimuth, distance and height around the plot centre
// and the look-at point are each a monotone cubic (PCHIP) against scroll
// progress, so position and velocity are continuous everywhere and the path
// never overshoots a key. Portrait screens step back and aim closer to the
// stand's centre, and ease out further during the last chapters so the
// hand-over to the (more distant) portrait finale stays gentle.
//
// Landscape screens sweep a wider, even arc (three-quarter view to front), keep
// the crane's height, and solve the distance
// every frame: the subject box (the plot, as tall as the build so far: low for
// the plan, the full stand once the truss is hoisted) fills the free band
// between the header and the chapter copy under it, centred on the screen.
//
// The finale is a front elevation: the camera arrives on the stand's centre
// line in front of the open long side and makes a slow ease-out push-in to a
// symmetric front view at eye height. Its distance comes from the share of the
// screen width the stand should fill, and a lens shift (view offset) places it
// in the free band above the closing copy. There is no idle sway; only a small
// pointer parallax on fine pointers.

import * as THREE from "three";
import { CAMERA_KEYS, FINALE_AT, clamp01 } from "./timeline";

/** Stand extents used to frame the finale (m). */
const STAND = { halfWidth: 6.05, front: 4.5, top: 7.15, bottom: 0 };
/** The finale's blend in from the last detail, and its push-in. */
export const FINALE_BLEND: [number, number] = [0.846, 0.912];
const PUSH_FROM = 1.05;
/** Portrait screens: the share of the width the stand fills from chapter 2 on. */
const PORTRAIT_FILL = 0.89;
/** Portrait screens: height above eye level, relative to the crane's. */
const PORTRAIT_HEIGHT = 1.25;
const EYE = { start: 2.95, end: 2.45 };
/** Portrait plan view: the climb (start, top) and the way down (start, end), in progress. */
const PORTRAIT_PLAN: [number, number, number, number] = [0.03, 0.125, 0.195, 0.31];
/** Portrait plan view: how much higher the camera climbs (m) and the height it aims at. */
const PORTRAIT_LIFT = 5.6;
const PORTRAIT_PLAN_AIM = 1.0;
/** Portrait: horizontal distances (m) beyond `knee` ease toward `reach` and never pass it. */
const PORTRAIT_REACH: [number, number] = [35, 39];
/** Landscape chapters: the focus box fills this share of the width or of the free band's height. */
const LAND_FILL_W = 0.64;
const LAND_FILL_H = 0.9;
/** Where the box sits in the band's spare height (0 = top, 1 = bottom): centred, a touch low. */
const LAND_PLACE = 0.6;
/** Subject height during the plan (m): the plot with its tape, plan and the truss on its trestles. */
const PLAN_HEIGHT = 1.2;
/** The subject grows to the full stand while the truss is assembled and hoisted. */
const RISE: [number, number] = [0.13, 0.215];
/** Landscape: the camera never climbs above this (m); the hall's roof steel hangs at about 18 m. */
export const LAND_CEILING = 16.4;
/** Landscape: the camera keeps at least this much air (m) between itself and the focus box. */
const LAND_AIR = 3;

/** An axis-aligned box: x0, x1, y0, y1, z0, z1 (m). */
type Box = [number, number, number, number, number, number];
/** The whole stand, as the finale and the between-move views frame it. */
const WHOLE: Box = [-STAND.halfWidth, STAND.halfWidth, 0, STAND.top, -STAND.front, STAND.front];
/** The plot as it is drawn: tape, plan, stand number and ramp strip, the truss on its trestles. */
const PLAN: Box = [-6.15, 6.15, 0, PLAN_HEIGHT, -4.7, 5.3];
/** The raised floor going in (panels, edge trim, ramp). */
const FLOOR: Box = [-6.05, 6.05, 0, 3.2, -4.5, 5.2];
/** The two-storey block: deck, stair, tower frames, then its walls and glass room. */
const BLOCK: Box = [-6.05, 2.1, 0, 5.2, -4.5, 3.0];
const BLOCK_WALLS: Box = [-6.05, 2.1, 0, 4.4, -4.5, 3.0];
/** The LED wall and the tower beside it. */
const LED_BOX: Box = [-1.2, 6.05, 0.2, 4.6, -4.5, 1.2];
/** The identity: the mark on the tower and the sign ring over the stand. */
const ID_BOX: Box = [-2.2, 6.05, 0.4, 7.2, -4.5, 3.2];

/**
 * Landscape shots: the camera looks at the middle of `box` from azimuth `az` (deg from the
 * front axis toward +x) and elevation `el` (deg above the horizontal), and its distance is
 * solved so the box fills the free band (`fill` scales that). `fov` is the vertical field of
 * view. `solve` blends from the opening's fixed distance (0) to the solved one (1). Every
 * value is a monotone cubic between shots, so repeated shots hold still and the path never
 * overshoots. Two guided moves in (floor and block; LED wall and identity), the whole stand
 * between them and at the hand-over to the finale.
 */
type Shot = { at: number; az: number; el: number; box: Box; fov?: number; solve?: number; fill?: number };
/** The opening's distance from its look-at (0, 3, 0), m. */
const OPEN_DIST = 32.75;
export const LAND_SHOTS: Shot[] = [
  // Opening: about (9, 8.4, 31) looking at (0, 3, 0), shared with the hall.
  { at: 0, az: 16.2, el: 9.5, box: [-6.05, 6.05, -0.575, 6.575, -4.5, 4.5], solve: 0 },
  // 1-2 Plan: rise over the front of the plot and look nearly straight down, the plan upright,
  // while the truss is assembled on its trestles.
  { at: 0.15, az: 1.2, el: 55, box: PLAN, fov: 48.5 },
  { at: 0.152, az: 1.2, el: 55, box: PLAN, fov: 48.5 },
  { at: 0.195, az: 0.6, el: 60, box: PLAN, fov: 50 },
  // 2-3 Move 1: down and round to a three-quarter view, in over the raised floor as it goes
  // in, then along to the two-storey block as it goes up, its walls and glass.
  { at: 0.33, az: 21, el: 21, box: FLOOR },
  { at: 0.34, az: 21, el: 21, box: FLOOR },
  { at: 0.415, az: 17.5, el: 18.5, box: BLOCK },
  { at: 0.515, az: 15, el: 16, box: BLOCK_WALLS },
  // 6 Power and light: the whole stand lighting up.
  { at: 0.595, az: 12.5, el: 14, box: WHOLE },
  { at: 0.64, az: 11, el: 12.5, box: WHOLE },
  // Move 2: the LED wall boots, then the mark and the sign ring.
  { at: 0.712, az: 8.8, el: 9.3, box: LED_BOX, fill: 0.82 },
  { at: 0.772, az: 6.6, el: 8.5, box: ID_BOX, fill: 0.92 },
  // 8 Hosting: the whole stand again, easing toward the front for the finale.
  { at: 0.825, az: 4.6, el: 7, box: WHOLE },
  { at: FINALE_AT, az: 2, el: 3, box: WHOLE },
];
/**
 * Landscape glides, between shots that rest: an even cruise with soft ends, so the long rise
 * over the plan and the way back down keep a steady, bounded speed. The rise runs a straight
 * line (position, look-at, lens and lens shift together) above the front aisle; the way down
 * follows the shots (so the stand stays framed) re-timed by distance travelled.
 */
export const LAND_GLIDES: Array<[number, number, "line" | "path"]> = [
  [0, 0.15, "line"],
  [0.195, 0.33, "path"],
];
/** Share of a glide spent speeding up (and again slowing down). */
const GLIDE_RAMP = 0.16;
/** How a degree of turn weighs against a metre of travel when a glide is re-timed. */
const GLIDE_TURN = 0.08;
/** 0..1 with a smoothstep-shaped speed ramp at both ends and an even cruise between them. */
export const glideEase = (u: number) => {
  const a = GLIDE_RAMP;
  const x = clamp01(u);
  const ramp = (t: number) => a * (t * t * t - (t * t * t * t) / 2);
  const total = 1 - a;
  if (x < a) return ramp(x / a) / total;
  if (x > 1 - a) return (total - ramp((1 - x) / a)) / total;
  return (a / 2 + (x - a)) / total;
};
// The lens is kept as degrees wider than the screen's resting lens (37 on landscape screens).
const SHOT_AXES = (s: Shot) => [s.az, s.el, ...s.box, (s.fov ?? 37) - 37, s.solve ?? 1, s.fill ?? 1];

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 0..1 with zero slope at both ends and its peak early: a gentle start, a long ease-out. */
const pushEase = (t: number) => {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3 * (1 + 3 * u);
};

/** Height of the subject box the portrait chapters frame (m): low for the plan, then the whole stand. */
export const subjectHeight = (p: number) => PLAN_HEIGHT + (STAND.top - PLAN_HEIGHT) * smoothstep(RISE[0], RISE[1], p);
/**
 * The fastest the camera may move in real time, on the path and while it glides after a
 * catch-up: metres per second for the camera and its look-at point, degrees per second of
 * view turn on the path.
 */
export const CAMERA_SPEED = { metres: 6, lookAt: 3.5, degrees: 18 };
/** Catch-up glide: the time constant of the approach, and how smoothly its speed changes (s). */
const CHASE = { close: 0.55, velocityLag: 0.35 };

/**
 * Playback of the build against the scroll (progress per second). Slow motion: never faster
 * than `speed` (a chapter takes at least ~2.2 s), and slower still where the camera path is
 * steep (the scene passes that limit in), so the camera keeps to CAMERA_SPEED. When the
 * visitor gets more than `catchOn` ahead (a long fast scroll), the build catches up at a pace
 * * that rises with the gap up to `speedFar` (reached at `farGap`), and never lags more than `maxLag` behind, so the
 * stand is finished before the hero scrolls away; the camera then glides to the pose for the
 * progress shown (rig.apply's catch-up) instead of replaying every move. The speed itself is
 * smoothed (`tau`, `tauFast`), and the gap closes over 4x that (critically damped).
 */
export const PLAYBACK = { speed: 0.05, speedFar: 1.2, farGap: 0.2, maxLag: 0.12, catchOn: 0.12, catchOff: 0.015, tau: 0.22, tauFast: 0.06 };
export type Playback = { current: number; velocity: number; catchUp: boolean };

/** One frame of playback toward `target`; `pathLimit()` is the path's own speed limit at `current`. */
export function playbackStep(s: Playback, target: number, dt: number, pathLimit: () => number) {
  const P = PLAYBACK;
  const gap = target - s.current;
  const far = Math.abs(gap);
  if (far > P.catchOn) s.catchUp = true;
  else if (far < P.catchOff) s.catchUp = false;
  let limit = P.speed;
  if (s.catchUp) {
    const ramp = clamp01((far - P.catchOff) / (P.farGap - P.catchOff));
    limit = P.speed + (P.speedFar - P.speed) * ramp * ramp * (3 - 2 * ramp);
  } else if (far > 0.00002) limit = Math.min(P.speed, pathLimit());
  const tau = s.catchUp ? P.tauFast : P.tau;
  const wanted = Math.max(-limit, Math.min(limit, gap / (4 * tau)));
  s.velocity += (wanted - s.velocity) * (1 - Math.exp(-dt / tau));
  s.current += s.velocity * dt;
  // Never more than maxLag behind the scroll.
  if (gap > P.maxLag) s.current = Math.max(s.current, target - P.maxLag);
  else if (gap < -P.maxLag) s.current = Math.min(s.current, target + P.maxLag);
  // Never pass the target; settle exactly on it once the remaining motion is invisible.
  if ((gap > 0 && s.current > target) || (gap < 0 && s.current < target) || (far < 0.00002 && Math.abs(s.velocity) < 0.0005)) {
    s.current = target;
    s.velocity = 0;
  }
  return s;
}
/** A smooth minimum of two positive values (no kink where the limits cross). */
const softMin = (a: number, b: number) => (a ** -12 + b ** -12) ** (-1 / 12);

/** Monotone cubic Hermite (Fritsch-Carlson) tangents for one axis. */
function pchipTangents(t: number[], y: number[], hold: number[]) {
  const n = t.length;
  const d = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i += 1) d[i] = (y[i + 1] - y[i]) / (t[i + 1] - t[i]);
  const m = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    if (d[i - 1] * d[i] <= 0) continue;
    const h0 = t[i] - t[i - 1];
    const h1 = t[i + 1] - t[i];
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    m[i] = ((w1 + w2) / (w1 / d[i - 1] + w2 / d[i])) * hold[i];
  }
  // Ends rest: the pinned section starts and the path hands over to the finale from rest.
  return m;
}

type Track = { t: number[]; y: number[][]; m: number[][] };

function track(times: number[], values: number[][], hold: number[]): Track {
  const axes = values[0].length;
  const y: number[][] = [];
  const m: number[][] = [];
  for (let a = 0; a < axes; a += 1) {
    const ya = values.map((v) => v[a]);
    y.push(ya);
    m.push(pchipTangents(times, ya, hold));
  }
  return { t: times, y, m };
}

function sample(tr: Track, p: number, out: THREE.Vector3) {
  const { t } = tr;
  const n = t.length;
  if (p <= t[0]) return out.set(tr.y[0][0], tr.y[1][0], tr.y[2][0]);
  if (p >= t[n - 1]) return out.set(tr.y[0][n - 1], tr.y[1][n - 1], tr.y[2][n - 1]);
  let i = 0;
  while (i < n - 2 && p > t[i + 1]) i += 1;
  const h = t[i + 1] - t[i];
  const s = (p - t[i]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  const v = (a: number) => h00 * tr.y[a][i] + h10 * h * tr.m[a][i] + h01 * tr.y[a][i + 1] + h11 * h * tr.m[a][i + 1];
  return out.set(v(0), v(1), v(2));
}

/** Every axis of a track at p (same Hermite form as `sample`). */
function sampleAll(tr: Track, p: number, out: number[]) {
  const { t } = tr;
  const n = t.length;
  const axes = tr.y.length;
  if (p <= t[0] || p >= t[n - 1]) {
    const k = p <= t[0] ? 0 : n - 1;
    for (let a = 0; a < axes; a += 1) out[a] = tr.y[a][k];
    return out;
  }
  let i = 0;
  while (i < n - 2 && p > t[i + 1]) i += 1;
  const h = t[i + 1] - t[i];
  const s = (p - t[i]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;
  for (let a = 0; a < axes; a += 1) out[a] = h00 * tr.y[a][i] + h10 * h * tr.m[a][i] + h01 * tr.y[a][i + 1] + h11 * h * tr.m[a][i + 1];
  return out;
}

/** Vertical field of view for a screen aspect (the path's resting lens). */
export const fovFor = (aspect: number) => (aspect < 0.8 ? 52 : aspect < 1.2 ? 45 : 37);

export type CameraPose = { pos: THREE.Vector3; tgt: THREE.Vector3; offX: number; offY: number; fov?: number };
/** Projected bounds of the subject box, as fractions of the screen (0 = left / top). */
export type SubjectBounds = { left: number; right: number; top: number; bottom: number };

/** Projects an axis-aligned box through a camera; fractions of the screen. */
export function projectBox(cam: THREE.PerspectiveCamera, b: ArrayLike<number>, out: SubjectBounds) {
  const corner = projectSubject.corner;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i += 1) {
    corner.set(i & 1 ? b[1] : b[0], i & 2 ? b[3] : b[2], i & 4 ? b[5] : b[4]).project(cam);
    x0 = Math.min(x0, corner.x);
    x1 = Math.max(x1, corner.x);
    y0 = Math.min(y0, corner.y);
    y1 = Math.max(y1, corner.y);
  }
  out.left = (x0 + 1) / 2;
  out.right = (x1 + 1) / 2;
  out.top = (1 - y1) / 2;
  out.bottom = (1 - y0) / 2;
  return out;
}

/** Projects the subject box (plot footprint, `height` tall) through a camera; fractions of the screen. */
export function projectSubject(cam: THREE.PerspectiveCamera, height: number, out: SubjectBounds) {
  const corner = projectSubject.corner;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i += 1) {
    corner.set(i & 1 ? STAND.halfWidth : -STAND.halfWidth, i & 2 ? height : 0, i & 4 ? STAND.front : -STAND.front).project(cam);
    x0 = Math.min(x0, corner.x);
    x1 = Math.max(x1, corner.x);
    y0 = Math.min(y0, corner.y);
    y1 = Math.max(y1, corner.y);
  }
  out.left = (x0 + 1) / 2;
  out.right = (x1 + 1) / 2;
  out.top = (1 - y1) / 2;
  out.bottom = (1 - y0) / 2;
  return out;
}
projectSubject.corner = new THREE.Vector3();

export function createCameraRig(camera: THREE.PerspectiveCamera) {
  // The crane path ends at the finale's hand-over key; the finale owns everything after it.
  const keys = CAMERA_KEYS.filter((k) => k.at <= FINALE_AT);
  const times = keys.map((k) => k.at);
  const hold = keys.map(() => 1);
  const cylTrack = track(times, keys.map((k) => [k.azimuth, k.distance, k.height]), hold);
  const tgtTrack = track(times, keys.map((k) => [...k.target]), hold);
  const shotTrack = track(LAND_SHOTS.map((s) => s.at), LAND_SHOTS.map(SHOT_AXES), LAND_SHOTS.map(() => 1));
  const shot = new Array<number>(SHOT_AXES(LAND_SHOTS[0]).length).fill(0);
  const focus: number[] = [...WHOLE];
  const pointerSmooth = new THREE.Vector2();
  const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const cyl = new THREE.Vector3();
  const fPos = new THREE.Vector3();
  const fTgt = new THREE.Vector3();
  const probe = new THREE.PerspectiveCamera();
  const point = new THREE.Vector3();
  // Free band for the finale (fractions of the screen height), set by the hero from its layout.
  const safe = { top: 0.1, bottom: 0.62 };
  // Free band between the header and the phone's copy card during the chapters.
  const free = { top: 0.1, bottom: 0.64, set: false };
  // Landscape: free band between the header and the chapter copy under the stand.
  const chapterBand = { top: 0.1, bottom: 0.74 };
  const lPos = new THREE.Vector3();
  const lTgt = new THREE.Vector3();
  const box: SubjectBounds = { left: 0, right: 1, top: 0, bottom: 1 };
  const aimPortrait = new THREE.Vector3(0, 3.1, 0.3);
  const dir = new THREE.Vector3();
  const corner = new THREE.Vector3();
  let cacheKey = "";
  const finale = { near: 0, far: 0, offNear: 0, offFar: 0, driftX: 0 };

  const fov = fovFor;
  /** Portrait and tablet screens stand further off than the desktop path. */
  const baseStepBack = (aspect: number) => (aspect < 1 ? THREE.MathUtils.clamp(0.62 / aspect, 1, 1.45) : aspect < 1.3 ? 1.15 : 1);

  /** The crane pose at p on the desktop path (no screen adjustments). */
  const crane = (p: number, pos: THREE.Vector3, tgt: THREE.Vector3) => {
    sample(cylTrack, p, cyl);
    const az = THREE.MathUtils.degToRad(cyl.x);
    pos.set(Math.sin(az) * cyl.y, cyl.z, Math.cos(az) * cyl.y);
    sample(tgtTrack, p, tgt);
  };

  /** Screen fractions (0 = top) of the stand's top and floor edge from an unshifted camera at z. */
  const span = (aspect: number, z: number, eye: number) => {
    probe.fov = fov(aspect);
    probe.aspect = aspect;
    probe.near = 0.1;
    probe.far = 300;
    probe.clearViewOffset();
    probe.updateProjectionMatrix();
    probe.position.set(0, eye, z);
    probe.lookAt(0, eye, 0);
    probe.updateMatrixWorld(true);
    point.set(0, STAND.top, 0.3).project(probe);
    const top = (1 - point.y) / 2;
    point.set(0, STAND.bottom, STAND.front).project(probe);
    const bottom = (1 - point.y) / 2;
    return { top, bottom };
  };

  /** Finale distances and lens shifts for this screen, cached until the size or the band changes. */
  const frameFinale = (width: number, height: number) => {
    const key = `${width}x${height}:${safe.top.toFixed(3)}:${safe.bottom.toFixed(3)}`;
    if (key === cacheKey) return;
    cacheKey = key;
    const aspect = width / height;
    const tv = Math.tan(THREE.MathUtils.degToRad(fov(aspect) / 2));
    const th = tv * aspect;
    // Phones: the stand front fills ~93% of the width (the whole box ~89%); desktop ~70%.
    const share = 0.935 - 0.235 * smoothstep(0.55, 1.5, aspect);
    let d = STAND.halfWidth / (share * th);
    // Keep the whole elevation inside the free band (with a little air).
    const band = (safe.bottom - safe.top) * 0.97;
    for (let k = 0; k < 4; k += 1) {
      const s = span(aspect, STAND.front + d, EYE.end);
      const h = s.bottom - s.top;
      if (h <= band) break;
      d *= h / band;
    }
    finale.near = STAND.front + d;
    finale.far = STAND.front + d * PUSH_FROM;
    // Where the elevation's centre should sit: low in the band, so the stand stands just
    // above the closing copy instead of floating over an empty floor.
    const place = (s: { top: number; bottom: number }) => {
      const h = s.bottom - s.top;
      const free = Math.max(0, safe.bottom - safe.top - h);
      return safe.top + free * 0.72 + h / 2;
    };
    const near = span(aspect, finale.near, EYE.end);
    const far = span(aspect, finale.far, EYE.start);
    finale.offNear = ((near.top + near.bottom) / 2 - place(near)) * height;
    finale.offFar = ((far.top + far.bottom) / 2 - place(far)) * height;
    // The camera arrives a little to the side it came from (+x) and settles on the centre line,
    // so the swing round the stand keeps one direction in both languages.
    finale.driftX = Math.min(1, d * 0.04);
  };

  /** Points the probe from pos at tgt (no lens shift) and projects a box (the stand `h` tall, or `b`). */
  const look = (aspect: number, pos: THREE.Vector3, tgt: THREE.Vector3, h: number, b?: ArrayLike<number>, lens = fov(aspect)) => {
    probe.fov = lens;
    probe.aspect = aspect;
    probe.near = 0.1;
    probe.far = 300;
    probe.clearViewOffset();
    probe.updateProjectionMatrix();
    probe.position.copy(pos);
    probe.lookAt(tgt);
    probe.updateMatrixWorld(true);
    return b ? projectBox(probe, b, box) : projectSubject(probe, h, box);
  };

  /** The camera pose at p without pointer parallax: the pure scroll path. */
  /** Share of the screen width the stand's box (12 x 9 x 7.15 m) covers from this pose. */
  const fillOf = (aspect: number, pos: THREE.Vector3, tgt: THREE.Vector3) => {
    probe.fov = fov(aspect);
    probe.aspect = aspect;
    probe.near = 0.1;
    probe.far = 300;
    probe.clearViewOffset();
    probe.updateProjectionMatrix();
    probe.position.copy(pos);
    probe.lookAt(tgt);
    probe.updateMatrixWorld(true);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 8; i += 1) {
      corner.set(i & 1 ? STAND.halfWidth : -STAND.halfWidth, i & 2 ? STAND.top : 0, i & 4 ? STAND.front : -STAND.front).project(probe);
      lo = Math.min(lo, corner.x);
      hi = Math.max(hi, corner.x);
    }
    return (hi - lo) / 2;
  };

  /**
   * Landscape shot at p (LAND_SHOTS): the camera looks at the focus box's middle from the
   * shot's direction, at the distance that makes the box fill the free band above the chapter
   * copy (or 64% of the width, whichever comes first); the lens shift centres the box there.
   */
  const shotAt = (p: number, width: number, height: number, out: CameraPose, b: number[]) => {
    const aspect = width / height;
    sampleAll(shotTrack, p, shot);
    const az = THREE.MathUtils.degToRad(shot[0]);
    const el = THREE.MathUtils.degToRad(shot[1]);
    for (let i = 0; i < 6; i += 1) b[i] = shot[2 + i];
    const lens = fov(aspect) + shot[8];
    const k = clamp01(shot[9]);
    const fill = shot[10];
    lTgt.set((b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2);
    dir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    // How far the box reaches toward the camera from its middle.
    const near = (Math.abs(dir.x) * (b[1] - b[0]) + Math.abs(dir.y) * (b[3] - b[2]) + Math.abs(dir.z) * (b[5] - b[4])) / 2;
    const bandH = chapterBand.bottom - chapterBand.top;
    let d = near + 20;
    for (let i = 0; i < 16; i += 1) {
      lPos.copy(lTgt).addScaledVector(dir, d);
      look(aspect, lPos, lTgt, 0, b, lens);
      const grow = fill * softMin(LAND_FILL_W / (box.right - box.left), (LAND_FILL_H * bandH) / (box.bottom - box.top));
      // Projected size goes roughly as 1 / (distance to the box's near half), so solve on that.
      d = near * 0.5 + Math.max(LAND_AIR + near * 0.5, (d - near * 0.5) / grow);
    }
    // The opening (title over the hall) is the crane's frame at a fixed distance.
    let r = OPEN_DIST * (d / OPEN_DIST) ** k;
    // Under the roof steel: the ceiling only ever shortens the distance (smoothly).
    if (dir.y > 1e-3) r = softMin(r, (LAND_CEILING - lTgt.y) / dir.y);
    out.tgt.copy(lTgt);
    out.pos.copy(lTgt).addScaledVector(dir, r);
    out.fov = lens;
    look(aspect, out.pos, out.tgt, 0, b, lens);
    const hf = box.bottom - box.top;
    const spare = Math.max(0, chapterBand.bottom - chapterBand.top - hf);
    const place = chapterBand.top + spare * LAND_PLACE + hf / 2;
    out.offX = ((box.left + box.right) / 2 - 0.5) * width;
    out.offY = ((box.top + box.bottom) / 2 - place) * height * k;
    return out;
  };
  const gPose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const gBox: number[] = [...WHOLE];
  const ARC_SAMPLES = 96;
  const arcCache = new Map<string, number[]>();
  const gEnd: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const gEndBox: number[] = [...WHOLE];
  /** A glide's raw pose at q (0..1): a straight line between its end shots, or the shots themselves. */
  const glideAt = (glide: (typeof LAND_GLIDES)[number], q: number, width: number, height: number, out: CameraPose, b: number[]) => {
    const [a, z, kind] = glide;
    if (kind === "path") return shotAt(a + (z - a) * q, width, height, out, b);
    shotAt(a, width, height, out, b);
    shotAt(z, width, height, gEnd, gEndBox);
    out.pos.lerp(gEnd.pos, q);
    out.tgt.lerp(gEnd.tgt, q);
    out.offX += (gEnd.offX - out.offX) * q;
    out.offY += (gEnd.offY - out.offY) * q;
    out.fov = (out.fov ?? 0) + ((gEnd.fov ?? 0) - (out.fov ?? 0)) * q;
    for (let i = 0; i < 6; i += 1) b[i] += (gEndBox[i] - b[i]) * q;
    return out;
  };

  const at = (p: number, width: number, height: number, out: CameraPose) => {
    const aspect = width / height;
    frameFinale(width, height);
    let lens = fov(aspect);
    crane(p, out.pos, out.tgt);
    if (aspect < 1) {
      // Portrait (phones, tablets upright): after the plot chapter the stand's full width fills
      // about 89% of the screen. The look-at settles on the stand's middle, the camera keeps the
      // crane's direction (so azimuth and the slow descent are kept) and its distance is solved
      // for that fill, so it barely changes from chapter to chapter.
      const height0 = out.pos.y;
      out.tgt.lerp(aimPortrait, 0.45 + 0.5 * smoothstep(0.03, 0.13, p));
      // While the plan is drawn the camera climbs and looks down on the plot (the stand's width
      // still fills the screen), then comes back down as the rig rises.
      const plan = smoothstep(PORTRAIT_PLAN[0], PORTRAIT_PLAN[1], p) * (1 - smoothstep(PORTRAIT_PLAN[2], PORTRAIT_PLAN[3], p));
      out.tgt.y += (PORTRAIT_PLAN_AIM - out.tgt.y) * plan;
      // Height follows the crane's (so it only comes down), a little higher above eye level.
      const y = EYE.start + Math.max(0, height0 - EYE.start) * PORTRAIT_HEIGHT + PORTRAIT_LIFT * plan;
      dir.set(out.pos.x - out.tgt.x, 0, out.pos.z - out.tgt.z);
      const wide = dir.length() * baseStepBack(aspect);
      dir.normalize();
      const th = Math.tan(THREE.MathUtils.degToRad(fov(aspect) / 2)) * aspect;
      let d = (STAND.halfWidth * 2) / (2 * PORTRAIT_FILL * th) + STAND.front;
      for (let i = 0; i < 6; i += 1) {
        out.pos.copy(out.tgt).addScaledVector(dir, d);
        out.pos.y = y;
        d *= fillOf(aspect, out.pos, out.tgt) / PORTRAIT_FILL;
      }
      d += (wide - d) * (1 - smoothstep(0.04, 0.13, p));
      // Inside the front sector the hall keeps clear (40 m): a soft cap, so nothing kinks.
      const [knee, reach] = PORTRAIT_REACH;
      if (d > knee) d = knee + (reach - knee) * Math.tanh((d - knee) / (reach - knee));
      out.pos.copy(out.tgt).addScaledVector(dir, d);
      out.pos.y = y;
      out.fov = lens;
      // The optical centre sits in the middle of the free band above the copy card (a touch
      // low, since the stand box reads top-heavy with its rig).
      out.offX = 0;
      out.offY = height * (free.set ? 0.5 - (free.top + free.bottom) / 2 - 0.03 : 0.13);
    } else {
      // Landscape: the shot at p, except on the two long glides (up over the plan and back
      // down), which are re-timed so their travel (metres moved plus degrees turned) runs at an
      // even pace with soft ends.
      const glide = LAND_GLIDES.find(([a, b]) => p > a && p < b);
      if (glide) {
        const key = `${glide[0]}:${width}x${height}:${chapterBand.top.toFixed(4)}:${chapterBand.bottom.toFixed(4)}`;
        let table = arcCache.get(key);
        if (!table) {
          table = [0];
          glideAt(glide, 0, width, height, gPose, gBox);
          const last = { pos: gPose.pos.clone(), view: gPose.tgt.clone().sub(gPose.pos).normalize() };
          const view = new THREE.Vector3();
          for (let i = 1; i <= ARC_SAMPLES; i += 1) {
            glideAt(glide, i / ARC_SAMPLES, width, height, gPose, gBox);
            view.copy(gPose.tgt).sub(gPose.pos).normalize();
            table.push(table[i - 1] + gPose.pos.distanceTo(last.pos) + THREE.MathUtils.radToDeg(view.angleTo(last.view)) * GLIDE_TURN);
            last.pos.copy(gPose.pos);
            last.view.copy(view);
          }
          if (arcCache.size > 16) arcCache.clear();
          arcCache.set(key, table);
        }
        const s = glideEase((p - glide[0]) / (glide[1] - glide[0])) * table[ARC_SAMPLES];
        let i = 0;
        while (i < ARC_SAMPLES - 1 && table[i + 1] < s) i += 1;
        const f = clamp01((s - table[i]) / Math.max(1e-9, table[i + 1] - table[i]));
        glideAt(glide, (i + f) / ARC_SAMPLES, width, height, out, focus);
      } else shotAt(p, width, height, out, focus);
      lens = out.fov ?? lens;
    }

    const blend = smoothstep(FINALE_BLEND[0], FINALE_BLEND[1], p);

    if (blend > 0) {
      const t = pushEase((p - FINALE_BLEND[1]) / (1 - FINALE_BLEND[1]));
      const z = finale.far + (finale.near - finale.far) * t;
      const eye = EYE.start + (EYE.end - EYE.start) * t;
      fPos.set(finale.driftX * (1 - t), eye, z);
      fTgt.set(finale.driftX * 0.35 * (1 - t), eye, 0);
      const off = finale.offFar + (finale.offNear - finale.offFar) * t;
      out.pos.lerp(fPos, blend);
      out.tgt.lerp(fTgt, blend);
      out.offX += (0 - out.offX) * blend;
      out.offY += (off - out.offY) * blend;
      out.fov = lens + (fov(aspect) - lens) * blend;
      if (aspect >= 1) {
        // Landscape: keep the box centred across the width while the camera settles on the
        // centre line (a small correction that fades out as the front elevation becomes symmetric).
        look(aspect, out.pos, out.tgt, STAND.top, undefined, out.fov);
        out.offX = ((box.left + box.right) / 2 - 0.5) * width;
      }
    }
    return out;
  };

  const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  // Catch-up glide state (see apply), and scratch poses.
  const chase = { locked: true, started: false, vPos: new THREE.Vector3(), vTgt: new THREE.Vector3() };
  const want: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const rateA: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const rateB: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const viewA = new THREE.Vector3();
  const viewB = new THREE.Vector3();
  const chaseWant = new THREE.Vector3();
  const shown = new THREE.Vector3();

  return {
    at,
    fov,
    /** The free band above the closing copy, as fractions of the canvas height. */
    setSafeBand(top: number, bottom: number) {
      safe.top = clamp01(top);
      safe.bottom = Math.max(safe.top + 0.2, clamp01(bottom));
    },
    /** The free band between the header and the phone's copy card during the chapters. */
    setFreeBand(top: number, bottom: number) {
      free.top = clamp01(top);
      free.bottom = Math.max(free.top + 0.2, clamp01(bottom));
      free.set = true;
    },
    /** Landscape: the free band between the header and the chapter copy under the stand. */
    setChapterBand(top: number, bottom: number) {
      chapterBand.top = clamp01(top);
      chapterBand.bottom = Math.max(chapterBand.top + 0.3, clamp01(bottom));
    },
    /**
     * Where the subject box lands on screen at p (scroll path, no pointer parallax): its
     * bounds as fractions of the screen, its width share, and its height as a share of the
     * free band (the chapter band; the closing band once the finale has taken over).
     */
    subjectBounds(p: number, width: number, height: number, which: "subject" | "focus" | "whole" = "subject") {
      const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
      at(p, width, height, pose);
      const cam = new THREE.PerspectiveCamera(pose.fov ?? fov(width / height), width / height, 0.1, 300);
      cam.position.copy(pose.pos);
      cam.lookAt(pose.tgt);
      cam.setViewOffset(width, height, pose.offX, pose.offY, width, height);
      cam.updateMatrixWorld(true);
      const out = { left: 0, right: 0, top: 0, bottom: 0 };
      // Landscape chapters frame a focus box (the part being built); portrait frames the subject.
      const landscape = width >= height && p < FINALE_BLEND[0];
      const b = which === "whole" ? projectBox(cam, WHOLE, out) : which === "focus" && landscape ? projectBox(cam, focus, out) : projectSubject(cam, subjectHeight(p), out);
      const band = p >= FINALE_BLEND[1] ? safe : p > FINALE_BLEND[0] ? { top: Math.min(safe.top, chapterBand.top), bottom: Math.max(safe.bottom, chapterBand.bottom) } : chapterBand;
      const r = (v: number) => Math.round(v * 10000) / 10000;
      return {
        p,
        left: r(b.left),
        right: r(b.right),
        top: r(b.top),
        bottom: r(b.bottom),
        centreX: r((b.left + b.right) / 2),
        fillWidth: r(b.right - b.left),
        fillBand: r((b.bottom - b.top) / (band.bottom - band.top)),
        bandTop: r(band.top),
        bandBottom: r(band.bottom),
        inBand: b.top >= band.top - 1e-4 && b.bottom <= band.bottom + 1e-4,
        distance: r(Math.hypot(pose.pos.x, pose.pos.z)),
      };
    },
    /**
     * How fast the scroll path moves at p: metres per unit of progress, and degrees of view
     * turn per unit of progress. The scene caps its playback speed with this, so the camera
     * never moves faster than CAMERA_SPEED in real time.
     */
    pathRate(p: number, width: number, height: number) {
      const q = Math.min(1, p + 0.002);
      const a = Math.max(0, q - 0.004);
      at(a, width, height, rateA);
      at(q, width, height, rateB);
      const span = Math.max(1e-6, q - a);
      viewA.copy(rateA.tgt).sub(rateA.pos).normalize();
      viewB.copy(rateB.tgt).sub(rateB.pos).normalize();
      return { metres: rateA.pos.distanceTo(rateB.pos) / span, degrees: THREE.MathUtils.radToDeg(viewA.angleTo(viewB)) / span };
    },
    /** The next frame shows the path exactly (after a jump, a resize or coming back into view). */
    snap() {
      chase.locked = true;
      chase.started = false;
    },
    /** Whether the camera is still gliding to the path after a catch-up. */
    get gliding() {
      return !chase.locked;
    },
    /**
     * Moves the real camera. `catchUp` is set while the build runs ahead of the visitor's scroll
     * at catch-up speed: the camera then leaves the path and glides straight toward the pose for
     * the progress shown, at a bounded speed with eased starts and stops, and settles back onto
     * the path once it has caught up.
     */
    apply(p: number, dt: number, width: number, height: number, pointer: THREE.Vector2, catchUp = false) {
      at(p, width, height, want);
      if (!chase.started || (chase.locked && !catchUp)) {
        // On the path: follow it exactly, and remember how fast it moves for a smooth hand-over.
        if (chase.started && dt > 0) {
          chase.vPos.copy(want.pos).sub(pose.pos).divideScalar(dt);
          chase.vTgt.copy(want.tgt).sub(pose.tgt).divideScalar(dt);
        } else {
          chase.vPos.set(0, 0, 0);
          chase.vTgt.set(0, 0, 0);
        }
        pose.pos.copy(want.pos);
        pose.tgt.copy(want.tgt);
        pose.offX = want.offX;
        pose.offY = want.offY;
        pose.fov = want.fov;
        chase.started = true;
      } else {
        chase.locked = false;
        const k = 1 - Math.exp(-dt / CHASE.velocityLag);
        const glide = (from: THREE.Vector3, to: THREE.Vector3, vel: THREE.Vector3, vmax: number) => {
          chaseWant.copy(to).sub(from).divideScalar(CHASE.close);
          if (chaseWant.length() > vmax) chaseWant.setLength(vmax);
          vel.lerp(chaseWant, k);
          from.addScaledVector(vel, dt);
        };
        glide(pose.pos, want.pos, chase.vPos, CAMERA_SPEED.metres);
        glide(pose.tgt, want.tgt, chase.vTgt, CAMERA_SPEED.lookAt);
        const e = 1 - Math.exp(-dt / CHASE.close);
        pose.offX += (want.offX - pose.offX) * e;
        pose.offY += (want.offY - pose.offY) * e;
        pose.fov = (pose.fov ?? want.fov ?? 37) + ((want.fov ?? 37) - (pose.fov ?? want.fov ?? 37)) * e;
        // Back on the path once the remaining gap is too small to see.
        if (!catchUp && pose.pos.distanceTo(want.pos) < 0.02 && pose.tgt.distanceTo(want.tgt) < 0.02 && Math.abs((pose.fov ?? 0) - (want.fov ?? 0)) < 0.05) chase.locked = true;
      }
      shown.copy(pose.pos);
      // Pointer parallax on fine pointers only, at most a quarter of a metre; none on touch.
      if (fine) {
        pointerSmooth.lerp(pointer, 1 - Math.exp(-dt / 0.45));
        const still = 1 - 0.5 * smoothstep(FINALE_BLEND[0], 1, p);
        shown.x += pointerSmooth.x * 0.2 * still;
        shown.y += pointerSmooth.y * 0.12 * still;
      }
      // Stay under the hall roof steel (lights at 18 m) and above the floor.
      shown.y = THREE.MathUtils.clamp(shown.y, 0.6, 17.2);
      camera.fov = pose.fov ?? fov(width / height);
      camera.position.copy(shown);
      camera.lookAt(pose.tgt);
      camera.setViewOffset(width, height, pose.offX, pose.offY, width, height);
    },
  };
}

/** The windows pathStats reports: the eight chapters and the finale. */
const STAT_WINDOWS: Array<[string, number, number]> = [
  ["1 plan", 0, 0.11],
  ["2 rigging", 0.11, 0.22],
  ["3 floor", 0.22, 0.33],
  ["4 structure", 0.33, 0.44],
  ["5 walls", 0.44, 0.55],
  ["6 power", 0.55, 0.66],
  ["7 brand", 0.66, 0.77],
  ["8 hosting", 0.77, FINALE_AT],
  ["finale", FINALE_AT, 1],
];

/**
 * Measures the scroll path: per chapter and for the finale, camera travel (m),
 * view rotation (deg, summed), azimuth and height at both ends, and the range of
 * horizontal distance to the plot centre; plus the worst 0.11 window anywhere,
 * how much azimuth and height ever reverse, and where the lens shift changes.
 * Plain assignments throughout (the production minifier breaks destructuring
 * assignments onto object fields).
 */
export function pathStats(at: (p: number, width: number, height: number, out: CameraPose) => CameraPose, width: number, height: number, step = 0.0005) {
  const n = Math.round(1 / step);
  const pos: THREE.Vector3[] = [];
  const dir: THREE.Vector3[] = [];
  const off: number[] = [];
  // How much of the screen the stand's box covers: width share, and its vertical middle (0 = top).
  const fill: number[] = [];
  const middle: number[] = [];
  const cam = new THREE.PerspectiveCamera(fovFor(width / height), width / height, 0.1, 300);
  const corner = new THREE.Vector3();
  const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  for (let i = 0; i <= n; i += 1) {
    at(i / n, width, height, pose);
    pos.push(pose.pos.clone());
    dir.push(pose.tgt.clone().sub(pose.pos).normalize());
    off.push(pose.offX / width + pose.offY / height);
    cam.fov = pose.fov ?? fovFor(width / height);
    cam.position.copy(pose.pos);
    cam.lookAt(pose.tgt);
    cam.setViewOffset(width, height, pose.offX, pose.offY, width, height);
    cam.updateMatrixWorld(true);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let c = 0; c < 8; c += 1) {
      corner.set(c & 1 ? 6 : -6, c & 2 ? 7.15 : 0, c & 4 ? 4.5 : -4.5).project(cam);
      x0 = Math.min(x0, corner.x);
      x1 = Math.max(x1, corner.x);
      y0 = Math.min(y0, corner.y);
      y1 = Math.max(y1, corner.y);
    }
    fill.push((x1 - x0) / 2);
    middle.push(1 - (y0 + y1 + 2) / 4);
  }
  const deg = THREE.MathUtils.radToDeg;
  const azimuth = (v: THREE.Vector3) => deg(Math.atan2(v.x, v.z));
  const dist = (v: THREE.Vector3) => Math.hypot(v.x, v.z);
  const move: number[] = [0];
  const turn: number[] = [0];
  for (let i = 1; i <= n; i += 1) {
    move.push(pos[i].distanceTo(pos[i - 1]));
    turn.push(deg(dir[i].angleTo(dir[i - 1])));
  }
  const r = (v: number, k = 100) => Math.round(v * k) / k;
  const sum = (list: number[], a: number, b: number) => {
    let total = 0;
    for (let i = a + 1; i <= b; i += 1) total += list[i];
    return total;
  };
  const chapters = STAT_WINDOWS.map(([name, p0, p1]) => {
    const a = Math.round(p0 * n);
    const b = Math.round(p1 * n);
    let near = Infinity;
    let far = 0;
    let pitch = -90;
    let fillLo = Infinity;
    let fillHi = 0;
    let mid = 0;
    for (let i = a; i <= b; i += 1) {
      fillLo = Math.min(fillLo, fill[i]);
      fillHi = Math.max(fillHi, fill[i]);
      mid += middle[i] / (b - a + 1);
      near = Math.min(near, dist(pos[i]));
      far = Math.max(far, dist(pos[i]));
      pitch = Math.max(pitch, -deg(Math.asin(dir[i].y)));
    }
    return {
      name,
      travel: r(sum(move, a, b)),
      rotation: r(sum(turn, a, b)),
      azFrom: r(azimuth(pos[a])),
      azTo: r(azimuth(pos[b])),
      yFrom: r(pos[a].y),
      yTo: r(pos[b].y),
      distMin: r(near),
      distMax: r(far),
      lensShift: r(Math.abs(off[b] - off[a]), 1000),
      lookDownMax: r(pitch),
      fillMin: r(fillLo),
      fillMax: r(fillHi),
      middle: r(mid),
    };
  });
  // Worst 0.11 window anywhere on the path.
  const w = Math.round(0.11 * n);
  let worstTravel = 0;
  let worstTravelAt = 0;
  let worstTurn = 0;
  let worstTurnAt = 0;
  for (let a = 0; a + w <= n; a += 1) {
    const t = sum(move, a, a + w);
    const q = sum(turn, a, a + w);
    if (t > worstTravel) {
      worstTravel = t;
      worstTravelAt = a / n;
    }
    if (q > worstTurn) {
      worstTurn = q;
      worstTurnAt = a / n;
    }
  }
  // Monotone checks: the biggest reversal of azimuth (deg) and rise of height (m).
  let azPeak = azimuth(pos[0]);
  let azBack = 0;
  let yLow = pos[0].y;
  let yRise = 0;
  let offOutside = 0;
  for (let i = 1; i <= n; i += 1) {
    const a = azimuth(pos[i]);
    azPeak = Math.min(azPeak, a);
    azBack = Math.max(azBack, a - azPeak);
    yLow = Math.min(yLow, pos[i].y);
    yRise = Math.max(yRise, pos[i].y - yLow);
    const p = i / n;
    if (p > 0.1 + 1e-9 && p < FINALE_BLEND[0] - 1e-9) offOutside = Math.max(offOutside, Math.abs(off[i] - off[i - 1]));
  }
  return {
    screen: `${width}x${height}`,
    chapters,
    worstWindow: { travel: r(worstTravel), travelAt: r(worstTravelAt, 1000), rotation: r(worstTurn), rotationAt: r(worstTurnAt, 1000) },
    azimuthMonotone: azBack <= 3,
    azimuthMaxReversal: r(azBack),
    heightMonotone: yRise <= 0.01,
    heightMaxRise: r(yRise, 1000),
    lensShiftOutsideIntroAndFinale: r(offOutside, 10000),
    totalTravel: r(sum(move, 0, n)),
  };
}
