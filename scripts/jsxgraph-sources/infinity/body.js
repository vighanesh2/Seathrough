var S = board.create('slider', [
    [-5, -6],
    [5, -6],
    [0, 0.95, 1]
], {
    name: 'S'
});
var hue = board.create('slider', [
    [-5, -7],
    [5, -7],
    [0, 8, 36]
], {
    name: 'color'
});

var points = [],
    attr = {name: ''};
points[0] = board.create('point', [5, 5], attr);
points[1] = board.create('point', [-5, 5], attr);
points[2] = board.create('point', [-5, -5], attr);
points[3] = board.create('point', [5, -5], attr);

var quadrangle = function(pt, n) {
    var col, i, arr = [];

    for (i = 0; i < 4; i++) {
        arr[i] = board.create('point',
            [(function(t) {
                    return function() {
                        var x = pt[t].X(),
                            x1 = pt[(t + 1) % 4].X();
                        return x + (x1 - x) * S.Value();
                    }
                })(i),
                (function(t) {
                    return function() {
                        var y = pt[t].Y(),
                            y1 = pt[(t + 1) % 4].Y();
                        return y + (y1 - y) * S.Value();
                    }
                })(i)

            ], {
                size: 1,
                withLabel: false,
                visible: false
            });
    }

    // Dynamic fill color
    col = () => JXG.hsv2rgb(hue.Value() * n, 0.7, 0.9);
    board.create('polygon', pt, {fillColor: col});
    
    // Recursion
    if (n > 0) {
        quadrangle(arr, --n);
    }
}

// Start recursion
quadrangle(points, 30);
