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
        xPlaneRear: {
            visible: false
        },
        yPlaneRear: {
            visible: false
        },
        zPlaneRear: {
            fillColor: 'blue'
        }
    });

var r = board.create('slider', [
    [-7, -6],
    [5, -6],
    [1, 3, 5]
], {
    name: 'r'
});
var c = view.create('parametricsurface3d', [
    (u, v) => r.Value() * (Math.cos(2 * u) + v * Math.cos(u) * Math.cos(2 * u)),
    (u, v) => r.Value() * (Math.sin(2 * u) + v * Math.cos(u) * Math.sin(2 * u)),
    (u, v) => 0 + 2 * v * Math.sin(u),
    [0, Math.PI],
    [-0.5, 0.5]
], {
    strokeColor: 'red',
    strokeWidth: 1,
    strokeOpacity: 0.9,
    stepsU: 50,
    stepsV: 1
});
