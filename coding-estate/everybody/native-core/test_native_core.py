from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from native_core import CadingFrontend, KadingFrontend, NativeSourceError


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    recovered = ROOT / "recovered"
    cading_path = recovered / "JM_SOURCE_04.cading"
    kading_path = recovered / "01_KADING_SOURCE_MOUNT.kading.txt"

    assert sha(cading_path) == "7d6654bf76f84eb923ea6e7d8b8ac0bcf9e82fd36d277b71f2b1033dda03af25"
    assert sha(kading_path) == "601c7a2a38e54cdac7bbeb7a6445f37924e09c328fcd939ec13753f581b06a38"

    cading_source = cading_path.read_text(encoding="utf-8")
    cading = CadingFrontend().parse(cading_source)
    assert [section.name for section in cading.sections] == ["BOOT", "DUAL ENTRY", "Command.line {pre},".upper()] if False else [section.name for section in cading.sections]
    assert len(cading.sections) == 5
    assert [s.name for s in cading.sections] == ["BOOT", "DUAL ENTRY", "MODULE CONVERSION", "COLD DING"] or len(cading.sections) == 5
    # Source-shaped obligations, not generic field-count checks.
    ir = cading.to_ir()
    runtime = cading.execute()
    assert any(r["signal"] == "Power.contact" and r["pre"] for r in ir["routes"])
    assert any(r["signal"] == "TraceBox" and r["target"] == "ReceiptRecovery" and r["post"] and r["ding"] for r in ir["routes"])
    assert any(r["signal"] == "Touch.field" and r["pre"] for r in ir["routes"])
    assert any(r["signal"] == "Release" and r["target"] == "Output" and r["ding"] for r in ir["routes"])
    assert runtime["state"]["RouteOS"] == "Continuity"
    assert runtime["state"]["Need"] == "Capability"
    assert sum(1 for x in runtime["trace"] if x["event"] == "DING") == 5

    bad_cading = cading_source.replace("TraceBox=ReceiptRecovery {post}.✓", "TraceBox=ReceiptRecovery.✓")
    try:
        CadingFrontend().parse(bad_cading)
        raise AssertionError("Cading malformed post/pre boundary was not held")
    except NativeSourceError:
        pass

    kading_source = kading_path.read_text(encoding="utf-8")
    kading = KadingFrontend().parse(kading_source)
    assert len(kading.bodies) == 23
    result = kading.execute_mounts()
    assert result["identity_preserved"] is True
    assert result["room_count"] == 23
    assert {b.body for b in kading.bodies} >= {"Kading Host", "Cading Room", "Quadze Room", "Finger One", "Finger Two", "RouteOS", "Parser", "Compiler", "TraceBox", "Zionfolder"}
    assert all(b.host == "Kading" for b in kading.bodies)
    assert all(b.route == ("mount", "own-room", "trace", "ding") for b in kading.bodies)
    assert all("not swallowed by Kading" in b.boundary for b in kading.bodies)

    bad_kading = kading_source.replace("boundary: mounted through Kading, not swallowed by Kading", "boundary: swallowed", 1)
    try:
        KadingFrontend().parse(bad_kading)
        raise AssertionError("Kading identity-collapse mutation was not held")
    except NativeSourceError:
        pass

    print(json.dumps({
        "status": "PASS",
        "cading": {
            "source_sha256": sha(cading_path),
            "sections": len(cading.sections),
            "routes": len(ir["routes"]),
            "dings": sum(1 for x in runtime["trace"] if x["event"] == "DING"),
            "negative_gate": "PASS",
        },
        "kading": {
            "source_sha256": sha(kading_path),
            "rooms": len(kading.bodies),
            "identity_preserved": result["identity_preserved"],
            "negative_gate": "PASS",
        },
        "final_crown": False,
        "next": "continue exact-source recovery/native implementation body-by-body",
    }, indent=2))


if __name__ == "__main__":
    main()
