var box = [-2, 2],
    view = board.create('view3d', [[-6, -3], [8, 8], [box, box, box]], {
        xPlaneRear: { visible: false },
        yPlaneRear: { visible: false }
    });

// Define the 3D function graph
var F_txt = 'cos(2 * x) * cos(3 * y)';
var F = board.jc.snippet(F_txt, true, 'x,y');

// Partial derivatives, computed symbolically
var Fdx_txt = 'D(cos(2 * x) * cos(3 * y), x)';
var Fdy_txt = 'D(cos(2 * x) * cos(3 * y), y)';
var Fdx = board.jc.snippet(Fdx_txt, true, 'x,y');
var Fdy = board.jc.snippet(Fdy_txt, true, 'x,y');

// 3D function graph
var c = view.create("functiongraph3d", [F, box, box], { strokeWidth: .5, stepU: 70, stepsV: 70 });

// The two points
var Axy = view.create("point3d", [1, 1, -2], { withLabel: false }),
    A = view.create("point3d", [function() { return [Axy.X(), Axy.Y(), F(Axy.X(), Axy.Y())] }], {
        withLabel: false,
        fixed: true
    });
view.create("line3d", [Axy, A], { dash: 1 });

// Determine tangent vectors
var dFx = () => Fdx(A.X(), A.Y()),
    dFy = () => Fdy(A.X(), A.Y()),
    dFx_norm = () => Math.sqrt(1 + Fdx(A.X(), A.Y()) ** 2),
    dFy_norm = () => Math.sqrt(1 + Fdy(A.X(), A.Y()) ** 2),
    dFx1 = () => 1 / dFx_norm(),
    dFx2 = () => Fdx(A.X(), A.Y()) / dFx_norm(),
    dFy1 = () => 1 / dFy_norm(),
    dFy2 = () => Fdy(A.X(), A.Y()) / dFy_norm(),
    dFx_vec = [dFx1, 0, dFx2],
    dFy_vec = [0, dFy1, dFy2],

    // Tangent plane
    plane1 = view.create("plane3d", [A, dFx_vec, dFy_vec, [-.5, .5], [-.5, .5]], { fillOpacity: .8, fillColor: "red" }),
    // Tangent vectors of length 1
    a = view.create("line3d", [A, dFx_vec, [0, 1]]),
    b = view.create("line3d", [A, dFy_vec, [0, 1]]);
