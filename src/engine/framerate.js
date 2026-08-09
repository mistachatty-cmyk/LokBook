// Shared frame pacing.
//
// The expensive continuous loops in the app (the music visualiser, the loader
// logo) previously ran on a bare requestAnimationFrame, which means they ran at
// whatever the display offers — 120Hz on a modern phone or tablet. That is twice
// the work for an effect most people cannot distinguish, and it shows up as
// battery drain and as thermal throttling that makes *everything* slower.
//
// So the default is now an explicit 60fps cap, and the 120fps setting removes
// it. That makes the toggle real in both directions: off is a genuine saving,
// on is a genuine uncap.
//
// Reduced motion always wins. Someone who asked the OS for less movement did
// not ask for smoother movement.

let highRefresh = false;

export function setHighRefresh(on) { highRefresh = !!on; }
export function isHighRefresh() { return highRefresh; }

function reduceMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Minimum ms between frames. 0 means "every frame the display offers". */
export function frameBudget() {
  if (reduceMotion()) return 1000 / 30; // calmer and cheaper
  return highRefresh ? 0 : 1000 / 60;
}

/**
 * A paced requestAnimationFrame loop. `fn(dt)` runs at most once per frame
 * budget; returns a stop function.
 *
 *   const stop = pacedLoop(() => draw());
 *   return stop;                      // from a useEffect cleanup
 */
export function pacedLoop(fn) {
  let raf = 0, last = 0, run = true;
  const tick = now => {
    if (!run) return;
    raf = requestAnimationFrame(tick);
    const budget = frameBudget();
    if (budget > 0 && now - last < budget) return;
    const dt = last ? now - last : 16;
    last = now;
    fn(dt);
  };
  raf = requestAnimationFrame(tick);
  return () => { run = false; cancelAnimationFrame(raf); };
}
