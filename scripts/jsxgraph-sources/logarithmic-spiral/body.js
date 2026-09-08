var a = board.create('slider', [[1, -2], [5, -2], [0, 0.3, 1]], { name: 'a' });
var b = board.create('slider', [[1, -3], [5, -3], [-1, 0.15, 1]], { name: 'b' });
var c = board.create('curve', [function(phi) { return a.Value() * Math.exp(b.Value() * phi); }, [0, 0], 0, 8 * Math.PI],
             { curveType: 'polar', strokewidth: 4 });
var g = board.create('glider', [c]);
var t = board.create('tangent', [g], { dash: 2, strokeColor: '#a612a9' });
