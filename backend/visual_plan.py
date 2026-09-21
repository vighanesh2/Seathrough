"""
Finite visual grammars + slot-fill for the live AI tutor.

The model may choose genre, a tiny example, and 3–6 captions.
A deterministic widget walks those beats and changes world state.
Recursion / self-calling process is always a call stack.
"""

from __future__ import annotations

import json
import re
from typing import Any

BACKEND = __import__("pathlib").Path(__file__).resolve().parent
if str(BACKEND) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(BACKEND))

import Misconception as misconception  # noqa: E402

GENRES = (
    "stack",
    "flow",
    "map",
    "conservation",
    "comparison-over-time",
    "sourced-diagram",
)

DIAGNOSIS_DUMP = re.compile(
    r"a clear working model of how|"
    r"\bright model\b|\bwrong model\b|what's confused|whats confused|"
    r"knowledge gap|they seem to believe|the student is tangled|"
    r"what they need to see is",
    re.I,
)

JUNK_BEAT = re.compile(
    r"something in the scene moves|a concrete scene for|the mix-up plays out|"
    r"two endings differ|press play|notice what changed|"
    r"^none$|^n/a$|^true$|^mix-up$",
    re.I,
)

RECURSION_HINT = re.compile(
    r"recurs|self[-\s]?call|call(?:s|ing)? itself|call stack|"
    r"factorial|fibonacci|\bfib\b|countdown\b|ackermann|"
    r"base case|unwind",
    re.I,
)

FLOW_HINT = re.compile(
    r"\bcycle\b|pipeline|photosynth|mitosis|meiosis|loop\b|digest|"
    r"water cycle|nitrogen cycle|carbon cycle|food chain|food web|"
    r"algorithm steps|process of|workflow",
    re.I,
)

CONSERVATION_HINT = re.compile(
    r"conserv|energy transfer|heat\b|temperature|mass balance|"
    r"momentum|phase change|latent heat|kinetic energy",
    re.I,
)

COMPARE_HINT = re.compile(
    r"\bvs\.?\b|versus|compar|over time|growth|compound interest|"
    r"big ?o|linear vs|exponential|before and after",
    re.I,
)

MAP_HINT = re.compile(
    r"\bmap\b|region|organ\b|anatomy|geography|biome|cell structure|"
    r"tissue|continent|watershed|plate tecton",
    re.I,
)

DIAGRAM_HINT = re.compile(
    r"photosynth|mitosis|meiosis|chloroplast|stomata|respirat|"
    r"digest|water cycle|nitrogen cycle|carbon cycle|food chain|food web|"
    r"volcano|earthquake|plate tecton|rock cycle|"
    r"heart|blood|neuron|synapse|immune|kidney|lung|organ|"
    r"atom|molecule|dna|rna|protein synth|"
    r"eclipse|solar system|moon phase|tide|ecosystem|biome|cell\b",
    re.I,
)

EXAMPLE_CALL = re.compile(
    r"\b(factorial|fibonacci|fib|countdown|ackermann)\s*\(\s*(\d{1,2})\s*\)",
    re.I,
)
EXAMPLE_OF = re.compile(
    r"\b(factorial|fibonacci|fib|countdown)\s+(?:of\s+)?(\d{1,2})\b",
    re.I,
)

PLAN_PROMPT = """You fill slots for a finite visual grammar. JSON only. No markdown.

{"genre":"stack|flow|map|conservation|comparison-over-time|sourced-diagram",
 "title":"short scene title",
 "example":{"fn":"factorial","n":3},
 "beats":["caption 1","caption 2","caption 3"],
 "stages":["named part 1","named part 2","named part 3"],
 "code":""}

Rules:
- 3 to 6 beats. Each beat is a visible event, not a definition.
- Recursion or any self-calling process: genre MUST be stack. example.fn and example.n must match what they asked (factorial(3), fib(4), …).
- stages are short object names that belong to THIS topic. Never "right model", never "a clear working model of how…".
- If Wrong model is none, do not mention a mix-up.
- code is optional; only for programming topics, in the requested language.
- Do not invent a misconception.
"""


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def html_escape(text: str) -> str:
    return (
        (text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def extract_json(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        data = json.loads(text[start : end + 1])
        if isinstance(data, dict):
            return data
    raise ValueError("Model did not return JSON")


def topic_blob(fields: dict[str, str], extra: str = "") -> str:
    return " ".join(
        [
            extra,
            fields.get("topic") or "",
            fields.get("wrong model") or "",
            fields.get("right model") or "",
            fields.get("what's confused") or "",
        ]
    )


def is_blank(text: str) -> bool:
    cleaned = (text or "").strip().lower().rstrip(".?!")
    return cleaned in {"", "none", "n/a", "na", "null", "nil", "-", "true", "mix-up"}


def usable_label(text: str) -> bool:
    cleaned = clip(text, 80)
    if not cleaned or is_blank(cleaned):
        return False
    if DIAGNOSIS_DUMP.search(cleaned) or JUNK_BEAT.search(cleaned):
        return False
    return True


def parse_thinking_trailer(raw: str) -> dict[str, Any]:
    title = ""
    picture = ""
    title_m = re.search(r"^TITLE:\s*(.+)$", raw or "", re.I | re.M)
    if title_m:
        title = clip(title_m.group(1), 80)
    pic_m = re.search(r"^PICTURE:\s*(.+)$", raw or "", re.I | re.M)
    if pic_m:
        picture = clip(pic_m.group(1), 160)
    beats: list[str] = []
    in_beats = False
    for line in (raw or "").splitlines():
        if re.match(r"BEATS?:", line, re.I):
            in_beats = True
            continue
        if in_beats:
            item = re.sub(r"^[-*\d.)\s]+", "", line).strip()
            if usable_label(item):
                beats.append(clip(item, 140))
    return {"title": title if title and not DIAGNOSIS_DUMP.search(title) else "", "picture": picture, "beats": beats[:6]}


def is_recursion_topic(fields: dict[str, str], extra: str = "") -> bool:
    return bool(RECURSION_HINT.search(topic_blob(fields, extra)))


def classify_genre(
    fields: dict[str, str],
    extra: str = "",
    images: list[dict[str, str]] | None = None,
) -> str:
    blob = topic_blob(fields, extra)
    if RECURSION_HINT.search(blob):
        return "stack"
    if images and DIAGRAM_HINT.search(blob):
        return "sourced-diagram"
    if COMPARE_HINT.search(blob):
        return "comparison-over-time"
    if CONSERVATION_HINT.search(blob):
        return "conservation"
    if MAP_HINT.search(blob):
        return "map"
    if FLOW_HINT.search(blob) or DIAGRAM_HINT.search(blob):
        return "flow"
    return "flow"


def _canon_fn(name: str) -> str:
    low = (name or "").strip().lower()
    if low in {"fibonacci", "fib"}:
        return "fib"
    if low in {"factorial", "fact"}:
        return "factorial"
    if low in {"countdown"}:
        return "countdown"
    if low:
        return re.sub(r"[^a-z0-9_]+", "", low)[:24] or "factorial"
    return "factorial"


def parse_example(fields: dict[str, str], extra: str = "") -> dict[str, Any]:
    blob = topic_blob(fields, extra)
    fn = "factorial"
    n = 3
    if re.search(r"fibonacci|\bfib\b", blob, re.I):
        fn = "fib"
        n = 4
    elif re.search(r"countdown", blob, re.I):
        fn = "countdown"
        n = 3
    elif re.search(r"factorial", blob, re.I):
        fn = "factorial"
        n = 3
    match = EXAMPLE_CALL.search(blob) or EXAMPLE_OF.search(blob)
    if match:
        fn = _canon_fn(match.group(1))
        n = int(match.group(2))
    if fn == "fib":
        n = max(2, min(n, 5))
    elif fn == "countdown":
        n = max(2, min(n, 5))
    else:
        n = max(2, min(n, 6))
    return {"fn": fn, "n": n, "label": f"{fn}({n})"}


def _lang_key(language: str) -> str:
    n = (language or "").strip().lower()
    if n in {"js", "javascript", "node", "nodejs", "node.js"}:
        return "javascript"
    if n in {"py", "python"}:
        return "python"
    if n == "java":
        return "java"
    return "python"


def example_code(fn: str, language: str) -> str:
    lang = _lang_key(language)
    if fn == "fib":
        if lang == "javascript":
            return (
                "function fib(n) {\n"
                "  if (n <= 1) return n;\n"
                "  return fib(n - 1) + fib(n - 2);\n"
                "}"
            )
        if lang == "java":
            return (
                "int fib(int n) {\n"
                "    if (n <= 1) return n;\n"
                "    return fib(n - 1) + fib(n - 2);\n"
                "}"
            )
        return "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)"
    if fn == "countdown":
        if lang == "javascript":
            return (
                "function countdown(n) {\n"
                "  if (n === 0) return;\n"
                "  console.log(n);\n"
                "  countdown(n - 1);\n"
                "}"
            )
        if lang == "java":
            return (
                "void countdown(int n) {\n"
                "    if (n == 0) return;\n"
                "    System.out.println(n);\n"
                "    countdown(n - 1);\n"
                "}"
            )
        return "def countdown(n):\n    if n == 0:\n        return\n    print(n)\n    countdown(n - 1)"
    if lang == "javascript":
        return (
            "function factorial(n) {\n"
            "  if (n === 1) return 1;\n"
            "  return n * factorial(n - 1);\n"
            "}"
        )
    if lang == "java":
        return (
            "int factorial(int n) {\n"
            "    if (n == 1) return 1;\n"
            "    return n * factorial(n - 1);\n"
            "}"
        )
    return "def factorial(n):\n    if n == 1:\n        return 1\n    return n * factorial(n - 1)"


def _frame(label: str, status: str, detail: str, result: str | None = None) -> dict[str, Any]:
    item = {"id": label, "label": label, "status": status, "detail": detail}
    if result is not None:
        item["result"] = result
    return item


def factorial_beats(n: int, fn: str = "factorial") -> list[dict[str, Any]]:
    n = max(2, min(int(n), 6))
    beats: list[dict[str, Any]] = []
    for depth in range(1, n + 1):
        active = n - depth + 1
        frames = []
        for k in range(n, active - 1, -1):
            if k == active:
                if k == 1:
                    frames.append(_frame(f"{fn}({k})", "active", "base case → return 1", "1"))
                else:
                    frames.append(_frame(f"{fn}({k})", "active", f"needs {k} × {fn}({k - 1})"))
            else:
                frames.append(_frame(f"{fn}({k})", "waiting", f"waiting on {fn}({k - 1})"))
        if active == n:
            caption = f"Start {fn}({n}). It cannot finish until it knows {fn}({n - 1})."
            highlight = "call"
        elif active == 1:
            caption = f"{fn}(1) hits the base case and can return 1."
            highlight = "base"
        else:
            caption = f"That call opens {fn}({active}), which waits on {fn}({active - 1})."
            highlight = "call"
        beats.append({"caption": caption, "highlight": highlight, "frames": frames})
    values = {1: 1}
    for k in range(2, n + 1):
        values[k] = k * values[k - 1]
        frames = []
        for m in range(n, k - 1, -1):
            if m == k:
                frames.append(
                    _frame(
                        f"{fn}({m})",
                        "active",
                        f"{m} × {values[m - 1]} = {values[m]}",
                        str(values[m]),
                    )
                )
            else:
                frames.append(_frame(f"{fn}({m})", "waiting", f"waiting on {fn}({m - 1})"))
        beats.append(
            {
                "caption": f"The answer {values[k - 1]} travels back. {fn}({k}) becomes {k} × {values[k - 1]}.",
                "highlight": "call",
                "frames": frames,
            }
        )
    beats.append(
        {
            "caption": f"The stack is empty. {fn}({n}) returns {values[n]}.",
            "highlight": "base",
            "frames": [_frame(f"{fn}({n})", "done", f"returns {values[n]}", str(values[n]))],
        }
    )
    return beats[:12]


def _fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(max(0, n)):
        a, b = b, a + b
    return a


def fib_beats(n: int, fn: str = "fib") -> list[dict[str, Any]]:
    n = max(2, min(int(n), 5))
    beats: list[dict[str, Any]] = []
    for depth in range(1, n + 1):
        active = n - depth + 1
        frames = []
        for k in range(n, active - 1, -1):
            if k == active:
                if k <= 1:
                    frames.append(_frame(f"{fn}({k})", "active", f"base case → return {k}", str(k)))
                else:
                    frames.append(
                        _frame(f"{fn}({k})", "active", f"needs {fn}({k - 1}) + {fn}({k - 2})")
                    )
            else:
                frames.append(_frame(f"{fn}({k})", "waiting", f"waiting on smaller {fn} calls"))
        if active == n:
            caption = f"Start {fn}({n}). It waits on {fn}({n - 1}) and {fn}({n - 2})."
            highlight = "call"
        elif active <= 1:
            caption = f"{fn}({active}) hits the base case and returns {active}."
            highlight = "base"
        else:
            caption = f"Nested call {fn}({active}) still needs smaller answers."
            highlight = "call"
        beats.append({"caption": caption, "highlight": highlight, "frames": frames})
    values = {0: 0, 1: 1}
    for k in range(2, n + 1):
        values[k] = values[k - 1] + values[k - 2]
        frames = []
        for m in range(n, k - 1, -1):
            if m == k:
                frames.append(
                    _frame(
                        f"{fn}({m})",
                        "active",
                        f"{values[m - 1]} + {values[m - 2]} = {values[m]}",
                        str(values[m]),
                    )
                )
            else:
                frames.append(_frame(f"{fn}({m})", "waiting", f"waiting on {fn}({m - 1})"))
        beats.append(
            {
                "caption": f"{fn}({k - 1}) and {fn}({k - 2}) return. {fn}({k}) is {values[k]}.",
                "highlight": "call",
                "frames": frames,
            }
        )
    beats.append(
        {
            "caption": f"The stack is empty. {fn}({n}) returns {_fib(n)}.",
            "highlight": "base",
            "frames": [_frame(f"{fn}({n})", "done", f"returns {_fib(n)}", str(_fib(n)))],
        }
    )
    return beats[:12]


def countdown_beats(n: int, fn: str = "countdown") -> list[dict[str, Any]]:
    n = max(2, min(int(n), 5))
    beats: list[dict[str, Any]] = []
    for depth in range(1, n + 1):
        active = n - depth + 1
        frames = []
        for k in range(n, active - 1, -1):
            if k == active:
                frames.append(_frame(f"{fn}({k})", "active", f"prints {k}, then calls {fn}({k - 1})"))
            else:
                frames.append(_frame(f"{fn}({k})", "waiting", f"waiting on {fn}({k - 1})"))
        beats.append(
            {
                "caption": f"{fn}({active}) prints {active} and opens {fn}({active - 1}).",
                "highlight": "call",
                "frames": frames,
            }
        )
    frames = [_frame(f"{fn}({k})", "waiting", f"waiting on {fn}({k - 1})") for k in range(n, 0, -1)]
    frames.append(_frame(f"{fn}(0)", "active", "base case → return", ""))
    beats.append(
        {
            "caption": f"{fn}(0) hits the base case and stops.",
            "highlight": "base",
            "frames": frames,
        }
    )
    remaining = list(range(n, 0, -1))
    while remaining:
        top = remaining.pop()
        frames = [_frame(f"{fn}({k})", "waiting", "still on the stack") for k in remaining]
        frames.append(_frame(f"{fn}({top})", "active", "returns, stack unwinds"))
        beats.append(
            {
                "caption": f"{fn}({top}) finishes and the stack unwinds.",
                "highlight": "call",
                "frames": frames,
            }
        )
    beats.append(
        {
            "caption": f"The stack is empty. {fn}({n}) is done.",
            "highlight": "base",
            "frames": [_frame(f"{fn}({n})", "done", "returns", "")],
        }
    )
    return beats[:12]


def stack_beats_for(example: dict[str, Any]) -> list[dict[str, Any]]:
    fn = _canon_fn(str(example.get("fn") or "factorial"))
    n = int(example.get("n") or 3)
    if fn == "fib":
        return fib_beats(n, "fib")
    if fn == "countdown":
        return countdown_beats(n, "countdown")
    return factorial_beats(n, fn if fn != "factorial" else "factorial")


def slot_stages(
    fields: dict[str, str],
    thinking: str = "",
    components: list[str] | None = None,
) -> list[str]:
    stages: list[str] = []
    trailer = parse_thinking_trailer(thinking)
    for item in trailer["beats"]:
        short = clip(item, 42)
        if usable_label(short) and short not in stages:
            stages.append(short)
    for item in components or []:
        short = clip(str(item), 36)
        if usable_label(short) and short not in stages:
            stages.append(short)
    topic = clip(fields.get("topic") or "this idea", 40)
    if not stages:
        stages = [
            f"{topic} starts",
            "A working part changes",
            f"{topic} shows a result",
        ]
    return stages[:6]


def overlay_captions(beats: list[dict[str, Any]], captions: list[str]) -> list[dict[str, Any]]:
    clean = [clip(c, 160) for c in captions if usable_label(c)]
    if not clean or not beats:
        return beats
    out = []
    last = len(clean) - 1
    for i, beat in enumerate(beats):
        copied = dict(beat)
        if len(clean) == len(beats):
            copied["caption"] = clean[i]
        else:
            copied["caption"] = clean[round(i * last / max(1, len(beats) - 1))]
        out.append(copied)
    return out


def flow_beats(stages: list[str], captions: list[str] | None = None) -> list[dict[str, Any]]:
    names = stages[:6] or ["start", "change", "result"]
    beats = []
    for i, name in enumerate(names):
        cap = (captions[i] if captions and i < len(captions) and usable_label(captions[i]) else f"{name} is in play.")
        beats.append(
            {
                "caption": clip(cap, 160),
                "active": i,
                "tokenAt": i,
                "progress": round((i + 1) / len(names), 3),
                "stages": names,
            }
        )
    return beats


def conservation_beats(stages: list[str]) -> list[dict[str, Any]]:
    left = clip(stages[0] if stages else "store A", 28)
    right = clip(stages[1] if len(stages) > 1 else "store B", 28)
    extra = clip(stages[2], 28) if len(stages) > 2 else ""
    pairs = [
        (80, 20, 0),
        (60, 40, 5),
        (35, 60, 10),
        (15, 75, 15),
        (5, 80, 20),
    ]
    captions = [
        f"{left} holds most of the amount.",
        f"Play moves quantity from {left} into {right}.",
        f"{right} grows as {left} shrinks — the total stays in the system.",
        f"Nearly all of it now sits in {right}.",
        "The stores changed. Nothing appeared from nowhere.",
    ]
    beats = []
    for i, (a, b, c) in enumerate(pairs):
        stores = [{"name": left, "amount": a}, {"name": right, "amount": b}]
        if extra:
            stores.append({"name": extra, "amount": c})
        beats.append({"caption": captions[i], "stores": stores, "active": min(i, 1)})
    return beats


def comparison_beats(stages: list[str]) -> list[dict[str, Any]]:
    a_name = clip(stages[0] if stages else "trace A", 28)
    b_name = clip(stages[1] if len(stages) > 1 else "trace B", 28)
    a_vals = [1, 2, 3, 4, 5]
    b_vals = [1, 2, 4, 8, 16]
    beats = []
    for i in range(5):
        beats.append(
            {
                "caption": f"At step {i + 1}, {a_name} is {a_vals[i]} while {b_name} is {b_vals[i]}.",
                "tick": i,
                "traces": [
                    {"name": a_name, "values": a_vals[: i + 1], "full": a_vals},
                    {"name": b_name, "values": b_vals[: i + 1], "full": b_vals},
                ],
            }
        )
    return beats


def map_beats(stages: list[str]) -> list[dict[str, Any]]:
    regions = [clip(s, 36) for s in (stages[:6] or ["region"])]
    beats = []
    for i, name in enumerate(regions):
        beats.append(
            {
                "caption": f"{name} lights up in the working picture.",
                "active": i,
                "regions": [{"name": r, "on": j <= i} for j, r in enumerate(regions)],
            }
        )
    return beats


def _llm_slots(
    student: str,
    fields: dict[str, str],
    thinking: str,
    components: list[str],
    language: str,
    genre: str,
) -> dict[str, Any] | None:
    try:
        raw = misconception.complete(
            PLAN_PROMPT,
            json.dumps(
                {
                    "student": clip(student, 400),
                    "topic": fields.get("topic") or "",
                    "wrong_model": "" if is_blank(fields.get("wrong model") or "") else clip(fields.get("wrong model") or "", 160),
                    "thinking": clip(thinking, 900),
                    "must_name": components[:8],
                    "language": language,
                    "forced_genre": genre,
                },
                ensure_ascii=True,
            ),
            max_tokens=700,
            temperature=0.2,
            timeout=40,
        )
        data = extract_json(raw)
        return data if isinstance(data, dict) else None
    except (ValueError, RuntimeError, json.JSONDecodeError):
        return None


def _sanitize_genre(value: str, forced: str) -> str:
    if forced == "stack":
        return "stack"
    g = (value or "").strip().lower().replace("_", "-")
    if g in {"steps", "step", "sequence", "step-sequence"}:
        return "flow"
    if g in GENRES:
        return g
    return forced


def make_plan(
    student: str,
    fields: dict[str, str],
    thinking: str = "",
    components: list[str] | None = None,
    *,
    language: str = "",
    images: list[dict[str, str]] | None = None,
    use_llm: bool = True,
) -> dict[str, Any]:
    extra = student or ""
    forced = classify_genre(fields, extra, images)
    slots = _llm_slots(student, fields, thinking, components or [], language, forced) if use_llm else None
    genre = _sanitize_genre(str((slots or {}).get("genre") or ""), forced)
    example = parse_example(fields, extra)
    if slots and isinstance(slots.get("example"), dict):
        raw_fn = _canon_fn(str(slots["example"].get("fn") or example["fn"]))
        try:
            raw_n = int(slots["example"].get("n") or example["n"])
        except (TypeError, ValueError):
            raw_n = int(example["n"])
        if genre == "stack":
            example = parse_example(fields, f"{extra} {raw_fn}({raw_n})")
            example["fn"] = raw_fn if raw_fn in {"factorial", "fib", "countdown"} or RECURSION_HINT.search(raw_fn) else example["fn"]
            example["n"] = max(2, min(raw_n, 6))
            example["label"] = f"{example['fn']}({example['n']})"
    stages = slot_stages(fields, thinking, components)
    llm_stages = [clip(str(s), 42) for s in (slots or {}).get("stages") or [] if usable_label(str(s))]
    if llm_stages:
        stages = llm_stages[:6]
    llm_beats = [str(b) for b in (slots or {}).get("beats") or [] if usable_label(str(b))]
    title = clip(str((slots or {}).get("title") or ""), 80)
    trailer = parse_thinking_trailer(thinking)
    if not title or DIAGNOSIS_DUMP.search(title):
        title = trailer["title"] or (example["label"] + " unfolding" if genre == "stack" else clip(fields.get("topic") or "How it works", 60))
    code = str((slots or {}).get("code") or "").strip()
    if genre == "stack":
        if not code or DIAGNOSIS_DUMP.search(code) or "<" in code:
            code = example_code(str(example["fn"]), language)
        beats = overlay_captions(stack_beats_for(example), llm_beats)
        return {
            "genre": "stack",
            "title": title if title else f"{example['label']} unfolding",
            "example": example,
            "code": code,
            "beats": beats,
            "stages": [fr["label"] for fr in (beats[0].get("frames") or [])],
        }
    if genre == "conservation":
        beats = overlay_captions(conservation_beats(stages), llm_beats)
        return {"genre": genre, "title": title, "beats": beats, "stages": stages}
    if genre == "comparison-over-time":
        beats = overlay_captions(comparison_beats(stages), llm_beats)
        return {"genre": genre, "title": title, "beats": beats, "stages": stages}
    if genre == "map":
        beats = overlay_captions(map_beats(stages), llm_beats)
        return {"genre": genre, "title": title, "beats": beats, "stages": stages}
    if genre == "sourced-diagram":
        image = (images or [{}])[0] if images else {}
        beats = flow_beats(stages, llm_beats)
        return {
            "genre": "sourced-diagram",
            "title": title,
            "beats": beats,
            "stages": stages,
            "imageUrl": image.get("url") or "",
            "imageCredit": image.get("publisher") or image.get("title") or "source",
        }
    beats = overlay_captions(flow_beats(stages, llm_beats), llm_beats)
    return {"genre": "flow", "title": title, "beats": beats, "stages": stages}


WIDGET_CSS = """
html, body { margin: 0; height: 100%; background: #f4f7fb; }
.wrap { min-height: 100%; display: flex; flex-direction: column; font: 15px/1.45 ui-sans-serif, system-ui, sans-serif; color: #1a2b3c; }
.hero { padding: 14px 16px 0; text-align: center; }
.kicker { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6a7d90; margin: 0; }
h1 { font-size: 1.35rem; margin: 6px 0 8px; letter-spacing: -0.02em; }
.cap { min-height: 44px; margin: 0 auto 8px; max-width: 34rem; color: #3d5166; }
.stage { flex: 1; padding: 8px 16px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.frame { border-radius: 16px; border: 1px solid #c8d6e4; background: #fff; padding: 10px 14px; box-shadow: 0 10px 28px rgba(26,43,60,.06); }
.frame.wait { color: #5a6b7c; background: #fff; }
.frame.on { border-color: #1b6ca8; background: #d4e8f6; }
.frame.done { border-color: #2f9e6b; background: #e4f6ee; }
.row { display: flex; justify-content: space-between; gap: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.detail { margin: 4px 0 0; font-size: 13px; }
.line { width: 1px; height: 10px; background: rgba(27,108,168,.4); }
.steps { display: flex; width: 100%; max-width: 520px; gap: 8px; align-items: flex-end; }
.step { flex: 1; border-radius: 12px; border: 1px solid #c8d6e4; background: #fff; padding: 10px 8px; text-align: center; font-size: 12px; min-height: 64px; }
.step.on { border-color: #1b6ca8; background: #d4e8f6; }
.token-track { width: 100%; max-width: 520px; height: 10px; border-radius: 99px; background: #e8eef5; position: relative; margin-top: 6px; }
.token { width: 16px; height: 16px; border-radius: 50%; background: #1b6ca8; position: absolute; top: -3px; transition: left .4s ease; }
.bars { display: flex; gap: 16px; width: 100%; max-width: 480px; align-items: flex-end; height: 160px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.bar { width: 100%; border-radius: 12px 12px 4px 4px; background: #1b6ca8; transition: height .45s ease; }
.bar.b { background: #2f9e6b; }
.bar.c { background: #c47b2b; }
.traces { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 520px; }
.trace { border: 1px solid #c8d6e4; border-radius: 14px; padding: 10px; background: #fff; }
.dots { display: flex; gap: 6px; align-items: flex-end; height: 88px; margin-top: 8px; }
.dot { flex: 1; background: #1b6ca8; border-radius: 6px 6px 2px 2px; transition: height .35s ease; }
.regions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 520px; }
.region { border: 1px solid #c8d6e4; border-radius: 14px; padding: 12px 14px; background: #fff; min-width: 28%; text-align: center; }
.region.on { border-color: #1b6ca8; background: #d4e8f6; }
.pic { max-width: 100%; max-height: 220px; object-fit: contain; }
.bar-ui { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-top: 1px solid #c8d6e4; background: #fff; }
button { appearance: none; border: 0; border-radius: 9px; padding: 8px 14px; font: inherit; cursor: pointer; }
#play { background: #1b6ca8; color: #fff; }
#step, #reset { background: #e8eef5; }
code.block { display: block; width: 100%; max-width: 520px; font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f7fafc; border: 1px solid #c8d6e4; border-radius: 12px; padding: 10px 12px; white-space: pre; overflow: auto; }
"""


def build_widget_html(plan: dict[str, Any]) -> str:
    payload = json.dumps(plan, ensure_ascii=True)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>{WIDGET_CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <p class="kicker">Watch the idea</p>
      <h1 id="title"></h1>
      <p class="cap" id="cap"></p>
    </div>
    <div class="stage" id="stage"></div>
    <pre class="block" id="code" hidden></pre>
    <div class="bar-ui">
      <button type="button" id="play">Play</button>
      <button type="button" id="step">Next</button>
      <button type="button" id="reset">Reset</button>
    </div>
  </div>
  <script>
    const PLAN = {payload};
    const stage = document.getElementById("stage");
    const cap = document.getElementById("cap");
    const title = document.getElementById("title");
    const codeEl = document.getElementById("code");
    const playBtn = document.getElementById("play");
    title.textContent = PLAN.title || "How it works";
    if (PLAN.code) {{ codeEl.hidden = false; codeEl.textContent = PLAN.code; }}
    let i = 0, timer = null;
    const beats = PLAN.beats || [];
    function esc(s) {{
      return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }}
    function render() {{
      const b = beats[i] || beats[0] || {{}};
      cap.textContent = b.caption || PLAN.title || "";
      const g = PLAN.genre;
      if (g === "stack") {{
        const frames = b.frames || [];
        stage.innerHTML = frames.map((f, idx) => {{
          const w = Math.max(52, 100 - idx * 8);
          const cls = f.status === "active" ? "on" : f.status === "done" ? "done" : "wait";
          const res = f.result != null && f.result !== "" ? `<span>${{esc(f.result)}}</span>` : "";
          const line = idx ? `<div class="line"></div>` : "";
          return `${{line}}<div class="frame ${{cls}}" style="width:${{w}}%"><div class="row"><strong>${{esc(f.label)}}</strong>${{res}}</div><p class="detail">${{esc(f.detail)}}</p></div>`;
        }}).join("");
        return;
      }}
      if (g === "conservation") {{
        const stores = b.stores || [];
        const kinds = ["", "b", "c"];
        stage.innerHTML = `<div class="bars">${{stores.map((s, n) => `<div class="bar-col"><div class="bar ${{kinds[n]||""}}" style="height:${{Math.max(8, Number(s.amount)||0)}}%"></div><span>${{esc(s.name)}} · ${{esc(s.amount)}}</span></div>`).join("")}}</div>`;
        return;
      }}
      if (g === "comparison-over-time") {{
        const traces = b.traces || [];
        stage.innerHTML = `<div class="traces">${{traces.map(t => {{
          const full = t.full || t.values || [];
          const max = Math.max.apply(null, full.concat([1]));
          const vals = t.values || [];
          return `<div class="trace"><strong>${{esc(t.name)}}</strong><div class="dots">${{full.map((v, idx) => `<div class="dot" style="height:${{idx < vals.length ? (Number(v)/max*100) : 8}}%;opacity:${{idx < vals.length ? 1 : .2}}"></div>`).join("")}}</div></div>`;
        }}).join("")}}</div>`;
        return;
      }}
      if (g === "map") {{
        const regions = b.regions || [];
        stage.innerHTML = `<div class="regions">${{regions.map(r => `<div class="region ${{r.on ? "on" : ""}}">${{esc(r.name)}}</div>`).join("")}}</div>`;
        return;
      }}
      if (g === "sourced-diagram" && PLAN.imageUrl) {{
        stage.innerHTML = `<img class="pic" alt="" src="${{esc(PLAN.imageUrl)}}" referrerpolicy="no-referrer" /><p class="detail">${{esc(PLAN.imageCredit || "")}}</p>`;
        return;
      }}
      const stages = b.stages || PLAN.stages || [];
      const active = Number(b.active || 0);
      const tokenAt = Number(b.tokenAt != null ? b.tokenAt : active);
      const left = stages.length > 1 ? (tokenAt / (stages.length - 1)) * 100 : 0;
      stage.innerHTML = `<div class="steps">${{stages.map((s, idx) => `<div class="step ${{idx===active?"on":""}}">${{esc(s)}}</div>`).join("")}}</div><div class="token-track"><div class="token" style="left:calc(${{left}}% - 8px)"></div></div>`;
    }}
    function stop() {{ if (timer) {{ clearTimeout(timer); timer = null; }} playBtn.textContent = i >= beats.length - 1 ? "Play again" : "Play"; }}
    function tick() {{
      if (i >= beats.length - 1) {{ stop(); return; }}
      i += 1; render();
      timer = setTimeout(tick, 1100);
    }}
    document.getElementById("play").onclick = function () {{
      if (i >= beats.length - 1) {{ i = 0; render(); }}
      if (timer) {{ stop(); return; }}
      playBtn.textContent = "Pause";
      timer = setTimeout(tick, 400);
    }};
    document.getElementById("step").onclick = function () {{
      stop();
      if (i < beats.length - 1) {{ i += 1; render(); }}
    }};
    document.getElementById("reset").onclick = function () {{ stop(); i = 0; render(); }};
    render();
    playBtn.textContent = "Pause";
    timer = setTimeout(tick, 700);
  </script>
</body>
</html>
"""


def plan_has_stack_frames(plan: dict[str, Any]) -> bool:
    if (plan or {}).get("genre") != "stack":
        return False
    beats = plan.get("beats") or []
    return any((beat.get("frames") or []) for beat in beats)


def plan_text(plan: dict[str, Any]) -> str:
    return json.dumps(plan or {}, ensure_ascii=True).lower()
