#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import crown32_factory as crown32  # noqa: E402
import full_stack_factory as base  # noqa: E402


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-crown32-contracts-") as temp:
        out = Path(temp) / "generated"
        federation = base.generate(ROOT, out)
        assert federation["body_count"] == 100
        receipt = crown32.generate(ROOT, out)
        assert receipt["status"] == "CROWN32_100_BODY_CONTRACT_GENERATION_PASS"
        assert receipt["body_count"] == 100
        assert receipt["gate_count_per_body"] == 32
        assert receipt["total_gate_records"] == 3200
        assert receipt["final_native_crowns"] == 0

        register = json.loads((out / "CROWN32_REGISTER.json").read_text(encoding="utf-8"))
        assert register["census_rule"] == "OPEN_APPEND_ONLY"
        assert register["first_engineering_batch"] == 100
        assert len(register["bodies"]) == 100
        assert len({body["contract_sha256"] for body in register["bodies"]}) == 100

        for body in register["bodies"]:
            body_id = body["body_id"]
            path = out / "bodies" / body_id / "crown32" / "contract.json"
            assert path.is_file(), body_id
            contract = json.loads(path.read_text(encoding="utf-8"))
            assert contract["body"]["id"] == body_id
            assert len(contract["gates"]) == 32
            assert [gate["number"] for gate in contract["gates"]] == list(range(1, 33))
            assert contract["gates"][18]["id"] == "c_backend"
            assert contract["gates"][19]["id"] == "cpp_backend"
            assert contract["gates"][20]["id"] == "cplus_backend"
            assert contract["gates"][21]["id"] == "cminus_backend"
            assert contract["gates"][25]["id"] == "android_gradle"
            assert contract["gates"][28]["id"] == "self_hosting"
            assert contract["gates"][31]["status"] == "FINAL_NATIVE_CROWN_OPEN"
            assert contract["final_crown"] == "OPEN"

        print("JM CROWN32 FACTORY: 100 BODIES x 32 GATES = 3200 IDENTITY-BOUND CONTRACT RECORDS PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
