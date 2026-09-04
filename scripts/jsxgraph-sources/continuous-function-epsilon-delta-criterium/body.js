var f = (x) => (x < 1) ? 0.5 * x * x : x + 1;
var graph = board.create('functiongraph', [f], {
    strokeColor: '#0000ff'
});

var s = board.create('slider', [
    [0, -1],
    [4, -1],
    [0, 1, 1]
], {
    name: 'δ'
});

var x1 = board.create('glider', [-2, 0, board.defaultAxes.x], {
    name: 'a'
});

// Helper points
var x2 = board.create('point', [() => x1.X() - s.Value(), 0], {size: 2, face: '[]', name: ''});
var x3 = board.create('point', [() => x1.X() + s.Value(), 0], {size: 2, face: '[]', name: ''});
var y1 = board.create('point', [() => x1.X(), () => f(x1.X())], {size: 2, face: '[]', name: 'f(a)'});
var y2 = board.create('point', [() => x2.X(), () => f(x2.X())], {size: 2, face: '[]', name: ''});
var y3 = board.create('point', [() => x3.X(), () => f(x3.X())], {size: 2, face: '[]', name: ' '});

// Vertical helper lines
var v1 = board.create('segment', [x1, y1], {strokeColor: 'gray', dash: 2, strokeWidth: 1});
var v2 = board.create('line', [x2, y2], {strokeColor: 'gray', dash: 2, strokeWidth: 1});
var v3 = board.create('line', [x3, y3], {strokeColor: 'gray', dash: 2, strokeWidth: 1});

// Horizontal helper lines (realized as curves)
var h1 = board.create('curve', [(t) => t, (t) => y1.Y()], {strokeColor: 'gray', dash: 2, strokeWidth: 1});
var h2 = board.create('curve', [(t) => t, (t) => y2.Y()], {strokeColor: 'gray', dash: 2, strokeWidth: 1});
var h3 = board.create('curve', [(t) => t, (t) => y3.Y()], {strokeColor: 'gray', dash: 2, strokeWidth: 1});

// Determine minimum epsilon
var txt = board.create('text', [4.2, -1.5, function() {
    return 'ε = ' + Math.max(Math.abs(y2.Y() - y1.Y()), Math.abs(y1.Y() - y3.Y())).toFixed(5);
}], {
    strokeColor: 'blue'
});
