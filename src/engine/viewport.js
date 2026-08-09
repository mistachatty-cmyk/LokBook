// Viewport tiering — the single source of truth for "how much room do we have".
//
// Before this file, the app rendered a fixed 480px column on every device, so a
// phone and a 32-inch monitor got byte-identical layout. Components that wanted
// to know the screen size each read window.innerWidth themselves, which meant no
// shared breakpoints and a resize listener per caller.
//
// Everything that adapts to screen size — the shell grid, the ad router, the
// rail surfaces — reads its tier from here and nowhere else.

import { useState, useEffect } from "react";

// Breakpoints. TABLET is where a single side rail starts to fit next to the
// 480px app column; DESKTOP is where two rails fit with breathing room.
//   480 (app) + 2*(180 rail + 24 gutter) = 888, so 1024 is comfortable.
export const BP_TABLET = 640;
export const BP_DESKTOP = 1024;

// Rail geometry, shared by the shell grid and the rail components so they can
// never disagree about how wide a rail is.
export const RAIL_W = 180;
export const APP_MAX_W = 480;

export function tierFor(w) {
  if (w < BP_TABLET) return "phone";
  if (w < BP_DESKTOP) return "tablet";
  return "desktop";
}

function read() {
  // SSR/Tauri-safe: window may not exist at module-eval time. Default to the
  // historical phone layout so a no-window render matches what shipped before.
  if (typeof window === "undefined") {
    return { w: 390, h: 844, tier: "phone", orientation: "portrait", touch: true };
  }
  const w = window.innerWidth, h = window.innerHeight;
  return {
    w, h,
    tier: tierFor(w),
    orientation: w > h ? "landscape" : "portrait",
    touch: typeof navigator !== "undefined" && navigator.maxTouchPoints > 0,
  };
}

export function useViewport() {
  const [vp, setVp] = useState(read);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      // Coalesce to one update per frame — resize fires far faster than React
      // can usefully re-render, and this hook sits above the whole tree.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(prev => {
        const next = read();
        // Only re-render when something the layout actually branches on moved.
        // Pixel-level width changes during a drag would otherwise thrash the tree.
        if (next.tier === prev.tier && next.orientation === prev.orientation
            && next.w === prev.w && next.h === prev.h) return prev;
        return next;
      }));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return vp;
}
