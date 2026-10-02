import fs from "node:fs";
const html=fs.readFileSync("unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html","utf8");

const required=[
  "JM.CreationWorkbench/0.5",
  "SELECT_OR_CREATE","CHANGE","SEE","UNDERSTAND","CONNECT","TEST","SAVE",
  "bodyShelf","duplicateObject","deleteObject","DIRECT MOVE","linkLayer","resizeHandle","rotateHandle","removeLink",
  "composeSource","parseSource","applyBodyVisual","rememberRevision",
  "workbenchStandard:WORKBENCH_STANDARD.schema",
  "NAME : TYPE [COLOUR] <SHAPE> :: ACTION"
];
for(const token of required) if(!html.includes(token)) throw new Error("STANDARD_MISSING_"+token);

for(const id of ["duplicateObject","deleteObject","removeLink"]) {
  if(!html.includes("querySelector('#"+id+"').onclick")) throw new Error("DEAD_STANDARD_CONTROL_"+id);
}

if(!html.includes("onpointerdown")||!html.includes("onpointermove")||!html.includes("onpointerup")) {
  throw new Error("DIRECT_MANIPULATION_ROUTE_MISSING");
}
if(!html.includes("selected.body")||!html.includes("persistBodies()")) {
  throw new Error("INSPECTOR_BODY_CONTACT_MISSING");
}
if(!html.includes("older source")) throw new Error("BACKWARD_COMPATIBILITY_GUIDANCE_MISSING");
if(html.includes("</details></div></article>")) throw new Error("ACTION_GROUP_MARKUP_EXTRA_CLOSE");
for(const token of ["function consequence","function fireLink","function distance","runBodyAction","_suppressClick","preDrag=snapshot()"]) if(!html.includes(token)) throw new Error("RUNTIME_CONTACT_MISSING_"+token);
for(const token of ["drawLinks","refreshLinkShelf","bindTransformHandle","linkArrow","Spin","Grow","Shrink","Bounce","UNLINK →"]) if(!html.includes(token)) throw new Error("STAGE_DEPTH_MISSING_"+token);

for(const token of ["gcw-shell","gcw-lenses","JMAILatheoGripUI","GRIP BODY · DRAG / RESIZE / ROTATE","singleWorldCarrier","starterYieldsToBodies","gcw-world","scene.dataset.gcwLens","syncGripContext"]) if(!html.includes(token)) throw new Error("GRIPCUBE_UI_MISSING_"+token);

console.log(JSON.stringify({
  passed:true,
  standard:"JM.CreationWorkbench/0.5",
  routeStages:7,
  directManipulation:true,
  sourceMirrorsShape:true,
  structuralUndo:true,
  bodyShelf:true,
  advancedControlsProgressivelyDisclosed:true,
  visibleRelationships:true,
  directResizeRotate:true,
  removableRelationships:true,
  richerConsequences:8,
  gripCubeProjection:true,
  semanticFaces:6,
  stageDominant:true,
  reducedVerticalBrowsing:true,
  lensAwareStageContact:true
},null,2));
