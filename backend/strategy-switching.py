"""
Strategy switching — if one explanation fails, change the representation
instead of repeating it. Input is the current method (text). Output is a
different method (text). The teaching loop sends both into the visual lesson.

    python backend/strategy-switching.py --self-test
    python backend/strategy-switching.py "Method: split-pane contrast"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import Misconception as misconception  # noqa: E402

SWITCH_BELOW = 70

SWITCH_PROMPT = """You are the strategy thinker for a visual lesson. The last method did not get understanding to 70%.
Think, then pick a BETTER method. You MUST change. Do not keep or rename the same picture.

Think: <2-4 sentences: what the last visual showed, why it didn't land, what picture would work better for THIS mix-up>
Decision: change
Method: <short new name — not the same as Current or Tried>
Representation: <concrete objects and motion to draw for THIS topic, not a generic template>
Why switch: <one sentence>
Ask next: <one check question that fits the new picture>

Rules:
- If understanding is under 70, Decision must be change.
- Change the representation (number trace, causal chain, counterexample, step sequence, analogy, before/after). Split-pane contrast is banned if it was already tried.
- Name objects from the mix-up (grid vs tailpipe, coal plant, battery, etc.) not "left pane / right pane" unless that method is new.
- Do not lecture. The visual lesson will draw this.
"""

CHOOSE_PROMPT = """You are the strategy thinker picking the FIRST visual method for this mix-up.
Think, then output the best first picture.

Think: <2-4 sentences: what mix-up to make visible, what objects to draw>
Decision: start
Method: <short name>
Representation: <concrete objects and motion for THIS topic>
Why this: <one sentence>
Ask next: <one check question>

Rules:
- Prefer the picture that makes the mix-up fail on screen, not a generic split-pane of two labels.
- Do not lecture. The visual lesson will draw this.
"""

DEFAULT_METHOD = (
    "Method: split-pane contrast\n"
    "Representation: left pane is the mix-up; right pane is the true model; Play makes them move differently"
)

METHOD_BANK = [
    DEFAULT_METHOD,
    (
        "Method: single-object before/after\n"
        "Representation: one object transforms as Play runs; no second-pane story"
    ),
    (
        "Method: step sequence\n"
        "Representation: three numbered beats of the mechanism; Play walks through them in order"
    ),
    (
        "Method: concrete analogy\n"
        "Representation: an everyday object with the same causal structure, then map it back to the idea"
    ),
    (
        "Method: counterexample\n"
        "Representation: a case where the mix-up predicts the wrong outcome, shown as Play runs"
    ),
    (
        "Method: number trace\n"
        "Representation: two or three changing quantities with labels; no metaphor"
    ),
    (
        "Method: causal chain\n"
        "Representation: arrows of cause (energy, force, information) with no want, goal, or purpose"
    ),
]


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def parse_method(raw: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in (raw or "").splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip().lower()] = value.strip()
    return fields


def method_key(raw: str) -> str:
    name = parse_method(raw).get("method") or (raw or "").strip().splitlines()[0] if (raw or "").strip() else ""
    return re.sub(r"\s+", " ", name).strip().lower()


def same_method(left: str, right: str) -> bool:
    a, b = method_key(left), method_key(right)
    return bool(a) and a == b


def method_label(raw: str) -> str:
    name = parse_method(raw).get("method")
    if name:
        return name
    return clip(raw, 48)


def needs_change(score: int | None, current: str = "") -> bool:
    if not (current or "").strip():
        return False
    if score is None:
        return True
    return int(score) < SWITCH_BELOW


def think_text(raw: str) -> str:
    return parse_method(raw).get("think") or ""


def default_method(diagnosis: str = "") -> str:
    topic = ""
    for line in (diagnosis or "").splitlines():
        if line.lower().startswith("topic:"):
            topic = line.split(":", 1)[1].strip()
            break
    if not topic:
        return DEFAULT_METHOD
    return (
        DEFAULT_METHOD
        + f"\nWhy this first: start with a clear mix-up vs true picture for {topic}."
    )


def print_strategy(raw: str, *, heading: str) -> None:
    print(f"\n{heading}", flush=True)
    print("-" * len(heading), flush=True)
    think = think_text(raw)
    if think:
        print("Think: " + think, flush=True)
    label = method_label(raw)
    picture = parse_method(raw).get("representation") or ""
    why = parse_method(raw).get("why switch") or parse_method(raw).get("why this") or parse_method(raw).get("why this first") or ""
    if label:
        print("Method: " + label, flush=True)
    if picture:
        print("Picture: " + picture, flush=True)
    if why:
        print("Why: " + why, flush=True)


def format_pair(current: str, nxt: str) -> str:
    return (
        "Current method\n--------------\n"
        f"{(current or '').strip()}\n\n"
        "Next method\n-----------\n"
        f"{(nxt or '').strip()}"
    )


def fallback_switch(current: str, tried: list[str] | None = None) -> str:
    used = {method_key(current)}
    for item in tried or []:
        key = method_key(item)
        if key:
            used.add(key)
    for option in METHOD_BANK:
        if method_key(option) not in used:
            return option
    return (
        "Method: invert the last picture\n"
        "Representation: keep the topic but reverse the failed story — start from the true model and show where the mix-up would break"
    )


def _complete_method(system: str, payload: dict[str, object]) -> str:
    try:
        raw = misconception.complete(
            system,
            json.dumps(payload, ensure_ascii=True),
            max_tokens=420,
            temperature=0.45,
        )
        text = (raw or "").strip()
        if "Method:" not in text and "method:" not in text.lower():
            return ""
        return text
    except (ValueError, RuntimeError):
        return ""


def choose(diagnosis: str = "", student: str = "") -> str:
    text = _complete_method(
        CHOOSE_PROMPT,
        {
            "diagnosis": clip(diagnosis, 900),
            "student": clip(student, 400),
        },
    )
    if text and parse_method(text).get("method"):
        return text
    return default_method(diagnosis)


def switch(
    current: str,
    *,
    diagnosis: str = "",
    tried: list[str] | None = None,
    why_failed: str = "",
    score: int | None = None,
    student: str = "",
) -> str:
    text = (current or "").strip()
    if not text:
        raise ValueError("No current teaching method. Pass the method that just failed.")
    tried_list = [item for item in (tried or []) if (item or "").strip()]
    nxt = _complete_method(
        SWITCH_PROMPT,
        {
            "current_method": clip(text, 900),
            "diagnosis": clip(diagnosis, 800),
            "why_failed": clip(why_failed, 400),
            "understanding": score if score is not None else "unknown",
            "must_change": True,
            "student": clip(student, 400),
            "tried": [clip(item, 240) for item in tried_list[-6:]],
        },
    )
    if not nxt or same_method(text, nxt) or any(same_method(nxt, item) for item in tried_list):
        nxt = fallback_switch(text, tried_list)
        why = why_failed or "the last picture did not raise understanding above 70%"
        nxt = (
            f"Think: Understanding is {score if score is not None else 'low'}%. {why}. "
            f"Drop {method_label(text)} and use a different representation.\n"
            f"Decision: change\n"
            f"{nxt}"
        )
    return nxt


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="If a teaching method failed, output a different method as text.",
    )
    parser.add_argument("method", nargs="*", help="Current teaching method. If omitted, you will be asked.")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def read_current_method(args: argparse.Namespace) -> str:
    if args.method:
        return " ".join(args.method)
    if not sys.stdin.isatty():
        return sys.stdin.read()
    print("What teaching method just failed?")
    try:
        return input("> ")
    except EOFError as error:
        raise ValueError("No current teaching method.") from error


def self_test() -> str:
    lines = ["Self-test (local, no model call):"]
    try:
        switch("")
        lines.append("- empty: FAIL (should have rejected)")
    except ValueError:
        lines.append("- empty: ok")
    first = default_method("Topic: octet rule")
    second = fallback_switch(first, [first])
    third = fallback_switch(second, [first, second])
    if "octet" in first.lower() and not same_method(first, second) and not same_method(second, third):
        lines.append("- fallback methods change each time: ok")
    else:
        lines.append("- FAIL fallback repeat")
    pair = format_pair(first, second)
    if "Current method" in pair and "Next method" in pair and method_key(second) in pair.lower():
        lines.append("- pair is both methods as text: ok")
    else:
        lines.append("- FAIL pair text")
    parsed = parse_method(second)
    if parsed.get("method") and parsed.get("representation"):
        lines.append("- parse method labels: ok")
    else:
        lines.append("- FAIL parse method")
    if needs_change(25, first) and needs_change(69, first) and not needs_change(70, first) and not needs_change(25, ""):
        lines.append("- change method when understanding is below 70%: ok")
    else:
        lines.append("- FAIL 70% switch trigger")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    misconception.load_env()
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError, ValueError):
            pass
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        if args.self_test:
            print(self_test())
            return 0
        current = misconception.validate_input(read_current_method(args))
        nxt = switch(current)
        print(format_pair(current, nxt))
        return 0
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
        return 130
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
