// Coverage gate for PERMANENT cosmetics, the sibling of verify-rotation.mjs.
//
// verify-rotation only covers DAILY_ITEMS/WEEKLY_ITEMS, so the permanent Shop
// catalogues had no gate at all — the exact hole that let docs/AUDIT.md
// Finding 2 happen (95 items sold for Loks rendering nothing).
//
// This checks three distinct failure modes, all of which were found live:
//   1. INERT       — a sellable id with no renderer entry anywhere.
//   2. DEAD ANIM   — a particle spec naming a @keyframes that isn't defined
//                    globally. The particles draw, then sit frozen. Hit
//                    fireflies/bubbles/snow/plasma, whose keyframes were
//                    declared inside legacy branches the generic renderer
//                    never renders.
//   3. FAKE ICON   — a reaction pack entry that isn't a type <ReactionIcon>
//                    implements. It falls through to the splat SVG, so the
//                    pack renders as three identical splats. Hit all three
//                    rotation reaction packs.
import { build } from "esbuild";
import { rmSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".cosmetics-check.mjs");
const entry = `
  import * as C from "./src/constants.jsx";
  import * as R from "./src/engine/rotation.js";
  import * as B from "./src/engine/blotLook.js";
  import * as Th from "./src/theme/theme.js";
  export { C, R, B, Th };
`;

const readSrc = p => readFileSync(join(root, p), "utf8");

try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: "cos.jsx", loader: "jsx" },
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
      "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
    },
  });
  const { C, R, B, Th } = await import(pathToFileURL(out).href);

  const art = readSrc("src/art.jsx");
  const easel = readSrc("src/Easel.jsx");
  const cursors = readSrc("src/engine/cursors.js");
  const indexCss = readSrc("src/index.css");

  // Renderer registries, resolved the same way the app resolves them.
  const frames = R.ROTATION_FRAMES("#000", "#fff", 64);
  const borders = R.ROTATION_BORDERS("#000", "#fff");

  // A hand-written branch counts as a renderer too.
  const hasBranch = (src, id) => src.includes(`=== "${id}"`) || src.includes(`==="${id}"`);

  const problems = [];
  const check = (label, items, resolve) => {
    let ok = 0;
    for (const it of items) {
      const id = typeof it === "string" ? it : it.id;
      if (resolve(id)) ok++;
      else problems.push(`INERT      ${label}: "${id}" — sellable, no renderer`);
    }
    return ok;
  };

  let total = 0;
  total += check("effect", C.EFFECTS, id => id === "none" || id in R.ROTATION_EFFECTS || hasBranch(art, id));
  total += check("sky", C.SKIES, id => id === "clear" || id in R.ROTATION_SKIES || hasBranch(art, id));
  total += check("paper", C.PAPERS, id => id === "plain" || id in R.ROTATION_PAPERS || easel.includes(`"${id}"`));
  total += check("frame", C.FRAMES, id => id === "none" || id in frames || art.includes(`${id}:`));
  total += check("blot_border", C.BLOT_BORDERS, id => id === "none" || id in borders || readSrc("src/theme/theme.js").includes(`${id}:`));
  total += check("cursor", C.CURSORS, id => id === "default" || id in R.ROTATION_CURSORS || cursors.includes(`${id}:`));
  total += check("font", C.FONT_PACKS, id => id === "default" || id in R.ROTATION_FONTS || !!C.FONT_PACKS.find(f => f.id === id)?.font);
  total += check("name_color", C.NAME_COLORS, id => id === "default" || id in C.NAME_COLOR_MAP);
  total += check("world_skin", C.WORLD_SKINS, id => id === "none" || !!C.WORLD_SKINS.find(s => s.id === id)?.textureUrl);
  // Sticker packs carry their emoji inline; an empty pack is an inert pack.
  total += check("sticker_pack", C.STICKER_PACKS, id => {
    const p = C.STICKER_PACKS.find(s => s.id === id);
    return (p?.stickers?.length > 0) || id in R.ROTATION_STICKERS;
  });
  total += check("reaction_pack", C.REACTION_PACKS, id => id in C.REACTION_SETS || id in R.ROTATION_REACTIONS);

  // Blot's three look catalogues. These were sellable for months — 17 items,
  // 20-45 Loks each — while `LilLokSprite` ignored all of them and the FAB
  // hardcoded `blotFloat` and `blotBounce`. audit-inert.mjs called them WIRED
  // because App.jsx read their `giftReward` field, which mentions the id
  // without ever drawing it. Checking the render tables directly cannot be
  // fooled that way.
  total += check("blot_idle", C.BLOT_IDLE_ANIMATIONS, id => id in B.BLOT_IDLE_RENDER);
  total += check("blot_expression", C.BLOT_EXPRESSIONS, id => id in B.BLOT_EXPRESSION_RENDER);
  total += check("blot_bounce", C.BLOT_BOUNCES, id => id in B.BLOT_BOUNCE_RENDER);

  // --- 2. every particle spec's animation must be a globally-defined keyframe.
  // GlobalStyle (art.jsx) and index.css are the only global stylesheets; a
  // @keyframes inside a conditional branch's <style> does not count, because the
  // generic renderer returns before that branch ever renders.
  const globalStyle = art.slice(art.indexOf("export function GlobalStyle"));
  const globalKeyframes = new Set(
    [...globalStyle.matchAll(/@keyframes\s+([\w-]+)/g), ...indexCss.matchAll(/@keyframes\s+([\w-]+)/g)]
      .map(m => m[1])
  );
  for (const [id, spec] of Object.entries(R.ROTATION_EFFECTS)) {
    if (spec.anim && !globalKeyframes.has(spec.anim))
      problems.push(`DEAD ANIM  effect "${id}" — @keyframes ${spec.anim} is not defined globally (particles will not move)`);
  }

  // Same rule as particle effects: a Blot animation naming a @keyframes that
  // does not exist renders as nothing at all, silently. Four of the five bounce
  // styles shipped with no keyframe behind them.
  for (const name of B.BLOT_KEYFRAMES) {
    if (!globalKeyframes.has(name))
      problems.push(`DEAD ANIM  blot animation "${name}" is not defined globally (Blot will not move)`);
  }

  // --- 2b. and the Blot look catalogues must produce VISIBLY DIFFERENT output.
  // Resolving to a table row is the part; changing a pixel is the wiring, and
  // CLAUDE.md's hardest-won rule is that every piece can pass in isolation
  // while the feature is inert. Render the real sprite once per expression and
  // require distinct SVG. Also require that a critical/petrified blot ignores
  // expression entirely — its face is the only signal that it needs feeding,
  // and dressing a dying blot in "Happy" would hide it.
  {
    const spriteOut = join(root, ".blot-render-check.mjs");
    try {
      await build({
        stdin: {
          contents: `
            import { renderToStaticMarkup } from "react-dom/server";
            import React from "react";
            import { LilLokSprite } from "./src/LilLok.jsx";
            export { renderToStaticMarkup, React, LilLokSprite };
          `,
          resolveDir: root, sourcefile: "blotr.jsx", loader: "jsx",
        },
        bundle: true, format: "esm", platform: "node", packages: "external",
        outfile: spriteOut, logLevel: "silent",
        define: {
          "import.meta.env.VITE_SUPABASE_URL": '""',
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '""',
          "import.meta.env.DEV": "false", "import.meta.env.PROD": "true",
        },
      });
      const S = await import(pathToFileURL(spriteOut).href);
      const draw = (expression, phase) => S.renderToStaticMarkup(
        S.React.createElement(S.LilLokSprite, { phase, ink: 80, expression, idle: "float" }));

      const healthy = new Map(C.BLOT_EXPRESSIONS.map(e => [e.id, draw(e.id, "thriving")]));
      const distinct = new Set(healthy.values()).size;
      if (distinct < healthy.size) {
        const dupes = [...healthy].filter(([, h], i, a) => a.findIndex(([, h2]) => h2 === h) !== i).map(([id]) => id);
        problems.push(`INERT LOOK  ${healthy.size - distinct} expression(s) render identically to another (${dupes.join(", ")}) — they are sellable and indistinguishable on screen`);
      }
      const sick = new Set(C.BLOT_EXPRESSIONS.map(e => draw(e.id, "critical")));
      if (sick.size !== 1) {
        problems.push(`a critical blot renders ${sick.size} different faces by expression — health must outrank decoration, or a dying blot can look happy`);
      }
      const idleCss = new Set(C.BLOT_IDLE_ANIMATIONS.map(a => B.idleAnimationCss(a.id, {})));
      if (idleCss.size !== C.BLOT_IDLE_ANIMATIONS.length)
        problems.push(`${C.BLOT_IDLE_ANIMATIONS.length - idleCss.size} idle animation(s) produce identical CSS — they look the same when equipped`);
      const bounceCss = new Set(C.BLOT_BOUNCES.map(b => B.bounceAnimationCss(b.id, {})));
      if (bounceCss.size !== C.BLOT_BOUNCES.length)
        problems.push(`${C.BLOT_BOUNCES.length - bounceCss.size} bounce style(s) produce identical CSS`);
      console.log(`BLOT LOOK: ${healthy.size} expressions -> ${distinct} distinct sprites · ${idleCss.size} idle motions · ${bounceCss.size} bounces`);
    } catch (err) {
      problems.push(`could not render the Blot sprite to check it: ${err.message}`);
    } finally {
      rmSync(spriteOut, { force: true });
    }
  }

  // --- 3. reaction icons must be types ReactionIcon actually implements.
  const iconFn = art.slice(art.indexOf("export function ReactionIcon"), art.indexOf("export function GlobalStyle"));
  const iconTypes = new Set([...iconFn.matchAll(/case "([\w]+)"/g)].map(m => m[1]));
  for (const [pack, icons] of Object.entries(R.ROTATION_REACTIONS)) {
    for (const ic of icons) {
      if (!iconTypes.has(ic))
        problems.push(`FAKE ICON  reaction "${pack}" — "${ic}" is not a ReactionIcon type (renders as a generic splat)`);
    }
  }

  // --- 4. hybrid themes: every `dynamic` spec must resolve to a complete,
  // valid token set at the extremes of its own driver, including with
  // gyroMotion entirely absent — a theme's colours must never depend on the
  // sensor being present, only its backdrop's motion may.
  const TOKEN_KEYS = ["paper", "ink", "accent", "alt", "shadow", "card", "onAccent"];
  const isHexOrCss = v => typeof v === "string" && v.length > 0;
  const assertComplete = (label, resolved) => {
    for (const k of TOKEN_KEYS) if (!isHexOrCss(resolved?.[k]))
      problems.push(`DYNAMIC THEME  ${label}: resolved token "${k}" is missing or empty`);
  };
  let dynCount = 0;
  for (const [id, th] of Object.entries(Th.THEMES)) {
    const d = th.dynamic;
    if (!d) continue;
    dynCount++;
    // Every driver, with NO ctx at all — the identity/default path every
    // consumer falls back to before any signal is computed.
    assertComplete(`${id} (no ctx)`, Th.resolveTheme(th, {}));
    if (d.driver === "nightshift") {
      const day = Th.resolveTheme(th, { nightShift: 0 });
      const night = Th.resolveTheme(th, { nightShift: 1 });
      assertComplete(`${id} (nightShift:0)`, day);
      assertComplete(`${id} (nightShift:1)`, night);
      if (day.paper === night.paper) problems.push(`DYNAMIC THEME  ${id}: nightshift driver produces the same paper at both extremes — it never actually re-hues`);
    } else if (d.driver === "weather") {
      for (const w of ["rain", "fog", "aurora", "dust"]) assertComplete(`${id} (weather:${w})`, Th.resolveTheme(th, { weather: w }));
      assertComplete(`${id} (weather: unknown)`, Th.resolveTheme(th, { weather: "not-a-real-weather" }));
    } else if (d.driver === "suncycle") {
      assertComplete(`${id} (isNight:false)`, Th.resolveTheme(th, { isNight: false }));
      assertComplete(`${id} (isNight:true)`, Th.resolveTheme(th, { isNight: true }));
    } else if (d.driver === "blend") {
      const period = d.periodMs || 240000;
      const start = Th.resolveTheme(th, { now: 0 });
      const mid = Th.resolveTheme(th, { now: period / 2 });
      assertComplete(`${id} (blend t=0)`, start);
      assertComplete(`${id} (blend t=mid)`, mid);
      if (JSON.stringify(start) === JSON.stringify(mid)) problems.push(`DYNAMIC THEME  ${id}: blend driver produces identical tokens at both ends of its loop — it never actually crossfades`);
    } else if (d.driver === "gyro" || d.driver === "events") {
      // Reactive backdrops move; the palette itself must still resolve fully
      // with no gyroMotion/event signal present at all.
      assertComplete(`${id} (${d.driver}, no signal)`, Th.resolveTheme(th, {}));
      if (d.driver === "gyro" && !th.backdrop) problems.push(`DYNAMIC THEME  ${id}: gyro-driven theme names no backdrop — nothing will actually move`);
    } else {
      problems.push(`DYNAMIC THEME  ${id}: unknown dynamic.driver "${d.driver}"`);
    }
  }
  console.log(`THEMES: ${Object.keys(Th.THEMES).length} total · ${dynCount} dynamic (resolveTheme checked at driver extremes)`);

  // --- 4b. every reactive backdrop's `animation:` must name a @keyframes
  // actually declared in ThemeBackdrop.jsx. Same failure mode as DEAD ANIM
  // above (a keyframe declared somewhere it never renders), applied to the
  // theme backdrops rather than the rotation particle effects.
  const backdropSrc = readSrc("src/theme/ThemeBackdrop.jsx");
  const declaredKeyframes = new Set([...backdropSrc.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]));
  const referencedKeyframes = new Set(
    [...backdropSrc.matchAll(/animation:\s*[`"']?\$?\{?[`"']?([\w-]+)\s+[\d.]+s/g)].map(m => m[1])
  );
  for (const name of referencedKeyframes) {
    if (!declaredKeyframes.has(name))
      problems.push(`DEAD ANIM  ThemeBackdrop references @keyframes ${name} but never declares it — that backdrop will render frozen`);
  }

  console.log(`COSMETICS: ${total} sellable items checked across 11 catalogues`);
  if (problems.length) {
    console.error("PROBLEMS:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log("COSMETICS OK — every sellable cosmetic resolves to a renderer, every particle animates, every reaction icon is real.");
} catch (e) {
  console.error("COSMETICS CHECK FAILED:", e.message);
  process.exit(1);
} finally { rmSync(out, { force: true }); }
