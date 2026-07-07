# LokBook — Agent Instructions

This file guides all AI agents working on the LokBook codebase.

## Golden Rules

1. **App.jsx is the monolith.** All page components (Feed, Battle, Profile, Studio, Shop, Viewer, Onboard, OpenFront) are defined INSIDE App.jsx as local functions. The `src/pages/` files are legacy/stale — do NOT import them.
2. **Drawing utilities import from `engine/draw.jsx`.** Functions like `paperBase`, `risoCircle`, `makeRng`, `renderSequence` are imported, not defined locally.
3. **Constants live in `constants.jsx`.** Check before adding new ones.
4. **`lok_live.jsx` is DEPRECATED.** Never edit it. It's for reference only.
5. **Theme hook everywhere.** Components use `const T = useT()` for colors/borders.
6. **Build:** `npm run build`. Dev: `npm run dev`.
7. **No TypeScript, no tests, no linter config.** Pure JSX throughout.
8. **State is monolithic** — ~65 `useState` hooks in App.jsx. Add new state at the top block.

## Feature Implementation Pattern

New features typically need:
1. State variable(s) in App.jsx (add near other state, ~line 100)
2. Feature logic (add as hook/callback in the middle section)
3. UI components (add as local functions or JSX in the render area)
4. Save/persistence in the save blob (add to store blob builder)

## Drawing Conventions
- Canvas is 480×600
- 2-ink risograph aesthetic: `ART.paper` bg, `ART.ink` for strokes, `ART.pink`/`ART.teal` accents
- Use `lok-btn` class for buttons, `lok-display` for display text
- Animations: `animation: "lokrise .25s ease"` for entry, `lokbob` for bobbing
- Styling: `style={{border:`3px solid ${T.ink}`, background:T.card, color:T.ink}}` pattern

## State Pattern
```jsx
const[feature,setFeature]=useState(defaultValue);
```
Add near other `useState` calls. Add save in the persist blob:
```jsx
save.feature=feature;
```
Add restore in the load section:
```jsx
if(save?.feature!==undefined)setFeature(save.feature);
```

## About This File
This file was created by the agent in the initial overhaul session (July 2026). It captures the codebase conventions for all future AI collaborators.
