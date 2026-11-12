// Camera path. Wide shots alternate with close details; the path is a monotone
// cubic (PCHIP) per axis against scroll progress, so position and velocity are
// continuous everywhere and the path never overshoots a key into the set. Close
// keys hold a little longer. Desktop keeps the booth on the side away from the
// copy; portrait screens step back on wide shots (so the 7 m sign fits) but keep
// close shots close.
//
// The finale is a front elevation: from the last detail the camera eases out to
// the stand's centre line in front of the open long side, then makes a slow
// ease-out push-in to a symmetric front view at eye height. Its distance comes
// from the share of the screen width the stand should fill, and a lens shift
// (view offset) places it in the free band above the closing copy.

import * as THREE from "three";
import { CAMERA_KEYS, FINALE_AT, clamp01 } from "./timeline";

/** Stand extents used to frame the finale (m). */
const STAND = { halfWidth: 6.05, front: 4.5, top: 7.15, bottom: 0 };
/** The finale's blend in from the last detail, and its push-in. */
export const FINALE_BLEND: [number, number] = [0.846, 0.912];
const PUSH_FROM = 1.2;
const EYE = { start: 2.95, end: 2.45 };

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 0..1 with zero slope at both ends and its peak early: a gentle start, a long ease-out. */
const pushEase = (t: number) => {
  const u = clamp01(t);
  return 1 - (1 - u) ** 3 * (1 + 3 * u);
};

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

export type CameraPose = { pos: THREE.Vector3; tgt: THREE.Vector3; offX: number; offY: number };

export function createCameraRig(camera: THREE.PerspectiveCamera, fa: boolean) {
  // The detail path ends at the last close shot; the finale owns everything after it.
  const keys = CAMERA_KEYS.filter((k) => k.at < FINALE_AT);
  const times = keys.map((k) => k.at);
  const hold = keys.map((k) => (k.close ? 0.55 : 1));
  const posTrack = track(times, keys.map((k) => [...k.position]), hold);
  const tgtTrack = track(times, keys.map((k) => [...k.target]), hold);
  const closeFlags = keys.map((k) => (k.close ? 1 : 0));
  const centre = new THREE.Vector3(0, 2.6, 0);
  const pointerSmooth = new THREE.Vector2();
  const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const fPos = new THREE.Vector3();
  const fTgt = new THREE.Vector3();
  const probe = new THREE.PerspectiveCamera();
  const point = new THREE.Vector3();
  // Free band for the finale (fractions of the screen height), set by the hero from its layout.
  const safe = { top: 0.1, bottom: 0.62 };
  let cacheKey = "";
  const finale = { near: 0, far: 0, offNear: 0, offFar: 0, driftX: 0 };

  const fov = (aspect: number) => (aspect < 0.8 ? 52 : aspect < 1.2 ? 45 : 37);
  const closeness = (p: number) => {
    if (p <= times[0]) return closeFlags[0];
    const n = times.length;
    if (p >= times[n - 1]) return closeFlags[n - 1];
    let i = 0;
    while (i < n - 2 && p > times[i + 1]) i += 1;
    const a = closeFlags[i];
    const b = closeFlags[i + 1];
    return a + (b - a) * smoothstep(times[i], times[i + 1], p);
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
    // Phones: the stand fills ~88% of the width; tablets ~80%; desktop ~70%.
    const share = 0.88 - 0.18 * smoothstep(0.55, 1.5, aspect);
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
    // A small drift toward the reading side on the way in.
    finale.driftX = (fa ? -1 : 1) * Math.min(1.4, d * 0.05);
  };

  /** The camera pose at p without pointer or idle sway: the pure scroll path. */
  const at = (p: number, width: number, height: number, out: CameraPose) => {
    const aspect = width / height;
    sample(posTrack, p, out.pos);
    sample(tgtTrack, p, out.tgt);
    const close = closeness(p);
    // Portrait: step back for wide shots and aim closer to the stand's centre.
    let distance = 1;
    if (aspect < 1) distance = THREE.MathUtils.clamp(0.62 / aspect, 1, 1.45);
    else if (aspect < 1.3) distance = 1.15;
    distance += (1 + (distance - 1) * 0.3 - distance) * close;
    if (aspect < 1) out.tgt.lerp(centre, 0.45 * (1 - close));
    out.pos.sub(out.tgt).multiplyScalar(distance).add(out.tgt);
    out.pos.y = Math.max(0.6, out.pos.y);

    // Lens shift for the copy: phones keep a card at the bottom, desktop the reading-start side.
    const blend = smoothstep(FINALE_BLEND[0], FINALE_BLEND[1], p);
    if (aspect < 1) {
      out.offX = 0;
      out.offY = height * 0.13;
    } else {
      const middle = smoothstep(0.02, 0.1, p);
      out.offX = (fa ? 1 : -1) * width * (aspect < 1.3 ? 0 : 0.24) * middle;
      out.offY = 0;
    }

    if (blend > 0) {
      frameFinale(width, height);
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
    }
    return out;
  };

  return {
    at,
    fov,
    /** The free band above the closing copy, as fractions of the canvas height. */
    setSafeBand(top: number, bottom: number) {
      safe.top = clamp01(top);
      safe.bottom = Math.max(safe.top + 0.2, clamp01(bottom));
    },
    apply(p: number, time: number, dt: number, width: number, height: number, pointer: THREE.Vector2) {
      at(p, width, height, pose);
      pointerSmooth.lerp(pointer, 1 - Math.exp(-dt / 0.35));
      const close = closeness(p);
      // Idle sway and pointer parallax: lighter on details, nearly still on the closing elevation.
      const still = smoothstep(FINALE_BLEND[0], 1, p);
      const sway = (1 - close * 0.7) * (1 - still * 0.75);
      pose.pos.x += (pointerSmooth.x * 0.8 + Math.sin(time * 0.23) * 0.14) * sway;
      pose.pos.y += (pointerSmooth.y * 0.4 + Math.sin(time * 0.29) * 0.07) * sway;
      // Stay under the hall roof steel (lights at 18 m) and above the floor.
      pose.pos.y = THREE.MathUtils.clamp(pose.pos.y, 0.6, 17.2);
      camera.position.copy(pose.pos);
      camera.lookAt(pose.tgt);
      camera.setViewOffset(width, height, pose.offX, pose.offY, width, height);
      return { moving: pointerSmooth.distanceToSquared(pointer) > 1e-6 };
    },
  };
}
