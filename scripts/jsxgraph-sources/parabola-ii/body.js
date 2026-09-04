var f = board.create('glider', [1, 0, board.defaultAxes.x], { name: "focus" }); // focus point
var c = board.create('glider', [-1, 0, board.defaultAxes.x], { name: "-c" });
var l = board.create('parallel', [board.defaultAxes.y, c], {
    name: "directrix",
    withLabel: true,
    label: { position:  '60% right', anchorX: 'right', distance: 0.5}
}); // directrix line

var par = board.create('parabola', [f, l]);

var P = board.create('glider', [2, 2, par], { name: 'p' });

var s1 = board.create('segment', [f, P]);
var q = board.create('point', [() => c.X(), () => P.Y()], { name: 'q' });
var s2 = board.create('segment', [q, P]);

var txt = board.create('text', [0.2, 4, () => "|pf| - |pq| = " + P.Dist(f).toFixed(2) + ' - ' + P.Dist(q).toFixed(2) +
    ' = ' + (P.Dist(f) - P.Dist(q)).toFixed(2)]);
