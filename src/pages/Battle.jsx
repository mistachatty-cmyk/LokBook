import { useState, useRef, useEffect } from "react";
import { useT, ART } from "../theme/theme.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { supabase } from "../supabaseClient.js";
import Easel from "../Easel.jsx";
import InterventionFX from "../InterventionFX.jsx";
import { renderDoodle } from "../engine/draw.jsx";
import { renderPromptArt } from "../engine/promptArt.js";
import { makeMatchBots, botProgress, botMomentum, botFinalT, judgeBattle, recordBattle, botLine, pickMidLine, BOT_TYPES } from "../engine/bots.js";
import { findOrCreateDuel, fetchDuel, cancelWaitingDuel, submitDuelArt, finalizeDuel } from "../engine/duels.js";
import { PROMPTS, PROMPT_META, CATEGORIES, MOTION_TYPES, CATEGORY_ICONS, FORMATS, KID_PROMPTS, INTERVENTIONS } from "../constants.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Battle({ownedTiers,ccTier,wins,bigBattleOwned,kids,phase,lillok,customLilLok,onResult,onUnlockBig,onPublish,onLine,blip,hap,say,animFx,authorName,modules=[],paper="plain",cursorPack="default",bloomEnabled=true,bloomIntroSeen=false,onBloomIntroSeen,grainIntroSeen=false,onGrainIntroSeen}){
  const onBloom=()=>{if(bloomEnabled&&!bloomIntroSeen){say("✨ Bright colors now glow when you capture a page — try a neon or sparkle stroke");onBloomIntroSeen&&onBloomIntroSeen();}};
  const T=useT();
  const[pstate,setPstate]=useState("lobby");const[format,setFormat]=useState(FORMATS[0]);const[duration,setDuration]=useState(60);const[tier,setTier]=useState(10);const[prompt,setPrompt]=useState(PROMPTS[0]);const[count,setCount]=useState(3);const[timeLeft,setTimeLeft]=useState(0);const[bots,setBots]=useState([]);const[botThumbs,setBotThumbs]=useState([]);const[entries,setEntries]=useState([]);const[results,setResults]=useState(null);const[shake,setShake]=useState(false);const[splat,setSplat]=useState(null);const[block,setBlock]=useState(null);const[blocked,setBlocked]=useState(0);const[myArt,setMyArt]=useState(null);const[bFrames,setBFrames]=useState([]);const[featured,setFeatured]=useState(false);const[botType,setBotType]=useState("artist");
  const[promptFilters,setPromptFilters]=useState({category:null,motion:null});const[promptFiltersOpen,setPromptFiltersOpen]=useState(false);
  const easel=useRef(null);const strokes=useRef(0);const tickRef=useRef(null);const matchT=useRef(0);
  const auth=useAuth();const[duel,setDuel]=useState(null);const[duelTimeLeft,setDuelTimeLeft]=useState(60);const isPlayer1Ref=useRef(true);const duelPromptRef=useRef("");
  const filtered=PROMPT_META.filter(p=>{
    if(promptFilters.category&&p.category!==promptFilters.category)return false;
    if(promptFilters.motion&&p.motion!==promptFilters.motion)return false;
    return true;
  }).map(p=>p.text);
  const promptPool=kids?KID_PROMPTS:filtered.length>0?filtered:PROMPTS;const bigUnlocked=bigBattleOwned||wins>=1;
  const botArtOf=(b,t)=>b.type==="crecre"?renderDoodle(b.seed,t):renderPromptArt(prompt,b.seed,t,b.skill,b.name);
  const startMatch=()=>{const n=format.players-1;const nb=makeMatchBots(n,{kids,wins,botType});setBots(nb);const p=promptPool[Math.floor(Math.random()*promptPool.length)];setPrompt(p);setBotThumbs(nb.map(b=>b.type==="crecre"?renderDoodle(b.seed,0):renderPromptArt(p,b.seed,0,b.skill)));strokes.current=0;setResults(null);setBlocked(0);setMyArt(null);setBFrames([]);setCount(3);setPstate("count");};
  const startDuelSearch=async()=>{
    if(!supabase){say("Cloud accounts aren't configured for this build yet","error");return;}
    if(!auth.isAuthenticated()){say("Sign in first — Settings ⚙️ on the You tab","error");return;}
    setDuel(null);setResults(null);setMyArt(null);setPstate("duel_search");
    const p=promptPool[Math.floor(Math.random()*promptPool.length)];
    try{
      const{duel:d,isPlayer1}=await findOrCreateDuel(auth.getUserId(),authorName||"artist",p);
      isPlayer1Ref.current=isPlayer1;duelPromptRef.current=d.prompt;setPrompt(d.prompt);setDuel(d);
      if(!isPlayer1){setDuelTimeLeft(60);setPstate("duel_draw");}
    }catch{say("Couldn't reach matchmaking — try again","error");setPstate("lobby");}
  };
  const cancelDuelSearch=async()=>{if(duel)await cancelWaitingDuel(duel.id);setDuel(null);setPstate("lobby");};
  const submitDuelNow=async()=>{if(!easel.current||!duel)return;const url=easel.current.composite(undefined,{bloom:bloomEnabled});setMyArt(url);await submitDuelArt(duel.id,isPlayer1Ref.current,url);setPstate("duel_wait");onBloom();};
  useEffect(()=>{if(pstate!=="duel_search"&&pstate!=="duel_wait"||!duel)return;
    const iv=setInterval(async()=>{
      const fresh=await fetchDuel(duel.id);if(!fresh)return;
      if(pstate==="duel_search"&&fresh.status==="active"){setDuel(fresh);setDuelTimeLeft(60);setPstate("duel_draw");return;}
      if(pstate==="duel_wait"){const oppSub=isPlayer1Ref.current?fresh.submission2:fresh.submission1;if(oppSub){const final=await finalizeDuel(fresh);setDuel(final);const won=(isPlayer1Ref.current&&final.winner==="player1")||(!isPlayer1Ref.current&&final.winner==="player2");onResult(won,featured?3:1);setPstate("duel_done");}}
    },2500);
    return()=>clearInterval(iv);
  },[pstate,duel?.id]);
  useEffect(()=>{if(pstate!=="duel_draw")return;const t=setInterval(()=>setDuelTimeLeft(x=>Math.max(0,x-1)),1000);return()=>clearInterval(t);},[pstate]);
  useEffect(()=>{if(pstate==="duel_draw"&&duelTimeLeft===0)submitDuelNow();},[duelTimeLeft,pstate]);
  const captureBattle=()=>{if(!easel.current)return;if(bFrames.length>=14){say("Max 14 pages");return;}const url=easel.current.composite(bFrames.length,{bloom:bloomEnabled});setBFrames(f=>[...f,url]);blip&&blip("D5");say(`Page ${bFrames.length+1} captured`);onBloom();};
  useEffect(()=>{if(pstate!=="count")return;if(count===0){setTimeLeft(duration);matchT.current=0;setPstate("draw");onLine&&onLine("battle_start");if(bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"start");if(l)setTimeout(()=>say(l),400);}return;}const t=setTimeout(()=>setCount(c=>c-1),800);return()=>clearTimeout(t);},[pstate,count,duration]);
  useEffect(()=>{if(pstate!=="draw")return;tickRef.current=setInterval(()=>{matchT.current+=1;setTimeLeft(t=>Math.max(0,t-1));const frac=matchT.current/duration;if(matchT.current%2===0){const pressure=Math.min(1,strokes.current/40)-botProgress(bots[0],frac);setBotThumbs(bots.map(b=>botArtOf(b,botMomentum(b,frac,pressure))));}if(!kids&&matchT.current>2&&matchT.current%4===0){const line=pickMidLine(frac);if(line)say(line);}if(!kids&&matchT.current>3&&matchT.current%7===0)fireIntervention();},1000);return()=>clearInterval(tickRef.current);},[pstate,bots,duration,kids,phase]);
  const fireIntervention=()=>{const decay=phase==="decaying";const kind=INTERVENTIONS[Math.floor(Math.random()*INTERVENTIONS.length)];const id=Math.random();setBlock({id,kind});setTimeout(()=>{setBlock(b=>{if(b&&b.id===id){if(kind==="shake"){setShake(true);setTimeout(()=>setShake(false),900);}else{setSplat({k:kind,seed:Math.floor(Math.random()*9999)});setTimeout(()=>setSplat(null),1500);}if(decay)say(`${lillok.name} fumbled!`);return null;}return b;});},1400);};
  const doBlock=()=>{if(!block)return;setBlocked(b=>b+1);setBlock(null);blip&&blip("G5");hap&&hap([100,50,100]);say(phase==="thriving"?`${lillok.name} deflected it!`:"Blocked!");};
  useEffect(()=>{if(pstate==="draw"&&timeLeft===0){clearInterval(tickRef.current);setBlock(null);setSplat(null);setShake(false);const final=easel.current?easel.current.composite():renderDoodle(1,0);const allFrames=[...bFrames,final];setBFrames(allFrames);setMyArt(final);if(format.coop||kids){setPstate("done");onResult(true,featured?3:1);return;}setEntries([{name:"You",art:final,isMe:true},...bots.map(b=>({name:b.name,art:botArtOf(b,botFinalT(b)),isMe:false}))]);setPstate("vote");}},[timeLeft,pstate]);
  const castVotes=pickIdx=>{const{tally,winnerIdx:wi,won}=judgeBattle(entries,bots,pickIdx,{strokes:strokes.current,blocked,pages:bFrames.length,phase,wins});recordBattle(won);onResult(won,featured?3:1);onLine&&onLine(won?"win":"loss");const speaker=bots[Math.floor(Math.random()*bots.length)];const l=speaker&&botLine(speaker,won?"lose":"win");if(l)setTimeout(()=>say(l),900);setResults({tally,winnerIdx:wi,won});setPstate("results");};
  const publishMine=()=>{const fr=bFrames.length>=2?bFrames:[myArt];onPublish({id:"b"+Date.now(),title:`"${prompt}" — battle`,frames:fr,paceMs:220,mode:"A",style:"bold",loop:fr.length>=2,votes:results?.won?1:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"battle",author:authorName});say(fr.length>=2?"Battle animation published":"Battle piece published");};
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
    <button onClick={()=>setPromptFiltersOpen(v=>!v)} aria-expanded={promptFiltersOpen} className="lok-btn mt-3 w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold" style={{border:`2px solid ${promptFilters.category||promptFilters.motion?T.accent:T.shadow}`,background:T.card,color:T.ink}}>
      <span className="flex items-center gap-1.5"><span className="uppercase tracking-widest opacity-60" style={{fontSize:10}}>Prompt filters</span>{(promptFilters.category||promptFilters.motion)&&<span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold" style={{background:T.ink,color:T.paper}}>{[promptFilters.category&&(CATEGORY_ICONS[promptFilters.category]||"🎨")+" "+promptFilters.category,promptFilters.motion&&(promptFilters.motion==="static"?"■ Static":promptFilters.motion==="loop"?"⟳ Loop":"→ Transform")].filter(Boolean).join(" · ")}</span>}</span>
      <span aria-hidden="true" style={{transform:promptFiltersOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
    </button>
    {promptFiltersOpen&&(<div className="mt-1.5 p-2 rounded-xl" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={()=>setPromptFilters(f=>({...f,category:null}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${!promptFilters.category?T.accent:T.shadow}`,background:!promptFilters.category?T.ink:T.card,color:!promptFilters.category?T.paper:T.ink}}>All cats</button>
        {CATEGORIES.map(c=>(<button key={c} onClick={()=>setPromptFilters(f=>({...f,category:f.category===c?null:c}))} className="lok-btn shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${promptFilters.category===c?T.accent:T.shadow}`,background:promptFilters.category===c?T.ink:T.card,color:promptFilters.category===c?T.paper:T.ink}}>{CATEGORY_ICONS[c]||"🎨"}{c}</button>))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button onClick={()=>setPromptFilters(f=>({...f,motion:null}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${!promptFilters.motion?T.accent:T.shadow}`,background:!promptFilters.motion?T.ink:T.card,color:!promptFilters.motion?T.paper:T.ink}}>All motion</button>
        {MOTION_TYPES.map(m=>(<button key={m} onClick={()=>setPromptFilters(f=>({...f,motion:f.motion===m?null:m}))} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${promptFilters.motion===m?T.accent:T.shadow}`,background:promptFilters.motion===m?T.ink:T.card,color:promptFilters.motion===m?T.paper:T.ink}}>{m==="static"?"■ Static":m==="loop"?"⟳ Loop":"→ Transform"}</button>))}
      </div>
    </div>)}
    <div className="mt-3 text-xs font-bold uppercase tracking-widest opacity-60">Clock</div>
    <div className="mt-1.5 flex gap-2">{[30,60,90].map(s=>(<button key={s} onClick={()=>setDuration(s)} className="lok-btn flex-1 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:duration===s?T.accent:T.card,color:duration===s?T.onAccent:T.ink}}>{s}s</button>))}</div>
    <button onClick={startMatch} className="lok-btn lok-display mt-4 w-full py-3.5 rounded-xl text-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`5px 5px 0 ${T.ink}`,animation:reduceMotion?"none":"lokpulse 2.4s ease-in-out infinite"}}>{kids?"Start drawing!":"Find a match"}</button>
    {!kids&&<button onClick={startDuelSearch} aria-label="Play against a real artist, beta" className="lok-btn lok-display mt-2 w-full py-3 rounded-xl text-sm font-extrabold" style={{background:T.card,color:T.ink,border:`3px dashed ${T.accent}`}}>🌐 Real opponent (beta) — {duration}s draw-off</button>}
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
      <Easel ref={easel} maxLayers={tier} ccTier={ccTier} modules={modules} paper={paper} cursorPack={cursorPack} onStroke={()=>(strokes.current+=1)} animFx={animFx} say={say} grainIntroSeen={grainIntroSeen} onGrainIntroSeen={onGrainIntroSeen}/>
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
  if(pstate==="duel_search")return(<div className="mt-12 text-center">
    <div className="lok-display text-xl font-extrabold" style={{animation:reduceMotion?"none":"lokpulse 1.4s ease-in-out infinite"}}>🌐 Finding an opponent…</div>
    <p className="text-sm opacity-70 mt-2">Prompt: "{prompt}"</p>
    <p className="text-xs opacity-50 mt-1">Matching you with another real artist. Hang tight.</p>
    <button onClick={cancelDuelSearch} className="lok-btn mt-6 px-4 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink}}>Cancel</button>
  </div>);
  if(pstate==="duel_draw")return(<div className="mt-3">
    <div className="flex items-center justify-between">
      <div className="min-w-0"><div className="text-xs font-bold uppercase tracking-widest opacity-60">Real opponent · Prompt</div><div className="lok-display font-extrabold leading-tight truncate">"{prompt}"</div></div>
      <div className="lok-display text-2xl font-extrabold px-3 py-1 rounded-xl shrink-0" style={{background:duelTimeLeft<=10?T.accent:T.ink,color:duelTimeLeft<=10?T.onAccent:T.paper,animation:duelTimeLeft<=10&&duelTimeLeft>0&&!reduceMotion?"lokpulse .6s ease-in-out infinite":"none"}}>{duelTimeLeft}s</div>
    </div>
    <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${(duelTimeLeft/60)*100}%`,height:"100%",background:T.accent,transition:"width 1s linear"}}/></div>
    <div className="mt-2"><Easel ref={easel} maxLayers={1} ccTier={ccTier} modules={modules} paper={paper} cursorPack={cursorPack} onStroke={()=>(strokes.current+=1)} animFx={animFx} say={say} grainIntroSeen={grainIntroSeen} onGrainIntroSeen={onGrainIntroSeen}/></div>
    <button onClick={submitDuelNow} className="lok-btn lok-display mt-2 w-full py-3 rounded-xl text-lg font-extrabold" style={{background:T.ink,color:T.paper,boxShadow:`3px 3px 0 ${T.accent}`}}>Submit now</button>
  </div>);
  if(pstate==="duel_wait")return(<div className="mt-12 text-center">
    {myArt&&<img src={myArt} alt="your submission" className="mx-auto rounded-xl" style={{width:160,border:`3px solid ${T.ink}`}}/>}
    <div className="lok-display text-lg font-extrabold mt-4" style={{animation:reduceMotion?"none":"lokpulse 1.4s ease-in-out infinite"}}>Waiting for your opponent…</div>
    <p className="text-xs opacity-50 mt-1">You're both drawing "{prompt}" — results appear the moment they submit.</p>
  </div>);
  if(pstate==="duel_done"&&duel){
    const won=(isPlayer1Ref.current&&duel.winner==="player1")||(!isPlayer1Ref.current&&duel.winner==="player2");
    const tie=duel.winner==="tie";
    const mySub=isPlayer1Ref.current?duel.submission1:duel.submission2;const oppSub=isPlayer1Ref.current?duel.submission2:duel.submission1;
    const myScore=isPlayer1Ref.current?duel.score1:duel.score2;const oppScore=isPlayer1Ref.current?duel.score2:duel.score1;
    const oppName=isPlayer1Ref.current?duel.player2_name:duel.player1_name;
    return(<div className="mt-4">
      <div className="text-center" style={{animation:"lokpop .5s cubic-bezier(.34,1.56,.64,1)"}}><div className="lok-display text-3xl font-extrabold" style={{color:won?T.accent:T.ink}}>{tie?"It's a tie!":won?"You took it! 🏆":`${oppName} takes it`}</div></div>
      <p className="text-center text-sm opacity-70 mt-1">"{prompt}"</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl overflow-hidden" style={{border:`3px solid ${!tie&&won?T.accent:T.ink}`,background:T.card}}><img src={mySub} alt="you" className="w-full block" style={{aspectRatio:"4/5",objectFit:"cover"}}/><div className="px-2 py-1.5 font-bold text-sm flex justify-between"><span>You</span><span style={{color:T.accent}}>{myScore}</span></div></div>
        <div className="rounded-2xl overflow-hidden" style={{border:`3px solid ${!tie&&!won?T.accent:T.ink}`,background:T.card}}><img src={oppSub} alt={oppName} className="w-full block" style={{aspectRatio:"4/5",objectFit:"cover"}}/><div className="px-2 py-1.5 font-bold text-sm flex justify-between"><span className="truncate">{oppName}</span><span style={{color:T.accent}}>{oppScore}</span></div></div>
      </div>
      <div className="mt-4 flex gap-2"><button onClick={publishMine} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper}}>Publish</button><button onClick={startDuelSearch} className="lok-btn lok-display flex-1 py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Rematch</button></div>
      <button onClick={()=>setPstate("lobby")} className="mt-2 w-full py-2 text-sm font-bold underline opacity-70">Back to lobby</button>
    </div>);
  }
  return null;
}
