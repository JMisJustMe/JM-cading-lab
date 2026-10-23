#!/usr/bin/env python3
"""JM Knowledge Assurance v0.5: independently replay source->candidate; NEVER approve/install.

Evidence replay is not human acceptance, cryptographic authorship, or agent competence.
No outbound network, no code execution from source, no private source publication.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile

import jm_knowledge_intake as intake

SCHEMA="JM.KnowledgeAssurance/0.5"
ROUTE_REL="evidence/EXISTING_JM_ROUTE.json"
MANIFEST="SHA256_MANIFEST.json"

class Held(Exception):
    pass

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeDecodeError) as exc:
        raise Held("INVALID_JSON_OR_MISSING") from exc

def verify(candidate:Path, sources:list[Path], expected_manifest_sha256:str|None=None):
    """Require exact original sources; recompile deterministic artifacts in fresh temp space."""
    if candidate.is_symlink() or not candidate.is_dir():
        raise Held("BAD_CANDIDATE_DIRECTORY")
    base=candidate.resolve()
    for item in base.rglob("*"):
        if item.is_symlink():
            raise Held("SYMLINK_IN_CANDIDATE")
    manifest_path=base/MANIFEST
    if not manifest_path.is_file():
        raise Held("MISSING_MANIFEST")
    raw=manifest_path.read_bytes()
    manifest_sha=hashlib.sha256(raw).hexdigest()
    if expected_manifest_sha256 is not None:
        if len(expected_manifest_sha256)!=64 or any(c not in "0123456789abcdef" for c in expected_manifest_sha256):
            raise Held("INVALID_EXTERNAL_ANCHOR")
        if manifest_sha!=expected_manifest_sha256:
            raise Held("EXTERNAL_MANIFEST_ANCHOR_MISMATCH")
    manifest=load(manifest_path)
    if manifest.get("schema")!="JM.KnowledgeCandidateManifest/0.4" or manifest.get("state")!="HELD":
        raise Held("MANIFEST_AUTHORITY_OR_SCHEMA")
    hashes=manifest.get("files")
    if not isinstance(hashes,dict) or not hashes:
        raise Held("INVALID_FILE_INDEX")
    for rel, digest in hashes.items():
        if not isinstance(rel,str) or not isinstance(digest,str):
            raise Held("INVALID_MANIFEST_ENTRY")
        p=Path(rel)
        if p.is_absolute() or ".." in p.parts or not p.parts or p.as_posix()!=rel or rel==MANIFEST:
            raise Held("MANIFEST_PATH_ESCAPE")
        dest=base/p
        if not dest.is_file() or dest.is_symlink() or not dest.resolve().is_relative_to(base):
            raise Held("MISSING_OR_ESCAPED_ARTIFACT")
        if intake.sha(dest.read_bytes())!=digest:
            raise Held("ARTIFACT_DIGEST_DRIFT")
    actual={p.relative_to(base).as_posix() for p in base.rglob("*") if p.is_file()}
    if actual!={MANIFEST,*hashes}:
        raise Held("UNTRACKED_OR_MISSING_FILE")
    receipt=load(base/"evidence/RECEIPT.json")
    if (receipt.get("schema")!="JM.KnowledgeCandidate/0.4"
        or receipt.get("state")!="HELD"
        or receipt.get("phase")!="EXTRACTED_CANDIDATE_NOT_SKILL_INSTALLED"
        or receipt.get("human_approval")!="REQUIRED_BEFORE_PROMOTION"
        or receipt.get("source_text_authority")!="NONE"
        or receipt.get("external_upload")!="NONE"
        or receipt.get("source_originals_written_into_output") is not False
        or receipt.get("agent_skill_discovery")!="NOT_TESTED"):
        raise Held("RECEIPT_AUTHORITY_INFLATION")
    if len(sources)!=receipt.get("source_count") or not sources:
        raise Held("SOURCE_COUNT_MISMATCH")
    actual_sources=[]
    for source in sources:
        try:
            _, metadata=intake.parse_source(source)
        except (OSError, ValueError) as exc:
            raise Held("SOURCE_UNAVAILABLE_OR_INVALID") from exc
        actual_sources.append(metadata)
    if actual_sources != receipt.get("source_files"):
        raise Held("ORIGINAL_SOURCE_DRIFT")
    if manifest.get("source_ids") != [item["sha256"] for item in actual_sources]:
        raise Held("SOURCE_ID_DRIFT")
    with tempfile.TemporaryDirectory(prefix="jm-knowledge-replay-") as temp:
        rebuilt=Path(temp)/"replay"
        try:
            intake.compile_sources(sources,rebuilt,receipt["query"])
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise Held("SOURCE_REPLAY_FAILED") from exc
        replay_manifest=load(rebuilt/MANIFEST)
        replay_files=replay_manifest["files"]
        allowed=set(replay_files)|{ROUTE_REL}
        if set(hashes)!=allowed and set(hashes)!=set(replay_files):
            raise Held("UNEXPECTED_TRACKED_ARTIFACTS")
        for rel, digest in replay_files.items():
            if hashes.get(rel)!=digest:
                raise Held("REPLAY_CONTENT_DIVERGENCE")
    if ROUTE_REL in hashes:
        route=load(base/ROUTE_REL)
        if (route.get("schema")!="JM.AgentSkillReadOnlyContact/0.3"
            or route.get("scope_state")!="HELD"
            or route.get("host_contact")!="OPEN"
            or route.get("owner_device_contact")!="OPEN"
            or route.get("target_consequence")!="NOT_ATTEMPTED"
            or route.get("discrepancies")!=[]
            or route.get("query")!=receipt["query"]):
            raise Held("EXISTING_JM_ROUTE_DRIFT")
    return {
        "schema":SCHEMA,
        "result":"PASS_SOURCE_REPLAY_ONLY",
        "state":"HELD",
        "candidate":receipt["name"],
        "manifest_sha256":manifest_sha,
        "anchor_compared":expected_manifest_sha256 is not None,
        "original_sources_revalidated":len(actual_sources),
        "source_sha256":[m["sha256"] for m in actual_sources],
        "candidate_files_verified":len(hashes),
        "query_hits":receipt["query_hits"],
        "quarantined_lines":receipt["suspicious_lines_quarantined"],
        "existing_jm_route": "PRESENT_AND_BOUNDED" if ROUTE_REL in hashes else "NOT_REQUESTED",
        "human_approval":"NOT_PERFORMED",
        "agent_skill_installed":False,
        "external_agent_contact":"NOT_TESTED",
        "promote_to_active":"FORBIDDEN_BY_ASSURANCE",
        "proof_boundary":"Integrity and deterministic replay only; neither source truth nor authority nor agent behavior proven.",
    }

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--candidate",type=Path,required=True)
    p.add_argument("--source",type=Path,action="append",required=True)
    p.add_argument("--expect-manifest-sha256")
    p.add_argument("--receipt",type=Path)
    a=p.parse_args(argv)
    try:
        result=verify(a.candidate,a.source,a.expect_manifest_sha256)
        code=0
    except (Held, OSError, ValueError, KeyError, TypeError) as exc:
        result={"schema":SCHEMA,"result":"FAIL_CLOSED","state":"BUGG",
                "error":str(exc) if isinstance(exc,Held) else type(exc).__name__,
                "human_approval":"NOT_PERFORMED","agent_skill_installed":False}
        code=1
    body=intake.json_bytes(result)
    if a.receipt:
        # A generated receipt must live OUTSIDE candidate (keep its manifest sealed).
        if a.receipt.resolve().is_relative_to(a.candidate.resolve()):
            print("JM KNOWLEDGE ASSURANCE: BUGG RECEIPT_INSIDE_CANDIDATE",file=sys.stderr)
            return 1
        a.receipt.write_bytes(body)
    sys.stdout.buffer.write(body)
    return code

if __name__=="__main__":
    raise SystemExit(main())
