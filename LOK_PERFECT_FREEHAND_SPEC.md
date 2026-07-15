# perfect-freehand Integration Spec — for the real Easel component (src/App.jsx)

Research/spec only — not yet implemented. API confirmed live against npm/GitHub docs, not from memory.

## What it actually does
`npm install perfect-freehand`. Exports `getStroke(points, options)`. Takes raw input points (`[x, y, pressure]` or `{x,y,pressure}`), returns an array of **outline points** forming a closed polygon — not a stroked line. You render that polygon yourself (SVG path or `Path2D` on canvas).

```js
import { getStroke } from 'perfect-freehand'

const stroke = getStroke(points, {
  size: 16,        // base diameter
  thinning: 0.5,   // pressure -> width effect; negative = thinner under more pressure
  smoothing: 0.5,  // edge softening
  streamline: 0.5, // input smoothing
  simulatePressure: pointerType !== 'pen', // fake pressure from velocity for touch/mouse
})

function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return ''
  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return acc
  }, ['M', ...stroke[0], 'Q'])
  d.push('Z')
  return d.join(' ')
}
// Canvas: ctx.fill(new Path2D(getSvgPathFromStroke(stroke)))
```

Useful built-in: `simulatePressure` — for touch/mouse where there's no real pressure, it derives a pressure-like value from stroke velocity automatically. **This may make the custom `dynMul` velocity-fallback (already built, in the real `Easel`) partially redundant** — decide whether to keep both or let `perfect-freehand`'s own simulation handle the touch/mouse case, and reserve `dynMul` for the real-pressure stylus path only.

## What actually changes vs. the current line/arc approach
The real `Easel`'s ink/pen brush currently uses `ctx.quadraticCurveTo` + `ctx.stroke()` — a stroked line, constant width per draw call (modulated only by the `sizeMulRef` dynamics multiplier added this session). `getStroke` instead returns a filled polygon whose width varies continuously along its own length. This is the actual pressure-tapered look — a real upgrade, not cosmetic.

## Three real integration touch-points (this is the risk surface, not the library itself)

1. **Eraser.** Currently uses `ctx.globalCompositeOperation = "destination-out"` with stroked arcs/lines. Needs to instead fill a `perfect-freehand` polygon with `destination-out` composite mode. Same technique, different shape source — should be a small change, but must be tested: erasing along a fast stroke needs the eraser's own polygon to still fully cover the intended path, not just its centerline.

2. **Symmetry.** The real `Easel`'s `symXY()` currently duplicates *points* before stroking (draws N mirrored copies of the same line via the `pts.forEach` loop in `stamp`). It would need to duplicate the *entire point array* before calling `getStroke` per copy — i.e., run `getStroke` N times (once per symmetry copy) rather than transforming a shared line N times. This is the highest real cost: N calls to `getStroke` per pointer-move instead of one. For 4–8 way symmetry at high input frequency, worth a perf check on a real device before shipping — if it stutters, throttle `getStroke` calls to every 2nd–3rd coalesced point rather than every one.

3. **Fill tool / flood fill boundaries.** The fill tool samples pixel alpha; a filled polygon stroke should produce cleaner, more consistent alpha edges than the current stroke-based approach (net improvement, not a risk) — but re-verify fill still respects anti-aliased polygon edges the same way it respected the old stroked-line edges.

## Suggested integration order
1. Wire `getStroke` + `getSvgPathFromStroke` in as an **opt-in brush mode first** (only the "pen"/"ink" brush; leave marker/chalk/custom Brush Lab brushes on the existing dab-based path) — limits the blast radius of the eraser/symmetry risk to one brush.
2. Verify eraser still works correctly against that one brush.
3. Verify symmetry still works correctly against that one brush, and check the perf cost of N `getStroke` calls per move event.
4. Only after both check out, consider migrating other line-based brushes over.

## What NOT to do
Don't replace `dabAt`-style brushes (chalk, custom Brush Lab brushes) with `perfect-freehand` — those are intentionally dab/scatter-based, not continuous-line-based. `perfect-freehand` is specifically for the smooth continuous-stroke brushes (ink/pen/marker-style), not the textured/scattered ones.
