// Coefficients [a_o, ..., a_n] of a polynomial, 
// starting with a_0, a_1, ...
var coefficients = [-1, 3, -9, 1, 0, 0, -8, 9, -9, 1];

// Manipulate coefficients a_7 and a_8
var a8 = board.create('slider', [
    [0, 7],
    [6, 7],
    [-10, -9, 10]
], {
    name: 'a_8',
    snapWidth: 0.1,
    snapValues: [0],
    snapValueDistance: 0.4
});
var a7 = board.create('slider', [
    [0, 6],
    [6, 6],
    [-10, 9, 10]
], {
    name: 'a_7',
    snapWidth: 0.1,
    snapValues: [0],
    snapValueDistance: 0.4
});

var i;
for (i = 0; i < 9; i++) {
    board.create('point', [
        (function(ii) {
            return function() {
                coefficients[7] = a7.Value();
                coefficients[8] = a8.Value();
                let roots = JXG.Math.Numerics.polzeros(coefficients);
                return [roots[ii].real, roots[ii].imaginary];
            }
        })(i)
    ], {
        withLabel: false
    });
}

board.create('text', [-8, -5, () => JXG.Math.Numerics.generatePolynomialTerm(coefficients, coefficients.length - 1, 'x', 1)], {fixed: true});
