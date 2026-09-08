// Horizontal axis with linear scale and same look
// as default axes
var attr = JXG.Options.board.defaultAxes.x;
attr.ticks.drawZero = false;
var xAxis = board.create('axis', [[0, 0], [1, 0]], attr);

// Vertical axis with logarithmic scale and same look
// as default axes.
attr = JXG.Options.axis;
var yAxis = board.create('line', [[0, 0], [0, 1]], attr);

attr = JXG.Options.board.defaultAxes.y.ticks,
attr.insertTicks = true;
attr.drawLabels = true;
attr.drawZero = false;
attr.generateLabelText = function(tick, zero) {
    var value = Math.pow(10, Math.round(tick.usrCoords[2] - zero.usrCoords[2]));
    return this.formatLabelText(value);
};

var ticksY = board.create('ticks', [yAxis, 1], attr);

// Plot two functions in logarithmic scale
var post = (x) => JXG.Math.log10(x);
var f1 = (x) => x * x;
var f2 = (x) => Math.exp(x);

board.create('functiongraph', [(x) => post(f1(x))], {
    name: 'x^2',
    withLabel: true
});

board.create('functiongraph', [(x) => post(f2(x))], {
    name: 'e^x',
    withLabel: true,
    strokeColor: 'red'
});
