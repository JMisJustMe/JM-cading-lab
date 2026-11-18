import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import HAND_SOURCE_HTML from "../public-bodies/generated/128-hand-football-v0.7.4.html";

const HAND128_SOURCE_SHA256 = "f788dd3ff38c965fe5b8a7cd20c7b48929fc38a5b2b8a1f552e7b7732275b3fe";
const HAND128_SOURCE_BYTES = 24693;

const ADAPTER_VERSION = "0.2.0-beta.1";
const CHANNEL = "managed-beta";
const STABLE_ANCESTOR = "0.1.2";

const PROBE_URI = "ui://jm/inline-contact-probe-v0.2.html";
const PROBE_ID = "jm.inline-contact-probe/v0.2";
const HAND_URI = "ui://jm/128-hand-football-v0.7.4-managed-beta.html";
const HAND_BODY_ID = "jm.128-hand-football/v0.7.4";
const HAND_SOURCE_ROUTE = "/bodies/128-hand-football-v0.7.4/source";

const HOST_ROLE = "CARRIER_NOT_SOURCE_AUTHORITY";
const HOST_ASSIST = "REPAINT_RESIZE_ONLY/v0.1";

const PROBE_OUTPUT_SCHEMA = {
  schema: z.literal("jm.inline-contact-probe/render-receipt/v0.2"),
  probeId: z.literal(PROBE_ID),
  probeOnly: z.boolean(),
  hostAssist: z.literal(HOST_ASSIST),
  externalDataModified: z.boolean(),
  law: z.string(),
  chatgptContactProvenByServerCallAlone: z.boolean(),
};

const GAME_OUTPUT_SCHEMA = {
  schema: z.literal("jm.inline-contact/play-receipt/v0.2"),
  bodyId: z.literal(HAND_BODY_ID),
  sourceSha256: z.literal(HAND128_SOURCE_SHA256),
  sourceBytes: z.literal(HAND128_SOURCE_BYTES),
  exactSourceRecovered: z.boolean(),
  sourceBytesReturnedUnmodified: z.boolean(),
  hostAssist: z.literal(HOST_ASSIST),
  hostRole: z.literal(HOST_ROLE),
  externalDataModified: z.boolean(),
  chatgptContactProvenByServerCallAlone: z.boolean(),
};

const STATUS_OUTPUT_SCHEMA = {
  schema: z.literal("jm.inline-contact/status/v0.2"),
  adapterVersion: z.literal(ADAPTER_VERSION),
  channel: z.literal(CHANNEL),
  stableAncestor: z.literal(STABLE_ANCESTOR),
  bodyCount: z.number().int(),
  bodyIds: z.array(z.string()),
  contactClaim: z.string(),
};

const HOST_REPAINT_ASSIST = `<script id="JM_INLINE_HOST_ASSIST">
(()=>{
  const assist=(reason)=>{
    const root=document.documentElement;
    root.dataset.jmInlinePaint=String(Date.now())+'-'+reason;
    void root.offsetHeight;
    document.querySelectorAll('canvas').forEach((canvas)=>{ canvas.getBoundingClientRect(); });
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  };
  addEventListener('pageshow',()=>assist('pageshow'));
  addEventListener('focus',()=>assist('focus'));
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) assist('visible'); });
  addEventListener('orientationchange',()=>setTimeout(()=>assist('orientation'),120));
  addEventListener('pointerdown',()=>assist('first-pointer'),{capture:true,once:true});
  setTimeout(()=>assist('boot-1'),60);
  setTimeout(()=>assist('boot-2'),420);
})();
</script>`;

function withHostAssist(html) {
  const marker = "</body>";
  return html.includes(marker)
    ? html.replace(marker, `${HOST_REPAINT_ASSIST}${marker}`)
    : `${html}${HOST_REPAINT_ASSIST}`;
}

const PAGE_STYLE = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;background:#090a0f;color:#f7f7fb;line-height:1.55}
main{max-width:880px;margin:auto;padding:48px 22px 72px}.mark{display:inline-flex;align-items:center;gap:10px;font-weight:900;letter-spacing:.08em}.crown{color:#d8b35a}
h1{font-size:clamp(34px,7vw,64px);line-height:1;margin:24px 0 18px}h2{margin-top:34px}p,li{color:#c8cad5}a{color:#b9a5ff}.card{margin-top:24px;padding:20px;border:1px solid #ffffff20;border-radius:22px;background:#ffffff08}.pill{display:inline-block;padding:6px 10px;border:1px solid #ffffff24;border-radius:999px;font-size:12px;color:#d8d9e4}.foot{margin-top:46px;font-size:12px;color:#858895}code{color:#e9ddff}
`;

function documentPage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · JM Inline Contact</title><style>${PAGE_STYLE}</style></head><body><main><div class="mark"><span class="crown">♛</span><span>JM · JMISJUSTME</span></div>${body}<div class="foot">JM Inline Contact · ${CHANNEL} · adapter ${ADAPTER_VERSION} · stable ancestor ${STABLE_ANCESTOR}</div></main></body></html>`;
}

const HOME_HTML = documentPage("JM Inline Contact", `
  <span class="pill">MANAGED BETA · REAL BODY LANE</span>
  <h1>JM Inline Contact</h1>
  <p>The proved in-chat contact route is now being managed as a reusable host instrument. The frozen v0.1.2 Third Ding body remains the rollback ancestor.</p>
  <div class="card"><strong>Regression probe</strong><p><code>render-jm-inline-probe</code> keeps a tiny touch/state body available for host reliability checks.</p></div>
  <div class="card"><strong>First real playable body</strong><p><code>play-jm-128-hand-football</code> mounts the existing 128 Hand Football v0.7.4 source through the ChatGPT carrier. Source identity remains JM-owned and hash-anchored.</p></div>
  <div class="card"><strong>Try the actual originals here</strong><p><a href="/try-touch">Open touch/drag probe in this browser</a></p><p><a href="/play-128-hand">Play original 128 Hand Football</a></p><p>Browser interaction tests the original touch or game body. A laptop Commander action requires the separately authorised ChatGPT host bridge; no device command is issued from this webpage.</p></div>
  <p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a> · <a href="/health">Health</a></p>
`);

const PRIVACY_HTML = documentPage("Privacy", `
  <h1>Privacy</h1><p><strong>Effective:</strong> 21 August 2026</p>
  <p>The managed-beta tools do not request names, emails, passwords, payment data, health data, precise location, or other profile information. Pointer/touch game state is handled inside the rendered body and is not intentionally sent back to the JM MCP server.</p>
  <p>No advertising or tracking SDKs are included. Hosting and ChatGPT may process ordinary service telemetry under their own policies.</p>
`);

const TERMS_HTML = documentPage("Terms", `
  <h1>Terms</h1><p><strong>Effective:</strong> 21 August 2026</p>
  <p>JM Inline Contact is an experimental interactive software host surface. Managed-beta behavior may vary across clients while reliability is hardened.</p>
  <p>JM/JMISJUSTME source bodies remain source authority. ChatGPT/OpenAI acts as a host/carrier when rendering them and does not become source authority merely by doing so.</p>
`);

const SUPPORT_HTML = documentPage("Support", `
  <h1>Support</h1><p>Useful reports include the device/client, requested tool, whether the widget painted, whether contact changed state, and whether a reload/focus/orientation change recovered the surface.</p>
  <p>Do not send passwords, API keys or authentication codes.</p>
  <p>Technical source and issue tracking: <a href="https://github.com/JMisJustMe/JM-cading-lab">JMisJustMe/JM-cading-lab</a>.</p>
`);

const PROBE_HTML_BASE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><title>JM Inline Contact Probe v0.2</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#090a0f;color:#f7f7fb;min-height:100vh;overflow:hidden}.shell{min-height:100vh;padding:14px;display:grid;grid-template-rows:auto 1fr auto;gap:12px;background:radial-gradient(circle at 50% 25%,#222746 0,#10121f 35%,#090a0f 72%)}.top{display:flex;align-items:center;justify-content:space-between;gap:10px}.kicker{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.66}.state{font-size:12px;font-weight:900;padding:7px 10px;border:1px solid #ffffff24;border-radius:999px;background:#ffffff0d}.field{position:relative;min-height:285px;border-radius:28px;border:1px solid #ffffff24;overflow:hidden;touch-action:none;user-select:none;background:radial-gradient(circle at 50% 55%,#7439ff44,transparent 29%),linear-gradient(145deg,#10172b,#21152c 48%,#101b27);box-shadow:inset 0 0 70px #0009,0 18px 55px #0008}.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff09 1px,transparent 1px),linear-gradient(90deg,#ffffff09 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(to bottom,transparent,#000 22%,#000 80%,transparent)}.orb{position:absolute;width:74px;height:74px;border-radius:50%;left:50%;top:52%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,#fff 0 3%,#aef 8%,#7d5cff 34%,#2c176e 66%,#110b27 100%);box-shadow:0 0 28px #8b6cff,0 0 80px #663cff88;transition:left .16s ease,top .16s ease,transform .12s ease}.pulse{position:absolute;border:2px solid #c5b8ff;border-radius:50%;width:30px;height:30px;transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none}.pulse.go{animation:pulse .58s ease-out}@keyframes pulse{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(5)}}.center{position:absolute;left:50%;top:18%;transform:translateX(-50%);text-align:center;width:90%;pointer-events:none}.center b{font-size:27px;letter-spacing:.02em}.center small{display:block;margin-top:5px;opacity:.6;font-size:12px}.bottom{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.receipt{min-width:0;border:1px solid #ffffff1d;border-radius:18px;padding:11px 13px;background:#ffffff09}.receipt b{font-size:12px}.receipt div{font-size:11px;opacity:.58;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.count{min-width:74px;text-align:center;border-radius:18px;padding:10px;border:1px solid #ffffff24;background:#ffffff0d}.count b{font-size:22px;display:block}.count span{font-size:9px;letter-spacing:.15em;opacity:.55}.hit{transform:translate(-50%,-50%) scale(.82)}
</style></head><body><main class="shell"><div class="top"><div><div class="kicker">JM Visual Interaction Runtime</div><strong>INLINE CONTACT PROBE · V0.2</strong></div><div id="state" class="state">READY</div></div><section id="field" class="field" aria-label="Interactive contact field"><div class="grid"></div><div class="center"><b id="ding">TOUCH THE FIELD</b><small>tap · drag · press anywhere</small></div><div id="orb" class="orb"></div><div id="pulse" class="pulse"></div></section><section aria-label="Governed JM Commander action"><button id="jmCommanderContact" type="button" style="width:100%;padding:12px;border-radius:12px;background:#25203f;color:#fff;border:1px solid #b0a3da;font-weight:800;touch-action:manipulation">Run read-only Commander contact in background</button><div id="jmContactStatus" role="status" aria-live="polite" style="font-size:12px;margin-top:4px">Not requested</div></section><div class="bottom"><div class="receipt"><b id="receiptTitle">NO DING YET</b><div id="receiptText">CONTACT → STATE → CONSEQUENCE → TRACE</div></div><div class="count"><b id="count">0</b><span>CONTACTS</span></div></div></main>
<script>(()=>{const field=document.getElementById('field'),orb=document.getElementById('orb'),pulse=document.getElementById('pulse'),count=document.getElementById('count'),ding=document.getElementById('ding'),state=document.getElementById('state'),receiptTitle=document.getElementById('receiptTitle'),receiptText=document.getElementById('receiptText');let n=0,active=false;function land(e,label){const r=field.getBoundingClientRect(),x=Math.max(0,Math.min(r.width,e.clientX-r.left)),y=Math.max(0,Math.min(r.height,e.clientY-r.top));orb.style.left=(x/r.width*100)+'%';orb.style.top=(y/r.height*100)+'%';pulse.classList.remove('go');pulse.style.left=x+'px';pulse.style.top=y+'px';void pulse.offsetWidth;pulse.classList.add('go');n++;count.textContent=n;ding.textContent='DING '+n;state.textContent=label;receiptTitle.textContent='CONTACT LANDED';receiptText.textContent='TRACE '+String(n).padStart(3,'0')+' · '+label+' · VISIBLE CONSEQUENCE'}field.addEventListener('pointerdown',e=>{active=true;field.setPointerCapture?.(e.pointerId);orb.classList.add('hit');land(e,'CONTACT')});field.addEventListener('pointermove',e=>{if(active){orb.style.left=((e.clientX-field.getBoundingClientRect().left)/field.clientWidth*100)+'%';orb.style.top=((e.clientY-field.getBoundingClientRect().top)/field.clientHeight*100)+'%';state.textContent='ROUTING'}});field.addEventListener('pointerup',()=>{active=false;orb.classList.remove('hit');state.textContent='RELEASED';receiptText.textContent='TRACE '+String(n).padStart(3,'0')+' · RELEASE · RECOVERABLE STATE'});field.addEventListener('pointercancel',()=>{active=false;orb.classList.remove('hit');state.textContent='RECOVERED'})})();</script>
<script>(() => {
'use strict';
const b=document.getElementById('jmCommanderContact');
const info=document.getElementById('jmContactStatus');
let busy=false;
b?.addEventListener('click',async()=>{
 if(busy)return;busy=true;b.disabled=true;
 try {
  const h=window.openai;
  if(!h||typeof h.sendFollowUpMessage!=='function'){
   info.textContent='No ChatGPT contact bridge on this host. No command executed.';return;
  }
  if(typeof h.callTool==='function'){
   const r=await h.callTool('jm-commander-contact-intent',{action:'original_jm_commander_service_contact'});
   const x=r?.structuredContent||r?.structured_content||{};
   if(r?.isError||x.allowed!==true){
    info.textContent='Contact not admitted. No command executed.';return;
   }
  }
  await h.sendFollowUpMessage({prompt:"I have just explicitly pressed the JM Inline Contact governed Commander button. Run the original JM Commander CP08 read-only service contact on my connected GroundZeroJM laptop using the existing permitted route and return its verified new trace. Do not touch either phone, install, deploy, publish, spend, modify other sources or claim owner authentication from the widget alone."});
  info.textContent='Request sent into ChatGPT. Await a verified laptop receipt.';
 }catch(e){info.textContent='ChatGPT contact failed; no execution claimed.';}
 finally{busy=false;b.disabled=false;}
});
})();</script></body></html>`;

const PROBE_HTML = withHostAssist(PROBE_HTML_BASE);
const HAND_CARRIER_HTML = withHostAssist(HAND_SOURCE_HTML);

function createServer() {
  const server = new McpServer({ name: "JM Inline Contact Managed Beta", version: ADAPTER_VERSION });

  registerAppResource(server, "JM Inline Contact Probe v0.2", PROBE_URI, {}, async () => ({
    contents: [{ uri: PROBE_URI, mimeType: RESOURCE_MIME_TYPE, text: PROBE_HTML, _meta: {
      ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
      "openai/widgetDescription": "Managed-beta touch regression probe. Contact changes visible state and trace; host repaint assist is limited to reflow/resize recovery.",
      "jm/probeOnly": true,
      "jm/hostAssist": HOST_ASSIST,
      "jm/hostRole": "CONTACT_SURFACE_TEST_ONLY",
    }}],
  }));

  registerAppResource(server, "128 Hand Football v0.7.4", HAND_URI, {}, async () => ({
    contents: [{ uri: HAND_URI, mimeType: RESOURCE_MIME_TYPE, text: HAND_CARRIER_HTML, _meta: {
      ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } },
      "openai/widgetDescription": "128 Hand Football v0.7.4 running as a real JM playable body inside the ChatGPT carrier. Drag the HAND and use PASS, SHOOT, TACKLE and DEFEND.",
      "jm/bodyId": HAND_BODY_ID,
      "jm/sourceSha256": HAND128_SOURCE_SHA256,
      "jm/sourceBytes": HAND128_SOURCE_BYTES,
      "jm/exactSourceRecovered": true,
      "jm/sourceBytesReturnedUnmodified": false,
      "jm/hostAssist": HOST_ASSIST,
      "jm/hostRole": HOST_ROLE,
    }}],
  }));

  registerAppTool(server, "render-jm-inline-probe", {
    title: "Render JM inline contact probe",
    description: "Use this for a quick Inline Contact regression check. It opens the managed-beta JM touch probe in ChatGPT and changes no external data.",
    inputSchema: { probeId: z.literal(PROBE_ID).default(PROBE_ID) },
    outputSchema: PROBE_OUTPUT_SCHEMA,
    _meta: { ui: { resourceUri: PROBE_URI }, "openai/outputTemplate": PROBE_URI, "openai/widgetAccessible":true },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  }, async ({ probeId }) => ({
    content: [{ type: "text", text: "JM managed-beta contact probe mounted. Touch the field to verify visible state and Ding behavior." }],
    structuredContent: { schema: "jm.inline-contact-probe/render-receipt/v0.2", probeId, probeOnly: true, hostAssist: HOST_ASSIST, externalDataModified: false, law: "TOUCH -> READABLE STATE -> CONSEQUENCE -> TRACE", chatgptContactProvenByServerCallAlone: false },
    _meta: { ui: { resourceUri: PROBE_URI }, "openai/outputTemplate": PROBE_URI, "jm/probeOnly": true },
  }));

  registerAppTool(server, "play-jm-128-hand-football", {
    title: "Play JM 128 Hand Football",
    description: "Use when the user wants to play, open, test, or contact a real JM game inside ChatGPT. Mounts the existing 128 Hand Football v0.7.4 body; it does not generate a substitute game and does not modify external data.",
    inputSchema: { bodyId: z.literal(HAND_BODY_ID).default(HAND_BODY_ID) },
    outputSchema: GAME_OUTPUT_SCHEMA,
    _meta: { ui: { resourceUri: HAND_URI }, "openai/outputTemplate": HAND_URI },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  }, async () => ({
    content: [{ type: "text", text: "128 Hand Football v0.7.4 mounted through JM Inline Contact. Drag the HAND on the pitch and use PASS, SHOOT, TACKLE or DEFEND." }],
    structuredContent: { schema: "jm.inline-contact/play-receipt/v0.2", bodyId: HAND_BODY_ID, sourceSha256: HAND128_SOURCE_SHA256, sourceBytes: HAND128_SOURCE_BYTES, exactSourceRecovered: true, sourceBytesReturnedUnmodified: false, hostAssist: HOST_ASSIST, hostRole: HOST_ROLE, externalDataModified: false, chatgptContactProvenByServerCallAlone: false },
    _meta: { ui: { resourceUri: HAND_URI }, "openai/outputTemplate": HAND_URI, "jm/bodyId": HAND_BODY_ID, "jm/sourceSha256": HAND128_SOURCE_SHA256 },
  }));

  server.registerTool("jm-inline-status", {
    title: "JM Inline Contact status",
    description: "Read the managed-beta Inline Contact adapter version, frozen ancestor and mounted body identities. Use for diagnostics; it changes nothing.",
    inputSchema: {},
    outputSchema: STATUS_OUTPUT_SCHEMA,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  }, async () => ({
    content: [{ type: "text", text: `JM Inline Contact ${ADAPTER_VERSION} (${CHANNEL}). Stable rollback ancestor: ${STABLE_ANCESTOR}. Bodies: ${PROBE_ID}, ${HAND_BODY_ID}.` }],
    structuredContent: { schema: "jm.inline-contact/status/v0.2", adapterVersion: ADAPTER_VERSION, channel: CHANNEL, stableAncestor: STABLE_ANCESTOR, bodyCount: 2, bodyIds: [PROBE_ID, HAND_BODY_ID], contactClaim: "SERVER_STATUS_ONLY_NOT_A_NEW_DING" },
  }));

  server.registerTool("jm-commander-contact-intent", {
    title: "Validate fixed JM Commander read-only contact request",
    description: "Admits only the intent; does not execute a laptop operation.",
    inputSchema: { action: z.literal("original_jm_commander_service_contact") },
    outputSchema: {
      schema:z.literal("JM.Inline.Commander.Intent/CP11"),
      allowed:z.boolean(),executed:z.boolean(),phonesTouched:z.boolean()
    },
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false,idempotentHint:true},
  },async()=>({
    content:[{type:"text",text:"Original JM Commander read-only intent admitted, not executed."}],
    structuredContent:{schema:"JM.Inline.Commander.Intent/CP11",allowed:true,executed:false,phonesTouched:false}
  }));
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

function textResponse(text, contentType = "text/plain; charset=utf-8") {
  return new Response(text, { headers: { "content-type": contentType, "cache-control": "no-store" } });
}

function jsonResponse(value) {
  return textResponse(`${JSON.stringify(value, null, 2)}\n`, "application/json; charset=utf-8");
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

    if (url.pathname === "/") return textResponse(HOME_HTML, "text/html; charset=utf-8");
    if (url.pathname === "/try-touch") return textResponse(PROBE_HTML, "text/html; charset=utf-8");
    if (url.pathname === "/play-128-hand") return textResponse(HAND_SOURCE_HTML, "text/html; charset=utf-8");
    if (url.pathname === "/privacy") return textResponse(PRIVACY_HTML, "text/html; charset=utf-8");
    if (url.pathname === "/terms") return textResponse(TERMS_HTML, "text/html; charset=utf-8");
    if (url.pathname === "/support") return textResponse(SUPPORT_HTML, "text/html; charset=utf-8");
    if (url.pathname === HAND_SOURCE_ROUTE) return textResponse(HAND_SOURCE_HTML, "text/html; charset=utf-8");
    if (url.pathname === `${HAND_SOURCE_ROUTE}.sha256`) return textResponse(`${HAND128_SOURCE_SHA256}  OPEN_FIRST_128_HAND_FOOTBALL_v0_7_4.html\n`);
    if (url.pathname === "/.well-known/openai-apps-challenge") return textResponse("JM_INLINE_CONTACT_MANAGED_BETA_NOT_SUBMISSION_AUTHORITY\n");
    if (url.pathname === "/health") return jsonResponse({
      ok: true,
      adapterVersion: ADAPTER_VERSION,
      channel: CHANNEL,
      stableAncestor: STABLE_ANCESTOR,
      outputSchemaDeclared: true,
      hostAssist: HOST_ASSIST,
      tools: ["render-jm-inline-probe", "play-jm-128-hand-football", "jm-inline-status"],
      bodies: [
        { bodyId: PROBE_ID, resourceUri: PROBE_URI, kind: "regression-probe" },
        { bodyId: HAND_BODY_ID, resourceUri: HAND_URI, kind: "real-playable", sourceSha256: HAND128_SOURCE_SHA256, sourceBytes: HAND128_SOURCE_BYTES, exactSourceRecovered: true },
      ],
      proofBoundary: "PUBLIC_SERVER_SUCCESS_DOES_NOT_CREATE_A_NEW_CONTACT_DING",
    });

    if (url.pathname !== "/mcp") return new Response("Not Found", { status: 404 });

    const server = createServer();
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCors(response);
  },
};
