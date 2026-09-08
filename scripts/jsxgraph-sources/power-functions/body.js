var n = board.create('slider', [[-5, -2], [5, -2], [-5, 1, 5]], { name: 'n' });
var m = board.create('slider', [[1, -4], [10, -4], [1, 1, 10]], { name: 'm' });

board.create('functiongraph', [
        (t) => JXG.Math.pow(t, n.Value() / m.Value())
    ], {
    strokeColor: '#ff0000'
});

board.create('text', [-5, 3, function() { return 'y=x<sup>' + (n.Value() / m.Value()).toFixed(3) + '</sup>'; }]);
