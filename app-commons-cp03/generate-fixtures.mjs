import {writeFileSync} from 'node:fs';
import {createCapsule,sha256} from './core.mjs';
const source='# JM Cross-Surface ✨\n\nBefore and after: source ↔ receiver.\n- [ ] Preserve my original identity\n';
const snapshot='# JM Cross-Surface ✨\n\nBefore and after: source.\n- [ ] Preserve my original identity\n';
const obj=createCapsule({name:'JM Original Fold 🌍',source,snapshots:[{text:snapshot,hash:sha256(snapshot),created:'2026-10-26T15:15:00Z',label:'Baseline ✨'}]});
writeFileSync('fixture-valid-capsule.json',JSON.stringify(obj,null,2));
const tampered=structuredClone(obj);tampered.payload.source+='TAMPER';
writeFileSync('fixture-tampered.json',JSON.stringify(tampered));
console.log('fixture checksum',obj.checksum);
