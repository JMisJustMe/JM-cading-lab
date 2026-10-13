import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../estate-accessibility.js'),'utf8');
function run({denyRead=false,denyWrite=false,denyGetter=false,stored={}}={}){
 const classes=new Set(), listeners={},elements=new Map(), data=new Map(Object.entries(stored));
 for(const id of ['estateContrast','estateText','estateMotion','estateA11yStatus'])elements.set('#'+id,{attributes:{},events:{},textContent:'',setAttribute(k,v){this.attributes[k]=v},addEventListener(k,f){this.events[k]=f}});
 const ctx={document:{documentElement:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k)}}},body:{},querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(k,f)=>listeners[k]=f},MutationObserver:class{observe(){}},window:{addEventListener(){}},location:{},console};
 Object.defineProperty(ctx,'localStorage',{get(){if(denyGetter)throw Error('SecurityError');return {getItem(k){if(denyRead)throw Error('SecurityError');return data.get(k)||null},setItem(k,v){if(denyWrite)throw Error('QuotaExceededError');data.set(k,v)}}}});
 vm.runInNewContext(source,ctx);listeners.DOMContentLoaded();return {classes,elements,data,click:id=>elements.get('#'+id).events.click(),status:()=>elements.get('#estateA11yStatus').textContent};
}
test('denied storage getter retains all three live controls',()=>{const r=run({denyGetter:true});for(const [id,cls] of [['estateContrast','a11y-contrast'],['estateText','a11y-large'],['estateMotion','a11y-motion']]){r.click(id);assert.ok(r.classes.has(cls));assert.equal(r.elements.get('#'+id).attributes['aria-pressed'],'true')}assert.match(r.status(),/for this session; browser storage unavailable/)});
test('denied reads defaults to accessible session and writes persist when allowed',()=>{const r=run({denyRead:true});r.click('estateContrast');assert.ok(r.classes.has('a11y-contrast'));assert.equal(r.data.get('jm-estate-a11y-contrast'),'true')});
test('failed writes do not prevent the rendered state or truthfully announce persistence',()=>{const r=run({denyWrite:true});r.click('estateText');assert.ok(r.classes.has('a11y-large'));assert.match(r.status(),/storage unavailable/);r.click('estateText');assert.ok(!r.classes.has('a11y-large'))});
test('existing stored choices and key grammar remain unchanged',()=>{const r=run({stored:{'jm-estate-a11y-motion':'true','jm-estate-a11y-large':'true'}});assert.ok(r.classes.has('a11y-motion'));assert.ok(r.classes.has('a11y-large'));assert.equal(r.elements.get('#estateMotion').attributes['aria-pressed'],'true')});
test('healthy toggles round-trip into a fresh execution',()=>{const r=run();r.click('estateContrast');r.click('estateMotion');assert.equal(r.status(),'motion enabled');const fresh=run({stored:Object.fromEntries(r.data)});assert.ok(fresh.classes.has('a11y-contrast'));assert.ok(fresh.classes.has('a11y-motion'))});
