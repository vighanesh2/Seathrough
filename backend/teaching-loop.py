"""
Continuous teaching loop — ask, detect, show a visual, ask again
until there is evidence the student understands.

    python backend/teaching-loop.py
    python backend/teaching-loop.py "octet rule"
    python backend/teaching-loop.py --self-test
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import Misconception as misconception  # noqa: E402

OUT_DIR = BACKEND / "out"
LOG_PATH = OUT_DIR / "teaching-loop-log.jsonl"
MAX_TURNS = 12
OPENER = "What are you trying to understand, and how do you think it works?"

QUESTION_PROMPT = """Write ONE check question for a student about this topic.
Plain text only. One sentence. No lecture. No multiple choice. No markdown.
The question should surface a typical mix-up if they have one.
"""

JUDGE_PROMPT = """Score whether the student now understands the idea. Plain text only:

Understanding: <integer 0-100>
Evidence: <one sentence>
Next question: <one follow-up question>
Status: still teaching | understood

Rules:
- Never output Understanding: 100. 100 is awarded only after a transfer check on a new example.
- Max 90 if the answer looks right.
- If Kind is misconception or knowledge gap, Understanding must be under 60.
- Next question must be one sentence, answerable in one or two sentences.
- Do not teach in the next question. Ask.
"""


def load_hyphen_module(name: str, filename: str) -> ModuleType:
    path = BACKEND / filename
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {filename}.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


lesson = load_hyphen_module("interactive_visual_lesson", "interactive-visual-lesson.py")
strategy = load_hyphen_module("strategy_switching", "strategy-switching.py")
transfer = load_hyphen_module("transfer_check", "transfer-check.py")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Keep teaching until there is evidence of understanding.",
    )
    parser.add_argument("topic", nargs="*", help="Optional topic. If omitted, the first question asks for it.")
    parser.add_argument("--no-open", action="store_true", help="Do not open visual lessons in the browser.")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def is_quit(text: str) -> bool:
    return (text or "").strip().lower() in {"q", "quit", "exit", "stop", "done"}


def ask(prompt: str) -> str:
    print(prompt, flush=True)
    try:
        return input("> ")
    except EOFError as error:
        raise ValueError("No answer entered.") from error


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def parse_labeled(raw: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", raw or "", re.I | re.M)
    return (match.group(1).strip() if match else "").strip()


def parse_score(raw: str) -> int | None:
    match = re.search(r"^Understanding:\s*(\d{1,3})\b", raw or "", re.I | re.M)
    if not match:
        return None
    return max(0, min(100, int(match.group(1))))


def should_teach(kind: str) -> bool:
    return kind in {"misconception", "knowledge_gap"}


def cap_score(kind: str, score: int, *, transfer: bool = False) -> int:
    value = max(0, min(100, int(score)))
    if transfer and kind == "correct":
        return 100
    if kind in {"misconception", "knowledge_gap"}:
        return min(value, 55)
    if kind == "not_learning":
        return min(value, 40)
    return min(value, 90)


def on_track(kind: str, score: int, transfer: bool = False) -> bool:
    return transfer is True and kind == "correct" and int(score) >= 100


def history_context(topic: str, turns: list[dict[str, str]]) -> str:
    if not turns:
        return ""
    lines = ["Earlier turns in this teaching loop:"]
    for i, turn in enumerate(turns[-4:], start=max(1, len(turns) - 3)):
        lines.append(
            f"{i}. Q: {clip(turn.get('question', ''), 180)}\n"
            f"   A: {clip(turn.get('answer', ''), 220)}\n"
            f"   Kind: {turn.get('kind', 'unknown')} · score {turn.get('score', '?')}%"
        )
    if topic:
        lines.append(f"Stay on topic: {topic}")
    return "\n".join(lines)


def first_question(topic: str) -> str:
    if not topic:
        return OPENER
    try:
        text = misconception.complete(
            QUESTION_PROMPT,
            json.dumps({"topic": topic}, ensure_ascii=True),
            max_tokens=80,
            temperature=0.3,
        ).strip()
        text = text.splitlines()[0].strip().strip('"')
        if len(text) >= 12 and "?" in text:
            return text
    except (ValueError, RuntimeError):
        pass
    return f"In your own words, how does {topic} work?"


def judge_turn(
    topic: str,
    question: str,
    answer: str,
    diagnosis: str,
    kind: str,
    turns: list[dict[str, str]],
) -> dict[str, str | int]:
    fallback_probe = parse_labeled(diagnosis, "Probe") or (
        f"Can you explain {topic or 'this idea'} without using the mix-up you just used?"
    )
    try:
        raw = misconception.complete(
            JUDGE_PROMPT,
            json.dumps(
                {
                    "topic": topic,
                    "question": question,
                    "answer": clip(answer, 800),
                    "diagnosis": clip(diagnosis, 900),
                    "kind": kind,
                    "history": [
                        {
                            "q": clip(t.get("question", ""), 160),
                            "a": clip(t.get("answer", ""), 160),
                            "kind": t.get("kind", ""),
                            "score": t.get("score", ""),
                        }
                        for t in turns[-4:]
                    ],
                },
                ensure_ascii=True,
            ),
            max_tokens=220,
            temperature=0.2,
        )
    except (ValueError, RuntimeError):
        raw = ""
    parsed = parse_score(raw)
    if parsed is None:
        guessed = {"correct": 70, "slip": 55, "knowledge_gap": 35, "misconception": 25}.get(kind, 20)
        parsed = guessed
    score = cap_score(kind, parsed)
    nxt = parse_labeled(raw, "Next question")
    if not nxt or "?" not in nxt:
        nxt = fallback_probe if fallback_probe.endswith("?") else fallback_probe.rstrip(".") + "?"
    return {
        "score": score,
        "evidence": parse_labeled(raw, "Evidence") or "Score based on this turn's diagnosis.",
        "next_question": nxt,
        "raw": raw,
    }


def append_log(turn: dict[str, str | int]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(turn, ensure_ascii=True) + "\n")


def print_tracker(turns: list[dict[str, str]], score: int, kind: str, confused: str) -> None:
    print("\nProgress", flush=True)
    print("--------", flush=True)
    for i, turn in enumerate(turns, start=1):
        mix = turn.get("confused") or turn.get("kind", "")
        print(
            f"  turn {i}: {turn.get('score', '?')}%  ·  {turn.get('kind', '?')}  ·  {clip(str(mix), 50)}"
            + (f"  ·  {clip(strategy.method_label(str(turn.get('method', ''))), 40)}" if turn.get("method") else ""),
            flush=True,
        )
    print(
        f"Understanding: {score}%  ·  this turn: {kind}"
        + (f"  ·  mix-up: {clip(confused, 80)}" if confused and kind != "correct" else ""),
        flush=True,
    )


def teach_mixup(
    answer: str,
    diagnosis: str,
    confused: str,
    last_confused: str,
    current_method: str,
    tried: list[str],
    *,
    open_browser: bool,
    previous_score: int | None = None,
    dest: Path | None = None,
) -> tuple[str, str, list[str], str]:
    used = list(tried)
    previous = ""
    if current_method and strategy.needs_change(previous_score, current_method):
        shown = previous_score if previous_score is not None else 0
        print(
            f"\nUnderstanding is {shown}% — below 70%, so the strategy thinker will change the visual method.",
            flush=True,
        )
        nxt = strategy.switch(
            current_method,
            diagnosis=diagnosis,
            tried=used,
            why_failed=confused,
            score=previous_score,
            student=answer,
        )
        strategy.print_strategy(nxt, heading="Strategy thinker — changing method")
        previous = current_method
        method = nxt
    elif current_method:
        method = current_method
        print(
            f"\nUnderstanding is {previous_score}% — keeping {strategy.method_label(method)}.",
            flush=True,
        )
    else:
        method = strategy.choose(diagnosis, student=answer)
        strategy.print_strategy(method, heading="Strategy thinker — first visual")
    print("\nBuilding a visual lesson with this method…", flush=True)
    html_dest = dest if dest is not None else (
        OUT_DIR / "interactive-lesson.html" if open_browser else None
    )
    payload = lesson.teach_payload(
        answer,
        dest=html_dest,
        open_browser=open_browser,
        diagnosis=diagnosis,
        strategy=method,
        previous_strategy=previous or None,
    )
    visual_html = str(payload.get("visual_html") or "")
    if visual_html:
        print(
            "Visual lesson is ready. Look at both panes, press Play, then come back and answer the next question.",
            flush=True,
        )
    if not any(strategy.same_method(method, item) for item in used):
        used.append(method)
    return confused or last_confused, method, used, visual_html


def asked_questions(turns: list[dict[str, str]], current: str = "") -> list[str]:
    seen = [str(turn.get("question") or "") for turn in turns]
    if current:
        seen.append(current)
    return [item for item in seen if item.strip()]


def run_transfer_check(
    topic: str,
    diagnosis: str,
    mixup: str,
    turns: list[dict[str, str]],
) -> dict[str, str | bool]:
    check = transfer.make_check(
        topic,
        diagnosis=diagnosis,
        asked=asked_questions(turns),
        mixup=mixup,
    )
    form = str(check.get("form") or "new-question")
    example = str(check.get("question") or "")
    if form == "new-example":
        print("\nTransfer check — a new case of the same idea.", flush=True)
    else:
        print("\nTransfer check — a different question on the same idea.", flush=True)
    raw_answer = ask("\nQ: " + example)
    if is_quit(raw_answer):
        return {"quit": True, "passed": False, "example": example, "answer": ""}
    result = transfer.grade(
        example,
        raw_answer,
        topic=topic,
        diagnosis=diagnosis,
        asked=asked_questions(turns, example),
    )
    answer = (raw_answer or "").strip()
    t_kind = "unknown"
    t_diag = ""
    t_confused = ""
    if answer:
        try:
            checked = misconception.validate_input(answer)
            t_diag = misconception.detect(
                checked,
                topic=topic or None,
                context=history_context(topic, turns) + f"\nTransfer example: {example}",
            )
            fields = lesson.parse_diagnosis(t_diag)
            t_kind = lesson.diagnosis_kind(fields)
            t_confused = fields.get("what's confused") or fields.get("whats confused") or ""
            if t_confused.lower() in {"none", "n/a", "-"}:
                t_confused = ""
        except (ValueError, RuntimeError):
            t_kind = "unknown"
    passed = bool(result["passed"]) and t_kind == "correct"
    print("\nTransfer: " + ("true" if passed else "false"), flush=True)
    print("Evidence: " + str(result["evidence"]), flush=True)
    if t_diag and not passed:
        print("\nDetected on the new example\n---------------------------\n" + t_diag, flush=True)
    return {
        "quit": False,
        "passed": passed,
        "example": example,
        "answer": answer,
        "kind": t_kind,
        "diagnosis": t_diag,
        "confused": t_confused,
        "evidence": str(result["evidence"]),
        "next_question": str(result["next_question"]),
    }


def evaluate_transfer(
    topic: str,
    diagnosis: str,
    turns: list[dict[str, str]],
    example: str,
    raw_answer: str,
) -> dict[str, str | bool]:
    result = transfer.grade(
        example,
        raw_answer,
        topic=topic,
        diagnosis=diagnosis,
        asked=asked_questions(turns, example),
    )
    answer = (raw_answer or "").strip()
    t_kind = "unknown"
    t_diag = ""
    t_confused = ""
    if answer:
        try:
            checked = misconception.validate_input(answer)
            t_diag = misconception.detect(
                checked,
                topic=topic or None,
                context=history_context(topic, turns) + f"\nTransfer example: {example}",
            )
            fields = lesson.parse_diagnosis(t_diag)
            t_kind = lesson.diagnosis_kind(fields)
            t_confused = fields.get("what's confused") or fields.get("whats confused") or ""
            if t_confused.lower() in {"none", "n/a", "-"}:
                t_confused = ""
        except (ValueError, RuntimeError):
            t_kind = "unknown"
    passed = bool(result["passed"]) and t_kind == "correct"
    return {
        "quit": False,
        "passed": passed,
        "example": example,
        "answer": answer,
        "kind": t_kind,
        "diagnosis": t_diag,
        "confused": t_confused,
        "evidence": str(result["evidence"]),
        "next_question": str(result["next_question"]),
    }


def empty_state(topic: str = "") -> dict[str, Any]:
    cleaned = (topic or "").strip()
    return {
        "topic": cleaned,
        "question": first_question(cleaned),
        "turns": [],
        "last_confused": "",
        "current_method": "",
        "tried_methods": [],
        "turn_no": 0,
        "phase": "ask",
        "score": 0,
        "kind": "",
        "confused": "",
        "diagnosis": "",
        "wrong_model": "",
        "right_model": "",
        "message": "Share what you think. A picture will show up if a mix-up appears.",
        "transfer_form": "",
        "on_track": False,
        "visual_html": "",
        "method_label": "",
        "think": "",
        "evidence": "",
    }


def view_state(state: dict[str, Any]) -> dict[str, Any]:
    turns = []
    for item in state.get("turns") or []:
        turns.append(
            {
                "turn": item.get("turn"),
                "score": item.get("score"),
                "kind": item.get("kind"),
                "method": strategy.method_label(str(item.get("method") or "")),
            }
        )
    visual = str(state.get("visual_html") or "")
    return {
        "phase": state.get("phase") or "ask",
        "question": state.get("question") or "",
        "score": int(state.get("score") or 0),
        "kind": state.get("kind") or "",
        "confused": state.get("confused") or "",
        "topic": state.get("topic") or "",
        "wrongModel": state.get("wrong_model") or "",
        "rightModel": state.get("right_model") or "",
        "methodLabel": state.get("method_label")
        or strategy.method_label(str(state.get("current_method") or "")),
        "think": state.get("think") or strategy.think_text(str(state.get("current_method") or "")),
        "message": state.get("message") or "",
        "evidence": state.get("evidence") or "",
        "onTrack": bool(state.get("on_track")),
        "visualHtml": visual,
        "hasVisual": bool(visual),
        "transferForm": state.get("transfer_form") or "",
        "turns": turns,
    }


def _fill_models(state: dict[str, Any], diagnosis: str) -> None:
    fields = lesson.parse_diagnosis(diagnosis)
    state["diagnosis"] = diagnosis
    state["wrong_model"] = fields.get("wrong model") or ""
    state["right_model"] = fields.get("right model") or ""
    state["method_label"] = strategy.method_label(str(state.get("current_method") or ""))
    state["think"] = strategy.think_text(str(state.get("current_method") or ""))


def apply_answer(
    state: dict[str, Any],
    raw_answer: str,
    *,
    open_browser: bool = False,
) -> str:
    if state.get("phase") == "on_track":
        return ""
    if is_quit(raw_answer):
        state["phase"] = "stopped"
        state["message"] = "Paused. Come back when you want to keep going."
        return ""
    try:
        answer = misconception.validate_input(raw_answer)
    except ValueError:
        return "Say it in a sentence."
    if int(state.get("turn_no") or 0) >= MAX_TURNS:
        state["phase"] = "stopped"
        state["message"] = "Let's pause here and pick this up again."
        return ""
    if state.get("phase") == "transfer":
        return _apply_transfer_answer(state, answer, open_browser=open_browser)
    return _apply_lesson_answer(state, answer, open_browser=open_browser)


def _apply_lesson_answer(
    state: dict[str, Any],
    answer: str,
    *,
    open_browser: bool,
) -> str:
    topic = str(state.get("topic") or "")
    question = str(state.get("question") or "")
    turns: list[dict[str, str]] = list(state.get("turns") or [])
    print("Checking for a mix-up…", flush=True)
    diagnosis = misconception.detect(
        answer,
        topic=topic or None,
        context=history_context(topic, turns) + f"\nCurrent question: {question}",
    )
    fields = lesson.parse_diagnosis(diagnosis)
    kind = lesson.diagnosis_kind(fields)
    topic = topic or fields.get("topic") or ""
    if topic.lower() in {"unclear", "none"}:
        topic = ""
    confused = fields.get("what's confused") or fields.get("whats confused") or ""
    if confused.lower() in {"none", "n/a", "-"}:
        confused = ""
    print("\nDetected\n--------\n" + diagnosis, flush=True)

    last_confused = str(state.get("last_confused") or "")
    current_method = str(state.get("current_method") or "")
    tried_methods: list[str] = list(state.get("tried_methods") or [])
    visual_html = str(state.get("visual_html") or "")
    if should_teach(kind):
        last_confused, current_method, tried_methods, drawn = teach_mixup(
            answer,
            diagnosis,
            confused,
            last_confused,
            current_method,
            tried_methods,
            open_browser=open_browser,
            previous_score=int(turns[-1]["score"]) if turns else None,
        )
        if drawn:
            visual_html = drawn
        state["message"] = "Look at the picture, press Play, then answer the next question."
    elif kind == "correct":
        state["message"] = "That matches the right idea. One more check to be sure."
    elif kind == "slip":
        state["message"] = "That looks like a small slip. Let's try the idea again."
    else:
        state["message"] = "Try answering the idea itself in a sentence."

    judged = judge_turn(topic, question, answer, diagnosis, kind, turns)
    score = cap_score(kind, int(judged["score"]))
    state["turn_no"] = int(state.get("turn_no") or 0) + 1
    turn = {
        "turn": state["turn_no"],
        "topic": topic,
        "question": question,
        "answer": answer,
        "kind": kind,
        "confused": confused,
        "score": score,
        "evidence": str(judged["evidence"]),
        "method": current_method,
    }
    turns.append(turn)
    append_log(turn)
    print_tracker(turns, score, kind, confused)
    print(f"Evidence: {judged['evidence']}", flush=True)

    state["topic"] = topic
    state["turns"] = turns
    state["last_confused"] = last_confused
    state["current_method"] = current_method
    state["tried_methods"] = tried_methods
    state["score"] = score
    state["kind"] = kind
    state["confused"] = confused
    state["visual_html"] = visual_html
    state["evidence"] = str(judged["evidence"])
    _fill_models(state, diagnosis)

    if transfer.ready_for_check(kind, score):
        check = transfer.make_check(
            topic,
            diagnosis=diagnosis,
            asked=asked_questions(turns),
            mixup=confused,
        )
        form = str(check.get("form") or "new-question")
        state["phase"] = "transfer"
        state["transfer_form"] = form
        state["question"] = str(check.get("question") or "")
        if form == "new-example":
            state["message"] = "Nice. Here's a new case of the same idea."
        else:
            state["message"] = "Nice. Here's a different question on the same idea."
        return ""

    state["phase"] = "ask"
    state["question"] = str(judged["next_question"])
    return ""


def _apply_transfer_answer(
    state: dict[str, Any],
    answer: str,
    *,
    open_browser: bool,
) -> str:
    topic = str(state.get("topic") or "")
    example = str(state.get("question") or "")
    diagnosis = str(state.get("diagnosis") or "")
    turns: list[dict[str, str]] = list(state.get("turns") or [])
    check = evaluate_transfer(topic, diagnosis, turns, example, answer)
    print("\nTransfer: " + ("true" if check["passed"] else "false"), flush=True)
    print("Evidence: " + str(check["evidence"]), flush=True)
    check_kind = str(check.get("kind") or "unknown")
    check_confused = str(check.get("confused") or "")
    score = int(state.get("score") or 0)
    kind = str(state.get("kind") or "")
    confused = str(state.get("confused") or "")
    last_confused = str(state.get("last_confused") or "")
    current_method = str(state.get("current_method") or "")
    tried_methods: list[str] = list(state.get("tried_methods") or [])
    visual_html = str(state.get("visual_html") or "")
    transfer_ok = False
    if check["passed"]:
        transfer_ok = True
        score = cap_score("correct", 100, transfer=True)
        kind = "correct"
        state["message"] = "You are on track."
        state["on_track"] = True
        state["phase"] = "on_track"
    else:
        score = cap_score(check_kind, min(score, 70))
        kind = check_kind
        confused = check_confused
        state["message"] = "Not yet — we'll keep going with a clearer picture."
        state["on_track"] = False
        state["phase"] = "ask"
        if should_teach(check_kind):
            last_confused, current_method, tried_methods, drawn = teach_mixup(
                str(check.get("answer") or answer),
                str(check.get("diagnosis") or diagnosis),
                check_confused,
                last_confused,
                current_method,
                tried_methods,
                open_browser=open_browser,
                previous_score=score,
            )
            if drawn:
                visual_html = drawn
        state["question"] = str(check.get("next_question") or state.get("question") or "")
    state["turn_no"] = int(state.get("turn_no") or 0) + 1
    t_turn = {
        "turn": state["turn_no"],
        "topic": topic,
        "question": example,
        "answer": str(check.get("answer") or ""),
        "kind": kind,
        "confused": confused,
        "score": score,
        "evidence": str(check.get("evidence") or ""),
        "method": current_method,
        "transfer": "true" if transfer_ok else "false",
    }
    turns.append(t_turn)
    append_log(t_turn)
    print_tracker(turns, score, kind, confused)
    state["turns"] = turns
    state["score"] = score
    state["kind"] = kind
    state["confused"] = confused
    state["last_confused"] = last_confused
    state["current_method"] = current_method
    state["tried_methods"] = tried_methods
    state["visual_html"] = visual_html
    state["evidence"] = str(check.get("evidence") or "")
    extra_diag = str(check.get("diagnosis") or diagnosis)
    if extra_diag:
        _fill_models(state, extra_diag)
    if on_track(kind, score, transfer_ok):
        state["on_track"] = True
        state["phase"] = "on_track"
        state["score"] = 100
        state["message"] = "You are on track."
    return ""


def run_loop(topic_hint: str = "", *, open_browser: bool = True) -> str:
    state = empty_state(topic_hint)
    print("Continuous teaching loop — we stop only when there is evidence you understand.", flush=True)
    print("If an explanation fails, the method changes instead of repeating.", flush=True)
    print("100% requires a transfer check on a new example.", flush=True)
    print("Type quit to leave.\n", flush=True)

    while int(state.get("turn_no") or 0) < MAX_TURNS and state.get("phase") not in {
        "on_track",
        "stopped",
    }:
        raw_answer = ask("\nQ: " + str(state.get("question") or ""))
        error = apply_answer(state, raw_answer, open_browser=open_browser)
        if error:
            print(error, flush=True)
            continue
        if state.get("phase") == "stopped":
            latest = int(state.get("score") or 0)
            return (
                f"Stopped at {latest}% understanding after "
                f"{len(state.get('turns') or [])} turn(s). Not on track yet."
            )
        if state.get("on_track"):
            recap = "; ".join(
                f"t{t['turn']} {t['score']}%" for t in (state.get("turns") or [])
            )
            return (
                f"Understanding: 100%\n"
                f"Transfer: true\n"
                f"You are on track!\n"
                f"Topic: {state.get('topic') or 'this idea'}\n"
                f"Turns: {len(state.get('turns') or [])} ({recap})"
            )

    latest = int(state.get("score") or 0)
    return (
        f"Paused after {MAX_TURNS} turns at {latest}%. "
        "There is not yet enough evidence of understanding. Run the loop again to keep going."
    )


def self_test() -> str:
    lines = ["Self-test (local, no model call):"]
    try:
        misconception.validate_input("")
        lines.append("- empty: FAIL (should have rejected)")
    except ValueError:
        lines.append("- empty: ok")
    if is_quit("quit") and is_quit("Q") and not is_quit("atoms want an octet"):
        lines.append("- quit phrases: ok")
    else:
        lines.append("- FAIL quit phrases")
    if should_teach("misconception") and should_teach("knowledge_gap") and not should_teach("correct"):
        lines.append("- visual only on mix-up / gap: ok")
    else:
        lines.append("- FAIL visual trigger")
    if cap_score("misconception", 100) == 55 and cap_score("correct", 100) == 90:
        lines.append("- score cannot be 100% without a transfer check: ok")
    else:
        lines.append("- FAIL score cap")
    if (
        on_track("correct", 100, True)
        and not on_track("correct", 100)
        and not on_track("misconception", 100, True)
        and not on_track("correct", 90, True)
    ):
        lines.append("- on track only after transfer true at 100%: ok")
    else:
        lines.append("- FAIL on-track rule")
    sample = "Understanding: 42\nEvidence: still using desire language\nNext question: What lowers the energy?"
    if parse_score(sample) == 42 and "lowers" in parse_labeled(sample, "Next question"):
        lines.append("- parse judge labels: ok")
    else:
        lines.append("- FAIL parse judge")
    if callable(getattr(misconception, "detect", None)) and callable(getattr(lesson, "teach", None)):
        lines.append("- detect + teach imported: ok")
    else:
        lines.append("- FAIL imports")
    params = misconception.detect.__code__.co_varnames
    if "context" in params:
        lines.append("- detect can take teaching-loop history: ok")
    else:
        lines.append("- FAIL detect context")
    teach_params = lesson.teach.__code__.co_varnames
    if "strategy" in teach_params and "previous_strategy" in teach_params:
        lines.append("- visual lesson takes current and previous methods: ok")
    else:
        lines.append("- FAIL teach strategy args")
    first = strategy.default_method()
    nxt = strategy.fallback_switch(first, [first])
    if first and nxt and not strategy.same_method(first, nxt) and "Current method" in strategy.format_pair(first, nxt):
        lines.append("- strategy switch changes the method text: ok")
    else:
        lines.append("- FAIL strategy switch")
    if strategy.needs_change(25, first) and not strategy.needs_change(80, first):
        lines.append("- below 70% understanding forces a method change: ok")
    else:
        lines.append("- FAIL 70% method change")
    if callable(getattr(transfer, "make_check", None)) and callable(getattr(transfer, "grade", None)):
        lines.append("- transfer-check imported: ok")
    else:
        lines.append("- FAIL transfer-check missing")
    if transfer.understanding_100("correct", True) and not transfer.understanding_100("correct", False):
        lines.append("- 100% understanding is transfer-gated: ok")
    else:
        lines.append("- FAIL transfer gate")
    opening = empty_state("")
    if opening.get("phase") == "ask" and "understand" in str(opening.get("question") or "").lower():
        lines.append("- web session can start with an opening question: ok")
    else:
        lines.append("- FAIL empty_state")
    err = apply_answer(opening, "   ", open_browser=False)
    if err:
        lines.append("- empty web answer rejected: ok")
    else:
        lines.append("- FAIL empty web answer")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    misconception.load_env()
    lesson.configure_stdio()
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        if args.self_test:
            print(self_test())
            return 0
        topic = " ".join(args.topic).strip()
        print(run_loop(topic, open_browser=not args.no_open))
        return 0
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
        return 130
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
