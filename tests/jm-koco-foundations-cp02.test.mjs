import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const html=fs.readFileSync('api-hub/visual/index.html','utf8');
const catalog=JSON.parse(fs.readFileSync('api-hub/visual/foundation-catalog.json','utf8'));
const inside=html.match(/const FOUNDATION_CATALOG=([^\n]*);\nconst BASE_FOUNDATIONS=/);
assert(inside,'CP02 must embed exact registered source catalogue');
assert.deepEqual(JSON.parse(inside[1]),catalog,'visual projection must inherit source registry exactly');
assert.equal(catalog.schema,'JM.KOCO.FoundationsCatalogue/2.0');
assert.equal(catalog.shelves.length,5);
assert.equal(catalog.records.length,113);
const counts=Object.fromEntries(catalog.shelves.map(s=>[s.id,catalog.records.filter(x=>x.shelf===s.id).length]));
assert.deepEqual(counts,{laws:62,theories:21,mechanisms:10,creation:9,proof:11});
assert.equal(new Set(catalog.records.map(x=>x.id)).size,catalog.records.length);
const laws=catalog.records.filter(x=>/^law-(law|pnh)-\d{3}$/.test(x.id));
assert.equal(laws.length,52);
assert.equal(laws.filter(x=>x.id.startsWith('law-law-')).length,42);
assert.equal(laws.filter(x=>x.id.startsWith('law-pnh-')).length,10);
assert(laws.every(x=>x.evidence==='LIBRARY_ORIGINAL_READ'&&!x.path));
assert.equal(catalog.records.filter(x=>x.id.startsWith('canonical-theory-')).length,15);
assert(catalog.records.some(x=>x.id==='theory-census'&&x.role.includes('not 297 completed')));
assert(catalog.records.some(x=>x.id==='shared'&&x.state==='LIBRARY ORIGINAL RECOVERED'&&!x.path));
const apiMatch=html.match(/const API_DATA=(\[.*?\]);\nconst FOUNDATION_CATALOG=/s);
assert(apiMatch,'original API data must remain independent');
const api=JSON.parse(apiMatch[1]);assert.equal(api.length,23);
for(const x of catalog.records){if(x.path)assert(/^https:\/\//.test(x.path));assert(x.title&&x.role&&x.category&&x.state&&x.source_ref);}
for(const id of ['home','apis','connect','estate'])assert(html.includes('id="screen-'+id+'"'));
for(const id of ['foundationSearch','foundationMore','foundationAddForm','foundationImport','foundationExport'])assert(html.includes('id="'+id+'"'));
assert(html.includes('data-jm-foundations="cp03"')); // CP02 registered source remains unchanged behind its CP03 living-door descendant
assert(html.includes("OWNER_METADATA_UNVERIFIED"),'owner imports cannot crown source');
assert(html.includes('safeSourceURL'), 'owner links require security boundary');
assert(!html.includes('X-JM-Owner-Key:'));
assert(!html.includes('fetch('),'offline visual catalogue must not proxy original services');
const sourceHash=crypto.createHash('sha256').update(html).digest('hex');
console.log('PASS JM K.O CO CP02: 113 source records, 52 laws, 15 canonical theory titles, 23 unchanged API bodies, 5 shelves, source-projection equivalence');
console.log('CP02 source SHA256='+sourceHash);
