#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

VERSION = "v1.4A"
PARENT = "e6f037ac3f3d42c4b56218307b5f738f0c6a4b70"
OFFICES = [
    "DescriptorInstall",
    "VectorRoute",
    "InterruptController",
    "UserMapRoute",
    "BodyFrameInstall",
]
EXPECTED = {
    "VERSION": VERSION,
    "PROOF_PARENT": PARENT,
    "MACHINE_PARENT": PARENT,
    "GDT_ENTRIES": "7",
    "INTERRUPT_STACK_BYTES": "32768",
    "TSS_SELECTOR": "0x28",
    "TSS_ACCESS": "0x89",
    "KERNEL_CODE_DESCRIPTOR": "0x00AF9A000000FFFF",
    "KERNEL_DATA_DESCRIPTOR": "0x00AF92000000FFFF",
    "USER_DATA_DESCRIPTOR": "0x00AFF2000000FFFF",
    "USER_CODE_DESCRIPTOR": "0x00AFFA000000FFFF",
    "KERNEL_CODE_SELECTOR": "0x08",
    "IDT_SIZE": "256",
    "IDT_FAULT_VECTOR": "6",
    "IDT_TIMER_VECTOR": "32",
    "IDT_SYSCALL_VECTOR": "0x80",
    "IDT_KERNEL_ATTR": "0x8E",
    "IDT_USER_ATTR": "0xEE",
    "PIC_MASTER_COMMAND": "0x20",
    "PIC_MASTER_DATA": "0x21",
    "PIC_SLAVE_COMMAND": "0xA0",
    "PIC_SLAVE_DATA": "0xA1",
    "PIC_INIT_COMMAND": "0x11",
    "PIC_MASTER_OFFSET": "0x20",
    "PIC_SLAVE_OFFSET": "0x28",
    "PIC_MASTER_CASCADE": "0x04",
    "PIC_SLAVE_CASCADE": "0x02",
    "PIC_8086_MODE": "0x01",
    "PIC_TIMER_MASK_BIT": "0x01",
    "PIT_COMMAND_PORT": "0x43",
    "PIT_CHANNEL0_PORT": "0x40",
    "PIT_MODE": "0x36",
    "PIT_DIVISOR": "11931",
    "PAGE_USER_FLAG": "0x4",
    "PAGE_SIZE": "4096",
    "USER1_CODE": "0x02000000",
    "USER1_STACK_PAGE": "0x02001000",
    "USER1_STACK_TOP": "0x02002000",
    "USER2_CODE": "0x02004000",
    "USER2_STACK_PAGE": "0x02005000",
    "USER2_STACK_TOP": "0x02006000",
    "USER_DATA_SELECTOR": "0x1B",
    "USER_CODE_SELECTOR": "0x23",
    "USER_RFLAGS": "0x202",
    "BODY_COUNT": "2",
    "BODY1_ID": "1",
    "BODY2_ID": "2",
    "BODY1_R12": "1",
    "BODY2_R12": "2",
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse(path: Path) -> tuple[dict[str, str], str]:
    values: dict[str, str] = {}
    offices: list[str] = []
    for number, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2:
            raise ValueError(f"line {number}: expected KEY VALUE")
        key, value = parts
        if key == "OFFICE":
            offices.append(value)
            continue
        if key in values:
            raise ValueError(f"line {number}: duplicate {key}")
        values[key] = value
    if offices != OFFICES:
        raise ValueError(f"office order mismatch: {offices}")
    missing = sorted(set(EXPECTED) - set(values))
    extra = sorted(set(values) - set(EXPECTED))
    if missing or extra:
        raise ValueError(f"key mismatch missing={missing} extra={extra}")
    for key, wanted in EXPECTED.items():
        if values[key] != wanted:
            raise ValueError(f"{key} must remain {wanted}")
    return values, sha(path.read_bytes())


def descriptor(source_hash: str) -> str:
    return f'''/* GENERATED DESCRIPTORINSTALL v1.4A SOURCE {source_hash}. */
#define JM_PROTECTIONROUTE_VERSION "v1.4A"
#define JM_PROTECTIONROUTE_SOURCE_SHA256 "{source_hash}"
#define JM_PROTECTIONROUTE_GDT_ENTRIES 7U
#define JM_PROTECTIONROUTE_INTERRUPT_STACK_BYTES 32768U
#define JM_PROTECTIONROUTE_TSS_SELECTOR 0x28U
#define JM_PROTECTIONROUTE_TSS_ACCESS 0x89U

_Static_assert(JM_DESCRIPTORBODY_GDT_ENTRIES == JM_PROTECTIONROUTE_GDT_ENTRIES, "ProtectionRoute GDT entry drift");
_Static_assert(JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES == JM_PROTECTIONROUTE_INTERRUPT_STACK_BYTES, "ProtectionRoute interrupt stack drift");
_Static_assert(JM_DESCRIPTORBODY_TSS_SELECTOR == JM_PROTECTIONROUTE_TSS_SELECTOR, "ProtectionRoute TSS selector drift");
_Static_assert(JM_DESCRIPTORBODY_TSS_ACCESS == JM_PROTECTIONROUTE_TSS_ACCESS, "ProtectionRoute TSS access drift");

const char jm_generated_descriptorinstall_source[] =
  "[JM] DESCRIPTORINSTALL GENERATED v1.4A SOURCE {source_hash} ACTIVE";

static void jm_generated_descriptorinstall(void) {{
  static bool announced;
  jm_descriptorbody_announce();
  if (!announced) {{
    serial_write(jm_generated_descriptorinstall_source);
    serial_write("\\n");
    announced = true;
  }}
  jm_memset(gdt, 0, sizeof(gdt));
  gdt[1] = 0x00AF9A000000FFFFULL;
  gdt[2] = 0x00AF92000000FFFFULL;
  gdt[3] = 0x00AFF2000000FFFFULL;
  gdt[4] = 0x00AFFA000000FFFFULL;
  jm_memset(&tss, 0, sizeof(tss));
  tss.rsp0 = (uint64_t)(interrupt_stack + sizeof(interrupt_stack));
  tss.iomap_base = sizeof(tss);
  uint64_t base = (uint64_t)&tss;
  uint64_t limit = sizeof(tss) - 1U;
  uint64_t low = 0;
  low |= limit & 0xFFFFULL;
  low |= (base & 0xFFFFFFULL) << 16;
  low |= ((uint64_t)JM_PROTECTIONROUTE_TSS_ACCESS) << 40;
  low |= ((limit >> 16) & 0xFULL) << 48;
  low |= ((base >> 24) & 0xFFULL) << 56;
  gdt[5] = low;
  gdt[6] = base >> 32;
  struct gdtr ptr = {{ .limit = sizeof(gdt) - 1U, .base = (uint64_t)gdt }};
  routeos_load_gdt(&ptr);
  routeos_load_tr(JM_PROTECTIONROUTE_TSS_SELECTOR);
}}

#define gdt_install jm_generated_descriptorinstall
/* END GENERATED DESCRIPTORINSTALL. */
'''


def vector(source_hash: str) -> str:
    return f'''/* GENERATED VECTORROUTE v1.4A SOURCE {source_hash}. */
#define JM_PROTECTIONROUTE_KERNEL_CODE_SELECTOR 0x08U
#define JM_PROTECTIONROUTE_IDT_SIZE 256U
#define JM_PROTECTIONROUTE_FAULT_VECTOR 6U
#define JM_PROTECTIONROUTE_TIMER_VECTOR 32U
#define JM_PROTECTIONROUTE_SYSCALL_VECTOR 0x80U
#define JM_PROTECTIONROUTE_KERNEL_GATE_ATTR 0x8EU
#define JM_PROTECTIONROUTE_USER_GATE_ATTR 0xEEU

_Static_assert(IDT_SIZE == JM_PROTECTIONROUTE_IDT_SIZE, "ProtectionRoute IDT size drift");
_Static_assert(JM_FAULT_FAULTHOLD_VECTOR == JM_PROTECTIONROUTE_FAULT_VECTOR, "ProtectionRoute fault vector drift");
_Static_assert(JM_GATE_PERMISSIONGATE_VECTOR == JM_PROTECTIONROUTE_SYSCALL_VECTOR, "ProtectionRoute syscall vector drift");

const char jm_generated_vectorroute_source[] =
  "[JM] VECTORROUTE GENERATED v1.4A SOURCE {source_hash} ACTIVE";

static void jm_generated_vectorroute_set(uint8_t vector, void (*handler)(void), uint8_t attr) {{
  uint64_t p = (uint64_t)handler;
  idt[vector].offset_low = (uint16_t)p;
  idt[vector].selector = JM_PROTECTIONROUTE_KERNEL_CODE_SELECTOR;
  idt[vector].ist = 0;
  idt[vector].type_attr = attr;
  idt[vector].offset_mid = (uint16_t)(p >> 16);
  idt[vector].offset_high = (uint32_t)(p >> 32);
  idt[vector].zero = 0;
}}

static void jm_generated_vectorroute_install(void) {{
  static bool announced;
  jm_descriptorbody_announce();
  if (!announced) {{
    serial_write(jm_generated_vectorroute_source);
    serial_write("\\n");
    announced = true;
  }}
  jm_memset(idt, 0, sizeof(idt));
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_FAULT_VECTOR, routeos_isr_ud, JM_PROTECTIONROUTE_KERNEL_GATE_ATTR);
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_TIMER_VECTOR, routeos_isr_timer, JM_PROTECTIONROUTE_KERNEL_GATE_ATTR);
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_SYSCALL_VECTOR, routeos_isr_syscall, JM_PROTECTIONROUTE_USER_GATE_ATTR);
  struct idtr ptr = {{ .limit = sizeof(idt) - 1U, .base = (uint64_t)idt }};
  __asm__ volatile("lidt %0" : : "m"(ptr));
}}

#define idt_install jm_generated_vectorroute_install
/* END GENERATED VECTORROUTE. */
'''


def interrupt_controller(source_hash: str) -> str:
    return f'''/* GENERATED INTERRUPTCONTROLLER v1.4A SOURCE {source_hash}. */
#define JM_PROTECTIONROUTE_PIC_MASTER_COMMAND 0x20U
#define JM_PROTECTIONROUTE_PIC_MASTER_DATA 0x21U
#define JM_PROTECTIONROUTE_PIC_SLAVE_COMMAND 0xA0U
#define JM_PROTECTIONROUTE_PIC_SLAVE_DATA 0xA1U
#define JM_PROTECTIONROUTE_PIC_INIT_COMMAND 0x11U
#define JM_PROTECTIONROUTE_PIC_MASTER_OFFSET 0x20U
#define JM_PROTECTIONROUTE_PIC_SLAVE_OFFSET 0x28U
#define JM_PROTECTIONROUTE_PIC_MASTER_CASCADE 0x04U
#define JM_PROTECTIONROUTE_PIC_SLAVE_CASCADE 0x02U
#define JM_PROTECTIONROUTE_PIC_8086_MODE 0x01U
#define JM_PROTECTIONROUTE_PIC_TIMER_MASK_BIT 0x01U
#define JM_PROTECTIONROUTE_PIT_COMMAND_PORT 0x43U
#define JM_PROTECTIONROUTE_PIT_CHANNEL0_PORT 0x40U
#define JM_PROTECTIONROUTE_PIT_MODE 0x36U
#define JM_PROTECTIONROUTE_PIT_DIVISOR 11931U

_Static_assert(JM_INTERRUPTROUTE_PIT_DIVISOR == JM_PROTECTIONROUTE_PIT_DIVISOR, "ProtectionRoute PIT divisor drift");

const char jm_generated_interruptcontroller_source[] =
  "[JM] INTERRUPTCONTROLLER GENERATED v1.4A SOURCE {source_hash} ACTIVE";

static void jm_generated_interruptcontroller_install(void) {{
  static bool announced;
  jm_interruptroute_announce();
  if (!announced) {{
    serial_write(jm_generated_interruptcontroller_source);
    serial_write("\\n");
    announced = true;
  }}
  uint8_t master_mask = inb(JM_PROTECTIONROUTE_PIC_MASTER_DATA);
  uint8_t slave_mask = inb(JM_PROTECTIONROUTE_PIC_SLAVE_DATA);
  outb(JM_PROTECTIONROUTE_PIC_MASTER_COMMAND, JM_PROTECTIONROUTE_PIC_INIT_COMMAND); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_SLAVE_COMMAND, JM_PROTECTIONROUTE_PIC_INIT_COMMAND); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_MASTER_DATA, JM_PROTECTIONROUTE_PIC_MASTER_OFFSET); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_SLAVE_DATA, JM_PROTECTIONROUTE_PIC_SLAVE_OFFSET); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_MASTER_DATA, JM_PROTECTIONROUTE_PIC_MASTER_CASCADE); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_SLAVE_DATA, JM_PROTECTIONROUTE_PIC_SLAVE_CASCADE); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_MASTER_DATA, JM_PROTECTIONROUTE_PIC_8086_MODE); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_SLAVE_DATA, JM_PROTECTIONROUTE_PIC_8086_MODE); io_wait();
  outb(JM_PROTECTIONROUTE_PIC_MASTER_DATA, (uint8_t)(master_mask & ~JM_PROTECTIONROUTE_PIC_TIMER_MASK_BIT));
  outb(JM_PROTECTIONROUTE_PIC_SLAVE_DATA, slave_mask);
  outb(JM_PROTECTIONROUTE_PIT_COMMAND_PORT, JM_PROTECTIONROUTE_PIT_MODE);
  outb(JM_PROTECTIONROUTE_PIT_CHANNEL0_PORT, JM_PROTECTIONROUTE_PIT_DIVISOR & 0xFFU);
  outb(JM_PROTECTIONROUTE_PIT_CHANNEL0_PORT, JM_PROTECTIONROUTE_PIT_DIVISOR >> 8);
}}

#define pic_pit_install jm_generated_interruptcontroller_install
/* END GENERATED INTERRUPTCONTROLLER. */
'''


def userroute(source_hash: str) -> str:
    return f'''/* GENERATED USERMAPROUTE + BODYFRAMEINSTALL v1.4A SOURCE {source_hash}. */
#define JM_PROTECTIONROUTE_PAGE_USER_FLAG 0x4ULL
#define JM_PROTECTIONROUTE_PAGE_SIZE 4096ULL
#define JM_PROTECTIONROUTE_USER1_CODE 0x02000000ULL
#define JM_PROTECTIONROUTE_USER1_STACK_PAGE 0x02001000ULL
#define JM_PROTECTIONROUTE_USER1_STACK_TOP 0x02002000ULL
#define JM_PROTECTIONROUTE_USER2_CODE 0x02004000ULL
#define JM_PROTECTIONROUTE_USER2_STACK_PAGE 0x02005000ULL
#define JM_PROTECTIONROUTE_USER2_STACK_TOP 0x02006000ULL
#define JM_PROTECTIONROUTE_USER_DATA_SELECTOR 0x1BU
#define JM_PROTECTIONROUTE_USER_CODE_SELECTOR 0x23U
#define JM_PROTECTIONROUTE_USER_RFLAGS 0x202ULL
#define JM_PROTECTIONROUTE_BODY_COUNT 2U

_Static_assert(JM_USERBOUNDARY_PAGE_USER_FLAG == JM_PROTECTIONROUTE_PAGE_USER_FLAG, "ProtectionRoute user-page flag drift");
_Static_assert(JM_USERBOUNDARY_PAGE_SIZE == JM_PROTECTIONROUTE_PAGE_SIZE, "ProtectionRoute user-page size drift");
_Static_assert(JM_BODYREGISTRY_BODY_COUNT == JM_PROTECTIONROUTE_BODY_COUNT, "ProtectionRoute body count drift");
_Static_assert(USER1_CODE == JM_PROTECTIONROUTE_USER1_CODE, "ProtectionRoute body 1 code drift");
_Static_assert(USER2_CODE == JM_PROTECTIONROUTE_USER2_CODE, "ProtectionRoute body 2 code drift");
_Static_assert(USER_DATA_SELECTOR == JM_PROTECTIONROUTE_USER_DATA_SELECTOR, "ProtectionRoute user data selector drift");
_Static_assert(USER_CODE_SELECTOR == JM_PROTECTIONROUTE_USER_CODE_SELECTOR, "ProtectionRoute user code selector drift");

const char jm_generated_usermaproute_source[] =
  "[JM] USERMAPROUTE GENERATED v1.4A SOURCE {source_hash} ACTIVE";
const char jm_generated_bodyframeinstall_source[] =
  "[JM] BODYFRAMEINSTALL GENERATED v1.4A SOURCE {source_hash} ACTIVE";

static void jm_generated_usermaproute_mark(uint64_t address) {{
  size_t pde = (size_t)(address >> 21);
  size_t pte = (size_t)(address >> 12);
  boot_pml4[0] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pdpt[0] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pd[pde] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pts[pte] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
}}

static void jm_generated_usermaproute_install(void) {{
  static bool announced;
  jm_userboundary_announce();
  if (!announced) {{
    serial_write(jm_generated_usermaproute_source);
    serial_write("\\n");
    announced = true;
  }}
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER1_CODE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER1_STACK_PAGE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER2_CODE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER2_STACK_PAGE);
  routeos_reload_cr3();
}}

static void jm_generated_bodyframeinstall(void) {{
  static bool announced;
  jm_bodyregistry_announce();
  if (!announced) {{
    serial_write(jm_generated_bodyframeinstall_source);
    serial_write("\\n");
    announced = true;
  }}
  size_t blob_size = (size_t)(routeos_user_blob_end - routeos_user_blob_start);
  jm_memcpy((void *)JM_PROTECTIONROUTE_USER1_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)JM_PROTECTIONROUTE_USER1_STACK_PAGE, 0, JM_PROTECTIONROUTE_PAGE_SIZE);
  jm_memcpy((void *)JM_PROTECTIONROUTE_USER2_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)JM_PROTECTIONROUTE_USER2_STACK_PAGE, 0, JM_PROTECTIONROUTE_PAGE_SIZE);

  jm_memset(bodies, 0, sizeof(bodies));
  bodies[0].id = 1;
  bodies[0].state = BODY_READY;
  bodies[0].frame.r12 = 1;
  bodies[0].frame.rip = JM_PROTECTIONROUTE_USER1_CODE;
  bodies[0].frame.cs = JM_PROTECTIONROUTE_USER_CODE_SELECTOR;
  bodies[0].frame.rflags = JM_PROTECTIONROUTE_USER_RFLAGS;
  bodies[0].frame.rsp = JM_PROTECTIONROUTE_USER1_STACK_TOP;
  bodies[0].frame.ss = JM_PROTECTIONROUTE_USER_DATA_SELECTOR;
  bodies[1].id = 2;
  bodies[1].state = BODY_READY;
  bodies[1].frame.r12 = 2;
  bodies[1].frame.rip = JM_PROTECTIONROUTE_USER2_CODE;
  bodies[1].frame.cs = JM_PROTECTIONROUTE_USER_CODE_SELECTOR;
  bodies[1].frame.rflags = JM_PROTECTIONROUTE_USER_RFLAGS;
  bodies[1].frame.rsp = JM_PROTECTIONROUTE_USER2_STACK_TOP;
  bodies[1].frame.ss = JM_PROTECTIONROUTE_USER_DATA_SELECTOR;
}}

static void jm_generated_protectionroute_user_install(void) {{
  jm_generated_usermaproute_install();
  jm_generated_bodyframeinstall();
}}

#define user_boundary_install jm_generated_protectionroute_user_install
/* END GENERATED USERMAPROUTE + BODYFRAMEINSTALL. */
'''


def record(source_hash: str, outputs: dict[str, str]) -> str:
    data = {
        "version": VERSION,
        "proof_parent": PARENT,
        "machine_parent": PARENT,
        "source_sha256": source_hash,
        "offices": OFFICES,
        "generated": {name: sha(text.encode()) for name, text in outputs.items()},
        "runtime_markers": [
            f"[JM] {name.upper()} GENERATED v1.4A SOURCE {source_hash} ACTIVE"
            for name in OFFICES
        ],
        "removed_seams": [
            "gdt_install",
            "idt_set+idt_install",
            "pic_pit_install",
            "mark_user_page+user_boundary_install",
        ],
    }
    return json.dumps(data, indent=2, sort_keys=True) + "\n"


def write(path: Path, text: str, check: bool) -> None:
    if check:
        if not path.exists() or path.read_text() != text:
            raise SystemExit(f"HOLD: stale generated output: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    _, source_hash = parse(args.source)
    outputs = {
        "descriptorinstall.inc": descriptor(source_hash),
        "vectorroute.inc": vector(source_hash),
        "interruptcontroller.inc": interrupt_controller(source_hash),
        "usermap_bodyframe.inc": userroute(source_hash),
    }
    for name, text in outputs.items():
        write(args.out_dir / name, text, args.check)
    write(args.out_dir / "protectionroute.json", record(source_hash, outputs), args.check)
    if not args.check:
        print(source_hash)
        for name, text in outputs.items():
            print(name, sha(text.encode()))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as exc:
        print(f"HOLD: {exc}", file=sys.stderr)
        raise SystemExit(2)
