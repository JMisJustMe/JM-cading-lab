import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
const root=process.argv[2],out=root+'/build_out';
const sdk=fs.readFileSync(root+'/donors/04_JM_CARTRIDGE_SDK_v1_0.js','utf8');
const adapter=fs.readFileSync(root+'/03_JM_SOVEREIGN_HTML_CARTRIDGE_ADAPTER_v0_1.js','utf8');
const ctx={console,TextEncoder,TextDecoder,crypto:crypto.webcrypto,structuredClone,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64')};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(sdk,ctx);vm.runInContext(adapter,ctx);
const names=['04_TBOYS_CORE_CLASH_v0_3_SOVEREIGN_HTML_CARTRIDGE.jmcart.json','05_SAVE_PROBE_SOVEREIGN_HTML_CARTRIDGE.jmcart.json'];
for(const n of names){const p=JSON.parse(fs.readFileSync(out+'/'+n,'utf8'));const donor=ctx.JMCartridgeSDK.validate(p);if(!donor.valid)throw new Error(n+' donor SDK '+donor.errors);const v=await ctx.JMSovereignHTMLAdapter.validate(p);if(!v.valid)throw new Error(n+' adapter '+v.errors);const actual=crypto.createHash('sha256').update(v.decodedHtml).digest('hex');if(actual!==p.runtime.source.sha256)throw new Error('source mismatch '+n)}
const p=JSON.parse(fs.readFileSync(out+'/'+names[0],'utf8'));p.runtime.source.bodyBase64=p.runtime.source.bodyBase64.slice(0,-4)+'AAAA';const bad=await ctx.JMSovereignHTMLAdapter.validate(p);if(bad.valid||!bad.errors.some(e=>e.includes('Source SHA-256 mismatch')))throw new Error('tamper gate failed');
console.log('DONOR_JM_CARTRIDGE_SDK_VALIDATION PASS');console.log('EXACT_HTML_SOURCE_CUSTODY PASS');console.log('SOURCE_TAMPER_REJECTION PASS');console.log('SOVEREIGN_HTML_ADAPTER_STATIC_DING PASS');
