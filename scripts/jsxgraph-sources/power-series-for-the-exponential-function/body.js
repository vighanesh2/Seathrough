board.create('functiongraph',
    [function(t) { return Math.exp(t); }, -10, 10], { strokeColor: "#cccccc" });

var s = board.create('slider', [[0.75, -2], [5, -2.0], [0, 0, 15]], { name: 'S', snapWidth: 1 });

board.create('text', [4, 10, () => 'n=' + s.Value()]);
board.create('text', [4, 8, function() {
    var val = 0,
        i,
        sv = s.Value() + 1;

    for (i = 0; i < sv; i++) {
        val += 1.0 / JXG.Math.factorial(i);
    }
    return 'e~' + (val).toFixed(10);
    }]);

board.create('functiongraph', [
    function(t) {
        var val = 0,
            i,
            sv = s.Value() + 1;

        for (i = 0; i < sv; i++) {
            val += Math.pow(t, i) / JXG.Math.factorial(i);
        }
        return val;
    },
    -10, 10], { strokeColor: "#bb0000" });
