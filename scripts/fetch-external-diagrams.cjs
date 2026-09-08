/**
 * Download educational diagram SVGs into assets/external-diagrams/
 * for offline ingest (never fetched at lesson runtime).
 *
 * Sources:
 * - janosh/diagrams (MIT) — physics / chem / ML concept SVGs
 * - Wikimedia Commons — curated CC educational SVGs
 *
 * PetarV-/TikZ is TeX-only; janosh already ships SVG counterparts for many
 * of those diagrams, so we prefer janosh SVGs here.
 *
 * Usage: node scripts/fetch-external-diagrams.cjs
 * Then:  npm run ingest:diagrams
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");

const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "assets/external-diagrams");
const JANOSH_DIR = path.join(OUT_ROOT, "janosh");
const COMMONS_DIR = path.join(OUT_ROOT, "commons");
const UA = "SeathroughDiagramIngest/1.0 (educational offline mirror)";

const COMMONS_TITLES = [
  "File:Simple photosynthesis overview.svg",
  "File:Water cycle.svg",
  "File:Atom diagram.svg",
  "File:Animal cell structure en.svg",
  "File:Plant cell structure svg labels.svg",
  "File:DNA Structure+Key+Labelled.pn No.svg",
  "File:DNA simple.svg",
  "File:Mitochondrion mini.svg",
  "File:Nitrogen Cycle 2.svg",
  "File:Carbon cycle.jpg", // may skip non-svg
  "File:Solar System.png", // skip
  "File:Pyramid of numbers.svg",
  "File:Food web diagram.svg",
  "File:Electromagnetic spectrum-alternative.svg",
  "File:Ohm's law voltage drop.svg",
  "File:Series circuit.svg",
  "File:Parallel circuit.svg",
  "File:Lever Principle Simple Machine.svg",
  "File:Pulley system.svg",
  "File:Gear-12x12.svg",
  "File:Human heart diagram-en.svg",
  "File:Human digestive system.svg",
  "File:Neuron Hand-tuned.svg",
  "File:Chemical synapse schema cropped.svg",
  "File:Earth's atmosphere.svg",
  "File:Plate tectonics map.svg",
  "File:Volcano schematic.svg",
  "File:Rock cycle.svg",
  "File:Moon phases diagram.svg",
  "File:Seasons.svg",
  "File:Refraction.svg",
  "File:Reflection.svg",
  "File:Convex lens.svg",
  "File:Concave lens.svg",
  "File:Standing wave.svg",
  "File:Simple harmonic motion animation.gif", // skip
  "File:Ideal gas isotherms.svg",
  "File:Carnot cycle.svg",
  "File:Binary tree.svg",
  "File:Hash table.svg",
  "File:Stack (abstract data type).svg",
  "File:Queue.svg",
  "File:Bubble sort animation.gif",
  "File:Quicksort-example.gif",
  "File:HTTP cookies.svg",
  "File:Internet map 1024 - transparent, inverted.png",
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(
      url,
      { headers: { "User-Agent": UA, Accept: "*/*" }, timeout: 60_000 },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          fetchBuffer(next).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout ${url}`));
    });
  });
}

async function fetchJson(url) {
  const buf = await fetchBuffer(url);
  return JSON.parse(buf.toString("utf8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return out;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/\.svg$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function fetchJanosh() {
  console.log("fetching janosh/diagrams tree…");
  const tree = await fetchJson(
    "https://api.github.com/repos/janosh/diagrams/git/trees/main?recursive=1",
  );
  const svgs = (tree.tree || []).filter(
    (t) =>
      t.type === "blob" &&
      typeof t.path === "string" &&
      t.path.endsWith(".svg") &&
      t.path.startsWith("assets/") &&
      !t.path.includes("favicon"),
  );
  console.log(`janosh SVGs: ${svgs.length}`);
  fs.mkdirSync(JANOSH_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  await mapPool(svgs, 8, async (file, idx) => {
    if (idx > 0 && idx % 30 === 0) console.log(`… janosh ${idx}/${svgs.length}`);
    const folder = path.basename(path.dirname(file.path));
    const id = slugify(folder || path.basename(file.path, ".svg"));
    const dest = path.join(JANOSH_DIR, `${id}.svg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
      ok++;
      return;
    }
    const url = `https://raw.githubusercontent.com/janosh/diagrams/main/${file.path}`;
    try {
      const buf = await fetchBuffer(url);
      const text = buf.toString("utf8");
      if (!/<svg[\s>]/i.test(text) || !/\bd\s*=\s*"/i.test(text)) {
        fail++;
        return;
      }
      // Stamp source attribution in a comment for ingest.
      const stamped = `<!-- source: janosh/diagrams · ${file.path} · MIT · https://github.com/janosh/diagrams -->\n${text}`;
      fs.writeFileSync(dest, stamped);
      ok++;
      await sleep(30);
    } catch (err) {
      fail++;
      console.warn("janosh fail", id, err.message);
    }
  });
  console.log(`janosh done ok=${ok} fail=${fail}`);
}

async function commonsFileUrl(title) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|mime|extmetadata&titles=" +
    encodeURIComponent(title);
  const data = await fetchJson(api);
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing != null) return null;
  const info = page.imageinfo?.[0];
  if (!info?.url) return null;
  const mime = String(info.mime || "");
  if (!mime.includes("svg")) return null;
  const license =
    info.extmetadata?.LicenseShortName?.value ||
    info.extmetadata?.UsageTerms?.value ||
    "Unknown";
  return { url: info.url, mime, license, title: page.title };
}

async function fetchCommons() {
  console.log("fetching curated Wikimedia Commons SVGs…");
  fs.mkdirSync(COMMONS_DIR, { recursive: true });
  let ok = 0;
  let skip = 0;
  for (const title of COMMONS_TITLES) {
    try {
      const meta = await commonsFileUrl(title);
      if (!meta) {
        skip++;
        continue;
      }
      const id = slugify(
        title.replace(/^File:/i, "").replace(/\.svg$/i, ""),
      );
      const dest = path.join(COMMONS_DIR, `${id}.svg`);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
        ok++;
        await sleep(80);
        continue;
      }
      const buf = await fetchBuffer(meta.url);
      const text = buf.toString("utf8");
      if (!/<svg[\s>]/i.test(text)) {
        skip++;
        continue;
      }
      // Prefer path-based SVGs; still keep if has basic shapes we can approx later
      const stamped = `<!-- source: Wikimedia Commons · ${meta.title} · ${meta.license} · ${meta.url} -->\n${text}`;
      fs.writeFileSync(dest, stamped);
      ok++;
      console.log("commons", id);
      await sleep(120);
    } catch (err) {
      skip++;
      console.warn("commons skip", title, err.message);
    }
  }
  console.log(`commons done ok=${ok} skip=${skip}`);
}

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  await fetchJanosh();
  await fetchCommons();
  console.log(`raw diagrams → ${path.relative(ROOT, OUT_ROOT)}`);
  console.log("next: npm run ingest:diagrams");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
