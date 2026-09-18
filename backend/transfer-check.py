"""
Transfer check — one new example to verify they actually got it.

100% understanding is true only if this new case is answered with the
right model. Otherwise it is false and teaching continues.

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

EXAMPLE_PROMPT = """Write ONE transfer check. The student just gave an answer that looks right. Test whether they can use the idea again.

Choose the form that actually fits this topic:
- new-example: YOU describe a specific new situation they can reason about (a different organism, place, material, machine, or quantity — only if that is natural here).
- new-question: a different question about the same idea (what if a usual condition is missing, why the mix-up fails, what must still be true).

Output plain text:
Form: new-example | new-question
Check: <the question the student will see, one or two sentences>

Rules:
- Check must be a question they can answer in one or two sentences.
- YOU provide the case or the question. Never tell them to invent an example, invent numbers, or "apply this to a fresh situation."
- If quantities do not fit the topic, use Form: new-question.
- Do not rephrase any item in Already asked.
- Do not give away the answer.
"""

GRADE_PROMPT = """Did the student show they can use the idea on this transfer check? Plain text only:

Transfer: true | false
Evidence: <one sentence>
Next question: <one real follow-up question if Transfer is false>

Rules:
- true only if they use the right model on THIS check, not a restatement of the last answer.
- Repeating a buzzword or "I get it now" is false.
- If the old mix-up shows up, false.
- Next question must be a question they can answer. Never "give a new example" or "use different numbers."
"""

STOP = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "it",
    "this", "that", "what", "how", "why", "does", "do", "you", "your",
}


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


def word_set(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (text or "").lower())
        if token not in STOP and len(token) > 2
    }


def too_similar(left: str, right: str) -> bool:
    a, b = word_set(left), word_set(right)
    if not a or not b:
        return False
    overlap = len(a & b) / max(len(a), len(b))
    return overlap >= 0.72


def asked_list(asked: list[str] | None) -> list[str]:
    return [item.strip() for item in (asked or []) if (item or "").strip()]


META_SNIPPETS = (
    "fresh situation",
    "different numbers",
    "different numbers or objects",
    "apply the idea to this",
    "apply the idea to a",
    "this new case",
    "not the previous example",
    "surface details",
    "a different case of",
    "give an example",
    "come up with",
    "invent a",
    "make up a",
    "try a fresh",
)


def is_meta_prompt(text: str) -> bool:
    low = (text or "").lower()
    return any(snippet in low for snippet in META_SNIPPETS)


def fallback_probe(topic: str, diagnosis: str = "", asked: list[str] | None = None) -> str:
    used = asked_list(asked)
    name = (topic or parse_labeled(diagnosis, "Topic") or "this idea").strip() or "this idea"
    options: list[str] = []
    probe = parse_labeled(diagnosis, "Probe")
    if probe:
        options.append(probe if probe.endswith("?") else probe.rstrip(".") + "?")
    wrong = parse_labeled(diagnosis, "Wrong model")
    right = parse_labeled(diagnosis, "Right model")
    if wrong:
        options.append(f"Someone says: {clip(wrong, 140)} What is actually going on in {name}?")
    if right:
        options.append(f"What would go wrong if we ignored this about {name}: {clip(right, 140)}")
    options.append(f"If a usual part of {name} were missing, what would change and what would stay the same?")
    options.append(f"What does {name} need that people often skip? Say it in your own words.")
    for option in options:
        cleaned = option.strip()
        if not cleaned or is_meta_prompt(cleaned):
            continue
        if any(too_similar(cleaned, prev) for prev in used):
            continue
        return cleaned
    return f"What has to be true for {name}, in your own words?"


def parse_check(raw: str) -> tuple[str, str]:
    form = (parse_labeled(raw, "Form") or "").lower()
    check = parse_labeled(raw, "Check")
    if not check:
        lines = [line.strip() for line in (raw or "").splitlines() if line.strip()]
        lines = [line for line in lines if not line.lower().startswith("form:")]
        check = " ".join(lines).strip().strip('"')
    if "example" in form:
        form = "new-example"
    else:
        form = "new-question"
    return form, check


def usable_check(text: str, asked: list[str]) -> bool:
    cleaned = (text or "").strip()
    if len(cleaned) < 12:
        return False
    if is_meta_prompt(cleaned):
        return False
    if any(too_similar(cleaned, prev) for prev in asked):
        return False
    return True


def make_check(
    topic: str,
    *,
    diagnosis: str = "",
    asked: list[str] | None = None,
    mixup: str = "",
) -> dict[str, str]:
    used = asked_list(asked)
    form = "new-question"
    check = ""
    try:
        raw = misconception.complete(
            EXAMPLE_PROMPT,
            json.dumps(
                {
                    "topic": topic or "this idea",
                    "diagnosis": clip(diagnosis, 800),
                    "mixup": clip(mixup, 300),
                    "already_asked": [clip(item, 180) for item in used[-8:]],
                },
                ensure_ascii=True,
            ),
            max_tokens=180,
            temperature=0.4,
        )
        form, check = parse_check(raw)
    except (ValueError, RuntimeError):
        check = ""
    if not usable_check(check, used):
        return {
            "form": "new-question",
            "question": fallback_probe(topic, diagnosis, used),
        }
    return {"form": form, "question": check}


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
            "next_question": fallback_probe(topic, diagnosis, asked_list(asked) + [question]),
            "raw": "",
        }
    raw = ""
    try:
        raw = misconception.complete(
            GRADE_PROMPT,
            json.dumps(
                {
                    "topic": topic or "this idea",
                    "new_example": clip(question, 400),
                    "answer": clip(student, 800),
                    "diagnosis": clip(diagnosis, 800),
                    "already_asked": [clip(item, 160) for item in asked_list(asked)[-6:]],
                },
                ensure_ascii=True,
            ),
            max_tokens=220,
            temperature=0.15,
        )
    except (ValueError, RuntimeError):
        raw = ""
    parsed = parse_transfer(raw)
    passed = bool(parsed)
    nxt = parse_labeled(raw, "Next question")
    if not usable_check(nxt, asked_list(asked) + [question]) or "?" not in nxt:
        nxt = fallback_probe(topic, diagnosis, asked_list(asked) + [question])
    evidence = parse_labeled(raw, "Evidence")
    if not evidence:
        evidence = (
            "Used the right model on this transfer check."
            if passed
            else "Did not show the idea on this transfer check."
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


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ask one new example to verify transfer, not rehearsal.",
    )
    parser.add_argument("topic", nargs="*", help="Topic for a standalone transfer question.")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def self_test() -> str:
    lines = ["Self-test (local, no model call):"]
    empty = grade("A new case about energy, not the last beaker.", "   ")
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
    asked = ["Why do atoms fill their outer shell?"]
    diag = (
        "Topic: electron shells\n"
        "Wrong model: atoms want an octet\n"
        "Right model: a full shell is a lower-energy arrangement\n"
        "Probe: Why does sodium lose an electron instead of wanting one?"
    )
    first = fallback_probe("electron shells", diag, asked)
    second = fallback_probe("electron shells", diag, asked + [first])
    if "numbers" in first.lower() or is_meta_prompt(first):
        lines.append("- FAIL fallback asked the student to invent numbers")
    elif first != second and "?" in first:
        lines.append("- fallback is a real question, not a numbers template: ok")
    else:
        lines.append("- FAIL example uniqueness")
    meta = (
        "Try a fresh situation about this topic with different numbers or objects. "
        "Apply the idea to this new case, not the previous example."
    )
    if is_meta_prompt(meta) and not usable_check(meta, []):
        lines.append("- reject 'invent a new example' prompts: ok")
    else:
        lines.append("- FAIL meta prompt slipped through")
    parsed_form, parsed_check = parse_check(
        "Form: new-question\nCheck: What does a plant use light for if it cannot eat soil?"
    )
    if parsed_form == "new-question" and "light" in parsed_check:
        lines.append("- parse form + check: ok")
    else:
        lines.append("- FAIL parse check")
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
        example = new_example(topic)
        print("Transfer check — can you use the idea here?\n", flush=True)
        print("Q: " + example, flush=True)
        try:
            answer = input("> ")
        except EOFError as error:
            raise ValueError("No answer entered.") from error
        result = grade(example, answer, topic=topic)
        print("Transfer: " + ("true" if result["passed"] else "false"), flush=True)
        print("Evidence: " + str(result["evidence"]), flush=True)
        if result["passed"]:
            print("Understanding: 100%")
        else:
            print("Understanding is not 100%. Continue teaching.")
            print("Next: " + str(result["next_question"]))
        return 0
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
        return 130
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
