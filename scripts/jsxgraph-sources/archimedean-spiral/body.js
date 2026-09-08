var a = board.create('slider', [
    [1, 10],
    [5, 10],
    [0, 1, 8]
], {
    name: 'a'
});
var b = board.create('slider', [
    [1, 12],
    [5, 12],
    [0, 0.25, 2]
], {
    name: 'b'
});

var c = board.create('curve', [function(phi) {
        return a.Value() + b.Value() * phi;
    },
    [0, 0], 0, 8 * Math.PI
], {
    curveType: 'polar',
    strokewidth: 4
});

var g = board.create('glider', [-1, 2, c]);
var t = board.create('tangent', [g], {
    dash: 2,
    strokeColor: '#a612a9'
});
var n = board.create('normal', [g], {
    dash: 2,
    strokeColor: '#a612a9'
});
