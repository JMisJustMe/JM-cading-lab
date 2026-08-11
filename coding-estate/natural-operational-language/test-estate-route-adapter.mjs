import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BounceSpine } from './bounce-spine.mjs';
import { naturalRoutingQuery, planNaturalEstateRoute } from './estate-route-adapter.mjs';

const readJSON = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const manifest = readJSON('../integration/REGISTRY.json');
const registry = {
  ...manifest,
  bodies: manifest.parts.flatMap(part => readJSON(`../integration/${part}`).bodies)
};

const openPlan = planNaturalEstateRoute(';open; door', registry);
assert.equal(openPlan.type, 'JM.NaturalOperationalEstateRoute.v0.1');
assert.equal(openPlan.estatePlan.route.some(body => body.id === 'tracebox'), true);
assert.equal(openPlan.estatePlan.route.some(body => body.id === 'dings'), true);
assert.equal(openPlan.estatePlan.route.some(body => body.id === 'source-ledger'), true);
assert.equal(openPlan.estatePlan.intents.includes('route'), true);

const relationRouting = naturalRoutingQuery(';open; door ;and; ;close; window');
assert.equal(relationRouting.operators.includes('and'), true);
assert.equal(relationRouting.hints.includes('compose'), true);
const relationPlan = planNaturalEstateRoute(';open; door ;and; ;close; window', registry);
assert.equal(relationPlan.estatePlan.intents.includes('compose'), true);

const recorpPlan = planNaturalEstateRoute('RECORP! shards', registry);
assert.equal(recorpPlan.operators.includes('recorp'), true);
assert.equal(recorpPlan.estatePlan.intents.includes('recover'), true);
assert.equal(recorpPlan.estatePlan.route.some(body => body.id === 'recorp'), true);

const spine = new BounceSpine();
const reusable = spine.plan(';move(to=studio); crate');
const reusableRoute = planNaturalEstateRoute(reusable, registry);
assert.equal(reusableRoute.naturalPlanDigest, reusable.digest);
assert.equal(reusableRoute.estatePlan.intents.includes('route'), true);

console.log('JM_NATURAL_OPERATIONAL_ESTATE_ROUTE 4/4 PASS');
