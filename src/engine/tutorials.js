import { drawBounce, drawBloom, drawNight, drawWave, renderSequence } from "./draw.jsx";

export const TUTORIAL_PROJECTS = [
  { id: "tut_bounce", title: "Bouncing Blot", icon: "⚫", difficulty: "Easy", frameCount: 14, painter: drawBounce, desc: "Trace a simple squash-and-stretch bounce — the onion-skin ghost shows exactly where to draw each page." },
  { id: "tut_bloom", title: "Blooming Flower", icon: "🌸", difficulty: "Easy", frameCount: 12, painter: drawBloom, desc: "Follow the petals opening frame by frame — a gentle intro to organic motion." },
  { id: "tut_night", title: "Night Flight", icon: "🌙", difficulty: "Medium", frameCount: 13, painter: drawNight, desc: "Trace a bird gliding across the night sky — good practice for arcs and silhouettes." },
  { id: "tut_wave", title: "Rolling Wave", icon: "🌊", difficulty: "Medium", frameCount: 12, painter: drawWave, desc: "Loop a wave motion — great for understanding cyclic animation." },
];

const ghostCache = new Map();
export function getTutorialGhostFrames(tutorial) {
  if (!ghostCache.has(tutorial.id)) ghostCache.set(tutorial.id, renderSequence(tutorial.painter, tutorial.frameCount));
  return ghostCache.get(tutorial.id);
}
