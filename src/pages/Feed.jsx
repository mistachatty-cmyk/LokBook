import { useState, useEffect, useRef } from "react";
import { useT } from "../theme/theme.js";
import { ReactionIcon } from "../art.jsx";
import NameTag from "../NameTag.jsx";
import EmptyState, { Empty } from "../EmptyState.jsx";
import { REACTION_SETS, lokApi, fromDbPost } from "../constants.jsx";

export default function Feed({posts,bookmarks,following,feedMode,setFeedMode,cosmetics={},daily,streak,dailyClaimed,flipOfDay,onLine,onClaimDaily,onOpen,onVote,onLok,onBookmark,onArtist,onReact,onEcho,tides,onVoteTide,activeEvent,eventClaimed,onClaimEvent,say,loadingMore,onLoadMore}){
  const T=useT();const[active,setActive]=useState(0);const wrapRef=useRef(null);
  const[searchQ,setSearchQ]=useState("");const[searchResults,setSearchResults]=useState(null);const[searching,setSearching]=useState(false);
  const list=(feedMode==="following"?posts.filter(p=>following.includes(p.author)):posts).sort((a,b)=>(b.boostedAt||0)-(a.boostedAt||0));
  const streakCol=streak>=30?"#E8B14B":streak>=7?T.accent:streak>=3?T.alt:T.ink;
  const onScroll=()=>{const el=wrapRef.current;if(!el)return;const i=Math.round(el.scrollTop/el.clientHeight);if(i!==active){setActive(i);if(Math.random()<0.22&&onLine)onLine("feed_scroll");}};
  const doSearch=useRef(null);useEffect(()=>{if(!searchQ.trim()){setSearchResults(null);return;}setSearching(true);clearTimeout(doSearch.current);doSearch.current=setTimeout(async()=>{try{const rows=await lokApi.fetchPosts(20,null,searchQ);setSearchResults(rows.map(fromDbPost));}catch{}setSearching(false);},300);return()=>clearTimeout(doSearch.current);},[searchQ]);
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
    <div className="mt-2 relative" role="search"><svg aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.shadow} strokeWidth="2.5" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="7.5"/><line x1="16" y1="16" x2="21" y2="21"/></svg><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search flips & artists…" aria-label="Search all flips" className="w-full pl-8 pr-8 py-2 rounded-xl text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink,outline:"none"}}/>{searchQ&&<button onClick={()=>setSearchQ("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold" style={{color:T.shadow}}>✕</button>}</div>
    {searchQ.trim()&&<div className="mt-2" style={{maxHeight:"calc(100dvh - 300px)",minHeight:200,overflowY:"auto"}}>
      {searching?<div className="text-center py-8 text-sm opacity-60">Searching…</div>:searchResults!==null&&searchResults.length===0?<EmptyState icon="search" title="No results" subtitle={`Nothing for "${searchQ}"`}/>:searchResults?.map(p=>(<FeedCard key={p.id} p={p} live={false} marked={bookmarks.includes(p.id)} following={following} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark} onArtist={onArtist} onReact={onReact} onEcho={onEcho}/>))}
    </div>}
    {!searchQ.trim()&&(list.length===0?(
      feedMode==="following"
        ?<EmptyState icon="follow" title="No one yet" subtitle="Lok artists you love and their flips show up here." action="Discover artists →" onAction={()=>setFeedMode("discover")}/>
        :<EmptyState icon="feed" title="No art yet" subtitle="Be the first to publish a flip!"/>
    ):(
      <div ref={wrapRef} onScroll={onScroll} className="mt-3 -mx-4" style={{height:"calc(100dvh - 300px)",minHeight:360,overflowY:"scroll",scrollSnapType:"y mandatory"}}>
        {list.map((p,i)=>(<FeedCard key={p.id} p={p} live={i===active} marked={bookmarks.includes(p.id)} following={following} cosmetics={cosmetics} onOpen={onOpen} onVote={onVote} onLok={onLok} onBookmark={onBookmark} onArtist={onArtist} onReact={onReact} onEcho={onEcho}/>))}
        {onLoadMore&&feedMode==="discover"&&<div className="flex justify-center py-4" style={{scrollSnapAlign:"start"}}><button onClick={onLoadMore} disabled={loadingMore} className="lok-btn px-6 py-3 rounded-xl text-sm font-bold" style={{border:`2.5px solid ${T.ink}`,background:T.card,color:T.ink,opacity:loadingMore?0.5:1}}>{loadingMore?"Loading…":"Load more"}</button></div>}
      </div>
    ))}
  </div>);
}

export function FeedCard({p,live,marked,following=[],cosmetics={},onOpen,onVote,onLok,onBookmark,onArtist,onReact,onEcho}){
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
