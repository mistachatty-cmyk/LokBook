# LOK ?ECOSYSTEM — Fable Beta Build Plan v2
> **⚠️ STATUS NOTICE (July 2026):** Nearly everything in this document has already been built by Claude directly on `lok_live.jsx`. Do not use this as a build checklist. For current, accurate status, use **`FABLE_HANDOFF.md`** — it has a grep-verified DONE/OPEN table and the short real remaining backlog. This file is kept only as a reference for the original code-level spec/reasoning behind each feature, in case Fable wants implementation detail on something already built.

**Owner:** IWEU  
**Last updated:** July 2026 — added Economy, LilLok communication, and Decay redesign  
**Files:** `lok_live.jsx` (prototype) · `lok_ecosystem_v2.jsx` (backup)  
**Previous plan:** superseded — this is the canonical doc

---

## What's being added in this revision

Three new systems added on top of the existing work orders:

1. **Economy depth** — Loks need to feel like a real creative currency with clear earning paths, spending reasons, and enough texture that players make meaningful decisions about how they spend.
2. **LilLok communication system** — Blot should talk to you. During matches, while scrolling the feed, when you tap the FAB, when things happen. Context-aware lines. Not random noise — reactive dialogue.
3. **LilLok decay redesign** — The current decay is a dumb 2-point timer. It needs to make logical sense: different actions drain differently, bond provides a buffer, and recovery is meaningful. Players should understand why Blot is fading and exactly what to do about it.

---

## SECTION A — Fix what the audit lied about
*(Unchanged from v1 — included here for single-source completeness)*

### A1. Toast queue — replace single toast with stacked system
**Problem:** `setToast(m)` overwrites one message. No stack, no types, no history.

```js
// State
const [toasts, setToasts] = useState([]);

// Push
const say = useCallback((msg, type = 'default') => {
  const id = Date.now() + Math.random();
  setToasts(t => [...t.slice(-2), { id, msg, type }]);
  setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
}, []);

// Render — above nav
<div className="fixed left-1/2 z-50 flex flex-col-reverse gap-2 items-center pb-2"
  style={{ bottom: 88, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
  {toasts.map((t, i) => (
    <div key={t.id} style={{
      background: t.type === 'success' ? T.alt : t.type === 'error' ? '#C23B22' : T.ink,
      color: T.paper, border: `2.5px solid ${t.type === 'success' ? T.alt : T.accent}`,
      borderRadius: 14, padding: '8px 16px', fontWeight: 700, fontSize: 13,
      animation: 'lokrise .2s ease', opacity: 1 - i * 0.18,
      transform: `scale(${1 - i * 0.04}) translateY(${i * -4}px)`,
      maxWidth: '88vw', textAlign: 'center', whiteSpace: 'nowrap'
    }}>{t.msg}</div>
  ))}
</div>
```

**Type mapping for existing calls:**
- vote, publish, win → `'success'`
- Need N Loks, error states → `'error'`
- Everything else → `'default'`

---

### A2. Gallery search
Add to `Profile` above filter pills:
```js
const [searchQ, setSearchQ] = useState('');
const filtered = useMemo(() => [...posts]
  .filter(p => !searchQ || p.title?.toLowerCase().includes(searchQ.toLowerCase())
    || p.style?.toLowerCase().includes(searchQ.toLowerCase()))
  .sort(...)
  .filter(...), [posts, searchQ, filter]);
```
Input: `placeholder="Search your flips…"` · Empty result: `EmptyState({ icon: 'search', title: 'No flips match' })`

---

### A3. Quest milestones (10 / 25 / 50 / 100 completions)
```js
const [questsCompleted, setQuestsCompleted] = useState(0);

// In questTick(), when a quest marks done:
const newTotal = questsCompleted + 1;
setQuestsCompleted(newTotal);
const milestone = [10, 25, 50, 100].find(m => newTotal === m);
if (milestone) {
  const bonus = milestone * 2;
  addLoks(bonus); gainXp(bonus);
  say(`${milestone} quests done · +${bonus} bonus Loks`, 'success');
  hap([200, 100, 200, 100, 200]);
}
```
Show in Profile: `{questsCompleted} quests · next milestone at {nextMilestone}`.  
Persist in SAVE_KEY.

---

### A4. Weekly prompt filter
```js
const weekOfYear = d => Math.ceil((((d - new Date(d.getFullYear(),0,1))/86400000)+1)/7);
const WEEKLY_PROMPT = PROMPTS[(new Date().getFullYear()*53 + weekOfYear(new Date())) % PROMPTS.length];
```
Tag published posts: `weeklyPrompt: daily.prompt === WEEKLY_PROMPT ? WEEKLY_PROMPT : null`  
Profile gallery pill: `["weekly","This week"]` → filter `p.weeklyPrompt === WEEKLY_PROMPT`

---

### A5. Keyboard shortcuts for Studio/Easel
Add keydown listener inside Easel's forwardRef (exits early if INPUT/TEXTAREA focused):
`b`=pen · `e`=eraser · `f`=fill (Pro) · `i`=eyedrop (Pro) · `[`/`]`=size±2 · `⌘Z`=undo · `⌘⇧Z`=redo · `?`=overlay  
Shortcut overlay: modal inside canvas area, dark semi-transparent, dismisses on click.

---

### A6. Symmetry modes
Replace `mirror` boolean with `symmetry` string: `'none' | 'mirrorX' | 'mirrorY' | 'quad' | 'radial4' | 'radial6' | 'radial8'`  
In `stamp()`:
- `mirrorX` → reflect across `x = W/2`
- `mirrorY` → reflect across `y = H/2`  
- `quad` → both mirrors
- `radialN` → rotate point N times around center, paint each rotation

Replace "Mirror" toggle with a `<select>` in Pro toolbar.

---

### A7. Trace Rush first-play tutorial
Gate lobby with a one-time overlay (`traceHinted` in save state). Show three panels: ghost shape → ink trace → score. Dismiss persists. Never shown again.

---

### A8. Battle format visual cards
Extend FORMATS with `icon` and `mood` fields. Render as staggered cards with `animation: lokrise .3s ease Ns both` delay per card. Show icon (22px), label bold, mood small/muted, player count + time badge.

---

## SECTION B — LilLok system rebuild
*(Expanded in this revision)*

---

### B1. LILLOK_SPEECH pool — context-aware dialogue engine

Replace the placeholder phaseText strings with a real line system. Full pool:

```js
const LILLOK_SPEECH = {
  // Phase-based (default)
  thriving: [
    'Feeling inky today',
    'Drawing energy: full',
    'I see good lines ahead',
    'Ready to blot the world',
    'Peak ink. Peak vibes.',
    'Bond level: legendary',
    'Full tank. Let\'s draw.',
    'I could splat anything right now',
    'This is what thriving looks like',
    'Ink flowing, heart glowing',
  ],
  decaying: [
    '...ink low',
    'Getting a little dry here',
    'I need a top-up',
    'My lines are getting thin',
    'Fading fast...',
    'Running on fumes',
    'Don\'t let me grey out',
    'One drop would change everything',
    'I\'m not mad, just... fading',
    'The colors are going grey',
  ],
  stasis: [
    'Zzz...',
    '...I was dreaming of ink',
    'So... cold...',
    'Revival sketch, please',
    'Been a while.',
    'Still here. Barely.',
    'The bond held. Just wake me up.',
    'Everything is grey and far away',
  ],

  // Context triggers (used when ctx arg is passed)
  win: [
    'WE WON!!!',
    'That\'s what ink looks like!',
    'Unstoppable. Period.',
    'I told you we were good',
    'Nobody out-draws us',
  ],
  loss: [
    'Next time.',
    'We learned something.',
    'We\'ll get them.',
    'Draw more, fear less.',
  ],
  vote_received: [
    'Someone voted for your work!',
    'They felt it.',
    'Your line just landed',
    'That one resonated',
  ],
  publish: [
    'It\'s out there now',
    'The world can flip it',
    'I\'m proud of that one',
    'That took something',
  ],
  battle_start: [
    'Let\'s go. Draw fast.',
    'I\'m watching your lines',
    'Make every stroke count',
    'You\'ve got this',
  ],
  feed_scroll: [
    'Good art in the feed today',
    'Keep scrolling, keep seeing',
    'Something in here will spark you',
    'This is where the ideas live',
  ],
  morning: [
    'Good morning. First lines of the day.',
    'Morning ink hits different',
    'Fresh paper. Fresh start.',
  ],
  evening: [
    'Late-night drawing session?',
    'Best lines come after dark',
    'Stars and sketches',
  ],
  streak: [
    'You\'re on a streak — keep going',
    'Daily habit. Daily ink.',
    'Consistency is the whole thing',
  ],
  low_loks: [
    'Earn more Loks — vote, draw, win',
    'The economy needs your lines',
    'Loks come from making things',
  ],
  quest_done: [
    'Quest complete!',
    'You did what you said you would',
    'Keep drawing, keep earning',
  ],
};

function getLilLokLine(phase = 'thriving', ctx = '') {
  // Time-aware overrides
  if (!ctx) {
    const h = new Date().getHours();
    if (h >= 5 && h < 10 && phase === 'thriving') ctx = 'morning';
    if (h >= 21 && phase === 'thriving') ctx = 'evening';
  }
  const pool = (ctx && LILLOK_SPEECH[ctx]) ? LILLOK_SPEECH[ctx] : (LILLOK_SPEECH[phase] || LILLOK_SPEECH.thriving);
  return pool[Math.floor(Math.random() * pool.length)];
}
```

---

### B2. Speech bubble component

```jsx
function LilLokBubble({ text, side = 'above', ink = ART.ink, paper = ART.paper }) {
  if (!text) return null;
  const isAbove = side === 'above';
  return (
    <div style={{
      position: 'absolute',
      [isAbove ? 'bottom' : 'top']: '105%',
      left: '50%', transform: 'translateX(-50%)',
      background: paper, border: `2.5px solid ${ink}`,
      borderRadius: 12, padding: '5px 11px',
      fontSize: 11, fontWeight: 700, color: ink,
      boxShadow: `2px 2px 0 ${ink}`,
      animation: 'lokrise .2s ease',
      whiteSpace: 'normal', maxWidth: 180, textAlign: 'center',
      zIndex: 99, pointerEvents: 'none', fontFamily: "'Bricolage Grotesque', sans-serif",
    }}>
      {text}
      {/* Tail pointing down toward character */}
      <div style={{
        position: 'absolute',
        [isAbove ? 'bottom' : 'top']: isAbove ? -9 : -9,
        left: '50%', transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        [isAbove ? 'borderTop' : 'borderBottom']: `9px solid ${ink}`,
      }}/>
      <div style={{
        position: 'absolute',
        [isAbove ? 'bottom' : 'top']: isAbove ? -6 : -6,
        left: '50%', transform: 'translateX(-50%)',
        borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
        [isAbove ? 'borderTop' : 'borderBottom']: `7px solid ${paper}`,
      }}/>
    </div>
  );
}
```

---

### B3. LilLok communication surfaces — where Blot speaks

**Three surfaces. All use `getLilLokLine()`. All are opt-out (reduceMotion skips animation but text still shows).**

#### Surface 1: FAB bubble (idle + contextual)
```jsx
// In LokApp, near the FAB button:
const [fabBubble, setFabBubble] = useState('');
const showFabBubble = useCallback((ctx = '') => {
  setFabBubble(getLilLokLine(phase, ctx));
  setTimeout(() => setFabBubble(''), 3500);
}, [phase]);

// Show on mount after 4s delay
useEffect(() => {
  const t = setTimeout(() => showFabBubble(), 4000);
  return () => clearTimeout(t);
}, []);

// Rotate every 60s while not in panel
useEffect(() => {
  const interval = setInterval(() => {
    if (!showLilLok) showFabBubble();
  }, 60000);
  return () => clearInterval(interval);
}, [showLilLok, phase]);

// Trigger from outside (pass showFabBubble as prop where needed):
// After win:       showFabBubble('win')
// After publish:   showFabBubble('publish')
// After quest:     showFabBubble('quest_done')
// Vote received:   showFabBubble('vote_received')
// Low Loks (<30):  showFabBubble('low_loks')

// FAB render:
<div className="relative" style={{ display: 'inline-block' }}>
  {fabBubble && <LilLokBubble text={fabBubble} ink={T.ink} paper={T.paper}/>}
  <button ...>
    <LilLokSprite .../>
  </button>
</div>
```

#### Surface 2: During Battle (mid-match commentary)
Pass `onLilLokLine` callback from LokApp into Battle. Battle calls it at key moments:
```js
// In Battle, inside the draw phase timer effect:
if (matchT.current === 5)  onLilLokLine('battle_start');
if (matchT.current === 30) onLilLokLine(phase === 'thriving' ? 'battle_start' : 'decaying');
if (timeLeft <= 5 && timeLeft > 0 && matchT.current % 2 === 0) {
  // Countdown encouragement — no ctx, just phase default
  onLilLokLine();
}

// On block:
const doBlock = () => {
  ...existing block logic...
  onLilLokLine(phase === 'thriving' ? 'win' : undefined);
};

// On intervention landing (unblocked):
onLilLokLine(phase === 'decaying' ? 'decaying' : undefined);
```
`onLilLokLine` in LokApp: `(ctx) => showFabBubble(ctx)` — reuses the same bubble system.

#### Surface 3: Feed scroll commentary
When the user scrolls to a new post (active card changes), occasionally show a line:
```js
// In Feed, in the onScroll handler:
if (i !== active && Math.random() < 0.25) {
  onLilLokLine('feed_scroll'); // pass this down from LokApp
}
```
Show rate: 25% of card changes. Not every scroll — that would be exhausting.

#### Surface 4: Panel care tab
```jsx
// In LilLokPanel, care mode:
const [panelLine, setPanelLine] = useState(() => getLilLokLine(phase));

// After feeding:
const handleFeed = (amt) => {
  onFeed(amt);
  setPanelLine(getLilLokLine('thriving'));
  setFeeding(true); // triggers B5 particle burst
  setTimeout(() => setFeeding(false), 700);
};

// Render below the bar meters:
<div className="mt-2 text-sm font-bold" style={{ color: T.alt, fontStyle: 'italic' }}>
  "{panelLine}"
</div>
```

---

### B4. Ink level fill on sprite body

Inside `LilLokSprite` SVG — clip a teal fill to the body ellipse showing ink level visually:
```jsx
<defs>
  <clipPath id={`blotClip${size}`}>
    <ellipse cx={48} cy={48} rx={28} ry={30}/>
  </clipPath>
</defs>
{!stone && (
  <rect
    clipPath={`url(#blotClip${size})`}
    x={20}
    y={48 + 30 * (1 - Math.max(0, Math.min(100, ink)) / 100)}
    width={58} height={60}
    fill={phase === 'decaying' ? '#6E80B0' : ART.teal}
    opacity={0.30}
  />
)}
```
At 100% ink → rect starts at y=18, fills whole body. At 0% → rect starts at y=78, body empty. Visible, legible, no text needed.

---

### B5. Feed particle burst on Quick Drop
```jsx
const [feeding, setFeeding] = useState(false);

// In care mode render, wrap sprite:
<div style={{ position: 'relative', display: 'inline-block',
  transform: feeding ? 'scale(1.1)' : 'scale(1)',
  transition: 'transform .15s cubic-bezier(.34,1.56,.64,1)' }}>
  <LilLokSprite .../>
  {feeding && [0,1,2].map(i => (
    <div key={i} style={{
      position: 'absolute', bottom: '90%', left: `${25 + i * 25}%`,
      fontSize: 16, animation: `lokfloat .65s ease-out ${i * 0.1}s forwards`,
      pointerEvents: 'none', userSelect: 'none',
    }}>💧</div>
  ))}
</div>
```

---

### B6. Stasis Zzz sleep indicators + closed eyes
Replace open dot eyes with closed-line eyes in stasis; add rising Z glyphs:
```jsx
{stone && (
  <>
    {/* Closed eyes */}
    <path d="M33 50 Q38 46 43 50" fill="none" stroke={ART.ink} strokeWidth="3" strokeLinecap="round"/>
    <path d="M53 50 Q58 46 63 50" fill="none" stroke={ART.ink} strokeWidth="3" strokeLinecap="round"/>
    {/* Rising Zzz — staggered size and opacity */}
    <text x={66} y={37} fontSize={9}  fill={ART.ink} opacity={0.35} fontWeight="700">z</text>
    <text x={73} y={27} fontSize={12} fill={ART.ink} opacity={0.60} fontWeight="700">Z</text>
    <text x={81} y={16} fontSize={15} fill={ART.ink} opacity={0.85} fontWeight="700">Z</text>
  </>
)}
// Remove the circle eyes (cx={38}/cx={58}) when stone === true
```

---

### B7. Decay wobble variant on panel
Add to GlobalStyle:
```css
@keyframes lokwobble {
  0%,92%,100% { transform: translate(0,0); }
  93% { transform: translate(-2px, 1px) rotate(-.15deg); }
  95% { transform: translate(1.5px, -1px) rotate(.15deg); }
  97% { transform: translate(-1px, 0.5px); }
}
```
Apply to `LilLokPanel`'s outer div:
```jsx
animation: phase === 'decaying' && !reduceMotion ? 'lokwobble 9s ease-in-out infinite' : 'lokrise .25s ease'
```
Border color also shifts when decaying: `border: 3px solid ${phase === 'decaying' ? '#8E93A8' : T.ink}`

---

## SECTION C — LilLok Decay Redesign
*New in this revision. The current decay is a flat 2-point drain every 12s. It needs a model that players can understand and respond to.*

---

### C1. The new decay model

**Core idea:** Ink is a resource that drains from active use and passive time. Bond is a reserve that slows the drain. Recovery is earned through creation, not just feeding.

**Replace the current LilLok state with:**
```js
const [lillok, setLillok] = useState({
  ink: 80,          // 0–100. Visual fill. Falls to 0 → stasis
  bond: 30,         // 0–100. Accumulated trust. Slows decay. Doesn't drain on its own.
  stasis: false,    // true when ink hits 0 for >2 minutes
  name: 'Blot',
  lastSeen: Date.now(),
  totalDrawn: 0,    // cumulative pages captured — for bond growth
  lastFed: null,    // Date of last ink top-up — affects recovery quality
});
```

**Decay rates (replace the flat 2/12s):**
```js
// In the decay interval (keep the visibilitychange guard):
setLillok(s => {
  if (s.stasis) return s;
  
  // Bond provides a buffer — at full bond, drain is halved
  const bondBuffer = 1 - (s.bond / 100) * 0.5; // 0.5 → 1.0 multiplier
  
  // Base drain: 1 ink per 10s (prototype scale)
  // Real-world intent: 1 ink per ~20min of idle time
  const drain = 1 * bondBuffer;
  
  const newInk = Math.max(0, s.ink - drain);
  const goesStasis = newInk === 0 && s.ink > 0;
  
  return {
    ...s,
    ink: newInk,
    stasis: s.stasis || goesStasis,
  };
});
```

**Active use also drains ink (makes the relationship feel real):**
```js
// Each battle draw session: -6 ink (existing, keep)
// Each Rush round played:   -3 ink
// Each capture in Studio:   -1 ink (drawing is nourishing but still costs)
// Viewing 10 posts:         -1 ink (passive, small)
```
Add the Studio capture drain to `capture()` in Studio:
```js
// After setFrames() push:
// (pass setLillok as prop, or lift this up to LokApp via onCapture callback)
onCapture?.(); // LokApp's handler: setLillok(s => ({...s, ink: Math.max(0, s.ink - 1)}))
```

**Bond grows from:**
```js
// Each page published:        bond +3
// Each battle played:         bond +2
// Each day streak claimed:    bond +5
// Each quest completed:       bond +2
// Each Revival sketch done:   bond +8 (the deepest bond act)
// Cap at 100. Bond never decays on its own — it's earned trust.
```
Add these to the relevant event handlers in LokApp.

---

### C2. Recovery model — what feeding actually does

**Current:** `onFeed(amt)` just adds `amt` to ink, +6 bond. No context.

**New:** Recovery quality depends on what you do, not just "quick drop":
```js
// Quick ink drop (Loks-free in panel): +20 ink
// Quick drop after just drawing:       +30 ink (drawing makes recovery richer)
// Revival sketch (2+ pages):           ink to min(90, current + 30 + pages*6), stasis cleared
// Publishing a new flip:               +10 ink, +3 bond (creation nourishes)
// Claiming daily streak:               +15 ink, +5 bond
// Winning a battle:                    +5 ink (victory gives a little energy)
// Completing a quest:                  +8 ink, +2 bond

// After stasis — ink restores to 40 max on first revival, not 80
// (recovering from stasis should feel like waking up slowly, not snapping back)
const revivedInk = Math.min(40, currentInk + recoveryAmt);
```

**Update `feedLilLok` in LokApp:**
```js
const feedLilLok = useCallback((amt = 20, ctx = 'direct') => {
  setLillok(s => {
    // If waking from stasis, cap recovery at 40
    const maxRecover = s.stasis ? 40 : 100;
    const actualGain = ctx === 'revival' ? Math.min(maxRecover, s.ink + amt) - s.ink : amt;
    return {
      ...s,
      ink: Math.min(maxRecover, s.ink + actualGain),
      bond: Math.min(100, s.bond + (ctx === 'revival' ? 8 : ctx === 'creation' ? 3 : 2)),
      stasis: false,
      lastSeen: Date.now(),
      lastFed: Date.now(),
    };
  });
  hap([40]);
}, [hap]);
```

---

### C3. Stasis — make it meaningful, not punishing

**Current:** Stasis triggers at `gap > 60000` (1 min). Recovery just calls `setLillok(s => ({...s, stasis: false}))`.

**Problems:** 1 minute is too fast to feel earned. Recovery is instant. Nothing communicates *why* stasis happened or what it means for gameplay.

**New stasis model:**

```js
// Stasis triggers when ink reaches 0 (not time-based)
// In the decay interval, when newInk === 0 and s.ink > 0:
if (goesStasis) {
  // Don't trigger stasis immediately — give a 2-minute grace period
  // (use a ref timestamp, check in next tick)
  if (!s.inkZeroAt) return { ...s, ink: 0, inkZeroAt: Date.now() };
  if (Date.now() - s.inkZeroAt > 120000) { // 2 minutes at 0 ink
    return { ...s, ink: 0, stasis: true, inkZeroAt: null };
  }
}
```

Add `inkZeroAt` to the lillok state object.

**What stasis does to gameplay:**
- Battle: Match Interventions fire twice as often, LilLok can't deflect any
- Rush: No accuracy bonus (normally thriving LilLok adds 5% to score floor)
- Feed: FAB shows red border + urgent speech line, not just grey

**What communicates "ink is running low":**
```
ink > 60: thriving — green fill, normal bob
ink 35–60: fading — yellow/amber fill, slower bob
ink < 35: decaying — blue-grey fill, muted bob  ← lilLokPhase threshold
ink < 15: critical — pulsing border on FAB, urgent speech every 30s
ink === 0 (grace): very slow animation, speech lines go quiet
stasis: no animation, Zzz, grey, speech only when tapped
```

Add a `critical` sub-state to `lilLokPhase`:
```js
function lilLokPhase(s) {
  if (s.stasis) return 'stasis';
  if (s.ink === 0) return 'stasis'; // inkZeroAt grace period treated as stasis visually
  if (s.ink < 15) return 'critical'; // new phase
  if (s.ink < 35) return 'decaying';
  return 'thriving';
}
```

In `LilLokSprite`, handle `critical` phase:
```jsx
// critical: body grey, mouth turned slightly down (not fully frown), eyes smaller, border pulses
const critical = phase === 'critical';
const grey = phase === 'decaying' || critical;
const body = stone ? '#9A9286' : grey ? '#8E93A8' : ART.pink;
const eyeR = stone ? 2 : (grey || critical) ? 3.5 : 5;
// critical mouth: slightly sad but not fully inverted
{phase === 'critical' && <path d="M39 65 Q48 62 59 65" fill="none" stroke={ART.ink} strokeWidth="3.5" strokeLinecap="round"/>}
```

FAB border when critical:
```jsx
border: `3px solid ${phase === 'critical' ? T.accent : phase === 'decaying' ? '#8E93A8' : phase === 'stasis' ? '#9A9286' : T.accent}`
// Also: pulsing animation on FAB when critical
animation: phase === 'critical' ? 'lokpulse 2s ease-in-out infinite' : 'none'
```

---

### C4. Panel decay feedback — make the care tab informative

**Current care tab:** Two bars (Ink, Bond). Phase text. "Quick ink drop" button.

**New care tab layout:**
```jsx
// Status header with emotional context
<div className="mt-2 rounded-xl p-3" style={{ 
  background: phase === 'critical' ? 'rgba(200,50,50,.08)' : 
              phase === 'decaying' ? 'rgba(142,147,168,.08)' : 'rgba(47,169,160,.08)',
  border: `1.5px solid ${phase === 'thriving' ? T.alt : '#8E93A8'}` }}>
  <div className="font-bold text-sm">{
    phase === 'thriving' ? `${lillok.name} is thriving` :
    phase === 'critical' ? `${lillok.name} is about to go quiet` :
    phase === 'decaying' ? `${lillok.name} is drying out` :
    `${lillok.name} is in stasis`
  }</div>
  <div className="text-xs opacity-70 mt-0.5">{
    phase === 'thriving' ? 'Interventions stronger · Loks flow easier · Keep drawing' :
    phase === 'critical' ? 'Feed ink now or matches will become harder' :
    phase === 'decaying' ? 'Bond slows the drain. Draw something to nourish it.' :
    'Bond held through stasis. Start a Revival Sketch to wake up.'
  }</div>
</div>

// Ink bar (now shows 4 zones with color)
// Bond bar with tooltip: "Bond slows ink drain. Grows when you create."

// Ink drop options (tiered, not just one button)
<div className="mt-3 grid grid-cols-2 gap-2">
  <button onClick={() => handleFeed(20)} style={...}>
    <div className="font-bold text-sm">Quick drop</div>
    <div className="text-xs opacity-70">+20 ink · free</div>
  </button>
  <button onClick={() => handleFeed(40)} style={...} disabled={loks < 10}>
    <div className="font-bold text-sm">Ink flask</div>
    <div className="text-xs opacity-70">+40 ink · 10 Loks</div>
  </button>
</div>
// Pass loks down to panel as prop. Ink flask spends Loks for bigger recovery.
// Kids mode: only quick drop, no Loks gate.
```

---

## SECTION D — Economy depth
*New in this revision.*

---

### D1. Current economy — what's broken

The current Lok economy has three problems:

1. **Earning feels invisible.** +3 Loks for a view, +5 for a vote — numbers appear in toasts but nothing tracks total earned vs spent. Players have no sense of whether they're doing well.
2. **Spending is meaningless.** Shop items feel like arbitrary gates, not choices. Nothing costs feels connected to what you're doing.
3. **The rate guard is too conservative.** 50 Loks/hour feels punishing on first use. A new user who votes 10 times in the first session earns 50 Loks and then stops. That's a bad first impression.

---

### D2. Earning paths — make them clear and layered

**Replace the current earn events with a structured table:**

```js
// EARN RATES (all go through guardedAddLoks — rate guard stays)
const EARN = {
  // Attention economy (small, frequent)
  view_complete:   3,   // slide through a whole flip
  vote:            5,   // vote on a piece
  bookmark:        2,   // bookmark a piece
  lok_artist:      3,   // follow/Lok someone

  // Creation (medium, intentional)
  publish:         25,  // publish a flip to gallery
  battle_win:      25,  // win a battle
  battle_play:     5,   // just playing (show up matters)
  rush_1st:        15,  // first place in Rush
  rush_top_half:   6,   // top half in Rush
  rush_played:     1,   // participation
  daily_claim:     10,  // plus streak bonus up to +35 more

  // Passive (your content earns for you)
  your_post_voted: 5,   // someone votes on your work
  your_post_viewed:2,   // someone completes your flip

  // Quests (bonus layer)
  quest_reward:    15–25, // per quest (existing)
  quest_milestone: 20–200, // 10/25/50/100 completions (A3)
};
```

**Rate guard update:** Raise the cap from 50/hour to 120/hour. New users should feel rewarded for exploring, not blocked after 10 actions. At 120/hour the ceiling is still real (you can't farm), but it doesn't hit first-session users.

```js
if (earnLog.current.total + n > 120) { // was 50
  console.warn('[Lok] earn rate limit hit');
  return;
}
```

**Earning for your content** — currently there's no passive earn for your own published posts. Add to the vote/view handlers:
```js
// In onVote handler:
// If the post being voted on is a seed post (from:'studio' and authored by profile.name),
// the creator earns. In prototype, "moss.ink" is the creator of seed posts.
// Wire: pushNotif('Someone voted on your flip · +5 Loks', 'success') + addLoks(5)
```

---

### D3. Spending — give Loks a reason to exist

**Current shop prices are static. Add a few things that make Loks feel more like a currency:**

**New spendable actions (add to LokApp, not just Shop):**

```js
// 1. Ink flask for LilLok (in panel) — D.2 above wires this
//    Cost: 10 Loks · Reward: +40 ink · Context: care for your companion

// 2. Boost a post (in Viewer, own posts only)
//    Cost: 20 Loks · Effect: post shows first in discover feed for 24h (prototype: just move to top of posts array)
//    UI: "Boost" button in Viewer bottom bar when it's your post

// 3. Wager on Rush rounds (existing, but show net P&L clearly)
//    In Rush results, show: "Staked 10 · Won 18 · Net +8 Loks" in a bold badge

// 4. Big Battle unlock (existing — 50 Loks, keep)

// 5. Extra Revival pages (in LilLok panel revive tab)
//    Cost: 15 Loks · Effect: increase REVIVAL_MAX from 14 to 24 for this session
```

---

### D4. Loks balance as a visible indicator

**Current:** Balance shows in the header (number next to Lok icon). That's it.

**Add to Profile tab:**
```jsx
// Below the XP bar, add a "Lok activity" section:
<section className="mt-3 p-3 rounded-2xl" style={{ border: `2px solid ${T.shadow}`, background: T.card }}>
  <div className="lok-display font-extrabold text-sm mb-2">Loks</div>
  <div className="flex items-center justify-between">
    <div className="text-center">
      <div className="lok-display font-extrabold text-xl" style={{ color: T.accent }}>{loks}</div>
      <div className="text-[11px] opacity-60">balance</div>
    </div>
    <div className="text-center">
      <div className="lok-display font-extrabold text-xl">{totalEarned}</div>
      <div className="text-[11px] opacity-60">earned all-time</div>
    </div>
    <div className="text-center">
      <div className="lok-display font-extrabold text-xl">{questsCompleted}</div>
      <div className="text-[11px] opacity-60">quests done</div>
    </div>
  </div>
</section>
```
Add `totalEarned` to state (running total, never decrements). Persist in SAVE_KEY.

---

### D5. Daily streak — make it do more

**Current:** Streak gives `10 + Math.min(streak, 7) * 5` Loks. Max 45 at 7-day streak. LilLok gets +20 ink.

**Improvements:**
```js
// Streak rewards — more meaningful at milestones
const claimBonus = (streak) => {
  const base = 10 + Math.min(streak, 7) * 5;      // 10→45 (unchanged)
  const milestone = streak % 7 === 0 ? 20 : 0;    // +20 every full week
  const monthBonus = streak % 30 === 0 ? 100 : 0; // +100 at 30-day streaks
  return base + milestone + monthBonus;
};

// Streak also feeds LilLok meaningfully (show this):
// +15 ink (up from +20 but with more explanation)
// +5 bond
// Say: "Day ${streak} streak · +${bonus} Loks · ${lillok.name} fed + bonded"
```

**Streak visual in feed:** The streak counter in the daily strip should change appearance at 3/7/14/30 days:
```jsx
// Streak badge colors:
const streakColor = streak >= 30 ? '#E8B14B' : streak >= 7 ? T.accent : streak >= 3 ? T.alt : T.ink;
const streakLabel = streak >= 30 ? '🔥 Month' : streak >= 7 ? '⚡ Week' : streak >= 3 ? '✦' : '';
```

---

### D6. Creator economy foundations (doc only, no code yet)

*These are backend-dependent but should be planned now so the UI can stub them.*

**Creator royalties (future Supabase):**
When another user's vote/view earns Loks for "moss.ink" (the seed creator in prototype), that represents the real creator economy model. In production:
- Each post has `creator_id`
- When user A votes on user B's post: user A earns 5 Loks (engagement reward), user B earns 5 Loks (creator royalty)  
- Rate-limited server-side via Supabase Edge Function
- Platform takes 0% of creator earnings at launch (growth incentive)

**Stub in prototype:** The `pushNotif('Someone voted on your flip · +5 Loks', 'success')` notification that fires when a seed post gets voted is the client-side preview of this. Wire it now so the intent is clear.

---

## SECTION E — Beta polish (carry-forward from v1)

*(Unchanged — included for completeness)*

### E1. Smooth Catmull-Rom brush engine
Replace `paintAt()` with point-accumulation + quadratic bezier approximation. No library needed. Key: accumulate `strokePts` per pointer session, redraw tail as smooth curve on each `move` event.

### E2. Long-press delete on PostCard
Add `pressTimer` ref, 600ms hold triggers confirm dialog.

### E3. Inline title rename in Viewer (own posts)
Toggle `editingTitle` state on title click. Input replaces div, blur/Enter saves via `onRename()`.

### E4. Post-onboarding Studio nudge
Show one-time dismissable banner in Studio tab if `onboarded && posts.length === 0`.

### E5. Per-frame duration in Viewer play loop
Replace fixed `setInterval` in Viewer with recursive `setTimeout` that reads `post.frameDurations[i] ?? post.paceMs`.

### E6. LokPass shimmer
Wire existing `@keyframes loksheen` to the Shop hero card's shimmer overlay div.

---

## SECTION F — Open / backend-blocked (unchanged)

| # | Item | What unblocks it |
|---|------|-----------------|
| 8 | Real auth | Supabase Auth + Google OAuth |
| 14 | Real multiplayer | PartyKit worker |
| 18 | Pinch-to-zoom | @use-gesture/react |
| 19 | Lok Juniors isolation | Separate component tree |
| 23 | Frame memory | Blob URL refactor |
| 34 | Style optimization | useMemo / CSS classes |
| 37 | LokPass payment | Stripe Checkout |
| 39 | Color contrast | Manual WCAG pass |
| 43 | Stroke replay | MediaRecorder |
| 44 | Real Rush leaderboard | Supabase trace_scores |
| 50 | Collections | Supabase schema |

---

## Priority order for Fable

**Sprint 1 — Communication + personality (highest visible impact):**
1. B1 — LILLOK_SPEECH pool + getLilLokLine()
2. B2 — LilLokBubble component
3. B3 — Wire all four speech surfaces (FAB idle, battle, feed scroll, panel)
4. C3 — Critical phase + stasis redesign (phase logic + sprite)
5. B6 — Stasis Zzz + closed eyes

**Sprint 2 — Decay + economy depth:**
6. C1 — New decay model (bond buffer, active drain)
7. C2 — Recovery model (tiered feeding, stasis cap)
8. C4 — Care panel redesign (status header, ink flask)
9. D2 — Earning paths + rate guard raise to 120
10. D4 — Loks balance in Profile

**Sprint 3 — Audit backlog:**
11. A1 — Toast queue
12. A2 — Gallery search
13. A3 — Quest milestones
14. B4 — Ink level fill on sprite
15. B5 — Feed particle burst
16. D3 — Spendable Loks (boost, ink flask, revival pages)
17. D5 — Streak milestone colors + weekly bonus

**Sprint 4 — Polish:**
18. A4–A8 — Weekly filter, keyboard shortcuts, symmetry, Rush tutorial, battle cards
19. E1–E6 — Brush smoothing, long-press delete, inline rename, nudge, frame timing, shimmer

---

## Validation checklist (run after each sprint)

```bash
node -e "
const s = require('fs').readFileSync('lok_live.jsx','utf8');
let b={'{':0,'(':0,'[':0};
for(const ch of s){if(ch==='{')b['{']++;else if(ch==='}')b['{']--;else if(ch==='(')b['(']++;else if(ch===')')b['(']--;else if(ch==='[')b['[']++;else if(ch===']')b['[']--;}
console.log('balance', JSON.stringify(b)); // all must be 0
console.log('exports', (s.match(/export default/g)||[]).length); // must be 1
console.log({
  speechPool:      s.includes('LILLOK_SPEECH'),
  bubble:          s.includes('LilLokBubble'),
  criticalPhase:   s.includes('critical') && s.includes('lilLokPhase'),
  bondBuffer:      s.includes('bondBuffer'),
  inkFlask:        s.includes('ink flask') || s.includes('inkFlask'),
  toastQueue:      s.includes('toastQueue') || s.includes('toasts.map'),
  rateGuard120:    s.includes('> 120'),
  totalEarned:     s.includes('totalEarned'),
  gallerySearch:   s.includes('searchQ'),
  questMilestone:  s.includes('questsCompleted'),
  inkFill:         s.includes('blotClip'),
  symmetry:        s.includes('radial') || s.includes('symmetry'),
  rushTutorial:    s.includes('traceHinted'),
});
"
```

---

## Updated scoring estimate

| Dimension | Pre-S1 | After S1 (real) | After Fable sprints 1–4 | Target |
|---|---|---|---|---|
| Design | 62 | 71 | **85** | 90 |
| Usability | 51 | 68 | **84** | 88 |
| Creativity | 74 | 80 | **89** | 92 |
| Content | 68 | 72 | **82** | 85 |
| **Overall** | **65** | **73** | **85** | **89** |

The LilLok communication system alone (+8 on Creativity) is the highest-leverage single change. The decay redesign (+6 on Usability) is second — it makes a previously opaque system legible. Economy depth (+4 Design, +3 Usability) closes most of the remaining gap.

---

*Plan version: v2.0 — July 2026*  
*Added: Economy (Section D), LilLok communication (B3 expanded), Decay redesign (Section C)*  
*Next review: After Fable Sprint 2*
