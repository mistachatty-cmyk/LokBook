import { useRef, useCallback } from "react";

const freqMap = { "C4": 262, "D4": 294, "E4": 330, "G4": 392, "A4": 440, "C5": 523, "D5": 587, "E5": 659, "G5": 784, "A5": 880, "C6": 1047 };

export function useFeedback(soundOn = false) {
  const audioCtx = useRef(null);

  const blip = useCallback((note = "C5") => {
    if (!soundOn) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      if (ctx.state === "suspended") ctx.resume();
      const freq = freqMap[note] || 523;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }, [soundOn]);

  const hap = useCallback((pattern = [30]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {}
  }, []);

  return { blip, hap };
}