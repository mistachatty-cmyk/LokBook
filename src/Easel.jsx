import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { useT, ART } from "./theme/theme.js";
import { W, H, BLENDS, hasModule, getModuleLayers } from "./constants.jsx";
import { getStroke } from 'perfect-freehand';
import { paperBase, applyBloom } from "./engine/draw.jsx";
import { cursorFor } from "./engine/cursors.js";
import { ROTATION_PAPERS } from "./engine/rotation.js";
import { hitSticker, drawStickerItem, getSticker } from "./engine/stickers.js";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock.js";
import * as Brushes from "./engine/brushes.js";

const PALLETS={
  default:[ART.ink,ART.pink,ART.teal,"#E8B14B","#7A4FBF","#3E8E4B","#D94040","#5A5A5A","#FF8C42","#C4E8C2","#4EBFFF","#F7D4FF"],
  pastel:["#A8D8EA","#AA96DA","#FCBAD3","#FFFFD2","#B5EAD7","#FFDAC1","#E0BBE4","#FEC8D8","#D4F0F0","#FCE4EC","#E8D5B7","#C9E4DE"],
  neon:["#FF00FF","#00FFFF","#FFFF00","#00FF00","#FF6600","#FF0066","#00FF66","#6600FF","#FF3300","#33FF00","#0066FF","#FF0099"],
  earth:["#8B5A2B","#6B8E23","#556B2F","#A0522D","#CD853F","#8FBC8F","#BC8F8F","#BDB76B","#D2B48C","#9ACD32","#C4A882","#A89070"],
  ocean:["#006994","#00B4D8","#90E0EF","#CAF0F8","#03045E","#0077B6","#023E8A","#48CAE4","#ADE8F4","#023E8A","#0096C7","#00B4D8"],
  sunset:["#FF6B6B","#FF8E53","#FECA57","#48DBFB","#FF9FF3","#54A0FF","#FF9F43","#EE5A24","#F368E0","#0ABDE3","#FFC312","#C4E538"],
};

const DEMO_BRUSH_PRESETS=[
  {id:"starter",name:"Starter",flow:0.35,scatter:0.15,dabs:3,angleJitter:0.2,roundness:1},
  {id:"light",name:"Light Touch",flow:0.18,scatter:0.05,dabs:1,angleJitter:0.05,roundness:1},
  {id:"breezy",name:"Breezy",flow:0.25,scatter:0.5,dabs:5,angleJitter:0.6,roundness:0.6},
  {id:"featherweight",name:"Featherweight",flow:0.12,scatter:0.3,dabs:2,angleJitter:0.3,roundness:0.8},
  {id:"basics",name:"Bold Basics",flow:0.6,scatter:0.1,dabs:2,angleJitter:0.1,roundness:1},
];

const Easel=forwardRef(function Easel({modules=[],onionFrames=[],onStroke,paper="plain",legacyMode=false,onLegacyToggle,maxLayers:maxLayersProp,ccTier=false,animFx="none",cursorPack="default",stickers=[],onStickersChange,pendingSticker=null,onStickerPlaced,say,grainIntroSeen=false,onGrainIntroSeen},ref){
  const T=useT();
  // Layer cap: the Studio TIERS system passes maxLayers explicitly; otherwise
  // fall back to whatever the owned layer modules allow.
  const maxLayers=maxLayersProp||getModuleLayers(modules);
  // LokPass (ccTier) keeps the pro set it already granted in the previous easel,
  // so upgrading the component never takes a capability away from an owner.
  const owns=id=>ccTier||hasModule(modules,id);
  const legacyRef=useRef(legacyMode);useEffect(()=>{legacyRef.current=legacyMode;},[legacyMode]);
  const hasMarker=owns("brush_marker");const hasChalk=owns("brush_chalk");const hasSym=owns("feat_symmetry");const hasCalligraphy=owns("brush_calligraphy");const hasNeon=owns("brush_neon");const hasSparkle=owns("brush_sparkle");const hasCrayon=owns("brush_crayon");const hasWash=owns("brush_wash");const hasGalaxy=owns("brush_galaxy");const showPro=hasMarker||hasChalk||hasSym||hasCalligraphy||hasNeon||hasSparkle||hasCrayon||hasWash||hasGalaxy;
  const brushList=[["ink","Ink"],["grain","Grain"]];if(hasMarker)brushList.push(["marker","Marker"]);if(hasChalk)brushList.push(["chalk","Chalk"]);if(hasCalligraphy)brushList.push(["calligraphy","Cali"]);if(hasNeon)brushList.push(["neon","Neon"]);if(hasSparkle)brushList.push(["sparkle","Sprkl"]);if(hasCrayon)brushList.push(["crayon","Crayon"]);if(hasWash)brushList.push(["wash","Wash"]);if(hasGalaxy)brushList.push(["galaxy","Galxy"]);
  const hasTools=modules.some(m=>["tool_spray","tool_glow","tool_watercolor","tool_pattern","tool_shape","tool_gradient","tool_push","tool_smudge","tool_clone","tool_blur","tool_replace","tool_rulers","tool_transform"].includes(m));
  const[layers,setLayers]=useState([{id:1,visible:true,opacity:1,blend:"source-over"}]);
  const[active,setActive]=useState(1);const[tool,setTool]=useState("pen");const[color,setColor]=useState(ART.ink);  const[recentColors,setRecentColors]=useState(()=>{try{const r=localStorage.getItem("lok:recentColors");return r?JSON.parse(r):[];}catch{return[];}});const[size,setSize]=useState(7);const[symmetry,setSymmetry]=useState("none");const[brush,setBrush]=useState("ink");const[cursorPos,setCursorPos]=useState(null);const[zoom,setZoom]=useState(1);const[pan,setPan]=useState({x:0,y:0});const[clonePt,setClonePt]=useState(null);const[shapeMode,setShapeMode]=useState("rect");const[showGuides,setShowGuides]=useState(false);const[anchorPt,setAnchorPt]=useState(null);const[blurAmount,setBlurAmount]=useState(5);  const[refImg,setRefImg]=useState(null);const[refIsVideo,setRefIsVideo]=useState(false);const[refOpacity,setRefOpacity]=useState(0.3);const[smoothStrength,setSmoothStrength]=useState(0.5);const[palette,setPalette]=useState("default");const[canvasSize,setCanvasSize]=useState("default");const isPanning=useRef(false);const panStart=useRef({x:0,y:0});const pinchRef=useRef(null);
  const[dynamics,setDynamics]=useState(true);const[brushLabOpen,setBrushLabOpen]=useState(false);const[customBrushParams,setCustomBrushParams]=useState({flow:0.35,scatter:0.15,dabs:3,angleJitter:0.2,roundness:1});
  const[fullscreen,setFullscreen]=useState(false);const[fsToolsHidden,setFsToolsHidden]=useState(false);useBodyScrollLock(fullscreen);
  // Vanishing point for the perspective guide paper, as a % of the canvas so
  // it survives resizing. Persisted because re-placing it every time you come
  // back to Studio would make the guide useless for a multi-session drawing.
  const[vp,setVp]=useState(()=>{try{const r=localStorage.getItem("lok:vp");return r?JSON.parse(r):{x:50,y:42};}catch{return{x:50,y:42};}});
  const vpDrag=useRef(false);
  useEffect(()=>{try{localStorage.setItem("lok:vp",JSON.stringify(vp));}catch{}},[vp]);
  // Belt-and-suspenders: a degenerate pinch (both touches at ~the same point)
  // used to divide by ~0 and poison zoom/pan with NaN, which crashes the
  // canvas transform permanently. The pinch math is now guarded at the
  // source, but this recovers automatically from any other path that ever
  // produces a non-finite value instead of leaving the canvas dead.
  useEffect(()=>{
    if(!Number.isFinite(zoom)||zoom<=0){setZoom(1);setPan({x:0,y:0});return;}
    if(!Number.isFinite(pan.x)||!Number.isFinite(pan.y))setPan({x:0,y:0});
  },[zoom,pan]);
  const hasBrushLabSave=owns("feat_brushlab_save");
  const[savedBrushes,setSavedBrushes]=useState(()=>{try{const r=localStorage.getItem("lok:customBrushes");return r?JSON.parse(r):[];}catch{return[];}});
  const lastMoveXY=useRef(null);const lastMoveT=useRef(0);const transformDrag=useRef(null);const labPreviewRef=useRef(null);
  const idRef=useRef(1);const canvases=useRef(new Map());const drawing=useRef(false);const undoStack=useRef([]);const redoStack=useRef([]);const wrapRef=useRef(null);const lastPts=useRef([]);const midPts=useRef([]);const activeLayer=layers.find(l=>l.id===active);
  // Sticker placement/drag — kept orthogonal to the `tool` state machine so it
  // can never interfere with brush/tool gating; down/move/up check this first
  // and fall through to normal drawing untouched when nothing sticker-related
  // is happening.
  const stickerCvRef=useRef(null);const stickerDrag=useRef(null);const[selectedSticker,setSelectedSticker]=useState(null);
  const stickerImages=useRef(new Map());const[stickerImgTick,setStickerImgTick]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    stickers.filter(s=>s.item.kind==="image"&&!stickerImages.current.has(s.item.value)).forEach(s=>{
      const id=s.item.value;stickerImages.current.set(id,null); // placeholder so we don't fetch twice
      getSticker(id).then(blob=>{
        if(cancelled||!blob)return;
        const img=new Image();const url=URL.createObjectURL(blob);
        img.onload=()=>{if(!cancelled)setStickerImgTick(t=>t+1);};
        img.src=url;stickerImages.current.set(id,img);
      }).catch(()=>{});
    });
    return()=>{cancelled=true;};
  },[stickers]);
  useEffect(()=>{
    const cv=stickerCvRef.current;if(!cv)return;const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,W,H);
    stickers.forEach(s=>drawStickerItem(ctx,s,{selected:s.id===selectedSticker,accent:T.accent,imageCache:stickerImages.current}));
  },[stickers,selectedSticker,stickerImgTick,T.accent]);
  const pointerRef=useRef({pressure:0.5,tiltX:0,tiltY:0,twist:0,pointerType:"mouse"});
  const toImg=cv=>cv.toDataURL("image/webp",0.72);
  const strokePoints=useRef([]);
  // Vector stroke capture. Purely additive: it records what was drawn
  // alongside the existing raster pipeline and never affects rendering, so
  // Studio behaves exactly as before whether or not anyone reads it back.
  // Encoded by engine/strokeCodec.js and stored in the .lok container.
  const strokeLog=useRef([]);          // committed strokes, oldest first
  const capturePts=useRef([]);         // points of the stroke in progress
  const captureMeta=useRef(null);      // {tool,color,size,layer} snapshot at pointer-down
  useImperativeHandle(ref,()=>({
    // Vector record of strokes drawn since the last drain, for encodeLok's
    // optional `strokes` payload. Peek with getStrokes(); use takeStrokes() at
    // each frame capture so strokes are attributed to the frame they belong
    // to — the log is otherwise session-wide and would flatten every page's
    // strokes together with no frame attribution.
    getStrokes(){return strokeLog.current.map(s=>({...s,points:s.points.slice()}));},
    takeStrokes(){const out=strokeLog.current.map(s=>({...s,points:s.points.slice()}));strokeLog.current=[];return out;},
    clearStrokes(){strokeLog.current=[];},
    composite(pageNum=null,{bloom=false}={}){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const ctx=tmp.getContext("2d");paperBase(ctx,pageNum);layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv&&l.visible){ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.blend;ctx.drawImage(cv,0,0);}});ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";
      // Stickers bake in here so every existing caller (capture, battle,
      // duels, the live draft poll) gets them for free with no signature
      // change. Stays synchronous: an image sticker not yet loaded into
      // stickerImages is skipped rather than awaited, since composite() must
      // not become async (see the note in engine/stickers.js) — in practice
      // it's already loaded well before a capture happens.
      stickers.forEach(s=>drawStickerItem(ctx,s,{imageCache:stickerImages.current}));
      // Bloom only runs here, at real capture moments — never on the 2s
      // draft-preview poll, which would pay the cost continuously for a
      // thumbnail nobody scrutinizes closely.
      return toImg(bloom?applyBloom(tmp):tmp);},
    blankFrame(){const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;paperBase(tmp.getContext("2d"),null);return toImg(tmp);},
    clearAll(){layers.forEach(l=>{const cv=canvases.current.get(l.id);if(cv)cv.getContext("2d").clearRect(0,0,W,H);});undoStack.current=[];redoStack.current=[];strokeLog.current=[];},
    async restoreFromImage(dataUrl){if(!dataUrl)return;const cv=canvases.current.get(layers[0].id);if(!cv)return;const img=new Image();await new Promise(res=>{img.onload=res;img.onerror=res;img.src=dataUrl;});cv.getContext("2d",{willReadFrequently:true}).drawImage(img,0,0,W,H);},
  }));
  const pos=e=>{const r=wrapRef.current.getBoundingClientRect();const vx=e.clientX-r.left,vy=e.clientY-r.top;return[(vx-pan.x)*W/(r.width*zoom),(vy-pan.y)*H/(r.height*zoom)];};
  const pushUndo=()=>{const cv=canvases.current.get(active);if(!cv)return;if(undoStack.current.length>29)undoStack.current.shift();undoStack.current.push({id:active,strokeLen:strokeLog.current.length,snap:cv.getContext("2d").getImageData(0,0,W,H)});redoStack.current=[];};
  const pct=n=>pointerRef.current;const effectiveSize=(pOff=1)=>{const p=pct().pressure;return size*(0.3+p*0.7)*pOff;};
  const dynMul=(e,cx,cy)=>{if(!dynamics)return 1;if(e.pointerType==="pen"&&typeof e.pressure==="number"&&e.pressure>0)return 0.4+Math.min(e.pressure,1)*0.9;const now=e.timeStamp||performance.now();let mul=1;if(lastMoveXY.current){const dt=Math.max(now-lastMoveT.current,1);const dist=Math.hypot(cx-lastMoveXY.current[0],cy-lastMoveXY.current[1]);const speed=dist/dt;mul=Math.max(0.55,Math.min(1.2,1.2-speed*2.4));}lastMoveT.current=now;lastMoveXY.current=[cx,cy];return mul;};
  const applyTransform=fn=>{const cv=canvases.current.get(active);if(!cv)return;pushUndo();const ctx=cv.getContext("2d");const snap=ctx.getImageData(0,0,W,H);const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;tmp.getContext("2d").putImageData(snap,0,0);ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);fn(ctx);ctx.drawImage(tmp,-W/2,-H/2);ctx.restore();};
  const rotateLayer=deg=>applyTransform(c=>c.rotate(deg*Math.PI/180));
  const scaleLayer=s=>applyTransform(c=>c.scale(s,s));
  const flipLayer=axis=>applyTransform(c=>c.scale(axis==="h"?-1:1,axis==="v"?-1:1));
  const commitTranslate=(dx,dy)=>applyTransform(c=>c.translate(dx,dy));
  // Every brush below is now the pure engine/brushes.js stamp function,
  // called with an explicit params object built from this component's own
  // state/refs — same closures conceptually, just handed across a function
  // boundary instead of captured, so the exact same engine is reusable
  // outside Easel (bot art, future tools). Behavior-preserving: verify:easel
  // is the proof no pixel changed by this extraction.
  const brushParams=(extra)=>({color,size,pressure:pct().pressure,tiltX:pct().tiltX||0,tiltY:pct().tiltY||0,twist:pct().twist||0,legacy:legacyRef.current,tool,brush,...extra});
  const dabCustom=(ctx,x,y,sz,col,p)=>Brushes.dabCustom(ctx,x,y,sz,col,p);
  const customAt=(ctx,x,y)=>Brushes.customAt(ctx,x,y,{size,color,customParams:customBrushParams});
  const applyBrushPreset=p=>setCustomBrushParams({flow:p.flow,scatter:p.scatter,dabs:p.dabs,angleJitter:p.angleJitter,roundness:p.roundness});
  const useCustomBrush=()=>{setBrush("custom");if(tool==="eraser"||tool==="fill"||tool==="eyedrop")setTool("pen");};
  const saveBrushPreset=()=>{if(!hasBrushLabSave)return;const name=`Brush ${savedBrushes.length+1}`;const next=[...savedBrushes,{id:`custom_${Date.now()}`,name,...customBrushParams}];setSavedBrushes(next);try{localStorage.setItem("lok:customBrushes",JSON.stringify(next));}catch{}};
  useEffect(()=>{const cv=labPreviewRef.current;if(!cv||!brushLabOpen)return;const ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);for(let x=8;x<cv.width-8;x+=3){const y=cv.height/2+Math.sin(x*0.15)*cv.height*0.22;dabCustom(ctx,x,y,size*0.6,color,customBrushParams);}},[brushLabOpen,customBrushParams,size,color]);
  const dabAt=(ctx,x,y)=>Brushes.dabAt(ctx,x,y,brushParams());
  const sprayAt=(ctx,x,y)=>Brushes.sprayAt(ctx,x,y,brushParams());
  const glowAt=(ctx,x,y)=>Brushes.glowAt(ctx,x,y,brushParams());
  const watercolorAt=(ctx,x,y)=>Brushes.watercolorAt(ctx,x,y,brushParams());
  const calligraphyAt=(ctx,x,y)=>Brushes.calligraphyAt(ctx,x,y,brushParams());
  const neonAt=(ctx,x,y)=>Brushes.neonAt(ctx,x,y,brushParams());
  const sparkleAt=(ctx,x,y)=>Brushes.sparkleAt(ctx,x,y,brushParams());
  const grainAt=(ctx,x,y)=>Brushes.grainAt(ctx,x,y,brushParams());
  const crayonAt=(ctx,x,y)=>Brushes.crayonAt(ctx,x,y,brushParams());
  const washAt=(ctx,x,y)=>Brushes.washAt(ctx,x,y,brushParams());
  const galaxyAt=(ctx,x,y)=>Brushes.galaxyAt(ctx,x,y,brushParams());
  const partialPatternAt=(ctx,x,y)=>Brushes.partialPatternAt(ctx,x,y,{color,size});
  const symXY=(x,y)=>{const o=[[x,y]];if(symmetry==="mirrorX"||symmetry==="quad")o.push([W-x,y]);if(symmetry==="mirrorY"||symmetry==="quad")o.push([x,H-y]);if(symmetry==="quad")o.push([W-x,H-y]);if(symmetry.startsWith("radial")){const n=+symmetry.slice(6),cx=W/2,cy=H/2;for(let i=1;i<n;i++){const a=(i/n)*Math.PI*2,c=Math.cos(a),s=Math.sin(a);o.push([cx+(x-cx)*c-(y-cy)*s,cy+(x-cx)*s+(y-cy)*c]);}}return o;};
  const brushFn=brush==="spray"?sprayAt:brush==="glow"?glowAt:brush==="watercolor"?watercolorAt:brush==="pattern"?partialPatternAt:brush==="calligraphy"?calligraphyAt:brush==="neon"?neonAt:brush==="sparkle"?sparkleAt:brush==="crayon"?crayonAt:brush==="wash"?washAt:brush==="galaxy"?galaxyAt:brush==="grain"?grainAt:brush==="custom"?customAt:null;
  const stamp=(ctx,x,y,start)=>{
    const pts=symXY(x,y);
    if(brushFn){pts.forEach(([sx,sy])=>brushFn(ctx,sx,sy));return;}
    if(tool==="soft"||brush==="chalk"||brush==="marker"){pts.forEach(([sx,sy])=>dabAt(ctx,sx,sy));return;}

    if(brush==="ink" && tool==="pen"){
      ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";
      ctx.fillStyle=color;
      ctx.globalAlpha=1;
      const stroke=getStroke(strokePoints.current,{size:size*(dynMul(pointerRef.current,x,y)),thinning:0.6,smoothing:0.5,streamline:0.5,simulatePressure:pointerRef.current.pointerType!=="pen"});
      const pathData=stroke.reduce((acc,[x,y],i)=>acc+(i===0?"M":"L")+x.toFixed(2)+","+y.toFixed(2), "")+"Z";
      ctx.fill(new Path2D(pathData));
      ctx.globalAlpha=1;
      return;
    }

    if(start){
      lastPts.current=pts.map(p=>[...p]);
      midPts.current=pts.map(p=>[...p]);
      ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.fillStyle=color;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;
      pts.forEach(([sx,sy])=>{ctx.beginPath();ctx.arc(sx,sy,(tool==="eraser"?size*2.4:size)/2,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;return;
    }
    ctx.globalCompositeOperation=tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=color;ctx.lineWidth=tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size;ctx.globalAlpha=brush==="marker"&&tool!=="eraser"?0.55:1;ctx.lineCap="round";ctx.lineJoin="round";
    pts.forEach(([sx,sy],i)=>{const lp=lastPts.current[i]||[sx,sy];const mp=midPts.current[i]||lp;const nmx=(lp[0]+sx)/2,nmy=(lp[1]+sy)/2;ctx.beginPath();ctx.moveTo(mp[0],mp[1]);ctx.quadraticCurveTo(lp[0],lp[1],nmx,nmy);ctx.stroke();midPts.current[i]=[nmx,nmy];lastPts.current[i]=[sx,sy];});
    ctx.globalAlpha=1;
  };
  const fillLayer=ctx=>{ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;ctx.fillRect(0,0,W,H);};
  const eyedrop=(x,y)=>{for(let i=layers.length-1;i>=0;i--){const cv=canvases.current.get(layers[i].id);if(!cv||!layers[i].visible)continue;const d=cv.getContext("2d").getImageData(Math.floor(x),Math.floor(y),1,1).data;if(d[3]>10){setColorAndRecent(`rgb(${d[0]},${d[1]},${d[2]})`);setTool("pen");return;}}};
  const down=e=>{e.preventDefault();const p0=pos(e);
    if(pendingSticker){onStickersChange&&onStickersChange([...stickers,{id:`ps_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,item:pendingSticker,x:p0[0],y:p0[1],scale:1,rot:0}]);onStickerPlaced&&onStickerPlaced();return;}
    const hit=hitSticker(stickers,p0);
    if(hit){e.currentTarget.setPointerCapture(e.pointerId);stickerDrag.current={id:hit.sticker.id,mode:hit.handle,start:p0,orig:{...hit.sticker}};setSelectedSticker(hit.sticker.id);return;}
    if(selectedSticker)setSelectedSticker(null);
    const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;e.currentTarget.setPointerCapture(e.pointerId);
    // Seed with the pointerdown sample: move() alone made every stroke start
    // one sample late, and a tap recorded nothing at all despite drawing a dab.
    capturePts.current=[{x:p0[0],y:p0[1],pressure:e.pointerType==="pen"&&e.pressure>0?e.pressure:0.5}];
    captureMeta.current={tool,color,size,layer:active};
    const mul=dynMul(e,p0[0],p0[1]);const pressure=e.pointerType==="pen"&&e.pressure>0?e.pressure:mul;pointerRef.current={pressure,tiltX:e.tiltX||0,tiltY:e.tiltY||0,twist:e.twist||0,pointerType:e.pointerType||"mouse"};strokePoints.current=[[...p0,pressure]];if(tool==="eyedrop"){eyedrop(...p0);return;}if(tool==="transform"){transformDrag.current={startClient:[e.clientX,e.clientY],startCanvas:p0};return;}pushUndo();if(tool==="fill"){fillLayer(cv.getContext("2d"));return;}if(tool==="clone"){if(!clonePt){setClonePt(p0);return;}const[ox,oy]=clonePt;const[cx,cy]=p0;const src=cv.getContext("2d").getImageData(Math.floor(ox),Math.floor(oy),48,60);cv.getContext("2d").putImageData(src,Math.floor(cx)-24,Math.floor(cy)-30);setClonePt(null);return;}if(tool==="shape"){setAnchorPt(p0);drawing.current=true;return;}if(tool==="gradient"){setAnchorPt(p0);drawing.current=true;return;}drawing.current=true;onStroke&&onStroke();stamp(cv.getContext("2d"),...p0,true);};
  // Animation FX overlay — ported from the previous easel so ANIMATION_FX
  // purchases keep working after the component swap.
  const fxAt=(ctx,x,y)=>{if(!animFx||animFx==="none"||Math.random()>0.4)return;ctx.save();ctx.globalCompositeOperation="source-over";
    if(animFx==="sparkle_trail"){ctx.fillStyle="#fff";ctx.globalAlpha=0.8;for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2,r=Math.random()*size*1.2;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.8+Math.random()*1.4,0,Math.PI*2);ctx.fill();}}
    else if(animFx==="neon_pulse"){const g=ctx.createRadialGradient(x,y,0,x,y,size*1.6);g.addColorStop(0,"#fff");g.addColorStop(0.4,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(x,y,size*1.6,0,Math.PI*2);ctx.fill();}
    else if(animFx==="ink_splatter"){ctx.fillStyle=color;ctx.globalAlpha=0.5;for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,r=size*0.6+Math.random()*size;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.6+Math.random()*1.6,0,Math.PI*2);ctx.fill();}}
    else if(animFx==="smoke_rise"){ctx.fillStyle="#B8BEC9";ctx.globalAlpha=0.18;ctx.beginPath();ctx.arc(x+(Math.random()-.5)*size,y-size*(0.6+Math.random()),size*0.9,0,Math.PI*2);ctx.fill();}
    else if(animFx==="fire_embers"){ctx.fillStyle=Math.random()<0.5?"#FF8A5C":"#E8B14B";ctx.globalAlpha=0.6;ctx.beginPath();ctx.arc(x+(Math.random()-.5)*size*1.4,y-Math.random()*size,1+Math.random()*1.8,0,Math.PI*2);ctx.fill();}
    else if(animFx==="water_ripple"){ctx.strokeStyle=color;ctx.globalAlpha=0.25;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,size*(1+Math.random()),0,Math.PI*2);ctx.stroke();}
    else if(animFx==="galaxy_swirl"){const cs=["#7A4FBF","#2FA9A0","#FF5DA2","#E8B14B","#fff"];ctx.fillStyle=cs[Math.floor(Math.random()*cs.length)];ctx.globalAlpha=0.55;const a=Math.random()*Math.PI*2,r=Math.random()*size*1.3;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,0.8+Math.random()*1.6,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;ctx.restore();};
  const move=e=>{if(stickerDrag.current){const p=pos(e);const{id,mode,start,orig}=stickerDrag.current;onStickersChange&&onStickersChange(stickers.map(s=>{if(s.id!==id)return s;if(mode==="move")return{...s,x:orig.x+(p[0]-start[0]),y:orig.y+(p[1]-start[1])};const d0=Math.hypot(start[0]-orig.x,start[1]-orig.y)||1;const d1=Math.hypot(p[0]-orig.x,p[1]-orig.y);return{...s,scale:Math.max(0.25,Math.min(4,orig.scale*(d1/d0)))};}));return;}if(tool==="transform"){if(!transformDrag.current)return;const cv=canvases.current.get(active);if(cv)cv.style.transform=`translate(${e.clientX-transformDrag.current.startClient[0]}px,${e.clientY-transformDrag.current.startClient[1]}px)`;return;}if(!drawing.current&&tool!=="push"&&tool!=="smudge")return;const cv=canvases.current.get(active);if(!cv)return;const ctx=cv.getContext("2d");const evs=(e.getCoalescedEvents&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];const p=pos(evs[evs.length-1]);if(drawing.current)fxAt(ctx,p[0],p[1]);const mul=dynMul(e,p[0],p[1]);pointerRef.current={pressure:e.pointerType==="pen"&&e.pressure>0?e.pressure:mul,tiltX:e.tiltX||0,tiltY:e.tiltY||0,twist:e.twist||0,pointerType:e.pointerType||"mouse"};if(tool==="push"){ctx.globalCompositeOperation="source-over";const[x,y]=p;const d=ctx.getImageData(Math.max(0,Math.floor(x)-size),Math.max(0,Math.floor(y)-size),size*2,size*2);ctx.putImageData(d,Math.max(0,Math.floor(x)-size+2),Math.max(0,Math.floor(y)-size+2));return;}if(tool==="smudge"){const[x,y]=p;const rx=Math.max(0,Math.floor(x)-8),ry=Math.max(0,Math.floor(y)-8);const d=ctx.getImageData(rx,ry,20,20);for(let i=0;i<d.data.length;i+=4){d.data[i]=(d.data[i]+d.data[i+4]+d.data[i-4]||d.data[i])/3;d.data[i+1]=(d.data[i+1]+d.data[i+5]+d.data[i-3]||d.data[i+1])/3;d.data[i+2]=(d.data[i+2]+d.data[i+6]+d.data[i-2]||d.data[i+2])/3;}ctx.putImageData(d,rx,ry);return;}if(tool==="shape"||tool==="gradient"){lastPts.current=[[p[0],p[1]]];return;}
    const freehand=brush==="ink"&&tool==="pen";
    evs.forEach(ev=>{const q=pos(ev);if(freehand)strokePoints.current.push([q[0],q[1],pointerRef.current.pressure]);
      if(captureMeta.current)capturePts.current.push({x:q[0],y:q[1],pressure:pointerRef.current.pressure});
      stamp(ctx,q[0],q[1],false);});};
  const up=e=>{if(stickerDrag.current){stickerDrag.current=null;try{if(e?.currentTarget?.releasePointerCapture&&e?.pointerId!=null)e.currentTarget.releasePointerCapture(e.pointerId);}catch{}return;}if(tool==="transform"){const cv=canvases.current.get(active);if(cv)cv.style.transform="";if(transformDrag.current&&e){const p1=pos(e);const[sx,sy]=transformDrag.current.startCanvas;const dx=p1[0]-sx,dy=p1[1]-sy;if(Math.abs(dx)>0.5||Math.abs(dy)>0.5)commitTranslate(dx,dy);}transformDrag.current=null;return;}drawing.current=false;strokePoints.current=[];
    if(captureMeta.current&&capturePts.current.length>0){strokeLog.current.push({...captureMeta.current,points:capturePts.current});if(strokeLog.current.length>4000)strokeLog.current.shift();}
    captureMeta.current=null;capturePts.current=[];
    if(tool==="shape"&&anchorPt){const cv=canvases.current.get(active);if(cv){const ctx=cv.getContext("2d");const[ax,ay]=anchorPt;const[sx,sy]=lastPts.current[0]||[ax,ay];const x=Math.min(ax,sx),y=Math.min(ay,sy),w=Math.abs(sx-ax),h=Math.abs(sy-ay);ctx.globalCompositeOperation="source-over";ctx.fillStyle=color;if(shapeMode==="ellipse")ctx.beginPath(),ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2),ctx.fill();else ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;}setAnchorPt(null);}if(tool==="gradient"&&anchorPt){const cv=canvases.current.get(active);if(cv){const ctx=cv.getContext("2d");const[ax,ay]=anchorPt;const[sx,sy]=lastPts.current[0]||[ax,ay];const g=ctx.createLinearGradient(ax,ay,sx,sy);g.addColorStop(0,color);g.addColorStop(0.5,color);g.addColorStop(1,T.paper);ctx.globalCompositeOperation="source-over";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}setAnchorPt(null);}lastPts.current=[];midPts.current=[];try{if(e?.currentTarget?.releasePointerCapture&&e?.pointerId!=null)e.currentTarget.releasePointerCapture(e.pointerId);}catch{}};
  const undo=()=>{const u=undoStack.current.pop();if(!u)return;const cv=canvases.current.get(u.id);if(cv){redoStack.current.push({id:u.id,strokeLen:strokeLog.current.length,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(u.snap,0,0);}
    // Roll the vector log back with the pixels. Without this an undone stroke
    // stayed in the log and still exported, so the .lokvec record and the
    // rasterised frame disagreed about what had been drawn.
    if(typeof u.strokeLen==="number"&&u.strokeLen<strokeLog.current.length)strokeLog.current.length=u.strokeLen;};
  const redo=()=>{const r=redoStack.current.pop();if(!r)return;const cv=canvases.current.get(r.id);if(cv){undoStack.current.push({id:r.id,strokeLen:strokeLog.current.length,snap:cv.getContext("2d").getImageData(0,0,W,H)});cv.getContext("2d").putImageData(r.snap,0,0);}};
  const addLayer=()=>{if(layers.length>=maxLayers)return;const id=++idRef.current;setLayers(ls=>[...ls,{id,visible:true,opacity:1,blend:"source-over"}]);setActive(id);};
  const removeLayer=id=>{if(layers.length<=1)return;canvases.current.delete(id);setLayers(ls=>{const next=ls.filter(l=>l.id!==id);if(active===id)setActive(next[next.length-1].id);return next;});};
  const patchLayer=(id,p)=>setLayers(ls=>ls.map(l=>(l.id===id?{...l,...p}:l)));
  const setColorAndRecent=c=>{setColor(c);if(tool==="eraser")setTool("pen");setRecentColors(r=>[c,...r.filter(x=>x!==c)].slice(0,8));};
  const blurLayer=(ctx,r)=>{const d=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);for(let y=r;y<H-r;y++){for(let x=r;x<W-r;x++){let r2=0,g=0,b=0,a=0,n=0;for(let dy=-r;dy<=r;dy++){for(let dx=-r;dx<=r;dx++){const i=((y+dy)*W+(x+dx))*4;r2+=d.data[i];g+=d.data[i+1];b+=d.data[i+2];a+=d.data[i+3];n++;}}ctx.fillStyle="rgba("+(r2/n|0)+","+(g/n|0)+","+(b/n|0)+","+(a/n)+")";ctx.fillRect(x,y,1,1);}}};
  const replaceColor=(ctx,fromColor)=>{const d=ctx.getImageData(0,0,W,H);let tc;{const m=fromColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);if(m){tc={r:+m[1],g:+m[2],b:+m[3]};}else{const c=document.createElement("canvas").getContext("2d");c.fillStyle=fromColor;c.fillRect(0,0,1,1);const p=c.getImageData(0,0,1,1).data;tc={r:p[0],g:p[1],b:p[2]};}}const R=30;for(let i=0;i<d.data.length;i+=4){const dr=d.data[i]-tc.r,dg=d.data[i+1]-tc.g,db=d.data[i+2]-tc.b;if(dr*dr+dg*dg+db*db<R*R){d.data[i]=255;d.data[i+1]=255;d.data[i+2]=255;}}ctx.putImageData(d,0,0);};
  const swatches=owns("feat_palettes")&&PALLETS[palette]?PALLETS[palette]:PALLETS.default;
  return(<div className={fullscreen?"fixed inset-0 z-[70] flex flex-col items-center justify-center gap-2 p-3 overflow-y-auto":"relative"} style={fullscreen?{background:T.paper}:undefined}>
    <button onClick={()=>setFullscreen(f=>!f)} aria-label={fullscreen?"Exit fullscreen canvas":"Fullscreen canvas"} className="lok-btn absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base transition-opacity duration-200" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink,opacity:fullscreen?1:0.45}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=fullscreen?1:0.45}>{fullscreen?"⤡":"⤢"}</button>
    {fullscreen&&<button onClick={()=>setFsToolsHidden(h=>!h)} aria-label={fsToolsHidden?"Show tools":"Hide tools for more canvas"} aria-pressed={fsToolsHidden} className="lok-btn absolute top-2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-base" style={{right:48,border:`2px solid ${T.ink}`,background:fsToolsHidden?T.accent:T.card,color:fsToolsHidden?T.onAccent:T.ink}}>{fsToolsHidden?"⛶":"🛠"}</button>}
    <div ref={wrapRef} className="relative rounded-2xl overflow-hidden select-none" style={{border:`3px solid ${T.ink}`,background:ART.paper,boxShadow:`6px 6px 0 ${T.shadow}`,aspectRatio:"4 / 5",...(fullscreen?{height:fsToolsHidden?"92vh":"62vh",width:"auto",maxWidth:"100%",transition:"height .25s ease"}:{}),cursor:zoom!==1?"grab":"default"}}
      onWheel={e=>{e.preventDefault();const d=e.deltaY>0?-0.1:0.1;const r=wrapRef.current?.getBoundingClientRect();if(!r)return;const mx=(e.clientX-r.left)/r.width,my=(e.clientY-r.top)/r.height;setZoom(z=>{const nz=Math.max(0.25,Math.min(4,z+d));setPan(p=>({x:mx-(mx-p.x)*nz/z,y:my-(my-p.y)*nz/z}));return nz;});}}
      onTouchStart={e=>{if(e.touches.length===2){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const dist=Math.hypot(dx,dy);if(dist<2)return;pinchRef.current={dist,zoom:zoom};}}}
      onTouchMove={e=>{if(e.touches.length===2&&pinchRef.current){e.preventDefault();const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;const nd=Math.hypot(dx,dy);if(nd<2)return;const d=nd/pinchRef.current.dist;const r=wrapRef.current?.getBoundingClientRect();if(!r)return;const mx=((e.touches[0].clientX+e.touches[1].clientX)/2-r.left)/r.width,my=((e.touches[0].clientY+e.touches[1].clientY)/2-r.top)/r.height;setZoom(z=>{const raw=pinchRef.current.zoom*d;const nz=Number.isFinite(raw)?Math.max(0.25,Math.min(4,raw)):z;if(nz===z)return z;setPan(p=>{const px=mx-(mx-p.x)*nz/z,py=my-(my-p.y)*nz/z;return Number.isFinite(px)&&Number.isFinite(py)?{x:px,y:py}:p;});return nz;});}}}
      onTouchEnd={e=>{if(e.touches.length<2)pinchRef.current=null;}}
      onMouseDown={e=>{if(e.button===1){e.preventDefault();isPanning.current=true;panStart.current={x:e.clientX-pan.x,y:e.clientY-pan.y};}}}
      onMouseMove={e=>{if(!isPanning.current)return;setPan({x:e.clientX-panStart.current.x,y:e.clientY-panStart.current.y});}}
      onMouseUp={()=>{isPanning.current=false;}}
      onContextMenu={e=>{if(e.button===1){e.preventDefault();}}}>
      <div style={{position:"absolute",inset:0,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:"0 0"}}>
      {onionFrames.map((of,i)=>(<img key={i} src={of.src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:of.opacity,mixBlendMode:"multiply"}}/>))}
      {refImg&&(refIsVideo?<video src={refImg} autoPlay loop muted playsInline aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:refOpacity,objectFit:"cover"}}/>:<img src={refImg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:refOpacity}}/>)}
      {layers.map(l=>(<canvas key={l.id} width={W} height={H} ref={el=>{if(el){canvases.current.set(l.id,el);el.getContext("2d",{willReadFrequently:true});}}} aria-hidden="true" className="absolute inset-0 w-full h-full" style={{opacity:l.opacity,display:l.visible?"block":"none",mixBlendMode:l.blend==="source-over"?"normal":l.blend}}/>))}
      <canvas ref={stickerCvRef} width={W} height={H} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{zIndex:8}}/>
      <div className="absolute inset-0" style={{touchAction:"none",cursor:cursorFor(cursorPack)}} role="img" aria-label="Drawing canvas" onPointerDown={down} onPointerMove={e=>{move(e);const r=wrapRef.current?.getBoundingClientRect();if(r)setCursorPos([(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100]);}} onPointerUp={e=>{up(e);setCursorPos(null);}} onPointerLeave={e=>{up(e);setCursorPos(null);}}/>
      {cursorPos&&(tool==="pen"||tool==="soft"||tool==="eraser")&&<div aria-hidden="true" className="absolute pointer-events-none" style={{left:`${cursorPos[0]}%`,top:`${cursorPos[1]}%`,width:tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size,height:tool==="eraser"?size*2.4:brush==="marker"?size*1.7:size,borderRadius:"50%",border:`2px solid ${T.accent}`,background:"rgba(255,255,255,.25)",transform:"translate(-50%,-50%)",zIndex:10}}/>}
      {ROTATION_PAPERS[paper]&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:ROTATION_PAPERS[paper].replace(/INK([0-9A-Fa-f]{2})/g,(_,a)=>`${T.ink}${a}`),zIndex:5}}/>}
      {paper==="grid"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:`repeating-linear-gradient(${T.ink}15 0 1px,transparent 1px ${H/10}px),repeating-linear-gradient(90deg,${T.ink}15 0 1px,transparent 1px ${W/10}px)`,zIndex:5}}/>}
      {paper==="dots"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:`radial-gradient(circle,${T.ink}25 1px,transparent 1px)`,backgroundSize:`${W/10}px ${H/10}px`,zIndex:5}}/>}
      {paper==="storyboard"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{backgroundImage:[`linear-gradient(${T.ink}20 0 1px,transparent 1px)`,`linear-gradient(90deg,${T.ink}20 0 1px,transparent 1px)`].join(","),backgroundSize:[`100% ${H/3}px`,`${W/2}px 100%`].join(","),zIndex:5}}><div className="absolute left-1/2 top-0 bottom-0" style={{width:1,background:T.ink+"30"}}/><div className="absolute top-[33.33%] left-0 right-0" style={{height:1,background:T.ink+"30"}}/><div className="absolute top-[66.66%] left-0 right-0" style={{height:1,background:T.ink+"30"}}/></div>}
      {paper==="graphite"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{background:`repeating-conic-gradient(${T.ink}08 0% 25%,transparent 0% 50%) 0 0 / 4px 4px`,opacity:0.5,zIndex:5}}/>}
      {/* One-point perspective: a horizon with rays converging on a centred
          vanishing point, so you can rough in depth without guessing. */}
      {paper==="perspective"&&<div className="absolute inset-0 pointer-events-none" style={{zIndex:6}}>
        <div className="absolute left-0 right-0" style={{top:`${vp.y}%`,height:1,background:`${T.ink}33`}}/>
        {Array.from({length:16}).map((_,i)=>{const a=(i/16)*Math.PI*2;return(<div key={i} className="absolute" style={{left:`${vp.x}%`,top:`${vp.y}%`,width:"180%",height:1,background:`${T.ink}1A`,transformOrigin:"0 0",transform:`rotate(${(a*180/Math.PI).toFixed(2)}deg)`}}/>);})}
        {/* The vanishing point is a real handle: drag it and the horizon and
            every ray re-derive from the new position. Grabbing it must not
            start a stroke, hence the pointer capture + stopPropagation. */}
        <button type="button" aria-label="Drag the vanishing point"
          onPointerDown={e=>{e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);vpDrag.current=true;}}
          onPointerMove={e=>{if(!vpDrag.current)return;e.stopPropagation();const r=wrapRef.current?.getBoundingClientRect();if(!r)return;
            setVp({x:Math.max(2,Math.min(98,((e.clientX-r.left)/r.width)*100)),y:Math.max(2,Math.min(98,((e.clientY-r.top)/r.height)*100))});}}
          onPointerUp={e=>{e.stopPropagation();vpDrag.current=false;}}
          onPointerCancel={()=>{vpDrag.current=false;}}
          className="absolute rounded-full"
          style={{left:`${vp.x}%`,top:`${vp.y}%`,width:24,height:24,marginLeft:-12,marginTop:-12,pointerEvents:"auto",touchAction:"none",cursor:"grab",background:"transparent",border:"none",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{width:11,height:11,borderRadius:"50%",background:T.accent,border:`2px solid ${T.paper}`,boxShadow:`0 0 0 1.5px ${T.accent}`}}/>
        </button>
      </div>}
      {/* Isometric: 30° lattice for boxes, tiles and pixel-ish constructions. */}
      {paper==="isometric"&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{zIndex:5,backgroundImage:[`repeating-linear-gradient(30deg,${T.ink}18 0 1px,transparent 1px ${W/9}px)`,`repeating-linear-gradient(-30deg,${T.ink}18 0 1px,transparent 1px ${W/9}px)`,`repeating-linear-gradient(90deg,${T.ink}10 0 1px,transparent 1px ${W/9}px)`].join(",")}}/>}
      {(symmetry==="mirrorX"||symmetry==="quad")&&<div aria-hidden="true" className="absolute top-0 bottom-0 pointer-events-none" style={{left:"50%",width:2,background:`repeating-linear-gradient(${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {(symmetry==="mirrorY"||symmetry==="quad")&&<div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none" style={{top:"50%",height:2,background:`repeating-linear-gradient(90deg,${T.accent} 0 6px, transparent 6px 12px)`}}/>}
      {symmetry.startsWith("radial")&&<div aria-hidden="true" className="absolute pointer-events-none rounded-full" style={{left:"50%",top:"50%",width:10,height:10,transform:"translate(-50%,-50%)",border:`2.5px solid ${T.accent}`}}/>}
      <div className="absolute top-1.5 left-1.5 lok-display px-2 py-0.5 rounded-md text-xs font-extrabold pointer-events-none" style={{background:"rgba(35,48,107,.85)",color:T.paper,backdropFilter:"blur(3px)"}}>L{layers.findIndex(l=>l.id===active)+1} / {layers.length}</div>
      {canvasSize!=="default"&&(<div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{zIndex:6}}><div style={{width:canvasSize==="story"?"37.5%":canvasSize==="square"?"80%":canvasSize==="wide"?"100%":"100%",height:canvasSize==="story"?"100%":canvasSize==="square"?"80%":canvasSize==="wide"?"56.25%":"100%",border:`2px dashed ${T.accent}`,opacity:0.5}}/></div>)}
    </div>
    {zoom!==1&&<div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold pointer-events-none" style={{background:"rgba(0,0,0,.6)",color:"#fff"}}>{Math.round(zoom*100)}%</div>}
    </div>
    <div style={fullscreen&&fsToolsHidden?{maxHeight:0,overflow:"hidden",opacity:0}:{maxHeight:"none",opacity:1,transition:"opacity .2s ease"}}>
    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Layer controls">
      {layers.map((l,i)=>(<div key={l.id} className="shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg" style={{border:`2.5px solid ${l.id===active?T.accent:T.ink}`,background:l.id===active?T.card:"transparent"}}>
        <button onClick={()=>setActive(l.id)} aria-label={`Select layer ${i+1}`} aria-pressed={l.id===active} className="font-bold text-xs px-1" style={{color:T.ink}}>L{i+1}</button>
        <button onClick={()=>patchLayer(l.id,{visible:!l.visible})} aria-label={l.visible?`Hide layer ${i+1}`:`Show layer ${i+1}`} className="text-xs font-bold w-5" style={{color:T.ink,opacity:l.visible?1:0.35}}>{l.visible?"●":"○"}</button>
        {layers.length>1&&<button onClick={()=>removeLayer(l.id)} aria-label={`Delete layer ${i+1}`} className="text-xs font-bold" style={{color:T.accent}}>✕</button>}
      </div>))}
      <button onClick={addLayer} disabled={layers.length>=maxLayers} aria-label="Add layer" className="shrink-0 px-2.5 py-1 rounded-lg font-extrabold text-sm" style={{border:`2.5px solid ${T.ink}`,color:T.ink,opacity:layers.length>=maxLayers?0.35:1,background:T.card}}>+ layer</button>
      {activeLayer&&<label className="shrink-0 flex items-center gap-1.5 text-xs font-bold ml-1" style={{color:T.ink}}>opacity<input type="range" min="0.1" max="1" step="0.05" value={activeLayer.opacity} onChange={e=>patchLayer(active,{opacity:+e.target.value})} style={{accentColor:T.accent,width:64}} aria-label="Layer opacity"/></label>}
    </div>
    {owns("feat_blend")&&activeLayer&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Blend modes">
      <span className="text-xs font-bold opacity-60 shrink-0">blend</span>
      {BLENDS.map(b=>(<button key={b} onClick={()=>patchLayer(active,{blend:b})} aria-pressed={activeLayer.blend===b} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${activeLayer.blend===b?T.accent:T.ink}`,background:activeLayer.blend===b?T.ink:T.card,color:activeLayer.blend===b?T.paper:T.ink}}>{{"source-over":"normal","color-dodge":"dodge","color-burn":"burn","hard-light":"h.light","soft-light":"s.light"}[b]||b}</button>))}
    </div>)}
    <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" role="toolbar" aria-label="Tools">
      {[["fill","Fill"],["eyedrop","Eyedrop"]].map(([id,l])=>(<button key={id} onClick={()=>setTool(id)} aria-pressed={tool===id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${tool===id?T.accent:T.ink}`,background:tool===id?T.ink:T.card,color:tool===id?T.paper:T.ink}}>{l}</button>))}
      <button onClick={()=>setBrushLabOpen(o=>!o)} aria-pressed={brushLabOpen} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${brushLabOpen?T.accent:T.ink}`,background:brushLabOpen?T.ink:T.card,color:brushLabOpen?T.paper:T.ink}}>Brush Lab</button>
      <button onClick={()=>setDynamics(d=>!d)} aria-pressed={dynamics} title="Pressure & speed-based size dynamics" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${dynamics?T.accent:T.ink}`,background:dynamics?T.ink:T.card,color:dynamics?T.paper:T.ink}}>Dynamics</button>
      {showPro&&(<div className="flex items-center gap-1.5"><span className="text-xs font-bold opacity-60 shrink-0">pro</span>
        {brushList.map(([id,l])=>(<button key={id} onClick={()=>{setBrush(id);if(tool==="eraser"||tool==="fill"||tool==="eyedrop")setTool("pen");if(id==="grain"&&!grainIntroSeen){say&&say("🖌️ Grain — real canvas texture, try it on a big shape");onGrainIntroSeen&&onGrainIntroSeen();}}} aria-pressed={brush===id} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${brush===id?T.accent:T.ink}`,background:brush===id?T.ink:T.card,color:brush===id?T.paper:T.ink}}>{l}</button>))}
        {hasSym&&<select value={symmetry} onChange={e=>setSymmetry(e.target.value)} aria-label="Symmetry mode" className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${symmetry!=="none"?T.accent:T.ink}`,background:symmetry!=="none"?T.ink:T.card,color:symmetry!=="none"?T.paper:T.ink}}>
          <option value="none">No symmetry</option><option value="mirrorX">Mirror X</option><option value="mirrorY">Mirror Y</option><option value="quad">4-Way</option><option value="radial4">Radial 4</option><option value="radial6">Radial 6</option><option value="radial8">Radial 8</option>
        </select>}</div>)}
    </div>
    {brushLabOpen&&(<div className="mt-1.5 p-2.5 rounded-xl flex flex-col gap-2" style={{border:`2.5px solid ${T.ink}`,background:T.card}}>
      <div className="flex items-center gap-2">
        <canvas ref={labPreviewRef} width={220} height={48} aria-label="Brush preview" className="rounded-lg" style={{border:`2px solid ${T.ink}`,background:ART.paper,width:220,height:48}}/>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_BRUSH_PRESETS.map(p=>(<button key={p.id} onClick={()=>applyBrushPreset(p)} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.paper,color:T.ink}}>{p.name}</button>))}
        {savedBrushes.map(p=>(<button key={p.id} onClick={()=>applyBrushPreset(p)} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.accent}`,background:T.paper,color:T.ink}}>{p.name}</button>))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-bold" style={{color:T.ink}}>
        <label className="flex items-center gap-1">Flow<input type="range" min="0.02" max="1" step="0.01" value={customBrushParams.flow} onChange={e=>setCustomBrushParams(p=>({...p,flow:+e.target.value}))} style={{accentColor:T.accent,width:56}} aria-label="Brush flow"/></label>
        <label className="flex items-center gap-1">Scatter<input type="range" min="0" max="1" step="0.01" value={customBrushParams.scatter} onChange={e=>setCustomBrushParams(p=>({...p,scatter:+e.target.value}))} style={{accentColor:T.accent,width:56}} aria-label="Brush scatter"/></label>
        <label className="flex items-center gap-1">Dabs<input type="range" min="1" max="10" step="1" value={customBrushParams.dabs} onChange={e=>setCustomBrushParams(p=>({...p,dabs:+e.target.value}))} style={{accentColor:T.accent,width:56}} aria-label="Brush dab count"/></label>
        <label className="flex items-center gap-1">Jitter<input type="range" min="0" max="1" step="0.01" value={customBrushParams.angleJitter} onChange={e=>setCustomBrushParams(p=>({...p,angleJitter:+e.target.value}))} style={{accentColor:T.accent,width:56}} aria-label="Brush angle jitter"/></label>
        <label className="flex items-center gap-1">Round<input type="range" min="0.2" max="1" step="0.01" value={customBrushParams.roundness} onChange={e=>setCustomBrushParams(p=>({...p,roundness:+e.target.value}))} style={{accentColor:T.accent,width:56}} aria-label="Brush roundness"/></label>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={useCustomBrush} className="lok-btn px-3 py-1 rounded-full text-[11px] font-extrabold" style={{border:`2.5px solid ${T.accent}`,background:brush==="custom"?T.ink:T.card,color:brush==="custom"?T.paper:T.ink}}>Use this brush</button>
        {hasBrushLabSave?<button onClick={saveBrushPreset} className="lok-btn px-3 py-1 rounded-full text-[11px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>Save preset</button>:<span className="text-[10px] font-bold opacity-70">Unlock Brush Lab Save to keep custom presets</span>}
      </div>
    </div>)}
    <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Color and tools">
      <div className="flex flex-wrap gap-1.5 items-center">
        {swatches.map(hex=>(<button key={hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Color ${hex}`} aria-pressed={color===hex&&tool!=="eraser"} className="lok-btn w-7 h-7 rounded-full" style={{background:hex,border:`3px solid ${color===hex&&tool!=="eraser"?T.accent:T.ink}`,transform:color===hex&&tool!=="eraser"?"scale(1.18)":"none"}}/>))}
        <label aria-label="Custom color" style={{cursor:"pointer"}}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{border:`3px dashed ${T.ink}`,background:T.card,color:T.ink}}>+</div>
          <input type="color" value={color} onChange={e=>setColorAndRecent(e.target.value)} style={{position:"absolute",opacity:0,width:1,height:1}}/>
        </label>
        {recentColors.map(hex=>(<button key={"r"+hex} onClick={()=>setColorAndRecent(hex)} aria-label={`Recent ${hex}`} className="lok-btn w-5 h-5 rounded-full" style={{background:hex,border:`2px solid ${T.shadow}`}}/>))}
        {owns("feat_palettes")&&<select value={palette} onChange={e=>setPalette(e.target.value)} aria-label="Color palette" className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${palette!=="default"?T.accent:T.ink}`,background:palette!=="default"?T.ink:T.card,color:palette!=="default"?T.paper:T.ink}}>{Object.keys(PALLETS).map(k=><option key={k} value={k}>{k}</option>)}</select>}
      </div>
      <button onClick={()=>setTool("pen")} aria-pressed={tool==="pen"} className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${tool==="pen"?T.accent:T.ink}`,background:T.card,color:T.ink}}>Pen</button>
      {owns("brush_air")&&<button onClick={()=>setTool("soft")} aria-pressed={tool==="soft"} className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${tool==="soft"?T.accent:T.ink}`,background:T.card,color:T.ink}}>Airbrush</button>}
      <button onClick={()=>setTool("eraser")} aria-pressed={tool==="eraser"} className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${tool==="eraser"?T.accent:T.ink}`,background:T.card,color:T.ink}}>Eraser</button>
      <label className="flex items-center gap-1.5 text-xs font-bold" style={{color:T.ink}}>
        size<span className="inline-flex items-center justify-center" style={{width:28,height:28}}><span aria-hidden="true" style={{width:Math.max(4,Math.min(24,size)),height:Math.max(4,Math.min(24,size)),borderRadius:"50%",background:tool==="eraser"?"transparent":color,border:`1.5px solid ${T.ink}`,display:"block"}}/></span>
        <input type="range" min="1" max="160" value={size} onChange={e=>setSize(+e.target.value)} style={{accentColor:T.accent,width:56}} aria-label={`Brush size ${size}px`}/>
        <input type="number" min="1" max="400" value={size} onChange={e=>setSize(Math.max(1,Math.min(400,+e.target.value||1)))} className="text-[10px] font-bold rounded px-1" style={{width:38,border:`1.5px solid ${T.ink}`,color:T.ink,background:T.paper}} aria-label="Exact brush size"/>
      </label>
      <button onClick={undo} aria-label="Undo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Undo</button>
      <button onClick={redo} aria-label="Redo" className="lok-btn px-2.5 h-8 rounded-full font-bold text-xs" style={{border:`3px solid ${T.ink}`,background:T.card,color:T.ink}}>Redo</button>
      {owns("brush_legacy_pack")&&<button onClick={e=>{const nxt=!legacyRef.current;legacyRef.current=nxt;onLegacyToggle&&onLegacyToggle(nxt);}} className="lok-btn px-2 h-8 rounded-full font-bold text-[10px]" style={{border:`2px solid ${legacyRef.current?T.accent:T.ink}`,background:legacyRef.current?T.ink:T.card,color:legacyRef.current?T.paper:T.ink}} title="Toggle legacy brush engine">{legacyRef.current?"Legacy":"Modern"}</button>}
    </div>
    {hasTools&&(<div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-1" role="toolbar" aria-label="Studio upgrades">
      {owns("tool_spray")&&<button onClick={()=>{setBrush("spray");setTool("pen");}} aria-pressed={brush==="spray"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="spray"?T.accent:T.ink}`,background:brush==="spray"?T.ink:T.card,color:brush==="spray"?T.paper:T.ink}}>Spray</button>}
      {owns("tool_glow")&&<button onClick={()=>{setBrush("glow");setTool("pen");}} aria-pressed={brush==="glow"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="glow"?T.accent:T.ink}`,background:brush==="glow"?T.ink:T.card,color:brush==="glow"?T.paper:T.ink}}>Glow</button>}
      {owns("tool_watercolor")&&<button onClick={()=>{setBrush("watercolor");setTool("pen");}} aria-pressed={brush==="watercolor"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="watercolor"?T.accent:T.ink}`,background:brush==="watercolor"?T.ink:T.card,color:brush==="watercolor"?T.paper:T.ink}}>Watercolor</button>}
      {owns("tool_pattern")&&<button onClick={()=>{setBrush("pattern");setTool("pen");}} aria-pressed={brush==="pattern"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${brush==="pattern"?T.accent:T.ink}`,background:brush==="pattern"?T.ink:T.card,color:brush==="pattern"?T.paper:T.ink}}>Pattern</button>}
      {owns("tool_shape")&&<button onClick={()=>setTool(tool==="shape"?"pen":"shape")} aria-pressed={tool==="shape"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="shape"?T.accent:T.ink}`,background:tool==="shape"?T.ink:T.card,color:tool==="shape"?T.paper:T.ink}}>Shape</button>}
      {owns("tool_shape")&&tool==="shape"&&<select value={shapeMode} onChange={e=>setShapeMode(e.target.value)} className="shrink-0 px-1.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`}}><option value="rect">Rect</option><option value="ellipse">Ellipse</option></select>}
      {owns("tool_gradient")&&<button onClick={()=>setTool(tool==="gradient"?"pen":"gradient")} aria-pressed={tool==="gradient"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="gradient"?T.accent:T.ink}`,background:tool==="gradient"?T.ink:T.card,color:tool==="gradient"?T.paper:T.ink}}>Gradient</button>}
      {owns("tool_push")&&<button onClick={()=>setTool(tool==="push"?"pen":"push")} aria-pressed={tool==="push"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="push"?T.accent:T.ink}`,background:tool==="push"?T.ink:T.card,color:tool==="push"?T.paper:T.ink}}>Push</button>}
      {owns("tool_smudge")&&<button onClick={()=>setTool(tool==="smudge"?"pen":"smudge")} aria-pressed={tool==="smudge"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="smudge"?T.accent:T.ink}`,background:tool==="smudge"?T.ink:T.card,color:tool==="smudge"?T.paper:T.ink}}>Smudge</button>}
      {owns("tool_clone")&&<button onClick={()=>{setTool("clone");setClonePt(null);}} aria-pressed={tool==="clone"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="clone"?T.accent:T.ink}`,background:tool==="clone"?T.ink:T.card,color:tool==="clone"?T.paper:T.ink}}>{tool==="clone"&&clonePt?"Stamp·Click":"Clone"}</button>}
       {owns("tool_blur")&&<><button onClick={()=>{const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;pushUndo();blurLayer(cv.getContext("2d"),blurAmount);}} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:"2px solid "+T.ink,background:T.card,color:T.ink}}>Blur {'\u00D7'} <span>{blurAmount}</span></button><input type="range" min="1" max="12" value={blurAmount} onChange={e=>setBlurAmount(+e.target.value)} style={{accentColor:T.accent,width:40}} aria-label="Blur radius"/></>}
      {owns("tool_replace")&&<button onClick={()=>{const cv=canvases.current.get(active);if(!cv||!activeLayer?.visible)return;pushUndo();replaceColor(cv.getContext("2d"),color);}} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:"2px solid "+T.ink,background:T.card,color:T.ink}}>Replace&rarr;W</button>}
      {owns("tool_rulers")&&<button onClick={()=>setShowGuides(g=>!g)} aria-pressed={showGuides} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${showGuides?T.accent:T.ink}`,background:showGuides?T.ink:T.card,color:showGuides?T.paper:T.ink}}>Rulers</button>}
      {owns("tool_transform")&&<button onClick={()=>setTool(tool==="transform"?"pen":"transform")} aria-pressed={tool==="transform"} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${tool==="transform"?T.accent:T.ink}`,background:tool==="transform"?T.ink:T.card,color:tool==="transform"?T.paper:T.ink}}>Transform</button>}
      {owns("tool_transform")&&tool==="transform"&&(<>
        <button onClick={()=>rotateLayer(-90)} aria-label="Rotate left 90" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>↺90</button>
        <button onClick={()=>rotateLayer(90)} aria-label="Rotate right 90" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>↻90</button>
        <button onClick={()=>flipLayer("h")} aria-label="Flip horizontal" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>Flip H</button>
        <button onClick={()=>flipLayer("v")} aria-label="Flip vertical" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>Flip V</button>
        <button onClick={()=>scaleLayer(1.1)} aria-label="Scale up" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>Scale+</button>
        <button onClick={()=>scaleLayer(0.9)} aria-label="Scale down" className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card,color:T.ink}}>Scale-</button>
      </>)}
      {owns("feat_ref")&&<label className="shrink-0 cursor-pointer"><input type="file" accept="image/*,video/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setRefIsVideo(/^video\//.test(f.type));const r=new FileReader();r.onload=ev=>setRefImg(ev.target.result);r.readAsDataURL(f);e.target.value="";}} style={{display:"none"}}/><span className="lok-btn px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${refImg?T.accent:T.ink}`,background:refImg?T.ink:T.card,color:refImg?T.paper:T.ink}}>{refImg?"Ref ✓":"Ref/GIF/Video"}</span></label>}
      {selectedSticker&&<button onClick={()=>{onStickersChange&&onStickersChange(stickers.filter(s=>s.id!==selectedSticker));setSelectedSticker(null);}} className="lok-btn shrink-0 px-2 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${T.ink}`,background:T.card}}>🗑 Remove sticker</button>}
    </div>)}
    {owns("canvas_sizes")&&(<div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1" style={{color:T.ink}}>
      <span className="text-[10px] font-bold opacity-60 shrink-0">Size</span>
      {[["default","4:5"],["story","9:16"],["square","1:1"],["wide","16:9"]].map(([id,l])=>(<button key={id} onClick={()=>setCanvasSize(id)} aria-pressed={canvasSize===id} className="lok-btn shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{border:`2px solid ${canvasSize===id?T.accent:T.ink}`,background:canvasSize===id?T.ink:T.card,color:canvasSize===id?T.paper:T.ink}}>{l}</button>))}
    </div>)}
    {owns("feat_smooth")&&(<div className="mt-1.5 flex items-center gap-1.5" style={{color:T.ink}}>
      <span className="text-[10px] font-bold">Smooth</span>
      <input type="range" min="0" max="1" step="0.1" value={smoothStrength} onChange={e=>setSmoothStrength(+e.target.value)} style={{accentColor:T.accent,width:50}} aria-label="Stroke smoothing"/>
      <span className="text-[10px] opacity-60">{Math.round(smoothStrength*100)}%</span>
    </div>)}
    {refImg&&owns("feat_ref")&&(<div className="mt-1.5 flex items-center gap-2" style={{color:T.ink}}>
      <span className="text-[10px] font-bold">Ref</span>
      <input type="range" min="0.05" max="0.6" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(+e.target.value)} style={{accentColor:T.accent,width:60}} aria-label="Reference opacity"/>
      <button onClick={()=>{setRefImg(null);setRefIsVideo(false);}} className="text-[10px] font-bold underline opacity-60">clear</button>
    </div>)}
    {showGuides&&<div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{zIndex:20}}><div style={{position:"absolute",left:"33.33%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",left:"66.66%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",top:"33.33%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",top:"66.66%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}40 0 4px,transparent 4px 8px)`}}/><div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:`repeating-linear-gradient(${T.alt}60 0 6px,transparent 6px 12px)`}}/><div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${T.alt}60 0 6px,transparent 6px 12px)`}}/></div>}
    </div>
  </div>);
});

export default Easel;