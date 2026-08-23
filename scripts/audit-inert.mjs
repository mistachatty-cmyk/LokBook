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
// Derived, not hand-maintained. This used to be a literal array, which silently
// rotted: `globeSkin` was added as a full cosmetic category (catalogue, Shop
// section, buy/equip flow) and this audit never knew it existed, so it could
// have gone inert unnoticed. Scrape the categories the Shop actually buys and
// equips instead, then union with the known list so nothing is lost.
const scrapeCats = src => new Set([
  ...[...src.matchAll(/\bbuy\(\s*["'](\w+)["']/g)].map(m => m[1]),
  ...[...src.matchAll(/\b(?:has|eq)\(\s*["'](\w+)["']/g)].map(m => m[1]),
  ...[...src.matchAll(/onBuyCosmetic\(\s*["'](\w+)["']/g)].map(m => m[1]),
  ...[...src.matchAll(/cosmetics\.(\w+)/g)].map(m => m[1]),
]);
const KNOWN = ["nameColor","frame","reactionPack","avatarAccent","blotBorder","paper","gear",
  "cursorPack","fontPack","stickerPack","postExport","lillokSkin","lillokAura","lillokPet","voicePack","musicPack"];
const cats = [...new Set([...KNOWN, ...scrapeCats(read('src/pages/Shop.jsx'))])]
  .filter(c => !/^(find|map|filter|length|id|name|price)$/.test(c))
  .sort();
// Some categories are NOT stored under the `cosmetics` object — they're top-level
// state in App.jsx (e.g. `const [stickerPack,setStickerPack]=useState("emoji")`).
// Grepping only `cosmetics.<key>` reported those as INERT when they were wired,
// so also count the bare identifier used as a JSX prop on a non-Shop component.
const app = read('src/App.jsx');
const shopLine = app.split('\n').find(l=>/<Shop\b/.test(l)) || '';
const appNoShop = app.split('\n').filter(l=>!/<Shop\b/.test(l)).join('\n');
const nameOnly=[];
console.log('== COSMETIC CATEGORIES (consumed outside Shop) ==');
for(const k of cats){
  const viaCosmetics=(consumerSrc.match(new RegExp(`cosmetics\\.${k}\\b`,'g'))||[]).length;
  // bare identifier consumed outside the <Shop .../> props line: prop pass or direct read
  // a line counts as a real consumer if it passes the key as a prop, or reads it
  // alongside a lookup (`X.find(... === key)`) — but never the save/load plumbing
  const kRe=new RegExp(`\\b${k}\\b`);
  const viaTopLevel=appNoShop.split('\n').filter(l=>
    kRe.test(l) && !/useState|save\.|getSaveBlob/.test(l) &&
    (new RegExp(`\\b${k}\\s*=\\{`).test(l) || /\.find\(/.test(l))
  ).length
    + (consumerFiles.filter(p=>!/App\.jsx$/.test(p)).map(read).join('\n').match(new RegExp(`\\b${k}\\b`,'g'))||[]).length;
  const n=viaCosmetics+viaTopLevel;
  const how=viaCosmetics&&viaTopLevel?'cosmetics+state':viaCosmetics?'cosmetics':viaTopLevel?'top-level state':'';

  // ---- "referenced" is not "rendered" -----------------------------------
  // blotExpression, blotIdleAnimation and blotBounce all reported WIRED here
  // for months while rendering absolutely nothing. The only code outside the
  // Shop that touched them was
  //     BLOT_EXPRESSIONS.filter(p=>p.id===cosmetics.blotExpression)
  // which reads the row's `giftReward` field to pick a random gift. The id
  // satisfied the grep above and never reached the sprite: 14 items, 20-45
  // Loks each, all drawing the default face and the default bounce.
  //
  // So also ask whether the value reaches something that can DRAW: passed as a
  // JSX prop, used to index a renderer table, or fed to a style/animation/class.
  // A category consumed only inside a catalogue lookup that reads some OTHER
  // field is reported separately, because that is indistinguishable from inert
  // to anyone actually using the app.
  // Three independent signals, because a prop is usually RENAMED at the
  // component boundary (`expression={cosmetics.blotExpression}` becomes plain
  // `expression` inside the sprite), so grepping the category name inside the
  // renderer alone is not enough:
  //   a) the name appears in some non-App, non-Shop file — a real renderer;
  //   b) App.jsx passes it into a JSX element as a prop value;
  //   c) App.jsx passes it as a call argument (e.g. getBlotResponse(...)),
  //      or uses it to index a table, or feeds it to a style/animation.
  // Deliberately NOT counted: `x.id === cosmetics.<k>` catalogue lookups and
  // useEffect dependency arrays. Those are exactly what made three sellable
  // categories look wired while drawing nothing.
  const inRenderer = consumerFiles.some(f => !/App\.jsx$/.test(f) && new RegExp(`\\b${k}\\b`).test(read(f)));
  const appLines = appNoShop.split('\n');
  const asJsxProp = appLines.some(l => /<[A-Z]\w*/.test(l) && new RegExp(`\\w+=\\{[^}]{0,120}(cosmetics\\.)?${k}\\b`).test(l));
  const asArgOrStyle = appLines.some(l =>
    new RegExp(`\\(\\s*cosmetics\\.${k}\\s*[,)]`).test(l) ||
    new RegExp(`\\[\\s*cosmetics\\.${k}\\s*\\]`).test(l) ||
    (new RegExp(`cosmetics\\.${k}\\b`).test(l) && /(style=|animation|className|filter:|background)/.test(l)));
  const rendered = inRenderer || asJsxProp || asArgOrStyle;
  let tag = n ? 'WIRED  ' : 'INERT  ';
  let note = how ? `  [${how}]` : '';
  if (n && !rendered) {
    tag = 'NAME-ONLY';
    note += '  <- referenced but never reaches a renderer: nothing on screen changes';
    nameOnly.push(k);
  }
  console.log(`${tag.padEnd(9)} ${k.padEnd(14)} ${n} consumer(s)${note}`);
}
if (nameOnly.length) {
  console.log(`\n!! ${nameOnly.length} category(ies) are sellable and NAME-ONLY: ${nameOnly.join(', ')}`);
}

// 1b. rotation items (mythic/daily/weekly) — a separate id-space from `cosmetics`,
// previously not audited at all. These are purchasable, so inertness costs real Loks.
console.log('\n== ROTATION ITEMS (mythic / daily / weekly) ==');
for(const [arr,state] of [['MYTHIC_ITEMS','mythicEquipped'],['DAILY_ITEMS','dailyOwned'],['WEEKLY_ITEMS','weeklyOwned']]){
  const m=constants.match(new RegExp(`export const ${arr} = \\[([\\s\\S]*?)\\n\\];`));
  const count=m?(m[1].match(/\{\s*id:/g)||[]).length:0;
  // consumers = uses of the equipped/owned state that aren't pure save/load/Shop plumbing
  const lines=app.split('\n').map((l,i)=>[i+1,l]).filter(([,l])=>new RegExp(`\\b${state}\\b`).test(l));
  const real=lines.filter(([,l])=>!/useState|save\.|getSaveBlob|<Shop\b/.test(l));
  console.log(`${real.length?'PARTIAL':'INERT  '} ${arr.padEnd(13)} ${String(count).padStart(3)} items · ${state}: ${real.length} real consumer(s)${real.length?` (App.jsx:${real.map(([n])=>n).join(',')})`:''}`);
}

// 2. studio modules: declared ids vs hasModule() ids
const declared=[...constants.matchAll(/id:\s*"((?:brush|tool|feat|canvas|anim|layers)_[a-z0-9_]+)"/g)].map(m=>m[1]);
const used=new Set([...allSrc.matchAll(/hasModule\([^,]+,\s*"([^"]+)"/g)].map(m=>m[1]));
const liveSrc=[read('src/App.jsx'), read('src/Easel.jsx')].join('\n');
const usedLive=new Set([...liveSrc.matchAll(/hasModule\([^,]+,\s*"([^"]+)"/g)].map(m=>m[1])
  .concat([...liveSrc.matchAll(/\b(?:pro|owns)\("([^"]+)"\)/g)].map(m=>m[1])));
console.log('\n== STUDIO MODULES (declared vs honoured) ==');
const inertMods=[];
for(const id of [...new Set(declared)]){
  const inLive=usedLive.has(id), inAny=used.has(id);
  const tag = inLive?'WIRED (live)':inAny?'ARCHIVE-ONLY':'NOT BUILT';
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
