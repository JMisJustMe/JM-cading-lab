
const BRANCHES = [
  {
    "id": "central-switchboard",
    "name": "Central Switchboard",
    "header": "Runtime / Governance",
    "rail": "Archive / Memory / Re-entry",
    "role": "Master routing and branch index. Keeps map; does not absorb branches.",
    "receives": "All branch receipts, cards, updates",
    "feeds": "Every active branch",
    "lock": "Master router; not replaced by LiveForge",
    "keywords": [
      "switchboard",
      "index",
      "route",
      "master",
      "hub",
      "branch",
      "connection",
      "rollout"
    ]
  },
  {
    "id": "flowtalk",
    "name": "FlowTalk",
    "header": "Language / FlowTalk / Mouth Route",
    "rail": "Voice / Rhythm / Performance",
    "role": "Readable translation from source to usable output.",
    "receives": "JM syntax, branch material, raw notes",
    "feeds": "Every product body and public-safe explanation",
    "lock": "Readable first; code later when needed",
    "keywords": [
      "flowtalk",
      "translate",
      "readable",
      "meaning",
      "mouth",
      "language",
      "speech",
      "explain"
    ]
  },
  {
    "id": "jm32",
    "name": "JM32-1DA Governance",
    "header": "Runtime / Governance",
    "rail": "Trace / Route / Recovery",
    "role": "Runtime governance: claim-status, Ding, trace, anti-drift.",
    "receives": "Syntax, source, contact field, route pressure",
    "feeds": "All chats, builds, receipts",
    "lock": "Show the route; do not admire syntax only",
    "keywords": [
      "jm32",
      "governance",
      "claim",
      "ding",
      "trace",
      "route",
      "runtime",
      "syntax",
      "status"
    ]
  },
  {
    "id": "gamecore",
    "name": "JM GameCore v0.2I",
    "header": "Game Engines / Playable Systems",
    "rail": "Playable Systems",
    "role": "Donor-estate build standard for games/apps.",
    "receives": "JMSTUDIOSB0_8, engines, controls, donor pool",
    "feeds": "GameForge, GlyphPlay, LiveForge builds",
    "lock": "Estate is donor now; not screenshot",
    "keywords": [
      "gamecore",
      "game",
      "engine",
      "donor",
      "estate",
      "intake",
      "playable",
      "arena"
    ]
  },
  {
    "id": "bodymesh",
    "name": "BodyMesh / OneGame",
    "header": "Source Vault / Archive / Lyrics",
    "rail": "Archive / Memory / Re-entry",
    "role": "Independent estate backup and common-body compilation route.",
    "receives": "Estate sources, common-body material",
    "feeds": "Archive, recovery, branch restoration",
    "lock": "Mesh does not mean merge",
    "keywords": [
      "bodymesh",
      "backup",
      "mesh",
      "merge",
      "common",
      "estate",
      "compilation"
    ]
  },
  {
    "id": "liveforge",
    "name": "LiveForge",
    "header": "Outputs / Exports / Receipts",
    "rail": "Public / Product / QA",
    "role": "Product-making fork bench. Turns routed material into usable output bodies.",
    "receives": "Switchboard route, FlowTalk translation, JM32 governance",
    "feeds": "Product packs, dashboards, receipts, prototypes",
    "lock": "Bench, not hub",
    "keywords": [
      "liveforge",
      "fork",
      "bench",
      "product",
      "prototype",
      "package",
      "build",
      "export"
    ]
  },
  {
    "id": "tracebox",
    "name": "TraceBox / RouteBox",
    "header": "Proof / Trace / Empiramid",
    "rail": "Trace / Route / Recovery",
    "role": "Proof, trace, model, reset, recover route.",
    "receives": "State changes, faults, evidence",
    "feeds": "Receipts, QA, recovery notes",
    "lock": "No trace, no crown",
    "keywords": [
      "tracebox",
      "routebox",
      "trace",
      "proof",
      "recovery",
      "reset",
      "evidence"
    ]
  },
  {
    "id": "jmisjustme",
    "name": "JMISJUSTME Living Estate",
    "header": "Outputs / Exports / Receipts",
    "rail": "Public / Product / QA",
    "role": "Standalone website body for the JM Estate.",
    "receives": "Packaged estate outputs, pages, source bodies",
    "feeds": "Public display route, website rooms",
    "lock": "External hosts support; they do not own identity",
    "keywords": [
      "website",
      "jmisjustme",
      "living estate",
      "site",
      "host",
      "domain",
      "public"
    ]
  },
  {
    "id": "games",
    "name": "GameForge / GlyphPlay / GlyphForge",
    "header": "Game Engines / Playable Systems",
    "rail": "Playable Systems",
    "role": "Game-engine lanes with distinct identities and shared organs.",
    "receives": "GameCore, controls, visual donors, JM coding bodies",
    "feeds": "Playable games, engine tests, app-game hybrids",
    "lock": "Share organs without sharing identities",
    "keywords": [
      "gameforge",
      "glyphplay",
      "glyphforge",
      "game",
      "play",
      "controls",
      "character",
      "arena"
    ]
  },
  {
    "id": "ftr",
    "name": "FTR / Energy-to-Engine",
    "header": "FTR / Physical Tech / Products",
    "rail": "Body / Device / Control",
    "role": "Turns hidden effort, energy, pressure and repeated contact into tools.",
    "receives": "Effort, body signals, pressure, route data",
    "feeds": "Energy TraceBox, JMM OS direction, products",
    "lock": "Route energy; measure it; make it useful",
    "keywords": [
      "ftr",
      "energy",
      "effort",
      "tool",
      "physical",
      "device",
      "product",
      "pressure"
    ]
  }
];
const SAMPLE_STATE = {
  "version": "0.1",
  "created": "2026-08-02",
  "feeds": [
    {
      "id": "feed-001",
      "title": "Recover Estate Intake Register",
      "type": "recovery",
      "text": "JMGAMECOREv02I_DONOR_ESTATE_INTAKE_REGISTER exists already; recover full register and route through Central Switchboard.",
      "branch": "gamecore",
      "rail": "Archive / Memory / Re-entry",
      "claim": "KNOWN",
      "status": "READY",
      "priority": "HIGH",
      "created": "2026-08-02"
    },
    {
      "id": "feed-002",
      "title": "LiveForge must remain bench",
      "type": "governance",
      "text": "LiveForge can build product bodies but must not replace Central Switchboard or flatten branches.",
      "branch": "liveforge",
      "rail": "Public / Product / QA",
      "claim": "STRUCTURAL LOCK",
      "status": "LOCKED",
      "priority": "HIGH",
      "created": "2026-08-02"
    },
    {
      "id": "feed-003",
      "title": "HTML persistence caution",
      "type": "constraint",
      "text": "Standalone downloaded HTML on Android may not preserve state reliably. Export JSON receipts; hosted/PWA/app shell is better for persistence.",
      "branch": "jmisjustme",
      "rail": "Public / Product / QA",
      "claim": "KNOWN",
      "status": "ACTIVE",
      "priority": "MEDIUM",
      "created": "2026-08-02"
    }
  ],
  "receipts": []
};
const LS_KEY = 'liveforge_engine_body_v0_1_state';
let state = loadState();
let currentTab = 'dashboard';
let selectedFeedId = null;
