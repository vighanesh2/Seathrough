var n = board.create('slider', [[-5, -1], [5, -1], [-5, 2, 5]], {name: 'n'});

// Identity function
board.create('functiongraph', [(t) => t], {strokeColor: '#000000', dash: 1});

// x^n
board.create('functiongraph', [(t) => JXG.Math.pow(t, n.Value()), 0.001, 8]);

// x^(1/n)
board.create('functiongraph', [(t) => JXG.Math.pow(t, 1 / n.Value()), 0.001, 8], {dash: 2});
