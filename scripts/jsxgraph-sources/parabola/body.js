var a = board.create('slider', [[2, -5], [7, -5], [-5, 1, 5]], { name: 'a' });
var b = board.create('slider', [[2, -6], [7, -6], [-5, 0, 5]], { name: 'b' });
var c = board.create('slider', [[2, -7], [7, -7], [-5, 0, 5]], { name: 'c' });

var f = board.create('functiongraph', [(x) => a.Value() * x * x + b.Value() * x + c.Value()]);

var txt = board.create('text', [-9, -5,
       () => JXG.Math.Numerics.generatePolynomialTerm([c.Value(), b.Value(), a.Value()], 2, 'x', 2)
], { fontSize: 18 });
