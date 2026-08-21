from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RUNTIME = ROOT / "runtime"
EXPORTS = ROOT / "exports"
RUNTIME.mkdir(exist_ok=True)
EXPORTS.mkdir(exist_ok=True)
STATE_PATH = RUNTIME / "runtime_state.json"
WIDGET_URI = "ui://jm3232-navigator/stringdoor-v0.1.html"

CANONICAL_TOOL_MAP = {
    "navigator.search_estate": "search",
    "navigator.fetch_source": "fetch",
    "navigator.open_stringdoor": "navigator_open_stringdoor",
    "navigator.resolve_rootword": "navigator_resolve_rootword",
    "navigator.return_lineage": "navigator_return_lineage",
    "navigator.create_stringmark": "navigator_create_stringmark",
    "navigator.register_body": "navigator_register_body",
    "navigator.create_stringreceipt": "navigator_create_stringreceipt",
    "navigator.export_savepack": "navigator_export_savepack",
    "navigator.bridge_status": "navigator_bridge_status",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=path.name, suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def default_state() -> dict[str, Any]:
    return {
        "schema": "jm.navigator.bridge.state/v0.1",
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "stringmarks": [],
        "registered_bodies": [],
        "receipts": [],
        "receipt_chain_head": "GENESIS",
    }


class NavigatorBridge:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.index: list[dict[str, Any]] = json.loads((DATA / "search_index.json").read_text(encoding="utf-8"))
        self.by_id: dict[str, dict[str, Any]] = {item["id"]: item for item in self.index}
        self.source_manifest = json.loads((DATA / "SOURCE_MANIFEST.json").read_text(encoding="utf-8"))
        self.build_meta = json.loads((DATA / "build_meta.json").read_text(encoding="utf-8"))
        self._ensure_state()

    def _ensure_state(self) -> None:
        if not STATE_PATH.exists():
            atomic_write_json(STATE_PATH, default_state())

    def reset_runtime(self) -> None:
        with self._lock:
            atomic_write_json(STATE_PATH, default_state())

    def load_state(self) -> dict[str, Any]:
        with self._lock:
            self._ensure_state()
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))

    def save_state(self, state: dict[str, Any]) -> None:
        state["updated_at"] = utc_now()
        with self._lock:
            atomic_write_json(STATE_PATH, state)

    @staticmethod
    def tokenize(text: str) -> list[str]:
        return re.findall(r"[\w’'\-]+", text.lower(), flags=re.UNICODE)

    def _score(self, query: str, doc: dict[str, Any]) -> float:
        q = query.strip().lower()
        if not q:
            return 0.0
        title = doc.get("title", "").lower()
        text = doc.get("text", "").lower()
        searchable = doc.get("searchable", "")
        aliases = " ".join(doc.get("aliases", [])).lower()
        score = 0.0
        if q == title:
            score += 100.0
        if q in title:
            score += 45.0
        if q in aliases:
            score += 30.0
        if q in text:
            score += 15.0
        tokens = self.tokenize(q)
        if not tokens:
            return score
        title_tokens = set(self.tokenize(title))
        alias_tokens = set(self.tokenize(aliases))
        searchable_tokens = set(self.tokenize(searchable))
        for token in tokens:
            if token in title_tokens:
                score += 12.0
            elif token in alias_tokens:
                score += 9.0
            elif token in searchable_tokens:
                score += 3.0
            elif len(token) >= 4 and any(word.startswith(token) for word in title_tokens):
                score += 4.0
        coverage = sum(1 for token in tokens if token in searchable_tokens) / max(1, len(tokens))
        score += coverage * 20.0
        if doc.get("url"):
            score += 0.5
        if doc.get("source_kind") in {"navigator_body", "estate_bodies", "public_bodies"}:
            score += 0.25
        return score

    def search(self, query: str, limit: int = 8, sources: list[str] | None = None) -> dict[str, Any]:
        if not query or not query.strip():
            raise ValueError("query must not be blank")
        limit = min(max(int(limit), 1), 25)
        allowed = set(sources or [])
        ranked = []
        for doc in self.index:
            if allowed and doc.get("source_kind") not in allowed:
                continue
            score = self._score(query, doc)
            if score > 0:
                ranked.append((score, doc))
        ranked.sort(key=lambda item: (-item[0], item[1].get("title", "")))
        results = []
        for score, doc in ranked[:limit]:
            results.append({
                "id": doc["id"],
                "title": doc["title"],
                "text": doc["text"][:900],
                "url": doc.get("url", ""),
                "source_kind": doc.get("source_kind"),
                "source_file": doc.get("source_file"),
                "score": round(score, 3),
                "flags": doc.get("flags", []),
                "relationships": doc.get("relationships", [])[:12],
            })
        return {
            "query": query,
            "count": len(results),
            "results": results,
            "route": "QUERY → MEANING-FIRST SCORE → STRINGDOOR CANDIDATES",
            "boundary": "Search ranks restored Estate and Radius sources; it does not silently merge source bodies.",
        }

    def fetch(self, record_id: str) -> dict[str, Any]:
        doc = self.by_id.get(record_id)
        if not doc:
            candidates = [value for key, value in self.by_id.items() if key.split("~", 1)[0] == record_id]
            if len(candidates) == 1:
                doc = candidates[0]
        if not doc:
            raise KeyError(f"No Estate/Stringline body found for id: {record_id}")
        return {
            "id": doc["id"],
            "title": doc["title"],
            "text": doc["text"],
            "url": doc.get("url", ""),
            "metadata": {
                "source_kind": doc.get("source_kind"),
                "source_file": doc.get("source_file"),
                "aliases": doc.get("aliases", []),
                "relationships": doc.get("relationships", []),
                "tags": doc.get("tags", []),
                "flags": doc.get("flags", []),
            },
            "record": deepcopy(doc.get("record", {})),
        }

    def resolve(self, target: str) -> dict[str, Any]:
        if target in self.by_id:
            return self.fetch(target)
        found = self.search(target, limit=1)
        if not found["results"]:
            raise KeyError(f"No Stringdoor candidate found for: {target}")
        return self.fetch(found["results"][0]["id"])

    @staticmethod
    def valid_external_url(url: str) -> bool:
        if not url:
            return False
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)

    def append_receipt(self, action: str, target_id: str, outcome: str, evidence: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._lock:
            state = self.load_state()
            receipt = {
                "id": f"STRINGRECEIPT-{len(state['receipts']) + 1:06d}",
                "time": utc_now(),
                "action": action,
                "target_id": target_id,
                "outcome": outcome,
                "evidence": evidence or {},
                "previous_hash": state.get("receipt_chain_head", "GENESIS"),
            }
            receipt["hash"] = sha256_text(canonical_json(receipt))
            state["receipts"].append(receipt)
            state["receipt_chain_head"] = receipt["hash"]
            self.save_state(state)
            return receipt

    def open_stringdoor(self, target: str, create_receipt: bool = True) -> dict[str, Any]:
        resolved = self.resolve(target)
        url = resolved.get("url", "")
        openable = self.valid_external_url(url)
        plan = {
            "target": resolved["id"],
            "title": resolved["title"],
            "url": url,
            "openable": openable,
            "host": urlparse(url).netloc if openable else "",
            "operation": "OPEN_EXTERNAL" if openable else "RETURN_SOURCE_ROUTE",
            "boundary": "The Navigator governs identity and receipt; ChatGPT/OpenAI browser or the device browser performs external navigation after user-approved access.",
        }
        if create_receipt:
            plan["stringreceipt"] = self.append_receipt(
                "OPEN_STRINGDOOR_PLAN",
                resolved["id"],
                "READY" if openable else "NO_EXTERNAL_URL",
                {"url": url, "source_file": resolved["metadata"]["source_file"]},
            )
        return plan

    def resolve_rootword(self, term: str) -> dict[str, Any]:
        result = self.search(term, limit=6, sources=["radius_lexicon"])
        if not result["results"]:
            raise KeyError(f"RootWord/Radius entry not found: {term}")
        top = self.fetch(result["results"][0]["id"])
        record = top["record"]
        return {
            "term": term,
            "entry": top,
            "meaning_radius": record.get("meaning_radius", {}),
            "root_action": record.get("root_action", ""),
            "use_law": record.get("use_law", ""),
            "visual_face": record.get("visual_face", {}),
            "wordplay_face": record.get("wordplay_face", {}),
            "claim_boundary": record.get("claim", {}),
            "alternatives": result["results"][1:],
        }

    def return_lineage(self, record_id: str) -> dict[str, Any]:
        item = self.fetch(record_id)
        record = item["record"]
        lineage = record.get("lineage") or []
        source = record.get("source") or item["metadata"]["source_file"]
        preserved = record.get("preserved") or ""
        connections = record.get("connections") or item["metadata"].get("relationships", [])
        return {
            "id": item["id"],
            "title": item["title"],
            "source": source,
            "source_file": item["metadata"]["source_file"],
            "preserved": preserved,
            "lineage": lineage,
            "connections": connections,
            "authority": record.get("authority", {}),
            "boundary": record.get("claim", {}).get("boundary", "") if isinstance(record.get("claim"), dict) else "",
        }

    def create_stringmark(self, target_id: str, label: str = "", note: str = "") -> dict[str, Any]:
        item = self.resolve(target_id)
        with self._lock:
            state = self.load_state()
            existing = next((m for m in state["stringmarks"] if m["target_id"] == item["id"]), None)
            if existing:
                existing.update({"label": label or existing.get("label") or item["title"], "note": note, "updated_at": utc_now()})
                mark = existing
                outcome = "UPDATED"
            else:
                mark = {
                    "id": f"STRINGMARK-{len(state['stringmarks']) + 1:05d}",
                    "target_id": item["id"],
                    "title": item["title"],
                    "url": item.get("url", ""),
                    "label": label or item["title"],
                    "note": note,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                }
                state["stringmarks"].append(mark)
                outcome = "CREATED"
            self.save_state(state)
        receipt = self.append_receipt("CREATE_STRINGMARK", item["id"], outcome, {"stringmark_id": mark["id"]})
        return {"stringmark": mark, "stringreceipt": receipt}

    def register_body(self, body: dict[str, Any]) -> dict[str, Any]:
        name = str(body.get("name", "")).strip()
        if not name:
            raise ValueError("body.name is required")
        registered = {
            "id": str(body.get("id") or f"LOCAL-BODY-{sha256_text(name + utc_now())[:10].upper()}"),
            "name": name,
            "version": str(body.get("version", "unversioned")),
            "kind": str(body.get("kind", "sovereign body")),
            "route": str(body.get("route", "")),
            "source": str(body.get("source", "owner-provided")),
            "lineage": body.get("lineage", []),
            "capabilities": body.get("capabilities", []),
            "claim_boundary": str(body.get("claim_boundary", "Named and registered; not independently proven by registration alone.")),
            "registered_at": utc_now(),
        }
        with self._lock:
            state = self.load_state()
            if any(x["id"] == registered["id"] for x in state["registered_bodies"]):
                raise ValueError(f"registered body id already exists: {registered['id']}")
            state["registered_bodies"].append(registered)
            self.save_state(state)
        receipt = self.append_receipt("REGISTER_BODY", registered["id"], "REGISTERED_NOT_PROVEN", {"name": name})
        return {"body": registered, "stringreceipt": receipt}

    def create_stringreceipt(self, action: str, target_id: str, outcome: str, evidence: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.append_receipt(action, target_id, outcome, evidence)

    def export_savepack(self, name: str = "JM3232_NAVIGATOR_SAVEPACK", include_receipts: bool = True) -> dict[str, Any]:
        clean = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._") or "JM3232_NAVIGATOR_SAVEPACK"
        state = self.load_state()
        payload = {
            "schema": "jm.navigator.savepack/v0.1",
            "created_at": utc_now(),
            "source_bridge": "JM3232 Navigator Browser Bridge v0.1",
            "source_authority": self.build_meta,
            "stringmarks": state["stringmarks"],
            "registered_bodies": state["registered_bodies"],
            "receipts": state["receipts"] if include_receipts else [],
            "receipt_chain_head": state["receipt_chain_head"],
            "source_manifest_hash": sha256_text(canonical_json(self.source_manifest)),
            "boundary": "SavePack preserves governed pointers, local registrations and receipts; it does not duplicate every full source body.",
        }
        payload_hash = sha256_text(canonical_json(payload))
        payload["sha256"] = payload_hash
        path = EXPORTS / f"{clean}_{payload_hash[:12]}.json"
        atomic_write_json(path, payload)
        receipt = self.append_receipt("EXPORT_SAVEPACK", clean, "EXPORTED", {"path": str(path.relative_to(ROOT)), "sha256": payload_hash})
        return {"path": str(path), "relative_path": str(path.relative_to(ROOT)), "sha256": payload_hash, "stringreceipt": receipt}

    def bridge_status(self) -> dict[str, Any]:
        state = self.load_state()
        return {
            "name": "JM3232 Navigator Browser Bridge",
            "version": "0.1",
            "state": "LOCAL_MCP_BUILD_READY",
            "source_body": self.build_meta,
            "source_counts": self.source_manifest["counts"],
            "runtime": {
                "stringmarks": len(state["stringmarks"]),
                "registered_bodies": len(state["registered_bodies"]),
                "receipts": len(state["receipts"]),
                "receipt_chain_head": state["receipt_chain_head"],
            },
            "tool_aliases": CANONICAL_TOOL_MAP,
            "boundary": "Built and locally testable. Not yet connected to ChatGPT developer mode, deployed behind HTTPS, or authorised against signed-in external hosts.",
        }

    def validate_receipt_chain(self) -> dict[str, Any]:
        state = self.load_state()
        previous = "GENESIS"
        failures = []
        for index, receipt in enumerate(state["receipts"]):
            supplied_hash = receipt.get("hash")
            payload = {k: v for k, v in receipt.items() if k != "hash"}
            expected_hash = sha256_text(canonical_json(payload))
            if receipt.get("previous_hash") != previous or supplied_hash != expected_hash:
                failures.append({"index": index, "id": receipt.get("id")})
            previous = supplied_hash
        return {"pass": not failures, "receipts": len(state["receipts"]), "failures": failures, "head": previous}


BRIDGE = NavigatorBridge()


def as_tool_result(structured: dict[str, Any], narration: str, widget: bool = True) -> dict[str, Any]:
    result = {
        "structuredContent": structured,
        "content": [{"type": "text", "text": narration}],
    }
    if widget:
        result["_meta"] = {"ui.resourceUri": WIDGET_URI, "openai/outputTemplate": WIDGET_URI}
    return result
