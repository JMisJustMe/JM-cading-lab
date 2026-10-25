import test from 'node:test';
import assert from 'node:assert/strict';
import { JMMeshCompiler } from '../engine/gamecore/JMMeshCompiler.js';
import { JMPlayZoneAdapter } from '../engine/playzone/JMPlayZoneAdapter.js';

// Representative topology only; not the source from the owner's Fold screenshot.
const coords = Array.from({ length: 7 }, (_, i) => {
  const a = i * Math.PI * 2 / 7;
  return 'v ' + Math.cos(a).toFixed(6) + ' -0.8 ' + Math.sin(a).toFixed(6);
}).join('\n');
const faces = Array.from({ length: 7 }, (_, i) => {
  const next = (i + 1) % 7;
  return 'f 7 ' + i + ' ' + next + '\nf 8 ' + next + ' ' + i;
}).join('\n');
const src = 'mesh GolemCore {\n' + coords + '\nv 0 1 0\nv 0 -0.8 0\n' +
  faces + '\ncolor #38bdf8\ndeform wave amp=0.15 freq=2\n}';

class Attribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.needsUpdate = false; }
  setUsage(value) { this.usage = value; return this; }
  setXYZ(i, x, y, z) { this.array.set([x, y, z], i * 3); }
  copyArray(array) { this.array.set(array); }
}
class Geometry {
  constructor() { this.attributes = {}; this.counts = { normals: 0, sphere: 0, box: 0 }; this.disposed = false; }
  setAttribute(key, value) { this.attributes[key] = value; }
  setIndex(value) { this.index = value; }
  getAttribute(key) { return this.attributes[key]; }
  computeVertexNormals() { this.counts.normals++; }
  computeBoundingSphere() { this.counts.sphere++; }
  computeBoundingBox() { this.counts.box++; }
  dispose() { this.disposed = true; }
}
class Material { constructor(options) { this.options = options; this.disposed = false; } dispose() { this.disposed = true; } }
class Mesh { constructor(geometry, material) { this.geometry = geometry; this.material = material; this.parent = null; } }
const THREE = { BufferGeometry: Geometry, BufferAttribute: Attribute,
  MeshStandardMaterial: Material, Mesh, DynamicDrawUsage: 'dynamic', DoubleSide: 'double' };

test('9-vertex, 14-triangle CP10 representative fixture', () => {
  const ir = JMMeshCompiler.compile(src);
  assert.equal(ir.vertexBuffer.length, 27);
  assert.equal(ir.indexBuffer.length, 42);
  assert.equal(ir.color, 0x38bdf8);
  assert.deepEqual(ir.deform, { type: 'wave', amp: 0.15, freq: 2 });
  assert.ok(ir.vertexBuffer instanceof Float32Array);
  assert.ok(ir.indexBuffer instanceof Uint16Array);
});

test('zero coordinates, zero-based faces and black color are valid', () => {
  const ir = JMMeshCompiler.compile('mesh Zero {\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\ncolor #000000\ndeform none\n}');
  assert.equal(ir.color, 0);
  assert.equal(ir.indexBuffer[0], 0);
});

for (const code of [
  '',
  'v x 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 3',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 0 2',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf -1 1 2',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\ncolor #BAD',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\ndeform boom',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\ndeform pulse freq=nan'
]) {
  test('reject malformed authored source ' + code.slice(0, 20), () => {
    assert.throws(() => JMMeshCompiler.compile(code));
  });
}

test('PlayZone owns copies, deforms and resets, maintains bounds, replaces old mesh', () => {
  const ir = JMMeshCompiler.compile(src);
  const adapter = new JMPlayZoneAdapter(THREE);
  const first = adapter.createMesh(ir);
  assert.equal(first.geometry.getAttribute('position').array.length, 27);
  assert.equal(first.geometry.index.array.length, 42);
  assert.equal(first.geometry.getAttribute('position').usage, 'dynamic');
  const original = new Float32Array(ir.vertexBuffer);
  assert.equal(adapter.update(0.5), true);
  assert.notDeepEqual(Array.from(first.geometry.getAttribute('position').array), Array.from(original));
  assert.deepEqual(Array.from(ir.vertexBuffer), Array.from(original));
  assert.equal(first.geometry.counts.normals, 2);
  assert.equal(first.geometry.counts.sphere, 2);
  adapter.setDeformEnabled(false);
  assert.equal(adapter.update(0.6), false);
  assert.deepEqual(Array.from(first.geometry.getAttribute('position').array), Array.from(original));
  adapter.setDeformEnabled(true);
  assert.equal(adapter.update(0.6), true);
  first.parent = { remove(mesh) { assert.equal(mesh, first); this.removed = true; } };
  const second = adapter.createMesh(ir);
  assert.ok(first.geometry.disposed && first.material.disposed && first.parent.removed);
  adapter.dispose();
  assert.ok(second.geometry.disposed && second.material.disposed);
  assert.equal(adapter.currentMesh, null);
});

test('pulse update and material configuration', () => {
  const ir = JMMeshCompiler.compile(src.replace('deform wave', 'deform pulse'));
  const adapter = new JMPlayZoneAdapter(THREE);
  const mesh = adapter.createMesh(ir);
  adapter.update(Math.PI / 4);
  assert.ok(Math.abs(mesh.geometry.attributes.position.array[0] - ir.vertexBuffer[0] * 1.15) < 1e-6);
  assert.equal(mesh.material.options.color, 0x38bdf8);
  assert.throws(() => adapter.update(NaN));
});

test('reject invalid IR and missing Three.js dependency', () => {
  const adapter = new JMPlayZoneAdapter(THREE);
  assert.throws(() => adapter.createMesh({ vertexBuffer: [0], indexBuffer: [0] }));
  assert.throws(() => new JMPlayZoneAdapter(null), /Three\.js/);
});
