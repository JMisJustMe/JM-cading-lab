import { createServer as createHttpServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { EXACT_SOURCE_ENV, loadExactSource } from "./exact-source-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BODY_PATH = path.join(ROOT, "body", "00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html");
const TEMPLATE_URI = "ui://jm/untitled-field-branch-v0.9.html";
const BODY_ID = "jm.untitled-field-branch/v0.9";
const BODY_SHA256 = "7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea";
const PLAYABLE_IR_SCHEMA = "jm.gamecore.playable-ir/v0.3";
const ONEBODY_ABI = "jm.onebody-abi/v0.1";
const WIDGET_SESSION_ID = "jm-inline-contact-untitled-field-v0.9";
const MCP_PATH = "/mcp";
const ADAPTER_VERSION = "0.1.3-exact-identity-gate";

const RENDER_OUTPUT_SCHEMA = {
  schema: z.literal("jm.chatgpt-host-adapter/render-receipt/v0.1"),
  bodyId: z.literal(BODY_ID),
  sourceSha256: z.literal(BODY_SHA256),
  playableIrSchema: z.literal(PLAYABLE_IR_SCHEMA),
  oneBodyAbi: z.literal(ONEBODY_ABI),
  hostRole: z.literal("CARRIER_NOT_SOURCE_AUTHORITY"),
  mergeForbidden: z.boolean(),
  exactSourceVerified: z.boolean(),
  sourceIntake: z.string(),
  keeper: z.string(),
};

function readFrozenBody() {
  return loadExactSource({
    filePath: BODY_PATH,
    expectedSha256: BODY_SHA256,
  });
}

const toolUiMeta = {
  ui: { resourceUri: TEMPLATE_URI },
  "openai/outputTemplate": TEMPLATE_URI,
};

function createJmServer() {
  const server = new McpServer({
    name: "JM ChatGPT Host Adapter",
    version: ADAPTER_VERSION,
  });

  registerAppResource(
    server,
    "JM Untitled Field Branch v0.9 — frozen playable body",
    TEMPLATE_URI,
    {},
    async () => {
      const exact = readFrozenBody();
      return {
        contents: [
          {
            uri: TEMPLATE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: exact.text,
            _meta: {
              ui: {
                prefersBorder: false,
                csp: {
                  connectDomains: [],
                  resourceDomains: [],
                },
              },
              "openai/widgetDescription": "Exact frozen JM playable body carried into the ChatGPT host only after byte-level SHA verification.",
              "jm/sourceAuthority": "JM / frozen donor body",
              "jm/sourceSha256": BODY_SHA256,
              "jm/observedSourceSha256": exact.observedSha256,
              "jm/exactSourceVerified": true,
              "jm/sourceIntake": exact.intake,
              "jm/hostRole": exact.hostRole,
              "jm/mutationAllowed": exact.mutationAllowed,
            },
          },
        ],
      };
    },
  );

  registerAppTool(
    server,
    "render-jm-game",
    {
      title: "Render JM game inline",
      description:
        "Use this when the user wants the exact frozen JM playable body rendered as an interactive in-chat app surface. Source bytes are SHA-verified before carriage; the host does not redefine source authority.",
      inputSchema: {
        bodyId: z.literal(BODY_ID).default(BODY_ID),
      },
      outputSchema: RENDER_OUTPUT_SCHEMA,
      _meta: toolUiMeta,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async ({ bodyId }) => {
      const exact = readFrozenBody();
      return {
        _meta: {
          ...toolUiMeta,
          "openai/widgetSessionId": WIDGET_SESSION_ID,
          "jm/sourceSha256": BODY_SHA256,
          "jm/observedSourceSha256": exact.observedSha256,
          "jm/exactSourceVerified": true,
          "jm/sourceIntake": exact.intake,
          "jm/hostRole": "CARRIER_NOT_SOURCE_AUTHORITY",
        },
        content: [
          {
            type: "text",
            text: "Mounted the exact frozen JM playable body after source-identity verification. The host carries play; it does not own or rewrite the game.",
          },
        ],
        structuredContent: {
          schema: "jm.chatgpt-host-adapter/render-receipt/v0.1",
          bodyId,
          sourceSha256: BODY_SHA256,
          playableIrSchema: PLAYABLE_IR_SCHEMA,
          oneBodyAbi: ONEBODY_ABI,
          hostRole: "CARRIER_NOT_SOURCE_AUTHORITY",
          mergeForbidden: true,
          exactSourceVerified: true,
          sourceIntake: exact.intake,
          keeper: "One body. Multiple hosts. Carrier changes; source identity does not. Contact supplies the proof.",
        },
      };
    },
  );

  return server;
}

const port = Number(process.env.PORT ?? 8000);
const httpServer = createHttpServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      adapterVersion: ADAPTER_VERSION,
      bodyId: BODY_ID,
      sourceSha256: BODY_SHA256,
      playableIrSchema: PLAYABLE_IR_SCHEMA,
      oneBodyAbi: ONEBODY_ABI,
      outputSchemaDeclared: true,
      privateSourceEnvConfigured: Boolean(process.env[EXACT_SOURCE_ENV]),
      localExactSourcePresent: fs.existsSync(BODY_PATH),
      exactSourceMustVerifyBeforeRender: true,
      claim: "EXACT_SOURCE_GATE_BUILT_NOT_CHATGPT_CONTACT_PROVEN",
    }));
    return;
  }

  const mcpMethods = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && mcpMethods.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createJmServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("JM MCP request failed:", error);
      if (!res.headersSent) res.writeHead(500).end("Internal server error");
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`JM ChatGPT Host Adapter v${ADAPTER_VERSION} listening on http://localhost:${port}${MCP_PATH}`);
});
