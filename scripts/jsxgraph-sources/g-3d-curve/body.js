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

var curve = view.create('curve3d', [
    (t) => (2 + Math.cos(3 * t)) * Math.cos(2 * t),
    (t) => (2 + Math.cos(3 * t)) * Math.sin(2 * t),
    (t) => Math.sin(3 * t),
    [-Math.PI, Math.PI]
], {
    strokeWidth: 4
});
