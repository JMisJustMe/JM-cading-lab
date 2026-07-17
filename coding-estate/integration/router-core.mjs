const WORD_RE = /[a-z0-9]+(?:[-.][a-z0-9]+)*/g;

export function normalise(text = "") {
  return String(text)
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
    .match(WORD_RE) ?? [];
}

const INTENT_TAGS = {
  game: ["game", "play", "combat", "arena", "character", "mechanic"],
  touch: ["touch", "tap", "drag", "hold", "gesture", "hand", "mobile"],
  visual: ["visual", "graphic", "render", "animation", "screen", "feedback"],
  compile: ["compile", "compiler", "emit", "javascript", "typescript", "wasm", "rust", "c++"],
  parse: ["parse", "parser", "grammar", "syntax", "token"],
  route: ["route", "state", "transition", "door", "flow"],
  os: ["os", "operating", "service", "permission", "event", "world"],
  conversation: ["chat", "talk", "utterance", "intent", "ambiguity", "response"],
  proof: ["proof", "trace", "receipt", "ding", "verify", "audit"],
  recover: ["recover", "restore", "rollback", "wake", "archive"],
  govern: ["source", "govern", "register", "crown", "current", "ledger", "gate"],
  compose: ["combine", "bind", "graft", "bridge", "join", "pair"],
  formula: ["formula", "pattern", "dependency", "ratio"],
  delivery: ["package", "deliver", "open_first", "zionfolder", "export", "android"]
};

function inferredTags(tokens) {
  const tokenSet = new Set(tokens);
  const tags = new Set();
  for (const [tag, words] of Object.entries(INTENT_TAGS)) {
    if (words.some(word => tokenSet.has(word))) tags.add(tag);
  }
  return tags;
}

function searchable(body) {
  return [
    body.name,
    ...(body.aliases ?? []),
    body.category,
    body.family,
    body.role,
    ...(body.capabilities ?? [])
  ].join(" ").toLowerCase();
}

export function scoreBody(body, query) {
  const tokens = Array.isArray(query) ? query : normalise(query);
  const tags = inferredTags(tokens);
  const text = searchable(body);
  let score = 0;
  const reasons = [];

  for (const token of tokens) {
    if (body.name.toLowerCase().includes(token)) {
      score += 10;
      reasons.push(`name:${token}`);
    } else if ((body.aliases ?? []).some(alias => alias.toLowerCase().includes(token))) {
      score += 8;
      reasons.push(`alias:${token}`);
    } else if ((body.capabilities ?? []).includes(token)) {
      score += 6;
      reasons.push(`capability:${token}`);
    } else if (text.includes(token)) {
      score += 2;
      reasons.push(`role:${token}`);
    }
  }

  for (const tag of tags) {
    if ((body.capabilities ?? []).includes(tag) || body.family === tag) {
      score += 7;
      reasons.push(`intent:${tag}`);
    }
    if (tag === "game" && ["game-engine", "game-language"].includes(body.category)) score += 5;
    if (tag === "os" && body.family === "os") score += 5;
    if (tag === "proof" && body.family === "proof") score += 5;
    if (tag === "govern" && body.family === "governance") score += 5;
  }

  score += 1;
  return { body, score, reasons: [...new Set(reasons)] };
}

const SUPPORT_ROLES = {
  proof: ["tracebox", "dings"],
  governance: ["source-ledger", "build-gates"],
  delivery: ["onebody-delivery", "zionfolder"],
  game: ["gameforge", "game-coding", "jm-gamecore"],
  touch: ["seedform-choice-interface", "pattern-tapping"],
  compile: ["parser", "compiler", "cading-ir-onebody-ir"],
  os: ["routecore-native", "os-coding"],
  conversation: ["flowtalk", "jmlogic"]
};

function addById(route, byId, id, reason) {
  const body = byId.get(id);
  if (!body || route.some(item => item.body.id === id)) return;
  route.push({ body, score: 0, reasons: [reason] });
}

export function planEstateRoute(query, registry, options = {}) {
  if (!registry?.bodies?.length) throw new Error("REGISTRY_EMPTY");
  const tokens = normalise(query);
  const tags = inferredTags(tokens);
  const byId = new Map(registry.bodies.map(body => [body.id, body]));

  const ranked = registry.bodies
    .map(body => scoreBody(body, tokens))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.body.name.localeCompare(b.body.name));

  const route = ranked.slice(0, options.limit ?? 7);

  for (const tag of tags) {
    for (const id of SUPPORT_ROLES[tag] ?? []) addById(route, byId, id, `support:${tag}`);
  }

  addById(route, byId, "tracebox", "mandatory:trace");
  addById(route, byId, "dings", "mandatory:proof");
  addById(route, byId, "source-ledger", "mandatory:source-authority");

  if (tags.has("delivery") || options.includeDelivery) {
    addById(route, byId, "onebody-delivery", "mandatory:delivery");
    addById(route, byId, "zionfolder", "mandatory:preservation");
  }

  return {
    schema: "jm.sovereign-estate.route-plan/1.0",
    query: String(query),
    tokens,
    intents: [...tags],
    route: route.map((item, index) => ({
      order: index + 1,
      id: item.body.id,
      name: item.body.name,
      category: item.body.category,
      family: item.body.family,
      score: item.score,
      reasons: item.reasons,
      role: item.body.role
    })),
    lawsApplied: [
      "identity-preserved",
      "source-authority-required",
      "trace-required",
      "ding-required",
      "no-supreme-body"
    ]
  };
}

export function compatibilityBetween(a, b, matrix) {
  if (!a || !b) return { mode: "unknown", reason: "BODY_MISSING" };
  if (a.id === b.id) return { mode: "same-body", reason: "IDENTICAL_BODY" };

  const direct = (matrix.directPairs ?? []).find(pair =>
    (pair.from === a.id && pair.to === b.id) ||
    (pair.bidirectional && pair.from === b.id && pair.to === a.id)
  );
  if (direct) return { mode: "direct", relation: direct.relation };

  const familyRule = (matrix.familyRules ?? []).find(rule =>
    (rule.from === a.family || rule.from === "*") &&
    (rule.to === b.family || rule.to === "*")
  );
  if (familyRule) return { mode: familyRule.mode, relation: `${a.family}→${b.family}` };

  return {
    mode: "adapter-required",
    relation: `${a.family}→${b.family}`,
    suggestedAdapters: ["polyglot-bridge", "combi-bind", "jmqgraft"]
  };
}

export function validateRegistry(registry) {
  const failures = [];
  if (registry.count !== 100) failures.push(`COUNT:${registry.count}`);
  if (registry.bodies?.length !== 100) failures.push(`BODY_LENGTH:${registry.bodies?.length}`);
  const ids = new Set();
  const names = new Set();
  for (const body of registry.bodies ?? []) {
    if (!body.id || !body.name || !body.role || !body.category || !body.family) failures.push(`INCOMPLETE:${body.id ?? body.name}`);
    if (ids.has(body.id)) failures.push(`DUPLICATE_ID:${body.id}`);
    if (names.has(body.name)) failures.push(`DUPLICATE_NAME:${body.name}`);
    ids.add(body.id);
    names.add(body.name);
    const proof = registry.proofByBatch?.[body.batch];
    if (proof?.failed !== 0) failures.push(`UNPROVEN:${body.id}`);
  }
  if (registry.defaults?.supreme !== false) failures.push("SUPREMACY_DEFAULT_MISSING");
  return { valid: failures.length === 0, failures, count: ids.size };
}
