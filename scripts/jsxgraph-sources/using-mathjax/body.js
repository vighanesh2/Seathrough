var n = board.create('slider', [[-4, -2], [3, -2], [-5, 1, 5]], { name: 'n', snapWidth: 1 });
board.create('functiongraph', [
        (t) => Math.exp(t * n.Value())
]);

// Dynamic MathJax text
board.create('text', [-4, 7,
        () => `\\[f(x) = e^{ ${n.Value()} x}\\]`   // JavaScript template literal
], { fontSize: 24 });
