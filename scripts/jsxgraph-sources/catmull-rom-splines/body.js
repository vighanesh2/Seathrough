var p = [],
    c, i;

// Create 5 random points
for (i = 0; i < 5; i++) {
    p.push(board.create('point', [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7]));
}
c = board.create('curve', JXG.Math.Numerics.CatmullRomSpline(p), {
    strokeWidth: 3
});
