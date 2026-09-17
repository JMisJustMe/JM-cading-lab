#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

SCHEMA = "jm.sovereign-coding-census/0.1"
MINIMUM_FIRST_BATCH = 100
BASE_REGISTRIES = (
    "coding-estate/everybody/body-registry.json",
    "coding-estate/everybody/body-registry-extension-01.json",
    "coding-estate/everybody/body-registry-extension-02.json",
)
POST_100_REGISTRY = "coding-estate/everybody/sovereign-census/body-registry-post-100.json"
REQUIRED_BODY_FIELDS = ("id", "name", "kind", "law", "caps", "targets", "needs")
REQUIRED_POST_FIELDS = (*REQUIRED_BODY_FIELDS, "ordinal", "sovereignty", "evidence", "parity_floor")


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalise_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"missing registry: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid JSON in {path}: {exc}") from exc


def validate_required(body: dict[str, Any], fields: tuple[str, ...], source: str) -> None:
    missing = [field for field in fields if field not in body]
    if missing:
        raise SystemExit(f"{source}: body {body.get('id', '<unknown>')!r} missing {missing}")
    for field in ("id", "name", "kind", "law"):
        if not str(body[field]).strip():
            raise SystemExit(f"{source}: body has blank {field}")
    for field in ("caps", "targets", "needs"):
        if not isinstance(body[field], list):
            raise SystemExit(f"{source}: body {body['id']!r} field {field} must be a list")


def load_census(repo: Path) -> dict[str, Any]:
    bodies: list[dict[str, Any]] = []
    seen_ids: dict[str, str] = {}
    seen_names: dict[str, str] = {}

    for relative in BASE_REGISTRIES:
        data = read_json(repo / relative)
        for raw in data.get("bodies", []):
            body = dict(raw)
            validate_required(body, REQUIRED_BODY_FIELDS, relative)
            body_id = str(body["id"]).strip()
            name_key = normalise_name(str(body["name"]))
            if body_id in seen_ids:
                raise SystemExit(f"duplicate body id {body_id!r}: {seen_ids[body_id]} and {relative}")
            if name_key in seen_names:
                raise SystemExit(
                    f"duplicate normalised body name {body['name']!r}: {seen_names[name_key]} and {relative}; "
                    "classify aliases explicitly instead of double-counting"
                )
            body["census_origin"] = "FIRST_ENGINEERING_BATCH"
            body["registry_source"] = relative
            body["sovereignty_review"] = "CURRENT_TARGET_AWAITING_EXACT_ROLE_AUDIT"
            bodies.append(body)
            seen_ids[body_id] = relative
            seen_names[name_key] = relative

    first_batch_count = len(bodies)
    if first_batch_count < MINIMUM_FIRST_BATCH:
        raise SystemExit(
            f"first engineering batch regressed below {MINIMUM_FIRST_BATCH}: recovered {first_batch_count}"
        )

    post_data = read_json(repo / POST_100_REGISTRY)
    previous_ordinal = MINIMUM_FIRST_BATCH
    for raw in post_data.get("bodies", []):
        body = dict(raw)
        validate_required(body, REQUIRED_POST_FIELDS, POST_100_REGISTRY)
        body_id = str(body["id"]).strip()
        name_key = normalise_name(str(body["name"]))
        ordinal = int(body["ordinal"])
        if ordinal <= previous_ordinal:
            raise SystemExit(
                f"post-100 ordinal {ordinal} is not append-only; expected greater than {previous_ordinal}"
            )
        if body_id in seen_ids:
            raise SystemExit(f"post-100 body id {body_id!r} already exists in {seen_ids[body_id]}")
        if name_key in seen_names:
            raise SystemExit(
                f"post-100 body name {body['name']!r} collides with {seen_names[name_key]}; "
                "record an alias/descendant judgment rather than adding a duplicate"
            )
        if body["sovereignty"] != "confirmed":
            raise SystemExit(f"post-100 body {body_id!r} is not confirmed sovereign")
        if not body["evidence"] or not isinstance(body["evidence"], list):
            raise SystemExit(f"post-100 body {body_id!r} needs visible admission evidence")
        if body["parity_floor"] != "CADING_QUADZE_PLUS":
            raise SystemExit(f"post-100 body {body_id!r} has incorrect parity floor")
        body["census_origin"] = "POST_100_APPEND_ONLY"
        body["registry_source"] = POST_100_REGISTRY
        body["sovereignty_review"] = "CONFIRMED_SOVEREIGN"
        bodies.append(body)
        seen_ids[body_id] = POST_100_REGISTRY
        seen_names[name_key] = POST_100_REGISTRY
        previous_ordinal = ordinal

    ordered = sorted(
        bodies,
        key=lambda body: (
            1 if body["census_origin"] == "POST_100_APPEND_ONLY" else 0,
            int(body.get("ordinal", 0)),
            str(body["id"]),
        ),
    )
    identity_digest = sha256_text(
        stable_json(
            [
                {
                    "id": body["id"],
                    "name": body["name"],
                    "kind": body["kind"],
                    "law": body["law"],
                    "origin": body["census_origin"],
                    "ordinal": body.get("ordinal"),
                }
                for body in ordered
            ]
        )
    )
    return {
        "schema": SCHEMA,
        "status": "OPEN_APPEND_ONLY_NOT_CROWNED",
        "count_boundary": "100 is the first engineering batch, never the final sovereign count.",
        "parity_floor": "CADING_QUADZE_PLUS",
        "first_engineering_batch_count": first_batch_count,
        "post_100_confirmed_count": len(ordered) - first_batch_count,
        "current_total": len(ordered),
        "identity_digest_sha256": identity_digest,
        "bodies": ordered,
    }


def markdown_report(census: dict[str, Any]) -> str:
    lines = [
        "# JM Sovereign Coding Census — Current Open State",
        "",
        f"- Status: **{census['status']}**",
        f"- First engineering batch: **{census['first_engineering_batch_count']}**",
        f"- Confirmed post-100 additions: **{census['post_100_confirmed_count']}**",
        f"- Current total engineering queue: **{census['current_total']}**",
        f"- Floor: **{census['parity_floor']}**",
        f"- Identity digest: `{census['identity_digest_sha256']}`",
        "",
        "> The count remains open. A body enters only through evidence and identity judgment; no round number closes the estate.",
        "",
        "## Post-100 confirmed sovereign bodies",
        "",
    ]
    additions = [body for body in census["bodies"] if body["census_origin"] == "POST_100_APPEND_ONLY"]
    if not additions:
        lines.append("None admitted yet.")
    for body in additions:
        lines.extend(
            [
                f"### {body['ordinal']} — {body['name']}",
                "",
                f"- ID: `{body['id']}`",
                f"- Kind: `{body['kind']}`",
                f"- Law: {body['law']}",
                f"- Machine Ding: `{body.get('machine_ding', 'OPEN')}`",
                "- Immediate needs:",
                *[f"  - {need}" for need in body["needs"]],
                "",
            ]
        )
    lines.extend(
        [
            "## Claim boundary",
            "",
            "Census admission proves identity and queue placement. It does not prove native compiler parity, independent kernel boot, device conformance or final crown.",
            "",
        ]
    )
    return "\n".join(lines)


def write_outputs(census: dict[str, Any], out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "sovereign-census.json").write_text(
        json.dumps(census, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (out / "SOVEREIGN_CENSUS.md").write_text(markdown_report(census), encoding="utf-8")
    (out / "SHA256SUMS.txt").write_text(
        "\n".join(
            f"{hashlib.sha256((out / name).read_bytes()).hexdigest()}  {name}"
            for name in ("sovereign-census.json", "SOVEREIGN_CENSUS.md")
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and emit the open sovereign coding census")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    census = load_census(args.repo.resolve())
    if args.out:
        write_outputs(census, args.out.resolve())
    print(stable_json({key: census[key] for key in (
        "status",
        "first_engineering_batch_count",
        "post_100_confirmed_count",
        "current_total",
        "identity_digest_sha256",
    )}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
