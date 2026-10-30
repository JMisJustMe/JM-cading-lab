"""Gated original JM game-engine MCP contact, not a second hosted engine.

No owner secret = no tool admission. All existing public hosted Build Mesh
tools stay untouched. Native calls use the exact recovered Node MCP program.
"""
import hmac
import json
import os
import subprocess
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NATIVE = ROOT / "coding-estate/integration/jm-engine-federation-mcp-stdio.mjs"
LOCK = threading.BoundedSemaphore(2)
ENGINE_NAMES = frozenset(("jm_engine_inventory", "jm_engine_plan", "jm_engine_core_contact",
                          "jm_engine_visual_contact", "jm_engine_world_contact"))
ENGINE_TOOLS = [
    {"name":"jm_engine_inventory","description":"Recover original JM engine sources and contact limits",
     "inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
    {"name":"jm_engine_plan","description":"Route original JM estate and Current-64 plan only",
     "inputSchema":{"type":"object","properties":{"goal":{"type":"string"}},"required":["goal"],"additionalProperties":False}},
    {"name":"jm_engine_core_contact","description":"Execute original Game-CODING / JM GameCore state mechanics",
     "inputSchema":{"type":"object","properties":{"gameSource":{"type":"string"},"coreSource":{"type":"string"},"initialState":{"type":"object"}},"required":["gameSource","coreSource"],"additionalProperties":False}},
    {"name":"jm_engine_visual_contact","description":"Execute original JMVisualGraft, JM Visual Runtime, GlyphForge and GlyphPlay state",
     "inputSchema":{"type":"object","properties":{"gameSource":{"type":"string"},"coreSource":{"type":"string"},"initialState":{"type":"object"},"visualGraftSource":{"type":"string"},"interactionSource":{"type":"string"},"glyphForgeSource":{"type":"string"},"glyphPlaySource":{"type":"string"},"game":{"type":"object"},"glyph":{"type":"string"},"input":{"type":"object"}},"required":["gameSource","coreSource","visualGraftSource","interactionSource","glyphForgeSource","glyphPlaySource","game","glyph","input"],"additionalProperties":False}},
    {"name":"jm_engine_world_contact","description":"Execute original hash-bound GameForge world and unique 3D geometry, not GPU",
     "inputSchema":{"type":"object","properties":{"source":{"type":"object"}},"required":["source"],"additionalProperties":False}},
]
for entry in ENGINE_TOOLS:
    entry["annotations"]={"readOnlyHint":True,"destructiveHint":False,
                          "idempotentHint":True,"openWorldHint":False}

def engine_authorized(header):
    secret=os.environ.get("JM_ENGINE_OWNER_TOKEN","")
    if len(secret)<32 or not isinstance(header,str) or not header.startswith("Bearer "):
        return False
    supplied=header[7:]
    return len(supplied)==len(secret) and hmac.compare_digest(supplied,secret)

def call_native_engine(name,arguments):
    if name not in ENGINE_NAMES or not isinstance(arguments,dict):
        raise ValueError("JM_ENGINE_ARGUMENTS_HOLD")
    payload=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call",
                        "params":{"name":name,"arguments":arguments}},separators=(",",":"))
    if len(payload.encode("utf-8"))>131072:
        raise ValueError("JM_ENGINE_PAYLOAD_LIMIT_HOLD")
    if not NATIVE.is_file():
        raise RuntimeError("JM_ENGINE_EXACT_NATIVE_SOURCE_HOLD")
    if not LOCK.acquire(blocking=False):
        raise RuntimeError("JM_ENGINE_CONCURRENCY_HOLD")
    try:
        try:
            proc=subprocess.run(["node",str(NATIVE)],input=payload+"\n",capture_output=True,
                                text=True,timeout=25,cwd=ROOT,check=False,
                                env={"PATH":os.environ.get("PATH",""),"LANG":"C.UTF-8",
                                     "HOME":"/tmp","NODE_OPTIONS":""})
        except FileNotFoundError as exc:
            raise RuntimeError("JM_ENGINE_NODE_RUNTIME_HOLD") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("JM_ENGINE_EXECUTION_TIMEOUT_HOLD") from exc
        if proc.returncode!=0 or len(proc.stdout)>524288 or len(proc.stderr)>65536:
            raise RuntimeError("JM_ENGINE_PROCESS_OR_OUTPUT_HOLD")
        try:
            lines=proc.stdout.strip().splitlines()
            message=json.loads(lines[0]) if len(lines)==1 else None
        except Exception as exc:
            raise RuntimeError("JM_ENGINE_NATIVE_PROTOCOL_HOLD") from exc
        if not isinstance(message,dict) or message.get("id")!=1 or message.get("jsonrpc")!="2.0" or not isinstance(message.get("result"),dict):
            raise RuntimeError("JM_ENGINE_NATIVE_RESPONSE_HOLD")
        return message["result"]
    finally:
        LOCK.release()
