// Blue points that define the function graph
var p = [];
p[0] = board.create('point', [-1,0], {withLabel: false, size:2, color:'blue'});
p[1] = board.create('point', [-0.5,3], {withLabel: false, size:2, color:'blue'});
p[2] = board.create('point', [2,0.5], {withLabel: false, size:2, color:'blue'});
p[3] = board.create('point', [6, 3], {withLabel: false, size:2, color:'blue'});

// Lagrange polynomial through blue points
var pol = JXG.Math.Numerics.lagrangePolynomial(p);
var graph = board.create('functiongraph', [pol, -10, 10], {strokeWidth: 2, name:"f", withLabel: true});

var x0 = board.create('glider', [1, 0, board.defaultAxes.x], {name: 'x_0', size:4, label: {fontSize:20}});
var x = board.create('glider', [5, 0, board.defaultAxes.x], {name: 'x', size:4, label: {fontSize:20}});
var fx0 = board.create('point', [function() { return x0.X(); }, function() { return pol(x0.X()); }], {name: '', color: 'grey', fixed: true, size:3});
var fx = board.create('point', [function() { return x.X(); }, function() { return pol(x.X()); }], {name: '', color: 'grey', fixed: true, size:3});
// Secant through fx0 and fx
var line = board.create('line', [fx0, fx],{strokeColor:'#ff0000', dash:2});

// Trace point visualizing f_1
var f1 = board.create('point', [
        () => x.X(),
        () => (fx.Y() - fx0.Y()) / (fx.X() - fx0.X() + 0.0000001)],
        {size: 1, name: 'f_1', color: 'black', fixed: true, trace: true});

// Print function values of f_1
var txt = board.create('text', [0.5, 7, 
       () => '( ' + 
               fx.Y().toFixed(2) + ' - (' + fx0.Y().toFixed(2) + 
               ') ) / ( ' + 
               fx.X().toFixed(2) + ' - (' + fx0.X().toFixed(2) +
               ') ) = ' + ((fx.Y() - fx0.Y()) / (fx.X() - fx0.X())).toFixed(3)
    ]);

// Plot derivative
board.create('functiongraph',[JXG.Math.Numerics.D(pol)], {dash: 2, name:"f'", withLabel: true});
