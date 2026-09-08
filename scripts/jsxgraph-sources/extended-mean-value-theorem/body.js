// Some initial points
var p = [];
p.push(board.create('point', [0, -2], {size: 2, name: 'C(a)'}));
p.push(board.create('point', [-1.5, 5], {size: 2, name: ''}));
p.push(board.create('point', [1, 4], {size: 2, name: ''}));
p.push(board.create('point', [3, 3], {size: 2, name: 'C(b)'}));

// Lagrange interpolation through the points
var fg = JXG.Math.Numerics.Neville(p);
var graph = board.create('curve', fg, {strokeWidth: 3, strokeOpacity: 0.5});

// Line 
var line = board.create('line', [p[0], p[3]], {strokeColor: '#ff0000', dash: 1});

// Derivatives of the curve
var df = JXG.Math.Numerics.D(fg[0]);
var dg = JXG.Math.Numerics.D(fg[1]);

// Usually, the extended mean value theorem is formulated as
// df(t) / dg(t) == (p[3].X() - p[0].X()) / (p[3].Y() - p[0].Y())
// We can avoid division by zero with the following formulation:
var quot = (t) => df(t) * (p[3].Y() - p[0].Y()) - dg(t) * (p[3].X() - p[0].X());

// Construct the point C(ξ)
var r = board.create('glider', [
    () => fg[0](JXG.Math.Numerics.root(quot, (fg[3]() + fg[2]) * 0.5)),
    () => fg[1](JXG.Math.Numerics.root(quot, (fg[3]() + fg[2]) * 0.5)),
    graph
], {name: 'C(ξ)', size: 4, fixed: true, color: 'blue'});

// Tangent to C through C(ξ)
board.create('tangent', [r], {strokeColor: '#ff0000'});
