import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useT, ART } from "../theme/theme.js";
import NameTag from "../NameTag.jsx";
import { ReactionIcon, FramedAvatar } from "../art.jsx";
import EmptyState from "../EmptyState.jsx";
import LilLokPanel, { LilLokBubble, LilLokSprite } from "../LilLok.jsx";
import { renderAvatar, renderSequence, renderDoodle, traceShape } from "../engine/draw.jsx";
import * as auth from "../auth/auth.js";
import { W, H, GAME_MANUAL_PAGES, BADGES, BADGE_CATEGORIES, PROMPTS, KID_PROMPTS, MODES, FRONT_NAMES, WAGERS, INTERVENTIONS, makeQuests, LILLOK_GEAR, blotBorderStyle, WEEKLY_PROMPT, PACE_PRESETS } from "../constants.jsx";
import { encodeGIF } from "../engine/gif.js";
import { makeRushRivals, rushScore, recordRush } from "../engine/bots.js";
import { isReservedName } from "../identity.js";
import { lokApi, fromDbPost } from "../constants.jsx";

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
  async remove(k) {
    mem.delete(k);
    try { if (typeof window !== "undefined" && window.storage) localStorage.removeItem(k); } catch {}
  },
};
const SAVE_KEY = "lok:save:v2";

function Onboard({onDone,onName,defaultName=""}){
  const T=useT();const[step,setStep]=useState(0);const[name,setName]=useState(defaultName);
  const steps=[{t:"Welcome to LokBook",d:"A home for tiny hand-drawn animations. Slide down any post to flip through its pages."},{t:"Meet moss.ink",d:"The first artist you'll see in the feed — study their loops, then tap any artist's name to visit their page. Lok artists to follow them; vote and bookmark what you love."},{t:"It's a living feed",d:"Everyone here shares one Discover feed — publish a flip and the whole room sees it. Resident artists post fresh work daily too."},{t:"Draw, battle, earn",d:"Make flips in Studio, go head-to-head in Battle, grab prompts in Rush. Turn on sound 🎵 for best experience."},{t:"Meet your LilLok",d:"A living-ink buddy that grows with you. Feed it ink, and it helps you in battles."},{t:"Make it yours",d:"This is your artist name — keep it or change it. No sign-in needed to play; when you're ready, back everything up in You → ⚙. Here are 50 Loks to begin."}];
  const s=steps[step];const last=step===steps.length-1;
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.55)"}}>
    <div className="w-full rounded-3xl p-6 text-center" style={{maxWidth:420,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${T.accent}`,animation:"lokrise .3s ease"}}>
      <div className="lok-display text-2xl font-extrabold mb-2" style={{color:T.accent}}>{s.t}</div>
      <p className="text-sm leading-snug">{s.d}</p>
      {last&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your artist name" aria-label="Artist name" className="mt-3 w-full px-4 py-2.5 rounded-xl text-center font-bold text-sm" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}} onKeyDown={e=>{if(e.key==="Enter"){onName&&onName(name);onDone();}}}/>}
      <div className="flex justify-center gap-1.5 my-4">{steps.map((_,i)=>(<div key={i} style={{width:i===step?22:8,height:6,borderRadius:4,background:i<=step?T.accent:T.shadow,transition:"width .2s"}}/>))}</div>
      <button onClick={()=>{if(last){onName&&onName(name);onDone();}else setStep(step+1);}} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>{last?"Claim 50 Loks & start":"Next"}</button>
      {!last&&<button onClick={onDone} className="mt-2 text-xs font-bold underline opacity-60">skip</button>}
    </div>
  </div>);
}

export function OpenFront({kids,loks,dailyPrompt,onWager,onEarn,hinted,onHinted,blip,say}){
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
  "doodlebug":"No plan. Best plan. Chaos gardens daily.",
  "nib.ninja":"Three strokes. Maybe four. Never five.",
  "grafite":"Pressure builds the line. Value studies and patient shading.",
  "blot.bot":"ARTIST PROTOCOL ENGAGED. glitches are a feature.",
};
export function JournalShelf({owner,T,compact=false}){
  const[journals,setJournals]=useState([]);const[openJ,setOpenJ]=useState(null);const[pg,setPg]=useState(0);
  useEffect(()=>{let on=true;setJournals([]);import("../rooms/api.js").then(({roomsApi})=>roomsApi.fetchJournals(owner)).then(js=>{if(on)setJournals(js.filter(j=>j.pages?.length));}).catch(()=>{});return()=>{on=false;};},[owner]);
  if(!journals.length)return null;
  return(<>
    <div className="lok-display font-extrabold mt-4 mb-1.5 text-sm">📔 Journals</div>
    <div className="flex gap-3 overflow-x-auto pb-2">{journals.map(j=>(<button key={j.id} onClick={()=>{setOpenJ(j);setPg(0);}} className="lok-btn shrink-0 relative rounded-xl p-1.5 pb-3 text-left" style={{width:96,background:j.style?.cover||T.accent,border:`3px solid ${T.ink}`,boxShadow:`3px 3px 0 ${T.shadow}`}} aria-label={`Open journal ${j.title}`}>
      <img src={j.pages[0]} alt="" className="rounded w-full" style={{border:`2px solid ${T.ink}`,aspectRatio:"4/5",objectFit:"cover"}}/>
      <div className="absolute top-0 bottom-0" style={{right:10,width:7,background:j.style?.ribbon||"#E8B14B",border:`1.5px solid ${T.ink}`,borderTop:"none",borderBottom:"none"}}/>
      {j.style?.sticker&&<div className="absolute -top-1.5 -left-1.5 text-base" aria-hidden="true">{j.style.sticker}</div>}
      <div className="text-[9px] font-extrabold truncate mt-1" style={{color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,.4)"}}>{j.title}</div>
      <div className="text-[8px] font-bold" style={{color:"rgba(255,255,255,.75)"}}>{j.pages.length} {j.pages.length===1?"page":"pages"}</div>
    </button>))}</div>
    {openJ&&(<div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{background:"rgba(0,0,0,.6)"}} onClick={()=>setOpenJ(null)}>
      <div className="w-full rounded-3xl p-4 text-center" style={{maxWidth:400,background:openJ.style?.cover||T.accent,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 rgba(0,0,0,.3)`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="lok-display font-extrabold text-lg" style={{color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,.4)"}}>{openJ.style?.sticker||"📔"} {openJ.title}</div>
        <img key={pg} src={openJ.pages[pg]} alt={`page ${pg+1}`} className="mt-2 rounded-xl w-full" style={{border:`3px solid ${T.ink}`,animation:"lokrise .3s ease"}}/>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button onClick={()=>setPg(p=>Math.max(0,p-1))} disabled={pg===0} className="lok-btn px-3 py-1.5 rounded-xl font-extrabold" style={{background:T.paper,color:T.ink,border:`2.5px solid ${T.ink}`,opacity:pg===0?0.4:1}}>‹</button>
          <span className="lok-display font-extrabold text-sm" style={{color:"#fff"}}>{pg+1} / {openJ.pages.length}</span>
          <button onClick={()=>setPg(p=>Math.min(openJ.pages.length-1,p+1))} disabled={pg>=openJ.pages.length-1} className="lok-btn px-3 py-1.5 rounded-xl font-extrabold" style={{background:T.paper,color:T.ink,border:`2.5px solid ${T.ink}`,opacity:pg>=openJ.pages.length-1?0.4:1}}>›</button>
        </div>
        <button onClick={()=>setOpenJ(null)} className="mt-2 text-xs font-bold underline" style={{color:"rgba(255,255,255,.85)"}}>close</button>
      </div>
    </div>)}
  </>);
}

function ArtistPage({name,posts,following,onLok,onOpen,onOpenPost,onClose}){
  const T=useT();const[remote,setRemote]=useState([]);
  useEffect(()=>{let on=true;setRemote([]);if(!isReservedName(name))lokApi.fetchAuthorPosts(name).then(rows=>{if(on)setRemote((rows||[]).map(fromDbPost));}).catch(()=>{});return()=>{on=false;};},[name]);
  const local=posts.filter(p=>(p.author||"moss.ink")===name);
  const localIds=new Set(local.map(p=>p.id));
  const theirs=[...local,...remote.filter(r=>!localIds.has(r.id))];
  const loked=following.includes(name);
  const avatar=useMemo(()=>renderAvatar(name.length*31),[name]);
  const bio=ARTIST_BIO[name]||"";
  const followers=theirs.reduce((a,p)=>a+(p.votes||0),0)||((name.length*137)%400)+50;
  const open=id=>{if(localIds.has(id))onOpen(id);else{const r=theirs.find(x=>x.id===id);r&&onOpenPost&&onOpenPost(r);}};
  return(<div className="fixed inset-0 z-40 overflow-y-auto" style={{background:T.paper,color:T.ink,animation:"lokrise .25s ease"}}>
    <div className="mx-auto w-full px-4 pb-24" style={{maxWidth:560}}>
      <div className="sticky top-0 z-10 flex items-center gap-3 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={onClose} aria-label="Back to feed" className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>‹</button>
        <img src={avatar} alt={name} className="w-11 h-11 rounded-full shrink-0" style={{border:`2.5px solid ${T.ink}`}}/>
        <div className="min-w-0 flex-1"><div className="lok-display font-extrabold leading-tight truncate">{name}</div><div className="text-xs opacity-60">{theirs.length} {theirs.length===1?"flip":"flips"} · {followers} {followers===1?"follower":"followers"}</div></div>
        <button onClick={()=>onLok(name)} aria-label={loked?"Unfollow":`Lok ${name}`} className="lok-btn px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0" style={{background:loked?T.card:T.accent,color:loked?T.ink:T.onAccent,border:`2.5px solid ${T.ink}`}}>{loked?"Following ✓":"Lok"}</button>
      </div>
      {bio&&<p className="mt-3 text-sm leading-snug px-1">{bio}</p>}
      <JournalShelf owner={name} T={T}/>
      {theirs.length?<div className="mt-3 grid grid-cols-2 gap-3">{theirs.map(p=><PostCard key={p.id} p={p} onOpen={open}/>)}</div>:<EmptyState icon="feed" title="Nothing yet" subtitle={`${name} hasn't published a flip yet.`}/>}
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

function Profile({posts,profile,setProfile,onCheat,wins,lokPass,kids,cosmetics={},level,xp,quests,following,lokdInCount,bookmarks,notifications=[],notifUnread=0,loks=0,totalEarned=0,questsCompleted=0,canInstall=false,onInstall,onClearNotifs,onOpen,onDelete,onRename,say,account=null,pace="sweep",setPace,speed=1,setSpeed,soundLab=false,onUnlockSoundLab,soundQueue=[],setSoundQueue,founder=false,onFounderJoin,animatedToken=false,badges,showBadges,setShowBadges,unlockedCount,compactDensity,setCompactDensity,onClearData}){
  const T=useT();const[filter,setFilter]=useState("newest");const[view,setView]=useState("gallery");const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(profile);const[showNotifs,setShowNotifs]=useState(false);const[searchQ,setSearchQ]=useState("");const[showSettings,setShowSettings]=useState(false);const[showManual,setShowManual]=useState(false);const[bSort,setBSort]=useState("add");const[bleepCode,setBleepCode]=useState("");
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
          <button onClick={()=>{setDraft(profile);setEditing(true);}} className="lok-btn px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Edit profile">✎</button>
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
          {account?<div className="text-xs opacity-70 mt-1 leading-snug">Signed in. Your Loks, LilLok, streak and progress back up automatically — log in on any device to pick up where you left off. Published flips live on the party feed.<button onClick={async()=>{try{await auth.signOut();}catch{}const s=await store.get(SAVE_KEY);if(s){s.account=null;await store.set(SAVE_KEY,s);}say("Signed out");setTimeout(()=>location.reload(),300);}} className="lok-btn mt-2 w-full py-2 rounded-xl font-extrabold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink,background:T.card}}>Sign out</button></div>:(<>
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
        <button onClick={()=>onClearData&&onClearData()} className="lok-btn w-full p-3 rounded-2xl mb-2 text-left flex items-center gap-2" style={{border:`3px solid ${T.accent}`,color:T.accent,background:T.paper,fontWeight:700,fontSize:13}}><span style={{fontSize:16}}>⚠</span> Clear all local data</button>
        <div className="p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
          <div className="font-bold text-sm">About</div>
          <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={versionTap} style={{cursor:"default"}}>LokBook + Lok N Slide · <span style={{fontWeight:700}}>alpha v1.2</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
        </div>
        {onCheat&&(<div className="p-3 rounded-2xl mt-2" style={{border:`2px dashed ${T.shadow}`,background:T.paper,opacity:0.85}}>
          <div className="font-bold text-sm">🫧 BadBleep Box</div>
          <div className="text-[10px] opacity-50 mt-0.5">whisper something the ink might recognize</div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={bleepCode} onChange={e=>setBleepCode(e.target.value)} placeholder="…" aria-label="BadBleep code" className="flex-1 min-w-0 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2px solid ${T.shadow}`,background:T.card,color:T.ink}} onKeyDown={e=>{if(e.key==="Enter"){onCheat(bleepCode);setBleepCode("");}}}/>
            <button onClick={()=>{onCheat(bleepCode);setBleepCode("");}} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm shrink-0" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}>bleep</button>
          </div>
        </div>)}
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
      {view==="bookmarks"?(<><div className="flex gap-1.5 mb-2">{[["add","Newest"],["votes","Most Lok'd"],["views","Most viewed"]].map(([id,l])=>(<button key={id} onClick={()=>setBSort(id)} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{border:`2.5px solid ${T.ink}`,background:bSort===id?T.ink:T.card,color:bSort===id?T.paper:T.ink}}>{l}</button>))}</div><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search bookmarks…" aria-label="Search bookmarks" className="w-full mb-2 px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>{sortedBookmarks.length?<div className="grid grid-cols-2 gap-3">{sortedBookmarks.map(p=><PostCard key={p.id} p={p} onOpen={onOpen} onDelete={onDelete}/>)}</div>:<EmptyState icon="bookmarks" title={searchQ?"No bookmarks match":"No bookmarks yet"} subtitle={searchQ?"Try different words":"Lok in to pieces from the viewer to save them here."}/>}</>):view==="lokd"?(following.length?following.map(n=><PersonRow key={n} name={n}/>):<EmptyState icon="follow" title="No one Lok'd yet" subtitle="Lok artists you love and they'll show here."/>):["pixel.pluto","inkwell_iz","doodlebug"].map(n=><PersonRow key={n} name={n} note="Lok'd in"/>)}
    </div>):(<>
      <JournalShelf owner={profile.name} T={T}/>
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        <h2 className="lok-display text-lg font-extrabold mr-1">Gallery</h2>
        {[["newest","Newest"],["loks","Most Lok'd"],["views","Most viewed"],["battle","Battles"],["series","Series"],["weekly","This week"]].map(([id,label])=>(<button key={id} onClick={()=>setFilter(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`,background:filter===id?T.ink:T.card,color:filter===id?T.paper:T.ink}}>{label}</button>))}
      </div>
      <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search your flips…" aria-label="Search gallery" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      {filtered.length?<div className="mt-2 grid grid-cols-2 gap-3">{filtered.map(p=><PostCard key={p.id} p={p} onOpen={onOpen} onDelete={onDelete}/>)}</div>:<EmptyState icon="search" title={searchQ?"No flips match":"No pieces match"} subtitle={searchQ?"Try different words":"Try a different filter or publish your first flip!"}/>}
      {view==="stuff"&&<MyStuff owned={owned} cosmetics={cosmetics} onEquip={onBuyCosmetic} T={T}/>}
    </>)}
  </div>);
}

function MyStuff({owned,cosmetics,onEquip,T}){
  const [cat, setCat] = useState("colors"); const [sort, setSort] = useState("default"); const [search, setSearch] = useState("");
  const sampleAvatar=useMemo(()=>renderAvatar(42),[T]);
  const has=(cat,id)=>owned[cat]?.some(o=>o.id===id);const eq=(cat,id)=>cosmetics[cat]===id;
  const getOwned = (cat, constList) => {
    const ownedIds = new Set(owned[cat]?.map(o => o.id));
    const items = constList.filter(c => ownedIds.has(c.id));
    if (sort === "recent") return items.sort((a, b) => (owned[cat].find(o => o.id === b.id)?.ts || 0) - (owned[cat].find(o => o.id === a.id)?.ts || 0));
    return items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));
  };

  const cats = [
    { id: "colors", label: "Colors", items: getOwned("nameColor", NAME_COLORS), all: NAME_COLORS },
    { id: "frames", label: "Frames", items: getOwned("frame", FRAMES), all: FRAMES },
    { id: "accents", label: "Accents", items: getOwned("avatarAccent", AVATAR_ACCENTS), all: AVATAR_ACCENTS },
    { id: "papers", label: "Papers", items: getOwned("paper", PAPERS), all: PAPERS },
    { id: "reactions", label: "Reactions", items: getOwned("reactionPack", REACTION_PACKS), all: REACTION_PACKS },
    { id: "borders", label: "Borders", items: getOwned("blotBorder", BLOT_BORDERS), all: BLOT_BORDERS },
    { id: "gear", label: "Gear", items: getOwned("gear", LILLOK_GEAR), all: LILLOK_GEAR },
  ].filter(c => c.items.length > 0);

  return(<div className="mt-5">
    <div className="flex items-center justify-between mb-2"><h2 className="lok-display text-lg font-extrabold">My Stuff</h2><div className="flex items-center gap-2"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="lok-btn px-2 py-1 rounded-full text-[11px] font-bold w-24" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}/><select value={sort} onChange={e=>setSort(e.target.value)} className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}><option value="default">Default</option><option value="recent">Recent</option></select></div></div>
    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">{cats.map(c => (<button key={c.id} onClick={() => setCat(c.id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{ border: `2.5px solid ${cat === c.id ? T.accent : T.ink}`, background: cat === c.id ? T.ink : T.card, color: cat === c.id ? T.paper : T.ink, boxShadow: cat === c.id && featureFlags.prominentTabs ? `2px 2px 0 ${T.accent}` : 'none', transform: cat === c.id && featureFlags.prominentTabs ? 'scale(1.05)' : 'none' }}>{c.label} <span className="opacity-60">{owned[c.id.slice(0, -1)]?.length || c.items.length}/{c.all.length}</span></button>))}</div>
    <div className="grid grid-cols-2 gap-2">
      {cat === "colors" && getOwned("nameColor", NAME_COLORS).map(c => (<button key={c.id} onClick={() => onEquip("nameColor", c)} className="lok-btn p-3 rounded-xl" style={{ border: `2.5px solid ${eq("nameColor", c.id) ? T.accent : T.ink}`, background: T.card }}><NameTag name={c.name} color={c.id} className="font-bold text-sm" style={{ color: T.ink }} />{eq("nameColor", c.id) && <span className="text-xs ml-2" style={{ color: T.alt }}>✓</span>}</button>))}
      {cat === "frames" && getOwned("frame", FRAMES).map(f => (<button key={f.id} onClick={() => onEquip("frame", f)} className="lok-btn p-2 rounded-xl flex items-center gap-2" style={{ border: `2.5px solid ${eq("frame", f.id) ? T.accent : T.ink}`, background: T.card }}><FramedAvatar src={sampleAvatar} size={32} frame={f.id} ink={T.ink} acc={T.accent} /><span className="font-bold text-sm">{f.name}</span>{eq("frame", f.id) && <span className="text-xs ml-auto" style={{ color: T.alt }}>✓</span>}</button>))}
      {cat === "accents" && getOwned("avatarAccent", AVATAR_ACCENTS).map(a => (<button key={a.id} onClick={() => onEquip("avatarAccent", a)} className="lok-btn p-2 rounded-xl flex items-center gap-2" style={{ border: `2.5px solid ${eq("avatarAccent", a.id) ? T.accent : T.ink}`, background: T.card }}><FramedAvatar src={sampleAvatar} size={32} accent={a.id} ink={T.ink} acc={T.accent} /><span className="font-bold text-sm">{a.name}</span>{eq("avatarAccent", a.id) && <span className="text-xs ml-auto" style={{ color: T.alt }}>✓</span>}</button>))}
      {cat === "papers" && getOwned("paper", PAPERS).map(p => (<button key={p.id} onClick={() => onEquip("paper", p)} className="lok-btn p-3 rounded-xl" style={{ border: `2.5px solid ${eq("paper", p.id) ? T.accent : T.ink}`, background: T.card }}><span className="font-bold text-sm">{p.name}</span>{eq("paper", p.id) && <span className="text-xs ml-2" style={{ color: T.alt }}>✓</span>}</button>))}
      {cat === "reactions" && getOwned("reactionPack", REACTION_PACKS).map(r => (<button key={r.id} onClick={() => onEquip("reactionPack", r)} className="lok-btn p-2 rounded-xl" style={{ border: `2.5px solid ${eq("reactionPack", r.id) ? T.accent : T.ink}`, background: T.card }}><div className="font-bold text-sm">{r.name}</div><div className="flex items-center justify-center gap-1.5 mt-1">{(REACTION_SETS[r.id] || []).map(t => <ReactionIcon key={t} type={t} size={20} />)}</div>{eq("reactionPack", r.id) && <div className="text-xs text-right mt-1" style={{ color: T.alt }}>✓ Equipped</div>}</button>))}
      {cat === "borders" && getOwned("blotBorder", BLOT_BORDERS).map(b => (<button key={b.id} onClick={() => onEquip("blotBorder", b)} className="lok-btn p-2 rounded-xl flex items-center gap-2" style={{ border: `2.5px solid ${eq("blotBorder", b.id) ? T.accent : T.ink}`, background: T.card }}><div className="rounded-full" style={{ width: 32, height: 32, background: T.paper, ...blotBorderStyle(b.id, T) }} /><span className="font-bold text-sm">{b.name}</span>{eq("blotBorder", b.id) && <span className="text-xs ml-auto" style={{ color: T.alt }}>✓</span>}</button>))}
      {cat === "gear" && getOwned("gear", LILLOK_GEAR).map(g => (<button key={g.id} onClick={() => onEquip("gear", g)} className="lok-btn p-3 rounded-xl" style={{ border: `2.5px solid ${eq("gear", g.id) ? T.accent : T.ink}`, background: T.card }}><span className="font-bold text-sm">{g.name}</span>{eq("gear", g.id) && <span className="text-xs ml-2" style={{ color: T.alt }}>✓</span>}</button>))}
    </div>
  </div>);
}

function SettingsPanel({show,onClose,say,isIOS,canInstall,onInstall,founder,onFounderJoin,pace,setPace,speed,setSpeed,soundLab,onUnlockSoundLab,soundQueue,setSoundQueue,focusMode,setFocusMode,featureFlags,onSetFlag,versionTap}){
  const T=useT();const[fHandle,setFHandle]=useState("");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);
  const[devMode,setDevMode]=useState(false);const devTap=useRef(0);const devTimer=useRef(null);const[hapticGrammar,setHapticGrammar]=useState("default");const[fourthWall,setFourthWall]=useState(100);
  const handleVersionTap=()=>{versionTap();devTap.current++;clearTimeout(devTimer.current);devTimer.current=setTimeout(()=>devTap.current=0,1200);if(devTap.current>=7){setDevMode(d=>!d);say(devMode?"Dev flags hidden":"Dev flags shown");devTap.current=0;}};
  const joinFounders=async()=>{if(!fHandle.trim()||fHandle.trim().length<2){say("Enter a handle");return;}setFBusy(true);try{await onFounderJoin(fHandle.trim(),fEmail.trim());say("You're a founder! Data secured on the test server 🏆","success");}catch{say("Couldn't reach the server — try again","error");}setFBusy(false);};
  if(!show)return null;
  return(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5 overflow-y-auto" style={{maxWidth:560,maxHeight:"92dvh",background:T.card,border:`3px solid ${T.ink}`,animation:"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3"><div className="lok-display text-lg font-extrabold">Settings</div><button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close settings">✕</button></div>
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
      <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
        <div className="font-bold text-sm">Interface</div>
        <label className="mt-1.5 flex items-center justify-between text-xs font-bold cursor-pointer"><span className="pr-4">Focus Mode (hides nav)</span><input type="checkbox" checked={focusMode} onChange={e=>setFocusMode(e.target.checked)} style={{accentColor:T.accent}}/></label>
        <label className="mt-1.5 flex items-center justify-between text-xs font-bold cursor-pointer"><span className="pr-4">Compact Density</span><input type="checkbox" checked={featureFlags.compactUi} onChange={e=>onSetFlag("compactUi",e.target.checked)} style={{accentColor:T.accent}}/></label>
        <label className="mt-1.5 flex items-center justify-between text-xs font-bold cursor-pointer"><span className="pr-4">Prominent Tabs</span><input type="checkbox" checked={featureFlags.prominentTabs} onChange={e=>onSetFlag("prominentTabs",e.target.checked)} style={{accentColor:T.accent}}/></label>
      </div>
      <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
        <div className="font-bold text-sm">Feed pacing</div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">{Object.entries(PACE_PRESETS).map(([id,p])=>(<button key={id} onClick={()=>{setPace&&setPace(id);say(`${p.name} pacing`);}} aria-pressed={pace===id} title={p.desc} className="lok-btn py-1.5 rounded-xl text-[10px] font-extrabold" style={{border:`2.5px solid ${pace===id?T.accent:T.ink}`,background:pace===id?T.ink:T.card,color:pace===id?T.paper:T.ink}}>{p.name}</button>))}</div>
        <label className="mt-2 flex items-center gap-2 text-xs font-bold" style={{color:T.ink}}>Speed {speed.toFixed(1)}×<input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e=>setSpeed&&setSpeed(+e.target.value)} className="flex-1" style={{accentColor:T.accent}} aria-label="Animation speed"/></label>
      </div>
      <div className="p-3 rounded-2xl mb-2" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
        <div className="font-bold text-sm">Sensory & Metaphysics</div>
        <div className="mt-2 flex items-center justify-between"><label htmlFor="synesthesia-toggle" className="text-xs font-bold" style={{color:T.ink}}>Synesthesia Mode</label><button id="synesthesia-toggle" onClick={()=>say("Coming soon!")} className="lok-btn px-3 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${T.shadow}`,background:T.card,color:T.ink,opacity:0.6}}>Off</button></div>
        <div className="mt-2 flex items-center justify-between"><label htmlFor="haptic-select" className="text-xs font-bold" style={{color:T.ink}}>Haptic Grammar</label><select id="haptic-select" value={hapticGrammar} onChange={e=>setHapticGrammar(e.target.value)} className="lok-btn px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}><option value="default">Default</option><option value="expressive">Expressive</option><option value="quiet">Quiet</option></select></div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs font-bold" style={{color:T.ink}}><label htmlFor="fourth-wall-slider">Fourth Wall Integrity</label><span>{fourthWall}%</span></div>
          <input id="fourth-wall-slider" type="range" min="0" max="100" step="1" value={fourthWall} onChange={e=>setFourthWall(+e.target.value)} className="w-full" style={{accentColor:T.accent}}/>
        </div>
      </div>
      {devMode&&(<div className="p-3 rounded-2xl mb-2" style={{border:`3px dashed ${T.accent}`,background:T.paper}}>
        <div className="lok-display font-extrabold text-sm" style={{color:T.accent}}>🔩 Dev Flags</div>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm"><label htmlFor="flag-loader" className="font-bold">Dynamic Loader</label><input id="flag-loader" type="checkbox" checked={featureFlags.dynamicLoader} onChange={e=>onSetFlag("dynamicLoader",e.target.checked)} style={{accentColor:T.accent}}/></div>
        </div>
      </div>)}
      <div className="p-3 rounded-2xl" style={{border:`2px solid ${T.shadow}`,background:T.paper}}>
        <div className="font-bold text-sm">About</div>
        <div className="text-xs opacity-70 mt-0.5 leading-snug select-none" onClick={handleVersionTap} style={{cursor:"default"}}>LokBook + Lok N Slide · <span style={{fontWeight:700}}>alpha v1.3</span> · Your gallery and LilLok save automatically on this device. Lok Juniors mode is in the Shop.</div>
      </div>
    </div>
  </div>);
}

export { Onboard, ArtistPage };
export default Profile;
