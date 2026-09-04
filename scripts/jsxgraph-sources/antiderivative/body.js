var p = [];
p.push(board.create('point', [-2, Math.random() * 5 + 5], {
    name: '',
    size: 2
}));
p.push(board.create('point', [0, 2], {
    name: '',
    size: 2
}));
p.push(board.create('point', [0.5, Math.random() * 1 + 7], {
    name: '',
    size: 2
}));

// f defines the function graph through the three points
var f = JXG.Math.Numerics.lagrangePolynomial(p);

var plot = board.create('functiongraph', [f, -3, 3]);

var s = board.create('glider', [-2, f(-2), plot], {
    name: 'drag me',
    color: 'black',
    size: 5
});
var int = board.create('integral', [
    [function() {
        return p[0].X();
    }, function() {
        return s.X();
    }], plot
], {
    fillOpacity: 0.2
});

var F = board.create('point', [function() {
    return s.X();
}, function() {
    return JXG.Math.Numerics.I([p[0].X(), s.X()], f);
}], {
    trace: true,
    name: 'F',
    fillColor: '#0000aa',
    strokeColor: '#0000aa',
    face: '[]'
});
