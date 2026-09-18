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
    return lines.slice(0, 3);
  }

  function tag(ctx, x, y, text, maxW) {
    if (!text) return;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    const lines = wrapText(ctx, text, maxW - 16);
    if (!lines.length) return;
    const tw = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }));
    const w = Math.min(maxW, tw + 16);
    const h = lines.length * 16 + 10;
    roundRect(ctx, x - w / 2, y - h, w, h, 8);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.strokeStyle = "#d2c8b8";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a2b3c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach(function (l, i) {
      ctx.fillText(l, x, y - h + 12 + i * 16);
    });
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function pane(scene, side, W, H) {
    const top = 42;
    if (scene.layout === "split") {
      const mid = W / 2;
      if (side === "right") return { x: mid + 10, y: top, w: mid - 22, h: H - top - 8 };
      return { x: 12, y: top, w: mid - 22, h: H - top - 8 };
    }
    return { x: 16, y: top, w: W - 32, h: H - top - 8 };
  }

  function xy(box, o) {
    return {
      x: box.x + clamp(Number(o.x) || 0.5, 0.08, 0.92) * box.w,
      y: box.y + clamp(Number(o.y) || 0.55, 0.12, 0.9) * box.h,
    };
  }

  function drawBeaker(ctx, x, y, o) {
    const h = 132, topW = 86, botW = 64;
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
    ctx.lineWidth = 3;
    ctx.stroke();

    const fill = clamp(Number(o.fill) || 0.55, 0.12, 0.92);
    const ly = y - 10 - (h - 22) * fill;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - topW / 2, y - h);
    ctx.lineTo(x - botW / 2, y);
    ctx.quadraticCurveTo(x, y + 8, x + botW / 2, y);
    ctx.lineTo(x + topW / 2, y - h);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = o.liquid || "#5aa6d6";
    ctx.fillRect(x - 50, ly, 100, y + 12 - ly);
    ctx.beginPath();
    ctx.ellipse(x, ly, 38, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = o.liquidTop || "rgba(255,255,255,0.35)";
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(x, y - h, topW / 2, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fill();
    ctx.strokeStyle = "#3b5566";
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.moveTo(x - 22, y - h + 18);
    ctx.lineTo(x - 18, y - 16);
    ctx.stroke();
    ctx.restore();
    return { x: x, y: y, w: topW, h: h, ly: ly };
  }

  function drawFlame(ctx, x, y, t) {
    const flicker = 1 + Math.sin(t * 9) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, flicker);
    function leaf(h, fill) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-14, -h * 0.35, -10, -h * 0.75, 0, -h);
      ctx.bezierCurveTo(10, -h * 0.75, 14, -h * 0.35, 0, 0);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    leaf(46, "#e85d04");
    leaf(34, "#f4a261");
    leaf(20, "#ffe8a3");
    ctx.restore();
  }

  function drawIce(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(186, 224, 245, 0.9)";
    ctx.strokeStyle = "#7ba7c2";
    ctx.lineWidth = 1.5;
    [[-10, -6, 16, 14], [4, -2, 14, 12], [-4, 6, 12, 10]].forEach(function (r) {
      roundRect(ctx, r[0], r[1], r[2], r[3], 3);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawThermometer(ctx, x, y, value) {
    const v = clamp(Number(value) || 0.5, 0.05, 0.95);
    const h = 110;
    ctx.save();
    ctx.strokeStyle = "#4a5d6c";
    ctx.lineWidth = 3;
    roundRect(ctx, x - 8, y - h, 16, h - 10, 8);
    ctx.fillStyle = "#f7fbff";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#e63946";
    ctx.fill();
    ctx.stroke();
    const fillH = (h - 28) * v;
    roundRect(ctx, x - 4, y - 18 - fillH, 8, fillH + 8, 4);
    ctx.fillStyle = "#e63946";
    ctx.fill();
    ctx.fillStyle = "#4a5d6c";
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const yy = y - 22 - i * 18;
      ctx.fillRect(x + 10, yy, 6, 1.5);
    }
    ctx.restore();
  }

  function drawPerson(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = "#1a2b3c";
    ctx.fillStyle = "#f4efe6";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y - 78, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 64);
    ctx.lineTo(x, y - 28);
    ctx.moveTo(x, y - 54);
    ctx.lineTo(x - 18, y - 40);
    ctx.moveTo(x, y - 54);
    ctx.lineTo(x + 22, y - 42);
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x - 14, y);
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x + 14, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBall(ctx, x, y, color) {
    const g = ctx.createRadialGradient(x - 6, y - 8, 4, x, y, 16);
    g.addColorStop(0, "#fff6");
    g.addColorStop(0.2, color || "#1b6ca8");
    g.addColorStop(1, "#0d3a5c");
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawSun(ctx, x, y, glow) {
    const g = clamp(Number(glow) || 0.65, 0.2, 1);
    const r = 12 + 14 * g;
    ctx.save();
    ctx.fillStyle = `rgba(244, 211, 94, ${0.45 + 0.5 * g})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4d35e";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
      ctx.lineTo(x + Math.cos(a) * (r + 16), y + Math.sin(a) * (r + 16));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeaf(ctx, x, y, fill) {
    const f = clamp(Number(fill) || 0.55, 0.15, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(58, 125, 68, ${0.35 + 0.65 * f})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 + 16 * f, 8 + 8 * f, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2c5c33";
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(14, -10);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowVec(ctx, ox, oy, x, y, color, dashed) {
    ctx.save();
    ctx.strokeStyle = color || "#1b6ca8";
    ctx.fillStyle = color || "#1b6ca8";
    ctx.lineWidth = 3;
    if (dashed) ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(y - oy, x - ox);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 12 * Math.cos(ang - 0.4), y - 12 * Math.sin(ang - 0.4));
    ctx.lineTo(x - 12 * Math.cos(ang + 0.4), y - 12 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHeatFlow(ctx, ax, ay, bx, by, amount, clock, label, maxW) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const u = (i / n + clock * 0.25 * amount) % 1;
      const x = lerp(ax, bx, u);
      const y = lerp(ay, by, u) + Math.sin(u * Math.PI) * -10;
      ctx.globalAlpha = 0.25 + 0.65 * amount;
      ctx.fillStyle = "rgba(120, 130, 140, 0.55)";
      ctx.beginPath();
      ctx.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c45e1a";
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x + 2, y - 5);
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 2, y + 5);
      ctx.strokeStyle = "#c45e1a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (label) tag(ctx, (ax + bx) / 2, (ay + by) / 2 - 18, label, maxW);
  }

  function alongPath(path, u) {
    if (!path || path.length < 2) return null;
    const t = clamp(u, 0, 1) * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(t));
    const local = t - i;
    return {
      x: lerp(Number(path[i][0]), Number(path[i + 1][0]), local),
      y: lerp(Number(path[i][1]), Number(path[i + 1][1]), local),
    };
  }

  function drawValley(ctx, box) {
    const cx = box.x + box.w * 0.58;
    const cy = box.y + box.h * 0.55;
    for (let i = 6; i >= 1; i--) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, box.w * (0.1 + i * 0.105), box.h * (0.05 + i * 0.055), 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(27, 108, 168, " + (0.035 + i * 0.025) + ")";
      ctx.fill();
      ctx.strokeStyle = "rgba(27, 108, 168, 0.38)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    const mx = box.x + box.w * 0.84;
    const my = box.y + box.h * 0.55;
    ctx.fillStyle = "#1b6ca8";
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
    tag(ctx, mx, my - 10, "minimum", 88);
  }

  function drawPath(ctx, box, path, color, showArrows) {
    if (!path || path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color || "#1b6ca8";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    path.forEach(function (pt, i) {
      const x = box.x + clamp(pt[0], 0.05, 0.95) * box.w;
      const y = box.y + clamp(pt[1], 0.08, 0.92) * box.h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    if (showArrows) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = {
          x: box.x + clamp(path[i][0], 0.05, 0.95) * box.w,
          y: box.y + clamp(path[i][1], 0.08, 0.92) * box.h,
        };
        const b = {
          x: box.x + clamp(path[i + 1][0], 0.05, 0.95) * box.w,
          y: box.y + clamp(path[i + 1][1], 0.08, 0.92) * box.h,
        };
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillStyle = color || "#1b6ca8";
        ctx.beginPath();
        ctx.moveTo(mx + 7 * Math.cos(ang), my + 7 * Math.sin(ang));
        ctx.lineTo(mx - 6 * Math.cos(ang - 0.5), my - 6 * Math.sin(ang - 0.5));
        ctx.lineTo(mx - 6 * Math.cos(ang + 0.5), my - 6 * Math.sin(ang + 0.5));
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawTrail(ctx, box, trail, color) {
    if (!trail || trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color || "#1b6ca8";
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    ctx.beginPath();
    trail.forEach(function (pt, i) {
      const p = xy(box, pt);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function makeParticles(count, geom) {
    const n = Math.max(4, Math.min(24, count | 0));
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: geom.x + (Math.random() - 0.5) * 40,
        y: geom.ly + 10 + Math.random() * Math.max(20, geom.y - geom.ly - 24),
        vx: (Math.random() - 0.5),
        vy: (Math.random() - 0.5),
      });
    }
    return out;
  }

  function mount(canvas, scene, playBtn, resetBtn, capEl) {
    const ctx = canvas.getContext("2d");
    const objects = (scene.objects || []).map(function (o, i) {
      return Object.assign({ id: "o" + i, side: o.side || "", kind: o.kind || "label" }, o);
    });
    const byId = {};
    objects.forEach(function (o) { byId[o.id] = o; });
    const particles = {};
    let playing = false, t = 0, clock = 0, raf = 0;
    const base = JSON.parse(JSON.stringify(objects));

    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(r.width * (window.devicePixelRatio || 1)));
      canvas.height = Math.max(240, Math.floor(r.height * (window.devicePixelRatio || 1)));
    }

    function geomOf(id) {
      const o = byId[id];
      if (!o) return null;
      const box = pane(scene, o.side, canvas.width, canvas.height);
      const p = xy(box, o);
      return { x: p.x, y: p.y, box: box };
    }

    function applyPlay(u) {
      (scene.play || []).forEach(function (track) {
        const o = byId[track.id];
        if (!o) return;
        if (Array.isArray(track.along) && track.along.length >= 2 && o.path && o.path.length >= 2) {
          const along = lerp(Number(track.along[0]), Number(track.along[1]), u);
          const p = alongPath(o.path, along);
          if (p) {
            o.x = p.x;
            o.y = p.y;
            o.trail = o.trail || [];
            o.trail.push({ x: o.x, y: o.y });
            if (o.trail.length > 90) o.trail.shift();
          }
          return;
        }
        Object.keys(track).forEach(function (k) {
          if (k === "id" || k === "along" || !Array.isArray(track[k]) || track[k].length < 2) return;
          if (typeof track[k][0] !== "number") return;
          o[k] = lerp(Number(track[k][0]), Number(track[k][1]), u);
        });
      });
    }

    function draw() {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fbf8f1";
      ctx.fillRect(0, 0, W, H);

      if (scene.layout === "split") {
        ctx.fillStyle = "#fff";
        const L = pane(scene, "left", W, H);
        const R = pane(scene, "right", W, H);
        roundRect(ctx, L.x - 6, 10, L.w + 12, H - 18, 14);
        ctx.fill();
        ctx.fillStyle = "#fff";
        roundRect(ctx, R.x - 6, 10, R.w + 12, H - 18, 14);
        ctx.fill();
        ctx.fillStyle = "#d7cfc3";
        ctx.fillRect(W / 2 - 1, 12, 2, H - 24);
        ctx.font = "600 14px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillStyle = "#c45e1a";
        ctx.fillText(scene.leftTitle || "What you think", L.x + L.w / 2, 30);
        ctx.fillStyle = "#1b6ca8";
        ctx.fillText(scene.rightTitle || "What's true", R.x + R.w / 2, 30);
        ctx.textAlign = "start";
      }

      const geoms = {};
      objects.forEach(function (o) {
        const box = pane(scene, o.side, W, H);
        const p = xy(box, o);
        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h);
        ctx.clip();

        if (o.kind === "valley") {
          drawValley(ctx, box);
        } else if (o.kind === "beaker" || o.kind === "flask") {
          geoms[o.id] = drawBeaker(ctx, p.x, p.y, o);
          if (o.flame) drawFlame(ctx, p.x, p.y + 18, clock);
          if (o.ice) drawIce(ctx, p.x, p.y - 48);
          tag(ctx, p.x, box.y + box.h - 8, o.label, Math.min(160, box.w - 16));
        } else if (o.kind === "thermometer") {
          drawThermometer(ctx, p.x, p.y, o.value);
          tag(ctx, p.x, p.y - 128, o.label || "temp", 90);
        } else if (o.kind === "flame") {
          drawFlame(ctx, p.x, p.y, clock);
          tag(ctx, p.x, p.y + 22, o.label, 100);
        } else if (o.kind === "person") {
          drawPerson(ctx, p.x, p.y);
          tag(ctx, p.x, p.y - 100, o.label, 120);
        } else if (o.kind === "ball" || o.kind === "marble") {
          if (o.path) drawPath(ctx, box, o.path, o.color, o.kind === "marble");
          drawTrail(ctx, box, o.trail, o.color);
          drawBall(ctx, p.x, p.y, o.color);
          tag(ctx, p.x, p.y - 22, o.label, 120);
        } else if (o.kind === "sun") {
          drawSun(ctx, p.x, p.y, o.glow);
          tag(ctx, p.x, p.y + 44, o.label, 100);
        } else if (o.kind === "leaf") {
          drawLeaf(ctx, p.x, p.y, o.fill);
          tag(ctx, p.x, p.y + 28, o.label, 100);
        } else if (o.kind === "arrow") {
          const origin = pane(scene, o.side, W, H);
          drawArrowVec(ctx, origin.x + origin.w / 2, origin.y + origin.h / 2, p.x, p.y, o.color, o.dashed);
          tag(ctx, p.x, p.y - 10, o.label, 120);
        } else if (o.kind === "label") {
          tag(ctx, p.x, p.y, o.text || o.label, Math.min(200, box.w - 20));
        } else if (o.kind === "heatFlow") {
          const a = geomOf(o.from) || p;
          const b = geomOf(o.to) || p;
          drawHeatFlow(ctx, a.x, a.y - 50, b.x, b.y - 50, clamp(Number(o.amount) || 0, 0, 1), clock, o.label, 140);
        } else if (o.kind === "particles") {
          const host = geoms[o.attach] || geoms[o.from];
          if (host) {
            if (!particles[o.id]) particles[o.id] = makeParticles(o.count || 12, host);
            const speed = Number(o.speed) || 1;
            const dots = particles[o.id];
            ctx.save();
            ctx.beginPath();
            ctx.rect(host.x - 38, host.ly, 76, host.y - host.ly - 6);
            ctx.clip();
            dots.forEach(function (d) {
              if (playing) {
                d.x += d.vx * speed;
                d.y += d.vy * speed;
                if (d.x < host.x - 34 || d.x > host.x + 34) d.vx *= -1;
                if (d.y < host.ly + 6 || d.y > host.y - 12) d.vy *= -1;
              }
              ctx.beginPath();
              ctx.fillStyle = "#1b4f72";
              ctx.arc(d.x, d.y, 3.2, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();
          }
        }
        ctx.restore();
      });
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      clock += 0.016;
      if (playing) t = Math.min(1, t + 0.01);
      applyPlay(t);
      draw();
      if (capEl) {
        capEl.textContent = t < 0.02 ? (scene.captionBefore || "Press Play") : t >= 1 ? (scene.captionAfter || "Notice what changed") : "playing…";
      }
    }

    function reset() {
      playing = false;
      t = 0;
      objects.forEach(function (o, i) {
        Object.keys(o).forEach(function (k) { delete o[k]; });
        Object.assign(o, JSON.parse(JSON.stringify(base[i])));
        byId[o.id] = o;
      });
      Object.keys(particles).forEach(function (k) { delete particles[k]; });
      draw();
    }

    resize();
    window.addEventListener("resize", function () { resize(); draw(); });
    if (playBtn) playBtn.onclick = function () { if (t >= 1) reset(); playing = true; };
    if (resetBtn) resetBtn.onclick = reset;
    raf = requestAnimationFrame(loop);
    setTimeout(function () { resize(); }, 40);
  }

  root.VisualKit = { mount: mount };
})(this);
