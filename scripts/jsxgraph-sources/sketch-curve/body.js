// Optional slider for cardinal spline tension
var tau = board.create('slider', [
    [1, 8],
    [7, 8],
    [0, 0.5, 1]
]);

// Define new board mode "sketch"
board.BOARD_MODE_SKETCH = 0x0100;

// Global variables
var sketch, curve,
    points = [];

// Init sketch curve
board.on('down', function(evt) {
    if (board.mode !== board.BOARD_MODE_NONE) {
        return;
    }
    board.mode = board.BOARD_MODE_SKETCH;
    sketch = board.create('curve', [[], []], {
        strokeColor: '#bbbbbb',
        lineCap: 'round',
        strokeWidth: 10
    });
});

// Finalize the sketch curve:
// Take sketch and create spline curve
board.on('up', function(evt) {
    var coords = [], i, p;

    if (board.mode !== board.BOARD_MODE_SKETCH) {
        return;
    }

    // Remove previous curve if it exists
    if (JXG.exists(curve)) {
        board.removeObject(curve);
        board.removeObject(points);
    }

    board.mode = board.BOARD_MODE_NONE;

    // Get list of coordinates from sketch curve
    for (i = 0; i < sketch.dataX.length; i++) {
        coords.push(new JXG.Coords(JXG.COORDS_BY_USER, [sketch.dataX[i], sketch.dataY[i]], board));
    }

    // Reduce the number of coordinate points to 6 inner coordinate points
    coords = JXG.Math.Numerics.Visvalingam(coords, 6);

    // Convert the output of Visvalingam to JSXGraph points
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

    // Remove the sketch curve 
    board.removeObject(sketch);
    board.removeObject(points);
});

// Collect data points for the sketch curve
board.on('move', function(evt, mode) {
    var pos, c;

    if (mode !== board.BOARD_MODE_SKETCH) {
        return;
    }

    pos = board.getMousePosition(evt);
    c = new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, board);
    sketch.dataX.push(c.usrCoords[1]);
    sketch.dataY.push(c.usrCoords[2]);
    board.update();
});
