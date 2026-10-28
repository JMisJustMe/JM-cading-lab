#!/data/data/com.termux/files/usr/bin/sh
# JM Phone Commander re-entry adapter (opt-in, no installation and no network).
# Does not replace JM sovereign source; no shell command execution from a mailbox.
set -eu

is_jm_root() {
  [ -n "${1:-}" ] &&
  [ -f "$1/agent-runtime/jm_agent_runtime.py" ] &&
  [ -f "$1/AGENTS.md" ]
}

ROOT="${JM_WORKSPACE:-}"
if ! is_jm_root "$ROOT"; then
  ROOT=""
  for candidate in "$HOME/JM_WORKSPACE/JM-cading-lab" "$HOME/JM_WORKSPACE/JM-phone-commander-probe"; do
    if is_jm_root "$candidate"; then ROOT="$candidate"; break; fi
  done
fi
if ! is_jm_root "$ROOT"; then
  FOUND="$(find "$HOME" -maxdepth 7 -type f -path '*/agent-runtime/jm_agent_runtime.py' -print -quit 2>/dev/null || true)"
  if [ -n "$FOUND" ]; then
    candidate="${FOUND%/agent-runtime/jm_agent_runtime.py}"
    if is_jm_root "$candidate"; then ROOT="$candidate"; fi
  fi
fi
if ! is_jm_root "$ROOT"; then
  echo "HOLD: existing JM repository not found; no clone or overwrite performed" >&2
  exit 2
fi

SCRIPT="$ROOT/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py"
if [ ! -f "$SCRIPT" ] && [ -f "$HOME/jm_phone_commander.py" ]; then
  SCRIPT="$HOME/jm_phone_commander.py"
fi
if [ ! -f "$SCRIPT" ]; then
  echo "HOLD: phone commander source missing; preserve repository and fetch explicitly" >&2
  exit 2
fi
if ! command -v python >/dev/null 2>&1; then
  echo "HOLD: Python unavailable; no package installation performed" >&2
  exit 2
fi
exec python "$SCRIPT" --workspace "$ROOT" "$@"
