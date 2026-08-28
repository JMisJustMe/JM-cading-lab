/* CodeHand RouteOS — authorised forward descendant. Historical dedicated source remains open. */
import { fnv1a, stableStringify } from '../../compiler-core.mjs';

export const CODEHAND_BRIDGE = Object.freeze({
  status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE',
  historicalRecoveryClaim: false,
  law: 'Authoring hand, arena, world, operators, console and Cold Ding remain connected.',
  model: 'identity-preserving mounted body plugins'
});

export class CodeHandError extends Error {
  constructor(code, message) { super(message); this.name = 'CodeHandError'; this.code = code; }
}
function need(ok, code, message) { if (!ok) throw new CodeHandError(code, message); }
function getPath(value, path) { return String(path).split('.').filter(Boolean).reduce((v, key) => v == null ? undefined : v[key], value); }

export function parseCodeHand(source) {
  need(typeof source === 'string' && source.trim(), 'CODEHAND_EMPTY_SOURCE', 'CodeHand source is empty.');
  const match = source.match(/\bcodehand\s+([A-Za-z_][\w.-]*)\s*\{([\s\S]*)\}\s*$/);
  need(match, 'CODEHAND_BODY_REQUIRED', 'CodeHand requires codehand NAME { ... }.');
  let arena = null;
  let world = null;
  const mounts = [];
  const commands = [];
  const unknown = [];
  for (const raw of match[2].replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s*(?:#|\/\/).*$/, '').trim();
    if (!line) continue;
    let m = line.match(/^arena\s+([A-Za-z_][\w.-]*)$/);
    if (m) { arena = m[1]; continue; }
    m = line.match(/^world\s+([A-Za-z_][\w.-]*)$/);
    if (m) { world = m[1]; continue; }
    m = line.match(/^mount\s+([A-Za-z_][\w.-]*)\s+([a-z0-9][a-z0-9.-]*)$/);
    if (m) { mounts.push({ type: 'CodeHandMount', alias: m[1], bodyId: m[2] }); continue; }
    m = line.match(/^run\s+([A-Za-z_][\w.-]*)(?:\s+([A-Za-z_][\w.-]*))?$/);
    if (m) { commands.push({ type: 'run', alias: m[1], entry: m[2] ?? null }); continue; }
    m = line.match(/^inspect\s+([A-Za-z_][\w.-]*)\s+([A-Za-z_][\w.\[\]-]*)$/);
    if (m) { commands.push({ type: 'inspect', alias: m[1], path: m[2] }); continue; }
    m = line.match(/^console\s+("(?:\\.|[^"\\])*")$/);
    if (m) { commands.push({ type: 'console', value: JSON.parse(m[1]) }); continue; }
    m = line.match(/^cold-ding\s+("(?:\\.|[^"\\])*")$/);
    if (m) { commands.push({ type: 'cold-ding', value: JSON.parse(m[1]) }); continue; }
    unknown.push(line);
  }
  need(unknown.length === 0, 'CODEHAND_UNKNOWN_DECLARATION', 'CodeHand contains unknown declarations.');
  need(arena && world, 'CODEHAND_ARENA_WORLD_REQUIRED', 'CodeHand requires arena and world.');
  need(mounts.length > 0, 'CODEHAND_MOUNT_REQUIRED', 'CodeHand requires at least one mounted body.');
  need(commands.some(command => command.type === 'cold-ding'), 'CODEHAND_COLD_DING_REQUIRED', 'CodeHand requires an explicit cold-ding command.');
  const aliases = new Set();
  for (const mount of mounts) { need(!aliases.has(mount.alias), 'CODEHAND_DUPLICATE_ALIAS', `Duplicate mount alias ${mount.alias}.`); aliases.add(mount.alias); }
  for (const command of commands.filter(command => ['run','inspect'].includes(command.type))) need(aliases.has(command.alias), 'CODEHAND_UNKNOWN_ALIAS', `Unknown mounted alias ${command.alias}.`);
  return { type: 'CodeHandProgram', name: match[1], arena, world, mounts, commands, bridge: CODEHAND_BRIDGE };
}

export function lowerCodeHand(program) {
  need(program?.type === 'CodeHandProgram', 'CODEHAND_BAD_PROGRAM', 'CodeHand lowering requires CodeHandProgram.');
  return {
    type: 'CodeHandSessionIR',
    schema: 'jm.codehand.session-ir/1.0',
    session: program.name,
    arena: program.arena,
    world: program.world,
    mountNodes: program.mounts.map((mount, index) => ({ id: `mount:${index}:${mount.alias}`, ...mount })),
    commandNodes: program.commands.map((command, index) => ({ id: `command:${index}`, ...command })),
    bridge: CODEHAND_BRIDGE
  };
}

export function runCodeHand(program, plugins = {}, inputs = {}) {
  const ir = lowerCodeHand(program);
  const results = new Map();
  const console = [];
  const trace = [];
  let coldDing = null;
  const mounts = new Map(program.mounts.map(mount => [mount.alias, mount]));
  for (const mount of program.mounts) need(typeof plugins[mount.bodyId] === 'function', 'CODEHAND_PLUGIN_MISSING', `No body plugin for ${mount.bodyId}.`);

  for (const command of program.commands) {
    if (command.type === 'run') {
      const mount = mounts.get(command.alias);
      const prior = results.get(command.alias) ?? null;
      const result = plugins[mount.bodyId]({ entry: command.entry, input: structuredClone(inputs[command.alias] ?? {}), prior });
      results.set(command.alias, result);
      trace.push({ type: 'body.run', alias: command.alias, bodyId: mount.bodyId, entry: command.entry, resultDigest: fnv1a(result) });
    } else if (command.type === 'inspect') {
      const value = getPath(results.get(command.alias), command.path);
      need(value !== undefined, 'CODEHAND_INSPECT_MISSING', `Inspection path ${command.alias}.${command.path} does not exist.`);
      const record = { alias: command.alias, path: command.path, value: structuredClone(value) };
      console.push(record);
      trace.push({ type: 'body.inspect', ...record });
    } else if (command.type === 'console') {
      console.push({ message: command.value });
      trace.push({ type: 'console', value: command.value });
    } else if (command.type === 'cold-ding') {
      coldDing = { value: command.value, traceDigest: fnv1a(trace), mountedBodies: program.mounts.map(mount => ({ alias: mount.alias, bodyId: mount.bodyId })) };
      trace.push({ type: 'cold-ding', value: command.value });
    }
  }

  const output = {
    type: 'CodeHandSessionResult',
    session: program.name,
    arena: program.arena,
    world: program.world,
    results: Object.fromEntries(results),
    console,
    trace,
    coldDing,
    bridge: CODEHAND_BRIDGE
  };
  output.receipt = { schema: 'jm.codehand.receipt/1.0', body: 'CodeHand RouteOS', session: program.name, coldDing: Boolean(coldDing), resultDigest: fnv1a(stableStringify(output.results)), traceDigest: fnv1a(trace) };
  return { ast: program, ir, runtime: output };
}

export function executeCodeHand(source, plugins = {}, inputs = {}) {
  return runCodeHand(parseCodeHand(source), plugins, inputs);
}
