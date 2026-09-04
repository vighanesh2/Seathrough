var f, g, fg, plotf, plotg, plotfg;

// Change function f or g
var change = function(obj, name) {
    var t = obj.value + '(x)';
    
    if (obj.value === 'square') {
        t = 'x * x';
    }
   
    if (name === 'f') {
        f = board.jc.snippet(t, true, 'x');
        plotf.Y = f;
        plotf.updateCurve();
    } else {
        g = board.jc.snippet(t, true, 'x');
        plotg.Y = g;
        plotg.updateCurve();
    }
    board.update();
}

// Change composition order
var compose = function(obj) {
    var t = obj.value;

    if (t == 'fg') {
        fg = (x) => f(g(x));
    } else if (t == 'gf') {
        fg = (x) => g(f(x));
    }
    plotfg.Y = fg;
    plotfg.updateCurve();
    board.update();
}

f = (x) => Math.sin(x);
g = (x) => Math.asin(x);
fg = (x) => f(g(x));

plotf = board.create('functiongraph', [f, -2, 2], {dash: 2, strokeColor: 'blue', strokeWidth: 3});

plotg = board.create('functiongraph', [g, -2, 2], {dash: 3, strokeColor: 'green', strokeWidth: 3});

plotfg = board.create('functiongraph', [fg, -2, 2], {strokeColor: 'red', strokeWidth: 3});
