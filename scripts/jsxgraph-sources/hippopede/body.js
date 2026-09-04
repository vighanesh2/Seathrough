var a = board.create('slider', [
    [1, 4], [4, 4], [0, 1.5, 8]
], {
    name: 'a'
});
var b = board.create('slider', [
    [1, 3.5], [4, 3.5], [0, 1, 8]
], {
    name: 'b'
});

var c = board.create('curve', [
    (theta) => Math.sqrt(4 * b.Value() * (a.Value() - b.Value() * Math.sin(theta) ** 2)),
    [0, 0],
    0, 2 * Math.PI
], {
    strokeWidth: 3,
    curveType: 'polar'
});
