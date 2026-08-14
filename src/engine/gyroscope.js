// Gyroscope utility module for cross-platform device tilt handling.
// Handles iOS 13+ permission requests and Android auto-granted access.
//
// This listens for `deviceorientation`, NOT `devicemotion`. That distinction
// is the whole ballgame: alpha/beta/gamma (absolute tilt angles, which is what
// every tilt effect in this app wants) live on DeviceOrientationEvent. A
// DeviceMotionEvent only carries acceleration/rotationRate/interval, so
// reading e.gamma off one yields `undefined` forever — which is exactly what
// this module used to do, leaving every tilt effect permanently at zero while
// still firing ~60 listener callbacks a second.

import { prefersReducedMotion } from "./framerate.js";

let orientationListener = null;
let currentMotion = { gamma: 0, beta: 0, alpha: 0 };
let permissionRequested = false;
let permissionResult = false;

// Sensor noise means a phone lying flat on a table still emits a constant
// stream of micro-deltas. Below this many degrees we treat the device as
// still and don't notify, so a resting device costs zero React renders.
const DEADBAND_DEG = 0.5;

export async function requestGyroPermission(force = false) {
  // Return what we actually learned last time rather than a blanket `false`,
  // which would mislabel an already-granted sensor as denied.
  if (permissionRequested && !force) return permissionResult;
  permissionRequested = true;

  try {
    // iOS 13+ gates orientation behind its own prompt, separate from the
    // DeviceMotionEvent one — and it only resolves to "granted" when called
    // from inside a real user gesture.
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      const permission = await DeviceOrientationEvent.requestPermission();
      permissionResult = permission === "granted";
      return permissionResult;
    }
    // Android and older browsers auto-grant
    permissionResult = true;
    return true;
  } catch (err) {
    console.warn("Gyroscope permission request failed:", err);
    permissionResult = false;
    return false;
  }
}

export function attachGyroListener(callback) {
  detachGyroListener();

  // Someone who asked the OS for less movement did not ask to have the page
  // tilt under their hands — tilt parallax is precisely the vestibular motion
  // that setting exists to suppress.
  if (prefersReducedMotion()) return;

  let raf = 0;
  let pending = null;

  const flush = () => {
    raf = 0;
    if (!pending) return;
    const next = pending;
    pending = null;
    // Only surface a change once the device has actually moved past the
    // deadband, so noise while resting never reaches React.
    if (Math.abs(next.gamma - currentMotion.gamma) < DEADBAND_DEG
      && Math.abs(next.beta - currentMotion.beta) < DEADBAND_DEG
      && Math.abs(next.alpha - currentMotion.alpha) < DEADBAND_DEG) return;
    currentMotion = next;
    if (callback) callback(currentMotion);
  };

  orientationListener = (e) => {
    // `== null` deliberately, to catch both null and undefined.
    if (e.gamma == null || e.beta == null) return;
    pending = { gamma: e.gamma || 0, beta: e.beta || 0, alpha: e.alpha || 0 };
    // Coalesce to at most one update per frame — the sensor fires far faster
    // than React can usefully re-render (same rationale as the resize
    // coalescing in engine/viewport.js).
    if (!raf) raf = requestAnimationFrame(flush);
  };

  window.addEventListener("deviceorientation", orientationListener);
  orientationListener._cancel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; pending = null; };
}

export function detachGyroListener() {
  if (orientationListener) {
    window.removeEventListener("deviceorientation", orientationListener);
    if (orientationListener._cancel) orientationListener._cancel();
    orientationListener = null;
  }
}

export function getDeviceMotion() {
  return { ...currentMotion };
}

export function resetGyroscope() {
  permissionRequested = false;
  permissionResult = false;
  currentMotion = { gamma: 0, beta: 0, alpha: 0 };
  detachGyroListener();
}
