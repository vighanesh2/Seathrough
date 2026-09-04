// Slider to set the degree of the polynomial
var degree = board.create('slider', [
    [1, 8],
    [7, 8],
    [1, 3, 10]
], {
    name: 'degree',
    snapWidth: 1,
    digits: 0
});

// Global variables
var curve,
    points = [];

board.on('down', function(evt) {
    // Do not sketch during dragging
    if (board.mode !== board.BOARD_MODE_NONE) {
        this.isSketching[0] = false;
    }
});

// Finalize the sketch curve:
// Take sketch and create spline curve
board.on('up', function(evt) {
    var coords = [],
        i, p;

    if (!this.isSketching[0]) {
        return;
    }

    // Remove previous curve and points if they exist
    if (JXG.exists(curve)) {
        board.removeObject(curve);
        board.removeObject(points);
    }

    // Get list of coordinates from sketch curve
    for (i = 0; i < this.sketch.dataX.length; i++) {
        coords.push(new JXG.Coords(JXG.COORDS_BY_USER, [this.sketch.dataX[i], this.sketch.dataY[i]], board));
    }

    // Reduce the number of coordinate points to `degree + 1 - 2` inner coordinate points plus start point and end point.
    coords = JXG.Math.Numerics.Visvalingam(coords, degree.Value() - 1);

    // Convert the output of Visvalingam to JSXGraph points
    points = [];
    for (i = 0; i < coords.length; i++) {
        points.push(
            board.create('point', [coords[i].usrCoords[1], coords[i].usrCoords[2]], {
                size: 5,
                withLabel: false
            })
        );
    }

    // Create Lagrange polynomial from JSXGraph points
    curve = board.create('functiongraph', [JXG.Math.Numerics.lagrangePolynomial(points)], {
        strokeColor: '#000000',
        strokeWidth: 3,
        lineCap: 'round'
    });
});
