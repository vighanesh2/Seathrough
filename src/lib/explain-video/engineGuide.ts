/**
 * What the scene-writing model is told about the film runtime.
 * Must stay in step with public/film-engine/core.js (vendored) and public/film-engine/kit.js.
 */
export const ENGINE_GUIDE = String.raw`
THE FRAME
- 16:9. Logical units: W = 1920, H = 1080, CX = 960, CY = 540. Always draw in these units; the runtime scales to the output size.
- A scene is function sceneN(c, tau, i) { ... }. c is a CanvasRenderingContext2D. tau = seconds since this scene started (0..dur). i = a 12 fps frame counter for pulse/flicker.
- The palette for the film's look is already active as PAL. The runtime draws the caption (the scene's "say" line) in a band at y >= 918 after your scene. Keep everything important between y = 60 and y = 880. Never write the caption yourself.

HARD RULES
- Pure function of tau and i. No state between frames, no Math.random (use rng(seed)), no Date, no timers, no DOM, no network, no await.
- Every frame starts by covering the background: paper(c) — or night(c) when PAL.paper is dark.
- All helper functions and constants live INSIDE the scene function. Nothing outside it.
- No while loops. Keep every for loop small (under ~2000 iterations per frame in total).
- Plain JavaScript (ES2022). No imports, no classes needed.

CRAFT (what separates a film from a diagram)
- Draw forms, not outlines of ellipses. Build recognisable silhouettes from points (blob, curvePath through authored points, warp(rectPts(...))). Fill them (c.fill(path) with PAL.fills[k] or PAL.light), texture them with surface(c, path, box) or hatch, then outline with wob at lineWidth 3–5.
- The subject is big: 450–800 units tall, placed on purpose (thirds or centre), with breathing room. Labels sit next to what they name, joined by a short leader line (wob) or an arrow.
- Colour carries meaning and stays the same across scenes (the same thing is always the same fill). Keep conventional colours right (e.g. oxygen-poor blood blue, oxygen-rich red).
- Something always moves: particles flowing along a path (for k of n: u = (tau * speed + k / n) % 1, position = bez(p0, p1, p2, p3, u)), a pulse (scale 1 + .06 * breathe(tau, .9)), a pointer arrow drawing on, a slow camera push.
- Never declare variables with library names (rng, key, arc, sm, lerp, clamp, mix, tint, shade, alpha, blob, wob, grain, W, H, CX, CY, S, PAL). Write const r = rng(7), not const rng = rng(7).

MOTION AND STAGING
- Build the picture over time: things draw on (selfDraw / arrow progress), grow (spring, easeOutBack), move on eased paths (key, keyPath, arc). Nothing linear unless it is a steady flow.
- Stage in beats inside the scene: the first element lands by ~0.8 s, the idea is fully shown by ~70% of dur, the last 20% holds so it reads.
- One clear picture per scene: a mechanism, a diagram, a comparison, a before/after, a character doing something. Big shapes, few words. Labels are 1–3 words drawn with handText.
- A slow camera push (cam or camKeys, zoom 1 → 1.06) adds life. After camera moves, call resetT(c) before drawing anything that must stay fixed.

API — colour
PAL.paper PAL.ink PAL.shade PAL.light PAL.blush PAL.night PAL.chalk PAL.chalkDim PAL.guide  (strings)
PAL.fills[0..3] (fill colours, riso/screen have more)  PAL.accents[0..3] (loud accents)  PAL.inks[0..2]
mix(a, b, t)  tint(col, t) lighter  shade(col, t) darker  alpha(col, a) -> rgba string

API — time and motion (all pure)
sm(a, b, tau, ease?) -> 0..1 eased between times a and b (default easeIO)
lerp(a, b, t)  clamp(v, lo, hi)
easeIO easeOut easeIn easeOutBack easeOutElastic easeInOutSine easeOutQuint (t -> t)
spring(t, {freq: 2.4, damp: .55}) -> 0..1 with overshoot, t = seconds since the move started (0 before)
settle(t, t0, {amp, freq, decay}) -> damped wobble after t0
key(t, [[t0, v...], [t1, v...], ...]) -> number or array, eased between keys
keyPath(t, [[t0, x, y], [t1, x, y], ...]) -> [x, y] on a smooth curve
arc(a, b, u, lift) -> [x, y] on a hop from a to b (u 0..1)
drift(t, seed, {amp, freq}) -> organic wander   breathe(t, period) -> 0..1 idle cycle
pulse(i, every, hold) -> bool   flicker(i, period) -> bool
rng(seed) -> () => 0..1 (call rng(seed) inside the frame so it repeats identically)   noise1(x, seed) -> -1..1

API — geometry (a "pts" is an array of [x, y])
ellPts(cx, cy, rx, ry, rot = 0, n = 44)   rectPts(x, y, w, h)   blob(cx, cy, rx, ry, seed, {amp: .05, rot})  (organic ellipse pts)
warp(pts, seed, amp = 4, close = true)  (bend a polygon slightly)   smoothPts(pts, close)   pathLength(pts, close)
polyPath(pts, close = true) curvePath(pts, close = true) -> Path2D
circPath(cx, cy, r) ellPath(cx, cy, rx, ry, rot) rectPath(x, y, w, h) roundRectPath(x, y, w, h, r) -> Path2D
bez(p0, p1, p2, p3, t) -> [x, y]

API — marks (strokes use the current c.strokeStyle and c.lineWidth)
wob(c, pts, amp, seed, close = false, {pressure: 0..1})  hand-drawn outline; amp 1..3
selfDraw(c, pts, progress, seed, amp = 1.5, close = false)  draws the outline on, progress 0..1
crayon(c, pts, color, width, seed, close)  grainy crayon line
hatch(c, path, box, {angle, gap: 7, len: 14, color, alpha: .35, width: 1.2, seed})  hatching clipped to path; box = [x, y, w, h] bounding the path
grain(c, path, box, n, color, alpha, seed, size = 1.8)  speckle (n <= 3000)
surface(c, path, box, {color, density: .5, seed})  the look's own texture (ink hatch, riso/screen dots, pencil graphite). Call after c.fill(path).
dotScreen(c, path, box, {cell: 7, color, density: .5 or (x, y) => 0..1, angle, seed})  halftone
scribble(c, path, cx, cy, {seed})  misregistered accent outlines   construction(c, cx, cy, R, seed)  faint guide lines   cross(c, x, y, s)

API — text
handText(c, text, x, y, {size: 64, ink: PAL.ink, ink2: PAL.accents[0] or null, align: 'left'|'center'|'right'})  y is the baseline. ink2 null = clean single ink.
textBlock(c, text, x, y, maxWidth, {size: 40, font: 'hand'|'serif', align, ink, progress: 0..1 types it on, maxLines: 4}) -> y below the block. y is the top.
squiggleText(c, x, y, w, lines, {seed})  illegible writing (a letter, a page of notes)

API — motifs and backgrounds
paper(c)  fills the frame with paper + grain and resets the transform.   night(c)  dark sky with specks.
arrow(c, [x0, y0], [x1, y1], {progress: 0..1, color, width: 3, bend: 0, head: 18, seed, dash: [12, 10]})
seedDot(c, x, y, r = 9)   ripples(c, cx, cy, [r1, r2...], color, seed, width)   dashedRing(c, cx, cy, r, color, seed)   dottedArc(c, cx, cy, r, color, seed)
aster(c, x, y, r, rays, color, seed, grow = 1)  spark/nucleus   dotBurst(c, x, y, R, rays, color, seed, grow = 1)   speedLines(c, x, y, dir, seed, n = 7, alpha = .6, color)
plant(c, x, y, len, depth, seed, {leaf, flower})   stickyNote(c, x, y, size, seed, (c, s) => {...})   section(c, y, color, seed)  torn paper band from y down   thread(c, x, seed, color)

API — camera and composition
cam(c, x, y, zoom, rot = 0)  world point (x, y) at the frame centre.   camKeys(c, tau, [[t, x, y, zoom], ...], {hand: 0..6})   resetT(c)  plain frame again.
iris(c, cx, cy, r, (c) => {...}, outsideColor)  draw inside a circle only.   flash(c)  one pale frame.
Standard canvas calls work too: c.fillStyle, c.fill(path), c.stroke(path), c.save()/c.restore(), c.translate/rotate/scale, c.globalAlpha.

PERFORMANCE (each frame must draw in well under 150 ms)
- hatch / surface / dotScreen: at most ~6 per frame and not over the whole frame at small cell sizes.
- grain n <= 3000. No per-pixel work. No getImageData.

EXAMPLE (a scene about a letter travelling through a mail sorting office; notice the staging, easing, labels, holds)
function scene2(c, tau, i) {
  paper(c);
  camKeys(c, tau, [[0, CX, CY, 1], [7, CX + 40, CY - 10, 1.06]]);
  const bins = [[520, 'City'], [960, 'Region'], [1400, 'Abroad']];
  const grow = sm(.2, 1.0, tau, easeOutBack);
  bins.forEach(([x, name], k) => {
    const box = warp(rectPts(x - 150, 520, 300, 240), 40 + k, 5);
    const path = polyPath(box);
    c.save(); c.globalAlpha = grow;
    c.fillStyle = PAL.fills[k % PAL.fills.length]; c.fill(path);
    surface(c, path, [x - 150, 520, 300, 240], { seed: 10 + k, density: .35 });
    c.strokeStyle = PAL.ink; c.lineWidth = 3; wob(c, box, 1.8, 20 + k, true);
    handText(c, name, x, 820, { size: 46, align: 'center', ink2: null });
    c.restore();
  });
  const belt = [[200, 330], [1720, 330]];
  c.strokeStyle = PAL.ink; c.lineWidth = 4; selfDraw(c, belt, sm(0, .8, tau), 3);
  const u = sm(1.4, 3.4, tau, easeInOutSine);
  const drop = sm(3.6, 4.4, tau, easeIn);
  const x = lerp(260, 960, u), y = lerp(300, 600, drop);
  c.save(); c.translate(x, y); c.rotate(settle(tau, 4.4, { amp: .15, freq: 2.5 }));
  const env = rectPath(-60, -40, 120, 80);
  c.fillStyle = PAL.light; c.fill(env);
  c.strokeStyle = PAL.ink; c.lineWidth = 2.5; wob(c, rectPts(-60, -40, 120, 80), 1.2, 5, true);
  wob(c, [[-60, -40], [0, 5], [60, -40]], 1, 6);
  c.restore();
  if (tau > 1.4 && tau < 3.4) speedLines(c, x - 70, y, Math.PI, 30 + (i >> 1), 5, .5);
  arrow(c, [960, 380], [960, 500], { progress: sm(3.2, 3.8, tau), color: PAL.accents[0], width: 4, seed: 8 });
  resetT(c);
  c.globalAlpha = sm(4.6, 5.2, tau);
  handText(c, 'sorted by postcode', 960, 250, { size: 40, align: 'center', ink2: PAL.accents[1] });
}
`;
