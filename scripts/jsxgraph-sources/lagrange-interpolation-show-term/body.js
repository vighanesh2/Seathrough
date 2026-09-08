var points = [];
points[0] = board.create('point', [-1, 2], { size: 4 });
points[1] = board.create('point', [3, -1], { size: 4 });
var f = JXG.Math.Numerics.lagrangePolynomial(points);
var graph = board.create('functiongraph', [f, -10, 10], { strokeWidth: 3 });
var d1 = board.create('functiongraph', [JXG.Math.Numerics.D(f), -10, 10], { dash: 1 });

var txt = board.create('text', [-3, -4, () => f.getTerm(2, 't', ' * ')], { fontSize: 16 });

function addPoint() {
    points.push(board.create('point', [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 3], { size: 4 }));
    board.update();
}

function removePoint() {
    if (points.length > 2) {
        board.removeObject(points[points.length - 1]);
        points.pop();
    }
}
