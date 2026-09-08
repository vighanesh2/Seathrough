var x = board.create('glider', [-9, 0, board.defaultAxes.x], { name: 'x' });
var y = board.create('point', [() => x.X(), () => Math.sin(x.X())], {
    size: 1,
    name: '',
    color: 'green'
});
var seg1 = board.create('segment', [x, y], {
    color: 'red',
    name: 'sin',
    withLabel: 'true',
    label: { position: '0.5fr right', distance: 0, anchorX: 10 }
});

var f = board.create('functiongraph', [(x) => Math.sin(x)]);

// ----------------
