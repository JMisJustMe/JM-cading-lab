import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const PROBE_URI = "ui://jm/inline-contact-probe-v0.1.html";
const PROBE_ID = "jm.inline-contact-probe/v0.1";
const ADAPTER_VERSION = "0.1.2";

const PROBE_OUTPUT_SCHEMA = {
  schema: z.literal("jm.inline-contact-probe/render-receipt/v0.1"),
  probeId: z.literal(PROBE_ID),
  probeOnly: z.boolean(),
  privateDonorBytesIncluded: z.boolean(),
  law: z.string(),
  chatgptContactProvenByServerCallAlone: z.boolean(),
};

const PAGE_STYLE = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;background:#090a0f;color:#f7f7fb;line-height:1.55}
main{max-width:880px;margin:auto;padding:48px 22px 72px}.mark{display:inline-flex;align-items:center;gap:10px;font-weight:900;letter-spacing:.08em}.crown{color:#d8b35a}
h1{font-size:clamp(34px,7vw,64px);line-height:1;margin:24px 0 18px}h2{margin-top:34px}p,li{color:#c8cad5}a{color:#b9a5ff}.card{margin-top:24px;padding:20px;border:1px solid #ffffff20;border-radius:22px;background:#ffffff08}.pill{display:inline-block;padding:6px 10px;border:1px solid #ffffff24;border-radius:999px;font-size:12px;color:#d8d9e4}.foot{margin-top:46px;font-size:12px;color:#858895}
`;

function documentPage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · JM Inline Contact</title><style>${PAGE_STYLE}</style></head><body><main><div class="mark"><span class="crown">♛</span><span>JM · JMISJUSTME</span></div>${body}<div class="foot">JM Inline Contact · public probe v${ADAPTER_VERSION} · This page describes the current non-sensitive contact probe.</div></main></body></html>`;
}

const HOME_HTML = documentPage("JM Inline Contact", `
  <span class="pill">PUBLIC MCP CONTACT SURFACE</span>
  <h1>JM Inline Contact</h1>
  <p>A small interactive ChatGPT/MCP Apps surface for proving one thing cleanly: contact inside the host should produce readable state, visible consequence, and trace.</p>
  <div class="card"><strong>Current public body</strong><p>The published v0.1 probe contains no private or frozen JM game donor bytes, requires no account, and stores no user profile or gameplay history on this server.</p></div>
  <p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a></p>
`);

const PRIVACY_HTML = documentPage("Privacy", `
  <h1>Privacy</h1>
  <p><strong>Effective:</strong> 21 August 2026</p>
  <p>The current JM Inline Contact public probe is intentionally minimal. It does not ask for a name, email address, account credentials, payment data, health data, precise location, or other personal profile information.</p>
  <h2>What the probe processes</h2>
  <p>The MCP server receives the normal technical requests required to deliver the app resource and tool result. The public tool accepts only its fixed probe identifier. Touch and drag state is handled inside the rendered widget and is not intentionally persisted by the JM probe server.</p>
  <h2>What the probe does not do</h2>
  <ul><li>No advertising or tracking SDKs are included.</li><li>No sale of personal information.</li><li>No authentication database.</li><li>No private or frozen JM game donor content is included in the public probe.</li></ul>
  <h2>Infrastructure</h2>
  <p>ChatGPT/OpenAI and the hosting provider may process ordinary service telemetry, network information, or logs under their own terms and privacy practices. This policy describes the JM Inline Contact probe itself.</p>
  <h2>Questions</h2><p>Use the <a href="/support">support page</a> for support and privacy questions.</p>
`);

const TERMS_HTML = documentPage("Terms", `
  <h1>Terms</h1>
  <p><strong>Effective:</strong> 21 August 2026</p>
  <p>JM Inline Contact is an experimental interactive software surface provided for contact, interface, and gameplay-host testing. By using it, you agree to use it lawfully and in accordance with the host platform's applicable terms and policies.</p>
  <h2>Current scope</h2><p>The public v0.1 body is a non-sensitive contact probe. It is not a payment service, account store, safety-critical service, medical service, or guarantee that every ChatGPT client will render identical interactive behavior.</p>
  <h2>Ownership</h2><p>JM/JMISJUSTME source bodies, visual identity, and original software remain with their respective owner. The host carries the interaction surface and does not become source authority merely by rendering it.</p>
  <h2>Availability</h2><p>The probe may change, be suspended, or be withdrawn while the Inline Contact route is tested and improved. Reasonable care is taken to preserve truthful status and proof boundaries.</p>
  <h2>Support</h2><p>For technical issues, use the <a href="/support">support page</a>.</p>
`);

const SUPPORT_HTML = documentPage("Support", `
  <h1>Support</h1>
  <p>For the current JM Inline Contact probe, support covers failure to load the MCP surface, missing interactive UI, touch/drag behavior that does not produce visible state, and incorrect tool routing.</p>
  <div class="card"><strong>When reporting a problem</strong><p>Include the device/surface (ChatGPT web, desktop, or mobile), what you asked ChatGPT to do, and whether the inline surface appeared and responded to touch or pointer contact. Do not send passwords, API keys, authentication codes, or other secrets.</p></div>
  <p>Technical source and issue tracking: <a href="https://github.com/JMisJustMe/JM-cading-lab">JMisJustMe/JM-cading-lab</a>.</p>
`);

const PROBE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>JM Inline Contact Probe</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:#090a0f;color:#f7f7fb;min-height:100vh;overflow:hidden}
.shell{min-height:100vh;padding:14px;display:grid;grid-template-rows:auto 1fr auto;gap:12px;background:radial-gradient(circle at 50% 25%,#222746 0,#10121f 35%,#090a0f 72%)}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.kicker{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.66}.state{font-size:12px;font-weight:900;padding:7px 10px;border:1px solid #ffffff24;border-radius:999px;background:#ffffff0d}.field{position:relative;min-height:285px;border-radius:28px;border:1px solid #ffffff24;overflow:hidden;touch-action:none;user-select:none;background:radial-gradient(circle at 50% 55%,#7439ff44,transparent 29%),linear-gradient(145deg,#10172b,#21152c 48%,#101b27);box-shadow:inset 0 0 70px #0009,0 18px 55px #0008}.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff09 1px,transparent 1px),linear-gradient(90deg,#ffffff09 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(to bottom,transparent,#000 22%,#000 80%,transparent)}.orb{position:absolute;width:74px;height:74px;border-radius:50%;left:50%;top:52%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,#fff 0 3%,#aef 8%,#7d5cff 34%,#2c176e 66%,#110b27 100%);box-shadow:0 0 28px #8b6cff,0 0 80px #663cff88;transition:left .16s ease,top .16s ease,transform .12s ease}.pulse{position:absolute;border:2px solid #c5b8ff;border-radius:50%;width:30px;height:30px;transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none}.pulse.go{animation:pulse .58s ease-out}@keyframes pulse{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(5)}}.center{position:absolute;left:50%;top:18%;transform:translateX(-50%);text-align:center;width:90%;pointer-events:none}.center b{font-size:27px;letter-spacing:.02em}.center small{display:block;margin-top:5px;opacity:.6;font-size:12px}.bottom{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.receipt{min-width:0;border:1px solid #ffffff1d;border-radius:18px;padding:11px 13px;background:#ffffff09}.receipt b{font-size:12px}.receipt div{font-size:11px;opacity:.58;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.count{min-width:74px;text-align:center;border-radius:18px;padding:10px;border:1px solid #ffffff24;background:#ffffff0d}.count b{font-size:22px;display:block}.count span{font-size:9px;letter-spacing:.15em;opacity:.55}.hit{transform:translate(-50%,-50%) scale(.82)}
</style>
</head>
<body>
<main class="shell">
  <div class="top"><div><div class="kicker">JM Visual Interaction Runtime</div><strong>INLINE CONTACT PROBE</strong></div><div id="state" class="state">READY</div></div>
  <section id="field" class="field" aria-label="Interactive contact field">
    <div class="grid"></div><div class="center"><b id="ding">TOUCH THE FIELD</b><small>tap · drag · press anywhere</small></div><div id="orb" class="orb"></div><div id="pulse" class="pulse"></div>
  </section>
  <div class="bottom"><div class="receipt"><b id="receiptTitle">NO DING YET</b><div id="receiptText">CONTACT → STATE → CONSEQUENCE → TRACE</div></div><div class="count"><b id="count">0</b><span>CONTACTS</span></div></div>
</main>
<script>
(() => {
  const field=document.getElementById('field'),orb=document.getElementById('orb'),pulse=document.getElementById('pulse'),count=document.getElementById('count'),ding=document.getElementById('ding'),state=document.getElementById('state'),receiptTitle=document.getElementById('receiptTitle'),receiptText=document.getElementById('receiptText');
  let n=0,active=false;
  function land(e,label){
    const r=field.getBoundingClientRect(); const x=Math.max(0,Math.min(r.width,e.clientX-r.left)); const y=Math.max(0,Math.min(r.height,e.clientY-r.top));
    orb.style.left=(x/r.width*100)+'%'; orb.style.top=(y/r.height*100)+'%';
    pulse.classList.remove('go'); pulse.style.left=x+'px'; pulse.style.top=y+'px'; void pulse.offsetWidth; pulse.classList.add('go');
    n++; count.textContent=n; ding.textContent='DING '+n; state.textContent=label; receiptTitle.textContent='CONTACT LANDED'; receiptText.textContent='TRACE '+String(n).padStart(3,'0')+' · '+label+' · VISIBLE CONSEQUENCE';
  }
  field.addEventListener('pointerdown',e=>{active=true;field.setPointerCapture?.(e.pointerId);orb.classList.add('hit');land(e,'CONTACT');});
  field.addEventListener('pointermove',e=>{if(active){orb.style.left=((e.clientX-field.getBoundingClientRect().left)/field.clientWidth*100)+'%';orb.style.top=((e.clientY-field.getBoundingClientRect().top)/field.clientHeight*100)+'%';state.textContent='ROUTING';}});
  field.addEventListener('pointerup',()=>{active=false;orb.classList.remove('hit');state.textContent='RELEASED';receiptText.textContent='TRACE '+String(n).padStart(3,'0')+' · RELEASE · RECOVERABLE STATE';});
  field.addEventListener('pointercancel',()=>{active=false;orb.classList.remove('hit');state.textContent='RECOVERED';});
})();
</script>
</body>
</html>`;

function createProbeServer() {
  const server = new McpServer({ name: "JM Inline Contact Probe", version: ADAPTER_VERSION });

  registerAppResource(
    server,
    "JM Inline Contact Probe v0.1",
    PROBE_URI,
    {},
    async () => ({
      contents: [{
        uri: PROBE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: PROBE_HTML,
        _meta: {
          ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
          "openai/widgetDescription": "A touch-driven JM contact field. Touching or dragging the orb changes visible state and trace inside the widget.",
          "jm/probeOnly": true,
          "jm/hostRole": "CONTACT_SURFACE_TEST_ONLY",
        },
      }],
    }),
  );

  registerAppTool(
    server,
    "render-jm-inline-probe",
    {
      title: "Render JM inline contact probe",
      description: "Use this when the user wants to open or test the JM touch-driven interactive contact surface inside ChatGPT. It renders the public non-sensitive probe and does not modify external data.",
      inputSchema: { probeId: z.literal(PROBE_ID).default(PROBE_ID) },
      outputSchema: PROBE_OUTPUT_SCHEMA,
      _meta: {
        ui: { resourceUri: PROBE_URI },
        "openai/outputTemplate": PROBE_URI,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async ({ probeId }) => ({
      content: [{ type: "text", text: "JM Inline Contact Probe mounted. Touching or dragging the field should create visible state and a Ding if the host renders the interactive resource." }],
      structuredContent: {
        schema: "jm.inline-contact-probe/render-receipt/v0.1",
        probeId,
        probeOnly: true,
        privateDonorBytesIncluded: false,
        law: "TOUCH -> READABLE STATE -> CONSEQUENCE -> TRACE",
        chatgptContactProvenByServerCallAlone: false,
      },
      _meta: {
        ui: { resourceUri: PROBE_URI },
        "openai/outputTemplate": PROBE_URI,
        "jm/probeOnly": true,
      },
    }),
  );
  return server;
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "accept, authorization, content-type, mcp-protocol-version, mcp-session-id");
  headers.set("Access-Control-Expose-Headers", "mcp-session-id");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function htmlResponse(html) {
  return new Response(html, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "public,max-age=300" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname === "/mcp") return withCors(new Response(null, { status: 204 }));
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, adapterVersion: ADAPTER_VERSION, body: PROBE_ID, probeOnly: true, privateDonorBytesIncluded: false, outputSchemaDeclared: true, claim: "PUBLIC_MCP_PROBE_NOT_CHATGPT_CONTACT_PROOF" }), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
    }
    if (request.method === "GET" && url.pathname === "/") return htmlResponse(HOME_HTML);
    if (request.method === "GET" && url.pathname === "/privacy") return htmlResponse(PRIVACY_HTML);
    if (request.method === "GET" && url.pathname === "/terms") return htmlResponse(TERMS_HTML);
    if (request.method === "GET" && url.pathname === "/support") return htmlResponse(SUPPORT_HTML);
    if (request.method === "GET" && url.pathname === "/.well-known/openai-apps-challenge") {
      const token = env?.OPENAI_APPS_CHALLENGE || "";
      return token ? new Response(token, { headers: { "content-type": "text/plain;charset=utf-8", "cache-control": "no-store" } }) : new Response("Challenge token not seated yet", { status: 404 });
    }
    if (url.pathname !== "/mcp") return new Response("Not Found", { status: 404 });

    const server = createProbeServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCors(response);
  },
};
