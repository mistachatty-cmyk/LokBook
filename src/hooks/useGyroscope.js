import { useEffect, useState, useRef, useCallback } from "react";
import { requestGyroPermission, attachGyroListener, detachGyroListener } from "../engine/gyroscope";

// One frozen zero object shared by every "gyro is off" path. Returning a
// fresh literal instead would give consumers a new prop identity on every
// render and re-fire their [gyroMotion] effects even with gyro disabled.
export const GYRO_ZERO = Object.freeze({ gamma: 0, beta: 0, alpha: 0 });

export function useGyroscope(enabled = true) {
  const [motion, setMotion] = useState(GYRO_ZERO);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const attemptedRef = useRef(false);

  // Requests permission and, if granted, attaches the real deviceorientation
  // listener. Exposed so callers can retry from a genuine user gesture —
  // iOS only honors DeviceOrientationEvent.requestPermission() when it's
  // called synchronously inside a click/tap handler, not from this hook's own
  // effect (which fires after a state change, outside any gesture).
  const requestAndAttach = useCallback(async (force = false) => {
    if (attemptedRef.current && !force) return permissionGranted;
    attemptedRef.current = true;
    const granted = await requestGyroPermission(force);
    setPermissionGranted(granted);
    if (granted) {
      // The engine already deadbands and rAF-coalesces, so anything arriving
      // here is a real move; still compare so an identical value can't force
      // a re-render of the whole app tree.
      attachGyroListener((newMotion) => setMotion(prev => (
        prev.gamma === newMotion.gamma && prev.beta === newMotion.beta && prev.alpha === newMotion.alpha
          ? prev
          : newMotion
      )));
    }
    return granted;
  }, [permissionGranted]);

  useEffect(() => {
    if (!enabled) {
      detachGyroListener();
      setMotion(GYRO_ZERO);
      return;
    }
    // Try automatically — this succeeds immediately on Android/desktop
    // (auto-granted), and is a harmless no-op on iOS (denied outside a
    // gesture); requestAndAttach(true) from a real click recovers that case.
    requestAndAttach(false);
    return () => {
      detachGyroListener();
    };
  }, [enabled]);

  return {
    motion,
    permissionGranted,
    requestAndAttach,
    gamma: motion.gamma,
    beta: motion.beta,
    alpha: motion.alpha,
  };
}
