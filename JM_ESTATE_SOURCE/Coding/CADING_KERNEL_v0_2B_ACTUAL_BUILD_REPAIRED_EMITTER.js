/* ============================
   CADING KERNEL v0.2B
   Compiler + Runtime Skeleton
   Repaired Emitter Build
   ============================ */

function tokenize(source) {
  const tokens = [];
  let current = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "." || c === "\n") {
      if (current.trim().length > 0) tokens.push({ type: "WORD", value: current.trim() });
      tokens.push({ type: "FULLSTOP", value: c });
      current = "";
    } else {
      current += c;
    }
  }
  if (current.trim().length > 0) tokens.push({ type: "WORD", value: current.trim() });
  return tokens;
}

function parseBlocks(tokens) {
  const blocks = [];
  let current = [];
  for (const t of tokens) {
    if (t.type === "FULLSTOP") {
      if (current.length === 0) throw CADINGE002MISSING_FULLSTOP("Empty block");
      blocks.push({ type: "BLOCK", words: current });
      current = [];
    } else {
      current.push(t.value);
    }
  }
  return blocks;
}

function buildIR(blocks) {
  return blocks.map((b) => ({
    route: b.words[0] || null,
    entity: b.words[1] || null,
    nota: b.words.includes("nota") ? true : false,
    raw: b.words
  }));
}

function validateIR(ir) {
  const errors = [];
  const warnings = [];
  const info = [];
  for (const node of ir) {
    if (!node.route) errors.push(CADINGE003UNKNOWN_ROUTE(node.raw));
    if (!node.entity) warnings.push(CADINGW002ENTITY_UNUSED(node.raw));
    if (node.nota) info.push(CADINGI002NOTAFALLBACKUSED(node.raw));
  }
  return { errors, warnings, info };
}

function emitJavaScript(ir) {
  let out = "";
  out += "const CadingRuntime = {};\n";
  out += "CadingRuntime.routes = {};\n";

  ir.forEach(node => {
    out += `CadingRuntime.routes["${node.route}"] = function() {\n`;
    out += `  console.log("Running route: ${node.route}");\n`;
    out += "};\n";
  });

  out += "\nCadingRuntime.start = function() {\n";
  out += "  console.log('Runtime started');\n";
  out += "};\n";

  return out;
}

function createRuntime(js) {
  return new Function(js + "\nreturn CadingRuntime;")();
}

function createCompileReceipt(ir, diagnostics) {
  return {
    version: "v0.2B",
    timestamp: Date.now(),
    ir,
    diagnostics
  };
}

function CADINGE001UNKNOWN_BLOCK(raw) { return { code: "CADINGE001UNKNOWN_BLOCK", raw }; }
function CADINGE002MISSING_FULLSTOP(raw) { return { code: "CADINGE002MISSING_FULLSTOP", raw }; }
function CADINGE003UNKNOWN_ROUTE(raw) { return { code: "CADINGE003UNKNOWN_ROUTE", raw }; }
function CADINGE004UNKNOWNENTITYPATH(raw) { return { code: "CADINGE004UNKNOWNENTITYPATH", raw }; }
function CADINGE005BUGGRECOVERMISSING(raw) { return { code: "CADINGE005BUGGRECOVERMISSING", raw }; }
function CADINGE006INLINEBUGGUNKNOWN(raw) { return { code: "CADINGE006INLINEBUGGUNKNOWN", raw }; }
function CADINGE007PREPOSTUNRESOLVED_PATH(raw) { return { code: "CADINGE007PREPOSTUNRESOLVED_PATH", raw }; }
function CADINGE008EVENTROUTEVOIDWITHOUTNOTA(raw) { return { code: "CADINGE008EVENTROUTEVOIDWITHOUTNOTA", raw }; }

function CADINGW001ROUTENOPOST(raw) { return { code: "CADINGW001ROUTENOPOST", raw }; }
function CADINGW002ENTITY_UNUSED(raw) { return { code: "CADINGW002ENTITY_UNUSED", raw }; }
function CADINGW003BUGGNEVERTRIGGERED(raw) { return { code: "CADINGW003BUGGNEVERTRIGGERED", raw }; }
function CADINGW004NOTADEFINEDBUT_UNUSED(raw) { return { code: "CADINGW004NOTADEFINEDBUT_UNUSED", raw }; }

function CADINGI001VOIDROUTEUSED(raw) { return { code: "CADINGI001VOIDROUTEUSED", raw }; }
function CADINGI002NOTAFALLBACKUSED(raw) { return { code: "CADINGI002NOTAFALLBACKUSED", raw }; }
function CADINGI003ROUTECONFIRMUSED(raw) { return { code: "CADINGI003ROUTECONFIRMUSED", raw }; }

function runBuildTest() {
  const source = "start game.";
  const tokens = tokenize(source);
  const blocks = parseBlocks(tokens);
  const ir = buildIR(blocks);
  const diagnostics = validateIR(ir);
  const emittedJS = emitJavaScript(ir);
  const runtime = createRuntime(emittedJS);
  const compileReceipt = createCompileReceipt(ir, diagnostics);

  return {
    source,
    tokens,
    blocks,
    ir,
    diagnostics,
    emittedJS,
    runtimeObject: {
      hasRoutes: !!runtime.routes,
      routeNames: Object.keys(runtime.routes),
      hasStart: typeof runtime.start === "function"
    },
    compileReceipt
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    tokenize,
    parseBlocks,
    buildIR,
    validateIR,
    emitJavaScript,
    createRuntime,
    createCompileReceipt,
    runBuildTest
  };
}

if (require.main === module) {
  console.log(JSON.stringify(runBuildTest(), null, 2));
}