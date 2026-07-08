import { useRef, useCallback } from "react";

const freqMap = { "C4": 262, "D4": 294, "E4": 330, "G4": 392, "A4": 440, "C5": 523, "D5": 587, "E5": 659, "G5": 784, "A5": 880, "C6": 1047 };

export function useFeedback(soundOn = false) {
  const audioCtx = useRef(null);
  const grammarRef = useRef("default");

  const setGrammar = useCallback((g) => { grammarRef.current = g; }, []);

  const blip = useCallback((note = "C5", { type = "sine", dur = 220, vol = 0.18 } = {}) => {
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
      osc.type = type;
      const ms = dur / 1000;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + ms);
    } catch {}
  }, [soundOn]);

  const hap = useCallback((pattern = [30]) => {
    try {
      const g = grammarRef.current;
      const scaled = g === "expressive" ? pattern.map(p => Math.round(p * 1.5)) : g === "quiet" ? pattern.map(p => Math.round(p * 0.3)) : pattern;
      navigator.vibrate?.(scaled);
    } catch {}
  }, []);

  return { blip, hap, setGrammar };
}
