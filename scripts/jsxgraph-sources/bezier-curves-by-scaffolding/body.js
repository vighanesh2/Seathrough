var col,
    p = [],
    l = [],
    m = [];

col = 'red';
p.push(board.create('point', [2, -1], {
    color: col
})); // data point
col = 'blue';
p.push(board.create('point', [0.75, 2.5], {
    color: col
})); // control point
p.push(board.create('point', [-1.5, 2.4], {
    color: col
})); // control point

col = 'red';
p.push(board.create('point', [-3, -2], {
    color: col
})); // data point

l.push(board.create('segment', [p[0], p[1]], {
    strokeOpacity: 0.5
}));
l.push(board.create('segment', [p[1], p[2]], {
    strokeOpacity: 0.5
}));
l.push(board.create('segment', [p[2], p[3]], {
    strokeOpacity: 0.5
}));

col = 'black';
m.push(board.create('midpoint', [l[0]], {
    size: 1,
    color: col,
    name: ''
}));
m.push(board.create('midpoint', [l[1]], {
    size: 1,
    color: col,
    name: ''
}));
m.push(board.create('midpoint', [l[2]], {
    size: 1,
    color: col,
    name: ''
}));

l.push(board.create('segment', [m[0], m[1]], {
    strokeOpacity: 0.5
}));
l.push(board.create('segment', [m[1], m[2]], {
    strokeOpacity: 0.5
}));

m.push(board.create('midpoint', [l[3]], {
    size: 1,
    color: col,
    name: ''
}));
m.push(board.create('midpoint', [l[4]], {
    size: 1,
    color: col,
    name: ''
}));

l.push(board.create('segment', [m[3], m[4]], {
    strokeOpacity: 0.5
}));
m.push(board.create('midpoint', [l[5]], {
    size: 1,
    color: col,
    name: ''
}));

var c = board.create('curve', JXG.Math.Numerics.bezier(p), {
    strokecolor: 'blue',
    strokeOpacity: 0.6,
    strokeWidth: 5
});
