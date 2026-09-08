# External educational diagrams

Offline SVG pack used when a lesson would otherwise be text-only on the board.

## Sources

| Source | License | Notes |
|--------|---------|--------|
| [janosh/diagrams](https://github.com/janosh/diagrams) | MIT | Physics / chemistry / ML concept SVGs (primary pack) |
| [Wikimedia Commons](https://commons.wikimedia.org/) | CC / PD (per file) | Curated educational SVGs |
| [PetarV-/TikZ](https://github.com/PetarV-/TikZ) | various | TeX sources only — many diagrams already have SVG counterparts in janosh |

Runtime **never** fetches these hosts. Lessons only read the local catalog.

## Commands

```bash
npm run fetch:diagrams    # download SVGs → assets/external-diagrams/
npm run ingest:diagrams   # pack → src/lib/visuals/assets/externalDiagrams.ts
```

Matching happens in `resolveVisualWithLibrary` via `strongFigurePlan` /
`withCompanionFigure`. The board shows the figure beside pen narration when
`preferDrawEngine` is on.
