import { planEstateRoute } from "../coding-estate/integration/router-core.mjs";
import { GameForge, JMVisualGraft, JMVisualRuntime } from "../coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs";
import { PLAYFORM, Seedform, PatternTapping } from "../coding-estate/sovereign-batch-six/direct/game-input-native-b.mjs";

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
 return {schema:"jm.ailatheo.creation-execution/0.1",intent,plan,executedBodies:["GameForge","PLAYFORM","Seedform Choice Interface","Pattern-Tapping","JMVisualGraft","JM Visual Interaction Runtime"],passed:forge.state.distinct&&play.result.mutuallyExecutable&&seed.result.governed&&tap.state.temporal&&visual.state.mechanicLinked&&interaction.result.consequenceReadable,receipts:[forge,play,seed,tap,visual,interaction].map(x=>x.receipt.resultDigest),state:{forge:forge.state,play:play.result,seed:seed.result,pattern:tap.state,visual:visual.state,interaction:interaction.result}};
}