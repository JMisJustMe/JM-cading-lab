#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

REQUIRED_GATES = {"FAULTHOLD", "TIMER", "PERMISSIONGATE"}

def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    rows = []
    for no, line in enumerate(raw.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        rows.append((no, line.split()))
    data: dict = {"gdt_entries": {}, "idt_gates": [], "offices": []}
    singles = {
        "VERSION", "PROOF_PARENT", "MACHINE_PARENT", "GDT_ENTRIES", "TSS_SELECTOR",
        "TSS_ACCESS", "INTERRUPT_STACK_BYTES", "IDT_SIZE", "PIC_MASTER_COMMAND",
        "PIC_MASTER_DATA", "PIC_SLAVE_COMMAND", "PIC_SLAVE_DATA", "PIC_MASTER_OFFSET",
        "PIC_SLAVE_OFFSET", "PIT_COMMAND", "PIT_CHANNEL0", "PIT_MODE", "PIT_BASE_HZ",
        "PIT_TARGET_HZ",
    }
    for no, parts in rows:
        key = parts[0]
        if key == "OFFICE":
            if len(parts) != 2: raise ValueError(f"line {no}: OFFICE expects one value")
            data["offices"].append(parts[1]); continue
        if key == "GDT_ENTRY":
            if len(parts) != 3: raise ValueError(f"line {no}: GDT_ENTRY expects index value")
            idx = int(parts[1], 0)
            if idx in data["gdt_entries"]: raise ValueError(f"line {no}: duplicate GDT entry")
            data["gdt_entries"][idx] = int(parts[2], 0); continue
        if key == "IDT_GATE":
            if len(parts) != 5: raise ValueError(f"line {no}: IDT_GATE expects name vector handler attr")
            data["idt_gates"].append({"name": parts[1], "vector": parts[2], "handler": parts[3], "attr": int(parts[4], 0)}); continue
        if key in singles:
            if len(parts) != 2: raise ValueError(f"line {no}: {key} expects one value")
            if key in data: raise ValueError(f"line {no}: duplicate {key}")
            data[key] = parts[1]; continue
        raise ValueError(f"line {no}: unknown directive {key}")
    for key in singles:
        if key not in data: raise ValueError(f"missing {key}")
    if data["offices"] != ["DescriptorBody", "InterruptRoute"]:
        raise ValueError("office order must be DescriptorBody then InterruptRoute")
    if int(data["GDT_ENTRIES"], 0) != 7 or set(data["gdt_entries"]) != {1,2,3,4}:
        raise ValueError("v0.8A requires four explicit entries inside seven-entry GDT")
    names = {g["name"] for g in data["idt_gates"]}
    if names != REQUIRED_GATES or len(data["idt_gates"]) != 3:
        raise ValueError("v0.8A requires FAULTHOLD, TIMER and PERMISSIONGATE gates")
    if int(data["PIT_TARGET_HZ"], 0) <= 0: raise ValueError("PIT target must be positive")
    if not re.fullmatch(r"v\d+\.\d+[A-Z]", data["VERSION"]): raise ValueError("invalid version")
    data["source_sha256"] = hashlib.sha256(raw.encode()).hexdigest()
    return data

def cnum(v: str) -> str:
    return hex(int(v, 0)).upper().replace("X", "x")

def render(d: dict) -> str:
    gdt_count = int(d["GDT_ENTRIES"], 0)
    stack = int(d["INTERRUPT_STACK_BYTES"], 0)
    idt_size = int(d["IDT_SIZE"], 0)
    divisor = int(d["PIT_BASE_HZ"], 0) // int(d["PIT_TARGET_HZ"], 0)
    gates = {g["name"]: g for g in d["idt_gates"]}
    lines = [
        "/* GENERATED OPERATIONAL OFFICES. EDIT source/descriptor_interrupt.jmroute, NOT THIS FILE. */",
        f'#define JM_DESCRIPTORINTERRUPT_VERSION "{d["VERSION"]}"',
        f'#define JM_DESCRIPTORINTERRUPT_SOURCE_SHA256 "{d["source_sha256"]}"',
        f'#define JM_DESCRIPTORINTERRUPT_PROOF_PARENT "{d["PROOF_PARENT"]}"',
        f'#define JM_DESCRIPTORINTERRUPT_MACHINE_PARENT "{d["MACHINE_PARENT"]}"',
        f"#define JM_DESCRIPTORBODY_GDT_ENTRIES {gdt_count}",
        f"#define JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES {stack}",
        f"#define JM_DESCRIPTORBODY_IDT_SIZE {idt_size}",
        f"#define JM_DESCRIPTORBODY_TSS_SELECTOR {cnum(d['TSS_SELECTOR'])}",
        f"#define JM_DESCRIPTORBODY_TSS_ACCESS {cnum(d['TSS_ACCESS'])}",
        f"#define JM_INTERRUPTROUTE_PIT_DIVISOR {divisor}",
        "",
        '_Static_assert(JM_DESCRIPTORBODY_IDT_SIZE == IDT_SIZE, "generated IDT size mismatch");',
        '_Static_assert(JM_DESCRIPTORBODY_TSS_SELECTOR == TSS_SELECTOR, "generated TSS selector mismatch");',
        "",
        "struct __attribute__((packed)) gdtr { uint16_t limit; uint64_t base; };",
        "struct __attribute__((packed)) tss64 {",
        "  uint32_t reserved0; uint64_t rsp0, rsp1, rsp2; uint64_t reserved1;",
        "  uint64_t ist1, ist2, ist3, ist4, ist5, ist6, ist7; uint64_t reserved2;",
        "  uint16_t reserved3; uint16_t iomap_base;",
        "};",
        "static uint64_t gdt[JM_DESCRIPTORBODY_GDT_ENTRIES] __attribute__((aligned(16)));",
        "static struct tss64 tss;",
        "static uint8_t interrupt_stack[JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES] __attribute__((aligned(16)));",
        "",
        "struct __attribute__((packed)) idt_entry {",
        "  uint16_t offset_low; uint16_t selector; uint8_t ist; uint8_t type_attr;",
        "  uint16_t offset_mid; uint32_t offset_high; uint32_t zero;",
        "};",
        "struct __attribute__((packed)) idtr { uint16_t limit; uint64_t base; };",
        "static struct idt_entry idt[JM_DESCRIPTORBODY_IDT_SIZE] __attribute__((aligned(16)));",
        "",
        "static void jm_descriptorbody_announce(void) {",
        "  static bool announced;",
        "  if (!announced) {",
        '    serial_write("[JM] DESCRIPTORBODY GENERATED "); serial_write(JM_DESCRIPTORINTERRUPT_VERSION);',
        '    serial_write(" SOURCE "); serial_write(JM_DESCRIPTORINTERRUPT_SOURCE_SHA256); serial_write(" ACTIVE\\n");',
        "    announced = true;",
        "  }",
        "}",
        "",
        "static void gdt_install(void) {",
        "  jm_descriptorbody_announce();",
        "  jm_memset(gdt, 0, sizeof(gdt));",
    ]
    for idx in range(1,5):
        lines.append(f"  gdt[{idx}] = 0x{d['gdt_entries'][idx]:016X}ULL;")
    lines += [
        "  jm_memset(&tss, 0, sizeof(tss));",
        "  tss.rsp0 = (uint64_t)(interrupt_stack + sizeof(interrupt_stack));",
        "  tss.iomap_base = sizeof(tss);",
        "  uint64_t base = (uint64_t)&tss; uint64_t limit = sizeof(tss) - 1; uint64_t low = 0;",
        "  low |= (limit & 0xFFFFULL); low |= (base & 0xFFFFFFULL) << 16;",
        "  low |= ((uint64_t)JM_DESCRIPTORBODY_TSS_ACCESS) << 40;",
        "  low |= ((limit >> 16) & 0xFULL) << 48; low |= ((base >> 24) & 0xFFULL) << 56;",
        "  gdt[5] = low; gdt[6] = base >> 32;",
        "  struct gdtr ptr = { .limit = sizeof(gdt) - 1, .base = (uint64_t)gdt };",
        "  routeos_load_gdt(&ptr); routeos_load_tr(JM_DESCRIPTORBODY_TSS_SELECTOR);",
        "}",
        "",
        "static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {",
        "  uint64_t p = (uint64_t)handler;",
        "  idt[vector].offset_low = (uint16_t)p; idt[vector].selector = 0x08; idt[vector].ist = 0;",
        "  idt[vector].type_attr = attr; idt[vector].offset_mid = (uint16_t)(p >> 16);",
        "  idt[vector].offset_high = (uint32_t)(p >> 32); idt[vector].zero = 0;",
        "}",
        "static void idt_install(void) {",
        "  jm_descriptorbody_announce(); jm_memset(idt, 0, sizeof(idt));",
    ]
    for name in ("FAULTHOLD","TIMER","PERMISSIONGATE"):
        g = gates[name]
        lines.append(f"  idt_set({g['vector']}, {g['handler']}, 0x{g['attr']:02X});")
    lines += [
        "  struct idtr ptr = { .limit = sizeof(idt) - 1, .base = (uint64_t)idt };",
        '  __asm__ volatile("lidt %0" : : "m"(ptr));',
        "}",
        "",
        "static void jm_interruptroute_announce(void) {",
        "  static bool announced;",
        "  if (!announced) {",
        '    serial_write("[JM] INTERRUPTROUTE GENERATED "); serial_write(JM_DESCRIPTORINTERRUPT_VERSION);',
        '    serial_write(" SOURCE "); serial_write(JM_DESCRIPTORINTERRUPT_SOURCE_SHA256); serial_write(" ACTIVE\\n");',
        "    announced = true;",
        "  }",
        "}",
        "static void pic_pit_install(void) {",
        "  jm_interruptroute_announce();",
        f"  uint8_t a1 = inb({cnum(d['PIC_MASTER_DATA'])}), a2 = inb({cnum(d['PIC_SLAVE_DATA'])});",
        f"  outb({cnum(d['PIC_MASTER_COMMAND'])}, 0x11); io_wait(); outb({cnum(d['PIC_SLAVE_COMMAND'])}, 0x11); io_wait();",
        f"  outb({cnum(d['PIC_MASTER_DATA'])}, {cnum(d['PIC_MASTER_OFFSET'])}); io_wait(); outb({cnum(d['PIC_SLAVE_DATA'])}, {cnum(d['PIC_SLAVE_OFFSET'])}); io_wait();",
        f"  outb({cnum(d['PIC_MASTER_DATA'])}, 0x04); io_wait(); outb({cnum(d['PIC_SLAVE_DATA'])}, 0x02); io_wait();",
        f"  outb({cnum(d['PIC_MASTER_DATA'])}, 0x01); io_wait(); outb({cnum(d['PIC_SLAVE_DATA'])}, 0x01); io_wait();",
        f"  outb({cnum(d['PIC_MASTER_DATA'])}, (uint8_t)(a1 & ~1U)); outb({cnum(d['PIC_SLAVE_DATA'])}, a2);",
        f"  outb({cnum(d['PIT_COMMAND'])}, {cnum(d['PIT_MODE'])});",
        f"  outb({cnum(d['PIT_CHANNEL0'])}, JM_INTERRUPTROUTE_PIT_DIVISOR & 0xFF);",
        f"  outb({cnum(d['PIT_CHANNEL0'])}, JM_INTERRUPTROUTE_PIT_DIVISOR >> 8);",
        "}",
        "",
    ]
    return "\n".join(lines)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path); ap.add_argument("--out-dir", type=Path, required=True); ap.add_argument("--check", action="store_true")
    a = ap.parse_args(); d = parse(a.source); out = a.out_dir; out.mkdir(parents=True, exist_ok=True)
    inc = render(d); meta = json.dumps(d, indent=2, sort_keys=True) + "\n"
    targets = {out/"descriptor_interrupt_office.inc": inc, out/"descriptor_interrupt_office.json": meta}
    if a.check:
        bad = [str(p) for p,c in targets.items() if not p.exists() or p.read_text(encoding="utf-8") != c]
        if bad: raise SystemExit("stale generated outputs: " + ", ".join(bad))
    else:
        for p,c in targets.items(): p.write_text(c, encoding="utf-8")
    return 0
if __name__ == "__main__": raise SystemExit(main())
