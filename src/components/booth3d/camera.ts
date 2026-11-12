// Camera path: one slow, continuous crane move on the open front side of the
// stand (see CAMERA_KEYS). Azimuth, distance and height around the plot centre
// and the look-at point are each a monotone cubic (PCHIP) against scroll
// progress, so position and velocity are continuous everywhere and the path
// never overshoots a key. Desktop keeps the booth on the side away from the
// copy with a constant lens shift; portrait screens step back and aim closer
// to the stand's centre, and ease out further during the last chapters so the
// hand-over to the (more distant) portrait finale stays gentle.
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
  // The crane path ends at the finale's hand-over key; the finale owns everything after it.
  const keys = CAMERA_KEYS.filter((k) => k.at <= FINALE_AT);
  const times = keys.map((k) => k.at);
  const hold = keys.map(() => 1);
  const cylTrack = track(times, keys.map((k) => [k.azimuth, k.distance, k.height]), hold);
  const tgtTrack = track(times, keys.map((k) => [...k.target]), hold);
  const centre = new THREE.Vector3(0, 2.6, 0);
  const pointerSmooth = new THREE.Vector2();
  const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  const cyl = new THREE.Vector3();
  const fPos = new THREE.Vector3();
  const fTgt = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  const endTgt = new THREE.Vector3();
  const probe = new THREE.PerspectiveCamera();
  const point = new THREE.Vector3();
  // Free band for the finale (fractions of the screen height), set by the hero from its layout.
  const safe = { top: 0.1, bottom: 0.62 };
  let cacheKey = "";
  const finale = { near: 0, far: 0, offNear: 0, offFar: 0, driftX: 0, extra: 0, extraEnd: 0 };

  const fov = (aspect: number) => (aspect < 0.8 ? 52 : aspect < 1.2 ? 45 : 37);
  /** Portrait and tablet screens stand further off than the desktop path. */
  const baseStepBack = (aspect: number) => (aspect < 1 ? THREE.MathUtils.clamp(0.62 / aspect, 1, 1.45) : aspect < 1.3 ? 1.15 : 1);
  /** Portrait screens also look down a little more, so the plan still reads from above. */
  const heightStepBack = (aspect: number) => baseStepBack(aspect) * (aspect < 1 ? 1.2 : 1);
  /** Portrait screens aim a little closer to the stand's centre. */
  const aimCentre = (aspect: number) => (aspect < 1 ? 0.45 : 0);

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
    // The camera arrives a little to the side it came from (+x) and settles on the centre line,
    // so the swing round the stand keeps one direction in both languages.
    finale.driftX = Math.min(1, d * 0.04);
    // How far this screen's path must ease back by the hand-over so that it meets the
    // finale's distance instead of pulling back fast inside the blend.
    crane(FINALE_AT, endPos, endTgt);
    endTgt.lerp(centre, aimCentre(aspect));
    finale.extraEnd = Math.max(0, finale.far - endTgt.z - Math.hypot(endPos.x - endTgt.x, endPos.z - endTgt.z));
    crane(0, endPos, endTgt);
    endTgt.lerp(centre, aimCentre(aspect));
    finale.extra = (baseStepBack(aspect) - 1) * Math.hypot(endPos.x - endTgt.x, endPos.z - endTgt.z);
  };

  /** The camera pose at p without pointer parallax: the pure scroll path. */
  const at = (p: number, width: number, height: number, out: CameraPose) => {
    const aspect = width / height;
    frameFinale(width, height);
    crane(p, out.pos, out.tgt);
    // Portrait and tablet screens aim closer to the centre and stand further off: a constant
    // extra distance (not a factor, so the slow pace of the move is kept), which eases in the
    // last chapters toward what this screen's finale needs. Height scales about eye level,
    // so it keeps coming down.
    out.tgt.lerp(centre, aimCentre(aspect));
    const dx = out.pos.x - out.tgt.x;
    const dz = out.pos.z - out.tgt.z;
    const r = Math.max(1e-3, Math.hypot(dx, dz));
    const extra = finale.extra + (finale.extraEnd - finale.extra) * smoothstep(0.45, FINALE_AT, p);
    const k = (r + extra) / r;
    out.pos.x = out.tgt.x + dx * k;
    out.pos.z = out.tgt.z + dz * k;
    out.pos.y = EYE.start + Math.max(0, out.pos.y - EYE.start) * heightStepBack(aspect);

    // Lens shift for the copy: phones keep a card at the bottom, desktop the reading-start side.
    // It changes only in the intro and in the finale blend.
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

  const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  return {
    at,
    fov,
    /** The free band above the closing copy, as fractions of the canvas height. */
    setSafeBand(top: number, bottom: number) {
      safe.top = clamp01(top);
      safe.bottom = Math.max(safe.top + 0.2, clamp01(bottom));
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
  const pose: CameraPose = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), offX: 0, offY: 0 };
  for (let i = 0; i <= n; i += 1) {
    at(i / n, width, height, pose);
    pos.push(pose.pos.clone());
    dir.push(pose.tgt.clone().sub(pose.pos).normalize());
    off.push(pose.offX / width + pose.offY / height);
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
    for (let i = a; i <= b; i += 1) {
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
