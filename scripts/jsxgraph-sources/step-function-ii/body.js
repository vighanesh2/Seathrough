// Static example
var curve = board.create('stepfunction', [[0, 1, 2, 3, 4, 5], [1, 3, 0, 2, 2, 1]]);

// Dynamic example
var p = board.create('point', [-1, 5], { name: 'drag me' });
var curve2 = board.create('stepfunction', [[0, 1, 2, 3, 4, 5], [1, 3, 0, 2, 2, 1]], { strokeColor: 'red' });
board.on('update', function() {
    var i, len = curve2.xterm.length;
    for (i = 0; i < len; i++) {
        curve2.yterm[i] = Math.random() * p.Y();
    }
});
