# JM Universal Forge v3.0.0 — Cading source identity

```cading
module com.jm.androidforge.selfhost
family: JM Universal Forge
owner: Theodore Benjamin Scott / JM
version: 3.0.0

body Cading
body Kading
body JMLogic
body FlowTalk
body RouteCode
body Quadze
body OneBody IR
body CadenVM
body CodeHand
body RouteOS
body TraceBox
body THEO
body Build Gates
body Zionfolder

android:
  package: com.jm.androidforge.selfhost
  appName: JM Universal Forge
  artifactName: JM_UNIVERSAL_FORGE_v3_0_0
  versionName: 3.0.0
  versionCode: 300
  minSdk: 23
  targetSdk: 36
  compileSdk: 36
  orientation: unspecified
  capabilities: files, share, clipboard, vibration, install, network, camera, microphone, location, notifications, bluetooth, contacts, calendar
end

flow sovereignProduction:
  step sourceGate
  step intentLock
  step logicGate
  step bodyRuntime53
  step securityAudit
  step oneBody
  step webPwa
  step browserApk
  step localDebugApk
  step ownerReleaseApk
  step officialAab
  step aabDerivedApk
  step deviceProof
  step storePreflight
  step receipt
end

route phone -> sovereignProduction
route laptop -> sovereignProduction
route sovereignProduction -> receipt
boundary store-acceptance-and-human-use-remain-external
ding JM-authority-after-real-use
```

The full exact source body is compiled from the owner/public-safe Zionfolder with the exported official build room. This readable identity file is not a substitute for the complete source archive or its hash receipt.
