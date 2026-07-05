import {
  useState, useEffect, useRef, useCallback, useMemo, createContext, useContext,
  forwardRef, useImperativeHandle
} from "react";

import { THEMES, SKIN_WAVE_GATE, SKIN_WAVE_3_GATE, SKIN_WAVE_4_GATE, ThemeCtx, useT, ART } from "./theme/theme.js";
import {
  W, H, PROMPTS, WEEKLY_PROMPT, SUPA_URL, SUPA_KEY, PACE_PRESETS,
  BLOT_BORDERS, FOD_WINDOW_DAYS, ANIMATED_AVATAR_SPEND, ADS, QUEST_POOL,
  NAME_COLOR_MAP, REACTION_SETS, LILLOK_SPEECH, EMPTY_ICONS, REVIVAL_MAX,
  PX_PER_FRAME, BLENDS, FORMATS, KID_PROMPTS, BOT_NAMES, INTERVENTIONS,
  MODES, WAGERS, FRONT_NAMES, EFFECTS, NAME_COLORS, FRAMES, REACTION_PACKS,
  AVATAR_ACCENTS, PAPERS, LILLOK_GEAR, STUDIO_MODULES, getModuleLayers, hasModule, getModule, getModuleTypes, blotBorderStyle, makeQuests, founderSignup, OFFLINE_BONUS_HOURS, OFFLINE_BONUS_LOKS, SKIES,
  lokApi, toDbPost, fromDbPost, supabase, BADGES, BADGE_CATEGORIES, GAME_MANUAL_PAGES, ECHO_EXPIRY_HOURS, ECHO_SHARE_TEXT, TIDE_CANDIDATE_COUNT, EVENTS, getActiveEvent, STRIPE_PK
} from "./constants.jsx";
import * as auth from "./auth/auth.js";
import { paperBase, risoCircle, drawBounce, drawBloom, drawNight, drawOrbit, drawWalk, drawRain, drawFish, drawBurst, drawWave, drawSpiral, drawPulse, drawFirework, drawMorph, compressFrame, renderSequence, makeRng, makeDoodlePainter, renderDoodle, renderAvatar, polyPts, starPts, ellipsePts, linePts, traceShape, MiniDraw } from "./engine/draw.jsx";
import { lilLokPhase, getLilLokLine } from "./engine/lillok.js";
import { encodeGIF } from "./engine/gif.js";
import { makeMatchBots, botProgress, botFinalT, botLine, judgeBattle, recordBattle, makeRushRivals, rushScore, recordRush } from "./engine/bots.js";
import NameTag from "./NameTag.jsx";
import { FramedAvatar, ReactionIcon, PageEffect, GlobalStyle, SkyEffect } from "./art.jsx";
import LilLokPanel, { LilLokBubble, LilLokSprite } from "./LilLok.jsx";
import InterventionFX from "./InterventionFX.jsx";
import EmptyState, { Empty } from "./EmptyState.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { useFeedback } from "./hooks/useFeedback.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mem = new Map();
if(typeof window!=="undefined"&&!window.storage){
  window.storage={
    async get(k){try{const r=localStorage.getItem(k);return r?{value:r}:null;}catch{return null;}},
    async set(k,v){try{localStorage.setItem(k,v);return true;}catch{return false;}},
  };
}
const store = {
  async get(k) {
    try { if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } } catch {}
    return mem.has(k) ? mem.get(k) : null;
  },
  async set(k, v) {
    mem.set(k, v);
    try { if (typeof window !== "undefined" && window.storage) await window.storage.set(k, JSON.stringify(v)); return true; } catch { return false; }
  },
};
const SAVE_KEY = "lok:save:v2"; const GALLERY_KEY = "lok:gallery:v2";







function Onboard({onDone,onName}){
  const T=useT();const[step,setStep]=useState(0);const[name,setName]=useState("");
  const steps=[{t:"What should we call you?",d:"This is your artist name on LokBook. You can change it later in You → Edit."},{t:"Welcome to LokBook",d:"A home for tiny hand-drawn animations. Slide down any post to flip through its pages."},{t:"Lok what you love",d:"Lok artists to follow them, vote on pieces, and bookmark favorites — creators earn Loks from your attention. Tap any artist's name to visit their page."},{t:"It's a party feed",d:"Everyone here shares one Discover feed — publish a flip and the whole room sees it. Want to keep your stuff? Make a Lok account in You → ⚙ (handle + PIN, 10 seconds)."},{t:"Draw, battle, earn",d:"Make flips in Studio, go head-to-head in Battle, grab prompts in Rush. Turn on sound 🎵 for best experience."},{t:"Meet your LilLok",d:"A living-ink buddy that grows with you. Here are 50 Loks to begin — have fun."}];
  const s=steps[step];
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.55)"}}>
    <div className="w-full rounded-3xl p-6 text-center" style={{maxWidth:420,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${T.accent}`,animation:"lokrise .3s ease"}}>
      <div className="lok-display text-2xl font-extrabold mb-2" style={{color:T.accent}}>{s.t}</div>
      <p className="text-sm leading-snug">{s.d}</p>
      {step===0&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your artist name" aria-label="Artist name" autoFocus className="mt-3 w-full px-4 py-2.5 rounded-xl text-center font-bold text-sm" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}} onKeyDown={e=>e.key==="Enter"&&setStep(1)}/>}
      <div className="flex justify-center gap-1.5 my-4">{steps.map((_,i)=>(<div key={i} style={{width:i===step?22:8,height:6,borderRadius:4,background:i<=step?T.accent:T.shadow,transition:"width .2s"}}/>))}</div>
      <button onClick={()=>{if(step===0){onName&&onName(name||"Artist");}step<steps.length-1?setStep(step+1):onDone();}} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>{step===0?"Set name →":step<steps.length-1?"Next":"Claim 50 Loks & start"}</button>
      {step<steps.length-1&&<button onClick={onDone} className="mt-2 text-xs font-bold underline opacity-60">skip</button>}
    </div>
  </div>);
}

function Feed({posts,bookmarks,following,feedMode,setFeedMode,cosmetics={},daily,streak,dailyClaimed,flipOfDay,onLine,onClaimDaily,onOpen,onVote,onLok,onBookmark,onArtist,onReact,onEcho,tides,onVoteTide,activeEvent,eventClaimed,onClaimEvent,say,loadingMore,onLoadMore}){
  const T=useT();const[active,setActive]=useState(0);const wrapRef=useRef(null);
  const list=(feedMode==="following"?posts.filter(p=>following.includes(p.author)):posts).sort((a,b)=>(b.boostedAt||0)-(a.boostedAt||0));
  const streakCol=streak>=30?"#E8B14B":streak>=7?T.accent:streak>=3?T.alt:T.ink;
  const onScroll=()=>{const el=wrapRef.current;if(!el)return;const i=Math.round(el.scrollTop/el.clientHeight);if(i!==active){setActive(i);if(Math.random()<0.22&&onLine)onLine("feed_scroll");}};
  return(<div>
    {flipOfDay&&feedMode==="discover"&&(<button onClick={()=>onOpen(flipOfDay.id)} aria-label={`Flip of the Day: ${flipOfDay.title}`} className="lok-btn mt-3 w-full flex items-center gap-3 p-2.5 rounded-2xl text-left" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:"5px 5px 0 #E8B14B"}}>
      {flipOfDay.frames?.[0]&&<img src={flipOfDay.frames[Math.floor(flipOfDay.frames.length/2)]} alt="" className="rounded-lg shrink-0" style={{width:46,aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/>}
      <div className="min-w-0 flex-1"><div className="text-[10px] font-extrabold uppercase tracking-widest" style={{color:"#B8860B"}}>✦ Flip of the Day</div><div className="lok-display font-extrabold text-sm truncate">{flipOfDay.title}</div></div>
      <span className="lok-display font-extrabold text-sm shrink-0" style={{color:T.accent}}>{flipOfDay.votes} ▲</span>
    </button>)}
    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-center rounded-xl shrink-0" style={{width:44,height:44,background:streakCol,color:"#fff",border:`2.5px solid ${T.ink}`,transition:"background .3s ease"}}><span className="lok-display font-extrabold text-lg">{streak}</span></div>
      <div className="flex-1 min-w-0"><div className="font-bold text-sm leading-tight">Daily streak · {streak} {streak===1?"day":"days"}</div><div className="text-xs opacity-70 truncate">Today: "{daily.prompt}"</div></div>
      <button onClick={onClaimDaily} disabled={dailyClaimed} aria-label={dailyClaimed?"Daily already claimed":"Claim daily bonus"} className="lok-btn shrink-0 lok-display px-3 py-2 rounded-xl text-sm font-extrabold" style={{background:dailyClaimed?"transparent":T.ink,color:dailyClaimed?T.ink:T.paper,border:`2.5px solid ${T.ink}`,opacity:dailyClaimed?0.55:1}}>{dailyClaimed?"Claimed ✓":"Claim"}</button>
    </div>
    {tides?.loaded&&feedMode==="discover"&&(<div className="mt-2 p-2.5 rounded-2xl" style={{border:`2px dashed ${T.alt}`,background:T.card}}><div className="flex items-center gap-1.5 mb-1.5"><span className="text-sm">🌊</span><span className="font-bold text-[11px]">Tides — vote for tomorrow's prompt</span></div><div className="flex gap-1.5">{tides.candidates.map(c=>(<button key={c} disabled={tides.voted} onClick={()=>onVoteTide(c)} className="lok-btn flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold leading-tight" style={{border:`2px solid ${tides.voted?T.shadow:T.ink}`,background:tides.myVote===c?T.alt:tides.voted?T.paper:T.paper,color:tides.myVote===c?"#fff":T.ink,opacity:tides.voted&&tides.myVote!==c?0.4:1}}>{c}{tides.myVote===c&&" ✓"}</button>))}</div>{tides.voted&&<div className="text-[10px] opacity-60 mt-1">Your vote saved — results tomorrow</div>}</div>)}
    {activeEvent&&feedMode==="discover"&&(<div className="mt-2 p-3 rounded-2xl" style={{border:`3px solid ${T.accent}`,background:T.ink,color:T.paper,boxShadow:`4px 4px 0 ${T.accent}`}}><div className="flex items-center gap-2"><span className="text-xl">{activeEvent.icon}</span><div><div className="lok-display font-extrabold text-sm">{activeEvent.name}</div><div className="text-[10px] opacity-70">ends {activeEvent.end}</div></div></div><div className="mt-1.5 text-sm leading-snug opacity-90">✨ Today: "{activeEvent.prompt}"</div><button disabled={eventClaimed===activeEvent.id} onClick={onClaimEvent} className="lok-btn lok-display mt-2 w-full py-2 rounded-xl text-sm font-extrabold" style={{background:eventClaimed===activeEvent.id?"transparent":T.accent,color:eventClaimed===activeEvent.id?T.paper:T.onAccent,border:`2px solid ${T.paper}`,opacity:eventClaimed===activeEvent.id?0.6:1}}>{eventClaimed===activeEvent.id?"Claimed ✓":`Claim · +${activeEvent.reward} Loks`}</button></div>)}
    <div className="mt-3 flex gap-2">{[["discover","Discover"],["following","Following"]].map(([id,l])=>(<button key={id} onClick={()=>setFeedMode(id)} className="lok-btn flex-1 py-2 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:feedMode===id?T.ink:T.card,color:feedMode===id?T.paper:T.ink}}>{l}</button>))}</div>
    {list.length===0?(
      feedMode==="following"
        ?<EmptyState icon="follow" title="No one yet" subtitle="Lok artists you love and their flips show up here." action="Discover artists →" onAction={()=>setFeedMode("discover")}/>
        :<EmptyState icon="feed" title="No art yet" subtitle="Be the first to publish a flip!"/>
    ):(
      <div ref={wrapRef} onScroll={onScroll} className="mt-3 -mx-4" style={{height:"calc(100dvh - 300px)",minHeight:360,overflowY:"scroll",scrollSnapType:"y mandatory"}}>
        {list.map((p,i)=>(<FeedCard key={p.id} p={p} live={i===active} marked={bookmarks.includes(p.id)} following={following} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark} onArtist={onArtist} onReact={onReact} onEcho={onEcho}/>))}
        {onLoadMore&&feedMode==="discover"&&<div className="flex justify-center py-4" style={{scrollSnapAlign:"start"}}><button onClick={onLoadMore} disabled={loadingMore} className="lok-btn px-6 py-3 rounded-xl text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink,opacity:loadingMore?0.5:1}}>{loadingMore?"Loading…":"Load more"}</button></div>}
      </div>
    )}
  </div>);
}

function FeedCard({p,live,marked,following=[],cosmetics={},onOpen,onVote,onLok,onBookmark,onArtist,onReact,onEcho}){
  const T=useT();const[fi,setFi]=useState(0);const[pop,setPop]=useState(false);
  const author=p.author||"moss.ink";const loked=following.includes(author);
  useEffect(()=>{if(!live||p.frames.length<2){setFi(0);return;}const t=setInterval(()=>setFi(f=>(f+1)%p.frames.length),p.paceMs||160);return()=>clearInterval(t);},[live,p.id,p.paceMs,p.frames.length]);
  const doVote=()=>{onVote(p.id);if(!p.voted){setPop(true);setTimeout(()=>setPop(false),320);}};
  if(!p.frames||p.frames.length===0)return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}><div className="relative mx-auto rounded-2xl overflow-hidden flex items-center justify-center" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,aspectRatio:"4/5"}}><div className="text-center opacity-40"><div className="lok-display font-extrabold text-lg">{p.title}</div><div className="text-sm mt-1">Rendering…</div></div></div></div>);
  return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}>
    <div className="relative mx-auto rounded-2xl overflow-hidden" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,boxShadow:live?`7px 7px 0 ${T.accent}`:`6px 6px 0 ${T.shadow}`,transform:live?"scale(1)":"scale(.97)",transition:"transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease"}}>
      <button onClick={()=>onOpen(p.id)} className="block w-full" aria-label={`Open ${p.title}`}><img src={p.frames[fi]} alt={p.title} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/></button>
      {p.frames.length>1&&<div className="absolute top-0 left-0 right-0 h-1" style={{background:"rgba(0,0,0,.15)"}}><div style={{width:`${((fi+1)/p.frames.length)*100}%`,height:"100%",background:T.accent,transition:"width .12s linear"}}/></div>}
      <div className="absolute left-0 right-0 bottom-0 p-3 flex items-end gap-2" style={{background:"linear-gradient(transparent, rgba(0,0,0,.6))"}}>
        <div className="flex-1 text-white min-w-0"><div className="lok-display font-extrabold leading-tight truncate">{p.title}</div><div className="text-xs opacity-90"><button onClick={()=>onArtist&&onArtist(author)} aria-label={`View ${author}'s page`} style={{background:"transparent",border:"none",padding:0,textDecoration:"underline",cursor:"pointer"}}><NameTag name={author} color={cosmetics.nameColor} style={{color:"#fff"}}/></button> · {p.from==="revival"?"revival loop":p.from==="battle"?"battle piece":p.mode==="B"?"page-flip":"flipbook"}</div></div>
        <button onClick={()=>onReact(p.id,"humhah")} aria-label="HumHah" className="lok-btn shrink-0 px-2 py-1 rounded-full text-xs font-extrabold" style={{border:`2px solid ${T.ink}`,color:"#fff",background:"rgba(255,255,255,.15)",backdropFilter:"blur(4px)"}}>😄 {p.reactions.humhah||0}</button>
        <button onClick={()=>onReact(p.id,"bomhogwah")} aria-label="BomHogWah" className="lok-btn shrink-0 px-2 py-1 rounded-full text-xs font-extrabold" style={{border:`2px solid ${T.ink}`,color:"#fff",background:"rgba(255,255,255,.15)",backdropFilter:"blur(4px)"}}>😮 {p.reactions.bomhogwah||0}</button>
        <button onClick={()=>onLok(author)} aria-label={loked?"Already Lok'd":"Lok this artist"} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold" style={{background:loked?"rgba(255,255,255,.92)":T.accent,color:loked?T.ink:T.onAccent,border:"2px solid #fff"}}>{loked?"Lok'd ✓":"Lok"}</button>
      </div>
      <div className="absolute right-2 bottom-16 flex flex-col gap-2 items-center">
        <button onClick={doVote} aria-label={`Vote — ${p.votes} votes`} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-extrabold" style={{background:p.voted?T.accent:"rgba(255,255,255,.92)",color:p.voted?T.onAccent:T.ink,border:`2.5px solid ${T.ink}`,animation:pop?"lokpop .32s ease":"none"}}>▲</button>
        <span className="text-white text-xs font-bold lok-count" key={p.votes} style={{textShadow:"0 1px 3px #000"}}>{p.votes}</span>
        <button onClick={()=>onBookmark(p.id)} aria-label={marked?"Remove bookmark":"Bookmark this flip"} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center" style={{background:marked?T.accent:"rgba(255,255,255,.92)",border:`2.5px solid ${T.ink}`}}><ReactionIcon type="heart" size={22}/></button>
        <button onClick={()=>onOpen(p.id)} aria-label="Open full viewer" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{background:"rgba(255,255,255,.92)",color:T.ink,border:`2.5px solid ${T.ink}`}}>▾</button>
        {onEcho&&<button onClick={()=>onEcho(p)} aria-label="Echo share" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-bold" style={{background:"rgba(255,255,255,.85)",color:T.ink,border:`2.5px solid ${T.ink}`}} title="sHare/dOwLNoALD bEfOre iT eCHoS aWay!!">↻</button>}
      </div>
    </div>
    <div className="text-center text-xs opacity-50 mt-2">scroll for more{p.echoParent?" · echo from @"+p.author:""} · tap ▾ to slide through</div>
  </div>);
}

function Viewer({posts,index,bookmarks,cosmetics={},onBookmark,onClose,onNav,onVote,onReact,onViewed,onEcho,onDelete,onRename,onBoost,myName=""}){
  const T=useT();const post=posts[index];const n=post.frames.length;const isB=post.mode==="B";const series=post.style==="series";
  const scrollRef=useRef(null);const[fi,setFi]=useState(0);const[playing,setPlaying]=useState(false);const[floats,setFloats]=useState([]);const[editT,setEditT]=useState(false);const[tDraft,setTDraft]=useState(post.title);const playRef=useRef(null);const touch=useRef(null);const marked=bookmarks.includes(post.id);const own=post.from!=="seed"&&!post.id?.startsWith("seed")&&!post.remote;
  useEffect(()=>{if(typeof playRef.current!=="number")clearInterval(playRef.current);playRef.current=null;setFi(0);setPlaying(false);setEditT(false);setTDraft(post.title);if(scrollRef.current)scrollRef.current.scrollTop=0;},[index]);
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
  useEffect(()=>()=>{if(typeof playRef.current==="number")playRef.current=null;else clearInterval(playRef.current);playRef.current=null;},[]);
  const react=type=>{onReact(post.id,type);const id=Math.random();const pack=REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;const icon=pack[["splat","heart","drip"].indexOf(type)]||type;setFloats(f=>[...f,{id,type:icon,x:14+Math.random()*60}]);setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==id)),950);};
  if(!post.frames||post.frames.length===0)return(<div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{background:T.ink,color:T.paper}}><div className="lok-display text-xl font-extrabold">Rendering…</div><button onClick={onClose} className="mt-6 lok-btn px-4 py-2 rounded-xl font-bold" style={{border:`2px solid ${T.paper}`}} aria-label="Close viewer">Close</button></div>);
  return(<div className="fixed inset-0 z-50 flex flex-col" style={{background:series?T.paper:T.ink}}>
    <div className="flex items-center gap-3 px-3 py-2.5" style={{color:series?T.ink:T.paper}}>
      <button onClick={onClose} aria-label="Close viewer" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${series?T.ink:T.paper}`}}>✕</button>
      <div className="min-w-0 flex-1">{editT
        ?<input value={tDraft} onChange={e=>setTDraft(e.target.value)} onBlur={saveT} onKeyDown={e=>{if(e.key==="Enter")saveT();if(e.key==="Escape"){setTDraft(post.title);setEditT(false);}}} autoFocus aria-label="Rename this flip" className="lok-display font-extrabold leading-tight w-full" style={{background:"transparent",border:"none",borderBottom:`2px solid ${T.accent}`,color:series?T.ink:T.paper,outline:"none",fontSize:"inherit"}}/>
        :<div className="lok-display font-extrabold leading-tight truncate" onClick={()=>own&&setEditT(true)} style={{cursor:own?"text":"default"}} title={own?"Tap to rename":undefined}>{post.title}{own&&<span style={{opacity:0.4,fontSize:11,marginLeft:6}}>✎</span>}</div>}
        <div className="text-xs opacity-75">{post.author||"moss.ink"} · {index+1}/{posts.length} · {isB?"page-flip":"scrub"}</div></div>
      <button onClick={()=>onBookmark(post.id)} aria-label={marked?"Remove bookmark":"Lok in this piece"} className="lok-btn ml-auto px-2.5 py-1 rounded-lg text-sm font-bold" style={{background:marked?T.accent:"transparent",color:marked?T.onAccent:(series?T.ink:T.paper),border:`2.5px solid ${marked?T.accent:(series?T.ink:T.paper)}`}}>{marked?"Lok'd ✓":"Lok in ▾"}</button>
    </div>
    <div className="relative flex-1 min-h-0" onTouchStart={e=>(touch.current=e.touches[0].clientX)} onTouchEnd={e=>{if(touch.current==null)return;const dx=e.changedTouches[0].clientX-touch.current;if(Math.abs(dx)>60)onNav(dx<0?1:-1);touch.current=null;}}>
      <div ref={scrollRef} onScroll={isB?undefined:onScroll} className="absolute inset-0 overflow-y-scroll">
        {isB?(<div className="px-3 py-4 flex flex-col items-center gap-3">{post.frames.map((f,k)=>(<div key={k} className="relative w-full" style={{maxWidth:360}}><img src={f} alt={`page ${k+1}`} className="block w-full rounded-xl" style={{border:`4px solid ${series?T.ink:T.paper}`,boxShadow:series?"none":"0 8px 28px rgba(0,0,0,.4)"}}/><div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-bold" style={{background:series?T.ink:T.accent,color:"#fff"}}>{String(k+1).padStart(2,"0")}</div></div>))}<div className="text-xs font-bold opacity-60 py-2" style={{color:series?T.ink:T.paper}}>↑ scroll the whole page ↑</div></div>):(
          <><div className="sticky top-0 flex items-center justify-center p-3" style={{height:"100%"}}><div className="relative" style={{maxHeight:"100%",aspectRatio:"4 / 5"}}>
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
      <button onClick={togglePlay} aria-label={playing?"Pause":"Play"} className="lok-btn px-3 py-2 rounded-xl font-extrabold lok-display" style={{background:T.alt,color:"#fff",border:`3px solid ${series?T.ink:T.paper}`}}>{playing?"Pause":`Play`}</button>
      {!isB&&n>=2&&<button onClick={replay} aria-label="Replay drawing" title="Watch it drawn" className="lok-btn px-2.5 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>↺</button>}
      <button onClick={()=>onVote(post.id)} aria-label={`Vote — ${post.votes}`} className="lok-btn px-3 py-2 rounded-xl font-extrabold lok-display" style={{background:post.voted?"transparent":T.accent,color:post.voted?(series?T.ink:T.paper):T.onAccent,border:`3px solid ${post.voted?(series?T.ink:"rgba(242,237,226,.5)"):(series?T.ink:T.paper)}`}}>{post.voted?`Voted · ${post.votes}`:`Vote · ${post.votes}`}</button>
      {onEcho&&<button onClick={()=>onEcho(post)} aria-label="Echo this flip" className="lok-btn px-2.5 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>↻ Echo{post.echoCount?` (${post.echoCount})`:""}</button>}
      {post.from!=="seed"&&!post.remote&&myName&&onDelete&&<button onClick={()=>{if(window.confirm(`Delete "${post.title}"?`))onDelete(post.id);}} aria-label="Delete" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:"rgba(242,237,226,.7)",background:"transparent"}}>🗑</button>}
      {post.from!=="seed"&&!post.remote&&myName&&!post.boostedAt&&onBoost&&<button onClick={()=>onBoost(post.id,post.title)} aria-label="Boost post" className="lok-btn px-2 py-2 rounded-xl font-bold text-[11px]" style={{border:`2.5px solid ${T.accent}`,color:series?T.ink:T.paper,background:series?"transparent":T.accent}}>🚀 Boost 20</button>}
      <div className="ml-auto flex items-center gap-1.5">{(()=>{const slots=["splat","heart","drip"];const pack=REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;return[...slots.map((slot,k)=>(<button key={slot} onClick={()=>react(slot)} aria-label={`React ${pack[k]}`} className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><ReactionIcon type={pack[k]} size={20}/><span className="text-xs font-bold">{post.reactions[slot]}</span></button>)),<button key="humhah" onClick={()=>react("humhah")} aria-label="React HumHah" className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><span>😄</span><span className="text-xs font-bold">{post.reactions.humhah||0}</span></button>,<button key="bomhogwah" onClick={()=>react("bomhogwah")} aria-label="React BomHogWah" className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><span>😮</span><span className="text-xs font-bold">{post.reactions.bomhogwah||0}</span></button>];})()}</div>
    </div>
  </div>);
}

const Easel=forwardRef(function Easel({modules=[],onionFrames=[],onStroke,paper="plain"},ref){
  const T=useT();const maxLayers=getModuleLayers(modules);
  const hasMarker=hasModule(modules,"brush_marker");const hasChalk=hasModule(modules,"brush_chalk");const hasSym=hasModule(modules,"feat_symmetry");const showPro=hasMarker||hasChalk||hasSym;
  const brushList=[["ink","Ink"]];if(hasMarker)brushList.push(["marker","Marker"]);if(hasChalk)brushList.push(["chalk","Chalk"]);
  const hasTools=modules.some(m=>["tool_spray","tool_glow","tool_watercolor","tool_pattern","tool_shape","tool_gradient","tool_push","tool_smudge","tool_clone","tool_blur","tool_replace","tool_rulers"].includes(m));
  const[layers,setLayers]=useState([{id:1,visible:true,opacity:1,blend:"source-over"}]);
  const[active,setActive]=useState(1);const[tool,setTool]=useState("pen");const[color,setColor]=useState(ART.ink);  const[recentColors,setRecentColors]=useState(()=>{try{const r=localStorage.getItem("lok:recentColors");return r?JSON.parse(r):[];}catch{return[];}});const[size,setSize]=useState(7);const[symmetry,setSymmetry]=useState("none");const[brush,setBrush]=useState("ink");const[cursorPos,setCursorPos]=useState(null);const[zoom,setZoom]=useState(1);const[pan,setPan]=useState({x:0,y:0});const[clonePt,setClonePt]=useState(null);const[shapeMode,setShapeMode]=useState("rect");const[showGuides,setShowGuides]=useState(false);const[anchorPt,setAnchorPt]=useState(null);const[blurAmount,setBlurAmount]=useState(5);  const[refImg,setRefImg]=useState(null);const[refOpacity,setRefOpacity]=useState(0.3);const[smoothStrength,setSmoothStrength]=useState(0.5);const[palette,setPalette]=useState("default");const[canvasSize,setCanvasSize]=useState("default");const isPanning=useRef(false);const panStart=useRef({x:0,y:0});const pinchRef=useRef(null);
  const idRef=useRef(1);const canvases=useRef(new Map());const drawing=useRef(false);const undoStack=useRef([]);const redoStack=useRef([]);const wrapRef=useRef(null);const lastPts=useRef([]);const midPts=useRef([]);const activeLayer=layers.find(l=>l.id===active);
  const toImg=cv=>cv.toDataURL("image/jpeg",0.72);
  useImperativeHandle(ref,()=>({
    composite(pageNum=null){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const ctx=tmp.getContext("2d");paperBase(ctx,pageNum);layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv&&l.visible){ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(cv,0,0);}});ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";return toImg(tmp);},
    blankFrame(){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;paperBase(tmp.getContext("2d"),null);return toImg(tmp);},
    clearAll(){layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv)cv.getContext("2d").clearRect(0,0,W,H);});undoStack.current=[];redoStack.current=[];},
  }));
  const pos=e=>{const r=wrapRef.current.getBoundingClientRect();const vx=e.clientX-r.left,vy=e.clientY-r.top;return[(vx-pan.x)*W/(r.width*zoom),(vy-pan.y)*H/(r.height*zoom)];};
  const pushUndo=()=>{const cv=canvases.current.get(active);if(!cv)return;if(undoStack.current.length>29)undoStack.current.shift();undoStack.current.push({id:active,snap:cv.getContext("2d").getImageData(0,0,W,H)});redoStack.current=[];};
  const dabAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.globalAlpha=brush==="chalk"?0.5:0.09;ctx.fillStyle=color;const dots=brush==="chalk"?6:1;for(let d=0;d<dots;d++){const ox=brush==="chalk"?(Math.random()-.5)*size*1.4:0,oy=brush==="chalk"?(Math.random()-.5)*size*1.4:0;ctx.beginPath();ctx.arc(x+ox,y+oy,tool==="soft"?size*1.8:size*0.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;};
  const sprayAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;const n=20+Math.round(size*3);for(let d=0;d<n;d++){const a=Math.random()*Math.PI*2,r=Math.random()*size;ctx.globalAlpha=0.12+Math.random()*0.15;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,size*0.3+Math.random()*size*0.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;};
  const glowAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";const g=ctx.createRadialGradient(x,y,0,x,y,size*2);g.addColorStop(0,color);g.addColorStop(0.3,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(x,y,size*2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;};
  const watercolorAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.globalAlpha=0.12+Math.random()*0.15;ctx.fillStyle=color;const r=size*0.6+Math.random()*size*0.8;ctx.beginPath();ctx.arc(x+Math.random()*4-2,y+Math.random()*4-2,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;};
  const symXY=(x,y)=>{const o=[[x,y]];if(symmetry==="mirrorX"||symmetry==="quad")o.push([W-x,y]);if(symmetry==="mirrorY"||symmetry==="quad")o.push([x,H-y]);if(symmetry==="quad")o.push([W-x,H-y]);if(symmetry.startsWith("radial")){const n=+symmetry.slice(6),cx=W/2,cy=H/2;for(let i=1;i<n;i++){const a=(i/n)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);o.push([cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}}return o;};
  const brushFn=brush==="spray"?sprayAt:brush==="glow"?glowAt:brush==="watercolor"?watercolorAt:brush==="pattern"?((ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;ctx.globalAlpha=0.15;const ps=[[x-size,y-size],[x,y-size],[x+size,y-size],[x-size,y],[x,y],[x+size,y],[x-size,y+size],[x,y+size],[x+size,y+size]];ps.forEach(([px,py])=>{ctx.fillRect(px,py,size*0.7,size*0.7);});ctx.globalAlpha=1;}):null;
  const stamp=(ctx,x,y,start)=>{
    const pts=symXY(x,y);
    if(brushFn){pts.forEach(([sx,sy])=>brushFn(ctx,sx,sy));return;}
    if(tool==="soft"||brush==="chalk"){pts.forEach(([sx,sy])=>dabAt(ctx,sx,sy));return;}
    if(start){lastPts.current=pts.map(p=>[...p]);midPts.current=pts.map(p=>[...p]);
      ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.fillStyle=color;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;
      pts.forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx,sy,(tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size)/2,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;return;}
    ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=color;ctx.lineWidth=tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;ctx.lineCap="round";ctx.lineJoin="round";
    pts.forEach(([sx,sy],i)=>{const lp=lastPts.current[i]||[sx,sy];const mp=midPts.current[i]||lp;const nmx=(lp[0]+sx)/2,nmy=(lp[1]+sy)/2;ctx.beginPath();ctx.moveTo(mp[0],mp[1]);ctx.quadraticCurveTo(lp[0],lp[1],nmx,nmy);ctx.stroke();midPts.current[i]=[nmx,nmy];lastPts.current[i]=[sx,sy];});
    ctx.globalAlpha=1;
  };
  const fillLayer=ctx=>{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;ctx.fillRect(0,0,W,H);};
  const eyedrop=(x,y)=>{for(let i=layers.length-1;i>=0;i--){const cv=canvases.current.get(layers[i].id);if(!cv||!layers[i].visible)continue;const d=cv.getContext("2d").getImageData(Math.floor(x),Math.floor(y),1,1).data;if(d[3]>10){setColorAndRecent(`rgb(${d[0]},${d[1]},${d[2]})`);setTool("pen");return;}}};
  const down=e=>{e.preventDefault();const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;e.currentTarget.setPointerCapture(e.pointerId);if(tool==="eyedrop"){eyedrop(...pos(e));return;}pushUndo();if(tool==="fill"){fillLayer(cv.getContext("2d"));return;}if(tool==="clone"){if(!clonePt){setClonePt(pos(e));return;}const[ox,oy]=clonePt;const[cx,cy]=pos(e);const src=cv.getContext("2d").getImageData(Math.floor(ox),Math.floor(oy),48,60);cv.getContext("2d").putImageData(src,Math.floor(cx)-24,Math.floor(cy)-30);setClonePt(null);return;}if(tool==="shape"){setAnchorPt(pos(e));drawing.current=true;return;}if(tool==="gradient"){setAnchorPt(pos(e));drawing.current=true;return;}drawing.current=true;onStroke&&onStroke();stamp(cv.getContext("2d"),...pos(e),true);};
  const move=e=>{if(!drawing.current&&tool!=="push"&&tool!=="smudge")return;const cv=canvases.current.get(active);if(!cv)return;const ctx=cv.getContext("2d");const p=pos(e);if(tool==="push"){ctx.globalCompositeOperation="source-over";const[x,y]=p;const d=ctx.getImageData(Math.max(0,Math.floor(x)-size),Math.max(0,Math.floor(y)-size),size*2,size*2);ctx.putImageData(d,Math.max(0,Math.floor(x)-size+2),Math.max(0,Math.floor(y)-size+2));return;}if(tool==="smudge"){const[x,y]=p;const rx=Math.max(0,Math.floor(x)-8),ry=Math.max(0,Math.floor(y)-8);const d=ctx.getImageData(rx,ry,20,20);for(let i=0;i<d.data.length;i+=4){d.data[i]=(d.data[i]+d.data[i+4]+d.data[i-4]||d.data[i])/3;d.data[i+1]=(d.data[i+1]+d.data[i+5]+d.data[i-3]||d.data[i+1])/3;d.data[i+2]=(d.data[i+2]+d.data[i+6]+d.data[i-2]||d.data[i+2])/3;}ctx.putImageData(d,rx,ry);return;}if(tool==="shape"||tool==="gradient"){lastPts.current=[[p[0],p[1]]];return;}stamp(ctx,...p,false);};
  const up=()=>{drawing.current=false;if(tool==="shape"&&anchorPt){const cv=canvases.current.get(active);if(cv){const ctx=cv.getContext("2d");const[ax,ay]=anchorPt;const[sx,sy]=lastPts.current[0]||[ax,ay];const x=Math.min(ax,sx),y=Math.min(ay,sy),w=Math.abs(sx-ax),h=Math.abs(sy-ay);ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;if(shapeMode==="ellipse")ctx.beginPath(),ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2),ctx.fill();else ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;}setAnchorPt(null);}if(tool==="gradient"&&anchorPt){const cv=canvases.current.get(active);if(cv){const ctx=cv.getContext("2d");const[ax,ay]=anchorPt;const[sx,sy]=lastPts.current[0]||[ax,ay];const g=ctx.createLinearGradient(ax,ay,sx,sy);g.addColorStop(0,color);g.addColorStop(0.5,color);g.addColorStop(1,T.paper);ctx.globalCompositeOperation="source-over";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}setAnchorPt(null);}lastPts.current=[];midPts.current=[];};
  const undo=()=>{const u=undoStack.current.pop();if(!u)return;const cv=canvases.current.get(u.id);if(cv){redoStack.current.push({id:u.id,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(u.snap,0,0);}};
  const redo=()=>{const r=redoStack.current.pop();if(!r)return;const cv=canvases.current.get(r.id);if(cv){undoStack.current.push({id:r.id,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(r.snap,0,0);}};
  const addLayer=()=>{if(layers.length>=maxLayers)return;const id=++idRef.current;setLayers(ls=>[...ls,{id,visible:true,opacity:1,blend:"source-over"}]);setActive(id);};
  const removeLayer=id=>{if(layers.length<=1)return;canvases.current.delete(id);setLayers(ls=>{const next=ls.filter(l=>l.id!==id);if(active===id)setActive(next[next.length-1].id);return next;});};
  const patchLayer=(id,p)=>setLayers(ls=>ls.map(l=>(l.id===id?{...l,...p}:l)));
  const setColorAndRecent=c=>{setColor(c);if(tool==="eraser")setTool("pen");setRecentColors(r=>[c,...r.filter(x=>x!==c)].slice(0,8));};
  const blurLayer=(ctx,r)=>{const d=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);for(let y=r;y<H-r;y++){for(let x=r;x<W-r;x++){let r2=0,g=0,b=0,a=0,n=0;for(let dy=-r;dy<=r;dy++){for(let dx=-r;dx<=r;dx++){const i=((y+dy)*W+(x+dx))*4;r2+=d.data[i];g+=d.data[i+1];b+=d.data[i+2];a+=d.data[i+3];n++;}}ctx.fillStyle="rgba("+(r2/n|0)+","+(g/n|0)+","+(b/n|0)+","+(a/n)+")";ctx.fillRect(x,y,1,1);}}};
  const replaceColor=(ctx,fromColor)=>{const d=ctx.getImageData(0,0,W,H);let tc;{const m=fromColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);if(m){tc={r:+m[1],g:+m[2],b:+m[3]};}else{const c=document.createElement("canvas").getContext("2d");c.fillStyle=fromColor;c.fillRect(0,0,1,1);const p=c.getImageData(0,0,1,1).data;tc={r:p[0],g:p[1],b:p[2]};}}const R=30;for(let i=0;i<d.data.length;i+=4){const dr=d.data[i]-tc.r,dg=d.data[i+1]-tc.g,db=d.data[i+2]-tc.b;if(dr*dr+dg*dg+db*db<R*R){d.data[i]=255;d.data[i+1]=255;d.data[i+2]=255;}}ctx.putImageData(d,0,0);};
  const PALLETS={default:[ART.ink,ART.pink,ART.teal,"#E8B14B","#7A4FBF","#3E8E4B","#D94040","#5A5A5A","#FF8C42","#C4E8C2","#4EBFFF","#F7D4FF"],pastel:["#A8D8EA","#AA96DA","#FCBAD3","#FFFFD2","#B5EAD7","#FFDAC1","#E0BBE4","#FEC8D8","#D4F0F0","#FCE4EC","#E8D5B7","#C9E4DE"],neon:["#FF00FF","#00FFFF","#FFFF00","#00FF00","#FF6600","#FF0066","#00FF66","#6600FF","#FF3300","#33FF00","#0066FF","#FF0099"],earth:["#8B5A2B","#6B8E23","#556B2F","#A0522D","#CD853F","#8FBC8F","#BC8F8F","#BDB76B","#D2B48C","#9ACD32","#C4A882","#A89070"],ocean:["#006994","#00B4D8","#90E0EF","#CAF0F8","#03045E","#0077B6","#023E8A","#48CAE4","#ADE8F4","#023E8A","#0096C7","#00B4D8"],sunset:["#FF6B6B","#FF8E53","#FECA57","#48DBFB","#FF9FF3","#54A0FF","#FF9F43","#EE5A24","#F368E0","#0ABDE3","#FFC312","#C4E538"]};
  const swatches=hasModule(modules,"feat_palettes")&&PALLETS[palette]?PALLETS[palette]:PALLETS.default;
  return(<div>
    <div ref={wrapRef} className="relative rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4 / 5",cursor:zoom!==1?"grab":"default"}}
      onWheel={e=>{e.preventDefault();const d=e.deltaY>0?-0.1:0.1;const r=wrapRef.current?.getBoundingClientRect();if(!r)return;const mx=(e.clientX-r.left)/r.width,my=(e.clientY-r.top)/r.height;setZoom(z=>{const nz=Math.max(0.25,Math.min(4,z+d));setPan(p=>({x:mx-(mx-p.x)*nz/z,y:my-(my-p.y)*nz/z}));return nz;});}}
      onTouchStart={e=>{if(e.touches.length===2){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pinchRef.current={dist:Math.sqrt(dx*dx+dy*dy),zoom:zoom};}}}
      onTouchMove={e=>{if(e.touches.length===2&&pinchRef.current){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const nd=Math.sqrt(dx*dx+dy*dy);const d=nd/pinchRef.current.dist;const r=wrapRef.current?.getBoundingClientRect();if(!r)return;const mx=((e.touches[0].clientX+e.touches[1].clientX)/2-r.left)/r.width,my=((e.touches[0].clientY+e.touches[1].clientY)/2-r.top)/r.height;setZoom(z=>{const nz=Math.max(0.25,Math.min(4,pinchRef.current.zoom*d));setPan(p=>({x:mx-(mx-p.x)*nz/z,y:my-(my-p.y)*nz/z}));return nz;});}}}
      onTouchEnd={e=>{if(e.touches.length<2)pinchRef.current=null;}}
      onMouseDown={e=>{if(e.button===1){e.preventDefault();isPanning.current=true;panStart.current={x:e.clientX-pan.x,y:e.clientY-pan.y};}}}
      onMouseMove={e=>{if(!isPanning.current)return;setPan({x:e.clientX-panStart.current.x,y:e.clientY-panStart.current.y});}}
      onMouseUp={()=>{isPanning.current=false;}}
      onContextMenu={e=>{if(e.button===1){e.preventDefault();}}}>
      <div style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:"0 0",width:zoom===1?"100%":undefined}}>
      {onionFrames.map((of,i)=>(<img key={i} src={of.src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:of.opacity,mixBlendMode:"multiply"}}/>))}
      {refImg&&<img src={refImg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:refOpacity}}/>}
      {layers.map(l=>(<canvas key={l.id} width={W} height={H} ref={el=>{if(el)canvases.current.set(l.id,el);}} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{opacity:l.opacity,display:l.visible?"block":"none",mixBlendMode:l.blend==="source-over"?"normal":l.blend}}/>))}
      <div className="absolute inset-0" style={{touchAction:"none",cursor:"crosshair"}} role="img" aria-label="Drawing canvas" onPointerDown={down} onPointerMove={e=>{move(e);const r=wrapRef.current?.getBoundingClientRect();if(r)setCursorPos([(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100]);}} onPointerUp={e=>{up();setCursorPos(null);}} onPointerLeave={e=>{up();setCursorPos(null);}}/>
      {cursorPos&&(tool==="pen"||tool==="soft"||tool==="eraser")&&<div aria-hidden="true" className="absolute pointer-events-none" style={{left:`${cursorPos[0]}%`,top:`${cursorPos[1]}%`,width:tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size,height:tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size,borderRadius:"50%",border:`2px solid ${T.accent}`,background:"rgba(255,255,255,.25)",transform:"translate(-50%,-50%)",zIndex:10}}/>}
      {paper==="grid"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:`repeating-linear-gradient(${T.ink}15 0 1px,transparent 1px ${H/10}px),repeating-linear-gradient(90deg,${T.ink}15 0 1px,transparent 1px ${W/10}px)`,zIndex:5}}/>}
      {paper==="dots"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:`radial-gradient(circle,${T.ink}25 1px,transparent 1px)`,backgroundSize:`${W/10}px ${H/10}px`,zIndex:5}}/>}
      {paper==="storyboard"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:[`linear-gradient(${T.ink}20 0 1px,transparent 1px)`,`linear-gradient(90deg,${T.ink}20 0 1px,transparent 1px)`].join(","),backgroundSize:[`100% ${H/3}px`,`${W/2}px 100%`].join(","),zIndex:5}}><div className="absolute left-1/2 top-0 bottom-0" style={{width:1,background:T.ink+"30"}}/><div className="absolute top-[33.33%] left-0 right-0" style={{height:1,background:T.ink+"30"}}/><div className="absolute top-[66.66%] left-0 right-0" style={{height:1,background:T.ink+"30"}}/></div>}
      {paper==="graphite"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{background:`repeating-conic-gradient(${T.ink}08 0% 25%,transparent 0% 50%) 0 0 / 4px 4px`,opacity:0.5,zIndex:5}}/>}
      {(symmetry==="mirrorX"||symmetry==="quad")&&<div aria-hidden="true" className="absolute top-0 bottom-0 pointer-events-none" style={{left:"50%",width:2,background:`repeating-linear-gradient(${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {(symmetry==="mirrorY"||symmetry==="quad")&&<div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none" style={{top:"50%",height:2,background:`repeating-linear-gradient(90deg,${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {symmetry.startsWith("radial")&&<div aria-hidden="true" className="absolute pointer-events-none rounded-full" style={{left:"50%",top:"50%",width:10,height:10,transform:"translate(-50%,-50%)",border:`2.5px solid ${T.accent}`}}/>}
      <div className="absolute top-1.5 left-1.5 lok-display px-2 py-0.5 rounded-md text-xs font-extrabold pointer-events-none" style={{background:"rgba(35,48,107,.85)",color:T.paper,backdropFilter:"blur(3px)"}}>L{layers.findIndex(l=>l.id===active)+1} / {layers.length}</div>
      {canvasSize!=="default"&&(<div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{zIndex:6}}><div style={{width:canvasSize==="story"?"37.5%":canvasSize==="square"?"80%":canvasSize==="wide"?"100%":"100%",height:canvasSize==="story"?"100%":canvasSize==="square"?"80%":canvasSize==="wide"?"56.25%":"100%",border:`2px dashed ${T.accent}`,opacity:0.5}}/></div>)}
    </div>
    {zoom!==1&&<div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold pointer-events-none" style={{background:"rgba(0,0,0,.6)",color:"#fff"}}>{Math.round(zoom*100)}%</div>}
    </div>
    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Layer controls">
      {layers.map((l,i)=>(<div key={l.id} className="shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg" style={{border:`2.5px solid ${l.id===active?T.accent:T.ink}`,background:l.id===active?T.card:"transparent"}}>
        <button onClick={()=>setActive(l.id)} aria-label={`Select layer ${i+1}`} aria-pressed={l.id===active} className="font-bold text-xs px-1" style={{color:T.ink}}>L{i+1}</button>
        <button onClick={()=>patchLayer(l.id,{visible:!l.visible})} aria-label={l.visible?`Hide layer ${i+1}`:`Show layer ${i+1}`} className="text-xs font-bold w-5" style={{color:T.ink,opacity:l.visible?1:0.35}}>{l.visible?"●":"○"}</button>
        {layers.length>1&&<button onClick={()=>removeLayer(l.id)} aria-label={`Delete layer ${i+1}`} className="text-xs font-bold" style={{color:T.accent}}>✕</button>}
      </div>))}
      <button onClick={addLayer} disabled={layers.length>=maxLayers} aria-label="Add layer" className="shrink-0 px-2.5 py-1 rounded-lg font-extrabold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink,opacity:layers.length>=maxLayers?0.35:1,background:T.card}}>+ layer</button>
      {activeLayer&&<label className="shrink-0 flex items-center gap-1.5 text-xs font-bold ml-1" style={{color:T.ink}}>opacity<input type="range" min="0.1" max="1" step="0.05" value={activeLayer.opacity} onChange={e=>patchLayer(active,{opacity:+e.target.value})} style={{accentColor:T.accent,width:64}} aria-label="Layer opacity"/></label>}
    </div>
    {hasModule(modules,"feat_blend")&&activeLayer&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Blend modes">
      <span className="text-xs font-bold opacity-60 shrink-0">blend</span>
      {BLENDS.map(b=>(<button key={b} onClick={()=>patchLayer(active,{blend:b})} aria-pressed={activeLayer.blend===b} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${activeLayer.blend===b?T.accent:T.ink}`,background:activeLayer.blend===b?T.ink:T.card,color:activeLayer.blend===b?T.paper:T.ink}}>{{"source-over":"normal","color-dodge":"dodge","color-burn":"burn","hard-light":"h.light","soft-light":"s.light"}[b]||b}</button>))}
    </div>)}
    <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Tools">
      {[["fill","Fill"],["eyedrop","Eyedrop"]].map(([id,l])=>(<button key={id} onClick={()=>setTool(id)} aria-pressed={tool===id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${tool===id?T.accent:T.ink}`,background:tool===id?T.ink:T.card,color:tool===id?T.paper:T.ink}}>{l}</button>))}
      {showPro&&(<div className="flex items-center gap-1.5"><span className="text-xs font-bold opacity-60 shrink-0">pro</span>
        {brushList.map(([id,l])=>(<button key={id} onClick={()=>{setBrush(id);if(tool==="eraser"||tool==="fill"||tool==="eyedrop")setTool("pen");}} aria-pressed={brush===id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${brush===id?T.accent:T.ink}`,background:brush===id?T.ink:T.card,color:brush===id?T.paper:T.ink}}>{l}</button>))}
        {hasSym&&<select value={symmetry} onChange={e=>setSymmetry(e.target.value)} aria-label="Symmetry mode" className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${symmetry!=="none"?T.accent:T.ink}`,background:symmetry!=="none"?T.ink:T.card,color:symmetry!=="none"?T.paper:T.ink}}>
          <option value="none">No symmetry</option><option value="mirrorX">Mirror X</option><option value="mirrorY">Mirror Y</option><option value="quad">4-Way</option><option value="radial4">Radial 4</option><option value="radial6">Radial 6</option><option value="radial8">Radial 8</option>
        </select>}</div>)}
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Color and tools">
      <div className="flex flex-wrap gap-1.5 items-center">
        {swatches.map(hex=>(<button key={hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Color ${hex}`} aria-pressed={color===hex&&tool!=="eraser"} className="lok-btn w-7 h-7 rounded-full" style={{background:hex,border:`3px solid ${color===hex&&tool!=="eraser"?T.accent:T.ink}`,transform:color===hex&&tool!=="eraser"?"scale(1.18)":"none"}}/>))}
        <label aria-label="Custom color" style={{cursor:"pointer"}}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{border:`3px dashed ${T.ink}`,background:T.card,color:T.ink}}>+</div>
          <input type="color" value={color} onChange={e=>setColorAndRecent(e.target.value)} style={{position:"absolute",opacity:0,width:1,height:1}}/>
        </label>
        {recentColors.map(hex=>(<button key={"r"+hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Recent ${hex}`} className="lok-btn w-5 h-5 rounded-full" style={{background:hex,border:`2px solid ${T.shadow}`}}/>))}
        {hasModule(modules,"feat_palettes")&&<select value={palette} onChange={e=>setPalette(e.target.value)} aria-label="Color palette" className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${palette!=="default"?T.accent:T.ink}`,background:palette!=="default"?T.ink:T.card,color:palette!=="default"?T.paper:T.ink}}>{Object.keys(PALLETS).map(k=><option key={k} value={k}>{k}</option>)}</select>}
      </div>
      {[["pen","Pen"],["soft","Airbrush"],["eraser","Eraser"]].map(([id,l])=>(<button key={id} onClick={()=>setTool(id)} aria-pressed={tool===id} aria-label={l} className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${tool===id?T.accent:T.ink}`,background:T.card,color:T.ink}}>{l}</button>))}
      <label className="flex items-center gap-1.5 text-xs font-bold" style={{color:T.ink}}>
        size<span className="inline-flex items-center justify-center" style={{width:28,height:28}}><span aria-hidden="true" style={{width:Math.max(4,Math.min(24,size)),height:Math.max(4,Math.min(24,size)),borderRadius:"50%",background:tool==="eraser"?"transparent":color,border:`1.5px solid ${T.ink}`,display:"block"}}/></span>
        <input type="range" min="2" max="28" value={size} onChange={e=>setSize(+e.target.value)} style={{accentColor:T.accent,width:56}} aria-label={`Brush size ${size}px`}/>
      </label>
      <button onClick={undo} aria-label="Undo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Undo</button>
      <button onClick={redo} aria-label="Redo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Redo</button>
    </div>
    {hasTools&&(<div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-1" role="toolbar" aria-label="Studio upgrades">
      {hasModule(modules,"tool_spray")&&<button onClick={()=>{setBrush("spray");setTool("pen");}} aria-pressed={brush==="spray"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="spray"?T.accent:T.ink}`,background:brush==="spray"?T.ink:T.card,color:brush==="spray"?T.paper:T.ink}}>Spray</button>}
      {hasModule(modules,"tool_glow")&&<button onClick={()=>{setBrush("glow");setTool("pen");}} aria-pressed={brush==="glow"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="glow"?T.accent:T.ink}`,background:brush==="glow"?T.ink:T.card,color:brush==="glow"?T.paper:T.ink}}>Glow</button>}
      {hasModule(modules,"tool_watercolor")&&<button onClick={()=>{setBrush("watercolor");setTool("pen");}} aria-pressed={brush==="watercolor"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="watercolor"?T.accent:T.ink}`,background:brush==="watercolor"?T.ink:T.card,color:brush==="watercolor"?T.paper:T.ink}}>Watercolor</button>}
      {hasModule(modules,"tool_pattern")&&<button onClick={()=>{setBrush("pattern");setTool("pen");}} aria-pressed={brush==="pattern"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="pattern"?T.accent:T.ink}`,background:brush==="pattern"?T.ink:T.card,color:brush==="pattern"?T.paper:T.ink}}>Pattern</button>}
      {hasModule(modules,"tool_shape")&&<button onClick={()=>setTool(tool==="shape"?"pen":"shape")} aria-pressed={tool==="shape"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="shape"?T.accent:T.ink}`,background:tool==="shape"?T.ink:T.card,color:tool==="shape"?T.paper:T.ink}}>Shape</button>}
      {hasModule(modules,"tool_shape")&&tool==="shape"&&<select value={shapeMode} onChange={e=>setShapeMode(e.target.value)} className="shrink-0 px-1.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`}}><option value="rect">Rect</option><option value="ellipse">Ellipse</option></select>}
      {hasModule(modules,"tool_gradient")&&<button onClick={()=>setTool(tool==="gradient"?"pen":"gradient")} aria-pressed={tool==="gradient"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="gradient"?T.accent:T.ink}`,background:tool==="gradient"?T.ink:T.card,color:tool==="gradient"?T.paper:T.ink}}>Gradient</button>}
      {hasModule(modules,"tool_push")&&<button onClick={()=>setTool(tool==="push"?"pen":"push")} aria-pressed={tool==="push"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="push"?T.accent:T.ink}`,background:tool==="push"?T.ink:T.card,color:tool==="push"?T.paper:T.ink}}>Push</button>}
      {hasModule(modules,"tool_smudge")&&<button onClick={()=>setTool(tool==="smudge"?"pen":"smudge")} aria-pressed={tool==="smudge"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="smudge"?T.accent:T.ink}`,background:tool==="smudge"?T.ink:T.card,color:tool==="smudge"?T.paper:T.ink}}>Smudge</button>}
      {hasModule(modules,"tool_clone")&&<button onClick={()=>{setTool("clone");setClonePt(null);}} aria-pressed={tool==="clone"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="clone"?T.accent:T.ink}`,background:tool==="clone"?T.ink:T.card,color:tool==="clone"?T.paper:T.ink}}>{tool==="clone"&&clonePt?"Stamp·Click":"Clone"}</button>}
      {hasModule(modules,"tool_blur")&&<><button onClick={()=>{const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;pushUndo();blurLayer(cv.getContext("2d"),blurAmount);}} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:"2px solid "+T.ink,background:T.card,color:T.ink}}>Blur×<span> {blurAmount}</span></button>}
      <input type="range" min="1" max="12" value={blurAmount} onChange={e=>setBlurAmount(+e.target.value)} style={{accentColor:T.accent,width:40}} aria-label="Blur radius"/></>}
      {hasModule(modules,"tool_replace")&&<button onClick={()=>{const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;pushUndo();replaceColor(cv.getContext("2d"),color);}} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:"2px solid "+T.ink,background:T.card,color:T.ink}}>Replace&rarr;W</button>}
      {hasModule(modules,"tool_rulers")&&<button onClick={()=>setShowGuides(g=>!g)} aria-pressed={showGuides} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${showGuides?T.accent:T.ink}`,background:showGuides?T.ink:T.card,color:showGuides?T.paper:T.ink}}>Rulers</button>}
      {hasModule(modules,"feat_ref")&&<label className="shrink-0 cursor-pointer"><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setRefImg(ev.target.result);r.readAsDataURL(f);e.target.value="";}} style={{display:"none"}}/><span className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${refImg?T.accent:T.ink}`,background:refImg?T.ink:T.card,color:refImg?T.paper:T.ink}}>{refImg?"Ref ✓":"Ref"}</span></label>}
    </div>)}
    {hasModule(modules,"canvas_sizes")&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" style={{color:T.ink}}>
      <span className="text-[10px] font-bold opacity-60 shrink-0">Size</span>
      {[["default","4:5"],["story","9:16"],["square","1:1"],["wide","16:9"]].map(([id,l])=>(<button key={id} onClick={()=>setCanvasSize(id)} aria-pressed={canvasSize===id} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${canvasSize===id?T.accent:T.ink}`,background:canvasSize===id?T.ink:T.card,color:canvasSize===id?T.paper:T.ink}}>{l}</button>))}
    </div>)}
    {hasModule(modules,"feat_smooth")&&(<div className="mt-1.5 flex items-center gap-1.5" style={{color:T.ink}}>
      <span className="text-[10px] font-bold">Smooth</span>
      <input type="range" min="0" max="1" step="0.1" value={smoothStrength} onChange={e=>setSmoothStrength(+e.target.value)} style={{accentColor:T.accent,width:50}} aria-label="Stroke smoothing"/>
      <span className="text-[10px] opacity-60">{Math.round(smoothStrength*100)}%</span>
    </div>)}
    {refImg&&hasModule(modules,"feat_ref")&&(<div className="mt-1.5 flex items-center gap-2" style={{color:T.ink}}>
      <span className="text-[10px] font-bold">Ref</span>
      <input type="range" min="0.05" max="0.6" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(+e.target.value)} style={{accentColor:T.accent,width:60}} aria-label="Reference opacity"/>
      <button onClick={()=>setRefImg(null)} className="text-[10px] font-bold underline opacity-60">clear</button>
    </div>)}
    {showGuides&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{zIndex:20}}><div style={{position:"absolute",left:"33.33%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",left:"66.66%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",top:"33.33%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",top:"66.66%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}60 0 6px,transparent 6px 12px)`}}/><div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}60 0 6px,transparent 6px 12px)`}}/></div>}
  </div>);
});

function Studio({modules=[],onPublish,say,kids,dailyPrompt,paper="plain",onboarded=false,postCount=0}){
  const T=useT();const easel=useRef(null);
  const maxLayers=getModuleLayers(modules);
  const[tier,setTier]=useState(maxLayers);const[frames,setFrames]=useState(()=>{try{const d=localStorage.getItem("lok:draft:frames");return d?JSON.parse(d):[];}catch{return[];}});const[frameDurations,setFrameDurations]=useState(()=>{try{const d=localStorage.getItem("lok:draft:durations");return d?JSON.parse(d):[];}catch{return[];}});
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(()=>{try{const d=localStorage.getItem("lok:draft:pace");return d?+d:140;}catch{return 140;}});const[title,setTitle]=useState(()=>{try{return localStorage.getItem("lok:draft:title")||"";}catch{return"";}});const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  useEffect(()=>{try{if(frames.length)localStorage.setItem("lok:draft:frames",JSON.stringify(frames));else localStorage.removeItem("lok:draft:frames");}catch{};try{if(frameDurations.length)localStorage.setItem("lok:draft:durations",JSON.stringify(frameDurations));else localStorage.removeItem("lok:draft:durations");}catch{};try{localStorage.setItem("lok:draft:pace",String(paceMs));}catch{};try{title?localStorage.setItem("lok:draft:title",title):localStorage.removeItem("lok:draft:title");}catch{};},[frames,frameDurations,paceMs,title]);
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:i===0?ART.pink:ART.teal,opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length);setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setJustCap(true);setTimeout(()=>setJustCap(false),360);say(`Page ${frames.length+1} captured`);};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});};
  const ready=frames.length>=2;
  return(<div className="mt-4">
    {onboarded&&postCount===0&&(<div className="mb-3 p-3 rounded-2xl flex items-center gap-2 text-sm font-bold" style={{background:T.ink,color:T.paper,border:`3px solid ${T.accent}`,boxShadow:`4px 4px 0 ${T.accent}`}}><span className="text-xl">🎨</span><span>Draw your first flip! Capture 2+ pages then publish to the gallery.</span></div>)}
    <div className="flex items-center justify-between">
      <div><h2 className="lok-display text-xl font-extrabold flex items-center gap-2">Studio{hasModule(modules,"feat_blend")&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PRO</span>}</h2><p className="text-xs opacity-70 mt-0.5">Draw · capture · repeat · publish</p></div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setZen(z=>!z)} aria-pressed={zen} aria-label="Speed Draw mode" title="Hide controls, just draw" className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${zen?T.accent:T.ink}`,background:zen?T.ink:T.card,color:zen?T.paper:T.ink}}>⚡ Speed</button>
        <div className="text-right"><div className="lok-display text-2xl font-extrabold" style={{color:frames.length?T.accent:T.ink}}>{frames.length}</div><div className="text-[10px] font-bold uppercase tracking-widest opacity-60">pages</div></div>
      </div>
    </div>
    {!kids&&activePrompt&&!zen&&(<>
      <div className="mt-2 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}><span style={{opacity:0.6}}>Prompt</span><span style={{color:T.accent}}>"{activePrompt}"</span>{promptPick&&<button onClick={()=>setPromptPick(null)} aria-label="Back to today's prompt" className="ml-auto text-[10px] font-bold underline opacity-60">today's</button>}</div>
      <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[9px] font-bold uppercase tracking-widest opacity-40 shrink-0">Past</span>
        {pastPrompts.map(p=>(<button key={p} onClick={()=>setPromptPick(p)} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`1.5px solid ${promptPick===p?T.accent:T.shadow}`,color:T.ink,opacity:0.8}}>{p}</button>))}
      </div>
    </>)}
    {!zen&&(<><div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1"><span className="text-[10px] font-bold uppercase tracking-widest opacity-50 shrink-0 mr-1">Layers</span>
      {STUDIO_MODULES.filter(m=>m.type==="layers").map(t=>{const own=modules.includes(t.id);const on=tier===t.layers;return(<button key={t.id} onClick={()=>own?setTier(t.layers):say(`Unlock ${t.name} in Shop`)} aria-label={`${own?"Use":"Unlock"} ${t.name}`} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${on?T.accent:T.ink}`,background:on?T.ink:T.card,color:on?T.paper:T.ink,opacity:own?1:0.45}}>{own?t.name:`🔒 ${t.name}`}</button>);})}
    </div>
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button onClick={()=>setOnionOn(v=>!v)} aria-pressed={onionOn} className="lok-btn px-2.5 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${onionOn?T.accent:T.shadow}`,background:onionOn?T.ink:"transparent",color:onionOn?T.paper:T.ink}}>🧅 Onion {onionOn?"ON":"OFF"}</button>
      {onionOn&&frames.length>0&&(<>
        <label className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Opacity<input type="range" min="0.05" max="0.5" step="0.05" value={onionOpacity} onChange={e=>setOnionOpacity(+e.target.value)} style={{accentColor:T.accent,width:48}} aria-label="Onion opacity"/></label>
        <div className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Prev{[1,2,3].map(n=><button key={n} onClick={()=>setOnionCount(n)} aria-pressed={onionCount===n} className="lok-btn w-6 h-6 rounded-full text-[10px] font-bold" style={{border:`2px solid ${onionCount===n?T.accent:T.shadow}`,background:onionCount===n?T.ink:"transparent",color:onionCount===n?T.paper:T.ink}}>{n}</button>)}</div>
      </>)}
    </div></>)}
    <div className="mt-2"><Easel ref={easel} key={tier} modules={modules} onionFrames={onionFrames} paper={paper}/></div>
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
            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-bold" style={{background:T.ink,color:"#fff"}}>{i+1}</div>
            <button onClick={e=>{e.stopPropagation();const a=document.createElement("a");a.href=f;a.download=`page-${i+1}.png`;a.click();}} aria-label={`Download page ${i+1}`} className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{background:T.accent,color:"#fff",border:`1.5px solid ${T.ink}`}}>↓</button>
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
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0,humhah:0,bomhogwah:0},echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null,from:"studio"});setFrames([]);setFrameDurations([]);setTitle("");easel.current.clearAll();["frames","durations","pace","title"].forEach(k=>{try{localStorage.removeItem("lok:draft:"+k);}catch{}});}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
      {hasModule(modules,"feat_gif")&&ready&&(<button onClick={async()=>{say("Encoding GIF…");try{const cvs=await Promise.all(frames.map(f=>new Promise(res=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle=ART.paper;x.fillRect(0,0,W,H);x.drawImage(img,0,0);res(c);};img.onerror=()=>res(null);img.src=f;})));const valid=cvs.filter(Boolean);if(valid.length<2){say("Need at least 2 valid frames","error");return;}const blob=await encodeGIF(valid,{delay:paceMs});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.trim()||"flip")+".gif";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);say("GIF exported!","success");}catch(e){console.error(e);say("GIF export failed","error");}}} className="lok-btn mt-2 w-full py-2.5 rounded-xl text-sm font-extrabold" style={{border:`3px solid ${T.accent}`,color:T.accent,background:T.card}}>🎞 Export GIF</button>)}
    </div>)}
  </div>);
}

function Battle({modules=[],wins,bigBattleOwned,kids,phase,lillok,customLilLok,onResult,onUnlockBig,onPublish,onLine,blip,hap,say}){
  const T=useT();
  const[pstate,setPstate]=useState("lobby");const[format,setFormat]=useState(FORMATS[0]);const[duration,setDuration]=useState(60);const[tier,setTier]=useState(getModuleLayers(modules));const[prompt,setPrompt]=useState(PROMPTS[0]);const[count,setCount]=useState(3);const[timeLeft,setTimeLeft]=useState(0);const[bots,setBots]=useState([]);const[botThumbs,setBotThumbs]=useState([]);const[entries,setEntries]=useState([]);const[results,setResults]=useState(null);const[shake,setShake]=useState(false);const[splat,setSplat]=useState(null);const[block,setBlock]=useState(null);const[blocked,setBlocked]=useState(0);const[myArt,setMyArt]=useState(null);const[bFrames,setBFrames]=useState([]);const[featured,setFeatured]=useState(false);
  const easel=useRef(null);const strokes=useRef(0);const tickRef=useRef(null);const matchT=useRef(0);
  const promptPool=kids?KID_PROMPTS:PROMPTS;const bigUnlocked=bigBattleOwned||wins>=1;
  const startMatch=()=>{const n=format.players-1;const nb=makeMatchBots(n,{kids,wins});setBots(nb);setBotThumbs(nb.map(b=>renderDoodle(b.seed,0)));setPrompt(promptPool[Math.floor(Math.random()*promptPool.length)]);strokes.current=0;setResults(null);setBlocked(0);setMyArt(null);setBFrames([]);setCount(3);setPstate("count");};
  const captureBattle=()=>{if(!easel.current)return;if(bFrames.length>=14){say("Max 14 pages");return;}const url=easel.current.composite(bFrames.length);setBFrames(f=>[...f,url]);blip&&blip("D5");say(`Page ${bFrames.length+1} captured`);};
  useEffect(()=>{if(pstate!=="count")return;if(count===0){setTimeLeft(duration);matchT.current=0;setPstate("draw");onLine&&onLine("battle_start");return;}const t=setTimeout(()=>setCount(c=>c-1),800);return()=>clearTimeout(t);},[pstate,count,duration]);
  useEffect(()=>{if(pstate!=="draw")return;tickRef.current=setInterval(()=>{matchT.current+=1;setTimeLeft(t=>Math.max(0,t-1));if(matchT.current%2===0)setBotThumbs(bots.map(b=>renderDoodle(b.seed,botProgress(b,matchT.current/duration))));if(!kids&&matchT.current===5&&bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"start");if(l)say(l);}if(!kids&&matchT.current===Math.floor(duration*0.6)&&bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"mid");if(l)say(l);}if(!kids&&matchT.current>3&&matchT.current%(phase==="stasis"?4:7)===0)fireIntervention();},1000);return()=>clearInterval(tickRef.current);},[pstate,bots,duration,kids,phase]);
  const fireIntervention=()=>{const decay=phase==="decaying";const kind=INTERVENTIONS[Math.floor(Math.random()*INTERVENTIONS.length)];const id=Math.random();setBlock({id,kind});setTimeout(()=>{setBlock(b=>{if(b&&b.id===id){if(kind==="shake"){setShake(true);setTimeout(()=>setShake(false),900);}else{setSplat({k:kind,seed:Math.floor(Math.random()*9999)});setTimeout(()=>setSplat(null),1500);}if(decay)say(`${lillok.name} fumbled!`);else if(bots.length)say(`${bots[Math.floor(Math.random()*bots.length)].name} hit you with a ${kind}!`);return null;}return b;});},1400);};
  const doBlock=()=>{if(!block)return;setBlocked(b=>b+1);setBlock(null);blip&&blip("G5");hap&&hap([100,50,100]);say(phase==="thriving"?`${lillok.name} deflected it!`:"Blocked!");};
  useEffect(()=>{if(pstate==="draw"&&timeLeft===0){clearInterval(tickRef.current);setBlock(null);setSplat(null);setShake(false);const final=easel.current?easel.current.composite():renderDoodle(1,0);const allFrames=[...bFrames,final];setBFrames(allFrames);setMyArt(final);if(format.coop||kids){setPstate("done");onResult(true,featured?3:1);return;}setEntries([{name:"You",art:final,isMe:true},...bots.map(b=>({name:b.name,art:renderDoodle(b.seed,botFinalT(b)),isMe:false}))]);setPstate("vote");}},[timeLeft,pstate]);
  const castVotes=pickIdx=>{const{tally,winnerIdx:wi,won}=judgeBattle(entries,bots,pickIdx,{strokes:strokes.current,blocked,pages:bFrames.length,phase,wins});recordBattle(won);onResult(won,featured?3:1);onLine&&onLine(won?"win":"loss");const speaker=won?bots[Math.floor(Math.random()*bots.length)]:bots[wi-1];const l=speaker&&botLine(speaker,won?"lose":"win");if(l)setTimeout(()=>say(l),900);setResults({tally,winnerIdx:wi,won});setPstate("results");};
  const publishMine=()=>{const fr=bFrames.length>=2?bFrames:[myArt];onPublish({id:"b"+Date.now(),title:`"${prompt}" — battle`,frames:fr,paceMs:220,mode:"A",style:"bold",loop:fr.length>=2,votes:results?.won?1:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0,humhah:0,bomhogwah:0},echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null,from:"battle"});say(fr.length>=2?"Battle animation published":"Battle piece published");};
  if(pstate==="lobby")return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">{kids?"Draw Together":"Lok N Slide — Battle"}</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Same prompt, draw with your buddies, everyone wins!":"Same prompt, same clock, layered canvases. Competitors vote — never for themselves."}</p>
    {!kids&&(<button onClick={()=>setFeatured(f=>!f)} aria-pressed={featured} aria-label="Featured match: 3× Loks" className="lok-btn mt-3 w-full p-3.5 rounded-2xl text-left relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:featured?T.ink:T.card,color:featured?T.paper:T.ink,boxShadow:featured?`6px 6px 0 ${T.accent}`:`5px 5px 0 #E8B14B`}}>
      <div className="flex items-center gap-3">
        <div className="lok-display font-extrabold text-2xl shrink-0" style={{color:featured?"#E8B14B":T.accent}}>3×</div>
        <div className="min-w-0 flex-1"><div className="lok-display font-extrabold text-sm uppercase tracking-widest" style={{color:featured?"#E8B14B":"#B8860B"}}>✦ Featured match</div><div className="text-xs opacity-75 mt-0.5">Triple Loks on a win. Rotates daily.</div></div>
        <span className="text-xs font-extrabold shrink-0" style={{color:featured?T.accent:T.alt}}>{featured?"Armed ✓":"Arm it"}</span>
      </div>
    </button>)}
    {!kids&&(<><div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Format</div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">{FORMATS.map((f,fi2)=>{const locked=f.locked&&!bigUnlocked;const sel=format.id===f.id;return(<button key={f.id} onClick={()=>locked?say("Big Battle unlocks at 1 win"):setFormat(f)} aria-label={`${f.label} — ${f.mood}`} className="lok-btn p-2.5 rounded-xl text-left" style={{border:`3px solid ${sel?T.accent:T.ink}`,background:sel?T.ink:T.card,color:sel?T.paper:T.ink,opacity:locked?0.55:1,boxShadow:sel?`4px 4px 0 ${T.accent}`:`3px 3px 0 ${T.shadow}`,animation:reduceMotion?"none":`lokrise .3s ease ${fi2*0.06}s both`}}><div style={{fontSize:20,lineHeight:1,marginBottom:3}}>{locked?"🔒":f.icon}</div><div className="lok-display font-extrabold text-sm">{f.label}</div><div className="text-[11px] opacity-70 mt-0.5">{f.mood}</div><div className="text-[11px] font-bold mt-0.5" style={{color:sel?T.accent:T.alt}}>{f.coop?"hot-seat":`${f.players} artists`}</div></button>);})}
      </div>{!bigUnlocked&&<button onClick={onUnlockBig} className="lok-btn mt-2 w-full py-2 rounded-xl text-sm font-bold" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}>Unlock Big Battle · 50 Loks</button>}</>)}
    <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Clock</div>
    <div className="mt-1.5 flex gap-2">{[30,60,90].map(s=>(<button key={s} onClick={()=>setDuration(s)} className="lok-btn flex-1 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:duration===s?T.accent:T.card,color:duration===s?T.onAccent:T.ink}}>{s}s</button>))}</div>
    <button onClick={startMatch} className="lok-btn lok-display mt-4 w-full py-3.5 rounded-xl text-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`5px 5px 0 ${T.ink}`,animation:reduceMotion?"none":"lokpulse 2.4s ease-in-out infinite"}}>{kids?"Start drawing!":"Find a match"}</button>
  </div>);
  if(pstate==="count")return(<div className="mt-12 text-center">
    <div className="text-sm font-bold uppercase tracking-widest opacity-60">Your prompt</div>
    <div className="lok-display text-2xl font-extrabold mt-2 mx-auto px-4 py-3 rounded-2xl" style={{maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}}>"{prompt}"</div>
    <div key={count} className="lok-display font-extrabold mt-8" style={{fontSize:count===0?80:110,color:T.accent,animation:"lokcount .4s cubic-bezier(.34,1.56,.64,1)",textShadow:`4px 4px 0 ${T.ink}`}}>{count===0?"DRAW!":count}</div>
    <div className="text-sm opacity-70 mt-2">{format.label} · {duration}s</div>
  </div>);
  if(pstate==="draw")return(<div className="mt-3" style={{animation:shake&&!reduceMotion?"lokshake .9s":"none"}}>
    <div className="flex items-center justify-between">
      <div className="min-w-0"><div className="text-xs font-bold uppercase tracking-widest opacity-60">Prompt</div><div className="lok-display font-extrabold leading-tight truncate">"{prompt}"</div></div>
      <div className="lok-display text-2xl font-extrabold px-3 py-1 rounded-xl shrink-0" style={{background:timeLeft<=10?T.accent:T.ink,color:timeLeft<=10?T.onAccent:T.paper,animation:timeLeft<=10&&timeLeft>0&&!reduceMotion?"lokpulse .6s ease-in-out infinite":"none",transition:"background .3s ease"}}>{timeLeft}s</div>
    </div>
    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${(timeLeft/duration)*100}%`,height:"100%",background:T.accent,transition:"width 1s linear"}}/></div>
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{bots.map((b,i)=>(<div key={b.name} className="shrink-0 text-center" style={{width:60}}><img src={botThumbs[i]} alt={b.name} className="w-full rounded-md" style={{aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/><div className="text-[10px] font-bold truncate opacity-70">{b.name}</div></div>))}</div>
    <div className="mt-2 relative">
      <Easel ref={easel} modules={modules} onStroke={()=>(strokes.current+=1)}/>
      {splat&&<InterventionFX kind={splat.k} seed={splat.seed}/>}
      {block&&(<button onClick={doBlock} className="lok-btn absolute left-1/2 top-1/2 px-5 py-3 rounded-2xl lok-display font-extrabold text-lg" style={{transform:"translate(-50%,-50%)",background:T.ink,color:T.paper,border:`3px solid ${T.accent}`,animation:"lokpulse .5s infinite"}}>LOK BLOCK!</button>)}
    </div>
    <div className="mt-2 flex items-center gap-2">
      <button onClick={captureBattle} className="lok-btn lok-display flex-1 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5" style={{background:T.ink,color:T.paper,boxShadow:`3px 3px 0 ${T.accent}`}}><span style={{fontSize:16}}>＋</span>Capture page {bFrames.length+1}</button>
      {bFrames.length>0&&(<div className="flex items-center gap-1 px-2 py-1 rounded-xl shrink-0" style={{border:`2.5px solid ${T.ink}`,background:T.card}}>{bFrames.slice(-4).map((f,i)=>(<img key={i} src={f} alt="" className="rounded" style={{width:22,aspectRatio:"4/5",objectFit:"cover",border:`1px solid ${T.ink}`}}/>))}<span className="lok-display text-xs font-extrabold ml-0.5" style={{color:T.accent}}>{bFrames.length}</span></div>)}
    </div>
  </div>);
  if(pstate==="done")return(<div className="mt-6 text-center">
    <h2 className="lok-display text-2xl font-extrabold">{kids?"Great drawing! 🎨":"Co-op complete!"}</h2>
    <p className="text-sm opacity-70 mt-1">"{prompt}"</p>
    {myArt&&<img src={myArt} alt="your art" className="mx-auto mt-3 rounded-xl" style={{width:200,border:`3px solid ${T.ink}`}}/>}
    <div className="mt-4 flex gap-2 px-4"><button onClick={publishMine} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper}}>Publish it</button><button onClick={startMatch} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Again</button></div>
    <button onClick={()=>setPstate("lobby")} className="mt-2 w-full py-2 text-sm font-bold underline opacity-70">Back</button>
  </div>);
  if(pstate==="vote")return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Time! Cast your vote</h2>
    <p className="text-sm opacity-70">"{prompt}" — pick the best.</p>
    <div className="mt-3 grid grid-cols-2 gap-3">{entries.map((e,i)=>(<button key={i} disabled={e.isMe} onClick={()=>castVotes(i)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,opacity:e.isMe?0.7:1,boxShadow:`4px 4px 0 ${T.shadow}`}}><img src={e.art} alt={e.name} className="w-full block" style={{aspectRatio:"4/5",objectFit:"cover"}}/><div className="px-2 py-1.5 font-bold text-sm flex justify-between"><span>{e.name}</span>{e.isMe?<span className="opacity-50 text-xs">you</span>:<span style={{color:T.accent}}>vote ▸</span>}</div></button>))}</div>
  </div>);
  if(pstate==="results"&&results){
    const order=entries.map((e,i)=>({...e,votes:results.tally[i],i})).sort((a,b)=>b.votes-a.votes);
    return(<div className="mt-4">
      <div className="text-center" style={{animation:"lokpop .5s cubic-bezier(.34,1.56,.64,1)"}}><div className="lok-display text-3xl font-extrabold" style={{color:results.won?T.accent:T.ink}}>{results.won?"You took it! 🏆":`${entries[results.winnerIdx].name} takes it`}</div></div>
      <p className="text-center text-sm opacity-70 mt-1">"{prompt}"</p>
      <div className="mt-3 flex flex-col gap-2">{order.map((e,idx)=>(<div key={e.i} className="flex items-center gap-3 p-2 rounded-xl" style={{border:`3px solid ${e.i===results.winnerIdx?T.accent:T.ink}`,background:T.card,animation:`lokrise .3s ease ${idx*0.06}s both`}}><span className="lok-display font-extrabold w-5 text-center" style={{color:idx===0?T.accent:T.ink}}>{idx+1}</span><img src={e.art} alt={e.name} className="rounded-md" style={{width:52,aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/><div className="font-bold flex-1">{e.name}{e.i===results.winnerIdx?" 🏆":""}</div><div className="lok-display font-extrabold">{e.votes} {e.votes===1?"vote":"votes"}</div></div>))}</div>
      <div className="mt-4 flex gap-2"><button onClick={publishMine} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper}}>Publish</button><button onClick={startMatch} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Rematch</button></div>
      <button onClick={()=>{const msg=`I just drew "${prompt}" in Lok N Slide — think you can beat me? lok.app/battle`;if(navigator.share){navigator.share({title:"Lok N Slide challenge",text:msg}).catch(()=>{});}else{navigator.clipboard?.writeText(msg);say("Challenge copied — send it!");}}} aria-label="Challenge a friend" className="lok-btn mt-2 w-full py-2 rounded-xl font-bold text-sm" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}>↗ Challenge a friend</button>
      <button onClick={()=>setPstate("lobby")} className="mt-2 w-full py-2 text-sm font-bold underline opacity-70">Back to lobby</button>
    </div>);
  }
  return null;
}

function OpenFront({kids,loks,dailyPrompt,onWager,onEarn,hinted,onHinted,blip,say}){
  const T=useT();const[phase,setPhase]=useState("lobby");const[mode,setMode]=useState("shapes");const[wagerOn,setWagerOn]=useState(false);const[online,setOnline]=useState(0);const[shape,setShape]=useState("star");const[time,setTime]=useState(0);const[score,setScore]=useState(0);const[board,setBoard]=useState([]);const[pot,setPot]=useState(0);const[wager,setWager]=useState(10);const[stake,setStake]=useState(0);const[lastPayout,setLastPayout]=useState(0);
  const guideRef=useRef(null);const inkRef=useRef(null);const wrapRef=useRef(null);const targetPts=useRef([]);const drawing=useRef(false);const last=useRef(null);const painted=useRef(0);const totalLen=useRef(1);const tickRef=useRef(null);const ROUND_BASE=12;const modeTime={shapes:12,stencils:16,wild:20,chars:22};
  const setupShape=k=>{const pts=traceShape(k);targetPts.current=pts.map(p=>({...p,0:p[0],1:p[1],hit:false}));const g=guideRef.current.getContext("2d");g.clearRect(0,0,W,H);g.strokeStyle="rgba(35,48,107,0.28)";g.lineWidth=26;g.lineCap="round";g.lineJoin="round";g.beginPath();pts.forEach(([x,y],i)=>(i===0?g.moveTo(x,y):g.lineTo(x,y)));g.stroke();g.strokeStyle="rgba(35,48,107,0.5)";g.lineWidth=3;g.setLineDash([6,8]);g.stroke();g.setLineDash([]);inkRef.current.getContext("2d").clearRect(0,0,W,H);painted.current=0;};
  const start=()=>{const w=wagerOn?wager:0;if(w>0){if(!onWager(w)){say(`Need ${w} Loks`);return;}}setStake(w);const pool=MODES[mode].pool;const k=pool[Math.floor(Math.random()*pool.length)];setShape(k);setScore(0);setTime(modeTime[mode]||ROUND_BASE);setPhase("play");setOnline(Math.floor(700+Math.random()*500));const field=Math.floor(5+Math.random()*4);setPot(w*(field+1));setBoard(makeRushRivals(FRONT_NAMES.slice(0,field)).map(r=>({name:r.name,score:0,rival:r})).concat([{name:"you",score:0,me:true}]));setTimeout(()=>setupShape(k),0);};
  useEffect(()=>{if(phase!=="play")return;const t0=Date.now();const total=(modeTime[mode]||ROUND_BASE)*1000;tickRef.current=setInterval(()=>setTime(t=>{if(t<=0.1){finish();return 0;}return +(t-0.1).toFixed(1);}),100);const bots=setInterval(()=>{const frac=Math.min(1,(Date.now()-t0)/total);setBoard(bd=>bd.map(p=>p.me?p:{...p,score:rushScore(p.rival,frac)}).sort((a,b)=>b.score-a.score));},600);return()=>{clearInterval(tickRef.current);clearInterval(bots);};},[phase]);
  const coverage=()=>Math.min(100,Math.round((painted.current/Math.max(1,targetPts.current.length))*100));
  const finish=()=>{clearInterval(tickRef.current);const cov=coverage();const speedBonus=Math.round(Math.max(0,time)*2);const final=Math.min(100,cov)+speedBonus;setScore(final);setBoard(bd=>{const nb=bd.map(p=>p.me?{...p,score:final}:p).sort((a,b)=>b.score-a.score);const place=nb.findIndex(p=>p.me)+1;const field=nb.length;recordRush(place,field);let payout;if(pot>0)payout=place===1?Math.round(pot*0.6):place===2?Math.round(pot*0.3):place===3?Math.round(pot*0.1):0;else payout=place===1?15:place<=Math.ceil(field/2)?6:1;setLastPayout(payout);setTimeout(()=>{if(payout>0)onEarn(payout);blip&&blip(place===1?"C6":"E5");say(place===1?`1st! +${payout} Loks`:`#${place} · +${payout} Loks`);},50);return nb;});setPhase("results");};
  const pos=e=>{const r=wrapRef.current.getBoundingClientRect();return[((e.clientX-r.left)*W)/r.width,((e.clientY-r.top)*H)/r.height];};
  const scorePoint=(x,y)=>{const pts=targetPts.current;for(let i=0;i<pts.length;i++){if(!pts[i].hit&&Math.hypot((pts[i][0]??pts[i].x??pts[i][0])-x,(pts[i][1]??pts[i].y??pts[i][1])-y)<22){pts[i].hit=true;painted.current++;return true;}}return false;};
  const lastBoard=useRef(0);
  const down=e=>{if(phase!=="play")return;e.preventDefault();wrapRef.current.setPointerCapture(e.pointerId);drawing.current=true;last.current=pos(e);paint(...last.current);};
  const move=e=>{if(!drawing.current)return;const[x,y]=pos(e);paint(x,y);};
  const paint=(x,y)=>{const ctx=inkRef.current.getContext("2d");const hit=scorePoint(x,y);ctx.strokeStyle=hit?ART.teal:ART.pink;ctx.lineWidth=12;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();const[px,py]=last.current||[x,y];ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();last.current=[x,y];if(hit){const now=performance.now();if(now-lastBoard.current>120){lastBoard.current=now;setBoard(bd=>bd.map(p=>p.me?{...p,score:coverage()}:p));}if(Math.random()<0.12)blip&&blip("D5");}};
  const up=()=>{drawing.current=false;last.current=null;};
  if(phase==="lobby"&&!hinted)return(<div className="mt-4 text-center" style={{animation:"lokrise .3s ease"}}>
    <div className="lok-display text-2xl font-extrabold" style={{color:T.accent}}>Trace Rush</div>
    <div className="mt-3 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="flex items-center justify-center rounded-lg text-[10px] font-bold" style={{width:56,height:70,border:`2.5px dashed ${T.ink}`,opacity:0.45}}>ghost<br/>shape</div>
        <div style={{fontSize:20}}>→</div>
        <div className="flex items-center justify-center rounded-lg text-[10px] font-bold" style={{width:56,height:70,border:`2.5px solid ${ART.teal}`,color:ART.teal}}>your<br/>trace</div>
        <div style={{fontSize:20}}>→</div>
        <div className="lok-display flex items-center justify-center rounded-lg text-lg font-extrabold" style={{width:56,height:70,border:`2.5px solid ${T.accent}`,color:T.accent}}>98</div>
      </div>
      <p className="text-sm leading-snug">A dashed shape appears. Trace it before the clock runs out. <span style={{color:ART.teal,fontWeight:700}}>Teal</span> = on the line, <span style={{color:T.accent,fontWeight:700}}>pink</span> = off. Finish early for a speed bonus.</p>
    </div>
    <button onClick={()=>onHinted&&onHinted()} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`}}>Got it — let's trace</button>
  </div>);
  if(phase==="lobby")return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Trace Rush</h2>
    <p className="text-sm opacity-70 mt-0.5">Pick a mode. Trace the target cleanly before the clock runs out. Accuracy + speed = your score.</p>
    <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Game mode</div>
    <div className="mt-1.5 grid grid-cols-2 gap-2">{Object.entries(MODES).map(([id,m])=>{const sel=mode===id;return(<button key={id} onClick={()=>setMode(id)} className="lok-btn p-2.5 rounded-xl text-left" style={{border:`3px solid ${sel?T.accent:T.ink}`,background:sel?T.ink:T.card,color:sel?T.paper:T.ink}}><div className="lok-display font-extrabold text-sm">{m.name}</div><div className="text-[11px] opacity-75">{m.tag}</div></button>);})}
    </div>
    <button onClick={start} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`5px 5px 0 ${T.ink}`,animation:reduceMotion?"none":"lokpulse 2.4s infinite"}}>Play {MODES[mode].name}</button>
  </div>);
  if(phase==="results"){const me=board.find(p=>p.me);const place=board.findIndex(p=>p.me)+1;return(<div className="mt-4">
    <h2 className="lok-display text-2xl font-extrabold text-center">{place===1?"Cleanest line! 🏆":`You placed #${place}`}</h2>
    <p className="text-center text-sm opacity-70">{MODES[mode].name} · score {me?.score}</p>
    <div className="mt-3 flex flex-col gap-1.5">{board.map((p,i)=>(<div key={p.name} className="flex items-center gap-3 p-2 rounded-xl" style={{border:`2.5px solid ${p.me?T.accent:T.ink}`,background:T.card}}><span className="lok-display font-extrabold w-5 text-center">{i+1}</span><span className="flex-1 font-bold" style={{color:p.me?T.accent:T.ink}}>{p.name}</span><span className="lok-display font-extrabold">{Math.round(p.score)}</span></div>))}</div>
    <div className="mt-4 flex gap-2"><button onClick={start} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Next round</button><button onClick={()=>setPhase("lobby")} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`}}>Leave</button></div>
  </div>);}
  const cov=coverage();
  return(<div className="mt-3">
    <div className="flex items-center gap-2">
      <div className="flex-1 p-2 rounded-xl" style={{border:`2.5px solid ${T.ink}`,background:T.card}}><div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{MODES[mode].name}</div><div className="lok-display font-extrabold text-sm" style={{color:T.accent}}>{shape.replace(/-/g," ")}</div></div>
      <div className="text-center px-3 py-1.5 rounded-xl" style={{background:time<=4?T.accent:T.ink,color:time<=4?T.onAccent:T.paper,animation:time<=4&&time>0&&!reduceMotion?"lokpulse .5s ease-in-out infinite":"none",transition:"background .3s ease"}}><div className="lok-display text-xl font-extrabold leading-none">{time.toFixed(1)}</div><div className="text-[9px] font-bold">sec</div></div>
    </div>
    <div className="mt-2 flex items-center gap-2"><div className="flex-1 h-3 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${cov}%`,height:"100%",background:T.alt,transition:"width .1s"}}/></div><span className="lok-display font-extrabold text-sm">{cov}%</span></div>
    <div ref={wrapRef} className="relative mt-2 rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4/5"}} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <canvas ref={guideRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <canvas ref={inkRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <div className="absolute inset-0" role="img" aria-label="Trace Rush canvas" style={{touchAction:"none",cursor:"crosshair"}}/>
      <button onClick={finish} className="lok-btn absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{background:T.ink,color:T.paper}}>Lock it in</button>
    </div>
    <div className="mt-2 flex items-center gap-2"><div className="text-xs opacity-70"><span style={{color:T.alt}}>●</span> {online.toLocaleString()} online</div></div>
    <p className="mt-1 text-center text-xs opacity-50">Teal = on the line · pink = off. Finish early for speed bonus.</p>
  </div>);
}

function ShopItem({owned,equipped,price,onClick,children,swatch}){const T=useT();return(<button onClick={onClick} className="lok-btn text-left rounded-2xl overflow-hidden w-full" style={{border:`3px solid ${equipped?T.accent:T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>{swatch}<div className="px-2.5 py-2 flex items-center justify-between gap-2"><div className="min-w-0">{children}</div><span className="text-xs font-extrabold shrink-0" style={{color:equipped?T.alt:T.accent}}>{equipped?"On ✓":owned?"Equip":price===0?"Free":price}</span></div></button>);}
function Shop({loks,lokPass,kids,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies,modules=[],onBuyModule,cosmetics,owned,onBuyCosmetic,setKids,onBuyPass,onTheme,onEffect,onSky,founder=false,onFounderJoin,say,lokPassBusy=false}){
  const T=useT();const[catTab,setCatTab]=useState("featured");const[modTab,setModTab]=useState("layers");const[fHandle,setFHandle]=useState("");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);
  const Section=({title,sub,children})=>(<section className="mt-5"><h3 className="lok-display text-base font-extrabold">{title}</h3>{sub&&<p className="text-xs opacity-60 mb-1">{sub}</p>}<div className="mt-2">{children}</div></section>);
  const has=(cat,id)=>owned[cat]?.includes(id);const eq=(cat,id)=>cosmetics[cat]===id;const buy=(cat,item)=>onBuyCosmetic(cat,item);
  const cats=[["featured","Featured"],["themes","Skins"],["effects","Effects"],["skies","Skies"],["cosmetic","Cosmetics"],["studio","Studio"],["paper","Paper"],["blot","Blot Shop"]];
  const moduleTypes=getModuleTypes();
  return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Shop</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Everything here is free play.":"Spend Loks you earn — or grab the LokPass."}</p>
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{cats.map(([id,l])=>(<button key={id} onClick={()=>setCatTab(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:catTab===id?T.ink:T.card,color:catTab===id?T.paper:T.ink}}>{l}</button>))}</div>
    {catTab==="featured"&&(<>
      <div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.ink,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold">Become a Founder 🏆</div><p className="text-sm opacity-85 mt-1">Back us on the alpha and get locked-in as a Lok founder. Your handle, preferences, and library snapshot are saved to our early-access server — founders get a permanent badge and priority access to beta.</p>{founder?<div className="mt-3 flex items-center gap-2 py-2.5"><span className="text-lg">✅</span><span className="lok-display font-extrabold">You're a Founder!</span></div>:<><div className="mt-3 flex gap-2"><input value={fHandle} onChange={e=>setFHandle(e.target.value)} placeholder="Your handle" className="lok-btn flex-1 px-3 py-2 rounded-xl text-sm font-bold" style={{background:T.paper,color:T.ink,border:`3px solid ${T.paper}`}}/><input value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="Email (optional)" type="email" className="lok-btn flex-1 px-3 py-2 rounded-xl text-sm font-bold" style={{background:T.paper,color:T.ink,border:`3px solid ${T.paper}`}}/></div><button onClick={async()=>{if(!fHandle.trim()||fHandle.trim().length<2){say?.("Enter a handle");return;}setFBusy(true);try{await onFounderJoin?.(fHandle.trim(),fEmail.trim());say?.("You're a founder! Data secured on the test server 🏆","success");}catch{say?.("Couldn't reach the server — try again","error");}setFBusy(false);}} disabled={fBusy} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:fBusy?T.alt:T.accent,color:T.onAccent,border:`3px solid ${T.paper}`,opacity:fBusy?0.7:1}}>{fBusy?"Sending…":"Secure Founder Status"}</button></>}</div>
      {!kids&&(<div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.ink,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold">LokPass</div><p className="text-sm opacity-85 mt-1">No ads. Every UI theme unlocked. PASS badge.</p><button onClick={onBuyPass} disabled={lokPass||lokPassBusy} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:lokPass||lokPassBusy?"transparent":T.accent,color:lokPass||lokPassBusy?T.paper:T.onAccent,border:`3px solid ${T.paper}`,opacity:lokPass?0.7:1}} aria-label={lokPass?"LokPass active":lokPassBusy?"Processing…":"Get LokPass"}>{lokPass?"Active ✓":lokPassBusy?"Processing…":"Get LokPass — $2.99"}</button></div>)}
      {!kids&&(<div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:`linear-gradient(135deg, ${T.ink}, #4A3728)`,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold" style={{color:T.accent}}>🚀 Studio UBER</div><p className="text-sm opacity-85 mt-1">One purchase. Every brush, every tool, every layer pack, every feature. 37 modules for the price of 13. The ultimate creative kit.</p><button onClick={()=>{const uber=STUDIO_MODULES.find(m=>m.id==="module_uber");if(studioModules.includes("module_uber")){say("UBER already active — all modules unlocked");}else{onBuyModule(uber);}}} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:studioModules.includes("module_uber")?"transparent":T.accent,color:studioModules.includes("module_uber")?T.paper:T.onAccent,border:`3px solid ${T.paper}`,opacity:studioModules.includes("module_uber")?0.7:1}} aria-label="Get Studio UBER">{studioModules.includes("module_uber")?"Active ✓":"Get Studio UBER — 999 Loks"}</button></div>)}
      <div className="mt-3 p-3 rounded-2xl flex items-center gap-3" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="flex-1"><div className="lok-display font-extrabold">Lok Juniors {kids?"· ON":""}</div><div className="text-xs opacity-70">Safe walled-garden mode for kids &amp; classrooms.</div></div><button onClick={()=>setKids(!kids)} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:kids?T.alt:T.card,color:kids?"#fff":T.ink,border:`3px solid ${T.ink}`}} aria-pressed={kids}>{kids?"Turn off":"Turn on"}</button></div>
    </>)}
    {catTab==="themes"&&!kids&&(<Section title="UI themes" sub={`Own skins to unlock new waves.`}><div className="grid grid-cols-2 gap-3">{Object.entries(THEMES).filter(([,th])=>(th.wave||1) < 2 || ownedThemes.length>=SKIN_WAVE_GATE).filter(([,th])=>(th.wave||1) < 3 || ownedThemes.length>=SKIN_WAVE_3_GATE).filter(([,th])=>(th.wave||1) < 4 || ownedThemes.length>=SKIN_WAVE_4_GATE).map(([id,th])=>{const own=ownedThemes.includes(id);const e2=uiTheme===id;return(<button key={id} onClick={()=>onTheme(id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}} aria-label={`Theme ${th.name}`}><div className="flex h-10">{[th.paper,th.ink,th.accent,th.alt].map((c,k)=>(<div key={k} className="flex-1" style={{background:c}}/>))}</div><div className="px-2.5 py-2"><div className="font-bold text-sm">{th.name}</div><div className="text-xs opacity-70">{th.desc}</div><div className="mt-1 text-xs font-extrabold" style={{color:T.accent}}>{e2?"Equipped":own?"Equip":lokPass?"In PASS":`${th.price} Loks`}</div></div></button>);})}</div></Section>)}
    {catTab==="effects"&&(<Section title="Page effects"><div className="grid grid-cols-2 gap-2">{EFFECTS.map(e=>{const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={e.id} owned={own} equipped={e2} price={e.price} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm">{e.name}</div></ShopItem>);})}</div></Section>)}
    {catTab==="skies"&&(<Section title="Atmosphere"><div className="grid grid-cols-2 gap-2">{SKIES.map(s=>{const own=ownedSkies.includes(s.id);const e2=sky===s.id;return(<ShopItem key={s.id} owned={own} equipped={e2} price={s.price} onClick={()=>onSky(s.id,s)}><div className="font-bold text-sm">{s.name}</div></ShopItem>);})}</div></Section>)}
    {catTab==="cosmetic"&&(<>
      <Section title="Name color"><div className="grid grid-cols-2 gap-2">{NAME_COLORS.map(c=>(<ShopItem key={c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div></ShopItem>))}</div></Section>
      <Section title="Reaction packs"><div className="grid grid-cols-2 gap-2">{REACTION_PACKS.map(r=>(<ShopItem key={r.id} owned={has("reactionPack",r.id)} equipped={eq("reactionPack",r.id)} price={r.price} onClick={()=>buy("reactionPack",r)}><div className="font-bold text-sm leading-tight">{r.name}</div></ShopItem>))}</div></Section>
      <Section title="Avatar accents"><div className="grid grid-cols-2 gap-2">{AVATAR_ACCENTS.map(a=>(<ShopItem key={a.id} owned={has("avatarAccent",a.id)} equipped={eq("avatarAccent",a.id)} price={a.price} onClick={()=>buy("avatarAccent",a)}><div className="font-bold text-sm">{a.name}</div></ShopItem>))}</div></Section>
    </>)}
    {catTab==="studio"&&(<>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{moduleTypes.filter(t=>t.type!=="achievement").map(({type,label})=>(<button key={type} onClick={()=>setModTab(type)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:modTab===type?T.ink:T.card,color:modTab===type?T.paper:T.ink}}>{label}</button>))}</div>
      <Section title="Modules" sub="Purchase individually or earn through achievements.">
        <div className="grid grid-cols-2 gap-2">{moduleTypes.find(t=>t.type===modTab)?.items.map(m=>{const own=modules.includes(m.id);const isAchievement=m.type==="achievement";return(<ShopItem key={m.id} owned={own} equipped={own} price={isAchievement?0:m.price} onClick={()=>{if(isAchievement){say(`Unlockable: ${m.unlock}`);}else if(own){say(`Already owned: ${m.name}`);}else{onBuyModule?.(m);}}}><div className="font-bold text-sm">{m.name}</div><div className="text-[10px] opacity-70">{isAchievement?`🏅 ${m.unlock}`:m.desc}</div></ShopItem>);})}</div>
      </Section>
      <p className="mt-2 text-center text-xs opacity-60">Modules installed: {modules.length}/37 · {modules.filter(m=>STUDIO_MODULES.some(s=>s.id===m)).length} unique</p>
    </>)}
    {catTab==="paper"&&(<Section title="Canvas paper" sub="Paper textures and guides for your drawings."><div className="grid grid-cols-2 gap-2">{PAPERS.map(p=>(<ShopItem key={p.id} owned={has("paper",p.id)} equipped={eq("paper",p.id)} price={p.price} onClick={()=>buy("paper",p)}><div className="font-bold text-sm">{p.name}</div></ShopItem>))}</div></Section>)}
    {catTab==="blot"&&(<><Section title="Blot borders" sub="Borders for your LilLok container.">
      <div className="grid grid-cols-2 gap-2">{BLOT_BORDERS.map(b=>(
        <ShopItem key={b.id} owned={has("blotBorder",b.id)} equipped={eq("blotBorder",b.id)} price={b.price} onClick={()=>buy("blotBorder",b)}
          swatch={<div className="flex items-center justify-center py-3"><div className="rounded-full" style={{width:44,height:44,background:T.paper,...blotBorderStyle(b.id,T)}}/></div>}>
          <div className="font-bold text-sm">{b.name}</div>
        </ShopItem>))}
      </div>
    </Section>
    <Section title="LilLok gear" sub="Accessories for your ink buddy."><div className="grid grid-cols-2 gap-2">{LILLOK_GEAR.filter(g=>g.id!=="none").map(g=>(<ShopItem key={g.id} owned={has("lillokGear",g.id)} equipped={eq("lillokGear",g.id)} price={g.price} onClick={()=>buy("lillokGear",g)}><div className="font-bold text-sm">{g.name}</div></ShopItem>))}</div></Section></>)}
    <p className="mt-5 text-center text-xs opacity-60">Balance: {loks} Loks</p>
  </div>);
}

function PostCard({p,onOpen,onDelete}){
  const T=useT();const pressTimer=useRef(null);const [deleting,setDeleting]=useState(false);
  const startPress=()=>{if(!onDelete||p.from==="seed"||p.remote)return;pressTimer.current=setTimeout(()=>{setDeleting(true);if(window.confirm(`Delete "${p.title}"?`)){onDelete(p.id);}else{setDeleting(false);}},600);};
  const cancelPress=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null;}};
  if(!p.frames||p.frames.length===0)return(<button onClick={()=>onOpen(p.id)} onPointerDown={startPress} onPointerUp={cancelPress} onPointerLeave={cancelPress} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={p.title}><div className="flex items-center justify-center" style={{aspectRatio:"4/5",background:T.paper}}><div className="text-center opacity-40"><div className="lok-display font-extrabold">{p.title}</div><div className="text-xs">Rendering…</div></div></div></button>);
  return(<button onClick={()=>onOpen(p.id)} onPointerDown={startPress} onPointerUp={cancelPress} onPointerLeave={cancelPress} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${deleting?T.accent:T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`,contentVisibility:"auto"}} aria-label={`Open ${p.title}`}><div className="relative"><img src={p.frames[Math.floor(p.frames.length/2)]} alt={p.title} className="w-full block" style={{aspectRatio:"4 / 5",objectFit:"cover"}}/><div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-xs font-bold" style={{background:T.ink,color:T.paper}}>{p.from==="battle"?"⚔ battle":p.mode==="B"?"▣ page":`${p.frames.length}pg`}</div></div><div className="px-2.5 py-2"><div className="font-bold leading-tight truncate text-sm">{p.title}</div><div className="text-xs opacity-70 mt-0.5">{p.votes} votes · {p.views||0} views</div></div></button>);
}
const ARTIST_BIO={
  "moss.ink":"I draw small loops about gravity, plants, and things that fly. Slide down any post to play it.",
  "inkwell_iz":"Ink and wash. Sometimes I finish a sketch before the coffee gets cold.",
  "sketchram":"Sketching my way through the week. Daily doodler since forever.",
  "tinta":"Riso printer by day, animator by night. Two colors is all you need.",
  "mooncrayon":"Crayon textures and soft colors. Never grew up, and I'm okay with that.",
  "pixel.pluto":"Pixel art meets ink. 8-bit emotions in a hand-drawn world.",
};
function ArtistPage({name,posts,following,onLok,onOpen,onClose}){
  const T=useT();const theirs=posts.filter(p=>(p.author||"moss.ink")===name);const loked=following.includes(name);
  const avatar=useMemo(()=>renderAvatar(name.length*31),[name]);
  const bio=ARTIST_BIO[name]||"";
  const followers=theirs.reduce((a,p)=>a+(p.votes||0),0)||Math.floor(Math.random()*400)+50;
  return(<div className="fixed inset-0 z-40 overflow-y-auto" style={{background:T.paper,color:T.ink,animation:"lokrise .25s ease"}}>
    <div className="mx-auto w-full px-4 pb-24" style={{maxWidth:560}}>
      <div className="sticky top-0 z-10 flex items-center gap-3 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={onClose} aria-label="Back to feed" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>‹</button>
        <img src={avatar} alt={name} className="w-11 h-11 rounded-full shrink-0" style={{border:`2.5px solid ${T.ink}`}}/>
        <div className="min-w-0 flex-1"><div className="lok-display font-extrabold leading-tight truncate">{name}</div><div className="text-xs opacity-60">{theirs.length} {theirs.length===1?"flip":"flips"} · {followers} {followers===1?"follower":"followers"}</div></div>
        <button onClick={()=>onLok(name)} aria-label={loked?"Unfollow":`Lok ${name}`} className="lok-btn px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0" style={{background:loked?T.card:T.accent,color:loked?T.ink:T.onAccent,border:`2.5px solid ${T.ink}`}}>{loked?"Following ✓":"Lok"}</button>
      </div>
      {bio&&<p className="mt-3 text-sm leading-snug px-1">{bio}</p>}
      {theirs.length?<div className="mt-3 grid grid-cols-2 gap-3">{theirs.map(p=><PostCard key={p.id} p={p} onOpen={onOpen}/>)}</div>:<EmptyState icon="feed" title="Nothing yet" subtitle={`${name} hasn't published a flip yet.`}/>}
    </div>
  </div>);
}

function PersonRow({name,note}){const T=useT();const seed=name.length*31;return(<div className="flex items-center gap-3 p-2 rounded-xl mb-2" style={{border:`2.5px solid ${T.ink}`,background:T.card}}><img src={renderAvatar(seed)} alt={name} className="w-11 h-11 rounded-full" style={{border:`2px solid ${T.ink}`}}/><div className="font-bold flex-1">{name}</div>{note&&<span className="text-xs opacity-60">{note}</span>}</div>);}

function BadgeWall({badges,unlockedCount,onClose}){
  const T=useT();const[cat,setCat]=useState("all");
  const cats=BADGE_CATEGORIES;
  const filtered=cat==="all"?badges:badges.filter(b=>b.cat===cat);
  return(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto" style={{maxWidth:560,background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">🏆 Badge Wall</div><div className="text-sm opacity-60">{unlockedCount}/{badges.length}</div><button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}}>✕</button></div>
      <div className="flex gap-1.5 overflow-x-auto pb-2">{[{id:"all",name:"All",icon:"🏆"},...cats].map(c=>(
        <button key={c.id} onClick={()=>setCat(c.id)} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{border:`2.5px solid ${cat===c.id?T.accent:T.ink}`,background:cat===c.id?T.ink:T.card,color:cat===c.id?T.paper:T.ink}}>{c.icon} {c.name}</button>
      ))}</div>
      <div className="grid grid-cols-2 gap-2 mt-2">{filtered.map(b=>(<div key={b.id} className={`p-3 rounded-2xl ${b.unlocked?"":"opacity-40"}`} style={{border:`2px solid ${b.unlocked?T.accent:T.shadow}`,background:T.paper}}>
        <div className="flex items-center gap-2"><span className="text-xl">{b.icon}</span><div><div className="lok-display font-extrabold text-sm">{b.name}</div><div className="text-[10px] opacity-70">{b.desc}</div></div></div>
        {b.unlocked&&<div className="mt-1.5 text-[10px] font-bold text-right" style={{color:T.alt}}>✓ Unlocked</div>}
      </div>))}</div>
    </div>
  </div>);
}

function GameManual({onClose}){
  const T=useT();const[page,setPage]=useState(0);const total=GAME_MANUAL_PAGES.length;const p=GAME_MANUAL_PAGES[page];
  const k=useCallback((e)=>{if(e.key==="ArrowLeft")setPage(i=>Math.max(0,i-1));if(e.key==="ArrowRight")setPage(i=>Math.min(total-1,i+1));if(e.key==="Escape")onClose();},[onClose]);
  useEffect(()=>(window.addEventListener("keydown",k),()=>window.removeEventListener("keydown",k)),[k]);
  return(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.5)"}} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5 max-h-[85dvh] overflow-y-auto" style={{maxWidth:560,minHeight:400,background:"#9BBC0F",border:"4px solid #306230",boxShadow:"inset 0 0 0 4px #306230",animation:"lokrise .25s ease",color:"#306230"}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-extrabold tracking-widest uppercase opacity-70" style={{color:"#306230"}}>LokBook Manual</span><span className="text-[10px] font-bold">{page+1}/{total}</span><button onClick={onClose} className="lok-btn px-2 py-1 rounded-lg font-bold text-xs" style={{border:"2px solid #306230",color:"#306230",background:"transparent"}}>✕</button></div>
      <div className="rounded-2xl p-4" style={{background:"#8BAC0F",border:"2px solid #306230"}}>
        <div className="text-3xl mb-2">{p.icon}</div>
        <div className="lok-display font-extrabold text-lg leading-tight" style={{color:"#306230"}}>{p.title}</div>
        <div className="mt-3 text-sm leading-relaxed opacity-85">{p.content}</div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button disabled={page===0} onClick={()=>setPage(i=>i-1)} className="lok-btn px-4 py-2 rounded-xl font-extrabold text-sm" style={{border:"2.5px solid #306230",color:page===0?"#306230":"#9BBC0F",background:page===0?"transparent":"#306230",opacity:page===0?0.4:1}}>‹ Prev</button>
        <div className="flex gap-1">{GAME_MANUAL_PAGES.map((_,i)=>(<div key={i} style={{width:i===page?16:6,height:6,borderRadius:3,background:i<=page?"#306230":"rgba(48,98,48,.3)",transition:"width .2s"}}/>))}</div>
        <button disabled={page>=total-1} onClick={()=>setPage(i=>i+1)} className="lok-btn px-4 py-2 rounded-xl font-extrabold text-sm" style={{border:"2.5px solid #306230",color:page>=total-1?"#306230":"#9BBC0F",background:page>=total-1?"transparent":"#306230",opacity:page>=total-1?0.4:1}}>Next ›</button>
      </div>
    </div>
  </div>);
}

function Profile({posts,profile,setProfile,wins,lokPass,kids,cosmetics={},level,xp,quests,following,lokdInCount,bookmarks,notifications=[],notifUnread=0,loks=0,totalEarned=0,questsCompleted=0,canInstall=false,onInstall,onClearNotifs,onOpen,onDelete,onRename,say,account=null,pace="sweep",setPace,speed=1,setSpeed,soundLab=false,onUnlockSoundLab,soundQueue=[],setSoundQueue,founder=false,onFounderJoin,animatedToken=false,badges,showBadges,setShowBadges,unlockedCount,compactDensity,setCompactDensity}){
  const T=useT();const[filter,setFilter]=useState("newest");const[view,setView]=useState("gallery");const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(profile);const[showNotifs,setShowNotifs]=useState(false);const[searchQ,setSearchQ]=useState("");const[showSettings,setShowSettings]=useState(false);const[showManual,setShowManual]=useState(false);const[bSort,setBSort]=useState("add");
  const tapCount=useRef(0);const tapTimer=useRef(null);const audioRef=useRef(null);const[slUrl,setSlUrl]=useState("");const[slPlaying,setSlPlaying]=useState(null);const[fHandle,setFHandle]=useState(profile.name||"");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);
  const[emailAddr,setEmailAddr]=useState("");const[authBusy,setAuthBusy]=useState(false);
  const sendMagicLink=async()=>{const e=emailAddr.trim();if(!e||!e.includes("@")){say("Enter a valid email","error");return;}setAuthBusy(true);try{await auth.signInWithEmail(e);say("Magic link sent! Check your inbox","success");}catch{ say("Couldn't send — try again","error");}setAuthBusy(false);};
  const versionTap=()=>{if(soundLab)return;tapCount.current++;clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>{tapCount.current=0;},1200);if(tapCount.current>=7){tapCount.current=0;onUnlockSoundLab&&onUnlockSoundLab();say("🔊 Sound Lab unlocked","success");}};
  const ytId=u=>{const m=u.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);return m?m[1]:null;};
  const slAdd=()=>{const u=slUrl.trim();if(!u)return;const kind=ytId(u)?"youtube":/spotify\.com/.test(u)?"spotify":"mp3";setSoundQueue(q=>[...q.slice(-9),{id:Date.now(),url:u,kind}]);setSlUrl("");say(kind==="spotify"?"Queued (Spotify embed — full playback needs Premium SDK)":"Queued");};
  const slPlay=item=>{if(item.kind==="mp3"){if(audioRef.current){audioRef.current.pause();}const a=new Audio(item.url);audioRef.current=a;a.play().catch(()=>say("Couldn't play that URL"));}setSlPlaying(item.id);};
  const slStop=()=>{if(audioRef.current)audioRef.current.pause();setSlPlaying(null);};
  useEffect(()=>()=>{if(audioRef.current)audioRef.current.pause();},[]);
  const joinFounders=async()=>{if(!fHandle.trim()||fHandle.trim().length<2){say("Enter a handle");return;}setFBusy(true);try{await onFounderJoin(fHandle.trim(),fEmail.trim());say("You're a founder! Data secured on the test server 🏆","success");}catch{say("Couldn't reach the server — try again","error");}setFBusy(false);};
  const isIOS=typeof navigator!=="undefined"&&/iPad|iPhone|iPod/.test(navigator.userAgent);
  const avatar=useMemo(()=>renderAvatar(profile.avatarSeed),[profile.avatarSeed]);
  const filtered=[...posts].filter(p=>!searchQ||p.title?.toLowerCase().includes(searchQ.toLowerCase())||p.style?.toLowerCase().includes(searchQ.toLowerCase())).sort((a,b)=>{if(filter==="loks")return b.votes-a.votes;if(filter==="views")return(b.views||0)-(a.views||0);return 0;}).filter(p=>filter==="battle"?p.from==="battle":filter==="series"?p.style==="series":filter==="weekly"?p.weeklyPrompt===WEEKLY_PROMPT:true);
  const nextMilestone=[10,25,50,100].find(m=>questsCompleted<m);
  const bookmarked=posts.filter(p=>bookmarks.includes(p.id));
  const sortedBookmarks=[...bookmarked].sort((a,b)=>{if(bSort==="votes")return b.votes-a.votes;if(bSort==="views")return(b.views||0)-(a.views||0);return bookmarks.indexOf(a.id)-bookmarks.indexOf(b.id);});
  return(<div>
    <section className="mt-4 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`6px 6px 0 ${T.shadow}`}}>
      <div className="flex items-center gap-4">
        <FramedAvatar src={avatar} size={72} frame={cosmetics.frame} accent={cosmetics.avatarAccent} ink={T.ink} acc={T.accent} animated={animatedToken}/>
        <div className="min-w-0 flex-1"><div className="lok-display text-xl font-extrabold leading-tight flex items-center gap-2 flex-wrap"><NameTag name={profile.name} color={cosmetics.nameColor} style={{color:T.ink}}/>{lokPass&&!kids&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PASS</span>}</div><div className="text-sm opacity-70">{posts.length} flips · {wins} {wins===1?"win":"wins"}</div></div>
        <div className="flex gap-1.5">
          {notifUnread>0&&<button onClick={()=>{setShowNotifs(v=>!v);onClearNotifs&&onClearNotifs();}} className="lok-btn relative px-2 py-1.5 rounded-full text-xs font-bold" style={{border:`2px solid ${T.accent}`,background:T.accent,color:"#fff"}} aria-label={`${notifUnread} notifications`}>🔔 {notifUnread}</button>}
          <button onClick={()=>{setDraft(profile);setEditing(true);}} className="lok-btn px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Edit profile">Edit</button>
          <button onClick={()=>setShowSettings(true)} className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Settings">⚙</button>
        </div>
      </div>
      {showNotifs&&notifications.length>0&&(<div className="mt-3 flex flex-col gap-1.5">{notifications.slice(-5).reverse().map(n=>(<div key={n.id} className="text-xs px-3 py-2 rounded-xl" style={{background:T.paper,border:`1.5px solid ${T.shadow}`}}>{n.msg}</div>))}</div>)}
      <p className="mt-3 text-sm leading-snug">{profile.bio}</p>
      <div className="mt-3 grid grid-cols-4 gap-2">{[["lokdin","Lok'd in",(lokdInCount).toLocaleString()],["lokd","Lok'd",following.length],["bookmarks","Bookmarks",bookmarks.length]].map(([id,label,n])=>(<button key={id} onClick={()=>setView(view===id?"gallery":id)} className="lok-btn py-2 rounded-xl text-center" style={{border:`2.5px solid ${view===id?T.accent:T.ink}`,background:view===id?T.ink:"transparent",color:view===id?T.paper:T.ink}} aria-pressed={view===id}><div className="lok-display font-extrabold leading-none">{n}</div><div className="text-[11px] opacity-75">{label}</div></button>))}<button onClick={()=>setShowBadges(true)} className="lok-btn py-2 rounded-xl text-center" style={{border:`2.5px solid ${T.shadow}`,background:T.card}}><div className="lok-display font-extrabold leading-none">{unlockedCount}</div><div className="text-[11px] opacity-75">Badges</div></button></div>
    {showBadges&&<BadgeWall badges={badges} unlockedCount={unlockedCount} onClose={()=>setShowBadges(false)}/>}
    </section>
    {!kids&&(<section className="mt-3 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-between"><div className="lok-display font-extrabold">Level {level}</div><div className="text-xs opacity-70">{xp%100}/100 XP</div></div>
      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${xp%100}%`,height:"100%",background:T.accent}}/></div>
      <div className="lok-display font-extrabold mt-3 mb-1 text-sm">Today's quests</div>
      <div className="space-y-1.5">{quests?.items?.map(q=>(<div key={q.id} className="flex items-center gap-2 text-sm"><span className="font-bold" style={{color:q.done?T.alt:T.ink,opacity:q.done?1:0.9}}>{q.done?"✓":"○"}</span><span className="flex-1" style={{textDecoration:q.done?"line-through":"none",opacity:q.done?0.55:1}}>{q.label}</span><span className="text-xs font-bold" style={{color:T.accent}}>{q.progress}/{q.goal} · +{q.reward}</span></div>))}</div>
    </section>)}
    {!kids&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="flex items-center justify-between mb-1.5"><div className="lok-display font-extrabold text-sm">Loks</div>{nextMilestone&&<div className="text-[10px] opacity-50 font-bold">next quest milestone: {nextMilestone}</div>}</div>
      <div className="flex items-center justify-around">
        <div className="text-center"><div className="lok-display font-extrabold text-xl" style={{color:T.accent}}>{loks}</div><div className="text-[11px] opacity-60">balance</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{totalEarned}</div><div className="text-[11px] opacity-60">earned all-time</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{questsCompleted}</div><div className="text-[11px] opacity-60">quests done</div></div>
      </div>
    </section>)}
    {showSettings&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setShowSettings(false)}>
      <div className="w-full rounded-t-3xl p-5" style={{maxWidth:560,background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">Settings</div><button onClick={()=>setShowSettings(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close settings">✕</button></div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">📱 Add Lok to your home screen</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{isIOS?"Tap the Share button in Safari, then \u201CAdd to Home Screen\u201D. Lok opens full-screen like a native app.":"Install Lok as an app — it gets its own icon and opens full-screen, no browser bars."}</div>
          {!isIOS&&<button onClick={()=>onInstall&&onInstall()} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:canInstall?T.accent:T.shadow,color:canInstall?T.onAccent:T.ink,border:`3px solid ${T.ink}`,opacity:canInstall?1:0.7}} aria-label="Install Lok as an app">{canInstall?"Install Lok":"Install via browser menu →"}</button>}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${account?T.alt:T.accent}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">💾 Lok account{account&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:"#fff"}}>{account}</span>}</div>
          {account?<div className="text-xs opacity-70 mt-1 leading-snug">Signed in. Your Loks, LilLok, streak and progress back up automatically — log in on any device to pick up where you left off. Published flips live on the party feed.<button onClick={async()=>{await auth.signOut();setAccount(null);say("Signed out");}} className="lok-btn mt-2 w-full py-2 rounded-xl font-extrabold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink,background:T.card}}>Sign out</button></div>:(<>
            <div className="text-xs opacity-70 mt-1 leading-snug">Sign in with email (magic link — no password) or OAuth. Your progress backs up to the cloud and syncs across devices.</div>
            <div className="mt-2 flex gap-1.5">
              <input value={emailAddr} onChange={e=>setEmailAddr(e.target.value)} placeholder="your@email.com" type="email" aria-label="Email address" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}} onKeyDown={e=>e.key==="Enter"&&sendMagicLink()}/>
              <button onClick={sendMagicLink} disabled={authBusy} className="lok-btn lok-display shrink-0 px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:authBusy?0.6:1}}>{authBusy?"Sending…":"Send link"}</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={async()=>{try{await auth.signInWithOAuth("google");say("Redirecting to Google…","info");}catch{say("OAuth not configured on this Supabase project","error");}}} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`}}>Sign in with Google</button>
              <button onClick={async()=>{try{await auth.signInWithOAuth("github");say("Redirecting to GitHub…","info");}catch{say("OAuth not configured on this Supabase project","error");}}} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold text-sm" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`}}>Sign in with GitHub</button>
            </div>
          </>)}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${founder?T.alt:T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🏆 Founders' test server{founder&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:"#fff"}}>FOUNDER</span>}</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{founder?"You're in. Your gallery, Loks and LilLok are backed up long-term on LokServices.":"Join the test server and your progress gets backed up long-term — founders keep everything into beta."}</div>
          {!founder&&(<>
            <input value={fHandle} onChange={e=>setFHandle(e.target.value)} placeholder="Handle" aria-label="Founder handle" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
            <input value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="Email (optional — for beta invite)" aria-label="Founder email" className="mt-1.5 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
            <button onClick={joinFounders} disabled={fBusy} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,opacity:fBusy?0.6:1}}>{fBusy?"Joining…":"Join as a founder"}</button>
          </>)}
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">Feed pacing</div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">{Object.entries(PACE_PRESETS).map(([id,p])=>(
            <button key={id} onClick={()=>{setPace&&setPace(id);say(`${p.name} pacing`);}} aria-pressed={pace===id} title={p.desc} className="lok-btn py-1.5 rounded-xl text-[10px] font-extrabold" style={{border:`2.5px solid ${pace===id?T.accent:T.ink}`,background:pace===id?T.ink:T.card,color:pace===id?T.paper:T.ink}}>{p.name}</button>))}</div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold" style={{color:T.ink}}>Speed {speed.toFixed(1)}×<input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e=>setSpeed&&setSpeed(+e.target.value)} className="flex-1" style={{accentColor:T.accent}} aria-label="Animation speed"/></label>
        </div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">Interface</div>
          <label className="mt-1.5 flex items-center gap-2 text-xs font-bold cursor-pointer" style={{color:T.ink}}>
            <button onClick={()=>setCompactDensity(c=>!c)} aria-pressed={compactDensity} className="lok-btn px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2.5px solid ${compactDensity?T.accent:T.ink}`,background:compactDensity?T.ink:T.card,color:compactDensity?T.paper:T.ink}}>{compactDensity?"ON":"OFF"}</button>
            Compact mode · tighter spacing, smaller text in cards
          </label>
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
        <button onClick={()=>setShowManual(true)} className="lok-btn w-full p-3 rounded-2xl mb-2 text-left flex items-center gap-2" style={{border:`3px solid ${T.ink}`,background:T.paper,fontWeight:700,fontSize:14}}><span className="text-xl">📖</span> Game Manual</button>
        {showManual&&<GameManual onClose={()=>setShowManual(false)}/>}
        <div className="p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">About</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={versionTap} style={{cursor:"default"}}>LokBook + Lok N Slide · <span style={{fontWeight:700}}>alpha v1.2</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
        </div>
      </div>
    </div>)}
    {editing&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setEditing(false)}>
      <div className="w-full rounded-t-3xl p-5" style={{maxWidth:560,background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold mb-3">Edit profile</div>
        <div className="flex items-center gap-3 mb-3"><img src={renderAvatar(draft.avatarSeed)} alt="" className="w-16 h-16 rounded-full" style={{border:`3px solid ${T.ink}`}}/><button onClick={()=>setDraft(d=>({...d,avatarSeed:Math.floor(Math.random()*9999)}))} className="lok-btn px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`}} aria-label="Re-roll avatar">Re-roll avatar</button></div>
        <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Handle" aria-label="Display name" className="w-full px-3 py-2.5 rounded-xl font-bold mb-2" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
        <textarea value={draft.bio} onChange={e=>setDraft(d=>({...d,bio:e.target.value}))} placeholder="What's your gallery about?" rows={3} aria-label="Bio" className="w-full px-3 py-2.5 rounded-xl text-sm mb-3" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>
        <button onClick={()=>{setProfile(draft);setEditing(false);say("Profile saved");}} className="lok-btn lok-display w-full py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}} aria-label="Save profile">Save</button>
      </div>
    </div>)}
    {view!=="gallery"?(<div className="mt-5">
      <h2 className="lok-display text-lg font-extrabold mb-2 capitalize">{view==="lokdin"?"Lok'd in with you":view==="lokd"?"You Lok'd":"Your bookmarks"}</h2>
      {view==="bookmarks"?(<><div className="flex gap-1.5 mb-2">{[["add","Newest"],["votes","Most Lok'd"],["views","Most viewed"]].map(([id,l])=>(<button key={id} onClick={()=>setBSort(id)} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{border:`2.5px solid ${T.ink}`,background:bSort===id?T.ink:T.card,color:bSort===id?T.paper:T.ink}}>{l}</button>))}</div><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search bookmarks…" aria-label="Search bookmarks" className="w-full mb-2 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>{sortedBookmarks.length?<div className="grid grid-cols-2 gap-3">{sortedBookmarks.map(p=><PostCard key={p.id} p={p} onOpen={onOpen} onDelete={onDelete}/>)}</div>:<EmptyState icon="bookmarks" title={searchQ?"No bookmarks match":"No bookmarks yet"} subtitle={searchQ?"Try different words":"Lok in to pieces from the viewer to save them here."}/>}</>):view==="lokd"?(following.length?following.map(n=><PersonRow key={n} name={n}/>):<EmptyState icon="follow" title="No one Lok'd yet" subtitle="Lok artists you love and they'll show here."/>):["pixel.pluto","inkwell_iz","doodlebug"].map(n=><PersonRow key={n} name={n} note="Lok'd in"/>)}
    </div>):(<>
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        <h2 className="lok-display text-lg font-extrabold mr-1">Gallery</h2>
        {[["newest","Newest"],["loks","Most Lok'd"],["views","Most viewed"],["battle","Battles"],["series","Series"],["weekly","This week"]].map(([id,label])=>(<button key={id} onClick={()=>setFilter(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`,background:filter===id?T.ink:T.card,color:filter===id?T.paper:T.ink}}>{label}</button>))}
      </div>
      <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search your flips…" aria-label="Search gallery" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      {filtered.length?<div className="mt-2 grid grid-cols-2 gap-3">{filtered.map(p=><PostCard key={p.id} p={p} onOpen={onOpen} onDelete={onDelete}/>)}</div>:<EmptyState icon="search" title={searchQ?"No flips match":"No pieces match"} subtitle={searchQ?"Try different words":"Try a different filter or publish your first flip!"}/>}
    </>)}
  </div>);
}

export default function LokApp(){
  const[ready,setReady]=useState(false);const[tab,setTab]=useState("feed");const[openIdx,setOpenIdx]=useState(null);const[posts,setPosts]=useState([]);const[toasts,setToasts]=useState([]);const[voteCount,setVoteCount]=useState(0);
  const[questsCompleted,setQuestsCompleted]=useState(0);const[totalEarned,setTotalEarned]=useState(0);const[traceHinted,setTraceHinted]=useState(false);const[fabBubble,setFabBubble]=useState("");const[adIdx,setAdIdx]=useState(0);const[installEvt,setInstallEvt]=useState(null);const[showSettings,setShowSettings]=useState(false);
  const[loks,setLoks]=useState(260);const[pace,setPace]=useState("sweep");const[speed,setSpeed]=useState(1);const[soundLab,setSoundLab]=useState(false);const[soundQueue,setSoundQueue]=useState([]);const[founder,setFounder]=useState(false);const[totalSpent,setTotalSpent]=useState(0);const[fodHistory,setFodHistory]=useState([]);const[lokPass,setLokPass]=useState(false);const[lokPassBusy,setLokPassBusy]=useState(false);const[uiTheme,setUiTheme]=useState("riso");const[ownedThemes,setOwnedThemes]=useState(["riso"]);const[effect,setEffect]=useState("none");const[ownedEffects,setOwnedEffects]=useState(["none"]);const[sky,setSky]=useState("clear");const[ownedSkies,setOwnedSkies]=useState(["clear"]);const[studioModules,setStudioModules]=useState(["layers_10","brush_ink"]);const[bigBattleOwned,setBigBattleOwned]=useState(false);const[wins,setWins]=useState(0);const[offlineBonusDay,setOfflineBonusDay]=useState("");
  const[tides,setTides]=useState({candidates:[],voted:false,myVote:"",results:null,loaded:false});
  const[eventClaimed,setEventClaimed]=useState("");
  const activeEvent=useMemo(()=>getActiveEvent(),[]);
  const[profile,setProfile]=useState({name:"",bio:"",avatarSeed:Math.floor(Math.random()*9999),links:[{label:"Lok page",url:"coming soon"}]});
  const[bookmarks,setBookmarks]=useState([]);const[following,setFollowing]=useState(["moss.ink"]);const[lokdInCount]=useState(2300);const[lillok,setLillok]=useState({ink:80,bond:30,stasis:false,name:"Blot",lastSeen:Date.now()});const[customLilLok,setCustomLilLok]=useState(null);const[cosmetics,setCosmetics]=useState({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",lillokGear:"none"});const[owned,setOwned]=useState({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],paper:["plain"],lillokGear:["none"]});const[kids,setKids]=useState(false);  const[showLilLok,setShowLilLok]=useState(false);const[onboarded,setOnboarded]=useState(false);const[showOnboard,setShowOnboard]=useState(false);const[showHint,setShowHint]=useState(false);const[showBadges,setShowBadges]=useState(false);const[sound,setSound]=useState(false);const[feedMode,setFeedMode]=useState("discover");const[daily,setDaily]=useState({day:null,streak:0,claimed:false,prompt:""});const[xp,setXp]=useState(0);const[quests,setQuests]=useState(null);const[feedCursor,setFeedCursor]=useState(null);const[loadingMore,setLoadingMore]=useState(false);  const[flair,setFlair]=useState("");const[compactDensity,setCompactDensity]=useState(false);const[adVisible,setAdVisible]=useState(true);const[notifications,setNotifications]=useState([]);const[notifUnread,setNotifUnread]=useState(0);
  const[account,setAccount]=useState(null);const[tips,setTips]=useState({});const[artistView,setArtistView]=useState(null);const[online,setOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
  const {blip,hap}=useFeedback(sound);
  const adScrollTimer=useRef(null);const earnLog=useRef({ts:Date.now(),total:0});const audioCtx=useRef(null);const lastCloudPush=useRef(0);const lastSeenRef=useRef(Date.now());
  const T=THEMES[uiTheme];const phase=lilLokPhase(lillok);const level=Math.floor(xp/100)+1;
  const flipOfDay=useMemo(()=>{const c=posts.filter(p=>p.frames?.length>=2);if(!c.length)return null;
    const today=new Date().toDateString();const cutoff=Date.now()-FOD_WINDOW_DAYS*86400000;
    const recent=new Set(fodHistory.filter(h=>h.ts>cutoff&&h.day!==today).map(h=>h.id));
    const sorted=[...c].sort((a,b)=>b.votes-a.votes);
    return sorted.find(p=>!recent.has(p.id))||sorted[0];},[posts,fodHistory]);
  const badgeStats=useMemo(()=>({
    posts:posts.length,
    series:posts.filter(p=>p.style==="series").length,
    views:posts.reduce((s,p)=>s+(p.views||0),0),
    receivedVotes:posts.reduce((s,p)=>s+(p.votes||0),0),
    revivals:posts.filter(p=>p.from==="revival").length,
    streak:daily.streak,lokd:following.length,
    founder:founder,offlineBonuses:offlineBonusDay?1:0,
    votes:voteCount,
  }),[posts,daily.streak,founder,offlineBonusDay,voteCount,following.length]);
  const badges=useMemo(()=>BADGES.map(b=>({...b,unlocked:b.check(badgeStats)})),[badgeStats]);
  const unlockedCount=useMemo(()=>badges.filter(b=>b.unlocked).length,[badges]);
  useEffect(()=>{if(!ready||!flipOfDay)return;const today=new Date().toDateString();
    setFodHistory(h=>{if(h.some(x=>x.day===today))return h;return[...h.filter(x=>x.ts>Date.now()-FOD_WINDOW_DAYS*86400000),{id:flipOfDay.id,day:today,ts:Date.now()}];});},[ready,flipOfDay]);
  useEffect(()=>{const onScroll=()=>{setAdVisible(false);clearTimeout(adScrollTimer.current);adScrollTimer.current=setTimeout(()=>setAdVisible(true),1200);};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);
  const guardedAddLoks=useCallback(n=>{const now=Date.now();if(now-earnLog.current.ts>3600000){earnLog.current={ts:now,total:0};}if(earnLog.current.total+n>120){return;}earnLog.current.total+=n;setLoks(l=>l+n);setTotalEarned(t=>t+n);},[]);
  const addLoks=guardedAddLoks;
  const pushNotif=useCallback((msg,type="info")=>{setNotifications(ns=>[...ns.slice(-49),{id:Date.now(),msg,type,ts:Date.now()}]);setNotifUnread(n=>n+1);},[]);
  const say=useCallback((m,type="default")=>{const id=Date.now()+Math.random();setToasts(t=>[...t.slice(-2),{id,msg:m,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);},[]);
  const showLine=useCallback((ctx="")=>{setFabBubble(getLilLokLine(lilLokPhase(lillok),ctx,{name:lillok.name,ink:lillok.ink,bond:lillok.bond,wins,streak:daily.streak,loks}));setTimeout(()=>setFabBubble(""),3500);},[lillok,wins,daily.streak,loks]);
  const gainXp=useCallback(n=>setXp(x=>{const before=Math.floor(x/100);const nx=x+n;if(Math.floor(nx/100)>before){setTimeout(()=>say(`Level ${Math.floor(nx/100)+1}! New flair unlocked`),300);}return nx;}),[say]);
  const questTick=useCallback((track,amt=1)=>{setQuests(q=>{if(!q)return q;let paid=0,msg=null,doneCount=0;const items=q.items.map(it=>{if(it.track!==track||it.done)return it;const progress=Math.min(it.goal,it.progress+amt);const done=progress>=it.goal;if(done){paid+=it.reward;doneCount++;msg=`Quest done: ${it.label} · +${it.reward}`;}return{...it,progress,done};});if(paid){setLoks(l=>l+paid);setTotalEarned(t=>t+paid);gainXp(paid);setTimeout(()=>say(msg,"success"),250);setQuestsCompleted(c=>{const nc=c+doneCount;const m=[10,25,50,100].find(x=>c<x&&nc>=x);if(m){const bonus=m*2;setLoks(l=>l+bonus);setTotalEarned(t=>t+bonus);setTimeout(()=>{say(`🎖 ${m} quests done · +${bonus} bonus Loks`,"success");hap([200,100,200,100,200]);},700);}return nc;});}return{...q,items};});},[gainXp,say,hap]);
  useEffect(()=>{(async()=>{
    const dayOfYear=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const todayPromptIdx=(new Date().getFullYear()*366+dayOfYear(new Date()))%PROMPTS.length;
    const makeSeedLazy=(drawFn,n,id,meta)=>({...meta,id,frames:[],_pendingDraw:drawFn,_pendingN:n,paceMs:meta.paceMs});
    const seed=[
      makeSeedLazy(drawBounce,14,"seed1",{title:"Bounce study",author:"moss.ink",paceMs:110,votes:41,voted:false,viewed:false,reactions:{splat:12,heart:30,drip:5,humhah:6,bomhogwah:3},from:"studio",mode:"A",style:"bold",views:312,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawBloom,12,"seed2",{title:"Bloom",author:"moss.ink",paceMs:150,votes:67,voted:false,viewed:false,reactions:{splat:8,heart:52,drip:9,humhah:14,bomhogwah:4},from:"studio",mode:"B",style:"series",views:540,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawNight,13,"seed3",{title:"Night flight",author:"moss.ink",paceMs:130,votes:29,voted:false,viewed:false,reactions:{splat:21,heart:14,drip:11,humhah:3,bomhogwah:8},from:"studio",mode:"A",style:"bold",views:188,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawWave,14,"seed4",{title:"Harbor loop",author:"moss.ink",paceMs:130,loop:true,votes:38,voted:false,viewed:false,reactions:{splat:6,heart:27,drip:4,humhah:9,bomhogwah:2},from:"studio",mode:"A",style:"bold",views:265,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawOrbit,16,"seed5",{title:"Orbit study",author:"inkwell_iz",paceMs:100,loop:true,votes:53,voted:false,viewed:false,reactions:{splat:9,heart:35,drip:7,humhah:7,bomhogwah:5},from:"studio",mode:"A",style:"bold",views:410,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawWalk,12,"seed6",{title:"Little walker",author:"sketchram",paceMs:120,votes:34,voted:false,viewed:false,reactions:{splat:11,heart:19,drip:3,humhah:11,bomhogwah:2},from:"studio",mode:"A",style:"bold",views:230,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawFish,14,"seed7",{title:"Koi drift",author:"tinta",paceMs:140,loop:true,votes:72,voted:false,viewed:false,reactions:{splat:5,heart:61,drip:12,humhah:8,bomhogwah:6},from:"studio",mode:"A",style:"bold",views:598,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawBurst,12,"seed8",{title:"FIREWORKS!!",author:"mooncrayon",paceMs:110,votes:45,voted:false,viewed:false,reactions:{splat:30,heart:22,drip:2,humhah:5,bomhogwah:15},from:"studio",mode:"A",style:"bold",views:340,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawRain,12,"seed9",{title:"Rain window",author:"pixel.pluto",paceMs:150,votes:26,voted:false,viewed:false,reactions:{splat:7,heart:16,drip:14,humhah:4,bomhogwah:9},from:"studio",mode:"B",style:"series",views:172,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawSpiral,14,"seed10",{title:"Golden spiral",author:"moss.ink",paceMs:130,loop:true,votes:48,voted:false,viewed:false,reactions:{splat:4,heart:36,drip:8,humhah:10,bomhogwah:3},from:"studio",mode:"A",style:"bold",views:295,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawPulse,13,"seed11",{title:"Heartbeat",author:"inkwell_iz",paceMs:120,loop:true,votes:56,voted:false,viewed:false,reactions:{splat:3,heart:65,drip:2,humhah:7,bomhogwah:4},from:"studio",mode:"A",style:"bold",views:445,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawFirework,14,"seed12",{title:"Burst city",author:"mooncrayon",paceMs:110,votes:39,voted:false,viewed:false,reactions:{splat:42,heart:18,drip:2,humhah:6,bomhogwah:12},from:"studio",mode:"A",style:"bold",views:290,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawMorph,13,"seed13",{title:"Shape shifter",author:"tinta",paceMs:140,loop:true,votes:33,voted:false,viewed:false,reactions:{splat:5,heart:22,drip:7,humhah:12,bomhogwah:5},from:"studio",mode:"B",style:"series",views:205,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawBurst,16,"seed14",{title:"GALAXY BOOM",author:"sketchram",paceMs:100,votes:51,voted:false,viewed:false,reactions:{splat:28,heart:33,drip:6,humhah:9,bomhogwah:10},from:"studio",mode:"A",style:"bold",views:375,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawSpiral,12,"seed15",{title:"Nautilus dream",author:"moss.ink",paceMs:150,loop:true,votes:44,voted:false,viewed:false,reactions:{splat:6,heart:29,drip:10,humhah:8,bomhogwah:7},from:"studio",mode:"B",style:"series",views:320,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy((()=>{const p=makeDoodlePainter(420);return(c,t)=>p(c,t);})(),11,"seed16",{title:"Doodle garden",author:"inkwell_iz",paceMs:130,votes:37,voted:false,viewed:false,reactions:{splat:9,heart:24,drip:13,humhah:14,bomhogwah:5},from:"studio",mode:"A",style:"bold",views:255,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy((()=>{const p=makeDoodlePainter(999);return(c,t)=>p(c,t);})(),12,"seed17",{title:"Night scribble",author:"sketchram",paceMs:140,votes:31,voted:false,viewed:false,reactions:{splat:14,heart:18,drip:8,humhah:6,bomhogwah:11},from:"studio",mode:"B",style:"series",views:198,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
    ];
    const save=await store.get(SAVE_KEY);const savedGallery=await store.get(GALLERY_KEY);const todayKey=new Date().toDateString();
    let loadedDaily={day:todayKey,streak:1,claimed:false,prompt:activeEvent?activeEvent.prompt:PROMPTS[todayPromptIdx]};
    if(save){setLoks(save.loks??60);setLokPass(!!save.lokPass);setUiTheme(save.uiTheme||"riso");setOwnedThemes(save.ownedThemes||["riso"]);setEffect(save.effect||"none");setOwnedEffects(save.ownedEffects||["none"]);setSky(save.sky||"clear");setOwnedSkies(save.ownedSkies||["clear"]);setStudioModules(save.studioModules||migrateLegacyModules(save));setBigBattleOwned(!!save.bigBattleOwned);setWins(save.wins??0);if(save.profile)setProfile(save.profile);setBookmarks(save.bookmarks||[]);setFollowing(save.following||[]);setKids(!!save.kids);if(save.customLilLok)setCustomLilLok(save.customLilLok);if(save.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",lillokGear:"none",...save.cosmetics});if(save.owned)setOwned({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],paper:["plain"],lillokGear:["none"],...save.owned});setOnboarded(!!save.onboarded);setSound(!!save.sound);setXp(save.xp??0);setFlair(save.flair||"");setQuestsCompleted(save.questsCompleted??0);setTotalEarned(save.totalEarned??0);setTraceHinted(!!save.traceHinted);setPace(save.pace||"sweep");setSpeed(save.speed??1);setSoundLab(!!save.soundLab);setSoundQueue(save.soundQueue||[]);setFounder(!!save.founder);setTotalSpent(save.totalSpent??0);setFodHistory(save.fodHistory||[]);setAccount(save.account||null);setTips(save.tips||{});setOfflineBonusDay(save.offlineBonusDay||"");setEventClaimed(save.eventClaimed||"");if(!save.onboarded)setShowHint(false);else setShowHint(true);
    if(save.daily?.day){if(save.daily.day===todayKey)loadedDaily=save.daily;else{const diff=Math.round((new Date(todayKey)-new Date(new Date(save.daily.day).toDateString()))/86400000);loadedDaily={day:todayKey,streak:diff===1?(save.daily.streak||0)+1:diff<=7?(save.daily.streak||0):1,claimed:false,prompt:activeEvent?activeEvent.prompt:PROMPTS[todayPromptIdx]};}}
    const gap=Date.now()-(save.lillok?.lastSeen||Date.now());const ll=save.lillok||lillok;lastSeenRef.current=save.lillok?.lastSeen||Date.now();const buffer=1-((ll.bond||0)/100)*0.5;const inkDrain=Math.min(ll.ink,Math.floor(gap/60000)*1.2*buffer);const newInk=Math.max(0,ll.ink-inkDrain);setLillok({...ll,stasis:ll.stasis||(newInk===0&&gap>600000),ink:newInk,inkZeroAt:null,lastSeen:Date.now()});}
    setDaily(loadedDaily);const savedQ=save?.quests&&save.quests.day===todayKey?save.quests:{day:todayKey,items:makeQuests()};setQuests(savedQ);
    const tidePool=PROMPTS.filter(p=>p!==loadedDaily.prompt).sort(()=>Math.random()-0.5).slice(0,TIDE_CANDIDATE_COUNT);const savedTide=localStorage.getItem("lok:tide:"+todayKey);setTides({candidates:tidePool,voted:!!savedTide,myVote:savedTide||"",results:null,loaded:true});
    const userPosts=(savedGallery||[]).map(p=>({...p,voted:false,viewed:false}));setPosts([...userPosts,...seed]);if(!save||!save.onboarded)setShowOnboard(true);
    auth.init(session => {
      if (session?.user) {
        setAccount(session.user.email || session.user.id);
      } else if (save?.account) {
        setAccount(save.account);
      }
    });
    const params=new URLSearchParams(window.location.search);const sid=params.get("session_id");
    if(sid){window.history.replaceState({},"",window.location.pathname);
      try{const r=await fetch(`${SUPA_URL}/functions/v1/verify-checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sid})});
        if(r.ok){const{verified}=await r.json();if(verified&&!lokPass){setLokPass(true);setOwnedThemes(Object.keys(THEMES));say("LokPass verified!","success");pushNotif("LokPass purchase confirmed!","success");}}
      }catch(e){console.warn("Verify failed",e);}}
    setReady(true);
    // Cloud pull on mount: recover progress from server if localStorage was cleared
    if(save?.account){lokApi.fetchSave(save.account).then(cloud=>{if(cloud&&JSON.stringify(cloud)!==JSON.stringify(save)){store.set(SAVE_KEY,{...cloud,account:save.account});location.reload();}});}
    seed.forEach((s,i)=>{if(!s._pendingDraw)return;setTimeout(()=>{const frames=renderSequence(s._pendingDraw,s._pendingN);setPosts(ps=>ps.map(p=>p.id===s.id?{...p,frames,paceMs:s.paceMs||140}:p));},i*80+50);});
  })();},[]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{const blob={loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies,studioModules,bigBattleOwned,wins,offlineBonusDay,tides,eventClaimed,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,account,tips,compactDensity,lillok:{...lillok,lastSeen:Date.now()}};store.set(SAVE_KEY,blob);if(account&&Date.now()-lastCloudPush.current>15000){lastCloudPush.current=Date.now();lokApi.pushSave(account,blob);}},400);return()=>clearTimeout(t);},[ready,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies,studioModules,bigBattleOwned,wins,offlineBonusDay,tides,eventClaimed,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,account,tips,compactDensity,lillok]);
  useEffect(()=>{if(!ready)return;const userPosts=posts.filter(p=>!p.id?.startsWith("seed"));const t=setTimeout(()=>{store.set(GALLERY_KEY,userPosts).then(ok=>{if(!ok)say("Gallery too big");});},500);return()=>clearTimeout(t);},[ready,posts]);
  useEffect(()=>{if(!ready||kids)return;let interval=null;const startDecay=()=>{interval=setInterval(()=>setLillok(s=>{if(s.stasis)return s;if(s.ink===0){if(!s.inkZeroAt)return{...s,inkZeroAt:Date.now()};if(Date.now()-s.inkZeroAt>120000)return{...s,stasis:true,inkZeroAt:null};return s;}const buffer=1-(s.bond/100)*0.5;return{...s,ink:Math.max(0,s.ink-1.4*buffer)};}),12000);};const stopDecay=()=>{clearInterval(interval);interval=null;};const onVisible=()=>{if(document.visibilityState==="hidden")stopDecay();else startDecay();};startDecay();document.addEventListener("visibilitychange",onVisible);return()=>{stopDecay();document.removeEventListener("visibilitychange",onVisible);};},[ready,kids]);
  useEffect(()=>{if(!ready)return;const gap=Date.now()-lastSeenRef.current;const todayKey=new Date().toDateString();if(gap>OFFLINE_BONUS_HOURS*3600000&&offlineBonusDay!==todayKey&&lastSeenRef.current!==Date.now()){addLoks(OFFLINE_BONUS_LOKS);gainXp(10);setOfflineBonusDay(todayKey);setTimeout(()=>say(`Welcome back! +${OFFLINE_BONUS_LOKS} Loks · +10 XP`,"success"),600);feedLilLok(20,"revival");}},[ready]);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  useEffect(()=>{const goOnline=()=>setOnline(true);const goOffline=()=>setOnline(false);window.addEventListener("online",goOnline);window.addEventListener("offline",goOffline);setOnline(navigator.onLine);return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};},[]);
  useEffect(()=>{if(lokPass||kids)return;const t=setInterval(()=>setAdIdx(i=>(i+1)%ADS.length),8000);return()=>clearInterval(t);},[lokPass,kids]);
  useEffect(()=>{if(!ready)return;const t1=setTimeout(()=>showLine(),4000);const t2=setInterval(()=>{if(!showLilLok)showLine();},60000);return()=>{clearTimeout(t1);clearInterval(t2);};},[ready]);
  const patchPost=(id,patch)=>setPosts(ps=>ps.map(p=>(p.id===id?{...p,...patch}:p)));
  const boostPost=(id,label)=>{if(loks<20){say("Need 20 Loks to boost","error");return false;}setLoks(l=>l-20);setTotalSpent(t=>t+20);patchPost(id,{boostedAt:Date.now()});say(`"${label}" boosted · −20 Loks`,"success");return true;};
  const spend=(cost,ok,label)=>{if(loks<cost){say(`Need ${cost} Loks`);return false;}setLoks(l=>l-cost);setTotalSpent(t=>t+cost);ok();say(`${label} · −${cost} Loks`);return true;};
  const animatedToken=totalSpent>=ANIMATED_AVATAR_SPEND;
  const feedLilLok=(amt=20,ctx="direct")=>{setLillok(s=>{const wasStasis=s.stasis;const cap=wasStasis?40:100;const bondGain=ctx==="revival"?8:ctx==="creation"?3:2;return{...s,ink:Math.min(cap,s.ink+amt),bond:Math.min(100,s.bond+bondGain),stasis:false,inkZeroAt:null,lastSeen:Date.now()};});hap([40]);};
  // publish locally + to the shared party feed (frames JPEG-compressed for storage & upload)
  const publishPost=useCallback(async post=>{
    let frames=post.frames;try{frames=await Promise.all(post.frames.map(f=>compressFrame(f)));}catch{}
    const p={...post,frames,author:profile.name};
    setPosts(ps=>[p,...ps]);
    lokApi.publishPost(toDbPost(p,profile.name)).then(ok=>{if(ok)say("Shared to the party feed ✦","success");});
    return p;
  },[profile.name,say]);
  const syncFeed=useCallback(async()=>{try{const rows=await lokApi.fetchPosts();if(!rows.length)return;
    setPosts(ps=>{const have=new Set(ps.map(p=>p.id));const fresh=rows.filter(r=>!have.has(r.id)&&r.author!==profile.name).map(fromDbPost);
      const updated=ps.map(p=>{if(!p.remote)return p;const r=rows.find(x=>x.id===p.id);return r&&r.votes>p.votes?{...p,votes:r.votes}:p;});
      if(fresh.length)setFeedCursor(rows[rows.length-1]?.created_at||null);
      return fresh.length?[...fresh,...updated]:updated;});}catch{}},[profile.name]);
  const loadMore=useCallback(async()=>{if(loadingMore||!feedCursor)return;setLoadingMore(true);try{const rows=await lokApi.fetchPosts(60,feedCursor);if(!rows.length){setFeedCursor(null);return;}setPosts(ps=>{const have=new Set(ps.map(p=>p.id));const older=rows.filter(r=>!have.has(r.id)&&r.author!==profile.name).map(fromDbPost);setFeedCursor(rows[rows.length-1]?.created_at||null);return older.length?[...ps,...older]:ps;});}catch{}setLoadingMore(false);},[feedCursor,loadingMore,profile.name]);
  useEffect(()=>{if(!ready)return;syncFeed();let channel;try{channel=supabase.channel("public:lok_posts").on("postgres_changes",{event:"INSERT",schema:"public",table:"lok_posts"},p=>{const n=fromDbPost(p.new);if(n.author!==profile.name)setPosts(ps=>ps.some(x=>x.id===n.id)?ps:[n,...ps]);}).on("postgres_changes",{event:"UPDATE",schema:"public",table:"lok_posts"},p=>{const u=p.new;setPosts(ps=>ps.map(x=>x.id===u.id&&x.remote?{...x,votes:u.votes}:x));}).subscribe();}catch(e){console.warn("Realtime unavailable",e);}const t=setInterval(()=>{if(document.visibilityState==="visible")syncFeed();},60000);return()=>{try{channel?.unsubscribe();}catch{}clearInterval(t);};},[ready,syncFeed,profile.name]);
  const doSignup=useCallback(async(handle,pin)=>{const blob=await store.get(SAVE_KEY);await lokApi.signup(handle,pin,blob);setAccount(handle);setProfile(p=>({...p,name:handle}));pushNotif(`Account @${handle} created — cloud backup on`,"success");say(`Welcome, ${handle}! Backed up ✓`,"success");},[pushNotif,say]);
  const doLogin=useCallback(async(handle,pin)=>{const row=await lokApi.login(handle,pin);if(row.save_blob){await store.set(SAVE_KEY,{...row.save_blob,account:row.handle});say("Account found — restoring…","success");setTimeout(()=>location.reload(),600);}else{setAccount(row.handle);setProfile(p=>({...p,name:row.handle}));}},[say]);
  const echoPost=useCallback(async post=>{patchPost(post.id,{echoCount:(post.echoCount||0)+1,echoedAt:Date.now(),echoExpiresAt:Date.now()+ECHO_EXPIRY_HOURS*3600000});const echo={id:post.id+"_e"+Date.now(),title:post.title+(post.title.endsWith("(echo)")?"":" (echo)"),frames:post.frames,frameDurations:post.frameDurations,paceMs:post.paceMs,mode:post.mode,style:post.style,loop:post.loop,votes:0,voted:false,viewed:false,views:0,reactions:{...post.reactions},echoedAt:Date.now(),echoCount:0,echoParent:post.id,echoExpiresAt:Date.now()+ECHO_EXPIRY_HOURS*3600000,from:"echo",author:post.author,remote:false};setPosts(ps=>[echo,...ps]);const url=`https://lok.app/echo/${post.id}`;try{if(navigator.share){await navigator.share({title:post.title,text:ECHO_SHARE_TEXT,url});}else{await navigator.clipboard.writeText(url+" — "+ECHO_SHARE_TEXT);say("Link copied — ");}say("Echo sent! Fades in "+ECHO_EXPIRY_HOURS+"h","success");blip("F5");hap([20,10]);}catch{}},[say]);
  const voteTide=useCallback(prompt=>{if(tides.voted)return;const todayKey=new Date().toDateString();setTides(t=>({...t,voted:true,myVote:prompt}));try{localStorage.setItem("lok:tide:"+todayKey,prompt);}catch{}blip("B4");hap([15]);say("Tide vote saved! Results tomorrow","info");},[tides.voted]);
  const claimEvent=useCallback(()=>{if(!activeEvent||eventClaimed===activeEvent.id)return;setEventClaimed(activeEvent.id);addLoks(activeEvent.reward);gainXp(50);feedLilLok(30,"creation");blip("C6");hap([50,30,80]);say(`${activeEvent.name} reward claimed · +${activeEvent.reward} Loks`,"success");pushNotif(`🎉 ${activeEvent.name} reward collected! +${activeEvent.reward} Loks`,"success");},[activeEvent,eventClaimed]);
  useEffect(()=>{if(!ready)return;const t=setInterval(()=>{const now=Date.now();setPosts(ps=>ps.filter(p=>!p.echoExpiresAt||p.echoExpiresAt>now));},30000);return()=>clearInterval(t);},[ready]);
  if(!ready)return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:ART.paper,color:ART.ink,fontFamily:"'Bricolage Grotesque',system-ui,sans-serif"}}>
    <style>{`@keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}} @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}} @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    <svg width="64" height="64" viewBox="0 0 64 64" style={{animation:"inkdrop .7s cubic-bezier(.34,1.56,.64,1) forwards",marginBottom:20}}>
      <ellipse cx="37" cy="37" rx="18" ry="18" fill={ART.pink} opacity="0.55"/>
      <path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill="none" stroke={ART.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill={ART.ink} opacity="0.08"/>
    </svg>
    <div style={{fontWeight:800,fontSize:26,letterSpacing:"-0.02em",animation:"inkfade .5s .3s ease both"}}>LokBook</div>
    <div style={{fontSize:13,opacity:0.5,marginTop:6,animation:"inkfade .5s .5s ease both"}}>loading your ink…</div>
    <div style={{display:"flex",gap:6,marginTop:20,animation:"inkfade .5s .7s ease both"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:ART.ink,animation:`inkpulse 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
  </div>);
  return(<ErrorBoundary><ThemeCtx.Provider value={T}>
    <div className={"min-h-screen w-full"+(compactDensity?" lok-compact":"")} style={{background:T.paper,color:T.ink,fontFamily:"'Schibsted Grotesk',system-ui,sans-serif",animation:effect==="quake"&&!reduceMotion?"lokquake 6s infinite":"none"}}>
      <GlobalStyle T={T} pace={pace} speed={speed}/><SkyEffect sky={sky} paper={T.paper}/><PageEffect effect={effect}/>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={()=>setTab("feed")} aria-label="Go to feed" className="lok-btn lok-display relative text-2xl font-extrabold tracking-tight select-none" style={{background:"transparent",border:"none",padding:0}}>
          <span className="absolute" style={{color:T.accent,left:3,top:2}}>Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
          <span className="relative">Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
        </button>
        <div className="flex items-center gap-2">
          {kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.alt,color:"#fff"}}>SAFE</span>}
          {lokPass&&!kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.accent,color:T.onAccent}}>PASS</span>}
          {!online&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:"#C23B22",color:"#fff"}} aria-label="Offline">✕ wifi</span>}
          <button onClick={()=>setSound(s=>!s)} aria-label={sound?"Mute sound":"Enable sound"} className="lok-btn w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:sound?T.ink:T.card,color:sound?T.paper:T.ink}}>{sound?"♪":"♪̸"}</button>
          <span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.ink,color:T.paper}} aria-label={`Level ${level}`}>Lv {level}</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card}} aria-label={`${loks} Loks`}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="11" cy="11" r="8" fill={T.accent}/><circle cx="9" cy="9" r="8" fill="none" stroke={T.ink} strokeWidth="2.4"/><path d="M7 5.5 V12.5 H12" fill="none" stroke={T.ink} strokeWidth="2.4" strokeLinecap="round"/></svg>
            {loks}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full px-4 pb-40" style={{maxWidth:560}}>
        <div key={tab} className="lok-tabin">
           {tab==="feed"&&<Feed posts={posts} bookmarks={bookmarks} following={following} feedMode={feedMode} setFeedMode={setFeedMode} cosmetics={cosmetics} daily={daily} streak={daily.streak} dailyClaimed={daily.claimed} flipOfDay={flipOfDay} onLine={showLine} onClaimDaily={()=>{if(daily.claimed)return;const wk=daily.streak%7===0&&daily.streak>0?20:0;const mo=daily.streak%30===0&&daily.streak>0?100:0;const bonus=10+Math.min(daily.streak,7)*5+wk+mo;setDaily(d=>({...d,claimed:true}));addLoks(bonus);gainXp(20);feedLilLok(15,"creation");blip("E5");hap([30,20,60]);say(`Day ${daily.streak} claimed · +${bonus} Loks`,"success");}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});if(p.remote)lokApi.votePost(id,p.votes+1);addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);setVoteCount(c=>c+1);say("Vote stamped · +5 Loks","success");if(id.startsWith("seed")){addLoks(5);pushNotif("Your flip got a vote · +5 Loks (creator)","success");}else{pushNotif("You voted · creator notified","success");}}} onLok={name=>{setFollowing(f=>f.includes(name)?f:[...f,name]);questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);blip("A4");hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in to bookmarks");}} onArtist={setArtistView} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);}} onEcho={echoPost} tides={tides} onVoteTide={voteTide} activeEvent={activeEvent} eventClaimed={eventClaimed} onClaimEvent={claimEvent} say={say} loadingMore={loadingMore} onLoadMore={loadMore}/>}
          {tab==="gallery"&&<Profile posts={posts} profile={profile} setProfile={setProfile} wins={wins} lokPass={lokPass} kids={kids} cosmetics={cosmetics} level={level} xp={xp} quests={quests} following={following} lokdInCount={lokdInCount} bookmarks={bookmarks} notifications={notifications} notifUnread={notifUnread} loks={loks} totalEarned={totalEarned} questsCompleted={questsCompleted} canInstall={!!installEvt} onInstall={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("Lok added to your home screen!","success");}catch{}setInstallEvt(null);}else{say("Open your browser menu → Install app / Add to Home Screen");}}} onClearNotifs={()=>setNotifUnread(0)} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onDelete={id=>setPosts(ps=>ps.filter(p=>p.id!==id))} onRename={(id,title)=>patchPost(id,{title})} say={say} account={account} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={()=>setSoundLab(true)} soundQueue={soundQueue} setSoundQueue={setSoundQueue} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} badges={badges} showBadges={showBadges} setShowBadges={setShowBadges} unlockedCount={unlockedCount} compactDensity={compactDensity} setCompactDensity={setCompactDensity}/>}
          {tab==="studio"&&<Studio modules={studioModules} say={say} kids={kids} dailyPrompt={daily.prompt} paper={cosmetics.paper||"plain"} onboarded={onboarded} postCount={posts.length} onPublish={post=>{publishPost(post);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");}}/>}
          {tab==="battle"&&<Battle modules={studioModules} wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok} say={say} blip={blip} hap={hap} onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")} onResult={(won,mult=1)=>{addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));}} onPublish={post=>publishPost(post)}/>}
          {tab==="shop"&&<Shop loks={loks} lokPass={lokPass} lokPassBusy={lokPassBusy} kids={kids} uiTheme={uiTheme} ownedThemes={ownedThemes} effect={effect} ownedEffects={ownedEffects} sky={sky} ownedSkies={ownedSkies} modules={studioModules} onBuyModule={item=>spend(item.price,()=>{if(item.id==="module_uber"){const all=STUDIO_MODULES.filter(m=>m.type!=="achievement").map(m=>m.id);setStudioModules(m=>[...new Set([...m,...all])]);}else{setStudioModules(m=>[...new Set([...m,item.id])]);}blip("C6");},`${item.name} unlocked`)} cosmetics={cosmetics} owned={owned} setKids={setKids} say={say} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} onBuyCosmetic={(cat,item)=>{if((owned[cat]||[]).includes(item.id)){setCosmetics(c=>({...c,[cat]:item.id}));blip("D5");say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),item.id]}));setCosmetics(c=>({...c,[cat]:item.id}));blip("C6");},`${item.name} unlocked`);}} onBuyPass={async()=>{setLokPassBusy(true);try{const res=await fetch(`${SUPA_URL}/functions/v1/stripe-checkout`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${auth.getApiToken()}`},body:JSON.stringify({userId:auth.getUserId()||"local",email:auth.getEmail()||"",priceId:"lokpass_299",successUrl:window.location.origin+"/?session_id={CHECKOUT_SESSION_ID}",cancelUrl:window.location.origin})});if(res.ok){const{url}=await res.json();if(url){window.location.href=url;return;}say("Stripe returned no URL","error");}else{const err=await res.text();say(`Checkout failed: ${err}`,"error");}}catch(e){console.warn("Stripe checkout unavailable",e);setLokPass(true);setOwnedThemes(Object.keys(THEMES));blip("C6");say("LokPass active! (local)");}setLokPassBusy(false);}} onTheme={id=>{if(ownedThemes.includes(id)){setUiTheme(id);say(`Equipped ${THEMES[id].name}`);}else spend(THEMES[id].price,()=>{setOwnedThemes(o=>[...o,id]);setUiTheme(id);},`${THEMES[id].name} unlocked`);}} onEffect={(id,e)=>{if(ownedEffects.includes(id)){setEffect(id);say(id==="none"?"Effects off":`${e.name} equipped`);}else spend(e.price,()=>{setOwnedEffects(o=>[...o,id]);setEffect(id);},`${e.name} unlocked`);}} onSky={(id,s)=>{if(ownedSkies.includes(id)){setSky(id);say(id==="clear"?"Sky off":`${s.name} equipped`);}else spend(s.price,()=>{setOwnedSkies(o=>[...o,id]);setSky(id);},`${s.name} unlocked`);}}/>}
        </div>
      </main>
      {!lokPass&&!kids&&(<div className="fixed inset-x-0 z-40 flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-bold" data-ad-slot={ADS[adIdx].slot} data-ad-format="banner" style={{bottom:62,background:T.card,borderTop:`2px dashed ${T.ink}`,color:T.ink,opacity:adVisible?1:0,transition:"opacity .3s ease",pointerEvents:adVisible?"auto":"none"}}>
        {/* AdSense: replace inner span with <ins class="adsbygoogle"> at deploy; slot id in data-ad-slot */}
        <span className="opacity-70 truncate" key={adIdx} style={{animation:"lokrise .3s ease"}}>Ad · {ADS[adIdx].text}</span>
        <button onClick={()=>setTab("shop")} aria-label="Remove ads with LokPass" className="underline shrink-0" style={{color:T.accent}}>Remove with LokPass</button>
      </div>)}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex" style={{background:T.paper,borderTop:`3px solid ${T.ink}`,paddingBottom:"env(safe-area-inset-bottom)"}} role="navigation" aria-label="Main navigation">
        {[["feed",kids?"Home":"Feed",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],["gallery",kids?"You":"You",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],["studio","Studio",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg>],["battle",kids?"Draw":"Battle",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>],["front","Rush",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>],["shop","Shop",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>]].map(([id,label,icon])=>{const on=tab===id;return(<button key={id} onClick={()=>setTab(id)} aria-label={`Go to ${label}`} aria-current={on?"page":undefined} className="lok-btn lok-display relative flex-1 py-2.5 text-xs font-bold flex flex-col items-center gap-0.5" style={{color:on?T.accent:T.ink,transition:"color .2s ease"}}>
          {on&&<span className="absolute left-1/2 rounded-full" style={{top:4,width:22,height:3,transform:"translateX(-50%)",background:T.accent}} aria-hidden="true"/>}
          <span style={{opacity:on?1:0.6}} aria-hidden="true">{icon}</span>
          <span style={{opacity:on?1:0.7,fontSize:10}}>{label}</span>
          {id==="gallery"&&<span onClick={founder?undefined:e=>{e.stopPropagation();setTab("shop");}} className="absolute" style={{top:-6,right:-2,background:founder?T.alt:T.accent,color:founder?"#fff":T.onAccent,fontSize:9,fontWeight:900,lineHeight:1,padding:"2px 6px",borderRadius:999,border:`1.5px solid ${T.paper}`,boxShadow:`2px 2px 0 ${T.shadow}`,whiteSpace:"nowrap",cursor:founder?"default":"pointer",animation:founder?"none":"lokpulse 1.6s ease-in-out infinite",transition:"all .3s ease",transform:tab==="gallery"&&!founder?"scale(1.1)":"scale(1)"}}>{founder?"🏆 Founder":"Become a Founder!"}</span>}
        </button>);})}
      </nav>
      {!showLilLok&&(<div className="fixed z-40" style={{right:14,bottom:116}}>
        {fabBubble&&<LilLokBubble text={fabBubble} ink={T.ink} paper={T.paper}/>}
        <button onClick={()=>{setShowLilLok(true);setFabBubble("");}} aria-label={`Open LilLok — ${lillok.name} is ${phase}`} className="lok-btn rounded-full flex items-center justify-center" style={{width:60,height:60,background:T.card,...(cosmetics.blotBorder&&cosmetics.blotBorder!=="none"?blotBorderStyle(cosmetics.blotBorder,T):{border:`3px solid ${phase==="critical"?T.accent:phase==="decaying"?"#8E93A8":phase==="stasis"?"#9A9286":T.accent}`,boxShadow:`3px 3px 0 ${T.shadow}`}),animation:phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite":"none"}}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={46} custom={customLilLok?.art} gear={cosmetics.lillokGear}/>
          {phase!=="thriving"&&!kids&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full" aria-hidden="true" style={{background:phase==="critical"?"#C23B22":T.accent,border:`2px solid ${T.card}`}}/>}
        </button>
      </div>)}
      {showLilLok&&<LilLokPanel lillok={lillok} phase={phase} kids={kids} custom={customLilLok} loks={loks} gear={cosmetics.lillokGear} onFeed={feedLilLok} onFlask={()=>{if(loks<10){say("Need 10 Loks","error");return false;}setLoks(l=>l-10);setTotalSpent(t=>t+10);feedLilLok(40,"flask");say("Ink flask · −10 Loks","success");return true;}} onClose={()=>setShowLilLok(false)} say={say} setLillok={setLillok} onPublish={post=>{publishPost(post);say("Revival animation published","success");}} onSaveCustom={c=>{setCustomLilLok(c);setLillok(s=>({...s,name:c.name}));say(`${c.name} is now your LilLok`,"success");}}/>}
      {artistView&&<ArtistPage name={artistView} posts={posts} following={following} onLok={name=>{setFollowing(f=>f.includes(name)?f:[...f,name]);questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onClose={()=>setArtistView(null)}/>}
      {openIdx!==null&&posts[openIdx]&&(<Viewer posts={posts} index={openIdx} bookmarks={bookmarks} cosmetics={cosmetics} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in");}} onClose={()=>setOpenIdx(null)} onNav={d=>setOpenIdx(i=>Math.min(posts.length-1,Math.max(0,i+d)))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});if(p.remote)lokApi.votePost(id,p.votes+1);addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);setVoteCount(c=>c+1);say("Vote stamped");}} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);}} onViewed={id=>{const p=posts.find(x=>x.id===id);if(p.viewed)return;patchPost(id,{viewed:true,views:(p.views||0)+1});addLoks(3);gainXp(3);questTick("view");say("Full slide-through · +3 Loks");}} onEcho={echoPost} onBoost={boostPost} onDelete={id=>{setPosts(ps=>ps.filter(p=>p.id!==id));setOpenIdx(null);say("Post deleted");}} onRename={(id,title)=>patchPost(id,{title})} myName={profile.name}/>)}
      {(()=>{const TIP_TEXT={studio:"✏️ Draw → Capture → repeat. 2+ pages makes it move",battle:"⚔ Same prompt, same clock. Tap LOK BLOCK when a rival attacks!",gallery:account?null:"💾 Tap ⚙ → Lok account to keep your data forever",shop:"🛍 Everything here costs Loks you earn by playing — no real money except LokPass"};
        return !showOnboard&&TIP_TEXT[tab]&&!tips[tab]?(<button onClick={()=>setTips(t=>({...t,[tab]:true}))} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.ink,color:T.paper,border:`3px solid ${T.accent}`,boxShadow:`4px 4px 0 ${T.accent}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss tip">{TIP_TEXT[tab]} · tap to dismiss</button>):null;})()}
      {showHint&&tab==="feed"&&(<button onClick={()=>setShowHint(false)} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss hint">Slide a post down to play it · ▲ to vote · tap to dismiss</button>)}
      {showOnboard&&<Onboard onName={n=>setProfile(p=>({...p,name:n}))} onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      <div className="fixed left-1/2 z-50 flex flex-col-reverse items-center gap-1.5" style={{bottom:100,transform:"translateX(-50%)",pointerEvents:"none"}}>
        {toasts.map((t,i)=>(<div key={t.id} className="px-4 py-2 rounded-xl font-bold text-center" style={{background:t.type==="success"?T.alt:t.type==="error"?"#C23B22":T.ink,color:T.paper,border:`2.5px solid ${t.type==="success"?T.alt:T.accent}`,animation:"lokrise .2s ease",opacity:1-i*0.18,transform:`scale(${1-i*0.04})`,maxWidth:"88vw",fontSize:13}}>{t.msg}</div>))}
      </div>
    </div>
  </ThemeCtx.Provider></ErrorBoundary>);
}
