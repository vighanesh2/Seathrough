var m = board.create('point', [0.5, 0.3], {
    name: 'M'
});
var b = board.create('point', [3, 0]);
var c = board.create('circle', [m, b], {
    strokeColor: 'black',
    name: 'c'
});
var m1 = board.create('point', [-4, 2], {
    name: 'M_1'
});
var b1 = board.create('point', [-4, 3], {
    name: 'C_1'
});
var c1 = board.create('circle', [m1, b1]);
var p = board.create('glider', [-4, 1, c1], {
    name: 'P [drag me]'
});

var t = board.create('polar', [c, p], {
    name: 'polar',
    withLabel: true,
    strokeColor: 'blue',
    dash: 2
});
var l = board.create('line', [m, p], {
    name: '',
    withLabel: false,
    strokeColor: 'gray',
    dash: 2
});
var s = board.create('intersection', [l, t, 0], {
    name: "P'",
    withLabel: true,
    trace: true
});
