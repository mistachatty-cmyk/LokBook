// Gyroscope utility module for cross-platform device motion handling
// Handles iOS 13+ permission requests and Android auto-granted access

let deviceMotionListener = null;
let currentMotion = { gamma: 0, beta: 0, alpha: 0 };
let permissionRequested = false;

export async function requestGyroPermission() {
  if (permissionRequested) return false;
  permissionRequested = true;

  try {
    // iOS 13+ requires explicit permission
    if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) {
      const permission = await DeviceMotionEvent.requestPermission();
      return permission === "granted";
    }
    // Android and older browsers auto-grant
    return true;
  } catch (err) {
    console.warn("Gyroscope permission request failed:", err);
    return false;
  }
}

export function attachGyroListener(callback) {
  if (deviceMotionListener) {
    window.removeEventListener("devicemotion", deviceMotionListener);
  }

  deviceMotionListener = (e) => {
    if (e.gamma === null || e.beta === null) return;

    currentMotion = {
      gamma: e.gamma || 0,
      beta: e.beta || 0,
      alpha: e.alpha || 0,
    };

    if (callback) callback(currentMotion);
  };

  window.addEventListener("devicemotion", deviceMotionListener);
}

export function detachGyroListener() {
  if (deviceMotionListener) {
    window.removeEventListener("devicemotion", deviceMotionListener);
    deviceMotionListener = null;
  }
}

export function getDeviceMotion() {
  return { ...currentMotion };
}

export function resetGyroscope() {
  permissionRequested = false;
  currentMotion = { gamma: 0, beta: 0, alpha: 0 };
  detachGyroListener();
}
