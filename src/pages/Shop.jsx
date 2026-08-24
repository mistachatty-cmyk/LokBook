import { useState, useEffect, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock.js";
import { isArchivedRotation } from "../engine/rotation.js";
import { useT, THEMES, SKIN_WAVE_GATE, SKIN_WAVE_3_GATE, SKIN_WAVE_4_GATE, SKIN_WAVE_5_GATE, blotBorderStyle } from "../theme/theme.js";
import {
  RARITY, EFFECTS, NAME_COLORS, PAPERS, MYTHIC_ITEMS, CELEBRATIONS, ANIMATION_FX, SKIES,
  CURSORS, FONT_PACKS, STICKER_PACKS, POST_EXPORTS, FRAMES, REACTION_PACKS, AVATAR_ACCENTS,
  STUDIO_MODULES, BLOT_BORDERS, BLOT_PERSONALITIES, BLOT_IDLE_ANIMATIONS, BLOT_EXPRESSIONS, BLOT_BOUNCES, LILLOK_GEAR, LILLOK_SKINS, LILLOK_AURAS, LILLOK_PETS,
  VOICE_PACKS, MUSIC_PACKS, WORLD_SKINS, ownsCosmetic, getDailyRotation, getWeeklyRotation, TIERS} from "../constants.jsx";
import MythicPreview from "../MythicPreview.jsx";

// Categories that are sold but whose effect is not applied anywhere in the app
// yet. Verified by grepping for each `cosmetics.<key>` consumer. These are
// surfaced as "NOT ACTIVE YET" and cannot be bought, so nobody spends Loks on
// something that does nothing.
// Mythic/daily/weekly rotation cards only showed name + price — no
// indication of *what slot* the item fills, which is what actually makes a
// rotation confusing to shop from. This maps each item's `type` to the
// same plain-language label the dedicated category tabs already use.
const TYPE_LABELS = {
  frame: "Avatar frame", effect: "Page effect", paper: "Canvas texture",
  animation_fx: "Animation FX", name_color: "Name color", lillok_skin: "LilLok skin",
  cursor: "Cursor", export: "Export format", canvas_border: "Studio canvas border",
};

export const WIP_CATEGORIES = {
  postExport: "GIF and spritesheet work; webp/apng/pdf/mp4 still need real encoders.",
  musicPack: "Built-in music packs have no audio yet \u2014 add your own in Settings \u2192 Music.",
};

function ShopItem({owned,equipped,price,onClick,children,swatch,rarity,wip}){
  const T=useT();const r=rarity&&RARITY[rarity];
  const needsConfirm=!owned&&!wip&&price>0;
  const[confirming,setConfirming]=useState(false);
  const confirmTimer=useRef(null);
  useEffect(()=>()=>clearTimeout(confirmTimer.current),[]);
  const locked=!owned&&!equipped&&!wip; // grayed until owned or free-and-equippable
  const handleClick=()=>{
    if(needsConfirm&&!confirming){setConfirming(true);clearTimeout(confirmTimer.current);confirmTimer.current=setTimeout(()=>setConfirming(false),4000);return;}
    clearTimeout(confirmTimer.current);setConfirming(false);onClick();
  };
  return(<button onClick={handleClick} aria-label={confirming?`Confirm purchase for ${price} Loks`:undefined} className={`lok-btn text-left rounded-2xl overflow-hidden w-full ${rarity?`rarity-${rarity}`:""}`} style={{border:`3px solid ${confirming?T.accent:equipped?T.accent:r?.color||T.ink}`,background:T.card,boxShadow:confirming?`0 0 0 2px ${T.accent}, 4px 4px 0 ${T.shadow}`:r?.glow?`${r.glow}, 4px 4px 0 ${T.shadow}`:`4px 4px 0 ${T.shadow}`,opacity:wip?0.55:locked?0.7:1,filter:locked?"grayscale(0.35)":"none"}}>{swatch}<div className="px-2.5 py-2 flex items-center justify-between gap-2"><div className="min-w-0">{children}{wip&&<div className="mt-1 text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded inline-block" style={{background:T.shadow,color:T.ink}}>Not active yet</div>}</div><div className="flex items-center gap-1.5 shrink-0">{r&&!equipped&&<span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{background:r.color||T.ink,color:rarity==="mythic"?"#fff":T.paper}}>{r.icon}</span>}<span className="text-xs font-extrabold whitespace-nowrap" style={{color:wip?T.shadow:confirming?T.accent:equipped?T.alt:T.accent}}>{wip?"n/a":confirming?"Tap to confirm":equipped?"On ✓":owned?"Equip":price===0?"Free":`${price} Loks`}</span></div></div></button>);}
function MythicCard({item,own,equipped,onBuy}){
  const T=useT();
  const[confirming,setConfirming]=useState(false);
  const confirmTimer=useRef(null);
  useEffect(()=>()=>clearTimeout(confirmTimer.current),[]);
  const handleClick=()=>{
    if(!own&&!confirming){setConfirming(true);clearTimeout(confirmTimer.current);confirmTimer.current=setTimeout(()=>setConfirming(false),4000);return;}
    clearTimeout(confirmTimer.current);setConfirming(false);onBuy();
  };
  return(<button onClick={handleClick} aria-label={confirming?`Confirm purchase of ${item.name} for ${item.price} Loks`:undefined} className="lok-btn text-left rounded-2xl overflow-hidden rarity-mythic" style={{"--mythic-bg":T.card,boxShadow:confirming?`0 0 24px ${T.accent}`:equipped?`0 0 20px ${T.accent}`:`0 0 20px rgba(255,93,162,0.3)`,position:"relative",opacity:own?1:0.85,filter:own?"none":"grayscale(0.25)"}}>
    <div className="flex items-center justify-center py-3" style={{minHeight:100,background:`linear-gradient(135deg, ${T.paper}, ${T.card})`}}><MythicPreview itemId={item.fxId} rarity="mythic"/></div>
    <div className="px-2.5 py-2 relative">
      <div className="font-bold text-sm truncate flex items-center gap-1">{item.name}{!own&&<span className="text-[8px] px-1 py-0.5 rounded-full rarity-mythic-badge">MYTHIC</span>}</div>
      <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">{TYPE_LABELS[item.type]||item.type}</div>
      <div className="text-[10px] opacity-70 truncate">{item.desc}</div>
      <div className="mt-1 text-xs font-extrabold" style={{color:confirming?T.accent:equipped?T.alt:T.accent}}>{confirming?`Tap to confirm · ${item.price} Loks`:equipped?"Equipped":own?"Equip":`${item.price} Loks`}</div>
    </div>
  </button>);
}
// Hoisted OUT of Shop() deliberately. Declared inside the render function it was
// a brand-new component *type* on every render, so React unmounted and remounted
// every section subtree whenever anything above it changed — an ad rotating on
// its 8s timer, a toast, a bot post landing. That silently threw away
// ShopItem's `confirming` state, so an armed purchase could evaporate between
// your two taps with no feedback. verify:shop caught it as "Element is not
// attached to the DOM" between the arm tap and the buy tap.
function Section({ title, sub, children }) {
  return (<section className="mt-5">
    <h3 className="lok-display text-base font-extrabold">{title}</h3>
    {sub && <p className="text-xs opacity-60 mb-1">{sub}</p>}
    <div className="mt-2">{children}</div>
  </section>);
}

export default function Shop({ccTier,say,modules=[],onBuyModule,ownedTiers=[],onBuyTier,loks,lokPass,kids,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies=[],onSky,animFx,ownedAnimFx=[],onAnimFx,fontPack,onFontPack,cursorPack,onCursorPack,musicPack,stickerPack,onStickerPack,postExport,cosmetics,owned,onBuyCosmetic,setKids,onBuyPass,onTheme,onEffect,onCc,mythicOwned,mythicEquipped,onBuyMythic,dailyOwned,weeklyOwned,celebrationStyle,onCelebrationStyle}){
  const T=useT();const[catTab,setCatTab]=useState("featured");const[modTab,setModTab]=useState("brush");const[showAll,setShowAll]=useState(false);
  const[legacy,setLegacy]=useState(()=>{try{return localStorage.getItem("lok:shop:legacy")==="1";}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem("lok:shop:legacy",legacy?"1":"0");}catch{}},[legacy]);
  const[showResetConfirm,setShowResetConfirm]=useState(false);
  useBodyScrollLock(showResetConfirm);
  // Only *equips* reset — nothing is un-owned or refunded. Each row is
  // [label, current display value, default id, apply()].
  const defaultThemeId=Object.keys(THEMES)[0];
  const resetRows=[
    ["Theme",THEMES[uiTheme]?.name||uiTheme,defaultThemeId,()=>onTheme(defaultThemeId)],
    ["Effect",EFFECTS.find(e=>e.id===effect)?.name||effect,"none",()=>onEffect("none",EFFECTS.find(e=>e.id==="none"))],
    ["Sky",SKIES.find(s=>s.id===sky)?.name||sky||"—","clear",()=>onSky("clear",SKIES.find(s=>s.id==="clear"))],
    ["Animation FX",ANIMATION_FX.find(f=>f.id===animFx)?.name||animFx,"none",()=>onAnimFx("none",ANIMATION_FX.find(f=>f.id==="none"))],
    ["Paper",PAPERS.find(p=>p.id===cosmetics.paper)?.name||"Plain paper","plain",()=>onBuyCosmetic("paper",PAPERS.find(p=>p.id==="plain"))],
    ["Cursor",CURSORS.find(c=>c.id===cursorPack)?.name||cursorPack,"default",()=>onCursorPack("default",CURSORS.find(c=>c.id==="default"))],
    ["Font",FONT_PACKS.find(f=>f.id===fontPack)?.name||fontPack,"default",()=>onFontPack("default",FONT_PACKS.find(f=>f.id==="default"))],
    ["Name color",NAME_COLORS.find(c=>c.id===cosmetics.nameColor)?.name||cosmetics.nameColor,"default",()=>onBuyCosmetic("nameColor",NAME_COLORS.find(c=>c.id==="default"))],
    ["Avatar frame",FRAMES.find(f=>f.id===cosmetics.frame)?.name||cosmetics.frame,"none",()=>onBuyCosmetic("frame",FRAMES.find(f=>f.id==="none"))],
    ["Reaction pack",REACTION_PACKS.find(r=>r.id===cosmetics.reactionPack)?.name||cosmetics.reactionPack,"base",()=>onBuyCosmetic("reactionPack",REACTION_PACKS.find(r=>r.id==="base"))],
    ["Avatar accent",AVATAR_ACCENTS.find(a=>a.id===cosmetics.avatarAccent)?.name||cosmetics.avatarAccent,"none",()=>onBuyCosmetic("avatarAccent",AVATAR_ACCENTS.find(a=>a.id==="none"))],
    ["Blot border",BLOT_BORDERS.find(b=>b.id===cosmetics.blotBorder)?.name||cosmetics.blotBorder,"none",()=>onBuyCosmetic("blotBorder",BLOT_BORDERS.find(b=>b.id==="none"))],
    ["Blot personality",BLOT_PERSONALITIES.find(p=>p.id===cosmetics.blotPersonality)?.name||cosmetics.blotPersonality,"vibes",()=>onBuyCosmetic("blotPersonality",BLOT_PERSONALITIES.find(p=>p.id==="vibes"))],
    ["Blot idle animation",BLOT_IDLE_ANIMATIONS.find(a=>a.id===cosmetics.blotIdleAnimation)?.name||cosmetics.blotIdleAnimation,"float",()=>onBuyCosmetic("blotIdleAnimation",BLOT_IDLE_ANIMATIONS.find(a=>a.id==="float"))],
    ["Blot expression",BLOT_EXPRESSIONS.find(e=>e.id===cosmetics.blotExpression)?.name||cosmetics.blotExpression,"neutral",()=>onBuyCosmetic("blotExpression",BLOT_EXPRESSIONS.find(e=>e.id==="neutral"))],
    ["Blot bounce",BLOT_BOUNCES.find(b=>b.id===cosmetics.blotBounce)?.name||cosmetics.blotBounce,"gentle",()=>onBuyCosmetic("blotBounce",BLOT_BOUNCES.find(b=>b.id==="gentle"))],
    ["LilLok gear",LILLOK_GEAR.find(g=>g.id===cosmetics.gear)?.name||cosmetics.gear||"None","none",()=>onBuyCosmetic("gear",LILLOK_GEAR.find(g=>g.id==="none"))],
    ["LilLok skin",LILLOK_SKINS.find(s=>s.id===cosmetics.lillokSkin)?.name||cosmetics.lillokSkin||"None","none",()=>onBuyCosmetic("lillokSkin",LILLOK_SKINS.find(s=>s.id==="none"))],
    ["LilLok aura",LILLOK_AURAS.find(a=>a.id===cosmetics.lillokAura)?.name||cosmetics.lillokAura||"None","none",()=>onBuyCosmetic("lillokAura",LILLOK_AURAS.find(a=>a.id==="none"))],
    ["LilLok pet",LILLOK_PETS.find(p=>p.id===cosmetics.lillokPet)?.name||cosmetics.lillokPet||"None","none",()=>onBuyCosmetic("lillokPet",LILLOK_PETS.find(p=>p.id==="none"))],
    ["Voice pack",VOICE_PACKS.find(v=>v.id===cosmetics.voicePack)?.name||cosmetics.voicePack||"Default","default",()=>onBuyCosmetic("voicePack",VOICE_PACKS.find(v=>v.id==="default"))],
  ];
  const resetAllCosmetics=()=>{resetRows.forEach(([,,,apply])=>apply());setShowResetConfirm(false);say("All cosmetics reset to default — nothing un-owned","success");};
  // ownsCosmetic tolerates both historical shapes of owned[cat] (plain ids and
  // {id,ts} objects) — see constants.jsx. Using .includes() directly here meant
  // anything bought from the Profile read as un-owned and was charged twice.
  // How far up the wave ladder this player has climbed. `showAll` used to be
  // spliced into each of the four wave filters as `showAll||…`, which revealed
  // locked skins AND left the card's onClick as a bare onTheme(id) — so a skin
  // whose label read "🔒 Wave 5" was purchasable in one tap. showAll now only
  // reveals; the gate itself is enforced on the click.
  const waveNeeded=w=>w>=5?SKIN_WAVE_5_GATE:w>=4?SKIN_WAVE_4_GATE:w>=3?SKIN_WAVE_3_GATE:w>=2?SKIN_WAVE_GATE:0;
  const waveReached=ownedThemes.length>=SKIN_WAVE_5_GATE?5:ownedThemes.length>=SKIN_WAVE_4_GATE?4:ownedThemes.length>=SKIN_WAVE_3_GATE?3:ownedThemes.length>=SKIN_WAVE_GATE?2:1;
  const has=(cat,id)=>ownsCosmetic(owned,cat,id);const eq=(cat,id)=>cosmetics[cat]===id;
  // A parked ITEM refuses ahead of a WIP category, because a category flag is
  // too coarse for a part-working list: POST_EXPORTS has two real encoders and
  // four that do not exist. `parked` also travels with the row, so it cannot
  // drift out of sync with a hand-maintained map the way WIP_CATEGORIES did
  // (Shop passed `WIP_CATEGORIES.stickerPack`, a key that never existed).
  const parkedReason=item=>item?.parked||null;
  const refuseParked=item=>{const r=parkedReason(item);if(!r)return false;say?.(`${item.name} isn't active yet — ${r}`,"error");return true;};
  const buy=(cat,item)=>{if(refuseParked(item))return;if(WIP_CATEGORIES[cat]){say?.(WIP_CATEGORIES[cat],"error");return;}onBuyCosmetic(cat,item);};
  const ALL_CATS=[["featured","Featured"],["themes","Skins"],["mythic","💎 Mythic"],["effects","Effects"],["fx","FX"],["skies","Skies"],["cosmetic","Cosmetics"],["studio","Studio"],["blot","Blot Shop"],["lillok","LilLok+"],["paper","Paper"],["cursors","Cursors"],["fonts","Fonts"],["stickers","Stickers"],["export","Export"],["music","Music"]];
  // Simple view hides the categories whose effects aren't wired up yet;
  // Legacy view shows the original full shop with those marked "not active".
  // "stickers" used to be dead — buying a pack changed nothing (see
  // docs/AUDIT.md). It's real now: Studio's sticker sheet reads whichever
  // pack is equipped and places its stickers on the canvas.
  const DEAD_TABS=new Set(["export","music"]);
  const cats=legacy?ALL_CATS:ALL_CATS.filter(([id])=>!DEAD_TABS.has(id));
  // Layers has no shop tab: it's a duplicate of the TIERS system Studio already
  // sells directly (10/25/50/100 · Sketch/Studio/Pro/Marathon) and which the live
  // easel actually reads maxLayers from — layers_* modules were pure double-sell.
  const moduleTypes=[{type:"brush",label:"Brushes"},{type:"tool",label:"Tools"},{type:"feature",label:"Features"},{type:"canvas",label:"Canvas"}];
  const activeTab=(!legacy&&DEAD_TABS.has(catTab))?"featured":catTab;
  return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Shop</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Everything here is free play.":"Spend Loks you earn — or grab the LokPass."}</p>
    <div className="mt-2 flex items-center gap-2 p-2 rounded-xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="min-w-0 flex-1"><div className="font-bold text-xs">{legacy?"Legacy shop":"Simple shop"}</div><div className="text-[10px] opacity-60 leading-snug">{legacy?"Everything, including items whose effects aren't wired up yet.":"Only categories that actually do something right now."}</div></div>
      <button onClick={()=>setLegacy(v=>!v)} aria-pressed={legacy} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold" style={{border:`2.5px solid ${T.ink}`,background:legacy?T.ink:T.card,color:legacy?T.paper:T.ink}}>{legacy?"Show simple":"Show legacy"}</button>
    </div>
    <p className="mt-2 text-[11px] opacity-60">Balance: <strong style={{color:T.accent}}>{loks} Loks</strong></p>
    <button onClick={()=>setShowResetConfirm(true)} className="lok-btn mt-2 w-full px-3 py-1.5 rounded-xl text-xs font-bold text-left" style={{border:`2px dashed ${T.shadow}`,color:T.ink,background:"transparent"}}>↺ Reset all cosmetics to default</button>
    {showResetConfirm&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.4)"}} onClick={()=>setShowResetConfirm(false)}>
      <div className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain" style={{maxWidth:560,maxHeight:"min(80vh, 80dvh)",background:T.card,border:`3px solid ${T.ink}`,WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold">Reset all cosmetics?</div>
        <p className="text-xs opacity-70 mt-1 mb-3">This unequips everything below and puts it back to default. Nothing is un-owned and no Loks are refunded — you can re-equip any of it any time.</p>
        <div className="rounded-xl overflow-hidden" style={{border:`2px solid ${T.shadow}`}}>
          {resetRows.map(([label,current,defaultId],i)=>(<div key={label} className="flex items-center justify-between px-3 py-2 text-xs" style={{background:i%2?T.paper:T.card,borderTop:i?`1px solid ${T.shadow}`:"none"}}>
            <span className="font-bold">{label}</span>
            <span className="opacity-70">{current} → <strong>Default</strong></span>
          </div>))}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={()=>setShowResetConfirm(false)} className="lok-btn flex-1 py-2.5 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>Cancel</button>
          <button onClick={resetAllCosmetics} className="lok-btn flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Reset everything</button>
        </div>
      </div>
    </div>)}
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{cats.map(([id,l])=>(<button key={id} onClick={()=>setCatTab(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:catTab===id?T.ink:T.card,color:catTab===id?T.paper:T.ink}}>{l}</button>))}
      <button onClick={()=>setShowAll(s=>!s)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${showAll?T.accent:T.shadow}`,background:showAll?T.ink:T.card,color:showAll?T.paper:T.shadow}} aria-pressed={showAll}>👀 All</button>
    </div>
    {activeTab==="featured"&&(<>
      {!kids&&(<div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.ink,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold">LokPass</div><p className="text-sm opacity-85 mt-1">No ads. Every UI theme unlocked. PASS badge.</p><button onClick={onBuyPass} disabled={lokPass} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:lokPass?"transparent":T.accent,color:lokPass?T.paper:T.onAccent,border:`3px solid ${T.paper}`,opacity:lokPass?0.7:1}} aria-label={lokPass?"LokPass active":"Get LokPass"}>{lokPass?"Active ✓":"Get LokPass — $2.99"}</button></div>)}
      <div className="mt-3 p-3 rounded-2xl flex items-center gap-3" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="flex-1"><div className="lok-display font-extrabold">Lok Juniors {kids?"· ON":""}</div><div className="text-xs opacity-70">Safe walled-garden mode for kids &amp; classrooms.</div></div><button onClick={()=>setKids(!kids)} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:kids?T.alt:T.card,color:kids?"#fff":T.ink,border:`3px solid ${T.ink}`}} aria-pressed={kids}>{kids?"Turn off":"Turn on"}</button></div>
      {(()=>{const dS=Math.floor(Date.now()/86400000);const wS=Math.floor(Date.now()/604800000);const pick=(a,o)=>a[(dS+o)%a.length];const tE=Object.entries(THEMES);const tT=tE[dS%tE.length];const tEf=pick(EFFECTS,1);const tC=pick(NAME_COLORS.filter(x=>x.id!=="default"),2);const tP=pick(PAPERS.filter(x=>x.id!=="plain"),3);const dailyItems=getDailyRotation();const weeklyItems=getWeeklyRotation();return(<>
        <Section title="✨ Today's picks" sub="New items featured daily!"><div className="grid grid-cols-2 gap-2">
          {tE.length>0&&(()=>{const[id,th]=tT;const own=ownedThemes.includes(id);const e2=uiTheme===id;return(<ShopItem key={"ft-"+id} owned={own} equipped={e2} price={th.price} onClick={()=>onTheme(id)}><div className="font-bold text-sm truncate">{th.name}</div><div className="text-[10px] opacity-70 truncate">Skin</div></ShopItem>);})()}
          {EFFECTS.length>0&&(()=>{const e=tEf;const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={"fe-"+e.id} owned={own} equipped={e2} price={e.price} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm truncate">{e.name}</div><div className="text-[10px] opacity-70 truncate">Effect</div></ShopItem>);})()}
          {NAME_COLORS.length>0&&(()=>{const c=tC;return(<ShopItem key={"fc-"+c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm truncate" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div><div className="text-[10px] opacity-70 truncate">Name color</div></ShopItem>);})()}
          {PAPERS.length>0&&(()=>{const p=tP;const own=has("paper",p.id);const e2=eq("paper",p.id);return(<ShopItem key={"fp-"+p.id} owned={own} equipped={e2} price={p.price} onClick={()=>buy("paper",p)}><div className="font-bold text-sm truncate">{p.name}</div><div className="text-[10px] opacity-70 truncate">Paper</div></ShopItem>);})()}
        </div></Section>
        {weeklyItems.length>0&&<Section title="🗓️ This Week's Rotation" sub={`${weeklyItems.length} exclusive items — ${7-new Date().getDay()}d remaining!`}><div className="grid grid-cols-2 gap-2">{weeklyItems.map(item=>{const own=weeklyOwned?.includes(item.id);return(<ShopItem key={item.id} owned={own} rarity={item.rarity} price={item.price} wip={isArchivedRotation(item)} onClick={()=>{if(!own)onBuyMythic?.(item,"weekly");}}><div className="font-bold text-sm truncate">{item.name}</div><div className="text-[9px] font-extrabold uppercase tracking-wide" style={{color:T.accent}}>{TYPE_LABELS[item.type]||item.type}</div><div className="text-[10px] opacity-70 truncate">{item.desc}</div></ShopItem>);})}</div></Section>}
        {dailyItems.length>0&&<Section title="🌸 Today's Rotation" sub={`${dailyItems.length} daily deals — grab before they're gone!`}><div className="grid grid-cols-2 gap-2">{dailyItems.map(item=>{const own=dailyOwned?.includes(item.id);return(<ShopItem key={item.id} owned={own} rarity={item.rarity} price={item.price} wip={isArchivedRotation(item)} onClick={()=>{if(!own)onBuyMythic?.(item,"daily");}}><div className="font-bold text-sm truncate">{item.name}</div><div className="text-[9px] font-extrabold uppercase tracking-wide" style={{color:T.accent}}>{TYPE_LABELS[item.type]||item.type}</div><div className="text-[10px] opacity-70 truncate">{item.desc}</div></ShopItem>);})}</div></Section>}
      </>);})()}
    </>)}
    {activeTab==="themes"&&!kids&&(<Section title="UI themes" sub={`Own skins to unlock new waves.`}><div className="grid grid-cols-2 gap-3">{Object.entries(THEMES).filter(([,th])=>showAll||(th.wave||1) < 2 || ownedThemes.length>=SKIN_WAVE_GATE).filter(([,th])=>showAll||(th.wave||1) < 3 || ownedThemes.length>=SKIN_WAVE_3_GATE).filter(([,th])=>showAll||(th.wave||1) < 4 || ownedThemes.length>=SKIN_WAVE_4_GATE).filter(([,th])=>showAll||(th.wave||1) < 5 || ownedThemes.length>=SKIN_WAVE_5_GATE).map(([id,th])=>{const own=ownedThemes.includes(id);const e2=uiTheme===id;const waveLocked=!own&&!lokPass&&(th.wave||1)>waveReached;return(<button key={id} onClick={()=>{if(waveLocked){say?.(`${th.name} unlocks at Wave ${th.wave||1} — own ${waveNeeded(th.wave||1)} skins to reach it`,"error");return;}onTheme(id);}} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:own||showAll?T.ink:T.shadow}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`,opacity:own||showAll?1:.5}} aria-label={`Theme ${th.name}`}><div className="flex h-10 relative">{[th.paper,th.ink,th.accent,th.alt].map((c,k)=>(<div key={k} className="flex-1" style={{background:c}}/>))}{th.animated&&<><div className="absolute inset-0" style={{background:`linear-gradient(110deg, transparent 30%, ${th.accent}55 50%, transparent 70%)`,backgroundSize:"220% 100%",animation:"loksheen 2.8s linear infinite"}}/><span className="absolute top-1 right-1 lok-display px-1.5 rounded text-[9px] font-extrabold" style={{background:th.accent,color:th.onAccent}}>● LIVE</span></>}</div><div className="px-2.5 py-2"><div className="font-bold text-sm">{th.name}</div><div className="text-xs opacity-70">{th.desc}</div><div className="mt-1 text-xs font-extrabold" style={{color:T.accent}}>{e2?"Equipped":own?"Equip":lokPass?"In PASS":waveLocked?`🔒 Wave ${th.wave||1} · ${th.price} Loks`:`${th.price} Loks`}</div></div></button>);})}</div></Section>)}
    {activeTab==="mythic"&&!kids&&(<><Section title="💎 Mythic Collection" sub="Legendary quality. GSAP-animated previews. The rarest items in LokBook."><div className="grid grid-cols-2 gap-3">{MYTHIC_ITEMS.map(item=>{const own=mythicOwned?.includes(item.id);const e2=mythicEquipped===item.id;return(<MythicCard key={item.id} item={item} own={own} equipped={e2} onBuy={()=>onBuyMythic?.(item)}/>);})}</div></Section>
      <Section title="🎉 Celebrations" sub="Event-only celebration styles — unbuyable. Click to equip."><div className="grid grid-cols-2 gap-3">{CELEBRATIONS.map(c=>{const e2=celebrationStyle===c.id;return(<button key={c.id} onClick={()=>{onCelebrationStyle?.(c.id);}} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:T.ink}`,background:T.card,opacity:0.6,boxShadow:`4px 4px 0 ${T.shadow}`}}><div className="flex items-center justify-center py-6" style={{background:`linear-gradient(135deg, ${T.paper}, ${T.card})`}}><div className="text-3xl">{c.id==="confetti"?"🎊":c.id==="inkbloom"?"🌸":"✨"}</div></div><div className="px-2.5 py-2"><div className="font-bold text-sm">{c.name}</div><div className="text-[10px] opacity-70">{c.desc}</div><div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest" style={{color:T.alt}}>EVENT ITEM — UNBUYABLE</div></div></button>);})}</div></Section></>)}
    {activeTab==="effects"&&(<Section title="Page effects" sub="Background effects that play on your profile."><div className="grid grid-cols-2 gap-2">{EFFECTS.map(e=>{const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={e.id} owned={own} equipped={e2} price={e.price} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm">{e.name}</div><div className="text-[10px] opacity-70">Page effect</div></ShopItem>);})}</div></Section>)}
    {activeTab==="fx"&&(<Section title="Animation FX" sub="Visual effects play over your flip when viewed."><div className="grid grid-cols-2 gap-2">{ANIMATION_FX.filter(f=>showAll||f.id!=="none").map(f=>{const own=ownedAnimFx.includes(f.id);const e2=animFx===f.id;return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} onClick={()=>onAnimFx(f.id,f)}><div className="font-bold text-sm">{f.name}</div>{f.desc&&<div className="text-[10px] opacity-70">{f.desc}</div>}</ShopItem>);})}</div></Section>)}
    {activeTab==="skies"&&(<Section title="Atmosphere" sub="Animated sky backgrounds behind your content."><div className="grid grid-cols-2 gap-2">{SKIES.map(s=>{const own=ownedSkies.includes(s.id);const e2=sky===s.id;return(<ShopItem key={s.id} owned={own} equipped={e2} price={s.price} onClick={()=>onSky(s.id,s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">Sky</div></ShopItem>);})}</div></Section>)}
    {activeTab==="cursors"&&(<Section title="Drawing Cursors" sub="Custom cursor styles for the canvas."><div className="grid grid-cols-2 gap-2">{CURSORS.filter(c=>showAll||c.id!=="default").map(c=>{const own=has("cursorPack",c.id);const e2=cursorPack===c.id;return(<ShopItem key={c.id} owned={own} equipped={e2} price={c.price} wip={!!c.parked} onClick={()=>{if(refuseParked(c))return;onCursorPack(c.id,c);}}><div className="font-bold text-sm">{c.name}</div><div className="text-[10px] opacity-70">Cursor</div></ShopItem>);})}</div></Section>)}
    {activeTab==="fonts"&&(<Section title="Font Packs" sub="Change the app font style."><div className="grid grid-cols-2 gap-2">{FONT_PACKS.filter(f=>showAll||f.id!=="default").map(f=>{const own=has("fontPack",f.id);const e2=fontPack===f.id;return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} wip={!!f.parked} onClick={()=>{if(refuseParked(f))return;onFontPack(f.id,f);}}><div className="font-bold text-sm">{f.name}</div>{f.desc&&<div className="text-[10px] opacity-70">{f.desc}</div>}</ShopItem>);})}</div></Section>)}
    {activeTab==="stickers"&&(<Section title="Sticker Packs" sub="Unlock themed sticker sets for your Studio."><div className="grid grid-cols-2 gap-2">{STICKER_PACKS.filter(s=>showAll||s.id!=="emoji").map(s=>{const own=has("stickerPack",s.id);const e2=stickerPack===s.id;return(<ShopItem key={s.id} owned={own} equipped={e2} price={s.price} wip={!!s.parked} onClick={()=>{if(refuseParked(s))return;onStickerPack(s.id,s);}}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">{s.stickers.slice(0,4).join(" ")}{s.stickers.length>4?" +"+s.stickers.length:""}</div></ShopItem>);})}</div></Section>)}
    {activeTab==="export"&&(<Section title="Export Formats" sub="Extra export options for your flips."><div className="grid grid-cols-2 gap-2">{POST_EXPORTS.filter(e=>showAll||e.id!=="png").map(e=>{const own=has("postExport",e.id);const e2=eq("postExport",e.id);return(<ShopItem key={e.id} owned={own} equipped={e2} price={e.price} wip={!!e.parked} onClick={()=>buy("postExport",e)}><div className="font-bold text-sm">{e.name}{e.soon&&<span className="ml-1 text-[9px] opacity-50">soon</span>}</div>{e.desc&&<div className="text-[10px] opacity-70">{e.desc}</div>}</ShopItem>);})}</div></Section>)}
    {activeTab==="cosmetic"&&(<>
      <Section title="Name color"><div className="grid grid-cols-2 gap-2">{NAME_COLORS.map(c=>(<ShopItem key={c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div></ShopItem>))}</div></Section>
      <Section title="Avatar frames" sub="Decorative borders around your avatar."><div className="grid grid-cols-2 gap-2">{FRAMES.map(f=>{const own=has("frame",f.id);const e2=eq("frame",f.id);return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} onClick={()=>buy("frame",f)}><div className="font-bold text-sm">{f.name}</div><div className="text-[10px] opacity-70">Avatar frame</div></ShopItem>);})}</div></Section>
      <Section title="Reaction packs" sub="Emoji/lok reaction sets for posts."><div className="grid grid-cols-2 gap-2">{REACTION_PACKS.map(r=>(<ShopItem key={r.id} owned={has("reactionPack",r.id)} equipped={eq("reactionPack",r.id)} price={r.price} onClick={()=>buy("reactionPack",r)}><div className="font-bold text-sm leading-tight">{r.name}</div><div className="text-[10px] opacity-70">Reaction set</div></ShopItem>))}</div></Section>
      <Section title="Avatar accents" sub="Small decorative elements on your avatar."><div className="grid grid-cols-2 gap-2">{AVATAR_ACCENTS.map(a=>(<ShopItem key={a.id} owned={has("avatarAccent",a.id)} equipped={eq("avatarAccent",a.id)} price={a.price} onClick={()=>buy("avatarAccent",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">Avatar accent</div></ShopItem>))}</div></Section>
      <Section title="World skins" sub="Change the look of the 3D globe in World."><div className="grid grid-cols-2 gap-2">{WORLD_SKINS.filter(s=>showAll||s.id!=="none").map(s=>(<ShopItem key={s.id} owned={has("globeSkin",s.id)} equipped={eq("globeSkin",s.id)} price={s.price} onClick={()=>buy("globeSkin",s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">{s.desc}</div></ShopItem>))}</div></Section>
    </>)}
    {activeTab==="studio"&&(<>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{moduleTypes.filter(t=>t.type!=="achievement").map(({type,label})=>(<button key={type} onClick={()=>setModTab(type)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:modTab===type?T.ink:T.card,color:modTab===type?T.paper:T.ink}}>{label}</button>))}</div>
      {/* TIERS had no buy path anywhere in the app. Studio's tier pills say
          "Unlock <tier> in Shop" and the Shop had no tiers section and no
          handler, so the 40/80/150-Lok layer packs were unreachable and every
          player was stuck at 10 layers. (The layers_* MODULES were removed
          precisely because TIERS was meant to sell them — so both halves were
          dead at once.) */}
      <Section title="Layer packs" sub="How many layers the Easel gives you. Pick an unlocked pack from the tier pills in Studio.">
        <div className="grid grid-cols-2 gap-2">{TIERS.filter(t=>showAll||t.price>0).map(t=>{const own=ownedTiers.includes(t.layers);return(
          <ShopItem key={t.layers} owned={own} equipped={own} price={t.price} onClick={()=>onBuyTier?.(t)}>
            <div className="font-bold text-sm">{t.label}</div>
            <div className="text-[10px] opacity-70">Up to {t.layers} layers</div>
          </ShopItem>);})}</div>
      </Section>
      <Section title="Modules" sub="Expand your studio toolbox. Brush, tool and feature modules unlock controls on the easel; canvas &amp; animation modules apply in Studio."><div className="grid grid-cols-2 gap-2">{STUDIO_MODULES.filter(m=>m.type===modTab||modTab==="all").filter(m=>showAll||m.price>0).map(m=>{const own=modules.includes(m.id);return(<ShopItem key={m.id} owned={own} equipped={own} price={m.price} wip={!!m.parked} onClick={()=>{if(refuseParked(m))return;if(own){say("Already owned");}else if(m.price===0){say("Free — claim it!");onBuyModule?.(m);}else{onBuyModule?.(m);}}}><div className="font-bold text-sm">{m.name}</div>{m.desc&&<div className="text-[10px] opacity-70">{m.desc}</div>}</ShopItem>);})}</div></Section>
      {!modules.includes("module_uber")&&<Section title="Studio Pro" sub="Blend modes, symmetry (mirror · radial), fill, eyedropper, marker &amp; chalk brushes"><div className="flex items-center justify-between p-2.5 rounded-xl" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="font-bold text-sm">Pro easel unlock</div>{ccTier?<span className="text-sm font-extrabold" style={{color:T.alt}}>Owned ✓</span>:<button onClick={onCc} className="lok-btn px-3 py-1 rounded-full text-sm font-extrabold" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>120 Loks</button>}</div></Section>}
    </>)}
    {activeTab==="paper"&&(<Section title="Canvas paper" sub="Paper textures and drawing guides."><div className="grid grid-cols-2 gap-2">{PAPERS.map(p=>(<ShopItem key={p.id} owned={has("paper",p.id)} equipped={eq("paper",p.id)} price={p.price} onClick={()=>buy("paper",p)}><div className="font-bold text-sm">{p.name}</div><div className="text-[10px] opacity-70">Canvas texture</div></ShopItem>))}</div></Section>)}
    {activeTab==="blot"&&(<><div className="mt-4 p-4 rounded-2xl text-center" style={{background:T.card,border:`2px solid ${T.shadow}`}}>
      <div className="text-xs font-bold opacity-70 mb-2">Current blot</div>
      <div className="flex items-center justify-center" style={{height:140}}>
        <div className="rounded-full flex items-center justify-center" style={{width:120,height:120,background:T.paper,...blotBorderStyle(cosmetics.blotBorder,T)}}>
          <div style={{width:90,height:90,borderRadius:"50%",background:`linear-gradient(135deg, ${T.ink}66, ${T.accent}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🫧</div>
        </div>
      </div>
      <div className="mt-2 text-sm font-bold">{BLOT_BORDERS.find(b=>b.id===cosmetics.blotBorder)?.name||"Default"}</div>
    </div>
    <Section title="Blot borders" sub="Borders for your LilLok container.">
      <div className="grid grid-cols-2 gap-2">{BLOT_BORDERS.map(b=>(
        <ShopItem key={b.id} owned={has("blotBorder",b.id)} equipped={eq("blotBorder",b.id)} price={b.price} onClick={()=>buy("blotBorder",b)}
          swatch={<div className="flex items-center justify-center py-3"><div className="rounded-full" style={{width:44,height:44,background:T.paper,...blotBorderStyle(b.id,T)}}/></div>}>
          <div className="font-bold text-sm">{b.name}</div><div className="text-[10px] opacity-70">Blot border</div>
        </ShopItem>))}
      </div>
    </Section>
    <Section title="Blot personalities" sub="Unlock unique voices for your LilLok companion."><div className="grid grid-cols-2 gap-2">{BLOT_PERSONALITIES.map(p=>(<ShopItem key={p.id} owned={has("blotPersonality",p.id)} equipped={eq("blotPersonality",p.id)} price={p.price} onClick={()=>buy("blotPersonality",p)}><div className="font-bold text-sm">{p.emoji} {p.name}</div><div className="text-[10px] opacity-70">{p.desc}</div></ShopItem>))}</div></Section>
    <Section title="Idle animations" sub="How your blot moves when resting."><div className="grid grid-cols-2 gap-2">{BLOT_IDLE_ANIMATIONS.map(a=>(<ShopItem key={a.id} owned={has("blotIdleAnimation",a.id)} equipped={eq("blotIdleAnimation",a.id)} price={a.price} onClick={()=>buy("blotIdleAnimation",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">{a.desc}</div></ShopItem>))}</div></Section>
    <Section title="Expressions" sub="How your blot looks and feels."><div className="grid grid-cols-2 gap-2">{BLOT_EXPRESSIONS.map(e=>(<ShopItem key={e.id} owned={has("blotExpression",e.id)} equipped={eq("blotExpression",e.id)} price={e.price} onClick={()=>buy("blotExpression",e)}><div className="font-bold text-sm">{e.name}</div><div className="text-[10px] opacity-70">{e.desc}</div></ShopItem>))}</div></Section>
    <Section title="Bounce styles" sub="Animation style when your blot taps."><div className="grid grid-cols-2 gap-2">{BLOT_BOUNCES.map(b=>(<ShopItem key={b.id} owned={has("blotBounce",b.id)} equipped={eq("blotBounce",b.id)} price={b.price} onClick={()=>buy("blotBounce",b)}><div className="font-bold text-sm">{b.name}</div><div className="text-[10px] opacity-70">{b.desc}</div></ShopItem>))}</div></Section>
    <Section title="LilLok gear" sub="Accessories for your ink buddy."><div className="grid grid-cols-2 gap-2">{LILLOK_GEAR.filter(g=>g.id!=="none").map(g=>(<ShopItem key={g.id} owned={has("gear",g.id)} equipped={eq("gear",g.id)} price={g.price} onClick={()=>buy("gear",g)}><div className="font-bold text-sm">{g.name}</div><div className="text-[10px] opacity-70">LilLok accessory</div></ShopItem>))}</div></Section></>)}
    {activeTab==="lillok"&&(<>
      <Section title="LilLok Skins" sub="Change your LilLok's appearance."><div className="grid grid-cols-2 gap-2">{LILLOK_SKINS.filter(s=>s.id!=="none").map(s=>(<ShopItem key={s.id} owned={has("lillokSkin",s.id)} equipped={eq("lillokSkin",s.id)} price={s.price} onClick={()=>buy("lillokSkin",s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">LilLok skin</div></ShopItem>))}</div></Section>
      <Section title="LilLok Auras" sub="Glowing effects around your LilLok."><div className="grid grid-cols-2 gap-2">{LILLOK_AURAS.filter(a=>a.id!=="none").map(a=>(<ShopItem key={a.id} owned={has("lillokAura",a.id)} equipped={eq("lillokAura",a.id)} price={a.price} onClick={()=>buy("lillokAura",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">Aura</div></ShopItem>))}</div></Section>
      <Section title="LilLok Pets" sub="Tiny companions that follow your LilLok."><div className="grid grid-cols-2 gap-2">{LILLOK_PETS.filter(p=>p.id!=="none").map(p=>(<ShopItem key={p.id} owned={has("lillokPet",p.id)} equipped={eq("lillokPet",p.id)} price={p.price} onClick={()=>buy("lillokPet",p)}><div className="font-bold text-sm">{p.name}</div><div className="text-[10px] opacity-70">Pet</div></ShopItem>))}</div></Section>
      <Section title="Voice Packs" sub="Voice styles for your LilLok."><div className="grid grid-cols-2 gap-2">{VOICE_PACKS.filter(v=>v.id!=="default").map(v=>(<ShopItem key={v.id} owned={has("voicePack",v.id)} equipped={eq("voicePack",v.id)} price={v.price} onClick={()=>buy("voicePack",v)}><div className="font-bold text-sm">{v.name}</div><div className="text-[10px] opacity-70">Voice pack</div></ShopItem>))}</div></Section>
    </>)}
    {activeTab==="music"&&(<Section title="Background Music" sub="Ambient soundtracks for your studio sessions."><div className="grid grid-cols-2 gap-2">{MUSIC_PACKS.filter(m=>showAll||m.id!=="none").map(m=>{const own=has("musicPack",m.id);const e2=eq("musicPack",m.id);return(<ShopItem key={m.id} owned={own} equipped={e2} price={m.price} wip={!!WIP_CATEGORIES.musicPack} onClick={()=>buy("musicPack",m)}><div className="font-bold text-sm">{m.name}</div><div className="text-[10px] opacity-70">Music</div></ShopItem>);})}</div></Section>)}
    <p className="mt-5 text-center text-xs opacity-60">Balance: {loks} Loks</p>
  </div>);
}
