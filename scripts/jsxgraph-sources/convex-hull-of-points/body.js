var i, hull,
        attr = { withLabel: false },
        p = [];

    // The list of "points" can contain points, coordinates, JXG.Coords objects
    for (i = 0; i < 40; i++) {
        p.push(board.create('point', [Math.random() * 8 - 4, Math.random() * 8 - 4], attr));
    }

    // Convex hull curve
    var c = board.create('curve', [[], []], { fillColor: 'yellow', fillOpacity: 0.3 });
    c.updateDataArray = function() {
        var i,
            hull = JXG.Math.Geometry.convexHull(p, true);

        this.dataX = [];
        this.dataY = [];
        for (i = 0; i < hull.length; i++) {
            this.dataX.push(hull[i][1]);
            this.dataY.push(hull[i][2]);
        }
        // Close the curve
        this.dataX.push(hull[0][1]);
        this.dataY.push(hull[0][2]);
    };
