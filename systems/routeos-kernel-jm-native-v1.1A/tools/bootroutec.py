#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
import sys

EXPECTED_OFFICES = ["BootCarrier", "PageRoute", "LongModeRoute", "PrivilegeLoader"]

@dataclass(frozen=True)
class Spec:
    version: str
    proof_parent: str
    machine_parent: str
    offices: tuple[str, ...]
    multiboot_magic: int
    multiboot_arch: int
    page_size: int
    page_table_storage_pages: int
    page_table_count: int
    page_table_entries: int
    boot_stack_bytes: int
    pml4_flags: int
    pdpt_flags: int
    pde_flags: int
    pte_flags: int
    cr4_pae_bit: int
    efer_msr: int
    efer_lme_bit: int
    cr0_paging_bit: int
    boot_code_selector: int
    boot_data_selector: int
    kernel_entry: str
    gdt_load_symbol: str
    tr_load_symbol: str
    cr3_reload_symbol: str


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse(path: Path) -> Spec:
    values: dict[str, str] = {}
    offices: list[str] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        key = parts[0]
        if key == "OFFICE":
            if len(parts) != 2:
                raise ValueError(f"line {line_no}: OFFICE expects one value")
            offices.append(parts[1])
            continue
        if len(parts) != 2:
            raise ValueError(f"line {line_no}: {key} expects one value")
        if key in values:
            raise ValueError(f"line {line_no}: duplicate {key}")
        values[key] = parts[1]

    required = {
        "VERSION", "PROOF_PARENT", "MACHINE_PARENT", "MULTIBOOT_MAGIC",
        "MULTIBOOT_ARCH", "PAGE_SIZE", "PAGE_TABLE_STORAGE_PAGES",
        "PAGE_TABLE_COUNT", "PAGE_TABLE_ENTRIES", "BOOT_STACK_BYTES",
        "PML4_FLAGS", "PDPT_FLAGS", "PDE_FLAGS", "PTE_FLAGS",
        "CR4_PAE_BIT", "EFER_MSR", "EFER_LME_BIT", "CR0_PAGING_BIT",
        "BOOT_CODE_SELECTOR", "BOOT_DATA_SELECTOR", "KERNEL_ENTRY",
        "GDT_LOAD_SYMBOL", "TR_LOAD_SYMBOL", "CR3_RELOAD_SYMBOL",
    }
    missing = sorted(required - values.keys())
    if missing:
        raise ValueError(f"missing keys: {', '.join(missing)}")
    if offices != EXPECTED_OFFICES:
        raise ValueError(f"office order mismatch: {offices}")

    ints = {key: int(values[key], 0) for key in required if key not in {
        "VERSION", "PROOF_PARENT", "MACHINE_PARENT", "KERNEL_ENTRY",
        "GDT_LOAD_SYMBOL", "TR_LOAD_SYMBOL", "CR3_RELOAD_SYMBOL",
    }}
    if ints["PAGE_SIZE"] != 4096:
        raise ValueError("x86-64 leaf page size must remain 4096")
    if ints["PAGE_TABLE_STORAGE_PAGES"] != 35:
        raise ValueError("boot page-table storage contract must remain 35 pages")
    if ints["PAGE_TABLE_COUNT"] != 32 or ints["PAGE_TABLE_ENTRIES"] != 16384:
        raise ValueError("identity-map contract must remain 32 PT pages / 16384 leaves")
    if ints["PAGE_TABLE_ENTRIES"] != ints["PAGE_TABLE_COUNT"] * 512:
        raise ValueError("leaf entry count must equal PAGE_TABLE_COUNT * 512")
    if ints["BOOT_STACK_BYTES"] != 32768:
        raise ValueError("boot stack contract must remain 32768 bytes")
    if ints["BOOT_CODE_SELECTOR"] != 0x08 or ints["BOOT_DATA_SELECTOR"] != 0x10:
        raise ValueError("boot selector contract must remain 0x08/0x10")
    for key in ("PML4_FLAGS", "PDPT_FLAGS", "PDE_FLAGS", "PTE_FLAGS"):
        if ints[key] != 0x3:
            raise ValueError(f"{key} must preserve present+writable flags 0x3")
    if ints["CR4_PAE_BIT"] != 5 or ints["EFER_LME_BIT"] != 8 or ints["CR0_PAGING_BIT"] != 31:
        raise ValueError("processor transition bits do not match the frozen x86-64 route")

    return Spec(
        version=values["VERSION"], proof_parent=values["PROOF_PARENT"],
        machine_parent=values["MACHINE_PARENT"], offices=tuple(offices),
        multiboot_magic=ints["MULTIBOOT_MAGIC"], multiboot_arch=ints["MULTIBOOT_ARCH"],
        page_size=ints["PAGE_SIZE"], page_table_storage_pages=ints["PAGE_TABLE_STORAGE_PAGES"],
        page_table_count=ints["PAGE_TABLE_COUNT"], page_table_entries=ints["PAGE_TABLE_ENTRIES"],
        boot_stack_bytes=ints["BOOT_STACK_BYTES"], pml4_flags=ints["PML4_FLAGS"],
        pdpt_flags=ints["PDPT_FLAGS"], pde_flags=ints["PDE_FLAGS"], pte_flags=ints["PTE_FLAGS"],
        cr4_pae_bit=ints["CR4_PAE_BIT"], efer_msr=ints["EFER_MSR"],
        efer_lme_bit=ints["EFER_LME_BIT"], cr0_paging_bit=ints["CR0_PAGING_BIT"],
        boot_code_selector=ints["BOOT_CODE_SELECTOR"], boot_data_selector=ints["BOOT_DATA_SELECTOR"],
        kernel_entry=values["KERNEL_ENTRY"], gdt_load_symbol=values["GDT_LOAD_SYMBOL"],
        tr_load_symbol=values["TR_LOAD_SYMBOL"], cr3_reload_symbol=values["CR3_RELOAD_SYMBOL"],
    )


def generate_head(spec: Spec, source_hash: str) -> str:
    clear_dwords = spec.page_size * spec.page_table_storage_pages // 4
    mapped_bytes = spec.page_table_entries * spec.page_size
    return f'''/* GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER {spec.version} SOURCE {source_hash}. */
/* Proof parent: {spec.proof_parent}; machine parent: {spec.machine_parent}. */
.set MB2_MAGIC, {spec.multiboot_magic:#x}
.set MB2_ARCH, {spec.multiboot_arch}
.set MB2_HEADER_LEN, mb2_header_end - mb2_header
.set MB2_CHECKSUM, -(MB2_MAGIC + MB2_ARCH + MB2_HEADER_LEN)
.set JM_BOOT_PAGE_SIZE, {spec.page_size}
.set JM_BOOT_PT_COUNT, {spec.page_table_count}
.set JM_BOOT_LEAF_COUNT, {spec.page_table_entries}
.set JM_BOOT_MAPPED_BYTES, {mapped_bytes}

.section .multiboot,"a"
.align 8
mb2_header:
  .long MB2_MAGIC
  .long MB2_ARCH
  .long MB2_HEADER_LEN
  .long MB2_CHECKSUM
  .short 0
  .short 0
  .long 8
mb2_header_end:

.section .text
.code32
.global _start
.type _start,@function
_start:
  cli
  movl %eax, boot_magic
  movl %ebx, boot_info
  movl $boot_stack_top, %esp

  /* PageRoute: clear exactly {spec.page_table_storage_pages} page-table pages. */
  movl $boot_pml4, %edi
  xorl %eax, %eax
  movl ${clear_dwords}, %ecx
  rep stosl

  /* PageRoute: PML4[0] -> PDPT, PDPT[0] -> PD. */
  movl $(boot_pdpt + {spec.pml4_flags:#x}), boot_pml4
  movl $(boot_pd + {spec.pdpt_flags:#x}), boot_pdpt

  /* PageRoute: {spec.page_table_count} PT pages identity-map {mapped_bytes // (1024 * 1024)} MiB. */
  xorl %ecx, %ecx
1:
  movl %ecx, %eax
  shll $12, %eax
  addl $boot_pts, %eax
  orl ${spec.pde_flags:#x}, %eax
  movl %eax, boot_pd(,%ecx,8)
  incl %ecx
  cmpl ${spec.page_table_count}, %ecx
  jne 1b

  xorl %ecx, %ecx
2:
  movl %ecx, %eax
  shll $12, %eax
  orl ${spec.pte_flags:#x}, %eax
  movl %eax, boot_pts(,%ecx,8)
  incl %ecx
  cmpl ${spec.page_table_entries}, %ecx
  jne 2b

  /* LongModeRoute: PAE -> EFER.LME -> CR3 -> CR0.PG. */
  movl %cr4, %eax
  orl $(1 << {spec.cr4_pae_bit}), %eax
  movl %eax, %cr4

  movl ${spec.efer_msr:#x}, %ecx
  rdmsr
  orl $(1 << {spec.efer_lme_bit}), %eax
  wrmsr

  movl $boot_pml4, %eax
  movl %eax, %cr3

  movl %cr0, %eax
  orl $(1 << {spec.cr0_paging_bit}), %eax
  movl %eax, %cr0

  lgdt boot_gdt_ptr
  ljmp ${spec.boot_code_selector:#x}, $long_mode_entry

.code64
.type long_mode_entry,@function
long_mode_entry:
  movw ${spec.boot_data_selector:#x}, %ax
  movw %ax, %ds
  movw %ax, %es
  movw %ax, %ss
  xorw %ax, %ax
  movw %ax, %fs
  movw %ax, %gs
  movq $boot_stack_top, %rsp
  xorq %rbp, %rbp
  movl boot_magic(%rip), %edi
  movl boot_info(%rip), %esi
  call {spec.kernel_entry}
3:
  cli
  hlt
  jmp 3b

/* PrivilegeLoader: live descriptor/task/page-root helper carriers. */
.global {spec.gdt_load_symbol}
.type {spec.gdt_load_symbol},@function
{spec.gdt_load_symbol}:
  lgdt (%rdi)
  movw ${spec.boot_data_selector:#x}, %ax
  movw %ax, %ds
  movw %ax, %es
  movw %ax, %ss
  pushq ${spec.boot_code_selector:#x}
  leaq 4f(%rip), %rax
  pushq %rax
  lretq
4:
  ret

.global {spec.tr_load_symbol}
.type {spec.tr_load_symbol},@function
{spec.tr_load_symbol}:
  movw %di, %ax
  ltr %ax
  ret

.global {spec.cr3_reload_symbol}
.type {spec.cr3_reload_symbol},@function
{spec.cr3_reload_symbol}:
  movq %cr3, %rax
  movq %rax, %cr3
  ret

.section .rodata
.align 8
.global jm_generated_bootroute_source
jm_generated_bootroute_source:
  .asciz "[JM] BOOTROUTE GENERATED {spec.version} SOURCE {source_hash} ACTIVE"

.section .text
/* END GENERATED BOOT ROUTE HEAD. */
'''


def generate_tail(spec: Spec, source_hash: str) -> str:
    return f'''/* GENERATED BOOT ROUTE STORAGE {spec.version} SOURCE {source_hash}. */
.section .rodata
.align 8
boot_gdt:
  .quad 0x0000000000000000
  .quad 0x00AF9A000000FFFF
  .quad 0x00AF92000000FFFF
boot_gdt_end:
boot_gdt_ptr:
  .word boot_gdt_end - boot_gdt - 1
  .quad boot_gdt

.section .bss
.align 16
boot_magic: .skip 4
boot_info:  .skip 4
.align {spec.page_size}
.global boot_pml4
boot_pml4: .skip {spec.page_size}
.global boot_pdpt
boot_pdpt: .skip {spec.page_size}
.global boot_pd
boot_pd: .skip {spec.page_size}
.global boot_pts
boot_pts: .skip ({spec.page_size} * {spec.page_table_count})
.align 16
boot_stack: .skip {spec.boot_stack_bytes}
boot_stack_top:
/* END GENERATED BOOT ROUTE STORAGE. */
'''


def generate_record(spec: Spec, source_hash: str, head: str, tail: str) -> str:
    record = {
        "version": spec.version,
        "proof_parent": spec.proof_parent,
        "machine_parent": spec.machine_parent,
        "offices": list(spec.offices),
        "source_sha256": source_hash,
        "head_sha256": sha256_bytes(head.encode()),
        "tail_sha256": sha256_bytes(tail.encode()),
        "multiboot_magic": spec.multiboot_magic,
        "identity_map_bytes": spec.page_table_entries * spec.page_size,
        "page_table_storage_bytes": spec.page_table_storage_pages * spec.page_size,
        "page_table_count": spec.page_table_count,
        "leaf_entries": spec.page_table_entries,
        "boot_stack_bytes": spec.boot_stack_bytes,
        "selectors": {"code": spec.boot_code_selector, "data": spec.boot_data_selector},
        "processor_route": ["CR4.PAE", "EFER.LME", "CR3", "CR0.PG", "LGDT", "far-jump", "code64"],
        "symbols": ["_start", "long_mode_entry", spec.gdt_load_symbol, spec.tr_load_symbol, spec.cr3_reload_symbol],
        "elf_marker": f"[JM] BOOTROUTE GENERATED {spec.version} SOURCE {source_hash} ACTIVE",
    }
    return json.dumps(record, indent=2, sort_keys=True) + "\n"


def write_or_check(path: Path, content: str, check: bool) -> None:
    if check:
        if not path.exists():
            raise SystemExit(f"HOLD: missing generated output: {path}")
        if path.read_text(encoding="utf-8") != content:
            raise SystemExit(f"HOLD: stale generated output: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    source_hash = sha256_bytes(args.source.read_bytes())
    spec = parse(args.source)
    head = generate_head(spec, source_hash)
    tail = generate_tail(spec, source_hash)
    record = generate_record(spec, source_hash, head, tail)
    write_or_check(args.out_dir / "bootcarrier_longmoderoute_head.S", head, args.check)
    write_or_check(args.out_dir / "bootcarrier_longmoderoute_tail.S", tail, args.check)
    write_or_check(args.out_dir / "bootcarrier_longmoderoute.json", record, args.check)
    if not args.check:
        print(source_hash)
        print(sha256_bytes(head.encode()))
        print(sha256_bytes(tail.encode()))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as exc:
        print(f"HOLD: {exc}", file=sys.stderr)
        raise SystemExit(2)
