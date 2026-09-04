var a, b, c, d,
    f, func,
    realRoots;

a = board.create('slider', [[-8, 8], [-2.5, 8], [-10, 0, 10]], { name: 'a' });
b = board.create('slider', [[-8, 7], [-2.5, 7], [-10, -5, 10]], { name: 'b' });
c = board.create('slider', [[-8, 6], [-2.5, 6], [-10, 2, 10]], { name: 'c' });
d = board.create('slider', [[-8, 5], [-2.5, 5], [-10, 1, 10]], { name: 'd' });

f = (x) => x ** 4 + a.Value() * x ** 3 + b.Value() * x ** 2 + c.Value() * x + d.Value();
func = board.create('functiongraph', [f], { strokeWidth: 2 });

// Return all real roots of polynomial with coefficients `coeffs`
realRoots = function(coeffs) {
    return JXG.Math.Numerics.polzeros(coeffs) // Find ALL complex roots of the polynomial
        .filter((z) => Math.abs(z.imaginary) < 1.e-12) // Filter real roots
        .map((z) => z.real); // Convert complex numbers to real numbers
};

// Construct the roots.
// If the roots are non-real, they are not shown.
board.create('point', [() => realRoots([d.Value(), c.Value(), b.Value(), a.Value(), 1])[0], 0]);
board.create('point', [() => realRoots([d.Value(), c.Value(), b.Value(), a.Value(), 1])[1], 0]);
board.create('point', [() => realRoots([d.Value(), c.Value(), b.Value(), a.Value(), 1])[2], 0]);
board.create('point', [() => realRoots([d.Value(), c.Value(), b.Value(), a.Value(), 1])[3], 0]);
