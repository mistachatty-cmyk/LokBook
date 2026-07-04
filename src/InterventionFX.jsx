import { makeRng } from "./engine/draw.jsx";
import { ART } from "./theme/theme.js";

export default function InterventionFX({ kind, seed = 1 }) {
  const r = makeRng(seed * 53 + 9); const col = kind === "blot" ? ART.teal : ART.pink;
  const pts = []; const N = 16; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const rad = i % 2 ? 60 + r() * 70 : 130 + r() * 60; pts.push([200 + Math.cos(a) * rad, 250 + Math.sin(a) * rad]); }
  const path = pts.map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `Q200 250 ${x} ${y}`)).join(" ") + " Z";
  const drops = Array.from({ length: 9 }, () => ({ x: 40 + r() * 320, y: 40 + r() * 420, rr: 8 + r() * 26 }));
  return (<div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ animation: "lokfxin .35s cubic-bezier(.2,1.4,.4,1)" }}>
    <svg viewBox="0 0 400 500" className="w-full h-full">
      <path d={path} fill={col} opacity="0.85" transform="translate(6 6)" />
      <path d={path} fill="none" stroke={ART.ink} strokeWidth="7" strokeLinejoin="round" />
      <path d={path} fill={col} opacity="0.5" />
      {drops.map((d, i) => (<g key={i}><circle cx={d.x + 4} cy={d.y + 4} r={d.rr} fill={col} opacity="0.8" /><circle cx={d.x} cy={d.y} r={d.rr} fill="none" stroke={ART.ink} strokeWidth="4" /></g>))}
    </svg>
  </div>);
}
