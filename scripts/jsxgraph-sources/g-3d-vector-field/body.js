var a = board.create('slider', [[-6, -7], [1, -7], [0, 0.5, 2]]);

const view = board.create('view3d',
    [
        [-6, -3],
        [8, 8],
        [[-3, 3], [-3, 3], [-3, 3]]
    ], {});

var vf = view.create('vectorfield3d', [
    [(x, y, z) => Math.cos(y), (x, y, z) => Math.sin(x), (x, y, z) => z],
    [-2, 5, 2], // x from -2 to 2 in 5 steps
    [-2, 5, 2], // y
    [-2, 5, 2] // z
], {
    strokeColor: 'red',
    scale: () => a.Value()
});
