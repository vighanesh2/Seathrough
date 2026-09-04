var i, p = [], angle, co, si, delta = 0.8;

// Random points are constructed which lie roughly on a circle
// of radius 4 having the origin as center.
// delta*0.5 is the maximal distance in x- and y- direction of the random
// points from the circle line.
board.suspendUpdate();
for (i = 0; i < 100; i++) {
    angle = Math.random() * 2 * Math.PI;

    co = 4 * Math.cos(angle) + delta * (Math.random() - 0.5);
    si = 4 * Math.sin(angle) + delta * (Math.random() - 0.5);
    p.push(board.create('point', [co, si], { withLabel: false }));
}
board.unsuspendUpdate();

// Having constructed the points, we can fit a circle 
// through the point set, consisting of n points.
// The (n times 3) matrix consists of
//   x_1, y_1, 1
//   x_2, y_2, 1
//      ...
//   x_n, y_n, 1
// where x_i, y_i is the position of point p_i
// The vector y of length n consists of
//    x_i*x_i+y_i*y_i 
// for i=1,...n.
var M = [], y = [], MT, B, c, z, n;
n = p.length;
for (i = 0; i < n; i++) {
    M.push([p[i].X(), p[i].Y(), 1.0]);
    y.push(p[i].X() * p[i].X() + p[i].Y() * p[i].Y());
}

// Now, the general linear least-square fitting problem
//    min_z || M*z - y||_2^2
// is solved by solving the system of linear equations
//    (M^T*M) * z = (M^T*y)
// with Gauss elimination.
MT = JXG.Math.transpose(M);
B = JXG.Math.matMatMult(MT, M);
c = JXG.Math.matVecMult(MT, y);
z = JXG.Math.Numerics.Gauss(B, c);

// Finally, we can read from the solution vector z the coordinates [xm, ym] of the center
// and the radius r and draw the circle.
var xm = z[0] * 0.5;
var ym = z[1] * 0.5;
var r = Math.sqrt(z[2] + xm * xm + ym * ym);

board.create('circle', [[xm, ym], r]);
