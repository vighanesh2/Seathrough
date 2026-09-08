var n = board.create('slider', [
    [1, 3],
    [6, 3],
    [1, 10, 70]
], {
    name: 'n',
    snapWidth: 1
});

// Fixed function term
var f = function(x) {
    return 0.2 * x * x + 2.0 * Math.sin(x);
}
var plot = board.create('functiongraph', [f], {
    strokeWidth: 1,
    strokeOpacity: 0.3
});

// Plot dashed horizontal and vertical lines 
var start = -3.0;
var end = 5.0;
var sc = board.create('curve', [
    [0],
    [0]
], {
    dash: 1,
    strokeWidth: 1,
    strokeColor: 'red'
});
board.updateDataArray = function() {
    var i;
    var m = n.Value();
    var d = (end - start) / m;
    this.dataX = [];
    this.dataY = [];
    this.dataX[0] = start;
    this.dataY[0] = f(start);
    for (i = 1; i <= m; i++) {
        this.dataX.push(start + i * d);
        this.dataY.push(f(start + (i - 1) * d));
        this.dataX.push(start + i * d);
        this.dataY.push(f(start + i * d));
    }
}
// Plot secants
var approx = board.create('curve', [
    [0],
    [0]
], {
    strokeColor: 'red'
});
approx.updateDataArray = function() {
    var i;
    var m = n.Value();
    var d = (end - start) / m;
    this.dataX = [];
    this.dataY = [];
    this.dataX[0] = start;
    this.dataY[0] = f(start);
    for (i = 1; i <= m; i++) {
        this.dataX.push(start + i * d);
        this.dataY.push(f(start + i * d));
    }
}

board.create('text', [-7, 1, function() {
    var i, s, f0, f1;
    var m = n.Value();
    var d = (end - start) / m;
    s = 0.0;
    f0 = f(start);
    for (i = 1; i <= m; i++) {
        f1 = f(start + i * d);
        s += Math.sqrt(d * d + (f1 - f0) * (f1 - f0));
        f0 = f1;
    }
    return 'Length = ' + s.toFixed(4);
}], {
    fontSize: 24
});
board.update();
