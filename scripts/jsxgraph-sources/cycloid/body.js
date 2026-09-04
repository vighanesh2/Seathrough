var r = board.create('slider', [[0.5, 4], [3.5, 4], [0, 1, 2]], {name: 'r'});
var c = board.create('curve', [
    (t) => r.Value() * (t - Math.sin(t)),
    (t) => r.Value() * (1 - Math.cos(t)),
    -4 * Math.PI, 4* Math.PI
], {
    strokeWidth: 3
});
