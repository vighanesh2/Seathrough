var view = board.create('view3d',
    [
        [-6, -3],
        [8, 8],
        [
            [-5, 5],
            [-5, 5],
            [-5, 5]
        ]
    ], {});

var b = board.create('slider', [[-7, -6], [5, -6], [-3, 2, 4]], {name: 'b'});

// Klein bottle
var c = view.create('parametricsurface3d', [
    (u, v) => b.Value() * (1 - Math.sin(u)) * Math.cos(u) + (2 - Math.cos(u)) * Math.cos(v) * (2 * Math.exp(-Math.pow(u / 2 - Math.PI, 2)) - 1),
    (u, v) => (2 - Math.cos(u)) * Math.sin(v),
    (u, v) => 4 * Math.sin(u) + 0.5 * (2 - Math.cos(u)) * Math.sin(u) * Math.cos(v) * Math.exp(-Math.pow(u - 3 * Math.PI / 2, 2)),
    [0, 2 * Math.PI],
    [0, 2 * Math.PI],
], {
    strokeColor: 'green',
    stepsU: 60,
    stepsV: 60
});
