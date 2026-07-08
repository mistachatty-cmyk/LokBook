import { useState, useEffect, useRef, useMemo } from "react";
import { useT, ART } from "../theme/theme.js";
import Easel from "../Easel.jsx";
import { getModuleLayers, hasModule, PROMPTS, WEEKLY_PROMPT, STUDIO_MODULES, PX_PER_FRAME, W, H } from "../constants.jsx";
import { encodeGIF } from "../engine/gif.js";

const TWEEN_PRESETS={
  bounce:{label:"Bounce",frames:5,curve:t=>1-Math.pow(1-t,3)*Math.cos(t*Math.PI*4.5)},
  shake:{label:"Shake",frames:4,curve:t=>Math.sin(t*Math.PI*6)*(1-t)},
  fade:{label:"Fade",frames:3,curve:t=>t},
  wiggle:{label:"Wiggle",frames:4,curve:t=>t+Math.sin(t*Math.PI*8)*0.08},
};

function tweenFrames(frameA,frameB,preset){
  const count=TWEEN_PRESETS[preset]?.frames||3;
  const curve=TWEEN_PRESETS[preset]?.curve||(t=>t);
  return new Promise(resolve=>{
    const imgA=new Image(),imgB=new Image();let n=0;
    imgA.onload=imgB.onload=()=>{n++;if(n<2)return;
      const ca=document.createElement("canvas");ca.width=W;ca.height=H;
      const cb=document.createElement("canvas");cb.width=W;cb.height=H;
      const cxa=ca.getContext("2d"),cxb=cb.getContext("2d");
      cxa.drawImage(imgA,0,0,W,H);cxb.drawImage(imgB,0,0,W,H);
      const da=cxa.getImageData(0,0,W,H).data;
      const db=cxb.getImageData(0,0,W,H).data;
      const out=document.createElement("canvas");out.width=W;out.height=H;
      const ox=out.getContext("2d");const frames=[];
      for(let k=1;k<=count;k++){
        const t=curve(k/(count+1));const id=ox.createImageData(W,H);
        for(let p=0;p<da.length;p++)id.data[p]=da[p]*(1-t)+db[p]*t;
        ox.putImageData(id,0,0);frames.push(out.toDataURL("image/png"));
      }resolve(frames);
    };imgA.src=frameA;imgB.src=frameB;
  });
}

function Studio({modules=[],onPublish,say,kids,dailyPrompt,paper="plain",onboarded=false,postCount=0}){
  const T=useT();const easel=useRef(null);
  const maxLayers=getModuleLayers(modules);
  const[tier,setTier]=useState(maxLayers);const[frames,setFrames]=useState(()=>{try{const d=localStorage.getItem("lok:draft:frames");return d?JSON.parse(d):[];}catch{return[];}});const[frameDurations,setFrameDurations]=useState(()=>{try{const d=localStorage.getItem("lok:draft:durations");return d?JSON.parse(d):[];}catch{return[];}});const[frameLabels,setFrameLabels]=useState(()=>{try{const d=localStorage.getItem("lok:draft:labels");return d?JSON.parse(d):[];}catch{return[];}});const[editingLabel,setEditingLabel]=useState(null);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(()=>{try{const d=localStorage.getItem("lok:draft:pace");return d?+d:140;}catch{return 140;}});const[title,setTitle]=useState(()=>{try{return localStorage.getItem("lok:draft:title")||"";}catch{return"";}});const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const[tweenPick,setTweenPick]=useState(null);const[tweenBusy,setTweenBusy]=useState(false);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  useEffect(()=>{try{if(frames.length)localStorage.setItem("lok:draft:frames",JSON.stringify(frames));else localStorage.removeItem("lok:draft:frames");}catch{};try{if(frameDurations.length)localStorage.setItem("lok:draft:durations",JSON.stringify(frameDurations));else localStorage.removeItem("lok:draft:durations");}catch{};try{if(frameLabels.length)localStorage.setItem("lok:draft:labels",JSON.stringify(frameLabels));else localStorage.removeItem("lok:draft:labels");}catch{};try{localStorage.setItem("lok:draft:pace",String(paceMs));}catch{};try{title?localStorage.setItem("lok:draft:title",title):localStorage.removeItem("lok:draft:title");}catch{};},[frames,frameDurations,frameLabels,paceMs,title]);
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:i===0?ART.pink:ART.teal,opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length);setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setJustCap(true);setTimeout(()=>setJustCap(false),360);say(`Page ${frames.length+1} captured`);};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);setFrameLabels(l=>[...l.slice(0,i+1),"",...l.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);setFrameLabels(l=>[...l.slice(0,i+1),l[i]||"",...l.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameLabels(ll=>{const j=i+d;if(j<0||j>=ll.length)return ll;const c=[...ll];[c[i],c[j]]=[c[j],c[i]];return c;});};
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
      {hasModule(modules,"achieve_onion")?<button onClick={()=>setOnionOn(v=>!v)} aria-pressed={onionOn} className="lok-btn px-2.5 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${onionOn?T.accent:T.shadow}`,background:onionOn?T.ink:"transparent",color:onionOn?T.paper:T.ink}}>🧅 Onion {onionOn?"ON":"OFF"}</button>
      :<span className="text-xs opacity-50 px-2.5 py-1 rounded-full" style={{border:`2px dashed ${T.shadow}`}}>🧅 Onion · unlock via achievement</span>}
      {hasModule(modules,"achieve_onion")&&onionOn&&frames.length>0&&(<>
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
        {hasModule(modules,"feat_batch")&&<button onClick={()=>{setFrames([]);setFrameDurations([]);setFrameLabels([]);easel.current.clearAll();say("Cleared all pages");}} aria-label="Clear all pages" className="text-[11px] font-bold underline opacity-60">clear all</button>}
      </div>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-2">
        {frames.map((f,i)=>(<div key={i} className="shrink-0 flex flex-col gap-0.5" style={{width:76}}>
          <div className="rounded-lg overflow-hidden relative" style={{border:`2.5px solid ${T.ink}`,boxShadow:`2px 2px 0 ${T.shadow}`}}>
            <img src={f} alt={`page ${i+1}`} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/>
            <div className="absolute top-0.5 left-0.5 px-1 rounded text-[9px] font-bold" style={{background:T.ink,color:"#fff"}}>{i+1}</div>
            {hasModule(modules,"feat_labels")&&<div className="absolute bottom-0.5 left-0.5 right-0.5">
              {editingLabel===i?<input value={frameLabels[i]||""} onChange={e=>{const n=[...frameLabels];n[i]=e.target.value;setFrameLabels(n);}} onBlur={()=>setEditingLabel(null)} onKeyDown={e=>e.key==="Enter"&&setEditingLabel(null)} autoFocus className="w-full text-[8px] px-0.5 py-0.5 rounded text-center font-bold" style={{background:"rgba(0,0,0,.65)",color:"#fff",border:"none",outline:`1px solid ${T.accent}`}} aria-label={`Label page ${i+1}`}/>
              :<button onClick={()=>setEditingLabel(i)} className="w-full text-[8px] font-bold truncate leading-tight px-0.5 py-0.5 rounded" style={{background:"rgba(0,0,0,.5)",color:"#fff",backdropFilter:"blur(2px)"}}>{frameLabels[i]||"…"}</button>}
            </div>}
            <button onClick={e=>{e.stopPropagation();const a=document.createElement("a");a.href=f;a.download=`page-${i+1}.png`;a.click();}} aria-label={`Download page ${i+1}`} className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{background:T.accent,color:"#fff",border:`1.5px solid ${T.ink}`}}>↓</button>
          </div>
          <div className="flex items-center" style={{gap:2}}>
            <button onClick={()=>moveFrame(i,-1)} aria-label={`Move page ${i+1} left`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>‹</button>
            <button onClick={()=>setEditingDur(editingDur===i?null:i)} aria-label={`Edit duration ${i+1}`} className="lok-btn flex-1 text-[9px] font-mono py-0.5 rounded text-center opacity-70" style={{border:`1px solid ${T.shadow}`}}>{frameDurations[i]??paceMs}ms</button>
            <button onClick={()=>moveFrame(i,1)} aria-label={`Move page ${i+1} right`} className="lok-btn flex-1 font-bold text-[10px] py-0.5 rounded text-center" style={{color:T.ink,border:`1px solid ${T.shadow}`}}>›</button>
          </div>
          {editingDur===i&&<input type="number" min="40" max="2000" value={frameDurations[i]??paceMs} onChange={e=>setFrameDurations(d=>{const n=[...d];n[i]=+e.target.value;return n;})} onBlur={()=>setEditingDur(null)} autoFocus aria-label={`Page ${i+1} duration ms`} className="w-full text-center text-[10px] rounded px-1 py-0.5" style={{border:`2px solid ${T.accent}`,background:T.card}}/>}
          <div className="flex items-center" style={{gap:2}}>
            {hasModule(modules,"feat_batch")&&<button onClick={()=>duplicateFrame(i)} aria-label={`Duplicate page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.ink}}>dup</button>}
            {hasModule(modules,"feat_batch")&&<button onClick={()=>insertBlank(i)} aria-label={`Insert blank after ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>+↓</button>}
            {hasModule(modules,"feat_batch")&&<button onClick={()=>{setFrames(fs=>fs.filter((_,k)=>k!==i));setFrameDurations(d=>d.filter((_,k)=>k!==i));setFrameLabels(l=>l.filter((_,k)=>k!==i));}} aria-label={`Delete page ${i+1}`} className="lok-btn flex-1 text-[9px] font-bold py-0.5 rounded text-center" style={{border:`1px solid ${T.shadow}`,color:T.accent}}>✕</button>}
          </div>
        </div>))}
      </div>
      {hasModule(modules,"feat_tween")&&frames.length>=2&&(<div className="mt-3 p-3 rounded-2xl" style={{border:`3px dashed ${T.accent}`,background:T.paper}}>
        <div className="flex items-center gap-2 mb-2"><span className="lok-display font-extrabold text-sm" style={{color:T.accent}}>🎞 Tween</span><span className="text-[10px] opacity-60">Generate in-between frames</span></div>
        <div className="flex gap-1.5">{Object.entries(TWEEN_PRESETS).map(([id,p])=>(<button key={id} onClick={()=>setTweenPick(id)} className="lok-btn shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tweenPick===id?T.accent:T.ink}`,background:tweenPick===id?T.ink:T.card,color:tweenPick===id?T.paper:T.ink}}>{p.label}</button>))}</div>
        <button disabled={!tweenPick||tweenBusy} onClick={async()=>{if(!tweenPick||frames.length<2)return;setTweenBusy(true);say("Generating tweens…");try{const result=await tweenFrames(frames[0],frames[frames.length-1],tweenPick);setFrames(f=>[...f.slice(0,-1),...result,f[f.length-1]]);setFrameDurations(d=>{const gap=Array(result.length).fill(paceMs);return[...d.slice(0,-1),...gap,d[d.length-1]];});setFrameLabels(l=>{const gap=Array(result.length).fill("");return[...l.slice(0,-1),...gap,l[l.length-1]];});say(`Added ${result.length} tween frames!`,"success");}catch{say("Tween failed","error");}setTweenBusy(false);setTweenPick(null);}} className="lok-btn mt-2 w-full py-2 rounded-xl text-sm font-extrabold" style={{background:tweenPick&&!tweenBusy?T.accent:T.shadow,color:tweenPick&&!tweenBusy?T.onAccent:T.ink,border:`2.5px solid ${T.ink}`,opacity:tweenPick?1:0.5}}>{tweenBusy?"Generating…":tweenPick?`Apply ${TWEEN_PRESETS[tweenPick].label} (${TWEEN_PRESETS[tweenPick].frames} frames)`:"Pick a preset"}</button>
      </div>)}
      <div className="mt-3 p-3 rounded-2xl flex gap-3 items-center" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>
        <div className="relative shrink-0"><img src={frames[Math.min(pv,frames.length-1)]} alt="preview" className="rounded-lg" style={{width:92,aspectRatio:"4/5",objectFit:"cover",border:`2.5px solid ${T.ink}`}}/>{ready&&<div className="absolute -bottom-1.5 -right-1.5 lok-display text-[10px] font-extrabold px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent,border:`2px solid ${T.ink}`}}>▶ live</div>}</div>
        <div className="flex-1"><div className="font-bold text-sm">Default pace · <span style={{color:T.accent}}>{paceMs}ms</span>/page</div><input type="range" min="60" max="500" step="10" value={paceMs} onChange={e=>setPaceMs(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Default pace"/><div className="text-xs opacity-70">{ready?"Preview plays exactly as viewers see it.":"Add one more page to preview."}</div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Playback</div><div className="flex gap-2">{[["A","Scrub"],["B","Whole page"]].map(([id,l])=>(<button key={id} onClick={()=>setMode(id)} aria-pressed={mode===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${mode===id?T.accent:T.ink}`,background:mode===id?T.ink:T.card,color:mode===id?T.paper:T.ink}}>{l}</button>))}</div></div>
        <div><div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Style</div><div className="flex gap-2">{[["bold","Bold"],["series","Series"]].map(([id,l])=>(<button key={id} onClick={()=>setStyle(id)} aria-pressed={style===id} className="lok-btn flex-1 py-2 rounded-xl text-xs font-bold" style={{border:`2.5px solid ${style===id?T.accent:T.ink}`,background:style===id?T.alt:T.card,color:style===id?"#fff":T.ink}}>{l}</button>))}</div></div>
      </div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name this flip…" aria-label="Flip title" className="mt-3 w-full px-3 py-2.5 rounded-xl font-bold" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      <button disabled={!ready} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0,humhah:0,bomhogwah:0},echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null,from:"studio"});setFrames([]);setFrameDurations([]);setFrameLabels([]);setTitle("");easel.current.clearAll();["frames","durations","labels","pace","title"].forEach(k=>{try{localStorage.removeItem("lok:draft:"+k);}catch{}});}} className="lok-btn lok-display mt-3 w-full py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
        {ready?"Publish to gallery →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
      </button>
      {hasModule(modules,"feat_gif")&&ready&&(<button onClick={async()=>{say("Encoding GIF…");try{const cvs=await Promise.all(frames.map(f=>new Promise(res=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle=ART.paper;x.fillRect(0,0,W,H);x.drawImage(img,0,0);res(c);};img.onerror=()=>res(null);img.src=f;})));const valid=cvs.filter(Boolean);if(valid.length<2){say("Need at least 2 valid frames","error");return;}const blob=await encodeGIF(valid,{delay:paceMs});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(title.trim()||"flip")+".gif";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);say("GIF exported!","success");}catch(e){console.error(e);say("GIF export failed","error");}}} className="lok-btn mt-2 w-full py-2.5 rounded-xl text-sm font-extrabold" style={{border:`3px solid ${T.accent}`,color:T.accent,background:T.card}}>🎞 Export GIF</button>)}
    </div>)}
  </div>);
}

export default Studio;
