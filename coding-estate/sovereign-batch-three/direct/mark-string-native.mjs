import { Trace, assignments, blocks, need, splitTop, valueOf } from './native-core.mjs';

function parseMarkList(text) { return splitTop(text).map(valueOf).map(String); }

export const MarkLevelSyntax = {
  parse(source) {
    const marksBlock = String(source).match(/\bmarks\s*\{([\s\S]*?)\}/);
    need(marksBlock, 'MLS_MARKS_REQUIRED', 'Mark-Level Syntax requires marks block.');
    const marks = assignments(marksBlock[1]);
    need(Object.keys(marks).length, 'MLS_NO_MARKS', 'At least one mark required.');
    const levels = blocks(source, 'level').map(block => {
      const data = assignments(block.body);
      const phraseMatch = block.body.match(/\bphrase\s*=\s*\[([^\]]*)\]/);
      return { type:'MLSLevel', name:block.name, phrase: phraseMatch ? parseMarkList(phraseMatch[1]) : [], yields:data.yields ?? null };
    });
    need(levels.length, 'MLS_LEVEL_REQUIRED', 'At least one level required.');
    const route = String(source).match(/\broute\s+([A-Za-z_][\w.-]*)\s*->\s*([A-Za-z_][\w.-]*)/);
    need(route, 'MLS_ROUTE_REQUIRED', 'Mark-Level Syntax requires route.');
    levels.forEach(level => level.phrase.forEach(mark => need(Object.hasOwn(marks, mark), 'MLS_UNKNOWN_MARK', `Unknown mark ${mark}.`)));
    return { type:'MLSProgram', marks, levels, route:{ from:route[1], to:route[2] } };
  },
  lower(ast) {
    return {
      type:'MLSLayerGraph',
      markNodes:Object.entries(ast.marks).map(([name,value])=>({id:`mark:${name}`,name,value})),
      levelNodes:ast.levels.map(level=>({id:`level:${level.name}`,...level})),
      routeNode:{id:'route',...ast.route},
      edges:ast.levels.flatMap(level=>level.phrase.map(mark=>({from:`mark:${mark}`,to:`level:${level.name}`,kind:'member'})))
        .concat([{from:`level:${ast.levels.at(-1).name}`,to:'route',kind:'yields'}])
    };
  },
  execute(source, input) {
    const ast=this.parse(source), ir=this.lower(ast), trace=new Trace('Mark-Level Syntax');
    const words=String(input).trim().split(/\s+/);
    const recognized=words.map(word=>Object.entries(ast.marks).find(([,value])=>String(value)===word)?.[0] ?? null);
    need(recognized.every(Boolean), 'MLS_UNRECOGNISED_INPUT', 'Input contains a word with no mark.');
    const level=ast.levels.find(candidate=>candidate.phrase.length && candidate.phrase.join('|')===recognized.join('|'));
    need(level?.yields===ast.route.from, 'MLS_NO_MEANING_ROUTE', 'Recognised marks do not form routed meaning.');
    const state={input,marks:recognized,meaning:level.yields,nextRoute:ast.route.to};
    trace.emit('marks.recognised',{words,recognized});
    trace.emit('level.yielded',{level:level.name,meaning:level.yields});
    trace.emit('route.selected',ast.route);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('raise marks through levels into a route',state)};
  }
};

export const TBSString = {
  parse(source) {
    const strings=blocks(source,'string').map(block=>{
      const data=assignments(block.body);
      const segments=[...block.body.matchAll(/\bsegment\s+([A-Za-z_][\w.-]*)\s*=\s*\[([^\]]*)\]/g)]
        .map(match=>({name:match[1],values:splitTop(match[2]).map(valueOf)}));
      const binds=[...block.body.matchAll(/\bbind\s+(.+?)\s*->\s*([A-Za-z_][\w.-]*)/g)]
        .map(match=>({value:valueOf(match[1]),role:match[2]}));
      const compose=block.body.match(/\bcompose\s+([A-Za-z_][\w.-]*)\s*\+\s*([A-Za-z_][\w.-]*)\s*->\s*([A-Za-z_][\w.-]*)/);
      need(data.source && segments.length && binds.length && compose,'TBS_INVALID_STRING',`TBS.String ${block.name} requires source, segment, bind and compose.`);
      return {type:'TBSStringBody',name:block.name,source:data.source,segments,binds,compose:{left:compose[1],right:compose[2],target:compose[3]}};
    });
    need(strings.length,'TBS_NO_STRINGS','TBS.String requires a string body.');
    return {type:'TBSProgram',strings};
  },
  lower(ast){
    return {
      type:'TBSStringGraphSet',
      graphs:ast.strings.map(body=>({
        type:'TBSStringGraph',
        name:body.name,
        nodes:[{id:'source',value:body.source},...body.binds.map(bind=>({id:`role:${bind.role}`,bind})),{id:`compose:${body.compose.target}`,...body.compose}],
        edges:body.binds.map(bind=>({from:'source',to:`role:${bind.role}`,kind:'bind'}))
          .concat(body.binds.map(bind=>({from:`role:${bind.role}`,to:`compose:${body.compose.target}`,kind:'compose'})))
      }))
    };
  },
  execute(source){
    const ast=this.parse(source), ir=this.lower(ast), trace=new Trace('TBS.String'), body=ast.strings[0];
    const words=String(body.source).split(/\s+/);
    const roles={};
    for(const bind of body.binds){
      need(words.includes(String(bind.value)),'TBS_BIND_MISSING',`Source lacks ${bind.value}.`);
      roles[bind.role]=bind.value;
      trace.emit('role.bound',bind);
    }
    need(roles[body.compose.left]!=null && roles[body.compose.right]!=null,'TBS_COMPOSE_ROLE','Compose roles missing.');
    roles[body.compose.target]=`${roles[body.compose.left]}:${roles[body.compose.right]}`;
    const state={source:body.source,segments:body.segments,roles};
    trace.emit('string.composed',{target:body.compose.target,value:roles[body.compose.target]});
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('segment, bind and compose a living string',state)};
  }
};
