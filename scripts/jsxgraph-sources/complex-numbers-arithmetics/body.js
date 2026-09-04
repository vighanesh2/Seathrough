var txt = board.create('text', [-5, 4.5, 'Addition of complex numbers x and y'], {
        fontSize: 20,
        fixed: true
    });
    var org = board.create('point', [0, 0], {
        style: 10,
        visible: true,
        fixed: true,
        name: ' '
    });
    var x = board.create('point', [2, 2], {
        style: 5,
        color: 'blue',
        name: 'x'
    });
    var y = board.create('point', [-1, -3], {
        style: 5,
        color: 'blue',
        name: 'y'
    });
    var xy = board.create('point',
        ["X(x) + X(y)", "Y(x) + Y(y)"], {
            style: 7,
            color: 'green',
            name: 'x+y'
        });
    var ax = board.create('arrow', [org, x], {
        strokeColor: 'blue'
    });
    var ay = board.create('arrow', [org, y], {
        strokeColor: 'blue'
    });
    var axy = board.create('arrow', [org, xy], {
        strokeColor: 'red'
    });
    var ax2 = board.create('arrow', [x, xy], {
        strokeColor: 'blue',
        strokeWidth: 1,
        dash: 1
    });
    var ay2 = board.create('arrow', [y, xy], {
        strokeColor: 'blue',
        strokeWidth: 1,
        dash: 1
    });
})();

(function() {
