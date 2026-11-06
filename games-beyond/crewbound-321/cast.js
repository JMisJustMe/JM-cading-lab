/* CREWBOUND CP02 — 12 independent crew identities and authored silhouettes.
   New names/appearances: NOT COMBOUND's creature roster.
   Rules and archived source stats inherited by explicit donor reference only.
   New moves/visuals are candidate CP02 body, not retroactively the v0.5 PrimeBody. */
(function(root){
"use strict";
const donor=root.JM_CREWBOUND_321_ROSTER||(typeof require==="function"?require("./roster.js"):null);
if(!donor?.fighters)throw Error("CREWBOUND v0.5 PrimeBody donor unavailable");
const identity=[
 // YOUR CREW · high-contrast athletic / equipment-based silhouettes
 {id:"KEPLER",from:"ZIPP",name:"Kepler",role:"Skyline skater",silhouette:"glider",colors:["#3de7ff","#163d88","#ffc975"],speed:210,maneuver:"bank",defense:"Slip Roll",attack:"Rail Dash",signature:"BLUE COMET",personality:"Bold, fast-reading scout",kit:"Wing fins / pulse skates",short:"SKATE"},
 {id:"IRONVALE",from:"BRAX",name:"Ironvale",role:"Anchor bruiser",silhouette:"anvil",colors:["#ffb767","#643628","#fce6b0"],speed:91,maneuver:"charge",defense:"Brace Plate",attack:"Earthstamp",signature:"CRASH ANCHOR",personality:"Immovable team protector",kit:"Hydraulic gauntlets / shoulder plates",short:"BRACE"},
 {id:"SOLACE",from:"MIRA",name:"Solace",role:"Relay choreographer",silhouette:"ribbon",colors:["#f5a1cf","#733a7d","#84ead6"],speed:159,maneuver:"weave",defense:"Crossfade",attack:"Ribbon Relay",signature:"AFTERIMAGE",personality:"Calculates moving partnerships",kit:"Twin signal ribbons / long coat",short:"WEAVE"},
 {id:"LOCKE",from:"GROVE",name:"Locke",role:"Gate captain",silhouette:"sentinel",colors:["#9acaf5","#304873","#f6dc85"],speed:94,maneuver:"anchor",defense:"Hold Wall",attack:"Shield Shunt",signature:"IRON GATE",personality:"Methodical, protects the vulnerable",kit:"Full-length tower shield / visor",short:"HOLD"},
 {id:"ASTER",from:"ORBI",name:"Aster",role:"Pulse aerialist",silhouette:"astral",colors:["#f9dd74","#5a4179","#ff9376"],speed:146,maneuver:"orbit",defense:"Halo Guard",attack:"Arc Pulse",signature:"SOLAR CHOIR",personality:"Theatrical aerial tactician",kit:"Orbit hoops / split-flight cape",short:"ORBIT"},
 {id:"NOX",from:"VEXA",name:"Nox",role:"Stealth line-reader",silhouette:"marksman",colors:["#b89aff","#30335d","#9df0f2"],speed:175,maneuver:"sidestep",defense:"Nightstep",attack:"Markline",signature:"HIDDEN VECTOR",personality:"Quiet, precision-minded navigator",kit:"Angular rangefinder / trailing scarf",short:"MARK"},
 // RIVAL CREW · distinct individual silhouettes, not mirrored recolours
 {id:"STATIC",from:"SKIP",name:"Static",role:"Phase acrobat",silhouette:"jester",colors:["#ff747b","#753040","#fcdb83"],speed:219,maneuver:"zigzag",defense:"Sidecut",attack:"Backdoor Feint",signature:"GLITCH LEAP",personality:"Unpredictable gap-hunter",kit:"Split-jacket / twin spring boots",short:"SHIFT"},
 {id:"LATCH",from:"KNOT",name:"Latch",role:"Bind specialist",silhouette:"grappler",colors:["#a8d981","#41566a","#e5aacb"],speed:125,maneuver:"lure",defense:"Catch Net",attack:"Chain Snare",signature:"CROSSHATCH",personality:"Relentless trap architect",kit:"Mechanical spool / hook lance",short:"SNARE"},
 {id:"EMBER",from:"ORBI",name:"Ember",role:"Blast percussionist",silhouette:"drummer",colors:["#ff986a","#863a48","#ffe2ab"],speed:141,maneuver:"pulse",defense:"Heat Veil",attack:"Impact Beat",signature:"FIRE CIRCLE",personality:"Aggressive rhythmic striker",kit:"Resonance drums / heat visor",short:"BEAT"},
 {id:"WROUGHT",from:"GROVE",name:"Wrought",role:"Siege wall",silhouette:"juggernaut",colors:["#c5d4dc","#4a4b60","#ff8580"],speed:82,maneuver:"anchor",defense:"Stone Skin",attack:"Ramlock",signature:"IRON PROCESSION",personality:"Slow, relentless frontline wall",kit:"Reinforced crawler suit / ram collar",short:"RAM"},
 {id:"VIVID",from:"VEXA",name:"Vivid",role:"Laser fencer",silhouette:"lancer",colors:["#fc83cc","#663c79","#97edc3"],speed:169,maneuver:"fence",defense:"Parry Arc",attack:"Laser Draw",signature:"BRIGHT CUT",personality:"Daring long-range duelist",kit:"Thin energy lance / pointed helmet",short:"PARRY"},
 {id:"DASHER",from:"ZIPP",name:"Dasher",role:"Low-gravity rider",silhouette:"rider",colors:["#66f2cb","#27677a","#ffb26e"],speed:199,maneuver:"drift",defense:"Burnout",attack:"Skid Sweep",signature:"CORKSCREW RUN",personality:"Smooth, momentum-led trick rider",kit:"Single glide wheel / asymmetrical armour",short:"DRIFT"}
];
const fighters={};
for(const entry of identity){
 const base=donor.fighters[entry.from];if(!base)throw Error("Missing donor "+entry.from);
 const {id,from,...change}=entry;
 fighters[id]={...base,...change,key:id,archetype:from,source_name:base.name,source_signature:base.signature_name,
   source_ability_effect:base.ability_effect,name:entry.name,
   cp01_proposed_speed:entry.speed,signature_name:entry.signature,
   movement_word:entry.short,palette:[...entry.colors],
   hp:Math.round(base.hp*(id==="WROUGHT"?1.05:id==="DASHER"?.96:1)),
   // Fine visual distinctions are not a claim that inherited mechanic donor changed.
   new_art_authority:"CREWBOUND_CP02_UNIQUE_CAST"};
}
const crews={player:identity.slice(0,6).map(x=>x.id),enemy:identity.slice(6).map(x=>x.id)};
const api={schema:"JM.CREWBOUND.CP02.UNIQUE_CAST/1",fighters,crews,identity:identity.map(x=>({...x})),
 source_sha256:donor.source_sha256, source_character_count:Object.keys(donor.fighters).length,
 source_separation:"CREWBOUND roster is independent of COMBOUND; no donor source files overwritten"};
if(typeof module==="object"&&module.exports)module.exports=api;
root.JM_CREWBOUND_321_CAST=api;
})(typeof globalThis!=="undefined"?globalThis:this);
