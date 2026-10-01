import { planEstateRoute } from "../coding-estate/integration/router-core.mjs";
import { GameForge, JMVisualGraft, JMVisualRuntime } from "../coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs";
import { PLAYFORM, Seedform, PatternTapping } from "../coding-estate/sovereign-batch-six/direct/game-input-native-b.mjs";
import { BuildGates, OneBodyDelivery, CadingIR } from "../coding-estate/sovereign-batch-four/direct/toolchain-native.mjs";

export function executeAILatheoCreation(intent, registry){
 const plan=planEstateRoute(intent,registry,{limit:7,includeDelivery:true});
 const game={name:"AILatheoCreation",identity:"AILatheoCreation",capabilities:["drag","aim","touch"]};
 const forge=GameForge.execute(`gameforge AILatheoForge {
 game: AILatheoCreation
 identity: AILatheoCreation
 adapters: ["attachTrace","attachInput"]
 build: buildGame
 exports: ["browser","android"]
 }`,game,{attachTrace:v=>({...v,traceAttached:true}),attachInput:v=>({...v,inputAttached:true}),buildGame:v=>({...v,built:true})});
 const play=PLAYFORM.execute(`playform CreationField {
 form: drag_aim
 regions: ["stage","object"]
 interactions: ["tap","drag","hold"]
 layout: adaptive
 state_path: play.lastInput
 }`,{region:"stage",type:"drag",value:"aim"},{});
 const seed=Seedform.execute(`seedform CreationChoice {
 surface: stage
 choices: ["aim","move","cancel"]
 combos: ["tap-hold","drag-release"]
 permissions: ["creator","tester"]
 state_path: seed.choice
 }`,{permission:"creator",choice:"aim",combo:"drag-release"},{});
 const tap=PatternTapping.execute(`tap ConfirmBuild {
 sequence: ["left","right"]
 max_gap: 350
 route: build.confirm
 state: armed
 }`,[{tap:"left",time:1000},{tap:"right",time:1240}]);
 const visual=JMVisualGraft.execute(`visualgraft AimState {
 mechanic: drag_aim
 state_path: aim.state
 expression: "aim-{state}"
 asset: aim_line
 contact: drag
 }`,{aim:{state:"armed"}});
 const interaction=JMVisualRuntime.execute(`interaction CreationTouch {
 field: stage
 inputs: ["tap","drag","hold"]
 state_path: input.last
 feedback: pulse
 render: immediate
 }`,{type:"drag",value:"aim"},{});
 const ir=CadingIR.execute(`node source kind=intent value="AILatheoCreation"
node runtime kind=game value="native-game-route"
node delivery kind=package value="forge-ready"
link source -> runtime kind=lower
link runtime -> delivery kind=deliver`);
 const gates=BuildGates.execute(`build AILatheoBuild {
 source: AILatheoCreation
 gates: ["source","signal","route","state","trace","body","receipt","rebuild"]
 receipt: AILatheoBuildReceipt
 }`,{source:true,signal:true,route:true,state:true,trace:true,body:true,receipt:true,rebuild:true});
 const files={"AILatheoCreation.onebody.json":JSON.stringify(ir.ir),"BUILD_RECEIPT.json":JSON.stringify(gates.receipt),"00_OPEN_FIRST.html":"AILatheo creation carrier"};
 const delivery=OneBodyDelivery.execute(`package AILatheoCreationPack {
 source: AILatheoCreation.onebody.json
 build: AILatheoBuild
 receipt: BUILD_RECEIPT.json
 package: AILatheoCreationPack
 open_first: 00_OPEN_FIRST.html
 }`,files);
 const carrier=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AILatheo Creation</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08111d;color:#eef7ff;font-family:system-ui}.body{padding:32px;border:1px solid #345;border-radius:24px;background:#101d2d;box-shadow:0 0 70px #3cf3}button{font:inherit;padding:12px 18px;border-radius:12px}</style></head><body><main class="body"><h1>AILatheo Creation</h1><p id="state">OneBody carrier ready.</p><button id="contact">CONTACT</button></main><script>document.querySelector('#contact').onclick=()=>{document.querySelector('#state').textContent='VISIBLE CONSEQUENCE · native route carried';document.body.dataset.contact='ding'};<\/script></body></html>`;
 const carrierDigest=delivery.state.sha256;
 return {schema:"jm.ailatheo.creation-execution/0.3",intent,plan,executedBodies:["GameForge","PLAYFORM","Seedform Choice Interface","Pattern-Tapping","JMVisualGraft","JM Visual Interaction Runtime"],passed:forge.state.distinct&&play.result.mutuallyExecutable&&seed.result.governed&&tap.state.temporal&&visual.state.mechanicLinked&&interaction.result.consequenceReadable,receipts:[forge,play,seed,tap,visual,interaction,ir,gates,delivery].map(x=>x.receipt.resultDigest),oneBody:ir.ir,buildGates:gates.state,delivery:delivery.state,carrier:{html:carrier,digest:carrierDigest,entry:"index.html",forgeContract:{sourceDirectory:"AILatheoCreationPack",projectName:"AILatheo Creation",packageName:"com.jmisjustme.ailatheocreation",versionName:"3.0-alpha",versionCode:300}},state:{forge:forge.state,play:play.result,seed:seed.result,pattern:tap.state,visual:visual.state,interaction:interaction.result}};
}