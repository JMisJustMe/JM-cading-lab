#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

trace, kernel, elf, receipt = map(Path, sys.argv[1:5])
source = "50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14"
text = trace.read_text(errors="replace")
code = kernel.read_text()
record = json.loads(receipt.read_text())

markers = [
    f"[JM] DESCRIPTORINSTALL GENERATED v1.4A SOURCE {source} ACTIVE",
    f"[JM] VECTORROUTE GENERATED v1.4A SOURCE {source} ACTIVE",
    f"[JM] INTERRUPTCONTROLLER GENERATED v1.4A SOURCE {source} ACTIVE",
    f"[JM] USERMAPROUTE GENERATED v1.4A SOURCE {source} ACTIVE",
    f"[JM] BODYFRAMEINSTALL GENERATED v1.4A SOURCE {source} ACTIVE",
]
for marker in markers:
    assert text.count(marker) == 1, (marker, text.count(marker))

assert text.count("[JM] SERIALROUTE GENERATED v1.3A") == 1
assert text.count("[JM] FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT") == 1
assert text.count("[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES") == 1
fault = text.index("INVALID OPCODE CAUGHT")
assert text.find("[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ", fault) > fault

for signature, count in record["handwritten_residue"].items():
    assert count == 0, (signature, count)
assert len(record["removed_handwritten_sha256"]) == 4
assert all(count == 1 for count in record["generated_marker_counts"].values())

for residue in [
    "static void gdt_install(void) {",
    "static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {",
    "static void idt_install(void) {",
    "static void pic_pit_install(void) {",
    "static void mark_user_page(uint64_t address) {",
    "static void user_boundary_install(void) {",
]:
    assert residue not in code, residue

nm = subprocess.check_output(["nm", "-n", str(elf)], text=True)
for symbol in [
    "jm_generated_descriptorinstall",
    "jm_generated_vectorroute_set",
    "jm_generated_vectorroute_install",
    "jm_generated_interruptcontroller_install",
    "jm_generated_usermaproute_mark",
    "jm_generated_usermaproute_install",
    "jm_generated_bodyframeinstall",
    "jm_generated_protectionroute_user_install",
    "jm_generated_descriptorinstall_source",
    "jm_generated_vectorroute_source",
    "jm_generated_interruptcontroller_source",
    "jm_generated_usermaproute_source",
    "jm_generated_bodyframeinstall_source",
]:
    assert symbol in nm, symbol

strings = subprocess.check_output(["strings", str(elf)], text=True)
assert source in strings
for marker in markers:
    assert marker in strings, marker

print("JM_GENERATED_PROTECTIONROUTE DING: PASS")
