"""
Transfer check — after a solid correct answer, ask one more ordinary question.

100% understanding requires this check to pass. Otherwise teaching continues.

    python backend/transfer-check.py --self-test
    python backend/transfer-check.py "octet rule"
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

# Same spirit as teaching-loop's QUESTION_PROMPT — just another check question.
QUESTION_PROMPT = """Write ONE check question for a student about this topic.
Plain text only. One sentence. No lecture. No multiple choice. No markdown.
The question should check the same idea in a slightly different way.
Do not repeat any question listed under Already asked.
"""

GRADE_PROMPT = """Did the student answer this check correctly? Plain text only:

Transfer: true | false
Evidence: <one sentence>
Next question: <one follow-up question if Transfer is false>

Rules:
- true only if the answer uses the right idea on THIS question.
- "I get it" or repeating a buzzword is false.
- Next question: one ordinary sentence ending with ?. Never "none".
"""


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def parse_labeled(raw: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", raw or "", re.I | re.M)
    return (match.group(1).strip() if match else "").strip()


def parse_transfer(raw: str) -> bool | None:
    match = re.search(r"^Transfer:\s*(true|false|yes|no|1|0)\b", raw or "", re.I | re.M)
    if not match:
        return None
    return match.group(1).lower() in {"true", "yes", "1"}


def asked_list(asked: list[str] | None) -> list[str]:
    return [item.strip() for item in (asked or []) if (item or "").strip()]


def simple_question(topic: str) -> str:
    name = (topic or "").strip() or "this idea"
    if name.lower() in {"unclear", "none", "n/a", "-"}:
        name = "this idea"
    return f"In your own words, how does {name} work?"


def fallback_probe(
    topic: str,
    diagnosis: str = "",
    asked: list[str] | None = None,
    *,
    last_answer: str = "",
) -> str:
    del asked, last_answer  # kept for call-site compatibility
    name = (topic or parse_labeled(diagnosis, "Topic") or "").strip() or "this idea"
    return simple_question(name)


def usable_question(text: str) -> bool:
    cleaned = (text or "").strip()
    if len(cleaned) < 12 or "?" not in cleaned:
        return False
    head = cleaned.lower().split("?", 1)[0].strip()
    return head not in {"none", "n/a", "na", "null", "nil", "-", ""}


def make_check(
    topic: str,
    *,
    diagnosis: str = "",
    asked: list[str] | None = None,
    mixup: str = "",
    last_answer: str = "",
    last_question: str = "",
) -> dict[str, str]:
    used = asked_list(asked)
    name = (topic or parse_labeled(diagnosis, "Topic") or "this idea").strip() or "this idea"
    question = ""
    try:
        raw = misconception.complete(
            QUESTION_PROMPT,
            json.dumps(
                {
                    "topic": name,
                    "last_question": clip(last_question, 240),
                    "last_answer": clip(last_answer, 300),
                    "mixup": clip(mixup, 200),
                    "already_asked": [clip(item, 180) for item in used[-8:]],
                },
                ensure_ascii=True,
            ),
            max_tokens=80,
            temperature=0.3,
        ).strip()
        question = raw.splitlines()[0].strip().strip('"')
    except (ValueError, RuntimeError):
        question = ""
    if not usable_question(question):
        question = simple_question(name)
    return {"form": "new-question", "question": question}


def new_example(
    topic: str,
    *,
    diagnosis: str = "",
    asked: list[str] | None = None,
    mixup: str = "",
) -> str:
    return make_check(topic, diagnosis=diagnosis, asked=asked, mixup=mixup)["question"]


def grade(
    example: str,
    answer: str,
    *,
    topic: str = "",
    diagnosis: str = "",
    asked: list[str] | None = None,
) -> dict[str, str | bool]:
    question = (example or "").strip()
    if not question:
        raise ValueError("No transfer example to grade.")
    try:
        student = misconception.validate_input(answer)
    except ValueError:
        return {
            "passed": False,
            "evidence": "No answer to the transfer check, so transfer is false.",
            "next_question": simple_question(topic or parse_labeled(diagnosis, "Topic")),
            "raw": "",
        }
    raw = ""
    try:
        raw = misconception.complete(
            GRADE_PROMPT,
            json.dumps(
                {
                    "topic": topic or "this idea",
                    "question": clip(question, 400),
                    "answer": clip(student, 800),
                    "diagnosis": clip(diagnosis, 800),
                    "already_asked": [clip(item, 160) for item in asked_list(asked)[-6:]],
                },
                ensure_ascii=True,
            ),
            max_tokens=180,
            temperature=0.15,
        )
    except (ValueError, RuntimeError):
        raw = ""
    parsed = parse_transfer(raw)
    passed = bool(parsed)
    nxt = parse_labeled(raw, "Next question")
    if not usable_question(nxt):
        nxt = simple_question(topic or parse_labeled(diagnosis, "Topic"))
    evidence = parse_labeled(raw, "Evidence")
    if not evidence:
        evidence = (
            "Used the right model on this check."
            if passed
            else "Did not show the idea on this check."
        )
    return {
        "passed": passed,
        "evidence": evidence,
        "next_question": nxt,
        "raw": raw,
    }


def ready_for_check(kind: str, score: int) -> bool:
    return kind == "correct" and int(score) >= 70


def understanding_100(kind: str, transfer_passed: bool) -> bool:
    return kind == "correct" and transfer_passed is True


# Aliases kept so older teaching-loop helpers keep working.
def is_vague_question(text: str) -> bool:
    return False


def is_meta_prompt(text: str) -> bool:
    return False


def usable_check(text: str, asked: list[str] | None = None) -> bool:
    del asked
    return usable_question(text)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ask one more ordinary question to verify understanding.",
    )
    parser.add_argument("topic", nargs="*", help="Topic for a standalone transfer question.")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def self_test() -> str:
    lines = ["Self-test (local, no model call):"]
    empty = grade("How does recursion finish a call?", "   ")
    if empty["passed"] is False:
        lines.append("- empty transfer answer is false: ok")
    else:
        lines.append("- FAIL empty transfer counted as true")
    sample = "Transfer: false\nEvidence: repeated the last speech\nNext question: What about chlorine?"
    if parse_transfer(sample) is False and "chlorine" in parse_labeled(sample, "Next question"):
        lines.append("- parse Transfer false: ok")
    else:
        lines.append("- FAIL parse transfer")
    if parse_transfer("Transfer: true\nEvidence: applied it to sodium") is True:
        lines.append("- parse Transfer true: ok")
    else:
        lines.append("- FAIL parse true")
    q = simple_question("recursion")
    if usable_question(q) and "recursion" in q.lower():
        lines.append("- simple follow-up question: ok")
    else:
        lines.append("- FAIL simple question")
    if ready_for_check("correct", 80) and not ready_for_check("misconception", 90):
        lines.append("- transfer check only after a solid right-model answer: ok")
    else:
        lines.append("- FAIL ready_for_check")
    if understanding_100("correct", True) and not understanding_100("correct", False):
        lines.append("- 100% understanding requires a passed transfer check: ok")
    else:
        lines.append("- FAIL understanding_100")
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
        topic = " ".join(args.topic).strip() or "this idea"
        check = make_check(topic)
        print("Q: " + check["question"])
        answer = sys.stdin.readline() if not sys.stdin.isatty() else input("> ")
        result = grade(check["question"], answer, topic=topic)
        print("Transfer: " + ("true" if result["passed"] else "false"))
        print("Evidence: " + str(result["evidence"]))
        if not result["passed"]:
            print("Next: " + str(result["next_question"]))
        return 0
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
