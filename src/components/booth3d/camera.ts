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
/** Landscape chapters: the subject box fills this share of the width or of the free band's height. */
const LAND_FILL_W = 0.64;
const LAND_FILL_H = 0.9;
/** Where the box sits in the band's spare height (0 = top, 1 = bottom): centred, a touch low. */
const LAND_PLACE = 0.6;
/** Landscape: the opening frame eases into the chapter framing over this progress. */
const LAND_OPEN: [number, number] = [0, 0.12];
/** Landscape arc (deg): three-quarter view at the opening and plan, nearly front-on at the hand-over. */
const LAND_ARC: [number, number] = [40, 2];
/** Subject height during the plan (m): the plot with its tape, plan and the truss on its trestles. */
const PLAN_HEIGHT = 1.2;
/** The subject grows to the full stand while the truss is assembled and hoisted. */
const RISE: [number, number] = [0.13, 0.215];

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 0..1 with zero slope at both ends and its peak early: a gentle start, a long ease-out. */
const pushEase = (t: number) => {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3 * (1 + 3 * u);
};

/** Height of the subject box the landscape chapters frame (m): low for the plan, then the whole stand. */
export const subjectHeight = (p: number) => PLAN_HEIGHT + (STAND.top - PLAN_HEIGHT) * smoothstep(RISE[0], RISE[1], p);
/** Landscape azimuth (deg from the front axis toward +x): an even sweep that hands over near the front. */
export const landAzimuth = (p: number) => LAND_ARC[1] + (LAND_ARC[0] - LAND_ARC[1]) * (1 - clamp01(p / FINALE_AT));
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

/** Vertical field of view for a screen aspect (constant along the path). */
export const fovFor = (aspect: number) => (aspect < 0.8 ? 52 : aspect < 1.2 ? 45 : 37);

export type CameraPose = { pos: THREE.Vector3; tgt: THREE.Vector3; offX: number; offY: number };
/** Projected bounds of the subject box, as fractions of the screen (0 = left / top). */
export type SubjectBounds = { left: number; right: number; top: number; bottom: number };

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

  /** Points the probe from pos at tgt (no lens shift) and projects the subject box. */
  const look = (aspect: number, pos: THREE.Vector3, tgt: THREE.Vector3, h: number) => {
    probe.fov = fov(aspect);
    probe.aspect = aspect;
    probe.near = 0.1;
    probe.far = 300;
    probe.clearViewOffset();
    probe.updateProjectionMatrix();
    probe.position.copy(pos);
    probe.lookAt(tgt);
    probe.updateMatrixWorld(true);
    return projectSubject(probe, h, box);
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

  const at = (p: number, width: number, height: number, out: CameraPose) => {
    const aspect = width / height;
    frameFinale(width, height);
    crane(p, out.pos, out.tgt);
    if (aspect < 1) {
      // Portrait (phones, tablets upright): after the plot chapter the stand's full width fills
      // about 89% of the screen. The look-at settles on the stand's middle, the camera keeps the
      // crane's direction (so azimuth and the slow descent are kept) and its distance is solved
      // for that fill, so it barely changes from chapter to chapter.
      const height0 = out.pos.y;
      out.tgt.lerp(aimPortrait, 0.45 + 0.5 * smoothstep(0.03, 0.13, p));
      // Height follows the crane's (so it only comes down), a little higher above eye level.
      const y = EYE.start + Math.max(0, height0 - EYE.start) * PORTRAIT_HEIGHT;
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
      out.pos.copy(out.tgt).addScaledVector(dir, d);
      out.pos.y = y;
    } else {
      // Landscape: the crane gives the direction (azimuth) and the height, both only ever
      // decreasing; the distance is solved so the subject box fills the free band above the
      // chapter copy (or 64% of the width, whichever comes first), and the box is centred.
      const h = subjectHeight(p);
      const y = out.pos.y;
      const r0 = Math.max(1e-3, Math.hypot(out.pos.x, out.pos.z));
      // A wider, even arc than the crane's: from a three-quarter view off the front corner to the
      // straight front, about 4.6 degrees per chapter, always in one direction.
      const az = THREE.MathUtils.degToRad(landAzimuth(p));
      dir.set(Math.sin(az), 0, Math.cos(az));
      // Look at the box's middle; near the hand-over, at the finale's eye height.
      lTgt.set(0, h / 2 + (EYE.start - h / 2) * smoothstep(0.7, FINALE_AT, p), 0);
      const bandH = chapterBand.bottom - chapterBand.top;
      let d = r0 * 0.6;
      for (let i = 0; i < 10; i += 1) {
        lPos.copy(dir).multiplyScalar(d);
        lPos.y = y;
        look(aspect, lPos, lTgt, h);
        const grow = softMin(LAND_FILL_W / (box.right - box.left), (LAND_FILL_H * bandH) / (box.bottom - box.top));
        // Projected size goes roughly as 1 / (distance to the box's front), so solve on that.
        d = STAND.front + Math.max(0.5, d - STAND.front) / grow;
      }
      // The opening (title over the hall) keeps the crane's frame and eases into this one.
      // Distance eases geometrically, so the push-in reads at an even pace.
      const k = smoothstep(LAND_OPEN[0], LAND_OPEN[1], p);
      const r = r0 * (d / r0) ** k;
      out.pos.set(dir.x * r, y, dir.z * r);
      out.tgt.lerp(lTgt, k);
    }

    // Lens shift: phones keep the stand in the free band above the copy card; landscape screens
    // centre the subject box across the width and place it in the band above the chapter copy.
    const blend = smoothstep(FINALE_BLEND[0], FINALE_BLEND[1], p);
    if (aspect < 1) {
      // The optical centre sits in the middle of the free band above the copy card (a touch
      // low, since the stand box reads top-heavy with its rig).
      out.offX = 0;
      out.offY = height * (free.set ? 0.5 - (free.top + free.bottom) / 2 - 0.03 : 0.13);
    } else {
      look(aspect, out.pos, out.tgt, subjectHeight(p));
      const hf = box.bottom - box.top;
      const spare = Math.max(0, chapterBand.bottom - chapterBand.top - hf);
      const place = chapterBand.top + spare * LAND_PLACE + hf / 2;
      out.offX = ((box.left + box.right) / 2 - 0.5) * width;
      out.offY = ((box.top + box.bottom) / 2 - place) * height * smoothstep(LAND_OPEN[0], LAND_OPEN[1], p);
    }

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
      if (aspect >= 1) {
        // Landscape: keep the box centred across the width while the camera settles on the
        // centre line (a small correction that fades out as the front elevation becomes symmetric).
        look(aspect, out.pos, out.tgt, subjectHeight(p));
        out.offX = ((box.left + box.right) / 2 - 0.5) * width;
      }
    }
    return out;
  };

  const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

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
    subjectBounds(p: number, width: number, height: number) {
      const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
      at(p, width, height, pose);
      const cam = new THREE.PerspectiveCamera(fov(width / height), width / height, 0.1, 300);
      cam.position.copy(pose.pos);
      cam.lookAt(pose.tgt);
      cam.setViewOffset(width, height, pose.offX, pose.offY, width, height);
      cam.updateMatrixWorld(true);
      const b = projectSubject(cam, subjectHeight(p), { left: 0, right: 0, top: 0, bottom: 0 });
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
    apply(p: number, dt: number, width: number, height: number, pointer: THREE.Vector2) {
      at(p, width, height, pose);
      // Pointer parallax on fine pointers only, at most a quarter of a metre; none on touch.
      if (fine) {
        pointerSmooth.lerp(pointer, 1 - Math.exp(-dt / 0.45));
        const still = 1 - 0.5 * smoothstep(FINALE_BLEND[0], 1, p);
        pose.pos.x += pointerSmooth.x * 0.2 * still;
        pose.pos.y += pointerSmooth.y * 0.12 * still;
      }
      // Stay under the hall roof steel (lights at 18 m) and above the floor.
      pose.pos.y = THREE.MathUtils.clamp(pose.pos.y, 0.6, 17.2);
      camera.position.copy(pose.pos);
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
