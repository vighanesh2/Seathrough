var s = board.create('slider', [[1,-4], [7,-4], [0.01, 1, 8]]);
var p = board.create('point', [
    () => s.Value(),
    () => Math.log(s.Value())
], {trace:true});
var c = board.create('tracecurve', [s, p]);
