#!/usr/bin/env python3
"""JM original Owner Vault: inspect provider readiness without chat plugins.

Reads only saved Cloudflare GET metadata and the anonymous existing Vault
status response. No login, source-file reads, writes, deletion or deployment.
Any missing/unknown evidence is a HOLD, never a guessed empty or ready state.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys

SCHEMA = "JM.OwnerVaultCloudflareReadiness/0.2"
API_SCHEMA = "JM.OwnerVault/0.1"
PROJECT = "jmisjustme-estate"
BUCKET = "jm-estate-owner-vault"


def is_obj(value):
    return isinstance(value, dict)


def evaluate(project_payload, bucket_payload, live_payload, http, *, run="", commit=""):
    """Classify current read-only provider evidence; never infer from an old receipt."""
    project = project_payload.get("result") if is_obj(project_payload) else None
    bucket = bucket_payload.get("result") if is_obj(bucket_payload) else None
    project_ok = (
        http.get("project") == 200 and project_payload.get("success") is True
        and is_obj(project) and project.get("name") == PROJECT
    )
    bucket_ok = (
        http.get("bucket") == 200 and bucket_payload.get("success") is True
        and is_obj(bucket) and bucket.get("name") == BUCKET
    )
    configs = project.get("deployment_configs") if project_ok else None
    production = (configs or {}).get("production") if is_obj(configs) else None
    r2 = production.get("r2_buckets") if is_obj(production) else None
    vars_ = production.get("env_vars") if is_obj(production) else None
    binding = r2.get("JM_OWNER_VAULT") if is_obj(r2) else None
    # A binding label alone is not enough: require the intended bucket identity.
    r2_ok = is_obj(binding) and binding.get("name") == BUCKET
    key_entry = vars_.get("JM_OWNER_VAULT_KEY") if is_obj(vars_) else None
    # Public/plaintext configuration is not adequate for a private owner key.
    key_ok = is_obj(key_entry) and key_entry.get("type") in ("secret_text", "secret")
    functions_ok = project_ok and project.get("uses_functions") is True
    branch_ok = project_ok and project.get("production_branch") == "main"
    live_ok = (
        http.get("live") == 200 and is_obj(live_payload)
        and live_payload.get("schema") == API_SCHEMA
        and live_payload.get("service") == "JM Owner Vault"
        and live_payload.get("ready") is True
        and live_payload.get("storage_bound") is True
        and live_payload.get("owner_key_configured") is True
        and live_payload.get("public_claim") is False
    )

    checks = {
        "project_read_and_identity": bool(project_ok),
        "bucket_read_and_identity": bool(bucket_ok),
        "production_branch_main": bool(branch_ok),
        "production_functions_declared": bool(functions_ok),
        "correct_private_r2_binding": bool(r2_ok),
        "owner_key_is_secret_configuration": bool(key_ok),
        "anonymous_public_status_contract": bool(live_ok),
    }
    if not checks["project_read_and_identity"]:
        state = "PROJECT_READ_OR_IDENTITY_HOLD"
    elif not checks["bucket_read_and_identity"]:
        state = "BUCKET_ACCESS_OR_IDENTITY_HOLD"
    elif not all((branch_ok, functions_ok, r2_ok, key_ok)):
        state = "PRODUCTION_CONFIG_HOLD"
    elif not live_ok:
        state = "LIVE_FUNCTION_CONTACT_HOLD"
    else:
        state = "READY_FOR_OWNER_AUTHENTICATED_PROOF"

    result = {
        "schema": SCHEMA,
        "observed_utc": datetime.now(timezone.utc).isoformat(),
        "workflow_run": str(run),
        "workflow_source_sha": str(commit),
        "project": PROJECT,
        "bucket": BUCKET,
        "state": state,
        "checks": checks,
        "http_status": {k: http.get(k, 0) for k in ("project", "bucket", "live")},
        "production_deployment_id": (
            (project.get("canonical_deployment") or {}).get("id")
            if project_ok and is_obj(project.get("canonical_deployment"))
            else None
        ),
        "mutations_performed": False,
        "owner_private_bytes_read": False,
        "owner_authenticated_proof": False,
        "source_matches_live_deployment_proven": False,
        "owner_device_proof": False,
        "public_claim": False,
        "ding": False,
        "boundary": (
            "This is external CI's read-only provider+anonymous-function inspection, "
            "NOT authenticated private R2 read/write, actual source-to-deployment identity, "
            "external native editing, owner-device acceptance or public release."
        ),
    }
    return result


def self_test():
    project = {
        "success": True,
        "result": {"name": PROJECT, "production_branch": "main",
                   "uses_functions": True,
                   "deployment_configs": {"production": {
                       "r2_buckets": {"JM_OWNER_VAULT": {"name": BUCKET}},
                       "env_vars": {"JM_OWNER_VAULT_KEY": {"type": "secret_text"}}
                   }}, "canonical_deployment": {"id": "synthetic-id"}}
    }
    bucket = {"success": True, "result": {"name": BUCKET}}
    live = {"schema": API_SCHEMA, "service": "JM Owner Vault", "ready": True,
            "storage_bound": True, "owner_key_configured": True,
            "public_claim": False}
    http = {"project": 200, "bucket": 200, "live": 200}
    def verdict(p=project, b=bucket, l=live, h=http):
        return evaluate(p, b, l, h)["state"]
    assert verdict() == "READY_FOR_OWNER_AUTHENTICATED_PROOF"
    assert not evaluate(project, bucket, live, http)["ding"]
    assert verdict(h={**http, "project": 0}) == "PROJECT_READ_OR_IDENTITY_HOLD"
    assert verdict(h={**http, "bucket": 403}) == "BUCKET_ACCESS_OR_IDENTITY_HOLD"
    assert verdict(h={**http, "live": 503}) == "LIVE_FUNCTION_CONTACT_HOLD"
    assert verdict(b={"success": True, "result": {"name": "wrong-bucket"}}) == "BUCKET_ACCESS_OR_IDENTITY_HOLD"
    assert verdict(p={"success": True, "result": {"name": "wrong-project"}}) == "PROJECT_READ_OR_IDENTITY_HOLD"
    assert verdict(l={"schema": API_SCHEMA, "ready": True}) == "LIVE_FUNCTION_CONTACT_HOLD"
    import copy
    for mutate in (
        lambda p: p["result"].update(uses_functions=False),
        lambda p: p["result"].update(production_branch="preview"),
        lambda p: p["result"]["deployment_configs"]["production"]["r2_buckets"].clear(),
        lambda p: p["result"]["deployment_configs"]["production"]["r2_buckets"]["JM_OWNER_VAULT"].update(name="other"),
        lambda p: p["result"]["deployment_configs"]["production"]["env_vars"]["JM_OWNER_VAULT_KEY"].update(type="plain_text"),
    ):
        changed = copy.deepcopy(project)
        mutate(changed)
        assert verdict(p=changed) == "PRODUCTION_CONFIG_HOLD"
    assert verdict(l={**live, "public_claim": True}) == "LIVE_FUNCTION_CONTACT_HOLD"
    assert verdict(l={**live, "ready": False}) == "LIVE_FUNCTION_CONTACT_HOLD"
    print("PASS Owner Vault independent provider-readiness contract: 15 synthetic PASS/HOLD cases, zero private/provider writes.")


def load_json(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf8"))
    except (OSError, ValueError):
        return {}
    return data if is_obj(data) else {}


def http_status(name):
    try:
        code = int(os.environ.get(name, "0"))
    except (ValueError, TypeError):
        return 0
    return code if 100 <= code <= 599 else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--inspect", nargs=3, metavar=("PROJECT_JSON", "BUCKET_JSON", "LIVE_STATUS_JSON"))
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.inspect:
        parser.error("select --self-test or --inspect PROJECT_JSON BUCKET_JSON LIVE_STATUS_JSON")
    project, bucket, live = (load_json(path) for path in args.inspect)
    result = evaluate(project, bucket, live, {
        "project": http_status("JM_PROJECT_HTTP"),
        "bucket": http_status("JM_BUCKET_HTTP"),
        "live": http_status("JM_LIVE_HTTP"),
    }, run=os.environ.get("GITHUB_RUN_ID", ""), commit=os.environ.get("GITHUB_SHA", ""))
    print(json.dumps(result, indent=2, sort_keys=True))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf8") as stream:
            stream.write("## JM Owner Vault — independent provider readiness\n\n")
            stream.write(f"**{result['state']}** · run {result['workflow_run']} · source {result['workflow_source_sha']}\n\n")
            for key, passed in result["checks"].items():
                stream.write(f"- {'PASS' if passed else 'HOLD'} — `{key}`\n")
            stream.write("\nNo private owner bytes, credentials, Cloudflare mutation, publication, or device acceptance.\n")
            stream.write("This CI-run-specific observation never overwrites the historical repository receipt.\n")
    return 0 if result["state"] == "READY_FOR_OWNER_AUTHENTICATED_PROOF" else 2


if __name__ == "__main__":
    sys.exit(main())
