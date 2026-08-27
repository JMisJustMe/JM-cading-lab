#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TOOLS = ROOT / "coding-estate/everybody/semantic-depth/tools"


def apply(path: Path, required: list[tuple[str, str]], optional: list[tuple[str, str]] = []) -> None:
    text = path.read_text(encoding="utf-8")
    for old, new in required:
        if old not in text:
            raise SystemExit(f"PATCH HOLD: structural seam missing in {path.relative_to(ROOT)}: {old!r}")
        text = text.replace(old, new)
    for old, new in optional:
        if old in text:
            text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print(f"PATCHED {path.relative_to(ROOT)}")


# IMPORTANT: the v1.3 source remains immutable in Git. These edits occur only in
# the ephemeral CI checkout for the authorised 105-body descendant proof.
apply(
    TOOLS / "semantic_core.py",
    [
        ("EXPECTED_BODY_COUNT=100", "EXPECTED_BODY_COUNT=105"),
        (
            ' "coding-estate/everybody/body-registry-extension-02.json",\n)',
            ' "coding-estate/everybody/body-registry-extension-02.json",\n "coding-estate/everybody/body-registry-extension-03.json",\n)',
        ),
    ],
)

apply(
    TOOLS / "semantic_depth_factory.py",
    [],
    [("All first-100 bodies have body-specific capability effects and isolated process runtimes.", "All 105 admitted bodies have body-specific capability effects and isolated process runtimes.")],
)

apply(
    TOOLS / "qemu_kernel_factory.py",
    [
        ('"QEMU_100_BODY_KERNEL_CARRIER_PASS_NOT_NATIVE_TOOLCHAIN_CROWN" if run_qemu and len(receipts)==100', '"QEMU_105_BODY_KERNEL_CARRIER_PASS_NOT_NATIVE_TOOLCHAIN_CROWN" if run_qemu and len(receipts)==105'),
        ('if len(receipts)==100 and (manifest["unique_kernel_hashes"]!=100 or manifest["unique_compiler_namespaces"]!=100)', 'if len(receipts)==105 and (manifest["unique_kernel_hashes"]!=105 or manifest["unique_compiler_namespaces"]!=105)'),
    ],
    [('"schema":"jm.qemu-100-body-kernel-manifest/0.3"', '"schema":"jm.qemu-105-body-kernel-manifest/1.4"')],
)

apply(
    TOOLS / "onecontainer_factory.py",
    [
        ('if qemu.get("body_count")!=100 or not qemu.get("all_qemu_passed"):raise ValueError("100-body QEMU pass required")', 'if qemu.get("body_count")!=105 or not qemu.get("all_qemu_passed"):raise ValueError("105-body QEMU pass required")'),
        ('"body_count":100,"status":"ONECONTAINER_100_SELECTION_AND_HANDOFF_PASS_NOT_SINGLE_BOOT_IMAGE_CROWN"', '"body_count":len(bodies),"status":"ONECONTAINER_105_SELECTION_AND_HANDOFF_PASS_NOT_SINGLE_BOOT_IMAGE_CROWN"'),
    ],
    [('registers and selects 100 separately QEMU-proven kernels', 'registers and selects 105 separately QEMU-proven kernels')],
)

apply(
    TOOLS / "simultaneous_federation_factory.py",
    [
        ('"status":"SIMULTANEOUS_100_KERNEL_SERIAL_HANDOFF_PASS"', '"status":"SIMULTANEOUS_105_KERNEL_SERIAL_HANDOFF_PASS"'),
        ('if len({x["kernel_sha256"] for x in built})!=100 or len({x["compiler_namespace"] for x in built})!=100', 'if len({x["kernel_sha256"] for x in built})!=105 or len({x["compiler_namespace"] for x in built})!=105'),
        ('"body_count":100', '"body_count":105'),
        ('"all_100_simultaneously_ready":run_qemu and federation["simultaneous_ready_count"]==100', '"all_105_simultaneously_ready":run_qemu and federation["simultaneous_ready_count"]==105'),
        ('"all_100_handoffs_accepted":run_qemu and federation["accepted_body_count"]==100', '"all_105_handoffs_accepted":run_qemu and federation["accepted_body_count"]==105'),
        ('not receipt["all_100_simultaneously_ready"] or not receipt["all_100_handoffs_accepted"]', 'not receipt["all_105_simultaneously_ready"] or not receipt["all_105_handoffs_accepted"]'),
    ],
    [
        ('All 100 QEMU kernels were alive and serial-ready before the genesis token.', 'All 105 QEMU kernels were alive and serial-ready before the genesis token.'),
        ('through the ordered 100-body chain to terminus.', 'through the ordered 105-body chain to terminus.'),
    ],
)

apply(
    TOOLS / "bootable_onecontainer_factory.py",
    [
        ('if len(bodies)!=100 or container.get("body_count")!=100 or not container.get("all_selection_passed"):raise ValueError("OneContainer 100 selection pass required")', 'if len(bodies)!=105 or container.get("body_count")!=105 or not container.get("all_selection_passed"):raise ValueError("OneContainer 105 selection pass required")'),
        ('if config.count("menuentry \'")!=100:raise ValueError("GRUB menu count mismatch")', 'if config.count("menuentry \'")!=105:raise ValueError("GRUB menu count mismatch")'),
        ('"status":"BOOTABLE_ONECONTAINER_ISO_ALL_100_MENU_MACHINE_SELECTIONS_PASS" if run_qemu else "BOOTABLE_ONECONTAINER_ISO_BUILD_PASS_ALL_MENU_BOOTS_OPEN","body_count":100,"menu_entry_count":100', '"status":"BOOTABLE_ONECONTAINER_ISO_ALL_105_MENU_MACHINE_SELECTIONS_PASS" if run_qemu else "BOOTABLE_ONECONTAINER_ISO_BUILD_PASS_ALL_MENU_BOOTS_OPEN","body_count":105,"menu_entry_count":105'),
        ('run_qemu and len(selections)==100', 'run_qemu and len(selections)==105'),
    ],
    [
        ('One unchanged ISO contains all 100 separately proven kernels.', 'One unchanged ISO contains all 105 separately proven kernels.'),
        ('all 100 entries machine-booted', 'all 105 entries machine-booted'),
    ],
)

apply(
    TOOLS / "completion_freeze_factory.py",
    [
        ('semantic.get("body_count")!=100', 'semantic.get("body_count")!=105'),
        ('qemu.get("body_count")!=100', 'qemu.get("body_count")!=105'),
        ('container.get("body_count")!=100', 'container.get("body_count")!=105'),
        ('bootable.get("body_count")!=100 or bootable.get("machine_selection_count")!=100', 'bootable.get("body_count")!=105 or bootable.get("machine_selection_count")!=105'),
        ('federation.get("body_count")!=100 or federation.get("simultaneous_ready_count")!=100 or federation.get("accepted_body_count")!=100 or not federation.get("all_100_simultaneously_ready") or not federation.get("all_100_handoffs_accepted") or federation.get("status")!="SIMULTANEOUS_100_KERNEL_SERIAL_HANDOFF_PASS"', 'federation.get("body_count")!=105 or federation.get("simultaneous_ready_count")!=105 or federation.get("accepted_body_count")!=105 or not federation.get("all_105_simultaneously_ready") or not federation.get("all_105_handoffs_accepted") or federation.get("status")!="SIMULTANEOUS_105_KERNEL_SERIAL_HANDOFF_PASS"'),
        ('len(s)!=100', 'len(s)!=105'),
        ('"SIMULTANEOUS_100_KERNEL_READINESS_AND_ORDERED_TOKEN_HANDOFF"', '"SIMULTANEOUS_105_KERNEL_READINESS_AND_ORDERED_TOKEN_HANDOFF"'),
        ('"body_count":100', '"body_count":105'),
    ],
    [
        ('"100 QEMU machine pass required"', '"105 QEMU machine pass required"'),
        ('"all-100 GRUB ISO machine-selection pass required"', '"all-105 GRUB ISO machine-selection pass required"'),
        ('"simultaneous 100-kernel federation pass required"', '"simultaneous 105-kernel federation pass required"'),
        ('all 100 current-canon bodies', 'all 105 current-canon bodies'),
        ('all 100 federation kernels', 'all 105 federation kernels'),
        ('# JM 100 Bodies — Current Constructible Scope Freeze v1.3', '# JM 105 Bodies — Current Constructible Scope Freeze v1.4'),
        ('All 100 current-canon bodies execute', 'All 105 current-canon bodies execute'),
        ('all 100 GRUB entries', 'all 105 GRUB entries'),
        ('## Earned across all 100', '## Earned across all 105'),
        ('99-link identity-preserving handoff chain', '104-link identity-preserving handoff chain'),
        ('all 100 federation kernels and ordered validated token handoff', 'all 105 federation kernels and ordered validated token handoff'),
    ],
)

print("JM_105_PARITY_DESCENDANT_PATCH_PASS")
