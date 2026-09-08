board.suspendUpdate();

// Experiments with lines and circles:

// 1) Plot random points on a line disturbed by a random factor
var i, p1 = [], angle, xr, yr, delta = 0.1;

// Random points are constructed which lie roughly on a line
// defined by y = 0.3*x+1.
// delta*0.5 is the maximal distance in y-direction of the random
// points from the line.
board.suspendUpdate();
for (i = 0; i < 100; i++) {
    yr = 10 * (Math.random() - 0.5);
    xr = 0. * yr + delta * (Math.random() - 0.5);
    p1.push(board.create('point', [xr, yr], { withLabel: false }));
}

// 2) Plot random points on a circle disturbed by a random factor
var i, p2 = [], angle, co, si, delta = 0.2;

// Random points are constructed which lie roughly on a circle
// of radius 4 having the origin as center.
// delta*0.5 is the maximal distance in x- and y- direction of the random
// points from the circle line.
for (i = 0; i < 100; i++) {
    angle = Math.random() * 2 * Math.PI;

    co = 4 * Math.cos(angle) + delta * (Math.random() - 0.5);
    si = 4 * Math.sin(angle) + delta * (Math.random() - 0.5);
    p2.push(board.create('point', [co + 2, si - 1], { withLabel: false }));
}
board.unsuspendUpdate();

//
// bestFit, the best-fitting circle or line is found by least-squares fitting.
//
var bestFit = function(p) {
    var i, j, r = [], rbar = [], x = [], y = [], z = [], A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], n, d,
          eigen, minIndex, minE, ev, c, xm, ym, zm, radius;
    n = p.length;
    for (i = 0; i < n; i++) {
        r.push([1.0, p[i].X(), p[i].Y()]);
        d = r[i][0] * r[i][0] + r[i][1] * r[i][1] + r[i][2] * r[i][2];
        r[i][0] = 1.0 - r[i][0] / d;
        r[i][1] /= d;
        r[i][2] /= d;
    }

    for (j = 0; j < 3; j++) {
        for (i = 0, d = 0; i < n; i++) {
            d += r[i][j];
        }
        d /= n;
        rbar[j] = d;
        for (i = 0; i < n; i++) {
            r[i][j] -= d;
        }
    }
    for (i = 0; i < n; i++) {
        A[0][0] += r[i][0] * r[i][0];
        A[0][1] += r[i][0] * r[i][1];
        A[0][2] += r[i][0] * r[i][2];
        A[1][0] += r[i][1] * r[i][0];
        A[1][1] += r[i][1] * r[i][1];
        A[1][2] += r[i][1] * r[i][2];
        A[2][0] += r[i][2] * r[i][0];
        A[2][1] += r[i][2] * r[i][1];
        A[2][2] += r[i][2] * r[i][2];
    }

    eigen = JXG.Math.Numerics.Jacobi(A);
    minIndex = 0;
    minE = eigen[0][0][0];
    for (j = 1; j < 3; j++) {
        if (eigen[0][j][j] < minE) {
            minIndex = j;
            minE = eigen[0][j][j];
        }
    }
    ev = [eigen[1][0][minIndex], eigen[1][1][minIndex], eigen[1][2][minIndex]];
    c = -(rbar[0] * ev[0] + rbar[1] * ev[1] + rbar[2] * ev[2]);

    xm = -ev[1];
    ym = -ev[2];
    zm = 2.0 * (c + ev[0]);
    //console.log(c, c+ev[0]);

    // If c is close to zero, the best fittting object is a line.
    // The best threshold parameter has yet to be determined.
    // At the moment it is set to 0.01.
    if (Math.abs(c) < 0.01) {
        board.create('line', [zm, xm, ym], { strokeColor: 'green' });
    } else {
        radius = Math.sqrt((xm * xm + ym * ym - 2 * c * zm) / (zm * zm));
        board.create('circle', [[zm, xm, ym], radius]);
    }
}; // end of bestFit()

bestFit(p1);
bestFit(p2);
