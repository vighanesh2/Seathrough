var a = board.create('slider', [[0.5, 4], [3.5, 4], [0, 1, 8]], {name: 'a'});
var c = board.create('curve', [
    (t) => 4* a.Value() * Math.sin(t) * Math.cos(t) / (Math.sin(t)**3 + Math.cos(t)**3),
    [0, 0], 0, 2 * Math.PI
], {
    strokeWidth: 3, curveType: 'polar'
});
