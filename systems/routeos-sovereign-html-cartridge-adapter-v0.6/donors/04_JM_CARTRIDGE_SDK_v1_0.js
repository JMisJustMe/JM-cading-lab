/*
JM Cartridge SDK v1.0
Declarative package builder and validator for RouteOS v103.0.
No external dependencies.
*/
(function(global){
  "use strict";
  const STANDARD="JM-CARTRIDGE/1.0";
  const SDK="JM-CARTRIDGE-SDK/1.0";
  const ALLOWED_PERMISSIONS=new Set([
    "runtime.action","runtime.state","save.read","save.write",
    "profile.read","capability.read","trace.write"
  ]);
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==="object"){
      const output={};
      Object.keys(value).sort().forEach(key=>output[key]=stable(value[key]));
      return output
    }
    return value
  }
  function fnv1a(text){
    let hash=0x811c9dc5;
    const bytes=new TextEncoder().encode(text);
    for(const byte of bytes){
      hash^=byte;hash=Math.imul(hash,0x01000193)>>>0
    }
    return hash.toString(16).padStart(8,"0")
  }
  function canonical(packageBody){
    const core={
      recordType:packageBody.recordType,
      standard:packageBody.standard,
      manifest:JSON.parse(JSON.stringify(packageBody.manifest||{})),
      runtime:JSON.parse(JSON.stringify(packageBody.runtime||{}))
    };
    return JSON.stringify(stable(core))
  }
  function sign(packageBody){
    const copy=JSON.parse(JSON.stringify(packageBody));
    copy.integrity={algorithm:"FNV1A32",value:fnv1a(canonical(copy))};
    return copy
  }
  function validate(packageBody={}){
    const errors=[],warnings=[];
    const manifest=packageBody.manifest||{},runtime=packageBody.runtime||{};
    if(packageBody.recordType!=="JMCartridgePackage")errors.push("recordType must be JMCartridgePackage");
    if(packageBody.standard!==STANDARD)errors.push("Unsupported standard");
    if(!manifest.id)errors.push("manifest.id is required");
    if(!manifest.title)errors.push("manifest.title is required");
    if(!/^\d+\.\d+\.\d+$/.test(String(manifest.version||"")))errors.push("manifest.version must use x.y.z");
    if(manifest.runtimeApi!==SDK)errors.push("Unsupported runtime API");
    if(!manifest.saveNamespace)errors.push("saveNamespace is required");
    if(!runtime.baseCartridge)errors.push("runtime.baseCartridge is required");
    const blocked=(manifest.permissions||[]).filter(permission=>!ALLOWED_PERMISSIONS.has(permission));
    if(blocked.length)errors.push("Unsupported permissions: "+blocked.join(", "));
    const actual=fnv1a(canonical(packageBody));
    if(packageBody.integrity?.value&&packageBody.integrity.value!==actual)errors.push("Integrity mismatch");
    if(manifest.trust!=="FIRST_PARTY")warnings.push("Package is not first-party trusted");
    return{valid:!errors.length,errors,warnings,integrity:{actual,expected:packageBody.integrity?.value||null}}
  }
  function create(config={}){
    return sign({
      recordType:"JMCartridgePackage",standard:STANDARD,
      manifest:{
        id:config.id||"creator.new-cartridge",
        title:config.title||"New Cartridge",
        version:config.version||"0.1.0",
        publisher:config.publisher||"Creator",
        trust:config.trust||"UNTRUSTED",
        description:config.description||"",
        icon:config.icon||"＋",accent:config.accent||"violet",
        entry:"runtime",runtimeApi:SDK,
        playerCount:{min:1,max:1},offline:true,
        permissions:config.permissions||["runtime.action","runtime.state","save.write","trace.write"],
        requiredActions:config.requiredActions||["STEER","FIRE","HOME","PAUSE"],
        optionalActions:config.optionalActions||["AIM","DASH","CARD","RECOVER"],
        requiredAnalog:config.requiredAnalog||["STEER"],
        saveNamespace:config.saveNamespace||config.id||"creator.new-cartridge",
        saveVersion:"1",tags:config.tags||[]
      },
      runtime:{
        baseCartridge:config.baseCartridge||"blank-world",
        scenePatch:config.scenePatch||{
          title:config.title||"New Cartridge",
          rules:{shotSpeed:12,bounce:.8,card:"shield"},
          player:{x:120,y:270},roomNames:["START","TEST","CORRECT","KEEP"],
          packageData:{},addObjects:[]
        },
        hooks:config.hooks||{}
      }
    })
  }
  global.JMCartridgeSDK={STANDARD,SDK,create,sign,validate,fnv1a,canonical};
})(globalThis);
