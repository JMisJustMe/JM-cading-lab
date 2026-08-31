const fs=require('fs');
const path=require('path');
const here=__dirname;
const read=name=>fs.readFileSync(path.join(here,name),'utf8');
const must=(ok,msg)=>{if(!ok){console.error('PUKA v0.13 DEEP HOUSE DING FAIL:',msg);process.exit(1)}console.log('PASS',msg)};

const html=read('00_OPEN_FIRST.html');
const css=read('puka-v13.css');
const js=read('puka-deep-house-v13.js');
const sw=read('sw.js');
const registry=JSON.parse(read('registry.json'));
const lattice=read('assets/puka-deep-house-lattice-v13.svg');

must(html.includes('PUKA v0.13A'),'front door identifies v0.13A');
must(html.includes('puka-v12.css')&&html.includes('puka-v13.css'),'v0.12 learning loop remains mounted beneath v0.13');
must(html.indexOf('puka-v13.css')>html.indexOf('puka-v12.css'),'Deep House CSS loads after v0.12 capability layer');
must(html.indexOf('puka-deep-house-v13.js')>html.indexOf('puka-living-table-v10.js'),'Deep House visible-state organ loads after inherited living-table organ');
must(css.includes('--puka-d0')&&css.includes('--puka-d3'),'meaningful D0-D3 depth roles are declared');
must(css.includes('puka-deep-house-lattice-v13.svg'),'protected field lattice is mounted');
must(css.includes('prefers-reduced-motion:reduce'),'reduced-motion route is preserved');
must(css.includes('min-height:max(300px'),'phone protected-field 300px floor is present');
must(js.includes("root.dataset.deepHouse='active'"),'runtime marks Deep House contact active');
must(js.includes('root.dataset.contactConsequence'),'action consequence state is exposed for proof');
must(js.includes('root.dataset.fieldContact'),'direct field contact state is exposed for proof');
must(!/\bPUKA\s*\./.test(js),'Deep House organ does not access PUKA game authority');
must(!/localStorage|sessionStorage|indexedDB/i.test(js),'Deep House organ does not read persistence authority');
must(!/players\.ai|houseHole|hidden hole|deck\b/i.test(js),'Deep House organ does not inspect hidden poker state');
must(sw.includes("const CACHE='jm-puka-v13a'"),'service-worker cache advances to v0.13A');
must(sw.includes('./puka-v13.css')&&sw.includes('./puka-deep-house-v13.js')&&sw.includes('./assets/puka-deep-house-lattice-v13.svg'),'v0.13 Deep House body is offline-cached');
must(registry.schema==='JM.PUKA.Room/0.13A','registry advances to v0.13A');
must(registry.status==='STAGE_BODY_NOT_CROWNED','automated convergence does not self-crown');
must(Array.isArray(registry.v13Changes)&&registry.v13Changes.length>=8,'v0.13 convergence delta is receipted');
must(lattice.includes('PUKA Deep House field lattice'),'original PUKA field lattice asset is identified');

console.log('PUKA v0.13A DEEP HOUSE SOURCE DING PASS');
