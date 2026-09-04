// Turtles
var S = board.create('turtle', [], {
    strokeColor: 'blue',
    strokeWidth: 3
});
var E = board.create('turtle', [], {
    strokeColor: 'black',
    strokeWidth: 3
});
var I = board.create('turtle', [], {
    strokeColor: 'red',
    strokeWidth: 3
});
var R = board.create('turtle', [], {
    strokeColor: 'green',
    strokeWidth: 3
});

// Sliders
var s = board.create('slider', [
    [0, -0.5],
    [30, -0.5],
    [0, 1.27E-6, 1]
], {
    name: 's'
});
var beta = board.create('slider', [
    [0, -0.6],
    [30, -0.6],
    [0, 0.5, 1]
], {
    name: 'β'
});
var gamma = board.create('slider', [
    [0, -0.7],
    [30, -0.7],
    [0, 0.3, 1]
], {
    name: 'γ'
});
var mu = board.create('slider', [
    [0, -0.8],
    [30, -0.8],
    [0, 0.0, 1]
], {
    name: 'μ'
});
var a = board.create('slider', [
    [0, -0.9],
    [30, -0.9],
    [0, 1.0, 1]
], {
    name: 'a'
});

board.create('text', [10, -0.3, "initially infected population rate (on load: I(0)=1.27E-6)"]);
board.create('text', [50, -0.6, "β: infection rate"]);
board.create('text', [50, -0.7, "γ: recovery rate = 1/(days of infection)"]);

var t = 0; // global

board.create('text', [10, -0.2,
    function() {
        return "Day " + t + ": infected=" + (7900000 * I.Y()).toFixed(1) + " recovered=" + (7900000 * R.Y()).toFixed(1);
    }
]);

// Reset the turtles
var clearTurtle = function() {
    S.cs();
    E.cs();
    I.cs();
    R.cs();

    S.hideTurtle();
    E.hideTurtle();
    I.hideTurtle();
    R.hideTurtle();
};

// Start the animation
var run = function() {
    S.setPos(0, 1.0 - s.Value());
    R.setPos(0, 0);
    I.setPos(0, s.Value());
    E.setPos(0, 0);

    delta = 1; // global
    t = 0; // global
    loop();
}

var turtleMove = function(turtle, dx, dy) {
    turtle.moveTo([dx + turtle.X(), dy + turtle.Y()]);
};

// Animation
var loop = function() {
    var dS = mu.Value() * (1.0 - S.Y()) - beta.Value() * I.Y() * S.Y();
    var dE = beta.Value() * I.Y() * S.Y() - (mu.Value() + a.Value()) * E.Y();
    var dI = a.Value() * E.Y() - (gamma.Value() + mu.Value()) * I.Y();
    var dR = gamma.Value() * I.Y() - mu.Value() * R.Y();

    turtleMove(S, delta, dS);
    turtleMove(E, delta, dE);
    turtleMove(I, delta, dI);
    turtleMove(R, delta, dR);

    t += delta;
    if (t < 100.0) {
        active = setTimeout(loop, 10);
    }
};

// Stop animation
var stop = function() {
    if (active) {
        clearTimeout(active);
    }
    active = null;
};

// Continue
var goOn = function() {
    if (t > 0) {
        if (active === null) {
            active = setTimeout(loop, 10);
        }
    } else {
        run();
    }
};

clearTurtle();
