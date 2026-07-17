import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { compatibilityBetween, planEstateRoute, validateRegistry } from "./router-core.mjs";
import { runAllAdoptionProofs } from "./adoption-proofs.mjs";

const readJSON = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), "utf8"));
const registry = readJSON("./REGISTRY.json");
const matrix = readJSON("./COMPATIBILITY.json");
const checks = [];

function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, passed: true, result });
  } catch (error) {
    checks.push({ name, passed: false, error: { code: error.code ?? error.name, message: error.message } });
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

check("01 registry validates at exactly 100 distinct bodies", () => {
  const result = validateRegistry(registry);
  expect(result.valid, result.failures.join(","));
  expect(result.count === 100, "REGISTRY_NOT_100");
  return result;
});
check("02 all bodies retain no-supremacy lock", () => {
  expect(registry.bodies.every(body => body.supreme === false), "SUPREMACY_FOUND");
  return { count: registry.bodies.length };
});
check("03 recovered history is separately labelled", () => {
  const recovered = registry.bodies.filter(body => body.historicalRecoveryClaim).map(body => body.name).sort();
  expect(JSON.stringify(recovered) === JSON.stringify(["Cading","MorseMinus ZeroGrip","Quadze","Speakuals"].sort()), "RECOVERY_BOUNDARY_CHANGED");
  return recovered;
});
check("04 game request returns native game and touch bodies", () => {
  const plan = planEstateRoute("build a touch drag aim game with visual feedback trace proof and android delivery", registry, { includeDelivery: true });
  const ids = new Set(plan.route.map(item => item.id));
  expect(ids.has("gameforge") || ids.has("game-coding"), "GAME_BODY_MISSING");
  expect(ids.has("seedform-choice-interface"), "TOUCH_BODY_MISSING");
  expect(ids.has("tracebox") && ids.has("dings") && ids.has("source-ledger"), "PROOF_SPINE_MISSING");
  expect(ids.has("zionfolder"), "DELIVERY_MISSING");
  return plan;
});
check("05 compiler request returns source-to-target spine", () => {
  const plan = planEstateRoute("parse and compile cading to javascript with source ledger and receipt", registry);
  const ids = new Set(plan.route.map(item => item.id));
  expect(ids.has("parser") && ids.has("compiler"), "COMPILER_SPINE_MISSING");
  expect(ids.has("tracebox") && ids.has("dings"), "PROOF_MISSING");
  return plan;
});
check("06 OS request returns route and operating bodies", () => {
  const plan = planEstateRoute("route estate os permission service recovery world", registry);
  const ids = new Set(plan.route.map(item => item.id));
  expect(ids.has("routecore-native") && ids.has("os-coding"), "OS_SPINE_MISSING");
  return plan;
});
check("07 direct compatibility recognises Parser to Compiler", () => {
  const byId = new Map(registry.bodies.map(body => [body.id, body]));
  const result = compatibilityBetween(byId.get("parser"), byId.get("compiler"), matrix);
  expect(result.mode === "direct", "DIRECT_PAIR_NOT_FOUND");
  return result;
});
check("08 unknown cross-family pair requires an adapter", () => {
  const byId = new Map(registry.bodies.map(body => [body.id, body]));
  const result = compatibilityBetween(byId.get("mood-drills"), byId.get("js-emitter"), matrix);
  expect(["adapter-required","direct-with-declared-intent","direct-with-policy-guard","direct-with-verified-ir"].includes(result.mode), "COMPATIBILITY_EMPTY");
  return result;
});
check("09 forbidden laws are present", () => {
  const codes = new Set(matrix.forbidden.map(rule => rule.code));
  for (const code of ["IDENTITY_COLLAPSE","HOST_TAKEOVER","NO_DING","ALIAS_INFLATION","UNGOVERNED_GRAFT"]) expect(codes.has(code), `MISSING_${code}`);
  return [...codes];
});
check("10 three real adoption proofs execute", () => {
  const result = runAllAdoptionProofs();
  expect(result.passed && result.proofs.length === 3, "ADOPTION_PROOF_FAILED");
  expect(result.proofs.every(proof => proof.receipts.length >= 4), "ADOPTION_RECEIPTS_MISSING");
  return result;
});
check("11 Batch Six documentation no longer claims Ding pending", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const readme = fs.readFileSync(`${repoRoot}/sovereign-batch-six/README.md`, "utf8");
  expect(!/Repository Ding is pending/i.test(readme), "STALE_BATCH_SIX_README");
  expect(/Repository proof/i.test(readme), "REPOSITORY_PROOF_NOT_RECORDED");
  return { corrected: true };
});
check("12 privacy gate remains explicit and non-green", () => {
  const privacy = fs.readFileSync(new URL("./PRIVACY_GATE.md", import.meta.url), "utf8");
  expect(/CURRENT REPOSITORY VISIBILITY:\s*\*\*PUBLIC\*\*/i.test(privacy), "PUBLIC_VISIBILITY_NOT_RECORDED");
  expect(/NOT CLOSED/i.test(privacy), "PRIVACY_FALSE_GREEN");
  return { status: "external-admin-action-required" };
});

const failed = checks.filter(check => !check.passed);
const receipt = {
  schema: "jm.sovereign-estate.integration-conformance/1.0",
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  privacyGate: "external-admin-action-required"
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
