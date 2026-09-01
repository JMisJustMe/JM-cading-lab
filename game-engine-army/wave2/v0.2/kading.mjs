import {hash} from './shared.mjs';

const ALLOWED=['GAME','BODY','INPUT','LOOP','CONSEQUENCE','TARGET','REPEAT','TRACE'];
const REQUIRED=['GAME','BODY','INPUT','LOOP','CONSEQUENCE','TARGET'];

export function parseKading(source){
  const lines=source.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const ast={schema:'jm.kading-ast/0.2',statements:[]};
  for(let i=0;i<lines.length;i++){
    const [op,...rest]=lines[i].split(/\s+/);
    if(!ALLOWED.includes(op)) throw Error(`Kading parse fault line ${i+1}: ${op}`);
    ast.statements.push({op,value:rest.join(' '),line:i+1});
  }
  const map=Object.fromEntries(ast.statements.map(statement=>[statement.op,statement.value]));
  for(const required of REQUIRED){
    if(!map[required]) throw Error('Kading missing '+required);
  }
  return ast;
}

export function lowerKading(ast){
  const map=Object.fromEntries(ast.statements.map(statement=>[statement.op,statement.value]));
  const repeat=Number(map.REPEAT||1);
  if(!Number.isInteger(repeat)||repeat<1||repeat>32) throw Error('Kading REPEAT must be an integer from 1 to 32');
  return {
    schema:'jm.kading-game-ir/0.2',
    game:map.GAME,
    body:map.BODY,
    input:map.INPUT,
    loop:map.LOOP,
    consequence:map.CONSEQUENCE,
    target:map.TARGET,
    repeat,
    trace:(map.TRACE||'ON')==='ON',
    identityHash:hash([map.GAME,map.BODY,map.TARGET]),
    routeHash:hash([map.INPUT,map.LOOP,map.CONSEQUENCE,repeat])
  };
}

export function runKading(source){
  const ast=parseKading(source);
  const ir=lowerKading(ast);
  const events=[];
  for(let cycle=1;cycle<=ir.repeat;cycle++){
    events.push({cycle,stage:'INPUT',value:ir.input});
    events.push({cycle,stage:'LOOP',value:ir.loop});
    events.push({cycle,stage:'CONSEQUENCE',value:ir.consequence});
  }
  return {
    ast,
    ir,
    events,
    receipt:{
      schema:'jm.kading-receipt/0.2',
      identityHash:ir.identityHash,
      routeHash:ir.routeHash,
      eventHash:hash(events),
      cycles:ir.repeat,
      status:'PASS'
    }
  };
}

export const KADING_SAMPLE=`GAME TBOYS
BODY KADING
INPUT AIM_DRAG
LOOP COLLISION
CONSEQUENCE PRESSURE
TARGET GLYPHPLAY
REPEAT 2
TRACE ON`;
