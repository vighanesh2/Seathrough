var s = board.create('slider', [[1, 30], [6, 30], [3, 5, 50]], { name: 'n', snapWidth: 1 });
var a = board.create('slider', [[1, 25], [6, 25], [-10, 0, 0]], { name: 'start' });
var b = board.create('slider', [[1, 20], [6, 20], [0, 6, 10]], { name: 'end' });

var f = function(x) { return -x * (x - 6); };
var plot = board.create('functiongraph', [f, function() { return a.Value(); }, function() { return b.Value(); }]);

var os = board.create('riemannsum', [f,
    function() { return s.Value(); },
    function() { return document.getElementById('sumtype').value; },
    function() { return a.Value(); },
    function() { return b.Value(); }
    ], { fillColor: '#ffff00', fillOpacity: 0.3 });

board.create('text',
      [1, 35, function() { return 'approx. sum = ' + (JXG.Math.Numerics.riemannsum(f, s.Value(), document.getElementById('sumtype')
            .value, a.Value(), b.Value())).toFixed(4); }]);
