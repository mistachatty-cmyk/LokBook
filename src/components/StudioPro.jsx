// Lok Studio Pro — the advanced brush panel, opened from the ✦ button at the
// bottom right of the Studio canvas.
//
// Access is decided by SUBSCRIPTION ALONE (lokPass || ccTier). The device tier
// from engine/deviceTier.js only tunes quality — it never locks anything, so a
// cheap phone with a Pro subscription gets every control, just rendered within
// a smaller budget. Non-subscribers see the whole panel read-only rather than a
// blank wall: people should be able to see what they'd be buying.
//
// Rendered through createPortal to document.body. The Easel wrapper sets
// `overflow:hidden` and the pan/zoom layer sets a `transform`, either of which
// makes it the containing block for position:fixed descendants and traps the
// panel inside the canvas — the same trap documented for World in CLAUDE.md.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "../theme/theme.js";
import { SPEC_SECTIONS, DYNAMIC_CONTROLS, normalizeSpec, channel } from "../engine/brushSpec.js";
import { TIP_KEYS, TEXTURE_PATTERNS } from "../engine/brushTips.js";
import { createStrokeState, strokeTo } from "../engine/brushEngine.js";
import { deviceQuality } from "../engine/deviceTier.js";
import { BLENDS } from "../constants.jsx";

const CONTROL_KEYS = Object.keys(DYNAMIC_CONTROLS);
const CONTROL_LABEL = {
  off: "Off", pressure: "Pen Pressure", tilt: "Pen Tilt", twist: "Barrel Rotation",
  direction: "Direction", velocity: "Speed", fade: "Fade", random: "Random",
};

// --- small controls, styled off the app's theme tokens ----------------------

function Row({ label, children, T, hint }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] font-bold shrink-0" style={{ color: T.ink, width: 92, opacity: 0.8 }} title={hint}>{label}</span>
      <div className="flex-1 flex items-center gap-1.5 min-w-0">{children}</div>
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 1, step = 0.01, T, disabled, suffix = "%" }) {
  const pct = suffix === "%" ? Math.round(value * 100) : +value.toFixed(2);
  return (
    <>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={e => onChange(+e.target.value)}
        style={{ accentColor: T.accent, flex: 1, minWidth: 0, opacity: disabled ? 0.4 : 1 }} />
      <span className="text-[9px] font-bold tabular-nums shrink-0" style={{ color: T.ink, width: 34, textAlign: "right", opacity: 0.7 }}>
        {pct}{suffix === "%" ? "%" : ""}
      </span>
    </>
  );
}

function Picker({ value, onChange, options, T, disabled }) {
  return (
    <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
      className="text-[10px] font-bold rounded-full px-2 py-1 min-w-0 flex-1"
      style={{ border: `2px solid ${T.ink}`, background: T.card, color: T.ink, opacity: disabled ? 0.4 : 1 }}>
      {options.map(o => <option key={o} value={o}>{CONTROL_LABEL[o] || o}</option>)}
    </select>
  );
}

function Toggle({ on, onChange, label, T, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} aria-pressed={on} disabled={disabled}
      className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold"
      style={{ border: `2px solid ${on ? T.accent : T.ink}`, background: on ? T.ink : T.card, color: on ? T.paper : T.ink, opacity: disabled ? 0.4 : 1 }}>
      {label}
    </button>
  );
}

// A channel is amount + driver + floor. One editor, used by every jitter
// control in the panel — the UI mirror of evalChannel.
function ChannelEditor({ label, ch, onChange, T, disabled, showMin = false, minLabel = "Minimum" }) {
  const c = ch || channel();
  return (
    <>
      <Row label={label} T={T}>
        <Slider value={c.amount} onChange={v => onChange({ ...c, amount: v })} T={T} disabled={disabled} />
      </Row>
      <Row label="Control" T={T} hint="What drives this jitter">
        <Picker value={c.control} onChange={v => onChange({ ...c, control: v })} options={CONTROL_KEYS} T={T} disabled={disabled} />
      </Row>
      {showMin && (
        <Row label={minLabel} T={T} hint="The value never collapses past this floor">
          <Slider value={c.min || 0} onChange={v => onChange({ ...c, min: v })} T={T} disabled={disabled} />
        </Row>
      )}
    </>
  );
}

// --- the panel --------------------------------------------------------------

export default function StudioPro({ open, onClose, spec, onSpecChange, unlocked, proOn = false, onProOnChange, color = "#232C6B", size = 20, onUpsell, say }) {
  const T = useT();
  const [section, setSection] = useState("tip");
  const previewRef = useRef(null);
  const quality = useMemo(() => deviceQuality(), []);
  const s = useMemo(() => normalizeSpec(spec), [spec]);
  const locked = !unlocked;

  // Patch one section of the spec without clobbering the rest.
  const patch = useCallback((sectionKey, fields) => {
    if (locked) return;
    onSpecChange({ ...s, [sectionKey]: { ...s[sectionKey], ...fields } });
  }, [s, onSpecChange, locked]);

  // Live preview: draws a real S-curve stroke through the real engine, so what
  // you see is genuinely what the brush does — not a hand-drawn approximation
  // that can drift away from the engine's actual behaviour.
  useEffect(() => {
    if (!open) return;
    const cv = previewRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const st = createStrokeState(s, { seed: 4, quality });
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        pts.push([14 + t * (cv.width - 28), cv.height / 2 + Math.sin(t * Math.PI * 2) * (cv.height * 0.26)]);
      }
      for (let i = 1; i < pts.length; i++) {
        // Ramp pressure across the stroke so pressure-bound channels visibly do
        // something in the preview instead of sitting at a constant.
        const t = i / pts.length;
        strokeTo(ctx, st, pts[i - 1], pts[i], { pressure: 0.15 + t * 0.85, tiltX: 0, tiltY: 0, twist: 0, velocity: 0.5 },
          { size: Math.min(size, 26), color });
      }
    };
    if (quality.livePreview === "throttled") { const id = setTimeout(draw, 90); return () => clearTimeout(id); }
    draw();
  }, [open, s, color, size, quality]);

  if (!open) return null;

  const disabled = locked;
  const dualUnavailable = !quality.dualBrush;

  return createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 96, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)" }} />

      <div className="relative w-full" style={{
        maxWidth: 480, maxHeight: "88vh", background: T.paper, color: T.ink,
        border: `3px solid ${T.ink}`, borderBottom: "none", borderRadius: "20px 20px 0 0",
        boxShadow: `0 -8px 0 ${T.shadow}`, display: "flex", flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {/* header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: `2.5px solid ${T.ink}` }}>
          <div className="lok-display text-lg font-extrabold flex items-center gap-1.5">
            <span style={{ color: T.accent }}>✦</span> Lok Studio Pro
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ border: `1.5px solid ${T.ink}`, opacity: 0.65 }}
            title="Quality is tuned to this device. It never limits which controls you get.">
            {quality.tier} device
          </span>
          <button
            onClick={() => !locked && onProOnChange?.(!proOn)}
            aria-pressed={proOn} disabled={locked}
            title={proOn ? "Switch back to the classic brush engine" : "Paint with the Pro engine"}
            className="lok-btn ml-auto shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold"
            style={{
              border: `2px solid ${proOn ? T.accent : T.ink}`,
              background: proOn ? T.accent : T.card,
              color: proOn ? T.onAccent : T.ink,
              opacity: locked ? 0.4 : 1,
            }}>
            {proOn ? "ENGINE ON" : "ENGINE OFF"}
          </button>
          <button onClick={onClose} aria-label="Close Studio Pro"
            className="lok-btn w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0"
            style={{ border: `2px solid ${T.ink}`, background: T.card, color: T.ink }}>✕</button>
        </div>

        {locked && (
          <div className="mx-4 mt-2.5 p-2.5 rounded-xl text-[11px] font-bold leading-snug shrink-0"
            style={{ border: `2.5px dashed ${T.accent}`, background: T.card }}>
            <div className="text-xs mb-1">Studio Pro needs LokPass</div>
            <div style={{ opacity: 0.75, fontWeight: 600 }}>
              Look around — every control is here. Subscribe to actually paint with them.
            </div>
            {onUpsell && (
              <button onClick={onUpsell} className="lok-btn mt-2 px-3 py-1.5 rounded-full text-[11px] font-extrabold"
                style={{ background: T.accent, color: T.onAccent, border: `2px solid ${T.ink}` }}>
                Get LokPass
              </button>
            )}
          </div>
        )}

        {/* live preview — the real engine, not a mock */}
        <div className="px-4 pt-2.5 shrink-0">
          <canvas ref={previewRef} width={432} height={92} aria-label="Brush preview"
            className="rounded-xl w-full" style={{ border: `2.5px solid ${T.ink}`, background: T.card, height: 92 }} />
        </div>

        {/* section tabs */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 shrink-0" role="tablist" aria-label="Brush sections">
          {SPEC_SECTIONS.map(sec => (
            <button key={sec.key} onClick={() => setSection(sec.key)} role="tab" aria-selected={section === sec.key}
              className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{
                border: `2px solid ${section === sec.key ? T.accent : T.ink}`,
                background: section === sec.key ? T.ink : T.card,
                color: section === sec.key ? T.paper : T.ink,
              }}>
              <span aria-hidden="true">{sec.icon}</span>{sec.label}
            </button>
          ))}
        </div>

        {/* section body */}
        <div className="px-4 pb-4 overflow-y-auto" style={{ minHeight: 150 }}>
          {section === "tip" && (<>
            <Row label="Tip" T={T}><Picker value={s.tip.src} onChange={v => patch("tip", { src: v })} options={TIP_KEYS} T={T} disabled={disabled} /></Row>
            <Row label="Spacing" T={T} hint="Distance between dabs as a fraction of brush size. The core setting.">
              <Slider value={s.tip.spacing} onChange={v => patch("tip", { spacing: v })} min={0.01} max={2} T={T} disabled={disabled} />
            </Row>
            <Row label="Hardness" T={T}><Slider value={s.tip.hardness} onChange={v => patch("tip", { hardness: v })} T={T} disabled={disabled} /></Row>
            <Row label="Roundness" T={T}><Slider value={s.tip.roundness} onChange={v => patch("tip", { roundness: v })} min={0.05} max={1} T={T} disabled={disabled} /></Row>
            <Row label="Angle" T={T}><Slider value={s.tip.angle} onChange={v => patch("tip", { angle: v })} min={0} max={360} step={1} T={T} disabled={disabled} suffix="" /></Row>
            <Row label="Flip" T={T}>
              <Toggle on={s.tip.flipX} onChange={v => patch("tip", { flipX: v })} label="Flip X" T={T} disabled={disabled} />
              <Toggle on={s.tip.flipY} onChange={v => patch("tip", { flipY: v })} label="Flip Y" T={T} disabled={disabled} />
            </Row>
          </>)}

          {section === "shapeDynamics" && (<>
            <ChannelEditor label="Size Jitter" ch={s.shapeDynamics.sizeJitter} T={T} disabled={disabled} showMin minLabel="Min Diameter"
              onChange={v => patch("shapeDynamics", { sizeJitter: v, minDiameter: v.min ?? s.shapeDynamics.minDiameter })} />
            <ChannelEditor label="Angle Jitter" ch={s.shapeDynamics.angleJitter} T={T} disabled={disabled}
              onChange={v => patch("shapeDynamics", { angleJitter: v })} />
            <ChannelEditor label="Roundness" ch={s.shapeDynamics.roundnessJitter} T={T} disabled={disabled} showMin minLabel="Min Roundness"
              onChange={v => patch("shapeDynamics", { roundnessJitter: v, minRoundness: v.min ?? s.shapeDynamics.minRoundness })} />
            <Row label="Flip Jitter" T={T}><Slider value={s.shapeDynamics.flipJitter} onChange={v => patch("shapeDynamics", { flipJitter: v })} T={T} disabled={disabled} /></Row>
          </>)}

          {section === "scattering" && (<>
            <ChannelEditor label="Scatter" ch={s.scattering.scatter} T={T} disabled={disabled}
              onChange={v => patch("scattering", { scatter: v })} />
            <Row label="Both Axes" T={T}><Toggle on={s.scattering.bothAxes} onChange={v => patch("scattering", { bothAxes: v })} label={s.scattering.bothAxes ? "On" : "Off"} T={T} disabled={disabled} /></Row>
            <Row label="Count" T={T} hint={`Capped at ${quality.maxScatterCount} on this device`}>
              <Slider value={s.scattering.count} onChange={v => patch("scattering", { count: v })} min={1} max={16} step={1} T={T} disabled={disabled} suffix="" />
            </Row>
            <ChannelEditor label="Count Jitter" ch={s.scattering.countJitter} T={T} disabled={disabled}
              onChange={v => patch("scattering", { countJitter: v })} />
          </>)}

          {section === "texture" && (<>
            <Row label="Pattern" T={T}><Picker value={s.texture.pattern} onChange={v => patch("texture", { pattern: v })} options={TEXTURE_PATTERNS} T={T} disabled={disabled} /></Row>
            <Row label="Scale" T={T}><Slider value={s.texture.scale} onChange={v => patch("texture", { scale: v })} min={0.1} max={4} T={T} disabled={disabled} suffix="" /></Row>
            <ChannelEditor label="Depth" ch={s.texture.depth} T={T} disabled={disabled} showMin minLabel="Min Depth"
              onChange={v => patch("texture", { depth: v, minDepth: v.min ?? s.texture.minDepth })} />
            <Row label="Per Tip" T={T} hint="Re-sample the texture for every dab instead of once per stroke">
              <Toggle on={s.texture.eachTip} onChange={v => patch("texture", { eachTip: v })} label={s.texture.eachTip ? "On" : "Off"} T={T} disabled={disabled} />
              <Toggle on={s.texture.invert} onChange={v => patch("texture", { invert: v })} label="Invert" T={T} disabled={disabled} />
            </Row>
          </>)}

          {section === "dualBrush" && (<>
            {dualUnavailable && (
              <div className="text-[10px] font-bold mb-1.5 p-2 rounded-lg" style={{ border: `2px dashed ${T.ink}`, opacity: 0.7 }}>
                Dual Brush is off on this device — it needs a second composite pass per dab.
                Your settings are still saved and will apply on a faster device.
              </div>
            )}
            <Row label="Enabled" T={T}><Toggle on={s.dualBrush.enabled} onChange={v => patch("dualBrush", { enabled: v })} label={s.dualBrush.enabled ? "On" : "Off"} T={T} disabled={disabled} /></Row>
            <Row label="Tip" T={T}><Picker value={s.dualBrush.tip} onChange={v => patch("dualBrush", { tip: v })} options={TIP_KEYS} T={T} disabled={disabled} /></Row>
            <Row label="Mode" T={T}><Picker value={s.dualBrush.mode} onChange={v => patch("dualBrush", { mode: v })} options={BLENDS} T={T} disabled={disabled} /></Row>
            <Row label="Size" T={T}><Slider value={s.dualBrush.size} onChange={v => patch("dualBrush", { size: v })} min={0.05} max={2} T={T} disabled={disabled} /></Row>
            <Row label="Scatter" T={T}><Slider value={s.dualBrush.scatter} onChange={v => patch("dualBrush", { scatter: v })} min={0} max={2} T={T} disabled={disabled} /></Row>
            <Row label="Count" T={T}><Slider value={s.dualBrush.count} onChange={v => patch("dualBrush", { count: v })} min={1} max={8} step={1} T={T} disabled={disabled} suffix="" /></Row>
          </>)}

          {section === "colorDynamics" && (<>
            <ChannelEditor label="Hue Jitter" ch={s.colorDynamics.hueJitter} T={T} disabled={disabled} onChange={v => patch("colorDynamics", { hueJitter: v })} />
            <ChannelEditor label="Saturation" ch={s.colorDynamics.satJitter} T={T} disabled={disabled} onChange={v => patch("colorDynamics", { satJitter: v })} />
            <ChannelEditor label="Brightness" ch={s.colorDynamics.brightJitter} T={T} disabled={disabled} onChange={v => patch("colorDynamics", { brightJitter: v })} />
            <Row label="Purity" T={T}><Slider value={s.colorDynamics.purity} onChange={v => patch("colorDynamics", { purity: v })} min={-1} max={1} T={T} disabled={disabled} /></Row>
          </>)}

          {section === "transfer" && (<>
            <Row label="Opacity" T={T}><Slider value={s.transfer.opacity} onChange={v => patch("transfer", { opacity: v })} T={T} disabled={disabled} /></Row>
            <ChannelEditor label="Opacity Jit." ch={s.transfer.opacityJitter} T={T} disabled={disabled} showMin onChange={v => patch("transfer", { opacityJitter: v })} />
            <Row label="Flow" T={T}><Slider value={s.transfer.flow} onChange={v => patch("transfer", { flow: v })} T={T} disabled={disabled} /></Row>
            <ChannelEditor label="Flow Jitter" ch={s.transfer.flowJitter} T={T} disabled={disabled} showMin onChange={v => patch("transfer", { flowJitter: v })} />
          </>)}

          {section === "flags" && (<>
            <div className="flex flex-wrap gap-1.5 py-1">
              <Toggle on={s.flags.noise} onChange={v => patch("flags", { noise: v })} label="Noise" T={T} disabled={disabled} />
              <Toggle on={s.flags.wetEdges} onChange={v => patch("flags", { wetEdges: v })} label="Wet Edges" T={T} disabled={disabled} />
              <Toggle on={s.flags.buildUp} onChange={v => patch("flags", { buildUp: v })} label="Build-up" T={T} disabled={disabled} />
              <Toggle on={s.flags.smoothing} onChange={v => patch("flags", { smoothing: v })} label="Smoothing" T={T} disabled={disabled} />
              <Toggle on={s.flags.protectTexture} onChange={v => patch("flags", { protectTexture: v })} label="Protect Texture" T={T} disabled={disabled} />
            </div>
            <div className="text-[10px] font-bold mt-2 leading-snug" style={{ opacity: 0.6 }}>
              This device draws up to {quality.maxDabsPerStroke.toLocaleString()} dabs per stroke
              at {quality.textureRes}px texture detail. Longer strokes stop adding dabs rather than stuttering.
            </div>
          </>)}
        </div>
      </div>
    </div>
  ), document.body);
}
