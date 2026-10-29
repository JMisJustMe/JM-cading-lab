/**
 * FTR Eight Discovery Contact — CP01, 2026-10-29
 * Owner: JM / TB Scott. Additive to existing JM coding estate.
 * No replacement renderer, GameCore, RouteOS, Gardles or new front door.
 * Sources: FTR Ama-Pro/GripRoute Control Map v0.6, Eco-Synced RouteOS Bridge v1.4;
 * existing JM sovereign Game-CODING/GameCore; external ideas are *inspiration*, not cloned code.
 */
import {GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime} from '../sovereign-ten/direct/game-native.mjs';

const fail=(ok,why)=>{if(!ok)throw Object.assign(new Error(why),{code:why});};
const clone=o=>JSON.parse(JSON.stringify(o));
const ROUTES=Object.freeze({turn:'Route',press:'Pulse',squeeze:'Hold',sweep:'Flow',flick:'Kic',wake:'Wake',draw:'Create'});
const SOURCES=new Set(['Ama-Pro','GripRoute','PalmVerse','keyboard','touch','gamepad','Azeron-reference']);
export const AUTHORITY=Object.freeze({
 schema:'jm.ftr.eight-contact/0.1',
 ancestors:['FTR Ama-Pro/GripRoute Hardware Control Map v0.6','FTR Eco-Synced RouteOS Bridge v1.4','JM native Game-CODING','JM native GameCore'],
 sovereignty:{'Ama-Pro':'native FTR device','GripRoute':'separate phone route','PalmVerse':'distinct provisional hand-interface lineage'},
 gardles:'HOLD_NATIVE_SOURCE_NOT_INTEGRATED', gpuRenderer:'NOT_TESTED', physicalPrototype:'NOT_TESTED',
 externalTargets:'NO_INSTALL_OR_EXTERNAL_API_CLAIMS', scope:'source-level native GameCore contact + offline bounded adapters'
});
export const DISCOVERIES=Object.freeze([
 {id:'engine-ecology',owner:'GameForge / JM GameCore / renderer bodies',type:'native-engine-comparison',delta:'mechanics and render-pipeline parity tests, not colour changes'},
 {id:'finger-controls',owner:'FTR Ama-Pro / GripRoute / PalmVerse',type:'adaptive-input',delta:'finger/gesture/pressure event translation while preserving device identity'},
 {id:'parrot-os',owner:'FTR / RouteComputer security research',type:'linux-lab-profile',delta:'separate virtual research environment, not an illegal OS'},
 {id:'nethunter-termux',owner:'JM Android/Termux device lab',type:'mobile-lab-profile',delta:'rootless-first device capability discrimination'},
 {id:'shodan',owner:'JM network/contact inventory',type:'passive-asset-audit',delta:'authorised-asset banner examination and traceable exposure summaries'},
 {id:'ruview',owner:'FTR RouteSense / Physical Contact',type:'sensing-validation',delta:'CSI vs RSSI and live vs synthetic strict evidence gate'},
 {id:'consequence',owner:'JM Game-CODING / FOURFOLD family',type:'game-mechanics',delta:'novel action-load and recovery trade-off; no copied card content'},
 {id:'scratch',owner:'JM learning / Visualang / authoring',type:'learning-authorship',delta:'accessible event-to-mechanic lessons with exported native-game targets'}
]);

export function contactEvent({source,gesture,pressure=0,sequence=0,capabilities=[]}){
 fail(SOURCES.has(source),'INPUT_SOURCE_UNRECOGNISED');
 fail(Object.hasOwn(ROUTES,gesture),'INPUT_GESTURE_UNRECOGNISED');
 fail(Number.isFinite(pressure)&&pressure>=0&&pressure<=1,'INPUT_PRESSURE_INVALID');
 fail(Number.isSafeInteger(sequence)&&sequence>=0,'INPUT_SEQUENCE_INVALID');
 fail(Array.isArray(capabilities)&&capabilities.every(x=>typeof x==='string'),'INPUT_CAPABILITIES_INVALID');
 return {schema:'jm.ftr.contact-event/1',source,deviceClass:AUTHORITY.sovereignty[source]??'external compatible input',
   gesture,kicPlay:ROUTES[gesture],pressure,sequence,capabilities:[...new Set(capabilities)],origin:'owner-input-mapping'};
}

/** Actual JM-native Game-CODING -> JM GameCore state change; not an eight-colour mock. */
export function executeNativeControl(contact){
 fail(contact?.schema==='jm.ftr.contact-event/1','INPUT_CONTACT_REQUIRED');
 const gameSource=`entity Contact {\n mode = "idle"\n}\nmechanic Engage {\n requires contact.mode == "idle"\n effect contact.mode = "active"\n}`;
 const coreSource=`organ HandContact {\n handles = [Contact]\n rules = [Engage]\n invariants = {\n contact.mode == "active"\n }\n}\nsystem FTRContact {\n organs = [HandContact]\n events = [Press]\n identity = "FTR.Native.Contact"\n}`;
 const game=new GameCodingRuntime(GameCoding.parse(gameSource),{},{});
 const core=new JMGameCoreRuntime(JMGameCore.parse(coreSource),game);
 const dispatch=core.dispatch('FTRContact','Press');
 fail(dispatch.state.contact.mode==='active','NATIVE_STATE_NOT_CHANGED');
 return {identity:dispatch.identity,source:contact.source,route:contact.kicPlay,
  before:'idle',after:dispatch.state.contact.mode,gameReceipt:dispatch.receipt.resultDigest,
  nativeBodies:['GameCoding','GameCodingRuntime','JMGameCore','JMGameCoreRuntime'],gardles:AUTHORITY.gardles};
}

/** Consequences are causally meaningful: load occupies action capacity until recovery. */
export function consequenceTurn(state,command){
 fail(state&&Number.isInteger(state.capacity)&&state.capacity>=1&&state.capacity<=12,'LOAD_CAPACITY');
 fail(Number.isInteger(state.load)&&state.load>=0&&state.load<=state.capacity,'LOAD_STATE');
 fail(['act','recover','rest'].includes(command),'LOAD_COMMAND');
 const next=clone(state);
 if(command==='act'){
   if(next.load>=next.capacity)return {applied:false,reason:'ACTION_CAPACITY_EXHAUSTED',state:next};
   next.load+=1; next.actions=(next.actions??0)+1;
 }else if(command==='recover'){
   if(next.load===0)return {applied:false,reason:'NO_LOAD_TO_RECOVER',state:next};
   next.load-=1; next.recoveryCost=(next.recoveryCost??0)+1;
 }else {next.load=0; next.restTurns=(next.restTurns??0)+1;}
 return {applied:true,command,available:next.capacity-next.load,state:next};
}

/** Passive index only; no active probe, auth bypass or arbitrary target scanning. */
export function inspectOwnedExposure({authorised,asset,inventory,banners}){
 fail(authorised===true,'ASSET_AUTHORIZATION_REQUIRED');
 fail(typeof asset==='string'&&asset.length>0,'ASSET_ID_REQUIRED');
 fail(Array.isArray(inventory)&&inventory.includes(asset),'ASSET_NOT_IN_OWNER_INVENTORY');
 fail(Array.isArray(banners),'BANNERS_INVALID');
 const exposures=banners.map(b=>{
   fail(b.asset===asset&&Number.isInteger(b.port)&&b.port>=1&&b.port<=65535,'BANNER_NOT_IN_SCOPE');
   return {port:b.port,transport:b.transport??'tcp',service:String(b.service??'unknown').slice(0,64),
      review:['telnet','ftp','rdp'].includes(String(b.service??'').toLowerCase())?'PRIORITY_REVIEW':'INVENTORY_REVIEW'};
 });
 return {asset,source:'supplied-index-fixture',mode:'PASSIVE_OFFLINE',exposures,activeScan:false,exploitation:false};
}

/** Rejects simulated evidence, weak RSSI, and unsupported biometric/pose crowns. */
export function assessSignal({source,mode,kind,measurements=[]}){
 fail(['RuView-reference','RouteSense'].includes(source),'RF_SOURCE_INVALID');
 fail(['synthetic','live'].includes(mode),'RF_MODE_INVALID');
 fail(['RSSI','CSI'].includes(kind),'RF_KIND_INVALID');
 fail(Array.isArray(measurements)&&measurements.every(x=>Number.isFinite(x)),'RF_VALUES_INVALID');
 const actual=mode==='live'&&measurements.length>=8;
 return {source,mode,kind,observed:actual,
   permissible:actual?(kind==='CSI'?['signal-quality','coarse-motion-research']:['signal-quality']):[],
   poseValidated:false,vitalsValidated:false,groundTruthRequired:true,
   proof:!actual?'NO_LIVE_MEASUREMENT':'RAW_VALUES_ONLY_NO_HUMAN_STATE_INFERENCE'};
}

/** Environment profiles only: neither an installation nor authorisation to test third parties. */
export function securityLabProfile(platform,{rooted=false,approvedTargets=[]}={}){
 fail(['Parrot','NetHunter-Rootless','NetHunter-Full'].includes(platform),'LAB_PLATFORM_INVALID');
 fail(Array.isArray(approvedTargets),'LAB_TARGETS_INVALID');
 if(platform==='NetHunter-Full')fail(rooted,'FULL_NETHUNTER_REQUIRES_DEVICE_SUPPORT_AND_ROOT');
 return {platform,workspace:platform==='Parrot'?'isolated VM/container':platform==='NetHunter-Rootless'?'unrooted Android userland':'supported rooted device',
   allows:'owned lab and expressly authorised systems only',approvedTargets:[...new Set(approvedTargets)],
   readyToInstall:false,permissionForThirdParty:false,physicalCompatibility:'NOT_TESTED'};
}

export function authoringBridge({learningGoal,nativeAction}){
 fail(typeof learningGoal==='string'&&learningGoal.trim().length>0,'LESSON_GOAL_REQUIRED');
 fail(Object.values(ROUTES).includes(nativeAction),'LESSON_ACTION_INVALID');
 return {source:'Scratch-reference',learningGoal,nativeAction,flow:['visible event','testable rule','Game-CODING source','JM GameCore execution'],
   scratchProjectGenerated:false,nativeExportGenerated:false};
}

export function compareEngineRoutes(input){
 const event=contactEvent(input),native=executeNativeControl(event);
 return {native,
   scratch:{role:'beginner visual authoring',implemented:'lesson route only'},
   unity:{role:'third-party runtime target',implemented:false},
   unreal:{role:'third-party 3D runtime target',implemented:false},
   godot:{role:'third-party runtime target',implemented:false},
   verdict:'Native JM state transition proved; external engine execution and render parity NOT_TESTED'};
}
