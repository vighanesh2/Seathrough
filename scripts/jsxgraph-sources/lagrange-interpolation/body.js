var p = [];
p[0] = board.create('point', [-1,2], {size:4});
p[1] = board.create('point', [3,-1], {size:4});
var f = JXG.Math.Numerics.lagrangePolynomial(p);
var graph = board.create('functiongraph', [f,-10, 10], {strokeWidth:3});
var d1 = board.create('functiongraph', [JXG.Math.Numerics.D(f), -10, 10], {dash:1});
var d2 = board.create('functiongraph', [JXG.Math.Numerics.D(JXG.Math.Numerics.D(f)), -10, 10], {dash:2});

function addPoint() {
    p.push(board.create('point',[(Math.random()-0.5)*10,(Math.random()-0.5)*3],{size:4}));
    board.update();
}
