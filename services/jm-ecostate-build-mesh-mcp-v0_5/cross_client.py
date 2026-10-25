"""JM ECOSTATE cross-client *read-only* receipt extension.

Compatible with the existing Build Mesh native MCP server.  This module does
not store user material, establish client identity, relay messages, or mutate
Estate bodies.  A successful pairing proves valid server-issued, differently
labelled tokens under a shared challenge, NOT independently authenticated AI
identities or direct client-to-client communication.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import time

SCHEMA = "JM.CrossClient.ContactReceipt/0.1"
CLIENTS = ("ChatGPT", "Gemini")
TTL_SECONDS = 1800
_KEY = secrets.token_bytes(32)   # Runtime-scoped: intentionally invalid after restart.
_INSTANCE = secrets.token_hex(12)
_CHALLENGE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$")
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{40,1800}\.[A-Za-z0-9_-]{43}$")


def _compact(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":")).encode("utf-8")


def _b64(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unb64(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _validate_client_and_challenge(args):
    if not isinstance(args, dict):
        raise ValueError("arguments must be an object")
    if set(args) != {"client", "challenge"}:
        raise ValueError("exactly client and challenge are required")
    client = args.get("client")
    challenge = args.get("challenge")
    if client not in CLIENTS:
        raise ValueError("client must be 'ChatGPT' or 'Gemini'")
    if not isinstance(challenge, str) or not _CHALLENGE_RE.fullmatch(challenge):
        raise ValueError("challenge must be 8–96 non-sensitive ASCII letters/digits/._:-, starting with a letter/digit")
    return client, challenge


def cross_client_issue_receipt(args):
    """Create a short-lived server-issued token, without writing state."""
    client, challenge = _validate_client_and_challenge(args)
    now = int(time.time())
    body = {
        "schema": SCHEMA,
        "client_claim": client,
        "challenge": challenge,
        "instance": _INSTANCE,
        "issued_at": now,
        "expires_at": now + TTL_SECONDS,
        "nonce": secrets.token_hex(12),
    }
    payload = _compact(body)
    signature = hmac.new(_KEY, payload, hashlib.sha256).digest()
    token = _b64(payload) + "." + _b64(signature)
    return {
        "schema": SCHEMA,
        "result": "SERVER_ISSUED_RECEIPT",
        "client_claim": client,
        "challenge": challenge,
        "receipt_token": token,
        "expires_at_unix": body["expires_at"],
        "paired_scope": "ANONYMOUS_CALL_TOKEN_ONLY",
        "privacy": "No task contents, device identifiers, private Estate data or write operations are accepted or stored.",
        "limitation": "Client labels are self-declared; this is not authenticated ChatGPT/Gemini identity or direct AI-to-AI messaging.",
        "next": "Ask the other client to issue a receipt with the same challenge and its own client label, then compare both tokens.",
    }


def _verify_token(token):
    if not isinstance(token, str) or len(token) > 1900 or not _TOKEN_RE.fullmatch(token):
        raise ValueError("invalid receipt token format")
    encoded, mac = token.split(".", 1)
    try:
        payload, signature = _unb64(encoded), _unb64(mac)
        body = json.loads(payload.decode("utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("invalid receipt token encoding") from exc
    if _b64(payload) != encoded or _b64(signature) != mac or len(signature) != 32:
        raise ValueError("noncanonical token encoding")
    if not isinstance(body, dict) or payload != _compact(body):
        raise ValueError("noncanonical receipt")
    expected = hmac.new(_KEY, payload, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("receipt signature mismatch or different server process")
    if body.get("schema") != SCHEMA or body.get("client_claim") not in CLIENTS or body.get("instance") != _INSTANCE:
        raise ValueError("receipt issuer/schema/client mismatch")
    _validate_client_and_challenge({"client": body["client_claim"], "challenge": body.get("challenge")})
    if not isinstance(body.get("nonce"), str) or not re.fullmatch(r"[0-9a-f]{24}", body["nonce"]):
        raise ValueError("invalid receipt nonce")
    now = int(time.time())
    issued, expires = body.get("issued_at"), body.get("expires_at")
    if type(issued) is not int or type(expires) is not int:
        raise ValueError("invalid timestamps")
    if issued > now + 60 or expires != issued + TTL_SECONDS or now > expires:
        raise ValueError("future, expired or invalid-duration receipt")
    return body


def cross_client_verify_pair(args):
    """Compare two authentic ephemeral receipts on this server instance."""
    if not isinstance(args, dict):
        raise ValueError("arguments must be an object")
    if set(args) != {"receipt_a", "receipt_b"}:
        raise ValueError("exactly receipt_a and receipt_b are required")
    a, b = _verify_token(args.get("receipt_a")), _verify_token(args.get("receipt_b"))
    if a["challenge"] != b["challenge"]:
        return {"schema": SCHEMA, "pass": False, "state": "HOLD_DIFFERENT_CHALLENGES", "mutation_performed": False}
    if a["client_claim"] == b["client_claim"]:
        return {"schema": SCHEMA, "pass": False, "state": "HOLD_SAME_CLAIMED_CLIENT", "mutation_performed": False}
    if a["nonce"] == b["nonce"]:
        return {"schema": SCHEMA, "pass": False, "state": "HOLD_DUPLICATE_RECEIPT", "mutation_performed": False}
    if a["instance"] != b["instance"]:
        return {"schema": SCHEMA, "pass": False, "state": "HOLD_DIFFERENT_SERVER_INSTANCE", "mutation_performed": False}
    return {
        "schema": SCHEMA,
        "pass": True,
        "state": "MATCHED_SERVER_ISSUED_DISTINCT_CLIENT_LABELS",
        "client_claims": sorted([a["client_claim"], b["client_claim"]]),
        "challenge": a["challenge"],
        "issuer_instance_fingerprint": hashlib.sha256(a["instance"].encode()).hexdigest()[:16],
        "receipt_count": 2,
        "mutation_performed": False,
        "replay_boundary": "Tokens are deliberately reusable until expiry; no one-time replay prevention is claimed.",
        "proof": "Two different self-declared client labels received valid short-lived receipts from the same server process and used the same challenge.",
        "not_proven": [
            "Independent authentication of ChatGPT/Gemini identity",
            "Direct AI-to-AI message transfer",
            "Shared durable mailbox or persistence",
            "Native execution in JM coding bodies",
            "Physical owner-device contact",
        ],
    }



# CP02: Transportable, public-safe operation *intent*, NOT a public mailbox.
CAPSULE_SCHEMA = "JM.CrossClient.PortableTaskCapsule/0.2"
CAPSULE_TTL = 600
TASK_KINDS = (
    "AUDIT_MCP_CONTRACT",
    "VERIFY_CLIENT_CONTACT",
    "COMPARE_PUBLIC_LINEAGE",
    "PLAN_CAPABILITY_ROUTE",
)
_BODY_RE = re.compile(r"^JM-[A-Z0-9][A-Z0-9-]{2,63}$")
_CAPSULE_FIELDS = frozenset((
    "schema", "kind", "origin_client_claim", "target_client_claim",
    "challenge", "body_ref", "issued_at", "expires_at", "nonce", "instance",
))


def handoff_task_capsule(args):
    """Mint a signed *portable plan*, WITHOUT server-side persistence or task execution.

    The human or client must carry the token to the second client.  No payload
    is accepted other than a public-safe body reference and enumerated task kind.
    """
    if not isinstance(args, dict) or set(args) != {
        "origin_client", "target_client", "challenge", "body_ref", "task_kind"
    }:
        raise ValueError("exactly origin_client, target_client, challenge, body_ref, task_kind are required")
    origin, challenge = _validate_client_and_challenge({
        "client": args["origin_client"], "challenge": args["challenge"]
    })
    target = args["target_client"]
    if target not in CLIENTS or target == origin:
        raise ValueError("target_client must be the other supported client label")
    kind = args["task_kind"]
    if kind not in TASK_KINDS:
        raise ValueError("task_kind must be a declared public-safe plan intent")
    body_ref = args["body_ref"]
    if not isinstance(body_ref, str) or not _BODY_RE.fullmatch(body_ref):
        raise ValueError("body_ref must be a public-safe JM- prefixed uppercase slug")
    now = int(time.time())
    content = {
        "schema": CAPSULE_SCHEMA,
        "kind": kind,
        "origin_client_claim": origin,
        "target_client_claim": target,
        "challenge": challenge,
        "body_ref": body_ref,
        "issued_at": now,
        "expires_at": now + CAPSULE_TTL,
        "nonce": secrets.token_hex(12),
        "instance": _INSTANCE,
    }
    canonical = _compact(content)
    signed = _b64(canonical) + "." + _b64(hmac.new(_KEY, canonical, hashlib.sha256).digest())
    return {
        "schema": CAPSULE_SCHEMA,
        "state": "PORTABLE_PLAN_CAPSULE_ISSUED",
        "capsule_token": signed,
        "token_fingerprint": hashlib.sha256(signed.encode("ascii")).hexdigest()[:20],
        "expires_at_unix": content["expires_at"],
        "origin_client_claim": origin,
        "target_client_claim": target,
        "task_kind": kind,
        "body_ref": body_ref,
        "human_carry_required": True,
        "replay_boundary": "Portable capsules are reusable until expiry. Verification does not consume the token.",
        "mutation_performed": False,
        "boundary": "Anonymous self-declared client labels. No authentication, message transmission, private content, persistence or native execution.",
    }


def verify_carrier_receipt(args):
    """Validate portable plan token (proof of minting, NOT handoff delivery)."""
    if not isinstance(args, dict) or set(args) != {"capsule_token", "expected_target_client"}:
        raise ValueError("exactly capsule_token and expected_target_client are required")
    target = args["expected_target_client"]
    if target not in CLIENTS:
        raise ValueError("expected_target_client must be a supported client label")
    token = args["capsule_token"]
    if not isinstance(token, str) or len(token) > 1900 or not _TOKEN_RE.fullmatch(token):
        raise ValueError("invalid carrier token format")
    part, mac = token.split(".", 1)
    try:
        canonical, signature = _unb64(part), _unb64(mac)
        body = json.loads(canonical.decode("utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("invalid carrier token encoding") from exc
    if _b64(canonical) != part or _b64(signature) != mac or len(signature) != 32:
        raise ValueError("noncanonical carrier token encoding")
    if not isinstance(body, dict) or set(body) != _CAPSULE_FIELDS or _compact(body) != canonical:
        raise ValueError("invalid/noncanonical capsule fields")
    expected = hmac.new(_KEY, canonical, hashlib.sha256).digest()
    if not hmac.compare_digest(signature, expected):
        raise ValueError("capsule signature mismatch or different server process")
    if body["schema"] != CAPSULE_SCHEMA or body["instance"] != _INSTANCE:
        raise ValueError("capsule schema or server instance mismatch")
    if body["origin_client_claim"] not in CLIENTS or body["target_client_claim"] not in CLIENTS:
        raise ValueError("invalid client labels")
    if body["origin_client_claim"] == body["target_client_claim"]:
        raise ValueError("non-cross-client capsule")
    _validate_client_and_challenge({"client":body["origin_client_claim"],"challenge":body["challenge"]})
    if body["kind"] not in TASK_KINDS:
        raise ValueError("unknown task intent")
    if not isinstance(body["body_ref"], str) or not _BODY_RE.fullmatch(body["body_ref"]):
        raise ValueError("invalid body reference")
    if not isinstance(body["nonce"], str) or not re.fullmatch(r"[a-f0-9]{24}",body["nonce"]):
        raise ValueError("invalid nonce")
    issued, expires = body["issued_at"], body["expires_at"]
    if type(issued) is not int or type(expires) is not int:
        raise ValueError("invalid timestamps")
    now = int(time.time())
    if issued > now+60 or expires != issued+CAPSULE_TTL or now > expires:
        raise ValueError("future/expired capsule")
    if body["target_client_claim"] != target:
        return {
            "schema": CAPSULE_SCHEMA,
            "valid": False,
            "state": "HOLD_EXPECTED_TARGET_MISMATCH",
            "mutation_performed": False,
        }
    return {
        "schema": CAPSULE_SCHEMA,
        "valid": True,
        "state": "SIGNED_PLAN_CARRIER_VERIFIED",
        "origin_client_claim": body["origin_client_claim"],
        "target_client_claim": body["target_client_claim"],
        "task_kind": body["kind"],
        "body_ref": body["body_ref"],
        "challenge": body["challenge"],
        "token_fingerprint": hashlib.sha256(token.encode("ascii")).hexdigest()[:20],
        "mutation_performed": False,
        "not_proven": [
            "Authenticated client identity",
            "Any direct AI-to-AI message or delivery",
            "Recipient actually performed the requested audit",
            "Shared persistent mailbox",
            "JM body execution or production write",
        ],
    }

TOOLS = [
    {
        "name": "cross_client_issue_receipt",
        "description": "Issue a 30-minute cryptographic receipt for a public-safe ChatGPT/Gemini shared challenge. Client identity is self-declared; performs no Estate writes.",
        "inputSchema": {"type": "object", "properties": {
            "client": {"type": "string", "enum": list(CLIENTS)},
            "challenge": {"type": "string", "minLength": 8, "maxLength": 96, "pattern": "^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$"},
        }, "required": ["client", "challenge"], "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
    },
    {
        "name": "cross_client_verify_pair",
        "description": "Validate and compare two short-lived server-issued client-labelled receipt tokens. No client-identity attestation, state transfer or writes.",
        "inputSchema": {"type": "object", "properties": {
            "receipt_a": {"type": "string", "minLength": 80, "maxLength": 1900},
            "receipt_b": {"type": "string", "minLength": 80, "maxLength": 1900},
        }, "required": ["receipt_a", "receipt_b"], "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
    },
    {
        "name": "handoff_task_capsule",
        "description": "Create a short-lived signed, public-safe, manually carried PLAN_ONLY capsule. No server mailbox, authenticated client, payload or write.",
        "inputSchema": {"type": "object", "properties": {
            "origin_client": {"type":"string", "enum":list(CLIENTS)},
            "target_client": {"type":"string", "enum":list(CLIENTS)},
            "challenge": {"type":"string", "minLength":8, "maxLength":96, "pattern":"^[A-Za-z0-9][A-Za-z0-9_.:-]{7,95}$"},
            "body_ref": {"type":"string", "minLength":5, "maxLength":66, "pattern":"^JM-[A-Z0-9][A-Z0-9-]{2,63}$"},
            "task_kind": {"type":"string", "enum":list(TASK_KINDS)},
        }, "required":["origin_client", "target_client", "challenge", "body_ref", "task_kind"], "additionalProperties":False},
        "annotations": {"readOnlyHint":True, "destructiveHint":False, "idempotentHint":False, "openWorldHint":False},
    },
    {
        "name": "verify_carrier_receipt",
        "description": "Verify integrity, expiry and claimed target of manually transported capsule. Does NOT attest client or delivery; no writes.",
        "inputSchema": {"type":"object", "properties":{
            "capsule_token": {"type":"string", "minLength":80, "maxLength":1900},
            "expected_target_client": {"type":"string", "enum":list(CLIENTS)},
        }, "required":["capsule_token", "expected_target_client"], "additionalProperties":False},
        "annotations": {"readOnlyHint":True, "destructiveHint":False, "idempotentHint":True, "openWorldHint":False},
    },
]
HANDLERS = {
    "cross_client_issue_receipt": cross_client_issue_receipt,
    "cross_client_verify_pair": cross_client_verify_pair,
    "handoff_task_capsule": handoff_task_capsule,
    "verify_carrier_receipt": verify_carrier_receipt,
}
