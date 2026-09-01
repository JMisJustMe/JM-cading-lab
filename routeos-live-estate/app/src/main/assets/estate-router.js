(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JMEstateRouter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORD_RE = /c\+\+|[a-z0-9]+(?:[-.][a-z0-9]+)*/g;
  const STOP_WORDS = new Set([
    'a','an','the','and','with','to','for','of','in','on','my','this','that',
    'from','into','please','build','make','create','need','want'
  ]);

  const INTENT_TAGS = Object.freeze({
    game: ['game','play','combat','arena','character','mechanic','level'],
    touch: ['touch','tap','drag','hold','gesture','hand','mobile','finger'],
    visual: ['visual','graphic','render','animation','screen','feedback','glyph'],
    compile: ['compile','compiler','emit','javascript','typescript','js','wasm','rust','c++'],
    parse: ['parse','parser','grammar','syntax','token'],
    route: ['route','state','transition','door','flow','path'],
    os: ['os','operating','service','permission','event','world','kernel'],
    conversation: ['chat','talk','utterance','intent','ambiguity','response','speech'],
    proof: ['proof','trace','receipt','ding','verify','audit','evidence'],
    recover: ['recover','restore','rollback','wake','archive','fault'],
    govern: ['source','govern','register','crown','current','ledger','gate','authority'],
    compose: ['combine','bind','graft','bridge','join','pair','integrate'],
    formula: ['formula','pattern','dependency','ratio'],
    delivery: ['package','deliver','delivery','open_first','zionfolder','export','android','apk']
  });

  const SUPPORT_ROLES = Object.freeze({
    proof: ['tracebox', 'dings'],
    govern: ['source-ledger', 'build-gates'],
    delivery: ['onebody-delivery', 'zionfolder'],
    game: ['gameforge', 'game-coding', 'jm-gamecore'],
    touch: ['seedform-choice-interface', 'pattern-tapping'],
    visual: ['jmvisualgraft', 'jm-visual-interaction-runtime'],
    compile: ['parser', 'compiler', 'cading-ir-onebody-ir'],
    parse: ['parser', 'tokenbody'],
    os: ['routecore-native', 'os-coding', 'codehand-routeos'],
    conversation: ['flowtalk', 'jmlogic'],
    recover: ['mebl-error-map', 'wakeforge'],
    compose: ['polyglot-bridge', 'combibind', 'jmqgraft']
  });

  function normalise(text = '') {
    const words = String(text)
      .normalize('NFKD')
      .replace(/[’']/g, '')
      .toLowerCase()
      .match(WORD_RE) || [];
    return words.filter(word => !STOP_WORDS.has(word) && (word.length > 1 || word === 'c++'));
  }

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
      ...(body.aliases || []),
      body.category,
      body.family,
      body.role,
      ...(body.capabilities || [])
    ].join(' ').toLowerCase();
  }

  function scoreBody(body, query) {
    const tokens = Array.isArray(query) ? query : normalise(query);
    const tags = inferredTags(tokens);
    const text = searchable(body);
    let score = 0;
    const reasons = [];

    for (const token of tokens) {
      if (body.name.toLowerCase().includes(token)) {
        score += 10;
        reasons.push(`name:${token}`);
      } else if ((body.aliases || []).some(alias => alias.toLowerCase().includes(token))) {
        score += 8;
        reasons.push(`alias:${token}`);
      } else if ((body.capabilities || []).includes(token)) {
        score += 6;
        reasons.push(`capability:${token}`);
      } else if (text.includes(token)) {
        score += 2;
        reasons.push(`role:${token}`);
      }
    }

    for (const tag of tags) {
      if ((body.capabilities || []).includes(tag) || body.family === tag) {
        score += 7;
        reasons.push(`intent:${tag}`);
      }
      if (tag === 'game' && ['game-engine', 'game-language'].includes(body.category)) score += 5;
      if (tag === 'os' && body.family === 'os') score += 5;
      if (tag === 'proof' && body.family === 'proof') score += 5;
      if (tag === 'govern' && body.family === 'governance') score += 5;
      if (tag === 'visual' && body.family === 'visual') score += 5;
      if (tag === 'touch' && body.family === 'contact') score += 5;
    }

    return { body, score, reasons: [...new Set(reasons)] };
  }

  function combineRegistryParts(meta, parts) {
    if (!meta || !Array.isArray(parts)) throw new Error('REGISTRY_PARTS_INVALID');
    const bodies = parts.flatMap(part => Array.isArray(part.bodies) ? part.bodies : []);
    return {
      ...meta,
      bodies,
      loadedParts: parts.map(part => part.batch),
      loadedCount: bodies.length
    };
  }

  function validateRegistry(registry) {
    const failures = [];
    if (registry.count !== 100) failures.push(`COUNT:${registry.count}`);
    if (!Array.isArray(registry.bodies) || registry.bodies.length !== 100) {
      failures.push(`BODY_LENGTH:${registry.bodies && registry.bodies.length}`);
    }
    const ids = new Set();
    const names = new Set();
    const aliases = new Set();
    for (const body of registry.bodies || []) {
      if (!body.id || !body.name || !body.role || !body.category || !body.family) {
        failures.push(`INCOMPLETE:${body.id || body.name || 'unknown'}`);
      }
      if (ids.has(body.id)) failures.push(`DUPLICATE_ID:${body.id}`);
      if (names.has(body.name)) failures.push(`DUPLICATE_NAME:${body.name}`);
      ids.add(body.id);
      names.add(body.name);
      for (const alias of body.aliases || []) {
        const key = alias.toLowerCase();
        if (aliases.has(key)) failures.push(`DUPLICATE_ALIAS:${alias}`);
        aliases.add(key);
      }
      const proof = registry.proofByBatch && registry.proofByBatch[body.batch];
      if (!proof || proof.failed !== 0) failures.push(`UNPROVEN:${body.id}`);
    }
    if (!registry.defaults || registry.defaults.supreme !== false) {
      failures.push('SUPREMACY_DEFAULT_MISSING');
    }
    return { valid: failures.length === 0, failures, count: ids.size };
  }

  function addById(route, byId, id, reason) {
    const body = byId.get(id);
    if (!body || route.some(item => item.body.id === id)) return;
    route.push({ body, score: 0, reasons: [reason] });
  }

  function planEstateRoute(query, registry, options = {}) {
    if (!registry || !Array.isArray(registry.bodies) || !registry.bodies.length) {
      throw new Error('REGISTRY_EMPTY');
    }
    const tokens = normalise(query);
    const tags = inferredTags(tokens);
    const byId = new Map(registry.bodies.map(body => [body.id, body]));

    const ranked = registry.bodies
      .map(body => scoreBody(body, tokens))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.body.name.localeCompare(b.body.name));

    const route = ranked.slice(0, options.limit || 7);

    for (const tag of tags) {
      for (const id of SUPPORT_ROLES[tag] || []) addById(route, byId, id, `support:${tag}`);
    }

    addById(route, byId, 'source-ledger', 'mandatory:source-authority');
    addById(route, byId, 'tracebox', 'mandatory:trace');
    addById(route, byId, 'dings', 'mandatory:proof');

    if (tags.has('delivery') || options.includeDelivery) {
      addById(route, byId, 'onebody-delivery', 'mandatory:delivery');
      addById(route, byId, 'zionfolder', 'mandatory:preservation');
    }

    return {
      schema: 'jm.sovereign-estate.route-plan/1.1',
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
        'identity-preserved',
        'source-authority-required',
        'trace-required',
        'ding-required',
        'no-supreme-body'
      ]
    };
  }

  function compatibilityBetween(a, b, matrix) {
    if (!a || !b) return { mode: 'unknown', reason: 'BODY_MISSING' };
    if (a.id === b.id) return { mode: 'same-body', reason: 'IDENTICAL_BODY' };

    const direct = (matrix.directPairs || []).find(pair =>
      (pair.from === a.id && pair.to === b.id) ||
      (pair.bidirectional && pair.from === b.id && pair.to === a.id)
    );
    if (direct) return { mode: 'direct', relation: direct.relation };

    const familyRule = (matrix.familyRules || []).find(rule =>
      (rule.from === a.family || rule.from === '*') &&
      (rule.to === b.family || rule.to === '*')
    );
    if (familyRule) return { mode: familyRule.mode, relation: `${a.family}→${b.family}` };

    return {
      mode: 'adapter-required',
      relation: `${a.family}→${b.family}`,
      suggestedAdapters: ['polyglot-bridge', 'combibind', 'jmqgraft']
    };
  }

  function validateCartridgeRegistry(manifest) {
    const failures = [];
    if (!manifest || !Array.isArray(manifest.cartridges)) return { valid: false, failures: ['CARTRIDGES_MISSING'] };
    const ids = new Set();
    const routes = new Set();
    for (const cartridge of manifest.cartridges) {
      if (!cartridge.id || !cartridge.title || !cartridge.entry) failures.push(`INCOMPLETE:${cartridge.id || 'unknown'}`);
      const id = String(cartridge.id || '').toLowerCase();
      if (ids.has(id)) failures.push(`DUPLICATE_ID:${id}`);
      ids.add(id);
      for (const route of [cartridge.id, ...(cartridge.aliases || [])]) {
        const key = String(route).toLowerCase();
        if (routes.has(key)) failures.push(`DUPLICATE_ROUTE:${key}`);
        routes.add(key);
      }
    }
    return { valid: failures.length === 0, failures, count: ids.size };
  }

  function resolveCartridge(manifest, id) {
    const needle = String(id || '').toLowerCase();
    if (!manifest || !Array.isArray(manifest.cartridges)) return null;
    return manifest.cartridges.find(cartridge =>
      cartridge.id.toLowerCase() === needle ||
      (cartridge.aliases || []).some(alias => alias.toLowerCase() === needle)
    ) || null;
  }

  function searchBodies(registry, query, limit = 25) {
    const tokens = normalise(query);
    if (!tokens.length) return (registry.bodies || []).slice(0, limit);
    return (registry.bodies || [])
      .map(body => scoreBody(body, tokens))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.body.name.localeCompare(b.body.name))
      .slice(0, limit)
      .map(item => item.body);
  }

  return {
    normalise,
    inferredTags,
    scoreBody,
    combineRegistryParts,
    validateRegistry,
    planEstateRoute,
    compatibilityBetween,
    validateCartridgeRegistry,
    resolveCartridge,
    searchBodies
  };
});
