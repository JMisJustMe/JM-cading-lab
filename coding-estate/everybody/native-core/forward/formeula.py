from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import re
from typing import Any

BRIDGE_AUTHORITY = "AUTHORISED_FORWARD_CREATION__NATIVE_RECOVERY_OPEN"
LAW = "form, relation and consequence remain linked through the executable formula body."


class FormeULAError(ValueError):
    pass


@dataclass(frozen=True)
class FormulaTerm:
    name: str
    value: Any


@dataclass(frozen=True)
class FormulaRelation:
    left: str
    operator: str
    right: str
    output: str


@dataclass(frozen=True)
class FormeULAProgram:
    name: str
    terms: tuple[FormulaTerm, ...]
    relations: tuple[FormulaRelation, ...]
    yield_name: str
    source_sha256: str

    def to_ir(self) -> dict[str, Any]:
        return {
            "schema": "jm.formeula.ir/1.0-forward",
            "authority": BRIDGE_AUTHORITY,
            "law": LAW,
            "name": self.name,
            "slots": {t.name: t.value for t in self.terms},
            "relations": [r.__dict__ for r in self.relations],
            "yield": self.yield_name,
            "source_sha256": self.source_sha256,
        }


OPERATORS = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b if b != 0 else (_ for _ in ()).throw(FormeULAError("division by zero")),
    "JOIN": lambda a, b: f"{a}{b}",
    "RELATE": lambda a, b: {"left": a, "right": b, "relation": "contact"},
}


class FormeULAFrontend:
    """Declared forward FormeULA body.

    Historical/native recovery is still open. This bridge therefore declares itself
    in AST/IR/runtime output and is replaceable by recovered authority.

    Grammar:
      FORME <name>
      LET <slot> = <json-or-bare-value>
      APPLY <slot> <operator> <slot> -> <output>
      YIELD <slot>
      END
    """

    def parse(self, source: str) -> FormeULAProgram:
        lines = [x.strip() for x in source.replace("\r\n", "\n").split("\n") if x.strip() and not x.strip().startswith("#")]
        if len(lines) < 3 or not lines[0].startswith("FORME ") or lines[-1] != "END":
            raise FormeULAError("FORME header and END are required")
        name = lines[0][6:].strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*", name):
            raise FormeULAError("invalid formula body name")
        terms: list[FormulaTerm] = []
        relations: list[FormulaRelation] = []
        yield_name = ""
        known = set()
        for line in lines[1:-1]:
            if line.startswith("LET "):
                m = re.fullmatch(r"LET\s+([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)", line)
                if not m:
                    raise FormeULAError(f"bad LET: {line}")
                key, raw = m.groups()
                try:
                    value = json.loads(raw)
                except json.JSONDecodeError:
                    value = raw
                terms.append(FormulaTerm(key, value)); known.add(key)
            elif line.startswith("APPLY "):
                m = re.fullmatch(r"APPLY\s+(\S+)\s+(JOIN|RELATE|[+\-*/])\s+(\S+)\s+->\s+(\S+)", line)
                if not m:
                    raise FormeULAError(f"bad APPLY: {line}")
                left, op, right, output = m.groups()
                if left not in known or right not in known:
                    raise FormeULAError(f"relation uses unknown slot: {line}")
                relations.append(FormulaRelation(left, op, right, output)); known.add(output)
            elif line.startswith("YIELD "):
                yield_name = line[6:].strip()
            else:
                raise FormeULAError(f"unknown operator line: {line}")
        if not yield_name or yield_name not in known:
            raise FormeULAError("YIELD must name a known or produced slot")
        return FormeULAProgram(name, tuple(terms), tuple(relations), yield_name, hashlib.sha256(source.encode()).hexdigest())


class FormeULARuntime:
    def run(self, program: FormeULAProgram) -> dict[str, Any]:
        state = {t.name: t.value for t in program.terms}
        trace = []
        for rel in program.relations:
            if rel.operator not in OPERATORS:
                raise FormeULAError(f"unknown operator {rel.operator}")
            before = dict(state)
            state[rel.output] = OPERATORS[rel.operator](state[rel.left], state[rel.right])
            trace.append({"event": "FORM_RELATION_CONSEQUENCE", "relation": rel.__dict__, "before": before, "after": dict(state)})
        return {
            "schema": "jm.formeula.runtime-receipt/1.0-forward",
            "authority": BRIDGE_AUTHORITY,
            "law": LAW,
            "status": "DING",
            "body": program.name,
            "result": state[program.yield_name],
            "state": state,
            "trace": trace,
            "source_sha256": program.source_sha256,
            "final_crown": False,
        }


EXAMPLE = '''FORME RegroupPressure
LET fragments = 5
LET pressure = 2
APPLY fragments * pressure -> weighted
LET label = "regrouped-"
APPLY label JOIN weighted -> formation
YIELD formation
END
'''


def main() -> None:
    frontend = FormeULAFrontend()
    program = frontend.parse(EXAMPLE)
    result = FormeULARuntime().run(program)
    assert result["result"] == "regrouped-10"
    print(json.dumps({"ast": program.__dict__, "ir": program.to_ir(), "runtime": result}, indent=2, default=lambda o: o.__dict__))


if __name__ == "__main__":
    main()
