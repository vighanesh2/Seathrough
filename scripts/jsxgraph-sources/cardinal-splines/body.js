var p = [],
    c, i, tau;

// Create 5 random points
for (i = 0; i < 5; i++) {
    p.push(board.create('point', [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7]));
}

// Slider to adjust the tension tau
tau = board.create('slider', [
    [0.5, 4],
    [3.5, 4],
    [0.001, 0.5, 1]
], {
    name: 'tau'
});

c = board.create('curve', JXG.Math.Numerics.CardinalSpline(p, () => tau.Value()), {
    strokeWidth: 3
});
