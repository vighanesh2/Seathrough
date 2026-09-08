// Slider for slope
var m = board.create('slider', [[4, 1], [4, 5], [0, 1, 4]], {
    snapWidth: 0.1,
    precision: 1,
    ticks: { drawLabels: true, label: { position: 'rt', offset: [10, 0] } },
    name: "m"
});

// Slider for intercept
var t = board.create('slider', [[-4, 1], [-4, 5], [-2, 0, 6]], {
    snapWidth: 0.1,
    precision: 1,
    ticks: {
        drawZero: true,
        drawLabels: true,
        ticksDistance: 1,
        minTicksDistance: 5,
        tickEndings: [1, 0],
        label: { position: 'lft', offset: [-20, 0] }
    },
    name: "t"
});

// Display point of intercept
var T = board.create('point', [0, () => t.Value()], { name: "T", label: "T", strokeColor: 'purple', face: 'cross' });

// Linear function without intercept
var linF0 = (x) => m.Value() * x;
var G0 = board.create('functiongraph', [linF0, -5, 5], { strokeWidth: 1, dash: 2 });

// Linear function with intercept
var linF = (x) => m.Value() * x + t.Value();
var G = board.create('functiongraph', [linF, -5, 5], { strokeWidth: 2 });

// Return a string containing the actual function term,
// suppress intercept if it is zero.
var ftextval = function() {
    var vz = "",
        tv = "",
        y = t.Value();

    if (y >= 0.0) {
        if (y == 0.0) {
            vz = "";
            tv = "";
        } else {
            vz = "+";
            tv = JXG.toFixed(y, 1);
        }
    } else {
        vz = "";
        tv = JXG.toFixed(y, 1);
    };
    return `\\[f(x)= ${JXG.toFixed(m.Value(), 1)} \\cdot x ${vz} ${tv} \\]`;
};

// Show the text with white background
var ftext = board.create('text', [-4.2, 6.0, ftextval], {
    fontSize: 18,
    color: 'blue',
    cssStyle: 'background-color: rgb(255,255,255)'
});

// Line to show the intercept.
var dt = board.create('segment', [[0, 0], [0, () => t.Value()]], { strokeColor: 'purple', strokeWidth: 3 });

var A = board.create('glider', [1, 2, G], { name: 'A', label: { offset: [0, -15] } });

// Create tangent together with slope triangle.
// Tangent is necessary for the slope triangle, but somehow uninteresting for lines.
var tangent = board.create('tangent', [A]);
var st = board.create('slopetriangle', [tangent]);
