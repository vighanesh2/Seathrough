var s = board.create('slider', [[0.75, -2], [4.5, -2], [0, 0, 10]], { name: 'S', snapWidth: 1 });

board.create('functiongraph', [
    function(t) {
        var val = 0,
            sv = s.Value() + 1,
            k;

        for (k = 1; k <= sv; k++) {
            val += Math.pow(-1, k) * Math.sin(2 * Math.PI * k * t) / k;
        }
        return val + 2;
    }, -10, 10
], { strokeColor: '#bb0000' });

board.create('functiongraph', [
    function(t) {
        var val = 0,
            sv = s.Value() + 1,
            k;

        for (k = 1; k <= sv; k++) {
            val += Math.sin(2 * Math.PI * (2 * k - 1) * k * t) / (2 * k - 1);
        }
        return val - 2;
    }, -10, 10
], { strokeColor: '#cc5520' });
