import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const bodyPath = path.join(root, "body", "00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html");
const fixtureMarker = "JM_HOST_TRANSPORT_TEST_FIXTURE_NOT_SOURCE_AUTHORITY";
const port = Number(process.env.JM_TEST_PORT || 8123);
const mcpUrl = new URL(`http://127.0.0.1:${port}/mcp`);

if (!fs.existsSync(bodyPath)) {
  fs.mkdirSync(path.dirname(bodyPath), { recursive: true });
  fs.writeFileSync(
    bodyPath,
    `<!doctype html><meta charset="utf-8"><title>JM MCP test fixture</title><main>${fixtureMarker}</main>`,
    "utf8",
  );
}

const child = spawn(process.execPath, ["src/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverStdout = "";
let serverStderr = "";
child.stdout.on("data", (chunk) => { serverStdout += chunk.toString(); });
child.stderr.on("data", (chunk) => { serverStderr += chunk.toString(); });

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Health endpoint did not become ready. stdout=${serverStdout} stderr=${serverStderr}`);
}

let client;
try {
  const health = await waitForHealth();
  client = new Client({ name: "jm-host-adapter-proof-client", version: "0.1.1" });
  const transport = new StreamableHTTPClientTransport(mcpUrl);
  await client.connect(transport);

  const toolList = await client.listTools();
  const renderTool = toolList.tools.find((tool) => tool.name === "render-jm-game");
  if (!renderTool) throw new Error("render-jm-game not advertised");
  if (renderTool.annotations?.readOnlyHint !== true) throw new Error("render-jm-game readOnlyHint missing");

  const resources = await client.listResources();
  const widget = resources.resources.find((resource) => resource.uri === "ui://jm/untitled-field-branch-v0.9.html");
  if (!widget) throw new Error("JM widget resource not advertised");

  const read = await client.readResource({ uri: widget.uri });
  const widgetText = read.contents?.[0]?.text ?? "";
  const fixtureUsed = widgetText.includes(fixtureMarker);

  const call = await client.callTool({
    name: "render-jm-game",
    arguments: { bodyId: "jm.untitled-field-branch/v0.9" },
  });
  const structured = call.structuredContent ?? {};
  if (structured.hostRole !== "CARRIER_NOT_SOURCE_AUTHORITY") throw new Error("host role boundary missing");
  if (structured.mergeForbidden !== true) throw new Error("merge-forbidden boundary missing");
  if (structured.playableIrSchema !== "jm.gamecore.playable-ir/v0.3") throw new Error("playable IR metadata mismatch");
  if (structured.oneBodyAbi !== "jm.onebody-abi/v0.1") throw new Error("OneBody ABI metadata mismatch");

  const receipt = {
    pass: true,
    proofClass: fixtureUsed ? "MCP_RUNTIME_TRANSPORT_WITH_MARKED_FIXTURE" : "MCP_RUNTIME_TRANSPORT_WITH_PRESENT_BODY",
    sourceAuthorityProvenHere: false,
    chatgptContactProvenHere: false,
    health,
    serverVersion: client.getServerVersion?.() ?? null,
    tools: toolList.tools.map((tool) => tool.name),
    resources: resources.resources.map((resource) => resource.uri),
    renderReceipt: structured,
    fixtureMarker: fixtureUsed ? fixtureMarker : null,
  };
  fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(root, "artifacts", "MCP_RUNTIME_PROOF_v0_1_1.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  try { await client?.close(); } catch {}
  child.kill("SIGTERM");
}
