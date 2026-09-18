"""
Interactive visual lesson — detect a misconception, think how to teach it,
then write visual code and render it (ChatGPT-style artifact).

    python backend/interactive-visual-lesson.py "heat and temperature are the same thing"
    python backend/interactive-visual-lesson.py --self-test
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import webbrowser
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import Misconception as misconception  # noqa: E402
import tavily as websearch  # noqa: E402

OUT_DIR = BACKEND / "out"
MAX_VISUAL_CHARS = 80_000

THINK_PROMPT = """You are planning how to teach this misconception with a custom visual.
You are given web research (explanations + visual components). Use it. Do not write JSON, HTML, or code.

Cover, in this order:
1. What the student actually believes.
2. The correct idea, grounded in the sources (cite [S1], [A1] when you use them).
3. The picture to draw — name the concrete objects from research. Do not default to a glass/beaker unless the sources are about heat, temperature, or chemistry.
4. What Play must make different on the mix-up side vs the true side.
5. End with:

TITLE: short lesson title
PICTURE: the concrete objects from research, in one line
BEATS:
- visible event 1
- visible event 2
- visible event 3

8-14 short sentences before the trailer.

If a teaching method is provided, the picture MUST follow that method and representation. Do not reuse a failed method listed under do_not_repeat.
"""

EXTRACT_PROMPT = """From the web notes, list the concrete things a teacher should DRAW.
JSON only:
{"components": ["contour lines", "marble", "gradient arrow"]}
Use names from the sources (hill, contour, marble, vector, plant, photon, thermometer, ...).
Do not put beaker or flask unless the sources are about heat, temperature, chemistry, or liquids.
5-10 items. No kit enum. No explanation text.
"""

VISUAL_PROMPT = """Write JavaScript that draws this lesson on a canvas. Output ONLY JavaScript. No markdown. No HTML.

You receive VisualRuntime as V. Assign V.draw and titles. Helpers already draw in a Rough.js sketchy ink style — prefer them over raw ctx.
V.rough is the Rough.js canvas if you need a custom shape (seed it so Play does not flicker).

API:
  V.leftTitle, V.rightTitle, V.captionBefore, V.captionAfter, V.duration
  V.pane("left"|"right") -> {x,y,w,h}
  V.xy(pane, nx, ny) pixel point from 0-1 coords inside the pane
  V.inPane(pane, fn)
  V.label(x, y, text, maxW)
  V.arrow(x1,y1,x2,y2,color,dashed)
  V.ball(x,y,color,r)
  V.person(x,y)
  V.sun(x,y,glow)
  V.leaf(x,y,fill)
  V.beaker(x,y,{fill, liquid})
  V.thermometer(x,y,value)
  V.hill(pane)   // contour / loss surface
  V.axes(pane, xlabel, ylabel)
  V.curve(pane, [[nx,ny],...], color)
  V.along(path, t) -> {x,y} in 0-1
  V.dots(x,y,count,speed,color)
  V.lerp, V.clamp, V.ctx, V.rough

Required shape:
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "...";
V.captionAfter = "...";
V.draw = function (t) {
  const L = V.pane("left");
  const R = V.pane("right");
  V.inPane(L, function () { /* mix-up, animate with t 0..1 */ });
  V.inPane(R, function () { /* true model, different motion */ });
};

Rules:
- Draw EVERY component in the researched list. Invent extra canvas drawing if a helper is missing.
- Left = mix-up. Right = true. Play (t going 0→1) must make them look different.
- Use V.label for text so it is not clipped.
- Keep it compact: under 120 lines. Compose V.arrow, V.curve, V.ball, V.person, V.label, and short V.rough paths inside V.draw. Do not write long nested helpers (no drawDNA/drawRNA style functions).
- Finish the whole sketch. Close every function and brace. Never stop mid-statement.
- Do NOT draw a beaker/flask/glass unless components include heat, temperature, chemistry, or liquid.
- Do NOT replace the topic with a generic graph of two balls unless the topic is motion on a graph.
- If a teaching method is provided, draw THAT representation. Do not redraw a failed method listed under do_not_repeat.
- No fetch, eval, parent, cookies, or HTML.
"""

CONTINUE_PROMPT = """Continue this JavaScript canvas sketch from the exact cutoff. Output ONLY the remaining JavaScript. No markdown. No HTML.
Do not repeat lines that are already finished. If the last line is incomplete, finish that line first, then close every open function and brace. Prefer V.* helpers.
"""

ARTIFACT_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; height: 100%; background: #f4efe6; }
    .stage { display: flex; flex-direction: column; height: 100%; }
    canvas { flex: 1; width: 100%; display: block; background: #fff; min-height: 320px; }
    .bar {
      display: flex; gap: 10px; align-items: center; flex-shrink: 0;
      padding: 10px 14px; border-top: 1px solid #d7cfc3; background: #fff;
      font: 14px/1.4 ui-sans-serif, system-ui, sans-serif; color: #3d5166;
    }
    button { appearance: none; border: 0; border-radius: 9px; padding: 8px 14px; font: inherit; cursor: pointer; }
    #play { background: #1b6ca8; color: #fff; }
    #reset { background: #f6f1e8; border: 1px solid #d7cfc3; }
    .wait {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; color: #5a6b7c; font: 15px/1.4 ui-sans-serif, system-ui, sans-serif;
    }
    .spin {
      width: 28px; height: 28px; border: 3px solid #d7cfc3; border-top-color: #1b6ca8;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="stage">
    <canvas id="c"></canvas>
    <div class="bar">
      <button type="button" id="play">Play</button>
      <button type="button" id="reset">Reset</button>
      <span id="cap"></span>
    </div>
  </div>
  <script>__ROUGH__</script>
  <script>__RUNTIME__</script>
  <script>
    VisualRuntime.mount(
      document.getElementById("c"),
      document.getElementById("play"),
      document.getElementById("reset"),
      document.getElementById("cap"),
      function (V) {
__SKETCH__
      }
    );
  </script>
</body>
</html>
"""

SHELL_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  __REFRESH__
  <title>__TITLE__ — interactive lesson</title>
  <style>
    :root {
      --ink: #1a2b3c; --ink-soft: #5a6b7c; --paper: #f6f1e8;
      --accent: #1b6ca8; --line: #d7cfc3; --think: #6d7d8c;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; color: var(--ink); background: var(--paper); }
    main { max-width: 880px; margin: 0 auto; padding: 28px 20px 56px; display: grid; gap: 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    p { margin: 0 0 10px; }
    .muted { color: var(--ink-soft); font-size: 0.92rem; }
    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; }
    .goal { background: #d4e8f6; color: #0f4f7c; border-radius: 12px; padding: 10px 12px; }
    button { appearance: none; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 12px; font: inherit; cursor: pointer; }
    .think { border-style: dashed; }
    .think-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .think-label { color: var(--think); font-size: 0.86rem; font-weight: 600; letter-spacing: 0.02em; }
    #think-stream { margin: 0; white-space: pre-wrap; color: var(--think); font: 0.95rem/1.55 ui-sans-serif, system-ui, sans-serif; min-height: 4.5em; }
    .beats { margin: 8px 0 0; padding-left: 1.2rem; color: var(--ink-soft); }
    .beats li { margin: 0 0 4px; }
    .wait {
      min-height: 280px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 12px;
      color: var(--ink-soft); border: 1px dashed var(--line); border-radius: 12px;
      background: #fbf8f1;
    }
    .hidden, .wait.hidden, iframe.hidden { display: none !important; }
    iframe.artifact {
      width: 100%; height: 540px; border: 1px solid var(--line);
      border-radius: 12px; background: #fff;
    }
    .spin {
      width: 28px; height: 28px; border: 3px solid var(--line); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sources a { color: var(--accent); }
    .sources li { margin: 0 0 8px; }
    details.code { margin-top: 12px; color: var(--ink-soft); font-size: 0.9rem; }
    details.code pre {
      margin: 10px 0 0; max-height: 280px; overflow: auto;
      background: #1a2b3c; color: #e8eef4; padding: 12px; border-radius: 10px;
      font: 12px/1.4 ui-monospace, Consolas, monospace; white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <main>
    <section class="card think">
      <div class="think-head">
        <div class="think-label" id="think-status">Thinking</div>
        <button type="button" id="skip-think">Skip</button>
      </div>
      <p id="think-stream"></p>
      <ol class="beats" id="beats"></ol>
    </section>
    <section class="card hidden" id="research-card">
      <p class="muted">Looked up</p>
      <p id="components" class="muted"></p>
      <ol class="sources" id="sources"></ol>
    </section>
    <section class="card hidden" id="lesson-copy">
      <p class="muted">Interactive visual lesson</p>
      <h1>__TITLE__</h1>
      <p>__SAY__</p>
      <p class="goal">__GOAL__</p>
    </section>
    <section class="card hidden" id="visual-card">
      <p class="muted" id="picture"></p>
      <div class="wait __WAIT_CLASS__" id="visual-wait">
        <div class="spin" aria-hidden="true"></div>
        <p>Drawing the visual from code…</p>
        <p class="muted" id="wait-detail"></p>
      </div>
      <iframe class="artifact __FRAME_CLASS__" id="artifact" sandbox="allow-scripts" title="Generated visual"></iframe>
      <details class="code __CODE_CLASS__" id="code-wrap">
        <summary>Visual code</summary>
        <pre id="visual-code"></pre>
      </details>
    </section>
  </main>
  <script id="data" type="application/json">__PAYLOAD__</script>
  <script>
    const data = JSON.parse(document.getElementById("data").textContent);
    const thinking = (data.thinking || "").replace(/\*\*/g, "");
    const beats = data.beats || [];
    const thinkEl = document.getElementById("think-stream");
    const beatsEl = document.getElementById("beats");
    const skipBtn = document.getElementById("skip-think");
    const thinkStatus = document.getElementById("think-status");
    const lessonCopy = document.getElementById("lesson-copy");
    const visualCard = document.getElementById("visual-card");
    const pictureEl = document.getElementById("picture");
    const frame = document.getElementById("artifact");
    const codeEl = document.getElementById("visual-code");
    const sourcesEl = document.getElementById("sources");
    const researchCard = document.getElementById("research-card");
    const componentsEl = document.getElementById("components");

    const waitEl = document.getElementById("visual-wait");
    const waitDetail = document.getElementById("wait-detail");
    const codeWrap = document.getElementById("code-wrap");

    function decodeVisual(b64) {
      const bin = atob(b64 || "");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }

    function showBeats() {
      beatsEl.innerHTML = "";
      beats.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        beatsEl.appendChild(li);
      });
    }

    function showSources() {
      const sources = data.sources || [];
      const components = data.components || [];
      if (!sources.length && !components.length) return;
      researchCard.classList.remove("hidden");
      componentsEl.textContent = components.length
        ? "Components: " + components.join(", ")
        : "";
      sources.forEach((src) => {
        const li = document.createElement("li");
        if (src.url) {
          const a = document.createElement("a");
          a.href = src.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = src.title || src.url;
          li.appendChild(a);
        } else {
          li.textContent = src.title || "Summary";
        }
        if (src.excerpt) {
          const p = document.createElement("div");
          p.className = "muted";
          p.textContent = src.excerpt.slice(0, 220);
          li.appendChild(p);
        }
        sourcesEl.appendChild(li);
      });
    }

    function reveal() {
      thinkStatus.textContent = "Thought";
      skipBtn.hidden = true;
      showBeats();
      showSources();
      lessonCopy.classList.remove("hidden");
      visualCard.classList.remove("hidden");
      pictureEl.textContent = data.picture || "Generated visual";
      waitDetail.textContent = (data.components || []).join(", ");
      if (data.status === "loading" || !data.visual_b64) {
        waitEl.classList.remove("hidden");
        waitEl.removeAttribute("hidden");
        frame.classList.add("hidden");
        codeWrap.classList.add("hidden");
        return;
      }
      waitEl.classList.add("hidden");
      waitEl.setAttribute("hidden", "");
      frame.classList.remove("hidden");
      codeWrap.classList.remove("hidden");
      const html = decodeVisual(data.visual_b64);
      codeEl.textContent = data.sketch || html;
      frame.srcdoc = html;
    }

    function streamThought() {
      if (data.status === "loading") {
        thinkEl.textContent = thinking || "Looking up the idea, then drawing it.";
        reveal();
        return;
      }
      if (!thinking) { thinkEl.textContent = "No thinking text for this lesson."; reveal(); return; }
      let i = 0;
      let done = false;
      const chunk = Math.max(3, Math.ceil(thinking.length / 180));
      function step() {
        if (done) return;
        i = Math.min(thinking.length, i + chunk);
        thinkEl.textContent = thinking.slice(0, i);
        if (i >= thinking.length) { done = true; reveal(); }
        else setTimeout(step, 18);
      }
      skipBtn.onclick = () => { done = true; thinkEl.textContent = thinking; reveal(); };
      step();
    }
    streamThought();
  </script>
</body>
</html>
"""


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError, ValueError):
            pass


def parse_diagnosis(raw: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip().lower()] = value.strip()
    return fields


def diagnosis_kind(fields: dict[str, str]) -> str:
    kind = fields.get("kind", "").lower()
    if "misconception" in kind:
        return "misconception"
    if "knowledge gap" in kind:
        return "knowledge_gap"
    if "actually correct" in kind:
        return "correct"
    if "not a learning" in kind:
        return "not_learning"
    if "slip" in kind:
        return "slip"
    return "unknown"


def clip(text: str, max_len: int) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def html_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def parse_thinking_trailer(raw: str) -> dict[str, Any]:
    title = ""
    picture = ""
    title_m = re.search(r"^TITLE:\s*(.+)$", raw, re.I | re.M)
    if title_m:
        title = clip(title_m.group(1), 80)
    pic_m = re.search(r"^PICTURE:\s*(.+)$", raw, re.I | re.M)
    if pic_m:
        picture = clip(pic_m.group(1), 160)
    beats: list[str] = []
    in_beats = False
    for line in raw.splitlines():
        if re.match(r"BEATS?:", line, re.I):
            in_beats = True
            continue
        if in_beats:
            item = re.sub(r"^[-*\d.)\s]+", "", line).strip()
            if item:
                beats.append(clip(item, 140))
    return {"title": title, "picture": picture, "beats": beats[:5]}


def fallback_thinking(fields: dict[str, str]) -> str:
    topic = fields.get("topic") or "this idea"
    wrong = fields.get("wrong model") or "the mix-up"
    right = fields.get("right model") or "what's true"
    return (
        f"The student is tangled up about {topic}. They seem to believe: {wrong} "
        f"What they need to see is: {right} "
        "Draw the actual stuff of the topic, not a graph, unless the idea is coordinates.\n\n"
        f"TITLE: {clip(topic, 60)}\n"
        f"PICTURE: a concrete scene for {clip(topic, 40)}\n"
        "BEATS:\n- the mix-up plays out\n- the true model does something else\n- the two endings differ"
    )


def say_from_thinking(thinking: str, fallback: str) -> str:
    body = re.sub(r"\*\*", "", thinking.split("TITLE:")[0]).strip()
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", body) if p.strip()]
    text = clip(" ".join(parts[:2]), 500) if len(parts) >= 2 else fallback
    if "press play" not in text.lower():
        text = clip(text.rstrip(".") + ". Press Play.", 500)
    return text


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
    ).lower()


def merge_sources(*groups: list[dict[str, str]]) -> list[dict[str, str]]:
    answers: list[dict[str, str]] = []
    rest: list[dict[str, str]] = []
    seen: set[str] = set()
    for group in groups:
        for src in group:
            url = src.get("url") or ""
            if not url:
                answers.append(dict(src))
                continue
            if url in seen:
                continue
            seen.add(url)
            rest.append(dict(src))
    out: list[dict[str, str]] = []
    for i, src in enumerate(answers[:2], start=1):
        src["id"] = f"A{i}"
        out.append(src)
    for src in rest:
        src["id"] = f"S{sum(1 for item in out if item['id'].startswith('S')) + 1}"
        out.append(src)
    return out


COMPONENT_HINTS = (
    (
        ("gradient", "descent", "loss surface", "contour", "bowl", "valley", "marble", "rosenbrock"),
        ["contour lines", "marble", "gradient arrow", "local minimum"],
    ),
    (
        ("projectile", "parabola", "gravity", "thrown ball", "free fall"),
        ["person", "ball", "parabola"],
    ),
    (
        ("photosynth", "chlorophyll", "stomata", "plant"),
        ["sun", "leaf", "light"],
    ),
    (
        ("eigen", "eigenvector", "eigenvalue", "linear map", "basis"),
        ["vector arrow", "axis", "transformed arrow"],
    ),
    (
        ("heat", "temperature", "thermometer", "kinetic energy"),
        ["beaker", "thermometer", "particles"],
    ),
)


def harvest_components(blob: str) -> list[str]:
    text = (blob or "").lower()
    picked: list[str] = []
    for hints, items in COMPONENT_HINTS:
        if any(hint in text for hint in hints):
            for item in items:
                if item not in picked:
                    picked.append(item)
    if not any(w in text for w in ("heat", "temperature", "thermo", "chemistry", "titration", "liquid", "beaker", "flask")):
        picked = [item for item in picked if item not in {"beaker", "flask"}]
    return picked


def allows_glass(components: list[str], extra: str = "") -> bool:
    text = " ".join(components).lower() + " " + extra.lower()
    return any(
        word in text
        for word in (
            "heat",
            "temp",
            "thermo",
            "chemistry",
            "beaker",
            "flask",
            "liquid",
            "titration",
            "boiling",
        )
    )


def research_topic(student: str, fields: dict[str, str]) -> list[dict[str, str]]:
    topic = clip(fields.get("topic") or student, 140)
    wrong = clip(fields.get("wrong model") or "", 100)
    right = clip(fields.get("right model") or "", 100)
    explain_q = (
        f"best explanation of {topic}. "
        f"Student thinks: {wrong or student}. "
        f"Correct idea: {right or topic}."
    )
    visual_q = (
        f"visual diagram animation metaphor objects to explain {topic} "
        f"classroom teaching illustration {wrong} {right}"
    )
    return merge_sources(
        websearch.search(explain_q, max_results=6),
        websearch.search(visual_q, max_results=6),
    )


def extract_components(fields: dict[str, str], sources: list[dict[str, str]]) -> list[str]:
    evidence = websearch.format_evidence(sources)
    harvested = harvest_components(topic_blob(fields, evidence))
    if not sources:
        return harvested
    try:
        raw = misconception.complete(
            EXTRACT_PROMPT,
            json.dumps(
                {
                    "topic": fields.get("topic") or "",
                    "wrong": fields.get("wrong model") or "",
                    "right": fields.get("right model") or "",
                    "research": evidence,
                },
                ensure_ascii=True,
            ),
            max_tokens=400,
            temperature=0.1,
        )
        data = extract_json(raw)
        components = [
            clip(str(item), 48)
            for item in (data.get("components") or [])
            if str(item).strip()
        ][:12]
        if not allows_glass(components, evidence):
            components = [
                item
                for item in components
                if "beaker" not in item.lower() and "flask" not in item.lower()
            ]
        merged: list[str] = []
        for item in components + harvested:
            if item and item not in merged:
                merged.append(item)
        return merged[:12]
    except (ValueError, RuntimeError, json.JSONDecodeError):
        return harvested


FORBIDDEN_JS = (
    "document.cookie",
    "localstorage",
    "sessionstorage",
    "indexeddb",
    "fetch(",
    "xmlhttprequest",
    "websocket",
    "window.parent",
    "eval(",
    "new function(",
    "import(",
    ".innerhtml",
    "document.write",
    "<script",
    "</script",
)


def extract_js(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:javascript|js|html)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text)
    if "<html" in text.lower() or "<canvas" in text.lower():
        match = re.search(r"<script[^>]*>([\s\S]+?)</script>", text, re.I)
        if match:
            text = match.group(1)
    return text.strip()


def sketch_is_safe(sketch: str) -> bool:
    low = sketch.lower()
    return not any(token in low for token in FORBIDDEN_JS)


def _js_open_counts(text: str) -> tuple[int, int, int]:
    braces = parens = brackets = 0
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if ch == "/" and nxt == "/":
            while i < n and text[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
            continue
        if ch in {'"', "'", "`"}:
            quote = ch
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == quote:
                    i += 1
                    break
                i += 1
            continue
        if ch == "{":
            braces += 1
        elif ch == "}":
            braces -= 1
        elif ch == "(":
            parens += 1
        elif ch == ")":
            parens -= 1
        elif ch == "[":
            brackets += 1
        elif ch == "]":
            brackets -= 1
        i += 1
    return braces, parens, brackets


def sketch_is_truncated(sketch: str, finish_reason: str = "") -> bool:
    text = (sketch or "").strip()
    if not text:
        return True
    braces, parens, brackets = _js_open_counts(text)
    if braces != 0 or parens != 0 or brackets != 0:
        return True
    last = ""
    for line in reversed(text.splitlines()):
        stripped = line.strip()
        if stripped and not stripped.startswith("//"):
            last = stripped
            break
    if last and last[-1] not in ";})":
        return True
    reason = (finish_reason or "").strip().lower()
    if reason in {"length", "max_tokens", "max_completion_tokens"} and not text.rstrip().endswith(";"):
        return True
    return False


def sketch_looks_complete(sketch: str, finish_reason: str = "") -> bool:
    text = sketch or ""
    return "V.draw" in text and len(text) >= 120 and not sketch_is_truncated(text, finish_reason)


def stitch_sketch(head: str, extra: str) -> str:
    piece = extract_js(extra)
    if not piece:
        return head
    if "V.draw" in piece and not sketch_is_truncated(piece):
        return piece
    head_r = (head or "").rstrip()
    if not head_r:
        return piece
    if head_r.endswith((";", "}", "{", ")")):
        return head_r + "\n" + piece.lstrip()
    return head_r + piece.lstrip()


def normalize_sketch(sketch: str) -> str:
    text = (sketch or "").strip()
    if not text:
        return text
    if "V.draw" not in text and any(token in text for token in ("V.pane", "V.ball", "V.arrow", "V.ctx", "V.hill")):
        text = "V.draw = function (t) {\n" + text + "\n};"
    if "V.leftTitle" not in text:
        text = 'V.leftTitle = "What you think";\nV.rightTitle = "What\'s true";\n' + text
    return text


def fallback_sketch(fields: dict[str, str], thinking: str = "", components: list[str] | None = None) -> str:
    blob = topic_blob(fields, thinking + " " + " ".join(components or []))
    wrong = json.dumps(clip(fields.get("wrong model") or "mix-up", 36), ensure_ascii=True)
    right = json.dumps(clip(fields.get("right model") or "true", 36), ensure_ascii=True)
    if any(w in blob for w in ("gradient", "descent", "loss function", "bowl", "marble", "contour")):
        return r"""
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "Same start. Watch the path.";
V.captionAfter = "Straight to the min cuts across. Descent follows the slope.";
V.draw = function (t) {
  const L = V.pane("left");
  const R = V.pane("right");
  V.hill(L);
  V.hill(R);
  const straight = [[0.18, 0.22], [0.84, 0.55]];
  const slope = [[0.18, 0.22], [0.28, 0.42], [0.34, 0.3], [0.48, 0.52], [0.55, 0.38], [0.68, 0.58], [0.76, 0.5], [0.84, 0.55]];
  V.curve(L, straight, "#c45e1a");
  V.curve(R, slope, "#1b6ca8");
  const a = V.along(straight, t);
  const b = V.along(slope, t);
  const pL = V.xy(L, a.x, a.y);
  const pR = V.xy(R, b.x, b.y);
  V.ball(pL.x, pL.y, "#c45e1a", 9);
  V.ball(pR.x, pR.y, "#1b6ca8", 9);
  V.label(pL.x, pL.y - 14, "straight to min", 130);
  V.label(pR.x, pR.y - 14, "follow the slope", 130);
};
""".strip()
    if any(w in blob for w in ("heat", "temp", "thermo", "boiling")):
        return r"""
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "Same word, two ideas";
V.captionAfter = "Heat flows. Temperature is how fast particles jiggle.";
V.draw = function (t) {
  const L = V.pane("left");
  const R = V.pane("right");
  const cup = V.xy(L, 0.4, 0.78);
  V.beaker(cup.x, cup.y, { fill: 0.55, liquid: "#7eb6e8" });
  V.thermometer(V.xy(L, 0.78, 0.72).x, V.xy(L, 0.78, 0.72).y, 0.7);
  V.label(cup.x, cup.y - 130, "Heat = temperature", 160);
  const hot = V.xy(R, 0.28, 0.78);
  const cold = V.xy(R, 0.72, 0.78);
  V.beaker(hot.x, hot.y, { fill: 0.6, liquid: "#f4a261" });
  V.beaker(cold.x, cold.y, { fill: 0.6, liquid: "#8ecae6" });
  V.dots(hot.x, hot.y - 70, 14, 2.6 - t, "#c45e1a");
  V.dots(cold.x, cold.y - 70, 14, 0.4 + t * 1.4, "#1b6ca8");
  V.thermometer(V.xy(R, 0.12, 0.62).x, V.xy(R, 0.12, 0.62).y, 0.85 - t * 0.25);
  V.thermometer(V.xy(R, 0.9, 0.62).x, V.xy(R, 0.9, 0.62).y, 0.18 + t * 0.25);
  V.arrow(hot.x + 30, hot.y - 80, cold.x - 30, cold.y - 80, "#c45e1a");
  V.label((hot.x + cold.x) / 2, hot.y - 150, "heat flows", 110);
};
""".strip()
    if any(w in blob for w in ("gravity", "throw", "projectile", "parabola")):
        return r"""
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "Throw both balls";
V.captionAfter = "Only the true side comes back down";
V.draw = function (t) {
  const L = V.pane("left");
  const R = V.pane("right");
  V.person(V.xy(L, 0.22, 0.88).x, V.xy(L, 0.22, 0.88).y);
  V.person(V.xy(R, 0.22, 0.88).x, V.xy(R, 0.22, 0.88).y);
  const up = [[0.32, 0.72], [0.55, 0.28], [0.82, 0.08]];
  const arc = [[0.32, 0.72], [0.52, 0.22], [0.7, 0.82]];
  V.curve(L, up, "#c45e1a");
  V.curve(R, arc, "#1b6ca8");
  const a = V.along(up, t);
  const b = V.along(arc, t);
  const pL = V.xy(L, a.x, a.y);
  const pR = V.xy(R, b.x, b.y);
  V.ball(pL.x, pL.y, "#c45e1a", 9);
  V.ball(pR.x, pR.y, "#1b6ca8", 9);
};
""".strip()
    if any(w in blob for w in ("eigen", "vector", "matrix")):
        return r"""
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "Any arrow?";
V.captionAfter = "Only some arrows keep their line.";
V.draw = function (t) {
  const L = V.pane("left");
  const R = V.pane("right");
  V.axes(L, "x", "y");
  V.axes(R, "x", "y");
  const oL = V.xy(L, 0.28, 0.7);
  const oR = V.xy(R, 0.28, 0.7);
  V.arrow(oL.x, oL.y, V.xy(L, 0.7, 0.35).x, V.xy(L, 0.7, 0.35).y, "#c45e1a");
  V.arrow(oL.x, oL.y, V.xy(L, 0.78, 0.62).x, V.xy(L, 0.78, 0.62).y, "#5a6b7c", true);
  V.label(V.xy(L, 0.72, 0.28).x, V.xy(L, 0.72, 0.28).y, "any arrow", 100);
  const keep = V.xy(R, 0.28 + 0.4 * t, 0.7 - 0.02 * t);
  const spin = V.xy(R, 0.28 + 0.32 * Math.cos(t * 1.2), 0.7 - 0.28 * Math.sin(t * 1.2 + 0.4));
  V.arrow(oR.x, oR.y, keep.x, keep.y, "#1b6ca8");
  V.arrow(oR.x, oR.y, spin.x, spin.y, "#c45e1a", true);
  V.label(keep.x, keep.y - 8, "stays on its line", 130);
  V.label(spin.x, spin.y - 8, "rotates away", 110);
};
""".strip()
    return f"""
V.leftTitle = "What you think";
V.rightTitle = "What's true";
V.captionBefore = "Press Play";
V.captionAfter = "The two sides do not match";
V.draw = function (t) {{
  const L = V.pane("left");
  const R = V.pane("right");
  V.label(V.xy(L, 0.5, 0.18).x, V.xy(L, 0.18, 0.18).y, {wrong}, 160);
  V.label(V.xy(R, 0.5, 0.18).x, V.xy(R, 0.18, 0.18).y, {right}, 160);
  const a = V.xy(L, 0.25, 0.6);
  const b = V.xy(L, 0.78, 0.6);
  V.arrow(a.x, a.y, b.x, b.y, "#c45e1a");
  const c = V.xy(R, 0.25, 0.62);
  const d = V.xy(R, 0.55 + 0.25 * t, 0.35 + 0.3 * t);
  V.arrow(c.x, c.y, d.x, d.y, "#1b6ca8");
}};
""".strip()


def runtime_source() -> str:
    return (BACKEND / "visual_runtime.js").read_text(encoding="utf-8")


def rough_source() -> str:
    return (BACKEND / "rough.js").read_text(encoding="utf-8").replace("</", "<\\/")


def build_artifact(sketch: str) -> str:
    body = (sketch or "").replace("</", "<\\/")
    return (
        ARTIFACT_TEMPLATE.replace("__ROUGH__", rough_source())
        .replace("__RUNTIME__", runtime_source())
        .replace("__SKETCH__", body)
    )


def think_aloud(
    student: str,
    diagnosis: str,
    fields: dict[str, str],
    research: str = "",
    components: list[str] | None = None,
    strategy: str = "",
    previous_strategy: str = "",
) -> str:
    try:
        raw = misconception.complete(
            THINK_PROMPT,
            json.dumps(
                {
                    "student": student,
                    "diagnosis": diagnosis,
                    "web_research": research or "(no web results — use the diagnosis carefully)",
                    "visual_components": components or [],
                    "teaching_method": strategy or "",
                    "do_not_repeat": previous_strategy or "",
                },
                ensure_ascii=True,
            ),
            max_tokens=1400,
            temperature=0.35,
            timeout=60,
        )
        text = (raw or "").strip()
        if len(text) < 60:
            return fallback_thinking(fields)
        return text
    except (ValueError, RuntimeError):
        return fallback_thinking(fields)


def _complete_js(system: str, user: str, *, max_tokens: int) -> tuple[str, str]:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            return misconception.complete_result(
                system,
                user,
                max_tokens=max_tokens,
                temperature=0.25,
                timeout=90,
            )
        except (ValueError, RuntimeError) as error:
            last_error = error
            err = str(error).lower()
            if attempt == 0 and ("429" in err or "rate limit" in err):
                print("Visual model is busy — retrying in a few seconds…", flush=True)
                time.sleep(5)
                continue
            break
    raise last_error or RuntimeError("Visual code generation failed.")


def continue_sketch(sketch: str) -> tuple[str, str]:
    tail = "\n".join((sketch or "").splitlines()[-80:])
    user = (
        "The sketch stopped mid-way. Finish it from the cutoff.\n\n"
        "```javascript\n"
        f"{tail}\n"
        "```"
    )
    return _complete_js(CONTINUE_PROMPT, user, max_tokens=1400)


def generate_sketch(
    student: str,
    diagnosis: str,
    fields: dict[str, str],
    thinking: str,
    research: str = "",
    components: list[str] | None = None,
    strategy: str = "",
    previous_strategy: str = "",
) -> str:
    fallback = fallback_sketch(fields, thinking, components)
    try:
        raw, reason = _complete_js(
            VISUAL_PROMPT,
            json.dumps(
                {
                    "student": student,
                    "diagnosis": clip(diagnosis, 800),
                    "thinking": clip(thinking, 1200),
                    "must_draw": components or [],
                    "web_research": clip(research, 1800),
                    "teaching_method": clip(strategy, 700),
                    "do_not_repeat": clip(previous_strategy, 500),
                },
                ensure_ascii=True,
            ),
            max_tokens=3500,
        )
    except (ValueError, RuntimeError):
        print("Visual code generation failed. Using a fallback drawing.", flush=True)
        return fallback
    sketch = normalize_sketch(extract_js(raw))
    for _ in range(2):
        if not sketch_is_truncated(sketch, reason):
            break
        print("Visual code was cut off — finishing it…", flush=True)
        try:
            extra, reason = continue_sketch(sketch)
        except (ValueError, RuntimeError):
            break
        raw = (raw or "") + "\n" + extra
        sketch = normalize_sketch(stitch_sketch(sketch, extra))
    if not sketch_is_safe(sketch) or not sketch_looks_complete(sketch):
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        try:
            (OUT_DIR / "last-visual-attempt.js").write_text(raw or "", encoding="utf-8")
        except OSError:
            pass
        print("Visual model code was incomplete — using a fallback drawing.", flush=True)
        return fallback
    blob = topic_blob(fields, thinking)
    if not allows_glass(components or [], blob) and re.search(r"\bbeaker\b|\bflask\b", sketch, re.I):
        print("Visual model defaulted to glass — using a fallback drawing.", flush=True)
        return fallback
    return sketch


def lesson_meta(fields: dict[str, str], thinking: str) -> dict[str, Any]:
    trailer = parse_thinking_trailer(thinking)
    topic = fields.get("topic") or "this idea"
    confused = fields.get("what's confused") or fields.get("whats confused") or topic
    return {
        "title": trailer["title"] or clip(topic, 60),
        "say": say_from_thinking(thinking, clip(f"{confused} Press Play.", 500)),
        "goal": clip(
            trailer["beats"][-1] if trailer["beats"] else "After Play, the two pictures disagree.",
            180,
        ),
        "picture": trailer["picture"] or clip(topic, 80),
        "beats": trailer["beats"],
    }


def render_html(
    meta: dict[str, Any],
    diagnosis: str,
    student: str,
    thinking: str,
    visual: str = "",
    sources: list[dict[str, str]] | None = None,
    components: list[str] | None = None,
    sketch: str = "",
    status: str = "ready",
) -> str:
    payload = json.dumps(
        {
            "status": status,
            "thinking": thinking,
            "beats": meta.get("beats") or [],
            "picture": meta.get("picture") or "",
            "visual_b64": base64.b64encode(visual.encode("utf-8")).decode("ascii") if visual else "",
            "sketch": sketch,
            "student": student,
            "diagnosis": diagnosis,
            "sources": [
                {
                    "id": src.get("id") or "",
                    "title": src.get("title") or "",
                    "url": src.get("url") or "",
                    "excerpt": src.get("excerpt") or "",
                }
                for src in (sources or [])
            ],
            "components": components or [],
        },
        ensure_ascii=True,
    )
    refresh = '<meta http-equiv="refresh" content="2" />' if status == "loading" else ""
    wait_class = "" if status == "loading" else "hidden"
    frame_class = "hidden" if status == "loading" else ""
    return (
        SHELL_TEMPLATE.replace("__TITLE__", html_escape(meta["title"]))
        .replace("__SAY__", html_escape(meta["say"]))
        .replace("__GOAL__", html_escape(meta["goal"]))
        .replace("__REFRESH__", refresh)
        .replace("__WAIT_CLASS__", wait_class)
        .replace("__FRAME_CLASS__", frame_class)
        .replace("__CODE_CLASS__", frame_class)
        .replace("__PAYLOAD__", payload)
    )


def write_lesson(html: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html, encoding="utf-8")
    return dest


def teach(
    student: str,
    *,
    dest: Path | None = None,
    open_browser: bool = True,
    diagnosis: str | None = None,
    strategy: str | None = None,
    previous_strategy: str | None = None,
) -> str:
    text = misconception.validate_input(student)
    diagnosis = (diagnosis or "").strip() or misconception.detect(text)
    fields = parse_diagnosis(diagnosis)
    kind = diagnosis_kind(fields)
    method = (strategy or "").strip()
    failed = (previous_strategy or "").strip()

    if kind in {"correct", "not_learning", "slip"}:
        reason = {
            "correct": "No visual lesson — the student already has the right model.",
            "not_learning": "No visual lesson — that was not a learning statement.",
            "slip": "No visual lesson — that reads as a slip, not a stable mix-up.",
        }[kind]
        return f"{diagnosis}\n\n{reason}"

    sources = research_topic(text, fields)
    evidence = websearch.format_evidence(sources)
    components = extract_components(fields, sources)
    thinking = think_aloud(
        text,
        diagnosis,
        fields,
        evidence,
        components,
        strategy=method,
        previous_strategy=failed,
    )
    meta = lesson_meta(fields, thinking)
    path = dest or OUT_DIR / "interactive-lesson.html"
    write_lesson(
        render_html(
            meta,
            diagnosis,
            text,
            thinking,
            "",
            sources,
            components,
            status="loading",
        ),
        path,
    )
    print("Visual is generating — the page will refresh when the drawing code is ready.", flush=True)
    if open_browser:
        webbrowser.open(path.resolve().as_uri())
    print("Writing visual code…", flush=True)
    sketch = generate_sketch(
        text,
        diagnosis,
        fields,
        thinking,
        evidence,
        components,
        strategy=method,
        previous_strategy=failed,
    )
    visual = build_artifact(sketch)
    write_lesson(
        render_html(
            meta,
            diagnosis,
            text,
            thinking,
            visual,
            sources,
            components,
            sketch,
            "ready",
        ),
        path,
    )

    beats = "\n".join(f"- {b}" for b in meta.get("beats") or [])
    looked = "\n".join(
        f"- [{src.get('id')}] {src.get('title')}" for src in sources[:8]
    ) or "- (no Tavily results — check TAVILY_API_KEY)"
    return (
        f"{diagnosis}\n\n"
        f"Research\n--------\n{looked}\n"
        f"Components: {', '.join(components) or '(none)'}\n\n"
        f"Thinking\n--------\n{thinking}\n\n"
        f"Plan\n----\n{beats or '- (no beats)'}\n\n"
        f"Lesson: {meta['title']}\n"
        f"Picture: {meta['picture']}\n"
        f"Method: {clip(method, 160) or 'split-pane contrast'}\n"
        f"Visual: generated drawing code ({len(sketch)} chars)\n"
        f"{meta['say']}\n"
        f"Open: {path}"
    )


def self_test() -> str:
    lines = ["Self-test (local, no model call):"]
    try:
        misconception.validate_input("")
        lines.append("- empty: FAIL")
    except ValueError:
        lines.append("- empty: ok")

    fields = parse_diagnosis(
        "Topic: heat vs temperature\nKind: misconception\nWhat's confused: they are the same\n"
        "Wrong model: heat is temperature\nRight model: heat is energy; temperature is average kinetic energy"
    )
    thinking = fallback_thinking(fields)
    heat = fallback_sketch(fields, thinking)
    visual = build_artifact(heat)
    meta = lesson_meta(fields, thinking)
    loading = render_html(
        meta,
        "Kind: misconception",
        "heat is temperature",
        thinking,
        "",
        sources=[{"id": "S1", "title": "Example", "url": "https://example.edu", "excerpt": "Heat is energy."}],
        components=["beaker", "thermometer"],
        status="loading",
    )
    html = render_html(
        meta,
        "Kind: misconception",
        "heat is temperature",
        thinking,
        visual,
        sources=[{"id": "S1", "title": "Example", "url": "https://example.edu", "excerpt": "Heat is energy."}],
        components=["beaker", "thermometer"],
        sketch=heat,
        status="ready",
    )
    checks = ["think-stream", "Skip", 'id="artifact"', "sandbox", "Visual code", "srcdoc", "research-card", "visual-wait"]
    missing = [c for c in checks if c not in html]
    lines.append("- html think+artifact: ok" if not missing else f"- html missing {missing}")
    if ".wait.hidden" in html or "display: none !important" in html:
        lines.append("- wait spinner can hide: ok")
    else:
        lines.append("- FAIL wait spinner css")
    if "http-equiv" in loading and "Drawing the visual" in loading:
        lines.append("- loading page waits and refreshes: ok")
    else:
        lines.append("- FAIL loading page")
    if "V.beaker" in heat and "V.thermometer" in heat and "V.dots" in heat:
        lines.append("- heat fallback draws beaker/thermometer/particles: ok")
    else:
        lines.append("- FAIL heat sketch")
    if 'id="play"' in visual and "VisualRuntime" in visual and "var rough=" in visual:
        lines.append("- generated artifact is playable with Rough.js: ok")
    else:
        lines.append("- FAIL runtime artifact")
    gd = fallback_sketch(
        parse_diagnosis(
            "Topic: gradient descent\nKind: misconception\nWhat's confused: always goes straight to the min\n"
            "Wrong model: move directly toward the minimum\nRight model: follow the local slope"
        ),
        "marble rolling on a curved bowl",
        ["contour lines", "marble"],
    )
    if "V.hill" in gd and "V.ball" in gd and "beaker" not in gd:
        lines.append("- gradient descent sketch uses a hill and marble: ok")
    else:
        lines.append("- FAIL gd sketch")
    generic = fallback_sketch(
        parse_diagnosis(
            "Topic: eigenvectors\nKind: misconception\nWhat's confused: they are just arrows\n"
            "Wrong model: any arrow is an eigenvector\nRight model: only directions that stay on their line"
        )
    )
    if "beaker" in generic or "flask" in generic:
        lines.append("- FAIL generic reused glass")
    elif "V.arrow" in generic:
        lines.append("- generic fallback uses arrows, not glass: ok")
    else:
        lines.append("- FAIL generic sketch")
    gd_bits = harvest_components("gradient descent marble on a contour bowl")
    if set(gd_bits) >= {"contour lines", "marble"}:
        lines.append("- harvest components for gradient descent: ok")
    else:
        lines.append(f"- FAIL harvest gd={gd_bits}")
    heat_bits = harvest_components("heat vs temperature thermometer kinetic energy")
    if "beaker" in heat_bits and "thermometer" in heat_bits:
        lines.append("- harvest components for heat includes glass on purpose: ok")
    else:
        lines.append(f"- FAIL harvest heat={heat_bits}")
    fenced = extract_js("```javascript\nV.draw = function (t) { V.ball(1, 2); }\n```")
    if "V.draw" in fenced and "```" not in fenced:
        lines.append("- extract js from fences: ok")
    else:
        lines.append("- FAIL extract js")
    cut = (
        'V.leftTitle = "What you think";\n'
        "V.draw = function (t) {\n"
        '  const L = V.pane("left");\n'
        "  const ay = V.lerp(mrnaPos.y, ribPos"
    )
    if sketch_is_truncated(cut) and not sketch_looks_complete(cut):
        lines.append("- truncated sketch detected: ok")
    else:
        lines.append("- FAIL truncated sketch slipped through")
    finished_cut = stitch_sketch(cut, "Pos.y, phase2);\n  V.ball(1, 2);\n};\n")
    if sketch_looks_complete(finished_cut) and "ribPosPos.y" in finished_cut:
        lines.append("- truncated sketch can be stitched: ok")
    else:
        lines.append("- FAIL stitch continuation")
    done = (
        'V.leftTitle = "What you think";\nV.rightTitle = "What\'s true";\n'
        'V.draw = function (t) {\n  const L = V.pane("left");\n  V.ball(10, 10, "#000", 6);\n};'
    )
    if sketch_looks_complete(done) and not sketch_is_truncated(done, "stop"):
        lines.append("- finished sketch accepted: ok")
    else:
        lines.append("- FAIL finished sketch rejected")
    if not sketch_is_safe("V.draw = function (t) { fetch('https://x'); }"):
        lines.append("- unsafe sketch blocked: ok")
    else:
        lines.append("- FAIL unsafe sketch allowed")
    if json.dumps(thinking)[1:-1] in html:
        lines.append("- thinking embedded: ok")
    else:
        lines.append("- FAIL thinking embed")
    if "strategy" in teach.__code__.co_varnames and "previous_strategy" in teach.__code__.co_varnames:
        lines.append("- teach can switch methods: ok")
    else:
        lines.append("- FAIL teach missing strategy")
    lines.append(f"- skip when correct: {diagnosis_kind({'kind': 'actually correct'})}")
    return "\n".join(lines)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect a misconception, think, then generate a visual artifact.",
    )
    parser.add_argument("text", nargs="*", help="Student statement")
    parser.add_argument("--file", "-f", help="Read student text from a file")
    parser.add_argument("--out", help="HTML output path")
    parser.add_argument("--no-open", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def read_student_text(args: argparse.Namespace) -> str:
    if args.file:
        path = Path(args.file)
        if not path.is_file():
            raise ValueError(f"File not found: {path}")
        return path.read_text(encoding="utf-8")
    if args.text:
        return " ".join(args.text)
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise ValueError("No input. Pass text, --file, or pipe stdin.")


def main(argv: list[str] | None = None) -> int:
    misconception.load_env()
    configure_stdio()
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        if args.self_test:
            print(self_test())
            return 0
        print(
            teach(
                read_student_text(args),
                dest=Path(args.out) if args.out else None,
                open_browser=not args.no_open,
            )
        )
        return 0
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
