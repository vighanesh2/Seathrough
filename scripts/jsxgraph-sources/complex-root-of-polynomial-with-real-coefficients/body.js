// Coefficients [a_0, ..., a_n] of a polynomial, 
// starting with a_0, a_1, ...
var coefficients = [-1, 3, -9, 1, 0, 0, -8, 9, -9, 1];
var roots = JXG.Math.Numerics.polzeros(coefficients);

for (let i = 0; i < roots.length; i++) {
    board.create('point', [roots[i].real, roots[i].imaginary], {
        withLabel: false,
        fixed: true
    });
}

board.create('text', [-8, 3, JXG.Math.Numerics.generatePolynomialTerm(coefficients, coefficients.length - 1, 'x', 0)], {fixed: true});
