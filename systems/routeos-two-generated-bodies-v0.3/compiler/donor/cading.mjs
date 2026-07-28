import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Text } from "./util.mjs";

export const REQUIRED_ANDROID_BODIES = [
  "Cading",
  "Kading",
  "JMLogic",
  "FlowTalk",
  "RouteCode",
  "Quadze",
  "OneBody IR",
  "CadenVM",
  "CodeHand",
  "RouteOS",
  "TraceBox",
  "THEO",
  "Build Gates",
  "Zionfolder"
];

function normalBody(value) {
  return value
    .trim()
    .replace(/\s*\/\s*/g, "/")
    .replace(/^Route-Code$/i, "RouteCode")
    .replace(/^Quadzi$/i, "Quadze")
    .replace(/^IR$/i, "OneBody IR")
    .replace(/^RouteVM$/i, "CadenVM")
    .replace(/^JMVM$/i, "CadenVM")
    .replace(/^RouteBox$/i, "TraceBox")
    .replace(/^AmaCore$/i, "RouteOS");
}

function scalar(value) {
  const clean = value.trim();
  if (/^".*"$/.test(clean) || /^'.*'$/.test(clean)) return clean.slice(1, -1);
  if (/^-?\d+$/.test(clean)) return Number(clean);
  if (/^(true|false)$/i.test(clean)) return clean.toLowerCase() === "true";
  return clean;
}

function pair(line, marker) {
  const body = line.slice(marker.length).trim();
  const arrow = body.indexOf("->");
  if (arrow === -1) return { from: body, to: "" };
  return {
    from: body.slice(0, arrow).trim(),
    to: body.slice(arrow + 2).trim()
  };
}

export function parseCading(source, filename = "<memory>") {
  const model = {
    filename,
    module: "",
    family: "",
    owner: "",
    version: "1.0.0",
    bodies: [],
    android: {},
    functions: [],
    flows: [],
    routes: [],
    maps: [],
    declarations: []
  };

  let section = null;
  let activeFlow = null;
  let activeFunction = null;
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    const lineNumber = index + 1;
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    const fail = (message) => {
      throw new Error(`${filename}:${lineNumber}: ${message}`);
    };

    if (trimmed === "end") {
      activeFlow = null;
      activeFunction = null;
      section = null;
      continue;
    }

    if (trimmed === "android:") {
      section = "android";
      activeFlow = null;
      activeFunction = null;
      continue;
    }

    if (section === "android" && /^\w[\w-]*\s*:/.test(trimmed)) {
      const colon = trimmed.indexOf(":");
      model.android[trimmed.slice(0, colon).trim()] = scalar(trimmed.slice(colon + 1));
      continue;
    }

    let match = trimmed.match(/^module\s+(.+)$/i);
    if (match) {
      model.module = scalar(match[1]);
      continue;
    }
    match = trimmed.match(/^(family|owner|version)\s*:\s*(.+)$/i);
    if (match) {
      model[match[1].toLowerCase()] = scalar(match[2]);
      continue;
    }
    match = trimmed.match(/^body\s*:?\s*(.+)$/i);
    if (match) {
      model.bodies.push(normalBody(match[1]));
      continue;
    }
    match = trimmed.match(/^flow\s+(.+?)(?::)?$/i);
    if (match) {
      activeFlow = { name: scalar(match[1]), steps: [] };
      model.flows.push(activeFlow);
      activeFunction = null;
      section = null;
      continue;
    }
    match = trimmed.match(/^func\s+([A-Za-z_][\w.-]*)(?:\((.*?)\))?(?::)?$/i);
    if (match) {
      activeFunction = {
        name: match[1],
        parameters: match[2] ? match[2].split(",").map((item) => item.trim()).filter(Boolean) : [],
        instructions: []
      };
      model.functions.push(activeFunction);
      activeFlow = null;
      section = null;
      continue;
    }
    if (activeFlow && /^(step|goto)\s+/.test(trimmed)) {
      const [kind, ...rest] = trimmed.split(/\s+/);
      activeFlow.steps.push({ kind, target: rest.join(" ") });
      continue;
    }
    if (activeFunction && /^(do|expect|return|emit)\s+/.test(trimmed)) {
      const [kind, ...rest] = trimmed.split(/\s+/);
      activeFunction.instructions.push({ kind, value: rest.join(" ") });
      continue;
    }
    if (/^route\s+/i.test(trimmed)) {
      model.routes.push(pair(trimmed, "route"));
      continue;
    }
    if (/^map\s+/i.test(trimmed)) {
      model.maps.push(pair(trimmed, "map"));
      continue;
    }
    match = trimmed.match(/^(entity|state|phase|ding)\s+(.+)$/i);
    if (match) {
      model.declarations.push({ kind: match[1].toLowerCase(), value: match[2] });
      continue;
    }

    fail(`unrecognized Cading line: ${trimmed}`);
  }

  model.bodies = [...new Set(model.bodies)];
  return model;
}

function positiveInteger(value, fallback) {
  const selected = value ?? fallback;
  if (!Number.isInteger(Number(selected)) || Number(selected) < 1) {
    throw new Error(`Android SDK value must be a positive integer: ${selected}`);
  }
  return Number(selected);
}

export function compileOneBody(model, source) {
  const android = {
    package: String(model.android.package ?? model.module ?? ""),
    appName: String(model.android.appName ?? model.family ?? model.module ?? "JM Android App"),
    versionName: String(model.android.versionName ?? model.version ?? "1.0.0"),
    versionCode: positiveInteger(model.android.versionCode, 1),
    minSdk: positiveInteger(model.android.minSdk, 23),
    targetSdk: positiveInteger(model.android.targetSdk, 35),
    compileSdk: positiveInteger(model.android.compileSdk, 35),
    asset: String(model.android.asset ?? "app/index.html"),
    artifactName: String(model.android.artifactName ?? model.android.appName ?? model.family ?? "JM_ANDROID_APP")
  };

  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(android.package)) {
    throw new Error(`Invalid Android package identity: ${android.package}`);
  }
  if (android.minSdk > android.targetSdk || android.targetSdk > android.compileSdk) {
    throw new Error("SDK order must be minSdk <= targetSdk <= compileSdk.");
  }

  return {
    schema: "jm.onebody.android/v1",
    compiler: {
      name: "Cading",
      routeGraph: "JMGradle",
      generatedBy: "JM Android Forge 1.1.0"
    },
    identity: {
      module: model.module,
      family: model.family,
      owner: model.owner,
      version: model.version
    },
    bodies: model.bodies,
    android,
    functions: model.functions,
    flows: model.flows,
    routes: model.routes,
    maps: model.maps,
    declarations: model.declarations,
    provenance: {
      source: path.basename(model.filename),
      sourceSha256: sha256Text(source),
      authority: "Human-originated, human-governed, AI-assisted"
    }
  };
}

export async function loadCading(filename) {
  const source = await readFile(filename, "utf8");
  const model = parseCading(source, filename);
  return { source, model, oneBody: compileOneBody(model, source) };
}

export function assertRequiredBodies(oneBody) {
  const present = new Set(oneBody.bodies.map(normalBody));
  const missing = REQUIRED_ANDROID_BODIES.filter((body) => !present.has(body));
  if (missing.length) {
    throw new Error(`Source Gate HOLD: missing coding bodies: ${missing.join(", ")}`);
  }
  return true;
}
