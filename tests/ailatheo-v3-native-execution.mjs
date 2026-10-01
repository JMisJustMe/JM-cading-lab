import fs from "node:fs"; import {executeAILatheoCreation} from "../unified-browser/ailatheo-creation-runtime.mjs";
const registry=JSON.parse(fs.readFileSync("coding-estate/integration/REGISTRY.json","utf8"));
const out=executeAILatheoCreation("build a touch visual game with drag aim, browser and android delivery",registry);
if(!out.passed) throw new Error("AILATHEO_EXECUTION_FAILED");
if(out.executedBodies.length!==6||out.receipts.length!==6) throw new Error("EXECUTION_RECEIPT_COUNT");
for(const id of ["tracebox","dings","source-ledger","onebody-delivery","zionfolder"]) if(!out.plan.route.some(x=>x.id===id)) throw new Error("ROUTE_MISSING_"+id);
console.log(JSON.stringify({passed:out.passed,executedBodies:out.executedBodies.length,receipts:out.receipts.length,routeBodies:out.plan.route.length,forgeOutputs:Object.keys(out.state.forge.outputs),consequenceReadable:out.state.interaction.consequenceReadable},null,2));