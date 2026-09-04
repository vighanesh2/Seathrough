var N = board.create('slider', [
    [0, 1.5],
    [3, 1.5],
    [1, 3, 40]
], {
    name: 'n',
    snapWidth: 1
});

// Circle on the right
var circ = board.create('circle', [
    [6, 1], 1
], {
    strokeWidth: 1,
    strokecolor: 'black',
    strokeWidth: 2,
    fillColor: '#0055ff13'
});

// Tile the circle on the right into cake pieces
var c1 = board.create('curve', [
    [0],
    [0]
], {
    strokecolor: 'red',
    strokeWidth: 1
});
c1.updateDataArray = function() {
    var r = 1,
        n = Math.floor(N.Value()),
        px = circ.midpoint.X(),
        py = circ.midpoint.Y(),
        x = [px],
        y = [py],
        phi = Math.PI / n,
        s = r * Math.sin(phi),
        i, j,
        d = 16,
        dt = phi / d,
        pt = Math.PI * 0.5 + phi;

    for (i = 0; i < n; i++) {
        for (j = -d; j <= d; j++) {
            x.push(px + r * Math.cos(pt));
            y.push(py + r * Math.sin(pt));
            pt -= dt;
        }
        x.push(px);
        y.push(py);
        pt += dt;
    }
    this.dataX = x;
    this.dataY = y;
}

// Reorder the tiles to approximate a rectangle (on the left) 
var c2 = board.create('curve', [
    [0],
    [0]
], {
    strokecolor: 'red',
    strokeWidth: 2
});
c2.updateDataArray = function() {
    var r = 1,
        n = Math.floor(N.Value()),
        x = [0],
        y = [0],
        phi = Math.PI / n,
        h = r * Math.cos(phi),
        s = r * Math.sin(phi),
        i, j,
        px = 0,
        py = 0,
        sgn = 1,
        d = 16,
        dt = phi / d,
        pt;

    for (i = 0; i < n; i++) {
        for (j = -d; j <= d; j++) {
            pt = dt * j;
            x.push(px + r * Math.sin(pt));
            y.push(sgn * r * Math.cos(pt) - (sgn - 1) * h * 0.5);
        }
        px += s;
        sgn *= (-1);
    }
    x.push((n - 1) * s);
    y.push(h + (sgn - 1) * h * 0.5);
    this.dataX = x;
    this.dataY = y;
}

// Do one update to execute the updateDataArray methods
board.update();
