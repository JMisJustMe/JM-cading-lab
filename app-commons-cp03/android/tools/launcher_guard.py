"""JM APP//COMMONS disposable-emulator launcher obstruction adapter.

Inherit the already-authored JM Fold Ultra guard; never diagnose an
application ANR as an Android launcher overlay. This is CI-only QA,
not a production app dependency or a physical Samsung-owner touch.
"""
import importlib.util
from pathlib import Path

LAUNCHER_ANRS = (
    "Quickstep isn't responding",
    "Pixel Launcher isn't responding",
)
ANR_SUFFIXES = ("isn't responding", "is not responding")


def classify(tree):
    """Return a decision from exact Android UI node text (not fuzzy matching)."""
    texts = {str(n.attrib.get("text", "")).strip()
             for n in tree.iter("node")}
    unknown = sorted(
        t for t in texts
        if t.endswith(ANR_SUFFIXES) and t not in LAUNCHER_ANRS
    )
    known = [t for t in LAUNCHER_ANRS if t in texts]
    if unknown:
        return "HOLD_APP_OR_UNKNOWN_ANR"
    if len(known) > 1:
        return "HOLD_AMBIGUOUS_LAUNCHER"
    if known:
        return "LAUNCHER_OVERLAY"
    return "NO_LAUNCHER_OVERLAY"


def resolve(tree, proof_dir):
    """Clear exactly known Android launcher overlay on a disposable emulator.

    True means an overlay was handled and caller MUST re-read actual
    APP//COMMONS UI before earning PASS. Unknown/application dialogs HOLD.
    """
    verdict = classify(tree)
    if verdict.startswith("HOLD_"):
        raise RuntimeError(verdict)
    if verdict == "NO_LAUNCHER_OVERLAY":
        return False

    donor_path = (Path(__file__).resolve().parents[3] /
        "agent-runtime/host-adapters/android/fold-ultra-autosetup/"
        "tools/emulator_dialog.py")
    if not donor_path.is_file():
        raise RuntimeError("HOLD_MISSING_PROTECTED_JM_LAUNCHER_DONOR")

    spec = importlib.util.spec_from_file_location(
        "jm_fold_launcher_obstruction_existing_donor", donor_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("HOLD_JM_LAUNCHER_DONOR_IMPORT")
    donor = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(donor)
    donor.OUT = Path(proof_dir)
    donor.OUT.mkdir(parents=True, exist_ok=True)
    # Existing donor requires QEMU/emulator identity, records environmental
    # attempts, only presses a unique launcher button, bounds retries and
    # fails closed. Its result does NOT prove the JM app UI.
    donor.clear_overlay_and_read("appcommons_editor")
    return True
