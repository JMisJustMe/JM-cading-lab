import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// November source-native regression. Simulated service-worker activation only;
// real installed PWA and owner-device offline acceptance remain separate gates.
const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

async function activateWith(cacheKeys) {
  const handlers = new Map();
  const deleted = [];
  let claims = 0;
  const self = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    clients: { claim: async () => { claims++; } }
  };
  const caches = {
    keys: async () => [...cacheKeys],
    delete: async key => { deleted.push(key); return true; }
  };
  runInNewContext(source, { self, caches }, { timeout: 1000 });
  const activate = handlers.get('activate');
  expect(typeof activate).toBe('function');
  let pending;
  activate({ waitUntil: promise => { pending = promise; } });
  expect(pending).toBeDefined();
  await pending;
  return { deleted, claims };
}

test('@boot House service-worker activation preserves sibling JM caches', async () => {
  const result = await activateWith([
    'jm-bonewake-v1-12',
    'jm-puka-v17a',
    'jm-fourfold-v31',
    'other-app',
    'games-beyond-v0-9-whole-estate-current-r3'
  ]);
  expect(result.deleted).toEqual([]);
  expect(result.claims).toBe(1);
});

test('@boot House activation retires only stale v0 House caches', async () => {
  const result = await activateWith([
    'games-beyond-v0-8-legacy',
    'games-beyond-v0-9-whole-estate-current-r2',
    'games-beyond-v0-9-whole-estate-current-r3',
    'games-beyond-v1-future',
    'jm-bonewake-v1-12'
  ]);
  expect(result.deleted).toEqual([
    'games-beyond-v0-8-legacy',
    'games-beyond-v0-9-whole-estate-current-r2'
  ]);
  expect(result.claims).toBe(1);
});

test('@boot House activation with no old caches is non-destructive', async () => {
  const result = await activateWith([]);
  expect(result.deleted).toEqual([]);
  expect(result.claims).toBe(1);
});
