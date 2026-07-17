import { Trace, blocks, compare, getPath, need, setPath } from './native-core.mjs';

export const Cading = {
  parse(source) {
    const raw = String(source ?? '').trim().replace(/\s+/g, ' ');
    need(raw, 'CAD_EMPTY', 'Cading source is empty.');
    need(raw.endsWith('.✓'), 'CAD_FULLSTOP_REQUIRED', 'Cading source requires .✓ Fullstopped completion.');
    const line = raw.slice(0, -2).trim();
    need((line.match(/=/g) ?? []).length === 1, 'CAD_ONE_SPEAKUALS', 'Cading requires one Speakuals landing operator.');
    const [left, landing] = line.split('=').map(part => part.trim());
    need(left && landing, 'CAD_MISSING_SIDE', 'Cading requires source and landing.');
    const variants = left.split(',').map(item => item.trim()).filter(Boolean);
    need(variants.length, 'CAD_NO_VARIANTS', 'Cading requires at least one source variant.');
    const operators = ['Ø','32÷×&','NOTA','{pre}','{post}'].filter(operator => raw.includes(operator));
    return { type: 'CadingProgram', raw, source: left, variants, landing, operators, completion: 'fullstopped' };
  },
  lower(ast) {
    return {
      type: 'CadingRouteGraph',
      nodes: [
        ...ast.variants.map((variant, index) => ({ id: `source:${index}`, kind: 'source', value: variant })),
        { id: 'speakuals', kind: 'operator', value: '=' },
        { id: 'landing', kind: 'landing', value: ast.landing },
        { id: 'completion', kind: 'ding', value: ast.completion }
      ],
      edges: ast.variants.map((_, index) => ({ from: `source:${index}`, to: 'speakuals', kind: 'variant' }))
        .concat([{ from: 'speakuals', to: 'landing', kind: 'land' }, { from: 'landing', to: 'completion', kind: 'complete' }])
    };
  },
  execute(source, state = {}) {
    const ast = this.parse(source);
    const ir = this.lower(ast);
    const runtime = structuredClone(state);
    const trace = new Trace('Cading');
    trace.emit('source.read', { variants: ast.variants, operators: ast.operators });
    runtime.cading = { source: ast.source, landing: ast.landing, completion: ast.completion };
    setPath(runtime, ast.landing, true);
    trace.emit('speakuals.landed', { landing: ast.landing });
    trace.emit('fullstopped', { landing: ast.landing });
    return { ast, ir, state: runtime, trace: trace.events, receipt: trace.receipt('source to Speakuals landing to Fullstopped Ding', runtime) };
  }
};

function qInt(body, name, fallback = null) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*(-?\\d+)`, 'i'));
  return match ? Number(match[1]) : fallback;
}
function qId(body, name, fallback = null) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*([A-Za-z_][\\w.-]*)`, 'i'));
  return match ? match[1] : fallback;
}
function qList(body, name) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*\\[([^\\]]*)\\]`, 'i'));
  return match ? match[1].split(',').map(v => v.trim()).filter(Boolean) : [];
}
function membrane(body) {
  const match = body.match(/\bmembrane\s*:\s*(hard|soft|porous)(?:\s*\(\s*(?:ε|epsilon)?\s*(?:=|:)?\s*(\d+)\s*\))?/i);
  if (!match) return { kind: 'hard' };
  const out = { kind: match[1].toLowerCase() };
  if (match[2] != null) out.epsilon = Number(match[2]);
  need(out.kind === 'hard' || Number.isFinite(out.epsilon), 'QUADZE_EPSILON', `${out.kind} membrane requires epsilon.`);
  return out;
}
export const Quadze = {
  parse(source) {
    const clean = String(source ?? '').replace(/#[^\n]*/g, '').replace(/\/\/[^\n]*/g, '').trim();
    need(clean, 'QUADZE_EMPTY', 'Quadze source is empty.');
    const bodies = blocks(clean, 'body').map(block => ({ type: 'QuaBody', name: block.name, localTime: qInt(block.body,'local_time',0), membrane: membrane(block.body), routes: qList(block.body,'routes') }));
    const routes = blocks(clean, 'route').map(block => ({ type: 'QuaRoute', name: block.name, cost: qInt(block.body,'cost'), apply: qId(block.body,'apply') }));
    const keepers = blocks(clean, 'keeper').map(block => {
      const match = block.body.match(/\brule\s*:\s*allow_if\s+([A-Za-z_][\w.-]*)\.local_time\s*(>=|<=|==|!=|>|<)\s*(-?\d+)/i);
      need(match, 'QUADZE_KEEPER_RULE', `Keeper ${block.name} requires allow_if Body.local_time comparator integer.`);
      return { type: 'QuaKeeper', name: block.name, body: match[1], operator: match[2], value: Number(match[3]) };
    });
    const glyphs = blocks(clean, 'glyph').map(block => {
      const window = block.body.match(/\bwindow\s*:\s*\[\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*\]/i);
      need(window, 'QUADZE_GLYPH_WINDOW', `Glyph ${block.name} requires window.`);
      return { type: 'QuaGlyph', name: block.name, window: [Number(window[1]),Number(window[2])], latency: qInt(block.body,'latency',0), hysteresis: qInt(block.body,'hysteresis',0) };
    });
    const policy = clean.match(/\bpolicy\s+rejected\s*:\s*(dingandreceipt|ding_and_receipt|ding|notick|no_tick)\b/i);
    need(bodies.length && routes.length && policy, 'QUADZE_CORE_REQUIRED', 'Quadze requires bodies, routes and rejected policy.');
    const routeNames = new Set(routes.map(route => route.name));
    routes.forEach(route => { need(Number.isFinite(route.cost), 'QUADZE_ROUTE_COST', `${route.name} requires cost.`); need(route.apply, 'QUADZE_ROUTE_APPLY', `${route.name} requires apply.`); });
    bodies.forEach(body => body.routes.forEach(route => need(routeNames.has(route), 'QUADZE_UNKNOWN_ROUTE', `${body.name} references ${route}.`)));
    return { type: 'QuadzeProgram', bodies, routes, keepers, glyphs, policy: policy[1].toLowerCase().replaceAll('_','') };
  },
  lower(ast) {
    return {
      type: 'QuadzeModeGraph',
      bodyNodes: ast.bodies.map(body => ({ id: `body:${body.name}`, ...body })),
      routeNodes: ast.routes.map(route => ({ id: `route:${route.name}`, ...route })),
      keeperNodes: ast.keepers.map(keeper => ({ id: `keeper:${keeper.name}`, ...keeper })),
      glyphNodes: ast.glyphs.map(glyph => ({ id: `glyph:${glyph.name}`, ...glyph })),
      edges: ast.bodies.flatMap(body => body.routes.map(route => ({ from: `body:${body.name}`, to: `route:${route}`, kind: 'available' }))),
      policy: ast.policy
    };
  },
  execute(source, initial = {}) {
    const ast = this.parse(source);
    const ir = this.lower(ast);
    const state = structuredClone(initial);
    const trace = new Trace('Quadze');
    state.quadze ??= {};
    for (const body of ast.bodies) state.quadze[body.name] = { localTime: body.localTime, membrane: body.membrane.kind, crossed: 0, restored: 0 };
    const actions = {
      increment_state: target => { state.quadze[target].localTime += 1; },
      cross_boundary: target => { state.quadze[target].crossed += 1; },
      restore_state: target => { state.quadze[target].restored += 1; }
    };
    const executions = [];
    for (const body of ast.bodies) {
      for (const routeName of body.routes) {
        const route = ast.routes.find(candidate => candidate.name === routeName);
        need(actions[route.apply], 'QUADZE_UNKNOWN_APPLY', `Unknown Quadze apply ${route.apply}.`);
        actions[route.apply](body.name);
        const execution = { body: body.name, route: route.name, cost: route.cost, apply: route.apply };
        executions.push(execution);
        trace.emit('route.applied', execution);
      }
    }
    const keeperResults = ast.keepers.map(keeper => {
      const current = state.quadze[keeper.body]?.localTime;
      need(current != null, 'QUADZE_KEEPER_BODY', `Unknown keeper body ${keeper.body}.`);
      const passed = compare(current, keeper.operator, keeper.value);
      const result = { keeper: keeper.name, body: keeper.body, current, operator: keeper.operator, value: keeper.value, passed };
      trace.emit('keeper.checked', result);
      return result;
    });
    const result = { state, executions, keeperResults, policy: ast.policy };
    return { ast, ir, ...result, trace: trace.events, receipt: trace.receipt('execute qua-direction body routes and keepers', result) };
  }
};

export const Speakuals = {
  parse(source) {
    const raw = String(source ?? '').trim();
    need(raw.endsWith('.✓'), 'SPK_FULLSTOP_REQUIRED', 'Speakuals requires .✓ completion.');
    const line = raw.slice(0,-2).trim();
    const pieces = line.split('=');
    need(pieces.length === 2, 'SPK_ONE_RELATION', 'Speakuals requires one relation.');
    const [left, landing] = pieces.map(v => v.trim());
    need(left && landing, 'SPK_SIDE_MISSING', 'Speakuals relation sides are required.');
    return { type: 'SpeakualsRelation', raw, left, landing, fullstopped: true };
  },
  lower(ast) {
    return { type: 'SpeakualsLandingGraph', nodes: [{ id:'source', value:ast.left },{ id:'landing', value:ast.landing },{ id:'ding', value:'fullstopped' }], edges:[{from:'source',to:'landing',kind:'equals'},{from:'landing',to:'ding',kind:'complete'}] };
  },
  execute(source, state = {}) {
    const ast = this.parse(source), ir = this.lower(ast), runtime = structuredClone(state), trace = new Trace('Speakuals');
    setPath(runtime, ast.landing, getPath(runtime, ast.left) ?? ast.left);
    trace.emit('relation.landed', { left: ast.left, landing: ast.landing });
    return { ast, ir, state: runtime, trace: trace.events, receipt: trace.receipt('land a source relation without losing either side', runtime) };
  }
};
