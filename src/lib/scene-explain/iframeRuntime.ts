/**
 * Sandboxed iframe runtime. User code is JSON-encoded so it cannot break out
 * of the script tag. THREE loads from jsdelivr (same version as the app).
 */

const THREE_MODULE =
  "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

export function buildSceneIframeSrc(code: string): string {
  const payload = JSON.stringify(code);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; height: 100%; background: #1a2b3c; overflow: hidden; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
<script type="module">
import * as THREE from ${JSON.stringify(THREE_MODULE)};

const userCode = ${payload};
const parentOrigin = "*";

function report(type, extra) {
  parent.postMessage({ source: "seethrough-scene", type, ...extra }, parentOrigin);
}

window.addEventListener("error", (event) => {
  report("error", { message: String(event.message || "Scene crashed") });
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  report("error", {
    message: reason instanceof Error ? reason.message : String(reason || "Scene promise failed"),
  });
});

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x0f1720, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
let rotY = 0.55;
let rotX = 0.32;
let dist = 16;

function applyCamera() {
  const cy = Math.cos(rotX);
  camera.position.set(
    dist * Math.sin(rotY) * cy,
    dist * Math.sin(rotX),
    dist * Math.cos(rotY) * cy,
  );
  camera.lookAt(0, 0, 0);
}
applyCamera();

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.05);
key.position.set(6, 10, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aacc, 0.35);
fill.position.set(-8, 2, -4);
scene.add(fill);
scene.add(new THREE.GridHelper(20, 20, 0x1b6ca8, 0x1a2b3c));

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
resize();
window.addEventListener("resize", resize);

let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", () => { dragging = false; });
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  rotY -= (e.clientX - lastX) * 0.008;
  rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - lastY) * 0.008));
  lastX = e.clientX;
  lastY = e.clientY;
  applyCamera();
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  dist = Math.max(6, Math.min(36, dist + e.deltaY * 0.02));
  applyCamera();
}, { passive: false });

let __update = function () {};
let __setReveal = function () {};
let __maxReveal = 4;

async function start() {
  window.THREE = THREE;
  window.scene = scene;
  window.camera = camera;
  window.renderer = renderer;
  const tag = document.createElement("script");
  tag.textContent = [
    "var THREE = window.THREE;",
    "var scene = window.scene;",
    "var camera = window.camera;",
    "var renderer = window.renderer;",
    "var __update = function(){};",
    "var __setReveal = function(){};",
    "var __maxReveal = 4;",
    String(userCode),
    "window.__sceneApi = { update: __update, setReveal: __setReveal, maxReveal: __maxReveal };",
  ].join("\\n");
  document.head.appendChild(tag);
  const api = window.__sceneApi || {};
  if (typeof api.update === "function") __update = api.update;
  if (typeof api.setReveal === "function") __setReveal = api.setReveal;
  if (typeof api.maxReveal === "number" && api.maxReveal > 0) __maxReveal = api.maxReveal;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "seethrough-host") return;
    if (data.type === "reveal") {
      try { __setReveal(Number(data.n) || 1); }
      catch (err) {
        report("error", { message: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try { __update(dt, now / 1000); }
    catch (err) {
      report("error", { message: err instanceof Error ? err.message : String(err) });
      return;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  __setReveal(1);
  report("ready", { maxReveal: __maxReveal });
  requestAnimationFrame(tick);
}

start().catch((err) => {
  report("error", { message: err instanceof Error ? err.message : String(err) });
});
</script>
</body>
</html>`;
}
