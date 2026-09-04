var b = board.create('slider', [[1, -3], [10, -3], [-10, 2.10, 10]], {name: 'a'});
var a = board.create('slider', [[1, -4], [10, -4], [-10, -9.52, 10]], {name: 'b'});

var c1 = board.create('functiongraph', [function(x) {
    return Math.sqrt(x * x * x + a.Value() * x + b.Value());
}], {strokeWidth: 3, strokeColor: 'black'});
var c2 = board.create('functiongraph', [function(x) {
    return -Math.sqrt(x * x * x + a.Value() * x + b.Value());
}], {strokeWidth: 3, strokeColor: 'black'});
