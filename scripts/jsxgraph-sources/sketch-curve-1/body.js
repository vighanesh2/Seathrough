// Optional slider for cardinal spline tension
var tau = board.create('slider', [
    [1, 8],
    [7, 8],
    [0, 0.5, 1]
]);

// Global variables
var curve,
    points = [];

board.on('down', function(evt) {
    // Do not sketch during dragging
    if (board.mode !== board.BOARD_MODE_NONE) {
            this.isSketching[0] = false;
    }
});

// On 'up' event take sketch curve and create spline curve
board.on('up', function(evt) {
    var coords = [],
        i, p;

    if (!this.isSketching[0]) {
        return;
    }
    // Remove previous curve if it exists
    if (JXG.exists(curve)) {
        board.removeObject(curve);
    }

    // Get list of coordinates from sketch curve
    for (i = 0; i < this.sketch.dataX.length; i++) {
        coords.push(new JXG.Coords(JXG.COORDS_BY_USER, [this.sketch.dataX[i], this.sketch.dataY[i]],
            board));
    }

    // Reduce the number of coordinate points to 6 inner coordinate points
    coords = JXG.Math.Numerics.Visvalingam(coords, 6);

    // Convert the output of Numerics.Visvalingam to JSXGraph points
    points = [];
    for (i = 0; i < coords.length; i++) {
        points.push(
            board.create('point', [coords[i].usrCoords[1], coords[i].usrCoords[2]], {
                withLabel: false,
                visible: false
            })
        );
    }

    // Create cardinal spline from JSXGraph points
    curve = board.create('curve',
        JXG.Math.Numerics.CardinalSpline(points, () => tau.Value()), {
            strokeColor: '#000000',
            strokeWidth: 3,
            lineCap: 'round',
            fixed: false
        });

    // Remove the helper points 
    board.removeObject(points);
});
