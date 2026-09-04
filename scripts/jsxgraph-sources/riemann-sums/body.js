var s = board.create('slider', [[1, 3], [5, 3], [1, 10, 50]], { name: 'n', snapWidth: 1 });
var a = board.create('slider', [[1, 2.5], [5, 2.5], [-10, -2 * Math.PI, 0]], { name: 'start' });
var b = board.create('slider', [[1, 2], [5, 2], [0, Math.PI, 10]], { name: 'end' });

var f = (x) => Math.sin(x);
var plot = board.create('functiongraph', [f, () => a.Value(), () => b.Value()]);

var os = board.create('riemannsum', [f,
    () => s.Value(),
    () => document.getElementById('sumtype').value,
    () => a.Value(),
    () => b.Value()
], { fillColor: '#ffff00', fillOpacity: 0.3 });

board.create('text', [-6, -3, 
    () => 'Riemann sum = ' + (JXG.Math.Numerics.riemannsum(f, s.Value(), document.getElementById('sumtype').value, a.Value(), b.Value())).toFixed(4)
]);
