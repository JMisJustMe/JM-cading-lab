from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    path = Path("registry/estate-head-public-v0.2.1.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    bodies = data.get("bodies", [])
    target = next((body for body in bodies if body.get("id") == "EH-007"), None)
    if target is None:
        raise SystemExit("EH-007 Source Authority Pipeline body is missing")

    target.update({
        "name": "JM Source Authority Pipeline — Repository-Wide Gate",
        "version": "v1.0 / six-stage repository enforcement",
        "status": "Proven",
        "proof": "Repository-wide gate passed 61 body passports, 11 Project Head passports and 432 ordered stage receipts; 27 public promotions are guarded without publishing private owner fields.",
        "next": "Begin Estate-Wide Physical Current-Best Census v0.2 through the same six-stage route; update counts deliberately when new governed records are admitted.",
        "connections": [
            "Source Ledger",
            "Latest Body Finder",
            "Source-Body Auditor",
            "Current Best Register",
            "Crown Register",
            "Living Register",
            "Repository Governance Gate"
        ],
        "flags": [
            "six-stage",
            "owner-gate",
            "repository-wide-enforced",
            "72-governed-records",
            "432-stage-receipts",
            "no-version-number-coronation"
        ]
    })

    meta = data.setdefault("meta", {})
    meta["edition"] = "Live Public Authority + Repository-Wide Six-Stage Governance"
    meta["governance_state"] = "PASS_REPOSITORY_WIDE_SIX_STAGE_GOVERNANCE"
    meta["governance_receipt"] = "registry/source-to-living-governance-receipt-v1.0.json"

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("EH-007 repository-wide governance state reconciled")


if __name__ == "__main__":
    main()
