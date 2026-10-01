#!/usr/bin/env python3
import json
import os
import re
import sys
import urllib.request
import urllib.error
from difflib import SequenceMatcher
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

VERSION = "0.5.0"
SERVER_NAME = "JM ECOSTATE Build Mesh Native MCP"
NAVIGATOR_MCP = os.environ.get(
    "JM_NAVIGATOR_MCP",
    "https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp",
)
SUPPORTED_PROTOCOLS = {"2025-06-18", "2025-03-26"}
DEFAULT_PROTOCOL = "2025-06-18"

CURRENT = [{"id":"career-v06","title":"JM Career Hire-Me Front Door v0.6","status":"CURRENT CANDIDATE · OWNER/PUBLIC CROWN OPEN","summary":"The UX branch remains the working front door while the JM-native coding-body route now owns interaction and a current-project registry is mounted into the same source body.","proof":"Built forward from v0.5.1 public/return-route lineage and v0.5.3 JM-runtime candidate.","boundary":"Candidate until owner contact; current public/owner-contacted head is not silently replaced."},{"id":"gripcube-rpa","title":"JM GripCube — Relational Projection Architecture v0.1.1","status":"LIVE REFERENCE RUNTIME · ASSISTANT QA PASS · OWNER CONTACT OPEN","summary":"GripCube was extracted from one website use into a broader one-body/many-projections architecture, then corrected by the no-dead-controls affordance law.","proof":"Current pointer names v0.1.1 as the reference runtime and preserves ONE BODY. MANY LEGIBLE PROJECTIONS.","boundary":"Universal/general architecture crown remains open pending wider real-body pressure tests."},{"id":"llm-core-v1","title":"JM LLM Core v1.0 — First Complete Edition","status":"FLAZ COMPLETE · FIRST COMPLETE EDITION","summary":"A real small causal language-model core with 4,096-token TokenBody, 256-token context and 7,875,147 learned parameters, advanced through bounded generation, retrieval and compositional routes.","proof":"Major first-edition lanes received direct contact; v0.15 retrieval exam 500/500 and v0.16 compositional/short-response exam 400/400 are preserved in the closure.","boundary":"Not claimed as frontier/general-assistant capability; free generation and broad reasoning remain advancement targets."},{"id":"llm2-v2","title":"JM LLM #2 v2.0 — Unified Executable Program Edition","status":"FLAZ COMPLETE · PACKAGE-PROVEN · ZIONFOLDERED","summary":"Nine current capabilities compile through one ProgramHead architecture into one bounded universal action program/interpreter, removing the v1.9 mode-router split from the success path.","proof":"Executable-program acquisition 46/46 PASS; full integration 23/23 PASS; deterministic program-bank reacquisition matched exactly.","boundary":"Bounded fixed-ISA program emission, not arbitrary code generation or unrestricted program induction."},{"id":"agi-v144","title":"JM AGI Lab v1.4.4 — Durability Settle / Live Integration","status":"FLAZ COMPLETE AT OWNER WINDOWS EDGE PROCESS-RESTART SCOPE","summary":"A bounded general-agent laboratory with explicit consequence verification and persistence/process-contact harnesses.","proof":"Assistant clean-sandbox battery 60/60 PASS; owner Windows Edge exact-body process-restart Ding earned with read-back/restore/process-zero evidence.","boundary":"No AGI or human-level intelligence claim; OS reboot, broader model contact and cross-device persistence remain separate."},{"id":"legal-v11","title":"JM LEGAL — Matter Router v0.8.2 + Pre-External Pilot Gate v1.1","status":"ROUTER CLOSED · PHASE A READY · EXTERNAL CONTACT OPEN","summary":"The matter-routing workbench reached corrected owner-device contact, then advanced to a bounded pre-external-pilot operating gate.","proof":"v0.8.2 deep QA 46/46 PASS and owner Test 001 auto-gate PASS; v1.1 operating gate regression 18/18 PASS.","boundary":"No live-client, regulated-activity, paid/public or incorporated-provider claim."},{"id":"secrets-v13","title":"Secrets of Silence — Flagship Master v1.3","status":"FLAGSHIP MASTERING COMPLETE AT ARTIFACT / ASSISTANT SCOPE","summary":"The flagship book was remastered around reader-first contact, agency/consequence precision and a restrained native reader interface.","proof":"69-page DOCX/interior, 71-page reader PDF, EPUB parse PASS and full visual QA are preserved in the closure.","boundary":"Live reader, owner-device and market contact remain separate."},{"id":"rukquss-v1","title":"RUKQUSS REALITY — Business Formation Decision v1.0","status":"FORMATION DECISION FLAZ COMPLETE · INCORPORATION OPEN","summary":"The commercial topology was settled as creator/source owner → licence gate → limited company → release/customer contact, with RUKQUSS REALITY LTD as the working legal name.","proof":"Decision/formation architecture frozen and re-entry ready.","boundary":"The company is not claimed incorporated or name-reserved until real Companies House evidence exists."},{"id":"targetbridge","title":"JM Target Bridge — Cross-Build × Cross-Engine Stage","status":"FLAZ COMPLETE AT DECLARED 4/4 PHYSICAL MATRIX","summary":"The bridge carries a bounded source body across host boundaries without manually reconstructing the test inside each host.","proof":"Original specimen and SPINBREAK slice each passed in GDevelop and Unity: 4/4 declared physical matrix.","boundary":"Unreal/other engines are forward expansion; recipient proof does not transfer automatically."},{"id":"kicshift-v11","title":"KICSHIFT v1.1 — Frame Authority / Contact Parity","status":"STANDARD-FLOOR FLAZ COMPLETE · HOLD / RETURN LATER","summary":"A three-way arena combat descendant preserving dual-vector movement, one-thumb combat flow, articulated contact, AI pressure and camera/frame authority.","proof":"Owner-phone contact confirmed all three fighters, full arena and primary controls visible/readable together.","boundary":"Browser/ECOSTATE standard floor, not a native/commercial release crown."},{"id":"ecostate-v2","title":"JMISJUSTME — JM ECOSTATE Professional Convergence v2.0","status":"BUILD COMPLETE · STATIC QA PASS · GITHUB SOURCE MERGED","summary":"One professional front door was built over many sovereign bodies, with Authuser as the creator-facing bridge into ECOSTATE.","proof":"Professional Convergence changes merged to main through the recorded GitHub source route.","boundary":"The retrieved v2.0 pointer keeps its independent deployment/contact gate distinct from source merge."},{"id":"authuser-v11","title":"JM AUTHUSER — Hawk-Read Successor v1.1","status":"CONCEPTUAL FLAZ COMPLETE · SUCCESSOR, NOT REWRITE","summary":"Authuser was reduced to a sharper creator→body→participatory-contact→creator-change relation while preserving stronger loop/practice/formation layers.","proof":"Five-gate hawk-read reduction and explicit event ≠ loop ≠ practice ≠ formation distinctions are frozen.","boundary":"Not an exhaustive historical-priority or universal originality claim."},{"id":"routecore-contact","title":"JM RouteCore — Execution Contact Checkpoint","status":"DING COMPLETE AT BIOS/QEMU EMULATOR SCOPE","summary":"The frozen BIOS disk was externally booted under QEMU/SeaBIOS and then pressure-tested with live PIT IRQ0 and PS/2 IRQ1 observability probes.","proof":"Kernel-ready boot markers returned; PIT IRQ0 and PS/2 IRQ1 contact receipts were observed.","boundary":"Physical-machine boot, physical IRQ/device contact and UEFI execution were not claimed by this checkpoint."},{"id":"coding-control-plane","title":"JM Coding / Cading / Runtime / OS Control Plane","status":"CURRENT CONTROL PLANE · 64 CODING IDENTITIES RECONCILED","summary":"The coding estate is routed through an integrated current head rather than a pile of rival front doors; OneBody Coding OS is the current integrated workbench, with specialist compiler/runtime/forge organs retained.","proof":"64 coding identities; 61/61 inherited maturation accounted; 3 post-census identities; 15/15 new-body executable proof; 10/10 root routes and 11/11 authority lanes connected in the control-plane closure.","boundary":"Current authority is typed by lane; specialist organs retain their own scope and owner/device gates."},{"id":"theory-second-order","title":"JM Theory Estate — First + Second-Order Strengthening","status":"51/51 STRICT BODIES · 7/7 FIRST-ORDER · 7/7 SECOND-ORDER","summary":"Completed theory bodies were pressure-tested against neighbours and then bridge-to-bridge without silently merging their offices.","proof":"51/51 strict-theory completion; 7/7 first strengthening runs; 7/7 second-order runs; strict count remained 51; silent merges 0.","boundary":"Internal conceptual completion and strengthening do not by themselves establish external scientific validation."},{"id":"social-economy","title":"JM ECOSTATE Social Economy Study v1.0","status":"RESEARCH 10/10 COMPLETE · CLAIM AUDIT 10/10 · FLAZ","summary":"A ten-run evidence-led study of public counters, active audience, retention, return, qualification and economic consequence across major social platforms.","proof":"10/10 research runs complete; 10/10 claim audit/reconstruction coverage; 0 open factual holds after reconciliation.","boundary":"Platform findings are evidence for publishing experiments, not a universal law of audience behaviour."},{"id":"music-release-run","title":"JM Release Run — Music Keeps the Mic","status":"FLAZ PARENT + LIVE RETURN CONTACT ADDENDUM","summary":"Exact lyric-source recovery shaped a release sequence, then later direct live freestyle contact produced a separate performance body without erasing the written route.","proof":"Music Master Index preserves 48 creative-work authorities; Release Run v1.0 is FLAZ; v1.1 records direct live vocal/freestyle contact.","boundary":"Wisdom’s Loading-specific mouth/body/beat runtime and public music release remain open."},{"id":"teaching-v52","title":"JM Teaching / Learning Engine v5.2","status":"ACTIVE LIVING DESCENDANT","summary":"A learner-centred engine with separate learner lanes, pressure, hints, recovery, trace, co-op, contact modes, adaptive skill traces and learner/parent choice over suggestions.","proof":"Current v5.2 carrier preserves the Engine/Pack split, Quick/Probe/Make/Read contact modes, living routes, Contact Compass and explicit non-ranking co-op logic.","boundary":"Family/learner contact remains human-governed; the person is never reduced to the route."}];

OVERLAY = [{"name":"JMISJUSTME","summary":"JM ECOSTATE Professional Convergence v2.0","section":"Estate / public / device"},{"name":"JM Living Estate v1.3.0 Universal APK (API 36 rail)","summary":"","section":"Estate / public / device"},{"name":"Android Forge v1.4.1","summary":"dual-surface workshop / Project Shelf / OneBody route","section":"Estate / public / device"},{"name":"JM AUTHUSER","summary":"Hawk-Read Successor v1.1 conceptual successor; preserve creator/source-purpose lineage","section":"Estate / public / device"},{"name":"JM32-1DA compiler v2.2.1","summary":"","section":"Coding / runtime / OS"},{"name":"RouteOS Kernel Gate","summary":"PASS at proved scope","section":"Coding / runtime / OS"},{"name":"Zionfolder OS v0.5.1","summary":"","section":"Coding / runtime / OS"},{"name":"CadenVM v0.10","summary":"","section":"Coding / runtime / OS"},{"name":"JM RouteCore","summary":"BIOS/QEMU emulator-scope execution contact earned; physical-device proof not implied","section":"Coding / runtime / OS"},{"name":"JM32-1DA Cross-Device Runtime Adapter v0.2 complete at declared scope","summary":"","section":"Coding / runtime / OS"},{"name":"Coding Growth Mesh Programme","summary":"64/64 bodies; Generation 9 floor; 24,481 assertions PASS","section":"Coding / runtime / OS"},{"name":"PLAYFORM, JM GameCore, GameForge, GlyphPlay, GlyphForge, Kading Engine, JumpMotion v0.2","summary":"donor/runtime family","section":"Games / engines / interaction"},{"name":"JM Target Bridge v0.6","summary":"JM.TargetBridge/0.1; faces include GDevelop, Unity, Unreal, Godot, Phaser, Construct3, GameMaker, Defold, Bevy, MonoGame","section":"Games / engines / interaction"},{"name":"Western Sniper × House Siege executable v0.2 release descendant; standing executable flagship lane","summary":"","section":"Games / engines / interaction"},{"name":"FOURFOLD and Fight Clash executable descendants","summary":"","section":"Games / engines / interaction"},{"name":"SHIFT//FIELD active mutable-interaction lane; inherit existing donors before user mega-check","summary":"","section":"Games / engines / interaction"},{"name":"JM LLM Core v1.0 First Complete Edition protected complete ancestor","summary":"","section":"AI"},{"name":"JM LLM #2 v2.0 Unified Executable Program Edition","summary":"FLAZ complete, package-proven, Zionfoldered; current pointer dated 29 Sep 2026","section":"AI"},{"name":"JM AGI Lab v1.4.4 Durability Settle / Live Integration","summary":"owner Windows Edge exact-body process-restart durability scope; no AGI/human-level claim","section":"AI"},{"name":"JM LEGAL Matter Router Workbench v0.8.2","summary":"owner-device contact verified, current internal runtime head","section":"Legal / business"},{"name":"JM LEGAL Pre-External Pilot Operating Gate v1.1","summary":"Phase A ready; external operating contact open","section":"Legal / business"},{"name":"RUKQUSS REALITY Business Formation Decision v1.0","summary":"formation architecture closed; actual Companies House incorporation open","section":"Legal / business"},{"name":"Secrets of Silence Flagship Master v1.3","summary":"","section":"Writing / music / publishing"},{"name":"LyricStudio v0.4 BT","summary":"","section":"Writing / music / publishing"},{"name":"JM Release Run","summary":"Music Keeps the Mic FLAZ parent with live return-contact addendum","section":"Writing / music / publishing"},{"name":"Active lyric return lead: Wisdom’s Loading / SHIMS ACTION → Broke Broke → I Need A Good Time Vibe","summary":"","section":"Writing / music / publishing"},{"name":"JM Theory Estate First + Second-Order Strengthening","summary":"51/51 strict bodies; 7/7 first-order and 7/7 second-order at recorded scope","section":"Theory / human systems / research"},{"name":"JM ECOSTATE Social Economy Study v1.0","summary":"10/10 runs + claim audit complete","section":"Theory / human systems / research"},{"name":"JM Teaching / Learning Engine v5.2","summary":"","section":"Theory / human systems / research"},{"name":"HPC, Human Support Body Self, TheOverTime","summary":"BT/FLAZ at proved scopes","section":"Theory / human systems / research"},{"name":"PASSTACITIVITY","summary":"active shell → passive core","section":"Theory / human systems / research"},{"name":"ZooGate / JickMah","summary":"128-page theory edition; Twokniver 1 theory active; app lane parked","section":"Theory / human systems / research"},{"name":"JM CLOUD CONTACT SERVER public lineage; first public cloud Ding closed at v0.4.2 in recovered evidence","summary":"","section":"Cloud / contact"},{"name":"PHONE↔LAPTOP CONTACT RUNNER lineage","summary":"","section":"Cloud / contact"},{"name":"Cloud Bridge lineage","summary":"","section":"Cloud / contact"},{"name":"JM LIETOUCH P1B Separated-Device Semantic Ding v1.0 release-completed receipt preserved","summary":"","section":"Cloud / contact"},{"name":"JM3232 Navigator public-safe MCP donor","summary":"historically live-proven five-tool read-only public scope","section":"Cloud / contact"},{"name":"Bounded anti-crash census","summary":"BATCH → COUNT → CHECKPOINT → NEXT BATCH → TERMINAL CURSOR → CLOSE","section":"Storage / recovery"},{"name":"Permanent floor: BODY / IDENTITY RAIL ↔ CARRIER / BYTE RAIL","summary":"","section":"Storage / recovery"},{"name":"Retention","summary":"BYTE SIZE + FUNCTION + UNIQUENESS + RECOVERABILITY + CURRENT USE + DESCENDANT VIABILITY","section":"Storage / recovery"},{"name":"STORAGE COST MUST EARN RETRIEVAL VALUE","summary":"","section":"Storage / recovery"}];

def norm(value):
    value = (value or "").casefold()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())

def similarity(query, text):
    q, t = norm(query), norm(text)
    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    if q in t:
        return min(0.98, 0.80 + 0.18 * len(q) / max(len(t), 1))
    qt, tt = set(q.split()), set(t.split())
    overlap = len(qt & tt) / max(len(qt), 1)
    return round(0.62 * overlap + 0.38 * SequenceMatcher(None, q, t).ratio(), 6)

def current_matches(query, limit=8):
    found = []
    for item in CURRENT:
        title = item["title"]
        hay = " ".join([title, item["id"], item["status"], item["summary"]])
        s = max(similarity(query, title), 0.82 * similarity(query, hay))
        if s >= 0.28:
            found.append({"source": "current_project_registry", "score": round(min(1.0, s + 0.015), 6), **item})
    for item in OVERLAY:
        hay = " ".join([item["name"], item["summary"], item["section"]])
        s = max(similarity(query, item["name"]), 0.80 * similarity(query, hay))
        if s >= 0.30:
            found.append({"source": "current_overlay_2026-10-01", "score": round(s, 6), **item})
    found.sort(key=lambda x: (x["score"], 1 if x["source"] == "current_project_registry" else 0), reverse=True)
    return found[:max(1, min(int(limit), 25))]

def authority_state(item):
    if not item:
        return "ABSENCE_NOT_PROVEN"
    status = (item.get("status") or item.get("summary") or "").upper()
    if "CANDIDATE" in status:
        return "CURRENT_CANDIDATE"
    return "CURRENT_DECLARED"

def navigator_rpc(tool_name, arguments=None, timeout=8):
    payload = {
        "jsonrpc": "2.0",
        "id": 77,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments or {}},
    }
    req = urllib.request.Request(
        NAVIGATOR_MCP,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://chatgpt.com",
            "User-Agent": "JM-ECOSTATE-Build-Mesh/0.5 (+https://jmisjustme-estate.pages.dev/)",
            "MCP-Protocol-Version": DEFAULT_PROTOCOL,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
        if "error" in body:
            return {"ok": False, "state": "HOLD", "error": body["error"]}
        result = body.get("result") or {}
        if result.get("isError"):
            return {"ok": False, "state": "HOLD", "error": result}
        data = result.get("structuredContent")
        if data is None:
            content = result.get("content") or []
            for block in content:
                if block.get("type") == "text":
                    try:
                        data = json.loads(block.get("text", ""))
                    except Exception:
                        data = {"text": block.get("text", "")}
                    break
        return {"ok": True, "state": "PASS", "data": data}
    except Exception as exc:
        return {"ok": False, "state": "HOLD", "error": f"{type(exc).__name__}: {exc}"}

def navigator_search(query, limit=8):
    return navigator_rpc("search", {"query": query, "limit": max(1, min(int(limit), 25))})

def meaningful_navigator_results(contact, minimum_score=40):
    if not contact.get("ok"):
        return []
    results = (contact.get("data") or {}).get("results") or []
    return [r for r in results if float(r.get("score") or 0) >= float(minimum_score)]

def search_builds(args):
    query = (args.get("query") or "").strip()
    if not query:
        raise ValueError("query is required")
    limit = int(args.get("limit") or 8)
    local = current_matches(query, limit)
    nav = navigator_search(query, limit)
    return {
        "query": query,
        "current": local,
        "navigator": nav,
        "authority_note": "Search presence is discovery, not proof or current-head authority.",
    }

def recover_build(args):
    query = (args.get("name") or args.get("query") or "").strip()
    if not query:
        raise ValueError("name or query is required")
    limit = int(args.get("limit") or 8)
    local = current_matches(query, limit)
    nav = navigator_search(query, limit)
    best = local[0] if local else None
    state = authority_state(best)
    public_matches = meaningful_navigator_results(nav)
    if not best and public_matches:
        state = "SNAPSHOT_ONLY"
    if not best and not public_matches:
        state = "ABSENCE_NOT_PROVEN"
    return {
        "query": query,
        "resolution_state": state,
        "best_current_match": best,
        "current_candidates": local,
        "navigator_contact": nav,
        "claim_boundary": "Private/current Library pointers and direct runtime/owner receipts can outrank this hosted service.",
    }

def resolve_current_head(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    local = current_matches(query, 10)
    if local:
        best = local[0]
        close = [
            x for x in local[1:]
            if x["score"] >= best["score"] - 0.035
            and norm(x.get("title") or x.get("name")) != norm(best.get("title") or best.get("name"))
        ]
        state = authority_state(best)
        if close and best["score"] < 0.88:
            state = "CONFLICT_OPEN"
        return {
            "query": query,
            "state": state,
            "current_head": best.get("title") or best.get("name"),
            "primary_evidence": best,
            "competing_candidates": close[:4],
            "boundary": "Hosted current declaration; stronger direct current pointer/receipt can supersede it.",
        }
    nav = navigator_search(query, 5)
    public_matches = meaningful_navigator_results(nav)
    has_public = bool(public_matches)
    return {
        "query": query,
        "state": "SNAPSHOT_ONLY" if has_public else "ABSENCE_NOT_PROVEN",
        "current_head": None,
        "public_evidence": nav,
        "meaningful_public_matches": public_matches,
        "boundary": "No hosted current declaration found. Absence is not proved across the private Estate.",
    }

def proof_state(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    local = current_matches(query, 8)
    if local:
        item = local[0]
        return {
            "query": query,
            "state": authority_state(item),
            "body": item.get("title") or item.get("name"),
            "status": item.get("status"),
            "proof": item.get("proof"),
            "boundary": item.get("boundary") or item.get("summary"),
            "source": item["source"],
            "note": "Recorded proof text is not a new runtime Ding.",
        }
    nav = navigator_search(query, 5)
    return {
        "query": query,
        "state": "SNAPSHOT_ONLY" if meaningful_navigator_results(nav) else "ABSENCE_NOT_PROVEN",
        "navigator_contact": nav,
        "note": "Public source discovery does not itself prove runtime/current authority.",
    }

def trace_lineage(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    search = navigator_search(query, int(args.get("limit") or 8))
    if not search.get("ok"):
        return {"query": query, "state": "HOLD", "navigator_contact": search}
    results = meaningful_navigator_results(search)
    if not results:
        return {"query": query, "state": "ABSENCE_NOT_PROVEN", "matches": []}
    lineages = []
    for item in results[: min(3, len(results))]:
        record_id = item.get("id")
        if not record_id:
            continue
        lr = navigator_rpc("navigator_return_lineage", {"id": record_id})
        lineages.append({"search_result": item, "lineage": lr})
    return {
        "query": query,
        "state": "PUBLIC_LINEAGE_CONTACT",
        "matches": lineages,
        "boundary": "Navigator is a public-safe donor. Private lineage/current pointers may be deeper or newer.",
    }

def continue_build_plan(args):
    query = (args.get("name") or "").strip()
    objective = (args.get("objective") or "").strip()
    if not query:
        raise ValueError("name is required")
    authority = resolve_current_head({"name": query})
    proof = proof_state({"name": query})
    return {
        "query": query,
        "objective": objective or None,
        "authority": authority,
        "proof_state": proof,
        "route": [
            "RECOVER BEST PROVEN STATE",
            "INHERIT CAPABILITY",
            "PRESERVE EARNED CAPABILITY",
            "ADD DIFFERENCE",
            "CONTACT",
            "OBSERVE / CORRECT / VERIFY",
            "CROWN ONLY IF EARNED",
            "TRACE",
            "PRESERVE / RE-ENTRY",
        ],
        "next_action": "Use the recovered head as parent, choose the smallest meaningful delta toward the objective, and test at the same level as the claim.",
        "mutation_performed": False,
    }

def build_mesh_status(args):
    probe = bool(args.get("probe_navigator", True))
    nav = navigator_rpc("navigator_bridge_status", {}) if probe else {"state": "NOT_PROBED"}
    return {
        "server": SERVER_NAME,
        "version": VERSION,
        "mode": "read-only authority / recovery / continuation-planning service",
        "current_project_records": len(CURRENT),
        "overlay_entries": len(OVERLAY),
        "navigator_endpoint": NAVIGATOR_MCP,
        "navigator_contact": nav,
        "plugin_historical_register": "1,074 lineages retained in JM ECOSTATE Build Mesh package",
        "laws": [
            "NO DING, NO CLAIM",
            "CONTACT BEFORE CROWN",
            "RECOVER BEFORE REBUILD",
            "MESH ≠ MERGE",
            "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT",
            "ACCESS ≠ AUTHORITY",
        ],
        "boundary": "This service does not own the Estate, does not access the private ChatGPT Library, and performs no writes.",
    }

TOOLS = [
    {"name":"search_builds","description":"Search the hosted current layer and the public-safe Navigator donor without treating discovery as proof.","inputSchema":{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"required":["query"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"recover_build","description":"Recover current candidates plus public Navigator contact for a JM build.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"query":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"resolve_current_head","description":"Resolve a build to CURRENT_DECLARED, CURRENT_CANDIDATE, CONFLICT_OPEN, SNAPSHOT_ONLY or ABSENCE_NOT_PROVEN.","inputSchema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"proof_state","description":"Return the recorded proof/status/boundary for a build without inflating discovery into a runtime claim.","inputSchema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"trace_lineage","description":"Use the public-safe Navigator donor to return preserved lineage for matching Estate bodies.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"continue_build_plan","description":"Produce a non-mutating continuation route from the strongest hosted authority/proof state.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"objective":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"build_mesh_status","description":"Return native Build Mesh MCP status and optionally probe the Navigator donor.","inputSchema":{"type":"object","properties":{"probe_navigator":{"type":"boolean","default":True}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
]
HANDLERS = {
    "search_builds": search_builds,
    "recover_build": recover_build,
    "resolve_current_head": resolve_current_head,
    "proof_state": proof_state,
    "trace_lineage": trace_lineage,
    "continue_build_plan": continue_build_plan,
    "build_mesh_status": build_mesh_status,
}

def tool_result(data):
    return {
        "content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=2)}],
        "structuredContent": data,
        "isError": False,
    }

def rpc_result(request_id, result):
    return {"jsonrpc": "2.0", "id": request_id, "result": result}

def rpc_error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}

class Handler(BaseHTTPRequestHandler):
    server_version = "JMBuildMeshNativeMCP/0.5"

    def log_message(self, fmt, *args):
        sys.stdout.write(f"{self.address_string()} - {fmt % args}\n")
        sys.stdout.flush()

    def send_json(self, status, obj=None):
        raw = b"" if obj is None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type,accept,mcp-protocol-version")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        if raw:
            self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type,accept,mcp-protocol-version")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path in ("/", "/health", "/ready", "/meta"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self.send_json(200, {"ok": True, "name": SERVER_NAME, "version": VERSION})
        if path == "/ready":
            return self.send_json(200, {"ready": True, "name": SERVER_NAME, "version": VERSION})
        if path in ("/", "/meta"):
            return self.send_json(200, build_mesh_status({"probe_navigator": False}))
        if path == "/mcp":
            return self.send_json(405, {"error": "POST JSON-RPC to /mcp; no server-to-client SSE stream advertised."})
        return self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if urlparse(self.path).path != "/mcp":
            return self.send_json(404, {"error": "not found"})
        size = int(self.headers.get("Content-Length") or 0)
        try:
            payload = json.loads(self.rfile.read(size) or b"{}")
        except Exception:
            return self.send_json(400, rpc_error(None, -32700, "Parse error"))
        if not isinstance(payload, dict) or payload.get("jsonrpc") != "2.0" or "method" not in payload:
            return self.send_json(400, rpc_error(payload.get("id") if isinstance(payload, dict) else None, -32600, "Invalid Request"))

        request_id = payload.get("id")
        method = payload["method"]
        params = payload.get("params") or {}

        if request_id is None:
            return self.send_json(202, None)

        if method == "initialize":
            requested = params.get("protocolVersion", DEFAULT_PROTOCOL)
            protocol = requested if requested in SUPPORTED_PROTOCOLS else DEFAULT_PROTOCOL
            return self.send_json(200, rpc_result(request_id, {
                "protocolVersion": protocol,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": SERVER_NAME, "version": VERSION},
                "instructions": "Recover before rebuild. Search does not equal proof. Resolve authority before crown. continue_build_plan is non-mutating.",
            }))
        if method == "ping":
            return self.send_json(200, rpc_result(request_id, {}))
        if method == "tools/list":
            return self.send_json(200, rpc_result(request_id, {"tools": TOOLS}))
        if method == "tools/call":
            name = params.get("name", "")
            args = params.get("arguments") or {}
            if name not in HANDLERS:
                return self.send_json(200, rpc_error(request_id, -32601, f"Unknown tool: {name}"))
            try:
                data = HANDLERS[name](args)
                return self.send_json(200, rpc_result(request_id, tool_result(data)))
            except Exception as exc:
                return self.send_json(200, rpc_result(request_id, {
                    "content": [{"type": "text", "text": f"{type(exc).__name__}: {exc}"}],
                    "isError": True,
                }))
        return self.send_json(200, rpc_error(request_id, -32601, f"Method not found: {method}"))

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3000"))
    print(json.dumps({"event": "startup", "name": SERVER_NAME, "version": VERSION, "host": host, "port": port}, ensure_ascii=False), flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
