from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from formeula import BRIDGE_AUTHORITY, EXAMPLE, FormeULAError, FormeULAFrontend, FormeULARuntime


def must_hold(source: str) -> None:
    try:
        p = FormeULAFrontend().parse(source)
        FormeULARuntime().run(p)
    except FormeULAError:
        return
    raise AssertionError("FormeULA invalid source did not HOLD")


def main() -> None:
    front = FormeULAFrontend()
    program = front.parse(EXAMPLE)
    ir = program.to_ir()
    run = FormeULARuntime().run(program)
    assert ir["authority"] == BRIDGE_AUTHORITY
    assert run["authority"] == BRIDGE_AUTHORITY
    assert run["result"] == "regrouped-10"
    assert len(run["trace"]) == 2
    assert all(x["event"] == "FORM_RELATION_CONSEQUENCE" for x in run["trace"])
    assert run["final_crown"] is False

    related = '''FORME RelationBody
LET source = "meaning"
LET target = "runtime"
APPLY source RELATE target -> contact
YIELD contact
END
'''
    r2 = FormeULARuntime().run(front.parse(related))
    assert r2["result"] == {"left": "meaning", "right": "runtime", "relation": "contact"}

    must_hold(EXAMPLE.replace("pressure = 2", "pressure = 0").replace("* pressure", "/ pressure"))
    must_hold(EXAMPLE.replace("APPLY fragments * pressure -> weighted", "APPLY missing * pressure -> weighted"))
    must_hold(EXAMPLE.replace("YIELD formation", "YIELD unknown"))
    must_hold(EXAMPLE.replace("APPLY fragments * pressure -> weighted", "APPLY fragments POW pressure -> weighted"))
    print("JM_FORMEULA_AUTHORISED_FORWARD_NATIVE_PASS")


if __name__ == "__main__":
    main()
