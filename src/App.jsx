import {
  useState, useEffect, useRef, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from "react";

import { THEMES, SKIN_WAVE_GATE, SKIN_WAVE_3_GATE, SKIN_WAVE_4_GATE, ThemeCtx, useT, ART, blotBorderStyle } from "./theme/theme.js";
import Shop from "./pages/Shop.jsx";
import { useFeedback } from "./hooks/useFeedback.js";
import {
  W, H, PROMPTS, PROMPT_META, CATEGORIES, MOTION_TYPES, CATEGORY_ICONS, WEEKLY_PROMPT, SUPA_URL, SUPA_KEY, PACE_PRESETS,
  BLOT_BORDERS, FOD_WINDOW_DAYS, ANIMATED_AVATAR_SPEND, ADS, QUEST_POOL, REACTION_SETS, LILLOK_SPEECH,
  PX_PER_FRAME, TIERS, FORMATS, KID_PROMPTS, INTERVENTIONS,
  MODES, FRONT_NAMES, EFFECTS, NAME_COLORS, FRAMES, REACTION_PACKS, AVATAR_ACCENTS, PAPERS, LILLOK_GEAR,
  SKIES, ANIMATION_FX, CURSORS, FONT_PACKS, MUSIC_PACKS, STICKER_PACKS, POST_EXPORTS, LILLOK_SKINS, LILLOK_AURAS, LILLOK_PETS, VOICE_PACKS, STUDIO_MODULES, BLENDS,
  RARITY, MYTHIC_ITEMS, CELEBRATIONS, getDailyRotation, getWeeklyRotation, fromDbPost, hasModule,
  OFFLINE_BONUS_HOURS, OFFLINE_BONUS_LOKS,
} from "./constants.jsx";
import { paperBase, drawBounce, drawBloom, drawNight, renderSequence, renderDoodle, renderAvatar, traceShape } from "./engine/draw.jsx";
import NameTag from "./NameTag.jsx";
import { FramedAvatar, ReactionIcon, PageEffect, GlobalStyle } from "./art.jsx";
import LilLokPanel, { LilLokBubble, LilLokSprite } from "./LilLok.jsx";
import InterventionFX from "./InterventionFX.jsx";
import EmptyState from "./EmptyState.jsx";
import Rooms from "./pages/Rooms.jsx";
import { resolveCheat } from "./engine/bleepbox.js";
import MythicPreview from "./MythicPreview.jsx";
import "./steam/steamStore.jsx";
import { checkAchievements } from "./steam/achievements.jsx";
import LOGOS from "./logos.jsx";
import { starterHandle, isReservedName, suggestHandle } from "./identity.js";
import { generateBotPost, pickAmbientPosts } from "./engine/botArt.js";
import ThemeBackdrop from "./theme/ThemeBackdrop.jsx";
import { makeMatchBots, botProgress, botMomentum, botFinalT, judgeBattle, recordBattle, botLine, pickMidLine, BOT_TYPES } from "./engine/bots.js";
import { renderPromptArt } from "./engine/promptArt.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mem = new Map();
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


function Onboard({onDone,onName,defaultName=""}){
  const T=useT();const[step,setStep]=useState(0);const[name,setName]=useState(defaultName);
  const steps=[{t:"Welcome to LokBook",d:"A home for tiny hand-drawn animations. Slide down any post to flip through its pages."},{t:"Meet moss.ink",d:"The first artist you'll see in the feed — tap any artist's name to visit their page. Lok artists to follow them; vote and bookmark what you love."},{t:"Draw, battle, earn",d:"Make flips in Studio, go head-to-head in Battle, grab prompts in Rush. Turn on sound 🎵 for best experience."},{t:"Meet your LilLok",d:"A living-ink buddy that grows with you. Feed it ink, and it helps you in battles."},{t:"Make it yours",d:"This is your artist name — keep it or change it. Here are 50 Loks to begin."}];
  const s=steps[step];const last=step===steps.length-1;
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.55)"}}>
    <div className="w-full rounded-3xl p-6 text-center" style={{maxWidth:420,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${T.accent}`,animation:"lokrise .3s ease"}}>
      <div className="lok-display text-2xl font-extrabold mb-2" style={{color:T.accent}}>{s.t}</div>
      <p className="text-sm leading-snug">{s.d}</p>
      {last&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your artist name" aria-label="Artist name" className="mt-3 w-full px-4 py-2.5 rounded-xl text-center font-bold text-sm" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}}/>}
      <div className="flex justify-center gap-1.5 my-4">{steps.map((_,i)=>(<div key={i} style={{width:i===step?22:8,height:6,borderRadius:4,background:i<=step?T.accent:T.shadow,transition:"width .2s"}}/>))}</div>
      <button onClick={()=>{if(last){onName&&onName(name);onDone();}else setStep(step+1);}} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>{last?"Claim 50 Loks & start":"Next"}</button>
      {!last&&<button onClick={onDone} className="mt-2 text-xs font-bold underline opacity-60">skip</button>}
    </div>
  </div>);
}

const ALL_MOODS=["","calm","wild","moody","playful","dreamy","chaos","cozy","spooky"];
function Feed({posts,bookmarks,following,feedMode,setFeedMode,cosmetics={},daily,streak,dailyClaimed,flipOfDay,onLine,onClaimDaily,onOpen,onVote,onLok,onBookmark,say,moodFilter,setMoodFilter,moodTags,reportedPosts,onReport,onEcho,flair=""}){
  const T=useT();const[active,setActive]=useState(0);const wrapRef=useRef(null);
  const[searchQ,setSearchQ]=useState("");const[searchResults,setSearchResults]=useState(null);const searchTimer=useRef(null);
  useEffect(()=>{if(!searchQ.trim()){setSearchResults(null);return;}clearTimeout(searchTimer.current);searchTimer.current=setTimeout(async()=>{try{const res=await fetch(`${SUPA_URL}/rest/v1/lok_posts?title=ilike.*${encodeURIComponent(searchQ)}*&author=ilike.*${encodeURIComponent(searchQ)}*&order=created_at.desc&limit=20`,{headers:{apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`}});const data=await res.json();setSearchResults(Array.isArray(data)?data.map(fromDbPost).filter(Boolean):[]);}catch{setSearchResults([]);}},300);},[searchQ]);
  const loked=following.includes("moss.ink");
  const hidden=new Set(reportedPosts||[]);
  const base=(feedMode==="following"?(loked?posts:[]):posts).filter(p=>!hidden.has(p.id));
  const list=moodFilter==="all"?base:base.filter(p=>(moodTags[p.id]||"")===moodFilter);
  const moodEmojis={calm:"🌊",wild:"🔥",moody:"🌙",playful:"🎈",dreamy:"✨",chaos:"🌀",cozy:"☕",spooky:"👻",_clear:"✕"};
  const streakCol=streak>=30?"#E8B14B":streak>=7?T.accent:streak>=3?T.alt:T.ink;
  const onScroll=()=>{const el=wrapRef.current;if(!el)return;const i=Math.round(el.scrollTop/el.clientHeight);if(i!==active){setActive(i);if(Math.random()<0.22&&onLine)onLine("feed_scroll");}};
  return(<div>
    <div className="relative mt-3"><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search posts &amp; artists…" aria-label="Search feed" className="w-full px-3 py-2 rounded-xl text-sm font-bold" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink,outline:"none"}}/>{searchQ&&<button onClick={()=>{setSearchQ("");setSearchResults(null);}} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{color:T.accent}}>✕</button>}</div>
    {searchResults!==null&&(<div className="mt-2"><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Search results ({searchResults.length})</div>
      {searchResults.length===0?<div className="text-xs opacity-50 py-3 text-center">No results found</div>:searchResults.map(p=>(<button key={p.id} onClick={()=>onOpen(p.id)} className="lok-btn w-full text-left p-2 rounded-xl mb-1 flex items-center gap-2" style={{border:`2px solid ${T.ink}`,background:T.card}}><div className="flex-1 min-w-0"><div className="font-bold text-sm truncate">{p.title}</div><div className="text-[10px] opacity-60"><NameTag name={p.author||"unknown"}/></div></div><span className="text-xs font-bold shrink-0" style={{color:T.accent}}>Open ▸</span></button>))}</div>)}
    {searchResults===null&&(<>{flipOfDay&&feedMode==="discover"&&(<button onClick={()=>onOpen(flipOfDay.id)} aria-label={`Flip of the Day: ${flipOfDay.title}`} className="lok-btn mt-3 w-full flex items-center gap-3 p-2.5 rounded-2xl text-left" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:"5px 5px 0 #E8B14B"}}>
      {flipOfDay.frames?.[0]&&<img src={flipOfDay.frames[Math.floor(flipOfDay.frames.length/2)]} alt="" className="rounded-lg shrink-0" style={{width:46,aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/>}
      <div className="min-w-0 flex-1"><div className="text-[10px] font-extrabold uppercase tracking-widest" style={{color:"#B8860B"}}>✦ Flip of the Day</div><div className="lok-display font-extrabold text-sm truncate">{flipOfDay.title}</div></div>
      <span className="lok-display font-extrabold text-sm shrink-0" style={{color:T.accent}}>{flipOfDay.votes} ▲</span>
    </button>)}
    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-center rounded-xl shrink-0" style={{width:44,height:44,background:streakCol,color:"#fff",border:`2.5px solid ${T.ink}`,transition:"background .3s ease"}}><span className="lok-display font-extrabold text-lg">{streak}</span></div>
      <div className="flex-1 min-w-0"><div className="font-bold text-sm leading-tight">Daily streak · {streak} {streak===1?"day":"days"}</div><div className="text-xs opacity-70 truncate">Today: "{daily.prompt}"</div></div>
      <button onClick={onClaimDaily} disabled={dailyClaimed} aria-label={dailyClaimed?"Daily already claimed":"Claim daily bonus"} className="lok-btn shrink-0 lok-display px-3 py-2 rounded-xl text-sm font-extrabold" style={{background:dailyClaimed?"transparent":T.ink,color:dailyClaimed?T.ink:T.paper,border:`2.5px solid ${T.ink}`,opacity:dailyClaimed?0.55:1}}>{dailyClaimed?"Claimed ✓":"Claim"}</button>
    </div>
    <div className="mt-3 flex gap-2">{[["discover","Discover"],["following","Following"]].map(([id,l])=>(<button key={id} onClick={()=>setFeedMode(id)} className="lok-btn flex-1 py-2 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:feedMode===id?T.ink:T.card,color:feedMode===id?T.paper:T.ink}}>{l}</button>))}</div>
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
      <button onClick={()=>setMoodFilter("all")} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${moodFilter==="all"?T.accent:T.ink}`,background:moodFilter==="all"?T.ink:T.card,color:moodFilter==="all"?T.paper:T.ink}}>All</button>
      {ALL_MOODS.filter(Boolean).map(m=>(<button key={m} onClick={()=>setMoodFilter(moodFilter===m?"all":m)} className="lok-btn shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${moodFilter===m?T.accent:T.ink}`,background:moodFilter===m?T.ink:T.card,color:moodFilter===m?T.paper:T.ink,opacity:moodFilter==="all"||moodFilter===m?1:0.5}}><span>{moodEmojis[m]||"🎨"}</span>{m}</button>))}
    </div>
    {list.length===0?(
      feedMode==="following"
        ?<EmptyState icon="follow" title="No one yet" subtitle="Lok artists you love and their flips show up here." action="Discover artists →" onAction={()=>setFeedMode("discover")}/>
        :<EmptyState icon="feed" title="No art yet" subtitle="Be the first to publish a flip!"/>
    ):(
      <div ref={wrapRef} onScroll={onScroll} className="mt-3 -mx-4" style={{height:"calc(100dvh - 300px)",minHeight:360,overflowY:"scroll",scrollSnapType:"y mandatory"}}>
        {list.map((p,i)=>(<FeedCard key={p.id} p={p} live={i===active} marked={bookmarks.includes(p.id)} loked={loked} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark} moodTags={moodTags} onReport={onReport} onEcho={onEcho} flair={flair}/>))}
      </div>
    )}</>)}
  </div>);
}

function FeedCard({p,live,marked,loked,cosmetics={},onOpen,onVote,onLok,onBookmark,moodTags,onReport,onEcho,flair=""}){
  const T=useT();const[fi,setFi]=useState(0);const[pop,setPop]=useState(false);const[echoed,setEchoed]=useState(false);
  const mood=moodTags?.[p.id];const moodEmojis={calm:"🌊",wild:"🔥",moody:"🌙",playful:"🎈",dreamy:"✨",chaos:"🌀",cozy:"☕",spooky:"👻"};
  useEffect(()=>{if(!live||p.frames.length<2){setFi(0);return;}const t=setInterval(()=>setFi(f=>(f+1)%p.frames.length),p.paceMs||160);return()=>clearInterval(t);},[live,p.id,p.paceMs,p.frames.length]);
  const doVote=()=>{onVote(p.id);if(!p.voted){setPop(true);setTimeout(()=>setPop(false),320);}};
  if(!p.frames||p.frames.length===0)return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}><div className="relative mx-auto rounded-2xl overflow-hidden flex items-center justify-center" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,aspectRatio:"4/5"}}><div className="text-center opacity-40"><div className="lok-display font-extrabold text-lg">{p.title}</div><div className="text-sm mt-1">Rendering…</div></div></div></div>);
  return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}>
    <div className="relative mx-auto rounded-2xl overflow-hidden" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,boxShadow:live?`7px 7px 0 ${T.accent}`:`6px 6px 0 ${T.shadow}`,transform:live?"scale(1)":"scale(.97)",transition:"transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease"}}>
      <button onClick={()=>onOpen(p.id)} className="block w-full" aria-label={`Open ${p.title}`}><img src={p.frames[fi]} alt={p.title} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/></button>
      {mood&&<div className="absolute top-2 right-2 text-xs z-10" style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,.4))"}} aria-label={`mood: ${mood}`}>{moodEmojis[mood]}</div>}
      {p.frames.length>1&&<div className="absolute top-0 left-0 right-0 h-1" style={{background:"rgba(0,0,0,.15)"}}><div style={{width:`${((fi+1)/p.frames.length)*100}%`,height:"100%",background:T.accent,transition:"width .12s linear"}}/></div>}
      <div className="absolute left-0 right-0 bottom-0 p-3 flex items-end gap-2" style={{background:"linear-gradient(transparent, rgba(0,0,0,.6))"}}>
        <div className="flex-1 text-white min-w-0"><div className="lok-display font-extrabold leading-tight truncate">{p.title}</div><div className="text-xs opacity-90"><NameTag name="moss.ink" color={cosmetics.nameColor} style={{color:"#fff"}}/>{flair?<span className="ml-1.5 text-[10px] font-bold tracking-wide" style={{color:"#F0DB4F"}}>{flair}</span>:null} · {p.from==="revival"?"revival loop":p.from==="battle"?"battle piece":p.mode==="B"?"page-flip":"flipbook"}</div></div>
        <button onClick={()=>onLok("moss.ink")} aria-label={loked?"Already Lok'd":"Lok this artist"} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold" style={{background:loked?"rgba(255,255,255,.92)":T.accent,color:loked?T.ink:T.onAccent,border:"2px solid #fff"}}>{loked?"Lok'd ✓":"Lok"}</button>
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
    <div className="text-center text-xs opacity-50 mt-2">scroll for more · tap ▾ to slide through</div>
  </div>);
}

function Viewer({posts,index,bookmarks,cosmetics={},onBookmark,onClose,onNav,onVote,onReact,onViewed,onShare,onDelete,onRename,myName="",onRemix}){
  const mentionTitle=(post,own)=>{const parts=[];let last=0;const title=post.title;const re=/@(\w+)/g;let m;while((m=re.exec(title))!==null){if(m.index>last)parts.push(title.slice(last,m.index));parts.push(<span key={m.index} style={{color:T.accent,fontWeight:700}}>@{m[1]}</span>);last=re.lastIndex;}if(last<title.length)parts.push(title.slice(last));if(own)parts.push(<span key="edit" style={{opacity:0.4,fontSize:11,marginLeft:6}}>✎</span>);return parts.length?parts:title;};
  const T=useT();const post=posts[index];const n=post?.frames?.length??0;const isB=post&&post.mode==="B";const series=post&&post.style==="series";
  const scrollRef=useRef(null);const[fi,setFi]=useState(0);const[playing,setPlaying]=useState(false);const[floats,setFloats]=useState([]);const[editT,setEditT]=useState(false);const[tDraft,setTDraft]=useState(post.title);const playRef=useRef(null);const touch=useRef(null);const marked=bookmarks.includes(post.id);const own=post.from!=="seed"&&!post.id?.startsWith("seed");
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
  const react=type=>{onReact(post.id,type);const id=Math.random();const pack=REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;const icon=pack[["splat","heart","drip"].indexOf(type)]||type;const newCount=(post.reactions[type]||0)+1;setFloats(f=>[...f,{id,type:icon,x:14+Math.random()*60}]);setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==id)),950);if(newCount>=5&&newCount%3===0){for(let s=0;s<6;s++){setTimeout(()=>{const sid=Math.random();setFloats(ff=>[...ff,{id:sid,type:icon,x:10+Math.random()*80}]);setTimeout(()=>setFloats(ff=>ff.filter(x=>x.id!==sid)),1200);},s*80);}}};
  if(!post.frames||post.frames.length===0)return(<div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{background:T.ink,color:T.paper}}><div className="lok-display text-xl font-extrabold">Rendering…</div><button onClick={onClose} className="mt-6 lok-btn px-4 py-2 rounded-xl font-bold" style={{border:`2px solid ${T.paper}`}} aria-label="Close viewer">Close</button></div>);
  return(<div className="fixed inset-0 z-50 flex flex-col" style={{background:series?T.paper:T.ink}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="flex items-center gap-3 px-3 py-2.5" style={{color:series?T.ink:T.paper}}>
      <button onClick={onClose} aria-label="Close viewer" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${series?T.ink:T.paper}`}}>✕</button>
      <div className="min-w-0 flex-1">{editT
        ?<input value={tDraft} onChange={e=>setTDraft(e.target.value)} onBlur={saveT} onKeyDown={e=>{if(e.key==="Enter")saveT();if(e.key==="Escape"){setTDraft(post.title);setEditT(false);}}} autoFocus aria-label="Rename this flip" className="lok-display font-extrabold leading-tight w-full" style={{background:"transparent",border:"none",borderBottom:`2px solid ${T.accent}`,color:series?T.ink:T.paper,outline:"none",fontSize:"inherit"}}/>
        :<div className="lok-display font-extrabold leading-tight truncate" onClick={()=>own&&setEditT(true)} style={{cursor:own?"text":"default"}} title={own?"Tap to rename":undefined}>{mentionTitle(post,own)}</div>}
        <div className="text-xs opacity-75">moss.ink · {index+1}/{posts.length} · {isB?"page-flip":"scrub"}</div></div>
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
      {onShare&&<button onClick={()=>onShare(post)} aria-label="Share" className="lok-btn px-2.5 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}}>↗</button>}
      {onRemix&&<button onClick={()=>onRemix(post)} aria-label="Remix this flip" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.5)"}`,color:series?T.ink:T.paper,background:"transparent"}} title="Remix — copy frames to Studio">↻</button>}
      {post.from!=="seed"&&myName&&onDelete&&<button onClick={()=>{if(window.confirm(`Delete "${post.title}"?`))onDelete(post.id);}} aria-label="Delete" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:"rgba(242,237,226,.7)",background:"transparent"}}>🗑</button>}
      <div className="ml-auto flex items-center gap-1.5">{(()=>{const slots=["splat","heart","drip"];const pack=REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;return slots.map((slot,k)=>(<button key={slot} onClick={()=>react(slot)} aria-label={`React ${pack[k]}`} className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><ReactionIcon type={pack[k]} size={20}/><span className="text-xs font-bold">{post.reactions[slot]}</span></button>));})()}</div>
    </div>
  </div>);
}

const Easel=forwardRef(function Easel({maxLayers,ccTier,onionFrames=[],onStroke,animFx="none"},ref){
  const T=useT();
  const[layers,setLayers]=useState([{id:1,visible:true,opacity:1,blend:"source-over"}]);
  const[active,setActive]=useState(1);const[tool,setTool]=useState("pen");const[color,setColor]=useState(ART.ink);const[recentColors,setRecentColors]=useState([]);const[size,setSize]=useState(7);const[symmetry,setSymmetry]=useState("none");const[brush,setBrush]=useState("ink");
  const idRef=useRef(1);const canvases=useRef(new Map());const drawing=useRef(false);const undoStack=useRef([]);const redoStack=useRef([]);const wrapRef=useRef(null);const lastPts=useRef([]);const midPts=useRef([]);const activeLayer=layers.find(l=>l.id===active);
  useImperativeHandle(ref,()=>({
    composite(pageNum=null){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const ctx=tmp.getContext("2d");paperBase(ctx,pageNum);layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv&&l.visible){ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(cv,0,0);}});ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";return tmp.toDataURL("image/png");},
    blankFrame(){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;paperBase(tmp.getContext("2d"),null);return tmp.toDataURL("image/png");},
    clearAll(){layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv)cv.getContext("2d").clearRect(0,0,W,H);});undoStack.current=[];redoStack.current=[];},
  }));
  const pos=e=>{if(!wrapRef.current)return[W/2,H/2];const r=wrapRef.current.getBoundingClientRect();return[((e.clientX-r.left)*W)/r.width,((e.clientY-r.top)*H)/r.height];};
  const pushUndo=()=>{const cv=canvases.current.get(active);if(!cv)return;if(undoStack.current.length>9)undoStack.current.shift();undoStack.current.push({id:active,snap:cv.getContext("2d").getImageData(0,0,W,H)});redoStack.current=[];};
  const dabAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.globalAlpha=brush==="chalk"?0.5:0.18;ctx.fillStyle=color;const dots=brush==="chalk"?6:1;for(let d=0;d<dots;d++){const ox=brush==="chalk"?(Math.random()-.5)*size*1.4:0,oy=brush==="chalk"?(Math.random()-.5)*size*1.4:0;ctx.beginPath();ctx.arc(x+ox,y+oy,tool==="soft"?size*1.8:size*0.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;};
  const fxAt=(ctx,x,y)=>{if(!animFx||animFx==="none"||Math.random()>0.4)return;ctx.save();ctx.globalCompositeOperation="source-over";
    if(animFx==="sparkle_trail"){ctx.fillStyle="#fff";ctx.globalAlpha=0.8;for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2,r=Math.random()*size*1.2;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.8+Math.random()*1.4,0,Math.PI*2);ctx.fill();}}
    else if(animFx==="neon_pulse"){const g=ctx.createRadialGradient(x,y,0,x,y,size*1.6);g.addColorStop(0,"#fff");g.addColorStop(0.4,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(x,y,size*1.6,0,Math.PI*2);ctx.fill();}
    else if(animFx==="ink_splatter"){ctx.fillStyle=color;ctx.globalAlpha=0.5;for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,r=size*0.6+Math.random()*size;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.6+Math.random()*1.6,0,Math.PI*2);ctx.fill();}}
    else if(animFx==="smoke_rise"){ctx.fillStyle="#B8BEC9";ctx.globalAlpha=0.18;ctx.beginPath();ctx.arc(x+(Math.random()-.5)*size,y-size*(0.6+Math.random()),size*0.9,0,Math.PI*2);ctx.fill();}
    else if(animFx==="fire_embers"){ctx.fillStyle=Math.random()<0.5?"#FF8A5C":"#E8B14B";ctx.globalAlpha=0.6;ctx.beginPath();ctx.arc(x+(Math.random()-.5)*size*1.4,y-Math.random()*size,1+Math.random()*1.8,0,Math.PI*2);ctx.fill();}
    else if(animFx==="water_ripple"){ctx.strokeStyle=color;ctx.globalAlpha=0.25;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,size*(1+Math.random()),0,Math.PI*2);ctx.stroke();}
    else if(animFx==="galaxy_swirl"){const cs=["#7A4FBF","#2FA9A0","#FF5DA2","#E8B14B","#fff"];ctx.fillStyle=cs[Math.floor(Math.random()*cs.length)];ctx.globalAlpha=0.55;const a=Math.random()*Math.PI*2,r=Math.random()*size*1.3;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.8+Math.random()*1.6,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;ctx.restore();};
  const symXY=(x,y)=>{const o=[[x,y]];if(symmetry==="mirrorX"||symmetry==="quad")o.push([W-x,y]);if(symmetry==="mirrorY"||symmetry==="quad")o.push([x,H-y]);if(symmetry==="quad")o.push([W-x,H-y]);if(symmetry.startsWith("radial")){const n=+symmetry.slice(6),cx=W/2,cy=H/2;for(let i=1;i<n;i++){const a=(i/n)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);o.push([cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}}return o;};
  const stamp=(ctx,x,y,start)=>{
    const pts=symXY(x,y);
    if(tool==="soft"||brush==="chalk"){pts.forEach(([sx,sy])=>dabAt(ctx,sx,sy));return;}
    if(start){lastPts.current=pts.map(p=>[...p]);midPts.current=pts.map(p=>[...p]);
      ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.fillStyle=color;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;
      pts.forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx,sy,(tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size)/2,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;return;}
    ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=color;ctx.lineWidth=tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;ctx.lineCap="round";ctx.lineJoin="round";
    pts.forEach(([sx,sy],i)=>{const lp=lastPts.current[i]||[sx,sy];const mp=midPts.current[i]||lp;const nmx=(lp[0]+sx)/2,nmy=(lp[1]+sy)/2;ctx.beginPath();ctx.moveTo(mp[0],mp[1]);ctx.quadraticCurveTo(lp[0],lp[1],nmx,nmy);ctx.stroke();midPts.current[i]=[nmx,nmy];lastPts.current[i]=[sx,sy];fxAt(ctx,sx,sy);});
    ctx.globalAlpha=1;
  };
  const fillLayer=ctx=>{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;ctx.fillRect(0,0,W,H);};
  const eyedrop=(x,y)=>{for(let i=layers.length-1;i>=0;i--){const cv=canvases.current.get(layers[i].id);if(!cv||!layers[i].visible)continue;const d=cv.getContext("2d").getImageData(Math.floor(x),Math.floor(y),1,1).data;if(d[3]>10){setColorAndRecent(`rgb(${d[0]},${d[1]},${d[2]})`);setTool("pen");return;}}};
  const down=e=>{e.preventDefault();const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;e.currentTarget.setPointerCapture(e.pointerId);if(tool==="eyedrop"){eyedrop(...pos(e));return;}pushUndo();if(tool==="fill"){fillLayer(cv.getContext("2d"));return;}drawing.current=true;onStroke&&onStroke();stamp(cv.getContext("2d"),...pos(e),true);};
  const move=e=>{if(!drawing.current)return;const cv=canvases.current.get(active);if(cv)stamp(cv.getContext("2d"),...pos(e),false);};
  const up=e=>{drawing.current=false;lastPts.current=[];midPts.current=[];try{if(e?.currentTarget?.releasePointerCapture&&e?.pointerId!=null)e.currentTarget.releasePointerCapture(e.pointerId);}catch{}};
  const undo=()=>{const u=undoStack.current.pop();if(!u)return;const cv=canvases.current.get(u.id);if(cv){redoStack.current.push({id:u.id,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(u.snap,0,0);}};
  const redo=()=>{const r=redoStack.current.pop();if(!r)return;const cv=canvases.current.get(r.id);if(cv){undoStack.current.push({id:r.id,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(r.snap,0,0);}};
  const addLayer=()=>{if(layers.length>=maxLayers)return;const id=++idRef.current;setLayers(ls=>[...ls,{id,visible:true,opacity:1,blend:"source-over"}]);setActive(id);};
  const removeLayer=id=>{if(layers.length<=1)return;canvases.current.delete(id);setLayers(ls=>{const next=ls.filter(l=>l.id!==id);if(active===id)setActive(next[next.length-1].id);return next;});};
  const patchLayer=(id,p)=>setLayers(ls=>ls.map(l=>(l.id===id?{...l,...p}:l)));
  const setColorAndRecent=c=>{setColor(c);if(tool==="eraser")setTool("pen");setRecentColors(r=>[c,...r.filter(x=>x!==c)].slice(0,8));};
  const swatches=[ART.ink,ART.pink,ART.teal,"#E8B14B","#7A4FBF","#3E8E4B","#D94040","#5A5A5A","#FF8C42","#C4E8C2","#4EBFFF","#F7D4FF"];
  return(<div>
    <div ref={wrapRef} className="relative rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4 / 5"}}>
      {onionFrames.map((of,i)=>(<img key={i} src={of.src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:of.opacity,mixBlendMode:"multiply"}}/>))}
      {layers.map(l=>(<canvas key={l.id} width={W} height={H} ref={el=>{if(el)canvases.current.set(l.id,el);}} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{pointerEvents:"none",opacity:l.opacity,display:l.visible?"block":"none",mixBlendMode:l.blend==="source-over"?"normal":l.blend}}/>))}
      <div className="absolute inset-0" style={{touchAction:"none",cursor:"crosshair"}} role="img" aria-label="Drawing canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}/>
      {(symmetry==="mirrorX"||symmetry==="quad")&&<div aria-hidden="true" className="absolute top-0 bottom-0 pointer-events-none" style={{left:"50%",width:2,background:`repeating-linear-gradient(${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {(symmetry==="mirrorY"||symmetry==="quad")&&<div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none" style={{top:"50%",height:2,background:`repeating-linear-gradient(90deg,${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {symmetry.startsWith("radial")&&<div aria-hidden="true" className="absolute pointer-events-none rounded-full" style={{left:"50%",top:"50%",width:10,height:10,transform:"translate(-50%,-50%)",border:`2.5px solid ${T.accent}`}}/>}
      <div className="absolute top-1.5 left-1.5 lok-display px-2 py-0.5 rounded-md text-xs font-extrabold pointer-events-none" style={{background:"rgba(35,48,107,.85)",color:T.paper,backdropFilter:"blur(3px)"}}>L{layers.findIndex(l=>l.id===active)+1} / {layers.length}</div>
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
    {ccTier&&activeLayer&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Blend modes">
      <span className="text-xs font-bold opacity-60 shrink-0">blend</span>
      {BLENDS.map(b=>(<button key={b} onClick={()=>patchLayer(active,{blend:b})} aria-pressed={activeLayer.blend===b} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${activeLayer.blend===b?T.accent:T.ink}`,background:activeLayer.blend===b?T.ink:T.card,color:activeLayer.blend===b?T.paper:T.ink}}>{b==="source-over"?"normal":b}</button>))}
    </div>)}
    {ccTier&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Pro tools">
      <span className="text-xs font-bold opacity-60 shrink-0">pro</span>
      {[["ink","Ink"],["marker","Marker"],["chalk","Chalk"]].map(([id,l])=>(<button key={id} onClick={()=>{setBrush(id);if(tool==="eraser"||tool==="fill"||tool==="eyedrop")setTool("pen");}} aria-pressed={brush===id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${brush===id?T.accent:T.ink}`,background:brush===id?T.ink:T.card,color:brush===id?T.paper:T.ink}}>{l}</button>))}
      <select value={symmetry} onChange={e=>setSymmetry(e.target.value)} aria-label="Symmetry mode" className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${symmetry!=="none"?T.accent:T.ink}`,background:symmetry!=="none"?T.ink:T.card,color:symmetry!=="none"?T.paper:T.ink}}>
        <option value="none">No symmetry</option><option value="mirrorX">Mirror X</option><option value="mirrorY">Mirror Y</option><option value="quad">4-Way</option><option value="radial4">Radial 4</option><option value="radial6">Radial 6</option><option value="radial8">Radial 8</option>
      </select>
      <button onClick={()=>setTool("fill")} aria-pressed={tool==="fill"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${tool==="fill"?T.accent:T.ink}`,background:tool==="fill"?T.ink:T.card,color:tool==="fill"?T.paper:T.ink}}>Fill</button>
      <button onClick={()=>setTool("eyedrop")} aria-pressed={tool==="eyedrop"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${tool==="eyedrop"?T.accent:T.ink}`,background:tool==="eyedrop"?T.ink:T.card,color:tool==="eyedrop"?T.paper:T.ink}}>Eyedrop</button>
    </div>)}
    <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Color and tools">
      <div className="flex flex-wrap gap-1.5 items-center">
        {swatches.map(hex=>(<button key={hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Color ${hex}`} aria-pressed={color===hex&&tool!=="eraser"} className="lok-btn w-7 h-7 rounded-full" style={{background:hex,border:`3px solid ${color===hex&&tool!=="eraser"?T.accent:T.ink}`,transform:color===hex&&tool!=="eraser"?"scale(1.18)":"none"}}/>))}
        <label aria-label="Custom color" style={{cursor:"pointer"}}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{border:`3px dashed ${T.ink}`,background:T.card,color:T.ink}}>+</div>
          <input type="color" value={color} onChange={e=>setColorAndRecent(e.target.value)} style={{position:"absolute",opacity:0,width:1,height:1}}/>
        </label>
        {recentColors.map(hex=>(<button key={"r"+hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Recent ${hex}`} className="lok-btn w-5 h-5 rounded-full" style={{background:hex,border:`2px solid ${T.shadow}`}}/>))}
      </div>
      {[["pen","Pen"],["soft","Airbrush"],["eraser","Eraser"]].map(([id,l])=>(<button key={id} onClick={()=>setTool(id)} aria-pressed={tool===id} aria-label={l} className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${tool===id?T.accent:T.ink}`,background:T.card,color:T.ink}}>{l}</button>))}
      <label className="flex items-center gap-1.5 text-xs font-bold" style={{color:T.ink}}>
        size<span className="inline-flex items-center justify-center" style={{width:28,height:28}}><span aria-hidden="true" style={{width:Math.max(4,Math.min(24,size)),height:Math.max(4,Math.min(24,size)),borderRadius:"50%",background:tool==="eraser"?"transparent":color,border:`1.5px solid ${T.ink}`,display:"block"}}/></span>
        <input type="range" min="2" max="28" value={size} onChange={e=>setSize(+e.target.value)} style={{accentColor:T.accent,width:56}} aria-label={`Brush size ${size}px`}/>
      </label>
      <button onClick={undo} aria-label="Undo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Undo</button>
      <button onClick={redo} aria-label="Redo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Redo</button>
    </div>
  </div>);
});

function Studio({ownedTiers,ccTier,onPublish,say,kids,dailyPrompt,animFx,modules=[],legacyBrushes,setLegacyBrushes}){
  const T=useT();const easel=useRef(null);
  const[tier,setTier]=useState(10);const[frames,setFrames]=useState([]);const[frameDurations,setFrameDurations]=useState([]);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(140);const[title,setTitle]=useState("");const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:i===0?ART.pink:ART.teal,opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length);setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setJustCap(true);setTimeout(()=>setJustCap(false),360);say(`Page ${frames.length+1} captured`);};
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
    <div className="mt-2"><Easel ref={easel} key={tier} maxLayers={tier} ccTier={ccTier} modules={modules} onionFrames={onionFrames} animFx={animFx} legacyMode={legacyBrushes} onLegacyToggle={setLegacyBrushes}/></div>
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
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio"});setFrames([]);setFrameDurations([]);setTitle("");easel.current.clearAll();}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
    </div>)}
  </div>);
}

function NewStudioUI({ownedTiers,ccTier,onPublish,say,kids,dailyPrompt,animFx,modules=[],legacyBrushes,setLegacyBrushes}){
  const T=useT();const easel=useRef(null);
  const[tier,setTier]=useState(10);const[frames,setFrames]=useState([]);const[frameDurations,setFrameDurations]=useState([]);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(140);const[title,setTitle]=useState("");const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const[fps,setFps]=useState(24);const[playing,setPlaying]=useState(false);const[loop,setLoop]=useState(true);const[timelineZoom,setTimelineZoom]=useState(1);const[lightboxFrame,setLightboxFrame]=useState(null);const[autoAdvance,setAutoAdvance]=useState(false);const[onionCrosshair,setOnionCrosshair]=useState(false);const[clipboardFrame,setClipboardFrame]=useState(null);
  const hasFps=hasModule(modules,"anim_fps");const hasPlayback=hasModule(modules,"anim_playback");const hasOnionPro=hasModule(modules,"anim_onion_pro");const hasZoom=hasModule(modules,"anim_timeline_zoom");const hasVideo=hasModule(modules,"anim_export_video");const hasSprite=hasModule(modules,"anim_export_spritesheet");
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  const playRef=useRef(null);useEffect(()=>{if(!playing||frames.length<2)return;const t=setInterval(()=>{setPv(p=>{if(p+1>=frames.length){if(loop)return 0;setPlaying(false);return p;}return p+1;});},paceMs);playRef.current=t;return()=>clearInterval(t);},[playing,frames.length,paceMs,loop]);
  const onionColors=hasOnionPro?[ART.pink,ART.teal,T.accent,"#E8B14B","#7A4FBF"]:[ART.pink,ART.teal];const maxOnion=hasOnionPro?5:3;
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:onionColors[i%onionColors.length]||onionColors[0],opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length);setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setJustCap(true);setTimeout(()=>setJustCap(false),360);if(autoAdvance){setTimeout(()=>{const url2=easel.current.composite(frames.length+1);setFrames(f=>[...f,url2]);setFrameDurations(d=>[...d,paceMs]);say(`Pages ${frames.length+1}-${frames.length+2} captured`);},100);}else say(`Page ${frames.length+1} captured`);};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});};
  const clearFrame=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>f.map((x,k)=>k===i?blank:x));say(`Page ${i+1} cleared`);};
  const ready=frames.length>=2;
  const fpsToMs=f=>Math.round(1000/f);
  const setFpsAndPace=f=>{setFps(f);setPaceMs(fpsToMs(f));};
  const goPrev=()=>{setPlaying(false);setPv(p=>Math.max(0,p-1));};
  const goNext=()=>{setPlaying(false);setPv(p=>Math.min(frames.length-1,p+1));};
  const reverseFrames=()=>{setFrames(f=>[...f].reverse());setFrameDurations(d=>[...d].reverse());say("Timeline reversed");};
  const pasteFrame=()=>{if(clipboardFrame!==null&&clipboardFrame<frames.length){setFrames(f=>[...f,f[clipboardFrame]]);setFrameDurations(d=>[...d,d[clipboardFrame]??paceMs]);say("Frame pasted from clipboard");}};
  const togglePlay=()=>{if(frames.length<2){say("Need at least 2 pages");return;}setPlaying(p=>!p);};
  const exportVideo=async()=>{if(!frames.length)return;say("Exporting video...");const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");const stream=c.captureStream(30);const recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};recorder.onstop=()=>{const blob=new Blob(chunks,{type:"video/webm"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.trim()||"flip")+".webm";a.click();URL.revokeObjectURL(url);say("Video exported!","success");};recorder.start();for(let i=0;i<frames.length;i++){const img=new Image();await new Promise(r=>{img.onload=r;img.src=frames[i];});ctx.clearRect(0,0,W,H);paperBase(ctx,i);ctx.drawImage(img,0,0);await new Promise(r=>setTimeout(r,frameDurations[i]||paceMs));}recorder.stop();};
  const exportSpritesheet=async()=>{if(!frames.length)return;const cols=Math.min(frames.length,8);const rows=Math.ceil(frames.length/cols);const c=document.createElement("canvas");c.width=W*cols;c.height=H*rows;const ctx=c.getContext("2d");for(let i=0;i<frames.length;i++){const img=new Image();await new Promise(r=>{img.onload=r;img.src=frames[i];});ctx.drawImage(img,(i%cols)*W,Math.floor(i/cols)*H,W,H);}const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download=(title.trim()||"flip")+"_spritesheet.png";a.click();say("Spritesheet exported!","success");};
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
        <button onClick={goPrev} disabled={pv<=0} className="lok-btn w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:pv<=0?0.35:1}}>◀</button>
        <button onClick={togglePlay} className="lok-btn w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${playing?T.accent:T.ink}`,background:playing?T.ink:T.card,color:playing?T.paper:T.ink}}>{playing?"⏸":"▶"}</button>
        <button onClick={goNext} disabled={pv>=frames.length-1} className="lok-btn w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:pv>=frames.length-1?0.35:1}}>▶</button>
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
    <div className="mt-2"><Easel ref={easel} key={tier} maxLayers={tier} ccTier={ccTier} modules={modules} onionFrames={onionFrames} animFx={animFx} legacyMode={legacyBrushes} onLegacyToggle={setLegacyBrushes}/></div>
    <div className="mt-2 flex items-center gap-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold" style={{color:T.ink}}><input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} style={{accentColor:T.accent}}/> Auto ×2</label>
      <button onClick={reverseFrames} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>↻ Reverse</button>
      {clipboardFrame!==null&&<button onClick={pasteFrame} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.accent}`,color:T.accent}}>📋 Paste</button>}
      {hasVideo&&<button onClick={exportVideo} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>🎬 Video</button>}
      {hasSprite&&<button onClick={exportSpritesheet} disabled={frames.length<2} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,color:T.ink,opacity:frames.length<2?0.35:1}}>📦 Sheet</button>}
    </div>
    <button onClick={capture} aria-label={`Capture page ${frames.length+1}`} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold flex items-center justify-center gap-2" style={{background:T.ink,color:T.paper,boxShadow:`4px 4px 0 ${T.accent}`,transform:justCap?"scale(.97)":"scale(1)",transition:"transform .2s"}}>
      <span style={{fontSize:20,lineHeight:1}}>＋</span> Capture page {frames.length+1}
    </button>
    {frames.length===0&&<p className="text-center text-xs opacity-50 mt-2">Capture 2+ pages to animate. 🧅 Onion shows previous pages as ghosts.</p>}
    {frames.length>0&&(<div style={{animation:"lokrise .3s ease"}}>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">Timeline · {frames.length} pages</div>
        <div className="flex items-center gap-1.5">
          {hasZoom&&<><span className="text-[10px] font-bold opacity-60">Zoom</span><input type="range" min="0.4" max="2.5" step="0.1" value={timelineZoom} onChange={e=>setTimelineZoom(+e.target.value)} style={{accentColor:T.accent,width:60}} aria-label="Timeline zoom"/></>}
          <button onClick={()=>{setFrames([]);setFrameDurations([]);easel.current.clearAll();setClipboardFrame(null);say("Cleared all pages");}} aria-label="Clear all pages" className="text-[11px] font-bold underline opacity-60">clear all</button>
        </div>
      </div>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-2">
        {frames.map((f,i)=>(<div key={i} className="shrink-0 flex flex-col gap-0.5" style={{width:Math.round(76*timelineZoom)}}>
          <div className="rounded-lg overflow-hidden relative cursor-pointer" style={{border:`2.5px solid ${i===pv?T.accent:T.ink}`,boxShadow:`2px 2px 0 ${T.shadow}`}} onClick={()=>setLightboxFrame(f)}>
            <img src={f} alt={`page ${i+1}`} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/>
            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-bold" style={{background:T.ink,color:"#fff"}}>{i+1}</div>
            {i===pv&&<div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full" style={{background:T.accent}}/>}
          </div>
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>moveFrame(i,-1)} aria-label={`Move page ${i+1} left`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>‹</button>
            <button onClick={()=>setEditingDur(editingDur===i?null:i)} aria-label={`Edit duration ${i+1}`} className="lok-btn flex-1 text-[9px] font-mono py-0.5 rounded text-center opacity-70" style={{border:`1px solid ${T.shadow}`}}>{frameDurations[i]??paceMs}ms</button>
            <button onClick={()=>moveFrame(i,1)} aria-label={`Move page ${i+1} right`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>›</button>
          </div>
          {editingDur===i&&<input type="number" min="40" max="2000" value={frameDurations[i]??paceMs} onChange={e=>setFrameDurations(d=>{const n=[...d];n[i]=+e.target.value;return n;})} onBlur={()=>setEditingDur(null)} autoFocus aria-label={`Page ${i+1} duration ms`} className="w-full text-center text-[10px] rounded px-1 py-0.5" style={{border:`2px solid ${T.accent}`,background:T.card}}/>}
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
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio"});setFrames([]);setFrameDurations([]);setTitle("");setClipboardFrame(null);easel.current.clearAll();}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
    </div>)}
    {lightboxFrame&&<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,.85)",cursor:"pointer"}} onClick={()=>setLightboxFrame(null)} onKeyDown={e=>e.key==="Escape"&&setLightboxFrame(null)} tabIndex={0}>
      <img src={lightboxFrame} alt="Frame preview" className="max-w-[80vw] max-h-[90vh] rounded-2xl" style={{border:`4px solid ${T.paper}`}}/>
      <button onClick={()=>setLightboxFrame(null)} className="absolute top-4 right-4 text-2xl font-bold" style={{color:"#fff",textShadow:"0 2px 4px rgba(0,0,0,.5)"}}>✕</button>
    </div>}
  </div>);
}

function Battle({ownedTiers,ccTier,wins,bigBattleOwned,kids,phase,lillok,customLilLok,onResult,onUnlockBig,onPublish,onLine,blip,hap,say,animFx}){
  const T=useT();
  const[pstate,setPstate]=useState("lobby");const[format,setFormat]=useState(FORMATS[0]);const[duration,setDuration]=useState(60);const[tier,setTier]=useState(10);const[prompt,setPrompt]=useState(PROMPTS[0]);const[count,setCount]=useState(3);const[timeLeft,setTimeLeft]=useState(0);const[bots,setBots]=useState([]);const[botThumbs,setBotThumbs]=useState([]);const[entries,setEntries]=useState([]);const[results,setResults]=useState(null);const[shake,setShake]=useState(false);const[splat,setSplat]=useState(null);const[block,setBlock]=useState(null);const[blocked,setBlocked]=useState(0);const[myArt,setMyArt]=useState(null);const[bFrames,setBFrames]=useState([]);const[featured,setFeatured]=useState(false);const[botType,setBotType]=useState("artist");
  const[promptFilters,setPromptFilters]=useState({category:null,motion:null});
  const easel=useRef(null);const strokes=useRef(0);const tickRef=useRef(null);const matchT=useRef(0);
  const filtered=PROMPT_META.filter(p=>{
    if(promptFilters.category&&p.category!==promptFilters.category)return false;
    if(promptFilters.motion&&p.motion!==promptFilters.motion)return false;
    return true;
  }).map(p=>p.text);
  const promptPool=kids?KID_PROMPTS:filtered.length>0?filtered:PROMPTS;const bigUnlocked=bigBattleOwned||wins>=1;
  const botArtOf=(b,t)=>b.type==="crecre"?renderDoodle(b.seed,t):renderPromptArt(prompt,b.seed,t,b.skill,b.name);
  const startMatch=()=>{const n=format.players-1;const nb=makeMatchBots(n,{kids,wins,botType});setBots(nb);const p=promptPool[Math.floor(Math.random()*promptPool.length)];setPrompt(p);setBotThumbs(nb.map(b=>b.type==="crecre"?renderDoodle(b.seed,0):renderPromptArt(p,b.seed,0,b.skill)));strokes.current=0;setResults(null);setBlocked(0);setMyArt(null);setBFrames([]);setCount(3);setPstate("count");};
  const captureBattle=()=>{if(!easel.current)return;if(bFrames.length>=14){say("Max 14 pages");return;}const url=easel.current.composite(bFrames.length);setBFrames(f=>[...f,url]);blip&&blip("D5");say(`Page ${bFrames.length+1} captured`);};
  useEffect(()=>{if(pstate!=="count")return;if(count===0){setTimeLeft(duration);matchT.current=0;setPstate("draw");onLine&&onLine("battle_start");if(bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"start");if(l)setTimeout(()=>say(l),400);}return;}const t=setTimeout(()=>setCount(c=>c-1),800);return()=>clearTimeout(t);},[pstate,count,duration]);
  useEffect(()=>{if(pstate!=="draw")return;tickRef.current=setInterval(()=>{matchT.current+=1;setTimeLeft(t=>Math.max(0,t-1));const frac=matchT.current/duration;if(matchT.current%2===0){const pressure=Math.min(1,strokes.current/40)-botProgress(bots[0],frac);setBotThumbs(bots.map(b=>botArtOf(b,botMomentum(b,frac,pressure))));}if(!kids&&matchT.current>2&&matchT.current%4===0){const line=pickMidLine(frac);if(line)say(line);}if(!kids&&matchT.current>3&&matchT.current%7===0)fireIntervention();},1000);return()=>clearInterval(tickRef.current);},[pstate,bots,duration,kids,phase]);
  const fireIntervention=()=>{const decay=phase==="decaying";const kind=INTERVENTIONS[Math.floor(Math.random()*INTERVENTIONS.length)];const id=Math.random();setBlock({id,kind});setTimeout(()=>{setBlock(b=>{if(b&&b.id===id){if(kind==="shake"){setShake(true);setTimeout(()=>setShake(false),900);}else{setSplat({k:kind,seed:Math.floor(Math.random()*9999)});setTimeout(()=>setSplat(null),1500);}if(decay)say(`${lillok.name} fumbled!`);return null;}return b;});},1400);};
  const doBlock=()=>{if(!block)return;setBlocked(b=>b+1);setBlock(null);blip&&blip("G5");hap&&hap([100,50,100]);say(phase==="thriving"?`${lillok.name} deflected it!`:"Blocked!");};
  useEffect(()=>{if(pstate==="draw"&&timeLeft===0){clearInterval(tickRef.current);setBlock(null);setSplat(null);setShake(false);const final=easel.current?easel.current.composite():renderDoodle(1,0);const allFrames=[...bFrames,final];setBFrames(allFrames);setMyArt(final);if(format.coop||kids){setPstate("done");onResult(true,featured?3:1);return;}setEntries([{name:"You",art:final,isMe:true},...bots.map(b=>({name:b.name,art:botArtOf(b,botFinalT(b)),isMe:false}))]);setPstate("vote");}},[timeLeft,pstate]);
  const castVotes=pickIdx=>{const{tally,winnerIdx:wi,won}=judgeBattle(entries,bots,pickIdx,{strokes:strokes.current,blocked,pages:bFrames.length,phase,wins});recordBattle(won);onResult(won,featured?3:1);onLine&&onLine(won?"win":"loss");const speaker=bots[Math.floor(Math.random()*bots.length)];const l=speaker&&botLine(speaker,won?"lose":"win");if(l)setTimeout(()=>say(l),900);setResults({tally,winnerIdx:wi,won});setPstate("results");};
  const publishMine=()=>{const fr=bFrames.length>=2?bFrames:[myArt];onPublish({id:"b"+Date.now(),title:`"${prompt}" — battle`,frames:fr,paceMs:220,mode:"A",style:"bold",loop:fr.length>=2,votes:results?.won?1:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"battle"});say(fr.length>=2?"Battle animation published":"Battle piece published");};
  if(pstate==="lobby")return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">{kids?"Draw Together":"Lok N Slide — Battle"}</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Same prompt, draw with your buddies, everyone wins!":"Same prompt, same clock, layered canvases. Competitors vote — never for themselves."}</p>
    {!kids&&(()=>{const msLeft=new Date(new Date().setHours(24,0,0,0))-Date.now();const hrs=Math.floor(msLeft/3600000);const mins=Math.floor((msLeft%3600000)/60000);return(<button onClick={()=>setFeatured(f=>!f)} aria-pressed={featured} aria-label={featured?"Featured match armed — next win pays 3× Loks":"Arm today's featured match for 3× Loks"} className="lok-btn mt-3 w-full p-3.5 rounded-2xl text-left relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:featured?T.ink:T.card,color:featured?T.paper:T.ink,boxShadow:featured?`6px 6px 0 ${T.accent}`:`5px 5px 0 #E8B14B`}}>
      <div className="flex items-center gap-3">
        <div className="lok-display font-extrabold text-2xl shrink-0" style={{color:featured?"#E8B14B":T.accent}}>3×</div>
        <div className="min-w-0 flex-1">
          <div className="lok-display font-extrabold text-sm uppercase tracking-widest" style={{color:featured?"#E8B14B":"#B8860B"}}>✦ Today's featured match</div>
          <div className="text-xs opacity-75 mt-0.5">{featured?"Armed — your next win pays triple Loks.":"Arm it, then win a match to earn 3× Loks."}</div>
          <div className="text-[10px] font-bold mt-0.5" style={{color:featured?T.accent:T.alt,opacity:0.85}}>Rotates in {hrs}h {mins}m</div>
        </div>
        <span className="text-xs font-extrabold shrink-0 px-2 py-1 rounded-full" style={{color:featured?T.ink:T.paper,background:featured?"#E8B14B":T.alt}}>{featured?"Armed ✓":"Arm it"}</span>
      </div>
    </button>);})()}
    {!kids&&(<><div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Format</div>
      <div className="mt-1.5 grid grid-cols-2 gap-2">{FORMATS.map((f,fi2)=>{const locked=f.locked&&!bigUnlocked;const sel=format.id===f.id;return(<button key={f.id} onClick={()=>locked?say("Big Battle unlocks at 1 win"):setFormat(f)} aria-label={`${f.label} — ${f.mood}`} className="lok-btn p-2.5 rounded-xl text-left" style={{border:`3px solid ${sel?T.accent:T.ink}`,background:sel?T.ink:T.card,color:sel?T.paper:T.ink,opacity:locked?0.55:1,boxShadow:sel?`4px 4px 0 ${T.accent}`:`3px 3px 0 ${T.shadow}`,animation:reduceMotion?"none":`lokrise .3s ease ${fi2*0.06}s both`}}><div style={{fontSize:20,lineHeight:1,marginBottom:3}}>{locked?"🔒":f.icon}</div><div className="lok-display font-extrabold text-sm">{f.label}</div><div className="text-[11px] opacity-70 mt-0.5">{f.mood}</div><div className="text-[11px] font-bold mt-0.5" style={{color:sel?T.accent:T.alt}}>{f.coop?"hot-seat":`${f.players} artists`}</div></button>);})}
      </div>{!bigUnlocked&&<button onClick={onUnlockBig} className="lok-btn mt-2 w-full py-2 rounded-xl text-sm font-bold" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}>Unlock Big Battle · 50 Loks</button>}</>)}
    {!kids&&(<><div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Bot Style</div>
    <div className="mt-1.5 grid grid-cols-2 gap-2">{BOT_TYPES.map(bt=>{const sel=botType===bt.id;return(<button key={bt.id} onClick={()=>setBotType(bt.id)} aria-pressed={sel} className="lok-btn p-2.5 rounded-xl text-left" style={{border:`3px solid ${sel?T.accent:T.ink}`,background:sel?T.ink:T.card,color:sel?T.paper:T.ink}}><div className="lok-display font-extrabold text-sm">{bt.id==="artist"?"🎨":"🌀"} {bt.name}</div><div className="text-[11px] opacity-70 mt-0.5">{bt.desc}</div></button>);})}</div></>)}
    <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Prompt filters</div>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      <button onClick={()=>setPromptFilters(f=>({...f,category:null}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${!promptFilters.category?T.accent:T.shadow}`,background:!promptFilters.category?T.ink:T.card,color:!promptFilters.category?T.paper:T.ink}}>All cats</button>
      {CATEGORIES.map(c=>(<button key={c} onClick={()=>setPromptFilters(f=>({...f,category:f.category===c?null:c}))} className="lok-btn shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${promptFilters.category===c?T.accent:T.shadow}`,background:promptFilters.category===c?T.ink:T.card,color:promptFilters.category===c?T.paper:T.ink}}>{CATEGORY_ICONS[c]||"🎨"}{c}</button>))}
    </div>
    <div className="mt-1.5 flex gap-1.5">
      <button onClick={()=>setPromptFilters(f=>({...f,motion:null}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${!promptFilters.motion?T.accent:T.shadow}`,background:!promptFilters.motion?T.ink:T.card,color:!promptFilters.motion?T.paper:T.ink}}>All motion</button>
      {MOTION_TYPES.map(m=>(<button key={m} onClick={()=>setPromptFilters(f=>({...f,motion:f.motion===m?null:m}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${promptFilters.motion===m?T.accent:T.shadow}`,background:promptFilters.motion===m?T.ink:T.card,color:promptFilters.motion===m?T.paper:T.ink}}>{m==="static"?"■ Static":m==="loop"?"⟳ Loop":"→ Transform"}</button>))}
    </div>
    <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Clock</div>
    <div className="mt-1.5 flex gap-2">{[30,60,90].map(s=>(<button key={s} onClick={()=>setDuration(s)} className="lok-btn flex-1 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:duration===s?T.accent:T.card,color:duration===s?T.onAccent:T.ink}}>{s}s</button>))}</div>
    <button onClick={startMatch} className="lok-btn lok-display mt-4 w-full py-3.5 rounded-xl text-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`5px 5px 0 ${T.ink}`,animation:reduceMotion?"none":"lokpulse 2.4s ease-in-out infinite"}}>{kids?"Start drawing!":"Find a match"}</button>
  </div>);
  if(pstate==="count")return(<div className="mt-12 text-center">
    <div className="text-sm font-bold uppercase tracking-widest opacity-60">Your prompt</div>
    <div className="lok-display text-2xl font-extrabold mt-2 mx-auto px-4 py-3 rounded-2xl flex items-center justify-center gap-2" style={{maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}}>
      <span>"{prompt}"</span>
      {(()=>{const m=PROMPT_META.find(p=>p.text===prompt);if(!m||m.motion==="static")return null;return <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{background:m.motion==="loop"?ART.teal:ART.pink,color:"#fff"}}>{m.motion==="loop"?"⟳ Loop":"→ Transform"}</span>;})()}
    </div>
    <div key={count} className="lok-display font-extrabold mt-8" style={{fontSize:count===0?80:110,color:T.accent,animation:"lokcount .4s cubic-bezier(.34,1.56,.64,1)",textShadow:`4px 4px 0 ${T.ink}`}}>{count===0?"DRAW!":count}</div>
    <div className="text-sm opacity-70 mt-2">{format.label} · {duration}s</div>
  </div>);
  if(pstate==="draw")return(<div className="mt-3" style={{animation:shake&&!reduceMotion?"lokshake .9s":"none"}}>
    <div className="flex items-center justify-between">
      <div className="min-w-0"><div className="text-xs font-bold uppercase tracking-widest opacity-60">Prompt</div><div className="lok-display font-extrabold leading-tight truncate flex items-center gap-1.5">"{prompt}"{(()=>{const m=PROMPT_META.find(p=>p.text===prompt);if(!m||m.motion==="static")return null;return <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none" style={{background:m.motion==="loop"?ART.teal:ART.pink,color:"#fff"}}>{m.motion==="loop"?"⟳ Loop":"→ Transform"}</span>;})()}</div></div>
      <div className="lok-display text-2xl font-extrabold px-3 py-1 rounded-xl shrink-0" style={{background:timeLeft<=10?T.accent:T.ink,color:timeLeft<=10?T.onAccent:T.paper,animation:timeLeft<=10&&timeLeft>0&&!reduceMotion?"lokpulse .6s ease-in-out infinite":"none",transition:"background .3s ease"}}>{timeLeft}s</div>
    </div>
    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${(timeLeft/duration)*100}%`,height:"100%",background:T.accent,transition:"width 1s linear"}}/></div>
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{bots.map((b,i)=>(<div key={b.name} className="shrink-0 text-center" style={{width:60}}><img src={botThumbs[i]} alt={b.name} className="w-full rounded-md" style={{aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/><div className="text-[10px] font-bold truncate opacity-70">{b.name}</div></div>))}</div>
    <div className="mt-2 relative">
      <Easel ref={easel} maxLayers={tier} ccTier={ccTier} onStroke={()=>(strokes.current+=1)} animFx={animFx}/>
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
  const start=()=>{const w=wagerOn?wager:0;if(w>0){if(!onWager(w)){say(`Need ${w} Loks`);return;}}setStake(w);const pool=MODES[mode].pool;const k=pool[Math.floor(Math.random()*pool.length)];setShape(k);setScore(0);setTime(modeTime[mode]||ROUND_BASE);setPhase("play");setOnline(Math.floor(700+Math.random()*500));const field=Math.floor(5+Math.random()*4);setPot(w*(field+1));setBoard(FRONT_NAMES.slice(0,field).map(n=>({name:n,score:0})).concat([{name:"you",score:0,me:true}]));setTimeout(()=>setupShape(k),0);};
  useEffect(()=>{if(phase!=="play")return;tickRef.current=setInterval(()=>setTime(t=>{if(t<=0.1){finish();return 0;}return +(t-0.1).toFixed(1);}),100);const bots=setInterval(()=>setBoard(bd=>bd.map(p=>p.me?p:{...p,score:Math.min(98,p.score+Math.random()*6)}).sort((a,b)=>b.score-a.score)),600);return()=>{clearInterval(tickRef.current);clearInterval(bots);};},[phase]);
  const coverage=()=>Math.min(100,Math.round((painted.current/Math.max(1,targetPts.current.length))*100));
  const finish=()=>{clearInterval(tickRef.current);const cov=coverage();const speedBonus=Math.round(Math.max(0,time)*2);const final=Math.min(100,cov)+speedBonus;setScore(final);setBoard(bd=>{const nb=bd.map(p=>p.me?{...p,score:final}:p).sort((a,b)=>b.score-a.score);const place=nb.findIndex(p=>p.me)+1;const field=nb.length;let payout;if(pot>0)payout=place===1?Math.round(pot*0.6):place===2?Math.round(pot*0.3):place===3?Math.round(pot*0.1):0;else payout=place===1?15:place<=Math.ceil(field/2)?6:1;setLastPayout(payout);setTimeout(()=>{if(payout>0)onEarn(payout);blip&&blip(place===1?"C6":"E5");say(place===1?`1st! +${payout} Loks`:`#${place} · +${payout} Loks`);},50);return nb;});setPhase("results");};
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
    {wagerOn&&stake>0&&<div className="text-center text-[10px] opacity-60 mt-1">Wagered {stake} · Won {lastPayout} Loks</div>}
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
    <div ref={wrapRef} className="relative mt-2 rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4/5",touchAction:"manipulation"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}>
      <canvas ref={guideRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <canvas ref={inkRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <div className="absolute inset-0" role="img" aria-label="Trace Rush canvas" style={{touchAction:"none",cursor:"crosshair"}}/>
      <button onClick={finish} className="lok-btn absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{background:T.ink,color:T.paper}}>Lock it in</button>
    </div>
    <div className="mt-2 flex items-center gap-2"><div className="text-xs opacity-70"><span style={{color:T.alt}}>●</span> {online.toLocaleString()} online</div></div>
    <p className="mt-1 text-center text-xs opacity-50">Teal = on the line · pink = off. Finish early for speed bonus.</p>
  </div>);
}

function PostCard({p,onOpen}){
  const T=useT();
  if(!p.frames||p.frames.length===0)return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={p.title}><div className="flex items-center justify-center" style={{aspectRatio:"4/5",background:T.paper}}><div className="text-center opacity-40"><div className="lok-display font-extrabold">{p.title}</div><div className="text-xs">Rendering…</div></div></div></button>);
  return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={`Open ${p.title}`}><div className="relative"><img src={p.frames[Math.floor(p.frames.length/2)]} alt={p.title} className="w-full block" style={{aspectRatio:"4 / 5",objectFit:"cover"}}/><div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-xs font-bold" style={{background:T.ink,color:T.paper}}>{p.from==="battle"?"⚔ battle":p.mode==="B"?"▣ page":`${p.frames.length}pg`}</div></div><div className="px-2.5 py-2"><div className="font-bold leading-tight truncate text-sm">{p.title}</div><div className="text-xs opacity-70 mt-0.5">{p.votes} votes · {p.views||0} views</div></div></button>);
}
function PersonRow({name,note}){const T=useT();const seed=name.length*31;return(<div className="flex items-center gap-3 p-2 rounded-xl mb-2" style={{border:`2.5px solid ${T.ink}`,background:T.card}}><img src={renderAvatar(seed)} alt={name} className="w-11 h-11 rounded-full" style={{border:`2px solid ${T.ink}`}}/><div className="font-bold flex-1">{name}</div>{note&&<span className="text-xs opacity-60">{note}</span>}</div>);}

function Profile({posts,profile,setProfile,wins,lokPass,kids,cosmetics={},level,xp,quests,following,lokdInCount,bookmarks,notifications=[],notifUnread=0,loks=0,totalEarned=0,questsCompleted=0,canInstall=false,onInstall,onClearNotifs,onOpen,onDelete,onRename,say,onCheat,pace="sweep",setPace,speed=1,setSpeed,soundLab=false,onUnlockSoundLab,soundQueue=[],setSoundQueue,founder=false,onFounderJoin,animatedToken=false,flair="",garden=[],setGarden,wordTwister={},setWordTwister,timeMachineIdx=-1,setTimeMachineIdx,heatmapData=[],sessionPin=null,setSessionPin,pinInput="",setPinInput,verified=false,setVerified,devTap,devTimer,devMode,setDevMode,appLogo,setAppLogo,hapticGrammar,setHapticGrammar,setPinUnlocked,setLoks,setTotalEarned,legacyStudio,setLegacyStudio}){
  const T=useT();const[filter,setFilter]=useState("newest");const[view,setView]=useState("gallery");const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(profile);const[showNotifs,setShowNotifs]=useState(false);const[searchQ,setSearchQ]=useState("");const[showSettings,setShowSettings]=useState(false);
  const tapCount=useRef(0);const tapTimer=useRef(null);const audioRef=useRef(null);const[slUrl,setSlUrl]=useState("");const[slPlaying,setSlPlaying]=useState(null);const[fHandle,setFHandle]=useState(profile.name||"");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);
  const[bleepCode,setBleepCode]=useState("");
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
  return(<div>
    <section className="mt-4 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`6px 6px 0 ${T.shadow}`}}>
      <div className="flex items-center gap-4">
        <FramedAvatar src={avatar} size={72} frame={cosmetics.frame} accent={cosmetics.avatarAccent} ink={T.ink} acc={T.accent} animated={animatedToken}/>
        <div className="min-w-0 flex-1"><div className="lok-display text-xl font-extrabold leading-tight flex items-center gap-2 flex-wrap"><NameTag name={profile.name} color={cosmetics.nameColor} style={{color:T.ink}}/>{flair&&<span className="text-[10px] ml-1 px-1 py-0.5 rounded" style={{background:T.alt,color:"#fff"}}>{flair}</span>}{lokPass&&!kids&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PASS</span>}</div><div className="text-sm opacity-70">{posts.length} flips · {wins} {wins===1?"win":"wins"}</div></div>
        <div className="flex gap-1.5">
          {notifUnread>0&&<button onClick={()=>{setShowNotifs(v=>!v);onClearNotifs&&onClearNotifs();}} className="lok-btn relative px-2 py-1.5 rounded-full text-xs font-bold" style={{border:`2px solid ${T.accent}`,background:T.accent,color:"#fff"}} aria-label={`${notifUnread} notifications`}>🔔 {notifUnread}</button>}
          <button onClick={()=>{setDraft(profile);setEditing(true);}} className="lok-btn px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Edit profile">Edit</button>
          <button onClick={()=>setShowSettings(true)} className="lok-btn px-2.5 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Settings">⚙</button>
        </div>
      </div>
      {showNotifs&&notifications.length>0&&(<div className="mt-3 flex flex-col gap-1.5">{notifications.slice(-5).reverse().map(n=>(<div key={n.id} className="text-xs px-3 py-2 rounded-xl" style={{background:T.paper,border:`1.5px solid ${T.shadow}`}}>{n.msg}</div>))}</div>)}
      <p className="mt-3 text-sm leading-snug">{profile.bio}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">{[["lokdin","Lok'd in",(lokdInCount).toLocaleString()],["lokd","Lok'd",following.length],["bookmarks","Bookmarks",bookmarks.length]].map(([id,label,n])=>(<button key={id} onClick={()=>setView(view===id?"gallery":id)} className="lok-btn py-2 rounded-xl text-center" style={{border:`2.5px solid ${view===id?T.accent:T.ink}`,background:view===id?T.ink:"transparent",color:view===id?T.paper:T.ink}} aria-pressed={view===id}><div className="lok-display font-extrabold leading-none">{n}</div><div className="text-[11px] opacity-75">{label}</div></button>))}</div>
    </section>
    {!kids&&(<section className="mt-3 p-4 rounded-2xl" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
      <div className="flex items-center justify-between"><div className="lok-display font-extrabold">Level {level}</div><div className="text-xs opacity-70">{xp%100}/100 XP</div></div>
      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${xp%100}%`,height:"100%",background:T.accent}}/></div>
      <div className="lok-display font-extrabold mt-3 mb-1 text-sm">Today's quests</div>
      <div className="space-y-1.5">{quests?.items?.map(q=>(<div key={q.id} className="flex items-center gap-2 text-sm"><span className="font-bold" style={{color:q.done?T.alt:T.ink,opacity:q.done?1:0.9}}>{q.done?"✓":"○"}</span><span className="flex-1" style={{textDecoration:q.done?"line-through":"none",opacity:q.done?0.55:1}}>{q.label}</span><span className="text-xs font-bold" style={{color:T.accent}}>{q.progress}/{q.goal} · +{q.reward}</span></div>))}</div>
    </section>)}
    {!kids&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.alt}`,background:T.card}}>
      <div className="flex items-center gap-2 mb-1.5"><div className="lok-display font-extrabold text-sm" style={{color:T.alt}}>🌀 Word Twister</div><span className="text-xs opacity-50">daily</span></div>
      {wordTwister.word?(!wordTwister.found?<div className="flex items-center gap-2"><span className="lok-display text-2xl font-extrabold tracking-widest" style={{color:T.accent}}>{wordTwister.shuffled}</span><input value={wordTwister.guess||""} onChange={e=>{const v=e.target.value.toLowerCase();setWordTwister(w=>{if(v===w.word){setLoks(l=>l+5);setTotalEarned(t=>t+5);say("Word cracked! +5 Loks","success");return{...w,found:true,guess:v};}return{...w,guess:v};});}} placeholder="Unscramble…" maxLength={20} className="flex-1 px-2 py-1.5 rounded-lg text-sm font-bold" style={{border:`2px solid ${T.ink}`,background:T.paper,color:T.ink}} aria-label="Guess the word"/><button onClick={()=>setWordTwister(w=>({...w,revealed:true}))} className="lok-btn text-[10px] font-bold px-2 py-1 rounded" style={{border:`1.5px solid ${T.shadow}`,color:T.ink}}>Reveal</button></div>:<div className="text-sm font-bold" style={{color:T.alt}}>Solved ✓ <span className="font-mono">{wordTwister.word}</span></div>):<button onClick={()=>{const pool=["SKETCH","INKWELL","BLOOM","RISOPRINT","LILLOK","FLIPBOOK","STENCIL","VIGNETTE"];const w=pool[Math.floor(Math.random()*pool.length)];const shuffled=w.split("").sort(()=>Math.random()-.5).join("");setWordTwister({word:w,shuffled,found:false,guess:"",revealed:false});}} className="lok-btn text-xs font-bold px-3 py-1.5 rounded-lg" style={{border:`2px solid ${T.ink}`}}>Start daily twister</button>}
      {wordTwister.revealed&&!wordTwister.found&&<div className="mt-1 text-[10px] font-bold opacity-60">The word was: <span className="font-mono" style={{color:T.accent}}>{wordTwister.word}</span></div>}
    </section>)}
    {!kids&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.card}}>
      <div className="flex items-center justify-between mb-1.5"><div className="lok-display font-extrabold text-sm">Loks</div>{nextMilestone&&<div className="text-[10px] opacity-50 font-bold">next quest milestone: {nextMilestone}</div>}</div>
      <div className="flex items-center justify-around">
        <div className="text-center"><div className="lok-display font-extrabold text-xl" style={{color:T.accent}}>{loks}</div><div className="text-[11px] opacity-60">balance</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{totalEarned}</div><div className="text-[11px] opacity-60">earned all-time</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{questsCompleted}</div><div className="text-[11px] opacity-60">quests done</div></div>
      </div>
    </section>)}
    {!kids&&(<section className="mt-3 p-3 rounded-2xl" style={{border:`2px solid ${T.alt}`,background:T.card}}>
      <div className="flex items-center gap-2 mb-1.5"><div className="lok-display font-extrabold text-sm" style={{color:T.alt}}>🌱 Ink Garden</div><span className="text-xs opacity-50">{garden.length}/6 planted</span></div>
      <div className="grid grid-cols-3 gap-2">{Array.from({length:6}).map((_,i)=>{const plant=garden[i];return(<div key={i} className="rounded-xl flex items-center justify-center" style={{minHeight:60,border:`2px dashed ${plant?T.accent:T.shadow}`,background:plant?T.paper:"transparent",transition:"all .3s"}}>
        {plant?<div className="text-center"><div className="text-lg">{plant.harvested?"🌸":plant.growth>=100?"🌻":"🌱"}</div><div className="text-[9px] font-bold mt-0.5">{plant.harvested?"done":plant.growth>=100?<button onClick={()=>{setGarden(g=>g.map((x,j)=>j===i?{...x,harvested:true}:x));setLoks(l=>l+8);say("Harvested! +8 Loks","success");}} className="underline" style={{color:T.accent}}>harvest</button>:`${Math.round(plant.growth)}%`}</div></div>
        :<button onClick={()=>{const names=["Doodle Dahlia","Riso Rose","Ink Ivy","Sketch Sun","Bloom Bud","Violet Vine"];setGarden(g=>{const n=[...g];n[i]={name:names[i]||`Plant ${i+1}`,planted:Date.now(),growth:5+Math.random()*15,harvested:false};return n;});say("Planted a seed!","success");}} className="text-xs font-bold opacity-50">+ plant</button>}
      </div>);})}</div>
      {garden.some(p=>p&&!p.harvested)&&<button onClick={()=>setGarden(g=>g.map(p=>p&&!p.harvested?{...p,growth:Math.min(100,p.growth+5+Math.random()*10)}:p))} className="lok-btn mt-1.5 w-full py-1.5 rounded-xl text-xs font-bold" style={{border:`2px solid ${T.ink}`,background:T.card}}>💧 Water all (+water each plant)</button>}
    </section>)}
    {showSettings&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setShowSettings(false)}>
      <div className="w-full rounded-t-3xl p-5" style={{maxWidth:560,background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">Settings</div><button onClick={()=>setShowSettings(false)} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close settings">✕</button></div>
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">📱 Add Lok to your home screen</div>
          <div className="text-xs opacity-70 mt-1 leading-snug">{isIOS?"Tap the Share button in Safari, then \u201CAdd to Home Screen\u201D. Lok opens full-screen like a native app.":"Install Lok as an app — it gets its own icon and opens full-screen, no browser bars."}</div>
          {!isIOS&&<button onClick={()=>onInstall&&onInstall()} className="lok-btn lok-display mt-2 w-full py-2.5 rounded-xl font-extrabold" style={{background:canInstall?T.accent:T.shadow,color:canInstall?T.onAccent:T.ink,border:`3px solid ${T.ink}`,opacity:canInstall?1:0.7}} aria-label="Install Lok as an app">{canInstall?"Install Lok":"Install via browser menu →"}</button>}
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
        <div className="p-3 rounded-2xl mb-2" style={{border:`3px solid ${sessionPin?T.accent:T.ink}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm">🔒 Session lock{sessionPin&&<span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{background:T.alt,color:"#fff"}}>ACTIVE</span>}</div>
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
          <div className="p-3 rounded-2xl mb-2" style={{border:`2px dashed ${T.shadow}`,background:T.paper,opacity:0.85}}>
          <div className="font-bold text-sm">🫧 BadBleep Box</div>
          <div className="text-[10px] opacity-50 mt-0.5">whisper something the ink might recognize</div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={bleepCode} onChange={e=>setBleepCode(e.target.value)} placeholder="…" aria-label="BadBleep code" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2px solid ${T.shadow}`,background:T.card,color:T.ink}} onKeyDown={e=>{if(e.key==="Enter"){onCheat&&onCheat(bleepCode);setBleepCode("");}}}/>
            <button onClick={()=>{onCheat&&onCheat(bleepCode);setBleepCode("");}} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm shrink-0" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>bleep</button>
          </div>
        </div>
          <div className="font-bold text-sm">About</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={e=>{versionTap();devTap.current++;clearTimeout(devTimer.current);devTimer.current=setTimeout(()=>devTap.current=0,1200);if(devTap.current>=7){devTap.current=0;setDevMode(d=>!d);say(devMode?"Dev mode off":"Dev mode on");}}} style={{cursor:"default"}}>LokBook + Lok N Slide · <span style={{fontWeight:700}}>alpha v1.2</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
        </div>
        {devMode&&(<div className="p-3 rounded-2xl mb-2" style={{border:`3px dashed ${T.accent}`,background:T.paper}}>
          <div className="lok-display font-extrabold text-sm" style={{color:T.accent}}>🔩 Dev Flags</div>
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
    </div>)}
    {editing&&(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>setEditing(false)}>
      <div className="w-full rounded-t-3xl p-5" style={{maxWidth:560,background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="lok-display text-lg font-extrabold mb-3">Edit profile</div>
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
      {filtered.length?<div className="mt-2 grid grid-cols-2 gap-3">{filtered.map(p=><PostCard key={p.id} p={p} onOpen={onOpen}/>)}</div>:<EmptyState icon="search" title={searchQ?"No flips match":"No pieces match"} subtitle={searchQ?"Try different words":"Try a different filter or publish your first flip!"}/>}
      {timeMachineIdx>=0&&posts[timeMachineIdx]&&(<div className="mt-3 rounded-2xl p-3" style={{border:`3px solid ${T.alt}`,background:T.card}}>
        <div className="flex items-center justify-between mb-1"><div className="lok-display font-extrabold text-sm">🕐 Time Machine</div><button onClick={()=>setTimeMachineIdx(-1)} className="lok-btn text-xs font-bold px-2 py-0.5 rounded" style={{border:`1.5px solid ${T.ink}`}}>✕</button></div>
        <input type="range" min="0" max={posts.length-1} value={timeMachineIdx} onChange={e=>setTimeMachineIdx(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Scroll through your flips timeline"/>
        <div className="flex items-center gap-2 mt-1"><img src={posts[timeMachineIdx]?.frames?.[0]} alt="" className="w-12 rounded-lg shrink-0" style={{aspectRatio:"4/5",objectFit:"cover",border:`2px solid ${T.ink}`}}/><div className="min-w-0"><div className="font-bold text-sm truncate">{posts[timeMachineIdx]?.title}</div><div className="text-xs opacity-60">{timeMachineIdx+1} of {posts.length} · {posts[timeMachineIdx]?.votes} votes</div></div></div>
      </div>)}
    </>)}
  </div>);
}

export default function LokApp(){
  const lilLokPhase = (s) => { if (s.stasis) return "stasis"; if (s.ink < 15) return "critical"; if (s.ink < 35) return "decaying"; return "thriving"; };
  const getLilLokLine = (phase = "thriving", ctx = "") => { if (!ctx) { const h = new Date().getHours(); if (phase === "thriving" && h >= 5 && h < 10) return "Good morning. First lines of the day."; if (phase === "thriving" && h >= 21) return "Late-night drawing session?"; } const pool = (ctx && LILLOK_SPEECH[ctx]) ? LILLOK_SPEECH[ctx] : (LILLOK_SPEECH[phase] || LILLOK_SPEECH.thriving); return pool[Math.floor(Math.random() * pool.length)]; };
  const[ready,setReady]=useState(false);const[tab,setTab]=useState("feed");const[openIdx,setOpenIdx]=useState(null);const[posts,setPosts]=useState([]);const[toasts,setToasts]=useState([]);const[botPosted,setBotPosted]=useState([]);
  const[questsCompleted,setQuestsCompleted]=useState(0);const[totalEarned,setTotalEarned]=useState(0);const[traceHinted,setTraceHinted]=useState(false);const[fabBubble,setFabBubble]=useState("");const[adIdx,setAdIdx]=useState(0);const[installEvt,setInstallEvt]=useState(null);const[showSettings,setShowSettings]=useState(false);
  const[loks,setLoks]=useState(260);const[myRooms,setMyRooms]=useState([]);const[pendingRoomCode,setPendingRoomCode]=useState(()=>{try{return new URLSearchParams(location.search).get("room")||null;}catch{return null;}});const[pace,setPace]=useState("sweep");const[speed,setSpeed]=useState(1);const[soundLab,setSoundLab]=useState(false);const[soundQueue,setSoundQueue]=useState([]);const[founder,setFounder]=useState(false);const[totalSpent,setTotalSpent]=useState(0);const[fodHistory,setFodHistory]=useState([]);const[lokPass,setLokPass]=useState(false);const[uiTheme,setUiTheme]=useState("riso");const[ownedThemes,setOwnedThemes]=useState(["riso"]);const[effect,setEffect]=useState("none");const[ownedEffects,setOwnedEffects]=useState(["none"]);const[ownedTiers,setOwnedTiers]=useState([10]);const[ccTier,setCcTier]=useState(false);const[bigBattleOwned,setBigBattleOwned]=useState(false);const[wins,setWins]=useState(0);
  const[profile,setProfile]=useState(()=>{const seed=Math.floor(Math.random()*9999);return{name:starterHandle(seed),bio:"",avatarSeed:seed,links:[{label:"Lok page",url:"coming soon"}]};});
  const[focusMode,setFocusMode]=useState(false);  const[featureFlags,setFeatureFlags]=useState({compactUi:false,vibe:"default"});
  const[comebackActive,setComebackActive]=useState(false);const[legacyStudio,setLegacyStudio]=useState(false);const[legacyBrushes,setLegacyBrushes]=useState(false);
  const[lastComebackAward,setLastComebackAward]=useState(0);
  const[lastOfflineBonus,setLastOfflineBonus]=useState(0);
  const[celebrationStyle,setCelebrationStyle]=useState("confetti");
  const[comebackCelebration,setComebackCelebration]=useState(null);
  const[bookmarks,setBookmarks]=useState([]);const[following,setFollowing]=useState([]);const[lillok,setLillok]=useState({ink:80,bond:30,stasis:false,name:"Blot",lastSeen:Date.now()});const[customLilLok,setCustomLilLok]=useState(null);const[cosmetics,setCosmetics]=useState({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none"});const[owned,setOwned]=useState({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"]});const[kids,setKids]=useState(false);const[showLilLok,setShowLilLok]=useState(false);const[onboarded,setOnboarded]=useState(false);const[showOnboard,setShowOnboard]=useState(false);const[showHint,setShowHint]=useState(false);const[sound,setSound]=useState(false);const[feedMode,setFeedMode]=useState("discover");const[daily,setDaily]=useState({day:null,streak:0,claimed:false,prompt:""});const[xp,setXp]=useState(0);const[quests,setQuests]=useState(null);const[flair,setFlair]=useState("");const[adVisible,setAdVisible]=useState(true);const[notifications,setNotifications]=useState([]);const[notifUnread,setNotifUnread]=useState(0);
  const[sessionPin,setSessionPin]=useState(null);const[pinInput,setPinInput]=useState("");const[pinError,setPinError]=useState("");const[pinUnlocked,setPinUnlocked]=useState(true);
  const[moodTags,setMoodTags]=useState({});const[moodFilter,setMoodFilter]=useState("all");
  const[garden,setGarden]=useState([]);const[gardenTimer,setGardenTimer]=useState(0);
  const[reportedPosts,setReportedPosts]=useState([]);
  const[verified,setVerified]=useState(false);
  const[modules,setModules]=useState(["layers_10","brush_ink"]);const[sky,setSky]=useState(null);const[ownedSkies,setOwnedSkies]=useState(["clear"]);const[animFx,setAnimFx]=useState("none");const[ownedAnimFx,setOwnedAnimFx]=useState(["none"]);const[fontPack,setFontPack]=useState("default");const[cursorPack,setCursorPack]=useState("default");const[musicPack,setMusicPack]=useState("none");const[stickerPack,setStickerPack]=useState("emoji");const[postExport,setPostExport]=useState("png");
  const[mythicOwned,setMythicOwned]=useState([]);const[mythicEquipped,setMythicEquipped]=useState(null);const[dailyOwned,setDailyOwned]=useState([]);const[weeklyOwned,setWeeklyOwned]=useState([]);const[celebration,setCelebration]=useState(null);
  const[appLogo,setAppLogo]=useState("default");const[devMode,setDevMode]=useState(false);const devTap=useRef(0);const devTimer=useRef(null);
  const[timeMachineIdx,setTimeMachineIdx]=useState(-1);
  const[wordTwister,setWordTwister]=useState({word:"",shuffled:"",found:false,revealed:false});
  const[stickers,setStickers]=useState([]);
  const[heatmapData,setHeatmapData]=useState([]);
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
  useEffect(()=>{if(!ready)return;const picks=pickAmbientPosts(botPosted,2);if(!picks.length)return;setBotPosted(b=>[...b,...picks.map(p=>p.key)].slice(-400));picks.forEach((pk,i)=>{setTimeout(()=>{try{const post=generateBotPost(pk.bot,pk.seed);if(post)setPosts(ps=>ps.some(x=>x.id===post.id)?ps:[...ps.slice(0,3),post,...ps.slice(3)]);}catch(e){console.warn("botArt",e);}},1600+i*900);});},[ready]);
  useEffect(()=>{const onScroll=()=>{setAdVisible(false);clearTimeout(adScrollTimer.current);adScrollTimer.current=setTimeout(()=>setAdVisible(true),1200);};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);
  const guardedAddLoks=useCallback(n=>{const now=Date.now();if(now-earnLog.current.ts>3600000){earnLog.current={ts:now,total:0};}if(earnLog.current.total+n>120){return;}earnLog.current.total+=n;setLoks(l=>l+n);setTotalEarned(t=>t+n);},[]);
  const addLoks=guardedAddLoks;
  const pushNotif=useCallback((msg,type="info")=>{setNotifications(ns=>[...ns.slice(-49),{id:Date.now(),msg,type,ts:Date.now()}]);setNotifUnread(n=>n+1);},[]);
  const say=useCallback((m,type="default")=>{const id=Date.now()+Math.random();setToasts(t=>[...t.slice(-4),{id,msg:m,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);},[]);
  const showLine=useCallback((ctx="")=>{const s={name:lillok.name,wins,loks,ink:lillok.ink,bond:lillok.bond};setFabBubble(getLilLokLine(lilLokPhase(lillok),ctx,s,fourthWall));setTimeout(()=>setFabBubble(""),3500);},[lillok,wins,loks,fourthWall]);
  const gainXp=useCallback(n=>setXp(x=>{const before=Math.floor(x/100);const nx=x+n;if(Math.floor(nx/100)>before){setTimeout(()=>say(`Level ${Math.floor(nx/100)+1}! New flair unlocked`),300);}return nx;}),[say]);
  const questTick=useCallback((track,amt=1)=>{setQuests(q=>{if(!q)return q;let paid=0,msg=null,doneCount=0;const items=q.items.map(it=>{if(it.track!==track||it.done)return it;const progress=Math.min(it.goal,it.progress+amt);const done=progress>=it.goal;if(done){paid+=it.reward;doneCount++;msg=`Quest done: ${it.label} · +${it.reward}`;}return{...it,progress,done};});if(paid){setLoks(l=>l+paid);setTotalEarned(t=>t+paid);gainXp(paid);setTimeout(()=>say(msg,"success"),250);setQuestsCompleted(c=>{const nc=c+doneCount;const m=[10,25,50,100].find(x=>c<x&&nc>=x);if(m){const bonus=m*2;setLoks(l=>l+bonus);setTotalEarned(t=>t+bonus);setTimeout(()=>{say(`🎖 ${m} quests done · +${bonus} bonus Loks`,"success");hap([200,100,200,100,200]);},700);}return nc;});}return{...q,items};});},[gainXp,say,hap]);
  useEffect(()=>{(async()=>{
    const dayOfYear=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const todayPromptIdx=(new Date().getFullYear()*366+dayOfYear(new Date()))%PROMPTS.length;
    const makeSeedLazy=(drawFn,n,id,meta)=>({...meta,id,frames:[],_pendingDraw:drawFn,_pendingN:n,paceMs:meta.paceMs});
    const seed=[makeSeedLazy(drawBounce,14,"seed1",{title:"Bounce study",votes:41,voted:false,viewed:false,reactions:{splat:12,heart:30,drip:5},from:"studio",mode:"A",style:"bold",views:312}),makeSeedLazy(drawBloom,12,"seed2",{title:"Bloom",votes:67,voted:false,viewed:false,reactions:{splat:8,heart:52,drip:9},from:"studio",mode:"B",style:"series",views:540}),makeSeedLazy(drawNight,13,"seed3",{title:"Night flight",votes:29,voted:false,viewed:false,reactions:{splat:21,heart:14,drip:11},from:"studio",mode:"A",style:"bold",views:188})];
    const save=await store.get(SAVE_KEY);const savedGallery=await store.get(GALLERY_KEY);const flags=await store.get("lok:flags");if(flags)setFeatureFlags(f=>({...f,...flags}));const todayKey=new Date().toDateString();
    let loadedDaily={day:todayKey,streak:1,claimed:false,prompt:PROMPTS[todayPromptIdx]};
    let gap=0;
    if(save){setLoks(save.loks??60);setLokPass(!!save.lokPass);setUiTheme(save.uiTheme||"riso");setOwnedThemes(save.ownedThemes||["riso"]);setEffect(save.effect||"none");setOwnedEffects(save.ownedEffects||["none"]);setOwnedTiers(save.ownedTiers||[10]);setCcTier(!!save.ccTier);setBigBattleOwned(!!save.bigBattleOwned);setWins(save.wins??0);if(save.profile)setProfile(pr=>({...save.profile,name:save.profile.name||starterHandle(save.profile.avatarSeed??pr.avatarSeed)}));setBookmarks(save.bookmarks||[]);setFollowing(save.following||[]);setKids(!!save.kids);if(save.customLilLok)setCustomLilLok(save.customLilLok);if(save.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",gear:"none",...save.cosmetics});if(save.owned){const migrated=Object.fromEntries(Object.entries(save.owned).map(([k,v])=>[k,v.map(i=>typeof i==="string"?{id:i,ts:0}:i)]));setOwned({nameColor:[{id:"default",ts:0}],frame:[{id:"none",ts:0}],reactionPack:[{id:"base",ts:0}],avatarAccent:[{id:"none",ts:0}],blotBorder:[{id:"none",ts:0}],paper:[{id:"plain",ts:0}],gear:[{id:"none",ts:0}],...migrated});}setOnboarded(!!save.onboarded);setSound(!!save.sound);setXp(save.xp??0);setFlair(save.flair||"");setQuestsCompleted(save.questsCompleted??0);setTotalEarned(save.totalEarned??0);setTraceHinted(!!save.traceHinted);setPace(save.pace||"sweep");setSpeed(save.speed??1);setSoundLab(!!save.soundLab);setSoundQueue(save.soundQueue||[]);setFounder(!!save.founder);setTotalSpent(save.totalSpent??0);setFodHistory(save.fodHistory||[]);setHapticGrammar(save.hapticGrammar||"default");setFourthWall(save.fourthWall??100);setBotPosted(save.botPosted||[]);if(!save.onboarded)setShowHint(false);else setShowHint(true);
    if(save.sessionPin)setSessionPin(save.sessionPin);if(save.sessionPin)setPinUnlocked(false);
    if(save.moodTags)setMoodTags(save.moodTags);if(save.garden)setGarden(save.garden);
    if(save.reportedPosts)setReportedPosts(save.reportedPosts);
    if(save.verified)setVerified(true);
    if(save.stickers)setStickers(save.stickers);
    if(save.modules)setModules(save.modules);if(save.sky)setSky(save.sky);if(save.ownedSkies)setOwnedSkies(save.ownedSkies);if(save.animFx)setAnimFx(save.animFx);if(save.ownedAnimFx)setOwnedAnimFx(save.ownedAnimFx);if(save.fontPack)setFontPack(save.fontPack);if(save.cursorPack)setCursorPack(save.cursorPack);if(save.musicPack)setMusicPack(save.musicPack);if(save.stickerPack)setStickerPack(save.stickerPack);if(save.postExport)setPostExport(save.postExport);    if(save.mythicOwned)setMythicOwned(save.mythicOwned);if(save.mythicEquipped)setMythicEquipped(save.mythicEquipped);if(save.dailyOwned)setDailyOwned(save.dailyOwned);if(save.weeklyOwned)setWeeklyOwned(save.weeklyOwned);
    if(save.appLogo)setAppLogo(save.appLogo);
    if(save.comebackActive!==undefined)setComebackActive(save.comebackActive);if(save.legacyStudio!==undefined)setLegacyStudio(save.legacyStudio);if(save.legacyBrushes!==undefined)setLegacyBrushes(save.legacyBrushes);
    if(save.comebackStyle)setCelebrationStyle(save.comebackStyle);
    if(save.lastComebackAward)setLastComebackAward(save.lastComebackAward);
    if(save.lastOfflineBonus)setLastOfflineBonus(save.lastOfflineBonus);
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
  })().finally(()=>{const elapsed=Date.now()-loadStart.current;setTimeout(()=>setReady(true),Math.max(0,3500-elapsed));});const fb=setTimeout(()=>setReady(true),10000);return()=>clearTimeout(fb);},[]);
  useEffect(()=>{applyLogo(appLogo);},[appLogo]);
  const doSave=useCallback(()=>{store.set(SAVE_KEY,{botPosted,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,hapticGrammar,fourthWall,sessionPin,moodTags,garden,reportedPosts,verified,stickers,lillok:{...lillok,lastSeen:Date.now()},modules,sky,ownedSkies,animFx,ownedAnimFx,fontPack,cursorPack,musicPack,stickerPack,postExport,mythicOwned,mythicEquipped,dailyOwned,weeklyOwned,appLogo,notifications,comebackActive,comebackStyle:celebrationStyle,lastComebackAward,lastOfflineBonus,legacyStudio,legacyBrushes});},[botPosted,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,hapticGrammar,fourthWall,sessionPin,moodTags,garden,reportedPosts,verified,stickers,lillok,modules,sky,ownedSkies,animFx,ownedAnimFx,fontPack,cursorPack,musicPack,stickerPack,postExport,mythicOwned,mythicEquipped,dailyOwned,weeklyOwned,appLogo,notifications,comebackActive,celebrationStyle,lastComebackAward,lastOfflineBonus]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(doSave,400);return()=>clearTimeout(t);},[ready,doSave]);
  useEffect(()=>{if(!ready)return;const userPosts=posts.filter(p=>!p.id?.startsWith("seed"));const t=setTimeout(()=>{store.set(GALLERY_KEY,userPosts).then(ok=>{if(!ok)say("Gallery too big");});},500);return()=>clearTimeout(t);},[ready,posts]);
  useEffect(()=>{if(!ready||kids)return;let interval=null;const startDecay=()=>{interval=setInterval(()=>setLillok(s=>{if(s.stasis)return s;if(s.ink===0){if(!s.inkZeroAt)return{...s,inkZeroAt:Date.now()};if(Date.now()-s.inkZeroAt>120000)return{...s,stasis:true,inkZeroAt:null};return s;}const buffer=1-(s.bond/100)*0.5;return{...s,ink:Math.max(0,s.ink-1.4*buffer)};}),12000);};const stopDecay=()=>{clearInterval(interval);interval=null;};const onVisible=()=>{if(document.visibilityState==="hidden")stopDecay();else startDecay();};startDecay();document.addEventListener("visibilitychange",onVisible);return()=>{stopDecay();document.removeEventListener("visibilitychange",onVisible);};},[ready,kids]);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  useEffect(()=>{const save=()=>doSave();window.addEventListener("beforeunload",save);return()=>window.removeEventListener("beforeunload",save);},[doSave]);
  useEffect(()=>{if(lokPass||kids)return;const t=setInterval(()=>setAdIdx(i=>(i+1)%ADS.length),8000);return()=>clearInterval(t);},[lokPass,kids]);
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
  },[say,hap,blip,pushNotif,ownedThemes,VOICE_PACKS,CELEBRATIONS,celebrationStyle]);
  const patchPost=(id,patch)=>setPosts(ps=>ps.map(p=>(p.id===id?{...p,...patch}:p)));
  const setArtistView=useCallback(name=>{setTab("gallery");say(`${name}'s gallery`);},[say]);
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
  if(!ready)return(<Loader/>);
  return(<ThemeCtx.Provider value={T}>
    <div className={`min-h-screen w-full ${featureFlags.compactUi ? "lok-compact" : ""}`} style={{background:T.paper,color:T.ink,fontFamily:"'Schibsted Grotesk',system-ui,sans-serif",animation:effect==="quake"&&!reduceMotion?"lokquake 6s infinite":"none"}}>
      <GlobalStyle T={T} pace={pace} speed={speed}/><ThemeBackdrop themeId={uiTheme} pace={pace}/><PageEffect effect={effect}/>
      {!focusMode && <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={()=>setTab("feed")} aria-label="Go to feed" className="lok-btn lok-display relative text-2xl font-extrabold tracking-tight select-none" style={{background:"transparent",border:"none",padding:0}}>
          <span className="absolute" style={{color:T.accent,left:3,top:2}}>Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
          <span className="relative">Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
        </button>
        <div className="flex items-center gap-2">
          {kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.alt,color:"#fff"}}>SAFE</span>}
          {lokPass&&!kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.accent,color:T.onAccent}}>PASS</span>}
          <button onClick={()=>setSound(s=>!s)} aria-label={sound?"Mute sound":"Enable sound"} className="lok-btn w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:sound?T.ink:T.card,color:sound?T.paper:T.ink}}>{sound?"♪":"♪̸"}</button>
          <span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.ink,color:T.paper}} aria-label={`Level ${level}`}>Lv {level}{verified&&<span style={{color:"#E8B14B",marginLeft:2}}>✦</span>}</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card}} aria-label={`${loks} Loks`}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="11" cy="11" r="8" fill={T.accent}/><circle cx="9" cy="9" r="8" fill="none" stroke={T.ink} strokeWidth="2.4"/><path d="M7 5.5 V12.5 H12" fill="none" stroke={T.ink} strokeWidth="2.4" strokeLinecap="round"/></svg>
            {loks}
          </div>
        </div>
      </header>}
      <main className="mx-auto w-full px-4 pb-40" style={{maxWidth:560}}>
        <div key={tab} className="lok-tabin">
          {tab==="feed"&&<Feed posts={posts} bookmarks={bookmarks} following={following} feedMode={feedMode} setFeedMode={setFeedMode} cosmetics={cosmetics} daily={daily} streak={daily.streak} dailyClaimed={daily.claimed} flipOfDay={flipOfDay} onLine={showLine} onClaimDaily={()=>{if(daily.claimed)return;const wk=daily.streak%7===0&&daily.streak>0?20:0;const mo=daily.streak%30===0&&daily.streak>0?100:0;const bonus=10+Math.min(daily.streak,7)*5+wk+mo;setDaily(d=>({...d,claimed:true}));addLoks(bonus);gainXp(20);feedLilLok(15,"creation");blip("E5");hap([30,20,60]);say(`Day ${daily.streak} claimed · +${bonus} Loks`,"success");}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped · +5 Loks","success");if(id.startsWith("seed")){addLoks(5);pushNotif("Your flip got a vote · +5 Loks (creator)","success");}else{pushNotif("You voted · creator notified","success");}}} onLok={name=>{setFollowing(f=>f.includes(name)?f:[...f,name]);questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);blip("A4");hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in to bookmarks");}} say={say} moodFilter={moodFilter} setMoodFilter={setMoodFilter} moodTags={moodTags} reportedPosts={reportedPosts} onReport={id=>{setReportedPosts(r=>[...r,id]);patchPost(id,{hidden:true});say("Post hidden")}} onEcho={post=>{setPosts(ps=>[{id:"echo-"+Date.now(),title:"↻ "+post.title,frames:post.frames,paceMs:post.paceMs||160,mode:post.mode||"A",style:post.style||"bold",loop:post.loop,from:"studio",author:profile.name,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0}},...ps]);addLoks(2);say("Echoed! +2 Loks");}} flair={flair}/>}
          {tab==="gallery"&&<Profile posts={posts} profile={profile} setProfile={setProfile} wins={wins} lokPass={lokPass} kids={kids} cosmetics={cosmetics} owned={owned} onBuyCosmetic={(cat,item)=>{if(owned[cat]?.some(o=>o.id===item.id)){setCosmetics(c=>({...c,[cat]:item.id}));say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),{id:item.id,ts:Date.now()}]}));setCosmetics(c=>({...c,[cat]:item.id}));},`${item.name} unlocked`);}} level={level} xp={xp} quests={quests} following={following} lokdInCount={bookmarks.length} bookmarks={bookmarks} notifications={notifications} notifUnread={notifUnread} loks={loks} totalEarned={totalEarned} questsCompleted={questsCompleted} canInstall={!!installEvt} onInstall={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("Lok added to your home screen!","success");}catch{}setInstallEvt(null);}else{say("Open your browser menu → Install app / Add to Home Screen");}}} onClearNotifs={()=>setNotifUnread(0)} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onDelete={id=>setPosts(ps=>ps.filter(p=>p.id!==id))} onRename={(id,title)=>patchPost(id,{title})} say={say} onCheat={onCheat} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={()=>setSoundLab(true)} soundQueue={soundQueue} setSoundQueue={setSoundQueue} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} animatedToken={animatedToken} focusMode={focusMode} setFocusMode={setFocusMode} showSettings={showSettings} setShowSettings={setShowSettings} featureFlags={featureFlags} onSetFlag={(k,v)=>{setFeatureFlags(f=>({...f,[k]:v}));store.set("lok:flags",{...featureFlags,[k]:v});}} hapticGrammar={hapticGrammar} setHapticGrammar={setHapticGrammar} fourthWall={fourthWall} setFourthWall={setFourthWall} garden={garden} setGarden={setGarden} wordTwister={wordTwister} setWordTwister={setWordTwister} flair={flair} timeMachineIdx={timeMachineIdx} setTimeMachineIdx={setTimeMachineIdx} heatmapData={heatmapData} sessionPin={sessionPin} setSessionPin={setSessionPin} pinInput={pinInput} setPinInput={setPinInput} verified={verified} setVerified={setVerified} devTap={devTap} devTimer={devTimer} devMode={devMode} setDevMode={setDevMode} appLogo={appLogo} setAppLogo={setAppLogo} setPinUnlocked={setPinUnlocked} setLoks={setLoks} setTotalEarned={setTotalEarned} legacyStudio={legacyStudio} setLegacyStudio={setLegacyStudio}/>}
          {tab==="studio"&&<><div className="flex items-center gap-1.5 mb-1 overflow-x-auto pb-0.5">{stickers.map((s,i)=><button key={i} onClick={()=>setStickers(ss=>ss.filter((_,j)=>j!==i))} className="text-lg" title={`Remove ${s}`}>{s}</button>)}<button onClick={()=>{const emoS=["😎","🔥","🎨","💀","👾","✨","🌈","🍕","💎","🌸","🦋","🧠","⚡","🫶","🌟","🔮","🌀","💫","🦄","🍀","🎮","🖤","💚","💜","👑","🤖","👻","🎪","💥","🪐"];setStickers(ss=>{const pick=emoS[Math.floor(Math.random()*emoS.length)];return [...ss,pick];});say("Sticker added!");}} className="lok-btn shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{border:`1.5px solid ${T.ink}`}}>🎴 +sticker</button><span className="text-[10px] opacity-40 ml-auto">{stickers.length} stickers</span></div>
          {legacyStudio
            ? <Studio ownedTiers={ownedTiers} ccTier={ccTier} say={say} kids={kids} dailyPrompt={daily.prompt} animFx={animFx} modules={modules} legacyBrushes={legacyBrushes} setLegacyBrushes={setLegacyBrushes} onPublish={post=>{setPosts(ps=>[post,...ps]);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");}}/>
            : <NewStudioUI ownedTiers={ownedTiers} ccTier={ccTier} say={say} kids={kids} dailyPrompt={daily.prompt} animFx={animFx} modules={modules} legacyBrushes={legacyBrushes} setLegacyBrushes={setLegacyBrushes} onPublish={post=>{setPosts(ps=>[post,...ps]);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");}}/>}
          </>}
          {tab==="battle"&&<><div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
            <span className="lok-display font-extrabold text-sm" style={{color:battleRoyaleCount>=5?T.accent:T.ink}}>🔥 Battle Royale</span>
            <div className="flex items-center gap-1">{Array.from({length:5}).map((_,i)=>(<button key={i} onClick={()=>{setBattleRoyaleCount(c=>c+1);if(i===4){addLoks(30);say("Battle Royale hype! +30 Loks","success");}}} className="lok-btn w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center" style={{border:`2px solid ${i<battleRoyaleCount?T.accent:T.shadow}`,background:i<battleRoyaleCount?T.accent:"transparent",color:i<battleRoyaleCount?T.onAccent:T.ink}} aria-label={i<battleRoyaleCount?"Hype unlocked":"Add hype"}>{i<battleRoyaleCount?"🔥":"+"}</button>))}</div>
            {battleRoyaleCount>=5&&<span className="text-xs font-bold" style={{color:T.accent}}>READY!</span>}
          </div>
          <Battle ownedTiers={ownedTiers} ccTier={ccTier} wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok} say={say} blip={blip} hap={hap} animFx={animFx} onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")} onResult={(won,mult=1)=>{addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));}} onPublish={post=>setPosts(ps=>[post,...ps])}/></>}
          {tab==="front"&&<OpenFront kids={kids} loks={loks} dailyPrompt={daily.prompt} hinted={traceHinted} onHinted={()=>setTraceHinted(true)} onWager={amt=>{if(loks<amt)return false;setLoks(l=>l-amt);setTotalSpent(t=>t+amt);return true;}} onEarn={n=>{addLoks(n);questTick("front",Math.max(1,Math.round(n/5)));gainXp(n);setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-3)}));}} blip={blip} say={say}/>}
          {tab==="rooms"&&<Rooms profile={profile} userId={profile.name} myRooms={myRooms} setMyRooms={setMyRooms} pendingCode={pendingRoomCode} onPendingCodeUsed={()=>setPendingRoomCode(null)} onArtist={name=>setArtistView&&setArtistView(name)} say={say} blip={blip} hap={hap}/>}
          {tab==="shop"&&<Shop ccTier={ccTier} say={say} modules={modules} onBuyModule={m=>{if(modules.includes(m.id)){say("Already owned");return;}spend(m.price,()=>{setModules(o=>[...o,m.id]);blip("C6");},`${m.name} unlocked`);}} loks={loks} lokPass={lokPass} kids={kids} uiTheme={uiTheme} ownedThemes={ownedThemes} effect={effect} ownedEffects={ownedEffects} sky={sky} ownedSkies={ownedSkies} onSky={(id,s)=>{if(ownedSkies.includes(id)){setSky(id);say(`Equipped ${s.name}`);}else spend(s.price,()=>{setOwnedSkies(o=>[...o,id]);setSky(id);},`${s.name} unlocked`);}} animFx={animFx} ownedAnimFx={ownedAnimFx} onAnimFx={(id,f)=>{if(ownedAnimFx.includes(id)){setAnimFx(id);say(id==="none"?"FX off":`${f.name} equipped`);}else spend(f.price,()=>{setOwnedAnimFx(o=>[...o,id]);setAnimFx(id);},`${f.name} unlocked`);}} fontPack={fontPack} onFontPack={(id,f)=>spend(f.price,()=>{setOwned(o=>({...o,fontPack:[...(o.fontPack||[]),id]}));setFontPack(id);},`${f.name} set`)} cursorPack={cursorPack} onCursorPack={(id,c)=>spend(c.price,()=>{setOwned(o=>({...o,cursorPack:[...(o.cursorPack||[]),id]}));setCursorPack(id);},`${c.name} set`)} musicPack={musicPack} onMusicPack={(id,m)=>spend(m.price,()=>{setOwned(o=>({...o,musicPack:[...(o.musicPack||[]),id]}));setMusicPack(id);},`${m.name} set`)} stickerPack={stickerPack} onStickerPack={(id,s)=>spend(s.price,()=>{setOwned(o=>({...o,stickerPack:[...(o.stickerPack||[]),id]}));setStickerPack(id);},`${s.name} set`)} postExport={postExport} onPostExport={(id,e)=>spend(e.price,()=>{setOwned(o=>({...o,postExport:[...(o.postExport||[]),id]}));setPostExport(id);},`${e.name} set`)} mythicOwned={mythicOwned} mythicEquipped={mythicEquipped} dailyOwned={dailyOwned} weeklyOwned={weeklyOwned} onBuyMythic={(item,rotation)=>{if(rotation==="daily"||rotation==="weekly"){spend(item.price,()=>{rotation==="daily"?setDailyOwned(o=>[...o,item.id]):setWeeklyOwned(o=>[...o,item.id]);},`${item.name} unlocked`);}else{if(mythicOwned.includes(item.id)){setMythicEquipped(item.id);say(`Equipped ${item.name}`);}else spend(item.price,()=>{setMythicOwned(o=>[...o,item.id]);setMythicEquipped(item.id);setTimeout(()=>setCelebration(item.name),100);setTimeout(()=>setCelebration(null),3000);},`${item.name} unlocked`);}}} cosmetics={cosmetics} owned={owned} setKids={setKids} onBuyCosmetic={(cat,item)=>{if((owned[cat]||[]).includes(item.id)){setCosmetics(c=>({...c,[cat]:item.id}));blip("D5");say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),item.id]}));setCosmetics(c=>({...c,[cat]:item.id}));blip("C6");},`${item.name} unlocked`);}} onBuyPass={()=>{setLokPass(true);setOwnedThemes(Object.keys(THEMES));blip("C6");say("LokPass active!");}} onTheme={id=>{if(ownedThemes.includes(id)){setUiTheme(id);say(`Equipped ${THEMES[id].name}`);}else spend(THEMES[id].price,()=>{setOwnedThemes(o=>[...o,id]);setUiTheme(id);},`${THEMES[id].name} unlocked`);}} onEffect={(id,e)=>{if(ownedEffects.includes(id)){setEffect(id);say(id==="none"?"Effects off":`${e.name} equipped`);}else spend(e.price,()=>{setOwnedEffects(o=>[...o,id]);setEffect(id);},`${e.name} unlocked`);}} onCc={()=>spend(120,()=>setCcTier(true),"Studio Pro unlocked")} celebrationStyle={celebrationStyle} onCelebrationStyle={id=>setCelebrationStyle(id)}/>}
        </div>
      </main>
      {!focusMode && !lokPass&&!kids&&(<div className="fixed inset-x-0 z-40 flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-bold" data-ad-slot={ADS[adIdx].slot} data-ad-format="banner" style={{bottom:62,background:T.card,borderTop:`2px dashed ${T.ink}`,color:T.ink,opacity:adVisible?1:0,transition:"opacity .3s ease",pointerEvents:adVisible?"auto":"none"}}>
        {/* AdSense: replace inner span with <ins class="adsbygoogle"> at deploy; slot id in data-ad-slot */}
        <span className="opacity-70 truncate" key={adIdx} style={{animation:"lokrise .3s ease"}}>Ad · {ADS[adIdx].text}</span>
        <button onClick={()=>setTab("shop")} aria-label="Remove ads with LokPass" className="underline shrink-0" style={{color:T.accent}}>Remove with LokPass</button>
      </div>)}
      {!focusMode && <nav className="fixed bottom-0 inset-x-0 z-40 flex" style={{background:T.paper,borderTop:`3px solid ${T.ink}`,paddingBottom:"env(safe-area-inset-bottom)"}} role="navigation" aria-label="Main navigation">
        {[["feed",kids?"Home":"Feed",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],["gallery",kids?"You":"You",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],["studio","Studio",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg>],["battle",kids?"Draw":"Battle",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>],["front","Rush",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>],["rooms","Rooms",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>],["shop","Shop",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>]].map(([id,label,icon])=>{const on=tab===id;return(<button key={id} onClick={()=>setTab(id)} aria-label={`Go to ${label}`} aria-current={on?"page":undefined} className="lok-btn lok-display relative flex-1 py-2.5 text-xs font-bold flex flex-col items-center gap-0.5" style={{color:on?T.accent:T.ink,transition:"color .2s ease"}}>
          {on&&<span className="absolute left-1/2 rounded-full" style={{top:4,width:22,height:3,transform:"translateX(-50%)",background:T.accent}} aria-hidden="true"/>}
          <span style={{opacity:on?1:0.6}} aria-hidden="true">{icon}</span>
          <span style={{opacity:on?1:0.7,fontSize:10}}>{label}</span>
        </button>);})}
      </nav>}
      {!focusMode && !showLilLok&&(<div className="fixed z-40" style={{right:14,bottom:116, transition: 'bottom 0.3s ease'}}>
        {fabBubble&&<LilLokBubble text={fabBubble} ink={T.ink} paper={T.paper} voicePack={cosmetics.voicePack}/>}
        <button onClick={()=>{setShowLilLok(true);setFabBubble("");}} aria-label={`Open LilLok — ${lillok.name} is ${phase}`} className="lok-btn rounded-full flex items-center justify-center" style={{width:60,height:60,background:T.card,...(cosmetics.blotBorder&&cosmetics.blotBorder!=="none"?blotBorderStyle(cosmetics.blotBorder,T):{border:`3px solid ${phase==="critical"?T.accent:phase==="decaying"?"#8E93A8":phase==="stasis"?"#9A9286":T.accent}`,boxShadow:`3px 3px 0 ${T.shadow}`}),animation:phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite":"none"}}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={46} custom={customLilLok?.art} gear={cosmetics.gear} skin={cosmetics.lillokSkin} aura={cosmetics.lillokAura} pet={cosmetics.lillokPet}/>
          {phase!=="thriving"&&!kids&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full" aria-hidden="true" style={{background:phase==="critical"?"#C23B22":T.accent,border:`2px solid ${T.card}`}}/>}
          {evoStage>0&&<span className="absolute -bottom-1 -left-1 text-xs" style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,.3))"}} title={`Evolution stage ${evoStage}`}>{evoEmojis[evoStage]}</span>}
        </button>
      </div>)}
      {showLilLok&&<LilLokPanel lillok={lillok} phase={phase} kids={kids} custom={customLilLok} gear={cosmetics.gear} skin={cosmetics.lillokSkin} aura={cosmetics.lillokAura} pet={cosmetics.lillokPet} loks={loks} onFeed={feedLilLok} onFlask={()=>{if(loks<10){say("Need 10 Loks","error");return false;}setLoks(l=>l-10);setTotalSpent(t=>t+10);feedLilLok(40,"flask");say("Ink flask · −10 Loks","success");return true;}} onClose={()=>setShowLilLok(false)} say={say} setLillok={setLillok} onPublish={post=>{setPosts(ps=>[post,...ps]);say("Revival animation published","success");}} onSaveCustom={c=>{setCustomLilLok(c);setLillok(s=>({...s,name:c.name}));say(`${c.name} is now your LilLok`,"success");}}/>}
      {openIdx!==null&&posts[openIdx]&&(<Viewer posts={posts} index={openIdx} bookmarks={bookmarks} cosmetics={cosmetics} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in");}} onClose={()=>setOpenIdx(null)} onNav={d=>setOpenIdx(i=>Math.min(posts.length-1,Math.max(0,i+d)))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped");}} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);}} onViewed={id=>{const p=posts.find(x=>x.id===id);if(p.viewed)return;patchPost(id,{viewed:true,views:(p.views||0)+1});addLoks(3);gainXp(3);questTick("view");say("Full slide-through · +3 Loks");}} onShare={sharePost} onDelete={id=>{setPosts(ps=>ps.filter(p=>p.id!==id));setOpenIdx(null);say("Post deleted");}} onRename={(id,title)=>patchPost(id,{title})} myName={profile.name} onRemix={post=>{setPosts(ps=>[{id:"new-remix-"+Date.now(),title:"Remix: "+post.title,frames:[...post.frames],paceMs:post.paceMs||160,mode:post.mode||"A",style:post.style||"bold",loop:post.loop,from:"studio",votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0}},...ps]);setOpenIdx(null);setTab("gallery");say("Remix created — open in Studio");}}/>)}
      {showHint&&tab==="feed"&&(<button onClick={()=>setShowHint(false)} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss hint">Slide a post down to play it · ▲ to vote · tap to dismiss</button>)}
      {showOnboard&&<Onboard defaultName={profile.name} onName={n=>{const clean=(n||"").trim();if(!clean)return;if(isReservedName(clean)){const alt=suggestHandle(clean,profile.avatarSeed);say(`"${clean}" is a Lok artist — how about ${alt}?`,"error");setProfile(p=>({...p,name:alt}));return;}setProfile(p=>({...p,name:clean}));}} onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      {comebackCelebration&&(()=>{const styles={confetti:{},inkbloom:{},starburst:{}};const cs=styles[comebackCelebration]||styles.confetti;const colors=[T.accent,T.alt,"#E8B14B","#FF5DA2","#2FA9A0","#fff"];return(<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.2)",animation:"lokrise .3s ease",pointerEvents:"auto"}} onClick={()=>{setComebackCelebration(null);setLoks(l=>l+25);setTotalEarned(t=>t+25);say("+25 Loks for coming back!","success");}}>
        <div className="text-center pointer-events-none" style={{animation:"lokfloat 1.5s ease-in-out infinite"}}>
          <div className="lok-display text-5xl font-extrabold" style={{color:"#fff",textShadow:`0 0 40px ${T.accent}, 0 0 80px ${T.accent}55, 0 4px 8px rgba(0,0,0,0.5)`}}>💎 +1000 Loks!</div>
          <div className="mt-2 lok-display text-xl font-extrabold" style={{color:T.paper,textShadow:"0 2px 8px rgba(0,0,0,0.6)"}}>You took a real break!</div>
          <div className="mt-4 px-4 py-2 rounded-xl inline-block pointer-events-auto" style={{background:T.ink,color:T.paper,border:"3px solid #fff",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setComebackCelebration(null);setLoks(l=>l+25);setTotalEarned(t=>t+25);const ls=Object.values(LILLOK_SPEECH.comeback_award);say(ls[Math.floor(Math.random()*ls.length)]+" +25 Loks!","success");}}>☁️ Click for +25 Loks!</div>
          <div className="flex justify-center gap-2 mt-4">{Array.from({length:comebackCelebration==="starburst"?20:comebackCelebration==="confetti"?16:12}).map((_,i)=>(<div key={i} className="rounded-full" style={{width:6+(i%3)*2,height:6+(i%3)*2,background:colors[i%colors.length],animation:`lokfloat ${0.5+Math.random()*0.8}s ease-in-out ${i*0.05}s infinite`,opacity:0.7+Math.random()*0.3}}/>))}</div>
        </div>
      </div>);})()}
      {showOnboard&&<Onboard defaultName={profile.name} onName={n=>{const clean=(n||"").trim();if(!clean)return;if(isReservedName(clean)){const alt=suggestHandle(clean,profile.avatarSeed);say(`"${clean}" is a Lok artist — how about ${alt}?`,"error");setProfile(p=>({...p,name:alt}));return;}setProfile(p=>({...p,name:clean}));}} onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      <div className="fixed left-1/2 z-50 flex flex-col-reverse items-center gap-2" style={{bottom:focusMode?20:100,transform:"translateX(-50%)",pointerEvents:"none",transition:"bottom .3s ease"}}>
        {toasts.map((t,i)=>(<div key={t.id} className="px-4 py-2 rounded-xl font-bold text-center" style={{background:t.type==="success"?T.alt:t.type==="error"?"#C23B22":T.ink,color:T.paper,border:`2.5px solid ${t.type==="success"?T.alt:T.accent}`,animation:"lokrise .2s ease",opacity:1-i*0.18,transform:`scale(${1-i*0.04}) translateY(${i*-4}px)`,maxWidth:"88vw",fontSize:13}}>{t.msg}</div>))}
      </div>
    </div>
  </ThemeCtx.Provider>);
}

function Loader(){
  const logoRef=useRef(null);const pos=useRef({x:0,y:0,px:0,py:0,vx:0,vy:0,down:false});
  useEffect(()=>{const el=logoRef.current;if(!el)return;
    const onMove=e=>{pos.current.x=e.clientX;pos.current.y=e.clientY;};
    const onDown=()=>{pos.current.down=true;};const onUp=()=>{pos.current.down=false;};
    window.addEventListener("pointermove",onMove);window.addEventListener("pointerdown",onDown);window.addEventListener("pointerup",onUp);
    let frame;const tick=()=>{
      const {x,y,px,py,vx,vy,down}=pos.current;const rect=el.getBoundingClientRect();
      const targetX=x-rect.left-rect.width/2;const targetY=y-rect.top-rect.height/2;
      const ax=(targetX-px)*0.15;const ay=(targetY-py)*0.15;
      pos.current.vx=(vx+ax)*0.86;pos.current.vy=(vy+ay)*0.86;
      pos.current.px+=pos.current.vx;pos.current.py+=pos.current.vy;
      el.style.transform=`perspective(500px) rotateY(${pos.current.px/24}deg) rotateX(${-pos.current.py/24}deg) scale(${down?0.9:1})`;
      frame=requestAnimationFrame(tick);
    };
    tick();
    return()=>{window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerdown",onDown);window.removeEventListener("pointerup",onUp);cancelAnimationFrame(frame);};
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
  </div>);
}
