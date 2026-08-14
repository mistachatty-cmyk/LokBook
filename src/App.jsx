import {
  useState, useEffect, useRef, useCallback, useMemo,
  forwardRef, useImperativeHandle, Fragment, lazy, Suspense,
} from "react";
import { getStroke } from "perfect-freehand";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Battle from "./pages/Battle.jsx";
import OpenFront from "./pages/OpenFront.jsx";
import { CombatHub } from "./components/CombatHub.jsx";
import { gsap } from "gsap";
import Easel from "./Easel.jsx";

import { THEMES, SKIN_WAVE_GATE, SKIN_WAVE_3_GATE, SKIN_WAVE_4_GATE, ThemeCtx, useT, ART, blotBorderStyle, onColor } from "./theme/theme.js";
const Shop=lazy(()=>import("./pages/Shop.jsx"));
import { encodeLok } from "./engine/lokFormat.js";
import { encodeGIF } from "./engine/gif.js";
import { AD_PROVIDER } from "./ads.js";
import { useFeedback } from "./hooks/useFeedback.js";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock.js";
import { useGyroscope, GYRO_ZERO } from "./hooks/useGyroscope.js";
import {
  W, H, PROMPTS, PROMPT_META, CATEGORIES, MOTION_TYPES, CATEGORY_ICONS, WEEKLY_PROMPT, SUPA_URL, SUPA_KEY, PACE_PRESETS,
  BLOT_BORDERS, BLOT_PERSONALITIES, FOD_WINDOW_DAYS, ANIMATED_AVATAR_SPEND, ADS, adsFor, QUEST_POOL, REACTION_SETS, LILLOK_SPEECH,
  PX_PER_FRAME, TIERS, FORMATS, KID_PROMPTS, INTERVENTIONS,
  MODES, FRONT_NAMES, EFFECTS, NAME_COLORS, FRAMES, REACTION_PACKS, AVATAR_ACCENTS, PAPERS, LILLOK_GEAR,
  SKIES, ANIMATION_FX, CURSORS, FONT_PACKS, MUSIC_PACKS, STICKER_PACKS, POST_EXPORTS, LILLOK_SKINS, LILLOK_AURAS, LILLOK_PETS, VOICE_PACKS, STUDIO_MODULES, BLENDS,
  RARITY, MYTHIC_ITEMS, CELEBRATIONS, getDailyRotation, getWeeklyRotation, fromDbPost, hasModule,
  OFFLINE_BONUS_HOURS, OFFLINE_BONUS_LOKS, BLOT_IDLE_ANIMATIONS, BLOT_EXPRESSIONS, BLOT_BOUNCES,
} from "./constants.jsx";
import { paperBase, drawBounce, drawBloom, drawNight, renderSequence, renderDoodle, renderAvatar, traceShape } from "./engine/draw.jsx";
import { TUTORIAL_PROJECTS, getTutorialGhostFrames } from "./engine/tutorials.js";
import NameTag from "./NameTag.jsx";
import { FramedAvatar, ReactionIcon, PageEffect, SkyEffect, GlobalStyle } from "./art.jsx";
import LilLokPanel, { LilLokBubble, LilLokSprite } from "./LilLok.jsx";
import { BlotSpeech } from "./components/BlotSpeech.jsx";
import { getBlotResponse } from "./engine/blotDialogue.js";
import InterventionFX from "./InterventionFX.jsx";
import EmptyState from "./EmptyState.jsx";
import GuestSavePrompt from "./GuestSavePrompt.jsx";
import SharePreview from "./SharePreview.jsx";
const Rooms=lazy(()=>import("./pages/Rooms.jsx"));
import { resolveCheat } from "./engine/bleepbox.js";
import MythicPreview from "./MythicPreview.jsx";
import "./steam/steamStore.jsx";
import { checkAchievements } from "./steam/achievements.jsx";
import LOGOS from "./logos.jsx";
import { starterHandle, isReservedName, suggestHandle } from "./identity.js";
import { generateBotPost, pickAmbientPosts, BOT_PERSONAS, isBotArtist, searchBotArtists, botBackCatalogue } from "./engine/botArt.js";
import { mintGuestPass, redeemGuestPass } from "./engine/guestPass.js";
import ThemeBackdrop from "./theme/ThemeBackdrop.jsx";
import { makeMatchBots, botProgress, botMomentum, botFinalT, judgeBattle, recordBattle, botLine, pickMidLine, BOT_TYPES } from "./engine/bots.js";
import { renderPromptArt } from "./engine/promptArt.js";
import { useMusic, MusicTicker, MusicSheet } from "./MusicPlayer.jsx";
import NewArtists from "./NewArtists.jsx";
import FeaturedArtist from "./FeaturedArtist.jsx";
import { upsertMyProfile, fetchNewestArtists, fetchRandomOlderArtists, searchArtists, fetchArtistByHandle, BOARD_SIZE } from "./engine/profiles.js";
import { supabase } from "./supabaseClient.js";
import { useAuth } from "./auth/AuthContext.jsx";
import { rotationTarget, isArchivedRotation, ROTATION_FONTS, ROTATION_STICKERS, ROTATION_REACTIONS } from "./engine/rotation.js";
import { normalizePack, newStickerId, putSticker, getSticker, listStickerIds, deleteSticker, resizeStickerImage, IMAGE_TYPES as STICKER_IMAGE_TYPES } from "./engine/stickers.js";
const Roadmap=lazy(()=>import("./pages/Roadmap.jsx"));
import { useViewport, RAIL_W } from "./engine/viewport.js";
import { pacedLoop, setHighRefresh } from "./engine/framerate.js";
import { pushSave, pullSave, syncIntent, progressOf } from "./engine/saveCloud.js";
import { adPlan, canShowInterstitial, FEED_AD_EVERY } from "./ads.js";
import AdRail from "./ads/AdRail.jsx";
import AdInterstitial from "./ads/AdInterstitial.jsx";
import AdFeedCard from "./ads/AdFeedCard.jsx";
import RewardedSheet from "./ads/rewarded.jsx";
import { DOUBLE_LOKS_MS, isActive } from "./engine/rewards.js";
import { isUnlocked, inkWeatherToday, nightShiftAmount, levelFor, getWeatherOverride, setWeatherOverride } from "./engine/unlocks.js";
import { ChestInventory } from "./components/ChestInventory.jsx";
import { ChestOpen } from "./components/ChestOpen.jsx";
import { XrayPreview } from "./components/XrayPreview.jsx";
import { Mail } from "./pages/Mail.jsx";
import WorldMapViewer from "./components/WorldMapViewer.jsx";
import { useGeolocation } from "./hooks/useGeolocation.js";
import { LocationPrivacySelector } from "./components/LocationPrivacySelector.jsx";
import { LocationBadge } from "./components/LocationBadge.jsx";
import { CHEST_TYPES, generateChestReward, getRandomChestType, LOKPAL_NAMES, LOKPAL_GREETINGS, LOKPAL_IRRITATION_MESSAGES } from "./constants.jsx";

// Font packs were fully inert: the root style read `cosmetics.fontPack`, but
// buying one writes the top-level `fontPack` state, which nothing ever read.
const DEFAULT_FONT = "'Schibsted Grotesk',system-ui,sans-serif";
const resolveFont = id => {
  if (!id || id === "default") return DEFAULT_FONT;
  return ROTATION_FONTS[id] || FONT_PACKS.find(f => f.id === id)?.font || DEFAULT_FONT;
};
import { findOrCreateDuel, fetchDuel, cancelWaitingDuel, submitDuelArt, finalizeDuel } from "./engine/duels.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getSvgPathFromStroke=stroke=>{if(!stroke.length)return"";const d=stroke.reduce((acc,[x0,y0],i,arr)=>{const[x1,y1]=arr[(i+1)%arr.length];acc.push(x0,y0,(x0+x1)/2,(y0+y1)/2);return acc;},["M",...stroke[0],"Q"]);d.push("Z");return d.join(" ");};

const DEMO_BRUSH_PRESETS=[
  {id:"starter",name:"Starter",flow:0.35,scatter:0.15,dabs:3,angleJitter:0.2,roundness:1},
  {id:"light",name:"Light Touch",flow:0.18,scatter:0.05,dabs:1,angleJitter:0.05,roundness:1},
  {id:"breezy",name:"Breezy",flow:0.25,scatter:0.5,dabs:5,angleJitter:0.6,roundness:0.6},
  {id:"featherweight",name:"Featherweight",flow:0.12,scatter:0.3,dabs:2,angleJitter:0.3,roundness:0.8},
  {id:"basics",name:"Bold Basics",flow:0.6,scatter:0.1,dabs:2,angleJitter:0.1,roundness:1},
];

const mem = new Map();
// Persistence ladder: the native shell's window.storage (Tauri/Steam) when
// present, otherwise localStorage, with an in-memory Map as the last resort.
// Without the localStorage rung the web build kept everything in memory only,
// so a refresh silently wiped the gallery, Loks, LilLok and owned modules —
// while Settings claimed "saves automatically on this device".
const store = {
  async get(k) {
    try { if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } } catch {}
    try { if (typeof localStorage !== "undefined") { const raw = localStorage.getItem(k); if (raw != null) return JSON.parse(raw); } } catch {}
    return mem.has(k) ? mem.get(k) : null;
  },
  async set(k, v) {
    mem.set(k, v);
    try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(k, JSON.stringify(v)); return true; } } catch {}
    // Throws QuotaExceededError once the gallery outgrows the ~5MB budget; the
    // caller surfaces that as "Gallery too big".
    try { if (typeof localStorage !== "undefined") { localStorage.setItem(k, JSON.stringify(v)); return true; } } catch { return false; }
    return false;
  },
};
const SAVE_KEY = "lok:save:v2"; const GALLERY_KEY = "lok:gallery:v2";

// ---- V2: LokServices backend (Supabase) — founder signups keep data long-term ----
async function founderSignup(handle,email,save_blob){
  const res=await fetch(`${SUPA_URL}/rest/v1/founder_signups`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`,Prefer:"return=minimal"},body:JSON.stringify({handle,email:email||null,source:"lok_alpha",save_blob})});
  if(!res.ok)throw new Error("signup failed "+res.status);
  return true;
}
function makeQuests(){return [...QUEST_POOL].sort(()=>Math.random()-.5).slice(0,3).map(q=>({...q,progress:0,done:false}));}
function applyLogo(id){
  const logo=LOGOS.find(l=>l.id===id)||LOGOS[0];
  const icon=document.getElementById("app-icon");
  const apple=document.getElementById("app-apple-icon");
  const theme=document.getElementById("app-theme-color");
  if(icon)icon.href=logo.file;
  if(apple)apple.href=logo.file;
  if(theme)theme.content=logo.themeColor;
}


function Onboard({onDone,onName,defaultName="",canInstall=false,onInstallClick}){
  const T=useT();const auth=useAuth();const[step,setStep]=useState(0);const[name,setName]=useState(defaultName);
  const[authEmail,setAuthEmail]=useState("");const[authSent,setAuthSent]=useState("");const[authBusy,setAuthBusy]=useState(false);
  const isIOS=typeof navigator!=="undefined"&&/iPad|iPhone|iPod/.test(navigator.userAgent);
  const sendLink=async()=>{const e=authEmail.trim();if(!e||!e.includes("@"))return;setAuthBusy(true);try{await auth.signInWithEmail(e);setAuthSent(e);}catch{}setAuthBusy(false);};
  const steps=[
    {t:"Welcome to LokBook",d:"Tiny hand-drawn animations. Swipe to flip.",color:T.accent},
    {t:"Draw · Battle · Earn",d:"Studio to draw, Battle to compete, LilLok to raise.",color:T.alt},
    {t:"Save your work",d:"Sign in once and your gallery follows you — new phone, same Loks, same LilLok.",kind:"account",color:T.accent},
    {t:"Add to Home Screen",d:isIOS?"Guest art needs this to stick.":"Keeps LokBook one tap away.",kind:"install",color:T.alt},
    {t:"Make it yours",d:"Your artist name — start with 50 Loks.",color:T.accent},
  ];
  const s=steps[step];const last=step===steps.length-1;
  const cardRef=useRef(null);const bodyRef=useRef(null);const acctRef=useRef(null);
  useEffect(()=>{if(cardRef.current)gsap.fromTo(cardRef.current,{opacity:0,y:24,scale:0.94},{opacity:1,y:0,scale:1,duration:0.45,ease:"back.out(1.6)"});},[]);
  useEffect(()=>{if(bodyRef.current)gsap.fromTo(bodyRef.current,{opacity:0,x:16},{opacity:1,x:0,duration:0.3,ease:"power2.out"});},[step]);
  useEffect(()=>{if(acctRef.current)gsap.fromTo(acctRef.current,{opacity:0,y:6},{opacity:1,y:0,duration:0.3,ease:"power2.out"});},[authSent,step]);
  const go=dir=>{if(bodyRef.current)gsap.to(bodyRef.current,{opacity:0,x:dir>0?-16:16,duration:0.12,ease:"power1.in",onComplete:()=>setStep(st=>st+dir)});else setStep(st=>st+dir);};
  const tapBtn=e=>gsap.fromTo(e.currentTarget,{scale:0.95},{scale:1,duration:0.25,ease:"back.out(3)"});
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.55)"}}>
    <div ref={cardRef} className="w-full rounded-3xl p-6 text-center" style={{maxWidth:380,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${s.color}`,transition:"box-shadow .3s ease"}}>
      <div ref={bodyRef}>
        <div className="mx-auto mb-3 rounded-full" style={{width:44,height:5,background:s.color,border:`1.5px solid ${T.ink}`}}/>
        <div className="lok-display text-xl font-extrabold mb-1" style={{color:T.ink}}>{s.t}</div>
        <p className="text-sm opacity-70 leading-snug">{s.d}</p>
        {s.kind==="account"&&(<div ref={acctRef} className="mt-3 text-left">
          {auth.isAuthenticated()?(<div className="text-sm font-bold text-center py-2" style={{color:T.alt}}>Signed in as {auth.getEmail()}</div>
          ):authSent?(<div className="text-sm text-center leading-snug py-2">Check <strong>{authSent}</strong> for the link.</div>
          ):(<>
            <div className="flex gap-1.5">
              <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} type="email" placeholder="your@email.com" aria-label="Email for account sign-in" onKeyDown={e=>e.key==="Enter"&&sendLink()} className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
              <button onClick={e=>{tapBtn(e);sendLink();}} disabled={authBusy} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:s.color,color:T.onAccent,border:`2.5px solid ${T.ink}`,opacity:authBusy?0.6:1}}>{authBusy?"…":"Go"}</button>
            </div>
            <div className="mt-2 text-[11px] opacity-55 leading-snug text-center">No password, just a magic link. Skip to try as a guest — art stays on this device, and can be cleared after ~a week without the next step.</div>
          </>)}
        </div>)}
        {s.kind==="install"&&(<div className="mt-3">
          {isIOS?(<div className="text-xs leading-snug text-center p-2.5 rounded-xl font-bold" style={{border:`2px dashed ${T.ink}`,background:T.paper}}>Tap Share in Safari → "Add to Home Screen"</div>
          ):canInstall?(<button onClick={onInstallClick} className="lok-btn lok-display w-full py-2.5 rounded-xl font-extrabold text-sm" style={{background:s.color,color:T.onAccent,border:`3px solid ${T.ink}`}}>Install now</button>
          ):(<div className="text-[11px] opacity-55 text-center py-1">Browser menu → "Add to Home Screen" any time.</div>)}
        </div>)}
        {last&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your artist name" aria-label="Artist name" className="mt-3 w-full px-4 py-2.5 rounded-xl text-center font-bold text-sm" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>}
      </div>
      <div className="flex justify-center gap-1.5 my-4">{steps.map((st,i)=>(<div key={i} style={{width:i===step?22:8,height:6,borderRadius:4,background:i<=step?s.color:T.shadow,transition:"width .25s ease, background .25s ease"}}/>))}</div>
      <button onClick={e=>{tapBtn(e);if(last){onName&&onName(name);onDone();}else go(1);}} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{background:s.color,color:T.onAccent,border:`3px solid ${T.ink}`}}>{last?"Claim 50 Loks":"Next"}</button>
      {!last&&<button onClick={onDone} className="mt-2 text-xs font-bold underline opacity-50">skip all</button>}
    </div>
  </div>);
}

const GUEST_REMINDER_OPTIONS=[3,7,14,30];
const ALL_MOODS=["","calm","wild","moody","playful","dreamy","chaos","cozy","spooky"];
function Feed({posts,bookmarks,following,feedMode,setFeedMode,myHandle="",onFeatureOpen,cosmetics={},daily,streak,dailyClaimed,flipOfDay,onLine,onClaimDaily,onOpen,onVote,onLok,onBookmark,say,moodFilter,setMoodFilter,moodTags,reportedPosts,onReport,onEcho,onArtist,flair="",onPullRefresh,music,feedAds=false,onAdCta,onLocationClick}){
  const T=useT();const[active,setActive]=useState(0);const cardRefs=useRef([]);
  const[pullY,setPullY]=useState(0);const[refreshing,setRefreshing]=useState(false);const pullStart=useRef(null);
  const PULL_THRESHOLD=70;
  const onTouchStart=e=>{if(window.scrollY>0||refreshing)return;pullStart.current=e.touches[0].clientY;};
  const onTouchMove=e=>{if(pullStart.current==null)return;const dy=e.touches[0].clientY-pullStart.current;if(dy>0&&window.scrollY<=0)setPullY(Math.min(100,dy*0.5));else{pullStart.current=null;setPullY(0);}};
  const onTouchEnd=()=>{if(pullY>PULL_THRESHOLD&&!refreshing){setRefreshing(true);onPullRefresh&&onPullRefresh();setTimeout(()=>{setRefreshing(false);setPullY(0);},900);}else setPullY(0);pullStart.current=null;};
  const[searchQ,setSearchQ]=useState("");const[searchResults,setSearchResults]=useState(null);const searchTimer=useRef(null);
  // Local-first search: resident AI artists and on-device posts resolve
  // instantly and work offline; remote hits are merged in when they land.
  // (The old query used `title=ilike..&author=ilike..`, which PostgREST ANDs,
  // so it only matched posts whose title AND author both matched — i.e. never.)
  useEffect(()=>{
    const q=searchQ.trim();
    if(!q){setSearchResults(null);return;}
    const lq=q.toLowerCase();
    const localPosts=posts.filter(p=>(p.title||"").toLowerCase().includes(lq)||(p.author||"").toLowerCase().includes(lq));
    setSearchResults({artists:searchBotArtists(q),posts:localPosts});
    clearTimeout(searchTimer.current);
    searchTimer.current=setTimeout(async()=>{
      try{
        const f=`or=(title.ilike.*${encodeURIComponent(q)}*,author.ilike.*${encodeURIComponent(q)}*)`;
        const res=await fetch(`${SUPA_URL}/rest/v1/lok_posts?${f}&order=created_at.desc&limit=20`,{headers:{apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`}});
        const data=await res.json();
        if(!Array.isArray(data))return;
        const remote=data.map(fromDbPost).filter(Boolean);
        const accounts=await searchArtists(q);
        setSearchResults(prev=>{
          const seen=new Set((prev?.posts||[]).map(p=>p.id));
          const names=new Set(prev?.artists||[]);
          accounts.forEach(a=>names.add(a.handle));
          return{artists:[...names],posts:[...(prev?.posts||[]),...remote.filter(r=>!seen.has(r.id))]};
        });
      }catch{}
    },300);
  },[searchQ,posts]);
  const hidden=new Set(reportedPosts||[]);
  const base=(feedMode==="following"?posts.filter(p=>following.includes(p.author||"moss.ink")):posts).filter(p=>!hidden.has(p.id));
  const list=moodFilter==="all"?base:base.filter(p=>(moodTags[p.id]||"")===moodFilter);
  const moodEmojis={calm:"🌊",wild:"🔥",moody:"🌙",playful:"🎈",dreamy:"✨",chaos:"🌀",cozy:"☕",spooky:"👻",_clear:"✕"};
  const streakCol=streak>=30?"#E8B14B":streak>=7?T.accent:streak>=3?T.alt:T.ink;
  useEffect(()=>{
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>0.55){const idx=Number(e.target.dataset.idx);setActive(idx);if(Math.random()<0.22&&onLine)onLine("feed_scroll");}});
    },{threshold:[0.55]});
    cardRefs.current.forEach(el=>el&&io.observe(el));
    return()=>io.disconnect();
  },[list.length,feedMode,moodFilter]);
  return(<div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
    {(pullY>0||refreshing)&&<div className="flex items-center justify-center overflow-hidden" style={{height:refreshing?36:pullY,transition:refreshing?"height .2s ease":"none"}}><span className="text-xs font-bold" style={{opacity:Math.min(1,(refreshing?1:pullY)/PULL_THRESHOLD),color:T.accent}}>{refreshing?"✨ Fetching new pieces…":pullY>PULL_THRESHOLD?"Release for new pieces ↓":"Pull down for new pieces"}</span></div>}
    <div className="relative mt-3"><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search posts &amp; artists…" aria-label="Search feed" className="w-full px-3 py-2 rounded-xl text-sm font-bold" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink,outline:"none"}}/>{searchQ&&<button onClick={()=>{setSearchQ("");setSearchResults(null);}} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{color:T.accent}}>✕</button>}</div>
    {searchResults!==null&&(()=>{const artists=[...new Set([...(searchResults.artists||[]),...(searchResults.posts||[]).map(p=>p.author).filter(Boolean)])];const found=searchResults.posts||[];return(<div className="mt-2">
      {artists.length>0&&(<div className="mb-2"><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Artists ({artists.length})</div>
        <div className="flex flex-col gap-1.5">{artists.map(name=>{const per=BOT_PERSONAS[name];return(<button key={name} onClick={()=>onArtist&&onArtist(name)} className="lok-btn w-full text-left p-2 rounded-xl flex items-center gap-2" style={{border:`2px solid ${T.ink}`,background:T.card}}>
          <img src={renderAvatar(name.length*31)} alt="" className="w-8 h-8 rounded-full shrink-0" style={{border:`2px solid ${T.ink}`}}/>
          <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate"><NameTag name={name}/>{per&&<span className="ml-1.5 text-[9px] px-1 py-0.5 rounded align-middle" style={{background:T.alt,color:onColor(T.alt,T)}}>AI</span>}</div>{per&&<div className="text-[10px] opacity-60 truncate">{per.medium} · {per.vibe}</div>}</div>
          <span className="text-xs font-bold shrink-0" style={{color:T.accent}}>View ▸</span></button>);})}</div>
      </div>)}
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Posts ({found.length})</div>
      {found.length===0&&artists.length===0?<div className="text-xs opacity-50 py-3 text-center">No results found</div>:found.map(p=>(<button key={p.id} onClick={()=>onOpen(p.id)} className="lok-btn w-full text-left p-2 rounded-xl mb-1 flex items-center gap-2" style={{border:`2px solid ${T.ink}`,background:T.card}}><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-[10px] opacity-60"><button onClick={e=>{e.stopPropagation();onArtist&&onArtist(p.author||"unknown");}} style={{background:"transparent",border:"none",padding:0,textDecoration:"underline",cursor:"pointer",color:"inherit",font:"inherit"}}><NameTag name={p.author||"unknown"}/></button></div></div><span className="text-xs font-bold shrink-0" style={{color:T.accent}}>Open ▸</span></button>))}</div>);})()}
    {searchResults===null&&(<>{flipOfDay&&feedMode==="discover"&&(<button onClick={()=>onOpen(flipOfDay.id)} aria-label={`Flip of the Day: ${flipOfDay.title}`} className="lok-btn mt-3 w-full flex items-center gap-3 p-2.5 rounded-2xl text-left" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:"5px 5px 0 #E8B14B"}}>
      {flipOfDay.frames?.[0]&&<img src={flipOfDay.frames[Math.floor(flipOfDay.frames.length/2)]} alt="" className="rounded-lg shrink-0" style={{width:46,aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/>}
      <div className="min-w-0 flex-1"><div className="text-[10px] font-extrabold uppercase tracking-widest" style={{color:"#B8860B"}}>✦ Flip of the Day</div><div className="lok-display font-extrabold text-sm truncate">{flipOfDay.title}</div></div>
      <span className="lok-display font-extrabold text-sm shrink-0" style={{color:T.accent}}>{flipOfDay.votes} ▲</span>
    </button>)}
    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-center rounded-xl shrink-0" style={{width:44,height:44,background:streakCol,color:onColor(streakCol,T),border:`2.5px solid ${T.ink}`,transition:"background .3s ease"}}><span className="lok-display font-extrabold text-lg">{streak}</span></div>
      <div className="flex-1 min-w-0"><div className="font-bold text-sm leading-tight">Daily streak · {streak} {streak===1?"day":"days"}</div><div className="text-xs opacity-70 truncate">Today: "{daily.prompt}"</div></div>
      <button onClick={onClaimDaily} disabled={dailyClaimed} aria-label={dailyClaimed?"Daily already claimed":"Claim daily bonus"} className="lok-btn shrink-0 lok-display px-3 py-2 rounded-xl text-sm font-extrabold" style={{background:dailyClaimed?"transparent":T.ink,color:dailyClaimed?T.ink:T.paper,border:`2.5px solid ${T.ink}`,opacity:dailyClaimed?0.55:1}}>{dailyClaimed?"Claimed ✓":"Claim"}</button>
    </div>
    <div className="mt-3 flex gap-2">{[["discover","Discover"],["following","Following"],["artists","New artists"]].map(([id,l])=>(<button key={id} onClick={()=>setFeedMode(id)} className="lok-btn flex-1 py-2 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:feedMode===id?T.ink:T.card,color:feedMode===id?T.paper:T.ink}}>{l}</button>))}</div>
    {feedMode==="discover"&&(<div className="mt-2"><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">🎨 Meet the residents</div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>{Object.keys(BOT_PERSONAS).map(name=>{const per=BOT_PERSONAS[name];return(<button key={name} onClick={()=>onArtist&&onArtist(name)} className="lok-btn shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl" style={{width:64,border:`2px solid ${T.ink}`,background:T.card}} aria-label={`View ${name}'s profile`}>
        <img src={renderAvatar(name.length*31)} alt="" className="w-9 h-9 rounded-full" style={{border:`2px solid ${T.ink}`}}/>
        <span className="text-[9px] font-bold truncate w-full text-center">{name}</span>
      </button>);})}</div>
    </div>)}
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
      <button onClick={()=>setMoodFilter("all")} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${moodFilter==="all"?T.accent:T.ink}`,background:moodFilter==="all"?T.ink:T.card,color:moodFilter==="all"?T.paper:T.ink}}>All</button>
      {ALL_MOODS.filter(Boolean).map(m=>(<button key={m} onClick={()=>setMoodFilter(moodFilter===m?"all":m)} className="lok-btn shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${moodFilter===m?T.accent:T.ink}`,background:moodFilter===m?T.ink:T.card,color:moodFilter===m?T.paper:T.ink,opacity:moodFilter==="all"||moodFilter===m?1:0.5}}><span>{moodEmojis[m]||"🎨"}</span>{m}</button>))}
    </div>
    {feedMode==="artists"?<NewArtists onArtist={onArtist} myHandle={myHandle} say={say}/>:list.length===0?(
      feedMode==="following"
        ?<EmptyState icon="follow" title="No one yet" subtitle="Lok artists you love and their flips show up here." action="Discover artists →" onAction={()=>setFeedMode("discover")}/>
        :<EmptyState icon="feed" title="No art yet" subtitle="Be the first to publish a flip!"/>
    ):(
      <div className="mt-3 flex flex-col gap-5">
        {list.map((p,i)=>{
          // A sponsored card every FEED_AD_EVERY posts. It sits in the same
          // scroll-snap flow as a real post so it can simply be scrolled past —
          // it never blocks and never modals.
          const showAd=feedAds&&i>0&&i%FEED_AD_EVERY===0;
          const feedAdPool=showAd?adsFor("feed"):null;
          return(<Fragment key={p.id}>
            {showAd&&feedAdPool.length>0&&<AdFeedCard ad={feedAdPool[(i/FEED_AD_EVERY-1)%feedAdPool.length]} onCta={onAdCta}/>}
            <div ref={el=>cardRefs.current[i]=el} data-idx={i}><FeedCard p={p} live={i===active} marked={bookmarks.includes(p.id)} loked={following.includes(p.author||"moss.ink")} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark} moodTags={moodTags} onReport={onReport} onEcho={onEcho} onArtist={onArtist} flair={flair} music={music} onLocationClick={onLocationClick}/></div>
          </Fragment>);
        })}
        {feedMode==="discover"&&<FeaturedArtist onArtist={onArtist} onOpen={onFeatureOpen}/>}
      </div>
    )}</>)}
  </div>);
}

function MusicBar({musicId,music,T}){
  const track=music?.list?.find(t=>t.id===musicId);
  if(!track)return null;
  const isPlaying=music.current?.id===musicId&&music.playing;
  const handlePlay=async()=>{if(isPlaying){music.toggle();}else{const idx=music.list.findIndex(t=>t.id===musicId);if(idx>=0)await music.playAt(idx);}};
  const handleClear=()=>{music.setList(l=>l.filter(t=>t.id!==musicId));};
  return(<div className="mt-2 mx-auto rounded-xl px-3 py-2" style={{width:"100%",maxWidth:360,background:`rgba(0,0,0,0.4)`,backdropFilter:"blur(4px)",border:`1px solid rgba(255,255,255,0.2)`}}>
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white opacity-70 uppercase tracking-wider">Now Playing</div>
        <div className="text-sm font-bold text-white truncate">{track.title}</div>
      </div>
      <button onClick={handlePlay} aria-label={isPlaying?"Pause":"Play"} className="lok-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{background:`rgba(255,255,255,0.9)`,color:T.ink,border:"1px solid rgba(255,255,255,0.3)",fontSize:"14px"}}>
        {isPlaying?"⏸":"▶"}
      </button>
      <button onClick={handleClear} aria-label="Clear music" className="lok-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs opacity-70 hover:opacity-100" style={{background:"transparent",color:"#fff",border:"1px solid rgba(255,255,255,0.3)"}}>
        ✕
      </button>
    </div>
  </div>);
}

function FeedCard({p,live,marked,loked,cosmetics={},onOpen,onVote,onLok,onBookmark,moodTags,onReport,onEcho,onArtist,flair="",music,onLocationClick}){
  const T=useT();const[fi,setFi]=useState(0);const[pop,setPop]=useState(false);const[echoed,setEchoed]=useState(false);
  const mood=moodTags?.[p.id];const moodEmojis={calm:"🌊",wild:"🔥",moody:"🌙",playful:"🎈",dreamy:"✨",chaos:"🌀",cozy:"☕",spooky:"👻"};
  useEffect(()=>{if(!live||p.frames.length<2){setFi(0);return;}const t=setInterval(()=>setFi(f=>(f+1)%p.frames.length),p.paceMs||160);return()=>clearInterval(t);},[live,p.id,p.paceMs,p.frames.length]);
  const doVote=()=>{onVote(p.id);if(!p.voted){setPop(true);setTimeout(()=>setPop(false),320);}};
  if(!p.frames||p.frames.length===0)return(<div className="flex flex-col justify-center"><div className="relative mx-auto rounded-2xl overflow-hidden flex items-center justify-center" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,aspectRatio:"4/5"}}><div className="text-center opacity-40"><div className="lok-display font-extrabold text-lg">{p.title}</div><div className="text-sm mt-1">Rendering…</div></div></div></div>);
  return(<div className="flex flex-col justify-center">
    <div className="relative mx-auto rounded-2xl overflow-hidden" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,boxShadow:live?`7px 7px 0 ${T.accent}`:`6px 6px 0 ${T.shadow}`,transform:live?"scale(1)":"scale(.97)",transition:"transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease"}}>
      <button onClick={()=>onOpen(p.id)} className="block w-full" aria-label={`Open ${p.title}`}><img src={p.frames[fi]} alt={p.title} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/></button>
      {mood&&<div className="absolute top-2 right-2 text-xs z-10" style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,.4))"}} aria-label={`mood: ${mood}`}>{moodEmojis[mood]}</div>}
      {p.eventLine&&<div className="absolute top-2 left-2 right-2 text-[10px] font-bold text-white px-2 py-1 rounded-lg z-10" style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(2px)"}}>{p.author} {p.eventLine}</div>}
      {p.frames.length>1&&<div className="absolute top-0 left-0 right-0 h-1" style={{background:"rgba(0,0,0,.15)"}}><div style={{width:`${((fi+1)/p.frames.length)*100}%`,height:"100%",background:T.accent,transition:"width .12s linear"}}/></div>}
      <div className="absolute left-0 right-0 bottom-0 p-3 flex items-end gap-2" style={{background:"linear-gradient(transparent, rgba(0,0,0,.6))"}}>
        <div className="flex-1 text-white min-w-0"><div className="lok-display font-extrabold leading-tight truncate">{p.title}</div><div className="text-xs opacity-90"><button onClick={()=>onArtist&&onArtist(p.author||"moss.ink")} style={{background:"transparent",border:"none",padding:0,textDecoration:"underline",cursor:"pointer",color:"inherit",font:"inherit"}}><NameTag name={p.author||"moss.ink"} color={cosmetics.nameColor} style={{color:"#fff"}}/></button>{flair?<span className="ml-1.5 text-[10px] font-bold tracking-wide" style={{color:"#F0DB4F"}}>{flair}</span>:null} · {p.from==="revival"?"revival loop":p.from==="battle"?"battle piece":p.mode==="B"?"page-flip":"flipbook"}</div>{p.latitude&&p.longitude&&<div className="mt-1"><LocationBadge locationName={p.location_name} latitude={p.latitude} longitude={p.longitude} onLocationClick={()=>onLocationClick&&onLocationClick(p)}/></div>}</div>
        <button onClick={()=>onLok(p.author||"moss.ink")} aria-label={loked?"Un-Lok this artist":"Lok this artist"} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold" style={{background:loked?"rgba(255,255,255,.92)":T.accent,color:loked?T.ink:T.onAccent,border:"2px solid #fff"}}>{loked?"Lok'd ✓":"Lok"}</button>
      </div>
      <div className="absolute right-2 bottom-16 flex flex-col gap-1 items-center">
        <button onClick={doVote} aria-label={`Vote — ${p.votes} votes`} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-extrabold" style={{background:p.voted?T.accent:"rgba(255,255,255,.92)",color:p.voted?T.onAccent:T.ink,border:`2.5px solid ${T.ink}`,animation:pop?"lokpop .32s ease":"none"}}>▲</button>
        <span className="text-white text-xs font-bold lok-count" key={p.votes} style={{textShadow:"0 1px 3px #000"}}>{p.votes}</span>
        <button onClick={()=>onBookmark(p.id)} aria-label={marked?"Remove bookmark":"Bookmark this flip"} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center" style={{background:marked?T.accent:"rgba(255,255,255,.92)",border:`2.5px solid ${T.ink}`}}><ReactionIcon type="heart" size={22}/></button>
        <button onClick={()=>{if(onEcho)onEcho(p);setEchoed(true);}} aria-label={echoed?"Echoed":"Echo this flip"} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{background:echoed?"rgba(232,177,75,.92)":"rgba(255,255,255,.92)",color:echoed?"#fff":T.ink,border:`2.5px solid ${T.ink}`}}>{echoed?"↻":"↻"}</button>
        <button onClick={()=>onOpen(p.id)} aria-label="Open full viewer" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{background:"rgba(255,255,255,.92)",color:T.ink,border:`2.5px solid ${T.ink}`}}>▾</button>
        {onReport&&<button onClick={()=>onReport(p.id)} aria-label="Report/hide this post" className="lok-btn w-7 h-7 flex items-center justify-center text-xs opacity-60 hover:opacity-100" style={{border:`1.5px solid rgba(255,255,255,.3)`,color:"#fff",background:"rgba(0,0,0,.3)",borderRadius:"50%",marginTop:2}}>!</button>}
      </div>
    </div>
    {p.musicId&&music?.list&&<MusicBar musicId={p.musicId} music={music} T={T}/>}
    <div className="text-center text-xs opacity-50 mt-2">scroll for more · tap ▾ to slide through</div>
  </div>);
}

function Viewer({posts,index,bookmarks,cosmetics={},onBookmark,onClose,onNav,onVote,onReact,onViewed,onShare,onDelete,onRename,myName="",onRemix,onPatch,onEditInStudio,gyroMotion=GYRO_ZERO}){
  const mentionTitle=(post,own)=>{const parts=[];let last=0;const title=post.title;const re=/@(\w+)/g;let m;while((m=re.exec(title))!==null){if(m.index>last)parts.push(title.slice(last,m.index));parts.push(<span key={m.index} style={{color:T.accent,fontWeight:700}}>@{m[1]}</span>);last=re.lastIndex;}if(last<title.length)parts.push(title.slice(last));if(own)parts.push(<span key="edit" style={{opacity:0.4,fontSize:11,marginLeft:6}}>✎</span>);return parts.length?parts:title;};
  const T=useT();const post=posts[index];const n=post?.frames?.length??0;const isB=post&&post.mode==="B";const series=post&&post.style==="series";
  const scrollRef=useRef(null);const[fi,setFi]=useState(0);const[playing,setPlaying]=useState(false);const[floats,setFloats]=useState([]);const[editT,setEditT]=useState(false);const[showEdit,setShowEdit]=useState(false);const[tDraft,setTDraft]=useState(post.title);const playRef=useRef(null);const touch=useRef(null);const marked=bookmarks.includes(post.id);const own=post.from!=="seed"&&!post.id?.startsWith("seed");
  useEffect(()=>{if(typeof playRef.current==="number")clearInterval(playRef.current);playRef.current=null;setFi(0);setPlaying(false);setEditT(false);setTDraft(post.title);if(scrollRef.current)scrollRef.current.scrollTop=0;},[index]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")onNav(-1);if(e.key==="ArrowRight")onNav(1);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose,onNav]);
  const saveT=()=>{if(onRename&&tDraft.trim())onRename(post.id,tDraft.trim());setEditT(false);};
  const replay=()=>{if(n<2||playing)return;const seq=[...Array(n).keys()].reverse().concat([...Array(n).keys()]);let k=0;const t=setInterval(()=>{setFi(seq[k]);k++;if(k>=seq.length)clearInterval(t);},55);};
  const onScroll=()=>{const el=scrollRef.current;if(!el)return;const max=el.scrollHeight-el.clientHeight;const p=max>0?el.scrollTop/max:1;const idx=Math.min(n-1,Math.floor(p*n));setFi(idx);if(idx>=n-1)onViewed(post.id);};
  const togglePlay=()=>{
    if(isB){if(playing){playRef.current=null;setPlaying(false);return;}setPlaying(true);const el=scrollRef.current;if(!el)return;const max=el.scrollHeight-el.clientHeight;const dur=Math.max(400,n*post.paceMs);let t0=performance.now();const myRun=Math.random();playRef.current=myRun;const step=now=>{if(playRef.current!==myRun)return;const k=Math.min(1,(now-t0)/dur);el.scrollTop=k*max;if(k<1)requestAnimationFrame(step);else if(post.loop){onViewed(post.id);t0=performance.now();el.scrollTop=0;requestAnimationFrame(step);}else{playRef.current=null;setPlaying(false);onViewed(post.id);}};requestAnimationFrame(step);return;}
    if(playing){clearTimeout(playRef.current);setPlaying(false);return;}if(n<2){onViewed(post.id);return;}
    setPlaying(true);const durOf=i=>post.frameDurations?.[i]??post.paceMs??140;
    const step=i=>{setFi(i);const el=scrollRef.current;if(el)el.scrollTop=(i/(n-1))*(el.scrollHeight-el.clientHeight);
      const next=i+1;
      if(next>=n){if(post.loop){onViewed(post.id);playRef.current=setTimeout(()=>step(0),durOf(i));}else{playRef.current=setTimeout(()=>{setPlaying(false);onViewed(post.id);},durOf(i));}}
      else playRef.current=setTimeout(()=>step(next),durOf(i));};
    step(fi>=n-1?0:fi+1);
  };
  useEffect(()=>()=>{if(typeof playRef.current==="number")clearInterval(playRef.current);playRef.current=null;},[]);
  const react=type=>{onReact(post.id,type);const id=Math.random();const pack=ROTATION_REACTIONS[cosmetics.reactionPack]||REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;const icon=pack[["splat","heart","drip"].indexOf(type)]||type;const newCount=(post.reactions[type]||0)+1;setFloats(f=>[...f,{id,type:icon,x:14+Math.random()*60}]);setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==id)),950);if(newCount>=5&&newCount%3===0){for(let s=0;s<6;s++){setTimeout(()=>{const sid=Math.random();setFloats(ff=>[...ff,{id:sid,type:icon,x:10+Math.random()*80}]);setTimeout(()=>setFloats(ff=>ff.filter(x=>x.id!==sid)),1200);},s*80);}}};
  if(!post.frames||post.frames.length===0)return(<div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{background:T.ink,color:T.paper}}><div className="lok-display text-xl font-extrabold">Rendering…</div><button onClick={onClose} className="mt-6 lok-btn px-4 py-2 rounded-xl font-bold" style={{border:`2px solid ${T.paper}`}} aria-label="Close viewer">Close</button></div>);
  return(<div className="fixed inset-0 z-50 flex flex-col" style={{background:series?T.paper:T.ink}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="flex items-center gap-3 px-3 py-2.5" style={{color:series?T.ink:T.paper}}>
      <button onClick={onClose} aria-label="Close viewer" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${series?T.ink:T.paper}`}}>✕</button>
      <div className="min-w-0 flex-1">{editT
        ?<input value={tDraft} onChange={e=>setTDraft(e.target.value)} onBlur={saveT} onKeyDown={e=>{if(e.key==="Enter")saveT();if(e.key==="Escape"){setTDraft(post.title);setEditT(false);}}} autoFocus aria-label="Rename this flip" className="lok-display font-extrabold leading-tight w-full" style={{background:"transparent",border:"none",borderBottom:`2px solid ${T.accent}`,color:series?T.ink:T.paper,outline:"none",fontSize:"inherit"}}/>
        :<div className="lok-display font-extrabold leading-tight truncate" onClick={()=>own&&setEditT(true)} style={{cursor:own?"text":"default"}} title={own?"Tap to rename":undefined}>{mentionTitle(post,own)}</div>}
        <div className="text-xs opacity-75">{post.author||"moss.ink"} · {index+1}/{posts.length} · {isB?"page-flip":"scrub"}</div></div>
      <button onClick={()=>onBookmark(post.id)} aria-label={marked?"Remove bookmark":"Lok in this piece"} className="lok-btn ml-auto px-2.5 py-1 rounded-lg text-sm font-bold" style={{background:marked?T.accent:"transparent",color:marked?T.onAccent:(series?T.ink:T.paper),border:`2.5px solid ${marked?T.accent:(series?T.ink:T.paper)}`}}>{marked?"Lok'd ✓":"Lok in ▾"}</button>
    </div>
    <div className="relative flex-1 min-h-0" onTouchStart={e=>(touch.current=e.touches[0].clientX)} onTouchEnd={e=>{if(touch.current==null)return;const dx=e.changedTouches[0].clientX-touch.current;if(Math.abs(dx)>60)onNav(dx<0?1:-1);touch.current=null;}}>
      <div ref={scrollRef} onScroll={isB?undefined:onScroll} className="absolute inset-0 overflow-y-scroll">
        {isB?(<div className="px-3 py-4 flex flex-col items-center gap-3">{post.frames.map((f,k)=>(<div key={k} className="relative w-full" style={{maxWidth:360}}><img src={f} alt={`page ${k+1}`} className="block w-full rounded-xl" style={{border:`4px solid ${series?T.ink:T.paper}`,boxShadow:series?"none":"0 8px 28px rgba(0,0,0,.4)"}}/><div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold" style={{background:series?T.ink:T.accent,color:onColor(series?T.ink:T.accent,T)}}>{String(k+1).padStart(2,"0")}</div></div>))}<div className="text-xs font-bold opacity-60 py-2" style={{color:series?T.ink:T.paper}}>↑ scroll the whole page ↑</div></div>):(
          <><div className="sticky top-0 flex items-center justify-center p-3" style={{height:"100%"}}><div className="relative" style={{maxHeight:"100%",aspectRatio:"4 / 5",transform:`rotateX(${Math.max(-12,Math.min(12,gyroMotion.beta*0.12))}deg) rotateY(${Math.max(-12,Math.min(12,gyroMotion.gamma*0.12))}deg)`,transformStyle:"preserve-3d",transition:"transform 0.1s ease-out"}}>
            <img src={post.frames[fi]} alt={`frame ${fi+1}`} className="block h-full w-auto max-w-full rounded-xl" style={{border:`4px solid ${series?T.ink:T.paper}`,boxShadow:series?"none":"0 12px 40px rgba(0,0,0,.45)"}}/>
            <div className="absolute top-0 bottom-0 flex flex-col justify-between py-2" style={{right:-14}}>{Array.from({length:n}).map((_,k)=>(<div key={k} style={{width:k===fi?16:8,height:k===fi?4:3,borderRadius:2,background:k<=fi?T.accent:"rgba(150,150,150,.35)",transition:"all .18s cubic-bezier(.34,1.56,.64,1)"}}/>))}</div>
            <div className="absolute top-2 left-2 lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:series?T.ink:"rgba(0,0,0,.5)",color:"#fff",backdropFilter:"blur(4px)"}}>{String(fi+1).padStart(2,"0")} / {String(n).padStart(2,"0")}</div>
            {fi===0&&!playing&&n>1&&(<div className="absolute inset-x-0 bottom-3 text-center text-sm font-bold" style={{color:series?T.ink:"#F2EDE2",textShadow:series?"none":"0 2px 6px rgba(0,0,0,.6)",animation:reduceMotion?"none":"loknudge 1.6s ease-in-out infinite"}}>▾ slide down to flip ▾</div>)}
          </div></div><div style={{height:Math.max(1,n)*PX_PER_FRAME}}/></>)}
      </div>
      {index>0&&<button onClick={()=>onNav(-1)} aria-label="Previous post" className="lok-btn absolute left-1.5 top-1/2 w-9 h-9 rounded-full font-extrabold" style={{transform:"translateY(-50%)",background:T.paper,color:T.ink,border:`3px solid ${T.accent}`}}>‹</button>}
      {index<posts.length-1&&<button onClick={()=>onNav(1)} aria-label="Next post" className="lok-btn absolute right-1.5 top-1/2 w-9 h-9 rounded-full font-extrabold" style={{transform:"translateY(-50%)",background:T.paper,color:T.ink,border:`3px solid ${T.accent}`}}>›</button>}
      {floats.map(f=>(<div key={f.id} className="absolute bottom-20 pointer-events-none" style={{left:`${f.x}%`,animation:"lokfloat .95s ease-out forwards"}}><ReactionIcon type={f.type} size={34}/></div>))}
    </div>
    <div className="flex items-center gap-2 px-3 py-2.5" style={{background:series?T.card:T.ink,borderTop:`2px solid ${series?T.ink:"rgba(242,237,226,.25)"}`}}>
      <button onClick={togglePlay} aria-label={playing?"Pause":"Play"} className="lok-btn px-3 py-2 rounded-xl font-extrabold lok-display" style={{background:T.alt,color:onColor(T.alt,T),border:`3px solid ${series?T.ink:T.paper}`}}>{playing?"Pause":`Play`}</button>
      {!isB&&n>=2&&<button onClick={replay} aria-label="Replay drawing" title="Watch it drawn" className="lok-btn px-2.5 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>↺</button>}
      <button onClick={()=>onVote(post.id)} aria-label={`Vote — ${post.votes}`} className="lok-btn px-3 py-2 rounded-xl font-extrabold lok-display" style={{background:post.voted?"transparent":T.accent,color:post.voted?(series?T.ink:T.paper):T.onAccent,border:`3px solid ${post.voted?(series?T.ink:"rgba(242,237,226,.5)"):(series?T.ink:T.paper)}`}}>{post.voted?`Voted · ${post.votes}`:`Vote · ${post.votes}`}</button>
      {onShare&&<button onClick={()=>onShare(post)} aria-label="Share" className="lok-btn px-2.5 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>↗</button>}
      {onRemix&&<button onClick={()=>onRemix(post)} aria-label="Remix this flip" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}} title="Remix — copy frames to Studio">↻</button>}
      {own&&onPatch&&<button onClick={()=>setShowEdit(true)} aria-label="Edit this flip" title="Edit playback & title" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>✎</button>}
      {post.from!=="seed"&&myName&&onDelete&&<button onClick={()=>{if(window.confirm(`Delete "${post.title}"?`))onDelete(post.id);}} aria-label="Delete" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:"rgba(242,237,226,.7)",background:"transparent"}}>🗑</button>}
      <div className="ml-auto flex items-center gap-1.5">{(()=>{const slots=["splat","heart","drip"];const pack=ROTATION_REACTIONS[cosmetics.reactionPack]||REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;return slots.map((slot,k)=>(<button key={slot} onClick={()=>react(slot)} aria-label={`React ${pack[k]}`} className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><ReactionIcon type={pack[k]} size={20}/><span className="text-xs font-bold">{post.reactions[slot]}</span></button>));})()}</div>
    </div>
    {showEdit&&own&&onPatch&&(<div className="absolute inset-0 z-10 flex items-end justify-center" style={{background:"rgba(0,0,0,.55)"}} onClick={()=>setShowEdit(false)}>
      <div className="w-full rounded-t-3xl p-5 overflow-y-auto" style={{maxWidth:520,maxHeight:"80%",background:T.card,color:T.ink,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">Edit flip</div><button onClick={()=>setShowEdit(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close edit">✕</button></div>
        <label className="block text-xs font-bold uppercase tracking-widest opacity-60">Title</label>
        <input value={tDraft} onChange={e=>setTDraft(e.target.value)} onBlur={()=>onRename&&tDraft.trim()&&onRename(post.id,tDraft.trim())} aria-label="Flip title" className="mt-1 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
        <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">How it plays</div>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[["A","Flipbook","frames cycle in place"],["B","Page-flip","scroll through pages"]].map(([id,label,desc])=>(
            <button key={id} onClick={()=>onPatch(post.id,{mode:id})} aria-pressed={post.mode===id} className="lok-btn p-2.5 rounded-xl text-left" style={{border:`3px solid ${post.mode===id?T.accent:T.ink}`,background:post.mode===id?T.ink:T.card,color:post.mode===id?T.paper:T.ink}}><div className="lok-display font-extrabold text-sm">{label}</div><div className="text-[10px] opacity-70">{desc}</div></button>))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!post.loop} onChange={e=>onPatch(post.id,{loop:e.target.checked})} style={{accentColor:T.accent}}/> Loop forever</label>
        <label className="mt-2 block text-xs font-bold">Speed · <span style={{color:T.accent}}>{post.paceMs||160}ms</span>/page
          <input type="range" min="60" max="500" step="10" value={post.paceMs||160} onChange={e=>onPatch(post.id,{paceMs:+e.target.value})} className="w-full mt-1" style={{accentColor:T.accent}} aria-label="Playback speed"/>
        </label>
        <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Style</div>
        <div className="mt-1.5 flex gap-2">{[["bold","Bold"],["series","Series"]].map(([id,label])=>(
          <button key={id} onClick={()=>onPatch(post.id,{style:id})} aria-pressed={post.style===id} className="lok-btn flex-1 py-2 rounded-xl text-sm font-bold" style={{border:`2.5px solid ${post.style===id?T.accent:T.ink}`,background:post.style===id?T.ink:T.card,color:post.style===id?T.paper:T.ink}}>{label}</button>))}</div>
        {onEditInStudio&&<button onClick={()=>{setShowEdit(false);onEditInStudio(post);}} className="lok-btn lok-display mt-4 w-full py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>✎ Take it back into Studio</button>}
        <p className="text-[10px] opacity-60 mt-1.5 leading-snug">Opens these pages in Studio so you can redraw, add or reorder them. Publishing saves over this post.</p>
      </div>
    </div>)}
  </div>);
}

// Studio's sticker picker: equipped pack + your own uploads + a file input.
// Picking an item arms it for placement — the actual tap-to-place, drag, and
// resize live in Easel.jsx, which is where the canvas coordinate math already
// lives (see engine/stickers.js for why).
function StickerSheet({T,say,equippedPack,myStickerIds,onPick,onUploaded,onDeleteMy,onClose}){
  const[thumbs,setThumbs]=useState({});
  useEffect(()=>{
    let cancelled=false;const urls=[];
    myStickerIds.forEach(async id=>{
      if(thumbs[id])return;
      const blob=await getSticker(id).catch(()=>null);
      if(cancelled||!blob)return;
      const url=URL.createObjectURL(blob);urls.push(url);
      setThumbs(t=>({...t,[id]:url}));
    });
    return()=>{cancelled=true;urls.forEach(u=>URL.revokeObjectURL(u));};
  },[myStickerIds]);
  const packItems=normalizePack(ROTATION_STICKERS[equippedPack]||STICKER_PACKS.find(p=>p.id===equippedPack)||STICKER_PACKS[0]);
  const upload=async e=>{
    const files=[...(e.target.files||[])].filter(f=>STICKER_IMAGE_TYPES.test(f.type));e.target.value="";
    for(const f of files){
      const dataUrl=await new Promise(res=>{const r=new FileReader();r.onload=ev=>res(ev.target.result);r.readAsDataURL(f);});
      const resized=await resizeStickerImage(dataUrl);
      const blob=await(await fetch(resized)).blob();
      const id=newStickerId();
      if(await putSticker(id,blob))onUploaded(id);
    }
    if(files.length)say(`${files.length} sticker${files.length>1?"s":""} added`);
  };
  return(<div className="mt-1.5 p-2.5 rounded-2xl" style={{border:`2.5px solid ${T.ink}`,background:T.card,boxShadow:`3px 3px 0 ${T.shadow}`}}>
    <div className="flex items-center mb-1.5"><div className="text-xs font-extrabold">Pick a sticker</div><button onClick={onClose} className="ml-auto lok-btn text-[10px] font-bold underline opacity-70">close</button></div>
    <div className="grid grid-cols-8 gap-1.5 mb-2">{packItems.map(item=>(<button key={item.id} onClick={()=>onPick(item)} className="lok-btn text-xl rounded-lg py-1" style={{border:`1.5px solid ${T.ink}`,background:T.paper}}>{item.value}</button>))}</div>
    {myStickerIds.length>0&&<><div className="text-[10px] font-bold opacity-60 mb-1">My stickers</div>
      <div className="grid grid-cols-8 gap-1.5 mb-2">{myStickerIds.map(id=>(<div key={id} className="relative"><button onClick={()=>onPick({id,kind:"image",value:id})} className="lok-btn rounded-lg overflow-hidden w-full aspect-square" style={{border:`1.5px solid ${T.ink}`,background:T.paper}}>{thumbs[id]&&<img src={thumbs[id]} alt="" className="w-full h-full object-contain"/>}</button><button onClick={()=>onDeleteMy(id)} aria-label="Delete sticker" className="absolute -top-1 -right-1 rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center" style={{background:"#D94040",color:"#fff"}}>×</button></div>))}</div></>}
    <label className="lok-btn block text-center text-[11px] font-bold py-1.5 rounded-xl cursor-pointer" style={{border:`1.5px dashed ${T.ink}`,background:T.paper}}>+ Upload PNG/JPG/WebP<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={upload} style={{display:"none"}}/></label>
  </div>);
}

function Studio({ownedTiers,ccTier,onPublish,say,kids,dailyPrompt,animFx,modules=[],legacyBrushes,setLegacyBrushes,authorName,paper="plain",cursorPack="default",mythicEquipped,stickers,onStickersChange,pendingSticker,onStickerPlaced,bloomEnabled=true,bloomIntroSeen=false,onBloomIntroSeen,grainIntroSeen=false,onGrainIntroSeen}){
  const onBloom=()=>{if(bloomEnabled&&!bloomIntroSeen){say("✨ Bright colors now glow when you capture a page — try a neon or sparkle stroke");onBloomIntroSeen&&onBloomIntroSeen();}};
  const T=useT();const easel=useRef(null);
  const mythicItem=mythicEquipped?MYTHIC_ITEMS.find(m=>m.id===mythicEquipped):null;
  const hasCanvasBorder=mythicItem?.type==="canvas_border";
  const[tier,setTier]=useState(10);const[frames,setFrames]=useState([]);const[frameDurations,setFrameDurations]=useState([]);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(140);const[title,setTitle]=useState("");const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:i===0?ART.pink:ART.teal,opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length,{bloom:bloomEnabled});setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);onStickersChange&&onStickersChange([]);setJustCap(true);setTimeout(()=>setJustCap(false),360);say(`Page ${frames.length+1} captured`);onBloom();};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});};
  const ready=frames.length>=2;
  return(<div className="mt-4">
    <div className="flex items-center justify-between">
      <div><h2 className="lok-display text-xl font-extrabold flex items-center gap-2">Studio{ccTier&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PRO</span>}</h2><p className="text-xs opacity-70 mt-0.5">Draw · capture · repeat · publish</p></div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setZen(z=>!z)} aria-pressed={zen} aria-label="Speed Draw mode" title="Hide controls, just draw" className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${zen?T.accent:T.ink}`,background:zen?T.ink:T.card,color:zen?T.paper:T.ink}}>⚡ Speed</button>
        <div className="text-right"><div className="lok-display text-2xl font-extrabold" style={{color:frames.length?T.accent:T.ink}}>{frames.length}</div><div className="text-[10px] font-bold uppercase tracking-widest opacity-60">pages</div></div>
      </div>
    </div>
    {!kids&&activePrompt&&!zen&&(<>
      <div className="mt-2 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}><span style={{opacity:0.6}}>Prompt</span><span style={{color:T.accent}}>"{activePrompt}"</span>{(()=>{const m=PROMPT_META.find(p=>p.text===activePrompt);if(!m||m.motion==="static")return null;return <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{background:m.motion==="loop"?ART.teal:ART.pink,color:"#fff"}}>{m.motion==="loop"?"⟳ Loop":"→ Transform"}</span>;})()}{promptPick&&<button onClick={()=>setPromptPick(null)} aria-label="Back to today's prompt" className="ml-auto text-[10px] font-bold underline opacity-60">today's</button>}</div>
      <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0">Past</span>
        {pastPrompts.map(p=>(<button key={p} onClick={()=>setPromptPick(p)} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`1.5px solid ${promptPick===p?T.accent:T.shadow}`,color:T.ink,opacity:0.8}}>{p}</button>))}
      </div>
    </>)}
    {!zen&&(<><div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[10px] font-bold uppercase tracking-widest opacity-50 shrink-0 mr-1">Layers</span>
      {TIERS.map(t=>{const own=ownedTiers.includes(t.layers);const on=tier===t.layers;return(<button key={t.layers} onClick={()=>own?setTier(t.layers):say(`Unlock ${t.label} in Shop`)} aria-label={`${own?"Use":"Unlock"} ${t.label}`} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${on?T.accent:T.ink}`,background:on?T.ink:T.card,color:on?T.paper:T.ink,opacity:own?1:0.45}}>{own?t.label:`🔒 ${t.label}`}</button>);})}
    </div>
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button onClick={()=>setOnionOn(v=>!v)} aria-pressed={onionOn} className="lok-btn px-2.5 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${onionOn?T.accent:T.shadow}`,background:onionOn?T.ink:"transparent",color:onionOn?T.paper:T.ink}}>🧅 Onion {onionOn?"ON":"OFF"}</button>
      {onionOn&&frames.length>0&&(<>
        <label className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Opacity<input type="range" min="0.05" max="0.5" step="0.05" value={onionOpacity} onChange={e=>setOnionOpacity(+e.target.value)} style={{accentColor:T.accent,width:48}} aria-label="Onion opacity"/></label>
        <div className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Prev{[1,2,3].map(n=><button key={n} onClick={()=>setOnionCount(n)} aria-pressed={onionCount===n} className="lok-btn w-6 h-6 rounded-full text-[10px] font-bold" style={{border:`2px solid ${onionCount===n?T.accent:T.shadow}`,background:onionCount===n?T.ink:"transparent",color:onionCount===n?T.paper:T.ink}}>{n}</button>)}</div>
      </>)}
    </div></>)}
    {mythicItem&&!zen&&(<div className="mt-2 flex items-center gap-2 p-2 rounded-xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="shrink-0 rounded-lg overflow-hidden" style={{width:36,height:36}}><MythicPreview itemId={mythicItem.fxId} rarity="mythic" size="sm"/></div>
      <div className="min-w-0"><div className="text-[11px] font-extrabold">✨ {mythicItem.name} active</div><div className="text-[10px] opacity-60 truncate">{mythicItem.desc}</div></div>
    </div>)}
    <div className={`mt-2 ${hasCanvasBorder?"rarity-mythic":""}`} style={hasCanvasBorder?{"--mythic-bg":T.paper,borderRadius:18,padding:3}:undefined}><Easel ref={easel} key={tier} maxLayers={tier} ccTier={ccTier} modules={modules} paper={paper} cursorPack={cursorPack} onionFrames={onionFrames} animFx={animFx} legacyMode={legacyBrushes} onLegacyToggle={setLegacyBrushes} stickers={stickers} onStickersChange={onStickersChange} pendingSticker={pendingSticker} onStickerPlaced={onStickerPlaced} say={say} grainIntroSeen={grainIntroSeen} onGrainIntroSeen={onGrainIntroSeen}/></div>
    <button onClick={capture} aria-label={`Capture page ${frames.length+1}`} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold flex items-center justify-center gap-2" style={{background:T.ink,color:T.paper,boxShadow:`4px 4px 0 ${T.accent}`,transform:justCap?"scale(.97)":"scale(1)",transition:"transform .2s"}}>
      <span style={{fontSize:20,lineHeight:1}}>＋</span> Capture page {frames.length+1}
    </button>
    {frames.length===0&&<p className="text-center text-xs opacity-50 mt-2">Capture 2+ pages to animate. 🧅 Onion shows previous pages as ghosts.</p>}
    {frames.length>0&&(<div style={{animation:"lokrise .3s ease"}}>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Timeline · {frames.length} pages</div>
        <button onClick={()=>{setFrames([]);setFrameDurations([]);easel.current.clearAll();say("Cleared all pages");}} aria-label="Clear all pages" className="text-[11px] font-bold underline opacity-60">clear all</button>
      </div>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-2">
        {frames.map((f,i)=>(<div key={i} className="shrink-0 flex flex-col gap-0.5" style={{width:76}}>
          <div className="rounded-lg overflow-hidden relative" style={{border:`2.5px solid ${T.ink}`,boxShadow:`2px 2px 0 ${T.shadow}`}}>
            <img src={f} alt={`page ${i+1}`} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/>
            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-bold" style={{background:T.ink,color:onColor(T.ink,T)}}>{i+1}</div>
          </div>
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>moveFrame(i,-1)} aria-label={`Move page ${i+1} left`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>‹</button>
            <button onClick={()=>setEditingDur(editingDur===i?null:i)} aria-label={`Edit duration ${i+1}`} className="lok-btn flex-1 text-[9px] font-mono py-0.5 rounded text-center opacity-70" style={{border:`1px solid ${T.shadow}`}}>{frameDurations[i]??paceMs}ms</button>
            <button onClick={()=>moveFrame(i,1)} aria-label={`Move page ${i+1} right`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>›</button>
          </div>
          {editingDur===i&&<input type="number" min="40" max="2000" value={frameDurations[i]??paceMs} onChange={e=>setFrameDurations(d=>{const n=[...d];n[i]=+e.target.value;return n;})} onBlur={()=>setEditingDur(null)} autoFocus aria-label={`Page ${i+1} duration ms`} className="w-full text-center text-[10px] rounded px-1 py-0.5" style={{border:`2px solid ${T.accent}`,background:T.card}}/>}
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>duplicateFrame(i)} aria-label={`Duplicate page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.ink}}>dup</button>
            <button onClick={()=>insertBlank(i)} aria-label={`Insert blank after ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>+↓</button>
            <button onClick={()=>{setFrames(fs=>fs.filter((_,k)=>k!==i));setFrameDurations(d=>d.filter((_,k)=>k!==i));}} aria-label={`Delete page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>✕</button>
          </div>
        </div>))}
      </div>
      <div className="mt-3 p-3 rounded-2xl flex gap-3 items-center" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
        <div className="relative shrink-0"><img src={frames[Math.min(pv,frames.length-1)]} alt="preview" className="rounded-lg" style={{width:92,aspectRatio:"4/5",objectFit:"cover",border:`2.5px solid ${T.ink}`}}/>{ready&&<div className="absolute -bottom-1.5 -right-1.5 lok-display text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent,border:`2px solid ${T.ink}`}}>▶ live</div>}</div>
        <div className="flex-1"><div className="font-bold text-sm">Default pace · <span style={{color:T.accent}}>{paceMs}ms</span>/page</div><input type="range" min="60" max="500" step="10" value={paceMs} onChange={e=>setPaceMs(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Default pace"/><div className="text-xs opacity-70">{ready?"Preview plays exactly as viewers see it.":"Add one more page to preview."}</div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Playback</div><div className="flex gap-2">{[["A","Scrub"],["B","Whole page"]].map(([id,l])=>(<button key={id} onClick={()=>setMode(id)} aria-pressed={mode===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${mode===id?T.accent:T.ink}`,background:mode===id?T.ink:T.card,color:mode===id?T.paper:T.ink}}>{l}</button>))}</div></div>
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Style</div><div className="flex gap-2">{[["bold","Bold"],["series","Series"]].map(([id,l])=>(<button key={id} onClick={()=>setStyle(id)} aria-pressed={style===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${style===id?T.accent:T.ink}`,background:style===id?T.alt:T.card,color:style===id?"#fff":T.ink}}>{l}</button>))}</div></div>
      </div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name this flip…" aria-label="Flip title" className="mt-3 w-full px-3 py-2.5 rounded-xl font-bold" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio",author:authorName});setFrames([]);setFrameDurations([]);setTitle("");easel.current.clearAll();}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
    </div>)}
  </div>);
}

function NewStudioUI({ownedTiers,ccTier,onPublish,say,kids,dailyPrompt,animFx,modules=[],legacyBrushes,setLegacyBrushes,frames,setFrames,frameDurations,setFrameDurations,title,setTitle,draftImg,setDraftImg,authorName,tutorialGhostFrames,paper="plain",cursorPack="default",postExport="png",mythicEquipped,stickers,onStickersChange,pendingSticker,onStickerPlaced,music,geoData,bloomEnabled=true,bloomIntroSeen=false,onBloomIntroSeen,grainIntroSeen=false,onGrainIntroSeen}){
  const onBloom=()=>{if(bloomEnabled&&!bloomIntroSeen){say("✨ Bright colors now glow when you capture a page — try a neon or sparkle stroke");onBloomIntroSeen&&onBloomIntroSeen();}};
  // Mythics were only ever wired into the legacy Studio, so anything bought
  // here (up to 5000 Loks) was invisible in the default UI. See docs/AUDIT.md.
  const mythicItem=mythicEquipped?MYTHIC_ITEMS.find(m=>m.id===mythicEquipped):null;
  const hasCanvasBorder=mythicItem?.type==="canvas_border";
  const T=useT();const easel=useRef(null);
  const[tier,setTier]=useState(10);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(140);const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);const[musicId,setMusicId]=useState(null);const[showMusicPicker,setShowMusicPicker]=useState(false);const[showLocationPrivacy,setShowLocationPrivacy]=useState(false);const[locationPrivacy,setLocationPrivacy]=useState("everyone");
  useEffect(()=>{if(draftImg)easel.current?.restoreFromImage(draftImg);},[]);
  // Autosave the live canvas every 2s rather than on unmount: the Easel ref is already
  // detached by the time a parent effect's cleanup runs (React nulls child refs before
  // running parent passive-effect cleanups), so capturing "on the way out" is unreliable.
  // A short periodic snapshot means switching tabs mid-stroke never loses more than ~2s of work.
  useEffect(()=>{const t=setInterval(()=>{if(easel.current)Promise.resolve(easel.current.composite()).then(setDraftImg).catch(()=>{});},2000);return()=>clearInterval(t);},[]);
  const[fps,setFps]=useState(24);const[playing,setPlaying]=useState(false);const[loop,setLoop]=useState(true);const[timelineZoom,setTimelineZoom]=useState(1);const[lightboxFrame,setLightboxFrame]=useState(null);const[autoAdvance,setAutoAdvance]=useState(false);const[onionCrosshair,setOnionCrosshair]=useState(false);const[clipboardFrame,setClipboardFrame]=useState(null);
  const hasFps=hasModule(modules,"anim_fps");const hasPlayback=hasModule(modules,"anim_playback");const hasOnionPro=hasModule(modules,"anim_onion_pro");const hasZoom=hasModule(modules,"anim_timeline_zoom");const hasVideo=hasModule(modules,"anim_export_video");const hasSprite=hasModule(modules,"anim_export_spritesheet")||postExport==="spritesheet";const hasGif=hasModule(modules,"feat_gif")||postExport==="gif";const hasLabels=hasModule(modules,"feat_labels");const hasTween=hasModule(modules,"feat_tween");
  const[frameLabels,setFrameLabels]=useState([]);const[editingLabel,setEditingLabel]=useState(null);
  const[showShare,setShowShare]=useState(false);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  const playRef=useRef(null);useEffect(()=>{if(!playing||frames.length<2)return;const t=setInterval(()=>{setPv(p=>{if(p+1>=frames.length){if(loop)return 0;setPlaying(false);return p;}return p+1;});},paceMs);playRef.current=t;return()=>clearInterval(t);},[playing,frames.length,paceMs,loop]);
  const onionColors=hasOnionPro?[ART.pink,ART.teal,T.accent,"#E8B14B","#7A4FBF"]:[ART.pink,ART.teal];const maxOnion=hasOnionPro?5:3;
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:onionColors[i%onionColors.length]||onionColors[0],opacity:onionOpacity/(i+1)})):[];
  const tutorialGhost=tutorialGhostFrames&&frames.length<tutorialGhostFrames.length?[{src:tutorialGhostFrames[frames.length],color:"#7A4FBF",opacity:0.35}]:[];
  const capture=()=>{const url=easel.current.composite(frames.length,{bloom:bloomEnabled});setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setFrameLabels(l=>[...l,""]);onStickersChange&&onStickersChange([]);setJustCap(true);setTimeout(()=>setJustCap(false),360);if(autoAdvance){setTimeout(()=>{const url2=easel.current.composite(frames.length+1,{bloom:bloomEnabled});setFrames(f=>[...f,url2]);setFrameDurations(d=>[...d,paceMs]);setFrameLabels(l=>[...l,""]);say(`Pages ${frames.length+1}-${frames.length+2} captured`);},100);}else say(`Page ${frames.length+1} captured`);onBloom();};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);setFrameLabels(l=>[...l.slice(0,i+1),"",...l.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);setFrameLabels(l=>[...l.slice(0,i+1),l[i]||"",...l.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameLabels(ll=>{const j=i+d;if(j<0||j>=ll.length)return ll;const c=[...ll];[c[i],c[j]]=[c[j],c[i]];return c;});};
  const clearFrame=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>f.map((x,k)=>k===i?blank:x));say(`Page ${i+1} cleared`);};
  const ready=frames.length>=2;
  const fpsToMs=f=>Math.round(1000/f);
  const setFpsAndPace=f=>{setFps(f);setPaceMs(fpsToMs(f));};
  const goPrev=()=>{setPlaying(false);setPv(p=>Math.max(0,p-1));};
  const goNext=()=>{setPlaying(false);setPv(p=>Math.min(frames.length-1,p+1));};
  const reverseFrames=()=>{setFrames(f=>[...f].reverse());setFrameDurations(d=>[...d].reverse());setFrameLabels(l=>[...l].reverse());say("Timeline reversed");};
  const pasteFrame=()=>{if(clipboardFrame!==null&&clipboardFrame<frames.length){setFrames(f=>[...f,f[clipboardFrame]]);setFrameDurations(d=>[...d,d[clipboardFrame]??paceMs]);say("Frame pasted from clipboard");}};
  const togglePlay=()=>{if(frames.length<2){say("Need at least 2 pages");return;}setPlaying(p=>!p);};
  const exportVideo=async()=>{if(!frames.length)return;say("Exporting video...");const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");const stream=c.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};recorder.onstop=()=>{const blob=new Blob(chunks,{type:"video/webm"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.trim()||"flip")+".webm";a.click();URL.revokeObjectURL(url);say("Video exported!","success");};recorder.start();for(let i=0;i<frames.length;i++){const img=new Image();await new Promise(r=>{img.onload=r;img.src=frames[i];});ctx.clearRect(0,0,W,H);paperBase(ctx,i);ctx.drawImage(img,0,0);await new Promise(r=>setTimeout(r,frameDurations[i]||paceMs));}recorder.stop();};
  const exportSpritesheet=async()=>{if(!frames.length)return;const cols=Math.min(frames.length,8);const rows=Math.ceil(frames.length/cols);const c=document.createElement("canvas");c.width=W*cols;c.height=H*rows;const ctx=c.getContext("2d");for(let i=0;i<frames.length;i++){const img=new Image();await new Promise(r=>{img.onload=r;img.src=frames[i];});ctx.drawImage(img,(i%cols)*W,Math.floor(i/cols)*H,W,H);}const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download=(title.trim()||"flip")+"_spritesheet.png";a.click();say("Spritesheet exported!","success");};
  // feat_tween: synthesise in-between pages from one drawn page by replaying
  // it under a per-frame transform. Cheaper than drawing the motion by hand
  // and it keeps whatever the source page already had (transparency included),
  // because each output is just the source re-drawn onto a clear W×H canvas.
  const TWEENS={
    bounce:{n:8,label:"Bounce",at:(ctx,img,t)=>{const y=-Math.abs(Math.sin(t*Math.PI))*H*0.13;ctx.translate(0,y);}},
    shake: {n:6,label:"Shake", at:(ctx,img,t,i)=>{const x=(i%2?1:-1)*(1-t)*W*0.035;ctx.translate(x,0);}},
    fade:  {n:6,label:"Fade",  at:(ctx,img,t)=>{ctx.globalAlpha=1-t*0.85;}},
    wiggle:{n:8,label:"Wiggle",at:(ctx,img,t)=>{ctx.translate(W/2,H/2);ctx.rotate(Math.sin(t*Math.PI*2)*0.06);ctx.translate(-W/2,-H/2);}},
  };
  const applyTween=async key=>{
    const spec=TWEENS[key];
    const srcUrl=frames[frames.length-1];
    if(!spec||!srcUrl){say("Capture a page first","error");return;}
    say(`${spec.label}…`);
    try{
      const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=srcUrl;});
      const out=[];
      for(let i=0;i<spec.n;i++){
        const t=spec.n===1?0:i/(spec.n-1);
        const c=document.createElement("canvas");c.width=W;c.height=H;
        const ctx=c.getContext("2d");
        ctx.save();spec.at(ctx,img,t,i);ctx.drawImage(img,0,0,W,H);ctx.restore();
        out.push(c.toDataURL("image/png"));
      }
      setFrames(f=>[...f,...out]);
      setFrameDurations(d=>[...d,...out.map(()=>Math.max(40,Math.round(paceMs*0.6)))]);
      setFrameLabels(l=>[...l,...out.map((_,i)=>`${key}${i+1}`)]);
      say(`${spec.label} · +${out.length} pages`,"success");
    }catch(e){console.warn("tween",e);say("Couldn't build that motion","error");}
  };
  const exportGif=async()=>{if(frames.length<2)return;say("Encoding GIF…");try{const canvases=await Promise.all(frames.map((src,i)=>new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");paperBase(ctx,i);ctx.drawImage(img,0,0);c.userDelay=Math.round((frameDurations[i]||paceMs)/10);res(c);};img.onerror=rej;img.src=src;})));const blob=encodeGIF(canvases,{delay:Math.round(paceMs/10),loop:0});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.trim()||"flip")+".gif";a.click();URL.revokeObjectURL(url);say(`GIF exported · ${(blob.size/1024).toFixed(1)}KB`,"success");}catch(e){console.warn("exportGif",e);say("GIF export failed — try fewer/smaller pages","error");}};
  const exportLok=async()=>{if(frames.length<2)return;try{const blob=await encodeLok(frames,{title:title.trim()||"Untitled flip",paceMs:frameDurations,loop:true});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(title.trim()||"flip")+".lok";a.click();URL.revokeObjectURL(a.href);say(`.lok exported · ${(blob.size/1024).toFixed(1)}KB`,"success");}catch(e){console.warn("exportLok",e);say("Export failed","error");}};
  return(<div className="mt-4">
    <div className="flex items-center justify-between">
      <div><h2 className="lok-display text-xl font-extrabold flex items-center gap-2">Studio{ccTier&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PRO</span>}</h2><p className="text-xs opacity-70 mt-0.5">Draw · capture · animate · publish</p></div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setZen(z=>!z)} aria-pressed={zen} aria-label="Speed Draw mode" className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${zen?T.accent:T.ink}`,background:zen?T.ink:T.card,color:zen?T.paper:T.ink}}>⚡ Speed</button>
        <div className="text-right"><div className="lok-display text-2xl font-extrabold" style={{color:frames.length?T.accent:T.ink}}>{frames.length}</div><div className="text-[10px] font-bold uppercase tracking-widest opacity-60">pages</div></div>
      </div>
    </div>
    {!kids&&activePrompt&&!zen&&(<>
      <div className="mt-2 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}><span style={{opacity:0.6}}>Prompt</span><span style={{color:T.accent}}>"{activePrompt}"</span>{(()=>{const m=PROMPT_META.find(p=>p.text===activePrompt);if(!m||m.motion==="static")return null;return <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{background:m.motion==="loop"?ART.teal:ART.pink,color:"#fff"}}>{m.motion==="loop"?"⟳ Loop":"→ Transform"}</span>;})()}{promptPick&&<button onClick={()=>setPromptPick(null)} aria-label="Back to today's prompt" className="ml-auto text-[10px] font-bold underline opacity-60">today's</button>}</div>
      <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0">Past</span>
        {pastPrompts.map(p=>(<button key={p} onClick={()=>setPromptPick(p)} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`1.5px solid ${promptPick===p?T.accent:T.shadow}`,color:T.ink,opacity:0.8}}>{p}</button>))}
      </div>
    </>)}
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      {hasFps&&<><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">FPS</span>{[12,24,30,60].map(f=>(<button key={f} onClick={()=>setFpsAndPace(f)} aria-pressed={fps===f} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${fps===f?T.accent:T.ink}`,background:fps===f?T.ink:T.card,color:fps===f?T.paper:T.ink}}>{f}</button>))}</>}
      {hasPlayback&&frames.length>0&&(<>
        <span className="text-[10px] font-bold opacity-50"></span>
        <button onClick={goPrev} disabled={pv<=0} className="lok-btn w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:pv<=0?0.35:1}}>◀</button>
        <button onClick={togglePlay} className="lok-btn w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${playing?T.accent:T.ink}`,background:playing?T.ink:T.card,color:playing?T.paper:T.ink}}>{playing?"⏸":"▶"}</button>
        <button onClick={goNext} disabled={pv>=frames.length-1} className="lok-btn w-11 h-11 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:pv>=frames.length-1?0.35:1}}>▶</button>
        <button onClick={()=>setLoop(l=>!l)} aria-pressed={loop} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${loop?T.accent:T.ink}`,background:loop?T.ink:T.card,color:loop?T.paper:T.ink}}>⟳</button>
      </>)}
      {frames.length>0&&<div className="text-[10px] font-mono font-bold opacity-60">{pv+1}/{frames.length}</div>}
    </div>
    {!zen&&(<><div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[10px] font-bold uppercase tracking-widest opacity-50 shrink-0 mr-1">Layers</span>
      {TIERS.map(t=>{const own=ownedTiers.includes(t.layers);const on=tier===t.layers;return(<button key={t.layers} onClick={()=>own?setTier(t.layers):say(`Unlock ${t.label} in Shop`)} aria-label={`${own?"Use":"Unlock"} ${t.label}`} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${on?T.accent:T.ink}`,background:on?T.ink:T.card,color:on?T.paper:T.ink,opacity:own?1:0.45}}>{own?t.label:`🔒 ${t.label}`}</button>);})}
    </div>
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button onClick={()=>setOnionOn(v=>!v)} aria-pressed={onionOn} className="lok-btn px-2.5 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${onionOn?T.accent:T.shadow}`,background:onionOn?T.ink:"transparent",color:onionOn?T.paper:T.ink}}>🧅 Onion {onionOn?"ON":"OFF"}</button>
      {onionOn&&frames.length>0&&(<>
        <label className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Opacity<input type="range" min="0.05" max="0.5" step="0.05" value={onionOpacity} onChange={e=>setOnionOpacity(+e.target.value)} style={{accentColor:T.accent,width:48}} aria-label="Onion opacity"/></label>
        <div className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Prev{[1,2,3,...(hasOnionPro?[4,5]:[])].map(n=><button key={n} onClick={()=>setOnionCount(n)} aria-pressed={onionCount===n} className="lok-btn w-6 h-6 rounded-full text-[10px] font-bold" style={{border:`2px solid ${onionCount===n?T.accent:T.shadow}`,background:onionCount===n?T.ink:"transparent",color:onionCount===n?T.paper:T.ink}}>{n}</button>)}</div>
        {hasOnionPro&&<label className="flex items-center gap-1 text-xs" style={{color:T.ink}}><input type="checkbox" checked={onionCrosshair} onChange={e=>setOnionCrosshair(e.target.checked)} style={{accentColor:T.accent}}/> Crosshair</label>}
      </>)}
    </div></>)}
    <div className={`mt-2 ${hasCanvasBorder?"rarity-mythic":""}`} style={hasCanvasBorder?{"--mythic-bg":T.paper,borderRadius:18,padding:3}:undefined}><Easel ref={easel} key={tier} maxLayers={tier} ccTier={ccTier} modules={modules} paper={paper} cursorPack={cursorPack} onionFrames={[...tutorialGhost,...onionFrames]} animFx={animFx} legacyMode={legacyBrushes} onLegacyToggle={setLegacyBrushes} stickers={stickers} onStickersChange={onStickersChange} pendingSticker={pendingSticker} onStickerPlaced={onStickerPlaced} say={say} grainIntroSeen={grainIntroSeen} onGrainIntroSeen={onGrainIntroSeen}/></div>
    <div className="mt-2 flex items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold" style={{color:T.ink}}><input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} style={{accentColor:T.accent}}/> Auto ×2</label>
      <button onClick={reverseFrames} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>↻ Reverse</button>
      {clipboardFrame!==null&&<button onClick={pasteFrame} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.accent}`,color:T.accent}}>📋 Paste</button>}
      {hasVideo&&<button onClick={exportVideo} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>🎬 Video</button>}
      {hasSprite&&<button onClick={exportSpritesheet} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>📦 Sheet</button>}
      {hasGif&&<button onClick={exportGif} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>🖼 GIF</button>}
      <button onClick={()=>setShowShare(true)} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.accent}`,color:T.accent,opacity:frames.length<2?0.35:1}}>📤 Share</button>
      <button onClick={exportLok} disabled={frames.length<2} aria-label="Export as .lok — LokBook's open animation format" className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.accent}`,color:T.accent,opacity:frames.length<2?0.35:1}}>🔗 .lok</button>
    </div>
    {hasTween&&<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
      <span className="text-[10px] font-bold opacity-60 shrink-0">auto-motion</span>
      {Object.entries(TWEENS).map(([k,v])=>(<button key={k} onClick={()=>applyTween(k)} disabled={!frames.length} title={`Add ${v.n} ${v.label.toLowerCase()} pages from the last page`} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length?1:0.35}}>{v.label}</button>))}
    </div>}
    <button onClick={capture} aria-label={`Capture page ${frames.length+1}`} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold flex items-center justify-center gap-2" style={{background:T.ink,color:T.paper,boxShadow:`4px 4px 0 ${T.accent}`,transform:justCap?"scale(.97)":"scale(1)",transition:"transform .2s"}}>
      <span style={{fontSize:20,lineHeight:1}}>＋</span> Capture page {frames.length+1}
    </button>
    {frames.length===0&&<p className="text-center text-xs opacity-50 mt-2">Capture 2+ pages to animate. 🧅 Onion shows previous pages as ghosts.</p>}
    {frames.length>0&&(<div style={{animation:"lokrise .3s ease"}}>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Timeline · {frames.length} pages</div>
        <div className="flex items-center gap-1.5">
          {hasZoom&&<><span className="text-[10px] font-bold opacity-60">Zoom</span><input type="range" min="0.4" max="2.5" step="0.1" value={timelineZoom} onChange={e=>setTimelineZoom(+e.target.value)} style={{accentColor:T.accent,width:60}} aria-label="Timeline zoom"/></>}
          <button onClick={()=>{setFrames([]);setFrameDurations([]);setFrameLabels([]);easel.current.clearAll();setClipboardFrame(null);setDraftImg(null);say("Cleared all pages");}} aria-label="Clear all pages" className="text-[11px] font-bold underline opacity-60">clear all</button>
        </div>
      </div>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-2">
        {frames.map((f,i)=>(<div key={i} className="shrink-0 flex flex-col gap-0.5" style={{width:Math.round(76*timelineZoom)}}>
          <div className="rounded-lg overflow-hidden relative cursor-pointer" style={{border:`2.5px solid ${i===pv?T.accent:T.ink}`,boxShadow:`2px 2px 0 ${T.shadow}`}} onClick={()=>setLightboxFrame(f)}>
            <img src={f} alt={`page ${i+1}`} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/>
            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-bold" style={{background:T.ink,color:onColor(T.ink,T)}}>{i+1}</div>
            {i===pv&&<div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full" style={{background:T.accent}}/>}
          </div>
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>moveFrame(i,-1)} aria-label={`Move page ${i+1} left`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>‹</button>
            <button onClick={()=>setEditingDur(editingDur===i?null:i)} aria-label={`Edit duration ${i+1}`} className="lok-btn flex-1 text-[9px] font-mono py-0.5 rounded text-center opacity-70" style={{border:`1px solid ${T.shadow}`}}>{frameDurations[i]??paceMs}ms</button>
            <button onClick={()=>moveFrame(i,1)} aria-label={`Move page ${i+1} right`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>›</button>
          </div>
          {editingDur===i&&<input type="number" min="40" max="2000" value={frameDurations[i]??paceMs} onChange={e=>setFrameDurations(d=>{const n=[...d];n[i]=+e.target.value;return n;})} onBlur={()=>setEditingDur(null)} autoFocus aria-label={`Page ${i+1} duration ms`} className="w-full text-center text-[10px] rounded px-1 py-0.5" style={{border:`2px solid ${T.accent}`,background:T.card}}/>}
          {hasLabels&&(editingLabel===i?<input value={frameLabels[i]||""} onChange={e=>setFrameLabels(l=>{const n=[...l];n[i]=e.target.value.slice(0,24);return n;})} onBlur={()=>setEditingLabel(null)} onKeyDown={e=>e.key==="Enter"&&setEditingLabel(null)} autoFocus placeholder="label…" aria-label={`Page ${i+1} label`} className="w-full text-center text-[9px] rounded px-1 py-0.5" style={{border:`2px solid ${T.accent}`,background:T.card}}/>
            :<button onClick={()=>setEditingLabel(i)} aria-label={`Edit label for page ${i+1}`} className="lok-btn w-full text-[9px] font-bold py-0.5 rounded text-center truncate" style={{border:`1px solid ${T.shadow}`,color:frameLabels[i]?T.ink:T.shadow}}>🏷 {frameLabels[i]||"label…"}</button>)}
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>duplicateFrame(i)} aria-label={`Duplicate page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.ink}}>dup</button>
            <button onClick={()=>{setClipboardFrame(i);say(`Page ${i+1} copied`);}} aria-label={`Copy page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.ink}}>cpy</button>
            <button onClick={()=>insertBlank(i)} aria-label={`Insert blank after ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>+↓</button>
            <button onClick={()=>clearFrame(i)} aria-label={`Clear page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.ink}}>⌧</button>
            <button onClick={()=>{setFrames(fs=>fs.filter((_,k)=>k!==i));setFrameDurations(d=>d.filter((_,k)=>k!==i));}} aria-label={`Delete page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>✕</button>
          </div>
        </div>))}
      </div>
      <div className="mt-3 p-3 rounded-2xl flex gap-3 items-center" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
        <div className="relative shrink-0"><img src={frames[Math.min(pv,frames.length-1)]} alt="preview" className="rounded-lg" style={{width:92,aspectRatio:"4/5",objectFit:"cover",border:`2.5px solid ${T.ink}`}}/>{ready&&<div className="absolute -bottom-1.5 -right-1.5 lok-display text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent,border:`2px solid ${T.ink}`}}>▶ live</div>}</div>
        <div className="flex-1">
          <div className="font-bold text-sm">Default pace · <span style={{color:T.accent}}>{paceMs}ms</span>/page</div>
          <input type="range" min="60" max="500" step="10" value={paceMs} onChange={e=>setPaceMs(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Default pace"/>
          {hasPlayback&&frames.length>1&&<input type="range" min="0" max={frames.length-1} value={pv} onChange={e=>{setPlaying(false);setPv(+e.target.value);}} className="w-full mt-1" style={{accentColor:T.accent}} aria-label="Scrub through frames"/>}
          <div className="text-xs opacity-70">{ready?"Preview plays exactly as viewers see it.":"Add one more page to preview."}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Playback</div><div className="flex gap-2">{[["A","Scrub"],["B","Whole page"]].map(([id,l])=>(<button key={id} onClick={()=>setMode(id)} aria-pressed={mode===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${mode===id?T.accent:T.ink}`,background:mode===id?T.ink:T.card,color:mode===id?T.paper:T.ink}}>{l}</button>))}</div></div>
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Style</div><div className="flex gap-2">{[["bold","Bold"],["series","Series"]].map(([id,l])=>(<button key={id} onClick={()=>setStyle(id)} aria-pressed={style===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${style===id?T.accent:T.ink}`,background:style===id?T.alt:T.card,color:style===id?"#fff":T.ink}}>{l}</button>))}</div></div>
      </div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name this flip…" aria-label="Flip title" className="mt-3 w-full px-3 py-2.5 rounded-xl font-bold" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      <button onClick={()=>setShowMusicPicker(!showMusicPicker)} className="lok-btn w-full py-2 rounded-xl text-sm font-bold mt-2" style={{border:`2.5px solid ${T.ink}`,background:musicId?T.accent:T.card,color:musicId?T.onAccent:T.ink}}>🎵 {musicId?"Music added":"Add music (optional)"}</button>
      {showMusicPicker&&(()=>{const tracks=(music?.list||[]).filter(t=>t.kind==="file");return(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setShowMusicPicker(false)}><div className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain" style={{maxWidth:560,maxHeight:"70vh",background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><div className="lok-display font-extrabold">🎵 Select a track</div><button onClick={()=>setShowMusicPicker(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}}>✕</button></div>
        <div className="text-xs opacity-70 mb-3">Pick a track from your library to play with this post when viewed.</div>
        <div className="space-y-2">
          {tracks.length===0?<div className="text-xs opacity-50 text-center py-4">No tracks in your library yet.<br/>Add an MP3 below or open the Music player (♪).</div>:tracks.map(t=>(
            <button key={t.id} onClick={()=>{setMusicId(t.id);setShowMusicPicker(false);}} aria-pressed={musicId===t.id} className="lok-btn w-full text-left px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{border:`2px solid ${musicId===t.id?T.accent:T.ink}`,background:musicId===t.id?T.ink:T.card,color:musicId===t.id?T.paper:T.ink}}>
              <span className="flex-1 truncate">{t.title}</span>{musicId===t.id&&<span>✓</span>}
            </button>
          ))}
          {musicId&&<button onClick={()=>{setMusicId(null);}} className="lok-btn w-full py-2 rounded-xl text-xs font-bold underline opacity-60">Clear selection</button>}
        </div>
        {music?.addFiles&&<label className="mt-3 flex items-center justify-center gap-1.5 cursor-pointer lok-btn py-2 rounded-xl text-sm font-bold" style={{border:`2.5px dashed ${T.ink}`,background:T.paper,color:T.ink}}>
          ＋ Add MP3 from device
          <input type="file" accept="audio/*,.mp3,.m4a,.wav,.flac" hidden aria-hidden="true" onChange={async e=>{const f=[...(e.target.files||[])];e.target.value="";if(!f.length)return;await music.addFiles(f);say&&say(`${f.length} file${f.length>1?"s":""} added to library`,"success");}}/>
        </label>}
      </div></div>);})()}
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}if(geoData?.location){setShowLocationPrivacy(true);}else{onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,musicId:musicId||undefined,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio",author:authorName});setFrames([]);setFrameDurations([]);setFrameLabels([]);setTitle("");setClipboardFrame(null);setDraftImg(null);setMusicId(null);easel.current.clearAll();}}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
    </div>)}
    {lightboxFrame&&<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,.85)",cursor:"pointer"}} onClick={()=>setLightboxFrame(null)} onKeyDown={e=>e.key==="Escape"&&setLightboxFrame(null)} tabIndex={0}>
      <img src={lightboxFrame} alt="Frame preview" className="max-w-[80vw] max-h-[90vh] rounded-2xl" style={{border:`4px solid ${T.paper}`}}/>
      <button onClick={()=>setLightboxFrame(null)} className="absolute top-4 right-4 text-2xl font-bold" style={{color:"#fff",textShadow:"0 2px 4px rgba(0,0,0,.5)"}}>✕</button>
    </div>}
    {showShare&&<SharePreview frames={frames} frameDurations={frameDurations} paceMs={paceMs} title={title} say={say} onClose={()=>setShowShare(false)}/>}
    {showLocationPrivacy&&<LocationPrivacySelector currentPrivacy={locationPrivacy} onSelect={(privacy)=>{setLocationPrivacy(privacy);const postData={id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,musicId:musicId||undefined,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio",author:authorName};if(geoData?.location){postData.latitude=geoData.location.lat;postData.longitude=geoData.location.lng;postData.location_name=geoData.placeName;postData.location_privacy=privacy;}onPublish(postData);setFrames([]);setFrameDurations([]);setFrameLabels([]);setTitle("");setClipboardFrame(null);setDraftImg(null);setMusicId(null);setShowLocationPrivacy(false);easel.current.clearAll();}} onClose={()=>setShowLocationPrivacy(false)}/>}
  </div>);
}

// Read-only preview for someone else's gallery (resident or real artist) —
// the full Viewer's edit/delete/vote affordances assume the post is yours
// (it infers "own" from post.from, not from author), so browsing another
// artist's back-catalogue needs its own lightweight, non-mutating viewer.
function GalleryPreview({posts,index,onClose,onNav}){
  const T=useT();const post=posts[index];
  const[fi,setFi]=useState(0);
  useEffect(()=>{setFi(0);},[index]);
  useEffect(()=>{
    if(!post?.frames||post.frames.length<2)return;
    const t=setInterval(()=>setFi(f=>(f+1)%post.frames.length),post.paceMs||160);
    return()=>clearInterval(t);
  },[post]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")onNav(-1);if(e.key==="ArrowRight")onNav(1);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose,onNav]);
  if(!post)return null;
  return(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,.7)"}} onClick={onClose}>
    <div className="w-full rounded-2xl overflow-hidden" style={{maxWidth:420,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`6px 6px 0 ${T.shadow}`}} onClick={e=>e.stopPropagation()}>
      <div className="relative flex items-center justify-center" style={{aspectRatio:"4/5",background:T.paper}}>
        {post.frames?.[fi]?<img src={post.frames[fi]} alt={post.title} className="w-full h-full" style={{objectFit:"cover"}}/>:<div className="text-center opacity-40"><div className="lok-display font-extrabold">{post.title}</div><div className="text-xs">Rendering…</div></div>}
        <button onClick={onClose} aria-label="Close preview" className="lok-btn absolute top-2 right-2 px-2.5 py-1 rounded-full font-extrabold text-xs" style={{background:T.card,border:`2px solid ${T.ink}`}}>✕</button>
        {index>0&&<button onClick={()=>onNav(-1)} aria-label="Previous piece" className="lok-btn absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-2 rounded-full font-extrabold" style={{background:T.card,border:`2px solid ${T.ink}`}}>‹</button>}
        {index<posts.length-1&&<button onClick={()=>onNav(1)} aria-label="Next piece" className="lok-btn absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-2 rounded-full font-extrabold" style={{background:T.card,border:`2px solid ${T.ink}`}}>›</button>}
      </div>
      <div className="p-3">
        <div className="lok-display font-extrabold text-sm truncate">{post.title}</div>
        <div className="text-xs opacity-60 mt-0.5">{post.votes||0} votes · {post.views||0} views</div>
      </div>
    </div>
  </div>);
}
function PostCard({p,onOpen}){
  const T=useT();
  if(!p.frames||p.frames.length===0)return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={p.title}><div className="flex items-center justify-center" style={{aspectRatio:"4/5",background:T.paper}}><div className="text-center opacity-40"><div className="lok-display font-extrabold">{p.title}</div><div className="text-xs">Rendering…</div></div></div></button>);
  return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={`Open ${p.title}`}><div className="relative"><img src={p.frames[Math.floor(p.frames.length/2)]} alt={p.title} className="w-full block" style={{aspectRatio:"4 / 5",objectFit:"cover"}}/><div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-xs font-bold" style={{background:T.ink,color:T.paper}}>{p.from==="battle"?"⚔ battle":p.mode==="B"?"▣ page":`${p.frames.length}pg`}</div></div><div className="px-2.5 py-2"><div className="font-bold leading-tight truncate text-sm">{p.title}</div><div className="text-xs opacity-70 mt-0.5">{p.votes} votes · {p.views||0} views</div></div></button>);
}
function PersonRow({name,note}){const T=useT();const seed=name.length*31;return(<div className="flex items-center gap-3 p-2 rounded-xl mb-2" style={{border:`2.5px solid ${T.ink}`,background:T.card}}><img src={renderAvatar(seed)} alt={name} className="w-11 h-11 rounded-full" style={{border:`2px solid ${T.ink}`}}/><div className="font-bold flex-1">{name}</div>{note&&<span className="text-xs opacity-60">{note}</span>}</div>);}

function Profile({posts,profile,setProfile,wins,lokPass,kids,cosmetics={},level,xp,quests,following,lokdInCount,bookmarks,notifications=[],notifUnread=0,loks=0,totalEarned=0,questsCompleted=0,canInstall=false,onInstall,onClearNotifs,onOpen,onDelete,onRename,say,onCheat,pace="sweep",setPace,speed=1,setSpeed,soundLab=false,onUnlockSoundLab,soundQueue=[],setSoundQueue,founder=false,onFounderJoin,animatedToken=false,flair="",garden=[],setGarden,wordTwister={},setWordTwister,timeMachineIdx=-1,setTimeMachineIdx,heatmapData=[],sessionPin=null,setSessionPin,pinInput="",setPinInput,verified=false,setVerified,devTap,devTimer,devMode,setDevMode,appLogo,setAppLogo,hapticGrammar,setHapticGrammar,setPinUnlocked,setLoks,setTotalEarned,legacyStudio,setLegacyStudio,tutorialProgress={},onStartTutorial,viewingArtist,onBackToMyGallery,featureFlags={compactUi:false,uiScale:"normal"},onSetFlag,onRequestGyroPermission,gyroPermissionGranted=false,weatherOverride,onSetWeather,onOpenMusic,onOpenRoadmap,onOpenWorldMap,onOpenMail,mailUnreadCount=0,onMintGuestPass,onRedeemGuestPass}){
  const T=useT();const[filter,setFilter]=useState("newest");const[view,setView]=useState("gallery");const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(profile);const[showNotifs,setShowNotifs]=useState(false);const[searchQ,setSearchQ]=useState("");const[showSettings,setShowSettings]=useState(false);const[gyroAttempted,setGyroAttempted]=useState(false);
  const[previewIdx,setPreviewIdx]=useState(null);
  useBodyScrollLock(showSettings||editing||previewIdx!==null);
  const tapCount=useRef(0);const tapTimer=useRef(null);const audioRef=useRef(null);const[slUrl,setSlUrl]=useState("");const[slPlaying,setSlPlaying]=useState(null);const[fHandle,setFHandle]=useState(profile.name||"");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);
  const[bleepCode,setBleepCode]=useState("");
  // Debug-only, never persisted: stash the real balance while unlimited Loks
  // is on so turning it off restores exactly what the player actually earned.
  const debugRealLoks=useRef(null);
  const[debugUnlimitedLoks,setDebugUnlimitedLoks]=useState(false);
  const toggleDebugUnlimitedLoks=()=>{
    if(!debugUnlimitedLoks){debugRealLoks.current=loks;setLoks(999999);setDebugUnlimitedLoks(true);say("Unlimited Loks on (debug)","success");}
    else{setLoks(debugRealLoks.current??loks);debugRealLoks.current=null;setDebugUnlimitedLoks(false);say("Unlimited Loks off — balance restored");}
  };
  const versionTap=()=>{if(soundLab)return;tapCount.current++;clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>{tapCount.current=0;},1200);if(tapCount.current>=7){tapCount.current=0;onUnlockSoundLab&&onUnlockSoundLab();say("🔊 Sound Lab unlocked","success");}};
  const[passCode,setPassCode]=useState(null);const[passBusy,setPassBusy]=useState(false);const[passEmail,setPassEmail]=useState("");
  const[redeemInput,setRedeemInput]=useState("");const[redeemBusy,setRedeemBusy]=useState(false);const[redeemOpen,setRedeemOpen]=useState(false);
  const mintPass=async()=>{if(!onMintGuestPass)return;setPassBusy(true);try{const code=await onMintGuestPass(passEmail.trim()||null);if(code){setPassCode(code);say("Ink stashed. Keep that code somewhere safe.","success");}else say("Couldn't reach the Well — try again","error");}catch{say("Couldn't reach the Well — try again","error");}setPassBusy(false);};
  const redeemPass=async()=>{if(!onRedeemGuestPass||!redeemInput.trim())return;setRedeemBusy(true);try{const ok=await onRedeemGuestPass(redeemInput.trim());if(!ok){say("That code isn't in the Well","error");setRedeemBusy(false);}}catch{say("That code isn't in the Well","error");setRedeemBusy(false);}};
  const ytId=u=>{const m=u.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);return m?m[1]:null;};
  const slAdd=()=>{const u=slUrl.trim();if(!u)return;const kind=ytId(u)?"youtube":/spotify\.com/.test(u)?"spotify":"mp3";setSoundQueue(q=>[...q.slice(-9),{id:Date.now(),url:u,kind}]);setSlUrl("");say(kind==="spotify"?"Queued (Spotify embed — full playback needs Premium SDK)":"Queued");};
  const slPlay=item=>{if(item.kind==="mp3"){if(audioRef.current){audioRef.current.pause();}const a=new Audio(item.url);audioRef.current=a;a.play().catch(()=>say("Couldn't play that URL"));}setSlPlaying(item.id);};
  const slStop=()=>{if(audioRef.current)audioRef.current.pause();setSlPlaying(null);};
  useEffect(()=>()=>{if(audioRef.current)audioRef.current.pause();},[]);
  const joinFounders=async()=>{if(!fHandle.trim()||fHandle.trim().length<2){say("Enter a handle");return;}setFBusy(true);try{await onFounderJoin(fHandle.trim(),fEmail.trim());say("You're a founder! Data secured on the test server 🏆","success");}catch{say("Couldn't reach the server — try again","error");}setFBusy(false);};
  const auth=useAuth();const[authEmail,setAuthEmail]=useState("");const[authSent,setAuthSent]=useState("");const[authBusy,setAuthBusy]=useState(false);const[cloudBusy,setCloudBusy]=useState(false);
  const sendAuthLink=async()=>{const e=authEmail.trim();if(!e||!e.includes("@")){say("Enter a valid email","error");return;}setAuthBusy(true);try{await auth.signInWithEmail(e);setAuthSent(e);say("Magic link sent — check your email","success");}catch{say("Couldn't send link — try again","error");}setAuthBusy(false);};
  const acctPanelRef=useRef(null);
  useEffect(()=>{if(showSettings&&acctPanelRef.current)gsap.fromTo(acctPanelRef.current,{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power2.out",delay:0.05});},[showSettings,authSent]);
  const tapBtn=e=>gsap.fromTo(e.currentTarget,{scale:0.95},{scale:1,duration:0.25,ease:"back.out(3)"});
  const cloudSyncNow=async()=>{if(!supabase||!auth.getUserId())return;setCloudBusy(true);try{const localSave=await store.get(SAVE_KEY);const localGallery=await store.get(GALLERY_KEY);const{error}=await supabase.from("auth_saves").upsert({user_id:auth.getUserId(),save_blob:{...localSave,_gallery:localGallery},updated_at:new Date().toISOString()});if(error)throw error;say("Backed up to the cloud","success");}catch{say("Cloud sync failed — try again","error");}setCloudBusy(false);};
  const cloudRestoreNow=async()=>{if(!supabase||!auth.getUserId())return;if(!window.confirm("Replace this device's data with your cloud backup? This device will reload."))return;setCloudBusy(true);try{const{data,error}=await supabase.from("auth_saves").select("save_blob").eq("user_id",auth.getUserId()).single();if(error)throw error;if(!data?.save_blob){say("No cloud backup found yet","error");setCloudBusy(false);return;}const{_gallery,...saveRest}=data.save_blob;await store.set(SAVE_KEY,saveRest);if(_gallery)await store.set(GALLERY_KEY,_gallery);window.location.reload();}catch{say("Restore failed — try again","error");setCloudBusy(false);}};
  const isIOS=typeof navigator!=="undefined"&&/iPad|iPhone|iPod/.test(navigator.userAgent);
  const targetArtist=viewingArtist||profile.name;
  const botPersona=viewingArtist?BOT_PERSONAS[viewingArtist]:null;
  // Viewing someone else's page: fetch their public row instead of showing
  // our own bio/avatar/stats under their name. Bots carry their data in
  // BOT_PERSONAS already, so only real accounts need the network round-trip.
  const[viewedProfile,setViewedProfile]=useState(null);
  useEffect(()=>{
    if(!viewingArtist||botPersona){setViewedProfile(null);return;}
    let live=true;
    fetchArtistByHandle(viewingArtist).then(p=>{if(live)setViewedProfile(p);});
    return()=>{live=false;};
  },[viewingArtist,botPersona]);
  const avatarSeed=viewingArtist?(viewedProfile?.avatar_seed??(viewingArtist.length*31)):profile.avatarSeed;
  const avatar=useMemo(()=>renderAvatar(avatarSeed),[avatarSeed]);
  const displayBio=viewingArtist?(botPersona?"":(viewedProfile?viewedProfile.bio||"No bio yet.":"Loading…")):profile.bio;
  // Resident AI artists always have a gallery to show, even before any of
  // their ambient posts have landed in this device's feed.
  const backCat=useMemo(()=>(viewingArtist&&isBotArtist(viewingArtist))?botBackCatalogue(viewingArtist,6):[],[viewingArtist]);
  const myPosts=useMemo(()=>{
    const own=posts.filter(p=>p.author===targetArtist);
    if(!backCat.length)return own;
    const seen=new Set(own.map(p=>p.id));
    return[...own,...backCat.filter(p=>!seen.has(p.id))];
  },[posts,targetArtist,backCat]);
  const filtered=[...myPosts].filter(p=>!searchQ||p.title?.toLowerCase().includes(searchQ.toLowerCase())||p.style?.toLowerCase().includes(searchQ.toLowerCase())).sort((a,b)=>{if(filter==="loks")return b.votes-a.votes;if(filter==="views")return(b.views||0)-(a.views||0);return 0;}).filter(p=>filter==="battle"?p.from==="battle":filter==="series"?p.style==="series":filter==="weekly"?p.weeklyPrompt===WEEKLY_PROMPT:true);
  const nextMilestone=[10,25,50,100].find(m=>questsCompleted<m);
  const bookmarked=posts.filter(p=>bookmarks.includes(p.id));
  return(<div>
    <section className="mt-4 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`6px 6px 0 ${T.shadow}`}}>
      <div className="flex items-center gap-4">
        <FramedAvatar src={avatar} size={72} frame={viewingArtist?null:cosmetics.frame} accent={viewingArtist?null:cosmetics.avatarAccent} ink={T.ink} acc={T.accent} animated={!viewingArtist&&animatedToken}/>
        <div className="min-w-0 flex-1"><div className="lok-display text-xl font-extrabold leading-tight flex items-center gap-2 flex-wrap"><NameTag name={viewingArtist||profile.name} color={viewingArtist?"default":cosmetics.nameColor} style={{color:T.ink}}/>{!viewingArtist&&flair&&<span className="text-[10px] ml-1 px-1 py-0.5 rounded" style={{background:T.alt,color:onColor(T.alt,T)}}>{flair}</span>}{!viewingArtist&&lokPass&&!kids&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PASS</span>}</div><div className="text-sm opacity-70">{myPosts.length} flips{viewingArtist?"":" · "+wins+" "+(wins===1?"win":"wins")}{viewingArtist&&!botPersona&&viewedProfile&&` · Level ${viewedProfile.level||1}`}</div>{botPersona&&(<><div className="mt-1 flex items-center gap-1.5 flex-wrap"><span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold" style={{background:T.alt,color:onColor(T.alt,T)}}>AI ARTIST</span>{botPersona.ward&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{border:`1.5px solid ${T.ink}`}}>{botPersona.ward}</span>}<span className="text-[10px] font-bold opacity-70">{botPersona.medium}</span><span className="text-[10px] opacity-50">· {botPersona.vibe}</span></div><p className="text-xs opacity-75 mt-1 leading-snug">{botPersona.bio}</p>{botPersona.lore&&<p className="text-xs opacity-70 mt-1.5 leading-snug" style={{borderLeft:`2.5px solid ${T.accent}`,paddingLeft:8}}>{botPersona.lore}</p>}{botPersona.signature&&<div className="text-[10px] opacity-55 mt-1.5 italic">Known for: {botPersona.signature}</div>}</>)}</div>
        <div className="flex gap-1.5">
          {viewingArtist?<button onClick={onBackToMyGallery} className="lok-btn px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.accent}`,background:T.ink,color:T.paper}}>← Back to mine</button>:<>
          {notifUnread>0&&<button onClick={()=>{setShowNotifs(v=>!v);onClearNotifs&&onClearNotifs();}} className="lok-btn relative px-2 py-1.5 rounded-full text-xs font-bold" style={{border:`2px solid ${T.accent}`,background:T.accent,color:onColor(T.accent,T)}} aria-label={`${notifUnread} notifications`}>🔔 {notifUnread}</button>}
          <button onClick={()=>onOpenMail&&onOpenMail()} className="lok-btn relative px-2 py-1.5 rounded-full text-xs font-bold" style={{border:`2px solid ${T.ink}`,background:mailUnreadCount>0?T.accent:T.card,color:mailUnreadCount>0?onColor(T.accent,T):T.ink}} aria-label={mailUnreadCount>0?`${mailUnreadCount} unread mail`:"Mail"}>📬{mailUnreadCount>0?` ${mailUnreadCount}`:""}</button>
          <button onClick={()=>{setDraft(profile);setEditing(true);}} className="lok-btn px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Edit profile">Edit</button>
          <button onClick={()=>setShowSettings(true)} className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Settings">⚙</button>
          </>}
        </div>
      </div>
      {showNotifs&&notifications.length>0&&(<div className="mt-3 flex flex-col gap-1.5">{notifications.slice(-5).reverse().map(n=>(<div key={n.id} className="text-xs px-3 py-2 rounded-xl" style={{background:T.paper,border:`1.5px solid ${T.shadow}`}}>{n.msg}</div>))}</div>)}
      <p className="mt-3 text-sm leading-snug">{displayBio}</p>
      {!viewingArtist&&<div className="mt-3 grid grid-cols-3 gap-2">{[["lokdin","Lok'd in",(lokdInCount).toLocaleString()],["lokd","Lok'd",following.length],["bookmarks","Bookmarks",bookmarks.length]].map(([id,label,n])=>(<button key={id} onClick={()=>setView(view===id?"gallery":id)} className="lok-btn py-2 rounded-xl text-center" style={{border:`2.5px solid ${view===id?T.accent:T.ink}`,background:view===id?T.ink:"transparent",color:view===id?T.paper:T.ink}} aria-pressed={view===id}><div className="lok-display font-extrabold leading-none">{n}</div><div className="text-[11px] opacity-75">{label}</div></button>))}</div>}
    </section>
    {!kids&&!viewingArtist&&(<section className="mt-3 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-between"><div className="lok-display font-extrabold">Level {level}</div><div className="text-xs opacity-70">{xp%100}/100 XP</div></div>
      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${xp%100}%`,height:"100%",background:T.accent}}/></div>
      <div className="lok-display font-extrabold mt-3 mb-1 text-sm">Today's quests</div>
      <div className="space-y-1.5">{quests?.items?.map(q=>(<div key={q.id} className="flex items-center gap-2 text-sm"><span className="font-bold" style={{color:q.done?T.alt:T.ink,opacity:q.done?1:0.9}}>{q.done?"✓":"○"}</span><span className="flex-1" style={{textDecoration:q.done?"line-through":"none",opacity:q.done?0.55:1}}>{q.label}</span><span className="text-xs font-bold" style={{color:T.accent}}>{q.progress}/{q.goal} · +{q.reward}</span></div>))}</div>
    </section>)}
    {!kids&&!viewingArtist&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.alt}`,background:T.card}}>
      <div className="flex items-center gap-2 mb-1.5"><div className="lok-display font-extrabold text-sm" style={{color:T.alt}}>🌀 Word Twister</div><span className="text-xs opacity-50">daily</span></div>
      {wordTwister.word?(!wordTwister.found?<div className="flex items-center gap-2"><span className="lok-display text-2xl font-extrabold tracking-widest" style={{color:T.accent}}>{wordTwister.shuffled}</span><input value={wordTwister.guess||""} onChange={e=>{const v=e.target.value.toLowerCase();setWordTwister(w=>{if(v===w.word){setLoks(l=>l+5);setTotalEarned(t=>t+5);say("Word cracked! +5 Loks","success");return{...w,found:true,guess:v};}return{...w,guess:v};});}} placeholder="Unscramble…" maxLength={20} className="flex-1 px-2 py-1.5 rounded-lg text-sm font-bold" style={{border:`2px solid ${T.ink}`,background:T.paper,color:T.ink}} aria-label="Guess the word"/><button onClick={()=>setWordTwister(w=>({...w,revealed:true}))} className="lok-btn text-[10px] font-bold px-2 py-1 rounded" style={{border:`1.5px solid ${T.shadow}`,color:T.ink}}>Reveal</button></div>:<div className="text-sm font-bold" style={{color:T.alt}}>Solved ✓ <span className="font-mono">{wordTwister.word}</span></div>):<button onClick={()=>{const pool=["SKETCH","INKWELL","BLOOM","RISOPRINT","LILLOK","FLIPBOOK","STENCIL","VIGNETTE"];const w=pool[Math.floor(Math.random()*pool.length)];const shuffled=w.split("").sort(()=>Math.random()-.5).join("");setWordTwister({word:w,shuffled,found:false,guess:"",revealed:false});}} className="lok-btn text-xs font-bold px-3 py-1.5 rounded-lg" style={{border:`2px solid ${T.ink}`}}>Start daily twister</button>}
      {wordTwister.revealed&&!wordTwister.found&&<div className="mt-1 text-[10px] font-bold opacity-60">The word was: <span className="font-mono" style={{color:T.accent}}>{wordTwister.word}</span></div>}
    </section>)}
    {!kids&&!viewingArtist&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="flex items-center justify-between mb-1.5"><div className="lok-display font-extrabold text-sm">Loks</div>{nextMilestone&&<div className="text-[10px] opacity-50 font-bold">next quest milestone: {nextMilestone}</div>}</div>
      <div className="flex items-center justify-around">
        <div className="text-center"><div className="lok-display font-extrabold text-xl" style={{color:T.accent}}>{loks}</div><div className="text-[11px] opacity-60">balance</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{totalEarned}</div><div className="text-[11px] opacity-60">earned all-time</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{questsCompleted}</div><div className="text-[11px] opacity-60">quests done</div></div>
      </div>
    </section>)}
    {!kids&&!viewingArtist&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.alt}`,background:T.card}}>
      <div className="flex items-center gap-2 mb-1.5"><div className="lok-display font-extrabold text-sm" style={{color:T.alt}}>🌱 Ink Garden</div><span className="text-xs opacity-50">{garden.length}/6 planted</span></div>
      <div className="grid grid-cols-3 gap-2">{Array.from({length:6}).map((_,i)=>{const plant=garden[i];return(<div key={i} className="rounded-xl flex items-center justify-center" style={{minHeight:60,border:`2px dashed ${plant?T.accent:T.shadow}`,background:plant?T.paper:"transparent",transition:"all .3s"}}>
        {plant?<div className="text-center"><div className="text-lg">{plant.harvested?"🌸":plant.growth>=100?"🌻":"🌱"}</div><div className="text-[9px] font-bold mt-0.5">{plant.harvested?"done":plant.growth>=100?<button onClick={()=>{setGarden(g=>g.map((x,j)=>j===i?{...x,harvested:true}:x));setLoks(l=>l+8);say("Harvested! +8 Loks","success");}} className="underline" style={{color:T.accent}}>harvest</button>:`${Math.round(plant.growth)}%`}</div></div>
        :<button onClick={()=>{const names=["Doodle Dahlia","Riso Rose","Ink Ivy","Sketch Sun","Bloom Bud","Violet Vine"];setGarden(g=>{const n=[...g];n[i]={name:names[i]||`Plant ${i+1}`,planted:Date.now(),growth:5+Math.random()*15,harvested:false};return n;});say("Planted a seed!","success");}} className="text-xs font-bold opacity-50">+ plant</button>}
      </div>);})}</div>
      {garden.some(p=>p&&!p.harvested)&&<button onClick={()=>setGarden(g=>g.map(p=>p&&!p.harvested?{...p,growth:Math.min(100,p.growth+5+Math.random()*10)}:p))} className="lok-btn mt-1.5 w-full py-1.5 rounded-xl text-xs font-bold" style={{border:`2px solid ${T.ink}`,background:T.card}}>💧 Water all (+water each plant)</button>}
    </section>)}
    {showSettings&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setShowSettings(false)}>
      <ErrorBoundary compact>
      <div className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain" style={{maxWidth:560,maxHeight:"min(85vh, 85dvh)",background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 mb-2" style={{background:T.card,borderBottom:`1px solid ${T.shadow}`,zIndex:10}}><div className="lok-display text-lg font-extrabold">Settings</div><button onClick={()=>setShowSettings(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close settings">✕</button></div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">📱 Add Lok to your home screen</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{isIOS?"Tap the Share button in Safari, then \u201CAdd to Home Screen\u201D. Lok opens full-screen like a native app.":"Install Lok as an app — it gets its own icon and opens full-screen, no browser bars."}</div>
          {!isIOS&&<button onClick={()=>onInstall&&onInstall()} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:canInstall?T.accent:T.shadow,color:canInstall?T.onAccent:T.ink,border:`3px solid ${T.ink}`,opacity:canInstall?1:0.7}} aria-label="Install Lok as an app">{canInstall?"Install Lok":"Install via browser menu →"}</button>}
        </div>
        <div ref={acctPanelRef} className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${auth.isAuthenticated()?T.alt:T.accent}`,background:T.paper}}>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex items-center justify-center rounded-full shrink-0" style={{width:30,height:30,fontSize:15,background:(auth.isAuthenticated()?T.alt:T.accent)+"22",border:`2px solid ${auth.isAuthenticated()?T.alt:T.accent}`}}>🔐</div>
            <div className="lok-display font-extrabold text-sm">Account{auth.isAuthenticated()&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:onColor(T.alt,T)}}>SIGNED IN</span>}</div>
          </div>
          {!supabase?(<div className="text-xs opacity-70 mt-1 leading-snug">Cloud accounts aren't configured for this build yet.</div>):auth.loading?(<div className="text-xs opacity-60 mt-1">Loading…</div>):auth.isAuthenticated()?(<>
            <div className="text-xs opacity-70 mt-1 leading-snug">Signed in as <strong>{auth.getEmail()}</strong>. Your gallery and progress can back up to the cloud and follow you to other devices.</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={cloudSyncNow} disabled={cloudBusy} className="lok-btn flex-1 py-2 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:cloudBusy?0.6:1}}>{cloudBusy?"Working…":"Back up now"}</button>
              <button onClick={cloudRestoreNow} disabled={cloudBusy} className="lok-btn flex-1 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink,opacity:cloudBusy?0.6:1}}>Restore</button>
            </div>
            <button onClick={()=>auth.signOut()} className="lok-btn mt-1.5 w-full py-1.5 rounded-xl font-bold text-xs" style={{border:`2px solid ${T.shadow}`,color:T.ink,background:"transparent"}}>Sign out</button>
          </>):authSent?(<div className="text-xs mt-1 leading-snug">✉️ Check <strong>{authSent}</strong> for a magic link to finish signing in.</div>):(<>
            <div className="text-xs opacity-70 mt-1 leading-snug">Sign in once and your gallery follows you — new phone, same Loks, same LilLok.</div>
            <div className="mt-2 flex gap-1.5">
              <input value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="your@email.com" type="email" aria-label="Email for account sign-in" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}} onKeyDown={e=>e.key==="Enter"&&sendAuthLink()}/>
              <button onClick={e=>{tapBtn(e);sendAuthLink();}} disabled={authBusy} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:authBusy?0.6:1}}>{authBusy?"Sending…":"Send link"}</button>
            </div>
          </>)}
        </div>
        {!auth.isAuthenticated()&&<div className="p-3 rounded-2xl mb-2" style={{border:`3px dashed ${T.alt}`,background:T.paper}}>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex items-center justify-center rounded-full shrink-0" style={{width:30,height:30,fontSize:15,background:T.alt+"22",border:`2px dashed ${T.alt}`}}>👻</div>
            <div className="lok-display font-extrabold text-sm">Guest of the Pass</div>
          </div>
          <p className="text-xs opacity-60 mt-1 italic leading-snug">"...still here. barely. give me a code and I'll hold your ink until you're ready."</p>
          {passCode?(<div className="mt-2 p-2.5 rounded-xl text-center" style={{border:`2px dashed ${T.ink}`,background:T.card}}>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">your code — write it down</div>
            <div className="lok-display font-extrabold text-lg my-1" style={{color:T.accent,letterSpacing:0.5}}>{passCode}</div>
            <button onClick={()=>{navigator.clipboard?.writeText(passCode);say("Copied");}} className="lok-btn text-[10px] font-bold px-2 py-1 rounded-lg" style={{border:`1.5px solid ${T.ink}`}}>copy</button>
          </div>
          ):(<>
            <div className="mt-2 flex gap-1.5">
              <input value={passEmail} onChange={e=>setPassEmail(e.target.value)} type="email" placeholder="email (optional)" aria-label="Email for guest pass" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
              <button onClick={mintPass} disabled={passBusy} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.alt,color:T.onAccent,border:`2.5px solid ${T.ink}`,opacity:passBusy?0.6:1}}>{passBusy?"…":"Stash my ink"}</button>
            </div>
            <div className="text-[10px] opacity-50 mt-1">Get a code you can redeem later, on this device or a new one — it brings back your whole gallery, Loks, and LilLok exactly as you left them. Full control, no account required.</div>
          </>)}
          <button onClick={()=>setRedeemOpen(v=>!v)} className="mt-2 text-[11px] font-bold underline opacity-60">have a code already?</button>
          {redeemOpen&&(<div className="mt-1.5 flex gap-1.5">
            <input value={redeemInput} onChange={e=>setRedeemInput(e.target.value)} placeholder="hollow-well-4821" aria-label="Redeem guest pass code" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}} onKeyDown={e=>e.key==="Enter"&&redeemPass()}/>
            <button onClick={redeemPass} disabled={redeemBusy} className="lok-btn shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.ink,color:T.paper,opacity:redeemBusy?0.6:1}}>{redeemBusy?"…":"Redeem"}</button>
          </div>)}
          <div className="mt-2 pt-2 flex items-center gap-1.5 flex-wrap text-[10px] opacity-60" style={{borderTop:`1.5px dashed ${T.shadow}`}}>remind me again in{GUEST_REMINDER_OPTIONS.map(n=>(<button key={n} onClick={()=>onSetFlag&&onSetFlag("guestReminderDays",n)} aria-pressed={(featureFlags.guestReminderDays||7)===n} className="lok-btn px-1.5 py-0.5 rounded font-bold" style={{border:`1.5px solid ${(featureFlags.guestReminderDays||7)===n?T.alt:"transparent"}`,color:(featureFlags.guestReminderDays||7)===n?T.alt:"inherit"}}>{n}d</button>))}</div>
        </div>}
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${founder?T.alt:T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🏆 Founders' test server{founder&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:onColor(T.alt,T)}}>FOUNDER</span>}</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{founder?"You're in. Your gallery, Loks and LilLok are backed up long-term on LokServices.":"Join the test server and your progress gets backed up long-term — founders keep everything into beta."}</div>
          {!founder&&(<>
            <input value={fHandle} onChange={e=>setFHandle(e.target.value)} placeholder="Handle" aria-label="Founder handle" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
            <input value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="Email (optional — for beta invite)" aria-label="Founder email" className="mt-1.5 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
            <button onClick={joinFounders} disabled={fBusy} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:fBusy?0.6:1}}>{fBusy?"Joining…":"Join as a founder"}</button>
          </>)}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${sessionPin?T.accent:T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🔒 Session lock{sessionPin&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:onColor(T.alt,T)}}>ACTIVE</span>}</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Set a 4-6 digit PIN to lock LokBook on startup.</div>
          <div className="mt-2 flex gap-1.5">
            {!sessionPin?(<><input type="password" maxLength={6} inputMode="numeric" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Set PIN" aria-label="Set session PIN" className="flex-1 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/><button onClick={()=>{if(pinInput.length>=4){setSessionPin(pinInput);setPinInput("");say("PIN set");}else say("Need 4-6 digits")}} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>Set</button></>):(<button onClick={()=>{setSessionPin(null);setPinUnlocked(true);say("PIN removed");}} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.ink,color:T.paper}}>Remove PIN</button>)}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} style={{accentColor:T.accent}}/> Verified creator badge {verified&&<span style={{color:T.alt}}>✓</span>}</label>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">Feed pacing</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">{Object.entries(PACE_PRESETS).map(([id,p])=>(
            <button key={id} onClick={()=>{setPace&&setPace(id);say(`${p.name} pacing`);}} aria-pressed={pace===id} title={p.desc} className="lok-btn py-1.5 rounded-xl text-[10px] font-extrabold" style={{border:`2.5px solid ${pace===id?T.accent:T.ink}`,background:pace===id?T.ink:T.card,color:pace===id?T.paper:T.ink}}>{p.name}</button>))}</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold" style={{color:T.ink}}>Speed {speed.toFixed(1)}×<input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e=>setSpeed&&setSpeed(+e.target.value)} className="flex-1" style={{accentColor:T.accent}} aria-label="Animation speed"/></label>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold" style={{color:T.ink}}>Haptic Grammar<select value={hapticGrammar} onChange={e=>setHapticGrammar(e.target.value)} className="ml-auto px-2 py-1 rounded-lg text-xs font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>
            <option value="default">Default</option><option value="expressive">Expressive</option><option value="quiet">Quiet</option>
          </select></div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={legacyStudio} onChange={e=>setLegacyStudio(e.target.checked)} style={{accentColor:T.accent}}/> Legacy Studio UI</label>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🗺️ The Roadmap</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">What levelling up actually changes. Not a shop — these alter how the world behaves.</div>
          <button onClick={()=>{setShowSettings(false);onOpenRoadmap&&onOpenRoadmap();}} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper,border:`3px solid ${T.ink}`}}>Open the roadmap</button>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🎵 Music</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Plug in your own MP3/MP4 files — they play in the background across the whole app and keep working offline.</div>
          <button onClick={()=>{setShowSettings(false);onOpenMusic&&onOpenMusic();}} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper,border:`3px solid ${T.ink}`}}>Open music player</button>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">World</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">See your drawings pinned at the locations where they were made.</div>
          <button onClick={()=>{setShowSettings(false);onOpenWorldMap&&onOpenWorldMap();}} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper,border:`3px solid ${T.ink}`}}>World</button>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">Display size</div>
          <div className="text-xs opacity-70 mt-0.5 mb-1.5 leading-snug">Shrink the UI to fit more on screen, or grow it for readability.</div>
          <div className="grid grid-cols-3 gap-1.5">{[["small","Compact"],["normal","Normal"],["large","Large"]].map(([id,label])=>(
            <button key={id} onClick={()=>onSetFlag&&onSetFlag("uiScale",id)} aria-pressed={(featureFlags.uiScale||"normal")===id} className="lok-btn py-1.5 rounded-xl text-xs font-extrabold" style={{border:`2.5px solid ${(featureFlags.uiScale||"normal")===id?T.accent:T.ink}`,background:(featureFlags.uiScale||"normal")===id?T.ink:T.card,color:(featureFlags.uiScale||"normal")===id?T.paper:T.ink}}>{label}</button>))}</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.compactUi} onChange={e=>onSetFlag&&onSetFlag("compactUi",e.target.checked)} style={{accentColor:T.accent}}/> Tighter spacing (compact layout)</label>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.invertColors} onChange={e=>onSetFlag&&onSetFlag("invertColors",e.target.checked)} style={{accentColor:T.accent}}/> Invert colors (dark invert of current theme)</label>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.highRefresh} onChange={e=>onSetFlag&&onSetFlag("highRefresh",e.target.checked)} style={{accentColor:T.accent}}/> Refresh rate: {featureFlags.highRefresh ? "High (120fps)" : "Standard (60fps)"}</label>
          <div className="text-[10px] opacity-55 leading-snug ml-6">Uncaps animation on 120Hz displays. Costs battery, and Reduce Motion still overrides it.</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={featureFlags.bloomEnabled!==false} onChange={e=>onSetFlag&&onSetFlag("bloomEnabled",e.target.checked)} style={{accentColor:T.accent}}/> ✨ Bloom glow (capture)</label>
          <div className="text-[10px] opacity-55 leading-snug ml-6">Bright and neon strokes softly glow when you capture a page. Free — nothing to unlock.</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.enableGyroscope} onChange={e=>{const enabled=e.target.checked;const newFlags={enableGyroscope:enabled,gyroLoadScreen:enabled,gyroFab:enabled,gyroLilLokPanel:enabled,gyroWorldMap:enabled,gyroChestOpen:enabled,gyroGalleryCards:enabled};setFeatureFlags(f=>({...f,...newFlags}));store.set("lok:flags",{...featureFlags,...newFlags});}} style={{accentColor:T.accent}}/> 🎮 Gyroscope (tilt interaction)</label>
          <div className="text-[10px] opacity-55 leading-snug ml-6">Master toggle for device motion detection. Enable to use gyroscope in all areas.</div>
          {featureFlags.enableGyroscope&&(<>
            <button onClick={()=>{setGyroAttempted(true);onRequestGyroPermission&&onRequestGyroPermission();}} className="lok-btn mt-2 ml-6 px-3 py-1.5 rounded-xl text-xs font-extrabold" style={{background:gyroPermissionGranted?T.accent:T.ink,color:gyroPermissionGranted?T.onAccent:T.paper,border:`2.5px solid ${T.ink}`}}>{gyroPermissionGranted?"Motion enabled ✓":"Enable motion & tilt"}</button>
            {gyroAttempted&&!gyroPermissionGranted&&(<div className="text-[10px] leading-snug ml-6 mt-1.5 p-2 rounded-lg" style={{background:T.shadow,color:T.ink}}>Motion access was denied. On iPhone: Settings → Safari → Motion &amp; Orientation Access must be turned on for this site, then reload the page.</div>)}
          </>)}
          {featureFlags.enableGyroscope&&(<div className="mt-2 ml-4 space-y-1 p-2 rounded-lg" style={{background:T.shadow,border:`1px solid ${T.ink}22`}}>
            <div className="text-xs font-bold opacity-70">Gyroscope effects:</div>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroLoadScreen} onChange={e=>onSetFlag&&onSetFlag("gyroLoadScreen",e.target.checked)} style={{accentColor:T.accent}}/> Load screen</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroFab} onChange={e=>onSetFlag&&onSetFlag("gyroFab",e.target.checked)} style={{accentColor:T.accent}}/> FAB button (LilLok)</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroLilLokPanel} onChange={e=>onSetFlag&&onSetFlag("gyroLilLokPanel",e.target.checked)} style={{accentColor:T.accent}}/> LilLok panel</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroWorldMap} onChange={e=>onSetFlag&&onSetFlag("gyroWorldMap",e.target.checked)} style={{accentColor:T.accent}}/> World map camera</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroChestOpen} onChange={e=>onSetFlag&&onSetFlag("gyroChestOpen",e.target.checked)} style={{accentColor:T.accent}}/> Chest opening</label>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.gyroGalleryCards} onChange={e=>onSetFlag&&onSetFlag("gyroGalleryCards",e.target.checked)} style={{accentColor:T.accent}}/> Gallery cards</label>
          </div>)}
          <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!featureFlags.showLokinButton} onChange={e=>onSetFlag&&onSetFlag("showLokinButton",e.target.checked)} style={{accentColor:T.accent}}/> Show Lok-in button on load screen</label>
          <div className="text-[10px] opacity-55 leading-snug ml-6">Click to enter the app instead of auto-transitioning.</div>
          <div className="mt-3 font-bold text-sm">Default page</div>
          <div className="text-xs opacity-70 mt-0.5 mb-1.5 leading-snug">Which tab Lok opens to.</div>
          <div className="grid grid-cols-3 gap-1.5">{[["feed","Feed"],["gallery","You"],["studio","Studio"],["battle","Battle"],["front","Rush"],["rooms","Rooms"]].map(([id,label])=>(
            <button key={id} onClick={()=>onSetFlag&&onSetFlag("defaultTab",id)} aria-pressed={(featureFlags.defaultTab||"feed")===id} className="lok-btn py-1.5 rounded-xl text-xs font-extrabold" style={{border:`2.5px solid ${(featureFlags.defaultTab||"feed")===id?T.accent:T.ink}`,background:(featureFlags.defaultTab||"feed")===id?T.ink:T.card,color:(featureFlags.defaultTab||"feed")===id?T.paper:T.ink}}>{label}</button>))}</div>
          <div className="mt-3 font-bold text-sm">LokMotion</div>
          <div className="text-xs opacity-70 mt-0.5 mb-1.5 leading-snug">How much the interface moves. Full adds bounce to buttons and the active tab.</div>
          <div className="grid grid-cols-3 gap-1.5">{[["off","Off"],["subtle","Subtle"],["full","Full"]].map(([id,label])=>(
            <button key={id} onClick={()=>onSetFlag&&onSetFlag("lokMotion",id)} aria-pressed={(featureFlags.lokMotion||"subtle")===id} className="lok-btn py-1.5 rounded-xl text-xs font-extrabold" style={{border:`2.5px solid ${(featureFlags.lokMotion||"subtle")===id?T.accent:T.ink}`,background:(featureFlags.lokMotion||"subtle")===id?T.ink:T.card,color:(featureFlags.lokMotion||"subtle")===id?T.paper:T.ink}}>{label}</button>))}</div>
          <div className="mt-3 font-bold text-sm">Combat interface</div>
          <div className="text-xs opacity-70 mt-0.5 mb-1.5 leading-snug">Unified combines Battle & Rush in one view; Legacy keeps them separate.</div>
          <div className="grid grid-cols-2 gap-1.5">{[["unified","Unified"],["legacy","Legacy"]].map(([id,label])=>(
            <button key={id} onClick={()=>onSetFlag&&onSetFlag("combatUIMode",id)} aria-pressed={(featureFlags.combatUIMode||"unified")===id} className="lok-btn py-1.5 rounded-xl text-xs font-extrabold" style={{border:`2.5px solid ${(featureFlags.combatUIMode||"unified")===id?T.accent:T.ink}`,background:(featureFlags.combatUIMode||"unified")===id?T.ink:T.card,color:(featureFlags.combatUIMode||"unified")===id?T.paper:T.ink}}>{label}</button>))}</div>
          <div className="mt-3 font-bold text-sm">Ink Weather</div>
          <div className="text-xs opacity-70 mt-0.5 mb-1.5 leading-snug">Pick a weather effect, or "Auto" for the daily weather.</div>
          <div className="grid grid-cols-3 gap-1.5">{[["","Auto"],["rain","Rain"],["fog","Fog"],["aurora","Aurora"],["dust","Dust"]].map(([id,label])=>(
            <button key={id} onClick={()=>onSetWeather&&onSetWeather(id)} aria-pressed={(weatherOverride||"")==id} className="lok-btn py-1.5 rounded-xl text-xs font-extrabold" style={{border:`2.5px solid ${(weatherOverride||"")==id?T.accent:T.ink}`,background:(weatherOverride||"")==id?T.ink:T.card,color:(weatherOverride||"")==id?T.paper:T.ink}}>{label}</button>))}</div>
        </div>
        {soundLab&&(<div className="p-3 rounded-2xl mb-2" style={{border:`3px dashed ${T.accent}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm" style={{color:T.accent}}>🔊 Sound Lab</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug">Hidden sandbox. Drop an MP3, YouTube or Spotify URL — plays under the app.</div>
          <div className="mt-2 flex gap-1.5">
            <input value={slUrl} onChange={e=>setSlUrl(e.target.value)} placeholder="Paste a URL…" aria-label="Sound Lab URL" className="flex-1 px-3 py-2 rounded-xl font-bold text-sm min-w-0" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
            <button onClick={slAdd} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm shrink-0" style={{background:T.ink,color:T.paper}}>Queue</button>
          </div>
          {soundQueue.length>0&&(<div className="mt-2 flex flex-col gap-1.5">{soundQueue.map(item=>(
            <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs" style={{border:`1.5px solid ${T.shadow}`,background:T.card}}>
              <span className="font-extrabold shrink-0" style={{color:T.alt}}>{item.kind==="youtube"?"▶ YT":item.kind==="spotify"?"♫ SP":"♪ MP3"}</span>
              <span className="flex-1 truncate opacity-70">{item.url}</span>
              {slPlaying===item.id?<button onClick={slStop} className="lok-btn font-bold shrink-0" style={{color:T.accent}}>stop</button>:<button onClick={()=>slPlay(item)} className="lok-btn font-bold shrink-0" style={{color:T.ink}}>play</button>}
              <button onClick={()=>{if(slPlaying===item.id)slStop();setSoundQueue(q=>q.filter(x=>x.id!==item.id));}} className="lok-btn font-bold shrink-0 opacity-60">✕</button>
            </div>))}
          </div>)}
          {soundQueue.some(i=>i.kind==="youtube"&&slPlaying===i.id)&&(()=>{const it=soundQueue.find(i=>i.id===slPlaying);const id=it&&(it.url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/)||[])[1];return id?<iframe title="soundlab-yt" width="0" height="0" style={{position:"absolute",width:1,height:1,opacity:0,pointerEvents:"none"}} src={`https://www.youtube.com/embed/${id}?autoplay=1`} allow="autoplay"/>:null;})()}
          {soundQueue.some(i=>i.kind==="spotify"&&slPlaying===i.id)&&(()=>{const it=soundQueue.find(i=>i.id===slPlaying);const m=it&&it.url.match(/spotify\.com\/(track|album|playlist)\/([\w]+)/);return m?<iframe title="soundlab-sp" style={{width:"100%",height:80,border:0,borderRadius:12,marginTop:8}} src={`https://open.spotify.com/embed/${m[1]}/${m[2]}`} allow="autoplay; encrypted-media"/>:null;})()}
        </div>)}
        <div className="p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          {devMode&&<div className="p-3 rounded-2xl mb-2" style={{border:`2px dashed ${T.shadow}`,background:T.paper,opacity:0.85}}>
          <div className="font-bold text-sm">🫧 BadBleep Box</div>
          <div className="text-[10px] opacity-50 mt-0.5">tap a code below or type to search</div>
          <div className="mt-2 flex gap-1.5 mb-2">
            <input value={bleepCode} onChange={e=>setBleepCode(e.target.value)} placeholder="type or tap…" aria-label="BadBleep code" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2px solid ${T.shadow}`,background:T.card,color:T.ink}} onKeyDown={e=>{if(e.key==="Enter"){onCheat&&onCheat(bleepCode);setBleepCode("");}}}/>
            <button onClick={()=>{onCheat&&onCheat(bleepCode);setBleepCode("");}} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm shrink-0" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>bleep</button>
          </div>
          <div className="max-h-32 overflow-y-auto text-xs font-bold" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            {[["gratitude","+1000 Loks"],["dev mode","unlock all"],["comeback","activate"],["mercs","+200 Loks"],["overflow","max ink"],["revive","from stasis"],["new flip","fresh day"],["pin code","random"],["whisper","all voices"],["nightmode","dark mode"],["doubledown","2x Loks"],["resolve","finish quests"],["vibemode","celebration"],["debug","dev options"],["tokens","10k Loks"]].map(([name,desc])=>{const query=bleepCode.toLowerCase().replace(/[^a-z0-9]/g,"");const matches=query===""||name.includes(query)||desc.includes(query);return matches?<button key={name} onClick={()=>{const codes={"gratitude":"merci","dev mode":"supableep","comeback":"cincoorso","mercs":"mercmerc","overflow":"inkoverflow","revive":"phoenix","new flip":"fodskip","pin code":"pinball","whisper":"whisper","nightmode":"nightmode","doubledown":"doubledown","resolve":"resolve","vibemode":"vibemode","debug":"devmode","tokens":"tokens10k"};onCheat&&onCheat(codes[name]||name);setBleepCode("");}} className="lok-btn px-2 py-1.5 rounded-lg text-left" style={{border:`1.5px solid ${T.ink}`,background:T.card,color:T.ink,opacity:0.8}}>
              <div>{name}</div>
              <div className="text-[8px] opacity-60">{desc}</div>
            </button>:null;})}
          </div>
        </div>}
          <div className="font-bold text-sm">About</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={e=>{versionTap();devTap.current++;clearTimeout(devTimer.current);devTimer.current=setTimeout(()=>devTap.current=0,1200);if(devTap.current>=7){devTap.current=0;setDevMode(d=>!d);say(devMode?"Dev mode off":"Dev mode on");}}} style={{cursor:"default"}}>LokBook + Lok N Slide · <span style={{fontWeight:700}}>alpha v1.2</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
        </div>
        {devMode&&(<div className="p-3 rounded-2xl mb-2" style={{border:`3px dashed ${T.accent}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm" style={{color:T.accent}}>🔩 Dev Flags</div>
          <div className="mt-2 p-2 rounded-xl" style={{border:`2px solid ${debugUnlimitedLoks?T.accent:T.shadow}`,background:T.card}}>
            <div className="flex items-center justify-between">
              <div className="min-w-0"><div className="font-bold text-xs">💰 Unlimited Loks</div><div className="text-[10px] opacity-60 leading-snug">QA only — your real balance is stashed and restored exactly when you turn this off. Never affects totals or quest counters.</div></div>
              <button onClick={toggleDebugUnlimitedLoks} aria-pressed={debugUnlimitedLoks} className="lok-btn shrink-0 ml-2 px-3 py-1.5 rounded-full text-xs font-extrabold" style={{background:debugUnlimitedLoks?T.accent:T.card,color:debugUnlimitedLoks?T.onAccent:T.ink,border:`2px solid ${T.ink}`}}>{debugUnlimitedLoks?"On":"Off"}</button>
            </div>
          </div>
          <div className="mt-2 font-bold text-xs" style={{color:T.ink}}>App Icon</div>
          <div className="text-[10px] opacity-60 mt-0.5 mb-1.5 leading-snug">Changes the tab icon instantly. Home screen shortcuts may need removing &amp; re-adding to pick up a new icon (iOS/Android limitation).</div>
          <div className="grid grid-cols-2 gap-2">{LOGOS.map(l=>{
            const active=appLogo===l.id;
            return(<button key={l.id} onClick={()=>{setAppLogo(l.id);say(`${l.name} applied`,"success");}} className="lok-btn p-2 rounded-xl text-center" style={{border:`2.5px solid ${active?T.accent:T.ink}`,background:active?T.ink:T.card}}>
              <img src={l.file} alt={l.name} className="mx-auto rounded-lg" style={{width:60,aspectRatio:1,border:`1.5px solid ${active?T.accent:T.shadow}`}}/>
              <div className="text-[10px] font-bold mt-1" style={{color:active?T.paper:T.ink}}>{l.name}</div>
            </button>);
          })}</div>
        </div>)}
        <div className="mt-2 p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
          <div className="flex items-center gap-2 mb-1"><span className="lok-display font-extrabold text-sm">📊 Activity</span><span className="text-[10px] opacity-50">past 2 weeks</span></div>
          <div className="flex gap-0.5">{Array.from({length:14}).map((_,i)=>{const v=heatmapData[i]||0;const h=i===13?3:Math.floor(Math.sin(i*1.2)*3+4);const bh=Math.min(8,v||Math.max(0,h));return(<div key={i} className="flex-1 rounded-sm" style={{height:12,border:`1px solid ${T.shadow}`,background:v>0?T.accent:"transparent",transition:"all .3s"}}/>);})}</div>
          <div className="flex items-center justify-between mt-1"><span className="text-[9px] opacity-30">{new Date(Date.now()-13*864e5).toLocaleDateString()}</span><span className="text-[9px] opacity-30">today</span></div>
          <div className="flex items-center gap-2 mt-1.5"><span className="text-xs font-bold">🔗 Collab Room</span><code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{background:T.paper,border:`1.5px solid ${T.ink}`}}>{Math.random().toString(36).slice(2,8).toUpperCase()}</code><button onClick={()=>{navigator.clipboard?.writeText("lokbook-room-"+Math.random().toString(36).slice(2,8));say("Room code copied");}} className="lok-btn text-[10px] font-bold px-2 py-0.5 rounded" style={{border:`1.5px solid ${T.ink}`}}>copy</button></div>
          <div className="text-[9px] opacity-40 mt-0.5">Share this code with friends to collab in real time!</div>
        </div>
      </div>
      </ErrorBoundary>
    </div>)}
    {editing&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setEditing(false)}>
      <div className="w-full rounded-t-3xl p-5 overflow-y-auto overscroll-contain" style={{maxWidth:560,maxHeight:"min(85vh, 85dvh)",background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between mb-3 pb-1 -mt-5 -mx-5 px-5 pt-5" style={{background:T.card,zIndex:1}}><div className="lok-display text-lg font-extrabold">Edit profile</div><button onClick={()=>setEditing(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close">✕</button></div>
        <div className="flex items-center gap-3 mb-3"><img src={renderAvatar(draft.avatarSeed)} alt="" className="w-16 h-16 rounded-full" style={{border:`3px solid ${T.ink}`}}/><button onClick={()=>setDraft(d=>({...d,avatarSeed:Math.floor(Math.random()*9999)}))} className="lok-btn px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`}} aria-label="Re-roll avatar">Re-roll avatar</button></div>
        <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Handle" aria-label="Display name" className="w-full px-3 py-2.5 rounded-xl font-bold mb-2" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
        <textarea value={draft.bio} onChange={e=>setDraft(d=>({...d,bio:e.target.value}))} placeholder="What's your gallery about?" rows={3} aria-label="Bio" className="w-full px-3 py-2.5 rounded-xl text-sm mb-3" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
        <button onClick={()=>{if(isReservedName(draft.name)){say(`"${draft.name.trim()}" is a resident Lok artist — pick another name`,"error");return;}setProfile({...draft,name:draft.name.trim()||profile.name});setEditing(false);say("Profile saved");}} className="lok-btn lok-display w-full py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}} aria-label="Save profile">Save</button>
      </div>
    </div>)}
    {view!=="gallery"?(<div className="mt-5">
      <h2 className="lok-display text-lg font-extrabold mb-2 capitalize">{view==="lokdin"?"Lok'd in with you":view==="lokd"?"You Lok'd":"Your bookmarks"}</h2>
      {view==="bookmarks"?(bookmarked.length?<div className="grid grid-cols-2 gap-3">{bookmarked.map(p=><PostCard key={p.id} p={p} onOpen={onOpen}/>)}</div>:<EmptyState icon="bookmarks" title="No bookmarks yet" subtitle="Lok in to pieces from the viewer to save them here."/>):view==="lokd"?(following.length?following.map(n=><PersonRow key={n} name={n}/>):<EmptyState icon="follow" title="No one Lok'd yet" subtitle="Lok artists you love and they'll show here."/>):["pixel.pluto","inkwell_iz","doodlebug"].map(n=><PersonRow key={n} name={n} note="Lok'd in"/>)}
    </div>):(<>
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        <h2 className="lok-display text-lg font-extrabold mr-1">Gallery</h2>
        {[["newest","Newest"],["loks","Most Lok'd"],["views","Most viewed"],["battle","Battles"],["series","Series"],["weekly","This week"]].map(([id,label])=>(<button key={id} onClick={()=>setFilter(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`,background:filter===id?T.ink:T.card,color:filter===id?T.paper:T.ink}}>{label}</button>))}
        <button onClick={()=>setTimeMachineIdx(t=>t<0?posts.length-1:-1)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${timeMachineIdx>=0?T.accent:T.ink}`,background:timeMachineIdx>=0?T.ink:T.card,color:timeMachineIdx>=0?T.paper:T.ink}}>🕐 Time Machine</button>
      </div>
      <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search your flips…" aria-label="Search gallery" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      {filtered.length?<div className="mt-2 grid grid-cols-2 gap-3">{filtered.map((p,i)=><PostCard key={p.id} p={p} onOpen={()=>viewingArtist?setPreviewIdx(i):onOpen(p.id)}/>)}</div>:myPosts.length===0&&!searchQ&&filter==="newest"?(<div className="mt-3">
        <EmptyState icon="search" title="Nothing here yet" subtitle="Trace a tutorial to get moving, or jump straight into Studio."/>
        <div className="mt-3 grid grid-cols-2 gap-2.5">{TUTORIAL_PROJECTS.map(t=>{const prog=tutorialProgress[t.id];const started=prog&&prog.frames?.length>0;return(<button key={t.id} onClick={()=>onStartTutorial?.(t.id)} className="lok-btn p-3 rounded-2xl text-left" style={{border:`2.5px solid ${started?T.accent:T.ink}`,background:T.card}}><div style={{fontSize:22,lineHeight:1,marginBottom:4}}>{t.icon}</div><div className="lok-display font-extrabold text-sm">{t.title}</div><div className="text-[10px] opacity-60 mt-0.5">{t.difficulty} · {t.frameCount} pages</div><div className="text-[10px] font-bold mt-1.5" style={{color:started?T.accent:T.ink,opacity:started?1:0.6}}>{started?`Continue · ${prog.frames.length}/${t.frameCount}`:"Start tutorial →"}</div></button>);})}</div>
      </div>):<EmptyState icon="search" title={searchQ?"No flips match":"No pieces match"} subtitle={searchQ?"Try different words":"Try a different filter or publish your first flip!"}/>}
      {timeMachineIdx>=0&&posts[timeMachineIdx]&&(<div className="mt-3 rounded-2xl p-3" style={{border:`3px solid ${T.alt}`,background:T.card}}>
        <div className="flex items-center justify-between mb-1"><div className="lok-display font-extrabold text-sm">🕐 Time Machine</div><button onClick={()=>setTimeMachineIdx(-1)} className="lok-btn text-xs font-bold px-2 py-0.5 rounded" style={{border:`1.5px solid ${T.ink}`}}>✕</button></div>
        <input type="range" min="0" max={posts.length-1} value={timeMachineIdx} onChange={e=>setTimeMachineIdx(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Scroll through your flips timeline"/>
        <div className="flex items-center gap-2 mt-1"><img src={posts[timeMachineIdx]?.frames?.[0]} alt="" className="w-12 rounded-lg shrink-0" style={{aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/><div className="min-w-0"><div className="font-bold text-sm truncate">{posts[timeMachineIdx]?.title}</div><div className="text-xs opacity-60">{timeMachineIdx+1} of {posts.length} · {posts[timeMachineIdx]?.votes} votes</div></div></div>
      </div>)}
    </>)}
    {previewIdx!==null&&filtered[previewIdx]&&<GalleryPreview posts={filtered} index={previewIdx} onClose={()=>setPreviewIdx(null)} onNav={d=>setPreviewIdx(i=>Math.min(filtered.length-1,Math.max(0,i+d)))}/>}
  </div>);
}

export default function LokApp(){
  const lilLokPhase = (s) => { if (s.stasis) return "stasis"; if (s.ink < 15) return "critical"; if (s.ink < 35) return "decaying"; return "thriving"; };
  const getLilLokLine = (phase = "thriving", ctx = "") => { if (!ctx) { const h = new Date().getHours(); if (phase === "thriving" && h >= 5 && h < 10) return "Good morning. First lines of the day."; if (phase === "thriving" && h >= 21) return "Late-night drawing session?"; } const pool = (ctx && LILLOK_SPEECH[ctx]) ? LILLOK_SPEECH[ctx] : (LILLOK_SPEECH[phase] || LILLOK_SPEECH.thriving); return pool[Math.floor(Math.random() * pool.length)]; };
  const[ready,setReady]=useState(false);const[tab,setTab]=useState("feed");const[openIdx,setOpenIdx]=useState(null);const[posts,setPosts]=useState([]);const[toasts,setToasts]=useState([]);const[botPosted,setBotPosted]=useState([]);
  const[questsCompleted,setQuestsCompleted]=useState(0);const[totalEarned,setTotalEarned]=useState(0);const[traceHinted,setTraceHinted]=useState(false);const[fabBubble,setFabBubble]=useState("");const[adIdx,setAdIdx]=useState(0);const[installEvt,setInstallEvt]=useState(null);const[showSettings,setShowSettings]=useState(false);const auth=useAuth();const music=useMusic({userId:auth.getUserId()});const[showMusic,setShowMusic]=useState(false);const[showRoadmap,setShowRoadmap]=useState(false);const[showChestViewer,setShowChestViewer]=useState(false);const[showWorldMap,setShowWorldMap]=useState(false);const[showMail,setShowMail]=useState(false);const geoData=useGeolocation(true);const userLocation=geoData.location;
  const[loks,setLoks]=useState(260);const[myRooms,setMyRooms]=useState([]);const[pendingRoomCode,setPendingRoomCode]=useState(()=>{try{return new URLSearchParams(location.search).get("room")||null;}catch{return null;}});const[pace,setPace]=useState("sweep");const[speed,setSpeed]=useState(1);const[soundLab,setSoundLab]=useState(false);const[soundQueue,setSoundQueue]=useState([]);const[founder,setFounder]=useState(false);const[totalSpent,setTotalSpent]=useState(0);const[fodHistory,setFodHistory]=useState([]);const[lokPass,setLokPass]=useState(false);const[uiTheme,setUiTheme]=useState("riso");const[ownedThemes,setOwnedThemes]=useState(["riso"]);const[effect,setEffect]=useState("none");const[ownedEffects,setOwnedEffects]=useState(["none"]);const[ownedTiers,setOwnedTiers]=useState([10]);const[ccTier,setCcTier]=useState(false);const[bigBattleOwned,setBigBattleOwned]=useState(false);const[wins,setWins]=useState(0);
  const[profile,setProfile]=useState(()=>{const seed=Math.floor(Math.random()*9999);return{name:starterHandle(seed),bio:"",avatarSeed:seed,links:[{label:"Lok page",url:"coming soon"}]};});
  const[focusMode,setFocusMode]=useState(false);  const[featureFlags,setFeatureFlags]=useState({compactUi:false,vibe:"default",uiScale:"normal",lokMotion:"subtle",combatUIMode:"unified",enableGyroscope:true,showLokinButton:true,gyroLoadScreen:true,gyroFab:true,gyroLilLokPanel:true,gyroWorldMap:true,gyroChestOpen:true,gyroGalleryCards:true,bloomEnabled:true,bloomIntroSeen:false,grainIntroSeen:false});const[weatherOverride,setWeatherOverrideLocal]=useState(getWeatherOverride());
  const[comebackActive,setComebackActive]=useState(false);const[legacyStudio,setLegacyStudio]=useState(false);const[legacyBrushes,setLegacyBrushes]=useState(false);
  const[studioFrames,setStudioFrames]=useState([]);const[studioFrameDurations,setStudioFrameDurations]=useState([]);const[studioTitle,setStudioTitle]=useState("");const[studioDraftImg,setStudioDraftImg]=useState(null);
  const[lastComebackAward,setLastComebackAward]=useState(0);
  const[lastOfflineBonus,setLastOfflineBonus]=useState(0);
  const[celebrationStyle,setCelebrationStyle]=useState("confetti");
  const[comebackCelebration,setComebackCelebration]=useState(null);
  const[bookmarks,setBookmarks]=useState([]);const[following,setFollowing]=useState([]);const[lillok,setLillok]=useState({ink:80,bond:30,stasis:false,name:"Blot",lastSeen:Date.now()});const[customLilLok,setCustomLilLok]=useState(null);const[cosmetics,setCosmetics]=useState({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",blotPersonality:"vibes",blotIdleAnimation:"float",blotExpression:"neutral",blotBounce:"gentle",xrayVisionCommon:false,xrayVisionUncommon:false,xrayVisionRare:false,xrayVisionEpic:false,xrayVisionLegendary:false,xrayVisionMythic:false,globeSkin:"none"});const[owned,setOwned]=useState({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],blotPersonality:["vibes"],blotIdleAnimation:["float"],blotExpression:["neutral"],blotBounce:["gentle"],globeSkin:["none"]});
  const[goggles,setGoggles]=useState({uncommon:0,rare:0,epic:0,legendary:0,mythic:0});
  const[mail,setMail]=useState([]);const[lastMailCheck,setLastMailCheck]=useState(Date.now());const[lokpalIrritation,setLokpalIrritation]=useState({});const[kids,setKids]=useState(false);const[showLilLok,setShowLilLok]=useState(false);const fabBounceRef=useRef(null);const[blotSpeech,setBlotSpeech]=useState("");const[blotTapStreak,setBlotTapStreak]=useState(0);const blotTapTimerRef=useRef(null);const[floatingTokens,setFloatingTokens]=useState([]);const[giftPop,setGiftPop]=useState(null);const[onboarded,setOnboarded]=useState(false);const[showOnboard,setShowOnboard]=useState(false);const[showHint,setShowHint]=useState(false);const[sound,setSound]=useState(false);const[feedMode,setFeedMode]=useState("discover");const[daily,setDaily]=useState({day:null,streak:0,claimed:false,prompt:""});const[xp,setXp]=useState(0);const[quests,setQuests]=useState(null);const[flair,setFlair]=useState("");const[adVisible,setAdVisible]=useState(true);const[notifications,setNotifications]=useState([]);const[notifUnread,setNotifUnread]=useState(0);
  const[sessionPin,setSessionPin]=useState(null);const[pinInput,setPinInput]=useState("");const[pinError,setPinError]=useState("");const[pinUnlocked,setPinUnlocked]=useState(true);
  const vp=useViewport();
  const gyro=useGyroscope(featureFlags.enableGyroscope);
  // Read the hook's value directly. Mirroring it into separate state doubled
  // every gyro-driven re-render of this whole tree for no benefit.
  const gyroMotion=gyro.motion;
  // The frame-pacing module is plain state, not React state, because the rAF
  // loops that read it live outside the component tree. Push the flag to it
  // whenever the setting changes.
  useEffect(()=>{setHighRefresh(!!featureFlags.highRefresh);},[featureFlags.highRefresh]);
  // Cross-device restore. On sign-in, compare the cloud save against this
  // device's. Restoring writes the remote blob into the local store and reloads
  // rather than re-applying field by field — the load path in this file is one
  // large inline block, and duplicating it is exactly how the two copies drift.
  const[syncPrompt,setSyncPrompt]=useState(null);
  const restoreSave=useCallback((blob,gallery)=>{store.set(SAVE_KEY,blob);store.set(SAVE_KEY+":at",Date.now());if(gallery)store.set(GALLERY_KEY,gallery);location.reload();},[]);
  useEffect(()=>{
    if(!ready)return;const uid=auth.getUserId();if(!uid)return;
    let live=true;
    (async()=>{
      const remote=await pullSave(uid);if(!live)return;
      const local=getSaveBlob();
      const localSavedAt=Number(await store.get(SAVE_KEY+":at"))||0;if(!live)return;
      const intent=syncIntent({localSavedAt,localProgress:progressOf(local),remote});
      if(intent==="push")pushSave(uid,local,galleryRef.current).catch(()=>{});
      else if(intent==="pull")restoreSave(remote.blob,remote.gallery);
      else if(intent==="ask")setSyncPrompt(remote);
    })();
    return()=>{live=false;};
  },[ready,auth.getUserId()]);
  // One gating decision for every involuntary ad surface. Rewarded video is not
  // routed here — it is opt-in and stays available to LokPass holders.
  const ads=adPlan({tier:vp.tier,orientation:vp.orientation,lokPass,kids});
  const[interstitial,setInterstitial]=useState(null);const lastInterstitialRef=useRef(0);
  const galleryRef=useRef([]); // kept current by the gallery-persist effect; read by cloud push so pushes need not depend on `posts`
  // Rewarded video is opt-in and survives LokPass, so it is not part of `ads`.
  const[showRewards,setShowRewards]=useState(false);const[rewardClaims,setRewardClaims]=useState({});const[doubleLoksUntil,setDoubleLoksUntil]=useState(0);
  const[moodTags,setMoodTags]=useState({});const[moodFilter,setMoodFilter]=useState("all");const[viewingArtist,setViewingArtist]=useState(null);
  const[garden,setGarden]=useState([]);const[gardenTimer,setGardenTimer]=useState(0);
  const[reportedPosts,setReportedPosts]=useState([]);
  const[verified,setVerified]=useState(false);
  const[modules,setModules]=useState(["layers_10","brush_ink"]);const[sky,setSky]=useState(null);const[ownedSkies,setOwnedSkies]=useState(["clear"]);const[animFx,setAnimFx]=useState("none");const[ownedAnimFx,setOwnedAnimFx]=useState(["none"]);const[fontPack,setFontPack]=useState("default");const[cursorPack,setCursorPack]=useState("default");const[musicPack,setMusicPack]=useState("none");const[stickerPack,setStickerPack]=useState("emoji");const[postExport,setPostExport]=useState("png");
  const[mythicOwned,setMythicOwned]=useState([]);const[mythicEquipped,setMythicEquipped]=useState(null);const[dailyOwned,setDailyOwned]=useState([]);const[weeklyOwned,setWeeklyOwned]=useState([]);const[celebration,setCelebration]=useState(null);
  const[appLogo,setAppLogo]=useState("default");const[devMode,setDevMode]=useState(false);const devTap=useRef(0);const devTimer=useRef(null);
  const[chests,setChests]=useState(()=>[{id:`c${Date.now()}0`,type:getRandomChestType()},{id:`c${Date.now()}1`,type:getRandomChestType()},{id:`c${Date.now()}2`,type:getRandomChestType()},{id:`c${Date.now()}3`,type:getRandomChestType()}]);
  const[openingChest,setOpeningChest]=useState(null);const[chestReward,setChestReward]=useState(null);
  const[timeMachineIdx,setTimeMachineIdx]=useState(-1);
  const[wordTwister,setWordTwister]=useState({word:"",shuffled:"",found:false,revealed:false});
  // Real stickers: placed at a point, baked into the frame they're captured
  // with (see engine/stickers.js). Not persisted across reloads — like the
  // Easel's own undo stack, they only matter while the current page is being
  // edited, and are cleared the moment that page is captured.
  const[placedStickers,setPlacedStickers]=useState([]);const[pendingSticker,setPendingSticker]=useState(null);
  const[stickerSheetOpen,setStickerSheetOpen]=useState(false);const[myStickers,setMyStickers]=useState([]);
  useEffect(()=>{listStickerIds().then(setMyStickers).catch(()=>{});},[]);
  const refreshMyStickers=useCallback(()=>{listStickerIds().then(setMyStickers).catch(()=>{});},[]);
  const[heatmapData,setHeatmapData]=useState([]);
  const[tutorialProgress,setTutorialProgress]=useState({});
  const[activeTutorialId,setActiveTutorialId]=useState(null);const[editingPostId,setEditingPostId]=useState(null);
  const[battleRoyaleCount,setBattleRoyaleCount]=useState(0);
  const[fourthWall,setFourthWall]=useState(100);const[hapticGrammar,setHapticGrammar]=useState("default");
  const adScrollTimer=useRef(null);const earnLog=useRef({ts:Date.now(),total:0});const audioCtx=useRef(null);const loadStart=useRef(Date.now());
  const{blip,hap,setGrammar}=useFeedback(sound);
  useEffect(()=>{setGrammar(hapticGrammar);},[hapticGrammar,setGrammar]);
  const T=THEMES[uiTheme];const phase=lilLokPhase(lillok);const level=Math.floor(xp/100)+1;
  const evoStage=lillok.bond>=75?3:lillok.bond>=50?2:lillok.bond>=25?1:0;
  const evoEmojis=["🌱","🌿","🌳","👑"];
  const flipOfDay=useMemo(()=>{const c=posts.filter(p=>p.frames?.length>=2);if(!c.length)return null;
    const today=new Date().toDateString();const cutoff=Date.now()-FOD_WINDOW_DAYS*86400000;
    const recent=new Set(fodHistory.filter(h=>h.ts>cutoff&&h.day!==today).map(h=>h.id));
    const sorted=[...c].sort((a,b)=>b.votes-a.votes);
    return sorted.find(p=>!recent.has(p.id))||sorted[0];},[posts,fodHistory]);
  useEffect(()=>{if(!ready||!flipOfDay)return;const today=new Date().toDateString();
    setFodHistory(h=>{if(h.some(x=>x.day===today))return h;return[...h.filter(x=>x.ts>Date.now()-FOD_WINDOW_DAYS*86400000),{id:flipOfDay.id,day:today,ts:Date.now()}];});},[ready,flipOfDay]);
  // A signed-in account only becomes findable once it has a public row.
  useEffect(()=>{
    if(!ready||!auth.isAuthenticated()||!auth.getUserId())return;
    upsertMyProfile({userId:auth.getUserId(),handle:profile.name,displayName:profile.name,avatarSeed:profile.avatarSeed,bio:profile.bio,flips:posts.filter(p=>p.author===profile.name).length,level});
  },[ready,auth.isAuthenticated(),profile.name,profile.bio,profile.avatarSeed,level]);
  // Resident artists keep working while you're in the app: a burst on open,
  // then a fresh piece every couple of minutes so the feed stays alive.
  const lastPullRef=useRef(0);
  const dropBotPosts=useCallback((count,immediate=false)=>{
    const picks=pickAmbientPosts(botPosted,count);
    if(!picks.length)return;
    setBotPosted(b=>[...b,...picks.map(p=>p.key)].slice(-400));
    picks.forEach((pk,i)=>{setTimeout(()=>{try{const post=generateBotPost(pk.bot,pk.seed);if(post)setPosts(ps=>ps.some(x=>x.id===post.id)?ps:[post,...ps]);}catch(e){console.warn("botArt",e);}},immediate?i*250:1600+i*900);});
  },[botPosted]);
  useEffect(()=>{if(!ready)return;dropBotPosts(3);},[ready]);
  useEffect(()=>{
    if(!ready)return;
    const iv=setInterval(()=>{if(!document.hidden)dropBotPosts(2);},135000);
    return()=>clearInterval(iv);
  },[ready,dropBotPosts]);
  useEffect(()=>{const onScroll=()=>{setAdVisible(false);clearTimeout(adScrollTimer.current);adScrollTimer.current=setTimeout(()=>setAdVisible(true),1200);};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);
  // The 2x rewarded window doubles the hourly cap alongside the payout —
  // otherwise the cap would swallow the multiplier and the reward would be
  // worthless to exactly the players active enough to earn it.
  const guardedAddLoks=useCallback(n=>{const now=Date.now();const x2=isActive(doubleLoksUntil,now);const amt=x2?n*2:n;const cap=x2?240:120;if(now-earnLog.current.ts>3600000){earnLog.current={ts:now,total:0};}if(earnLog.current.total+amt>cap){return;}earnLog.current.total+=amt;setLoks(l=>l+amt);setTotalEarned(t=>t+amt);},[doubleLoksUntil]);
  const addLoks=guardedAddLoks;
  const pushNotif=useCallback((msg,type="info")=>{setNotifications(ns=>[...ns.slice(-49),{id:Date.now(),msg,type,ts:Date.now()}]);setNotifUnread(n=>n+1);},[]);
  const say=useCallback((m,type="default")=>{const id=Date.now()+Math.random();setToasts(t=>[...t.slice(-4),{id,msg:m,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);},[]);
  // Applies a completed rewarded-ad view. Rewards flagged `server:true` touch
  // durable economy state and go through the claim_reward RPC, which enforces
  // the cooldown itself — the client cooldown below is only UI courtesy.
  const grantReward=useCallback(async r=>{
    setRewardClaims(c=>({...c,[r.id]:Date.now()}));
    if(r.server){
      try{
        const{data,error}=await supabase.rpc("claim_reward",{reward_id:r.id});
        if(error||!data?.success){say(data?.message||"Reward unavailable right now","error");return;}
        if(data.loks_granted>0){setLoks(l=>l+data.loks_granted);setTotalEarned(t=>t+data.loks_granted);}
      }catch{say("Couldn't reach the server — reward not granted","error");return;}
    }
    if(r.id==="ink_refill")setLillok(l=>({...l,ink:100,stasis:false}));
    if(r.id==="double_loks")setDoubleLoksUntil(Date.now()+DOUBLE_LOKS_MS);
    blip("C6");hap([30,20,60]);
    say(`${r.icon} ${r.name} claimed`,"success");
    pushNotif(`${r.name} — ${r.desc}`,"success");
  },[say,pushNotif]);
  const showLine=useCallback((ctx="")=>{const s={name:lillok.name,wins,loks,ink:lillok.ink,bond:lillok.bond};setFabBubble(getLilLokLine(lilLokPhase(lillok),ctx,s,fourthWall));setTimeout(()=>setFabBubble(""),3500);},[lillok,wins,loks,fourthWall]);
  const gainXp=useCallback(n=>setXp(x=>{const before=Math.floor(x/100);const nx=x+n;if(Math.floor(nx/100)>before){setTimeout(()=>{say(`Level ${Math.floor(nx/100)+1}! New flair unlocked`);setShowRoadmap(true);setBlotSpeech(getBlotResponse(cosmetics.blotPersonality,"level_up",lillok.name));},300);setTimeout(()=>{say("Click your level button to see what's unlocked!","info");},3000);}return nx;}),[say,cosmetics.blotPersonality,lillok.name]);
  const getPackGiftReward=useCallback(()=>{const allPacks=[
    ...STICKER_PACKS.filter(p=>p.id===stickerPack),
    ...LILLOK_SKINS.filter(p=>p.id===cosmetics.lillokSkin),
    ...LILLOK_AURAS.filter(p=>p.id===cosmetics.lillokAura),
    ...LILLOK_PETS.filter(p=>p.id===cosmetics.lillokPet),
    ...REACTION_PACKS.filter(p=>p.id===cosmetics.reactionPack),
    ...VOICE_PACKS.filter(p=>p.id===cosmetics.voicePack),
    ...MUSIC_PACKS.filter(p=>p.id===musicPack),
    ...BLOT_IDLE_ANIMATIONS.filter(p=>p.id===cosmetics.blotIdleAnimation),
    ...BLOT_EXPRESSIONS.filter(p=>p.id===cosmetics.blotExpression),
    ...BLOT_BOUNCES.filter(p=>p.id===cosmetics.blotBounce),
  ];return allPacks.length>0?allPacks[Math.floor(Math.random()*allPacks.length)].giftReward:null;},[stickerPack,cosmetics.lillokSkin,cosmetics.lillokAura,cosmetics.lillokPet,cosmetics.reactionPack,cosmetics.voicePack,musicPack,cosmetics.blotIdleAnimation,cosmetics.blotExpression,cosmetics.blotBounce]);
  const tapBlot=useCallback(()=>{if(!isUnlocked("tap_to_earn",levelFor(xp)))return;if(lillok.stasis||lillok.ink<=0){say("Your blot needs rest or ink to continue","error");return;}const currentLevel=levelFor(xp);const newStreak=blotTapStreak+1;setBlotTapStreak(newStreak);clearTimeout(blotTapTimerRef.current);blotTapTimerRef.current=setTimeout(()=>setBlotTapStreak(0),3000);const rewards=[0.5,1,1.5,2,2.5,3];const rewardIdx=Math.min(newStreak-1,rewards.length-1);const reward=rewards[rewardIdx];const finalReward=Math.floor(reward*10)/10;setLoks(l=>l+finalReward);setTotalEarned(t=>t+finalReward);const tokenId=Date.now()+Math.random();setFloatingTokens(t=>[...t,{id:tokenId,text:`+${finalReward} Loks`,x:0,y:0}]);say(`Streak ${newStreak} · +${finalReward} Loks`,"success");setTimeout(()=>setFloatingTokens(t=>t.filter(tk=>tk.id!==tokenId)),1000);if(isUnlocked("gift_drops",currentLevel)){const chestType=getRandomChestType();const newChest={id:`c${Date.now()}`,type:chestType};setOpeningChest(newChest);const chestRewardData=generateChestReward(chestType,modules,cosmetics,goggles);setChestReward(chestRewardData);setTimeout(()=>{if(chestRewardData.type==="loks"){setLoks(l=>l+chestRewardData.amount);setTotalEarned(t=>t+chestRewardData.amount);}else if(chestRewardData.type==="item"){setModules(m=>[...m,chestRewardData.itemId]);}else if(chestRewardData.type==="xrayVision"){const xrayKey=`xrayVision${chestRewardData.rarity.charAt(0).toUpperCase()}${chestRewardData.rarity.slice(1)}`;setCosmetics(c=>({...c,[xrayKey]:true}));}else if(chestRewardData.type==="goggles"){setGoggles(g=>({...g,[chestRewardData.rarity]:g[chestRewardData.rarity]+1}));}setChests(c=>[...c,newChest]);setTimeout(()=>setOpeningChest(null),1500);},600);}hap([30]);blip("A4");},[blotTapStreak,xp,modules,cosmetics,goggles,lillok.stasis,lillok.ink,say]);
  const questTick=useCallback((track,amt=1)=>{setQuests(q=>{if(!q)return q;let paid=0,msg=null,doneCount=0;const items=q.items.map(it=>{if(it.track!==track||it.done)return it;const progress=Math.min(it.goal,it.progress+amt);const done=progress>=it.goal;if(done){paid+=it.reward;doneCount++;msg=`Quest done: ${it.label} · +${it.reward}`;}return{...it,progress,done};});if(paid){setLoks(l=>l+paid);setTotalEarned(t=>t+paid);gainXp(paid);setTimeout(()=>say(msg,"success"),250);setQuestsCompleted(c=>{const nc=c+doneCount;const m=[10,25,50,100].find(x=>c<x&&nc>=x);if(m){const bonus=m*2;setLoks(l=>l+bonus);setTotalEarned(t=>t+bonus);setTimeout(()=>{say(`🎖 ${m} quests done · +${bonus} bonus Loks`,"success");hap([200,100,200,100,200]);},700);}return nc;});}return{...q,items};});},[gainXp,say,hap]);
  useEffect(()=>{(async()=>{
    const dayOfYear=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const todayPromptIdx=(new Date().getFullYear()*366+dayOfYear(new Date()))%PROMPTS.length;
    const makeSeedLazy=(drawFn,n,id,meta)=>({...meta,id,frames:[],_pendingDraw:drawFn,_pendingN:n,paceMs:meta.paceMs});
    const seed=[makeSeedLazy(drawBounce,14,"seed1",{title:"Bounce study",votes:41,voted:false,viewed:false,reactions:{splat:12,heart:30,drip:5},from:"studio",mode:"A",style:"bold",views:312}),makeSeedLazy(drawBloom,12,"seed2",{title:"Bloom",votes:67,voted:false,viewed:false,reactions:{splat:8,heart:52,drip:9},from:"studio",mode:"B",style:"series",views:540}),makeSeedLazy(drawNight,13,"seed3",{title:"Night flight",votes:29,voted:false,viewed:false,reactions:{splat:21,heart:14,drip:11},from:"studio",mode:"A",style:"bold",views:188})];
    const save=await store.get(SAVE_KEY);const savedGallery=await store.get(GALLERY_KEY);const flags=await store.get("lok:flags");if(flags){setFeatureFlags(f=>({...f,...flags}));if(flags.defaultTab)setTab(flags.defaultTab);}if(save?.featureFlags){setFeatureFlags(f=>({...f,...save.featureFlags}));}const todayKey=new Date().toDateString();
    let loadedDaily={day:todayKey,streak:1,claimed:false,prompt:PROMPTS[todayPromptIdx]};
    let gap=0;
    if(save){setLoks(save.loks??60);setLokPass(!!save.lokPass);setUiTheme(save.uiTheme||"riso");setOwnedThemes(save.ownedThemes||["riso"]);setEffect(save.effect||"none");setOwnedEffects(save.ownedEffects||["none"]);setOwnedTiers(save.ownedTiers||[10]);setCcTier(!!save.ccTier);setBigBattleOwned(!!save.bigBattleOwned);setWins(save.wins??0);if(save.profile)setProfile(pr=>({...save.profile,name:save.profile.name||starterHandle(save.profile.avatarSeed??pr.avatarSeed)}));setBookmarks(save.bookmarks||[]);setFollowing(save.following||[]);setKids(!!save.kids);if(save.customLilLok)setCustomLilLok(save.customLilLok);if(save.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",gear:"none",globeSkin:"none",...save.cosmetics});if(save.owned){const migrated=Object.fromEntries(Object.entries(save.owned).map(([k,v])=>[k,v.map(i=>typeof i==="string"?{id:i,ts:0}:i)]));setOwned({nameColor:[{id:"default",ts:0}],frame:[{id:"none",ts:0}],reactionPack:[{id:"base",ts:0}],avatarAccent:[{id:"none",ts:0}],blotBorder:[{id:"none",ts:0}],paper:[{id:"plain",ts:0}],gear:[{id:"none",ts:0}],globeSkin:[{id:"none",ts:0}],...migrated});}setOnboarded(!!save.onboarded);setSound(!!save.sound);setXp(save.xp??0);setFlair(save.flair||"");setQuestsCompleted(save.questsCompleted??0);setTotalEarned(save.totalEarned??0);setTraceHinted(!!save.traceHinted);setRewardClaims(save.rewardClaims||{});setDoubleLoksUntil(save.doubleLoksUntil||0);setPace(save.pace||"sweep");setSpeed(save.speed??1);setSoundLab(!!save.soundLab);setSoundQueue(save.soundQueue||[]);setFounder(!!save.founder);setTotalSpent(save.totalSpent??0);setFodHistory(save.fodHistory||[]);setHapticGrammar(save.hapticGrammar||"default");setFourthWall(save.fourthWall??100);setBotPosted(save.botPosted||[]);if(!save.onboarded)setShowHint(false);else setShowHint(true);
    if(save.sessionPin)setSessionPin(save.sessionPin);if(save.sessionPin)setPinUnlocked(false);
    if(save.moodTags)setMoodTags(save.moodTags);if(save.garden)setGarden(save.garden);
    if(save.reportedPosts)setReportedPosts(save.reportedPosts);
    if(save.verified)setVerified(true);
    if(save.tutorialProgress)setTutorialProgress(save.tutorialProgress);
    if(save.modules)setModules(save.modules);if(save.sky)setSky(save.sky);if(save.ownedSkies)setOwnedSkies(save.ownedSkies);if(save.animFx)setAnimFx(save.animFx);if(save.ownedAnimFx)setOwnedAnimFx(save.ownedAnimFx);if(save.fontPack)setFontPack(save.fontPack);if(save.cursorPack)setCursorPack(save.cursorPack);if(save.musicPack)setMusicPack(save.musicPack);if(save.stickerPack)setStickerPack(save.stickerPack);if(save.postExport)setPostExport(save.postExport);    if(save.mythicOwned)setMythicOwned(save.mythicOwned);if(save.mythicEquipped)setMythicEquipped(save.mythicEquipped);if(save.dailyOwned)setDailyOwned(save.dailyOwned);if(save.weeklyOwned)setWeeklyOwned(save.weeklyOwned);
    if(save.appLogo)setAppLogo(save.appLogo);
    if(save.comebackActive!==undefined)setComebackActive(save.comebackActive);if(save.legacyStudio!==undefined)setLegacyStudio(save.legacyStudio);if(save.legacyBrushes!==undefined)setLegacyBrushes(save.legacyBrushes);
    if(save.comebackStyle)setCelebrationStyle(save.comebackStyle);
    if(save.lastComebackAward)setLastComebackAward(save.lastComebackAward);
    if(save.lastOfflineBonus)setLastOfflineBonus(save.lastOfflineBonus);
    if(save.goggles)setGoggles(save.goggles);
    if(save.mail)setMail(save.mail);
    if(save.lastMailCheck)setLastMailCheck(save.lastMailCheck);
    if(save.lokpalIrritation)setLokpalIrritation(save.lokpalIrritation);
    if(save.daily?.day){if(save.daily.day===todayKey)loadedDaily=save.daily;else{const diff=Math.round((new Date(todayKey)-new Date(new Date(save.daily.day).toDateString()))/86400000);loadedDaily={day:todayKey,streak:diff===1?(save.daily.streak||0)+1:1,claimed:false,prompt:PROMPTS[todayPromptIdx]};}}
    gap=Date.now()-(save.lillok?.lastSeen||Date.now());const ll=save.lillok||lillok;const buffer=1-((ll.bond||0)/100)*0.5;const inkDrain=Math.min(ll.ink,Math.floor(gap/60000)*1.2*buffer);const newInk=Math.max(0,ll.ink-inkDrain);setLillok({...ll,stasis:ll.stasis||(newInk===0&&gap>600000),ink:newInk,inkZeroAt:null,lastSeen:Date.now()});}
    if(gap>=OFFLINE_BONUS_HOURS*60*60*1000&&(Date.now()-(save.lastOfflineBonus||0))>OFFLINE_BONUS_HOURS*60*60*1000){setLoks(l=>l+OFFLINE_BONUS_LOKS);setTotalEarned(t=>t+OFFLINE_BONUS_LOKS);setLastOfflineBonus(Date.now());setTimeout(()=>say(`Welcome back! +${OFFLINE_BONUS_LOKS} Loks for taking a break`,"success"),500);}
    if(save?.comebackActive&&gap>=OFFLINE_BONUS_HOURS*60*60*1000){setLoks(l=>l+1000);setTotalEarned(t=>t+1000);setComebackActive(false);setLastComebackAward(Date.now());const style=save.comebackStyle||"confetti";setComebackCelebration(style);setTimeout(()=>{setComebackCelebration(null);say("Take a break! +25 Loks — click the bubble","success");},4500);}
    setDaily(loadedDaily);const savedQ=save?.quests&&save.quests.day===todayKey?save.quests:{day:todayKey,items:makeQuests()};setQuests(savedQ);
    const userPosts=(savedGallery||[]).map(p=>({...p,voted:false,viewed:false}));setPosts([...userPosts,...seed]);if(!save||!save.onboarded)setShowOnboard(true);
    (async()=>{try{const{data,error}=await supabase.from("lok_posts").select("id,title,frames,pace_ms,mode,style,author,votes,views").order("votes",{ascending:false}).limit(6);if(!error&&data){const dbPosts=data.map(fromDbPost).filter(Boolean).map(p=>({...p,voted:false,viewed:false}));setPosts(ps=>{const existing=new Set(ps.map(x=>x.id));return[...ps,...dbPosts.filter(dp=>!existing.has(dp.id))];});}}catch{}})();
    seed.forEach((s,i)=>{if(!s._pendingDraw)return;setTimeout(()=>{const frames=renderSequence(s._pendingDraw,s._pendingN);const paceMs=[110,150,130][i];setPosts(ps=>ps.map(p=>p.id===s.id?{...p,frames,paceMs}:p));},i*80+50);});
    if(window.steamworks?.isAvailable)checkAchievements({posts:userPosts.length,streak:daily.streak||0,founder,votes:questsCompleted,totalSpent,mythicOwned:mythicOwned.length});
    applyLogo(appLogo);
  })().finally(()=>{const elapsed=Date.now()-loadStart.current;if(!featureFlags.showLokinButton)setTimeout(()=>setReady(true),Math.max(0,3500-elapsed));});const fb=setTimeout(()=>setReady(true),10000);return()=>clearTimeout(fb);},[featureFlags.showLokinButton]);
  useEffect(()=>{applyLogo(appLogo);},[appLogo]);
  // LokPals mail generation with irritation system: generate random mail every 12-24 hours
  useEffect(()=>{
    if(!ready)return;
    const now=Date.now();
    const interval=12*60*60*1000+Math.random()*12*60*60*1000; // 12-24 hours
    if(now-lastMailCheck<interval)return;
    const unreadCount=mail.filter(m=>!m.opened).length;
    if(unreadCount>=5)return; // Max 5 unread at a time

    const sender=LOKPAL_NAMES[Math.floor(Math.random()*LOKPAL_NAMES.length)];
    const currentIrritation=lokpalIrritation[sender]||{level:0,mails:0};

    // Stop sending if max irritation and unread mail exists
    if(currentIrritation.level>=14&&unreadCount>0)return;

    // Increment irritation if there's unread mail
    if(unreadCount>0){
      currentIrritation.level++;
      currentIrritation.mails++;
    }

    // Select message based on irritation level
    const messages=LOKPAL_IRRITATION_MESSAGES[currentIrritation.level]||LOKPAL_IRRITATION_MESSAGES[14];
    const message=messages[Math.floor(Math.random()*messages.length)];

    // Generate reward with degradation based on irritation
    const rewardTypes=["loks","cosmetic","xrayVision","goggles"];
    const rewardType=rewardTypes[Math.floor(Math.random()*rewardTypes.length)];
    let reward=null;
    if(rewardType==="loks"){
      const baseLoks=Math.floor(Math.random()*400)+100; // 100-500
      const degradationMultiplier=1-(currentIrritation.level*0.07); // Each level reduces by ~7%
      const finalLoks=Math.floor(baseLoks*degradationMultiplier);
      reward={type:"loks",amount:Math.max(10,finalLoks),baseAmount:baseLoks,irritationLevel:currentIrritation.level};
    }else if(rewardType==="cosmetic"){
      const catalogs={lillokSkin:LILLOK_SKINS,lillokAura:LILLOK_AURAS,lillokPet:LILLOK_PETS,reactionPack:REACTION_PACKS,voicePack:VOICE_PACKS};
      const cats=Object.keys(catalogs);
      const cat=cats[Math.floor(Math.random()*cats.length)];
      const pool=catalogs[cat]||[];
      const pick=pool[Math.floor(Math.random()*pool.length)];
      reward=pick?{type:"cosmetic",category:cat,itemId:pick.id,itemName:pick.name}:{type:"loks",amount:60};
    }else if(rewardType==="xrayVision"){
      const rarities=["common","uncommon","rare","epic","legendary","mythic"];
      reward={type:"xrayVision",rarity:rarities[Math.floor(Math.random()*rarities.length)]};
    }else if(rewardType==="goggles"){
      const rarities=["uncommon","rare","epic","legendary","mythic"];
      reward={type:"goggles",rarity:rarities[Math.floor(Math.random()*rarities.length)]};
    }

    const newMail={id:`mail-${Date.now()}`,sender,message,reward,timestamp:Date.now(),opened:false};
    setMail(m=>[...m,newMail]);
    pushNotif(`📬 Mail from ${sender}`, "info");
    setLokpalIrritation(prev=>({...prev,[sender]:currentIrritation}));
    setLastMailCheck(Date.now());
  },[ready,mail,lastMailCheck,lillok.name,lokpalIrritation]);
  // Scale via the root font-size, not CSS zoom: Tailwind's spacing/type scale is
  // rem-based, so this scales the whole UI uniformly, and unlike zoom it doesn't
  // desync position:fixed overlays (Settings, modals, previews) from the real
  // viewport — the bug that made changing this setting visibly break the UI.
  useEffect(()=>{
    document.documentElement.style.fontSize={small:"87.5%",normal:"100%",large:"115%"}[featureFlags.uiScale||"normal"];
    document.documentElement.style.filter=featureFlags.invertColors?"invert(1) hue-rotate(180deg)":"none";
    return()=>{document.documentElement.style.fontSize="";document.documentElement.style.filter="";};
  },[featureFlags.uiScale,featureFlags.invertColors]);
  // iOS only grants DeviceOrientationEvent.requestPermission() when it's called
  // synchronously inside a real user-gesture handler — never from a useEffect
  // fired by a state change. So we grab the very first tap/click anywhere in
  // the app (load screen, "Lok In" button, whatever comes first) and use that
  // one guaranteed gesture to ask, instead of waiting for Settings.
  useEffect(()=>{
    if(!featureFlags.enableGyroscope||gyro.permissionGranted)return;
    const onFirstGesture=()=>{gyro.requestAndAttach(true);window.removeEventListener("pointerdown",onFirstGesture);window.removeEventListener("click",onFirstGesture);};
    window.addEventListener("pointerdown",onFirstGesture,{once:true});
    window.addEventListener("click",onFirstGesture,{once:true});
    return()=>{window.removeEventListener("pointerdown",onFirstGesture);window.removeEventListener("click",onFirstGesture);};
  },[featureFlags.enableGyroscope,gyro.permissionGranted,gyro.requestAndAttach]);
  // A rotation purchase lands in the SAME state the Shop already renders from,
  // so a daily/weekly item behaves exactly like its non-rotation equivalent
  // instead of vanishing into dailyOwned/weeklyOwned (docs/AUDIT.md Finding 2).
  const applyRotation=useCallback(item=>{const t=rotationTarget(item);if(!t)return false;
    const add=(o,k)=>({...o,[k]:[...new Set([...(o[k]||[]),item.id])]});
    if(t.kind==="cosmetic"){setOwned(o=>add(o,t.key));setCosmetics(c=>({...c,[t.key]:item.id}));return true;}
    const equip={effect:setEffect,sky:setSky,cursorPack:setCursorPack,fontPack:setFontPack,stickerPack:setStickerPack}[t.key];
    const ownList={effect:setOwnedEffects,sky:setOwnedSkies}[t.key];
    if(ownList)ownList(o=>[...new Set([...o,item.id])]);else setOwned(o=>add(o,t.key));
    equip?.(item.id);return true;},[]);
  const getSaveBlob=useCallback(()=>({botPosted,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,hapticGrammar,fourthWall,sessionPin,moodTags,garden,reportedPosts,verified,lillok:{...lillok,lastSeen:Date.now()},modules,sky,ownedSkies,animFx,ownedAnimFx,fontPack,cursorPack,musicPack,stickerPack,postExport,mythicOwned,mythicEquipped,dailyOwned,weeklyOwned,appLogo,notifications,comebackActive,comebackStyle:celebrationStyle,lastComebackAward,lastOfflineBonus,legacyStudio,legacyBrushes,tutorialProgress,rewardClaims,doubleLoksUntil,chests,goggles,mail,lastMailCheck,lokpalIrritation,featureFlags}),[botPosted,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,hapticGrammar,fourthWall,sessionPin,moodTags,garden,reportedPosts,verified,lillok,modules,sky,ownedSkies,animFx,ownedAnimFx,fontPack,cursorPack,musicPack,stickerPack,postExport,mythicOwned,mythicEquipped,dailyOwned,weeklyOwned,appLogo,notifications,comebackActive,celebrationStyle,lastComebackAward,lastOfflineBonus,tutorialProgress,rewardClaims,doubleLoksUntil,chests,goggles,mail,lastMailCheck,lokpalIrritation,featureFlags]);
  const doSave=useCallback(()=>{const b=getSaveBlob();store.set(SAVE_KEY,b);store.set(SAVE_KEY+":at",Date.now());
    // Mirror to the cloud so progress follows the user between phone, iPad, and
    // desktop. Fire-and-forget: a failed sync must never block the local save,
    // which remains the source of truth. Same auth_saves table + shape as the
    // manual "Back up now" button, so either path reads the other's data.
    const uid=auth.getUserId();if(uid)pushSave(uid,b,galleryRef.current).catch(()=>{});
  },[getSaveBlob,auth]);

  // Handle mail mark as read with happy mail generation on all clear
  const handleMailMarkRead=useCallback(id=>{
    setMail(m=>{
      // Mail carried real rewards (Loks, cosmetics, X-ray Vision, Goggles)
      // that were generated on a timer but never actually applied to any
      // state when "read" — this is the same class of bug already fixed for
      // chests (ChestInventory's onOpen), same fix shape here.
      const target=m.find(x=>x.id===id);
      if(target&&!target.opened&&target.reward){
        const reward=target.reward;
        if(reward.type==="loks"){addLoks(reward.amount);}
        else if(reward.type==="cosmetic"&&reward.itemId){setCosmetics(c=>({...c,[reward.category]:reward.itemId}));setOwned(o=>{const arr=o[reward.category]||[];if(arr.some(i=>i.id===reward.itemId))return o;return{...o,[reward.category]:[...arr,{id:reward.itemId,ts:Date.now()}]};});}
        else if(reward.type==="xrayVision"){const xrayKey=`xrayVision${reward.rarity.charAt(0).toUpperCase()}${reward.rarity.slice(1)}`;setCosmetics(c=>({...c,[xrayKey]:true}));}
        else if(reward.type==="goggles"){setGoggles(g=>({...g,[reward.rarity]:(g[reward.rarity]||0)+1}));}
      }
      const updated=m.map(x=>x.id===id?{...x,opened:true}:x);
      // Check if ALL mail is now read
      if(updated.every(x=>x.opened)){
        // Find all senders from previously unread mail (before this mark)
        const senders=new Set(m.filter(x=>!x.opened).map(x=>x.sender));
        senders.forEach(sender=>{
          const baseLoks=Math.floor(Math.random()*500)+250; // 250-750
          const bonus=Math.floor(baseLoks*0.375); // 25-50% bonus
          const finalLoks=baseLoks+bonus;

          const happyMessages=[
            `I missed you! Here's something special to make up for my mood 💝`,
            `Wow, you actually opened them! Here's a bonus for making me happy ✨`,
            `Welcome back! Let me make it up to you with this 🎉`,
            `Thanks for checking in! You deserve this extra little something 💕`,
            `You came back! I'm so happy right now 🌟`
          ];

          const happyMessage=happyMessages[Math.floor(Math.random()*happyMessages.length)];

          const happyMail={
            id:`happy-${Date.now()}-${Math.random()}`,
            sender,
            message:happyMessage,
            reward:{type:"loks",amount:finalLoks,bonus:true},
            timestamp:Date.now(),
            opened:false
          };

          updated.push(happyMail);
          pushNotif(`💝 Happy mail from ${sender}!`, "success");

          // Reset irritation for this sender
          setLokpalIrritation(prev=>({...prev,[sender]:{level:0,mails:0}}));
        });
      }
      return updated;
    });
  },[]);

  const mintGuestPassCode=useCallback(async email=>{
    const code=await mintGuestPass(getSaveBlob(),email);
    if(code)store.set("lok:guestPassMinted",true);
    return code;
  },[getSaveBlob]);
  const redeemGuestPassCode=useCallback(async code=>{
    const blob=await redeemGuestPass(code);
    if(!blob)return false;
    await store.set(SAVE_KEY,blob);
    window.location.reload();
    return true;
  },[]);

  // Guest-of-the-Pass nudges: a light, dismissible prompt after publishing
  // (never a blocker — skipping just closes it and work continues), plus a
  // once-per-reminder-window check for guests who've been unauthenticated
  // long enough that their local-only save is genuinely at risk.
  const[showGuestPrompt,setShowGuestPrompt]=useState(null); // null | "publish" | "expiry"
  const guestPromptCooldown=useRef(0);
  const nudgeGuestSave=useCallback(reason=>{
    if(auth.isAuthenticated())return;
    const now=Date.now();
    if(now-guestPromptCooldown.current<120000)return;
    guestPromptCooldown.current=now;
    setShowGuestPrompt(reason);
  },[auth]);
  useEffect(()=>{
    if(!ready||auth.isAuthenticated())return;
    (async()=>{
      if(await store.get("lok:guestPassMinted"))return;
      let firstSeen=await store.get("lok:guestFirstSeen");
      if(!firstSeen){firstSeen=Date.now();await store.set("lok:guestFirstSeen",firstSeen);return;}
      const days=featureFlags.guestReminderDays||7;
      if((Date.now()-firstSeen)/86400000<days)return;
      const lastShown=await store.get("lok:guestReminderLastShown")||0;
      if(Date.now()-lastShown<days*86400000)return;
      await store.set("lok:guestReminderLastShown",Date.now());
      setShowGuestPrompt("expiry");
    })();
  },[ready]);
  useEffect(()=>{if(!activeTutorialId)return;setTutorialProgress(tp=>({...tp,[activeTutorialId]:{frames:studioFrames,frameDurations:studioFrameDurations,title:studioTitle}}));},[activeTutorialId,studioFrames,studioFrameDurations,studioTitle]);
  useEffect(()=>{if(tab!=="studio")setActiveTutorialId(null);},[tab]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(doSave,400);return()=>clearTimeout(t);},[ready,doSave]);
  useEffect(()=>{if(!ready)return;const userPosts=posts.filter(p=>!p.id?.startsWith("seed"));galleryRef.current=userPosts;const t=setTimeout(()=>{store.set(GALLERY_KEY,userPosts).then(ok=>{if(!ok)say("Gallery too big");});},500);return()=>clearTimeout(t);},[ready,posts]);
  useEffect(()=>{if(!ready||kids)return;let interval=null;const startDecay=()=>{interval=setInterval(()=>setLillok(s=>{if(s.stasis)return s;if(s.ink===0){if(!s.inkZeroAt)return{...s,inkZeroAt:Date.now()};if(Date.now()-s.inkZeroAt>120000)return{...s,stasis:true,inkZeroAt:null};return s;}const buffer=1-(s.bond/100)*0.5;return{...s,ink:Math.max(0,s.ink-1.4*buffer)};}),12000);};const stopDecay=()=>{clearInterval(interval);interval=null;};const onVisible=()=>{if(document.visibilityState==="hidden")stopDecay();else startDecay();};startDecay();document.addEventListener("visibilitychange",onVisible);return()=>{stopDecay();document.removeEventListener("visibilitychange",onVisible);};},[ready,kids]);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  useEffect(()=>{const save=()=>doSave();window.addEventListener("beforeunload",save);return()=>window.removeEventListener("beforeunload",save);},[doSave]);
  useEffect(()=>{if(lokPass||kids)return;const n=adsFor("banner").length;if(!n)return;const t=setInterval(()=>setAdIdx(i=>(i+1)%n),8000);return()=>clearInterval(t);},[lokPass,kids]);
  // Interstitials fire only on a tab transition, never mid-activity, and never
  // more often than the router's gap allows. canShowInterstitial() refuses on
  // studio/battle/rush/rooms so an in-progress drawing is never covered.
  useEffect(()=>{if(!ready||!ads.interstitial)return;if(!canShowInterstitial({tab,lastShownAt:lastInterstitialRef.current}))return;const pool=adsFor("interstitial");if(!pool.length)return;lastInterstitialRef.current=Date.now();setInterstitial(pool[Math.floor(Math.random()*pool.length)]);},[tab]);
  useEffect(()=>{if(!ready)return;const t1=setTimeout(()=>showLine(),4000);const t2=setInterval(()=>{if(!showLilLok)showLine();},60000);return()=>{clearTimeout(t1);clearInterval(t2);};},[ready]);
  useEffect(()=>{if(!ready||kids)return;const t=setInterval(()=>{setGarden(g=>g.map(p=>p&&!p.harvested?{...p,growth:Math.min(100,p.growth+3+Math.random()*5)}:p));setGardenTimer(t=>t+1);},3600000);return()=>clearInterval(t);},[ready,kids]);
  useEffect(()=>{if(!ready)return;const t=setInterval(()=>{if(Math.random()<0.12&&!comebackActive){setComebackActive(true);const ls=Object.values(LILLOK_SPEECH.comeback_tease);say(ls[Math.floor(Math.random()*ls.length)]);}},90000);return()=>clearInterval(t);},[ready,comebackActive]);
  const onCheat=useCallback(code=>{const c=resolveCheat(code);if(!c){say("The ink doesn't recognize that…","error");return;}
    if(c.fx==="merci"){setLoks(l=>l+1000);setTotalEarned(t=>t+1000);hap([80,40,80,40,160]);blip("C6");say("💖 Merci, merci · +1000 Loks","success");pushNotif("BadBleep: gratitude accepted · +1000 Loks","success");}
    if(c.fx==="supableep"){setLokPass(true);setOwnedThemes(Object.keys(THEMES));setOwnedEffects(EFFECTS.map(e=>e.id));setOwnedSkies(SKIES.map(x=>x.id));setModules(m=>[...new Set([...m,...STUDIO_MODULES.map(x=>x.id)])]);setOwnedAnimFx(ANIMATION_FX.map(x=>x.id));setBigBattleOwned(true);setSoundLab(true);setLoks(l=>l+9999);setTotalEarned(t=>t+9999);hap([200,80,200,80,300]);blip("C6");say("🫧 SUPABLEEP · everything unlocked (dev)","success");pushNotif("SupaBleepMode active — all content unlocked for testing","success");}
    if(c.fx==="cincoorso"){setComebackActive(true);const ls=Object.values(LILLOK_SPEECH.comeback_tease);say(ls[Math.floor(Math.random()*ls.length)]);hap([50]);}
    if(c.fx==="mercmerc"){setLoks(l=>l+200);setTotalEarned(t=>t+200);hap([60,30,60]);blip("C5");say("Merc Merc! +200 Loks","success");}
    if(c.fx==="inkoverflow"){setLillok(s=>({...s,ink:100,bond:100,stasis:false,inkZeroAt:null,lastSeen:Date.now()}));hap([100,50,100]);say("Ink Overflow — max ink & bond, revived!","success");}
    if(c.fx==="phoenix"){setLillok(s=>({...s,ink:Math.min(100,s.ink+50),bond:Math.min(100,s.bond+10),stasis:false,inkZeroAt:null}));hap([80,40,80]);say("Phoenix — revived from the ashes!","success");}
    if(c.fx==="fodskip"){setFodHistory(h=>h.filter(x=>x.day!==new Date().toDateString()));say("Flip of the Day refreshed!","success");}
    if(c.fx==="pinball"){const pin=String(Math.floor(1000+Math.random()*9000));setSessionPin(pin);say(`PIN set: ${pin}`);}
    if(c.fx==="whisper"){setOwned(o=>({...o,voicePack:VOICE_PACKS.map(v=>v.id)}));setCosmetics(c=>({...c,voicePack:"whisper"}));say("All voice packs unlocked!","success");}
    if(c.fx==="nightmode"){if(ownedThemes.includes("midnight"))setUiTheme("midnight");else if(ownedThemes.includes("noir"))setUiTheme("noir");else{setOwnedThemes(t=>[...new Set([...t,"midnight"])]);setUiTheme("midnight");}say("Night mode activated","success");}
    if(c.fx==="doubledown"){setLoks(l=>l*2);setTotalEarned(t=>t*2);hap([100,50,100]);blip("C6");say("Double Down! Loks doubled","success");}
    if(c.fx==="resolve"){setQuests(q=>{if(!q)return q;let paid=0;const items=q.items.map(it=>{if(it.done)return it;paid+=it.reward;return{...it,progress:it.goal,done:true};});if(paid){setLoks(l=>l+paid);setTotalEarned(t=>t+paid);setTimeout(()=>say(`All quests resolved! +${paid} Loks`,"success"),250);}return{...q,items};});}
    if(c.fx==="vibemode"){const ids=CELEBRATIONS.map(x=>x.id);const idx=(ids.indexOf(celebrationStyle)+1)%ids.length;setCelebrationStyle(ids[idx]);say(`Celebration style: ${ids[idx]}!`);}
    if(c.fx==="devmode"){setDevMode(true);hap([80,40,80,40,160]);blip("C6");say("🔧 Dev Mode unlocked — all debugging features enabled","success");pushNotif("Developer mode active — debugging tools and secret features available","success");}
    if(c.fx==="tokens10k"){setLoks(l=>l+10000);setTotalEarned(t=>t+10000);hap([200,100,200,100,300]);blip("C6");say("💰 +10,000 Loks granted","success");pushNotif("BadBleep: emergency tokens · +10,000 Loks","success");}
    if(c.fx==="chestrain"){const newChests=Array.from({length:10},()=>({id:`c${Date.now()}-${Math.random()}`,type:["common","uncommon","rare","epic","legendary","mythic"][Math.floor(Math.random()*6)]}));setChests(prev=>[...prev,...newChests]);hap([50,30,50]);say("🎁 Rain of 10 chests — for testing","success");}
    if(c.fx==="chestspree"){const rarities=["common","uncommon","rare","epic","legendary","mythic"];const newChests=rarities.flatMap(r=>Array.from({length:3},()=>({id:`c${Date.now()}-${Math.random()}`,type:r})));setChests(prev=>[...prev,...newChests]);hap([100,50,100,50,150]);say("🎁 Chest Spree! 18 chests unlocked — for testing","success");}
    if(c.fx==="chestview"){setShowChestViewer(prev=>!prev);}
    if(c.fx==="chest1"){const newChests=[{id:`c${Date.now()}-${Math.random()}`,type:["common","uncommon","rare","epic","legendary","mythic"][Math.floor(Math.random()*6)]}];setChests(prev=>[...prev,...newChests]);hap([30,20,30]);say("🎁 +1 chest","success");}
    if(c.fx==="chest5"){const newChests=Array.from({length:5},()=>({id:`c${Date.now()}-${Math.random()}`,type:["common","uncommon","rare","epic","legendary","mythic"][Math.floor(Math.random()*6)]}));setChests(prev=>[...prev,...newChests]);hap([50,30,50,30,50]);say("🎁 +5 chests","success");}
  },[say,hap,blip,pushNotif,ownedThemes,VOICE_PACKS,CELEBRATIONS,celebrationStyle]);
  const patchPost=(id,patch)=>setPosts(ps=>ps.map(p=>(p.id===id?{...p,...patch}:p)));
  // Pull an existing post back into Studio for real edits. Publishing while
  // editingPostId is set updates that post in place instead of making a copy.
  const editInStudio=useCallback(post=>{
    setStudioFrames(post.frames||[]);
    setStudioFrameDurations(post.frameDurations||[]);
    setStudioTitle(post.title||"");
    setEditingPostId(post.id);
    setActiveTutorialId(null);
    setOpenIdx(null);
    setTab("studio");
    say("Editing in Studio — publish to save your changes");
  },[say]);
  const setArtistView=useCallback(name=>{setTab("gallery");setViewingArtist(name);say(`${name}'s gallery`);},[say]);
  const spend=(cost,ok,label)=>{if(loks<cost){say(`Need ${cost} Loks`);return false;}setLoks(l=>l-cost);setTotalSpent(t=>t+cost);ok();say(`${label} · −${cost} Loks`);return true;};
  const animatedToken=totalSpent>=ANIMATED_AVATAR_SPEND;
  const feedLilLok=(amt=20,ctx="direct")=>{setLillok(s=>{const wasStasis=s.stasis;const cap=wasStasis?40:100;const bondGain=ctx==="revival"?8:ctx==="creation"?3:2;return{...s,ink:Math.min(cap,s.ink+amt),bond:Math.min(100,s.bond+bondGain),stasis:false,inkZeroAt:null,lastSeen:Date.now()};});hap([40]);};
  const sharePost=useCallback(async post=>{const url=`https://lok.app/post/${post.id}`;try{if(navigator.share){await navigator.share({title:post.title,text:`Check out "${post.title}" on LokBook`,url});}else{await navigator.clipboard.writeText(url);say("Link copied!");}}catch{}},[say]);
  if(sessionPin&&!pinUnlocked)return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:ART.paper,color:ART.ink,fontFamily:"'Bricolage Grotesque',system-ui,sans-serif",gap:16,padding:24}}>
    <style>{`@keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}} @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}`}</style>
    <div style={{fontWeight:800,fontSize:26,letterSpacing:"-0.02em",animation:"inkdrop .7s cubic-bezier(.34,1.56,.64,1) forwards"}}>LokBook</div>
    <div style={{fontSize:13,opacity:0.5,animation:"inkfade .5s .3s ease both"}}>Session locked — enter PIN</div>
    <input type="password" maxLength={6} inputMode="numeric" autoFocus value={pinInput} onChange={e=>{setPinInput(e.target.value);setPinError("");}} onKeyDown={e=>{if(e.key==="Enter"){if(pinInput===sessionPin){setPinUnlocked(true);setPinInput("");setPinError("");}else{setPinError("Wrong PIN");setPinInput("");}}}} className="w-full rounded-xl px-4 py-3 text-center text-2xl font-extrabold tracking-widest" style={{maxWidth:220,border:`3px solid ${pinError?"#C23B22":ART.ink}`,background:"#fff",color:ART.ink,outline:"none",animation:"inkfade .5s .5s ease both"}} aria-label="Enter PIN"/>
    {pinError&&<div style={{color:"#C23B22",fontSize:13,fontWeight:700}}>{pinError}</div>}
  </div>);
  if(!ready)return(<Loader gyroMotion={gyroMotion} enableGyroscope={featureFlags.enableGyroscope&&featureFlags.gyroLoadScreen} showLokinButton={featureFlags.showLokinButton} onLokinClick={() => setReady(true)}/>);
  return(<ThemeCtx.Provider value={T}>
    {/* Z-index hierarchy: z-10 (content overlays) < z-20 (main content) < z-30 (sticky header) < z-39 (nav) < z-40 (ads) < z-41 (music) < z-42 (FAB) < z-50 (modals) < z-70 (roadmap) < z-85 (sync) */}
    <div className={`min-h-screen w-full lok-motion-${featureFlags.lokMotion||"subtle"} ${featureFlags.compactUi ? "lok-compact" : ""}`} style={{background:T.paper,color:T.ink,fontFamily:resolveFont(fontPack),...(isUnlocked("night_shift",level)&&nightShiftAmount()>0.02?{filter:`brightness(${1-nightShiftAmount()*0.16}) saturate(${1-nightShiftAmount()*0.22}) hue-rotate(${-nightShiftAmount()*8}deg)`,transition:"filter 4s linear"}:{}),animation:effect==="quake"&&!reduceMotion?"lokquake 6s infinite":"none"}}>
      <GlobalStyle T={T} pace={pace} speed={speed}/><ThemeBackdrop themeId={uiTheme} pace={pace}/><SkyEffect sky={sky} paper={T.paper}/><PageEffect effect={effect}/>{/* Ink Weather (roadmap, LV2): a second, unbought effect layer the day picks for you */}
      {isUnlocked("ink_weather",level)&&inkWeatherToday()!=="none"&&inkWeatherToday()!==effect&&<PageEffect effect={inkWeatherToday()}/>}
      {!focusMode && <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={()=>setTab("feed")} aria-label="Go to feed" className="lok-btn lok-display text-2xl font-extrabold tracking-tight select-none" style={{background:"transparent",border:"none",padding:0,whiteSpace:"nowrap",textShadow:`3px 2px 0 ${T.accent}`}}>
          Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}
        </button>
        <div className="flex items-center gap-2">
          {kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.alt,color:onColor(T.alt,T)}}>SAFE</span>}
          {lokPass&&!kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.accent,color:T.onAccent}}>PASS</span>}
          <button onClick={()=>setShowMusic(true)} aria-label="Open music player" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold" style={{border:`2.5px solid ${T.ink}`,background:music.playing?T.accent:T.card,color:music.playing?T.onAccent:T.ink}}>♪</button>
          <button onClick={()=>setShowRewards(true)} aria-label="Free rewards — watch an ad" title="Free rewards" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold" style={{border:`2.5px solid ${T.ink}`,background:isActive(doubleLoksUntil)?T.accent:T.card,color:isActive(doubleLoksUntil)?T.onAccent:T.ink}}>🎁</button>
          <button onClick={()=>setSound(s=>!s)} aria-label={sound?"Mute sound":"Enable sound"} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:sound?T.ink:T.card,color:sound?T.paper:T.ink}}>{sound?"🔔":"🔕"}</button>
          <div className="relative flex flex-col items-center">
            <button onClick={()=>setShowRoadmap(true)} className="lok-btn lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.ink,color:T.paper}} aria-label={`Level ${level} - click to open roadmap`}>Lv {level}{verified&&<span style={{color:"#E8B14B",marginLeft:2}}>✦</span>}</button>
            <span className="text-[9px] font-bold opacity-60" style={{color:T.ink,marginTop:2}}>Click me!</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card}} aria-label={`${loks} Loks`}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="11" cy="11" r="8" fill={T.accent}/><circle cx="9" cy="9" r="8" fill="none" stroke={T.ink} strokeWidth="2.4"/><path d="M7 5.5 V12.5 H12" fill="none" stroke={T.ink} strokeWidth="2.4" strokeLinecap="round"/></svg>
            {loks}
          </div>
        </div>
      </header>}
      {/* Responsive shell. On phone this grid collapses to a single column and
          renders byte-identically to the pre-shell layout; tablet gains one side
          slot, desktop two. Rail contents arrive with the ad surfaces — the slots
          exist here so the column geometry is owned in one place. */}
      <div className="lok-shell" style={{display:"grid",justifyContent:"center",alignItems:"start",gap:vp.tier==="phone"?0:24,gridTemplateColumns:vp.tier==="desktop"?`${RAIL_W}px minmax(0,560px) ${RAIL_W}px`:vp.tier==="tablet"?`minmax(0,560px) ${RAIL_W}px`:"minmax(0,1fr)"}}>
        {vp.tier==="desktop"&&<aside className="lok-rail lok-rail-left" style={{position:"sticky",top:88}}>{ads.rails==="both"&&<AdRail side="left" onGetLokPass={()=>setTab("shop")}/>}</aside>}
      <main className="mx-auto w-full px-4" style={{maxWidth:560,paddingBottom:"calc(160px + env(safe-area-inset-bottom))"}}>
        <div key={tab} className="lok-tabin">
        {/* Shop, Rooms, and Roadmap are lazy — they are the heaviest pages and
            most sessions never open them, so they no longer sit in the initial
            bundle. The fallback is deliberately quiet: these load in a frame or
            two on any real connection and a spinner would only flash. */}
        <Suspense fallback={<div className="py-10 text-center text-sm opacity-50">Loading…</div>}>
          {tab==="feed"&&<Feed posts={posts} bookmarks={bookmarks} following={following} feedMode={feedMode} setFeedMode={setFeedMode} cosmetics={cosmetics} daily={daily} streak={daily.streak} dailyClaimed={daily.claimed} flipOfDay={flipOfDay} onLine={showLine} onClaimDaily={()=>{if(daily.claimed)return;const wk=daily.streak%7===0&&daily.streak>0?20:0;const mo=daily.streak%30===0&&daily.streak>0?100:0;const bonus=10+Math.min(daily.streak,7)*5+wk+mo;setDaily(d=>({...d,claimed:true}));addLoks(bonus);gainXp(20);feedLilLok(15,"creation");blip("E5");hap([30,20,60]);say(`Day ${daily.streak} claimed · +${bonus} Loks`,"success");}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped · +5 Loks","success");if(id.startsWith("seed")){addLoks(5);pushNotif("Your flip got a vote · +5 Loks (creator)","success");}else{pushNotif("You voted · creator notified","success");}}} onLok={name=>{setFollowing(f=>{const has=f.includes(name);blip("G5");hap([20,10,20]);if(has){say(`Un-Lok'd ${name}`);return f.filter(x=>x!==name);}questTick("lok");say(`Lok'd ${name}`);return[...f,name];});}} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);blip("A4");hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in to bookmarks");}} say={say} moodFilter={moodFilter} setMoodFilter={setMoodFilter} moodTags={moodTags} reportedPosts={reportedPosts} onReport={id=>{setReportedPosts(r=>[...r,id]);patchPost(id,{hidden:true});say("Post hidden")}} onEcho={post=>{setPosts(ps=>[{id:"echo-"+Date.now(),title:"↻ "+post.title,frames:post.frames,paceMs:post.paceMs||160,mode:post.mode||"A",style:post.style||"bold",loop:post.loop,from:"studio",author:profile.name,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0}},...ps]);addLoks(2);say("Echoed! +2 Loks");}} onArtist={setArtistView} myHandle={profile.name} onFeatureOpen={pc=>{setPosts(ps=>{if(ps.some(x=>x.id===pc.id))return ps;return [...ps,pc];});setTimeout(()=>setOpenIdx(i=>{const idx=posts.findIndex(x=>x.id===pc.id);return idx>=0?idx:posts.length;}),0);}} flair={flair} onPullRefresh={()=>{const now=Date.now();if(now-lastPullRef.current<15000){say("Still fresh — try again in a bit");return;}lastPullRef.current=now;dropBotPosts(2,true);say("New pieces from the wards ✨","success");}} music={music} feedAds={ads.feedNative} onAdCta={()=>setTab("shop")} onLocationClick={()=>setShowWorldMap(true)}/>}
          {tab==="gallery"&&<Profile posts={posts} profile={profile} setProfile={setProfile} wins={wins} lokPass={lokPass} kids={kids} cosmetics={cosmetics} owned={owned} onBuyCosmetic={(cat,item)=>{if(owned[cat]?.some(o=>o.id===item.id)){setCosmetics(c=>({...c,[cat]:item.id}));say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),{id:item.id,ts:Date.now()}]}));setCosmetics(c=>({...c,[cat]:item.id}));},`${item.name} unlocked`);}} level={level} xp={xp} quests={quests} following={following} lokdInCount={bookmarks.length} bookmarks={bookmarks} notifications={notifications} notifUnread={notifUnread} loks={loks} totalEarned={totalEarned} questsCompleted={questsCompleted} canInstall={!!installEvt} onInstall={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("Lok added to your home screen!","success");}catch{}setInstallEvt(null);}else{say("Open your browser menu → Install app / Add to Home Screen");}}} onClearNotifs={()=>setNotifUnread(0)} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onDelete={id=>setPosts(ps=>ps.filter(p=>p.id!==id))} onRename={(id,title)=>patchPost(id,{title})} say={say} onCheat={onCheat} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={()=>setSoundLab(true)} soundQueue={soundQueue} setSoundQueue={setSoundQueue} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} animatedToken={animatedToken} focusMode={focusMode} setFocusMode={setFocusMode} showSettings={showSettings} setShowSettings={setShowSettings} featureFlags={featureFlags} onSetFlag={(k,v)=>{const newFlags={...featureFlags,[k]:v};setFeatureFlags(newFlags);store.set("lok:flags",newFlags);}} onRequestGyroPermission={()=>gyro.requestAndAttach(true)} gyroPermissionGranted={gyro.permissionGranted} weatherOverride={weatherOverride} onSetWeather={id=>{setWeatherOverride(id);setWeatherOverrideLocal(id);}} hapticGrammar={hapticGrammar} setHapticGrammar={setHapticGrammar} fourthWall={fourthWall} setFourthWall={setFourthWall} garden={garden} setGarden={setGarden} wordTwister={wordTwister} setWordTwister={setWordTwister} flair={flair} timeMachineIdx={timeMachineIdx} setTimeMachineIdx={setTimeMachineIdx} heatmapData={heatmapData} sessionPin={sessionPin} setSessionPin={setSessionPin} pinInput={pinInput} setPinInput={setPinInput} verified={verified} setVerified={setVerified} devTap={devTap} devTimer={devTimer} devMode={devMode} setDevMode={setDevMode} appLogo={appLogo} setAppLogo={setAppLogo} setPinUnlocked={setPinUnlocked} setLoks={setLoks} setTotalEarned={setTotalEarned} legacyStudio={legacyStudio} setLegacyStudio={setLegacyStudio} viewingArtist={viewingArtist} onBackToMyGallery={()=>setViewingArtist(null)} onOpenMusic={()=>setShowMusic(true)} onOpenRoadmap={()=>setShowRoadmap(true)} onOpenWorldMap={()=>setShowWorldMap(true)} onOpenMail={()=>setShowMail(true)} mailUnreadCount={mail.filter(x=>!x.opened).length} tutorialProgress={tutorialProgress} onStartTutorial={id=>{setActiveTutorialId(id);const saved=tutorialProgress[id];setStudioFrames(saved?.frames||[]);setStudioFrameDurations(saved?.frameDurations||[]);setStudioTitle(saved?.title||TUTORIAL_PROJECTS.find(t=>t.id===id)?.title||"");setTab("studio");}} onMintGuestPass={mintGuestPassCode} onRedeemGuestPass={redeemGuestPassCode}/>}
          {tab==="studio"&&<>{activeTutorialId&&(()=>{const t=TUTORIAL_PROJECTS.find(x=>x.id===activeTutorialId);return t?(<div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mb-1.5" style={{border:`2px solid ${T.accent}`,background:T.card,color:T.ink}}><span>{t.icon} Tutorial: {t.title}</span><button onClick={()=>setActiveTutorialId(null)} className="ml-auto lok-btn text-[10px] font-bold underline opacity-70">exit tutorial</button></div>):null;})()}<div className="mb-1">
        <div className="flex items-center gap-1.5">
          {pendingSticker&&<div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full" style={{border:`1.5px solid ${T.accent}`,background:T.card}}>Placing <span className="text-base">{pendingSticker.kind==="emoji"?pendingSticker.value:"🖼️"}</span> — tap the canvas <button onClick={()=>setPendingSticker(null)} className="underline opacity-70">cancel</button></div>}
          <button onClick={()=>setStickerSheetOpen(o=>!o)} className="lok-btn shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{border:`1.5px solid ${T.ink}`}}>🎴 stickers</button>
          {placedStickers.length>0&&<span className="text-[10px] opacity-40">{placedStickers.length} on this page</span>}
        </div>
        {stickerSheetOpen&&<StickerSheet T={T} say={say} equippedPack={stickerPack} myStickerIds={myStickers} onClose={()=>setStickerSheetOpen(false)} onPick={item=>{setPendingSticker(item);setStickerSheetOpen(false);say("Tap the canvas to place it");}} onUploaded={id=>refreshMyStickers()} onDeleteMy={id=>{deleteSticker(id).then(refreshMyStickers);}}/>}
      </div>
          {legacyStudio
            ? <Studio paper={cosmetics.paper} cursorPack={cosmetics.cursorPack} ownedTiers={ownedTiers} ccTier={ccTier} say={say} kids={kids} dailyPrompt={daily.prompt} animFx={animFx} modules={modules} legacyBrushes={legacyBrushes} setLegacyBrushes={setLegacyBrushes} authorName={profile.name} mythicEquipped={mythicEquipped} stickers={placedStickers} onStickersChange={setPlacedStickers} pendingSticker={pendingSticker} onStickerPlaced={()=>setPendingSticker(null)} bloomEnabled={featureFlags.bloomEnabled!==false} bloomIntroSeen={!!featureFlags.bloomIntroSeen} onBloomIntroSeen={()=>{const nf={...featureFlags,bloomIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} grainIntroSeen={!!featureFlags.grainIntroSeen} onGrainIntroSeen={()=>{const nf={...featureFlags,grainIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} onPublish={post=>{setPosts(ps=>[post,...ps]);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");nudgeGuestSave("publish");}}/>
            : <NewStudioUI paper={cosmetics.paper} cursorPack={cosmetics.cursorPack} postExport={postExport} mythicEquipped={mythicEquipped} stickers={placedStickers} onStickersChange={setPlacedStickers} pendingSticker={pendingSticker} onStickerPlaced={()=>setPendingSticker(null)} ownedTiers={ownedTiers} ccTier={ccTier} say={say} kids={kids} dailyPrompt={daily.prompt} animFx={animFx} modules={modules} legacyBrushes={legacyBrushes} setLegacyBrushes={setLegacyBrushes} frames={studioFrames} setFrames={setStudioFrames} frameDurations={studioFrameDurations} setFrameDurations={setStudioFrameDurations} title={studioTitle} setTitle={setStudioTitle} draftImg={studioDraftImg} setDraftImg={setStudioDraftImg} authorName={profile.name} tutorialGhostFrames={activeTutorialId?getTutorialGhostFrames(TUTORIAL_PROJECTS.find(t=>t.id===activeTutorialId)):null} music={music} geoData={geoData} bloomEnabled={featureFlags.bloomEnabled!==false} bloomIntroSeen={!!featureFlags.bloomIntroSeen} onBloomIntroSeen={()=>{const nf={...featureFlags,bloomIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} grainIntroSeen={!!featureFlags.grainIntroSeen} onGrainIntroSeen={()=>{const nf={...featureFlags,grainIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} onPublish={post=>{if(editingPostId){setPosts(ps=>ps.map(x=>x.id===editingPostId?{...x,...post,id:editingPostId}:x));setEditingPostId(null);setStudioFrames([]);setStudioFrameDurations([]);setStudioTitle("");setTab("gallery");blip("C6");hap([50,30,100]);say("Post updated","success");return;}setPosts(ps=>[post,...ps]);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");nudgeGuestSave("publish");}}/>}
          </>}
          {featureFlags.combatUIMode!=="legacy"&&(tab==="battle"||tab==="front")&&<CombatHub
            mode={tab==="front"?"rush":"battle"}
            T={T} modules={modules} paper={cosmetics.paper} cursorPack={cosmetics.cursorPack} ownedTiers={ownedTiers} ccTier={ccTier}
            wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok}
            say={say} blip={blip} hap={hap} animFx={animFx} authorName={profile.name}
            onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")}
            onResult={(won,mult=1)=>{addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));}}
            onPublish={post=>{setPosts(ps=>[post,...ps]);nudgeGuestSave("publish");}}
            loks={loks} dailyPrompt={daily.prompt} hinted={traceHinted} onHinted={()=>setTraceHinted(true)}
            onWager={amt=>{if(loks<amt)return false;setLoks(l=>l-amt);setTotalSpent(t=>t+amt);return true;}}
            onEarn={n=>{addLoks(n);questTick("front",Math.max(1,Math.round(n/5)));gainXp(n);setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-3)}));}}
            battleRoyaleCount={battleRoyaleCount} setBattleRoyaleCount={setBattleRoyaleCount} addLoks={addLoks}
            bloomEnabled={featureFlags.bloomEnabled!==false} bloomIntroSeen={!!featureFlags.bloomIntroSeen} onBloomIntroSeen={()=>{const nf={...featureFlags,bloomIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}}
            grainIntroSeen={!!featureFlags.grainIntroSeen} onGrainIntroSeen={()=>{const nf={...featureFlags,grainIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}}
          />}
          {featureFlags.combatUIMode==="legacy"&&tab==="battle"&&<><div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
            <span className="lok-display font-extrabold text-sm" style={{color:battleRoyaleCount>=5?T.accent:T.ink}}>🔥 Battle Royale</span>
            <div className="flex items-center gap-1">{Array.from({length:5}).map((_,i)=>(<button key={i} onClick={()=>{setBattleRoyaleCount(c=>c+1);if(i===4){addLoks(30);say("Battle Royale hype! +30 Loks","success");}}} className="lok-btn w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center" style={{border:`2px solid ${i<battleRoyaleCount?T.accent:T.shadow}`,background:i<battleRoyaleCount?T.accent:"transparent",color:i<battleRoyaleCount?T.onAccent:T.ink}} aria-label={i<battleRoyaleCount?"Hype unlocked":"Add hype"}>{i<battleRoyaleCount?"🔥":"+"}</button>))}</div>
            {battleRoyaleCount>=5&&<span className="text-xs font-bold" style={{color:T.accent}}>READY!</span>}
          </div>
          <Battle modules={modules} paper={cosmetics.paper} cursorPack={cosmetics.cursorPack} ownedTiers={ownedTiers} ccTier={ccTier} wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok} say={say} blip={blip} hap={hap} animFx={animFx} authorName={profile.name} onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")} onResult={(won,mult=1)=>{addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));}} bloomEnabled={featureFlags.bloomEnabled!==false} bloomIntroSeen={!!featureFlags.bloomIntroSeen} onBloomIntroSeen={()=>{const nf={...featureFlags,bloomIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} grainIntroSeen={!!featureFlags.grainIntroSeen} onGrainIntroSeen={()=>{const nf={...featureFlags,grainIntroSeen:true};setFeatureFlags(nf);store.set("lok:flags",nf);}} onPublish={post=>{setPosts(ps=>[post,...ps]);nudgeGuestSave("publish");}}/></>}
          {featureFlags.combatUIMode==="legacy"&&tab==="front"&&<OpenFront kids={kids} loks={loks} dailyPrompt={daily.prompt} hinted={traceHinted} onHinted={()=>setTraceHinted(true)} onWager={amt=>{if(loks<amt)return false;setLoks(l=>l-amt);setTotalSpent(t=>t+amt);return true;}} onEarn={n=>{addLoks(n);questTick("front",Math.max(1,Math.round(n/5)));gainXp(n);setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-3)}));}} blip={blip} say={say}/>}
          {tab==="rooms"&&<Rooms profile={profile} userId={profile.name} myRooms={myRooms} setMyRooms={setMyRooms} pendingCode={pendingRoomCode} onPendingCodeUsed={()=>setPendingRoomCode(null)} onArtist={name=>setArtistView&&setArtistView(name)} say={say} blip={blip} hap={hap}/>}
          {tab==="shop"&&<Shop ccTier={ccTier} say={say} modules={modules} onBuyModule={m=>{if(modules.includes(m.id)){say("Already owned");return;}spend(m.price,()=>{setModules(o=>[...o,m.id]);blip("C6");},`${m.name} unlocked`);}} loks={loks} lokPass={lokPass} kids={kids} uiTheme={uiTheme} ownedThemes={ownedThemes} effect={effect} ownedEffects={ownedEffects} sky={sky} ownedSkies={ownedSkies} onSky={(id,s)=>{if(ownedSkies.includes(id)){setSky(id);say(`Equipped ${s.name}`);}else spend(s.price,()=>{setOwnedSkies(o=>[...o,id]);setSky(id);},`${s.name} unlocked`);}} animFx={animFx} ownedAnimFx={ownedAnimFx} onAnimFx={(id,f)=>{if(ownedAnimFx.includes(id)){setAnimFx(id);say(id==="none"?"FX off":`${f.name} equipped`);}else spend(f.price,()=>{setOwnedAnimFx(o=>[...o,id]);setAnimFx(id);},`${f.name} unlocked`);}} fontPack={fontPack} onFontPack={(id,f)=>spend(f.price,()=>{setOwned(o=>({...o,fontPack:[...(o.fontPack||[]),id]}));setFontPack(id);},`${f.name} set`)} cursorPack={cursorPack} onCursorPack={(id,c)=>spend(c.price,()=>{setOwned(o=>({...o,cursorPack:[...(o.cursorPack||[]),id]}));setCursorPack(id);},`${c.name} set`)} musicPack={musicPack} onMusicPack={(id,m)=>spend(m.price,()=>{setOwned(o=>({...o,musicPack:[...(o.musicPack||[]),id]}));setMusicPack(id);},`${m.name} set`)} stickerPack={stickerPack} onStickerPack={(id,s)=>spend(s.price,()=>{setOwned(o=>({...o,stickerPack:[...(o.stickerPack||[]),id]}));setStickerPack(id);},`${s.name} set`)} postExport={postExport} onPostExport={(id,e)=>spend(e.price,()=>{setOwned(o=>({...o,postExport:[...(o.postExport||[]),id]}));setPostExport(id);},`${e.name} set`)} mythicOwned={mythicOwned} mythicEquipped={mythicEquipped} dailyOwned={dailyOwned} weeklyOwned={weeklyOwned} onBuyMythic={(item,rotation)=>{if(rotation==="daily"||rotation==="weekly"){if(isArchivedRotation(item)){say(`${item.name} isn't active yet — it needs a real encoder, not just wiring`);return;}const ownedIds=rotation==="daily"?dailyOwned:weeklyOwned;if(ownedIds.includes(item.id)){applyRotation(item);say(`Equipped ${item.name}`);return;}spend(item.price,()=>{rotation==="daily"?setDailyOwned(o=>[...o,item.id]):setWeeklyOwned(o=>[...o,item.id]);applyRotation(item);blip("C6");},`${item.name} unlocked`);}else{if(mythicOwned.includes(item.id)){setMythicEquipped(item.id);say(`Equipped ${item.name}`);}else spend(item.price,()=>{setMythicOwned(o=>[...o,item.id]);setMythicEquipped(item.id);setTimeout(()=>setCelebration(item.name),100);setTimeout(()=>setCelebration(null),3000);},`${item.name} unlocked`);}}} cosmetics={cosmetics} owned={owned} setKids={setKids} onBuyCosmetic={(cat,item)=>{if((owned[cat]||[]).includes(item.id)){setCosmetics(c=>({...c,[cat]:item.id}));blip("D5");say(`Equipped ${item.name}`);if(cat==="blotPersonality")setBlotSpeech(getBlotResponse(item.id,"greet",lillok.name));}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),item.id]}));setCosmetics(c=>({...c,[cat]:item.id}));blip("C6");setBlotSpeech(getBlotResponse(cat==="blotPersonality"?item.id:cosmetics.blotPersonality,"purchase",lillok.name));},`${item.name} unlocked`);}} onBuyPass={()=>{setLokPass(true);setOwnedThemes(Object.keys(THEMES));blip("C6");say("LokPass active!");}} onTheme={id=>{if(ownedThemes.includes(id)){setUiTheme(id);say(`Equipped ${THEMES[id].name}`);}else spend(THEMES[id].price,()=>{setOwnedThemes(o=>[...o,id]);setUiTheme(id);},`${THEMES[id].name} unlocked`);}} onEffect={(id,e)=>{if(ownedEffects.includes(id)){setEffect(id);say(id==="none"?"Effects off":`${e.name} equipped`);}else spend(e.price,()=>{setOwnedEffects(o=>[...o,id]);setEffect(id);},`${e.name} unlocked`);}} onCc={()=>spend(120,()=>setCcTier(true),"Studio Pro unlocked")} celebrationStyle={celebrationStyle} onCelebrationStyle={id=>setCelebrationStyle(id)}/>}
        </Suspense>
        </div>
      </main>
        {vp.tier!=="phone"&&<aside className="lok-rail lok-rail-right" style={{position:"sticky",top:88}}>{!!ads.rails&&<AdRail side="right" onGetLokPass={()=>setTab("shop")}/>}</aside>}
      </div>
      {!focusMode && music.current && (<div className="fixed inset-x-0 z-41" style={{bottom:(!lokPass&&!kids)?"calc(88px + env(safe-area-inset-bottom))":"calc(60px + env(safe-area-inset-bottom))"}}>
        <MusicTicker music={music} onOpen={()=>setShowMusic(true)}/>
      </div>)}
      {showRoadmap&&<div className="fixed inset-0 z-[70] overflow-y-auto" style={{background:T.paper}}><Suspense fallback={<div className="py-10 text-center text-sm opacity-50">Loading…</div>}><Roadmap level={level} xp={xp} chests={chests} featureFlags={featureFlags} setFeatureFlags={setFeatureFlags} onClose={()=>setShowRoadmap(false)}/></Suspense></div>}
      {showWorldMap&&<Suspense fallback={<div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.8)",color:"#fff"}}>Loading map…</div>}><WorldMapViewer posts={posts.filter(p=>p.latitude&&p.longitude)} userLocation={userLocation} theme={uiTheme} skin={cosmetics.globeSkin} gyroMotion={featureFlags.enableGyroscope&&featureFlags.gyroWorldMap?gyroMotion:GYRO_ZERO} onPostClick={p=>setOpenIdx(posts.findIndex(x=>x.id===p.id))} onClose={()=>setShowWorldMap(false)}/></Suspense>}
      {showMail&&<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setShowMail(false)}>
        <div className="w-full rounded-t-3xl overflow-y-auto overscroll-contain" style={{maxWidth:560,maxHeight:"min(85vh, 85dvh)",background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
          <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{background:T.card,borderBottom:`1px solid ${T.shadow}`,zIndex:10}}><div className="lok-display text-lg font-extrabold">Mail</div><button onClick={()=>setShowMail(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close mail">✕</button></div>
          <Mail mail={mail} T={T} onMarkRead={handleMailMarkRead} onDelete={id=>setMail(m=>m.filter(x=>x.id!==id))}/>
        </div>
      </div>}
      {showMusic&&<MusicSheet music={music} say={say} devMode={devMode} lokPass={lokPass} signedIn={auth.isAuthenticated()} onGetLokPass={()=>{setShowMusic(false);setTab("shop");}} onSignIn={()=>{setShowMusic(false);setShowSettings(true);}} onClose={()=>setShowMusic(false)}/>}
      {!focusMode && ads.bottomBanner&&(()=>{const bannerAds=adsFor("banner");const b=bannerAds[adIdx%bannerAds.length];return(<div className="fixed inset-x-0 z-40 flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-bold" {...(AD_PROVIDER!=="placeholder"?{"data-ad-slot":b.slot,"data-ad-format":"banner"}:{})} style={{bottom:`calc(60px + env(safe-area-inset-bottom))`,background:T.card,borderTop:`2px dashed ${T.ink}`,color:T.ink,opacity:adVisible?1:0,transition:"opacity .3s ease",pointerEvents:adVisible?"auto":"none"}}>
        {/* AdSense: replace inner span with <ins class="adsbygoogle"> at deploy; slot id in data-ad-slot. data-ad-* attrs only emitted once a real provider is wired — placeholder mode ships no ad-network markup */}
        <span className="opacity-70 truncate" key={adIdx} style={{animation:"lokrise .3s ease"}}>Ad · {b.text}</span>
        <button onClick={()=>setTab("shop")} aria-label="Remove ads with LokPass" className="underline shrink-0" style={{color:T.accent}}>Remove with LokPass</button>
      </div>);})()}
      {interstitial&&<AdInterstitial ad={interstitial} onClose={()=>setInterstitial(null)} onCta={()=>{setInterstitial(null);setTab("shop");}}/>}
      {showRewards&&<RewardedSheet claims={rewardClaims} lokPass={lokPass} onClose={()=>setShowRewards(false)} onClaim={grantReward}/>}
      {syncPrompt&&(<div className="fixed inset-0 z-[85] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.6)"}}>
        <div className="w-full rounded-3xl p-5 flex flex-col gap-3" style={{maxWidth:400,background:T.card,color:T.ink,border:`3px solid ${T.ink}`,boxShadow:`6px 6px 0 ${T.accent}`}}>
          <div className="lok-display font-extrabold text-xl leading-tight">Two saves found</div>
          <p className="text-sm opacity-80 leading-snug">There's newer progress saved from another device. Keeping one means losing the other — pick carefully.</p>
          <div className="text-xs opacity-70 leading-snug rounded-xl p-2.5" style={{border:`2px dashed ${T.ink}`}}>
            <div><strong>Cloud save</strong> · {new Date(syncPrompt.savedAt).toLocaleString()}</div>
            <div className="mt-1"><strong>This device</strong> · {loks} Loks · level {level}</div>
          </div>
          <button onClick={()=>restoreSave(syncPrompt.blob,syncPrompt.gallery)} className="lok-btn w-full py-2.5 rounded-xl text-sm font-extrabold" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>Use the cloud save</button>
          <button onClick={()=>{const uid=auth.getUserId();if(uid)pushSave(uid,getSaveBlob(),galleryRef.current).catch(()=>{});setSyncPrompt(null);say("Keeping this device's save","success");}} className="lok-btn w-full py-2.5 rounded-xl text-sm font-extrabold" style={{background:T.paper,color:T.ink,border:`2.5px solid ${T.ink}`}}>Keep this device</button>
        </div>
      </div>)}
      {!focusMode && <nav className="fixed bottom-0 inset-x-0 z-39 flex" style={{background:T.paper,borderTop:`3px solid ${T.ink}`,paddingBottom:"env(safe-area-inset-bottom)"}} role="navigation" aria-label="Main navigation">
        {[["feed",kids?"Home":"Feed",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],["gallery",kids?"You":"You",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],["studio","Studio",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg>],["battle",kids?"Draw":"Battle",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>],["front","Rush",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>],["rooms","Rooms",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>],["shop","Shop",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>]].map(([id,label,icon])=>{const on=tab===id;return(<button key={id} onClick={()=>setTab(id)} aria-label={`Go to ${label}`} aria-current={on?"page":undefined} className="lok-btn lok-display relative flex-1 py-2.5 text-xs font-bold flex flex-col items-center gap-0.5" style={{color:on?T.accent:T.ink,transition:"color .2s ease"}}>
          {on&&<span className="absolute left-1/2 rounded-full" style={{top:4,width:22,height:3,transform:"translateX(-50%)",background:T.accent}} aria-hidden="true"/>}
          <span style={{opacity:on?1:0.6}} aria-hidden="true">{icon}</span>
          <span style={{opacity:on?1:0.7,fontSize:10}}>{label}</span>
        </button>);})}
      </nav>}
      {!focusMode && !showLilLok&&(<div className="fixed z-42" style={{right:14,bottom:116, transition: 'bottom 0.3s ease'}}>
        {fabBubble&&<LilLokBubble text={fabBubble} ink={T.ink} paper={T.paper} voicePack={cosmetics.voicePack}/>}
        {blotSpeech&&<BlotSpeech message={blotSpeech} ink={T.ink} paper={T.paper} onFade={()=>setBlotSpeech("")}/>}
        {floatingTokens.map(t=>(<div key={t.id} className="lok-display fixed" style={{bottom:130,right:30,fontSize:11,fontWeight:700,color:T.accent,pointerEvents:"none",animation:"blotTokenPop 1s ease-out forwards"}}>{t.text}</div>))}
        {giftPop&&(<div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"><div className="text-6xl" style={{animation:"blotGiftPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards"}}>{giftPop}</div></div>)}
        {openingChest&&<ChestOpen chestType={openingChest.type} reward={chestReward} onComplete={()=>setOpeningChest(null)} gyroMotion={featureFlags.enableGyroscope&&featureFlags.gyroChestOpen?gyroMotion:GYRO_ZERO}/>}
        <button ref={fabBounceRef} onClick={()=>{if(fabBounceRef.current){fabBounceRef.current.style.animation="none";setTimeout(()=>{if(fabBounceRef.current)fabBounceRef.current.style.animation=`${phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite, ":""}blotBounce 0.5s ease-out, blotFloat 3s ease-in-out infinite`;},10);}setShowLilLok(true);setFabBubble("");setBlotSpeech(getBlotResponse(cosmetics.blotPersonality,"greet",lillok.name));tapBlot();hap([30]);blip("B5");}} aria-label={`Open LilLok — ${lillok.name} is ${phase}`} className="lok-btn rounded-full flex items-center justify-center" style={{width:60,height:60,background:T.card,...(cosmetics.blotBorder&&cosmetics.blotBorder!=="none"?blotBorderStyle(cosmetics.blotBorder,T):{border:`3px solid ${phase==="critical"?T.accent:phase==="decaying"?"#8E93A8":phase==="stasis"?"#9A9286":T.accent}`,boxShadow:`3px 3px 0 ${T.shadow}`}),animation:phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite":"none",...(showLilLok?{}:{animation:`${phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite, ":""}blotFloat 3s ease-in-out infinite`}),transform:featureFlags.enableGyroscope&&featureFlags.gyroFab&&!showLilLok?`translate(${Math.max(-8,Math.min(8,gyroMotion.gamma*0.06))}px, ${Math.max(-8,Math.min(8,gyroMotion.beta*0.06))}px)`:undefined}}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={46} custom={customLilLok?.art} gear={cosmetics.gear} skin={cosmetics.lillokSkin} aura={cosmetics.lillokAura} pet={cosmetics.lillokPet}/>
          {phase!=="thriving"&&!kids&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full" aria-hidden="true" style={{background:phase==="critical"?"#C23B22":T.accent,border:`2px solid ${T.card}`}}/>}
          {evoStage>0&&<span className="absolute -bottom-1 -left-1 text-xs" style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,.3))"}} title={`Evolution stage ${evoStage}`}>{evoEmojis[evoStage]}</span>}
        </button>
      </div>)}
      {showLilLok&&<LilLokPanel lillok={lillok} phase={phase} kids={kids} custom={customLilLok} gear={cosmetics.gear} skin={cosmetics.lillokSkin} aura={cosmetics.lillokAura} pet={cosmetics.lillokPet} loks={loks} onFeed={feedLilLok} onFlask={()=>{if(loks<10){say("Need 10 Loks","error");return false;}setLoks(l=>l-10);setTotalSpent(t=>t+10);feedLilLok(40,"flask");say("Ink flask · −10 Loks","success");return true;}} onClose={()=>setShowLilLok(false)} say={say} setLillok={setLillok} onPublish={post=>{setPosts(ps=>[post,...ps]);say("Revival animation published","success");nudgeGuestSave("publish");}} onSaveCustom={c=>{setCustomLilLok(c);setLillok(s=>({...s,name:c.name}));say(`${c.name} is now your LilLok`,"success");}} chests={chests} owned={modules} modules={modules} cosmetics={cosmetics} goggles={goggles} setLoks={setLoks} setModules={setModules} setCosmetics={setCosmetics} setGoggles={setGoggles} setChests={setChests} setTotalEarned={setTotalEarned} gyroMotion={featureFlags.enableGyroscope&&featureFlags.gyroLilLokPanel?gyroMotion:GYRO_ZERO}/>}
      {openIdx!==null&&posts[openIdx]&&(<Viewer posts={posts} index={openIdx} bookmarks={bookmarks} cosmetics={cosmetics} gyroMotion={featureFlags.enableGyroscope&&featureFlags.gyroGalleryCards?gyroMotion:GYRO_ZERO} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in");}} onClose={()=>setOpenIdx(null)} onNav={d=>setOpenIdx(i=>Math.min(posts.length-1,Math.max(0,i+d)))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped");}} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);}} onViewed={id=>{const p=posts.find(x=>x.id===id);if(p.viewed)return;patchPost(id,{viewed:true,views:(p.views||0)+1});addLoks(3);gainXp(3);questTick("view");say("Full slide-through · +3 Loks");}} onShare={sharePost} onDelete={id=>{setPosts(ps=>ps.filter(p=>p.id!==id));setOpenIdx(null);say("Post deleted");}} onRename={(id,title)=>patchPost(id,{title})} onPatch={patchPost} onEditInStudio={editInStudio} myName={profile.name} onRemix={post=>{const r={id:"new-remix-"+Date.now(),title:"Remix: "+post.title,frames:[...post.frames],frameDurations:post.frameDurations?[...post.frameDurations]:undefined,paceMs:post.paceMs||160,mode:post.mode||"A",style:post.style||"bold",loop:post.loop,from:"studio",author:profile.name,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0}};setPosts(ps=>[r,...ps]);setOpenIdx(null);editInStudio(r);}}/>)}
      {showHint&&tab==="feed"&&(<button onClick={()=>setShowHint(false)} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss hint">Slide a post down to play it · ▲ to vote · tap to dismiss</button>)}
      {showGuestPrompt&&<GuestSavePrompt reason={showGuestPrompt} guestDays={featureFlags.guestReminderDays||7} onSignIn={auth.signInWithEmail} onMint={mintGuestPassCode} onSetDays={n=>{setFeatureFlags(f=>({...f,guestReminderDays:n}));store.set("lok:flags",{...featureFlags,guestReminderDays:n});}} onClose={()=>setShowGuestPrompt(null)}/>}
      {showOnboard&&<Onboard defaultName={profile.name} canInstall={!!installEvt} onInstallClick={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("LokBook added to your home screen!","success");}catch{}setInstallEvt(null);}}} onName={n=>{const clean=(n||"").trim();if(!clean)return;if(isReservedName(clean)){const alt=suggestHandle(clean,profile.avatarSeed);say(`"${clean}" is a Lok artist — how about ${alt}?`,"error");setProfile(p=>({...p,name:alt}));return;}setProfile(p=>({...p,name:clean}));}} onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      {comebackCelebration&&(()=>{const styles={confetti:{},inkbloom:{},starburst:{}};const cs=styles[comebackCelebration]||styles.confetti;const colors=[T.accent,T.alt,"#E8B14B","#FF5DA2","#2FA9A0","#fff"];return(<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.2)",animation:"lokrise .3s ease",pointerEvents:"auto"}} onClick={()=>{setComebackCelebration(null);setLoks(l=>l+25);setTotalEarned(t=>t+25);say("+25 Loks for coming back!","success");}}>
        <div className="text-center pointer-events-none" style={{animation:"lokfloat 1.5s ease-in-out infinite"}}>
          <div className="lok-display text-5xl font-extrabold" style={{color:"#fff",textShadow:`0 0 40px ${T.accent}, 0 0 80px ${T.accent}55, 0 4px 8px rgba(0,0,0,0.5)`}}>💎 +1000 Loks!</div>
          <div className="mt-2 lok-display text-xl font-extrabold" style={{color:T.paper,textShadow:"0 2px 8px rgba(0,0,0,0.6)"}}>You took a real break!</div>
          <div className="mt-4 px-4 py-2 rounded-xl inline-block pointer-events-auto" style={{background:T.ink,color:T.paper,border:"3px solid #fff",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setComebackCelebration(null);setLoks(l=>l+25);setTotalEarned(t=>t+25);const ls=Object.values(LILLOK_SPEECH.comeback_award);say(ls[Math.floor(Math.random()*ls.length)]+" +25 Loks!","success");}}>☁️ Click for +25 Loks!</div>
          <div className="flex justify-center gap-2 mt-4">{Array.from({length:comebackCelebration==="starburst"?20:comebackCelebration==="confetti"?16:12}).map((_,i)=>(<div key={i} className="rounded-full" style={{width:6+(i%3)*2,height:6+(i%3)*2,background:colors[i%colors.length],animation:`lokfloat ${0.5+Math.random()*0.8}s ease-in-out ${i*0.05}s infinite`,opacity:0.7+Math.random()*0.3}}/>))}</div>
        </div>
      </div>);})()}
      <div className="fixed left-1/2 z-50 flex flex-col-reverse items-center gap-2" style={{bottom:focusMode?20:100,transform:"translateX(-50%)",pointerEvents:"none",transition:"bottom .3s ease"}}>
        {toasts.map((t,i)=>(<div key={t.id} className="px-4 py-2 rounded-xl font-bold text-center" style={{background:t.type==="success"?T.alt:t.type==="error"?"#C23B22":T.ink,color:T.paper,border:`2.5px solid ${t.type==="success"?T.alt:T.accent}`,animation:"lokrise .2s ease",opacity:1-i*0.18,transform:`scale(${1-i*0.04}) translateY(${i*-4}px)`,maxWidth:"88vw",fontSize:13}}>{t.msg}</div>))}
      </div>
    </div>
  </ThemeCtx.Provider>);
}

function Loader({gyroMotion=GYRO_ZERO,enableGyroscope=true,showLokinButton=true,onLokinClick}){
  const logoRef=useRef(null);const pos=useRef({x:0,y:0,px:0,py:0,vx:0,vy:0,down:false});const[showButton,setShowButton]=useState(false);
  useEffect(()=>{const el=logoRef.current;if(!el)return;
    const onMove=e=>{pos.current.x=e.clientX;pos.current.y=e.clientY;};
    const onDown=()=>{pos.current.down=true;};const onUp=()=>{pos.current.down=false;};
    window.addEventListener("pointermove",onMove);window.addEventListener("pointerdown",onDown);window.addEventListener("pointerup",onUp);
    const stop=pacedLoop(()=>{
      let x=pos.current.x,y=pos.current.y;
      // Apply gyroscope motion if enabled
      if(enableGyroscope&&(gyroMotion.gamma||gyroMotion.beta)){const gx=Math.max(-90,Math.min(90,gyroMotion.gamma))*2;const gy=Math.max(-45,Math.min(45,gyroMotion.beta))*4;x=window.innerWidth/2+gx;y=window.innerHeight/2+gy;}
      const {px,py,vx,vy,down}=pos.current;const rect=el.getBoundingClientRect();
      const targetX=x-rect.left-rect.width/2;const targetY=y-rect.top-rect.height/2;
      const ax=(targetX-px)*0.15;const ay=(targetY-py)*0.15;
      pos.current.vx=(vx+ax)*0.86;pos.current.vy=(vy+ay)*0.86;
      pos.current.px+=pos.current.vx;pos.current.py+=pos.current.vy;
      el.style.transform=`perspective(500px) rotateY(${pos.current.px/24}deg) rotateX(${-pos.current.py/24}deg) scale(${down?0.9:1})`;
    });
    return()=>{window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerdown",onDown);window.removeEventListener("pointerup",onUp);stop();};
  },[enableGyroscope,gyroMotion]);

  useEffect(()=>{
    const timer=setTimeout(()=>setShowButton(true),2000);
    return()=>clearTimeout(timer);
  },[]);

  return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:ART.paper,color:ART.ink,fontFamily:"'Bricolage Grotesque',system-ui,sans-serif"}}>
    <style>{`@keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}} @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}} @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    <div ref={logoRef} className="relative" style={{animation:"inkdrop .7s cubic-bezier(.34,1.56,.64,1) forwards",marginBottom:20, width: 64, height: 64, transition: 'transform 0.1s ease-out'}}>
      <div className="absolute" style={{left: 5, top: 5}}><svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="37" cy="37" rx="18" ry="18" fill={ART.pink} opacity="0.55"/></svg></div>
      <div className="absolute"><svg width="64" height="64" viewBox="0 0 64 64"><path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill="none" stroke={ART.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill={ART.ink} opacity="0.08"/></svg></div>
    </div>
    <div style={{fontWeight:800,fontSize:26,letterSpacing:"-0.02em",animation:"inkfade .5s .3s ease both"}}>LokBook</div>
    <div style={{fontSize:13,opacity:0.5,marginTop:6,animation:"inkfade .5s .5s ease both"}}>loading your ink…</div>
    <div style={{display:"flex",gap:6,marginTop:20,animation:"inkfade .5s .7s ease both"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:ART.ink,animation:`inkpulse 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
    {showButton&&showLokinButton&&(<button onClick={onLokinClick} className="lok-btn lok-display" style={{marginTop:32,paddingLeft:24,paddingRight:24,paddingTop:12,paddingBottom:12,borderRadius:16,fontWeight:800,fontSize:16,background:ART.ink,color:ART.paper,border:`3px solid ${ART.ink}`,cursor:"pointer",animation:"lokinAppear 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",boxShadow:"0 8px 0 rgba(0,0,0,0.15)",transition:"all 0.2s ease"}} onMouseEnter={e=>{e.target.style.transform="translateY(-4px)";e.target.style.boxShadow="0 12px 0 rgba(0,0,0,0.2)";}} onMouseLeave={e=>{e.target.style.transform="translateY(0)";e.target.style.boxShadow="0 8px 0 rgba(0,0,0,0.15)";}} aria-label="Enter LokBook">Lok In</button>)}
  </div>);
}
