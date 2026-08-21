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

function readFrozenBody() {
  return fs.readFileSync(BODY_PATH, "utf8");
}

const toolUiMeta = {
  ui: { resourceUri: TEMPLATE_URI },
  "openai/outputTemplate": TEMPLATE_URI,
};

function createJmServer() {
  const server = new McpServer({
    name: "JM ChatGPT Host Adapter",
    version: "0.1.1",
  });

  registerAppResource(
    server,
    "JM Untitled Field Branch v0.9 — frozen playable body",
    TEMPLATE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: TEMPLATE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: readFrozenBody(),
          _meta: {
            ui: {
              prefersBorder: false,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
            "jm/sourceAuthority": "JM / frozen donor body",
            "jm/sourceSha256": BODY_SHA256,
            "jm/hostRole": "CARRIER_NOT_SOURCE_AUTHORITY",
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "render-jm-game",
    {
      title: "Render JM game inline",
      description:
        "Use this when the user wants the existing JM playable body rendered as an interactive in-chat app surface. This host adapter carries the body; it does not redefine the game or its source authority.",
      inputSchema: {
        bodyId: z.literal(BODY_ID).default(BODY_ID),
      },
      _meta: toolUiMeta,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async ({ bodyId }) => ({
      _meta: {
        ...toolUiMeta,
        "openai/widgetSessionId": WIDGET_SESSION_ID,
        "jm/sourceSha256": BODY_SHA256,
        "jm/hostRole": "CARRIER_NOT_SOURCE_AUTHORITY",
      },
      content: [
        {
          type: "text",
          text: "Mounted the existing frozen JM playable body into the in-chat host surface. The host carries play; it does not own the game.",
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
        keeper: "The estate donates. The game remains sovereign. The host serves play. Trace proves consequence.",
      },
    }),
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
      adapterVersion: "0.1.1",
      bodyId: BODY_ID,
      sourceSha256: BODY_SHA256,
      playableIrSchema: PLAYABLE_IR_SCHEMA,
      oneBodyAbi: ONEBODY_ABI,
      claim: "HOST_ADAPTER_BUILT_NOT_CHATGPT_CONTACT_PROVEN",
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
  console.log(`JM ChatGPT Host Adapter v0.1.1 listening on http://localhost:${port}${MCP_PATH}`);
});
