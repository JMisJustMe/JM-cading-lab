import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { JMMeshCompiler } from '../engine/gamecore/JMMeshCompiler.js';
import { JMPlayZoneAdapter } from '../engine/playzone/JMPlayZoneAdapter.js';

const source = [
  'mesh ContactCore {',
  'v -1 0 -1', 'v 1 0 -1', 'v 1 0 1', 'v -1 0 1',
  'v 0 1.5 0', 'v 0 -1 0',
  'f 0 1 4', 'f 1 2 4', 'f 2 3 4', 'f 3 0 4',
  'f 1 0 5', 'f 2 1 5', 'f 3 2 5', 'f 0 3 5',
  'color #38bdf8', 'deform wave amp=0.28 freq=2.2', '}'
].join('\n');

test('REAL Three.js BufferGeometry, typed indices, bounds, normals, material', () => {
  const ir = JMMeshCompiler.compile(source);
  const adapter = new JMPlayZoneAdapter(THREE);
  const mesh = adapter.createMesh(ir);
  assert.ok(mesh instanceof THREE.Mesh);
  assert.ok(mesh.geometry instanceof THREE.BufferGeometry);
  assert.ok(mesh.material instanceof THREE.MeshStandardMaterial);
  assert.equal(mesh.geometry.getAttribute('position').count, 6);
  assert.equal(mesh.geometry.getIndex().count, 24);
  assert.equal(mesh.material.side, THREE.DoubleSide);
  assert.equal(mesh.material.color.getHex(), 0x38bdf8);
  assert.ok(mesh.geometry.getAttribute('normal').count === 6);
  assert.ok(mesh.geometry.boundingBox && mesh.geometry.boundingSphere);
  assert.equal(mesh.geometry.getAttribute('position').usage, THREE.DynamicDrawUsage);
  const copied = new Float32Array(mesh.geometry.getAttribute('position').array);
  adapter.update(0.63);
  assert.notDeepEqual(Array.from(mesh.geometry.getAttribute('position').array), Array.from(copied));
  assert.deepEqual(Array.from(ir.vertexBuffer), Array.from(copied));
  assert.ok(mesh.geometry.boundingSphere.radius > 0);
  adapter.setDeformEnabled(false);
  assert.deepEqual(Array.from(mesh.geometry.getAttribute('position').array), Array.from(copied));
  const scene = new THREE.Scene();
  scene.add(mesh);
  adapter.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(adapter.currentMesh, null);
});

test('REAL Three.js mesh survives repeated pulse and returns to source state', () => {
  const ir = JMMeshCompiler.compile(source.replace('deform wave', 'deform pulse'));
  const adapter = new JMPlayZoneAdapter(THREE);
  const first = adapter.createMesh(ir);
  for (let i = 0; i < 240; i++) assert.equal(adapter.update(i / 60), true);
  const updated = first.geometry.getAttribute('position').array;
  assert.ok(Array.from(updated).every(Number.isFinite));
  const replacement = adapter.createMesh(JMMeshCompiler.compile(source));
  assert.notEqual(first, replacement);
  assert.equal(replacement.geometry.getIndex().count, 24);
  adapter.dispose();
});
