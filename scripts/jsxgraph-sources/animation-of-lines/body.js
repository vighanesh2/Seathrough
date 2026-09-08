var p0 = board.create('point', [0, 0], {
    name: 'T',
    trace: true
});
var p1 = board.create('point', [7, 5], {
    name: 'A',
    trace: true
});
var p2 = board.create('point', [5, 7], {
    name: 'B',
    trace: true
});
var l = board.create('line', [p1, p2], {
    name: ''
});

var t = board.create('transform', [function() {
    return p0.X();
}, function() {
    return p0.Y();
}], {
    type: 'translate'
});
t.bindTo([p1, p2]); // The translation is bound to the points, but the points are not updated, yet

function startAnimation() {
    p0.moveTo([-5, -8], 1500);
}

function reset() {
    p0.moveTo([0, 0]);
    p0.clearTrace();
    p1.clearTrace();
    p2.clearTrace();
}
