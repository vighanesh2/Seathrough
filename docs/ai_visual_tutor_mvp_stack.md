# AI Visual Tutor MVP: Recommended Architecture and Libraries

For an MVP that feels smooth and avoids messy or inaccurate drawings, build a **visual-router system** rather than relying on one library to draw everything. The strongest setup is **Deepgram for voice, Groq for lesson planning, tldraw for the board, GSAP for live drawing, and specialized renderers for each type of concept**.

## Recommended MVP Stack

| Responsibility | Tool |
|---|---|
| Voice narration (+ STT / interruptions later) | **Deepgram** Aura TTS (STT when mic lands) |
| Lesson planning / tool-style visual intents | **Groq** (`llama-3.3-70b-versatile`) via OpenAI-compatible SDK |
| Whiteboard, zoom, pan, selection, and canvas state | `tldraw` |
| Programmatic cursor control | `@tldraw/driver` |
| Smooth SVG drawing and cursor movement | `gsap` + MotionPath (DrawSVG-style dashoffset; Club DrawSVG optional later) |
| Flowcharts and process diagrams | `@tldraw/mermaid` |
| Complex automatic graph layout | `elkjs` |
| Math graphs and interactive simulations | `mafs` (panel; expand per domain) |
| Formulas and equations | `katex` |
| Hand-drawn arrows, circles, and highlights | `roughjs` |
| Lesson sequencing and interruption control | `xstate` |
| Command validation | `zod` |
| Recognizable real-world objects | Curated, anchor-aware SVG library (`src/lib/visuals/assets`) |

## 1. Use Deepgram for the Voice Tutor (not OpenAI Realtime)

- **TTS:** Deepgram Aura-2 — narrate each beat (already wired in `/api/lesson/stream`).
- **STT / barge-in (next):** Deepgram live transcription; on interrupt → XState `interrupted`, kill GSAP timeline, stop Aura playback.
- **Brain:** Groq plans beats + `visual` tool payloads. Deepgram is ears/mouth only.

## 2. Use tldraw as the Board, Not the Visual Brain

tldraw manages zoom/pan/selection/board state. Main illustrations come from deterministic renderers (templates, KaTeX, Mermaid). Do not freehand complex objects.

## 3. Use GSAP for Live Drawing Animation

`TemplateStage` reveals curated SVG paths with stroke-dashoffset and moves a virtual cursor with MotionPath — same feel as DrawSVG without the Club plugin.

## 4. Visual Router

```text
Formula                  → KaTeX
Coordinate graph         → Mafs panel
Flowchart or process     → @tldraw/mermaid
Real-world object        → Curated SVG template (anchors)
Teacher annotation       → Rough / light write
```

Implementation: `src/lib/visuals/router.ts`

## 5. Curated SVG Library (anchors)

Seed assets in `src/lib/visuals/assets/catalog.ts`:

- `airplane-side-view`
- `horse-rider`
- `classroom-blueprint`
- `hexagon-shape`
- `heart-simple`
- `stack-plates`
- `loop-cycle`

AI labels **anchors** (`saddle`, `wing`, …) — never invents raw coordinates for object parts.

## 6. Beats

Each beat: narration + optional `visual` plan → validate → animate → Deepgram speak → continue.

## 7. XState

`src/lib/lesson/machine.ts` states: idle → planning → validating → drawing → speaking → waiting_for_student → interrupted → error.

## Exact MVP Architecture

```text
Next.js + TypeScript
        ↓
Groq lesson plan (beats + visual intents)
        ↓
Visual Router
        ↓
┌────────────┬──────────┬───────────┬──────────────┐
│ SVG Asset  │ Mermaid  │ Mafs      │ KaTeX        │
│ Renderer   │ Diagrams │ Graphs    │ Equations    │
└────────────┴──────────┴───────────┴──────────────┘
        ↓
GSAP path reveal + MotionPath cursor
        ↓
tldraw Board (+ @tldraw/driver)
        ↓
Deepgram Aura TTS
        ↓
XState coordinates the lesson
```

## Suggested Installation

```bash
npm install \
  tldraw \
  @tldraw/driver \
  @tldraw/mermaid \
  gsap \
  elkjs \
  mafs \
  katex \
  roughjs \
  xstate \
  @xstate/react \
  zod
```

Voice: Deepgram API key only (no OpenAI Realtime). Planning: Groq API key.

## Recommended MVP Scope

Teach **selected concepts extremely well** with accurate curated visuals — then grow the asset catalog subject by subject. Iconify remains optional for UI symbols, not primary lesson art.
