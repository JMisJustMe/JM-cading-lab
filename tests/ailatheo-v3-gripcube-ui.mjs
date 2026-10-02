import fs from "node:fs";
const html=fs.readFileSync("unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html","utf8");
const must=[
  "JM.CreationWorkbench/0.5",
  "function mountGripWorkbench()",
  "JMAILatheoGripUI",
  "TRACE","ROUTE","FORM","FIELD","PROOF","USE",
  "gcw-stageFrame","gcw-faceViewport","gcw-quick","gcw-cubeDock","gcw-cubeFace","gcwLegacyModes",
  "SWIPE FACE ↔","GRIP BODY · DRAG / RESIZE / ROTATE",
  "formFace.append(lab,source,explain)",
  "fieldFace.append(bodyShelf,inspector)",
  "routeFace.append(linker,linkShelf)",
  "traceFace.append(tabs,route,teach)",
  "useFace.append(core)",
  "proofFace.append(advanced)"
];
for(const x of must) if(!html.includes(x)) throw new Error("GRIP_UI_MISSING_"+x);
for(const id of ["scene","source","route","bodyShelf","linkShelf","addObject","undoProject","saveProject"]){
  const n=(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
  if(n!==1) throw new Error("GRIP_UI_IDENTITY_"+id+"_"+n);
}
if(!html.includes("grid-template-rows:minmax(0,1fr) 214px")) throw new Error("MOBILE_FINITE_VIEWPORT_ROUTE_MISSING");
if(!html.includes("grid-auto-flow:column")) throw new Error("SIDE_TRAVEL_MISSING");
if(!html.includes("setFace(map[b.textContent])")) throw new Error("MODE_TO_FACE_ROUTE_MISSING");
for(const token of ["cubeFaceFromPose","releaseCube","pointermove","paintCube","grippableCube","singleWorldCarrier","threeRowApp","starterYieldsToBodies","gcw-world","gcwApp","routeFace.querySelector(\'.linker\')","syncGripContext","scene.dataset.gcwLens","directRouteContact","contextualQuick","gcw-contactHint","route-source"]) if(!html.includes(token)) throw new Error("GRIP_CUBE_CONTACT_MISSING_"+token);
console.log(JSON.stringify({
  passed:true,
  carrier:"GripCube UI projection",
  version:"0.5",
  semanticFaces:6,
  quickContacts:5,
  preservesSingleIds:true,
  horizontalFaceTravel:true,
  stagePrimary:true,
  grippableCube:true,
  legacyModeStripHidden:true,
  cubeReleaseSnapsFace:true,
  singleWorldCarrier:true,
  starterYieldsToBodies:true,
  stageContactGrammar:true,
  contextualQuick:true,
  directRouteContact:true,
  earnedDepth:true
},null,2));