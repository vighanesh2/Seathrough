// x-ccords of control points g1...g3 determine shape of curve
var g1 = board.create('point', [1, -1], {size: 4});
var g2 = board.create('point', [2.5, -2], {size: 4});
var g3 = board.create('point', [1, -3], {size: 3});

// Length of curve
var g4 = board.create('point', [2.5, -4], {size: 3});

// y-coord determines strokeWidth, opacity and font size
var g5 = board.create('point', [-4, 1], {size: 3, name: ''});

// Curve
var c1 = board.create('curve', [
    (t) => (g1.X() - g2.X()) * Math.cos(t) + g3.X() * Math.cos(t * (g1.X() - g2.X()) / g2.X()),
    (t) => (g1.X() - g2.X()) * Math.sin(t) + g3.X() * Math.sin(t * (g1.X() - g2.X()) / g2.X()),
    0,
    () => Math.PI * 7 * Math.abs(g4.X())
], {
    strokeWidth: () => g5.Y() * 3,
    strokeOpacity: () => g5.Y() * 0.6
});

// Text
var t = board.create('text', [() => g5.X() + 0.2,
    () => g5.Y() + 0.25, 'X(B)=<value>X(B)</value>'
], {
    digits: 3,
    fontSize: () => Math.abs(g5.Y()) * 10 + 1
});
