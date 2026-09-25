import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "server.mjs"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const checks = {
  nativeHttpOnly: source.includes('from "node:http"') && !source.includes('from "express"') && !source.includes('from "cors"'),
  mcpSdk: source.includes('@modelcontextprotocol/sdk/server/mcp.js'),
  streamableHttp: source.includes('StreamableHTTPServerTransport'),
  extAppsHelpers: source.includes('registerAppTool') && source.includes('registerAppResource') && source.includes('RESOURCE_MIME_TYPE'),
  uiResourceUri: source.includes('ui: { resourceUri: TEMPLATE_URI }'),
  mcpPath: source.includes('const MCP_PATH = "/mcp"'),
  corsPreflight: source.includes('req.method === "OPTIONS"') && source.includes('Mcp-Session-Id'),
  statelessTransport: source.includes('sessionIdGenerator: undefined') && source.includes('enableJsonResponse: true'),
  exactThreeDependencies: Object.keys(pkg.dependencies ?? {}).sort().join('|') === [
    '@modelcontextprotocol/ext-apps',
    '@modelcontextprotocol/sdk',
    'zod',
  ].sort().join('|'),
  noRuntimeRebuild: source.includes('CARRIER_NOT_SOURCE_AUTHORITY'),
};

const pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify({
  pass,
  adapterVersion: pkg.version,
  contract: "OpenAI current MCP Apps quickstart shape + JM carrier law",
  checks,
}, null, 2));
if (!pass) process.exit(1);
