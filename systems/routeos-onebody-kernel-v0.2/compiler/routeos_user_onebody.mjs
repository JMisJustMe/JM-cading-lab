import crypto from 'node:crypto';
import { parseCading } from './donor/cading.mjs';

export const REQUIRED_KERNEL_BODIES = [
  'Cading', 'Kading', 'JMLogic', 'FlowTalk', 'RouteCode', 'Quadze',
  'OneBody IR', 'CadenVM', 'CodeHand', 'RouteOS', 'RouteCore Native',
  'TraceBox', 'THEO', 'Build Gates', 'Zionfolder'
];

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function normal(value) {
  return String(value).trim().replace(/\s*\/\s*/g, '/');
}

function parseEmit(value, line) {
  const parts = value.trim().split(/\s+/);
  const op = parts.shift()?.toUpperCase();
  if (op === 'TRACE_READ') return { op: 'syscall', name: 'TRACE_READ', number: 1 };
  if (op === 'ROUTE_STATE') {
    const state = Number(parts[0]);
    if (!Number.isInteger(state) || state < 0) throw new Error(`Invalid ROUTE_STATE at ${line}`);
    return { op: 'syscall', name: 'ROUTE_STATE', number: 3, argument: state };
  }
  if (op === 'YIELD') return { op: 'syscall', name: 'YIELD', number: 2 };
  throw new Error(`Unsupported kernel-user emit at ${line}: ${value}`);
}

export function compileKernelUserOneBody(source, filename = '<memory>') {
  const model = parseCading(source, filename);
  const present = new Set(model.bodies.map(normal));
  const missing = REQUIRED_KERNEL_BODIES.filter((body) => !present.has(body));
  if (missing.length) throw new Error(`Source Gate HOLD: missing kernel bodies: ${missing.join(', ')}`);

  const run = model.functions.find((fn) => fn.name === 'run');
  if (!run) throw new Error('Source Gate HOLD: func run is required');

  const program = [];
  const expectations = [];
  let loops = false;
  for (const instruction of run.instructions) {
    if (instruction.kind === 'emit') program.push(parseEmit(instruction.value, filename));
    else if (instruction.kind === 'expect') expectations.push(instruction.value);
    else if (instruction.kind === 'return' && instruction.value.trim().toUpperCase() === 'LOOP') loops = true;
    else throw new Error(`Unsupported run instruction: ${instruction.kind} ${instruction.value}`);
  }

  if (!program.some((op) => op.name === 'TRACE_READ')) throw new Error('Gate HOLD: TRACE_READ missing');
  if (!program.some((op) => op.name === 'ROUTE_STATE')) throw new Error('Gate HOLD: ROUTE_STATE missing');
  if (!program.some((op) => op.name === 'YIELD')) throw new Error('Gate HOLD: YIELD missing');
  if (!loops) throw new Error('Gate HOLD: bounded proof body must return LOOP');

  return {
    schema: 'jm.onebody.routeos-user/v1',
    compiler: {
      frontend: 'JM Android Forge v1.1 Cading parser',
      ir: 'OneBody IR',
      lowering: 'RouteOS Native User ABI v0.2',
      target: 'x86_64 CPL3 GAS assembly'
    },
    identity: {
      module: model.module,
      family: model.family,
      owner: model.owner,
      version: model.version,
      bodyId: 1
    },
    bodies: model.bodies,
    abi: {
      architecture: 'x86_64',
      privilege: 'CPL3',
      entry: 'routeos_user1_blob_start',
      gate: 'int 0x80',
      syscalls: { TRACE_READ: 1, YIELD: 2, ROUTE_STATE: 3 },
      bodyIdentityRegister: 'r12',
      argumentRegister: 'rdi',
      returnRegister: 'rax'
    },
    program,
    expectations,
    control: { loop: true },
    routes: model.routes,
    maps: model.maps,
    declarations: model.declarations,
    provenance: {
      source: filename.split('/').pop(),
      sourceSha256: sha256Text(source),
      authority: 'Theodore Benjamin Scott / JM / JMISJUSTME; AI-assisted lowering'
    }
  };
}
