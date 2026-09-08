var a = board.create('slider', [[2, -5], [7, -5], [-5, 1, 5]], { name: 'a' });
var b = board.create('slider', [[2, -6], [7, -6], [-5, 0, 5]], { name: 'b' });
var c = board.create('slider', [[2, -7], [7, -7], [-5, 0, 5]], { name: 'c' });

var f = board.create('functiongraph', [
    function(x) {
        return a.Value() * x * x + b.Value() * x + c.Value();
    }
]);
