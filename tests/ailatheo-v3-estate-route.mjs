import fs from "node:fs"; import vm from "node:vm";
import { planEstateRoute, validateRegistry } from "../coding-estate/integration/router-core.mjs";
const registry=JSON.parse(fs.readFileSync("coding-estate/integration/REGISTRY.json","utf8"));
const check=validateRegistry(registry); if(!check.valid) throw new Error(check.failures.join(","));
const plan=planEstateRoute("game touch visual compile proof recover delivery Bedroom Lamp lamp ToggleLight",registry,{limit:7,includeDelivery:true});
for(const id of ["tracebox","dings","source-ledger","onebody-delivery","zionfolder"]) if(!plan.route.some(x=>x.id===id)) throw new Error("MISSING_"+id);
const html=fs.readFileSync("unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html","utf8");
for(const token of ["ROUTE ESTATE","router-core.mjs","REGISTRY.json","FAULT HOLD","SOURCE"]) if(!html.includes(token)) throw new Error("HTML_MISSING_"+token);
console.log(JSON.stringify({passed:true,registry:check.count,routeBodies:plan.route.length,intents:plan.intents,mandatory:["tracebox","dings","source-ledger","onebody-delivery","zionfolder"]},null,2));