// ⚠️ DEPRECATED — legacy single-file prototype kept for reference only.
// The live app is the modular build in src/ (entry: src/main.jsx → src/App.jsx).
// Do not add features here; edit src/ instead.
import {
  useState, useEffect, useRef, useCallback, useMemo,
  createContext, useContext, forwardRef, useImperativeHandle,
} from "react";

const W = 480, H = 600;
import { useFeedback } from "./hooks/useFeedback.js";
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

const THEMES = {
  riso:    { name:"Print Shop",       desc:"Two-ink risograph. The original.",          price:0,  paper:"#F2EDE2", ink:"#23306B", accent:"#FF5DA2", alt:"#2FA9A0", shadow:"#D9D2C0", card:"#FFFDF7", onAccent:"#fff" },
  midnight:{ name:"Midnight Ink",     desc:"Light table off, lamps on.",                price:40, paper:"#161C38", ink:"#EDE8D8", accent:"#FF5DA2", alt:"#3FC1B7", shadow:"rgba(0,0,0,.5)", card:"#1F2647", onAccent:"#fff" },
  tide:    { name:"Tide Pool",        desc:"Salt, kelp, one orange fish.",              price:40, paper:"#E2EFEC", ink:"#14555B", accent:"#FF8A5C", alt:"#3D9CA8", shadow:"#C3D8D3", card:"#F4FAF8", onAccent:"#fff" },
  zine:    { name:"Tangerine Zine",   desc:"Photocopied at 2am, stapled crooked.",      price:40, paper:"#FFF1DC", ink:"#46280F", accent:"#F4541D", alt:"#8C6BC8", shadow:"#EBD7B8", card:"#FFFAF0", onAccent:"#fff" },
  bloom:   { name:"Hot Bloom",        desc:"Magenta on bone. Loud and proud.",          price:60, paper:"#FBE9EF", ink:"#3A0B2E", accent:"#E0218A", alt:"#5E8BFF", shadow:"#E9CBD8", card:"#FFF4F8", onAccent:"#fff" },
  forest:  { name:"Forest Risograph", desc:"Pine ink, mushroom paper.",                 price:60, paper:"#ECEFE0", ink:"#1F3A24", accent:"#E8662A", alt:"#5A9E5E", shadow:"#D2D7C2", card:"#F6F8EE", onAccent:"#fff" },
  neon:    { name:"Neon Arcade",      desc:"Coin-op glow. Wave 2.",     price:90,wave:2,paper:"#0E0B1E", ink:"#F0E9FF", accent:"#19F0C3", alt:"#FF2E97", shadow:"rgba(0,0,0,.6)", card:"#1A1430", onAccent:"#0E0B1E" },
  blush:   { name:"Porcelain Blush",  desc:"Soft clay, gold leaf. Wave 2.", price:90,wave:2, paper:"#F7EEE7", ink:"#5E3B2E", accent:"#D98C6A", alt:"#B79B6E", shadow:"#E6D8CC", card:"#FDF7F2", onAccent:"#fff" },
  cobalt:  { name:"Cobalt Press",     desc:"Blueprint ink, chalk lines. Wave 2.", price:90,wave:2, paper:"#0B2545", ink:"#DCE8F5", accent:"#FFC94D", alt:"#6FB1FF", shadow:"rgba(0,0,0,.5)", card:"#123257", onAccent:"#0B2545" },
  sunset:  { name:"Sunset Gradient",  desc:"Warm sky, cool ground. Wave 3.", price:120,wave:3, paper:"linear-gradient(180deg, #FFC3A0 0%, #FFAFBD 100%)", ink:"#3A0B2E", accent:"#E0218A", alt:"#5E8BFF", shadow:"#E9CBD8", card:"#FFF4F8", onAccent:"#fff" },
  abyss:   { name:"Abyss Gradient",   desc:"Deep ocean, strange light. Wave 3.", price:120,wave:3, paper:"linear-gradient(180deg, #001F3F 0%, #000000 100%)", ink:"#F0F8FF", accent:"#00BFFF", alt:"#7FDBFF", shadow:"rgba(0,0,0,.7)", card:"#001a33", onAccent:"#fff" },
  ocean:   { name:"Ocean Depths",     desc:"Bioluminescent life, deep blue. Wave 4.", price:200,wave:4, animated:true, paper:"#001F3F", ink:"#F0F8FF", accent:"#00BFFF", alt:"#7FDBFF", shadow:"rgba(0,0,0,.7)", card:"#001a33", onAccent:"#fff" },
  glitch:  { name:"Glitch",           desc:"Digital artifacting, corrupted data. Wave 4.", price:200,wave:4, animated:true, paper:"#000000", ink:"#00FF00", accent:"#FF00FF", alt:"#FFFF00", shadow:"rgba(255,255,255,.2)", card:"#111", onAccent:"#000" },
  chroma:  { name:"Chroma Wave",      desc:"Liquid crystal, shifting hues. Wave 4.", price:250,wave:4, animated:true, paper:"#111", ink:"#fff", accent:"#00BFFF", alt:"#FF00FF", shadow:"rgba(255,255,255,.2)", card:"#222", onAccent:"#000" },
};
const SKIN_WAVE_GATE = 4;
const SKIN_WAVE_3_GATE = 7;
const SKIN_WAVE_4_GATE = 10;
const ThemeCtx = createContext(THEMES.riso);
const useT = () => useContext(ThemeCtx);
const ART = { paper:"#F2EDE2", ink:"#23306B", pink:"#FF5DA2", teal:"#2FA9A0" };

const PROMPTS = ["A creature made of weather","Your breakfast as a hero","A plant that shouldn't exist","Night swimming","A machine with feelings","The last lighthouse","Dancing mushrooms","A very smug cat","A city in a teacup","Something soft that bites","A tiny world inside a bottle","A map of somewhere imaginary","Two things that don't belong together","The smallest storm","An animal made of shadow"];
const weekOfYear=d=>Math.ceil((((d-new Date(d.getFullYear(),0,1))/86400000)+1)/7);
const WEEKLY_PROMPT=PROMPTS[(new Date().getFullYear()*53+weekOfYear(new Date()))%PROMPTS.length];
// ---- V2: LokServices backend (Supabase) — founder signups keep data long-term ----
const SUPA_URL="https://jfavkudihasswkhkouxq.supabase.co";
const SUPA_KEY="sb_publishable_ipcGPahvt2-j2YwBFBbvUQ_EJo2WJID";
async function founderSignup(handle,email,save_blob){
  const res=await fetch(`${SUPA_URL}/rest/v1/founder_signups`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:`Bearer ${SUPA_KEY}`,Prefer:"return=minimal"},body:JSON.stringify({handle,email:email||null,source:"lok_alpha",save_blob})});
  if(!res.ok)throw new Error("signup failed "+res.status);
  return true;
}
// ---- V2: velocity engine — feed pacing presets (spec §2.1) ----
const PACE_PRESETS={
  minimal:{name:"MINIMAL",desc:"Instant. Text-dense. No motion.",kill:true, mult:1},
  snap:   {name:"SNAP",   desc:"Quick springs, tight staggers.", kill:false,mult:0.6},
  sweep:  {name:"SWEEP",  desc:"Heavy easing, drifting cards.",  kill:false,mult:1},
  cinema: {name:"CINEMA", desc:"Full transitions, slow blur.",   kill:false,mult:1.8},
};
// ---- V2: Blot Shop — premium borders for the LilLok container (spec §4.2) ----
const BLOT_BORDERS=[
  {id:"none",  name:"Plain ink",     price:0},
  {id:"gilded",name:"Gilded ring",   price:45},
  {id:"washi", name:"Washi wrap",    price:35},
  {id:"orbit", name:"Orbit dashes",  price:60},
  {id:"liquid",name:"Liquid glow",   price:90},
];
const blotBorderStyle=(id,T)=>({
  none:  {border:`3px solid ${T.ink}`},
  gilded:{border:"3px solid #E8B14B",boxShadow:`0 0 0 2px ${T.ink}, 3px 3px 0 ${T.shadow}`},
  washi: {border:`3px dashed ${T.accent}`},
  orbit: {border:`3px dotted ${T.alt}`,outline:`2px dashed ${T.ink}`,outlineOffset:3},
  liquid:{border:`3px solid ${T.accent}`,boxShadow:`0 0 0 2px ${T.ink}, 0 0 16px 3px ${T.accent}`},
}[id]||{border:`3px solid ${T.ink}`});
const FOD_WINDOW_DAYS=7; // Flip of the Day no-repeat window (spec §4.1)
const ANIMATED_AVATAR_SPEND=5000; // lifetime Lok spend unlocks avatar animation (spec §2.2)
const ADS=[{text:"Your art could live here",cta:"Advertise",slot:"lok-feed-1"},{text:"Draw more. Earn more Loks.",cta:"Studio →",slot:"lok-feed-2"},{text:"LokPass — no ads, every theme",cta:"Get it",slot:"lok-feed-3"}];
const QUEST_POOL = [
  {id:"vote3",label:"Vote on 3 pieces",goal:3,reward:15,track:"vote"},
  {id:"view5",label:"Slide through 5 flips",goal:5,reward:15,track:"view"},
  {id:"draw1",label:"Publish 1 creation",goal:1,reward:25,track:"publish"},
  {id:"battle1",label:"Play a battle",goal:1,reward:20,track:"battle"},
  {id:"front5",label:"Grab 5 prompts in Rush",goal:5,reward:15,track:"front"},
  {id:"feed",label:"Lok in 2 artists",goal:2,reward:15,track:"lok"},
];
function makeQuests(){return [...QUEST_POOL].sort(()=>Math.random()-.5).slice(0,3).map(q=>({...q,progress:0,done:false}));}

function paperBase(ctx,pageNum=null,framed=true){
  ctx.fillStyle=ART.paper;ctx.fillRect(0,0,W,H);
  if(framed){ctx.strokeStyle="rgba(35,48,107,0.25)";ctx.lineWidth=2;ctx.strokeRect(18,18,W-36,H-36);}
  if(pageNum!==null){ctx.fillStyle="rgba(35,48,107,0.45)";ctx.font="700 20px monospace";ctx.textAlign="right";ctx.fillText(String(pageNum+1).padStart(2,"0"),W-30,H-30);ctx.textAlign="left";}
}
function risoCircle(ctx,x,y,rx,ry,off=5){
  ctx.fillStyle=ART.pink;ctx.beginPath();ctx.ellipse(x+off,y+off,rx,ry,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=ART.ink;ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();
}
function drawBounce(ctx,t){
  const g=500;ctx.strokeStyle=ART.ink;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(40,g+26);ctx.lineTo(W-40,g+26);ctx.stroke();
  const amp=(1-0.45*t)*320,h=Math.abs(Math.cos(t*Math.PI*1.6))*amp;
  const x=80+t*320,y=g-h,sq=h<26?1.45:1;
  ctx.save();ctx.strokeStyle="rgba(47,169,160,0.55)";ctx.lineWidth=4;ctx.setLineDash([2,14]);ctx.beginPath();
  for(let k=0;k<=24;k++){const tt=Math.max(0,t-0.22)+(k/24)*Math.min(0.22,t);const hh=Math.abs(Math.cos(tt*Math.PI*1.6))*(1-0.45*tt)*320,xx=80+tt*320;k===0?ctx.moveTo(xx,g-hh):ctx.lineTo(xx,g-hh);}ctx.stroke();ctx.restore();
  risoCircle(ctx,x,y-38/sq,38*sq,38/sq);
}
function drawBloom(ctx,t,i=0){
  const bx=240,by=520,hgt=360*Math.min(1,t*1.4);
  ctx.strokeStyle=ART.ink;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+36*Math.sin(t*3),by-hgt*0.5,bx+10*Math.sin(i),by-hgt);ctx.stroke();
  ctx.fillStyle=ART.teal;ctx.fillRect(bx-64,by-6,128,54);ctx.strokeRect(bx-64,by-6,128,54);
  if(t>0.32){const ls=Math.min(1,(t-0.32)*3);ctx.fillStyle=ART.teal;ctx.lineWidth=5;[[-1,0.62],[1,0.5]].forEach(([d,at])=>{ctx.beginPath();ctx.ellipse(bx+d*44*ls,by-hgt*at,46*ls,18*ls,d*0.5,0,Math.PI*2);ctx.fill();ctx.stroke();});}
  if(t>0.52){const ps=Math.min(1,(t-0.52)*2.4),cx2=bx+10*Math.sin(i),cy2=by-hgt;for(let p=0;p<6;p++){const a=(p/6)*Math.PI*2+t;risoCircle(ctx,cx2+Math.cos(a)*46*ps,cy2+Math.sin(a)*46*ps,30*ps,30*ps,4);}ctx.fillStyle=ART.teal;ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx2,cy2,26*ps,0,Math.PI*2);ctx.fill();ctx.stroke();}
}
function drawNight(ctx,t,i=0){
  ctx.fillStyle="rgba(35,48,107,0.93)";ctx.fillRect(26,26,W-52,H-52);
  for(let s=0;s<26;s++){if(s/26>t+0.15)continue;const sx=40+((s*137.5)%(W-80)),sy=40+((s*89.3)%(H*0.55));ctx.fillStyle=s%4===0?ART.pink:ART.paper;ctx.fillRect(sx,sy,5,5);}
  const my=470-330*t;ctx.fillStyle=ART.paper;ctx.beginPath();ctx.arc(372,my,56,0,Math.PI*2);ctx.fill();ctx.strokeStyle=ART.pink;ctx.lineWidth=6;ctx.beginPath();ctx.arc(366,my-6,56,0,Math.PI*2);ctx.stroke();
  const bx=50+360*t,by=230+46*Math.sin(t*9),flap=Math.sin(i*1.9)*0.9;
  ctx.fillStyle="#10183F";ctx.strokeStyle=ART.pink;ctx.lineWidth=3;
  [-1,1].forEach(d=>{ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+d*48,by-44*flap-12,bx+d*86,by-26*flap);ctx.quadraticCurveTo(bx+d*52,by+8,bx,by+12);ctx.fill();ctx.stroke();});
  ctx.beginPath();ctx.ellipse(bx,by+2,13,19,0,0,Math.PI*2);ctx.fill();ctx.stroke();
}
function renderSequence(painter,n){
  const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
  const out=[];for(let i=0;i<n;i++){ctx.clearRect(0,0,W,H);paperBase(ctx,i);painter(ctx,n===1?1:i/(n-1),i);out.push(c.toDataURL("image/png"));}return out;
}
function makeRng(seed){let s=seed%233280;return()=>((s=(s*9301+49297)%233280),s/233280);}
function makeDoodlePainter(seed){
  const r=makeRng(seed*7919+13),inks=[ART.ink,ART.pink,ART.teal],strokes=[],blobs=[];
  for(let b=0;b<2;b++)blobs.push({x:90+r()*300,y:110+r()*380,rx:30+r()*50,ry:30+r()*50});
  for(let s=0;s<15;s++){const pts=[[60+r()*360,70+r()*460]],segs=4+Math.floor(r()*5);for(let k=0;k<segs;k++){const[px,py]=pts[pts.length-1];pts.push([Math.max(40,Math.min(W-40,px+(r()-.5)*170)),Math.max(40,Math.min(H-40,py+(r()-.5)*170))]);}strokes.push({pts,color:inks[Math.floor(r()*3)],width:4+r()*8});}
  const total=blobs.length+strokes.length;
  return(ctx,t)=>{const upto=Math.floor(total*Math.max(0,Math.min(1,t)));let drawn=0;for(const b of blobs){if(drawn>=upto)return;risoCircle(ctx,b.x,b.y,b.rx,b.ry,4);drawn++;}ctx.lineCap="round";ctx.lineJoin="round";for(const s of strokes){if(drawn>=upto)return;ctx.strokeStyle=s.color;ctx.lineWidth=s.width;ctx.beginPath();s.pts.forEach(([x,y],k)=>(k===0?ctx.moveTo(x,y):ctx.lineTo(x,y)));ctx.stroke();drawn++;}};
}
function renderDoodle(seed,t){const c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");paperBase(ctx,null);makeDoodlePainter(seed)(ctx,t);return c.toDataURL("image/png");}
function renderAvatar(seed){
  const c=document.createElement("canvas");c.width=200;c.height=200;const ctx=c.getContext("2d");
  const r=makeRng(seed+7);ctx.fillStyle=ART.paper;ctx.fillRect(0,0,200,200);
  ctx.fillStyle=[ART.pink,ART.teal,"#E8B14B","#7A4FBF"][Math.floor(r()*4)];ctx.beginPath();ctx.ellipse(105,110,64,70,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=ART.ink;ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(100,105,64,70,0,0,Math.PI*2);ctx.stroke();
  const ey=95+r()*10;[78,122].forEach(ex=>{ctx.fillStyle=ART.ink;ctx.beginPath();ctx.arc(ex,ey,8,0,Math.PI*2);ctx.fill();});
  ctx.lineWidth=5;ctx.beginPath();ctx.arc(100,ey+22,16,0.15*Math.PI,0.85*Math.PI);ctx.stroke();
  return c.toDataURL("image/png");
}

const NAME_COLOR_MAP={default:null,pink:"#FF5DA2",teal:"#2FA9A0",gold:"#E8B14B",violet:"#7A4FBF",rainbow:"rainbow",fire:"fire",ice:"ice"};
function NameTag({name,color,className,style}){
  const c=NAME_COLOR_MAP[color];
  if(c==="rainbow")return<span className={className} style={{...style,background:"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0,#7A4FBF)",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent"}}>{name}</span>;
  if(c==="fire")return<span className={className} style={{...style,background:"linear-gradient(90deg, #FFD700, #FF8C00, #FF4500, #FF8C00, #FFD700)", WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent", animation:"lokfire 2s linear infinite"}}>{name}</span>;
  if(c==="ice")return<span className={className} style={{...style,background:"linear-gradient(90deg, #A0D2EB, #E5E5E5, #A0D2EB, #B0E0E6, #A0D2EB)", WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent", animation:"lokice 3s linear infinite"}}>{name}</span>;
  return<span className={className} style={{...style,color:c||style?.color}}>{name}</span>;
}
function FramedAvatar({src,size=64,frame="none",accent="none",ink="#23306B",acc="#FF5DA2",animated=false}){
  const fs={none:{border:`3px solid ${ink}`},double:{border:`3px solid ${ink}`,outline:`3px solid ${ink}`,outlineOffset:3},dashed:{border:`3px dashed ${ink}`},tape:{border:`3px solid ${ink}`},glow:{border:`3px solid ${acc}`,boxShadow:`0 0 0 2px ${ink}, 0 0 14px 2px ${acc}`}}[frame]||{border:`3px solid ${ink}`};
  return(<div className="relative" style={{width:size,height:size}}>
    {accent==="ring"&&<div className="absolute rounded-full" style={{inset:-5,border:`3px solid ${acc}`}}/>}
    {accent==="halo"&&<div className="absolute rounded-full" style={{inset:-7,border:`3px dashed ${acc}`,animation:reduceMotion?"none":"lokspin 9s linear infinite"}}/>}
    {accent==="crown"&&<div className="absolute" style={{top:-size*0.34,left:"50%",transform:"translateX(-50%)",fontSize:size*0.42,lineHeight:1}}><svg width={size*0.6} height={size*0.34} viewBox="0 0 60 34"><path d="M4 32 L8 8 L20 22 L30 4 L40 22 L52 8 L56 32 Z" fill={acc} stroke={ink} strokeWidth="3" strokeLinejoin="round"/></svg></div>}
    <img src={src} alt="avatar" className="relative w-full h-full rounded-full" style={{objectFit:"cover",...fs,...(animated&&!reduceMotion?{animation:"lokshimmer 2.6s ease-in-out infinite"}:{})}}/>
    {frame==="tape"&&[["-6px","-6px","-18deg"],["auto","-6px","16deg"]].map(([l,t,rot],i)=>(
      <div key={i} className="absolute" style={{left:l==="auto"?"auto":l,right:l==="auto"?"-6px":"auto",top:t,width:size*0.34,height:12,background:acc,opacity:0.7,transform:`rotate(${rot})`,border:`1px solid ${ink}`}}/>))}
  </div>);
}

const REACTION_SETS={base:["splat","heart","drip"],stars:["star","sparkle","comet"],fire:["flame","bolt2","skull2"],zen:["leaf","wave2","lotus"]};
const ReactionIcon=({type,size=24})=>{
  const P=(d,fill=ART.pink,dash)=>(<svg width={size} height={size} viewBox="0 0 32 32"><path d={d} fill={fill==="none"?"none":fill} stroke={ART.ink} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash}/></svg>);
  switch(type){
    case"splat":return(<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 5 L19 12 L27 11 L21 17 L26 24 L17 21 L13 28 L12 20 L4 19 L11 14 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.6" strokeLinejoin="round"/><circle cx="16" cy="16" r="3" fill={ART.ink}/></svg>);
    case"heart":return(<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 27 C4 18 5 8 11 7 C14 6.6 16 9 16 11 C16 9 18 6.6 21 7 C27 8 28 18 16 27 Z" fill="none" stroke={ART.pink} strokeWidth="2.6" strokeDasharray="3 2" strokeLinejoin="round"/></svg>);
    case"drip":return(<svg width={size} height={size} viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="9" rx="2" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6"/><path d="M11 14 C11 20 9.5 21 9.5 24 a2.6 2.6 0 0 0 5.2 0 C14.7 21 13 20 13 14 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6"/><path d="M21 14 C21 17.4 20 18 20 20 a1.9 1.9 0 0 0 3.8 0 C23.8 18 23 17.4 23 14 Z" fill={ART.teal} stroke={ART.ink} strokeWidth="1.6"/></svg>);
    case"star":return P("M16 3 L20 12 L30 13 L22 20 L25 30 L16 24 L7 30 L10 20 L2 13 L12 12 Z","#E8B14B");
    case"sparkle":return P("M16 3 Q18 14 29 16 Q18 18 16 29 Q14 18 3 16 Q14 14 16 3 Z","#E8B14B");
    case"comet":return(<svg width={size} height={size} viewBox="0 0 32 32"><path d="M4 28 L20 12" stroke={ART.teal} strokeWidth="3" strokeLinecap="round"/><circle cx="23" cy="9" r="6" fill="#E8B14B" stroke={ART.ink} strokeWidth="2"/></svg>);
    case"flame":return P("M16 3 C20 10 26 12 22 22 C26 18 24 28 16 30 C8 28 6 18 10 22 C8 14 14 12 13 6 C15 9 14 11 16 13 C17 10 16 6 16 3 Z","#FF8A5C");
    case"bolt2":return P("M18 2 L6 18 L14 18 L12 30 L26 12 L17 12 Z","#E8B14B");
    case"skull2":return(<svg width={size} height={size} viewBox="0 0 32 32"><path d="M16 3 C8 3 5 9 5 14 C5 18 8 19 8 22 L24 22 C24 19 27 18 27 14 C27 9 24 3 16 3 Z" fill={ART.pink} stroke={ART.ink} strokeWidth="1.8"/><circle cx="12" cy="14" r="2.5" fill={ART.ink}/><circle cx="20" cy="14" r="2.5" fill={ART.ink}/><path d="M11 25 L11 29 M16 25 L16 29 M21 25 L21 29" stroke={ART.ink} strokeWidth="2"/></svg>);
    case"leaf":return P("M6 26 C6 12 18 6 26 6 C26 20 14 26 6 26 Z M10 22 C16 16 20 12 24 10","#3E8E4B");
    case"wave2":return(<svg width={size} height={size} viewBox="0 0 32 32"><path d="M3 12 Q8 6 13 12 T23 12 T29 12 M3 20 Q8 14 13 20 T23 20 T29 20" fill="none" stroke={ART.teal} strokeWidth="2.4" strokeLinecap="round"/></svg>);
    case"lotus":return P("M16 28 C9 24 6 18 8 12 C12 16 14 18 16 24 C18 18 20 16 24 12 C26 18 23 24 16 28 Z","#7A4FBF");
    default:return P("M16 5 L19 12 L27 11 L21 17 L26 24 L17 21 L13 28 L12 20 L4 19 L11 14 Z",ART.pink);
  }
};

const PageEffect=({effect})=>{
  if(effect==="rain")return(<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:60}}>{Array.from({length:30}).map((_,i)=>(<div key={i} className="absolute" style={{left:`${(i*37)%100}%`,top:-20,width:2,height:60,background:"rgba(47,169,160,.4)",animation:reduceMotion?"none":`lokrain ${0.7+(i%5)*0.12}s linear infinite`,animationDelay:`${(i%7)*0.1}s`}}/>))}</div>);
  if(effect==="confetti")return(<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:60}}>{Array.from({length:40}).map((_,i)=>{const cs=["#FF5DA2","#2FA9A0","#E8B14B","#7A4FBF","#5E8BFF"];return(<div key={i} className="absolute" style={{left:`${(i*27)%100}%`,top:-12,width:7,height:11,background:cs[i%5],animation:reduceMotion?"none":`lokconf ${3.5+(i%5)*0.6}s linear infinite`,animationDelay:`${(i%8)*0.35}s`,borderRadius:2}}/>);})}</div>);
  if(effect==="aurora")return(<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:60}}><div className="absolute inset-x-0 top-0" style={{height:"55%",background:"linear-gradient(180deg, rgba(47,169,160,.28), rgba(122,79,191,.18) 50%, transparent)",filter:"blur(28px)",animation:reduceMotion?"none":"lokaurora 9s ease-in-out infinite alternate",mixBlendMode:"screen"}}/></div>);
  if(effect==="embers")return(<div className="pointer-events-none fixed inset-0 overflow-hidden" style={{zIndex:60}}>{Array.from({length:24}).map((_,i)=>(<div key={i} className="absolute rounded-full" style={{left:`${(i*41)%100}%`,bottom:-10,width:5,height:5,background:i%2?"#FF8A5C":"#FF5DA2",animation:reduceMotion?"none":`lokember ${3+(i%4)}s ease-in infinite`,animationDelay:`${(i%6)*0.4}s`}}/>))}</div>);
  return null;
};

const LILLOK_SPEECH={
  thriving:["Feeling inky today","Drawing energy: full","I see good lines ahead","Ready to blot the world","Peak ink. Peak vibes.","Full tank. Let's draw.","Ink flowing, heart glowing"],
  decaying:["...ink low","Getting a little dry here","My lines are getting thin","Running on fumes","One drop would change everything","The colors are going grey"],
  critical:["I'm fading fast...","Please — ink, now","Almost out. Don't leave me grey.","This is the last of my ink"],
  stasis:["Zzz...","...dreaming of ink","So... cold...","Still here. Barely.","The bond held. Wake me up."],
  win:["WE WON!!!","That's what ink looks like!","Nobody out-draws us","I told you we were good"],
  loss:["Next time.","We learned something.","Draw more, fear less."],
  publish:["It's out there now","The world can flip it","I'm proud of that one"],
  battle_start:["Let's go. Draw fast.","I'm watching your lines","Make every stroke count"],
  feed_scroll:["Good art in the feed today","Something in here will spark you","This is where the ideas live"],
  quest_done:["Quest complete!","You did what you said you would","Keep drawing, keep earning"],
};
function getLilLokLine(phase="thriving",ctx=""){
  if(!ctx){const h=new Date().getHours();if(phase==="thriving"&&h>=5&&h<10)return"Good morning. First lines of the day.";if(phase==="thriving"&&h>=21)return"Late-night drawing session?";}
  const pool=(ctx&&LILLOK_SPEECH[ctx])?LILLOK_SPEECH[ctx]:(LILLOK_SPEECH[phase]||LILLOK_SPEECH.thriving);
  return pool[Math.floor(Math.random()*pool.length)];
}
function lilLokPhase(s){if(s.stasis)return"stasis";if(s.ink<15)return"critical";if(s.ink<35)return"decaying";return"thriving";}
function LilLokBubble({text,ink=ART.ink,paper=ART.paper}){
  if(!text)return null;
  return(<div className="lok-display" style={{position:"absolute",bottom:"104%",left:"50%",transform:"translateX(-50%)",background:paper,border:`2.5px solid ${ink}`,borderRadius:12,padding:"5px 11px",fontSize:11,fontWeight:700,color:ink,boxShadow:`2px 2px 0 ${ink}`,animation:"lokrise .2s ease",maxWidth:180,textAlign:"center",zIndex:99,pointerEvents:"none",whiteSpace:"normal",width:"max-content"}}>
    {text}
    <div style={{position:"absolute",bottom:-9,left:"50%",transform:"translateX(-50%)",borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:`9px solid ${ink}`}}/>
    <div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`7px solid ${paper}`}}/>
  </div>);
}
const LilLokSprite=({phase,ink,size=88,custom})=>{
  if(custom&&custom[phase==="critical"?"decaying":phase])return(<img src={custom[phase==="critical"?"decaying":phase]} alt="lillok" width={size} height={size} style={{width:size,height:size,objectFit:"contain",animation:phase==="stasis"||reduceMotion?"none":phase==="thriving"?"lokbob 2.4s ease-in-out infinite":"lokbob 4s ease-in-out infinite"}}/>);
  const crit=phase==="critical",grey=phase==="decaying"||crit,stone=phase==="stasis";
  const body=stone?"#9A9286":grey?"#8E93A8":ART.pink;
  const eyeY=grey?54:50;const inkPct=Math.max(0,Math.min(100,ink||0));const cid=`blotClip${size}`;
  return(<svg width={size} height={size} viewBox="0 0 100 100" style={{animation:stone||reduceMotion?"none":phase==="thriving"?"lokbob 2.4s ease-in-out infinite":"lokbob 4s ease-in-out infinite"}}>
    <defs><clipPath id={cid}><ellipse cx={48} cy={48} rx={28} ry={30}/></clipPath></defs>
    {!stone&&<ellipse cx={52} cy={48} rx={30} ry={32} fill={body} opacity={0.9}/>}
    <ellipse cx={48} cy={48} rx={30} ry={32} fill="none" stroke={ART.ink} strokeWidth="5"/>
    {stone&&<ellipse cx={48} cy={48} rx={30} ry={32} fill={body}/>}
    {!stone&&<rect clipPath={`url(#${cid})`} x={20} y={48+30*(1-inkPct/100)} width={58} height={62} fill={grey?"#6E80B0":ART.teal} opacity={0.3}/>}
    {!stone&&<><circle cx={38} cy={eyeY} r={grey?3.5:5} fill={ART.ink}/><circle cx={58} cy={eyeY} r={grey?3.5:5} fill={ART.ink}/></>}
    {phase==="thriving"&&<><circle cx={40} cy={eyeY-2} r={1.5} fill="#fff" opacity={0.85}/><circle cx={60} cy={eyeY-2} r={1.5} fill="#fff" opacity={0.85}/></>}
    {stone&&<><path d="M33 50 Q38 46 43 50" fill="none" stroke={ART.ink} strokeWidth="3" strokeLinecap="round"/><path d="M53 50 Q58 46 63 50" fill="none" stroke={ART.ink} strokeWidth="3" strokeLinecap="round"/></>}
    {phase==="thriving"&&<path d="M38 62 Q48 72 60 62" fill="none" stroke={ART.ink} strokeWidth="4" strokeLinecap="round"/>}
    {phase==="decaying"&&<path d="M40 66 Q48 60 58 66" fill="none" stroke={ART.ink} strokeWidth="4" strokeLinecap="round"/>}
    {crit&&<path d="M39 66 Q48 63 59 66" fill="none" stroke={ART.ink} strokeWidth="3.5" strokeLinecap="round"/>}
    {stone&&<><path d="M40 64 L58 64" stroke={ART.ink} strokeWidth="4" strokeLinecap="round"/>
      <text x={66} y={37} fontSize={9} fill={ART.ink} opacity={0.35} fontWeight="700">z</text>
      <text x={73} y={27} fontSize={12} fill={ART.ink} opacity={0.6} fontWeight="700">Z</text>
      <text x={81} y={16} fontSize={15} fill={ART.ink} opacity={0.85} fontWeight="700">Z</text></>}
    {phase==="thriving"&&<circle cx={70} cy={30} r={5} fill={ART.teal} stroke={ART.ink} strokeWidth="2"/>}
  </svg>);
};

const InterventionFX=({kind,seed=1})=>{
  const r=makeRng(seed*53+9);const col=kind==="blot"?ART.teal:ART.pink;
  const pts=[];const N=16;for(let i=0;i<N;i++){const a=(i/N)*Math.PI*2;const rad=i%2?60+r()*70:130+r()*60;pts.push([200+Math.cos(a)*rad,250+Math.sin(a)*rad]);}
  const path=pts.map(([x,y],i)=>(i===0?`M${x} ${y}`:`Q200 250 ${x} ${y}`)).join(" ")+" Z";
  const drops=Array.from({length:9},()=>({x:40+r()*320,y:40+r()*420,rr:8+r()*26}));
  return(<div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{animation:"lokfxin .35s cubic-bezier(.2,1.4,.4,1)"}}>
    <svg viewBox="0 0 400 500" className="w-full h-full">
      <path d={path} fill={col} opacity="0.85" transform="translate(6 6)"/>
      <path d={path} fill="none" stroke={ART.ink} strokeWidth="7" strokeLinejoin="round"/>
      <path d={path} fill={col} opacity="0.5"/>
      {drops.map((d,i)=>(<g key={i}><circle cx={d.x+4} cy={d.y+4} r={d.rr} fill={col} opacity="0.8"/><circle cx={d.x} cy={d.y} r={d.rr} fill="none" stroke={ART.ink} strokeWidth="4"/></g>))}
    </svg>
  </div>);
};

const EMPTY_ICONS={
  default:<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="24" cy="24" r="10" fill="currentColor" opacity=".12"/><path d="M20 8 C20 8 32 18 32 24 C32 30 27 34 20 34 C13 34 8 30 8 24 C8 18 20 8 20 8Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="none"/></svg>,
  feed:<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="6" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="3" fill="none" opacity=".2"/><circle cx="28" cy="12" r="7" fill="currentColor" opacity=".3"/><path d="M12 20 L28 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M6 34 L20 22 L28 28 L34 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>,
  bookmarks:<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10 6 H30 C31 6 32 7 32 8 V34 L20 26 L8 34 V8 C8 7 9 6 10 6Z" stroke="currentColor" strokeWidth="3" fill="none"/><path d="M15 15 H25 M15 20 H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  follow:<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="16" cy="14" r="6" stroke="currentColor" strokeWidth="3" fill="none"/><path d="M6 32 C6 24 10 20 16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5"/><circle cx="28" cy="26" r="6" fill="currentColor" opacity=".2"/><path d="M25 26 L27 28 L32 23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  search:<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="18" cy="18" r="10" stroke="currentColor" strokeWidth="3" fill="none"/><path d="M26 26 L34 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M14 18 H22 M18 14 V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/></svg>,
};
function EmptyState({icon="default",title,subtitle,action,onAction}){
  const T=useT();
  return(<div className="flex flex-col items-center text-center py-12 px-6 mt-4 rounded-2xl" style={{border:`2px dashed ${T.shadow}`}}>
    <div style={{color:T.ink,opacity:0.35,marginBottom:12}}>{EMPTY_ICONS[icon]||EMPTY_ICONS.default}</div>
    <div className="lok-display font-extrabold text-base mb-1" style={{color:T.ink}}>{title}</div>
    {subtitle&&<div className="text-sm opacity-60 mb-4 max-w-xs leading-snug">{subtitle}</div>}
    {action&&onAction&&<button onClick={onAction} className="lok-btn lok-display px-4 py-2 rounded-xl font-bold text-sm" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>{action}</button>}
  </div>);
}
function Empty({text}){return<EmptyState title={text}/>;}

function GlobalStyle({T,pace="sweep",speed=1}){
  const P=PACE_PRESETS[pace]||PACE_PRESETS.sweep;
  const m=((P.mult||1)/Math.max(0.25,speed)).toFixed(3); // preset × user speed slider (0.5×–2×)
  return(<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Schibsted+Grotesk:wght@400;500;700&display=swap');
  @keyframes lokdrift{from{transform:translateX(0)}to{transform:translateX(200vw)}}
  @keyframes lokrain{from{transform:translateY(-20px)}to{transform:translateY(100vh)}}
  @keyframes lokember{from{transform:translateY(0) scale(1);opacity:.9}to{transform:translateY(-100vh) scale(.4);opacity:0}}
  @keyframes lokconf{0%{transform:translateY(-12px) rotate(0)}100%{transform:translateY(100vh) rotate(540deg)}}
  @keyframes lokaurora{0%{transform:translateX(-6%) skewX(-4deg);opacity:.7}100%{transform:translateX(6%) skewX(4deg);opacity:1}}
  @keyframes lokspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes lokquake{0%,88%,100%{transform:translate(0,0)}89%{transform:translate(-5px,3px) rotate(-.4deg)}91%{transform:translate(6px,-4px) rotate(.4deg)}93%{transform:translate(-6px,-3px)}95%{transform:translate(5px,4px) rotate(-.3deg)}97%{transform:translate(-3px,2px)}}
  @keyframes lokshake{0%,100%{transform:translate(0,0)}10%{transform:translate(-14px,8px) rotate(-1.6deg)}25%{transform:translate(15px,-10px) rotate(1.6deg)}40%{transform:translate(-12px,-8px) rotate(-1deg)}55%{transform:translate(13px,9px) rotate(1deg)}70%{transform:translate(-9px,5px)}85%{transform:translate(7px,-5px)}}
  @keyframes lokfxin{0%{opacity:0;transform:scale(.3) rotate(-8deg)}55%{opacity:1;transform:scale(1.12) rotate(3deg)}100%{opacity:.96;transform:scale(1) rotate(0)}}
  @keyframes lokfloat{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-110px) scale(1.5) rotate(-12deg)}}
  @keyframes lokpop{0%{transform:scale(.4) rotate(-14deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1)}}
  @keyframes lokpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes lokbob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
  @keyframes lokrise{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes loktab{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes loknudge{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
  @keyframes lokcount{from{opacity:0;transform:translateY(-6px) scale(1.3)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes lokwobble{0%,92%,100%{transform:translate(0,0)}93%{transform:translate(-2px,1px) rotate(-.15deg)}95%{transform:translate(1.5px,-1px) rotate(.15deg)}97%{transform:translate(-1px,.5px)}}
  @keyframes loksheen{from{background-position:200% 0}to{background-position:-50% 0}}
  @keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes chromawave{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes lokfire{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes lokice{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
  @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}
  *{-webkit-tap-highlight-color:transparent}
  html{scroll-behavior:smooth}
  body{text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
  .lok-display{font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-0.01em}
  .lok-btn{transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s ease,filter .14s ease;will-change:transform}
  .lok-btn:hover{filter:brightness(1.04)}
  .lok-btn:active{transform:scale(.92)}
  .lok-tabin{animation:loktab .32s cubic-bezier(.22,1,.36,1)}
  .lok-count{display:inline-block;animation:lokcount .25s ease}
  button:focus-visible,[tabindex]:focus-visible{outline:3px solid ${T.accent};outline-offset:2px;border-radius:6px}
  ::-webkit-scrollbar{width:0;height:0}
  @keyframes lokshimmer{0%,100%{box-shadow:0 0 0 2px ${T.ink}, 0 0 10px 1px ${T.accent}}50%{box-shadow:0 0 0 2px ${T.ink}, 0 0 18px 4px ${T.alt}}}
  .lok-tabin{animation-duration:calc(.32s * ${m})}
  .lok-btn{transition-duration:calc(.14s * ${m})}
  ${P.kill?`.lok-tabin,.lok-count{animation:none!important}.lok-btn{transition:none!important}`:``}
  @supports(-webkit-touch-callout:none){input,textarea,select{font-size:16px!important}}
  @media(prefers-reduced-motion:reduce){*,.lok-btn{animation-duration:.001ms!important;transition-duration:.05ms!important}html{scroll-behavior:auto}}
`}</style>);}

const MiniDraw=forwardRef(function MiniDraw({color=ART.pink,width=12,bg=ART.paper},ref){
  const cRef=useRef(null);const drawing=useRef(false);const last=useRef(null);const strokes=useRef(0);
  useImperativeHandle(ref,()=>({snapshot(){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const x=tmp.getContext("2d");paperBase(x,null);x.drawImage(cRef.current,0,0);return tmp.toDataURL("image/png");},clear(){cRef.current.getContext("2d").clearRect(0,0,W,H);strokes.current=0;},strokes:()=>strokes.current}));
  const pos=e=>{const r=cRef.current.getBoundingClientRect();return[(e.clientX-r.left)*(W/r.width),(e.clientY-r.top)*(H/r.height)];};
  const dn=e=>{e.preventDefault();cRef.current.setPointerCapture(e.pointerId);drawing.current=true;last.current=pos(e);strokes.current++;};
  const mv=e=>{if(!drawing.current)return;const ctx=cRef.current.getContext("2d");const p=pos(e);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(...(last.current||p));ctx.lineTo(...p);ctx.stroke();last.current=p;};
  const up=()=>{drawing.current=false;last.current=null;};
  return<canvas ref={cRef} width={W} height={H} onPointerDown={dn} onPointerMove={mv} onPointerUp={up} onPointerLeave={up} className="w-full rounded-xl" style={{aspectRatio:"4/5",background:bg,touchAction:"none",cursor:"crosshair"}}/>;
});

const REVIVAL_MAX=14;
function LilLokPanel({lillok,phase,kids,custom,loks=0,onFeed,onFlask,onClose,say,setLillok,onPublish,onSaveCustom}){
  const T=useT();
  const[mode,setMode]=useState("care");
  const[feeding,setFeeding]=useState(false);
  const[panelLine,setPanelLine]=useState(()=>getLilLokLine(phase));
  const doFeed=(amt,viaFlask)=>{if(viaFlask){if(!onFlask||!onFlask())return;}else{onFeed(amt);}setPanelLine(getLilLokLine("thriving"));setFeeding(true);setTimeout(()=>setFeeding(false),700);};
  const draw=useRef(null);
  const[color,setColor]=useState(ART.pink);
  const[frames,setFrames]=useState([]);
  const[paceMs,setPaceMs]=useState(180);
  const[pv,setPv]=useState(0);
  const[bName,setBName]=useState(lillok.name==="Blot"?"":lillok.name);
  const[emotion,setEmotion]=useState("thriving");
  const[bArt,setBArt]=useState(custom?.art||{});
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const swatches=[ART.ink,ART.pink,ART.teal,"#E8B14B","#7A4FBF"];
  const capture=()=>{if(frames.length>=REVIVAL_MAX){say(`Max ${REVIVAL_MAX} pages`);return;}setFrames(f=>[...f,draw.current.snapshot()]);draw.current.clear();};
  const finishRevive=()=>{onFeed(Math.min(80,30+frames.length*6),"revival");say(`${lillok.name} rehydrated!`,"success");};
  const publishRevival=()=>{if(frames.length<2){say("Draw at least 2 pages");return;}onPublish({id:"r"+Date.now(),title:"Revival animation",frames,paceMs,mode:"A",style:"revival",loop:true,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"revival"});finishRevive();setFrames([]);};
  return(<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div className="w-full rounded-t-3xl p-5 overflow-y-auto" style={{maxWidth:560,maxHeight:"92vh",background:T.card,border:`3px solid ${(phase==="decaying"||phase==="critical")?"#8E93A8":T.ink}`,animation:(phase==="decaying"||phase==="critical")&&!reduceMotion?"lokwobble 9s ease-in-out infinite":"lokrise .25s ease"}} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-2 relative" style={{background:T.paper,border:`3px solid ${T.ink}`,transform:feeding?"scale(1.08)":"scale(1)",transition:"transform .15s cubic-bezier(.34,1.56,.64,1)"}}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={64} custom={custom?.art}/>
          {feeding&&[0,1,2].map(i=>(<div key={i} className="absolute pointer-events-none" style={{left:`${22+i*24}%`,bottom:"85%",fontSize:15,animation:`lokfloat .65s ease-out ${i*0.1}s forwards`}}>💧</div>))}
        </div>
        <div className="flex-1"><div className="lok-display text-xl font-extrabold">{lillok.name} <span className="text-sm font-bold opacity-60">· {phase}</span></div><div className="text-xs opacity-70">Living Ink companion</div></div>
        <button onClick={onClose} className="lok-btn px-3 py-1 rounded-lg font-bold" style={{border:`2.5px solid ${T.ink}`}} aria-label="Close LilLok panel">✕</button>
      </div>
      <div className="mt-3 flex gap-1.5">{[["care","Care"],["revive","Revival animator"],["build","Make your own"]].map(([id,l])=>(
        <button key={id} onClick={()=>setMode(id)} className="lok-btn flex-1 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`,background:mode===id?T.ink:T.card,color:mode===id?T.paper:T.ink}}>{l}</button>))}</div>
      {mode==="care"&&(<>
        <div className="mt-3 rounded-xl p-3" style={{background:phase==="critical"?"rgba(200,50,50,.08)":phase==="decaying"?"rgba(142,147,168,.1)":phase==="stasis"?"rgba(154,146,134,.12)":"rgba(47,169,160,.09)",border:`1.5px solid ${phase==="thriving"?T.alt:"#8E93A8"}`}}>
          <div className="font-bold text-sm">{phase==="thriving"?`${lillok.name} is thriving`:phase==="critical"?`${lillok.name} is about to go quiet`:phase==="decaying"?`${lillok.name} is drying out`:`${lillok.name} is in stasis`}</div>
          <div className="text-xs opacity-70 mt-0.5">{kids?`${lillok.name} loves drawing with you!`:phase==="thriving"?"Interventions hit harder · keep drawing":phase==="critical"?"Feed ink now or matches get harder":phase==="decaying"?"Bond slows the drain. Draw something to nourish it.":"Bond held through stasis. Do a Revival Sketch to wake up."}</div>
        </div>
        <div className="mt-3 space-y-2">{[["Ink",lillok.ink,phase==="thriving"?T.alt:phase==="stasis"?"#9A9286":"#8E93A8"],["Bond",lillok.bond,T.accent]].map(([label,val,col])=>(
          <div key={label}><div className="flex justify-between text-xs font-bold"><span>{label}{label==="Bond"&&<span className="opacity-50 font-normal"> · slows ink drain</span>}</span><span>{Math.round(val)}</span></div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{background:T.shadow}}><div style={{width:`${val}%`,height:"100%",background:col,transition:"width .4s ease"}}/></div></div>))}</div>
        <div className="mt-2.5 text-sm font-bold" style={{color:T.alt,fontStyle:"italic"}}>"{panelLine}"</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={()=>doFeed(20,false)} className="lok-btn lok-display p-2.5 rounded-xl text-left font-extrabold" style={{background:T.alt,color:"#fff",border:`3px solid ${T.ink}`}} aria-label="Quick ink drop">
            <div className="text-sm">Quick drop</div><div className="text-[11px] font-bold opacity-80">+20 ink · free</div>
          </button>
          <button onClick={()=>doFeed(40,true)} disabled={kids||loks<10} className="lok-btn lok-display p-2.5 rounded-xl text-left font-extrabold" style={{background:kids||loks<10?T.shadow:T.accent,color:kids||loks<10?T.ink:T.onAccent,border:`3px solid ${T.ink}`,opacity:kids||loks<10?0.55:1}} aria-label="Ink flask">
            <div className="text-sm">Ink flask</div><div className="text-[11px] font-bold opacity-80">+40 ink · 10 Loks</div>
          </button>
        </div>
      </>)}
      {mode==="revive"&&(<>
        <p className="mt-2 text-xs opacity-70">Draw up to {REVIVAL_MAX} pages — capture each, and it becomes a looping revival animation you can publish.</p>
        <div className="mt-2 flex gap-2">{swatches.map(c=>(<button key={c} onClick={()=>setColor(c)} className="lok-btn w-7 h-7 rounded-full" style={{background:c,border:`3px solid ${color===c?T.accent:T.ink}`}} aria-label={`Color ${c}`}/>))}</div>
        <div className="mt-2"><MiniDraw ref={draw} color={color}/></div>
        <div className="mt-2 flex gap-2">
          <button onClick={capture} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{background:T.ink,color:T.paper}}>Capture page {frames.length+1}/{REVIVAL_MAX}</button>
          {frames.length>=2&&<button onClick={publishRevival} className="lok-btn lok-display flex-1 py-2.5 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Publish + feed</button>}
        </div>
        {frames.length>0&&(<>
          <div className="mt-2 flex items-center gap-2">
            <img src={frames[Math.min(pv,frames.length-1)]} alt="loop" className="rounded-lg" style={{width:72,aspectRatio:"4/5",objectFit:"cover",border:`2.5px solid ${T.ink}`}}/>
            <div className="flex-1"><div className="text-xs font-bold">Loop · {paceMs}ms</div><input type="range" min="120" max="600" step="20" value={paceMs} onChange={e=>setPaceMs(+e.target.value)} className="w-full" style={{accentColor:T.accent}} aria-label="Loop pace"/></div>
            <button onClick={()=>setFrames([])} className="lok-btn text-xs font-bold px-2 py-1 rounded-lg" style={{border:`2px solid ${T.ink}`}}>reset</button>
          </div>
          <button onClick={finishRevive} className="lok-btn lok-display mt-2 w-full py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`}}>Just feed (no publish)</button>
        </>)}
      </>)}
      {mode==="build"&&(<>
        <p className="mt-2 text-xs opacity-70">Draw your own LilLok — one face per emotion.</p>
        <div className="mt-2 flex gap-1.5">{[["thriving","Happy"],["decaying","Grumpy"],["stasis","Asleep"]].map(([id,l])=>(
          <button key={id} onClick={()=>setEmotion(id)} className="lok-btn flex-1 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${bArt[id]?T.alt:T.ink}`,background:emotion===id?T.ink:T.card,color:emotion===id?T.paper:T.ink}}>{l}{bArt[id]?" ✓":""}</button>))}</div>
        <div className="mt-2 flex gap-2">{swatches.map(c=>(<button key={c} onClick={()=>setColor(c)} className="lok-btn w-7 h-7 rounded-full" style={{background:c,border:`3px solid ${color===c?T.accent:T.ink}`}} aria-label={`Color ${c}`}/>))}</div>
        <div className="mt-2"><MiniDraw ref={draw} key={emotion} color={color}/></div>
        <button onClick={()=>{setBArt(a=>({...a,[emotion]:draw.current.snapshot()}));draw.current.clear();say(`${emotion} face saved`);}} className="lok-btn lok-display mt-2 w-full py-2 rounded-xl font-bold text-sm" style={{background:T.ink,color:T.paper}}>Save {emotion} face</button>
        <input value={bName} onChange={e=>setBName(e.target.value)} placeholder="Name your LilLok" className="mt-2 w-full px-3 py-2.5 rounded-xl font-bold" style={{border:`3px solid ${T.ink}`,background:T.paper,color:T.ink}} aria-label="LilLok name"/>
        <button onClick={()=>{if(!bName.trim()){say("Give it a name");return;}if(!bArt.thriving||!bArt.decaying||!bArt.stasis){say("Draw all 3 emotions first");return;}onSaveCustom({name:bName.trim(),art:bArt});onClose();}} className="lok-btn lok-display mt-2 w-full py-3 rounded-xl font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>Submit my LilLok</button>
      </>)}
    </div>
  </div>);
}

function Onboard({onDone}){
  const T=useT();const[step,setStep]=useState(0);
  const steps=[{t:"Welcome to LokBook",d:"A home for tiny hand-drawn animations. Slide down any post to flip through its pages."},{t:"Lok what you love",d:"Lok artists to follow them, vote on pieces, and bookmark favorites — creators earn Loks from your attention."},{t:"Draw, battle, earn",d:"Make flips in Studio, go head-to-head in Battle, grab prompts in Rush. Turn on sound 🎵 for best experience."},{t:"Meet your LilLok",d:"A living-ink buddy that grows with you. Here are 50 Loks to begin — have fun."}];
  const s=steps[step];
  return(<div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{background:"rgba(0,0,0,.55)"}}>
    <div className="w-full rounded-3xl p-6 text-center" style={{maxWidth:420,background:T.card,border:`3px solid ${T.ink}`,boxShadow:`8px 8px 0 ${T.accent}`,animation:"lokrise .3s ease"}}>
      <div className="lok-display text-2xl font-extrabold mb-2" style={{color:T.accent}}>{s.t}</div>
      <p className="text-sm leading-snug">{s.d}</p>
      <div className="flex justify-center gap-1.5 my-4">{steps.map((_,i)=>(<div key={i} style={{width:i===step?22:8,height:6,borderRadius:4,background:i<=step?T.accent:T.shadow,transition:"width .2s"}}/>))}</div>
      <button onClick={()=>step<steps.length-1?setStep(step+1):onDone()} className="lok-btn lok-display w-full py-3 rounded-xl text-lg font-extrabold" style={{background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`}}>{step<steps.length-1?"Next":"Claim 50 Loks & start"}</button>
      {step<steps.length-1&&<button onClick={onDone} className="mt-2 text-xs font-bold underline opacity-60">skip</button>}
    </div>
  </div>);
}

function Feed({posts,bookmarks,following,feedMode,setFeedMode,cosmetics={},daily,streak,dailyClaimed,flipOfDay,onLine,onClaimDaily,onOpen,onVote,onLok,onBookmark,say}){
  const T=useT();const[active,setActive]=useState(0);const wrapRef=useRef(null);
  const loked=following.includes("moss.ink");
  const list=feedMode==="following"?(loked?posts:[]):posts;
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
    <div className="mt-3 flex gap-2">{[["discover","Discover"],["following","Following"]].map(([id,l])=>(<button key={id} onClick={()=>setFeedMode(id)} className="lok-btn flex-1 py-2 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:feedMode===id?T.ink:T.card,color:feedMode===id?T.paper:T.ink}}>{l}</button>))}</div>
    {list.length===0?(
      feedMode==="following"
        ?<EmptyState icon="follow" title="No one yet" subtitle="Lok artists you love and their flips show up here." action="Discover artists →" onAction={()=>setFeedMode("discover")}/>
        :<EmptyState icon="feed" title="No art yet" subtitle="Be the first to publish a flip!"/>
    ):(
      <div ref={wrapRef} onScroll={onScroll} className="mt-3 -mx-4" style={{height:"calc(100dvh - 300px)",minHeight:360,overflowY:"scroll",scrollSnapType:"y mandatory"}}>
        {list.map((p,i)=>(<FeedCard key={p.id} p={p} live={i===active} marked={bookmarks.includes(p.id)} loked={loked} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark}/>))}
      </div>
    )}
  </div>);
}

function FeedCard({p,live,marked,loked,cosmetics={},onOpen,onVote,onLok,onBookmark}){
  const T=useT();const[fi,setFi]=useState(0);const[pop,setPop]=useState(false);
  useEffect(()=>{if(!live||p.frames.length<2){setFi(0);return;}const t=setInterval(()=>setFi(f=>(f+1)%p.frames.length),p.paceMs||160);return()=>clearInterval(t);},[live,p.id,p.paceMs,p.frames.length]);
  const doVote=()=>{onVote(p.id);if(!p.voted){setPop(true);setTimeout(()=>setPop(false),320);}};
  if(!p.frames||p.frames.length===0)return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}><div className="relative mx-auto rounded-2xl overflow-hidden flex items-center justify-center" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,background:T.card,aspectRatio:"4/5"}}><div className="text-center opacity-40"><div className="lok-display font-extrabold text-lg">{p.title}</div><div className="text-sm mt-1">Rendering…</div></div></div></div>);
  return(<div className="px-4 flex flex-col justify-center" style={{height:"100%",scrollSnapAlign:"start"}}>
    <div className="relative mx-auto rounded-2xl overflow-hidden" style={{width:"100%",maxWidth:360,border:`3px solid ${T.ink}`,boxShadow:live?`7px 7px 0 ${T.accent}`:`6px 6px 0 ${T.shadow}`,transform:live?"scale(1)":"scale(.97)",transition:"transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease"}}>
      <button onClick={()=>onOpen(p.id)} className="block w-full" aria-label={`Open ${p.title}`}><img src={p.frames[fi]} alt={p.title} className="block w-full" style={{aspectRatio:"4/5",objectFit:"cover"}}/></button>
      {p.frames.length>1&&<div className="absolute top-0 left-0 right-0 h-1" style={{background:"rgba(0,0,0,.15)"}}><div style={{width:`${((fi+1)/p.frames.length)*100}%`,height:"100%",background:T.accent,transition:"width .12s linear"}}/></div>}
      <div className="absolute left-0 right-0 bottom-0 p-3 flex items-end gap-2" style={{background:"linear-gradient(transparent, rgba(0,0,0,.6))"}}>
        <div className="flex-1 text-white min-w-0"><div className="lok-display font-extrabold leading-tight truncate">{p.title}</div><div className="text-xs opacity-90"><NameTag name="moss.ink" color={cosmetics.nameColor} style={{color:"#fff"}}/> · {p.from==="revival"?"revival loop":p.from==="battle"?"battle piece":p.mode==="B"?"page-flip":"flipbook"}</div></div>
        <button onClick={()=>onLok("moss.ink")} aria-label={loked?"Already Lok'd":"Lok this artist"} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold" style={{background:loked?"rgba(255,255,255,.92)":T.accent,color:loked?T.ink:T.onAccent,border:"2px solid #fff"}}>{loked?"Lok'd ✓":"Lok"}</button>
      </div>
      <div className="absolute right-2 bottom-16 flex flex-col gap-2 items-center">
        <button onClick={doVote} aria-label={`Vote — ${p.votes} votes`} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-extrabold" style={{background:p.voted?T.accent:"rgba(255,255,255,.92)",color:p.voted?T.onAccent:T.ink,border:`2.5px solid ${T.ink}`,animation:pop?"lokpop .32s ease":"none"}}>▲</button>
        <span className="text-white text-xs font-bold lok-count" key={p.votes} style={{textShadow:"0 1px 3px #000"}}>{p.votes}</span>
        <button onClick={()=>onBookmark(p.id)} aria-label={marked?"Remove bookmark":"Bookmark this flip"} className="lok-btn w-11 h-11 rounded-full flex items-center justify-center" style={{background:marked?T.accent:"rgba(255,255,255,.92)",border:`2.5px solid ${T.ink}`}}><ReactionIcon type="heart" size={22}/></button>
        <button onClick={()=>onOpen(p.id)} aria-label="Open full viewer" className="lok-btn w-11 h-11 rounded-full flex items-center justify-center font-bold" style={{background:"rgba(255,255,255,.92)",color:T.ink,border:`2.5px solid ${T.ink}`}}>▾</button>
      </div>
    </div>
    <div className="text-center text-xs opacity-50 mt-2">scroll for more · tap ▾ to slide through</div>
  </div>);
}

const PX_PER_FRAME=150;
function Viewer({posts,index,bookmarks,cosmetics={},onBookmark,onClose,onNav,onVote,onReact,onViewed,onShare,onDelete,onRename,myName=""}){
  const T=useT();const post=posts[index];const n=post.frames.length;const isB=post.mode==="B";const series=post.style==="series";
  const scrollRef=useRef(null);const[fi,setFi]=useState(0);const[playing,setPlaying]=useState(false);const[floats,setFloats]=useState([]);const[editT,setEditT]=useState(false);const[tDraft,setTDraft]=useState(post.title);const playRef=useRef(null);const touch=useRef(null);const marked=bookmarks.includes(post.id);const own=post.from!=="seed"&&!post.id?.startsWith("seed");
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
      {post.from!=="seed"&&myName&&onDelete&&<button onClick={()=>{if(window.confirm(`Delete "${post.title}"?`))onDelete(post.id);}} aria-label="Delete" className="lok-btn px-2 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:"rgba(242,237,226,.7)",background:"transparent"}}>🗑</button>}
      <div className="ml-auto flex items-center gap-1.5">{(()=>{const slots=["splat","heart","drip"];const pack=REACTION_SETS[cosmetics.reactionPack]||REACTION_SETS.base;return slots.map((slot,k)=>(<button key={slot} onClick={()=>react(slot)} aria-label={`React ${pack[k]}`} className="lok-btn flex items-center gap-1 px-2 py-1.5 rounded-xl" style={{background:series?T.paper:"rgba(242,237,226,.12)",border:`2px solid ${series?T.ink:"rgba(242,237,226,.4)"}`,color:series?T.ink:T.paper}}><ReactionIcon type={pack[k]} size={20}/><span className="text-xs font-bold">{post.reactions[slot]}</span></button>));})()}</div>
    </div>
  </div>);
}

const BLENDS=["source-over","multiply","screen","overlay"];
const Easel=forwardRef(function Easel({maxLayers,ccTier,onionFrames=[],onStroke},ref){
  const T=useT();
  const[layers,setLayers]=useState([{id:1,visible:true,opacity:1,blend:"source-over"}]);
  const[active,setActive]=useState(1);const[tool,setTool]=useState("pen");const[color,setColor]=useState(ART.ink);const[recentColors,setRecentColors]=useState([]);const[size,setSize]=useState(7);const[symmetry,setSymmetry]=useState("none");const[brush,setBrush]=useState("ink");
  const idRef=useRef(1);const canvases=useRef(new Map());const drawing=useRef(false);const undoStack=useRef([]);const redoStack=useRef([]);const wrapRef=useRef(null);const lastPts=useRef([]);const midPts=useRef([]);const activeLayer=layers.find(l=>l.id===active);
  useImperativeHandle(ref,()=>({
    composite(pageNum=null){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const ctx=tmp.getContext("2d");paperBase(ctx,pageNum);layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv&&l.visible){ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(cv,0,0);}});ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";return tmp.toDataURL("image/png");},
    blankFrame(){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;paperBase(tmp.getContext("2d"),null);return tmp.toDataURL("image/png");},
    clearAll(){layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv)cv.getContext("2d").clearRect(0,0,W,H);});undoStack.current=[];redoStack.current=[];},
  }));
  const pos=e=>{const r=wrapRef.current.getBoundingClientRect();return[((e.clientX-r.left)*W)/r.width,((e.clientY-r.top)*H)/r.height];};
  const pushUndo=()=>{const cv=canvases.current.get(active);if(!cv)return;if(undoStack.current.length>9)undoStack.current.shift();undoStack.current.push({id:active,snap:cv.getContext("2d").getImageData(0,0,W,H)});redoStack.current=[];};
  const dabAt=(ctx,x,y)=>{ctx.globalCompositeOperation="source-over";ctx.globalAlpha=brush==="chalk"?0.5:0.09;ctx.fillStyle=color;const dots=brush==="chalk"?6:1;for(let d=0;d<dots;d++){const ox=brush==="chalk"?(Math.random()-.5)*size*1.4:0,oy=brush==="chalk"?(Math.random()-.5)*size*1.4:0;ctx.beginPath();ctx.arc(x+ox,y+oy,tool==="soft"?size*1.8:size*0.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;};
  const symXY=(x,y)=>{const o=[[x,y]];if(symmetry==="mirrorX"||symmetry==="quad")o.push([W-x,y]);if(symmetry==="mirrorY"||symmetry==="quad")o.push([x,H-y]);if(symmetry==="quad")o.push([W-x,H-y]);if(symmetry.startsWith("radial")){const n=+symmetry.slice(6),cx=W/2,cy=H/2;for(let i=1;i<n;i++){const a=(i/n)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);o.push([cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}}return o;};
  const stamp=(ctx,x,y,start)=>{
    const pts=symXY(x,y);
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
  const down=e=>{e.preventDefault();const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;e.currentTarget.setPointerCapture(e.pointerId);if(tool==="eyedrop"){eyedrop(...pos(e));return;}pushUndo();if(tool==="fill"){fillLayer(cv.getContext("2d"));return;}drawing.current=true;onStroke&&onStroke();stamp(cv.getContext("2d"),...pos(e),true);};
  const move=e=>{if(!drawing.current)return;const cv=canvases.current.get(active);if(cv)stamp(cv.getContext("2d"),...pos(e),false);};
  const up=()=>{drawing.current=false;lastPts.current=[];midPts.current=[];};
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
      {layers.map(l=>(<canvas key={l.id} width={W} height={H} ref={el=>{if(el)canvases.current.set(l.id,el);}} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{opacity:l.opacity,display:l.visible?"block":"none",mixBlendMode:l.blend==="source-over"?"normal":l.blend}}/>))}
      <div className="absolute inset-0" style={{touchAction:"none",cursor:"crosshair"}} role="img" aria-label="Drawing canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}/>
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

const TIERS=[{layers:10,label:"10 · Sketch",price:0},{layers:25,label:"25 · Studio",price:40},{layers:50,label:"50 · Pro",price:80},{layers:100,label:"100 · Marathon",price:150}];
function Studio({ownedTiers,ccTier,onPublish,say,kids,dailyPrompt}){
  const T=useT();const easel=useRef(null);
  const[tier,setTier]=useState(10);const[frames,setFrames]=useState([]);const[frameDurations,setFrameDurations]=useState([]);
  const[onionOn,setOnionOn]=useState(true);const[onionOpacity,setOnionOpacity]=useState(0.22);const[onionCount,setOnionCount]=useState(1);const[editingDur,setEditingDur]=useState(null);
  const[paceMs,setPaceMs]=useState(140);const[title,setTitle]=useState("");const[mode,setMode]=useState("A");const[style,setStyle]=useState("bold");const[pv,setPv]=useState(0);const[justCap,setJustCap]=useState(false);const[zen,setZen]=useState(false);const[promptPick,setPromptPick]=useState(null);
  const pastPrompts=useMemo(()=>{const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);return Array.from({length:5},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(i+1));return PROMPTS[(d.getFullYear()*366+doy(d))%PROMPTS.length];});},[]);
  const activePrompt=promptPick||dailyPrompt;
  const[exporting,setExporting]=useState(false);
  useEffect(()=>{if(frames.length<2)return;const t=setInterval(()=>setPv(p=>(p+1)%frames.length),paceMs);return()=>clearInterval(t);},[frames.length,paceMs]);
  const onionFrames=onionOn&&frames.length>0?frames.slice(-onionCount).map((f,i)=>({src:f,color:i===0?ART.pink:ART.teal,opacity:onionOpacity/(i+1)})):[];
  const capture=()=>{const url=easel.current.composite(frames.length);setFrames(f=>[...f,url]);setFrameDurations(d=>[...d,paceMs]);setJustCap(true);setTimeout(()=>setJustCap(false),360);say(`Page ${frames.length+1} captured`);};
  const insertBlank=i=>{const blank=easel.current.blankFrame?easel.current.blankFrame():easel.current.composite(0);setFrames(f=>[...f.slice(0,i+1),blank,...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),paceMs,...d.slice(i+1)]);say(`Blank inserted after page ${i+1}`);};
  const duplicateFrame=i=>{setFrames(f=>[...f.slice(0,i+1),f[i],...f.slice(i+1)]);setFrameDurations(d=>[...d.slice(0,i+1),d[i]??paceMs,...d.slice(i+1)]);say(`Page ${i+1} duplicated`);};
  const moveFrame=(i,d)=>{setFrames(f=>{const j=i+d;if(j<0||j>=f.length)return f;const c=[...f];[c[i],c[j]]=[c[j],c[i]];return c;});setFrameDurations(dd=>{const j=i+d;if(j<0||j>=dd.length)return dd;const c=[...dd];[c[i],c[j]]=[c[j],c[i]];return c;});};
  const ready=frames.length>=2;
  const exportGif = () => {
    if (exporting || !ready) return;
    say("Building GIF...");
    setExporting(true);

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    script.onload = () => {
      const gif = new GIF({ workers: 2, quality: 10, workerScript: "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js" });
      const imagePromises = frames.map(frameData => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = frameData;
      }));

      Promise.all(imagePromises).then(images => {
        images.forEach((img, i) => gif.addFrame(img, { delay: frameDurations[i] || paceMs }));
        gif.on('finished', blob => { setExporting(false); window.open(URL.createObjectURL(blob)); say("GIF exported!", "success"); });
        gif.render();
      });
    };
    document.body.appendChild(script);
  };
  return(<div className="mt-4">
    <div className="flex items-center justify-between">
      <div><h2 className="lok-display text-xl font-extrabold flex items-center gap-2">Studio{ccTier&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PRO</span>}</h2><p className="text-xs opacity-70 mt-0.5">Draw · capture · repeat · publish</p></div>
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
      {TIERS.map(t=>{const own=ownedTiers.includes(t.layers);const on=tier===t.layers;return(<button key={t.layers} onClick={()=>own?setTier(t.layers):say(`Unlock ${t.label} in Shop`)} aria-label={`${own?"Use":"Unlock"} ${t.label}`} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${on?T.accent:T.ink}`,background:on?T.ink:T.card,color:on?T.paper:T.ink,opacity:own?1:0.45}}>{own?t.label:`🔒 ${t.label}`}</button>);})}
    </div>
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button onClick={()=>setOnionOn(v=>!v)} aria-pressed={onionOn} className="lok-btn px-2.5 py-1 rounded-full text-xs font-bold" style={{border:`2px solid ${onionOn?T.accent:T.shadow}`,background:onionOn?T.ink:"transparent",color:onionOn?T.paper:T.ink}}>🧅 Onion {onionOn?"ON":"OFF"}</button>
      {onionOn&&frames.length>0&&(<>
        <label className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Opacity<input type="range" min="0.05" max="0.5" step="0.05" value={onionOpacity} onChange={e=>setOnionOpacity(+e.target.value)} style={{accentColor:T.accent,width:48}} aria-label="Onion opacity"/></label>
        <div className="flex items-center gap-1 text-xs" style={{color:T.ink}}>Prev{[1,2,3].map(n=><button key={n} onClick={()=>setOnionCount(n)} aria-pressed={onionCount===n} className="lok-btn w-6 h-6 rounded-full text-[10px] font-bold" style={{border:`2px solid ${onionCount===n?T.accent:T.shadow}`,background:onionCount===n?T.ink:"transparent",color:onionCount===n?T.paper:T.ink}}>{n}</button>)}</div>
      </>)}
    </div></>)}
    <div className="mt-2"><Easel ref={easel} key={tier} maxLayers={tier} ccTier={ccTier} onionFrames={onionFrames}/></div>
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
      <div className="mt-3 flex gap-3">
        <button disabled={!ready || exporting} aria-label={ready?"Publish to gallery":"Need 2+ pages"} onClick={()=>{if(!ready){say("Capture at least 2 pages first");return;}onPublish({id:"p"+Date.now(),title:title.trim()||"Untitled flip",frames,frameDurations,paceMs,mode,style,weeklyPrompt:activePrompt===WEEKLY_PROMPT?WEEKLY_PROMPT:null,votes:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"studio"});setFrames([]);setFrameDurations([]);setTitle("");easel.current.clearAll();}} className="lok-btn lok-display flex-1 py-3.5 rounded-xl text-lg font-extrabold" style={{background:ready?T.accent:T.shadow,color:ready?T.onAccent:T.ink,border:`3px solid ${T.ink}`,boxShadow:ready?`4px 4px 0 ${T.ink}`:"none",opacity:ready?1:0.6}}>
          {ready?"Publish →":`Capture ${2-frames.length} more page${2-frames.length===1?"":"s"}`}
        </button>
        <button disabled={!ready || exporting} onClick={exportGif} aria-label="Export as GIF" className="lok-btn lok-display px-4 py-3.5 rounded-xl text-lg font-extrabold" style={{background:T.card,color:T.ink,border:`3px solid ${T.ink}`,opacity:ready?1:0.6}}>
          {exporting ? "..." : "GIF"}
        </button>
      </div>
    </div>)}
  </div>);
}

const FORMATS=[{id:"1v1",label:"1v1 Duel",players:2,icon:"⚔",mood:"One on one. Pure."},{id:"1v1v1",label:"Triangle",players:3,icon:"△",mood:"Two rivals, one you."},{id:"ffa4",label:"4-Player FFA",players:4,icon:"✦",mood:"Controlled chaos."},{id:"coop",label:"Local Co-op",players:2,coop:true,icon:"♡",mood:"Hot-seat, one device."},{id:"ffa10",label:"Big Battle · 10",players:10,locked:true,icon:"🔥",mood:"Absolute mayhem."}];
const KID_PROMPTS=["A happy dinosaur","Your favorite animal","A magic tree","A friendly robot","A rainbow fish","A silly monster","Your dream treehouse","A dancing cloud"];
const BOT_NAMES=["pixel.pluto","inkwell_iz","doodlebug","sketchram","tinta","mooncrayon","nib.ninja","grafite","blot.bot"];
const INTERVENTIONS=["shake","splat","blot"];

function Battle({ownedTiers,ccTier,wins,bigBattleOwned,kids,phase,lillok,customLilLok,onResult,onUnlockBig,onPublish,onLine,blip,hap,say}){
  const T=useT();
  const[pstate,setPstate]=useState("lobby");const[format,setFormat]=useState(FORMATS[0]);const[duration,setDuration]=useState(60);const[tier,setTier]=useState(10);const[prompt,setPrompt]=useState(PROMPTS[0]);const[count,setCount]=useState(3);const[timeLeft,setTimeLeft]=useState(0);const[bots,setBots]=useState([]);const[botThumbs,setBotThumbs]=useState([]);const[entries,setEntries]=useState([]);const[results,setResults]=useState(null);const[shake,setShake]=useState(false);const[splat,setSplat]=useState(null);const[block,setBlock]=useState(null);const[blocked,setBlocked]=useState(0);const[myArt,setMyArt]=useState(null);const[bFrames,setBFrames]=useState([]);const[featured,setFeatured]=useState(false);
  const easel=useRef(null);const strokes=useRef(0);const tickRef=useRef(null);const matchT=useRef(0);
  const promptPool=kids?KID_PROMPTS:PROMPTS;const bigUnlocked=bigBattleOwned||wins>=1;
  const startMatch=()=>{const n=format.players-1;const nb=Array.from({length:n},(_,i)=>({name:kids?`buddy ${i+1}`:BOT_NAMES[i],seed:Math.floor(Math.random()*9000)+i*137+11}));setBots(nb);setBotThumbs(nb.map(b=>renderDoodle(b.seed,0)));setPrompt(promptPool[Math.floor(Math.random()*promptPool.length)]);strokes.current=0;setResults(null);setBlocked(0);setMyArt(null);setBFrames([]);setCount(3);setPstate("count");};
  const captureBattle=()=>{if(!easel.current)return;if(bFrames.length>=14){say("Max 14 pages");return;}const url=easel.current.composite(bFrames.length);setBFrames(f=>[...f,url]);blip&&blip("D5");say(`Page ${bFrames.length+1} captured`);};
  useEffect(()=>{if(pstate!=="count")return;if(count===0){setTimeLeft(duration);matchT.current=0;setPstate("draw");onLine&&onLine("battle_start");return;}const t=setTimeout(()=>setCount(c=>c-1),800);return()=>clearTimeout(t);},[pstate,count,duration]);
  useEffect(()=>{if(pstate!=="draw")return;tickRef.current=setInterval(()=>{matchT.current+=1;setTimeLeft(t=>Math.max(0,t-1));if(matchT.current%2===0)setBotThumbs(bots.map(b=>renderDoodle(b.seed,matchT.current/duration)));if(!kids&&matchT.current>3&&matchT.current%7===0)fireIntervention();},1000);return()=>clearInterval(tickRef.current);},[pstate,bots,duration,kids,phase]);
  const fireIntervention=()=>{const decay=phase==="decaying";const kind=INTERVENTIONS[Math.floor(Math.random()*INTERVENTIONS.length)];const id=Math.random();setBlock({id,kind});setTimeout(()=>{setBlock(b=>{if(b&&b.id===id){if(kind==="shake"){setShake(true);setTimeout(()=>setShake(false),900);}else{setSplat({k:kind,seed:Math.floor(Math.random()*9999)});setTimeout(()=>setSplat(null),1500);}if(decay)say(`${lillok.name} fumbled!`);return null;}return b;});},1400);};
  const doBlock=()=>{if(!block)return;setBlocked(b=>b+1);setBlock(null);blip&&blip("G5");hap&&hap([100,50,100]);say(phase==="thriving"?`${lillok.name} deflected it!`:"Blocked!");};
  useEffect(()=>{if(pstate==="draw"&&timeLeft===0){clearInterval(tickRef.current);setBlock(null);setSplat(null);setShake(false);const final=easel.current?easel.current.composite():renderDoodle(1,0);const allFrames=[...bFrames,final];setBFrames(allFrames);setMyArt(final);if(format.coop||kids){setPstate("done");onResult(true,featured?3:1);return;}setEntries([{name:"You",art:final,isMe:true},...bots.map(b=>({name:b.name,art:renderDoodle(b.seed,1),isMe:false}))]);setPstate("vote");}},[timeLeft,pstate]);
  const castVotes=pickIdx=>{const tally=entries.map(()=>0);tally[pickIdx]+=1;const boost=Math.min(strokes.current/35,1)*1.4+0.4+(phase==="thriving"?0.4:0)+blocked*0.15;entries.forEach((_,vi)=>{if(entries[vi].isMe)return;const w=entries.map((e,k)=>(k===vi?0:e.isMe?boost:1));const sum=w.reduce((a,b)=>a+b,0);let r=Math.random()*sum,ch=0;for(let k=0;k<w.length;k++){r-=w[k];if(r<=0){ch=k;break;}}tally[ch]+=1;});const best=Math.max(...tally);const winners=tally.map((v,k)=>[v,k]).filter(([v])=>v===best).map(([,k])=>k);const wi=winners[Math.floor(Math.random()*winners.length)];const won=entries[wi].isMe;onResult(won,featured?3:1);onLine&&onLine(won?"win":"loss");setResults({tally,winnerIdx:wi,won});setPstate("results");};
  const publishMine=()=>{const fr=bFrames.length>=2?bFrames:[myArt];onPublish({id:"b"+Date.now(),title:`"${prompt}" — battle`,frames:fr,paceMs:220,mode:"A",style:"bold",loop:fr.length>=2,votes:results?.won?1:0,voted:false,viewed:false,views:0,reactions:{splat:0,heart:0,drip:0},from:"battle"});say(fr.length>=2?"Battle animation published":"Battle piece published");};
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
      <Easel ref={easel} maxLayers={tier} ccTier={ccTier} onStroke={()=>(strokes.current+=1)}/>
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

function polyPts(cx,cy,sides,R,rot=-Math.PI/2){const p=[];for(let i=0;i<=sides;i++){const a=rot+(i/sides)*Math.PI*2;p.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);}return p;}
function starPts(cx,cy,points,R,r){const p=[];for(let i=0;i<=points*2;i++){const a=(i/(points*2))*Math.PI*2-Math.PI/2;const rad=i%2?r:R;p.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);}return p;}
function ellipsePts(cx,cy,rx,ry,n=60){const p=[];for(let i=0;i<=n;i++){const a=(i/n)*Math.PI*2;p.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return p;}
function linePts(a,b,n=8){const p=[];for(let i=0;i<=n;i++)p.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);return p;}
function traceShape(kind){
  const cx=W/2,cy=H/2;let pts=[];
  switch(kind){
    case"star":return starPts(cx,cy,5,180,78);case"triangle":return polyPts(cx,cy,3,175);case"square":return polyPts(cx,cy,4,165,-Math.PI/4);case"hexagon":return polyPts(cx,cy,6,170);case"circle":return ellipsePts(cx,cy,175,175);
    case"heart":{for(let i=0;i<=60;i++){const t=i/60*Math.PI*2;const x=16*Math.pow(Math.sin(t),3);const y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);pts.push([cx+x*11,cy-y*11]);}return pts;}
    case"spiral":{for(let i=0;i<=90;i++){const a=i/90*Math.PI*5;const rad=24+i*1.9;pts.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);}return pts;}
    case"house":return[[cx-120,cy+120],[cx-120,cy-20],[cx,cy-130],[cx+120,cy-20],[cx+120,cy+120],[cx-120,cy+120],...linePts([cx-40,cy+120],[cx-40,cy+30]),...linePts([cx-40,cy+30],[cx+40,cy+30]),...linePts([cx+40,cy+30],[cx+40,cy+120])];
    case"wild-knot":{for(let i=0;i<=120;i++){const t=i/120*Math.PI*2;pts.push([cx+Math.sin(3*t)*150,cy+Math.sin(2*t)*150]);}return pts;}
    case"char-ghost":return[[cx-110,cy+150],[cx-110,cy-30],[cx-60,cy-130],[cx+60,cy-130],[cx+110,cy-30],[cx+110,cy+150],[cx+70,cy+110],[cx+35,cy+150],[cx,cy+110],[cx-35,cy+150],[cx-70,cy+110],[cx-110,cy+150],...ellipsePts(cx-40,cy-40,16,22,18),...ellipsePts(cx+40,cy-40,16,22,18)];
    default:return starPts(cx,cy,5,180,78);
  }
}
const MODES={shapes:{name:"Shapes",tag:"clean geometry",pool:["star","triangle","square","hexagon","circle","heart","spiral"]},stencils:{name:"Stencils",tag:"trace real objects",pool:["house","wild-knot","char-ghost"]},wild:{name:"INKSANITY",tag:"chaotic outlines",pool:["wild-knot","spiral","heart"]},chars:{name:"Characters",tag:"outline a creature",pool:["char-ghost"]}};
const WAGERS=[5,10,25,50];
const FRONT_NAMES=["pixel.pluto","inkwell_iz","doodlebug","sketchram","tinta","mooncrayon"];
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
    <div ref={wrapRef} className="relative mt-2 rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4/5"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
      <canvas ref={guideRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <canvas ref={inkRef} width={W} height={H} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"/>
      <div className="absolute inset-0" role="img" aria-label="Trace Rush canvas" style={{touchAction:"none",cursor:"crosshair"}}/>
      <button onClick={finish} className="lok-btn absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{background:T.ink,color:T.paper}}>Lock it in</button>
    </div>
    <div className="mt-2 flex items-center gap-2"><div className="text-xs opacity-70"><span style={{color:T.alt}}>●</span> {online.toLocaleString()} online</div></div>
    <p className="mt-1 text-center text-xs opacity-50">Teal = on the line · pink = off. Finish early for speed bonus.</p>
  </div>);
}

const EFFECTS=[{id:"none",name:"Plain paper",price:0},{id:"rain",name:"Ink rain",price:20},{id:"confetti",name:"Confetti burst",price:30},{id:"aurora",name:"Aurora veil",price:40},{id:"embers",name:"Floating embers",price:25}];
const NAME_COLORS=[{id:"default",name:"Default",price:0,color:null},{id:"pink",name:"Hot pink",price:20,color:"#FF5DA2"},{id:"teal",name:"Riso teal",price:20,color:"#2FA9A0"},{id:"gold",name:"Gold",price:35,color:"#E8B14B"},{id:"violet",name:"Violet",price:35,color:"#7A4FBF"},{id:"rainbow",name:"Holo ✦",price:80,color:"rainbow"}];
const FRAMES=[{id:"none",name:"None",price:0},{id:"double",name:"Double rule",price:25},{id:"dashed",name:"Dashed ink",price:25},{id:"tape",name:"Washi corners",price:40},{id:"glow",name:"Neon glow",price:60}];
const REACTION_PACKS=[{id:"base",name:"Ink set (splat · heart · drip)",price:0},{id:"stars",name:"Stardust pack",price:30},{id:"fire",name:"Hot streak pack",price:30},{id:"zen",name:"Zen pack",price:45}];
const AVATAR_ACCENTS=[{id:"none",name:"Plain",price:0},{id:"ring",name:"Accent ring",price:20},{id:"halo",name:"Sketch halo",price:35},{id:"crown",name:"Ink crown",price:50}];
function ShopItem({owned,equipped,price,onClick,children,swatch}){const T=useT();return(<button onClick={onClick} className="lok-btn text-left rounded-2xl overflow-hidden w-full" style={{border:`3px solid ${equipped?T.accent:T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}}>{swatch}<div className="px-2.5 py-2 flex items-center justify-between gap-2"><div className="min-w-0">{children}</div><span className="text-xs font-extrabold shrink-0" style={{color:equipped?T.alt:T.accent}}>{equipped?"On ✓":owned?"Equip":price===0?"Free":price}</span></div></button>);}
function Shop({loks,lokPass,kids,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,cosmetics,owned,onBuyCosmetic,setKids,onBuyPass,onTheme,onEffect,onTier,onCc}){
  const T=useT();const[catTab,setCatTab]=useState("featured");
  const Section=({title,sub,children})=>(<section className="mt-5"><h3 className="lok-display text-base font-extrabold">{title}</h3>{sub&&<p className="text-xs opacity-60 mb-1">{sub}</p>}<div className="mt-2">{children}</div></section>);
  const has=(cat,id)=>owned[cat]?.includes(id);const eq=(cat,id)=>cosmetics[cat]===id;const buy=(cat,item)=>onBuyCosmetic(cat,item);
  const cats=[["featured","Featured"],["themes","Skins"],["effects","Effects"],["cosmetic","Cosmetics"],["studio","Studio"],["blot","Blot Shop"]];
  return(<div className="mt-4">
    <h2 className="lok-display text-lg font-extrabold">Shop</h2>
    <p className="text-sm opacity-70 mt-0.5">{kids?"Everything here is free play.":"Spend Loks you earn — or grab the LokPass."}</p>
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{cats.map(([id,l])=>(<button key={id} onClick={()=>setCatTab(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:catTab===id?T.ink:T.card,color:catTab===id?T.paper:T.ink}}>{l}</button>))}</div>
    {catTab==="featured"&&(<>
      {!kids&&(<div className="mt-3 p-4 rounded-2xl relative overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.ink,color:T.paper,boxShadow:`6px 6px 0 ${T.accent}`}}><div className="lok-display text-xl font-extrabold">LokPass</div><p className="text-sm opacity-85 mt-1">No ads. Every UI theme unlocked. PASS badge.</p><button onClick={onBuyPass} disabled={lokPass} className="lok-btn lok-display mt-3 w-full py-2.5 rounded-xl text-lg font-extrabold" style={{background:lokPass?"transparent":T.accent,color:lokPass?T.paper:T.onAccent,border:`3px solid ${T.paper}`,opacity:lokPass?0.7:1}} aria-label={lokPass?"LokPass active":"Get LokPass"}>{lokPass?"Active ✓":"Get LokPass — $2.99"}</button></div>)}
      <div className="mt-3 p-3 rounded-2xl flex items-center gap-3" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="flex-1"><div className="lok-display font-extrabold">Lok Juniors {kids?"· ON":""}</div><div className="text-xs opacity-70">Safe walled-garden mode for kids &amp; classrooms.</div></div><button onClick={()=>setKids(!kids)} className="lok-btn px-3 py-2 rounded-xl font-extrabold text-sm" style={{background:kids?T.alt:T.card,color:kids?"#fff":T.ink,border:`3px solid ${T.ink}`}} aria-pressed={kids}>{kids?"Turn off":"Turn on"}</button></div>
    </>)}
    {catTab==="themes"&&!kids&&(<Section title="UI themes" sub={`Own skins to unlock new waves.`}><div className="grid grid-cols-2 gap-3">{Object.entries(THEMES).filter(([,th])=>(th.wave||1) < 2 || ownedThemes.length>=SKIN_WAVE_GATE).filter(([,th])=>(th.wave||1) < 3 || ownedThemes.length>=SKIN_WAVE_3_GATE).filter(([,th])=>(th.wave||1) < 4 || ownedThemes.length>=SKIN_WAVE_4_GATE).map(([id,th])=>{const own=ownedThemes.includes(id);const e2=uiTheme===id;return(<button key={id} onClick={()=>onTheme(id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${e2?T.accent:T.ink}`,background:T.card,boxShadow:`4px 4px 0 ${T.shadow}`}} aria-label={`Theme ${th.name}`}><div className="flex h-10">{[th.paper,th.ink,th.accent,th.alt].map((c,k)=>(<div key={k} className="flex-1" style={{background:c}}/>))}</div><div className="px-2.5 py-2"><div className="font-bold text-sm">{th.name}</div><div className="text-xs opacity-70">{th.desc}</div><div className="mt-1 text-xs font-extrabold" style={{color:T.accent}}>{e2?"Equipped":own?"Equip":lokPass?"In PASS":`${th.price} Loks`}</div></div></button>);})}
    </div></Section>)}
    {catTab==="effects"&&(<Section title="Page effects"><div className="grid grid-cols-2 gap-2">{EFFECTS.map(e=>{const own=ownedEffects.includes(e.id);const e2=effect===e.id;return(<ShopItem key={e.id} owned={own} equipped={e2} price={e.price} onClick={()=>onEffect(e.id,e)}><div className="font-bold text-sm">{e.name}</div></ShopItem>);})}</div></Section>)}
    {catTab==="cosmetic"&&(<>
      <Section title="Name color"><div className="grid grid-cols-2 gap-2">{NAME_COLORS.map(c=>(<ShopItem key={c.id} owned={has("nameColor",c.id)} equipped={eq("nameColor",c.id)} price={c.price} onClick={()=>buy("nameColor",c)}><div className="font-bold text-sm" style={{color:c.color==="rainbow"?undefined:c.color||T.ink,background:c.color==="rainbow"?"linear-gradient(90deg,#FF5DA2,#E8B14B,#2FA9A0)":undefined,WebkitBackgroundClip:c.color==="rainbow"?"text":undefined,WebkitTextFillColor:c.color==="rainbow"?"transparent":undefined}}>{c.name}</div></ShopItem>))}</div></Section>
      <Section title="Reaction packs"><div className="grid grid-cols-2 gap-2">{REACTION_PACKS.map(r=>(<ShopItem key={r.id} owned={has("reactionPack",r.id)} equipped={eq("reactionPack",r.id)} price={r.price} onClick={()=>buy("reactionPack",r)}><div className="font-bold text-sm leading-tight">{r.name}</div></ShopItem>))}</div></Section>
      <Section title="Avatar accents"><div className="grid grid-cols-2 gap-2">{AVATAR_ACCENTS.map(a=>(<ShopItem key={a.id} owned={has("avatarAccent",a.id)} equipped={eq("avatarAccent",a.id)} price={a.price} onClick={()=>buy("avatarAccent",a)}><div className="font-bold text-sm">{a.name}</div></ShopItem>))}</div></Section>
    </>)}
    {catTab==="studio"&&(<>
      <Section title="Layer tiers"><div className="flex flex-col gap-2">{TIERS.map(t=>{const own=ownedTiers.includes(t.layers);return(<div key={t.layers} className="flex items-center justify-between p-2.5 rounded-xl" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="font-bold text-sm">{t.label} layers</div>{own?<span className="text-sm font-extrabold" style={{color:T.alt}}>Owned ✓</span>:<button onClick={()=>onTier(t)} className="lok-btn px-3 py-1 rounded-full text-sm font-extrabold" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>{t.price} Loks</button>}</div>);})}</div></Section>
      <Section title="Studio Pro" sub="Blend modes, symmetry (mirror · radial), fill, eyedropper, marker &amp; chalk brushes"><div className="flex items-center justify-between p-2.5 rounded-xl" style={{border:`3px solid ${T.ink}`,background:T.card}}><div className="font-bold text-sm">Pro easel unlock</div>{ccTier?<span className="text-sm font-extrabold" style={{color:T.alt}}>Owned ✓</span>:<button onClick={onCc} className="lok-btn px-3 py-1 rounded-full text-sm font-extrabold" style={{background:T.accent,color:T.onAccent,border:`2.5px solid ${T.ink}`}}>120 Loks</button>}</div></Section>
    </>)}
    {catTab==="blot"&&(<Section title="Blot Shop" sub="Exclusive gear for your LilLok — borders for its container. More accessories coming.">
      <div className="grid grid-cols-2 gap-2">{BLOT_BORDERS.map(b=>(
        <ShopItem key={b.id} owned={has("blotBorder",b.id)} equipped={eq("blotBorder",b.id)} price={b.price} onClick={()=>buy("blotBorder",b)}
          swatch={<div className="flex items-center justify-center py-3"><div className="rounded-full" style={{width:44,height:44,background:T.paper,...blotBorderStyle(b.id,T)}}/></div>}>
          <div className="font-bold text-sm">{b.name}</div>
        </ShopItem>))}
      </div>
    </Section>)}
    <p className="mt-5 text-center text-xs opacity-60">Balance: {loks} Loks</p>
  </div>);
}

function PostCard({p,onOpen}){
  const T=useT();
  if(!p.frames||p.frames.length===0)return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={p.title}><div className="flex items-center justify-center" style={{aspectRatio:"4/5",background:T.paper}}><div className="text-center opacity-40"><div className="lok-display font-extrabold">{p.title}</div><div className="text-xs">Rendering…</div></div></div></button>);
  return(<button onClick={()=>onOpen(p.id)} className="lok-btn text-left rounded-2xl overflow-hidden" style={{border:`3px solid ${T.ink}`,background:T.card,boxShadow:`5px 5px 0 ${T.shadow}`}} aria-label={`Open ${p.title}`}><div className="relative"><img src={p.frames[Math.floor(p.frames.length/2)]} alt={p.title} className="w-full block" style={{aspectRatio:"4 / 5",objectFit:"cover"}}/><div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-xs font-bold" style={{background:T.ink,color:T.paper}}>{p.from==="battle"?"⚔ battle":p.mode==="B"?"▣ page":`${p.frames.length}pg`}</div></div><div className="px-2.5 py-2"><div className="font-bold leading-tight truncate text-sm">{p.title}</div><div className="text-xs opacity-70 mt-0.5">{p.votes} votes · {p.views||0} views</div></div></button>);
}
function PersonRow({name,note}){const T=useT();const seed=name.length*31;return(<div className="flex items-center gap-3 p-2 rounded-xl mb-2" style={{border:`2.5px solid ${T.ink}`,background:T.card}}><img src={renderAvatar(seed)} alt={name} className="w-11 h-11 rounded-full" style={{border:`2px solid ${T.ink}`}}/><div className="font-bold flex-1">{name}</div>{note&&<span className="text-xs opacity-60">{note}</span>}</div>);}

function Profile({posts,profile,setProfile,wins,lokPass,kids,cosmetics={},level,xp,quests,following,lokdInCount,bookmarks,notifications=[],notifUnread=0,loks=0,totalEarned=0,questsCompleted=0,canInstall=false,onInstall,onClearNotifs,onOpen,onDelete,onRename,say,pace="sweep",setPace,speed=1,setSpeed,soundLab=false,onUnlockSoundLab,soundQueue=[],setSoundQueue,founder=false,onFounderJoin,animatedToken=false,focusMode,setFocusMode,showSettings,setShowSettings}){
  const T=useT();const[filter,setFilter]=useState("newest");const[view,setView]=useState("gallery");const[editing,setEditing]=useState(false);const[draft,setDraft]=useState(profile);const[showNotifs,setShowNotifs]=useState(false);const[searchQ,setSearchQ]=useState("");
  const tapCount=useRef(0);const tapTimer=useRef(null);const audioRef=useRef(null);const[slUrl,setSlUrl]=useState("");const[slPlaying,setSlPlaying]=useState(null);const[fHandle,setFHandle]=useState(profile.name||"");const[fEmail,setFEmail]=useState("");const[fBusy,setFBusy]=useState(false);const[synesthesia,setSynesthesia]=useState(false);const[hapticGrammar,setHapticGrammar]=useState("default");const[fourthWall,setFourthWall]=useState(100);
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
        <div className="min-w-0 flex-1"><div className="lok-display text-xl font-extrabold leading-tight flex items-center gap-2 flex-wrap"><NameTag name={profile.name} color={cosmetics.nameColor} style={{color:T.ink}}/>{lokPass&&!kids&&<span className="text-xs px-1.5 py-0.5 rounded" style={{background:T.accent,color:T.onAccent}}>PASS</span>}</div><div className="text-sm opacity-70">{posts.length} flips · {wins} {wins===1?"win":"wins"}</div></div>
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
      <div className="flex items-center justify-between"><div className="lok-display font-extrabold">Level {level}</div><div className="text-xs opacity-70">{xp % 100}/100 XP</div></div>
      <div className="mt-1 h-2.5 rounded-full overflow-hidden" style={{ background: T.shadow }}><div style={{ width: `${xp % 100}%`, height: "100%", background: T.accent }} /></div>
      <div className="lok-display font-extrabold mt-3 mb-1 text-sm">Today's quests</div>
      <div className="space-y-1.5">{quests?.items?.map(q => (<div key={q.id} className="flex items-center gap-2 text-sm"><span className="font-bold" style={{ color: q.done ? T.alt : T.ink, opacity: q.done ? 1 : 0.9 }}>{q.done ? "✓" : "○"}</span><span className="flex-1" style={{ textDecoration: q.done ? "line-through" : "none", opacity: q.done ? 0.55 : 1 }}>{q.label}</span><span className="text-xs font-bold" style={{ color: T.accent }}>{q.progress}/{q.goal} · +{q.reward}</span></div>))}</div>
    </section>)}
    {!kids && (<section className="mt-3 p-3 rounded-2xl" style={{ border: `2px solid ${T.shadow}`, background: T.card }}>
      <div className="flex items-center justify-between mb-1.5"><div className="lok-display font-extrabold text-sm">Loks</div>{nextMilestone && <div className="text-[10px] opacity-50 font-bold">next quest milestone: {nextMilestone}</div>}</div>
      <div className="flex items-center justify-around">
        <div className="text-center"><div className="lok-display font-extrabold text-xl" style={{ color: T.accent }}>{loks}</div><div className="text-[11px] opacity-60">balance</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{totalEarned}</div><div className="text-[11px] opacity-60">earned all-time</div></div>
        <div className="text-center"><div className="lok-display font-extrabold text-xl">{questsCompleted}</div><div className="text-[11px] opacity-60">quests done</div></div>
      </div>
    </section>)}
    <SettingsPanel show={showSettings} onClose={() => setShowSettings(false)} say={say} isIOS={isIOS} canInstall={canInstall} onInstall={onInstall} founder={founder} onFounderJoin={onFounderJoin} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={onUnlockSoundLab} soundQueue={soundQueue} setSoundQueue={setSoundQueue} focusMode={focusMode} setFocusMode={setFocusMode} />
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
      {view==="bookmarks"?(bookmarked.length?<div className="grid grid-cols-2 gap-3">{bookmarked.map(p=><PostCard key={p.id} p={p} onOpen={onOpen}/>)}</div>:<EmptyState icon="bookmarks" title="No bookmarks yet" subtitle="Lok in to pieces from the viewer to save them here."/>):view==="lokd"?(following.length?following.map(n=><PersonRow key={n} name={n}/>):<EmptyState icon="follow" title="No one Lok'd yet" subtitle="Lok artists you love and they'll show here."/>):["pixel.pluto","inkwell_iz","doodlebug"].map(n=><PersonRow key={n} name={n} note="Lok'd in"/>)}
    </div>):(<>
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        <h2 className="lok-display text-lg font-extrabold mr-1">Gallery</h2>
        {[["newest","Newest"],["loks","Most Lok'd"],["views","Most viewed"],["battle","Battles"],["series","Series"],["weekly","This week"]].map(([id,label])=>(<button key={id} onClick={()=>setFilter(id)} className="lok-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{border:`2.5px solid ${T.ink}`,background:filter===id?T.ink:T.card,color:filter===id?T.paper:T.ink}}>{label}</button>))}
      </div>
      <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search your flips…" aria-label="Search gallery" className="mt-2 w-full px-3 py-2 rounded-xl font-bold text-sm" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink}}/>
      {filtered.length?<div className="mt-2 grid grid-cols-2 gap-3">{filtered.map(p=><PostCard key={p.id} p={p} onOpen={onOpen}/>)}</div>:<EmptyState icon="search" title={searchQ?"No flips match":"No pieces match"} subtitle={searchQ?"Try different words":"Try a different filter or publish your first flip!"}/>}
    </>)}
  </div>);
}

export default function LokApp(){
  const[ready,setReady]=useState(false);const[tab,setTab]=useState("feed");const[openIdx,setOpenIdx]=useState(null);const[posts,setPosts]=useState([]);const[toasts,setToasts]=useState([]);
  const[questsCompleted,setQuestsCompleted]=useState(0);const[totalEarned,setTotalEarned]=useState(0);const[traceHinted,setTraceHinted]=useState(false);const[fabBubble,setFabBubble]=useState("");const[adIdx,setAdIdx]=useState(0);const[installEvt,setInstallEvt]=useState(null);const[showSettings,setShowSettings]=useState(false);
  const[loks,setLoks]=useState(260);const[pace,setPace]=useState("sweep");const[speed,setSpeed]=useState(1);const[soundLab,setSoundLab]=useState(false);const[soundQueue,setSoundQueue]=useState([]);const[founder,setFounder]=useState(false);const[totalSpent,setTotalSpent]=useState(0);const[fodHistory,setFodHistory]=useState([]);const[lokPass,setLokPass]=useState(false);const[uiTheme,setUiTheme]=useState("riso");const[ownedThemes,setOwnedThemes]=useState(["riso"]);const[effect,setEffect]=useState("none");const[ownedEffects,setOwnedEffects]=useState(["none"]);const[ownedTiers,setOwnedTiers]=useState([10]);const[ccTier,setCcTier]=useState(false);const[bigBattleOwned,setBigBattleOwned]=useState(false);const[wins,setWins]=useState(0);
  const[profile,setProfile]=useState({name:"moss.ink",bio:"I draw small loops about gravity, plants, and things that fly. Slide down any post to play it.",avatarSeed:42,links:[{label:"Lok page",url:"coming soon"}]});
  const[bookmarks,setBookmarks]=useState([]);const[following,setFollowing]=useState([]);const[lokdInCount]=useState(2300);const[lillok,setLillok]=useState({ink:80,bond:30,stasis:false,name:"Blot",lastSeen:Date.now()});const[customLilLok,setCustomLilLok]=useState(null);const[cosmetics,setCosmetics]=useState({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none"});const[owned,setOwned]=useState({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"]});const[kids,setKids]=useState(false);const[showLilLok,setShowLilLok]=useState(false);const[onboarded,setOnboarded]=useState(false);const[showOnboard,setShowOnboard]=useState(false);const[showHint,setShowHint]=useState(false);const[sound,setSound]=useState(false);const[feedMode,setFeedMode]=useState("discover");const[daily,setDaily]=useState({day:null,streak:0,claimed:false,prompt:""});const[xp,setXp]=useState(0);const[quests,setQuests]=useState(null);const[flair,setFlair]=useState("");const[adVisible,setAdVisible]=useState(true);const[notifications,setNotifications]=useState([]);const[notifUnread,setNotifUnread]=useState(0);
  const adScrollTimer=useRef(null);const earnLog=useRef({ts:Date.now(),total:0});const audioCtx=useRef(null);
  const T=THEMES[uiTheme];const phase=lilLokPhase(lillok);const level=Math.floor(xp/100)+1;
  const flipOfDay=useMemo(()=>{const c=posts.filter(p=>p.frames?.length>=2);if(!c.length)return null;
    const today=new Date().toDateString();const cutoff=Date.now()-FOD_WINDOW_DAYS*86400000;
    const recent=new Set(fodHistory.filter(h=>h.ts>cutoff&&h.day!==today).map(h=>h.id));
    const sorted=[...c].sort((a,b)=>b.votes-a.votes);
    return sorted.find(p=>!recent.has(p.id))||sorted[0];},[posts,fodHistory]);
  useEffect(()=>{if(!ready||!flipOfDay)return;const today=new Date().toDateString();
    setFodHistory(h=>{if(h.some(x=>x.day===today))return h;return[...h.filter(x=>x.ts>Date.now()-FOD_WINDOW_DAYS*86400000),{id:flipOfDay.id,day:today,ts:Date.now()}];});},[ready,flipOfDay]);
  useEffect(()=>{const onScroll=()=>{setAdVisible(false);clearTimeout(adScrollTimer.current);adScrollTimer.current=setTimeout(()=>setAdVisible(true),1200);};window.addEventListener("scroll",onScroll,{passive:true});return()=>window.removeEventListener("scroll",onScroll);},[]);
  const guardedAddLoks=useCallback(n=>{const now=Date.now();if(now-earnLog.current.ts>3600000){earnLog.current={ts:now,total:0};}if(earnLog.current.total+n>120){return;}earnLog.current.total+=n;setLoks(l=>l+n);setTotalEarned(t=>t+n);},[]);
  const addLoks=guardedAddLoks;
  const pushNotif=useCallback((msg,type="info")=>{setNotifications(ns=>[...ns.slice(-49),{id:Date.now(),msg,type,ts:Date.now()}]);setNotifUnread(n=>n+1);},[]);
  const say=useCallback((m,type="default")=>{const id=Date.now()+Math.random();setToasts(t=>[...t.slice(-2),{id,msg:m,type}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2600);},[]);
  const showLine=useCallback((ctx="")=>{setFabBubble(getLilLokLine(lilLokPhase(lillok),ctx));setTimeout(()=>setFabBubble(""),3500);},[lillok]);
  const gainXp=useCallback(n=>setXp(x=>{const before=Math.floor(x/100);const nx=x+n;if(Math.floor(nx/100)>before){setTimeout(()=>say(`Level ${Math.floor(nx/100)+1}! New flair unlocked`),300);}return nx;}),[say]);
  const questTick=useCallback((track,amt=1)=>{setQuests(q=>{if(!q)return q;let paid=0,msg=null,doneCount=0;const items=q.items.map(it=>{if(it.track!==track||it.done)return it;const progress=Math.min(it.goal,it.progress+amt);const done=progress>=it.goal;if(done){paid+=it.reward;doneCount++;msg=`Quest done: ${it.label} · +${it.reward}`;}return{...it,progress,done};});if(paid){setLoks(l=>l+paid);setTotalEarned(t=>t+paid);gainXp(paid);setTimeout(()=>say(msg,"success"),250);
    setQuestsCompleted(c=>{const nc=c+doneCount;const m=[10,25,50,100].find(x=>c<x&&nc>=x);if(m){const bonus=m*2;setLoks(l=>l+bonus);setTotalEarned(t=>t+bonus);setTimeout(()=>{say(`🎖 ${m} quests done · +${bonus} bonus Loks`,"success");hap([200,100,200,100,200]);},700);}return nc;});}return{...q,items};});},[gainXp,say,hap]);
  useEffect(()=>{(async()=>{
    const dayOfYear=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const todayPromptIdx=(new Date().getFullYear()*366+dayOfYear(new Date()))%PROMPTS.length;
    const makeSeedLazy=(drawFn,n,id,meta)=>({...meta,id,frames:[],_pendingDraw:drawFn,_pendingN:n,paceMs:meta.paceMs});
    const seed=[makeSeedLazy(drawBounce,14,"seed1",{title:"Bounce study",votes:41,voted:false,viewed:false,reactions:{splat:12,heart:30,drip:5},from:"studio",mode:"A",style:"bold",views:312}),makeSeedLazy(drawBloom,12,"seed2",{title:"Bloom",votes:67,voted:false,viewed:false,reactions:{splat:8,heart:52,drip:9},from:"studio",mode:"B",style:"series",views:540}),makeSeedLazy(drawNight,13,"seed3",{title:"Night flight",votes:29,voted:false,viewed:false,reactions:{splat:21,heart:14,drip:11},from:"studio",mode:"A",style:"bold",views:188})];
    const save=await store.get(SAVE_KEY);const savedGallery=await store.get(GALLERY_KEY);const todayKey=new Date().toDateString();
    let loadedDaily={day:todayKey,streak:1,claimed:false,prompt:PROMPTS[todayPromptIdx]};
    if(save){setLoks(save.loks??60);setLokPass(!!save.lokPass);setUiTheme(save.uiTheme||"riso");setOwnedThemes(save.ownedThemes||["riso"]);setEffect(save.effect||"none");setOwnedEffects(save.ownedEffects||["none"]);setOwnedTiers(save.ownedTiers||[10]);setCcTier(!!save.ccTier);setBigBattleOwned(!!save.bigBattleOwned);setWins(save.wins??0);if(save.profile)setProfile(save.profile);setBookmarks(save.bookmarks||[]);setFollowing(save.following||[]);setKids(!!save.kids);if(save.customLilLok)setCustomLilLok(save.customLilLok);if(save.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",...save.cosmetics});if(save.owned)setOwned({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],...save.owned});setOnboarded(!!save.onboarded);setSound(!!save.sound);setXp(save.xp??0);setFlair(save.flair||"");setQuestsCompleted(save.questsCompleted??0);setTotalEarned(save.totalEarned??0);setTraceHinted(!!save.traceHinted);setPace(save.pace||"sweep");setSpeed(save.speed??1);setSoundLab(!!save.soundLab);setSoundQueue(save.soundQueue||[]);setFounder(!!save.founder);setTotalSpent(save.totalSpent??0);setFodHistory(save.fodHistory||[]);if(!save.onboarded)setShowHint(false);else setShowHint(true);
    if(save.daily?.day){if(save.daily.day===todayKey)loadedDaily=save.daily;else{const diff=Math.round((new Date(todayKey)-new Date(new Date(save.daily.day).toDateString()))/86400000);loadedDaily={day:todayKey,streak:diff===1?(save.daily.streak||0)+1:1,claimed:false,prompt:PROMPTS[todayPromptIdx]};}}
    const gap=Date.now()-(save.lillok?.lastSeen||Date.now());const ll=save.lillok||lillok;const buffer=1-((ll.bond||0)/100)*0.5;const inkDrain=Math.min(ll.ink,Math.floor(gap/60000)*1.2*buffer);const newInk=Math.max(0,ll.ink-inkDrain);setLillok({...ll,stasis:ll.stasis||(newInk===0&&gap>600000),ink:newInk,inkZeroAt:null,lastSeen:Date.now()});}
    setDaily(loadedDaily);const savedQ=save?.quests&&save.quests.day===todayKey?save.quests:{day:todayKey,items:makeQuests()};setQuests(savedQ);
    const userPosts=(savedGallery||[]).map(p=>({...p,voted:false,viewed:false}));setPosts([...userPosts,...seed]);if(!save||!save.onboarded)setShowOnboard(true);setReady(true);
    seed.forEach((s,i)=>{if(!s._pendingDraw)return;setTimeout(()=>{const frames=renderSequence(s._pendingDraw,s._pendingN);const paceMs=[110,150,130][i];setPosts(ps=>ps.map(p=>p.id===s.id?{...p,frames,paceMs}:p));},i*80+50);});
  })();},[]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{store.set(SAVE_KEY,{loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,lillok:{...lillok,lastSeen:Date.now()}});},400);return()=>clearTimeout(t);},[ready,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,ownedTiers,ccTier,bigBattleOwned,wins,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,lillok]);
  useEffect(()=>{if(!ready)return;const userPosts=posts.filter(p=>!p.id?.startsWith("seed"));const t=setTimeout(()=>{store.set(GALLERY_KEY,userPosts).then(ok=>{if(!ok)say("Gallery too big");});},500);return()=>clearTimeout(t);},[ready,posts]);
  useEffect(()=>{if(!ready||kids)return;let interval=null;const startDecay=()=>{interval=setInterval(()=>setLillok(s=>{
    if(s.stasis)return s;
    if(s.ink===0){if(!s.inkZeroAt)return{...s,inkZeroAt:Date.now()};if(Date.now()-s.inkZeroAt>120000)return{...s,stasis:true,inkZeroAt:null};return s;}
    const buffer=1-(s.bond/100)*0.5;
    return{...s,ink:Math.max(0,s.ink-1.4*buffer)};
  }),12000);};const stopDecay=()=>{clearInterval(interval);interval=null;};const onVisible=()=>{if(document.visibilityState==="hidden")stopDecay();else startDecay();};startDecay();document.addEventListener("visibilitychange",onVisible);return()=>{stopDecay();document.removeEventListener("visibilitychange",onVisible);};},[ready,kids]);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  useEffect(()=>{if(lokPass||kids)return;const t=setInterval(()=>setAdIdx(i=>(i+1)%ADS.length),8000);return()=>clearInterval(t);},[lokPass,kids]);
  useEffect(()=>{if(!ready)return;const t1=setTimeout(()=>showLine(),4000);const t2=setInterval(()=>{if(!showLilLok)showLine();},60000);return()=>{clearTimeout(t1);clearInterval(t2);};},[ready]);
  const patchPost=(id,patch)=>setPosts(ps=>ps.map(p=>(p.id===id?{...p,...patch}:p)));
  const spend=(cost,ok,label)=>{if(loks<cost){say(`Need ${cost} Loks`);return false;}setLoks(l=>l-cost);setTotalSpent(t=>t+cost);ok();say(`${label} · −${cost} Loks`);return true;};
  const animatedToken=totalSpent>=ANIMATED_AVATAR_SPEND;
  const feedLilLok=(amt=20,ctx="direct")=>{setLillok(s=>{const wasStasis=s.stasis;const cap=wasStasis?40:100;const bondGain=ctx==="revival"?8:ctx==="creation"?3:2;return{...s,ink:Math.min(cap,s.ink+amt),bond:Math.min(100,s.bond+bondGain),stasis:false,inkZeroAt:null,lastSeen:Date.now()};});hap([40]);};
  const sharePost=useCallback(async post=>{const url=`https://lok.app/post/${post.id}`;try{if(navigator.share){await navigator.share({title:post.title,text:`Check out "${post.title}" on LokBook`,url});}else{await navigator.clipboard.writeText(url);say("Link copied!");}}catch{}},[say]);
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
  const bgStyle = T.animated ? { background: `linear-gradient(270deg, ${T.accent}, ${T.alt}, ${T.accent})`, backgroundSize: '400% 400%', animation: 'chromawave 12s ease infinite' } : { background: T.paper };

  return(<ThemeCtx.Provider value={T}>
    <div className="min-h-screen w-full" style={{...bgStyle, color:T.ink,fontFamily:"'Schibsted Grotesk',system-ui,sans-serif",animation:effect==="quake"&&!reduceMotion?"lokquake 6s infinite":"none"}}>
      <GlobalStyle T={T} pace={pace} speed={speed}/><PageEffect effect={effect}/>
      {!focusMode && <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3" style={{background:T.paper,borderBottom:`3px solid ${T.ink}`}}>
        <button onClick={()=>setTab("feed")} aria-label="Go to feed" className="lok-btn lok-display relative text-2xl font-extrabold tracking-tight select-none" style={{background:"transparent",border:"none",padding:0}}>
          <span className="absolute" style={{color:T.accent,left:3,top:2}}>Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
          <span className="relative">Lok{kids?" Juniors":tab==="battle"?" N Slide":"Book"}</span>
        </button>
        <div className="flex items-center gap-2">
          {kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.alt,color:"#fff"}}>SAFE</span>}
          {lokPass&&!kids&&<span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.accent,color:T.onAccent}}>PASS</span>}
          <button onClick={()=>setSound(s=>!s)} aria-label={sound?"Mute sound":"Enable sound"} className="lok-btn w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:sound?T.ink:T.card,color:sound?T.paper:T.ink}}>{sound?"♪":"♪̸"}</button>
          <span className="lok-display px-2 py-0.5 rounded-md text-xs font-extrabold" style={{background:T.ink,color:T.paper}} aria-label={`Level ${level}`}>Lv {level}</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card}} aria-label={`${loks} Loks`}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="11" cy="11" r="8" fill={T.accent}/><circle cx="9" cy="9" r="8" fill="none" stroke={T.ink} strokeWidth="2.4"/><path d="M7 5.5 V12.5 H12" fill="none" stroke={T.ink} strokeWidth="2.4" strokeLinecap="round"/></svg>
            {loks}
          </div>
        </div>
      </header>}
      <main className="mx-auto w-full px-4 pb-40" style={{maxWidth:560}}>
        <div key={tab} className="lok-tabin">
          {tab==="feed"&&<Feed posts={posts} bookmarks={bookmarks} following={following} feedMode={feedMode} setFeedMode={setFeedMode} cosmetics={cosmetics} daily={daily} streak={daily.streak} dailyClaimed={daily.claimed} flipOfDay={flipOfDay} onLine={showLine} onClaimDaily={()=>{if(daily.claimed)return;const wk=daily.streak%7===0&&daily.streak>0?20:0;const mo=daily.streak%30===0&&daily.streak>0?100:0;const bonus=10+Math.min(daily.streak,7)*5+wk+mo;setDaily(d=>({...d,claimed:true}));addLoks(bonus);gainXp(20);feedLilLok(15,"creation");blip("E5");hap([30,20,60]);say(`Day ${daily.streak} claimed · +${bonus} Loks`,"success");}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped · +5 Loks","success");if(id.startsWith("seed")){addLoks(5);pushNotif("Your flip got a vote · +5 Loks (creator)","success");}else{pushNotif("You voted · creator notified","success");}}} onLok={name=>{setFollowing(f=>f.includes(name)?f:[...f,name]);questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);blip("A4");hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in to bookmarks");}} say={say}/>}
          {tab==="gallery"&&<Profile posts={posts} profile={profile} setProfile={setProfile} wins={wins} lokPass={lokPass} kids={kids} cosmetics={cosmetics} level={level} xp={xp} quests={quests} following={following} lokdInCount={lokdInCount} bookmarks={bookmarks} notifications={notifications} notifUnread={notifUnread} loks={loks} totalEarned={totalEarned} questsCompleted={questsCompleted} canInstall={!!installEvt} onInstall={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("Lok added to your home screen!","success");}catch{}setInstallEvt(null);}else{say("Open your browser menu → Install app / Add to Home Screen");}}} onClearNotifs={()=>setNotifUnread(0)} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onDelete={id=>setPosts(ps=>ps.filter(p=>p.id!==id))} onRename={(id,title)=>patchPost(id,{title})} say={say} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={()=>setSoundLab(true)} soundQueue={soundQueue} setSoundQueue={setSoundQueue} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices \ud83c\udfc6","success");}} animatedToken={animatedToken} focusMode={focusMode} setFocusMode={setFocusMode} showSettings={showSettings} setShowSettings={setShowSettings}/>}
          {tab==="studio"&&<Studio ownedTiers={ownedTiers} ccTier={ccTier} say={say} kids={kids} dailyPrompt={daily.prompt} onPublish={post=>{setPosts(ps=>[post,...ps]);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");}}/>}
          {tab==="battle"&&<Battle ownedTiers={ownedTiers} ccTier={ccTier} wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok} say={say} blip={blip} hap={hap} onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")} onResult={(won,mult=1)=>{addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));}} onPublish={post=>setPosts(ps=>[post,...ps])}/>}
          {tab==="front"&&<OpenFront kids={kids} loks={loks} dailyPrompt={daily.prompt} hinted={traceHinted} onHinted={()=>setTraceHinted(true)} onWager={amt=>{if(loks<amt)return false;setLoks(l=>l-amt);setTotalSpent(t=>t+amt);return true;}} onEarn={n=>{addLoks(n);questTick("front",Math.max(1,Math.round(n/5)));gainXp(n);setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-3)}));}} blip={blip} say={say}/>}
          {tab==="shop"&&<Shop loks={loks} lokPass={lokPass} kids={kids} uiTheme={uiTheme} ownedThemes={ownedThemes} effect={effect} ownedEffects={ownedEffects} ownedTiers={ownedTiers} ccTier={ccTier} cosmetics={cosmetics} owned={owned} setKids={setKids} onBuyCosmetic={(cat,item)=>{if((owned[cat]||[]).includes(item.id)){setCosmetics(c=>({...c,[cat]:item.id}));blip("D5");say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),item.id]}));setCosmetics(c=>({...c,[cat]:item.id}));blip("C6");},`${item.name} unlocked`);}} onBuyPass={()=>{setLokPass(true);setOwnedThemes(Object.keys(THEMES));blip("C6");say("LokPass active!");}} onTheme={id=>{if(ownedThemes.includes(id)){setUiTheme(id);say(`Equipped ${THEMES[id].name}`);}else spend(THEMES[id].price,()=>{setOwnedThemes(o=>[...o,id]);setUiTheme(id);},`${THEMES[id].name} unlocked`);}} onEffect={(id,e)=>{if(ownedEffects.includes(id)){setEffect(id);say(id==="none"?"Effects off":`${e.name} equipped`);}else spend(e.price,()=>{setOwnedEffects(o=>[...o,id]);setEffect(id);},`${e.name} unlocked`);}} onTier={t=>spend(t.price,()=>setOwnedTiers(o=>[...o,t.layers]),`${t.label} unlocked`)} onCc={()=>spend(120,()=>setCcTier(true),"Studio Pro unlocked")}/>}
        </div>
      </main>
      {!focusMode && !lokPass&&!kids&&(<div className="fixed inset-x-0 z-40 flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-bold" data-ad-slot={ADS[adIdx].slot} data-ad-format="banner" style={{bottom:62,background:T.card,borderTop:`2px dashed ${T.ink}`,color:T.ink,opacity:adVisible?1:0,transition:"opacity .3s ease",pointerEvents:adVisible?"auto":"none"}}>
        {/* AdSense: replace inner span with <ins class="adsbygoogle"> at deploy; slot id in data-ad-slot */}
        <span className="opacity-70 truncate" key={adIdx} style={{animation:"lokrise .3s ease"}}>Ad · {ADS[adIdx].text}</span>
        <button onClick={()=>setTab("shop")} aria-label="Remove ads with LokPass" className="underline shrink-0" style={{color:T.accent}}>Remove with LokPass</button>
      </div>)}
      {!focusMode && <nav className="fixed bottom-0 inset-x-0 z-40 flex" style={{background:T.paper,borderTop:`3px solid ${T.ink}`,paddingBottom:"env(safe-area-inset-bottom)"}} role="navigation" aria-label="Main navigation">
        {[["feed",kids?"Home":"Feed",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],["gallery",kids?"You":"You",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],["studio","Studio",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg>],["battle",kids?"Draw":"Battle",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>],["front","Rush",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>],["shop","Shop",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>]].map(([id,label,icon])=>{const on=tab===id;return(<button key={id} onClick={()=>setTab(id)} aria-label={`Go to ${label}`} aria-current={on?"page":undefined} className="lok-btn lok-display relative flex-1 py-2.5 text-xs font-bold flex flex-col items-center gap-0.5" style={{color:on?T.accent:T.ink,transition:"color .2s ease"}}>
          {on&&<span className="absolute left-1/2 rounded-full" style={{top:4,width:22,height:3,transform:"translateX(-50%)",background:T.accent}} aria-hidden="true"/>}
          <span style={{opacity:on?1:0.6}} aria-hidden="true">{icon}</span>
          <span style={{opacity:on?1:0.7,fontSize:10}}>{label}</span>
        </button>);})}
      </nav>}
      {!focusMode && !showLilLok&&(<div className="fixed z-40" style={{right:14,bottom:116, transition: 'bottom 0.3s ease'}}>
        {fabBubble&&<LilLokBubble text={fabBubble} ink={T.ink} paper={T.paper}/>}
        <button onClick={()=>{setShowLilLok(true);setFabBubble("");}} aria-label={`Open LilLok — ${lillok.name} is ${phase}`} className="lok-btn rounded-full flex items-center justify-center" style={{width:60,height:60,background:T.card,...(cosmetics.blotBorder&&cosmetics.blotBorder!=="none"?blotBorderStyle(cosmetics.blotBorder,T):{border:`3px solid ${phase==="critical"?T.accent:phase==="decaying"?"#8E93A8":phase==="stasis"?"#9A9286":T.accent}`,boxShadow:`3px 3px 0 ${T.shadow}`}),animation:phase==="critical"&&!reduceMotion?"lokpulse 1.6s ease-in-out infinite":"none"}}>
          <LilLokSprite phase={phase} ink={lillok.ink} size={46} custom={customLilLok?.art}/>
          {phase!=="thriving"&&!kids&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full" aria-hidden="true" style={{background:phase==="critical"?"#C23B22":T.accent,border:`2px solid ${T.card}`}}/>}
        </button>
      </div>)}
      {showLilLok&&<LilLokPanel lillok={lillok} phase={phase} kids={kids} custom={customLilLok} loks={loks} onFeed={feedLilLok} onFlask={()=>{if(loks<10){say("Need 10 Loks","error");return false;}setLoks(l=>l-10);setTotalSpent(t=>t+10);feedLilLok(40,"flask");say("Ink flask · −10 Loks","success");return true;}} onClose={()=>setShowLilLok(false)} say={say} setLillok={setLillok} onPublish={post=>{setPosts(ps=>[post,...ps]);say("Revival animation published","success");}} onSaveCustom={c=>{setCustomLilLok(c);setLillok(s=>({...s,name:c.name}));say(`${c.name} is now your LilLok`,"success");}}/>}
      {openIdx!==null&&posts[openIdx]&&(<Viewer posts={posts} index={openIdx} bookmarks={bookmarks} cosmetics={cosmetics} onBookmark={id=>{setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in");}} onClose={()=>setOpenIdx(null)} onNav={d=>setOpenIdx(i=>Math.min(posts.length-1,Math.max(0,i+d)))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);say("Vote stamped");}} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);}} onViewed={id=>{const p=posts.find(x=>x.id===id);if(p.viewed)return;patchPost(id,{viewed:true,views:(p.views||0)+1});addLoks(3);gainXp(3);questTick("view");say("Full slide-through · +3 Loks");}} onShare={sharePost} onDelete={id=>{setPosts(ps=>ps.filter(p=>p.id!==id));setOpenIdx(null);say("Post deleted");}} onRename={(id,title)=>patchPost(id,{title})} myName={profile.name}/>)}
      {showHint&&tab==="feed"&&(<button onClick={()=>setShowHint(false)} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss hint">Slide a post down to play it · ▲ to vote · tap to dismiss</button>)}
      {showOnboard&&<Onboard onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      <div className="fixed left-1/2 z-50 flex flex-col-reverse items-center gap-1.5" style={{bottom:100,transform:"translateX(-50%)",pointerEvents:"none"}}>
        {toasts.map((t,i)=>(<div key={t.id} className="px-4 py-2 rounded-xl font-bold text-center" style={{background:t.type==="success"?T.alt:t.type==="error"?"#C23B22":T.ink,color:T.paper,border:`2.5px solid ${t.type==="success"?T.alt:T.accent}`,animation:"lokrise .2s ease",opacity:1-i*0.18,transform:`scale(${1-i*0.04})`,maxWidth:"88vw",fontSize:13}}>{t.msg}</div>))}
      </div>
    </div>
  </ThemeCtx.Provider>);
}
