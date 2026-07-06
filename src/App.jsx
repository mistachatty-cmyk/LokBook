import {
  useState, useEffect, useRef, useCallback, useMemo, createContext, useContext,
  forwardRef, useImperativeHandle, lazy, Suspense
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
import { paperBase, risoCircle, drawBounce, drawBloom, drawNight, drawOrbit, drawWalk, drawRain, drawFish, drawBurst, drawWave, drawSpiral, drawPulse, drawFirework, drawMorph, drawNautilus, compressFrame, renderSequence, makeRng, makeDoodlePainter, renderDoodle, renderAvatar, polyPts, starPts, ellipsePts, linePts, traceShape, MiniDraw } from "./engine/draw.jsx";
import { lilLokPhase, getLilLokLine } from "./engine/lillok.js";
import { encodeGIF } from "./engine/gif.js";
import { makeMatchBots, botProgress, botFinalT, botLine, judgeBattle, recordBattle, makeRushRivals, rushScore, recordRush } from "./engine/bots.js";
import NameTag from "./NameTag.jsx";
import { FramedAvatar, ReactionIcon, PageEffect, GlobalStyle, SkyEffect } from "./art.jsx";
import LilLokPanel, { LilLokBubble, LilLokSprite } from "./LilLok.jsx";
import InterventionFX from "./InterventionFX.jsx";
import EmptyState, { Empty } from "./EmptyState.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { AD_PROVIDER, ETHICALADS_PUBLISHER, CUSTOM_AD_HTML } from "./ads.js";
import { useFeedback } from "./hooks/useFeedback.js";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import { AuthGate } from "./auth/AuthGate.jsx";

const Shop = lazy(() => import("./pages/Shop.jsx"));
const Feed = lazy(() => import("./pages/Feed.jsx"));
const Studio = lazy(() => import("./pages/Studio.jsx"));
const Battle = lazy(() => import("./pages/Battle.jsx"));
const Viewer = lazy(() => import("./pages/Viewer.jsx"));
const Rooms = lazy(() => import("./pages/Rooms.jsx"));
import Profile, { Onboard, ArtistPage, OpenFront } from "./pages/Profile.jsx";
import { starterHandle, isReservedName, suggestHandle } from "./identity.js";
import { BOT_STYLES, generateBotPost, pickAmbientPosts } from "./engine/botArt.js";
import ThemeBackdrop from "./theme/ThemeBackdrop.jsx";
import { resolveCheat } from "./engine/bleepbox.js";

const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getWeekStart = d => {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(dt.setDate(diff)).toISOString().slice(0, 10);
};

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
const SAVE_KEY = "lok:save:v2"; const GALLERY_KEY = "lok:gallery:v2";



















export default function App(){
  return<AuthProvider><LokApp /></AuthProvider>;
}
function LokApp(){
  const { session, loading: authLoading, onInit } = useAuth();
  const[ready,setReady]=useState(false);const[tab,setTab]=useState("feed");const[openIdx,setOpenIdx]=useState(null);const[posts,setPosts]=useState([]);const[toasts,setToasts]=useState([]);const[voteCount,setVoteCount]=useState(0);
  const[questsCompleted,setQuestsCompleted]=useState(0);const[totalEarned,setTotalEarned]=useState(0);const[traceHinted,setTraceHinted]=useState(false);const[fabBubble,setFabBubble]=useState("");const[adIdx,setAdIdx]=useState(0);const[installEvt,setInstallEvt]=useState(null);const[showSettings,setShowSettings]=useState(false);
  const[loks,setLoks]=useState(260);const[pace,setPace]=useState("sweep");const[speed,setSpeed]=useState(1);const[soundLab,setSoundLab]=useState(false);const[soundQueue,setSoundQueue]=useState([]);const[founder,setFounder]=useState(false);const[totalSpent,setTotalSpent]=useState(0);const[fodHistory,setFodHistory]=useState([]);const[lokPass,setLokPass]=useState(false);const[lokPassBusy,setLokPassBusy]=useState(false);const[uiTheme,setUiTheme]=useState("riso");const[ownedThemes,setOwnedThemes]=useState(["riso"]);const[effect,setEffect]=useState("none");const[ownedEffects,setOwnedEffects]=useState(["none"]);const[sky,setSky]=useState("clear");const[ownedSkies,setOwnedSkies]=useState(["clear"]);const[studioModules,setStudioModules]=useState(["layers_10","brush_ink"]);const[bigBattleOwned,setBigBattleOwned]=useState(false);const[wins,setWins]=useState(0);const[offlineBonusDay,setOfflineBonusDay]=useState("");
  const[tides,setTides]=useState({candidates:[],voted:false,myVote:"",results:null,loaded:false});
  const[eventClaimed,setEventClaimed]=useState("");
  const activeEvent=useMemo(()=>getActiveEvent(),[]);
  const[profile,setProfile]=useState(()=>{const seed=Math.floor(Math.random()*9999);return{name:starterHandle(seed),bio:"",avatarSeed:seed,links:[{label:"Lok page",url:"coming soon"}]};});
  const[bookmarks,setBookmarks]=useState([]);const[following,setFollowing]=useState(["moss.ink"]);const[lokdInCount]=useState(2300);const[lillok,setLillok]=useState({ink:80,bond:30,stasis:false,name:"Blot",lastSeen:Date.now()});const[customLilLok,setCustomLilLok]=useState(null);const[cosmetics,setCosmetics]=useState({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",lillokGear:"none"});const[owned,setOwned]=useState({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],paper:["plain"],lillokGear:["none"]});const[kids,setKids]=useState(false);  const[showLilLok,setShowLilLok]=useState(false);const[onboarded,setOnboarded]=useState(false);const[showOnboard,setShowOnboard]=useState(false);const[showHint,setShowHint]=useState(false);const[showBadges,setShowBadges]=useState(false);const[sound,setSound]=useState(false);const[feedMode,setFeedMode]=useState("discover");const[daily,setDaily]=useState({day:null,streak:0,claimed:false,prompt:""});const[xp,setXp]=useState(0);const[quests,setQuests]=useState(null);const[feedCursor,setFeedCursor]=useState(null);const[loadingMore,setLoadingMore]=useState(false);  const[flair,setFlair]=useState("");const[compactDensity,setCompactDensity]=useState(false);const[adVisible,setAdVisible]=useState(true);const[notifications,setNotifications]=useState([]);const[notifUnread,setNotifUnread]=useState(0);
  const[myRooms,setMyRooms]=useState([]);const[pendingRoomCode,setPendingRoomCode]=useState(null);const[account,setAccount]=useState(null);const[tips,setTips]=useState({});const[artistView,setArtistView]=useState(null);const[botPosted,setBotPosted]=useState([]);const[online,setOnline]=useState(typeof navigator!=="undefined"?navigator.onLine:true);
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
      makeSeedLazy(BOT_STYLES["sketchram"](777).painter,12,"seed14",{title:"Leap study",author:"sketchram",paceMs:100,votes:51,voted:false,viewed:false,reactions:{splat:28,heart:33,drip:6,humhah:9,bomhogwah:10},from:"studio",mode:"A",style:"bold",views:375,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy(drawNautilus,12,"seed15",{title:"Nautilus dream",author:"moss.ink",paceMs:150,loop:true,votes:44,voted:false,viewed:false,reactions:{splat:6,heart:29,drip:10,humhah:8,bomhogwah:7},from:"studio",mode:"B",style:"series",views:320,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy((()=>{const p=makeDoodlePainter(420);return(c,t)=>p(c,t);})(),11,"seed16",{title:"Doodle garden",author:"inkwell_iz",paceMs:130,votes:37,voted:false,viewed:false,reactions:{splat:9,heart:24,drip:13,humhah:14,bomhogwah:5},from:"studio",mode:"A",style:"bold",views:255,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
      makeSeedLazy((()=>{const p=makeDoodlePainter(999);return(c,t)=>p(c,t);})(),12,"seed17",{title:"Night scribble",author:"sketchram",paceMs:140,votes:31,voted:false,viewed:false,reactions:{splat:14,heart:18,drip:8,humhah:6,bomhogwah:11},from:"studio",mode:"B",style:"series",views:198,echoedAt:null,echoCount:0,echoParent:null,echoExpiresAt:null}),
    ];
    const save=await store.get(SAVE_KEY);const savedGallery=await store.get(GALLERY_KEY);const todayKey=new Date().toDateString();
    let loadedDaily={day:todayKey,streak:1,claimed:false,prompt:activeEvent?activeEvent.prompt:PROMPTS[todayPromptIdx]};
    if(save){setLoks(save.loks??60);setLokPass(!!save.lokPass);setUiTheme(save.uiTheme||"riso");setOwnedThemes(save.ownedThemes||["riso"]);setEffect(save.effect||"none");setOwnedEffects(save.ownedEffects||["none"]);setSky(save.sky||"clear");setOwnedSkies(save.ownedSkies||["clear"]);setStudioModules(save.studioModules||migrateLegacyModules(save));setBigBattleOwned(!!save.bigBattleOwned);setWins(save.wins??0);if(save.profile)setProfile(p=>({...save.profile,name:save.profile.name||starterHandle(save.profile.avatarSeed??p.avatarSeed)}));setBookmarks(save.bookmarks||[]);setFollowing(save.following||[]);setKids(!!save.kids);if(save.customLilLok)setCustomLilLok(save.customLilLok);if(save.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",lillokGear:"none",...save.cosmetics});if(save.owned)setOwned({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],paper:["plain"],lillokGear:["none"],...save.owned});setOnboarded(!!save.onboarded);setSound(!!save.sound);setXp(save.xp??0);setFlair(save.flair||"");setQuestsCompleted(save.questsCompleted??0);setTotalEarned(save.totalEarned??0);setTraceHinted(!!save.traceHinted);setPace(save.pace||"sweep");setSpeed(save.speed??1);setSoundLab(!!save.soundLab);setSoundQueue(save.soundQueue||[]);setFounder(!!save.founder);setTotalSpent(save.totalSpent??0);setFodHistory(save.fodHistory||[]);setAccount(save.account||null);setTips(save.tips||{});setBotPosted(save.botPosted||[]);setMyRooms(save.myRooms||[]);setOfflineBonusDay(save.offlineBonusDay||"");setEventClaimed(save.eventClaimed||"");if(!save.onboarded)setShowHint(false);else setShowHint(true);
    if(save.daily?.day){if(save.daily.day===todayKey)loadedDaily=save.daily;else{const diff=Math.round((new Date(todayKey)-new Date(new Date(save.daily.day).toDateString()))/86400000);loadedDaily={day:todayKey,streak:diff===1?(save.daily.streak||0)+1:diff<=7?(save.daily.streak||0):1,claimed:false,prompt:activeEvent?activeEvent.prompt:PROMPTS[todayPromptIdx]};}}
    const gap=Date.now()-(save.lillok?.lastSeen||Date.now());const ll=save.lillok||lillok;lastSeenRef.current=save.lillok?.lastSeen||Date.now();const buffer=1-((ll.bond||0)/100)*0.5;const inkDrain=Math.min(ll.ink,Math.floor(gap/60000)*1.2*buffer);const newInk=Math.max(0,ll.ink-inkDrain);setLillok({...ll,stasis:ll.stasis||(newInk===0&&gap>600000),ink:newInk,inkZeroAt:null,lastSeen:Date.now()});}
    setDaily(loadedDaily);const savedQ=save?.quests&&save.quests.day===todayKey?save.quests:{day:todayKey,items:makeQuests()};setQuests(savedQ);
    const tidePool=PROMPTS.filter(p=>p!==loadedDaily.prompt).sort(()=>Math.random()-0.5).slice(0,TIDE_CANDIDATE_COUNT);const savedTide=localStorage.getItem("lok:tide:"+todayKey);setTides({candidates:tidePool,voted:!!savedTide,myVote:savedTide||"",results:null,loaded:true});
    const userPosts=(savedGallery||[]).map(p=>({...p,voted:false,viewed:false}));setPosts([...userPosts,...seed]);if(!save||!save.onboarded)setShowOnboard(true);
    onInit(async session => {
      if (session?.user) {
        setAccount(session.user.email || session.user.id);
        if (!save) {
          const remoteSave = await lokApi.fetchAuthSave(session.user.id);
          if (remoteSave) {
            Object.assign(save || {}, remoteSave);
            setLoks(remoteSave.loks??260);
            setLokPass(!!remoteSave.lokPass);
            setUiTheme(remoteSave.uiTheme||"riso");
            setEffect(remoteSave.effect||"none");setOwnedEffects(remoteSave.ownedEffects||["none"]);
            setSky(remoteSave.sky||"clear");setOwnedSkies(remoteSave.ownedSkies||["clear"]);
            if(remoteSave.profile)setProfile(remoteSave.profile);
            if(remoteSave.cosmetics)setCosmetics({nameColor:"default",frame:"none",reactionPack:"base",avatarAccent:"none",blotBorder:"none",paper:"plain",lillokGear:"none",...remoteSave.cosmetics});
            if(remoteSave.owned)setOwned({nameColor:["default"],frame:["none"],reactionPack:["base"],avatarAccent:["none"],blotBorder:["none"],paper:["plain"],lillokGear:["none"],...remoteSave.owned});
          }
        }
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
  // Sync following and bookmarks from server on mount (social graph restore)
  useEffect(()=>{if(!ready||!account)return;(async()=>{try{const[followRows,bookRows]=await Promise.all([lokApi.fetchFollowing(account),lokApi.fetchBookmarks(account)]);if(followRows?.length)setFollowing(followRows.map(r=>r.followee));if(bookRows?.length)setBookmarks(bookRows.map(r=>r.post_id));}catch{}})();},[ready,account]);
  useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{const blob={loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies,studioModules,bigBattleOwned,wins,offlineBonusDay,tides,eventClaimed,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,account,tips,compactDensity,botPosted,myRooms,lillok:{...lillok,lastSeen:Date.now()}};store.set(SAVE_KEY,blob);if(account&&Date.now()-lastCloudPush.current>15000){lastCloudPush.current=Date.now();lokApi.pushSave(account,blob,auth.getUserId());if(following&&following.length){fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(account)}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:`Bearer ${auth.getApiToken()}`},body:JSON.stringify({following})}).catch(()=>{});}if(bookmarks&&bookmarks.length){fetch(`${SUPA_URL}/rest/v1/lok_accounts?handle=eq.${encodeURIComponent(account)}`,{method:"PATCH",headers:{"Content-Type":"application/json",apikey:SUPA_KEY,Authorization:`Bearer ${auth.getApiToken()}`},body:JSON.stringify({bookmarks})}).catch(()=>{});}}},400);return()=>clearTimeout(t);},[ready,loks,lokPass,uiTheme,ownedThemes,effect,ownedEffects,sky,ownedSkies,studioModules,bigBattleOwned,wins,offlineBonusDay,tides,eventClaimed,profile,bookmarks,following,kids,customLilLok,cosmetics,owned,onboarded,sound,xp,flair,daily,quests,questsCompleted,totalEarned,traceHinted,pace,speed,soundLab,soundQueue,founder,totalSpent,fodHistory,account,tips,compactDensity,botPosted,myRooms,lillok]);
  // Living feed: resident artists drop 1-2 fresh generated flips per session, never repeating a seed on this device.
  useEffect(()=>{if(!ready)return;const picks=pickAmbientPosts(botPosted,2);if(!picks.length)return;setBotPosted(b=>[...b,...picks.map(x=>x.key)].slice(-400));picks.forEach((pk,i)=>{setTimeout(()=>{try{const post=generateBotPost(pk.bot,pk.seed);if(post)setPosts(ps=>ps.some(x=>x.id===post.id)?ps:[...ps.slice(0,3),post,...ps.slice(3)]);}catch(e){console.warn("botArt",e);}},1600+i*900);});},[ready]);
  useEffect(()=>{if(!ready)return;const userPosts=posts.filter(p=>!p.id?.startsWith("seed")&&!p.id?.startsWith("bot:")&&!p.remote);const t=setTimeout(()=>{store.set(GALLERY_KEY,userPosts).then(ok=>{if(!ok)say("Gallery too big");});},500);return()=>clearTimeout(t);},[ready,posts]);
  useEffect(()=>{if(!ready||kids)return;let interval=null;const startDecay=()=>{interval=setInterval(()=>setLillok(s=>{if(s.stasis)return s;if(s.ink===0){if(!s.inkZeroAt)return{...s,inkZeroAt:Date.now()};if(Date.now()-s.inkZeroAt>120000)return{...s,stasis:true,inkZeroAt:null};return s;}const buffer=1-(s.bond/100)*0.5;return{...s,ink:Math.max(0,s.ink-1.4*buffer)};}),12000);};const stopDecay=()=>{clearInterval(interval);interval=null;};const onVisible=()=>{if(document.visibilityState==="hidden")stopDecay();else startDecay();};startDecay();document.addEventListener("visibilitychange",onVisible);return()=>{stopDecay();document.removeEventListener("visibilitychange",onVisible);};},[ready,kids]);
  useEffect(()=>{if(!ready)return;const gap=Date.now()-lastSeenRef.current;const todayKey=new Date().toDateString();if(gap>OFFLINE_BONUS_HOURS*3600000&&offlineBonusDay!==todayKey&&lastSeenRef.current!==Date.now()){addLoks(OFFLINE_BONUS_LOKS);gainXp(10);setOfflineBonusDay(todayKey);setTimeout(()=>say(`Welcome back! +${OFFLINE_BONUS_LOKS} Loks · +10 XP`,"success"),600);feedLilLok(20,"revival");}},[ready]);
  useEffect(()=>{try{const rc=new URLSearchParams(location.search).get("room");if(rc){setPendingRoomCode(rc);setTab("rooms");history.replaceState({},"",location.pathname);}}catch{}},[]);
  useEffect(()=>{const h=e=>{e.preventDefault();setInstallEvt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);
  useEffect(()=>{const goOnline=()=>setOnline(true);const goOffline=()=>setOnline(false);window.addEventListener("online",goOnline);window.addEventListener("offline",goOffline);setOnline(navigator.onLine);return()=>{window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};},[]);
  useEffect(()=>{if(lokPass||kids||AD_PROVIDER!=="placeholder")return;const t=setInterval(()=>setAdIdx(i=>(i+1)%ADS.length),8000);return()=>clearInterval(t);},[lokPass,kids]);
  useEffect(()=>{if(!ready)return;const t1=setTimeout(()=>showLine(),4000);const t2=setInterval(()=>{if(!showLilLok)showLine();},60000);return()=>{clearTimeout(t1);clearInterval(t2);};},[ready]);
  const onCheat=useCallback(code=>{const c=resolveCheat(code);if(!c){say("The ink doesn't recognize that…","error");return;}
    if(c.fx==="merci"){setLoks(l=>l+1000);setTotalEarned(t=>t+1000);hap([80,40,80,40,160]);blip("C6");say("💖 Merci, merci · +1000 Loks","success");pushNotif("BadBleep: gratitude accepted · +1000 Loks","success");}
    if(c.fx==="supableep"){setLokPass(true);setOwnedThemes(Object.keys(THEMES));setOwnedEffects(EFFECTS.map(e=>e.id));setOwnedSkies(SKIES.map(x=>x.id));setStudioModules([...new Set(STUDIO_MODULES.map(m=>m.id))]);setOwned({nameColor:NAME_COLORS.map(x=>x.id),frame:FRAMES.map(x=>x.id),reactionPack:REACTION_PACKS.map(x=>x.id),avatarAccent:AVATAR_ACCENTS.map(x=>x.id),blotBorder:BLOT_BORDERS.map(x=>x.id),paper:PAPERS.map(x=>x.id),lillokGear:LILLOK_GEAR.map(x=>x.id)});setBigBattleOwned(true);setSoundLab(true);setLoks(l=>l+9999);setTotalEarned(t=>t+9999);hap([200,80,200,80,300]);blip("C6");say("🫧 SUPABLEEP · everything unlocked (dev)","success");pushNotif("SupaBleepMode active — all content unlocked for testing","success");}
  },[say,hap,blip,pushNotif]);
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
    if(!account&&!tips.saveNudge){setTips(t=>({...t,saveNudge:true}));setTimeout(()=>say("✨ Nice one — sign in (You → ⚙) so your art is saved forever"),2200);}
    return p;
  },[profile.name,say,account,tips.saveNudge]);
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
  const[mx,setMx]=useState(0);const[my,setMy]=useState(0);const logoRef=useRef(null);const handleMove=e=>{const r=logoRef.current?.getBoundingClientRect();if(r){setMx((e.clientX-r.left-r.width/2)/r.width*2);setMy((e.clientY-r.top-r.height/2)/r.height*2);}};const handleLeave=()=>{setMx(0);setMy(0);};const trans=(dx,dy)=>`translate(${mx*dx}px,${my*dy}px)`;
  if(!ready)return(<div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:ART.paper,color:ART.ink,fontFamily:"'Bricolage Grotesque',system-ui,sans-serif"}}>
    <style>{`@keyframes inkdrop{0%{transform:scaleY(0.2) scaleX(0.8);opacity:0}40%{transform:scaleY(1.1) scaleX(0.95);opacity:1}60%{transform:scaleY(0.9) scaleX(1.05)}100%{transform:scale(1);opacity:1}} @keyframes inkfade{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}} @keyframes inkpulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    <div ref={logoRef} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{position:"relative",width:80,height:80,marginBottom:20,animation:"inkdrop .7s cubic-bezier(.34,1.56,.64,1) forwards"}}>
      <div style={{position:"absolute",left:6,top:4,transform:trans(6,-4),transition:"transform .35s cubic-bezier(.22,1,.36,1)"}}><svg width="64" height="64" viewBox="0 0 64 64"><ellipse cx="37" cy="37" rx="18" ry="18" fill={ART.pink} opacity="0.55"/></svg></div>
      <div style={{position:"absolute",left:0,top:0,transform:trans(-4,6),transition:"transform .35s cubic-bezier(.22,1,.36,1)"}}><svg width="64" height="64" viewBox="0 0 64 64"><path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill="none" stroke={ART.ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 8 C32 8 52 28 52 40 C52 51 43 58 32 58 C21 58 12 51 12 40 C12 28 32 8 32 8Z" fill={ART.ink} opacity="0.08"/></svg></div>
    </div>
    <div style={{fontWeight:800,fontSize:26,letterSpacing:"-0.02em",animation:"inkfade .5s .3s ease both"}}>LokBook</div>
    <div style={{fontSize:13,opacity:0.5,marginTop:6,animation:"inkfade .5s .5s ease both"}}>loading your ink…</div>
    <div style={{display:"flex",gap:6,marginTop:20,animation:"inkfade .5s .7s ease both"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:ART.ink,animation:`inkpulse 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}</div>
  </div>);
  return(<ErrorBoundary><ThemeCtx.Provider value={T}>
    <div className={"min-h-screen w-full"+(compactDensity?" lok-compact":"")} style={{background:T.paper,color:T.ink,fontFamily:"'Schibsted Grotesk',system-ui,sans-serif",animation:effect==="quake"&&!reduceMotion?"lokquake 6s infinite":"none"}}>
      <GlobalStyle T={T} pace={pace} speed={speed}/><ThemeBackdrop themeId={uiTheme} pace={pace}/><SkyEffect sky={sky} paper={T.paper}/><PageEffect effect={effect}/>
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
        <Suspense fallback={<div className="flex items-center justify-center py-12 text-sm opacity-50">Loading…</div>}>
        <div key={tab} className="lok-tabin">
                       {tab==="feed"&&<AuthGate><Feed posts={posts} bookmarks={bookmarks} following={following} feedMode={feedMode} setFeedMode={setFeedMode} cosmetics={cosmetics} daily={daily} streak={daily.streak} dailyClaimed={daily.claimed} flipOfDay={flipOfDay} onLine={showLine} onClaimDaily={()=>{if(daily.claimed)return;const wk=daily.streak%7===0&&daily.streak>0?20:0;const mo=daily.streak%30===0&&daily.streak>0?100:0;const bonus=10+Math.min(daily.streak,7)*5+wk+mo;setDaily(d=>({...d,claimed:true}));addLoks(bonus);gainXp(20);feedLilLok(15,"creation");blip("E5");hap([30,20,60]);say(`Day ${daily.streak} claimed · +${bonus} Loks`,"success");}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});if(p.remote)lokApi.votePost(id,p.votes+1);addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);setVoteCount(c=>c+1);say("Vote stamped · +5 Loks","success");if(id.startsWith("seed")){addLoks(5);pushNotif("Your flip got a vote · +5 Loks (creator)","success");}else{pushNotif("You voted · creator notified","success");}}} onLok={name=>{setFollowing(f=>{const next=f.includes(name)?f:[...f,name];if(account)lokApi.follow(account,name).catch(()=>{});return next;});questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onBookmark={id=>{setBookmarks(b=>{const had=b.includes(id);const next=had?b.filter(x=>x!==id):[...b,id];if(account){if(had)lokApi.unbookmark(account,id).catch(()=>{});else lokApi.bookmark(account,id).catch(()=>{});}return next;});blip("A4");hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in to bookmarks");}} onArtist={setArtistView} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);if(account)lokApi.react(account,id,type).catch(()=>{});}} onEcho={echoPost} tides={tides} onVoteTide={voteTide} activeEvent={activeEvent} eventClaimed={eventClaimed} onClaimEvent={claimEvent} say={say} loadingMore={loadingMore} onLoadMore={loadMore}/></AuthGate>}
          {tab==="gallery"&&<AuthGate><Profile posts={posts} profile={profile} setProfile={setProfile} onCheat={onCheat} wins={wins} lokPass={lokPass} kids={kids} cosmetics={cosmetics} level={level} xp={xp} quests={quests} following={following} lokdInCount={lokdInCount} bookmarks={bookmarks} notifications={notifications} notifUnread={notifUnread} loks={loks} totalEarned={totalEarned} questsCompleted={questsCompleted} canInstall={!!installEvt} onInstall={async()=>{if(installEvt){installEvt.prompt();try{const r=await installEvt.userChoice;if(r.outcome==="accepted")say("Lok added to your home screen!","success");}catch{}setInstallEvt(null);}else{say("Open your browser menu → Install app / Add to Home Screen");}}} onClearNotifs={()=>setNotifUnread(0)} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onDelete={id=>setPosts(ps=>ps.filter(p=>p.id!==id))} onRename={(id,title)=>patchPost(id,{title})} say={say} account={account} pace={pace} setPace={setPace} speed={speed} setSpeed={setSpeed} soundLab={soundLab} onUnlockSoundLab={()=>setSoundLab(true)} soundQueue={soundQueue} setSoundQueue={setSoundQueue} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} badges={badges} showBadges={showBadges} setShowBadges={setShowBadges} unlockedCount={unlockedCount} compactDensity={compactDensity} setCompactDensity={setCompactDensity} onClearData={()=>{if(!window.confirm("Clear all local data? This cannot be undone."))return;store.remove(SAVE_KEY);store.remove(GALLERY_KEY);localStorage.clear();location.reload();}}/></AuthGate>}
          {tab==="studio"&&<Studio modules={studioModules} say={say} kids={kids} dailyPrompt={daily.prompt} paper={cosmetics.paper||"plain"} onboarded={onboarded} postCount={posts.length} onPublish={post=>{publishPost(post);setTab("gallery");gainXp(25);questTick("publish");blip("C6");hap([50,30,100]);say("Published to your gallery");}}/>}
          {tab==="battle"&&<Battle modules={studioModules} wins={wins} bigBattleOwned={bigBattleOwned} kids={kids} phase={phase} lillok={lillok} customLilLok={customLilLok} say={say} blip={blip} hap={hap} onLine={showLine} onUnlockBig={()=>spend(50,()=>setBigBattleOwned(true),"Big Battle unlocked")} profile={profile} onResult={(battle)=>{const {won,mult=1,prompt,format,pages,strokes,blocked}=battle||{};addLoks((won?25:5)*mult);gainXp(won?25:8);questTick("battle");if(won){setWins(w=>w+1);hap([200,100,200]);pushNotif(`You won a battle! +${25*mult} Loks${mult>1?" · ✦ 3× featured":""}`,"success");feedLilLok(5,"creation");}setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-6)}));if(profile?.name&&(won||prompt)){lokApi.recordBattle({author:profile.name,won,score:(won?100:10)*(mult>1?1.5:1),prompt:prompt||null,format:format||null,pages:pages||0,strokes:strokes||0,blocked:blocked||0,featured:mult>1,week_start:getWeekStart(new Date())});}}} onPublish={post=>publishPost(post)}/>}
          {tab==="front"&&<OpenFront kids={kids} loks={loks} dailyPrompt={daily.prompt} hinted={traceHinted} onHinted={()=>setTraceHinted(true)} onWager={amt=>{if(loks<amt)return false;setLoks(l=>l-amt);setTotalSpent(t=>t+amt);return true;}} onEarn={n=>{addLoks(n);questTick("front",Math.max(1,Math.round(n/5)));gainXp(n);setLillok(s=>s.stasis?s:({...s,ink:Math.max(0,s.ink-3)}));}} blip={blip} say={say}/>}
          {tab==="rooms"&&<Rooms profile={profile} userId={auth.getUserId()||("local:"+profile.name)} myRooms={myRooms} setMyRooms={setMyRooms} pendingCode={pendingRoomCode} onPendingCodeUsed={()=>setPendingRoomCode(null)} onArtist={setArtistView} say={say} blip={blip} hap={hap}/>}
          {tab==="shop"&&<Shop loks={loks} lokPass={lokPass} lokPassBusy={lokPassBusy} kids={kids} uiTheme={uiTheme} ownedThemes={ownedThemes} effect={effect} ownedEffects={ownedEffects} sky={sky} ownedSkies={ownedSkies} modules={studioModules} onBuyModule={item=>spend(item.price,()=>{if(item.id==="module_uber"){const all=STUDIO_MODULES.filter(m=>m.type!=="achievement").map(m=>m.id);setStudioModules(m=>[...new Set([...m,...all])]);}else{setStudioModules(m=>[...new Set([...m,item.id])]);}blip("C6");},`${item.name} unlocked`)} cosmetics={cosmetics} owned={owned} setKids={setKids} say={say} founder={founder} onFounderJoin={async(handle,email)=>{await founderSignup(handle,email,{loks,wins,xp,profile,questsCompleted,totalEarned,gallerySize:posts.filter(p=>!p.id?.startsWith("seed")).length,lillok:{ink:lillok.ink,bond:lillok.bond,name:lillok.name}});setFounder(true);pushNotif("Founder status secured on LokServices 🏆","success");}} onBuyCosmetic={(cat,item)=>{if((owned[cat]||[]).includes(item.id)){setCosmetics(c=>({...c,[cat]:item.id}));blip("D5");say(`Equipped ${item.name}`);}else spend(item.price,()=>{setOwned(o=>({...o,[cat]:[...(o[cat]||[]),item.id]}));setCosmetics(c=>({...c,[cat]:item.id}));blip("C6");},`${item.name} unlocked`);}} onBuyPass={async()=>{setLokPassBusy(true);try{const res=await fetch(`${SUPA_URL}/functions/v1/stripe-checkout`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${auth.getApiToken()}`},body:JSON.stringify({userId:auth.getUserId()||"local",email:auth.getEmail()||"",priceId:"lokpass_299",successUrl:window.location.origin+"/?session_id={CHECKOUT_SESSION_ID}",cancelUrl:window.location.origin})});if(res.ok){const{url}=await res.json();if(url){window.location.href=url;return;}say("Stripe returned no URL","error");}else{const err=await res.text();say(`Checkout failed: ${err}`,"error");}}catch(e){console.warn("Stripe checkout unavailable",e);setLokPass(true);setOwnedThemes(Object.keys(THEMES));blip("C6");say("LokPass active! (local)");}setLokPassBusy(false);}} onTheme={id=>{if(ownedThemes.includes(id)){setUiTheme(id);say(`Equipped ${THEMES[id].name}`);}else spend(THEMES[id].price,()=>{setOwnedThemes(o=>[...o,id]);setUiTheme(id);},`${THEMES[id].name} unlocked`);}} onEffect={(id,e)=>{if(ownedEffects.includes(id)){setEffect(id);say(id==="none"?"Effects off":`${e.name} equipped`);}else spend(e.price,()=>{setOwnedEffects(o=>[...o,id]);setEffect(id);},`${e.name} unlocked`);}} onSky={(id,s)=>{if(ownedSkies.includes(id)){setSky(id);say(id==="clear"?"Sky off":`${s.name} equipped`);}else spend(s.price,()=>{setOwnedSkies(o=>[...o,id]);setSky(id);},`${s.name} unlocked`);}}/>}
        </div>
        </Suspense>
      </main>
      {!lokPass&&!kids&&AD_PROVIDER!=="off"&&(<div className="fixed inset-x-0 z-40 flex items-center gap-2 px-4 py-1.5 text-xs font-bold" style={{bottom:62,background:T.card,borderTop:`2px dashed ${T.ink}`,color:T.ink,opacity:adVisible?1:0,transition:"opacity .3s ease",pointerEvents:adVisible?"auto":"none"}}>
        {AD_PROVIDER==="placeholder"&&<span className="opacity-70 truncate flex-1" key={adIdx} style={{animation:"lokrise .3s ease"}}>Ad · {ADS[adIdx].text}</span>}
        {AD_PROVIDER==="ethicalads"&&<div data-ea-publisher={ETHICALADS_PUBLISHER} data-ea-type="text" className="flex-1"/>}
        {AD_PROVIDER==="custom"&&<div className="flex-1" dangerouslySetInnerHTML={{__html:CUSTOM_AD_HTML}}/>}
        <button onClick={()=>setTab("shop")} aria-label="Remove ads with LokPass" className="underline shrink-0" style={{color:T.accent}}>Remove with LokPass</button>
      </div>)}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex" style={{background:T.paper,borderTop:`3px solid ${T.ink}`,paddingBottom:"env(safe-area-inset-bottom)"}} role="navigation" aria-label="Main navigation">
        {[["feed",kids?"Home":"Feed",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],["gallery",kids?"You":"You",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],["studio","Studio",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><circle cx="11" cy="11" r="2"/></svg>],["battle",kids?"Draw":"Battle",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>],["rooms","Rooms",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18" opacity=".45"/><circle cx="7.5" cy="7.5" r="1.6" fill="currentColor"/><path d="M14 16c1.5-2 4-2 5 0" /></svg>],["front","Rush",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>],["shop","Shop",<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>]].map(([id,label,icon])=>{const on=tab===id;return(<button key={id} onClick={()=>setTab(id)} aria-label={`Go to ${label}`} aria-current={on?"page":undefined} className="lok-btn lok-display relative flex-1 py-2.5 text-xs font-bold flex flex-col items-center gap-0.5" style={{color:on?T.accent:T.ink,transition:"color .2s ease"}}>
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
      {artistView&&<ArtistPage name={artistView} posts={posts} following={following} onOpenPost={post=>{const i=posts.findIndex(x=>x.id===post.id);if(i>=0){setOpenIdx(i);}else{setPosts(ps=>ps.some(x=>x.id===post.id)?ps:[post,...ps]);setTimeout(()=>setOpenIdx(0),80);}}} onLok={name=>{setFollowing(f=>{const next=f.includes(name)?f:[...f,name];if(account)lokApi.follow(account,name).catch(()=>{});return next;});questTick("lok");blip("G5");hap([20,10,20]);say(`Lok'd ${name}`);}} onOpen={id=>setOpenIdx(posts.findIndex(p=>p.id===id))} onClose={()=>setArtistView(null)}/>}
      {openIdx!==null&&posts[openIdx]&&(<Viewer posts={posts} index={openIdx} bookmarks={bookmarks} cosmetics={cosmetics} onBookmark={id=>{setBookmarks(b=>{const had=b.includes(id);const next=had?b.filter(x=>x!==id):[...b,id];if(account){if(had)lokApi.unbookmark(account,id).catch(()=>{});else lokApi.bookmark(account,id).catch(()=>{});}return next;});hap([20]);say(bookmarks.includes(id)?"Bookmark removed":"Lok'd in");}} onClose={()=>setOpenIdx(null)} onNav={d=>setOpenIdx(i=>Math.min(posts.length-1,Math.max(0,i+d)))} onVote={id=>{const p=posts.find(x=>x.id===id);if(p.voted)return;patchPost(id,{voted:true,votes:p.votes+1});if(p.remote)lokApi.votePost(id,p.votes+1);addLoks(5);gainXp(5);questTick("vote");blip("C5");hap([30]);setVoteCount(c=>c+1);say("Vote stamped");}} onReact={(id,type)=>{const p=posts.find(x=>x.id===id);patchPost(id,{reactions:{...p.reactions,[type]:p.reactions[type]+1}});blip("D5");hap([15]);if(account)lokApi.react(account,id,type).catch(()=>{});}} onViewed={id=>{const p=posts.find(x=>x.id===id);if(p.viewed)return;patchPost(id,{viewed:true,views:(p.views||0)+1});addLoks(3);gainXp(3);questTick("view");say("Full slide-through · +3 Loks");}} onEcho={echoPost} onBoost={boostPost} onDelete={id=>{setPosts(ps=>ps.filter(p=>p.id!==id));setOpenIdx(null);say("Post deleted");}} onRename={(id,title)=>patchPost(id,{title})} onArtist={n=>{setOpenIdx(null);setArtistView(n);}} myName={profile.name}/>)}
      {(()=>{const TIP_TEXT={studio:"✏️ Draw → Capture → repeat. 2+ pages makes it move",battle:"⚔ Same prompt, same clock. Tap LOK BLOCK when a rival attacks!",gallery:account?null:"💾 Tap ⚙ → Lok account to keep your data forever",shop:"🛍 Everything here costs Loks you earn by playing — no real money except LokPass"};
        return !showOnboard&&TIP_TEXT[tab]&&!tips[tab]?(<button onClick={()=>setTips(t=>({...t,[tab]:true}))} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.ink,color:T.paper,border:`3px solid ${T.accent}`,boxShadow:`4px 4px 0 ${T.accent}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss tip">{TIP_TEXT[tab]} · tap to dismiss</button>):null;})()}
      {showHint&&tab==="feed"&&(<button onClick={()=>setShowHint(false)} className="fixed left-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-bold text-center lok-btn" style={{bottom:150,transform:"translateX(-50%)",background:T.accent,color:T.onAccent,border:`3px solid ${T.ink}`,boxShadow:`4px 4px 0 ${T.ink}`,maxWidth:"90vw",animation:"lokrise .4s ease"}} aria-label="Dismiss hint">Slide a post down to play it · ▲ to vote · tap to dismiss</button>)}
      {showOnboard&&<Onboard defaultName={profile.name} onName={n=>{const clean=(n||"").trim();if(!clean)return;if(isReservedName(clean)){const alt=suggestHandle(clean,profile.avatarSeed);say(`"${clean}" is a Lok artist — how about ${alt}?`,"error");setProfile(p=>({...p,name:alt}));return;}setProfile(p=>({...p,name:clean}));}} onDone={()=>{setShowOnboard(false);setOnboarded(true);setShowHint(true);addLoks(50);gainXp(20);blip("C6");say("Welcome · +50 Loks to start");}}/>}
      <div className="fixed left-1/2 z-50 flex flex-col-reverse items-center gap-1.5" style={{bottom:100,transform:"translateX(-50%)",pointerEvents:"none"}}>
        {toasts.map((t,i)=>(<div key={t.id} className="px-4 py-2 rounded-xl font-bold text-center" style={{background:t.type==="success"?T.alt:t.type==="error"?"#C23B22":T.ink,color:T.paper,border:`2.5px solid ${t.type==="success"?T.alt:T.accent}`,animation:"lokrise .2s ease",opacity:1-i*0.18,transform:`scale(${1-i*0.04})`,maxWidth:"88vw",fontSize:13}}>{t.msg}</div>))}
      </div>
    </div>
  </ThemeCtx.Provider></ErrorBoundary>);
}
