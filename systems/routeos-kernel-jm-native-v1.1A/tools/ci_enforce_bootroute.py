#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re
import subprocess
import sys

trace = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
assembly = Path(sys.argv[2]).read_text(encoding="utf-8")
elf = Path(sys.argv[3])
sha = "b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638"
marker = f"[JM] BOOTROUTE GENERATED v1.1A SOURCE {sha} ACTIVE"

for inherited in (
    "[JM] IGNITIONBODY GENERATED v0.7A",
    "[JM] MEMORYBODY GENERATED v0.5A",
    "[JM] DESCRIPTORBODY GENERATED v0.8A",
    "[JM] BODYREGISTRY GENERATED v0.9A",
    "[JM] USERBOUNDARY GENERATED v0.9A",
    "[JM] INTERRUPTROUTE GENERATED v0.8A",
    "[JM] ROUTESCHEDULER GENERATED v0.4A",
    "[JM] PERMISSIONGATE GENERATED v0.3A",
    "[JM] FAULTHOLD GENERATED v0.6A",
    "[JM] RECOVERYBODY GENERATED v0.6A",
    "[JM] FRAMECARRIER GENERATED v1.0A",
    "[JM] INTERRUPTENTRY GENERATED v1.0A",
    "[JM] FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT",
    "[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES",
):
    if inherited not in trace:
        raise SystemExit(f"HOLD: inherited machine route missing: {inherited}")

if assembly.count("GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER v1.1A") != 1:
    raise SystemExit("HOLD: generated boot head is not singular")
if assembly.count("GENERATED BOOT ROUTE STORAGE v1.1A") != 1:
    raise SystemExit("HOLD: generated boot storage is not singular")
if "RouteOS x86-64 Multiboot2 entry and controlled-entry stubs" in assembly:
    raise SystemExit("HOLD: handwritten boot route remains")
for symbol in ("_start", "long_mode_entry", "routeos_load_gdt", "routeos_load_tr", "routeos_reload_cr3", "boot_gdt", "boot_pml4"):
    count = len(re.findall(rf"^{re.escape(symbol)}:(?:\s|$)", assembly, re.M))
    if count != 1:
        raise SystemExit(f"HOLD: assembly symbol count wrong for {symbol}: {count}")

symbols = subprocess.check_output(["nm", "-n", str(elf)], text=True)
for symbol in ("_start", "long_mode_entry", "routeos_load_gdt", "routeos_load_tr", "routeos_reload_cr3", "boot_pml4", "boot_pdpt", "boot_pd", "boot_pts", "jm_generated_bootroute_source"):
    if not re.search(rf"\b{re.escape(symbol)}$", symbols, re.M):
        raise SystemExit(f"HOLD: generated ELF symbol missing: {symbol}")

strings = subprocess.check_output(["strings", str(elf)], text=True)
if strings.count(marker) != 1:
    raise SystemExit(f"HOLD: generated source marker count is {strings.count(marker)}, expected 1")

sections = subprocess.check_output(["readelf", "-S", str(elf)], text=True)
if ".multiboot" not in sections:
    raise SystemExit("HOLD: generated Multiboot2 section missing")

start_dis = subprocess.check_output(["objdump", "-d", "--disassemble=_start", str(elf)], text=True)
for opcode in ("mov", "rep stos", "rdmsr", "wrmsr", "lgdt"):
    if opcode not in start_dis:
        raise SystemExit(f"HOLD: generated _start transition opcode missing: {opcode}")
for control in ("%cr4", "%cr3", "%cr0"):
    if control not in start_dis:
        raise SystemExit(f"HOLD: generated _start control-register route missing: {control}")

long_dis = subprocess.check_output(["objdump", "-d", "--disassemble=long_mode_entry", str(elf)], text=True)
if "routeos_kernel_entry" not in long_dis:
    raise SystemExit("HOLD: generated long-mode route does not call routeos_kernel_entry")

gdt_dis = subprocess.check_output(["objdump", "-d", "--disassemble=routeos_load_gdt", str(elf)], text=True)
if "lgdt" not in gdt_dis or "lretq" not in gdt_dis:
    raise SystemExit("HOLD: generated GDT loader contract missing")
tr_dis = subprocess.check_output(["objdump", "-d", "--disassemble=routeos_load_tr", str(elf)], text=True)
if "ltr" not in tr_dis:
    raise SystemExit("HOLD: generated TR loader contract missing")
cr3_dis = subprocess.check_output(["objdump", "-d", "--disassemble=routeos_reload_cr3", str(elf)], text=True)
if cr3_dis.count("%cr3") < 2:
    raise SystemExit("HOLD: generated CR3 reload contract missing")

print("JM_GENERATED_BOOTCARRIER_LONGMODEROUTE_TRACE PASS")
print("GENERATED_MULTIBOOT_PAGEROUTE_CONTRACT PASS")
print("GENERATED_LONGMODE_PRIVILEGELOAD_CONTRACT PASS")
