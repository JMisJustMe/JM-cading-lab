/* Remaining embodied/choice coding identities — authorised forward current-native descendants. */
import { Trace, digest } from '../../../sovereign-ten/direct/native-core.mjs';

function need(ok, code, message){ if(!ok){ const e=new Error(message); e.code=code; throw e; } }
function lines(source, keyword){ const m=String(source??'').match(new RegExp(`^\\s*${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`,'i')); need(m,`${keyword}_BODY`,`${keyword} NAME { ... } required.`); return {name:m[1],lines:m[2].replace(/\r/g,'').split('\n').map(x=>x.replace(/\s*(?:#|\/\/).*$/,'').trim()).filter(Boolean)}; }
function wrap(name,action,result){ const t=new Trace(name); t.emit(action,result); return {...result,trace:t.events,receipt:t.receipt(action,result)}; }

export const REMAINING_EMBODIED_BOUNDARY=Object.freeze({
  schema:'jm.remaining-embodied-five/1.0',status:'AUTHORISED_FORWARD_NATIVE_BRIDGES',historicalRecoveryClaim:false,
  bodies:['Seedform Choice Interface','Prayer Hands / Paired Contact Logic','JickMa / JickMah','Mood Drills','MorseMinus'],
  sourceLaw:'Finger Two moves; MorseMinus binds; Contact Field proves; JickMa reads.'
});

export const Seedform={
  parse(source){ const b=lines(source,'seedform'); const choices=[]; for(const line of b.lines){ const m=line.match(/^choice\s+([\w.-]+)\s+when\s+([\w.-]+)\s*=\s*("(?:\\.|[^"\\])*")\s+route\s+([\w.-]+)$/i); need(m,'SEEDFORM_DECL',`Invalid Seedform choice: ${line}`); choices.push({name:m[1],field:m[2],value:JSON.parse(m[3]),route:m[4]}); } need(choices.length,'SEEDFORM_EMPTY','Seedform requires choices.'); return {type:'SeedformProgram',name:b.name,choices}; },
  execute(source,state){ const ast=this.parse(source); const matched=ast.choices.filter(c=>String(state?.[c.field])===String(c.value)); need(matched.length===1,'SEEDFORM_AMBIGUOUS','Seedform must resolve exactly one choice.'); const result={type:'SeedformResult',choice:matched[0].name,route:matched[0].route,stateDigest:digest(state??{})}; return {ast,runtime:wrap('Seedform','choice.resolved',result)}; }
};

export const PrayerHands={
  parse(source){ const b=lines(source,'prayerhands'); const pairs=[]; for(const line of b.lines){ const m=line.match(/^pair\s+([\w.-]+)\s+left\s+([\w.-]+)\s+right\s+([\w.-]+)\s+hold\s+(\d+)\.\.(\d+)\s+route\s+([\w.-]+)$/i); need(m,'PRAYER_DECL',`Invalid paired-contact rule: ${line}`); pairs.push({name:m[1],left:m[2],right:m[3],min:Number(m[4]),max:Number(m[5]),route:m[6]}); } return {type:'PrayerHandsProgram',name:b.name,pairs}; },
  execute(source,event){ const ast=this.parse(source); const rule=ast.pairs.find(r=>event?.left===r.left&&event?.right===r.right&&Number(event?.hold)>=r.min&&Number(event?.hold)<=r.max); const result={type:'PrayerHandsResult',matched:Boolean(rule),pair:rule?.name??null,route:rule?.route??null,paired:true}; return {ast,runtime:wrap('Prayer Hands','pair.checked',result)}; }
};

export const JickMa={
  parse(source){ const b=lines(source,'jickma'); const reads=[]; for(const line of b.lines){ const m=line.match(/^read\s+([\w.-]+)\s+from\s+(gesture|contact|state|signal)\s+([\w.-]+)\s+as\s+("(?:\\.|[^"\\])*")\s+route\s+([\w.-]+)$/i); need(m,'JICKMA_DECL',`Invalid JickMa read: ${line}`); reads.push({name:m[1],from:m[2].toLowerCase(),field:m[3],meaning:JSON.parse(m[4]),route:m[5]}); } return {type:'JickMaProgram',name:b.name,reads}; },
  execute(source,channel,input){ const ast=this.parse(source); const rule=ast.reads.find(r=>r.from===channel&&Object.prototype.hasOwnProperty.call(input??{},r.field)); need(rule,'JICKMA_NO_READ','No readable rule for channel/input.'); const result={type:'JickMaResult',read:rule.name,channel,value:input[rule.field],meaning:rule.meaning,route:rule.route,interpretationNotMutation:true}; return {ast,runtime:wrap('JickMa','input.read',result)}; }
};

export const MoodDrills={
  parse(source){ const b=lines(source,'mooddrills'); const drills=[]; for(const line of b.lines){ const m=line.match(/^drill\s+([\w.-]+)\s+when\s+mood\s+([\w.-]+)\s+do\s+([\w.-]+(?:\s*>\s*[\w.-]+)*)\s+signal\s+("(?:\\.|[^"\\])*")$/i); need(m,'MOOD_DECL',`Invalid Mood Drill: ${line}`); drills.push({name:m[1],mood:m[2],steps:m[3].split('>').map(x=>x.trim()),signal:JSON.parse(m[4])}); } return {type:'MoodDrillsProgram',name:b.name,drills}; },
  execute(source,mood,observed){ const ast=this.parse(source); const drill=ast.drills.find(d=>d.mood===mood); need(drill,'MOOD_UNKNOWN','No drill for mood.'); const matched=Array.isArray(observed)&&observed.length===drill.steps.length&&observed.every((x,i)=>x===drill.steps[i]); const result={type:'MoodDrillsResult',drill:drill.name,mood,matched,signal:matched?drill.signal:null}; return {ast,runtime:wrap('Mood Drills','drill.checked',result)}; }
};

export const MorseMinus={
  parse(source){ const b=lines(source,'morseminus'); const binds=[]; for(const line of b.lines){ const m=line.match(/^bind\s+([\w.-]+)\s*=\s*([.\-_]+)\s+to\s+([\w.-]+)$/i); need(m,'MORSEMINUS_DECL',`Invalid MorseMinus bind: ${line}`); binds.push({name:m[1],pattern:m[2],route:m[3]}); } const seen=new Set(); for(const x of binds){ need(!seen.has(x.pattern),'MORSEMINUS_COLLISION','Duplicate binding pattern.'); seen.add(x.pattern); } return {type:'MorseMinusProgram',name:b.name,binds,zeroGrip:false}; },
  execute(source,pattern){ const ast=this.parse(source); const bind=ast.binds.find(x=>x.pattern===pattern); need(bind,'MORSEMINUS_UNBOUND','Unbound MorseMinus pattern.'); const result={type:'MorseMinusResult',binding:bind.name,pattern,route:bind.route,zeroGrip:false,proof:digest({pattern,route:bind.route})}; return {ast,runtime:wrap('MorseMinus','pattern.bound',result)}; }
};
