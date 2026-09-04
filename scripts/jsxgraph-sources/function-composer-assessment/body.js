// anchor bar

let term = '0.5*(x-2)*(x-5)*(x-7)';
let f = board.create('functiongraph', [term, xMin + padding, xMax], {
    strokeWidth: 3,
    strokeColor: '#ff6666'
});

let A = board.create('point', [xMin + padding, yBar], {
    fixed: true,
    visible: false
});
let B = board.create('point', [xMax - padding, yBar], {
    fixed: true,
    visible: false
});
let bar = board.create('segment', [A, B], {
    fixed: true,
    strokeWidth: 10,
    strokeColor: '#cccccc',
    linecap: 'round',
    highLight: false
});

//  separator handling

let P = [];
let F = [];
let coordsX = [];
let sCount = (input.length - 5) / 2;
for (let i = 0; i < sCount; i++) {
    P[i] = board.create('glider', [input[5 + i * 2], yBar, bar], {
        name: '',
        face: '^',
        size: 6,
        strokeWidth: 3,
        strokeColor: '#000000',
        fillColor: '#000000',
        highlight: false,
        showInfoBox: false
    });
    P[i].on('drag', function (e) {
        sortSeparators();
    });
}


// sort separators

function sortSeparators() {
    for (let i = 0; i < P.length; i++)
        coordsX[i] = P[i].X();
    coordsX.sort(function (a, b) {
        return a - b
    });
    //document.getElementById('outputID').innerHTML = output();
}

sortSeparators();

// create separators

for (let i = 0; i < P.length; i++) {
    let Pi = board.create('point', [() => {
        return coordsX[i];
    }, yBar], {visible: false});
    let n = board.create('segment', [[() => {
        return coordsX[i];
    }, yMin + padding], [() => {
        return coordsX[i];
    }, yMax - padding/2]], {
        strokeColor: '#888888', dash: 2, strokeWidth: 1, point1: {visible: false}
    });
    F[i] = board.create('glider', [0, input[6 + i * 2], n], {
        name: '',
        face: '<>',
        size: 4,
        strokeWidth: 3,
        strokeColor: '#000000',
        fillColor: '#000000',
        highlight: false,
        showInfoBox: false
    });
}

//let tau = board.create('slider', [[0.5,4],[4,3],[0.001,0.5,1]], {name:'tau'});
//let c = board.create('curve', JXG.Math.Numerics.CardinalSpline(F, function(){ return tau.Value();}), {strokeWidth:3});
//let c = board.create('curve', JXG.Math.Numerics.CatmullRomSpline(F, function(){ return tau.Value();}), {strokeWidth:3});
let c = board.create('spline', F, {strokeWidth:3});

// output data for LMS, additional binding to LMS necessary

function output() {
    let out = [];
    for (let i = 0; i < F.length; i++) {
        out.push(F[i].X());
        out.push(F[i].Y());
    }
    return out;
}

// the following elements are visible: true / invisible: false

let opt = false;

let g = board.create('functiongraph', ['D(' + term + ')', xMin + padding, xMax], {
    strokeWidth: 2,
    strokeColor: '#669966',
    visible: () => { return opt; }
});

// output events (only necessary for demonstration in share database, not needed in LMS)

for (let i = 0; i < F.length; i++) {
    P[i].on('up', function (e) {
        document.getElementById('outputID').innerHTML = output();
    });
    F[i].on('up', function (e) {
        document.getElementById('outputID').innerHTML = output();
    });
}

function show() {
    opt = !opt;
    board.update();
}
