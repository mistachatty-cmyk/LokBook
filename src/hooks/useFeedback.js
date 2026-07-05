import { useRef, useCallback } from "react";

const NOTE_FREQ = {
  C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494,
  C5:523, D5:587, E5:659, F5:698, G5:784, A5:880, B5:988, C6:1047,
};

export function useFeedback(soundOn = true) {
  const ctxRef = useRef(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current && typeof AudioContext !== "undefined") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const blip = useCallback((note = "C5") => {
    if (!soundOn) return;
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = NOTE_FREQ[note] || 523;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }, [soundOn, getCtx]);

  const hap = useCallback((pattern = [20]) => {
    if (!soundOn) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
  }, [soundOn]);

  return { blip, hap };
}
