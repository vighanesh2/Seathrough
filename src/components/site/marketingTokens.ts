/**
 * Landing design contract — classroom board / optical tutor.
 *
 * Surfaces: paper, chalk, board
 * Text:     ink, ink-soft, muted
 * Action:   accent, accent-deep (CTAs and links only)
 * Pen:      copper — max 1–2 uses per viewport (never chrome)
 * Live:     success (streaming / “explaining” dots only)
 *
 * Spacing:  section py-20/28, content gap-14/20
 * Radius:   containers 1.4rem, controls 0.95rem (intentionally different)
 *
 * Prefer Tailwind semantic classes from globals.css:
 *   text-ink, text-ink-soft, text-muted, text-accent, text-copper,
 *   bg-paper, bg-chalk, bg-board, border-board-edge
 * Do not invent one-off hex in marketing JSX.
 */

export const MARKETING = {
  radiusShell: "1.4rem",
  radiusControl: "0.95rem",
} as const;
