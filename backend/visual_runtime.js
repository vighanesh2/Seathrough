(function (root) {
  "use strict";

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxW) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  function alongPath(path, t) {
    if (!path || path.length < 2) return null;
    const u = clamp(t, 0, 1);
    const segs = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const dx = path[i + 1][0] - path[i][0];
      const dy = path[i + 1][1] - path[i][1];
      const len = Math.hypot(dx, dy) || 0.001;
      segs.push({ a: path[i], b: path[i + 1], len: len });
      total += len;
    }
    let walk = u * total;
    for (let i = 0; i < segs.length; i++) {
      if (walk <= segs[i].len || i === segs.length - 1) {
        const s = clamp(walk / segs[i].len, 0, 1);
        return {
          x: lerp(segs[i].a[0], segs[i].b[0], s),
          y: lerp(segs[i].a[1], segs[i].b[1], s),
        };
      }
      walk -= segs[i].len;
    }
    return { x: path[path.length - 1][0], y: path[path.length - 1][1] };
  }

  function mount(canvas, playBtn, resetBtn, capEl, sketchFn) {
    const ctx = canvas.getContext("2d");
    let t = 0;
    let playing = false;
    let raf = 0;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function dims() {
      return { w: canvas.clientWidth || 860, h: canvas.clientHeight || 460 };
    }

    function resize() {
      const dim = dims();
      const pw = Math.floor(dim.w * dpr);
      const ph = Math.floor(dim.h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ensureRough();
      }
      return dim;
    }

    const V = {
      ctx: ctx,
      lerp: function (a, b, u) {
        if (a && typeof a === "object" && typeof a.x === "number") {
          return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
        }
        return lerp(a, b, u);
      },
      clamp: clamp,
      leftTitle: "What you think",
      rightTitle: "What's true",
      captionBefore: "Press Play",
      captionAfter: "Notice what changed",
      duration: 2.2,
      draw: function () {},
      rough: null,
    };

    let rc = null;
    let seq = 1;

    function ensureRough() {
      if (typeof rough === "undefined") {
        rc = null;
        V.rough = null;
        return;
      }
      rc = rough.canvas(canvas);
      V.rough = rc;
    }

    function nextSeed() {
      seq += 1;
      return seq;
    }

    function ink(extra) {
      extra = extra || {};
      return Object.assign({
        roughness: 1.15,
        bowing: 1.05,
        strokeWidth: 1.7,
        stroke: "#1a2b3c",
        seed: nextSeed(),
      }, extra);
    }

    function withRough(drawRough, drawPlain) {
      if (rc) drawRough(rc);
      else drawPlain();
    }

    V.pane = function (side) {
      const dim = dims();
      const top = 42;
      const mid = dim.w / 2;
      if (side === "right") {
        return { side: "right", x: mid + 12, y: top, w: mid - 24, h: dim.h - top - 10, W: dim.w, H: dim.h };
      }
      return { side: "left", x: 12, y: top, w: mid - 24, h: dim.h - top - 10, W: dim.w, H: dim.h };
    };

    V.xy = function (pane, nx, ny) {
      return {
        x: pane.x + clamp(Number(nx), 0.05, 0.95) * pane.w,
        y: pane.y + clamp(Number(ny), 0.08, 0.92) * pane.h,
      };
    };

    V.inPane = function (pane, fn) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pane.x, pane.y, pane.w, pane.h);
      ctx.clip();
      fn();
      ctx.restore();
    };

    V.label = function (x, y, text, maxW) {
      if (!text) return;
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      const width = maxW || 140;
      const lines = wrapText(ctx, text, width - 16);
      if (!lines.length) return;
      const tw = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }));
      const w = Math.min(width, tw + 16);
      const h = lines.length * 16 + 10;
      const top = y - h - 4;
      withRough(
        function (r) {
          r.rectangle(x - w / 2, top, w, h, ink({
            fill: "rgba(255,255,255,0.94)",
            fillStyle: "solid",
            stroke: "#d2c8b8",
            strokeWidth: 1.2,
            roughness: 0.8,
          }));
        },
        function () {
          roundRect(ctx, x - w / 2, top, w, h, 8);
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.strokeStyle = "#d2c8b8";
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();
        }
      );
      ctx.fillStyle = "#1a2b3c";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach(function (line, i) {
        ctx.fillText(line, x, top + 12 + i * 16);
      });
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    };

    V.arrow = function (x1, y1, x2, y2, color, dashed) {
      const stroke = color || "#1b6ca8";
      const ang = Math.atan2(y2 - y1, x2 - x1);
      withRough(
        function (r) {
          r.line(x1, y1, x2, y2, ink({
            stroke: stroke,
            strokeWidth: 2,
            strokeLineDash: dashed ? [7, 5] : undefined,
          }));
          r.polygon([
            [x2, y2],
            [x2 - 12 * Math.cos(ang - 0.4), y2 - 12 * Math.sin(ang - 0.4)],
            [x2 - 12 * Math.cos(ang + 0.4), y2 - 12 * Math.sin(ang + 0.4)],
          ], ink({ stroke: stroke, fill: stroke, fillStyle: "solid", roughness: 0.7 }));
        },
        function () {
          ctx.save();
          ctx.strokeStyle = stroke;
          ctx.fillStyle = stroke;
          ctx.lineWidth = 3;
          if (dashed) ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - 12 * Math.cos(ang - 0.4), y2 - 12 * Math.sin(ang - 0.4));
          ctx.lineTo(x2 - 12 * Math.cos(ang + 0.4), y2 - 12 * Math.sin(ang + 0.4));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      );
    };

    /** Sketchy rectangle. Prefer this over V.rough.rect (that method does not exist). */
    V.box = function (x, y, w, h, opts) {
      opts = opts || {};
      const stroke = opts.stroke || opts.color || "#1a2b3c";
      const fill = opts.fill || "none";
      withRough(
        function (r) {
          r.rectangle(x, y, w, h, ink({
            stroke: stroke,
            fill: fill === "none" ? undefined : fill,
            fillStyle: fill === "none" ? undefined : (opts.fillStyle || "solid"),
            strokeWidth: opts.strokeWidth || 1.7,
            roughness: opts.roughness == null ? 1.05 : opts.roughness,
          }));
        },
        function () {
          ctx.save();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = opts.strokeWidth || 2;
          if (fill !== "none") {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, w, h);
          }
          ctx.strokeRect(x, y, w, h);
          ctx.restore();
        }
      );
    };

    V.ball = function (x, y, color, r) {
      const rad = r || 10;
      const fill = color || "#1b6ca8";
      withRough(
        function (rcanvas) {
          rcanvas.circle(x, y, rad * 2, ink({
            stroke: fill,
            fill: fill,
            fillStyle: "solid",
            roughness: 1.05,
          }));
        },
        function () {
          ctx.beginPath();
          ctx.fillStyle = fill;
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      );
    };

    V.person = function (x, y) {
      withRough(
        function (r) {
          r.circle(x, y - 58, 20, ink({ fill: "#1a2b3c", fillStyle: "solid", stroke: "#1a2b3c" }));
          r.line(x, y - 46, x, y - 18, ink({ stroke: "#1a2b3c", strokeWidth: 2 }));
          r.line(x - 14, y - 36, x + 14, y - 36, ink({ stroke: "#1a2b3c", strokeWidth: 2 }));
          r.line(x, y - 18, x - 12, y, ink({ stroke: "#1a2b3c", strokeWidth: 2 }));
          r.line(x, y - 18, x + 12, y, ink({ stroke: "#1a2b3c", strokeWidth: 2 }));
        },
        function () {
          ctx.save();
          ctx.strokeStyle = "#1a2b3c";
          ctx.fillStyle = "#1a2b3c";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(x, y - 58, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y - 46);
          ctx.lineTo(x, y - 18);
          ctx.moveTo(x - 14, y - 36);
          ctx.lineTo(x + 14, y - 36);
          ctx.moveTo(x, y - 18);
          ctx.lineTo(x - 12, y);
          ctx.moveTo(x, y - 18);
          ctx.lineTo(x + 12, y);
          ctx.stroke();
          ctx.restore();
        }
      );
    };

    V.sun = function (x, y, glow) {
      const g = clamp(Number(glow) || 0.7, 0.2, 1);
      const r = 12 + 14 * g;
      withRough(
        function (rcanvas) {
          rcanvas.circle(x, y, r * 2, ink({
            stroke: "#e0b429",
            fill: "rgba(244, 211, 94, " + (0.45 + 0.5 * g) + ")",
            fillStyle: "solid",
          }));
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            rcanvas.line(
              x + Math.cos(a) * (r + 6),
              y + Math.sin(a) * (r + 6),
              x + Math.cos(a) * (r + 16),
              y + Math.sin(a) * (r + 16),
              ink({ stroke: "#e0b429", strokeWidth: 2 })
            );
          }
        },
        function () {
          ctx.save();
          ctx.fillStyle = "rgba(244, 211, 94, " + (0.45 + 0.5 * g) + ")";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      );
    };

    V.leaf = function (x, y, fill) {
      const f = clamp(Number(fill) || 0.55, 0.15, 1);
      const rw = 14 + 16 * f;
      const rh = 8 + 8 * f;
      withRough(
        function (rcanvas) {
          rcanvas.ellipse(x, y, rw * 2, rh * 2, ink({
            stroke: "#2c5c33",
            fill: "rgba(58, 125, 68, " + (0.35 + 0.65 * f) + ")",
            fillStyle: "hachure",
            hachureGap: 4,
          }));
          rcanvas.line(x - 16, y + 8, x + 14, y - 10, ink({ stroke: "#2c5c33" }));
        },
        function () {
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = "rgba(58, 125, 68, " + (0.35 + 0.65 * f) + ")";
          ctx.beginPath();
          ctx.ellipse(0, 0, rw, rh, -0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      );
    };

    V.beaker = function (x, y, opts) {
      const o = opts || {};
      const h = 120, topW = 78, botW = 58;
      const fill = clamp(Number(o.fill) || 0.55, 0.12, 0.92);
      const ly = y - 10 - (h - 22) * fill;
      const liquid = o.liquid || "#5aa6d6";
      withRough(
        function (r) {
          r.polygon([
            [x - topW / 2, y - h],
            [x + topW / 2, y - h],
            [x + botW / 2, y],
            [x - botW / 2, y],
          ], ink({
            stroke: "#3b5566",
            fill: "rgba(236, 245, 250, 0.5)",
            fillStyle: "solid",
            strokeWidth: 2,
          }));
          r.rectangle(x - 28, ly, 56, Math.max(8, y - 8 - ly), ink({
            stroke: "none",
            fill: liquid,
            fillStyle: "hachure",
            hachureGap: 5,
            roughness: 0.7,
          }));
        },
        function () {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x - topW / 2, y - h);
          ctx.lineTo(x - botW / 2, y);
          ctx.quadraticCurveTo(x, y + 8, x + botW / 2, y);
          ctx.lineTo(x + topW / 2, y - h);
          ctx.closePath();
          ctx.fillStyle = "rgba(236, 245, 250, 0.72)";
          ctx.fill();
          ctx.strokeStyle = "#3b5566";
          ctx.stroke();
          ctx.restore();
        }
      );
      return { x: x, y: y, ly: ly };
    };

    V.thermometer = function (x, y, value) {
      const v = clamp(Number(value) || 0.5, 0.05, 0.95);
      withRough(
        function (r) {
          r.rectangle(x - 8, y - 110, 16, 110, ink({ fill: "#e9eef2", fillStyle: "solid", stroke: "#3b5566" }));
          r.circle(x, y, 28, ink({ fill: "#c45e1a", fillStyle: "solid", stroke: "#c45e1a" }));
          r.rectangle(x - 5, y - 8 - 90 * v, 10, 90 * v, ink({
            stroke: "none",
            fill: "#c45e1a",
            fillStyle: "solid",
            roughness: 0.6,
          }));
        },
        function () {
          ctx.save();
          ctx.fillStyle = "#e9eef2";
          roundRect(ctx, x - 8, y - 110, 16, 110, 8);
          ctx.fill();
          ctx.beginPath();
          ctx.fillStyle = "#c45e1a";
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      );
    };

    V.hill = function (pane) {
      const x0 = pane.x + 16;
      const x1 = pane.x + pane.w - 16;
      const yBase = pane.y + pane.h * 0.78;
      for (let k = 0; k < 5; k++) {
        const pts = [];
        for (let i = 0; i <= 18; i++) {
          const u = i / 18;
          const bump = Math.sin(u * Math.PI) * (42 - k * 6);
          const valley = Math.sin((u - 0.12) * 7) * (10 - k);
          pts.push([lerp(x0, x1, u), yBase - bump + valley + k * 10]);
        }
        withRough(
          function (r) {
            r.curve(pts, ink({ stroke: "#8a7a68", strokeWidth: 1.5, roughness: 1.05 }));
          },
          function () {
            ctx.beginPath();
            pts.forEach(function (pt, i) {
              if (i === 0) ctx.moveTo(pt[0], pt[1]);
              else ctx.lineTo(pt[0], pt[1]);
            });
            ctx.strokeStyle = "#8a7a68";
            ctx.stroke();
          }
        );
      }
      V.ball(pane.x + pane.w * 0.84, pane.y + pane.h * 0.58, "#1b6ca8", 5);
    };

    V.axes = function (pane, xlabel, ylabel) {
      const o = V.xy(pane, 0.16, 0.82);
      const tipx = V.xy(pane, 0.9, 0.82);
      const tipy = V.xy(pane, 0.16, 0.14);
      V.arrow(o.x, o.y, tipx.x, o.y, "#5a6b7c");
      V.arrow(o.x, o.y, o.x, tipy.y, "#5a6b7c");
      V.label(tipx.x, tipx.y + 18, xlabel || "x", 80);
      V.label(o.x, tipy.y - 4, ylabel || "y", 80);
    };

    V.curve = function (pane, path, color) {
      if (!path || path.length < 2) return;
      const pts = path.map(function (pt) {
        const p = V.xy(pane, pt[0], pt[1]);
        return [p.x, p.y];
      });
      withRough(
        function (r) {
          r.curve(pts, ink({ stroke: color || "#1b6ca8", strokeWidth: 2 }));
        },
        function () {
          ctx.save();
          ctx.strokeStyle = color || "#1b6ca8";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          pts.forEach(function (pt, i) {
            if (i === 0) ctx.moveTo(pt[0], pt[1]);
            else ctx.lineTo(pt[0], pt[1]);
          });
          ctx.stroke();
          ctx.restore();
        }
      );
    };

    V.along = function (path, t) {
      return alongPath(path, t);
    };

    V.dots = function (x, y, count, speed, color) {
      const n = Math.max(4, Math.min(20, count || 10));
      const fill = color || "#1b4f72";
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (speed || 1) * 0.4;
        const rad = 10 + (i % 4) * 6;
        V.ball(x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.7, fill, 3);
      }
    };

    function chrome() {
      seq = 1;
      const dim = resize();
      if (!rc) ensureRough();
      ctx.fillStyle = "#fbf8f1";
      ctx.fillRect(0, 0, dim.w, dim.h);
      const L = V.pane("left");
      const R = V.pane("right");
      withRough(
        function (r) {
          r.rectangle(L.x - 6, 10, L.w + 12, dim.h - 18, ink({
            fill: "#fff",
            fillStyle: "solid",
            stroke: "#d7cfc3",
            roughness: 0.7,
          }));
          r.rectangle(R.x - 6, 10, R.w + 12, dim.h - 18, ink({
            fill: "#fff",
            fillStyle: "solid",
            stroke: "#d7cfc3",
            roughness: 0.7,
          }));
          r.line(dim.w / 2, 16, dim.w / 2, dim.h - 12, ink({ stroke: "#d7cfc3", strokeWidth: 1.4 }));
        },
        function () {
          ctx.fillStyle = "#fff";
          roundRect(ctx, L.x - 6, 10, L.w + 12, dim.h - 18, 14);
          ctx.fill();
          roundRect(ctx, R.x - 6, 10, R.w + 12, dim.h - 18, 14);
          ctx.fill();
        }
      );
      ctx.font = "600 14px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillStyle = "#c45e1a";
      ctx.fillText(V.leftTitle || "What you think", L.x + L.w / 2, 30);
      ctx.fillStyle = "#1b6ca8";
      ctx.fillText(V.rightTitle || "What's true", R.x + R.w / 2, 30);
      ctx.textAlign = "start";
    }

    function frame() {
      chrome();
      try {
        V.draw(t);
      } catch (err) {
        ctx.fillStyle = "#c45e1a";
        ctx.font = "14px ui-sans-serif, system-ui";
        ctx.fillText(String(err && err.message ? err.message : err), 24, 64);
      }
      if (capEl) {
        capEl.textContent = t < 0.02 ? V.captionBefore : t >= 1 ? V.captionAfter : "playing…";
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      if (playing) t = Math.min(1, t + 0.016 / Math.max(0.6, V.duration || 2));
      frame();
    }

    function reset() {
      playing = false;
      t = 0;
      frame();
    }

    if (typeof sketchFn === "function") {
      try {
        sketchFn(V);
      } catch (err) {
        V.draw = function () {
          ctx.fillStyle = "#c45e1a";
          ctx.font = "14px ui-sans-serif, system-ui";
          ctx.fillText(String(err && err.message ? err.message : err), 24, 64);
        };
      }
    }

    window.addEventListener("resize", function () { frame(); });
    if (playBtn) playBtn.onclick = function () { if (t >= 1) reset(); playing = true; };
    if (resetBtn) resetBtn.onclick = reset;
    raf = requestAnimationFrame(loop);
    setTimeout(frame, 40);
  }

  root.VisualRuntime = { mount: mount };
})(this);
