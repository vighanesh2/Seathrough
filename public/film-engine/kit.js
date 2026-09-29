'use strict';
// SeeThrough film runtime. Loaded after core.js inside a sandboxed iframe.
// Adds explainer helpers (arrow, textBlock), owns the caption band and the fallback scene,
// and talks to the page over a MessageChannel: probe scenes, draw frames, report errors.

let __loops = 0;
const __SCENES = [];
const __ERRORS = {};
let __LOADING = -1;
let __CFG = null;
let __port = null;

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

// Looks beyond core.js's presets, so films are not all cream paper. Same keys as every palette.
PALETTES.skyDay = makePalette({
  paper: '#dcebf6', paperBand: 'rgba(255,255,255,.45)', ink: '#14263d', night: '#10213a', chalk: '#f5f9fc', chalkDim: '#86a3bd',
  guide: 'rgba(20,38,61,.4)', fills: ['#f2b35a', '#e8705a', '#4f8fc0', '#8cc7a1', '#f5d77a', '#ffffff'], shade: '#1f3a5a',
  light: '#ffffff', blush: '#e8705a', accents: ['#e8705a', '#f2b35a', '#2f7fc1', '#43a86b'], inks: ['#14263d', '#2f7fc1', '#e8705a'],
  finish: 'flat',
}, 'screenSea');
PALETTES.chalkboard = makePalette({
  paper: '#1f3a30', paperBand: null, ink: '#f1f3e6', night: '#16291f', chalk: '#f1f3e6', chalkDim: '#9fb3a4',
  guide: 'rgba(241,243,230,.4)', fills: ['#2f5646', '#3b6b58', '#f4d35e', '#e76f51', '#8ecae6'], shade: '#0f2019',
  light: '#ffffff', blush: '#e76f51', accents: ['#f4d35e', '#e76f51', '#8ecae6', '#b5e48c'], inks: ['#f1f3e6', '#f4d35e'],
  finish: 'pencil',
}, 'blueprintNight');

function __errorText(error) {
  const message = error && error.message ? String(error.message) : String(error);
  const stack = error && error.stack ? String(error.stack) : '';
  const at = stack.match(/about:srcdoc:(\d+):(\d+)/);
  if (at && __CFG) {
    const docLine = Number(at[1]);
    const starts = __CFG.lineStarts;
    for (let k = starts.length - 1; k >= 0; k--) {
      if (docLine >= starts[k]) return `${message} (line ${docLine - starts[k] + 1})`;
    }
  }
  return message;
}

window.addEventListener('error', (event) => {
  if (__LOADING >= 0 && !(__LOADING in __ERRORS)) {
    const line = event.lineno && __CFG ? event.lineno - __CFG.lineStarts[__LOADING] + 1 : 0;
    __ERRORS[__LOADING] = `${event.message || 'Script error'}${line > 0 ? ` (line ${line})` : ''}`;
  }
});

// ---------- explainer helpers ----------

// arrow: a hand-drawn arrow from `from` to `to` ([x, y]). progress 0..1 draws it on; bend curves it sideways (px).
function arrow(c, from, to, o = {}) {
  const { progress = 1, color = PAL.ink, width = 3, seed = 1, head = 18, bend = 0, dash = null } = o;
  const p = clamp(progress, 0, 1);
  if (p <= 0) return;
  const [x0, y0] = from, [x1, y1] = to, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const qx = (x0 + x1) / 2 - dy / len * bend, qy = (y0 + y1) / 2 + dx / len * bend;
  const n = Math.max(8, Math.round(len / 22)), pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n * p;
    pts.push([(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * qx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * qy + u * u * y1]);
  }
  c.save(); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
  if (dash) c.setLineDash(dash);
  wob(c, pts, 1.3, seed);
  c.setLineDash([]);
  const tip = pts[pts.length - 1], back = pts[Math.max(0, pts.length - 3)], a = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
  const s = head * Math.min(1, p * 4);
  wob(c, [[tip[0] - Math.cos(a - .5) * s, tip[1] - Math.sin(a - .5) * s], tip, [tip[0] - Math.cos(a + .5) * s, tip[1] - Math.sin(a + .5) * s]], .8, seed + 1, false, { smooth: false });
  c.restore();
}

function __wrapLines(c, text, maxWidth, maxLines) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (c.measureText(trial).width <= maxWidth || !line) { line = trial; continue; }
    lines.push(line); line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && c.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

// textBlock: wrapped text. font 'hand' (the look's handwriting) or 'serif'. progress 0..1 types it on.
// Returns the y just below the last line.
function textBlock(c, text, x, y, maxWidth, o = {}) {
  const { size = 40, lineH = size * 1.28, ink = PAL.ink, align = 'left', font = 'hand', progress = 1, maxLines = 4, weight = '' } = o;
  c.save();
  c.font = `${weight ? weight + ' ' : ''}${size}px ${font === 'serif' ? SERIF : HAND_FONT}`;
  c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = ink;
  const lines = __wrapLines(c, text, maxWidth, maxLines);
  let budget = Math.round(lines.join(' ').length * clamp(progress, 0, 1));
  lines.forEach((line, k) => {
    if (budget <= 0) return;
    const shown = line.slice(0, budget); budget -= line.length + 1;
    c.fillText(shown, x, y + size + k * lineH);
  });
  c.restore();
  return y + size + (lines.length - 1) * lineH + size * .35;
}

// ---------- runtime-owned drawing ----------

const CAPTION_TOP = 918;

function __caption(c, tau, scene) {
  if (!scene.say) return;
  resetT(c);
  const inY = CAPTION_TOP + (1 - sm(0, .45, tau, easeOut)) * 40;
  c.save();
  c.globalAlpha = sm(0, .3, tau);
  c.fillStyle = alpha(PAL.paper, .9);
  c.fillRect(0, inY - 8, W, H - inY + 8);
  c.strokeStyle = alpha(PAL.ink, .35); c.lineWidth = 1.5;
  wob(c, [[80, inY - 8], [W - 80, inY - 8]], 1.2, 7);
  c.restore();
  textBlock(c, scene.say, CX, inY + 6, W - 320, {
    size: 44, lineH: 54, font: 'serif', align: 'center', maxLines: 2,
    ink: PAL.ink, progress: sm(.15, .15 + Math.min(1.6, scene.say.length / 40), tau, t => t),
  });
}

function fallbackScene(c, tau, i, scene) {
  if (PAL.paper === PAL.night) night(c); else paper(c);
  const rise = sm(0, .8, tau, easeOut);
  const R = 150 + 18 * breathe(tau, 3.2);
  c.save(); c.globalAlpha = .9;
  ripples(c, CX, 400, [R * rise, R * 1.45 * rise, R * 1.9 * rise].filter(r => r > 6), alpha(PAL.accents[1], .5), 11, 3);
  c.restore();
  seedDot(c, CX, 400, 16 * rise);
  textBlock(c, scene.title, CX, 560, W - 400, { size: 76, font: 'hand', align: 'center', maxLines: 2, progress: sm(.2, 1.1, tau) });
  c.strokeStyle = PAL.ink; c.lineWidth = 3;
  selfDraw(c, [[CX - 260, 700], [CX + 260, 704]], sm(.9, 1.6, tau), 21, 1.6);
}

function __clean(c) {
  for (let k = 0; k < 64; k++) c.restore();
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.setLineDash([]); c.filter = 'none';
  c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; c.lineWidth = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  resetT(c);
}

function __wrap(k, scene) {
  return (c, tau, i) => {
    const fn = __SCENES[k];
    let drawn = false;
    if (typeof fn === 'function' && !(k in __ERRORS)) {
      __loops = 0;
      try { fn(c, tau, i); drawn = true; }
      catch (error) { __ERRORS[k] = __errorText(error); }
    }
    __clean(c);
    usePalette(__CFG.palette);
    if (!drawn) { fallbackScene(c, tau, i, scene); __clean(c); }
    __caption(c, tau, scene);
  };
}

function __startFilm(cfg) {
  __CFG = cfg;
  __LOADING = -1;
  const timeline = cfg.scenes.map((scene, k) => ({ name: `scene${k + 1}`, dur: scene.seconds, fn: __wrap(k, scene) }));
  try {
    defineFilm({ palette: cfg.palette, timeline, format: { ar: '16:9', width: cfg.width }, fps: cfg.fps });
  } catch (error) {
    __CFG.fatal = __errorText(error);
  }
}

// ---------- page bridge ----------

function __sceneStart(k) { let t = 0; for (let j = 0; j < k; j++) t += __CFG.scenes[j].seconds; return t; }

function __isBlank() {
  const w = 64, h = 29, probe = document.createElement('canvas');
  probe.width = w; probe.height = h;
  const g = probe.getContext('2d', { willReadFrequently: true });
  const cv = document.getElementById('c');
  g.drawImage(cv, 0, 0, cv.width, cv.height * (CAPTION_TOP / H) * .98, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, lum = [];
  for (let p = 0; p < d.length; p += 4) lum.push(d[p] * .299 + d[p + 1] * .587 + d[p + 2] * .114);
  const sorted = lum.slice().sort((a, b) => a - b), mid = sorted[sorted.length >> 1];
  const marked = lum.filter(v => Math.abs(v - mid) > 22).length;
  return marked / lum.length < .006;
}

function __probe(k) {
  const scene = __CFG.scenes[k], start = __sceneStart(k), fps = __CFG.fps;
  const samples = [.04, .18, .32, .46, .6, .74, .88, .98];
  const times = [];
  let blank = false;
  for (const f of samples) {
    const i = Math.min(__NDRAW - 1, Math.floor((start + scene.seconds * f) * fps));
    const t0 = performance.now();
    __drawFrame(i);
    times.push(performance.now() - t0);
    if (k in __ERRORS) break;
    if (f === .74) blank = __isBlank();
  }
  times.sort((a, b) => a - b);
  return { index: k, error: __ERRORS[k] || null, ms: times[times.length >> 1] || 0, blank: !(k in __ERRORS) && blank };
}

let __lastKey = null;

function __shootFrame(i) {
  const key = frameKey(i);
  const L = locate(i);
  if (key === __lastKey) return Promise.resolve({ type: 'frame', i, scene: L.k, same: true });
  __drawFrame(i);
  __lastKey = key;
  return createImageBitmap(document.getElementById('c')).then(bitmap => ({ type: 'frame', i, scene: L.k, bitmap }));
}

function __handle(event) {
  const msg = event.data || {};
  try {
    if (msg.type === 'probe') {
      __port.postMessage({ type: 'probe', id: msg.id, result: __probe(msg.index) });
    } else if (msg.type === 'frame') {
      __shootFrame(msg.i).then(
        out => __port.postMessage({ ...out, id: msg.id, errors: { ...__ERRORS } }, out.bitmap ? [out.bitmap] : []),
        error => __port.postMessage({ type: 'error', id: msg.id, error: __errorText(error) }),
      );
    }
  } catch (error) {
    __port.postMessage({ type: 'error', id: msg.id, error: __errorText(error) });
  }
}

window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'connect' || !event.ports[0] || __port) return;
  __port = event.ports[0];
  __port.onmessage = __handle;
  document.fonts.ready.then(() => {
    __port.postMessage({
      type: 'ready',
      fatal: __CFG ? __CFG.fatal || null : 'The film runtime did not start.',
      errors: { ...__ERRORS },
      frames: typeof __NDRAW === 'number' ? __NDRAW : 0,
      size: window.__size || null,
    });
  });
});
