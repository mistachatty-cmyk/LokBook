import { useEffect, useState, useRef, useCallback } from "react";
import { requestGyroPermission, attachGyroListener, detachGyroListener } from "../engine/gyroscope";

export function useGyroscope(enabled = true) {
  const [motion, setMotion] = useState({ gamma: 0, beta: 0, alpha: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const attemptedRef = useRef(false);

  // Requests permission and, if granted, attaches the real devicemotion
  // listener. Exposed so callers can retry from a genuine user gesture —
  // iOS only honors DeviceMotionEvent.requestPermission() when it's called
  // synchronously inside a click/tap handler, not from this hook's own
  // effect (which fires after a state change, outside any gesture).
  const requestAndAttach = useCallback(async (force = false) => {
    if (attemptedRef.current && !force) return permissionGranted;
    attemptedRef.current = true;
    const granted = await requestGyroPermission(force);
    setPermissionGranted(granted);
    if (granted) {
      attachGyroListener((newMotion) => setMotion(newMotion));
    }
    return granted;
  }, [permissionGranted]);

  useEffect(() => {
    if (!enabled) {
      detachGyroListener();
      setMotion({ gamma: 0, beta: 0, alpha: 0 });
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
