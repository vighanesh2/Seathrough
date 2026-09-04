var p = board.create('point', [-3, 0], {
    name: 'p'
});
var q = board.create('point', [3, 0], {
    name: 'q'
});
var pq = board.create('line', [p, q]);
var t = board.create('glider', [-2, 0, pq], {
    name: 't'
});
var txt = board.create('text', [1, 2, () => "λ = " + t.position.toFixed(2)], {
    fontSize: 24
});
