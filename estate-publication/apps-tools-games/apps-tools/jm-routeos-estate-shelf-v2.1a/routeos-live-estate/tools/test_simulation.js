'use strict';

const assert = require('node:assert/strict');
const {
  GRID, ANCHOR, CROWNS, HAZARD_KEYS, WALL_KEYS, keyOf, Simulation
} = require('../app/src/main/assets/core.js');

function pathBetween(start, target) {
  const queue = [{ point: start, path: [] }];
  const seen = new Set([keyOf(start.x, start.y)]);
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length) {
    const current = queue.shift();
    if (current.point.x === target.x && current.point.y === target.y) return current.path;
    for (const [dx, dy] of steps) {
      const next = { x: current.point.x + dx, y: current.point.y + dy };
      const key = keyOf(next.x, next.y);
      if (next.x < 0 || next.y < 0 || next.x >= GRID.cols || next.y >= GRID.rows) continue;
      if (seen.has(key) || HAZARD_KEYS.has(key) || WALL_KEYS.has(key)) continue;
      seen.add(key);
      queue.push({ point: next, path: [...current.path, [dx, dy]] });
    }
  }
  throw new Error(`No safe path from ${keyOf(start.x, start.y)} to ${keyOf(target.x, target.y)}`);
}

function moveSafely(sim, target) {
  const path = pathBetween(sim.player, target);
  path.forEach(([dx, dy]) => sim.move(dx, dy));
}

assert.equal(CROWNS.length, 5, 'the cartridge must expose exactly five crowns');
assert.deepEqual(CROWNS.map(c => c.name), [
  'PrimitiveRoute',
  'DispatchRoute',
  'EntryRoute',
  'KernelContractRoute',
  'OrchestrationRoute'
]);

const orderProbe = new Simulation();
orderProbe.player = { x: 4, y: 6 };
orderProbe.move(0, -1);
assert.equal(orderProbe.collected.length, 0, 'future crowns must not mount out of order');
assert.match(orderProbe.message, /earlier route/i);

const faultProbe = new Simulation();
moveSafely(faultProbe, CROWNS[0]);
assert.equal(faultProbe.collected.length, 1);
const checkpoint = { ...faultProbe.checkpoint };
faultProbe.move(1, 0);
assert.equal(faultProbe.faults, 1, 'fault must be counted');
assert.equal(faultProbe.recoveries, 1, 'recovery must be counted');
assert.deepEqual(faultProbe.player, checkpoint, 'FaultHold must return to the last mounted crown');
assert.deepEqual(faultProbe.collected, ['primitive'], 'recovery must preserve mounted progress');

const fullRoute = new Simulation();
for (let index = 0; index < CROWNS.length; index += 1) {
  moveSafely(fullRoute, CROWNS[index]);
  assert.equal(fullRoute.collected.length, index + 1, `${CROWNS[index].name} should mount in order`);
  assert.equal(fullRoute.collected[index], CROWNS[index].id);
}
moveSafely(fullRoute, ANCHOR);
assert.equal(fullRoute.won, true, 'anchor should lock the completed five-crown route');
assert.match(fullRoute.message, /mounted, frozen, locked and anchored/i);
assert.equal(fullRoute.trace.at(-1), 'DING · permanent anchor verified');

const saved = fullRoute.snapshot();
const restored = new Simulation();
assert.equal(restored.restore(saved), true, 'valid saved state should restore');
assert.deepEqual(restored.collected, fullRoute.collected);
assert.equal(restored.won, true);

console.log('RouteOS Five Crowns simulation: PASS');
console.log(JSON.stringify({ moves: fullRoute.moves, crowns: fullRoute.collected, anchor: fullRoute.won }));
