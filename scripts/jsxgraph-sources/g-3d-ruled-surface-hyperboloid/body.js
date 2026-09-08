var view = board.create('view3d',
    [
        [-6, -3],
        [8, 8],
        [
            [-5, 5],
            [-5, 5],
            [-5, 5]
        ]
    ], {
        zPlaneRear: {
            fillColor: 'blue'
        }
    });

var phi = board.create('slider', [
    [-7, -6],
    [5, -6],
    [-Math.PI / 2, 0.5, Math.PI / 2]
], {
    name: 'φ',
    snapWidth: 0.1
});
var c = view.create('parametricsurface3d', [
    (u, v) => (1 - v) * Math.cos(u - phi.Value()) + v * Math.cos(u + phi.Value()),
    (u, v) => (1 - v) * Math.sin(u - phi.Value()) + v * Math.sin(u + phi.Value()),
    (u, v) => 2 * v - 1,
    [0, 2 * Math.PI],
    [-2, 3]
], {
    strokeColor: '#0000ff',
    strokeWidth: 1,
    strokeOpacity: 0.9,
    stepsU: 20,
    stepsV: 1
});
