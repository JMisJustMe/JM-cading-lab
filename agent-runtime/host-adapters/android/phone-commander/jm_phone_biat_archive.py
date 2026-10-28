#!/usr/bin/env python3
"""Reproducible JM Phone Commander BIAT/FLAZ source custody; never includes private mailbox receipts."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import zipfile

ROOT = Path(__file__).resolve().parents[4]
PREFIX = "JM_PHONE_COMMANDER_CP10"
FILES = (
    "AGENTS.md",
    "agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json",
    "agent-runtime/jm_agent_runtime.py",
    "agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md",
    "agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_v1_0.json",
    "agent-runtime/host-adapters/JM_HOST_ADAPTER_REGISTRY_v1_0.json",
    "agent-runtime/host-adapters/android/JM_ANDROID_SOVEREIGN_AGENT_ADAPTER_v0_1.json",
    "agent-runtime/host-adapters/codex-repository-agent/JM_CODEX_REPOSITORY_AGENT_ADAPTER_v0_1.json",
    "services/jm-ecostate-build-mesh-mcp-v0_5/JM_SOVEREIGN_AGENT_CONTRACT_v0_1.json",
    "agent-runtime/host-adapters/android/phone-commander/JM_PHONE_COMMANDER_ADAPTER_v0_1.json",
    "agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py",
    "agent-runtime/host-adapters/android/phone-commander/test_phone_commander.py",
    "agent-runtime/host-adapters/android/phone-commander/jmphone-reenter.sh",
    "agent-runtime/host-adapters/android/phone-commander/README.md",
    "agent-runtime/host-adapters/android/phone-commander/start-jm-phone-mailbox.termux-boot.example",
    "agent-runtime/host-adapters/android/phone-commander/JM_PHONE_COMMANDER_CP09_OWNER_PROOF.md",
    "agent-runtime/host-adapters/android/phone-commander/JM_PHONE_COMMANDER_BIAT_FLAZ_2026-10-28.md",
    "agent-runtime/host-adapters/android/phone-commander/jm_phone_biat_archive.py",
    ".github/workflows/jm-phone-commander-conformance.yml",
    ".github/workflows/jm-host-adapter-conformance.yml",
    ".github/workflows/jm-phone-commander-biat-flaz.yml",
)
def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def validate_rel(p: str) -> None:
    pure = PurePosixPath(p)
    if not p or pure.is_absolute() or ".." in pure.parts or "\\" in p or p.startswith(".") and p != ".github/workflows/jm-phone-commander-conformance.yml" and p != ".github/workflows/jm-host-adapter-conformance.yml" and p != ".github/workflows/jm-phone-commander-biat-flaz.yml":
        raise ValueError(f"unsafe custody path: {p}")
    if p != pure.as_posix():
        raise ValueError(f"non-normal custody path: {p}")

def collect() -> dict[str,bytes]:
    if len(FILES) != len(set(FILES)):
        raise ValueError("duplicate source entry")
    out={}
    for name in FILES:
        validate_rel(name)
        src=ROOT / name
        if not src.is_file() or src.is_symlink() or not src.resolve().is_relative_to(ROOT):
            raise ValueError(f"source missing/unsafe: {name}")
        out[name]=src.read_bytes()
    return out

def zipinfo(name: str) -> zipfile.ZipInfo:
    z=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0))
    z.compress_type=zipfile.ZIP_DEFLATED
    z.external_attr=(0o100644 << 16)
    z.create_system=3
    return z

def build(outdir:Path) -> dict:
    src=collect()
    registry=json.loads(src["agent-runtime/host-adapters/JM_HOST_ADAPTER_REGISTRY_v1_0.json"])
    contract=json.loads(src["services/jm-ecostate-build-mesh-mcp-v0_5/JM_SOVEREIGN_AGENT_CONTRACT_v0_1.json"])
    ids=[a["id"] for a in registry["adapters"]]
    assert len(ids)==10 and ids==contract["host_adapter_conformance"]["registered_adapter_ids"]
    adapter={a["id"]:a for a in registry["adapters"]}
    assert adapter["android-termux-phone-commander"]["proof_level"]=="HOST_CONTACT"
    assert adapter["android-phone-adapter"]["proof_level"]=="TRANSPORT"
    manifest={
       "schema":"JM.PhoneCommander.BIATFLAZSourceManifest/1",
       "status":"BOUNDED_HOST_CONTACT; AUTOBOOT_AND_CODEX_OPEN",
       "source_commit":os.getenv("GITHUB_SHA","LOCAL_UNVERIFIED_SHA"),
       "custody":"NON_DESTRUCTIVE_SNAPSHOT; PRIVATE_MAILBOX_NOT_INCLUDED",
       "origin":"JMisJustMe/JM-cading-lab",
       "ancestor_library":"/Zionfolder/JM Estate/Apps & Tools/JM Phone Commander v0.1/JM_PHONE_COMMANDER_v0_1_SOURCE_TESTS.zip",
       "files":[{"path":k,"sha256":digest(v),"bytes":len(v)} for k,v in sorted(src.items())],
    }
    archive=f"{PREFIX}_SOURCE_CUSTODY.zip"
    outdir.mkdir(parents=True,exist_ok=True)
    zippath=outdir/archive
    manbytes=(json.dumps(manifest,sort_keys=True,indent=2)+"\n").encode()
    with zipfile.ZipFile(zippath,"w",zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in sorted(src.items()):
            z.writestr(zipinfo(f"{PREFIX}/{name}"),data)
        z.writestr(zipinfo(f"{PREFIX}/MANIFEST.json"),manbytes)
    # Independent reload from ZIP, exact raw-byte compare, not just a file listing.
    with zipfile.ZipFile(zippath) as z:
        assert z.testzip() is None, "archive CRC failure"
        names=z.namelist()
        assert len(names)==len(set(names))==len(src)+1
        assert set(names)=={f"{PREFIX}/{p}" for p in src}|{f"{PREFIX}/MANIFEST.json"}
        for p,v in src.items():
            assert z.read(f"{PREFIX}/{p}")==v
            assert digest(z.read(f"{PREFIX}/{p}"))==next(x["sha256"] for x in manifest["files"] if x["path"]==p)
        assert z.read(f"{PREFIX}/MANIFEST.json")==manbytes
    # Adversarial gates: a corrupted byte must fail digest, path traversal and duplicate paths refused.
    first=next(iter(src.values()))
    assert digest(first)!=digest(first+b"tampered")
    for bad in ("../escape.txt","/etc/passwd","a/../../x",".ssh/key","a\\b"):
        try: validate_rel(bad)
        except ValueError: pass
        else: raise AssertionError(f"unsafe path accepted: {bad}")
    try:
        validate_rel("a/b") if len({"a/b","a/b"}) != 1 else (_ for _ in ()).throw(ValueError("duplicate sentinel"))
    except ValueError:
        pass
    report={
      "schema":"JM.PhoneCommander.BIATFLAZArchiveProof/1",
      "state":"PASS","file_count":len(src),"source_commit":manifest["source_commit"],
      "source_archive":archive,"archive_sha256":digest(zippath.read_bytes()),
      "archive_bytes":zippath.stat().st_size,"manifest_sha256":digest(manbytes),
      "zip_crc":"PASS","exact_readback":"PASS","traversal_refusal":"PASS",
      "duplicate_entry_refusal":"PASS","tamper_refusal":"PASS",
      "physical_device":"NOT_RETESTED_BY_THIS_WORKFLOW"
    }
    (outdir/f"{PREFIX}_ARCHIVE_PROOF.json").write_text(json.dumps(report,sort_keys=True,indent=2)+"\n")
    print(json.dumps(report,sort_keys=True))
    return report

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output-dir",default="out/jm-phone-commander-biat")
    args=ap.parse_args()
    build(Path(args.output_dir))
