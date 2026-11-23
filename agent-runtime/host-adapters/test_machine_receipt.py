#!/usr/bin/env python3
"""Fail-closed regression of new JM host-adapter machine-receipt candidate.

Runs existing sovereign tester; no source writes, no network, no host-crown.
"""
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFORMANCE = ROOT / "agent-runtime/host-adapters/jm_host_adapter_conformance.py"
CONTRACT = ROOT / "agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_v1_0.json"
REGISTRY = ROOT / "agent-runtime/host-adapters/JM_HOST_ADAPTER_REGISTRY_v1_0.json"

def run(*args):
    return subprocess.run(
        [sys.executable, str(CONFORMANCE), *args],
        cwd=ROOT, capture_output=True, text=True, timeout=90, check=False
    )

def insist(ok, why):
    if not ok:
        raise SystemExit("JM_HOST_MACHINE_RECEIPT_TEST_HOLD: " + why)

def main():
    baseline = run("--all", "--run-local")
    insist(baseline.returncode == 0, "ORIGINAL_CONFORMANCE")
    insist("JM HOST ADAPTER CONFORMANCE: PASS" in baseline.stdout, "BASELINE_NOT_PASS")
    with tempfile.TemporaryDirectory(prefix="jm-host-machine-receipt-") as tmp:
        receipt_path = pathlib.Path(tmp) / "trace" / "receipt.json"
        good = run("--all", "--run-local", "--receipt-json", str(receipt_path))
        insist(good.returncode == 0, "MACHINE_RECEIPT_RUN")
        insist(good.stdout == baseline.stdout, "LEGACY_STDOUT_DRIFT")
        insist(receipt_path.is_file(), "RECEIPT_NOT_WRITTEN")
        result = json.loads(receipt_path.read_text(encoding="utf-8"))
        insist(result["schema"] == "JM.HostAdapterMachineReceipt/0.1", "SCHEMA")
        insist(result["status"] == "PASS", "SUCCESS_SEMANTICS")
        insist(result["actual_checks"]["local_node_python_core_parity"] is True, "LOCAL_PARITY")
        insist(result["actual_checks"]["parity_query_count"] == 4, "PARITY_COUNT")
        insist(result["adapters_checked"] == len(result["adapters"]), "ADAPTER_ACCOUNTING")
        insist("NO_OWNER_DEVICE_CLAIM" in result["claim_boundary"], "BOUNDARY")
        insist(result["provenance"]["contract_sha256"] ==
               hashlib.sha256(CONTRACT.read_bytes()).hexdigest(), "CONTRACT_BYTES")
        insist(result["provenance"]["registry_sha256"] ==
               hashlib.sha256(REGISTRY.read_bytes()).hexdigest(), "REGISTRY_BYTES")
        expected_text = receipt_path.read_bytes()
        repeated = run("--all", "--run-local", "--receipt-json", str(receipt_path))
        insist(repeated.returncode == 0 and receipt_path.read_bytes() == expected_text,
               "NONDETERMINISTIC_RECEIPT")
        denied_path = pathlib.Path(tmp) / "denied.json"
        denied = run("--adapter", "no-such-jm-adapter", "--receipt-json", str(denied_path))
        insist(denied.returncode != 0 and not denied_path.exists(),
               "INVALID_ADAPTER_DID_NOT_FAIL_CLOSED")
        single_path = pathlib.Path(tmp) / "single.json"
        single = run("--adapter", "node-reference-runtime", "--receipt-json", str(single_path))
        insist(single.returncode == 0 and single_path.is_file(), "SINGLE_ADAPTER")
        subset = json.loads(single_path.read_text(encoding="utf-8"))
        insist(subset["adapters_checked"] == 1 and
               subset["adapters"][0]["id"] == "node-reference-runtime" and
               subset["actual_checks"]["local_node_python_core_parity"] is False,
               "SUBSET_SCOPE")
        print(json.dumps({
            "schema": "JM.HostAdapterMachineReceiptRegression/0.1",
            "status": "PASS",
            "legacy_stdout_unchanged": True,
            "real_reference_parity": True,
            "deterministic_receipt": True,
            "fail_closed_unknown_adapter": True,
            "subset_not_overclaimed": True,
            "source_modified": False,
            "receipt_sha256": hashlib.sha256(expected_text).hexdigest(),
            "adapters_checked": result["adapters_checked"]
        }, sort_keys=True))

if __name__ == "__main__":
    main()
