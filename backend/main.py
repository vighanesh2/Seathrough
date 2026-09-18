"""
Entry point for the backend: start the continuous teaching loop.

Detect and the visual lesson are called from teaching-loop.py, not from here.

    python backend/main.py
    python backend/main.py "octet rule"
    python backend/main.py --self-test
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def load_teaching_loop() -> ModuleType:
    path = BACKEND / "teaching-loop.py"
    spec = importlib.util.spec_from_file_location("teaching_loop", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path.name}.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


loop = load_teaching_loop()


def main(argv: list[str] | None = None) -> int:
    return loop.main(argv if argv is not None else sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())
