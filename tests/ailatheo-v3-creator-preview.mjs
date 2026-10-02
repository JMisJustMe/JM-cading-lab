import fs from "node:fs";
const html=fs.readFileSync("unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html","utf8");

const required=[
  "JM.AILatheo.CreatorPreview/0.1",
  "Creator Preview v0.1",
  "JM.CreationWorkbench/0.25",
  "Build it.",
  "Connect it.",
  "See it work.",
  "creatorPreviewGate",
  "creatorStartBlank",
  "creatorExploreSignal",
  "EXPLORE SIGNAL GARDEN",
  "Signal Garden",
  "Pulse Pad",
  "Glow Orb",
  "Gate Bloom",
  "loadSignalGarden",
  "resetSignalGarden",
  "creatorPreviewClearScene",
  "creatorPreviewHasProject",
  "sampleId:",
  "planContext:'free-preview'",
  "JM.AILatheoCustomer/0.1",
  "checkout:creatorService?.ready?'server-verified':'server-hold'",
  "FREE PROVES THE CORE LOOP; PAID MUST EXPAND CAPABILITY WITHOUT CAPTURING THE CREATION."
];
for(const token of required) if(!html.includes(token)) throw new Error("CREATOR_PREVIEW_MISSING_"+token);

for(const id of ["creatorPreviewGate","creatorStartBlank","creatorExploreSignal","creatorPlanDialog","creatorPlanButton","sampleResetButton"]){
  const n=(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
  if(n!==1) throw new Error("CREATOR_PREVIEW_IDENTITY_"+id+"_"+n);
}

if(html.includes("sk_test_")||html.includes("sk_live_")||html.includes("whsec_")||html.includes("stripe.redirectToCheckout")){
  throw new Error("CLIENT_STRIPE_SECRET_OR_DIRECT_STRIPE_ROUTE_PRESENT");
}
if(!html.includes("No account wall. No payment wall before contact.")) throw new Error("FIRST_CONTACT_BOUNDARY_MISSING");
for(const token of ["creatorCreateAccount","creatorRecoverAccount","creatorCheckoutMonthly","creatorCheckoutAnnual","creatorManageBilling","checkout.reconcile","Creator Account Key","/api/ailatheo"]) if(!html.includes(token)) throw new Error("ENTITLEMENT_UI_MISSING_"+token);
if(!html.includes("bodies.push(...signalGardenBodies());links.push({from:0,to:1,trigger:'touch'},{from:1,to:2,trigger:'touch'})")) throw new Error("SIGNAL_GARDEN_NOT_USING_NATIVE_BODY_LINK_MODEL");
if(!html.includes("recordProjectContact('SAMPLE DING'")) throw new Error("SAMPLE_MATERIAL_CONTACT_MISSING");


const launch=fs.readFileSync("ailatheo/index.html","utf8");
for(const token of [
  "Build it.","Connect it.","See it work.",
  "JM.CreationWorkbench/0.25","CREATOR PREVIEW v0.1",
  "BODY","ACT","LINK","Signal Garden","FREE PREVIEW","£15/mo","£150/year",
  "Your creation stays yours.",
  "../unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html"
]) if(!launch.includes(token)) throw new Error("CREATOR_LAUNCH_MISSING_"+token);
if(!launch.includes("Creator checkout only opens when the server confirms the entitlement rail is ready.")) throw new Error("LAUNCH_ENTITLEMENT_BOUNDARY_MISSING");
if((launch.match(/href="\.\.\/unified-browser\/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA\.html"/g)||[]).length<3) throw new Error("LAUNCH_TRY_FREE_ROUTE_TOO_WEAK");

console.log(JSON.stringify({
  passed:true,
  release:"Creator Preview v0.1",
  workbench:"JM.CreationWorkbench/0.25",
  firstRun:true,
  startBlank:true,
  signalGarden:true,
  sampleBodies:3,
  sampleLinks:2,
  resetSample:true,
  noAccountWallBeforeContact:true,
  noPaymentWallBeforeContact:true,
  checkoutServerVerified:true,
  recoverableCreatorAccount:true,
  sampleUsesNativeBodyLinkModel:true,
  publicProductDoor:true,
  publicTryFreeRoute:true
},null,2));
