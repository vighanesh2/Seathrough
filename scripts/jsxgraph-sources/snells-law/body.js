// Line l1 as an interface between two environments, green, with the index of refraction 
// n_1, and the blue, with the index of refraction n_2.

var M = board.create('point', [-4, 0], { name: 'M', visible: false, fixed: true });
var I = board.create('point', [0, 0], { name: 'I', size: 1, fixed: true });
var l1 = board.create('line', [M, I]);
var ineq1 = board.create('inequality', [l1], { fillColor: 'green' });
var ineq2 = board.create('inequality', [l1], { inverse: true, fillColor: 'blue' });

// Normal line n with auxiliary points N and O that allows us to determine 
// the angles of incidence (α) and refraction (β), respectively
var n = board.create('perpendicular', [l1, I], { name: 'n', color: 'black', dash: "2", strokeWidth: 1 });
var N = board.create('glider', [0, 4, n], { name: 'N', visible: false });
var O = board.create('glider', [0, -4, n], { name: 'O', visible: false });
// a light source L
var L = board.create('point', [-3, 4], { name: 'L', color: 'red', size: 3 });

// Position of the light source L is limited to the green environment
var xL, yL;
L.on('drag', function() {
    if (L.Y() < 0) {
        L.moveTo([xL, yL], 0);
    }
    xL = L.X();
    yL = L.Y();
});

// r1, the incident light ray
var r1 = board.create('segment', [L, I], { strokeColor: 'orange', strokeWidth: 4 });

// Sliders to control indexes of refraction
var n_1 = board.create('slider', [[-4, -3], [-2, -3], [1, 1, 3]], { name: 'n_1', snapWidth: 0.01 });
var n_2 = board.create('slider', [[-4, -4], [-2, -4], [1, 1, 3]], { name: 'n_2', snapWidth: 0.01 });

// The value of s controls the kind of refraction/reflection, if s > 1 the total reflection occurs
// (numerically it is the absolute value of the sine of the angle of refraction)
var s = () => (n_1.Value() / n_2.Value()) * Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))).toFixed(6);

// Two possible points through which the modified ray passes, B for the reflected ray and C for the refracted one
var B = board.create('point', [
               () => -L.X(),
               () => L.Y()
            ], {
    visible: () => (s() > 1 || Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) == 1) ? true : false,
    name: 'R_1',
    face: 'o',
    size: 1
});
var C = board.create('point', [
               () => 5 * (n_1.Value() / n_2.Value()) * Math.sin(JXG.Math.Geometry.angle(N, I, L)),
               () => -5 * Math.cos(Math.asin((n_1.Value() / n_2.Value()) * Math.sin(JXG.Math.Geometry.angle(N, I, L))))
            ], {
    visible: () => (s() <= 1 && Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) != 1) ? true : false,
    name: 'R_2',
    face: 'o',
    size: 1
});

// Reflected (r2) and refracted (r3) ray
var r2 = board.create('segment', [I, B], {
    visible: () => (s() > 1 || Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) == 1) ? true : false,
    strokeColor: 'orange',
    strokeWidth: 4,
    lastArrow: { type: 1, size: 3 }
});
var r3 = board.create('segment', [I, C], {
    visible: () => (s() <= 1 && Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) != 1) ? true : false,
    strokeColor: 'orange',
    strokeWidth: 4,
    lastArrow: { type: 1, size: 3 }
});

// Angles of impact (angle 1), refraction (angle2) and reflection (angle3), respectively
var angle1 = board.create('nonreflexangle', [N, I, L], { radius: 1, color: 'orange', fillOpacity: 0, name: 'α' });
var angle2 = board.create('nonreflexangle', [O, I, C], {
    visible: () => (s() <= 1 && Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) != 1) ? true : false,
    radius: 1,
    color: 'orange',
    fillOpacity: 0,
    name: 'β'
});
var angle3 = board.create('nonreflexangle', [B, I, N], {
    visible: () => (s() > 1 || Math.abs(Math.sin(JXG.Math.Geometry.angle(N, I, L))) == 1) ? true : false,
    radius: 1,
    color: 'orange',
    fillOpacity: 0,
    name: 'β'
});
