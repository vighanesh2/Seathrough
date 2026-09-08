var h = board.create('hyperbola', [
    [-Math.sqrt(2), 0],
    [Math.sqrt(2), 0],
    [2, Math.sqrt(3)]
]);

// Asymptotes
var l1 = board.create('line', [0, 1, 1], {
    dash: 1,
    fixed: true,
});

var l2 = board.create('line', [0, -1, 1], {
    dash: 1,
    fixed: true,
});
