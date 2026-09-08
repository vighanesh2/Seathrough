// Create some sliders to control the model
angle = board.create('slider', [[1.1, 4.3], [3.1, 4.3], [0, 0.7, 1.57]], {name: 'angle'});
v = board.create('slider', [[1.1, 4.7], [3.1, 4.7], [0, 10, 10]], {name: 'velocity'});
friction = board.create('slider', [[1.1, 3.9], [3.1, 3.9], [0, 0.16, 2]], {name: 'friction', snapWidth: 0.05});
tFinal = board.create('slider', [[1.1, 3.5], [3.1, 3.5], [0, 5, 15]], {name: 'tEnd'});
curveN = board.create('slider', [[1.1, 3.1], [3.1, 3.1], [20, 100, 200]], {name: 'N', snapWidth: 1});

// Trajectory:
// Initial point 
point = board.create('point', [-4, 0], {
    name: '(x_0,y_0)',
    color: 'red'
});

// ODE for projectile
var frk = function(t, x) {
    // Friction
    let y = [
        x[2],
        x[3],
        0 - friction.Value() * x[2] * x[2],
        -9.81 - friction.Value() * x[3] * x[3]
    ];
    return y;
};

// Forward solver using JSXGraph's Runge-Kutta algorithm.
// Note: x[0] is x, x[1] is y, x[2] is \dot x, x[3] is \dot y
var forwardSolver = function() {
    var I, x0;

    // Time interval
    I = [0, tFinal.Value()];
    // Initial value 
    x0 = [point.X(), point.Y(), v.Value() * Math.cos(angle.Value()), v.Value() * Math.sin(angle.Value())];
    // Solve the ODE
    return JXG.Math.Numerics.rungeKutta('heun', x0, I, curveN.Value(), frk);
};

// Create and update curve which approximates the trajectory with friction
cf = board.create('curve', [[], []], {strokeWidth: 2});
cf.updateDataArray = function() {
    var i;

    // Solve ODE
    var data = forwardSolver();
    this.dataX = [];
    this.dataY = [];
    // Copy ODE solution to the curve
    for (i = 0; i < data.length; i++) {
        this.dataX[i] = data[i][0];
        this.dataY[i] = data[i][1];
    }
}

// Show the analytic solution without friction
cf2 = board.create('curve', [
    (t) => v.Value() * Math.cos(angle.Value()) * t + point.X(),
    (t) => v.Value() * Math.sin(angle.Value()) * t - 9.81 / 2 * t * t + point.Y(),
    0, () => tFinal.Value()
], {
    strokeWidth: 1,
    strokeColor: 'red'
});
