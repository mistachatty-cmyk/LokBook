import { useState, useRef, useEffect } from "react";
import { useT, ART } from "../theme/theme.js";
import { traceShape } from "../engine/draw.jsx";
import { W, H, MODES, FRONT_NAMES } from "../constants.jsx";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function OpenFront({kids,loks,dailyPrompt,onWager,onEarn,hinted,onHinted,blip,say}){
  const T=useT();const[phase,setPhase]=useState("lobby");const[mode,setMode]=useState("shapes");const[wagerOn,setWagerOn]=useState(false);const[online,setOnline]=useState(0);const[shape,setShape]=useState("star");const[time,setTime]=useState(0);const[score,setScore]=useState(0);const[board,setBoard]=useState([]);const[pot,setPot]=useState(0);const[wager,setWager]=useState(10);const[stake,setStake]=useState(0);const[lastPayout,setLastPayout]=useState(0);
  const guideRef=useRef(null);const inkRef=useRef(null);const wrapRef=useRef(null);const targetPts=useRef([]);const drawing=useRef(false);const last=useRef(null);const painted=useRef(0);const totalLen=useRef(1);const tickRef=useRef(null);const ROUND_BASE=12;const modeTime={shapes:12,stencils:16,wild:20,chars:22};
  // Rule variants: MODES entries may declare hit tolerance, a guide-visibility
  // behaviour and a score multiplier. Classic modes fall back to the defaults.
  const md=MODES[mode]||{};const hitRadius=md.radius??22;const scoreMult=md.mult??1;const guideMode=md.guide||"solid";
  const roundSeconds=md.seconds??modeTime[mode]??ROUND_BASE;
  const elapsed=Math.max(0,roundSeconds-time);
  const guideOpacity=guideMode==="blind"?(elapsed<3?1:0):guideMode==="fade"?Math.max(0.06,1-elapsed/roundSeconds):1;
  const setupShape=k=>{const pts=traceShape(k);targetPts.current=pts.map(p=>({...p,0:p[0],1:p[1],hit:false}));const g=guideRef.current.getContext("2d");g.clearRect(0,0,W,H);g.strokeStyle="rgba(35,48,107,0.28)";g.lineWidth=26;g.lineCap="round";g.lineJoin="round";g.beginPath();pts.forEach(([x,y],i)=>(i===0?g.moveTo(x,y):g.lineTo(x,y)));g.stroke();g.strokeStyle="rgba(35,48,107,0.5)";g.lineWidth=3;g.setLineDash([6,8]);g.stroke();g.setLineDash([]);inkRef.current.getContext("2d").clearRect(0,0,W,H);painted.current=0;};
  const start=()=>{const w=wagerOn?wager:0;if(w>0){if(!onWager(w)){say(`Need ${w} Loks`);return;}}setStake(w);const pool=MODES[mode].pool;const k=pool[Math.floor(Math.random()*pool.length)];setShape(k);setScore(0);setTime(roundSeconds);setPhase("play");setOnline(Math.floor(700+Math.random()*500));const field=Math.floor(5+Math.random()*4);setPot(w*(field+1));setBoard(FRONT_NAMES.slice(0,field).map(n=>({name:n,score:0})).concat([{name:"you",score:0,me:true}]));setTimeout(()=>setupShape(k),0);};
  useEffect(()=>{if(phase!=="play")return;tickRef.current=setInterval(()=>setTime(t=>{if(t<=0.1){finish();return 0;}return +(t-0.1).toFixed(1);}),100);const bots=setInterval(()=>setBoard(bd=>bd.map(p=>p.me?p:{...p,score:Math.min(98,p.score+Math.random()*6)}).sort((a,b)=>b.score-a.score)),600);return()=>{clearInterval(tickRef.current);clearInterval(bots);};},[phase]);
  const coverage=()=>Math.min(100,Math.round((painted.current/Math.max(1,targetPts.current.length))*100));
  const finish=()=>{clearInterval(tickRef.current);const cov=coverage();const speedBonus=Math.round(Math.max(0,time)*2);const final=Math.round((Math.min(100,cov)+speedBonus)*scoreMult);setScore(final);setBoard(bd=>{const nb=bd.map(p=>p.me?{...p,score:final}:p).sort((a,b)=>b.score-a.score);const place=nb.findIndex(p=>p.me)+1;const field=nb.length;let payout;if(pot>0)payout=place===1?Math.round(pot*0.6):place===2?Math.round(pot*0.3):place===3?Math.round(pot*0.1):0;else payout=place===1?15:place<=Math.ceil(field/2)?6:1;setLastPayout(payout);setTimeout(()=>{if(payout>0)onEarn(payout);blip&&blip(place===1?"C6":"E5");say(place===1?`1st! +${payout} Loks`:`#${place} · +${payout} Loks`);},50);return nb;});setPhase("results");};
  const pos=e=>{const r=wrapRef.current.getBoundingClientRect();return[((e.clientX-r.left)*W)/r.width,((e.clientY-r.top)*H)/r.height];};
  const scorePoint=(x,y)=>{const pts=targetPts.current;for(let i=0;i<pts.length;i++){if(!pts[i].hit&&Math.hypot((pts[i][0]??pts[i].x??pts[i][0])-x,(pts[i][1]??pts[i].y??pts[i][1])-y)<hitRadius){pts[i].hit=true;painted.current++;return true;}}return false;};
  const lastBoard=useRef(0);const pointerId=useRef(null);
  const down=e=>{if(phase!=="play")return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drawing.current=true;last.current=pos(e);paint(...last.current);};
  const move=e=>{if(!drawing.current)return;e.preventDefault();const[x,y]=pos(e);paint(x,y);};
  const paint=(x,y)=>{const ctx=inkRef.current.getContext("2d");const hit=scorePoint(x,y);ctx.strokeStyle=hit?ART.teal:ART.pink;ctx.lineWidth=12;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();const[px,py]=last.current||[x,y];ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();last.current=[x,y];if(hit){const now=performance.now();if(now-lastBoard.current>120){lastBoard.current=now;setBoard(bd=>bd.map(p=>p.me?{...p,score:coverage()}:p));}if(Math.random()<0.12)blip&&blip("D5");}};
  const up=e=>{drawing.current=false;last.current=null;try{if(e?.currentTarget?.releasePointerCapture&&e?.pointerId!=null)e.currentTarget.releasePointerCapture(e.pointerId);}catch{}};
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
    <div ref={wrapRef} className="relative mt-2 rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4/5",touchAction:"none"}}>
      <canvas ref={guideRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" style={{opacity:guideOpacity,transition:guideMode==="blind"?"opacity .35s ease":"opacity .4s linear"}}/>
      <canvas ref={inkRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <div className="absolute inset-0" role="img" aria-label="Trace Rush canvas" style={{touchAction:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",cursor:"crosshair"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}/>
      <button onClick={finish} className="lok-btn absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{background:T.ink,color:T.paper}}>Lock it in</button>
    </div>
    <div className="mt-2 flex items-center gap-2"><div className="text-xs opacity-70"><span style={{color:T.alt}}>●</span> {online.toLocaleString()} online</div></div>
    <p className="mt-1 text-center text-xs opacity-50">Teal = on the line · pink = off. Finish early for speed bonus.</p>
  </div>);
}
