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
  field.addEventListener('pointerup',e=>{active=false;orb.classList.remove('hit');state.textContent='RELEASED';receiptText.textContent='TRACE '+String(n).padStart(3,'0')+' · RELEASE · RECOVERABLE STATE';});
  field.addEventListener('pointercancel',()=>{active=false;orb.classList.remove('hit');state.textContent='RECOVERED';});
})();
</script>
</body>
</html>`;

function createProbeServer() {
  const server = new McpServer({ name: "JM Inline Contact Probe", version: "0.1.0" });

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
      description: "Use this when proving that the ChatGPT/MCP Apps host can render and run a JM interactive contact surface inline. This probe contains no frozen/private game donor bytes.",
      inputSchema: { probeId: z.literal(PROBE_ID).default(PROBE_ID) },
      _meta: {
        ui: { resourceUri: PROBE_URI },
        "openai/outputTemplate": PROBE_URI,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    },
    async ({ probeId }) => ({
      content: [{ type: "text", text: "JM Inline Contact Probe mounted. Touching the field should create a visible Ding if the host renders the interactive resource." }],
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && url.pathname === "/mcp") return withCors(new Response(null, { status: 204 }));
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, body: PROBE_ID, probeOnly: true, privateDonorBytesIncluded: false, claim: "PUBLIC_MCP_PROBE_NOT_CHATGPT_CONTACT_PROOF" }), { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
    }
    if (url.pathname !== "/mcp") return new Response("JM Inline Contact Probe · use /mcp", { status: 200, headers: { "content-type": "text/plain;charset=utf-8" } });

    const server = createProbeServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCors(response);
  },
};
