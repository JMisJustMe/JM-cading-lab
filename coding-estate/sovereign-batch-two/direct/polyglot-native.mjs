import { Trace, applyAction, blocks, digest, evaluate, getPath, lines, need, parseAction, parseExpr, setPath, stable, valueOf } from './native-core.mjs';

export const PolyglotBridge = {
  parse(source) {
    const bridges = blocks(source, 'bridge').map(block => {
      let from = null;
      let to = null;
      let preserve = null;
      let mismatch = 'rollback';
      const maps = [];
      for (const line of lines(block.body)) {
        const sourceLine = line.match(/^from\s+([A-Za-z_][\w.-]*)$/); if (sourceLine) { from = sourceLine[1]; continue; }
        const targetLine = line.match(/^to\s+([A-Za-z_][\w.-]*)$/); if (targetLine) { to = targetLine[1]; continue; }
        const map = line.match(/^map\s+source\.([A-Za-z_][\w.]*)\s*->\s*target\.([A-Za-z_][\w.]*)$/); if (map) { maps.push({ source: map[1], target: map[2] }); continue; }
        const p = line.match(/^preserve\s+(identity|meaning|state)$/); if (p) { preserve = p[1]; continue; }
        const m = line.match(/^onMismatch\s+(rollback|reject|hold)$/); if (m) mismatch = m[1];
      }
      need(from && to && maps.length && preserve, 'BRIDGE_INCOMPLETE', `Polyglot Bridge ${block.name} requires from, to, map and preserve.`);
      return { type: 'PolyglotBridgeContract', name: block.name, from, to, maps, preserve, mismatch };
    });
    need(bridges.length > 0, 'BRIDGE_NO_CONTRACTS', 'Polyglot Bridge requires a bridge contract.');
    return { type: 'PolyglotBridgeProgram', bridges };
  },
  lower(program) {
    return {
      type: 'PolyglotContractGraphSet',
      graphs: program.bridges.map(bridge => ({
        type: 'BridgeContractGraph', name: bridge.name, sourceIdentity: bridge.from, targetIdentity: bridge.to,
        nodes: bridge.maps.flatMap((map, index) => [{ id: `${bridge.name}:source:${index}`, side: 'source', path: map.source }, { id: `${bridge.name}:target:${index}`, side: 'target', path: map.target }]),
        edges: bridge.maps.map((map, index) => ({ from: `${bridge.name}:source:${index}`, to: `${bridge.name}:target:${index}`, kind: 'identity-preserving-map' })),
        preserve: bridge.preserve, mismatch: bridge.mismatch
      }))
    };
  },
  transfer(program, bridgeName, sourceInput = {}, targetInput = {}) {
    const bridge = program.bridges.find(item => item.name === bridgeName);
    need(bridge, 'BRIDGE_UNKNOWN_CONTRACT', `Unknown Polyglot Bridge ${bridgeName}.`);
    const source = structuredClone(sourceInput);
    const target = structuredClone(targetInput);
    const original = structuredClone(targetInput);
    const trace = new Trace('Polyglot Bridge');
    const missing = [];
    for (const map of bridge.maps) {
      const value = getPath(source, map.source);
      if (value === undefined) { missing.push(map); continue; }
      setPath(target, map.target, structuredClone(value));
      trace.emit('mapping.applied', { bridge: bridge.name, map, valueDigest: digest(value) });
    }
    if (missing.length) {
      trace.emit('mapping.mismatch', { bridge: bridge.name, missing, policy: bridge.mismatch });
      if (bridge.mismatch === 'rollback') return { type: 'BridgeResult', bridge: bridge.name, status: 'rolled-back', sourceIdentity: bridge.from, targetIdentity: bridge.to, source, target: original, missing, trace: trace.events, receipt: trace.receipt('rollback incomplete identity bridge', missing) };
      if (bridge.mismatch === 'reject') need(false, 'BRIDGE_MISSING_SOURCE', `Polyglot Bridge ${bridge.name} is missing source values.`, { missing });
      return { type: 'BridgeResult', bridge: bridge.name, status: 'held', sourceIdentity: bridge.from, targetIdentity: bridge.to, source, target, missing, trace: trace.events, receipt: trace.receipt('hold incomplete identity bridge', missing) };
    }
    const result = { type: 'BridgeResult', bridge: bridge.name, status: 'transferred', sourceIdentity: bridge.from, targetIdentity: bridge.to, preserved: bridge.preserve, source, target, missing: [] };
    trace.emit('bridge.completed', { bridge: bridge.name, sourceIdentity: bridge.from, targetIdentity: bridge.to, targetDigest: digest(target) });
    return { ...result, trace: trace.events, receipt: trace.receipt('transfer without identity collapse', result) };
  },
  execute(source, bridgeName, sourceInput = {}, targetInput = {}) {
    const ast = this.parse(source);
    return { ast, ir: this.lower(ast), runtime: this.transfer(ast, bridgeName ?? ast.bridges[0].name, sourceInput, targetInput) };
  }
};
