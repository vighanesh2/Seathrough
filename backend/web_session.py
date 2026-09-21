"""
JSON session API for the /ai-tutor page.

Reads one JSON object on stdin, writes one JSON object on stdout.
Logs go to stderr so the Next.js route can parse the result.

    python backend/web_session.py
"""

from __future__ import annotations

import json
import sys
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import Misconception as misconception  # noqa: E402


@contextmanager
def _stdout_as_stderr() -> Iterator[None]:
    """Keep progress prints off stdout so the API response stays pure JSON."""
    original = sys.stdout
    sys.stdout = sys.stderr
    try:
        yield
    finally:
        sys.stdout = original


def _load_loop():
    import importlib.util

    path = BACKEND / "teaching-loop.py"
    spec = importlib.util.spec_from_file_location("teaching_loop_web", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load teaching-loop.py.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


loop = _load_loop()

SESSIONS = BACKEND / "out" / "sessions"


def _session_dir() -> Path:
    SESSIONS.mkdir(parents=True, exist_ok=True)
    return SESSIONS


def _paths(session_id: str) -> tuple[Path, Path]:
    folder = _session_dir()
    return folder / f"{session_id}.json", folder / f"{session_id}-visual.html"


def _public(session_id: str, state: dict) -> dict:
    view = loop.view_state(state)
    view["sessionId"] = session_id
    view["ok"] = True
    return view


def _save(session_id: str, state: dict) -> None:
    state_path, visual_path = _paths(session_id)
    visual = str(state.get("visual_html") or "")
    slim = dict(state)
    slim["visual_html"] = ""
    slim["has_visual_file"] = bool(visual)
    state_path.write_text(json.dumps(slim, ensure_ascii=True, indent=2), encoding="utf-8")
    if visual:
        visual_path.write_text(visual, encoding="utf-8")


def _load(session_id: str) -> dict:
    state_path, visual_path = _paths(session_id)
    if not state_path.is_file():
        raise ValueError("Session expired. Start a new conversation.")
    state = json.loads(state_path.read_text(encoding="utf-8"))
    if visual_path.is_file():
        state["visual_html"] = visual_path.read_text(encoding="utf-8")
    elif state.get("has_visual_file"):
        state["visual_html"] = ""
    return state


def handle(req: dict) -> dict:
    action = str(req.get("action") or "").strip().lower()
    if action == "start":
        topic = str(req.get("topic") or "").strip()
        language = str(req.get("language") or "").strip()
        session_id = uuid.uuid4().hex[:16]
        state = loop.empty_state(topic)
        if language:
            state["language"] = language
        if topic:
            loop.seed_intro_lesson(state, open_browser=False)
        _save(session_id, state)
        return _public(session_id, state)
    if action == "answer":
        session_id = str(req.get("sessionId") or "").strip()
        if not session_id:
            raise ValueError("Missing session.")
        state = _load(session_id)
        error = loop.apply_answer(
            state,
            str(req.get("text") or ""),
            open_browser=False,
        )
        if error:
            view = _public(session_id, state)
            view["error"] = error
            return view
        _save(session_id, state)
        return _public(session_id, state)
    if action == "reset":
        session_id = str(req.get("sessionId") or "").strip()
        if session_id:
            state_path, visual_path = _paths(session_id)
            state_path.unlink(missing_ok=True)
            visual_path.unlink(missing_ok=True)
        return {"ok": True, "reset": True}
    raise ValueError("Unknown action. Use start, answer, or reset.")


def main() -> int:
    misconception.load_env()
    loop.lesson.configure_stdio()
    raw = sys.stdin.read()
    try:
        req = json.loads(raw or "{}")
        if not isinstance(req, dict):
            raise ValueError("Request must be a JSON object.")
        with _stdout_as_stderr():
            result = handle(req)
        sys.stdout.write(json.dumps(result, ensure_ascii=True))
        return 0
    except (ValueError, RuntimeError, json.JSONDecodeError) as error:
        sys.stdout.write(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
