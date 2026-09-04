var a = board.create('slider', [[0.5, 4], [3.5, 4], [0, 1, 8]], {name: 'a'});
var c = board.create('curve', [
    (t) => 2 * a.Value() * Math.sin(3 * t) / Math.sin(2 * t),
    [0, 0], 0, 2 * Math.PI
], {
    strokeWidth: 3, curveType: 'polar'
});
