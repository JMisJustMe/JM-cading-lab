#!/usr/bin/env python3
"""Optional JM sovereign-core scoped-memory contact sidecar v0.1.

Host binds the owner/workspace; the model/tool caller never selects its authority.
Single-process host-bound reference. Cross-process simultaneous writes remain OPEN.
No JM sovereign-core modification, no source-authority promotion, no secrets store.
"""
from __future__ import annotations
import asyncio
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
from threading import RLock
from typing import Awaitable, Callable, Optional

SCHEMA = "JM.ScopedMemory/0.1"
CORE_SCHEMA = "JM.AgentRuntimeSession/0.1"
SLUG = re.compile(r"[a-z0-9_-]{1,64}\Z")


class ScopeChanged(RuntimeError): pass
class MemoryConflict(RuntimeError): pass
class MemoryIntegrity(RuntimeError): pass


def stable(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(stable(value).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Lease:
    owner: str
    workspace: str
    generation: int


class HostScope:
    """Owned by a trusted host adapter, not by untrusted agent tool arguments."""
    def __init__(self, owner: str, workspace: str):
        self.lock = RLock()
        self._generation = 0
        self._set(owner, workspace)

    def _set(self, owner: str, workspace: str):
        if not isinstance(owner, str) or not owner.strip():
            raise ValueError("host owner missing")
        if not isinstance(workspace, str) or not workspace.strip():
            raise ValueError("host workspace missing")
        self._owner = owner
        self._workspace = os.path.realpath(workspace)

    def lease(self) -> Lease:
        with self.lock:
            return Lease(self._owner, self._workspace, self._generation)

    def switch(self, owner: str, workspace: str):
        with self.lock:
            self._set(owner, workspace)
            self._generation += 1  # even switching away and back revokes old leases

    def assert_current(self, lease: Lease):
        if lease != Lease(self._owner, self._workspace, self._generation):
            raise ScopeChanged("host identity/workspace changed; operation rejected")


class ScopedMemory:
    """Additive contact around a real JM --core-only capsule, never a replacement."""
    def __init__(self, root: str | Path, host: HostScope, core: dict, harness: str):
        if not isinstance(core, dict) or core.get("schema") != CORE_SCHEMA:
            raise ValueError("invalid JM sovereign core session")
        if core.get("authority_class") != "SESSION_ROUTER_NOT_SOURCE_AUTHORITY":
            raise ValueError("core authority mismatch")
        sources = core.get("source_digests")
        if not isinstance(sources, dict) or not sources:
            raise ValueError("canonical source digests missing")
        if not isinstance(harness, str) or not harness.strip():
            raise ValueError("harness missing")
        self.source_fingerprint = digest(sources)
        self.root = Path(root)
        self.host = host
        self.harness = harness

    def _file(self, lease: Lease):
        scope_hash = digest({"owner": lease.owner, "workspace": lease.workspace})
        return self.root / (scope_hash + ".json"), scope_hash

    def _load(self, file: Path, scope_hash: str):
        if not file.exists() and not file.is_symlink():
            return {"schema": SCHEMA, "scope_key": scope_hash,
                    "source_fingerprint": self.source_fingerprint, "notes": {}}
        if file.is_symlink():
            raise MemoryIntegrity("memory file symlink rejected")
        try:
            doc = json.loads(file.read_text(encoding="utf-8"))
        except (ValueError, UnicodeError, OSError) as ex:
            raise MemoryIntegrity("memory data unreadable") from ex
        if (doc.get("schema") != SCHEMA or doc.get("scope_key") != scope_hash
                or doc.get("source_fingerprint") != self.source_fingerprint
                or not isinstance(doc.get("notes"), dict)):
            raise MemoryIntegrity("scope or canonical source digest mismatch")
        for key, note in doc["notes"].items():
            if not SLUG.fullmatch(key) or not isinstance(note, dict):
                raise MemoryIntegrity("malformed stored note")
            content = {k: note.get(k) for k in ("body", "revision", "previous")}
            if not isinstance(note.get("body"), str) or not isinstance(note.get("revision"), int) or note["revision"] < 1 or digest(content) != note.get("digest"):
                raise MemoryIntegrity("note integrity mismatch")
        return doc

    def _persist(self, path: Path, doc):
        if self.root.is_symlink():
            raise MemoryIntegrity("memory root symlink rejected")
        self.root.mkdir(parents=True, exist_ok=True)
        if path.is_symlink():
            raise MemoryIntegrity("memory file symlink rejected")
        encoded = stable(doc).encode("utf-8")
        if len(encoded) > 1_000_000:
            raise ValueError("memory corpus too large")
        name = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.root, prefix=".jm-memory-", suffix=".tmp", delete=False) as tmp:
                name = tmp.name
                os.chmod(name, 0o600)
                tmp.write(encoded)
                tmp.flush()
                os.fsync(tmp.fileno())
            os.replace(name, path)
        finally:
            if name is not None and os.path.exists(name):
                os.unlink(name)

    async def write(self, name: str, body: str, *, mode="create", expected_digest: Optional[str] = None,
                    before_commit: Optional[Callable[[], Awaitable[None]]] = None):
        if not isinstance(name, str) or not SLUG.fullmatch(name):
            raise ValueError("invalid note slug")
        if not isinstance(body, str) or not 0 < len(body.encode("utf-8")) <= 8192:
            raise ValueError("note body must be 1..8192 UTF-8 bytes")
        if mode not in ("create", "update", "correct"):
            raise ValueError("mode must be create, update or correct")
        if mode == "correct":
            if not isinstance(expected_digest, str) or not re.fullmatch(r"[0-9a-f]{64}", expected_digest):
                raise ValueError("correct requires the exact prior SHA-256 note digest")
        elif expected_digest is not None:
            raise ValueError("expected_digest belongs only to correct mode")
        lease = self.host.lease()
        if before_commit is not None:
            await before_commit()
        else:
            await asyncio.sleep(0)
        with self.host.lock:
            self.host.assert_current(lease)
            file, scope_hash = self._file(lease)
            doc = self._load(file, scope_hash)
            previous = doc["notes"].get(name)
            if mode == "create" and previous:
                raise MemoryConflict("ALREADY_EXISTS")
            if mode in ("update", "correct") and previous is None:
                raise MemoryConflict("NOT_FOUND")
            if mode == "correct" and previous["digest"] != expected_digest:
                raise MemoryConflict("STALE_CORRECTION")
            if previous is None and len(doc["notes"]) >= 256:
                raise ValueError("scope note limit reached")
            content = {"body": body, "revision": previous["revision"] + 1 if previous else 1,
                       "previous": previous["digest"] if previous else None}
            saved = {**content, "digest": digest(content)}
            doc["notes"][name] = saved
            self._persist(file, doc)
            return {"status": "COMMITTED", "schema": SCHEMA, "scope": scope_hash,
                    "source_fingerprint": self.source_fingerprint,
                    "name": name, "revision": saved["revision"], "digest": saved["digest"],
                    "harness": self.harness, "proof": "LOCAL_FILE_RETURN_NOT_DEVICE_OR_CLOUD"}

    async def read(self, name: str, *, before_read: Optional[Callable[[], Awaitable[None]]] = None):
        if not isinstance(name, str) or not SLUG.fullmatch(name):
            raise ValueError("invalid note slug")
        lease = self.host.lease()
        if before_read is not None:
            await before_read()
        else:
            await asyncio.sleep(0)
        with self.host.lock:
            self.host.assert_current(lease)
            file, scope_hash = self._file(lease)
            note = self._load(file, scope_hash)["notes"].get(name)
            if note is None:
                raise MemoryConflict("NOT_FOUND")
            return {"name": name, **note, "scope": scope_hash}

    async def list_keys(self):
        lease = self.host.lease()
        await asyncio.sleep(0)
        with self.host.lock:
            self.host.assert_current(lease)
            file, scope_hash = self._file(lease)
            return sorted(self._load(file, scope_hash)["notes"])