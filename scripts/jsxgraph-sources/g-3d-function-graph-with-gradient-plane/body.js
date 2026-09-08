var box = [-5, 5];
var view = board.create('view3d',
    [
        [-6, -3],
        [8, 8],
        [box, box, box]
    ], {
        xPlaneRear: {
            visible: false
        },
        yPlaneRear: {
            visible: false
        },
    });

// Slider to manipulate the function F below.
var s = board.create('slider', [[-7, -6], [5, -6], [-3, 0.3, 4]], {name: 's'});

// Function F to be plotted
var F = (x, y) => s.Value() * x * y + 2;

// 3D surface
var c = view.create('functiongraph3d', [F, box, box], {
    strokeWidth: 0.5,
    stepsU: 70,
    stepsV: 70,
});

// 3D point: point on xy plane
var Axy = view.create('point3d', [2, 2, -5], {
    withLabel: false,
    size: 5
});

// Project Axy to the surface
var A = view.create('point3d', [
   () => [Axy.X(), Axy.Y(), F(Axy.X(), Axy.Y())]
], {
    withLabel: false
});
view.create('line3d', [Axy, A], {
    dash: 1
});

// Hard coded, partial derivatives of F in point A
var dFx = () => s.Value() * A.Y(),
    dFy = () => s.Value() * A.X(),
    dFx_vec = [1, 0, dFx],
    dFy_vec = [0, 1, dFy];

// Gradient plane
// Dynamic size:
// var plane1 = view.create('plane3d', [A, dFx_vec, dFy_vec, [() => -dFx(), dFx], [() => -dFy(), dFy]], {
// Fixed size:
var plane1 = view.create('plane3d', [A, dFx_vec, dFy_vec, [-1, 1], [-1, 1]], {
    fillOpacity: 0.8,
    fillColor: 'red'
});
var a = view.create('line3d', [A, dFx_vec, [0, dFx]]);
var b = view.create('line3d', [A, dFy_vec, [0, dFy]]);
