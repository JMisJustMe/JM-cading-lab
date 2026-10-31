#!/usr/bin/env python3
"""Real POSIX repository-process entrypoint for the optional JM memory sidecar.

Executes the EXISTING JM repository adapter and sovereign core on every operation.
Binds scope to the operating-system user and Git working-tree root, not AI text.
Serialises independent local processes with a POSIX advisory lock.
This is not live Codex/Claude/MCP/device execution and not a security vault.
"""
from __future__ import annotations

import argparse
import asyncio
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from jm_scoped_memory import HostScope, ScopedMemory, MemoryIntegrity, MemoryConflict, ScopeChanged

JM_ROOT = Path(__file__).resolve().parents[3]
REPO_ADAPTER = JM_ROOT / "agent-runtime/host-adapters/codex-repository-agent/jm_codex_repository_adapter.py"
HOST_SCHEMA = "JM.ScopedMemoryRepositoryContact/0.2"


def stable(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def git_workspace():
    cmd = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True,
                         text=True, cwd=Path.cwd(), check=False)
    if cmd.returncode or not cmd.stdout.strip():
        raise ValueError("HOLD: current directory is not a Git workspace")
    return str(Path(cmd.stdout.strip()).resolve(strict=True))


def local_owner():
    if not hasattr(os, "getuid"):
        raise RuntimeError("HOLD: POSIX owner binding unavailable")
    return "posix-uid:" + str(os.getuid())


def memory_home():
    supplied = os.environ.get("XDG_STATE_HOME")
    if supplied:
        base = Path(supplied)
        if not base.is_absolute():
            raise ValueError("XDG_STATE_HOME must be absolute")
    else:
        base = Path.home() / ".local" / "state"
    return base / "jm-ecostate" / "scoped-memory"


@contextmanager
def corpus_lock(home):
    """Serialise independent CLI processes; covers load, mutate, commit, readback."""
    if home.is_symlink():
        raise MemoryIntegrity("memory root symlink rejected")
    home.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock_path = home / ".jm-repository-process.lock"
    if lock_path.is_symlink():
        raise MemoryIntegrity("lock symlink rejected")
    flags = os.O_RDWR | os.O_CREAT
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(lock_path, flags, 0o600)
    try:
        if not os.path.isfile(lock_path):
            raise MemoryIntegrity("lock path not regular file")
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def original_jm_session(workspace, query):
    proc = subprocess.run(
        [sys.executable, str(REPO_ADAPTER), "--query", query, "--target", workspace, "--compact"],
        cwd=JM_ROOT, text=True, capture_output=True, check=False)
    if proc.returncode:
        raise RuntimeError("HOLD: original JM repository adapter failed: " + proc.stderr[:300])
    try:
        envelope = json.loads(proc.stdout)
    except ValueError as exc:
        raise RuntimeError("HOLD: invalid original JM adapter response") from exc
    if (envelope.get("schema") != "JM.RepositoryAgentSession/0.1"
            or envelope.get("authority_class") != "HOST_ADAPTER_NOT_SOURCE_AUTHORITY"
            or envelope.get("adapter", {}).get("live_codex_contact") is not False
            or envelope.get("repository", {}).get("target") != workspace
            or envelope.get("core", {}).get("schema") != "JM.AgentRuntimeSession/0.1"
            or envelope.get("core", {}).get("authority_class") != "SESSION_ROUTER_NOT_SOURCE_AUTHORITY"):
        raise RuntimeError("HOLD: original JM adapter authority/contract mismatch")
    core_text = stable(envelope["core"])
    if hashlib.sha256(core_text.encode("utf-8")).hexdigest() != envelope.get("core_sha256"):
        raise RuntimeError("HOLD: original JM core digest mismatch")
    return envelope



def bounded_phone_git_status_receipt(payload, source_url):
    """Untrusted external receipt -> privacy-minimised JM source reference, never attestation."""
    source_pattern = (r"https://github\\.com/JMisJustMe/JM-ai-studio-surface/"
                      r"issues/[1-9][0-9]*#issuecomment-[1-9][0-9]*")
    if not isinstance(source_url, str) or re.fullmatch(source_pattern, source_url) is None:
        raise ValueError("HOLD: private original Phone Commander issue-comment URL required")
    if not isinstance(payload, dict) or payload.get("state") != "PASS":
        raise ValueError("HOLD: source receipt does not report PASS")
    consequence = payload.get("consequence")
    if not isinstance(consequence, dict) or consequence.get("result") != "PASS":
        raise ValueError("HOLD: Phone Commander consequence not PASS")
    git = consequence.get("git")
    branch = consequence.get("branch")
    if not isinstance(git, dict) or not isinstance(branch, dict):
        raise ValueError("HOLD: missing original Phone Commander git-status output")
    if any(type(part.get("exit_code")) is not int or part["exit_code"] != 0
           or not isinstance(part.get("stdout"), str)
           or not isinstance(part.get("stderr"), str)
           or part["stderr"] != "" for part in (git, branch)):
        raise ValueError("HOLD: device command error or unbounded output")
    raw_branch = branch["stdout"].strip()
    if not re.fullmatch(r"[a-zA-Z0-9_.\\/-]{1,120}", raw_branch):
        raise ValueError("HOLD: branch data is not an inert bounded identifier")
    if len(git["stdout"].encode("utf-8")) > 4096:
        raise ValueError("HOLD: git-status output too large")
    summary = {
        "schema": "JM.PhoneReceiptReference/0.1",
        "source_url": source_url,
        "source_command": "git-status",
        "source_receipt_sha256": hashlib.sha256(stable(payload).encode("utf-8")).hexdigest(),
        "source_authentication": "NOT_PERFORMED_BY_LOCAL_HOST",
        "record_class": "EXTERNAL_DEVICE_RETURN_REFERENCE_NOT_NEW_PHONE_DING",
        "reported_result": "PASS",
        "reported_phone_branch": raw_branch,
        "reported_clean_tracked_files": git["stdout"] == "",
        "raw_receipt_custody": "ORIGINAL_PRIVATE_GITHUB_COMMENT_NOT_REPRODUCED",
    }
    return stable(summary)


async def action(memory, args, body):
    if args.action in ("write", "ingest-phone-git-status"):
        committed = await memory.write(args.name, body, mode=args.mode,
                                       expected_digest=args.expected_digest)
        returned = await memory.read(args.name)
        if (returned["digest"] != committed["digest"]
                or returned["revision"] != committed["revision"]
                or returned["body"] != body):
            raise MemoryIntegrity("write/readback consequence mismatch")
        consequence = {"action": args.action, "status": "COMMITTED_AND_READ_BACK",
                       "note": args.name, "revision": returned["revision"], "digest": returned["digest"],
                       "scope": committed["scope"]}
        if args.action == "ingest-phone-git-status":
            consequence["source_contact"] = "REFERENCE_ONLY_LOCAL_HOST_DID_NOT_FETCH_PHONE"
        return consequence
    if args.action == "read":
        result = await memory.read(args.name)
        return {"action": "read", "status": "RETURNED", "note": args.name,
                "body": result["body"], "revision": result["revision"], "digest": result["digest"],
                "previous": result["previous"],
                "scope": result["scope"]}
    if args.action == "list":
        return {"action": "list", "status": "RETURNED", "note_keys": await memory.list_keys()}
    raise ValueError("unsupported action")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("write", "read", "list", "ingest-phone-git-status"))
    parser.add_argument("--name", help="note key, required for read and write")
    parser.add_argument("--mode", choices=("create", "update", "correct"), default="create")
    parser.add_argument("--expected-digest", help="exact current note digest for correct mode")
    parser.add_argument("--source-url", help="existing private Phone Commander issue-comment URL; ingestion only")
    parser.add_argument("--harness", default="repository-cli",
                        help="telemetry label ONLY, not proof of a live provider")
    parser.add_argument("--query", default="coding runtime",
                        help="query routed through the original JM adapter")
    args = parser.parse_args()
    try:
        if args.action in ("write", "read", "ingest-phone-git-status") and not args.name:
            raise ValueError("name required for read/write/intake")
        if args.action not in ("write", "ingest-phone-git-status") and args.expected_digest is not None:
            raise ValueError("expected-digest requires a write action")
        if args.action != "ingest-phone-git-status" and args.source_url is not None:
            raise ValueError("source-url is only for phone receipt ingestion")
        if args.action == "ingest-phone-git-status" and args.mode not in ("create", "correct"):
            raise ValueError("phone receipt ingestion cannot perform unconditional update")
        if not re.fullmatch(r"[a-z0-9_-]{1,40}", args.harness):
            raise ValueError("invalid harness label")
        if args.action != "write" and not sys.stdin.isatty():
            # Deliberately never consume stdin for read/list.
            pass
        body = None
        if args.action in ("write", "ingest-phone-git-status"):
            body = sys.stdin.buffer.read(8193).decode("utf-8", "strict")
            if not (0 < len(body.encode("utf-8")) <= 8192):
                raise ValueError("write/intake requires 1..8192 bytes of UTF-8 via stdin")
            if args.action == "ingest-phone-git-status":
                try:
                    parsed = json.loads(body)
                except ValueError as exc:
                    raise ValueError("HOLD: malformed original Phone Commander receipt") from exc
                body = bounded_phone_git_status_receipt(parsed, args.source_url)
        workspace = git_workspace()
        os.umask(0o077)
        owner = local_owner()
        envelope = original_jm_session(workspace, args.query)
        memory = ScopedMemory(memory_home(), HostScope(owner, workspace), envelope["core"], args.harness)
        with corpus_lock(memory.root):
            result = asyncio.run(action(memory, args, body))
        out = {
            "schema": HOST_SCHEMA,
            "authority": "POSIX_REPOSITORY_PROCESS_NOT_SOVEREIGN_BODY",
            "original_adapter": "jm_codex_repository_adapter.py",
            "core_sha256": envelope["core_sha256"],
            "adapter_manifest_sha256": hashlib.sha256(REPO_ADAPTER.read_bytes()).hexdigest(),
            "workspace": workspace,
            "proof": "REAL_LOCAL_REPOSITORY_PROCESS_CONTACT_NOT_LIVE_CODEX_CLAUDE_OR_DEVICE",
            "provider_contact": False,
            "consequence": result,
        }
        print(stable(out))
        return 0
    except (MemoryIntegrity, MemoryConflict, ScopeChanged, ValueError, RuntimeError, UnicodeError,
            OSError, subprocess.SubprocessError) as exc:
        print(stable({"schema": HOST_SCHEMA, "status": "HOLD",
                      "error_type": type(exc).__name__, "error": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
