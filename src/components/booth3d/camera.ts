// Camera path: wide shots alternate with close details, eased between keys.
// Desktop keeps the booth on the side away from the copy; portrait screens
// step back on wide shots (so the 7 m sign fits) but keep close shots close.
// The finale is a slow orbit of the finished stand, driven by scroll.

import * as THREE from "three";
import { CAMERA_KEYS, FINALE_AT, clamp01, easeInOutCubic, window01 } from "./timeline";

export function createCameraRig(camera: THREE.PerspectiveCamera, fa: boolean) {
  const keys = CAMERA_KEYS;
  const positions = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.position)), false, "centripetal", 0.5);
  const targets = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.target)), false, "centripetal", 0.5);
  const times = keys.map((k) => k.at);
  const segments = keys.length - 1;
  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const centre = new THREE.Vector3(0, 2.6, 0);
  const pointerSmooth = new THREE.Vector2();
  const finaleStart = new THREE.Vector3(...keys[keys.length - 2].position);
  const finaleEnd = new THREE.Vector3(...keys[keys.length - 1].position);
  const finaleTarget = new THREE.Vector3(...keys[keys.length - 1].target);
  const a0 = Math.atan2(finaleStart.x, finaleStart.z);
  const a1 = Math.atan2(finaleEnd.x, finaleEnd.z);
  const r0 = Math.hypot(finaleStart.x, finaleStart.z);
  const r1 = Math.hypot(finaleEnd.x, finaleEnd.z);

  const locate = (p: number) => {
    let i = 0;
    while (i < segments - 1 && p > times[i + 1]) i += 1;
    const local = clamp01((p - times[i]) / (times[i + 1] - times[i]));
    return { i, local };
  };

  return {
    apply(p: number, time: number, width: number, height: number, pointer: THREE.Vector2) {
      const aspect = width / height;
      const { i, local } = locate(p);
      const eased = easeInOutCubic(local) * 0.75 + local * 0.25;
      const u = (i + eased) / segments;
      if (p >= FINALE_AT) {
        const t = easeInOutCubic(window01(p, FINALE_AT, 1));
        const a = a0 + (a1 - a0) * t + Math.sin(time * 0.08) * 0.04;
        const r = r0 + (r1 - r0) * t;
        pos.set(Math.sin(a) * r, finaleStart.y + (finaleEnd.y - finaleStart.y) * t, Math.cos(a) * r);
        tgt.copy(finaleTarget);
      } else {
        positions.getPoint(Math.min(1, u), pos);
        targets.getPoint(Math.min(1, u), tgt);
      }
      const ca = keys[i].close ? 1 : 0;
      const cb = keys[i + 1].close ? 1 : 0;
      const close = ca + (cb - ca) * eased;
      // Portrait: step back for wide shots and aim closer to the stand's centre.
      let distance = 1;
      if (aspect < 1) distance = THREE.MathUtils.clamp(0.62 / aspect, 1, 1.45);
      else if (aspect < 1.3) distance = 1.15;
      distance = distance + (1 + (distance - 1) * 0.3 - distance) * close;
      // The finale fills about 90% of a phone's width: step further back there. On wide
      // screens a small step back keeps the stand's front edge clear of the closing copy.
      // Blended across the hand-over so the camera never jumps.
      const closing = easeInOutCubic(window01(p, FINALE_AT - 0.03, FINALE_AT + 0.012));
      const closingDistance = aspect < 1 ? THREE.MathUtils.clamp(0.8 / aspect, 1.35, 1.9) : distance * 1.05;
      distance += (closingDistance - distance) * closing;
      if (aspect < 1) tgt.lerp(centre, 0.45 * (1 - close));
      pos.sub(tgt).multiplyScalar(distance).add(tgt);
      pointerSmooth.lerp(pointer, 0.06);
      const sway = 1 - close * 0.7;
      pos.x += (pointerSmooth.x * 0.8 + Math.sin(time * 0.23) * 0.14) * sway;
      pos.y += (pointerSmooth.y * 0.4 + Math.sin(time * 0.29) * 0.07) * sway;
      // Stay under the hall roof steel (lights at 18 m) and above the floor.
      pos.y = THREE.MathUtils.clamp(pos.y, 0.6, 17.2);
      camera.position.copy(pos);
      camera.lookAt(tgt);
      // Leave room for the copy: phones keep a card at the bottom, desktop the reading-start side.
      const middle = window01(p, 0.035, 0.07) * (1 - window01(p, FINALE_AT - 0.012, FINALE_AT + 0.02));
      const finale = window01(p, FINALE_AT - 0.01, FINALE_AT + 0.04);
      if (aspect < 1) {
        camera.setViewOffset(width, height, 0, height * (0.13 + finale * 0.05), width, height);
      } else {
        // The subject sits in the half opposite the copy (fa copy right, en copy left).
        const side = (fa ? 1 : -1) * width * (aspect < 1.3 ? 0 : 0.24) * middle;
        camera.setViewOffset(width, height, side, height * 0.162 * finale, width, height);
      }
      return { moving: pointerSmooth.distanceToSquared(pointer) > 1e-6 };
    },
    fov(aspect: number) {
      return aspect < 0.8 ? 52 : aspect < 1.2 ? 45 : 37;
    },
  };
}
