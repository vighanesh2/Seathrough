var line = board.create('line', [
    [-10, Math.E],
    [100, Math.E]
], {
    strokeColor: 'red',
    strokeWidth: 2,
    layer: 4
});
var seq = board.create('curve', [
    [0],
    [1]
], {
    strokeColor: 'blue',
    strokeWidth: 2
});

var seq_add = function() {
    var n = seq.dataX.length,
        val = Math.pow(1 + 1 / n, n);
    seq.dataX.push(n);
    seq.dataY.push(val);
};

var series = board.create('curve', [
    [0],
    [1]
], {
    strokeColor: 'black',
    strokeWidth: 2
});

var series_add = function() {
    var n = series.dataX.length,
        val = series.dataY[n - 1] + 1 / JXG.Math.factorial(n);
    series.dataX.push(n);
    series.dataY.push(val);
};

var txt1 = board.create('text', [15, 1.6, function() {
    return 'n=' + (seq.dataX.length - 1) + ': value = ' + seq.dataY[seq.dataY.length - 1];
}], {
    strokeColor: 'blue',
    fixed: true
});
var txt2 = board.create('text', [15, 1.8, function() {
    return 'n=' + (series.dataX.length - 1) + ': value = ' + series.dataY[series.dataY.length - 1];
}], {
    strokeColor: 'black',
    fixed: true
});

var approx = function() {
    seq_add();
    series_add();
    board.update();
    if (seq.dataX.length <= 50) {
        setTimeout(approx, 500);
    }
}

approx();
