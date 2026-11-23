/**
 * JM FTR RouteSense × RuView discovery: honest offline signal-feature processing.
 * This does NOT decode human pose, breathing, heartbeat or prove real sensing.
 * Hardware-backed CSI capture and labelled ground truth must be separately obtained.
 */
const need=(good,code)=>{if(!good)throw Object.assign(new Error(code),{code});};
export function summariseSignalWindow({route='RouteSense',kind='RSSI',origin='synthetic',samples,rateHz=10}){
 need(['RouteSense','RuView-reference'].includes(route),'RF_SOURCE_INVALID');
 need(['RSSI','CSI-amplitude'].includes(kind),'RF_KIND_INVALID');
 need(['synthetic','recorded','live-unverified'].includes(origin),'RF_ORIGIN_INVALID');
 need(Array.isArray(samples)&&samples.length>=8&&samples.length<=4096&&samples.every(Number.isFinite),'RF_SAMPLE_INVALID');
 need(Number.isFinite(rateHz)&&rateHz>0&&rateHz<=2000,'RF_RATE_INVALID');
 const n=samples.length,mean=samples.reduce((a,b)=>a+b,0)/n;
 const variance=samples.reduce((sum,v)=>sum+(v-mean)**2,0)/n;
 const avgChange=samples.slice(1).reduce((sum,v,i)=>sum+Math.abs(v-samples[i]),0)/(n-1);
 const drift=samples[n-1]-samples[0];
 return {schema:'jm.ftr.signal-feature/0.1',route,kind,origin,sampleCount:n,rateHz,
   features:{mean,variance,stdDev:Math.sqrt(variance),avgChange,drift},
   observedFromPhysicalSensor:false,groundTruthAttached:false,
   humanPresence:'NOT_INFERRED',humanPose:'NOT_INFERRED',vitalSigns:'NOT_INFERRED'};
}
export function compareSignalWindows(baseline,current,{ownedEnvironment=false,consent=false}={}){
 need(ownedEnvironment&&consent,'RF_ENVIRONMENT_AUTH_REQUIRED');
 need(baseline?.schema==='jm.ftr.signal-feature/0.1'&&current?.schema===baseline.schema,'RF_FEATURE_PROOF_REQUIRED');
 need(baseline.kind===current.kind,'RF_KIND_MISMATCH');
 const change=Math.abs(current.features.mean-baseline.features.mean);
 const dispersionDelta=current.features.stdDev-baseline.features.stdDev;
 return {schema:'jm.ftr.signal-comparison/0.1',kind:current.kind,meanDelta:change,dispersionDelta,
   route:'candidate signal disturbance for owner research only',
   proof:'OFFLINE_FEATURE_COMPARISON',
   presenceDetected:false,biometricClaim:false,autoGameplayTrigger:false,
   calibration:'LAB_ONLY_NO_LIVE_VALIDATION'};
}
