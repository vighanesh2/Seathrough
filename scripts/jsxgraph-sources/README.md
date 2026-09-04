## Named curves (no folder needed)

These are handled dynamically by the `function-graph` board — just ask in
`/lessons`:

- parabola / quadratic → `y = x^2`
- cubic → `y = x^3`
- sine / cosine / tan(x)
- absolute value, square root, exponential, ln, reciprocal
- or any safe formula: `graph y = x^5 + 2x`

## Bulk import from jsxgraph.org/share

```bash
npm run fetch:jsxgraph-share   # ~259 examples → scripts/jsxgraph-sources/
npm run ingest:jsxgraph        # pack into src/lib/topics/catalog/generated/
```

Share examples are typically **CC BY-SA 4.0** (Center of Mobile Learning with
Digital Technology). Attribution URL is stored in each `meta.sourceUrl`.
Runtime never fetches the share site — only the local ingested catalog.

Multi-board demos keep only the first board. Examples that need `window`,
`eval`, `fetch`, etc. are skipped (see `scripts/jsxgraph-share-import-report.json`).

Hand-curated seeds `circle-geometry` and `line-slope` are preserved.

## Catalog constructions (meta + body)

Drop one folder per **non-function** interactive (geometry, custom boards):

```
scripts/jsxgraph-sources/<id>/
  meta.json
  body.js
```

Then: `npm run ingest:jsxgraph`
