/**
 * Injected into the live page.
 * Zoom-style tutor cursor — prefers main content / diagram, ignores nav/TOC.
 */
export const ANNOTATE_BOOTSTRAP = `(() => {
  const ROOT_ID = "seethrough-annotate-root";
  const STYLE_ID = "seethrough-annotate-style";
  const CURSOR_ID = "seethrough-tutor-cursor";
  const CALLOUT_ID = "seethrough-tutor-callout";
  const RING_ID = "seethrough-tutor-ring";

  // Approximate hotspots on a typical lateral brain diagram (x,y as 0–1 inside the image).
  const DIAGRAM_HOTSPOTS = {
    cerebrum: [0.42, 0.34],
    "cerebral cortex": [0.48, 0.28],
    cortex: [0.48, 0.28],
    forebrain: [0.4, 0.32],
    "frontal lobe": [0.22, 0.34],
    frontal: [0.22, 0.34],
    "parietal lobe": [0.52, 0.28],
    parietal: [0.52, 0.28],
    "temporal lobe": [0.38, 0.58],
    temporal: [0.38, 0.58],
    "occipital lobe": [0.78, 0.38],
    occipital: [0.78, 0.38],
    cerebellum: [0.72, 0.78],
    brainstem: [0.58, 0.82],
    "brain stem": [0.58, 0.82],
    midbrain: [0.56, 0.7],
    hindbrain: [0.66, 0.8],
    pons: [0.58, 0.78],
    medulla: [0.58, 0.88],
    thalamus: [0.5, 0.48],
    hypothalamus: [0.48, 0.56],
    hippocampus: [0.44, 0.62],
  };

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.documentElement.appendChild(style);
    }
    style.textContent = \`
      mark.seethrough-hl {
        background: rgba(255, 224, 102, 0.75) !important;
        color: inherit !important;
        border-radius: 3px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        padding: 0 2px;
        box-shadow: inset 0 -2px 0 rgba(245, 158, 11, 0.9);
      }
      [data-seethrough-outlined="1"] {
        outline: 3px solid rgba(245, 158, 11, 0.95) !important;
        outline-offset: 4px !important;
        border-radius: 6px;
      }
      #\${ROOT_ID} {
        position: absolute;
        inset: 0;
        width: 100%;
        pointer-events: none;
        z-index: 2147483646;
        overflow: visible;
      }
      #\${CURSOR_ID} {
        position: absolute;
        width: 28px;
        height: 28px;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        filter: drop-shadow(0 2px 4px rgba(15, 23, 42, 0.4));
        transform: translate(-2px, -2px);
        transition: left 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                    top 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        z-index: 2147483647;
        pointer-events: none;
      }
      #\${CURSOR_ID} svg { display: block; width: 28px; height: 28px; }
      #\${CURSOR_ID} .seethrough-cursor-tag {
        position: absolute;
        left: 22px;
        top: 18px;
        white-space: nowrap;
        padding: 3px 8px;
        border-radius: 999px;
        background: #0f172a;
        color: #f8fafc;
        font: 700 11px/1.2 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.28);
      }
      #\${CALLOUT_ID} {
        position: absolute;
        z-index: 2147483647;
        max-width: 240px;
        padding: 8px 12px;
        border-radius: 10px;
        background: #0f172a;
        color: #f8fafc;
        font: 650 13px/1.35 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.35);
        pointer-events: none;
        transition: left 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                    top 0.55s cubic-bezier(0.22, 1, 0.36, 1);
      }
      #\${RING_ID} {
        position: absolute;
        z-index: 2147483646;
        border: 3px solid #f59e0b;
        border-radius: 999px;
        box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.25);
        pointer-events: none;
        transition: left 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                    top 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                    width 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                    height 0.55s cubic-bezier(0.22, 1, 0.36, 1);
      }
    \`;
  }

  function ensureRoot() {
    ensureStyle();
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.documentElement.appendChild(root);
    }
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight,
    );
    root.style.height = height + "px";
    return root;
  }

  function ensureCursor() {
    ensureRoot();
    let cursor = document.getElementById(CURSOR_ID);
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = CURSOR_ID;
      cursor.innerHTML =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<path d="M4 3.5l12.5 9.2-5.1 1.1 2.4 6.2-2.3.9-2.5-6.3-5 3.8z" fill="#0f172a" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>' +
        "</svg>" +
        '<span class="seethrough-cursor-tag">Tutor</span>';
      document.documentElement.appendChild(cursor);
    }
    return cursor;
  }

  function placeAt(xDoc, yDoc, label) {
    const cursor = ensureCursor();
    cursor.style.left = xDoc + "px";
    cursor.style.top = yDoc + "px";

    let callout = document.getElementById(CALLOUT_ID);
    if (!callout) {
      callout = document.createElement("div");
      callout.id = CALLOUT_ID;
      document.documentElement.appendChild(callout);
    }
    const text = String(label || "").trim();
    if (!text) {
      callout.remove();
    } else {
      callout.textContent = text;
      callout.style.left = Math.max(8, xDoc - 10) + "px";
      callout.style.top = Math.max(8, yDoc - 44) + "px";
    }

    let ring = document.getElementById(RING_ID);
    if (!ring) {
      ring = document.createElement("div");
      ring.id = RING_ID;
      document.documentElement.appendChild(ring);
    }
    const size = 54;
    ring.style.width = size + "px";
    ring.style.height = size + "px";
    ring.style.left = xDoc - size * 0.35 + "px";
    ring.style.top = yDoc - size * 0.35 + "px";
  }

  function placeOnRect(rect, label, fx, fy) {
    const px = typeof fx === "number" ? fx : 0.65;
    const py = typeof fy === "number" ? fy : 0.55;
    const xDoc = rect.left + window.scrollX + rect.width * px;
    const yDoc = rect.top + window.scrollY + rect.height * py;
    placeAt(xDoc, yDoc, label);
  }

  function clearMarks() {
    document.querySelectorAll("mark.seethrough-hl").forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      parent.normalize?.();
    });
    document.querySelectorAll("[data-seethrough-outlined]").forEach((el) => {
      el.style.outline = el.getAttribute("data-seethrough-prev-outline") || "";
      el.removeAttribute("data-seethrough-outlined");
      el.removeAttribute("data-seethrough-prev-outline");
    });
  }

  function clear() {
    clearMarks();
    document.getElementById(CALLOUT_ID)?.remove();
    document.getElementById(CURSOR_ID)?.remove();
    document.getElementById(RING_ID)?.remove();
    document.getElementById(ROOT_ID)?.replaceChildren();
  }

  function normalize(value) {
    return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
  }

  function isChrome(el) {
    if (!el || !el.closest) return true;
    if (
      el.closest(
        "nav, header, footer, aside, [role='navigation'], [role='banner'], [role='contentinfo'], .sidebar, .toc, #toc, .menu, .breadcrumb, .breadcrumbs",
      )
    ) {
      return true;
    }
    // Tiny link lists near the top are usually chrome / TOC.
    const a = el.closest("a");
    if (a) {
      const t = normalize(a.textContent || "");
      if (t.length > 0 && t.length <= 40) {
        const inMain = a.closest("main, article, [role='main']");
        if (!inMain) return true;
      }
    }
    return false;
  }

  function inMain(el) {
    return Boolean(el && el.closest && el.closest("main, article, [role='main']"));
  }

  function scrollToRect(rect) {
    const targetY = window.scrollY + rect.top - window.innerHeight * 0.28;
    try {
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    } catch {
      window.scrollTo(0, Math.max(0, targetY));
    }
  }

  function outline(el) {
    el.setAttribute("data-seethrough-outlined", "1");
    el.setAttribute("data-seethrough-prev-outline", el.style.outline || "");
  }

  function largestFigure() {
    const figures = Array.from(
      document.querySelectorAll(
        "main img, article img, figure img, [role='main'] img, img",
      ),
    ).filter((img) => {
      if (isChrome(img)) return false;
      const r = img.getBoundingClientRect();
      const w = Math.max(img.naturalWidth || 0, r.width);
      const h = Math.max(img.naturalHeight || 0, r.height);
      return w >= 180 && h >= 140;
    });
    figures.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const aMain = inMain(a) ? 1.25 : 1;
      const bMain = inMain(b) ? 1.25 : 1;
      return br.width * br.height * bMain - ar.width * ar.height * aMain;
    });
    return figures[0] || null;
  }

  function hotspotFor(label) {
    const key = normalize(label);
    if (!key) return [0.55, 0.45];
    if (DIAGRAM_HOTSPOTS[key]) return DIAGRAM_HOTSPOTS[key];
    for (const [name, xy] of Object.entries(DIAGRAM_HOTSPOTS)) {
      if (key.includes(name) || name.includes(key)) return xy;
    }
    // Stable pseudo-random spot so different labels don't stack.
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    const x = 0.25 + (Math.abs(hash) % 50) / 100;
    const y = 0.25 + (Math.abs(hash >> 8) % 50) / 100;
    return [x, y];
  }

  function focusOnFigure(label) {
    const figure = largestFigure();
    if (!figure) return { ok: false, reason: "no_figure" };
    const host = figure.closest("figure") || figure;
    try {
      host.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch {
      /* ignore */
    }
    outline(host);
    const [fx, fy] = hotspotFor(label);
    const place = () => {
      const rect = figure.getBoundingClientRect();
      scrollToRect(rect);
      placeOnRect(rect, label, fx, fy);
    };
    place();
    setTimeout(place, 350);
    setTimeout(place, 750);
    return { ok: true, mode: "figure_hotspot" };
  }

  function focusElement(el, label, preferFigure) {
    if (preferFigure && largestFigure()) {
      return focusOnFigure(label);
    }
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch {
      /* ignore */
    }
    outline(el);
    const place = () => {
      const live = el.getBoundingClientRect();
      scrollToRect(live);
      placeOnRect(live, label, 0.7, 0.55);
    };
    place();
    setTimeout(place, 320);
    setTimeout(place, 700);
    return { ok: true, mode: "element" };
  }

  function findTextRange(query) {
    const needle = normalize(query);
    if (!needle || needle.length < 2) return null;

    const tryNeedle = (want, requireMain) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.nodeValue || !normalize(node.nodeValue)) {
              return NodeFilter.FILTER_REJECT;
            }
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName;
            if (
              tag === "SCRIPT" ||
              tag === "STYLE" ||
              tag === "NOSCRIPT" ||
              tag === "TEXTAREA" ||
              parent.isContentEditable
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            if (isChrome(parent)) return NodeFilter.FILTER_REJECT;
            if (requireMain && !inMain(parent)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );
      // Prefer longer containing blocks later in the article (first match in TOC is bad).
      let best = null;
      let bestScore = -1;
      let node;
      while ((node = walker.nextNode())) {
        const raw = node.nodeValue || "";
        const lower = raw.toLowerCase();
        const idx = lower.indexOf(want);
        if (idx === -1) continue;
        const parent = node.parentElement;
        let score = want.length;
        if (inMain(parent)) score += 40;
        if (parent && /^H[1-6]$/.test(parent.tagName)) score += 25;
        if (parent && (parent.tagName === "P" || parent.tagName === "LI")) score += 15;
        // Prefer matches lower on the page (past hero/nav).
        try {
          const top = parent.getBoundingClientRect().top + window.scrollY;
          score += Math.min(30, top / 400);
        } catch {
          /* ignore */
        }
        if (score > bestScore) {
          bestScore = score;
          try {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + want.length);
            best = range;
          } catch {
            /* ignore */
          }
        }
      }
      return best;
    };

    let range = tryNeedle(needle, true) || tryNeedle(needle, false);
    if (range) return range;
    const words = needle.split(" ").filter(Boolean);
    for (let len = Math.min(words.length, 8); len >= 2; len -= 1) {
      const part = words.slice(0, len).join(" ");
      range = tryNeedle(part, true) || tryNeedle(part, false);
      if (range) return range;
    }
    for (const word of words) {
      if (word.length < 4) continue;
      range = tryNeedle(word, true) || tryNeedle(word, false);
      if (range) return range;
    }
    return null;
  }

  function findElementByText(query) {
    const needle = normalize(query);
    if (!needle) return null;
    const words = needle.split(" ").filter((w) => w.length > 2);
    const selectors =
      "h1,h2,h3,h4,h5,h6,dt,th,strong,b,figcaption,label,li,p,td";
    const nodes = Array.from(document.querySelectorAll(selectors));
    let best = null;
    let bestScore = 0;
    for (const el of nodes) {
      if (isChrome(el)) continue;
      const text = normalize(el.textContent || "");
      if (!text || text.length > 420) continue;
      let score = 0;
      if (text === needle) score = 100;
      else if (text.includes(needle)) score = 80 - Math.min(text.length / 25, 35);
      else {
        let hits = 0;
        for (const w of words) if (text.includes(w)) hits += 1;
        if (!hits) continue;
        score = (hits / Math.max(words.length, 1)) * 45;
      }
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) score += 22;
      if (tag === "FIGCAPTION" || tag === "DT" || tag === "STRONG") score += 12;
      if (tag === "P" || tag === "LI") score += 8;
      if (inMain(el)) score += 30;
      try {
        const top = el.getBoundingClientRect().top + window.scrollY;
        score += Math.min(25, top / 500);
      } catch {
        /* ignore */
      }
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return bestScore >= 35 ? best : null;
  }

  function findByAltOrAria(query) {
    const needle = normalize(query);
    const words = needle.split(" ").filter((w) => w.length > 3);
    const candidates = Array.from(
      document.querySelectorAll("img,svg,[role='img'],figure,area"),
    );
    for (const el of candidates) {
      if (isChrome(el)) continue;
      const blob = normalize(
        [
          el.getAttribute("alt"),
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.textContent,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!blob) continue;
      if (blob.includes(needle) || words.some((w) => blob.includes(w))) return el;
    }
    return null;
  }

  function looksLikeDiagramPart(label) {
    const key = normalize(label);
    if (!key) return false;
    if (DIAGRAM_HOTSPOTS[key]) return true;
    return Object.keys(DIAGRAM_HOTSPOTS).some(
      (name) => key.includes(name) || name.includes(key),
    );
  }

  function markRange(range) {
    let mark;
    try {
      mark = document.createElement("mark");
      mark.className = "seethrough-hl";
      range.surroundContents(mark);
    } catch {
      mark = document.createElement("mark");
      mark.className = "seethrough-hl";
      mark.textContent = range.toString();
      range.deleteContents();
      range.insertNode(mark);
    }
    return mark;
  }

  function pointAtText(text, label) {
    clearMarks();
    document.getElementById(CALLOUT_ID)?.remove();
    document.getElementById(RING_ID)?.remove();
    const tip = label || text;
    const figure = largestFigure();
    const diagramPart = looksLikeDiagramPart(tip) || looksLikeDiagramPart(text);

    // For diagram parts, always prefer pointing on the figure when one exists.
    if (diagramPart && figure) {
      return focusOnFigure(tip);
    }

    const range = findTextRange(text);
    if (range) {
      const mark = markRange(range);
      // If the only text hit is tiny / high on page and a figure exists, use figure.
      const rect = mark.getBoundingClientRect();
      const highOnPage = rect.top + window.scrollY < 420;
      const shortHit = normalize(mark.textContent || "").split(" ").length <= 3;
      if (figure && highOnPage && shortHit) {
        mark.replaceWith(...Array.from(mark.childNodes));
        return focusOnFigure(tip);
      }
      return focusElement(mark, tip, false);
    }

    const el = findElementByText(text) || findByAltOrAria(text);
    if (el) {
      if (figure && isChrome(el)) return focusOnFigure(tip);
      return focusElement(el, tip, false);
    }

    if (figure) return focusOnFigure(tip);
    return { ok: false, reason: "text_not_found" };
  }

  function findClickable(query, selector) {
    if (selector) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch {
        /* ignore */
      }
    }
    const needle = normalize(query);
    if (!needle) return null;
    const candidates = Array.from(
      document.querySelectorAll(
        "a, button, [role='button'], [role='link'], summary, input[type='submit']",
      ),
    );
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      if (isChrome(el) && !inMain(el)) continue;
      const text = normalize(
        [el.textContent, el.getAttribute("aria-label"), el.getAttribute("title")]
          .filter(Boolean)
          .join(" "),
      );
      if (!text) continue;
      let score = 0;
      if (text === needle) score = 100;
      else if (text.includes(needle)) score = 70;
      else if (needle.includes(text) && text.length >= 4) score = 50;
      else continue;
      if (inMain(el)) score += 20;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return bestScore >= 50 ? best : null;
  }

  function clickTarget(annotation) {
    const label = annotation.label || annotation.text || "Open";
    const el = findClickable(annotation.text || "", annotation.selector);
    if (!el) return { ok: false, reason: "click_target_missing" };
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      /* ignore */
    }
    outline(el);
    const rect = el.getBoundingClientRect();
    placeOnRect(rect, label, 0.5, 0.5);
    try {
      el.click();
    } catch {
      try {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      } catch {
        return { ok: false, reason: "click_failed" };
      }
    }
    return { ok: true, mode: "click" };
  }

  window.__seethroughBrowser = {
    clear,
    apply(annotation) {
      if (!annotation || annotation.kind === "clear") {
        clear();
        return { ok: true, mode: "clear" };
      }
      if (annotation.kind === "click") {
        return clickTarget(annotation);
      }
      // YouTube kinds are handled in Playwright driver — ignore here.
      if (
        annotation.kind === "youtube_play" ||
        annotation.kind === "youtube_pause" ||
        annotation.kind === "youtube_seek"
      ) {
        return { ok: true, mode: annotation.kind };
      }
      const label = annotation.label || annotation.text || "";
      if (annotation.text) {
        const pointed = pointAtText(annotation.text, label);
        if (pointed.ok) return pointed;
      }
      if (annotation.selector) {
        clearMarks();
        let el = null;
        try {
          el = document.querySelector(annotation.selector);
        } catch {
          return { ok: false, reason: "bad_selector" };
        }
        if (!el) return { ok: false, reason: "selector_not_found" };
        if (largestFigure() && looksLikeDiagramPart(label)) {
          return focusOnFigure(label);
        }
        return focusElement(el, label, false);
      }
      if (largestFigure()) return focusOnFigure(label || "Look here");
      return { ok: false, reason: "no_target" };
    },
  };
})();`;

export type AnnotateResult = {
  ok: boolean;
  mode?: string;
  reason?: string;
};
