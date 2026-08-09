import { useEffect, useState, useRef } from "react";
import { requestGyroPermission, attachGyroListener, detachGyroListener } from "../engine/gyroscope";

export function useGyroscope(enabled = true) {
  const [motion, setMotion] = useState({ gamma: 0, beta: 0, alpha: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      detachGyroListener();
      setMotion({ gamma: 0, beta: 0, alpha: 0 });
      return;
    }

    const initGyro = async () => {
      if (initRef.current) return;
      initRef.current = true;

      const granted = await requestGyroPermission();
      setPermissionGranted(granted);

      if (granted) {
        attachGyroListener((newMotion) => {
          setMotion(newMotion);
        });
      }
    };

    initGyro();

    return () => {
      detachGyroListener();
    };
  }, [enabled]);

  return {
    motion,
    permissionGranted,
    gamma: motion.gamma,
    beta: motion.beta,
    alpha: motion.alpha,
  };
}
