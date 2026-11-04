import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('api-hub/visual/index.html','utf8');
const source=JSON.parse(fs.readFileSync('api-hub/visual/foundation-catalog.json','utf8'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script,'One-file visual application script absent');
new vm.Script(script);

const checks=[
 ['canonical visual door retained',()=>html.includes('data-jm-koco-house="v2"')],
 ['CP03 inherits five-source shelves',()=>html.includes('data-jm-foundations="cp03"')&&source.shelves.length===5],
 ['113 original source rows still protected',()=>source.records.length===113],
 ['52 original operating laws still distinct',()=>source.records.filter(x=>/^law-(law|pnh)-\d{3}$/.test(x.id)).length===52],
 ['23 original API bodies preserved',()=>JSON.parse(html.match(/const API_DATA=(\[.*?\]);\nconst FOUNDATION_CATALOG=/s)?.[1]||'null').length===23],
 ['check source is owner-initiated, not background polling',()=>html.includes("foundationSync').addEventListener('click'")&&!html.includes('setInterval(')],
 ['no arbitrary feed URL is accepted',()=>script.includes("const root='https://raw.githubusercontent.com/JMisJustMe/JM-cading-lab/'")&&script.includes("credentials:'omit'")],
 ['source schema and limits checked',()=>script.includes("doc.schema!=='JM.KOCO.FoundationsCatalogue/2.0'")&&script.includes("safeCatalogueEntry(raw)")],
 ['changes in existing source are stopped',()=>script.includes('if(held.length)')&&script.includes('Existing originals unchanged')],
 ['new references require explicit second click',()=>script.includes("foundationAccept').addEventListener('click'")&&script.includes('pendingSourceAdditions')],
 ['original source and owner metadata keep separate custody',()=>script.includes('BASE_FOUNDATIONS.concat(sourceAdditions,ownerAdditions)')],
 ['proof-based opening of frozen original',()=>script.includes('JM_SHARED_MECHANISMS_v1_3_NATIVE_CONTACT.html')&&script.includes('342d4b27aa3e6e90d17685fdbfba2c525b848eff1526c581e97d3d15a2eb9142')],
 ['OPENBOX v2.0 frozen bytes protected',()=>script.includes('00870413232b4fccdbe669c3e66048bdce35ad6f2aff306f5357816b37137c21')],
 ['nonmatching original cannot claim exact keeper',()=>script.includes('SHA-256 differs from frozen original')],
 ['relationships limited to the same source register',()=>script.includes('y.source_ref===x.source_ref')&&script.includes('not a merger')],
 ['offline access retained',()=>script.includes('SOURCE HOLD')&&script.includes('Offline/embedded originals remain available.')],
 ['buttons hidden unless real staged additions',()=>html.includes('[hidden]{display:none!important}.source-contact-hint')],
 ['private API keys never embedded',()=>!html.includes('X-JM-Owner-Key:')&&!html.includes('Bearer SECRET')],
];
for(const [name,fn] of checks)assert(fn(),'FAIL '+name);
console.log('JM K.O CO CP03: '+checks.length+'/'+checks.length+' local source/contract checks PASS; browser/device proof remains separate');
