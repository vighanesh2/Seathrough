board.suspendUpdate();

var a = board.create('slider', [[-5, 6], [5, 6], [-5, 1, 5]], { name: 'a' });

var cubic = board.create('curve',
    [function(t) { return a.Value() * 3 * (t * t - 3); },
     function(t) { return a.Value() * t * (t * t - 3); },
     -5, 5
    ], { strokeWidth: 1, strokeColor: 'black' }
);

var radpoint = board.create('point', [function() { return -a.Value() * 8; }, 0], { name: 'radiant point' });
var reflectionpoint = board.create('glider', [-7, 1, cubic], { name: 'point of reflection' });
var dir = board.create('segment', [radpoint, reflectionpoint], { strokeWidth: 1 });

var infty = board.create('point',
    [function() {
        var A = dir.stdform[1],
            B = dir.stdform[2],
            t = reflectionpoint.position,
            u = JXG.Math.Numerics.D(cubic.X)(t),
            v = JXG.Math.Numerics.D(cubic.Y)(t),
            dirx = A * v * v - 2 * B * u * v - A * u * u,
            diry = B * u * u - 2 * A * u * v - B * v * v;
        return [0, diry, -dirx];
    }], { name: '', visible: false }
);

var reflection = board.create('line',
    [reflectionpoint, infty], { strokeWidth: 1, straightFirst: false, trace: true }
);

var cataustic = board.create('curve',
    [function(t) { return a.Value() * 6 * (t * t - 1); },
     function(t) { return a.Value() * 4 * t * t * t; },
     -4, 4
    ], { strokeWidth: 3, strokeColor: 'red' }
);

board.unsuspendUpdate();
