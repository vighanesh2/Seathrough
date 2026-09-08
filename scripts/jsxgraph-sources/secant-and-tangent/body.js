var p = [];
p[0] = board.create('point', [-1, 0], { size: 2, name: '' });
p[1] = board.create('point', [-0.5, 1], { size: 2, name: '' });
p[2] = board.create('point', [2, 0.5], { size: 2, name: '' });
p[3] = board.create('point', [6, 5], { size: 2, name: '' });
var pol = JXG.Math.Numerics.lagrangePolynomial(p);
var graph = board.create('functiongraph', [pol, -10, 10], { strokeWidth: 3 });

var q = board.create('glider', [4.5, 0, graph], { size: 5, name: 'A' });
var s = board.create('slider', [[0, -3], [4, -3], [0.001, 1, 1]]);
var q2 = board.create('point', [
        () => q.X() + Math.max(s.Value(), 0.01),
        () => pol(q.X() + Math.max(s.Value(), 0.01))], { face: '[]', size: 2 });
var e = board.create('point', [
        () => q2.X() - q.X(),
        () => (q2.Y() - q.Y()) / (q2.X() - q.X())
], { style: 7, name: 'secant slope', trace: true });
var line = board.create('line', [q, q2], { strokeColor: '#ff0000', dash: 2 });

// Continuous functiongraph, not differentiable at x=0
