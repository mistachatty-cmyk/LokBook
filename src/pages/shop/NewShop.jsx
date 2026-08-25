// The default Shop as of the Stage 2 redesign. LegacyShop.jsx is the frozen
// pre-redesign UI, still reachable via the mode toggle for the two archived
// tabs (Export, Music). This one gets all the navigation and clarity work;
// Legacy gets integrity fixes only, never this.
import { useState, useEffect, useRef } from "react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { isArchivedRotation } from "../../engine/rotation.js";
import { useViewport } from "../../engine/viewport.js";
import { useT, THEMES, SKIN_WAVE_GATE, SKIN_WAVE_3_GATE, SKIN_WAVE_4_GATE, SKIN_WAVE_5_GATE, blotBorderStyle } from "../../theme/theme.js";
import {
  EFFECTS, NAME_COLORS, PAPERS, MYTHIC_ITEMS, CELEBRATIONS, ANIMATION_FX, SKIES,
  CURSORS, FONT_PACKS, STICKER_PACKS, FRAMES, REACTION_PACKS, AVATAR_ACCENTS,
  STUDIO_MODULES, BLOT_BORDERS, BLOT_PERSONALITIES, BLOT_IDLE_ANIMATIONS, BLOT_EXPRESSIONS, BLOT_BOUNCES,
  LILLOK_GEAR, LILLOK_SKINS, LILLOK_AURAS, LILLOK_PETS,
  WORLD_SKINS, ownsCosmetic, getDailyRotation, getWeeklyRotation, TIERS,
} from "../../constants.jsx";
import { ShopItem, MythicCard, Section, TYPE_LABELS, refuseParkedFactory } from "./shared.jsx";

// Real signal: getWeeklyRotation() buckets on Math.floor(Date.now()/604800000),
// and the Unix epoch was a THURSDAY — so the rotation rolls over every
// Thursday 00:00 UTC, not Sunday. The old copy counted down to Sunday and on
// Sunday itself rendered "7d remaining" on a rotation about to flip. This
// counts the actual remaining time in the actual bucket, always 1-7.
function daysUntilWeeklyRollover() {
  const WEEK_MS = 604800000;
  const remaining = WEEK_MS - (Date.now() % WEEK_MS);
  return Math.ceil(remaining / 86400000);
}

// One place to decide what "you can't reach this yet" looks like for a Gyro
// Skin, since the reason differs from a plain `parked` refusal (this one is a
// permission/setting the PLAYER controls, not missing engineering work).
function gyroUnavailableReason(enableGyroscope) {
  if (!enableGyroscope) return "Turn on Gyroscope in Settings to preview this skin's motion.";
  return null;
}

export default function NewShop({ccTier,say,modules=[],onBuyModule,ownedTiers=[],onBuyTier,loks,lokPass,kids,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies=[],onSky,animFx,ownedAnimFx=[],onAnimFx,fontPack,onFontPack,cursorPack,onCursorPack,stickerPack,onStickerPack,cosmetics,owned,onBuyCosmetic,setKids,onBuyPass,onTheme,onEffect,onCc,mythicOwned,mythicEquipped,onBuyMythic,dailyOwned,weeklyOwned,celebrationStyle,onCelebrationStyle,enableGyroscope,onSwitchToLegacy}){
  const T=useT();
  const {tier:vpTier}=useViewport();
  const gridCols = vpTier==="desktop" ? "grid-cols-4" : vpTier==="tablet" ? "grid-cols-3" : "grid-cols-2";

  const[catTab,setCatTab]=useState("featured");
  const[skinTab,setSkinTab]=useState("themes"); // themes | live | gyro
  const[modTab,setModTab]=useState("brush");
  const[showAll,setShowAll]=useState(false);
  const[query,setQuery]=useState("");
  const[ownedOnly,setOwnedOnly]=useState(false);
  const[showResetConfirm,setShowResetConfirm]=useState(false);
  useBodyScrollLock(showResetConfirm);

  // --- tab strip: scroll the active pill into view -------------------------
  const stripRef=useRef(null);
  const pillRefs=useRef({});
  useEffect(()=>{
    const el=pillRefs.current[catTab];
    if(el&&stripRef.current) el.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
  },[catTab]);

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
  ];
  const resetAllCosmetics=()=>{resetRows.forEach(([,,,apply])=>apply());setShowResetConfirm(false);say("All cosmetics reset to default — nothing un-owned","success");};

  const waveNeeded=w=>w>=5?SKIN_WAVE_5_GATE:w>=4?SKIN_WAVE_4_GATE:w>=3?SKIN_WAVE_3_GATE:w>=2?SKIN_WAVE_GATE:0;
  const waveReached=ownedThemes.length>=SKIN_WAVE_5_GATE?5:ownedThemes.length>=SKIN_WAVE_4_GATE?4:ownedThemes.length>=SKIN_WAVE_3_GATE?3:ownedThemes.length>=SKIN_WAVE_GATE?2:1;
  const has=(cat,id)=>ownsCosmetic(owned,cat,id);const eq=(cat,id)=>cosmetics[cat]===id;
  const refuseParked=refuseParkedFactory(say);
  const buy=(cat,item)=>{if(refuseParked(item))return;onBuyCosmetic(cat,item);};

  // Simple mode's whole reason to exist: only categories with a real effect.
  // Export and Music stay in Legacy — they are ARCHIVED_ROTATION_TYPES-shaped
  // (visible, refused, explained), not worth a tab of their own here.
  const ALL_CATS=[["featured","Featured"],["themes","Skins"],["mythic","💎 Mythic"],["effects","Effects"],["fx","FX"],["skies","Skies"],["cosmetic","Cosmetics"],["studio","Studio"],["blot","Blot Shop"],["lillok","LilLok+"],["paper","Paper"],["cursors","Cursors"],["fonts","Fonts"],["stickers","Stickers"]];
  const moduleTypes=[{type:"brush",label:"Brushes"},{type:"tool",label:"Tools"},{type:"feature",label:"Features"},{type:"canvas",label:"Canvas"}];

  // --- search: filters visible cards by name within the active tab ---------
  const q=query.trim().toLowerCase();
  const matches=name=>!q||String(name).toLowerCase().includes(q);
  const ownedFilter=isOwned=>!ownedOnly||isOwned;
  const showCard=(name,isOwned)=>matches(name)&&ownedFilter(isOwned);

  // --- jump menu: anchor links at the top of a multi-section tab -----------
  const JumpMenu=({items})=>(
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mt-1 mb-1">
      {items.map(([id,label])=>(
        <a key={id} href={`#shop-${id}`}
          onClick={e=>{e.preventDefault();document.getElementById(`shop-${id}`)?.scrollIntoView({behavior:"smooth",block:"start"});}}
          className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{border:`2px solid ${T.shadow}`,background:T.paper,color:T.ink}}>{label}</a>
      ))}
    </div>
  );

  return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Shop</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Everything here is free play.":"Spend Loks you earn — or grab the LokPass."}</p>
    <div className="mt-2 flex items-center gap-2 p-2 rounded-xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="min-w-0 flex-1"><div className="font-bold text-xs">New shop</div><div className="text-[10px] opacity-60 leading-snug">Only categories that actually do something right now.</div></div>
      {onSwitchToLegacy&&<button onClick={onSwitchToLegacy} aria-pressed={false} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>Show legacy</button>}
    </div>

    <div className="mt-2 flex items-center gap-2">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this tab…"
        className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-xs" style={{border:`2px solid ${T.shadow}`,background:T.card,color:T.ink}} />
      <button onClick={()=>setOwnedOnly(v=>!v)} aria-pressed={ownedOnly} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold" style={{border:`2px solid ${ownedOnly?T.accent:T.shadow}`,background:ownedOnly?T.ink:T.card,color:ownedOnly?T.paper:T.ink}}>Owned</button>
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

    {/* Edge fade signals there is more to scroll — the tab strip has 14+
        pills and nothing previously hinted at the ones off-screen. */}
    <div className="relative mt-3">
      <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1">
        {ALL_CATS.map(([id,l])=>(<button key={id} ref={el=>pillRefs.current[id]=el} onClick={()=>setCatTab(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:catTab===id?T.ink:T.card,color:catTab===id?T.paper:T.ink}}>{l}</button>))}
      </div>
      <div className="pointer-events-none absolute top-0 right-0 h-full w-8" style={{background:`linear-gradient(90deg, transparent, ${T.paper})`}}/>
    </div>
    {/* 👀 All used to sit inside the category row, reading as a 16th
        category. It is a global modifier — showing locked/hidden defaults —
        so it lives on its own row now. */}
    <div className="mt-1.5 flex justify-end">
      <button onClick={()=>setShowAll(s=>!s)} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${showAll?T.accent:T.shadow}`,background:showAll?T.ink:T.card,color:showAll?T.paper:T.shadow}} aria-pressed={showAll}>👀 Show all defaults</button>
    </div>

    {catTab==="featured"&&(<>
      {!kids&&(<div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.ink,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold">LokPass</div><p className="text-sm opacity-85 mt-1">No ads. Every UI theme unlocked. PASS badge.</p><button onClick={onBuyPass} disabled={lokPass} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:lokPass?"transparent":T.accent,color:lokPass?T.paper:T.onAccent,border:`3px solid ${T.paper}`,opacity:lokPass?0.7:1}} aria-label={lokPass?"LokPass active":"Get LokPass"}>{lokPass?"Active ✓":"Get LokPass — $2.99"}</button></div>)}
      <div className="mt-3 p-3 rounded-2xl flex items-center gap-3" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="flex-1"><div className="lok-display font-extrabold">Lok Juniors {kids?"· ON":""}</div><div className="text-xs opacity-70">Safe walled-garden mode for kids &amp; classrooms.</div></div><button onClick={()=>setKids(!kids)} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:kids?T.alt:T.card,color:kids?"#fff":T.ink,border:`3px solid ${T.ink}`}} aria-pressed={kids}>{kids?"Turn off":"Turn on"}</button></div>
      {(()=>{const dS=Math.floor(Date.now()/86400000);const pick=(a,o)=>a[(dS+o)%a.length];const tE=Object.entries(THEMES);const tT=tE[dS%tE.length];const tEf=pick(EFFECTS,1);const tC=pick(NAME_COLORS.filter(x=>x.id!=="default"),2);const tP=pick(PAPERS.filter(x=>x.id!=="plain"),3);const dailyItems=getDailyRotation();const weeklyItems=getWeeklyRotation();return(<>
        <Section title="✨ Today's picks" sub="New items featured daily!"><div className={`grid ${gridCols} gap-2`}>
          {(()=>{const[id,th]=tT;const own=ownedThemes.includes(id);const e2=uiTheme===id;return(<ShopItem key={"ft-"+id} owned={own} equipped={e2} price={th.price} loks={loks} onClick={()=>onTheme(id)}><div className="font-bold text-sm truncate">{th.name}</div><div className="text-[10px] opacity-70 truncate">Skin</div></ShopItem>);})()}
          {(()=>{const e=tEf;const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={"fe-"+e.id} owned={own} equipped={e2} price={e.price} loks={loks} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm truncate">{e.name}</div><div className="text-[10px] opacity-70 truncate">Effect</div></ShopItem>);})()}
          {(()=>{const c=tC;return(<ShopItem key={"fc-"+c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} loks={loks} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm truncate" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div><div className="text-[10px] opacity-70 truncate">Name color</div></ShopItem>);})()}
          {(()=>{const p=tP;const own=has("paper",p.id);const e2=eq("paper",p.id);return(<ShopItem key={"fp-"+p.id} owned={own} equipped={e2} price={p.price} loks={loks} onClick={()=>buy("paper",p)}><div className="font-bold text-sm truncate">{p.name}</div><div className="text-[10px] opacity-70 truncate">Paper</div></ShopItem>);})()}
        </div></Section>
        {weeklyItems.length>0&&<Section title="🗓️ This Week's Rotation" sub={`${weeklyItems.length} exclusive items — ${daysUntilWeeklyRollover()}d remaining!`}><div className={`grid ${gridCols} gap-2`}>{weeklyItems.filter(item=>showCard(item.name,weeklyOwned?.includes(item.id))).map(item=>{const own=weeklyOwned?.includes(item.id);return(<ShopItem key={item.id} owned={own} rarity={item.rarity} price={item.price} loks={loks} wip={isArchivedRotation(item)} onClick={()=>{if(!own)onBuyMythic?.(item,"weekly");}}><div className="font-bold text-sm truncate">{item.name}</div><div className="text-[9px] font-extrabold uppercase tracking-wide" style={{color:T.accent}}>{TYPE_LABELS[item.type]||item.type}</div><div className="text-[10px] opacity-70 truncate">{item.desc}</div></ShopItem>);})}</div></Section>}
        {dailyItems.length>0&&<Section title="🌸 Today's Rotation" sub={`${dailyItems.length} daily deals — grab before they're gone!`}><div className={`grid ${gridCols} gap-2`}>{dailyItems.filter(item=>showCard(item.name,dailyOwned?.includes(item.id))).map(item=>{const own=dailyOwned?.includes(item.id);return(<ShopItem key={item.id} owned={own} rarity={item.rarity} price={item.price} loks={loks} wip={isArchivedRotation(item)} onClick={()=>{if(!own)onBuyMythic?.(item,"daily");}}><div className="font-bold text-sm truncate">{item.name}</div><div className="text-[9px] font-extrabold uppercase tracking-wide" style={{color:T.accent}}>{TYPE_LABELS[item.type]||item.type}</div><div className="text-[10px] opacity-70 truncate">{item.desc}</div></ShopItem>);})}</div></Section>}
      </>);})()}
    </>)}

    {catTab==="themes"&&!kids&&(()=>{
      // Skins: Themes (static) / Live Skins (animated Wave 4/5) / Gyro Skins
      // (tilt-reactive — the Stage 4 class; empty until those themes ship,
      // but the navigation is ready for them rather than bolted on later).
      const entries=Object.entries(THEMES);
      const isGyro=([,th])=>th?.dynamic?.driver==="gyro";
      const isLive=([,th])=>th?.animated&&!isGyro([,th]);
      const isStatic=([,th])=>!th?.animated&&!isGyro([,th]);
      const bucket=skinTab==="live"?entries.filter(isLive):skinTab==="gyro"?entries.filter(isGyro):entries.filter(isStatic);
      const waveFiltered=bucket.filter(([,th])=>showAll||(th.wave||1) < 2 || ownedThemes.length>=SKIN_WAVE_GATE)
        .filter(([,th])=>showAll||(th.wave||1) < 3 || ownedThemes.length>=SKIN_WAVE_3_GATE)
        .filter(([,th])=>showAll||(th.wave||1) < 4 || ownedThemes.length>=SKIN_WAVE_4_GATE)
        .filter(([,th])=>showAll||(th.wave||1) < 5 || ownedThemes.length>=SKIN_WAVE_5_GATE)
        .filter(([id,th])=>showCard(th.name,ownedThemes.includes(id)));
      return (<>
        <div className="mt-3 flex gap-1.5">
          {[["themes","Themes"],["live","Live Skins"],["gyro","Gyro Skins"]].map(([id,label])=>(
            <button key={id} onClick={()=>setSkinTab(id)} className="lok-btn flex-1 px-2 py-1.5 rounded-full text-xs font-bold" style={{border:`2px solid ${T.ink}`,background:skinTab===id?T.ink:T.card,color:skinTab===id?T.paper:T.ink}}>{label}</button>
          ))}
        </div>
        <Section title={skinTab==="live"?"Live Skins":skinTab==="gyro"?"Gyro Skins":"UI themes"}
          sub={skinTab==="gyro"?"Tilt-reactive palettes — motion driven by your phone's gyroscope.":"Own skins to unlock new waves."}>
          {skinTab==="gyro"&&waveFiltered.length===0&&(
            <div className="p-4 rounded-xl text-center text-xs opacity-60" style={{border:`2px dashed ${T.shadow}`}}>
              Coming with the next drop — tilt-reactive themes aren't out yet.
            </div>
          )}
          <div className={`grid ${gridCols} gap-3`}>{waveFiltered.map(([id,th])=>{
            const own=ownedThemes.includes(id);const e2=uiTheme===id;
            const waveLocked=!own&&!lokPass&&(th.wave||1)>waveReached;
            const gyroReason=skinTab==="gyro"?gyroUnavailableReason(enableGyroscope):null;
            return(<button key={id} disabled={!!gyroReason&&!own} onClick={()=>{
                if(gyroReason){say?.(gyroReason,"error");return;}
                if(waveLocked){say?.(`${th.name} unlocks at Wave ${th.wave||1} — own ${waveNeeded(th.wave||1)} skins to reach it`,"error");return;}
                onTheme(id);
              }} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:own||showAll?T.ink:T.shadow}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`,opacity:(own||showAll)?(gyroReason?0.6:1):.5}} aria-label={`Theme ${th.name}`}>
              <div className="flex h-10 relative">{[th.paper,th.ink,th.accent,th.alt].map((c,k)=>(<div key={k} className="flex-1" style={{background:c}}/>))}
                {th.animated&&<><div className="absolute inset-0" style={{background:`linear-gradient(110deg, transparent 30%, ${th.accent}55 50%, transparent 70%)`,backgroundSize:"220% 100%",animation:"loksheen 2.8s linear infinite"}}/><span className="absolute top-1 right-1 lok-display px-1.5 rounded text-[9px] font-extrabold" style={{background:th.accent,color:th.onAccent}}>● LIVE</span></>}
              </div>
              <div className="px-2.5 py-2">
                <div className="font-bold text-sm">{th.name}</div>
                <div className="text-xs opacity-70">{th.desc}</div>
                <div className="mt-1 text-xs font-extrabold" style={{color:T.accent}}>{e2?"On ✓":own?"Equip":lokPass?"In PASS":waveLocked?`🔒 Wave ${th.wave||1} · ${th.price} Loks`:`${th.price} Loks`}</div>
                {gyroReason&&!own&&<div className="mt-1 text-[9px] opacity-60">{gyroReason}</div>}
              </div>
            </button>);})}
          </div>
        </Section>
      </>);
    })()}

    {catTab==="mythic"&&!kids&&(<><Section title="💎 Mythic Collection" sub="Legendary quality. GSAP-animated previews. The rarest items in LokBook."><div className={`grid ${gridCols} gap-3`}>{MYTHIC_ITEMS.filter(item=>showCard(item.name,mythicOwned?.includes(item.id))).map(item=>{const own=mythicOwned?.includes(item.id);const e2=mythicEquipped===item.id;return(<MythicCard key={item.id} item={item} own={own} equipped={e2} onBuy={()=>onBuyMythic?.(item)}/>);})}</div></Section>
      <Section title="🎉 Celebrations" sub="Event-only celebration styles — unbuyable. Click to equip."><div className={`grid ${gridCols} gap-3`}>{CELEBRATIONS.map(c=>{const e2=celebrationStyle===c.id;return(<button key={c.id} onClick={()=>{onCelebrationStyle?.(c.id);}} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:T.ink}`,background:T.card,opacity:e2?1:0.6,boxShadow:`4px 4px 0 ${T.shadow}`}}><div className="flex items-center justify-center py-6" style={{background:`linear-gradient(135deg, ${T.paper}, ${T.card})`}}><div className="text-3xl">{c.id==="confetti"?"🎊":c.id==="inkbloom"?"🌸":"✨"}</div></div><div className="px-2.5 py-2"><div className="font-bold text-sm">{c.name}</div><div className="text-[10px] opacity-70">{c.desc}</div><div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest" style={{color:e2?T.accent:T.alt}}>{e2?"ON ✓":"EVENT ITEM — TAP TO EQUIP, FREE"}</div></div></button>);})}</div></Section></>)}

    {catTab==="effects"&&(<Section title="Page effects" sub="Background effects that play on your profile."><div className={`grid ${gridCols} gap-2`}>{EFFECTS.filter(e=>showCard(e.name,ownedEffects.includes(e.id))).map(e=>{const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={e.id} owned={own} equipped={e2} price={e.price} loks={loks} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm">{e.name}</div><div className="text-[10px] opacity-70">Page effect</div></ShopItem>);})}</div></Section>)}
    {catTab==="fx"&&(<Section title="Animation FX" sub="Visual effects play over your flip when viewed."><div className={`grid ${gridCols} gap-2`}>{ANIMATION_FX.filter(f=>showAll||f.id!=="none").filter(f=>showCard(f.name,ownedAnimFx.includes(f.id))).map(f=>{const own=ownedAnimFx.includes(f.id);const e2=animFx===f.id;return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} loks={loks} onClick={()=>onAnimFx(f.id,f)}><div className="font-bold text-sm">{f.name}</div>{f.desc&&<div className="text-[10px] opacity-70">{f.desc}</div>}</ShopItem>);})}</div></Section>)}
    {catTab==="skies"&&(<Section title="Skies" sub="Animated sky backgrounds behind your content."><div className={`grid ${gridCols} gap-2`}>{SKIES.filter(s=>showCard(s.name,ownedSkies.includes(s.id))).map(s=>{const own=ownedSkies.includes(s.id);const e2=sky===s.id;return(<ShopItem key={s.id} owned={own} equipped={e2} price={s.price} loks={loks} onClick={()=>onSky(s.id,s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">Sky</div></ShopItem>);})}</div></Section>)}
    {catTab==="cursors"&&(<Section title="Drawing Cursors" sub="Custom cursor styles for the canvas."><div className={`grid ${gridCols} gap-2`}>{CURSORS.filter(c=>showAll||c.id!=="default").filter(c=>showCard(c.name,has("cursorPack",c.id))).map(c=>{const own=has("cursorPack",c.id);const e2=cursorPack===c.id;return(<ShopItem key={c.id} owned={own} equipped={e2} price={c.price} loks={loks} wip={!!c.parked} onClick={()=>{if(refuseParked(c))return;onCursorPack(c.id,c);}}><div className="font-bold text-sm">{c.name}</div><div className="text-[10px] opacity-70">Cursor</div></ShopItem>);})}</div></Section>)}
    {catTab==="fonts"&&(<Section title="Font Packs" sub="Change the app font style."><div className={`grid ${gridCols} gap-2`}>{FONT_PACKS.filter(f=>showAll||f.id!=="default").filter(f=>showCard(f.name,has("fontPack",f.id))).map(f=>{const own=has("fontPack",f.id);const e2=fontPack===f.id;return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} loks={loks} wip={!!f.parked} onClick={()=>{if(refuseParked(f))return;onFontPack(f.id,f);}}><div className="font-bold text-sm">{f.name}</div>{f.desc&&<div className="text-[10px] opacity-70">{f.desc}</div>}</ShopItem>);})}</div></Section>)}
    {catTab==="stickers"&&(<Section title="Sticker Packs" sub="Unlock themed sticker sets for your Studio."><div className={`grid ${gridCols} gap-2`}>{STICKER_PACKS.filter(s=>showAll||s.id!=="emoji").filter(s=>showCard(s.name,has("stickerPack",s.id))).map(s=>{const own=has("stickerPack",s.id);const e2=stickerPack===s.id;return(<ShopItem key={s.id} owned={own} equipped={e2} price={s.price} loks={loks} wip={!!s.parked} onClick={()=>{if(refuseParked(s))return;onStickerPack(s.id,s);}}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">{s.stickers.slice(0,4).join(" ")}{s.stickers.length>4?" +"+s.stickers.length:""}</div></ShopItem>);})}</div></Section>)}

    {catTab==="cosmetic"&&(<>
      <JumpMenu items={[["nameColor","Name color"],["frames","Frames"],["reactions","Reactions"],["accents","Accents"],["worldskins","World skins"]]}/>
      <Section id="shop-nameColor" title="Name color"><div className={`grid ${gridCols} gap-2`}>{NAME_COLORS.filter(c=>showCard(c.name,has("nameColor",c.id))).map(c=>(<ShopItem key={c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} loks={loks} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div></ShopItem>))}</div></Section>
      <Section id="shop-frames" title="Avatar frames" sub="Decorative borders around your avatar."><div className={`grid ${gridCols} gap-2`}>{FRAMES.filter(f=>showCard(f.name,has("frame",f.id))).map(f=>{const own=has("frame",f.id);const e2=eq("frame",f.id);return(<ShopItem key={f.id} owned={own} equipped={e2} price={f.price} loks={loks} onClick={()=>buy("frame",f)}><div className="font-bold text-sm">{f.name}</div><div className="text-[10px] opacity-70">Avatar frame</div></ShopItem>);})}</div></Section>
      <Section id="shop-reactions" title="Reaction packs" sub="Emoji/lok reaction sets for posts."><div className={`grid ${gridCols} gap-2`}>{REACTION_PACKS.filter(r=>showCard(r.name,has("reactionPack",r.id))).map(r=>(<ShopItem key={r.id} owned={has("reactionPack",r.id)} equipped={eq("reactionPack",r.id)} price={r.price} loks={loks} onClick={()=>buy("reactionPack",r)}><div className="font-bold text-sm leading-tight">{r.name}</div><div className="text-[10px] opacity-70">Reaction set</div></ShopItem>))}</div></Section>
      <Section id="shop-accents" title="Avatar accents" sub="Small decorative elements on your avatar."><div className={`grid ${gridCols} gap-2`}>{AVATAR_ACCENTS.filter(a=>showCard(a.name,has("avatarAccent",a.id))).map(a=>(<ShopItem key={a.id} owned={has("avatarAccent",a.id)} equipped={eq("avatarAccent",a.id)} price={a.price} loks={loks} onClick={()=>buy("avatarAccent",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">Avatar accent</div></ShopItem>))}</div></Section>
      <Section id="shop-worldskins" title="World skins" sub="Change the look of the 3D globe in World."><div className={`grid ${gridCols} gap-2`}>{WORLD_SKINS.filter(s=>showAll||s.id!=="none").filter(s=>showCard(s.name,has("globeSkin",s.id))).map(s=>(<ShopItem key={s.id} owned={has("globeSkin",s.id)} equipped={eq("globeSkin",s.id)} price={s.price} loks={loks} onClick={()=>buy("globeSkin",s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">{s.desc}</div></ShopItem>))}</div></Section>
    </>)}

    {catTab==="studio"&&(<>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{moduleTypes.map(({type,label})=>(<button key={type} onClick={()=>setModTab(type)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:modTab===type?T.ink:T.card,color:modTab===type?T.paper:T.ink}}>{label}</button>))}</div>
      <Section title="Layer packs" sub="How many layers the Easel gives you. Pick an unlocked pack from the tier pills in Studio.">
        <div className={`grid ${gridCols} gap-2`}>{TIERS.filter(t=>showAll||t.price>0).filter(t=>showCard(t.label,ownedTiers.includes(t.layers))).map(t=>{const own=ownedTiers.includes(t.layers);return(
          <ShopItem key={t.layers} owned={own} equipped={own} price={t.price} loks={loks} onClick={()=>onBuyTier?.(t)}>
            <div className="font-bold text-sm">{t.label}</div>
            <div className="text-[10px] opacity-70">Up to {t.layers} layers</div>
          </ShopItem>);})}</div>
      </Section>
      <Section title="Modules" sub="Expand your studio toolbox. Brush, tool and feature modules unlock controls on the easel; canvas &amp; animation modules apply in Studio."><div className={`grid ${gridCols} gap-2`}>{STUDIO_MODULES.filter(m=>m.type===modTab).filter(m=>showAll||m.price>0).filter(m=>showCard(m.name,modules.includes(m.id))).map(m=>{const own=modules.includes(m.id);return(<ShopItem key={m.id} owned={own} equipped={own} price={m.price} loks={loks} wip={!!m.parked} onClick={()=>{if(refuseParked(m))return;if(own){say("Already owned");}else if(m.price===0){say("Free — claim it!");onBuyModule?.(m);}else{onBuyModule?.(m);}}}><div className="font-bold text-sm">{m.name}</div>{m.desc&&<div className="text-[10px] opacity-70">{m.desc}</div>}</ShopItem>);})}</div></Section>
      {!modules.includes("module_uber")&&<Section title="Studio Pro" sub="Blend modes, symmetry (mirror · radial), fill, eyedropper, marker &amp; chalk brushes"><div className="flex items-center justify-between p-2.5 rounded-xl" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="font-bold text-sm">Pro easel unlock</div>{ccTier?<span className="text-sm font-extrabold" style={{color:T.alt}}>Active ✓</span>:<button onClick={onCc} className="lok-btn px-3 py-1 rounded-full text-sm font-extrabold" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>120 Loks</button>}</div></Section>}
    </>)}

    {catTab==="paper"&&(<Section title="Canvas paper" sub="Paper textures and drawing guides."><div className={`grid ${gridCols} gap-2`}>{PAPERS.filter(p=>showCard(p.name,has("paper",p.id))).map(p=>(<ShopItem key={p.id} owned={has("paper",p.id)} equipped={eq("paper",p.id)} price={p.price} loks={loks} onClick={()=>buy("paper",p)}><div className="font-bold text-sm">{p.name}</div><div className="text-[10px] opacity-70">Canvas texture</div></ShopItem>))}</div></Section>)}

    {catTab==="blot"&&(<>
      <div className="mt-4 p-4 rounded-2xl text-center" style={{background:T.card,border:`2px solid ${T.shadow}`}}>
        <div className="text-xs font-bold opacity-70 mb-2">Current blot</div>
        <div className="flex items-center justify-center" style={{height:140}}>
          <div className="rounded-full flex items-center justify-center" style={{width:120,height:120,background:T.paper,...blotBorderStyle(cosmetics.blotBorder,T)}}>
            <div style={{width:90,height:90,borderRadius:"50%",background:`linear-gradient(135deg, ${T.ink}66, ${T.accent}33)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🫧</div>
          </div>
        </div>
        <div className="mt-2 text-sm font-bold">{BLOT_BORDERS.find(b=>b.id===cosmetics.blotBorder)?.name||"Default"}</div>
      </div>
      <JumpMenu items={[["borders","Borders"],["personalities","Personalities"],["idle","Idle"],["expressions","Expressions"],["bounces","Bounces"],["gear","Gear"]]}/>
      <Section id="shop-borders" title="Blot borders" sub="Borders for your LilLok container.">
        <div className={`grid ${gridCols} gap-2`}>{BLOT_BORDERS.filter(b=>showCard(b.name,has("blotBorder",b.id))).map(b=>(
          <ShopItem key={b.id} owned={has("blotBorder",b.id)} equipped={eq("blotBorder",b.id)} price={b.price} loks={loks} onClick={()=>buy("blotBorder",b)}
            swatch={<div className="flex items-center justify-center py-3"><div className="rounded-full" style={{width:44,height:44,background:T.paper,...blotBorderStyle(b.id,T)}}/></div>}>
            <div className="font-bold text-sm">{b.name}</div><div className="text-[10px] opacity-70">Blot border</div>
          </ShopItem>))}
        </div>
      </Section>
      <Section id="shop-personalities" title="Blot personalities" sub="Unlock unique voices for your LilLok companion."><div className={`grid ${gridCols} gap-2`}>{BLOT_PERSONALITIES.filter(p=>showCard(p.name,has("blotPersonality",p.id))).map(p=>(<ShopItem key={p.id} owned={has("blotPersonality",p.id)} equipped={eq("blotPersonality",p.id)} price={p.price} loks={loks} onClick={()=>buy("blotPersonality",p)}><div className="font-bold text-sm">{p.emoji} {p.name}</div><div className="text-[10px] opacity-70">{p.desc}</div></ShopItem>))}</div></Section>
      <Section id="shop-idle" title="Idle animations" sub="How your blot moves when resting."><div className={`grid ${gridCols} gap-2`}>{BLOT_IDLE_ANIMATIONS.filter(a=>showCard(a.name,has("blotIdleAnimation",a.id))).map(a=>(<ShopItem key={a.id} owned={has("blotIdleAnimation",a.id)} equipped={eq("blotIdleAnimation",a.id)} price={a.price} loks={loks} onClick={()=>buy("blotIdleAnimation",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">{a.desc}</div></ShopItem>))}</div></Section>
      <Section id="shop-expressions" title="Expressions" sub="How your blot looks and feels."><div className={`grid ${gridCols} gap-2`}>{BLOT_EXPRESSIONS.filter(e=>showCard(e.name,has("blotExpression",e.id))).map(e=>(<ShopItem key={e.id} owned={has("blotExpression",e.id)} equipped={eq("blotExpression",e.id)} price={e.price} loks={loks} onClick={()=>buy("blotExpression",e)}><div className="font-bold text-sm">{e.name}</div><div className="text-[10px] opacity-70">{e.desc}</div></ShopItem>))}</div></Section>
      <Section id="shop-bounces" title="Bounce styles" sub="Animation style when your blot taps."><div className={`grid ${gridCols} gap-2`}>{BLOT_BOUNCES.filter(b=>showCard(b.name,has("blotBounce",b.id))).map(b=>(<ShopItem key={b.id} owned={has("blotBounce",b.id)} equipped={eq("blotBounce",b.id)} price={b.price} loks={loks} onClick={()=>buy("blotBounce",b)}><div className="font-bold text-sm">{b.name}</div><div className="text-[10px] opacity-70">{b.desc}</div></ShopItem>))}</div></Section>
      <Section id="shop-gear" title="LilLok gear" sub="Accessories for your ink buddy."><div className={`grid ${gridCols} gap-2`}>{LILLOK_GEAR.filter(g=>g.id!=="none").filter(g=>showCard(g.name,has("gear",g.id))).map(g=>(<ShopItem key={g.id} owned={has("gear",g.id)} equipped={eq("gear",g.id)} price={g.price} loks={loks} onClick={()=>buy("gear",g)}><div className="font-bold text-sm">{g.name}</div><div className="text-[10px] opacity-70">LilLok accessory</div></ShopItem>))}</div></Section>
    </>)}

    {catTab==="lillok"&&(<>
      <JumpMenu items={[["skins","Skins"],["auras","Auras"],["pets","Pets"]]}/>
      <Section id="shop-skins" title="LilLok Skins" sub="Change your LilLok's appearance."><div className={`grid ${gridCols} gap-2`}>{LILLOK_SKINS.filter(s=>s.id!=="none").filter(s=>showCard(s.name,has("lillokSkin",s.id))).map(s=>(<ShopItem key={s.id} owned={has("lillokSkin",s.id)} equipped={eq("lillokSkin",s.id)} price={s.price} loks={loks} onClick={()=>buy("lillokSkin",s)}><div className="font-bold text-sm">{s.name}</div><div className="text-[10px] opacity-70">LilLok skin</div></ShopItem>))}</div></Section>
      <Section id="shop-auras" title="LilLok Auras" sub="Glowing effects around your LilLok."><div className={`grid ${gridCols} gap-2`}>{LILLOK_AURAS.filter(a=>a.id!=="none").filter(a=>showCard(a.name,has("lillokAura",a.id))).map(a=>(<ShopItem key={a.id} owned={has("lillokAura",a.id)} equipped={eq("lillokAura",a.id)} price={a.price} loks={loks} onClick={()=>buy("lillokAura",a)}><div className="font-bold text-sm">{a.name}</div><div className="text-[10px] opacity-70">Aura</div></ShopItem>))}</div></Section>
      <Section id="shop-pets" title="LilLok Pets" sub="Tiny companions that follow your LilLok."><div className={`grid ${gridCols} gap-2`}>{LILLOK_PETS.filter(p=>p.id!=="none").filter(p=>showCard(p.name,has("lillokPet",p.id))).map(p=>(<ShopItem key={p.id} owned={has("lillokPet",p.id)} equipped={eq("lillokPet",p.id)} price={p.price} loks={loks} onClick={()=>buy("lillokPet",p)}><div className="font-bold text-sm">{p.name}</div><div className="text-[10px] opacity-70">Pet</div></ShopItem>))}</div></Section>
      {/* Voice packs deliberately not shown here — they are a typography
          treatment on Blot's speech bubble under a misleading name
          (see docs/PARKED.md), and belong in a future rename rather than a
          navigation fix. Still reachable via Legacy. */}
    </>)}

    <p className="mt-5 text-center text-xs opacity-60">Balance: {loks} Loks</p>
  </div>);
}
