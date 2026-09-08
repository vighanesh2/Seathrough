var n = board.create('slider', [[0.1, 1.5], [1.1, 1.5], [1, 1, 100]], { name: 'n', snapWidth: 1 });
var f = function(x) { return Math.pow(x, n.Value()); }
var plot = board.create('functiongraph', [f, 0, 1], { strokeWidth: 2 });
board.create('text', [0.2, 1.2,
    () => 'f<sub>' + Math.floor(n.Value()) + '</sub>(x)=x<sup>' + Math.floor(n.Value()) + '</sup>'
], { fontSize: 20 });
