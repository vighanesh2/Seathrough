#!/usr/bin/env bash
# Run the interactive teaching backend from the repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pick_python() {
  if [[ -n "${PYTHON_PATH:-}" ]] && command -v "$PYTHON_PATH" >/dev/null 2>&1; then
    echo "$PYTHON_PATH"
    return
  fi
  if [[ -n "${PYTHON:-}" ]] && command -v "$PYTHON" >/dev/null 2>&1; then
    echo "$PYTHON"
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    echo python3
    return
  fi
  if command -v python >/dev/null 2>&1; then
    echo python
    return
  fi
  echo "Python 3.10+ not found. Install Python, then retry." >&2
  exit 1
}

PY="$(pick_python)"

if ! "$PY" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "Python 3.10+ is required." >&2
  "$PY" --version >&2 || true
  exit 1
fi

# Fast env check before the interactive loop (skip for --check / --self-test so those own output).
if [[ "${1:-}" != "--check" && "${1:-}" != "--self-test" && "${1:-}" != "-h" && "${1:-}" != "--help" ]]; then
  if ! "$PY" backend/main.py --check >/dev/null; then
    "$PY" backend/main.py --check >&2 || true
    exit 1
  fi
fi

exec "$PY" -u backend/main.py "$@"
