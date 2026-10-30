"""Gated original JM game-engine MCP contact, not a second hosted engine.

No owner secret = no tool admission. All existing public hosted Build Mesh
tools stay untouched. Native calls use the exact recovered Node MCP program.
"""
import hmac
import json
import os
import re
import shutil
import subprocess
import threading
from functools import lru_cache
from hashlib import sha1
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NATIVE = ROOT / "coding-estate/integration/jm-engine-federation-mcp-stdio.mjs"
LOCK = threading.BoundedSemaphore(2)

# Exact original Git blob object hashes, not independently recreated bodies.
# A downstream file edit needs explicit reproof before hosted execution.
SOURCE_PINS = {
    "coding-estate/integration/jm-engine-federation.mjs": "3e7a68091bf8f08326e6753a86f568b826df81ba",
    "coding-estate/integration/jm-engine-federation-mcp-stdio.mjs": "91a089bb3110bac41d7adaa4699cf87d46aa036f",
    "coding-estate/integration/source-aware-creation.mjs": "0fc2443715435db08c1ee4399608acdd0b5f1cee",
    "coding-estate/integration/gameforge-spaces.mjs": "9e86d5f1053523ca97c1fd24e170012f7fd8fd3e",
    "coding-estate/integration/gameforge-encounter.mjs": "460c29f763009f27e2aaf5e6cd80afe4d4baad06",
    "coding-estate/integration/gameforge-spatial-grammar.mjs": "091f22f8eac2fa015771106bdc46b80f1161f2ed",
    "coding-estate/integration/jm-actual-renderer-organ.mjs": "18dd18a33c7d594415403bf1c5a35745b8dfd4fb",
    "coding-estate/integration/gameforge-world-carrier.mjs": "440f322a407dc4e89185a5d816b7624c8a3a4dc2",
    "coding-estate/integration/REGISTRY.json": "cb8e4d9c814e20d011509c79d7a6ca868434f73b",
    "coding-estate/JM_CODING_ESTATE_CURRENT_64.json": "b00cf8a7567016468728d7d6d989952e3456a29b",
    "navigator/estate-integration/execution-lanes.mjs": "b79e4442dc7f0a3fc0bd5d2e5f7b4f16bdcf9524",
    "coding-estate/sovereign-ten/direct/game-native.mjs": "30d3f831e39e1749d28f0cdb10a1bb020c0b9ee4",
    "coding-estate/sovereign-ten/direct/native-core.mjs": "1f5d1d2f6567fc5532c4ad57e2f329638f050048",
    "coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs": "8de368df9878fa641f8cb5875a90b8bbb387129a",
    "coding-estate/sovereign-batch-six/direct/native-core.mjs": "b33045c45ca61bdc6010645776fbf7b319dfab33",
    "coding-estate/sovereign-batch-two/direct/codifying-kocodifying-native.mjs": "bc82c44ce56ec48c6fa09e42a57529b1b91c47dc",
}

def git_blob_matches(file, expected):
    try:
        if not file.is_file() or file.is_symlink():
            return False
        raw=file.read_bytes()
    except (OSError, ValueError):
        return False
    return hmac.compare_digest(
        sha1(b"blob " + str(len(raw)).encode("ascii") + b"\x00" + raw).hexdigest(),
        expected)

def original_source_pins_ok(root=ROOT):
    return all(git_blob_matches(root / path, blob)
               for path, blob in SOURCE_PINS.items())


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

@lru_cache(maxsize=1)
def engine_runtime_ready():
    """Never advertise native engines unless a usable real Node runtime exists."""
    executable=shutil.which("node")
    if not executable or not NATIVE.is_file():
        return False
    try:
        probe=subprocess.run([executable,"--version"],capture_output=True,text=True,
                             timeout=3,check=False)
    except (OSError,subprocess.TimeoutExpired):
        return False
    version=re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)",probe.stdout.strip())
    return bool(probe.returncode==0 and version and int(version.group(1))>=22 and original_source_pins_ok())

def engine_authorized(header):
    secret=os.environ.get("JM_ENGINE_OWNER_TOKEN","")
    if len(secret)<32 or not isinstance(header,str) or not header.startswith("Bearer "):
        return False
    supplied=header[7:]
    return bool(len(supplied)==len(secret) and hmac.compare_digest(supplied,secret)
                and engine_runtime_ready() and original_source_pins_ok())

def call_native_engine(name,arguments):
    if name not in ENGINE_NAMES or not isinstance(arguments,dict):
        raise ValueError("JM_ENGINE_ARGUMENTS_HOLD")
    payload=json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call",
                        "params":{"name":name,"arguments":arguments}},separators=(",",":"))
    if len(payload.encode("utf-8"))>131072:
        raise ValueError("JM_ENGINE_PAYLOAD_LIMIT_HOLD")
    if not original_source_pins_ok():
        raise RuntimeError("JM_ENGINE_SOURCE_PIN_HOLD")
    if not NATIVE.is_file():
        raise RuntimeError("JM_ENGINE_EXACT_NATIVE_SOURCE_HOLD")
    if not LOCK.acquire(blocking=False):
        raise RuntimeError("JM_ENGINE_CONCURRENCY_HOLD")
    try:
        try:
            proc=subprocess.run(["node","--max-old-space-size=128",str(NATIVE)],input=payload+"\n",capture_output=True,
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
