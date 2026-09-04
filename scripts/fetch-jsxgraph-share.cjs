/**
 * Download all examples from https://jsxgraph.org/share/ into
 * scripts/jsxgraph-sources/<id>/{meta.json,body.js}, transformed for the
 * local construction sandbox (no initBoard — host provides `board`).
 *
 * Usage: node scripts/fetch-jsxgraph-share.cjs
 * Then:  npm run ingest:jsxgraph
 *
 * Share examples are typically CC BY-SA 4.0 — attribution stays in meta.sourceUrl
 * and summary. Runtime never fetches these pages.
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const SOURCES = path.join(__dirname, "jsxgraph-sources");
const SHARE_HOME = "https://jsxgraph.org/share/";
const UA = "SeathroughIngest/1.0 (+local catalog mirror; CC BY-SA attribution retained)";

/** Hand-curated seeds we keep even if a share slug collides. */
const PRESERVE_IDS = new Set(["circle-geometry", "line-slope"]);

/** Folders superseded by the dynamic function-graph board. */
const REMOVE_IDS = new Set(["graph-sine", "graph-parabola"]);

const FORBIDDEN = [
  /\binitBoard\b/,
  /\bfreeBoard\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\.cookie\b/,
  /\bwindow\s*\./,
  /\bglobalThis\b/,
  // Node process — avoid matching words like "logistic process"
  /\bprocess\s*\./,
  /\b__dirname\b/,
  /\b__filename\b/,
];

const GENERIC_ALIASES = new Set([
  "point",
  "line",
  "circle",
  "angle",
  "angles",
  "text",
  "image",
  "chart",
  "sine",
  "cosine",
  "parabola",
  "curve",
  "curves",
  "board",
  "slider",
  "animation",
  "3d",
  "test",
  "graph",
  "axis",
  "axes",
  "polygon",
  "triangle",
  "vector",
  "vectors",
  "function",
  "functions",
  "math",
  "geometry",
  "calculus",
]);

const CONCURRENCY = 8;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": UA, Accept: "text/html" },
        timeout: 45_000,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          fetchText(next).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function listSlugs(homeHtml) {
  const set = new Set();
  for (const m of homeHtml.matchAll(/href="\/share\/example\/([^"#?]+)"/g)) {
    set.add(m[1]);
  }
  return [...set].sort();
}

function extractExample(html) {
  const re = /<textarea[^>]*>(\{[\s\S]*?\})<\/textarea>/g;
  let match;
  while ((match = re.exec(html))) {
    const raw = match[1];
    if (!raw.includes('"example"')) continue;
    try {
      const data = JSON.parse(raw);
      if (data && data.example && typeof data.example.code === "string") {
        return data.example;
      }
    } catch {
      // try next textarea
    }
  }
  return null;
}

function stripMarkup(text) {
  return String(text || "")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]+\$/g, " ")
    .replace(/\\\([\s\S]*?\\\)/g, " ")
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncate(text, max) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function toId(alias) {
  let id = String(alias)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!id) return null;
  if (!/^[a-z]/.test(id)) id = `g-${id}`;
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return null;
  return id;
}

function parseBoundingBox(code) {
  const m = code.match(/boundingbox\s*:\s*\[([^\]]+)\]/i);
  if (!m) return [-10, 10, 10, -10];
  const parts = m[1].split(",").map((s) => Number(String(s).trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return [-10, 10, 10, -10];
  }
  return parts;
}

function parseKeepAspect(code) {
  const m = code.match(/keepaspectratio\s*:\s*(true|false)/i);
  if (!m) return true;
  return m[1].toLowerCase() === "true";
}

/**
 * Find the end index of a balanced (...) starting at openParenIndex
 * (which must point at '(').
 */
function matchingParenEnd(src, openParenIndex) {
  let depth = 0;
  let inStr = null;
  let escape = false;
  for (let i = openParenIndex; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Locate initBoard call ranges: { start, end, varName, callInner }.
 * start includes optional const/let/var assignment.
 */
function findInitBoards(src) {
  const found = [];
  const re =
    /(?:(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*)?JXG\.JSXGraph\.initBoard\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchingParenEnd(src, open);
    if (close < 0) continue;
    let end = close + 1;
    while (end < src.length && /\s/.test(src[end])) end++;
    if (src[end] === ";") end++;
    found.push({
      start: m.index,
      end,
      varName: m[1] || "board",
      callInner: src.slice(open + 1, close),
    });
  }
  return found;
}

function transformBody(rawCode) {
  let src = String(rawCode || "").replace(/\r\n/g, "\n");
  if (!src.trim()) return { ok: false, reason: "empty code" };

  // Drop leading BOARDID const noise if present (export wrappers)
  src = src.replace(
    /^\s*(?:const|let|var)\s+BOARDID\w*\s*=\s*['"][^'"]*['"]\s*;?\s*/gm,
    "",
  );

  const inits = findInitBoards(src);
  if (!inits.length) {
    // Already board-only body?
    if (/\bboard\.create\b/.test(src) && !/\binitBoard\b/.test(src)) {
      return {
        ok: true,
        source: src.trim() + "\n",
        boundingBox: [-10, 10, 10, -10],
        keepAspectRatio: true,
        multiBoardTruncated: false,
      };
    }
    return { ok: false, reason: "no initBoard / board.create" };
  }

  const first = inits[0];
  const multiBoardTruncated = inits.length > 1;
  // Keep only first board section
  let body = src.slice(first.end);
  if (multiBoardTruncated) {
    body = src.slice(first.end, inits[1].start);
  }

  const optionsSnippet = first.callInner;
  const boundingBox = parseBoundingBox(optionsSnippet);
  const keepAspectRatio = parseKeepAspect(optionsSnippet);

  // Rename first board variable → board (avoid clobbering if already board)
  const varName = first.varName;
  if (varName !== "board") {
    body = body.replace(new RegExp(`\\b${varName}\\b`, "g"), "board");
  }

  // Remove leftover BOARDID* mentions
  body = body.replace(/\bBOARDID\w*\b/g, '"unused-board-id"');

  // Strip addChild to missing sibling boards
  body = body.replace(/\bboard\.addChild\s*\([^)]*\)\s*;?/g, "");

  // freeBoard is host-owned; drop calls so plotter-style demos can still draw once
  body = body.replace(
    /\b(?:JXG\.JSXGraph\.|board\.)?freeBoard\s*\([^)]*\)\s*;?/g,
    "",
  );

  body = body.trim();
  if (!body) return { ok: false, reason: "empty after strip initBoard" };
  if (!/\bboard\.create\b/.test(body)) {
    return { ok: false, reason: "no board.create after transform" };
  }

  for (const pattern of FORBIDDEN) {
    if (pattern.test(body)) {
      return { ok: false, reason: `forbidden ${pattern}` };
    }
  }

  if (body.length > 50_000) {
    return { ok: false, reason: "body too large" };
  }

  return {
    ok: true,
    source: `${body}\n`,
    boundingBox,
    keepAspectRatio,
    multiBoardTruncated,
  };
}

function buildAliases(id, title, alias) {
  const out = [];
  const push = (a) => {
    const s = String(a || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!s || s.length < 4 || s.length > 80) return;
    if (GENERIC_ALIASES.has(s)) return;
    if (!out.includes(s)) out.push(s);
  };

  push(title);
  push(alias.replace(/-/g, " "));
  push(id.replace(/^g-/, "").replace(/-/g, " "));
  push(`jsxgraph ${title}`);
  // Prefer multi-word phrases only from title words
  return out.slice(0, 12);
}

function buildSteps(title, description) {
  const clean = stripMarkup(description);
  const paras = clean
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const steps = [];
  if (paras[0]) {
    steps.push({
      title: truncate(title, 80),
      detail: truncate(paras[0], 500),
    });
  } else {
    steps.push({
      title: truncate(title, 80),
      detail: truncate(
        `Interactive JSXGraph construction: ${title}. Drag points and controls to explore.`,
        500,
      ),
    });
  }

  if (paras[1]) {
    steps.push({
      title: "Explore further",
      detail: truncate(paras[1], 500),
    });
  } else {
    steps.push({
      title: "Interact",
      detail:
        "Drag free points, gliders, and sliders on the board to see how the figure updates.",
    });
  }

  return steps.slice(0, 12);
}

function writeEntry(id, meta, body) {
  const dir = path.join(SOURCES, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "body.js"), body);
}

async function main() {
  console.log("fetch-jsxgraph-share — listing examples…");
  const home = await fetchText(SHARE_HOME);
  const slugs = listSlugs(home);
  if (slugs.length < 50) {
    console.error(`expected ~259 examples, got ${slugs.length}`);
    process.exit(1);
  }
  console.log(`found ${slugs.length} example slugs`);

  fs.mkdirSync(SOURCES, { recursive: true });

  for (const id of REMOVE_IDS) {
    const dir = path.join(SOURCES, id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`removed superseded ${id}`);
    }
  }

  const stats = {
    imported: 0,
    skipped: 0,
    preserved: 0,
    multiTruncated: 0,
    reasons: {},
  };

  const report = [];

  await mapPool(slugs, CONCURRENCY, async (slug, idx) => {
    if (idx > 0 && idx % 25 === 0) {
      console.log(`… ${idx}/${slugs.length}`);
    }

    const id = toId(slug);
    if (!id) {
      stats.skipped++;
      stats.reasons["bad-id"] = (stats.reasons["bad-id"] || 0) + 1;
      report.push({ slug, status: "skip", reason: "bad-id" });
      return;
    }

    if (PRESERVE_IDS.has(id)) {
      stats.preserved++;
      report.push({ slug, id, status: "preserve" });
      return;
    }

    let html;
    try {
      html = await fetchText(`${SHARE_HOME}example/${encodeURIComponent(slug)}`);
    } catch (err) {
      stats.skipped++;
      stats.reasons["fetch"] = (stats.reasons["fetch"] || 0) + 1;
      report.push({ slug, status: "skip", reason: String(err.message || err) });
      await sleep(200);
      return;
    }

    const example = extractExample(html);
    if (!example) {
      stats.skipped++;
      stats.reasons["no-json"] = (stats.reasons["no-json"] || 0) + 1;
      report.push({ slug, status: "skip", reason: "no-json" });
      return;
    }

    const transformed = transformBody(example.code);
    if (!transformed.ok) {
      stats.skipped++;
      const key = transformed.reason.startsWith("forbidden")
        ? "forbidden"
        : transformed.reason;
      stats.reasons[key] = (stats.reasons[key] || 0) + 1;
      report.push({ slug, status: "skip", reason: transformed.reason });
      return;
    }

    if (transformed.multiBoardTruncated) stats.multiTruncated++;

    const title = truncate(stripMarkup(example.name || slug), 120) || id;
    const desc = stripMarkup(example.description || "");
    const summary = truncate(
      desc ||
        `${title} — interactive JSXGraph example (CC BY-SA 4.0, jsxgraph.org/share).`,
      400,
    );
    const tags = Array.isArray(example.tags)
      ? example.tags
          .map((t) => String(t.name || t.alias || "").trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const aliases = buildAliases(id, title, slug);
    if (!aliases.length) aliases.push(truncate(`jsxgraph ${id}`, 80));

    const meta = {
      id,
      title,
      summary,
      formula: "",
      aliases,
      tags,
      boundingBox: transformed.boundingBox,
      keepAspectRatio: transformed.keepAspectRatio,
      sourceUrl: `https://jsxgraph.org/share/example/${slug}`,
      steps: buildSteps(title, desc),
    };

    writeEntry(id, meta, transformed.source);
    stats.imported++;
    report.push({
      slug,
      id,
      status: "ok",
      multi: transformed.multiBoardTruncated,
    });

    // Be polite to the share host
    await sleep(40);
  });

  const reportPath = path.join(__dirname, "jsxgraph-share-import-report.json");
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), stats, report }, null, 2)}\n`,
  );

  console.log(
    `done — imported ${stats.imported}, skipped ${stats.skipped}, preserved ${stats.preserved}, multi-truncated ${stats.multiTruncated}`,
  );
  console.log("skip reasons:", stats.reasons);
  console.log(`report → ${path.relative(ROOT, reportPath)}`);
  console.log("next: npm run ingest:jsxgraph");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
