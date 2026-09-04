// Circle through q with center p.
var p = board.create('point', [0, 0]);
var q = board.create('point', [3, 3]);
var circ = board.create('circle', [p, q]);

// Create an empty curve
var ticks = board.create('curve', [
    [0],
    [0]
], {
    strokeWidth: 1,
    strokeColor: 'blue',
    strokeOpacity: 0.5
});

// Make ticks out of the curve 
ticks.updateDataArray = function() {
    var cx = circ.center.X(),
        cy = circ.center.Y(),
        r = circ.Radius(),
        i,
        ticklen = 0.3, // Length of ticks in user space coordinates
        steps = 20, // Number of ticks
        d = ticklen * 0.5,
        alpha = 2 * Math.PI / steps; // Angle between ticks

    this.dataX = [];
    this.dataY = [];
    for (i = 0; i < steps; i++) {
        // Start of a tick
        this.dataX.push(cx + (r - d) * Math.cos(i * alpha));
        this.dataY.push(cy + (r - d) * Math.sin(i * alpha));
        // End of tick
        this.dataX.push(cx + (r + d) * Math.cos(i * alpha));
        this.dataY.push(cy + (r + d) * Math.sin(i * alpha));
        // Interrupt the curve
        this.dataX.push(NaN);
        this.dataY.push(NaN);
    }
};
board.update();
