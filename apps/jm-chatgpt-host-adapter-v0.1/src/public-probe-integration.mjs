import fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = (process.env.JM_PUBLIC_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("JM_PUBLIC_BASE_URL is required");

async function fetchOk(path) {
  const response = await fetch(`${base}${path}`, { redirect: "follow" });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  return { status: response.status, text };
}

const healthResponse = await fetchOk("/health");
const health = JSON.parse(healthResponse.text);
if (health.adapterVersion !== "0.1.2") throw new Error(`unexpected adapter version ${health.adapterVersion}`);
if (health.outputSchemaDeclared !== true) throw new Error("health does not confirm output schema");

const publicPages = {};
for (const path of ["/", "/privacy", "/terms", "/support"]) {
  const result = await fetchOk(path);
  publicPages[path] = { status: result.status, bytes: Buffer.byteLength(result.text) };
}

const client = new Client({ name: "jm-inline-contact-public-proof", version: "0.1.2" });
const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
try {
  await client.connect(transport);
  const tools = await client.listTools();
  const tool = tools.tools.find((item) => item.name === "render-jm-inline-probe");
  if (!tool) throw new Error("render-jm-inline-probe not advertised");
  if (!tool.outputSchema) throw new Error("public probe outputSchema missing");
  if (tool.annotations?.readOnlyHint !== true) throw new Error("readOnlyHint mismatch");
  if (tool.annotations?.openWorldHint !== false) throw new Error("openWorldHint mismatch");
  if (tool.annotations?.destructiveHint !== false) throw new Error("destructiveHint mismatch");

  const resources = await client.listResources();
  const resource = resources.resources.find((item) => item.uri === "ui://jm/inline-contact-probe-v0.1.html");
  if (!resource) throw new Error("inline probe UI resource not advertised");
  const read = await client.readResource({ uri: resource.uri });
  const widgetText = read.contents?.[0]?.text || "";
  if (!widgetText.includes("INLINE CONTACT PROBE")) throw new Error("widget resource body mismatch");

  const call = await client.callTool({
    name: "render-jm-inline-probe",
    arguments: { probeId: "jm.inline-contact-probe/v0.1" },
  });
  const structured = call.structuredContent || {};
  if (structured.probeOnly !== true) throw new Error("probe-only boundary missing");
  if (structured.privateDonorBytesIncluded !== false) throw new Error("private-donor boundary mismatch");

  const receipt = {
    pass: true,
    proofClass: "PUBLIC_HTTPS_MCP_SUBMISSION_READINESS",
    chatgptInlineContactProvenHere: false,
    baseUrl: base,
    mcpUrl: `${base}/mcp`,
    health,
    publicPages,
    tool: {
      name: tool.name,
      annotations: tool.annotations,
      outputSchemaAdvertised: Boolean(tool.outputSchema),
    },
    resource: resource.uri,
    renderReceipt: structured,
  };
  fs.writeFileSync("PUBLIC_SUBMISSION_READINESS_v0_1_2.json", JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await client.close().catch(() => {});
}
