import { useState, useEffect, useRef } from "react";
import { useT } from "../theme/theme.js";
import Easel from "../Easel.jsx";
import InterventionFX from "../InterventionFX.jsx";
import { getModuleLayers, hasModule, FORMATS, PROMPTS, KID_PROMPTS, INTERVENTIONS, lokApi } from "../constants.jsx";
import { renderDoodle } from "../engine/draw.jsx";
import { makeMatchBots, botProgress, botFinalT, botLine, judgeBattle, recordBattle } from "../engine/bots.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Battle({modules=[],wins,bigBattleOwned,kids,phase,lillok,customLilLok,onResult,onUnlockBig,onPublish,onLine,blip,hap,say,profile}){
  const T=useT();
  const[pstate,setPstate]=useState("lobby");const[format,setFormat]=useState(FORMATS[0]);const[duration,setDuration]=useState(60);const[tier,setTier]=useState(getModuleLayers(modules));const[prompt,setPrompt]=useState(PROMPTS[0]);const[count,setCount]=useState(3);const[timeLeft,setTimeLeft]=useState(0);const[bots,setBots]=useState([]);const[botThumbs,setBotThumbs]=useState([]);const[entries,setEntries]=useState([]);const[results,setResults]=useState(null);const[shake,setShake]=useState(false);const[splat,setSplat]=useState(null);const[block,setBlock]=useState(null);const[blocked,setBlocked]=useState(0);const[myArt,setMyArt]=useState(null);const[bFrames,setBFrames]=useState([]);const[featured,setFeatured]=useState(false);
  const easel=useRef(null);const strokes=useRef(0);const tickRef=useRef(null);const matchT=useRef(0);
  const[lbOpen,setLbOpen]=useState(false);const[lbData,setLbData]=useState([]);const[lbLoading,setLbLoading]=useState(false);
  const openLeaderboard=async()=>{setLbOpen(true);setLbLoading(true);const now=new Date();const day=now.getDay();const diff=now.getDate()-day+(day===0?-6:1);const monday=new Date(now.setDate(diff)).toISOString().slice(0,10);const data=await lokApi.fetchLeaderboard(monday);setLbData(data);setLbLoading(false);};
  const promptPool=kids?KID_PROMPTS:PROMPTS;const bigUnlocked=bigBattleOwned||wins>=1;
  const startMatch=()=>{const n=format.players-1;const nb=makeMatchBots(n,{kids,wins});setBots(nb);setBotThumbs(nb.map(b=>renderDoodle(b.seed,0)));setPrompt(promptPool[Math.floor(Math.random()*promptPool.length)]);strokes.current=0;setResults(null);setBlocked(0);setMyArt(null);setBFrames([]);setCount(3);setPstate("count");};
  const captureBattle=()=>{if(!easel.current)return;if(bFrames.length>=14){say("Max 14 pages");return;}const url=easel.current.composite(bFrames.length);setBFrames(f=>[...f,url]);blip&&blip("D5");say(`Page ${bFrames.length+1} captured`);};
  useEffect(()=>{if(pstate!=="count")return;if(count===0){setTimeLeft(duration);matchT.current=0;setPstate("draw");onLine&&onLine("battle_start");return;}const t=setTimeout(()=>setCount(c=>c-1),800);return()=>clearTimeout(t);},[pstate,count,duration]);
  useEffect(()=>{if(pstate!=="draw")return;tickRef.current=setInterval(()=>{matchT.current+=1;setTimeLeft(t=>Math.max(0,t-1));if(matchT.current%2===0)setBotThumbs(bots.map(b=>renderDoodle(b.seed,botProgress(b,matchT.current/duration))));if(!kids&&matchT.current===5&&bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"start");if(l)say(l);}if(!kids&&matchT.current===Math.floor(duration*0.6)&&bots.length){const l=botLine(bots[Math.floor(Math.random()*bots.length)],"mid");if(l)say(l);}if(!kids&&matchT.current>3&&matchT.current%(phase==="stasis"?4:7)===0)fireIntervention();},1000);return()=>clearInterval(tickRef.current);},[pstate,bots,duration,kids,phase]);
  const fireIntervention=()=>{const decay=phase==="decaying";const kind=INTERVENTIONS[Math.floor(Math.random()*INTERVENTIONS.length)];const id=Math.random();setBlock({id,kind});setTimeout(()=>{setBlock(b=>{if(b&&b.id===id){if(kind==="shake"){setShake(true);setTimeout(()=>setShake(false),900);}else{setSplat({k:kind,seed:Math.floor(Math.random()*9999)});setTimeout(()=>setSplat(null),1500);}if(decay)say(`${lillok.name} fumbled!`);else if(bots.length)say(`${bots[Math.floor(Math.random()*bots.length)].name} hit you with a ${kind}!`);return null;}return b;});},1400);};
  const doBlock=()=>{if(!block)return;setBlocked(b=>b+1);setBlock(null);blip&&blip("G5");hap&&hap([100,50,100]);say(phase==="thriving"?`${lillok.name} deflected it!`:"Blocked!");};
  useEffect(()=>{if(pstate==="draw"&&timeLeft===0){clearInterval(tickRef.current);setBlock(null);setSplat(null);setShake(false);const final=easel.current?easel.current.composite():renderDoodle(1,0);const allFrames=[...bFrames,final];setBFrames(allFrames);setMyArt(final);if(format.coop||kids){setPstate("done");onResult({won:true,mult:featured?3:1,prompt,format:format.id,pages:bFrames.length,strokes:strokes.current,blocked});return;}setEntries([{name:"You",art:final,isMe:true},...bots.map(b=>({name:b.name,art:renderDoodle(b.seed,botFinalT(b)),isMe:false}))]);setPstate("vote");}},[timeLeft,pstate]);
  const castVotes=pickIdx=>{const{tally,winnerIdx:wi,won}=judgeBattle(entries,bots,pickIdx,{strokes:strokes.current,blocked,pages:bFrames.length,phase,wins});recordBattle(won);onResult({won,mult:featured?3:1,prompt,format:format.id,pages:bFrames.length,strokes:strokes.current,blocked});onLine&&onLine(won?"win":"loss");const speaker=won?bots[Math.floor(Math.random()*bots.length)]:bots[wi-1];const l=speaker&&botLine(speaker,won?"lose":"win");if(l)setTimeout(()=>say(l),900);setResults({tally,winnerIdx:wi,won});setPstate("results");};
  const publishMine=()=>{const fr=bFrames.length>=2?bFrames:[myArt];onPublish({id:"b"+Date.now(),title:`"${prompt}" — battle`,frames:fr,paceMs:220,mode:"A",style:"bold",loop:fr.length>=2,votes:results?.won?1:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0,humhah:0,bomhogwah:0},echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null,from:"battle"});say(fr.length>=2?"Battle animation published":"Battle piece published");};
  if(pstate==="lobby")return(<><div className="mt-4">
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
    <button onClick={openLeaderboard} className="lok-btn mt-2 w-full py-2.5 rounded-xl text-sm font-bold" style={{border:`2.5px dashed ${T.ink}`,color:T.ink}}>🏆 Leaderboard</button>
  </div>
  {lbOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,.45)"}} onClick={e=>e.target===e.currentTarget&&setLbOpen(false)}>
    <div className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden" style={{background:T.paper,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${T.ink}`}}>
      <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:`2px solid ${T.ink}`}}>
        <h3 className="lok-display font-extrabold text-lg">🏆 Leaderboard</h3>
        <button onClick={()=>setLbOpen(false)} className="lok-btn w-8 h-8 rounded-full font-bold flex items-center justify-center" style={{border:`2.5px solid ${T.ink}`}}>✕</button>
      </div>
      <div className="max-h-96 overflow-y-auto p-3">
        {lbLoading?<div className="text-center py-6 text-sm opacity-50">Loading…</div>:
         !lbData.length?<div className="text-center py-6 text-sm opacity-50">No battles this week yet</div>:
         lbData.map((e,i)=>(<div key={e.author} className="flex items-center gap-3 py-2 px-2 rounded-xl" style={{background:e.author===profile?.name?T.alt:T.card,marginBottom:4}}>
           <span className="lok-display font-extrabold w-6 text-center shrink-0">{i+1}</span>
           <div className="font-bold flex-1 truncate">{e.author}{e.author===profile?.name&&<span className="text-xs ml-1 opacity-60">(you)</span>}</div>
           <div className="text-xs opacity-70 shrink-0">{e.wins}/{e.battles}</div>
           <div className="lok-display font-extrabold shrink-0">{e.score}</div>
         </div>))}
      </div>
    </div>
  </div>}
</>);
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

export default Battle;
