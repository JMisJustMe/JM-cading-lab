# JM Visual Systems Lab — Crown Pass HTML Body Plan v0.1

**Parent contract:** `CROWN_PASS_BUILD_SPEC_v0.1.md`  
**Build body:** Website / PWA first, exact-body Android carrier after proof  
**Rooms:** 00 Portal · 01 Illusion · 02 Image · 03 Video · 04 Motion · 05 Forge · 06 MUM · 07 Story · 08 Vault  
**Status:** IMPLEMENTATION-READY PLAN / NOT YET BUILT  

---

# 0. Whole HTML body

## 0.1 Root structure

```html
<body data-jm-body="visual-crown-pass" data-route="portal" data-motion="full">
  <canvas id="estateAtmosphere"></canvas>
  <div id="jmApp" class="jm-app">
    <header id="identityBand"></header>
    <nav id="routeBand"></nav>
    <main id="protectedWorld"></main>
    <section id="contactBand"></section>
    <nav id="recoveryBank"></nav>
    <aside id="traceBox"></aside>
    <aside id="toolDrawer"></aside>
    <div id="noticeLayer"></div>
  </div>
</body>
```

The root has one active route. Rooms are retained as governed bodies but only the active room receives animation and operating focus.

## 0.2 Main layers

```text
EstateAtmosphere      D0
RouteFrame            D1
Room CrownField       D1
Active visual bodies  D2
Contact / handles     D3
Drawer / TraceBox     D4
FaultHold / Receipt   D5
```

## 0.3 Shared custom elements or component functions

```text
<jm-crown-frame>
<jm-route-rail>
<jm-state-edge>
<jm-field-halo>
<jm-contact-pulse>
<jm-layer-badge>
<jm-trace-chip>
<jm-action-notice>
<jm-fault-hold>
<jm-receipt-plate>
<jm-meaning-plate>
<jm-grip-body>
<jm-contact-band>
<jm-recovery-bank>
```

Native custom elements are optional for the first pass; the component contracts are not optional.

---

# 1. Shared layout by viewport

## 1.1 Wide layout — 1024 CSS pixels and above

```text
┌ Identity Band ─────────────────────────────────────────────┐
├ Route Rail ────────────────────────────────────────────────┤
│ Room copy / state │ Protected Crown Field                 │
│                   │                                       │
├ Current Body ─────┴ ContactBand / room tools ─────────────┤
└ Recovery / trace access compressed into identity/tools ───┘
```

The room copy may remain visible beside the field.

## 1.2 Phone layout — below 780 CSS pixels

```text
┌ Compact identity + state + trace ┐
├ horizontally reachable route rail ┤
├ short route law / room title       ┤
│ PROTECTED CROWN FIELD              │
│                                    │
├ room ContactBand                   ┤
└ PREV · CONTACT · NEXT · RECOVER    ┘
```

Long prose disappears into a note drawer before the visual field is reduced.

## 1.3 Compact-height layout

At heights below 760 CSS pixels:

- identity mark reduces;
- room title reduces to one line where possible;
- route law becomes a compact operator string;
- ContactBand uses one-row controls or tool replacement;
- crown caption moves inside a safe lower edge;
- recovery remains visible.

---

# 2. Shared runtime state

```js
const crownState = {
  identity: {
    body: 'JM Estate — Visual Systems Lab',
    version: 'Crown Pass 0.1',
    baseline: 'v0.1.0',
    crownStatus: 'NOT_CROWNED'
  },
  route: 'portal',
  previousRoute: null,
  viewport: {
    width: 0,
    height: 0,
    compactHeight: false,
    phone: false,
    safeBottom: 0
  },
  motionPreference: 'full',
  performanceMode: 'auto',
  rooms: {},
  assets: {},
  layers: [],
  story: [],
  storage: {
    mode: 'persistent',
    pressure: 'none',
    lastSafeSnapshot: null
  },
  trace: [],
  recovery: [],
  receipts: []
};
```

Every room owns a namespaced state object but writes through the same JMLogic contact and trace routes.

---

# 3. 00 PORTAL — Estate entrance / route constellation

## 3.1 Role

Make the whole body understandable in seconds and provide a live visual before media is loaded.

## 3.2 Visual identity

```text
Atmosphere: ceremonial dark chamber
Primary material: Obsidian Field + Gold Route Metal
Signal: restrained cyan constellation
Motion species: slow route orbit / breath
Frame: gateway / aperture
```

## 3.3 Main scene

A central estate aperture holds the active live field. Nine route nodes orbit or arrange around it. Hover/touch reveals route role; contact enters the room.

The portal must not be a card grid. It is a route constellation.

## 3.4 HTML organs

```html
<section id="room-portal" class="room" data-room="portal">
  <header class="room-intro">...</header>
  <jm-crown-frame profile="portal">
    <canvas id="portalField"></canvas>
    <div id="routeConstellation"></div>
    <jm-meaning-plate>THE VISUAL SHOULD REVEAL THE ROUTE</jm-meaning-plate>
  </jm-crown-frame>
</section>
```

## 3.5 Contacts

- select route node;
- drag / rotate constellation lightly;
- primary contact enters selected route;
- Quick returns to first live experiment;
- Recover resets constellation, not the estate state.

## 3.6 State route

```text
WAITING → ORIENTED → ROUTE_SELECTED → ENTERING → ROUTED
```

## 3.7 Trace events

`PORTAL_ORIENT`, `ROUTE_PREVIEW`, `ROUTE_CHANGE`.

## 3.8 Proof gates

- all nine routes visible or reachable;
- first contact enters a room;
- active live field starts without upload;
- no horizontal page overflow;
- route constellation is readable in reduced motion.

---

# 4. 01 ILLUSION — Prediction and proof chamber

## 4.1 Role

Prediction enters before measurement. The room makes perception, contextual pressure and reveal order visible.

## 4.2 Visual identity

```text
Atmosphere: scientific theatre
Primary material: Gold Route Metal on deep blue-black
Secondary material: measured ivory
Motion species: controlled optical pressure
Frame: proof chamber / measuring instrument
```

## 4.3 Bodies

Minimum Crown Pass set:

1. Müller–Lyer / directional pressure;
2. Rubin / figure-ground authority;
3. Peripheral drift / felt motion;
4. Checker shadow / contextual shade;
5. Ebbinghaus / comparative scale;
6. Café wall / alignment pressure.

Each body must have distinct geometry and reveal logic, not one renderer with renamed presets.

## 4.4 Main organs

```html
<div class="prediction-bank">A · EQUAL · B</div>
<jm-crown-frame profile="illusion">
  <canvas id="illusionField"></canvas>
  <div id="measureOverlay"></div>
  <jm-state-edge id="illusionState"></jm-state-edge>
  <div class="field-caption"></div>
</jm-crown-frame>
<div class="illusion-contact-band">
  body select · angle / context · pressure · REVEAL · STORY
</div>
```

## 4.5 Graphics pass

- sub-pixel-clean geometry;
- authored background material per illusion;
- measure guides animate from source points, not fade in generically;
- prediction selection creates a subtle foreground ContactPulse;
- reveal cools the field and introduces measured ivory;
- contextual pressure uses depth / light rather than arbitrary glow.

### Checker Shadow specific

- cylinder receives directional key, fill and base occlusion;
- cast shadow uses controlled penumbra;
- measured squares receive identical overlay swatches after reveal;
- source-hidden label becomes source-revealed receipt.

## 4.6 State route

```text
PREDICT → CONTACT → PRESSURE → REVEAL → COMPARE → TRACE → STORY
```

## 4.7 Primary action

`REVEAL` before reveal; `COMPARE` after reveal.

## 4.8 Recovery

Returns to source-hidden state while preserving prediction receipt in trace.

## 4.9 Proof gates

- prediction required or explicitly skipped;
- reveal changes measure state visibly;
- source equality / difference is stated accurately per body;
- Story receives an image plus experiment metadata;
- changing illusion body does not retain invalid parameters.

---

# 5. 02 IMAGE — Source-preserving visual treatment desk

## 5.1 Role

Edit without losing the source. Treatment remains a readable state layer.

## 5.2 Visual identity

```text
Atmosphere: studio / x-ray table
Primary material: Archive Glass + Source Paper
Accent: treatment cyan with gold source edge
Motion species: lens / split / treatment sweep
Frame: light table
```

## 5.3 Intake routes

- file picker;
- drag and drop;
- paste from clipboard where browser permits;
- restore last session asset reference;
- no automatic remote upload.

## 5.4 Treatment stack

```text
exposure
contrast
saturation
hue
blur
temperature
vignette
rotation
flipX
flipY
crop / framing transform (bounded first body)
```

Treatments remain parameters until export.

## 5.5 Main organs

```html
<jm-crown-frame profile="image">
  <canvas id="imageField"></canvas>
  <div id="dropField"></div>
  <div id="compareCurtain"></div>
  <jm-state-edge></jm-state-edge>
</jm-crown-frame>
<jm-contact-band>
  source · treatment tabs · compare · reset · STORY · EXPORT
</jm-contact-band>
```

## 5.6 Graphics pass

- source receives a gold identity rim;
- treatment view uses cyan state edge;
- compare mode uses a draggable split or hold curtain;
- active adjustment receives localised light, not whole-room flashing;
- export creates a brief shutter / ReceiptPlate consequence.

## 5.7 Storage route

Original source and treatment parameters go to IndexedDB. Thumbnails only enter list views. `localStorage` stores the source ID, not image data.

## 5.8 State route

```text
WAITING → SOURCE_READY → TREATING → COMPARING → CAPTURE_READY → EXPORTED
```

## 5.9 Primary action

`LOAD SOURCE` when empty; `EXPORT IMAGE` when live.

## 5.10 Recovery

- Reset treatment: parameter defaults;
- Recover source: last safe treatment snapshot;
- Replace source: explicit action with confirmation if unsaved.

## 5.11 Proof gates

- source remains recoverable;
- compare reveals untreated source;
- large image does not enter localStorage;
- export dimensions and format stated;
- object URLs revoked after replacement.

---

# 6. 03 VIDEO — Frame and timing analysis bay

## 6.1 Role

Inspect motion before claiming the edit. Provide bounded editing and precise Story capture without pretending to be a full NLE.

## 6.2 Visual identity

```text
Atmosphere: edit bay / analysis monitor
Primary material: dark monitor glass
Accent: gold timing marks + cyan play state
Motion species: scan / time / shuttle
Frame: monitor station
```

## 6.3 Intake and playback

- local file;
- drag/drop;
- no upload;
- play/pause;
- frame step using source frame-rate estimate with documented fallback;
- speed 0.25×–2×;
- contrast / brightness preview treatment;
- in / out trim markers;
- loop selected range;
- capture current frame to Story.

## 6.4 Main organs

```html
<jm-crown-frame profile="video">
  <video id="videoSource"></video>
  <canvas id="videoOverlay"></canvas>
  <div id="timecode"></div>
  <div id="captureFlash"></div>
</jm-crown-frame>
<div id="timelineBody">
  in marker · playhead · out marker · frame ticks
</div>
<jm-contact-band>
  play · frame− · frame+ · speed · LOOP · CAPTURE
</jm-contact-band>
```

## 6.5 Graphics pass

- monitor bevel and restrained scan line;
- tactile shuttle response;
- current frame receives a precise gold timing edge;
- capture triggers a short ivory flash and ReceiptPlate;
- Story handoff visibly travels as a frame token, reduced-motion safe.

## 6.6 State route

```text
WAITING → SOURCE_READY → PLAYING / HELD → RANGE_SET → FRAME_CONTACT → CAPTURED
```

## 6.7 Primary action

`LOAD VIDEO` when empty; `CAPTURE FRAME` when loaded.

## 6.8 Recovery

Returns playback and preview treatment to last safe state without deleting the source.

## 6.9 Proof gates

- frame capture has timecode and source metadata;
- in/out markers cannot invert silently;
- loop range behaves accurately;
- replaced videos revoke previous object URL;
- captured frames route to IndexedDB and Story.

---

# 7. 04 MOTION — Connected-difference field

## 7.1 Role

Show movement as repeated difference with preserved relation. Each motion body must be a different movement species.

## 7.2 Visual identity

```text
Atmosphere: living field
Primary material: cyan signal particles / ribbons
Authority: gold relation lines
Frame: field chamber
```

## 7.3 Motion species

### Orbit

Bodies preserve centre relation while pressure changes phase and eccentricity.

### Tunnel

Scale and depth progression create route-through-space.

### Breathe

Field expands and contracts with preserved topology.

### Ribbon

Continuous path carries pressure, direction and memory.

### Storm

Multiple local forces compete while the field retains a governed centre / boundary.

Each species gets its own renderer class or clearly separated algorithm.

## 7.4 Main organs

```html
<jm-crown-frame profile="motion">
  <canvas id="motionField"></canvas>
  <div id="motionVectorReadout"></div>
  <jm-state-edge></jm-state-edge>
</jm-crown-frame>
<jm-contact-band>
  species · speed · density · pull · pressure · HOLD / RESUME · CAPTURE
</jm-contact-band>
```

## 7.5 Direct field contact

Pointer / touch position becomes a temporary force body. Hold increases contact pressure; release creates a cooling trace.

## 7.6 Graphics pass

- background field carries very slow memory;
- midground carries relation paths;
- foreground contact particles receive sharper material and higher luminance;
- particle size, count and blur obey field size and performance mode;
- motion trails cool rather than disappear abruptly.

## 7.7 State route

```text
RUNNING → CONTACT → PRESSURE → RELEASE → COOLING → HELD / CAPTURED
```

## 7.8 Primary action

`HOLD FIELD` / `RESUME FIELD`, depending state. Capture is crowned when a still derivative is requested.

## 7.9 Recovery

Resets field seed and parameters, retaining the selected species unless Full Recover is chosen.

## 7.10 Proof gates

- each species has visibly distinct motion;
- hidden room loop stops;
- reduced motion produces a readable static / low-motion field;
- touch contact affects the field;
- capture routes to Story with species and parameters.

---

# 8. 05 FORGE — Visualang authored-body chamber

## 8.1 Role

Separate visual intention into governed fields, then form a reusable body. This is not falsely presented as a connected generator.

## 8.2 Visual identity

```text
Atmosphere: language smithy
Primary material: Source Paper / dark metal
Accent: heated gold at formation points
Motion species: gathering marks / cooling receipt
Frame: forge table
```

## 8.3 Input bodies

```text
subject
field
light
material
motion
frame
meaning
colour relation
exclusions
proof requirement
```

## 8.4 Output bodies

- governed visual brief;
- compact prompt body;
- room profile draft;
- Story meaning frame;
- MUM MeaningPlate layer;
- clipboard copy;
- JSON export.

## 8.5 Main organs

```html
<div id="forgeInputs" class="source-rack"></div>
<jm-crown-frame profile="forge">
  <div id="forgeField"></div>
  <jm-meaning-plate id="formedBody"></jm-meaning-plate>
  <jm-receipt-plate id="forgeReceipt"></jm-receipt-plate>
</jm-crown-frame>
<jm-contact-band>
  FORM BODY · COPY · SEND TO MUM · SEND TO STORY · EXPORT
</jm-contact-band>
```

## 8.6 Graphics pass

- inputs appear as named source strips, not a generic form grid;
- Contact draws source strips toward a central formation line;
- formed output arrives as an Ivory MeaningPlate;
- export cools heated gold into archive gold;
- empty / contradictory fields receive a contained FaultHold.

## 8.7 State route

```text
SOURCE_OPEN → AIMED → FORMING → FORMED → COOLED → ROUTED
```

## 8.8 Primary action

`FORM BODY`.

## 8.9 Recovery

Restores last formed body and preserves editable inputs.

## 8.10 Proof gates

- output shows all populated fields;
- no generation claim is made;
- MUM and Story handoffs preserve source field names;
- copy and export produce identical governed text content.

---

# 9. 06 MUM — Composition without erasure

## 9.1 Role

The principal Crown Pass composition body. Source bodies enter a shared field, retain identity, interact, and produce a flattened derivative only on explicit capture.

## 9.2 Visual identity

```text
Atmosphere: sacred compositor / meaning reactor
Primary material: Obsidian Field
Authority: Gold Route Metal
Living signal: Cyan
Language: Ivory Meaning Plate
Motion species: layer resonance / shared pressure
Frame: double crown / composition altar
```

## 9.3 Layer types

```text
ILLUSION_BODY
MOTION_BODY
IMAGE_BODY
MEANING_BODY
GEOMETRY_BODY
FIELD_EFFECT
BACKDROP
```

## 9.4 Layer model

```js
{
  id,
  sourceBody,
  type,
  name,
  visible,
  locked,
  opacity,
  blendMode,
  transform: { x, y, scale, rotation },
  z,
  parameters,
  assetId,
  traceSource
}
```

## 9.5 Main organs

```html
<section id="room-mum" data-room="mum">
  <div id="mumSourceRack"></div>
  <jm-crown-frame profile="mum">
    <canvas id="mumBackdrop"></canvas>
    <div id="mumLayerStage"></div>
    <canvas id="mumEffects"></canvas>
    <div id="mumGuides"></div>
    <div id="mumCaptureFlash"></div>
  </jm-crown-frame>
  <div id="mumLayerRail"></div>
  <jm-contact-band>
    ADD BODY · SELECT · TRANSFORM · ORDER · VISIBILITY · CAPTURE
  </jm-contact-band>
</section>
```

## 9.6 Direct manipulation

`jm-grip-body` provides:

- drag;
- scale corners;
- rotation handle;
- snap lines;
- bounds;
- lock;
- selected-state LayerBadge.

On phone, tools replace the ContactBand through compact tabs; the visual field does not grow vertically.

## 9.7 Graphics pass

### Backdrop

- depth gradient with controlled field grain;
- low-frequency gold/cyan atmospheric relation;
- vignette protects composition focus.

### Illusion body

- sharp gold geometry;
- measure / context identity preserved;
- no automatic blending into particles.

### Motion body

- cyan kinetic trail;
- parameterised density and pressure;
- selectable clipping bounds.

### Meaning body

- Ivory plate or free inscription;
- type hierarchy and measure controls;
- arrival animation tied to placement / capture state.

### Image body

- framed source identity;
- treatment derivative can be selected without replacing original reference.

### Selected body

- readable gold/cyan bounds;
- handles remain visible without dominating exported capture.

## 9.8 Capture route

```text
EDITABLE LAYER TREE
→ CAPTURE REQUEST
→ TEMPORARY HIGH-QUALITY COMPOSITE
→ FLATTENED PNG DERIVATIVE
→ STORY FRAME + TRACE METADATA
→ EDITABLE LAYER TREE REMAINS
```

Capture may not replace the editable composition.

## 9.9 Storage-pressure route

When storage pressure occurs:

- current layer tree remains in memory;
- large auto-snapshots pause;
- compact ActionNotice appears above the ContactBand, not over the field;
- options: `EXPORT`, `TRIM`, `MEMORY ONLY`;
- repeated failures collapse into one persistent notice state.

## 9.10 State route

```text
EMPTY → SOURCES_PRESENT → COMPOSING → BODY_SELECTED → PRESSURE → ARRIVAL → CAPTURED → ROUTED
```

## 9.11 Primary action

`CAPTURE COMPOSITION`.

## 9.12 Recovery

- undo last transform;
- restore last safe layer tree;
- Full Recover clears derivative history only after confirmation;
- source assets remain in Vault.

## 9.13 Proof gates

- at least four source types can coexist;
- source names and layer order remain visible;
- independent hide / lock / remove works;
- capture derivative excludes edit handles;
- Story receives composite plus layer manifest;
- storage fault does not cover field or destroy composition;
- import restores transforms and order.

---

# 10. 07 STORY — Sequence and meaning rail

## 10.1 Role

Carry frames from Illusion, Image, Video, Motion, Forge and MUM into a governed sequence.

## 10.2 Visual identity

```text
Atmosphere: storyboard room / filmstrip archive
Primary material: Archive Glass + Source Paper
Accent: gold sequence line
Motion species: rail movement / frame landing
Frame: sequence chamber
```

## 10.3 Frame model

```js
{
  id,
  kind,
  sourceRoom,
  sourceBody,
  assetId,
  thumbnailId,
  caption,
  meaning,
  durationHint,
  traceLinks,
  editableSourceRef,
  createdAt
}
```

## 10.4 Main organs

```html
<jm-crown-frame profile="story">
  <div id="storyStage"></div>
  <div id="storyRail"></div>
  <div id="storyPlayhead"></div>
</jm-crown-frame>
<jm-contact-band>
  PREVIEW · CAPTION · MOVE · REMOVE · EXPORT HTML · EXPORT JSON
</jm-contact-band>
```

## 10.5 Graphics pass

- frames sit on a visible gold route line;
- source room appears as a small LayerBadge;
- active frame lifts into the Story Stage;
- drag creates a visible insertion route;
- export forms a bound ReceiptPlate.

## 10.6 Standalone HTML export

Must include:

- responsive sequence;
- images embedded or packaged with manifest;
- captions and source room;
- no app controls;
- export receipt and claim boundary;
- readable offline.

## 10.7 State route

```text
EMPTY → FRAMES_PRESENT → ORDERING → CAPTIONING → PREVIEWING → EXPORTED
```

## 10.8 Primary action

`EXPORT STORY` when populated; `ADD FRAME` when empty.

## 10.9 Recovery

Undo reorder / deletion; restore last safe Story snapshot.

## 10.10 Proof gates

- reorder persists;
- captions persist;
- full assets do not render in the rail unnecessarily;
- HTML opens standalone;
- JSON restores editable sequence;
- source links remain traceable.

---

# 11. 08 VAULT — Session, proof and recovery chamber

## 11.1 Role

The estate memory and proof room. It stores references, sessions, exports, traces, faults and bounded receipts.

## 11.2 Visual identity

```text
Atmosphere: archive / receipt chamber
Primary material: Archive Glass
Authority: cooled gold
Fault: contained red-amber, never page-wide panic
Motion species: cooling / filing / retrieval
Frame: ledger vault
```

## 11.3 Shelves

```text
SESSION
ASSETS
STORY
COMPOSITIONS
TRACE
RECEIPTS
FAULTS
DELIVERY
```

## 11.4 Main organs

```html
<div id="vaultShelves"></div>
<jm-crown-frame profile="vault">
  <div id="vaultLedger"></div>
  <jm-receipt-plate id="activeReceipt"></jm-receipt-plate>
  <jm-fault-hold id="activeFault"></jm-fault-hold>
</jm-crown-frame>
<jm-contact-band>
  EXPORT SESSION · IMPORT · TRIM · RECOVER · GENERATE DING
</jm-contact-band>
```

## 11.5 Session export

First preferred body:

- `.jmvisual` JSON for bounded assets / references;
- ZIP package when binary assets must travel;
- manifest includes bytes and SHA-256 where generated by delivery tooling;
- import performs schema validation before mutation;
- import previews contents and claim boundary.

## 11.6 Ding generation

Ding reads actual state and proof events. It reports:

- routes exercised;
- exports completed;
- recoveries passed;
- viewport / delivery proof references;
- unresolved faults;
- claim boundary.

No trace means no Ding.

## 11.7 State route

```text
LEDGER_READY → BODY_SELECTED → EXPORTING / IMPORTING → VERIFIED → FILED → DING
```

## 11.8 Primary action

Contextual:

- `EXPORT SESSION` during storage pressure;
- `IMPORT SESSION` when empty;
- `GENERATE DING` when proof conditions exist.

## 11.9 Recovery

Vault owns global recovery selection but does not bypass room recovery laws.

## 11.10 Proof gates

- export → clear → import restores route, parameters, Story and MUM layers;
- invalid schema enters FaultHold without mutating current state;
- trim removes old snapshots, not current assets silently;
- Ding refuses when required proof is missing;
- storage estimate and pressure state are stated without pretending exact quota certainty.

---

# 12. Route rail and deep links

Canonical URL forms:

```text
#portal
#illusion/muller
#image
#video
#motion/orbit
#forge
#mum
#story
#vault
```

The route body must:

- restore the hash on load;
- update history without full reload;
- support browser Back / Forward;
- reject unknown routes into Portal with trace;
- never encode large session state into the URL.

---

# 13. ContactBand profiles

The ContactBand uses a shared shell and room-provided slots.

```js
const contactProfile = {
  primary: { id, label, event, enabled },
  secondary: [],
  parameters: [],
  tools: [],
  statusLine,
  recoveryLabel
};
```

On phone:

- maximum two persistent parameter controls beside the primary action;
- additional tools enter a replacement drawer;
- action labels remain readable;
- no duplicated primary action in both field and action bank.

---

# 14. Notice placement

## TraceChip

Phone: between room field and ContactBand, maximum one line.  
Wide: lower-right of room frame, outside the essential visual centre.

## ActionNotice

Phone: replaces the ContactBand status line and supplies one action.  
Wide: anchored to ContactBand.

## FaultHold

Replaces the failed room tool / field only as necessary. Global identity, routes, trace and recovery remain reachable.

Forbidden:

- centre-screen storage toast over MUM;
- notice covering primary action;
- repeated notices stacking;
- fault modal with no recovery route.

---

# 15. CSS architecture

```text
00 tokens
01 reset / accessibility
02 RouteFrame
03 shared primitives
04 room shell
05 Portal profile
06 Illusion profile
07 Image profile
08 Video profile
09 Motion profile
10 Forge profile
11 MUM profile
12 Story profile
13 Vault profile
14 drawers / trace / notices
15 responsive pressure rules
16 reduced motion
17 print / exported receipt
```

Room accents are set through CSS custom properties on `[data-room-profile]`.

Example:

```css
[data-room-profile="mum"] {
  --room-accent: var(--gold-route);
  --room-signal: var(--cyan-living);
  --room-meaning: var(--ivory-meaning);
  --room-field: var(--obsidian-field);
  --room-frame-style: double;
}
```

---

# 16. JavaScript build order

## Pass A — shared operating body

1. viewport / safe-area measurement;
2. route and deep-link controller;
3. JMLogic state / trace API;
4. ContactBand shell;
5. notices / FaultHold;
6. storage body;
7. session export/import;
8. animation lifecycle manager.

## Pass B — visual primitives

1. CrownFrame;
2. FieldHalo;
3. ContactPulse;
4. StateEdge;
5. LayerBadge;
6. MeaningPlate;
7. ReceiptPlate;
8. GripBody.

## Pass C — language-establishing rooms

1. Illusion;
2. Motion;
3. MUM.

## Pass D — media and meaning rooms

1. Image;
2. Video;
3. Forge.

## Pass E — sequence and estate rooms

1. Story;
2. Vault;
3. Portal final constellation.

---

# 17. First implementation checkpoint

The first Crown Pass HTML checkpoint is accepted when it contains:

- new RouteFrame and ContactBand;
- machine-loaded design tokens and room profiles;
- Portal, Illusion, Motion and MUM upgraded graphics;
- working IndexedDB storage body;
- storage-pressure ActionNotice outside the visual centre;
- MUM editable layer tree and capture derivative;
- Story capture intake;
- Vault whole-session export/import;
- phone fit at 412×915 and 360×800;
- desktop fit at 1440×900 and laptop fit at 1366×768;
- clean screenshots;
- v0.1 recovery link.

Image, Video and Forge may initially retain bounded v0.1 behaviour only if their source preservation and route contracts remain valid; they must receive their full room crown before final Crown Pass Ding.

---

# 18. Final assembly line

```text
v0.1 PROVED BASELINE
→ CROWN PASS CONTRACT
→ TOKENS + ROOM PROFILES
→ SHARED SURFACE CROWN
→ ILLUSION / MOTION / MUM LANGUAGE
→ IMAGE / VIDEO / FORGE CROWN
→ STORY / VAULT RECOVERY
→ PORTAL ASSEMBLY
→ STORAGE FAULT PROOF
→ REAL VIEWPORT PROOF
→ CLEAN-FRAME INSPECTION
→ WEBSITE / PWA RECEIPT
→ EXACT-BODY ANDROID DEBUG APK
→ USER PLAYTEST
→ FREEZE / LOCK / ANCHOR
```

The body remains **NOT CROWNED** until the evidence earns a later claim.
