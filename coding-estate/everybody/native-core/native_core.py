from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import re
from typing import Any


class NativeSourceError(ValueError):
    pass


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class CadingTerm:
    raw: str
    name: str
    value: str | None
    opens_pre: bool
    closes_post: bool
    ding: bool


@dataclass(frozen=True)
class CadingSection:
    name: str
    terms: tuple[CadingTerm, ...]


@dataclass(frozen=True)
class CadingProgram:
    title: str
    status: str
    sections: tuple[CadingSection, ...]
    source_sha256: str

    def to_ir(self) -> dict[str, Any]:
        routes = []
        for section in self.sections:
            for index, term in enumerate(section.terms):
                routes.append({
                    "section": section.name,
                    "index": index,
                    "signal": term.name,
                    "target": term.value,
                    "pre": term.opens_pre,
                    "post": term.closes_post,
                    "ding": term.ding,
                })
        return {
            "ir": "CADING_IR_V1",
            "source_sha256": self.source_sha256,
            "title": self.title,
            "status": self.status,
            "routes": routes,
        }

    def execute(self) -> dict[str, Any]:
        state: dict[str, Any] = {}
        trace: list[dict[str, Any]] = []
        for section in self.sections:
            # Recovered JM_SOURCE_04.cading defines COLD DING as a heading-level
            # cold-open scope. Its final FORGE {post}.✓ closes that heading scope.
            # This is source-specific grammar, not a blanket permission for orphan posts.
            scope_open = section.name == "COLD DING"
            if scope_open:
                trace.append({"event": "PRE_OPEN", "section": section.name, "signal": "COLD_DING_SCOPE", "implicit": True})
            for term in section.terms:
                if term.opens_pre:
                    if scope_open:
                        raise NativeSourceError(f"{section.name}: nested pre without close")
                    scope_open = True
                    trace.append({"event": "PRE_OPEN", "section": section.name, "signal": term.name, "implicit": False})
                if term.value is not None:
                    before = state.get(term.name)
                    state[term.name] = term.value
                    trace.append({"event": "STATE_CHANGE", "section": section.name, "signal": term.name, "before": before, "after": term.value})
                else:
                    trace.append({"event": "COMMAND", "section": section.name, "signal": term.name})
                if term.closes_post:
                    if not scope_open:
                        raise NativeSourceError(f"{section.name}: post without pre")
                    scope_open = False
                    trace.append({"event": "POST_CLOSE", "section": section.name, "signal": term.name})
                if term.ding:
                    trace.append({"event": "DING", "section": section.name, "signal": term.name})
            if scope_open:
                raise NativeSourceError(f"{section.name}: unclosed pre scope")
        return {"status": "DING", "state": state, "trace": trace, "source_sha256": self.source_sha256}


class CadingFrontend:
    """Frontend for the recovered JM_SOURCE_04.cading source form.

    Section headings, assignment marks, {pre}/{post} bounds, the COLD DING
    heading-scope and the completion glyph are retained as source syntax.
    """

    HEADER_STATUS = re.compile(r"^STATUS\s*=\s*(.+)$")

    def parse(self, source: str) -> CadingProgram:
        lines = [line.rstrip() for line in source.replace("\r\n", "\n").split("\n")]
        meaningful = [line.strip() for line in lines if line.strip()]
        if len(meaningful) < 3:
            raise NativeSourceError("Cading source too short")
        title = meaningful[0]
        status_match = self.HEADER_STATUS.match(meaningful[1])
        if not status_match:
            raise NativeSourceError("Cading STATUS header missing")
        status = status_match.group(1).strip()

        sections: list[CadingSection] = []
        current_name: str | None = None
        current_terms: list[CadingTerm] = []

        for raw_line in meaningful[2:]:
            is_heading = (
                raw_line == raw_line.upper()
                and "=" not in raw_line
                and "{" not in raw_line
                and not raw_line.endswith(",")
                and not raw_line.endswith(".✓")
            )
            if is_heading:
                if current_name is not None:
                    sections.append(CadingSection(current_name, tuple(current_terms)))
                current_name = raw_line
                current_terms = []
                continue
            if current_name is None:
                raise NativeSourceError(f"term before section: {raw_line}")
            current_terms.append(self._parse_term(raw_line))

        if current_name is not None:
            sections.append(CadingSection(current_name, tuple(current_terms)))
        if not sections:
            raise NativeSourceError("no Cading sections")

        program = CadingProgram(title, status, tuple(sections), sha256_text(source))
        program.execute()
        return program

    @staticmethod
    def _parse_term(raw_line: str) -> CadingTerm:
        raw = raw_line.strip()
        ding = raw.endswith("✓")
        core = raw[:-1] if ding else raw
        core = core.rstrip(".").rstrip(",").strip()
        opens_pre = "{pre}" in core
        closes_post = "{post}" in core
        core = core.replace("{pre}", "").replace("{post}", "").strip().rstrip(",").strip()
        if not core:
            raise NativeSourceError(f"empty Cading term: {raw_line}")
        if "=" in core:
            name, value = [part.strip() for part in core.split("=", 1)]
        else:
            name, value = core, None
        if not name:
            raise NativeSourceError(f"missing Cading signal: {raw_line}")
        return CadingTerm(raw=raw, name=name, value=value, opens_pre=opens_pre, closes_post=closes_post, ding=ding)


@dataclass(frozen=True)
class KadingBody:
    body: str
    host: str
    family: str
    body_type: str
    route: tuple[str, ...]
    working: str
    boundary: str
    ding: str


@dataclass(frozen=True)
class KadingProgram:
    bodies: tuple[KadingBody, ...]
    source_sha256: str

    def to_ir(self) -> dict[str, Any]:
        return {
            "ir": "KADING_OWN_ROOM_IR_V1",
            "source_sha256": self.source_sha256,
            "rooms": [
                {
                    "body": body.body,
                    "host": body.host,
                    "family": body.family,
                    "type": body.body_type,
                    "route": list(body.route),
                    "boundary": body.boundary,
                }
                for body in self.bodies
            ],
        }

    def execute_mounts(self) -> dict[str, Any]:
        trace = []
        room_names = set()
        for body in self.bodies:
            if body.body in room_names:
                raise NativeSourceError(f"duplicate Kading room: {body.body}")
            room_names.add(body.body)
            if body.host != "Kading":
                raise NativeSourceError(f"{body.body}: host drifted from Kading")
            if body.route != ("mount", "own-room", "trace", "ding"):
                raise NativeSourceError(f"{body.body}: own-room route contract broken")
            if "not swallowed by Kading" not in body.boundary:
                raise NativeSourceError(f"{body.body}: non-collapse boundary missing")
            trace.extend([
                {"body": body.body, "event": "MOUNT"},
                {"body": body.body, "event": "OWN_ROOM"},
                {"body": body.body, "event": "TRACE"},
                {"body": body.body, "event": "DING_BOUNDARY", "declared": body.ding},
            ])
        return {
            "status": "DING",
            "room_count": len(self.bodies),
            "identity_preserved": True,
            "trace": trace,
            "source_sha256": self.source_sha256,
        }


class KadingFrontend:
    REQUIRED = ("body", "host", "family", "type", "route", "working", "boundary", "ding")

    def parse(self, source: str) -> KadingProgram:
        chunks = [chunk.strip() for chunk in re.split(r"\n\s*\n", source.replace("\r\n", "\n")) if chunk.strip()]
        bodies: list[KadingBody] = []
        for chunk in chunks:
            fields: dict[str, str] = {}
            for line in chunk.splitlines():
                if ":" not in line:
                    raise NativeSourceError(f"Kading line lacks field separator: {line}")
                key, value = line.split(":", 1)
                fields[key.strip()] = value.strip()
            missing = [key for key in self.REQUIRED if key not in fields]
            if missing:
                raise NativeSourceError(f"Kading body missing fields {missing}: {fields.get('body', '?')}")
            route = tuple(part.strip() for part in fields["route"].split("→"))
            bodies.append(KadingBody(
                body=fields["body"], host=fields["host"], family=fields["family"],
                body_type=fields["type"], route=route, working=fields["working"],
                boundary=fields["boundary"], ding=fields["ding"],
            ))
        if not bodies:
            raise NativeSourceError("no Kading bodies")
        program = KadingProgram(tuple(bodies), sha256_text(source))
        program.execute_mounts()
        return program


def receipt_for(path: Path, body: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "JM.NativeCoreReceipt/1.0",
        "body": body,
        "authority": "RECOVERED_EXACT_SOURCE",
        "source": path.name,
        "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "result": payload,
        "final_crown": False,
        "boundary": "Recovered-source frontend/runtime proof; historical-completeness and final Crown32 remain separate.",
    }


def main() -> None:
    root = Path(__file__).resolve().parent
    recovered = root / "recovered"
    cading_path = recovered / "JM_SOURCE_04.cading"
    kading_path = recovered / "01_KADING_SOURCE_MOUNT.kading.txt"
    cading_source = cading_path.read_text(encoding="utf-8")
    kading_source = kading_path.read_text(encoding="utf-8")

    cading = CadingFrontend().parse(cading_source)
    kading = KadingFrontend().parse(kading_source)
    receipts = {
        "cading": receipt_for(cading_path, "Cading / Theomidul / zeze.nwona", {
            "ast_sections": len(cading.sections),
            "ir": cading.to_ir(),
            "runtime": cading.execute(),
        }),
        "kading": receipt_for(kading_path, "Kading", {
            "ast_rooms": len(kading.bodies),
            "ir": kading.to_ir(),
            "runtime": kading.execute_mounts(),
        }),
    }
    print(json.dumps(receipts, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
