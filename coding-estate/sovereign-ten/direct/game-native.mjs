import { Trace, applyAction, blocks, digest, evaluate, need, parseAction, parseExpr, stable, valueOf } from './native-core.mjs';

function listOf(body, field) {
  const match = body.match(new RegExp(`\\b${field}\\s*=\\s*\\[([^\\]]*)\\]`));
  return match ? match[1].split(',').map(item => valueOf(item)).filter(Boolean) : [];
}

function fieldsOf(body, excluded = []) {
  const fields = {};
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
    if (match && !excluded.includes(match[1])) fields[match[1]] = valueOf(match[2]);
  }
  return fields;
}

function stateName(name) { return name[0].toLowerCase() + name.slice(1); }

export const GameCoding = {
  parse(source) {
    const entities = blocks(source, 'entity').map(block => ({ type: 'GCEntity', name: block.name, fields: fieldsOf(block.body) }));
    const mechanics = blocks(source, 'mechanic').map(block => {
      const requires = block.body.match(/\brequires\s+([^\n]+)/);
      const effect = block.body.match(/\beffect\s+([^\n]+)/);
      need(requires && effect, 'GC_INVALID_MECHANIC', `Game-CODING mechanic ${block.name} requires requires and effect.`);
      return { type: 'GCMechanic', name: block.name, requires: parseExpr(requires[1]), effect: parseAction(effect[1]) };
    });
    const collisions = blocks(source, 'collision').map(block => {
      const when = block.body.match(/\bwhen\s+([^\n]+)/);
      const trigger = block.body.match(/\bthen\s+trigger\s+([A-Za-z_][\w.-]*)/);
      need(when && trigger, 'GC_INVALID_COLLISION', `Game-CODING collision ${block.name} requires when and trigger.`);
      return { type: 'GCCollision', name: block.name, condition: parseExpr(when[1]), trigger: trigger[1] };
    });
    const combos = blocks(source, 'combo').map(block => ({ type: 'GCCombo', name: block.name, steps: listOf(block.body, 'steps') }));
    const updates = blocks(source, 'update').map(block => {
      const every = block.body.match(/\bevery\s+(\d+)\s+frames/);
      const action = block.body.match(/\bdo\s+([^\n]+)/);
      need(every && action, 'GC_INVALID_UPDATE', `Game-CODING update ${block.name} requires every and do.`);
      return { type: 'GCUpdate', name: block.name, intervalFrames: Number(every[1]), effect: parseAction(action[1]) };
    });
    need(entities.length && mechanics.length, 'GC_MISSING_CORE', 'Game-CODING requires entities and mechanics.');
    const names = new Set(mechanics.map(mechanic => mechanic.name));
    for (const collision of collisions) need(names.has(collision.trigger), 'GC_UNKNOWN_MECHANIC', `Collision ${collision.name} targets unknown mechanic ${collision.trigger}.`);
    for (const combo of combos) combo.steps.forEach(step => need(names.has(step), 'GC_UNKNOWN_COMBO_STEP', `Combo ${combo.name} targets unknown mechanic ${step}.`));
    return { type: 'GCProgram', entities, mechanics, collisions, combos, updates };
  },

  lower(program) {
    const entityNodes = program.entities.map(entity => ({ id: `entity:${entity.name}`, ...entity }));
    const mechanicNodes = program.mechanics.map(mechanic => ({ id: `mechanic:${mechanic.name}`, ...mechanic }));
    const collisionNodes = program.collisions.map(collision => ({ id: `collision:${collision.name}`, ...collision }));
    const comboNodes = program.combos.map(combo => ({ id: `combo:${combo.name}`, ...combo }));
    const updateNodes = program.updates.map(update => ({ id: `update:${update.name}`, ...update }));
    const edges = [
      ...program.collisions.map(collision => ({ from: `collision:${collision.name}`, to: `mechanic:${collision.trigger}`, kind: 'collision' })),
      ...program.combos.flatMap(combo => combo.steps.map(step => ({ from: `combo:${combo.name}`, to: `mechanic:${step}`, kind: 'combo' })))
    ];
    return { type: 'GCMechanicsGraph', entityNodes, mechanicNodes, collisionNodes, comboNodes, updateNodes, edges };
  }
};

export class GameCodingRuntime {
  constructor(program, initialState = {}, services = {}) {
    this.program = program;
    this.services = services;
    this.trace = new Trace('Game-CODING');
    this.state = structuredClone(initialState);
    for (const entity of program.entities) this.state[stateName(entity.name)] = { ...entity.fields, ...(this.state[stateName(entity.name)] ?? {}) };
    this.frame = 0;
  }
  trigger(name) {
    const mechanic = this.program.mechanics.find(candidate => candidate.name === name);
    need(mechanic, 'GC_UNKNOWN_MECHANIC', `Unknown Game-CODING mechanic ${name}.`);
    const permitted = evaluate(mechanic.requires, this.state, this.services);
    this.trace.emit('mechanic.checked', { name, permitted });
    if (!permitted) return { name, applied: false, stateDigest: digest(this.state) };
    applyAction(mechanic.effect, this.state, this.services, this.trace);
    this.trace.emit('mechanic.applied', { name, stateDigest: digest(this.state) });
    return { name, applied: true, stateDigest: digest(this.state) };
  }
  collide() {
    const outcomes = [];
    for (const collision of this.program.collisions) {
      const matched = evaluate(collision.condition, this.state, this.services);
      this.trace.emit('collision.checked', { name: collision.name, matched });
      if (matched) outcomes.push(this.trigger(collision.trigger));
    }
    return outcomes;
  }
  combo(name) {
    const combo = this.program.combos.find(candidate => candidate.name === name);
    need(combo, 'GC_UNKNOWN_COMBO', `Unknown Game-CODING combo ${name}.`);
    const outcomes = combo.steps.map(step => this.trigger(step));
    this.trace.emit('combo.completed', { name, outcomes });
    return outcomes;
  }
  simulateFrame() {
    this.frame += 1;
    for (const update of this.program.updates) {
      if (this.frame % update.intervalFrames === 0) {
        applyAction(update.effect, this.state, this.services, this.trace);
        this.trace.emit('update.applied', { name: update.name, frame: this.frame });
      }
    }
    return structuredClone(this.state);
  }
  result() {
    return { type: 'GCRuntimeResult', frame: this.frame, state: structuredClone(this.state), trace: this.trace.events, receipt: this.trace.receipt('execute native game mechanics', this.state) };
  }
}

export const JMGameCore = {
  parse(source) {
    const organs = blocks(source, 'organ').map(block => {
      const invariantMatch = block.body.match(/\binvariants\s*=\s*\{([\s\S]*?)\}/);
      const invariants = invariantMatch ? invariantMatch[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(parseExpr) : [];
      return { type: 'JMGOrgan', name: block.name, handles: listOf(block.body, 'handles'), rules: listOf(block.body, 'rules'), invariants };
    });
    const systems = blocks(source, 'system').map(block => {
      const identity = block.body.match(/\bidentity\s*=\s*(.+)/);
      need(identity, 'JMG_MISSING_IDENTITY', `JM GameCore system ${block.name} requires identity.`);
      return { type: 'JMGSystem', name: block.name, organs: listOf(block.body, 'organs'), events: listOf(block.body, 'events'), identity: valueOf(identity[1]) };
    });
    need(organs.length && systems.length, 'JMG_MISSING_CORE', 'JM GameCore requires organs and systems.');
    const organNames = new Set(organs.map(organ => organ.name));
    systems.forEach(system => system.organs.forEach(organ => need(organNames.has(organ), 'JMG_UNKNOWN_ORGAN', `System ${system.name} references unknown organ ${organ}.`)));
    return { type: 'JMGProgram', organs, systems };
  },

  lower(program) {
    return {
      type: 'JMGGameCoreGraph',
      organNodes: program.organs.map(organ => ({ id: `organ:${organ.name}`, ...organ })),
      systemNodes: program.systems.map(system => ({ id: `system:${system.name}`, ...system })),
      edges: program.systems.flatMap(system => system.organs.map(organ => ({ from: `system:${system.name}`, to: `organ:${organ}`, kind: 'organ' })))
    };
  }
};

export class JMGameCoreRuntime {
  constructor(program, gameRuntime) {
    this.program = program;
    this.game = gameRuntime;
    this.trace = new Trace('JM GameCore');
  }
  checkInvariants(organ) {
    const checks = organ.invariants.map(expression => ({ expression, passed: evaluate(expression, this.game.state, this.game.services) }));
    checks.forEach(check => need(check.passed, 'JMG_INVARIANT_FAILED', `Invariant failed in organ ${organ.name}.`, check));
    this.trace.emit('invariants.checked', { organ: organ.name, checks });
    return checks;
  }
  dispatch(systemName, eventName) {
    const system = this.program.systems.find(candidate => candidate.name === systemName);
    need(system, 'JMG_UNKNOWN_SYSTEM', `Unknown JM GameCore system ${systemName}.`);
    need(system.events.includes(eventName), 'JMG_UNHANDLED_EVENT', `System ${systemName} does not handle ${eventName}.`);
    const executions = [];
    for (const organName of system.organs) {
      const organ = this.program.organs.find(candidate => candidate.name === organName);
      this.trace.emit('organ.dispatched', { system: system.name, identity: system.identity, organ: organ.name, event: eventName });
      for (const rule of organ.rules) executions.push(this.game.trigger(rule));
      this.checkInvariants(organ);
    }
    const result = { type: 'JMGDispatchResult', system: system.name, identity: system.identity, event: eventName, executions, state: structuredClone(this.game.state) };
    this.trace.emit('system.completed', { system: system.name, identity: system.identity, stateDigest: digest(result.state) });
    return { ...result, trace: this.trace.events, receipt: this.trace.receipt('dispatch event without identity collapse', result) };
  }
}

export function gameChain(gameSource, coreSource, initialState = {}, services = {}) {
  const gameAst = GameCoding.parse(gameSource);
  const gameIr = GameCoding.lower(gameAst);
  const gameRuntime = new GameCodingRuntime(gameAst, initialState, services);
  const coreAst = JMGameCore.parse(coreSource);
  const coreIr = JMGameCore.lower(coreAst);
  const coreRuntime = new JMGameCoreRuntime(coreAst, gameRuntime);
  const dispatch = coreRuntime.dispatch(coreAst.systems[0].name, coreAst.systems[0].events[0]);
  return { gameAst, gameIr, coreAst, coreIr, dispatch, game: gameRuntime.result(), digest: digest(stable({ dispatch, state: gameRuntime.state })) };
}
