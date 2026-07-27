# UI/UX research notes (build direction)

## Patterns we adopted
- **Dual-pane / split screen** for simultaneous related content (design systems: Infor, TÜV split-panel). Left = teaching sketch, right = CLI tutor.
- **Resizable-ready layout** (IDE-style learning apps like SkillSync): equal columns on desktop; stack on mobile so neither pane becomes unreadable.
- **BookWidgets-style split whiteboard**: drawable/visual half + explanatory half in one lesson surface — no tab switching.
- **Lesson player controls** (Coursera-style education UX): play/pause, skip, speed (0.75x / 1x / 1.25x) — not decorative chrome.
- **TUI principles for the right pane**: spatial consistency, monospace hierarchy, semantic color, high information density without clutter.

## Visual direction (product-specific)
- Studio desk light shell (not purple SaaS, not cream+terracotta broadsheet).
- Chalkboard/sketch stage for diagrams (Rough.js later).
- Soft ink terminal for CLI tutor (CLI *style*, not a real shell).
- Fonts: **Syne** (brand/UI) + **IBM Plex Mono** (CLI/code).

## Explicit non-goals for UI
- System-design architecture diagrams as the default visual language.
- Photo image-gen stage.
- Dashboard chrome, stat strips, floating promo badges.
