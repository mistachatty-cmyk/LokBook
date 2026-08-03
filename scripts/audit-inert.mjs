// Evidence-based inert-feature audit: for every purchasable/toggleable thing,
// check whether anything OUTSIDE the shop/constants actually consumes it.
import fs from 'fs';
import path from 'path';

const files = [];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f);
  const st=fs.statSync(p); if(st.isDirectory()){ if(!/archive|node_modules/.test(p)) walk(p); }
  else if(/\.(jsx?|tsx?)$/.test(f)) files.push(p); }})('src');

const read = p => fs.readFileSync(p,'utf8');
const consumerFiles = files.filter(p => !/pages\/Shop\.jsx|constants\.jsx/.test(p));
const consumerSrc = consumerFiles.map(read).join('\n');
const allSrc = files.map(read).join('\n');
const constants = read('src/constants.jsx');

// 1. cosmetic categories
const cosmeticKeys = [...new Set([...constants.matchAll(/onBuyCosmetic\(/g)].map(()=>0))];
const cats = ["nameColor","frame","reactionPack","avatarAccent","blotBorder","paper","gear",
  "cursorPack","fontPack","stickerPack","postExport","lillokSkin","lillokAura","lillokPet","voicePack","musicPack"];
console.log('== COSMETIC CATEGORIES (cosmetics.<key> consumed outside Shop) ==');
for(const k of cats){
  const n=(consumerSrc.match(new RegExp(`cosmetics\\.${k}\\b`,'g'))||[]).length;
  console.log(`${n? 'WIRED  ':'INERT  '} ${k.padEnd(14)} ${n} consumer(s)`);
}

// 2. studio modules: declared ids vs hasModule() ids
const declared=[...constants.matchAll(/id:\s*"((?:brush|tool|feat|canvas|anim|layers)_[a-z0-9_]+)"/g)].map(m=>m[1]);
const used=new Set([...allSrc.matchAll(/hasModule\([^,]+,\s*"([^"]+)"/g)].map(m=>m[1]));
const liveSrc=[read('src/App.jsx')].join('\n');
const usedLive=new Set([...liveSrc.matchAll(/hasModule\([^,]+,\s*"([^"]+)"/g)].map(m=>m[1])
  .concat([...liveSrc.matchAll(/\bpro\("([^"]+)"\)/g)].map(m=>m[1])));
console.log('\n== STUDIO MODULES (declared vs honoured) ==');
const inertMods=[];
for(const id of [...new Set(declared)]){
  const inLive=usedLive.has(id), inAny=used.has(id);
  const tag = inLive?'WIRED (live)':inAny?'ARCHIVE-ONLY':'INERT';
  if(!inLive) inertMods.push(id);
  console.log(`${tag.padEnd(13)} ${id}`);
}
console.log(`-> ${inertMods.length}/${new Set(declared).size} modules not honoured by the live easel`);

// 3. top-level equipped values
console.log('\n== EQUIPPED SETTINGS (state consumed outside save/load) ==');
for(const k of ["effect","sky","animFx","uiTheme","flair","hapticGrammar","fourthWall","legacyBrushes","legacyStudio","celebrationStyle"]){
  const re=new RegExp(`\\b${k}\\b`,'g');
  const hits=consumerFiles.map(p=>({p,n:(read(p).match(re)||[]).length}))
    .filter(x=>x.n>0 && !/App\.jsx$/.test(x.p));
  const appHits=(read('src/App.jsx').match(re)||[]).length;
  console.log(`${(hits.length||appHits>6)?'WIRED  ':'CHECK  '} ${k.padEnd(18)} app:${appHits} other:${hits.map(h=>path.basename(h.p)).join(',')||'-'}`);
}
