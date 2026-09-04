var c1 = 0.6;
var c2 = 0.0;
var f1 = 7;
var f2 = 17;
var c = board.create('curve', [
    (t) => Math.cos(t) + c1 * Math.cos(f1 * t) + c2 * Math.sin(f2 * t),
    (t) => Math.sin(t) + c1 * Math.sin(f1 * t) + c2 * Math.cos(f2 * t),
    0, 2.02 * Math.PI
], {
    strokeWidth: 2
});
