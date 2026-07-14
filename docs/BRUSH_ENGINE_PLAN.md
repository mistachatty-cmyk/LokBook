# LokBook Brush Engine — Market Research & Implementation Plan

> **Handoff document for Claude.** All research, planning, and strategic decisions from the July 2026 planning session. Read this before implementing the brush engine upgrade.

**Compiled by:** opencode agent, July 14 2026
**For:** Claude (and any future agent working on the brush engine)
**Status:** Planning complete, ready for implementation

---

## Table of Contents

1. Executive Summary
2. Competitive Landscape
3. Web-Native Opportunity & Library Decisions
4. Architecture: Three-Tier Approach
5. Phase 1 — Core Engine Implementation Spec (IMMEDIATE)
6. Phase 2 — Dynamics Panel UI
7. Phase 3 — Sound & Particle Effects
8. Phase 4 — Community & Export
9. perfect-freehand Integration Spec
10. Mixbox Pigment Blending
11. Gemini Deep Research Assets
12. Existing Project References
13. Implementation Priority for Claude

---

## 1. Executive Summary

**Goal:** Build a standalone, extensible brush engine for LokBook Studio (and later, a pluggable npm package) that rivals Procreate/Krita/Clip Studio Paint in expressiveness while remaining web-native, animation-aware, and aligned with the risograph aesthetic.

**Key insight:** LokBook is the *only* animated flipbook platform built natively in web. A web-native brush engine plugged into Studio becomes:
- A competitive moat (Procreate can't match your animation loop)
- An upsell (Pro tier feature)
- A white-label product (sell to other creative tools)

**What we decided NOT to chase:** Native GPU-compute engines (Krita C++, Procreate Valkyrie Metal, Vulkan/Godot pipelines). Those are a different category entirely and would break the single-file React architecture. The plan instead targets Canvas 2D + JS with smart use of libraries (perfect-freehand, Mixbox) that run in the browser today.

---

## 2. Competitive Landscape

| Feature | Procreate | Krita | Clip Studio | GIMP | Photoshop | **LokBook (target)** |
|---------|-----------|-------|-------------|------|-----------|---------------------|
| Flipbook animation | ❌ | ❌ | ✅ Limited | ❌ | ❌ | ✅ Native |
| Web-first | ❌ | ❌ Limited | ❌ | ❌ | ❌ | ✅ Core |
| Vector brushes | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ Hybrid |
| Sound effects on brush | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ Unique |
| Pressure/tilt dynamics | ✅ | ✅ | ✅ | ✅ Limited | ✅ | ✅ PointerEvents API |
| Open/JSON format | ❌ | ✅ (SVG) | ❌ | ✅ | ❌ | ✅ JSON spec |
| Brush presets count | 100K+ eco | 9 engine types | 1000+ | simple bitmap | 1000+ | animation-aware |
| Price | $13 one-time | Free | $4.49/mo | Free | $22.49/mo | **Free + Pro tier** |

### Key competitor takeaways:

**Procreate (iPad):** Brush Studio with 14 customizable attributes. No vector support. No animation-layer awareness. Proprietary format. The gold standard for *feel* — we need to match polish, not feature count.

**Krita (Desktop, Open Source):** 9 dedicated brush engines (Pixel, Hairy, Clone, Smudge, Sketch, Deform, Colorize, Tangent Normalize, Filter). Python scripting. SVG export. The closest architecture to what we're building — study their engine separation.

**Clip Studio Paint:** Has **sound effect brushes** (unique feature for manga lettering) — we can adopt this for animation punch sounds. Has 3D pen simulation. Has animation timeline (but not flipbook-aware).

**Photoshop:** Industry standard dynamics (pressure, tilt, rotation, velocity, angle jitter, dual textures). Raster-only. No animation. ABC (Adobe Brush Creator) tool — study their curve editor UI.

---

## 3. Web-Native Opportunity & Library Decisions

### Libraries to use (not reinvent):

| Library | Purpose | Integration Risk |
|---------|---------|-----------------|
| [`steveruizok/perfect-freehand`](https://github.com/steveruizok/perfect-freehand) | Variable-width stroke smoothing. Takes raw pointer coords + pressure → smooth polygon outline. | **Low.** Pure JS, no deps, 2KB. Replaces current raw point-to-point stroke. |
| [`mixbox`](https://github.com/scrtwpns/mixbox) | Pigment-based color mixing. GPU-free, ships as JS/WASM. | **Low.** npm package. Drop-in for Wet/Marker brush blend. |
| `Path2D` (native browser API) | Vector path rendering for hybrid raster+vector brushes. | **None.** Already in browsers. |
| PointerEvents API (`getCoalescedEvents()`, `pressure`, `tiltX`, `tiltY`) | High-frequency stylus input. | **None.** Already used by Easel. |

### Libraries explicitly decided AGAINST:

- **PixiJS** — too heavy for current architecture
- **p5.brush** — interesting GLSL reference but WebGL doesn't fit riso aesthetic
- **libmypaint (WASM)** — adds build step, harder to extend from JS

### The animation-aware advantage (what no competitor has):

```js
class AnimatedBrush {
  render(ctx, stroke, frameIndex, totalFrames) {
    const opacity = this.dynamics.pressureCurve(stroke.pressure);
    const timingOffset = frameIndex / totalFrames;
    const decayAlpha = this.animDecay ? opacity * (1 - timingOffset) : opacity;
    ctx.globalAlpha = decayAlpha;
    this._drawStroke(ctx, stroke);
  }
}
```

This is not in any competitor. It's ours to own.

---

## 4. Architecture: Three-Tier Approach

### Tier 1: Core Brush Engine (Phase 1 — build first)

```
lok-brush-engine/
├── core/
│   ├── BrushPreset.js          // JSON brush definition schema
│   ├── DynamicsCompiler.js     // Stylus pressure → brush parameters
│   ├── RasterStroke.js         // Canvas 2D stroke rendering
│   └── VectorStroke.js         // SVG path + animatable properties
├── brushes/
│   ├── raster/                 // Ink, Marker, Chalk, Sketch
│   ├── vector/                 // Calligraphy, outline, shape
│   └── hybrid/                 // Raster with vector outline
├── dynamics/
│   ├── PressureCurve.js        // Stylus pressure curves
│   ├── TiltAngle.js            // Tilt-aware brush deformation
│   ├── VelocityDamp.js         // Speed-based opacity/size
│   └── RandomJitter.js         // Scatter/noise dynamics
├── effects/
│   ├── SoundEffect.js          // Play audio on stroke
│   ├── ParticleSpray.js        // Emit particles along path
│   ├── GlitchEffect.js         // Digital artifacts
│   └── MotionBlur.js           // Temporal blur for animation
└── formats/
    ├── ExportJSON.js           // Brush preset as JSON
    └── ImportJSON.js           // Import brush preset
```

**Key design decision:** Every brush is a JSON preset + rendering function. Makes brushes shareable, reversible (git-versionable), network-safe (validate schema), and portable.

### Tier 2: Animator-Aware Rendering

Brush knows which frame it's drawing in. Applies temporal effects (decay, trail, motion blur) based on frame position.

### Tier 3: Vector + Raster Hybrid

Current Studio is canvas-only (raster). Adding SVG paths via `Path2D`:
- Vector strokes scale perfectly for bigger canvases
- Procreate's raster brushes look pixelated at 2x — our vector advantage

---

## 5. Phase 1 — Core Engine Implementation Spec

**Priority: IMMEDIATE — build first.**

### What to build:

1. **perfect-freehand integration** (see §9 for full spec)
2. **Bézier-smoothed strokes** — replace raw point-to-point lines
3. **Pressure/velocity dynamics curve** — maps pointer pressure → size/opacity, tilt → angle
4. **Variable-width stroke rendering** — via segmented lineWidth interpolation
5. **Mixbox pigment blending** for Wet/Marker brush (see §10)

### Where to integrate:

- `src/Easel.jsx` — current brush rendering lives here. Add engine as optional render path (gated by `legacyBrushes` toggle).
- `src/constants.jsx` — add `BRUSH_ENGINE_PRESETS` with default brush JSON schemas.
- `src/App.jsx` — wire `legacyBrushes` toggle to new engine (already partially exists from Phase 2c).

### Brush JSON preset schema:

```json
{
  "id": "ink_v2",
  "name": "Ink (v2)",
  "version": 1,
  "type": "raster",
  "color": "#232C6B",
  "size": { "min": 2, "max": 28, "default": 6 },
  "opacity": { "min": 0.1, "max": 1.0, "default": 1.0 },
  "dynamics": {
    "pressure": { "enabled": true, "curve": "linear" },
    "velocity": { "enabled": true, "decay": 0.3 },
    "tilt": { "enabled": false }
  },
  "rendering": {
    "smooth": true,
    "variableWidth": true,
    "blendMode": "source-over",
    "texture": null
  },
  "animation": {
    "frameDecay": false,
    "trailLength": 0,
    "motionBlur": false
  }
}
```

### DynamicsCompiler pseudocode:

```js
class DynamicsCompiler {
  constructor(preset) {
    this.preset = preset;
  }

  getSize(pointerEvent) {
    const base = this.preset.size.default;
    const pressureScale = this.preset.dynamics.pressure.enabled
      ? pointerEvent.pressure : 1;
    const velocityScale = this.preset.dynamics.velocity.enabled
      ? this._velocityDecay(pointerEvent) : 1;
    return Math.max(this.preset.size.min,
      Math.min(this.preset.size.max, base * pressureScale * velocityScale));
  }

  getOpacity(pointerEvent) {
    const pressureScale = this.preset.dynamics.pressure.enabled
      ? this._applyCurve(pointerEvent.pressure, this.preset.dynamics.pressure.curve) : 1;
    return Math.max(0.1, this.preset.opacity.default * pressureScale);
  }

  _applyCurve(value, curveType) {
    switch (curveType) {
      case 'linear': return value;
      case 'ease-in': return value * value;
      case 'ease-out': return Math.sqrt(value);
      case 's-curve': return value * value * (3 - 2 * value);
      default: return value;
    }
  }

  _velocityDecay(event) {
    const coalesced = event.getCoalescedEvents();
    if (coalesced.length < 2) return 1;
    const dx = coalesced[coalesced.length - 1].x - coalesced[0].x;
    const dy = coalesced[coalesced.length - 1].y - coalesced[0].y;
    const dt = coalesced[coalesced.length - 1].timeStamp - coalesced[0].timeStamp;
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    return 1 - Math.min(velocity * this.preset.dynamics.velocity.decay, 0.7);
  }
}
```

---

## 6. Phase 2 — Dynamics Panel UI

A visual brush editor within Studio (gated by Pro/Loks unlock).

### UI spec:

```
Brush Builder panel (togglable in Studio toolbar)
├── Brush selector (horizontal scroll of brush cards)
├── Size slider 2-28px with live preview
├── Opacity slider 0-100%
├── Dynamics section
│   ├── Pressure curve editor (visual bezier canvas, 200×100px)
│   │   └── Click to add control points, drag to adjust
│   ├── Tilt sensitivity slider 0-100%
│   └── Velocity damping slider 0-100%
├── Texture toggle (enable/disable grain overlay)
├── Symmetry quick-select (none/mirrorX/mirrorY/quad/radial4)
└── Blend mode selector (4 modes: normal, multiply, screen, overlay)
```

**Key constraint:** Curve editor is a small canvas element (200×100), not an external library. Use Path2D to render the curve and hit-testing for drag handles. Same risograph aesthetic — `ART.ink` lines on `ART.paper` background.

---

## 7. Phase 3 — Sound & Particle Effects

### Sound effect brushes (unique feature, inspired by Clip Studio Paint)

```js
class SoundBrush {
  constructor() {
    this.audioFile = null;
    this.triggerEvent = 'start'; // 'start' | 'end' | 'every-3-frames'
    this.volume = 0.8;
    this.pitch = 1.0;
    this.sustainMs = 500;
  }

  onStrokeEnd(stroke, audioContext) {
    const playback = new Audio(this.audioFile);
    playback.volume = this.volume * (stroke.pressure / 255);
    playback.playbackRate = 1.0 + (stroke.velocity / 1000) * this.pitch;
    playback.play();
    setTimeout(() => { playback.volume = 0; }, this.sustainMs);
  }
}
```

**Use cases:** Punch sounds on impact strokes (manga combat), whoosh on speed lines, ink drip on slow strokes.

### Particle spray effects:

Emit small circles/stars/ink drops along stroke path via `requestAnimationFrame` loop (separate from Easel draw loop). Configurable: count, speed, spread angle, lifetime, color.

---

## 8. Phase 4 — Community & Export

- `exportJSON` — serialize brush preset as downloadable `.lokbrush` file
- `importJSON` — drag-and-drop or file picker to import community brushes
- Schema validation — reject malformed presets with friendly error
- Future: Supabase community brush gallery (id, preset JSON, creator, votes)

---

## 9. perfect-freehand Integration Spec

### API (from actual npm docs)

```js
import { getStroke } from 'perfect-freehand';

const stroke = getStroke(points, options);
// Returns array of [x, y] points forming the outline polygon

// Render as filled Path2D
const path = stroke.reduce((acc, [x, y], i) => {
  return acc + (i === 0 ? `M${x},${y}` : `L${x},${y}`);
}, '') + 'Z';
ctx.fill(new Path2D(path));
```

### Options object:

```js
{
  size: 8,
  smoothing: 0.5,      // 0 = sharp, 1 = very smooth
  thinning: 0.5,        // pressure sensitivity (0 = none, 1 = max)
  simulatePressure: false, // set true if no pressure data
  easing: t => t,
  start: { taper: 0, easing: t => t, cap: true },
  end: { taper: 0, easing: t => t, cap: true },
  streamline: 0.5,      // 0 = raw, 1 = very smooth
}
```

### Integration points in Easel.jsx:

1. **Input collection** — accumulate pointer points as `[x, y, pressure]` tuples during `pointerdown` → `pointermove`
2. **Stroke rendering** — on each `pointermove`, call `getStroke()` with accumulated points
3. **Output** — fill the polygon as `Path2D` instead of current line/arc

### Risks & mitigation:

| Risk | Mitigation |
|------|-----------|
| Eraser uses `destination-out`; getStroke returns fill not line | Render polygon filled, apply `globalCompositeOperation = 'destination-out'` before filling |
| Symmetry duplicates across axes | Call `getStroke` once, transform output polygon points per mirror/radial copy |
| `simulatePressure` needed on some devices | Check if existing Easel logic already handles missing pressure data |
| `streamline` may conflict with existing smoothing | Default 0.5 is safe; expose as smoothing slider later |

### Before/After:

**Before (current Easel.jsx — pseudocode):**
```js
ctx.beginPath();
ctx.moveTo(prevX, prevY);
ctx.lineTo(x, y);
ctx.stroke();
```

**After (with perfect-freehand):**
```js
const points = this.strokePoints;
const outline = getStroke(points, {
  size: brushSize, thinning: 0.6, smoothing: 0.5, streamline: 0.5
});
const path = getSvgPathFromStroke(outline);
ctx.fill(new Path2D(path));
```

---

## 10. Mixbox Pigment Blending

**What it is:** JS/WASM library for realistic paint mixing — red + blue = purple, not alpha blend. MIT-licensed, ~15KB.

**Integration:**
```js
import * as mixbox from 'mixbox';
const baseColor = mixbox.lerp(canvasColor, strokeColor, wetness);
// Returns [r, g, b] — paint-like mixing
```

**Where to use:** `BrushPreset.type === 'watercolor' || 'marker' || 'ink-wash'`. Toggle in brush preset.

---

## 11. Gemini Deep Research Assets

Documents from Gemini deep research, integrated into this plan (original share links inaccessible without sign-in):

| # | Title | Key Content |
|---|---|---|
| 1 | Technical Architecture of Digital Brush Engines | Competitive landscape, three-tier architecture decisions |
| 2 | Modern Generative Interfaces & Vibe-Coded Platforms | Library decisions, web-native opportunity |
| 3 | Production-Grade Open Source Brush Repos | perfect-freehand, Mixbox, libmypaint references |
| 4 | High-Performance Digital Art Systems Architecture | Three-tier design, perfect-freehand spec, Path2D approach |
| 5 | Lockbook Scaling Strategy (iOS/Browser/Steam) | Not yet applied — future planning |
| 6 | GPU-Accelerated Rendering & Shader Pipelines | "Decided against" — GPU out of scope for now |

**Key findings:**
- Mixbox → adopted for Phase 1
- Disk B-Splines → simplified to segmented lineWidth + perfect-freehand polygon
- Navier-Stokes / Kubelka-Munk / neural painting → out of scope (native/GPU-only)
- Bézier fairing → adopted via perfect-freehand streamline

---

## 12. Existing Project References

| Doc | Location | What It Contains |
|-----|----------|-----------------|
| MASTERPLAN.md | `docs/MASTERPLAN.md` | Agent protocol, build gate, regression postmortem. **READ FIRST.** |
| AGENTS.md | `AGENTS.md` | Golden rules, conventions, CI/CD pipeline |
| FEATURES.md | `docs/FEATURES.md` | Full feature catalog — 90+ features |
| LOK_FORMAT.md | `docs/LOK_FORMAT.md` | `.lok` file format spec |
| LOKLANG.md | `LOKLANG.md` | Glossary of all LokBook terms |
| EXPANSION.md | `EXPANSION.md` | Long-term roadmap (AI, Steam, mobile) |
| Fable Beta Plan | `lok_fable_beta_plan.md` | LilLok comms, economy, decay redesign, audit backlog |
| ALPHA_V1.2_CHANGELOG.md | `ALPHA_V1.2_CHANGELOG.md` | Release changelog |
| lok_audit_report.md | `lok_audit_report.md` | Full audit of broken "done" features |

### Critical rules (from AGENTS.md):
1. **App.jsx is the monolith** — 6 specific files ARE real imports: `Rooms.jsx`, `rooms/*`, `identity.js`, `botArt.js`, `ThemeBackdrop.jsx`, `bleepbox.js`. Run `grep '^import' src/App.jsx` before trusting any doc.
2. **Drawing utilities** import from `engine/draw.jsx` — check before defining locally.
3. **Constants** live in `constants.jsx` — check before adding new ones.
4. **`lok_live.jsx`** is DEPRECATED — never edit.
5. **Theme hook:** `const T = useT()` everywhere.
6. **Build gate:** `npm run build && npm run smoke` before every commit.
7. **State pattern:** Add near other `useState` calls (~line 100), add save in persist blob, add restore in load section.

---

## 13. Implementation Priority for Claude

### Sprint 1 — Core Engine (do first, in sequence)

1. Read `docs/MASTERPLAN.md` — understand agent protocol and regression history
2. Run `git log --oneline -10` — see what landed since this doc was written
3. Run `grep '^import' src/App.jsx` — confirm current import state
4. Read `src/Easel.jsx` — understand current brush rendering
5. `npm install perfect-freehand`
6. `npm install mixbox`
7. Implement perfect-freehand stroke integration in Easel (see §9)
8. Implement DynamicsCompiler class (see §5)
9. Add `BRUSH_ENGINE_PRESETS` to `constants.jsx`
10. Wire `legacyBrushes` toggle to new rendering path
11. **GATE:** `npm run build && npm run smoke` — both must pass

### Sprint 2 — Dynamics Panel & Effects

1. Add Brush Builder panel UI (see §6)
2. Add sound effect brush support (see §7)
3. Add particle spray effects (see §7)
4. **GATE:** `npm run build && npm run smoke`

### Sprint 3 — Community & Polish

1. Add JSON preset export/import (see §8)
2. Polish: variable-width rendering, tilt visualization
3. **GATE:** `npm run build && npm run smoke`

---

## Appendix: Sound Effect Brush Use Cases

| Sound | Trigger | Use |
|-------|---------|-----|
| Punch/impact | Stroke start, high velocity | Combat panels |
| Whoosh | Stroke start, mod velocity | Speed lines |
| Scribble | Continuous stroke, low velocity | Sketching |
| Ink drip | Stroke end | Ink wash |
| Splat | Stroke start, high pressure | Splatter effects |

## Appendix: Particle Effect Types

| Effect | Visual | Brush |
|--------|--------|-------|
| Ink spray | Dark dots scatter | Inky feel |
| Glitter | Colored sparkles | Galaxy/Sparkle |
| Smoke | Fading grey billows | Smudge |
| Embers | Glowing orange dots | Neon/Warm |
| Stars | Rotating stars | Magic |

---

*Plan compiled July 14 2026. Ready for implementation.*
