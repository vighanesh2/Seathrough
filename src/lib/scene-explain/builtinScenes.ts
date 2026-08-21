import type { SceneProgram } from "@/lib/scene-explain/types";

const OSMOSIS_CODE = `
__maxReveal = 5;
var water = [];
var solute = [];
var i;
var membrane = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 5.2, 5.2),
  new THREE.MeshStandardMaterial({ color: 0x8ecae6, transparent: true, opacity: 0.4 })
);
scene.add(membrane);
var leftWall = new THREE.Mesh(
  new THREE.BoxGeometry(6.2, 5.2, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x1a2b3c, transparent: true, opacity: 0.25 })
);
leftWall.position.set(-3.1, 0, 2.6);
scene.add(leftWall);
var floor = new THREE.Mesh(
  new THREE.BoxGeometry(12.4, 0.08, 5.2),
  new THREE.MeshStandardMaterial({ color: 0x15202b })
);
floor.position.y = -2.64;
scene.add(floor);
for (i = 0; i < 28; i++) {
  var w = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x4cc9f0 })
  );
  w.position.set(-1.2 - Math.random() * 3.6, -2 + Math.random() * 4, -2 + Math.random() * 4);
  w.userData = { vx: 0.4 + Math.random() * 0.6, vy: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, kind: "water" };
  scene.add(w);
  water.push(w);
}
for (i = 0; i < 14; i++) {
  var s = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfb8500 })
  );
  s.position.set(1.2 + Math.random() * 3.4, -2 + Math.random() * 4, -2 + Math.random() * 4);
  s.userData = { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, vz: (Math.random() - 0.5) * 0.2, kind: "solute" };
  scene.add(s);
  solute.push(s);
}
var stage = 1;
__setReveal = function(n) { stage = n; };
function bounce(p, min, max, velKey) {
  if (p.position[velKey === "vx" ? "x" : velKey === "vy" ? "y" : "z"] < min) {
    p.userData[velKey] = Math.abs(p.userData[velKey]);
  }
  if (p.position[velKey === "vx" ? "x" : velKey === "vy" ? "y" : "z"] > max) {
    p.userData[velKey] = -Math.abs(p.userData[velKey]);
  }
}
__update = function(dt) {
  var allowCross = stage >= 3;
  water.forEach(function(p) {
    if (stage < 2) return;
    p.position.x += p.userData.vx * dt * (allowCross ? 1 : 0.4);
    p.position.y += p.userData.vy * dt;
    p.position.z += p.userData.vz * dt;
    if (!allowCross && p.position.x > -0.35) {
      p.position.x = -0.35;
      p.userData.vx = -Math.abs(p.userData.vx);
    }
    if (allowCross && p.position.x > -0.2 && p.userData.vx > 0) {
      p.userData.vx = 1.1;
    }
    bounce(p, -2.3, 2.3, "vy");
    bounce(p, -2.3, 2.3, "vz");
    if (p.position.x < -4.8) p.userData.vx = Math.abs(p.userData.vx);
    if (p.position.x > 4.8) p.userData.vx = -Math.abs(p.userData.vx);
  });
  solute.forEach(function(p) {
    p.position.x += p.userData.vx * dt;
    p.position.y += p.userData.vy * dt;
    p.position.z += p.userData.vz * dt;
    if (p.position.x < 0.4) {
      p.position.x = 0.4;
      p.userData.vx = Math.abs(p.userData.vx);
    }
    bounce(p, -2.3, 2.3, "vy");
    bounce(p, -2.3, 2.3, "vz");
    if (p.position.x > 4.8) p.userData.vx = -Math.abs(p.userData.vx);
  });
};
`.trim();

export const OSMOSIS_SCENE: SceneProgram = {
  title: "Osmosis",
  maxReveal: 5,
  beats: [
    {
      order: 1,
      reveal: 1,
      narration: "Two sides of a tank, split by a thin membrane. Water is blue. Solute is orange.",
    },
    {
      order: 2,
      reveal: 2,
      narration: "The left side is hypotonic: lots of water, little solute. The right is hypertonic.",
    },
    {
      order: 3,
      reveal: 3,
      narration: "The membrane lets water through, but the bigger solute particles stay put.",
    },
    {
      order: 4,
      reveal: 4,
      narration: "Water crosses toward the saltier side — that's osmosis.",
    },
    {
      order: 5,
      reveal: 5,
      narration: "Levels even out until the two sides match. Water still moves, but the net flow is zero.",
    },
  ],
  code: OSMOSIS_CODE,
};

const MATRIX_MULT_CODE = `
__maxReveal = 5;
function numSprite(text, x, y, z, size) {
  var c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  var g = c.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = "#f4efe4";
  g.font = "700 78px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text), 64, 70);
  var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  spr.position.set(x, y, z);
  spr.scale.set(size, size, 1);
  scene.add(spr);
  return spr;
}
function tile(x, y, color) {
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.92, 0.08),
    new THREE.MeshStandardMaterial({ color: color })
  );
  m.position.set(x, y, 0);
  scene.add(m);
  return m;
}
function bracketPair(cx, cy, color) {
  var mat = new THREE.MeshStandardMaterial({ color: color });
  var h = 2.28;
  var left = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), mat);
  left.position.set(cx - 1.12, cy, 0.05);
  scene.add(left);
  var right = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), mat);
  right.position.set(cx + 1.12, cy, 0.05);
  scene.add(right);
  var i;
  var ys = [cy + h / 2, cy - h / 2];
  for (i = 0; i < 2; i++) {
    var lt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), mat);
    lt.position.set(cx - 1.0, ys[i], 0.05);
    scene.add(lt);
    var rt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), mat);
    rt.position.set(cx + 1.0, ys[i], 0.05);
    scene.add(rt);
  }
}
function grid(cx, cy, vals, color, showNums) {
  var offs = [[-0.48, 0.48], [0.48, 0.48], [-0.48, -0.48], [0.48, -0.48]];
  var tiles = [];
  var labels = [];
  var i;
  bracketPair(cx, cy, color);
  for (i = 0; i < 4; i++) {
    tiles.push(tile(cx + offs[i][0], cy + offs[i][1], color));
    var lab = numSprite(vals[i], cx + offs[i][0], cy + offs[i][1], 0.2, 0.7);
    lab.visible = !!showNums;
    labels.push(lab);
  }
  return { tiles: tiles, labels: labels };
}
var A = grid(-4.35, 0.35, [1, 2, 3, 4], 0x1b6ca8, true);
var B = grid(-0.15, 0.35, [5, 6, 7, 8], 0xb86a1e, true);
var C = grid(4.15, 0.35, [19, 22, 43, 50], 0x2a7a5c, false);
var times = numSprite("×", -2.25, 0.35, 0.2, 0.55);
var eq = numSprite("=", 2.05, 0.35, 0.2, 0.55);
times.visible = false;
eq.visible = false;
C.tiles.forEach(function(m) { m.visible = false; });
var rowHL = new THREE.Mesh(
  new THREE.BoxGeometry(2.05, 1.05, 0.04),
  new THREE.MeshStandardMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.35 })
);
rowHL.position.set(-4.35, 0.83, -0.08);
scene.add(rowHL);
var colHL = new THREE.Mesh(
  new THREE.BoxGeometry(1.05, 2.05, 0.04),
  new THREE.MeshStandardMaterial({ color: 0xfb8500, transparent: true, opacity: 0.35 })
);
colHL.position.set(-0.63, 0.35, -0.08);
scene.add(colHL);
rowHL.visible = false;
colHL.visible = false;
var stage = 1;
__setReveal = function(n) {
  stage = n;
  times.visible = n >= 2;
  eq.visible = n >= 2;
  C.tiles.forEach(function(m) { m.visible = n >= 2; });
  C.labels[0].visible = n >= 3;
  C.labels[1].visible = n >= 4;
  C.labels[2].visible = n >= 5;
  C.labels[3].visible = n >= 5;
  rowHL.visible = n >= 3;
  colHL.visible = n >= 3;
  if (n === 4) colHL.position.x = 0.33;
  if (n >= 5) {
    rowHL.position.y = -0.13;
    colHL.position.x = -0.15;
    colHL.scale.x = 2.05;
  }
};
__update = function(dt, time) {
  if (stage >= 3 && stage < 5) {
    var pulse = 0.28 + 0.12 * Math.sin(time * 4);
    rowHL.material.opacity = pulse;
    colHL.material.opacity = pulse;
  }
};
`.trim();

export const MATRIX_MULT_SCENE: SceneProgram = {
  title: "Matrix multiplication",
  maxReveal: 5,
  beats: [
    {
      order: 1,
      reveal: 1,
      narration:
        "Two 2-by-2 matrices. A is blue: 1, 2 on top, 3, 4 below. B is orange: 5, 6 on top, 7, 8 below.",
    },
    {
      order: 2,
      reveal: 2,
      narration:
        "Their product C has the same number of rows as A and columns as B. Each slot will be a row dotted with a column.",
    },
    {
      order: 3,
      reveal: 3,
      narration:
        "Top-left of C: row 1 of A times column 1 of B. 1 times 5 plus 2 times 7 is 19.",
    },
    {
      order: 4,
      reveal: 4,
      narration:
        "Top-right: same row of A against B's second column. 1 times 6 plus 2 times 8 is 22.",
    },
    {
      order: 5,
      reveal: 5,
      narration:
        "Bottom row the same way: 3, 4 dotted with each column of B gives 43 and 50. That's C.",
    },
  ],
  code: MATRIX_MULT_CODE,
};

export function builtinSceneForPrompt(prompt: string): SceneProgram | null {
  const blob = prompt.toLowerCase();
  if (/\bosmosis\b|\bhypertonic\b|\bhypotonic\b|\bsemipermeable\b/.test(blob)) {
    return OSMOSIS_SCENE;
  }
  if (
    (/\bmatrix\b/.test(blob) || /\bmatrices\b/.test(blob)) &&
    /\b(multipl|product|times)/.test(blob) &&
    !/\b(movie|reloaded|revolutions|keanu|morpheus)\b/.test(blob)
  ) {
    return MATRIX_MULT_SCENE;
  }
  return null;
}

const GENERIC_CODE = `
__maxReveal = 3;
var hub = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0x1b6ca8 })
);
scene.add(hub);
var nodes = [];
var i;
for (i = 0; i < 8; i++) {
  var n = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2a7a5c : 0xb86a1e })
  );
  n.userData = { a: (i / 8) * Math.PI * 2, r: 2.4 };
  scene.add(n);
  nodes.push(n);
}
var stage = 1;
__setReveal = function(n) { stage = n; };
__update = function(dt, time) {
  hub.rotation.y += dt * 0.4;
  nodes.forEach(function(p, idx) {
    var on = stage >= 2 || idx < 4;
    p.visible = on;
    var a = p.userData.a + time * (0.4 + idx * 0.03);
    var r = p.userData.r + (stage >= 3 ? 0.3 * Math.sin(time + idx) : 0);
    p.position.set(Math.cos(a) * r, Math.sin(a * 0.7) * 0.6, Math.sin(a) * r);
  });
};
`.trim();

export function fallbackSceneForPrompt(prompt: string): SceneProgram {
  const builtin = builtinSceneForPrompt(prompt);
  if (builtin) return builtin;
  const title = prompt
    .replace(/^(please\s+)?(explain|show me|what is|what's|draw)\s+/i, "")
    .replace(/\?+$/g, "")
    .trim()
    .slice(0, 60) || "Process";
  return {
    title,
    maxReveal: 3,
    beats: [
      {
        order: 1,
        reveal: 1,
        narration: `This is a simple 3D stand-in while we talk through ${title}.`,
      },
      {
        order: 2,
        reveal: 2,
        narration: "The pieces in orbit are the moving parts of the process.",
      },
      {
        order: 3,
        reveal: 3,
        narration: "Ask again with more detail if you want a closer model of a specific step.",
      },
    ],
    code: GENERIC_CODE,
  };
}
