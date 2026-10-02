import fs from "node:fs";
import path from "node:path";
import { executeAILatheoCreation } from "../unified-browser/ailatheo-creation-runtime.mjs";

const outDir = process.argv[2];
if (!outDir) throw new Error("OUTPUT_DIRECTORY_REQUIRED");
const registryPath = "coding-estate/integration/REGISTRY.json";
const manifest = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const parts = (manifest.parts ?? []).map(rel => JSON.parse(fs.readFileSync(path.join(path.dirname(registryPath), rel), "utf8")));
const registry = manifest.bodies ? manifest : {...manifest, bodies: parts.flatMap(part => part.bodies ?? [])};
if (registry.bodies?.length !== manifest.count) throw new Error(`REGISTRY_COUNT_MISMATCH:${registry.bodies?.length}/${manifest.count}`);

const intent = "build a touch visual game with drag aim, browser and android delivery";
const execution = executeAILatheoCreation(intent, registry);
if (!execution.passed) throw new Error("AILATHEO_NATIVE_EXECUTION_FAILED");
if (execution.buildGates.status !== "PASS" || execution.buildGates.passed.length !== 8) throw new Error("AILATHEO_BUILD_GATES_FAILED");
if (!execution.delivery.recoverable) throw new Error("AILATHEO_DELIVERY_NOT_RECOVERABLE");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), execution.carrier.html);
fs.writeFileSync(path.join(outDir, "AILatheoCreation.onebody.json"), JSON.stringify(execution.oneBody, null, 2));
fs.writeFileSync(path.join(outDir, "AILATHEO_NATIVE_EXECUTION.json"), JSON.stringify({
  schema: execution.schema, intent: execution.intent, executedBodies: execution.executedBodies, receipts: execution.receipts,
  buildGates: execution.buildGates, delivery: execution.delivery, carrier: execution.carrier.forgeContract,
  route: execution.plan.route, lawsApplied: execution.plan.lawsApplied
}, null, 2));
console.log(JSON.stringify({passed:true,registryBodies:registry.bodies.length,registryParts:parts.length,executedBodies:execution.executedBodies.length,receipts:execution.receipts.length,buildGates:execution.buildGates.passed.length,recoverable:execution.delivery.recoverable,packageName:execution.carrier.forgeContract.packageName,versionName:execution.carrier.forgeContract.versionName,versionCode:execution.carrier.forgeContract.versionCode,output:outDir}, null, 2));
