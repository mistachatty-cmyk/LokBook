// Round-trip gate for the .lokvec stroke codec.
//
// Checks three things a silent bug would break:
//   1. Every decoded point lands within one quantisation step of the original.
//   2. Tool / colour / size survive exactly.
//   3. The binary payload is materially smaller than the equivalent JSON —
//      the entire reason the codec exists. If a change quietly defeats the
//      delta or varint packing, size regresses and this fails.
//
// Also fuzzes truncated/corrupt payloads: the decoder must throw a clear error
// rather than return silently-wrong geometry.
import { build } from "esbuild";
import { rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".stroke-check.mjs");

try {
  await build({
    stdin: {
      contents: `export * from "./src/engine/strokeCodec.js";`,
      resolveDir: root, sourcefile: "sc.js", loader: "js",
    },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
  });
  const C = await import(pathToFileURL(out).href);

  const W = 480, H = 600;
  // Deterministic pseudo-random strokes, shaped like real hand input: many
  // closely-spaced points, which is exactly what delta+varint should exploit.
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const tools = ["pen", "marker", "chalk", "grain", "watercolor"];
  const strokes = [];
  for (let s = 0; s < 40; s++) {
    let x = rnd() * W, y = rnd() * H;
    const n = 30 + Math.floor(rnd() * 200);
    const points = [];
    for (let i = 0; i < n; i++) {
      x = Math.max(0, Math.min(W, x + (rnd() - 0.5) * 6));
      y = Math.max(0, Math.min(H, y + (rnd() - 0.5) * 6));
      points.push({ x, y, pressure: rnd() });
    }
    strokes.push({
      tool: tools[s % tools.length],
      color: `rgb(${Math.floor(rnd() * 256)},${Math.floor(rnd() * 256)},${Math.floor(rnd() * 256)})`,
      size: 1 + rnd() * 40,
      points,
    });
  }

  const bin = C.encodeStrokes(strokes, { width: W, height: H });
  const back = C.decodeStrokes(bin);
  const problems = [];

  if (back.strokes.length !== strokes.length)
    problems.push(`stroke count ${back.strokes.length} != ${strokes.length}`);

  // ABSOLUTE tolerance, deliberately NOT derived from the codec's own Q_MAX.
  // Deriving it (tol = quantStep()) made this assertion self-referential:
  // shrinking the grid to 8-bit also loosened the tolerance, so the check could
  // never fail. This is the precision a 16-bit grid must actually deliver.
  const tolX = 0.05, tolY = 0.05;
  let worstX = 0, worstY = 0, totalPoints = 0;
  for (let i = 0; i < strokes.length; i++) {
    const a = strokes[i], b = back.strokes[i];
    if (!b) { problems.push(`stroke ${i} missing`); continue; }
    if (a.tool !== b.tool) problems.push(`stroke ${i}: tool "${b.tool}" != "${a.tool}"`);
    if (Math.abs(a.size - b.size) > 1 / 16) problems.push(`stroke ${i}: size ${b.size} != ${a.size}`);
    const [ar, ag, ab] = C.parseColor(a.color), [br, bg, bb] = C.parseColor(b.color);
    if (ar !== br || ag !== bg || ab !== bb) problems.push(`stroke ${i}: colour drift`);
    if (a.points.length !== b.points.length) { problems.push(`stroke ${i}: point count`); continue; }
    for (let k = 0; k < a.points.length; k++) {
      const dx = Math.abs(a.points[k].x - b.points[k].x);
      const dy = Math.abs(a.points[k].y - b.points[k].y);
      worstX = Math.max(worstX, dx); worstY = Math.max(worstY, dy);
      if (dx > tolX) problems.push(`stroke ${i} pt ${k}: x off by ${dx.toFixed(4)}px (tol ${tolX.toFixed(4)})`);
      if (dy > tolY) problems.push(`stroke ${i} pt ${k}: y off by ${dy.toFixed(4)}px (tol ${tolY.toFixed(4)})`);
      totalPoints++;
    }
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(strokes)).length;
  const ratio = jsonBytes / bin.length;
  // Bytes-per-point is the direct measure of packing efficiency, and it
  // discriminates where the JSON ratio does not: with delta+varint a typical
  // hand stroke costs ~4.8 B/pt; storing absolute coords instead costs ~6.9.
  // A loose ratio threshold passed happily with delta encoding removed, so
  // assert on this instead.
  const bytesPerPoint = bin.length / totalPoints;
  if (bytesPerPoint > 6) problems.push(`${bytesPerPoint.toFixed(2)} bytes/point — delta or varint packing is not working (expect <6)`);
  if (ratio < 10) problems.push(`compression only ${ratio.toFixed(2)}x vs JSON`);

  // Corrupt payloads must fail loudly, not decode into wrong geometry.
  // Cut at EVERY length, not one arbitrary midpoint: the original single
  // half-length cut happened to land on a varint boundary and so missed that
  // fixed-width reads had no bounds checks at all (a payload short by one byte
  // decoded "fine" with NaN pressure).
  let survived = [];
  for (let cut = 1; cut < bin.length; cut++) {
    try { C.decodeStrokes(bin.slice(0, cut)); survived.push(cut); } catch { /* expected */ }
  }
  if (survived.length) problems.push(`${survived.length} truncation lengths decoded without error (e.g. ${survived.slice(0, 5).join(", ")}) — corruption passes silently`);

  // Coordinates outside the canvas must survive. Pointer capture keeps
  // delivering events after the pointer leaves the canvas, and clamping them
  // turned a stroke sweeping off-canvas into a flat run along the edge.
  const off = [{ tool: "pen", color: "#000000", size: 4, points: [
    { x: -60, y: -40, pressure: 0.5 }, { x: 240, y: 300, pressure: 0.5 }, { x: 540, y: 660, pressure: 0.5 },
  ]}];
  const offBack = C.decodeStrokes(C.encodeStrokes(off, { width: W, height: H })).strokes[0].points;
  for (let k = 0; k < off[0].points.length; k++) {
    if (Math.abs(offBack[k].x - off[0].points[k].x) > 0.05 || Math.abs(offBack[k].y - off[0].points[k].y) > 0.05)
      problems.push(`off-canvas point ${k} clamped: (${offBack[k].x.toFixed(1)},${offBack[k].y.toFixed(1)}) != (${off[0].points[k].x},${off[0].points[k].y})`);
  }

  // A single-point stroke (a tap) must round-trip — it draws a visible dab.
  const tap = [{ tool: "pen", color: "#123456", size: 8, points: [{ x: 100, y: 200, pressure: 0.9 }] }];
  const tapBack = C.decodeStrokes(C.encodeStrokes(tap, { width: W, height: H })).strokes;
  if (tapBack.length !== 1 || tapBack[0].points.length !== 1) problems.push("single-point tap stroke did not round-trip");

  let threwOnBadMagic = false;
  const bad = bin.slice(); bad[0] ^= 0xff;
  try { C.decodeStrokes(bad); } catch { threwOnBadMagic = true; }
  if (!threwOnBadMagic) problems.push("bad magic accepted — non-stroke data would be parsed as strokes");

  console.log(`STROKES: ${strokes.length} strokes · ${totalPoints} points · ${bin.length}B binary vs ${jsonBytes}B JSON (${ratio.toFixed(1)}x smaller, ${bytesPerPoint.toFixed(2)} B/pt)`);
  console.log(`         worst positional error: ${worstX.toFixed(5)}px x / ${worstY.toFixed(5)}px y (1 quant step = ${C.quantStep(W).toFixed(5)}px)`);
  if (problems.length) { console.error("PROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
  console.log("STROKES OK — round-trip lossless within quantisation, and corrupt payloads are rejected.");
} catch (e) {
  console.error("STROKE CHECK FAILED:", e.message);
  process.exit(1);
} finally { rmSync(out, { force: true }); }
