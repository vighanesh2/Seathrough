// line

let a = board.create('line', [[input[0], input[1]], [input[2], input[3]]], {
    name: '\\(a\\)',
    withLabel: true,
    label: {offset: [10, 0], fontSize: 16, align: 'middle'},
    fixed: true,
    strokeWidth: 3
});

// triangle ABC

let A = board.create('point', [input[4], input[5]], {
    name: '\\(A\\)',
    label: {offset: [-25, -10], fontSize: 16},
    fixed: true,
    snapToGrid: true
});
let B = board.create('point', [input[6], input[7]], {
    name: '\\(B\\)',
    label: {offset: [10, -5], fontSize: 16},
    fixed: true,
    snapToGrid: true
});
let C = board.create('point', [input[8], input[9]], {
    name: '\\(C\\)',
    label: {offset: [0, 15], fontSize: 16},
    fixed: true,
    snapToGrid: true
});
let ABC = board.create('polygon', [A, B, C], {
    borders: {strokeWidth: 2}
});

// triangle A'B'C'

let A1 = board.create('point', [input[10], input[11]], {
    name: '\\(A\'\\)',
    label: {offset: [10, 0], fontSize: 16},
    snapToGrid: true
});
let B1 = board.create('point', [input[12], input[13]], {
    name: '\\(B\'\\)',
    label: {offset: [10, 0], fontSize: 16},
    snapToGrid: true
});
let C1 = board.create('point', [input[14], input[15]], {
    name: '\\(C\'\\)',
    label: {offset: [10, 0], fontSize: 16},
    snapToGrid: true
});
let A1B1C1 = board.create('polygon', [A1, B1, C1], {
    borders: {strokeWidth: 2}
});

// the following elements are visible: true / invisible: false

let opt = false;

// reflected triangle

let ABCreflected = board.create('reflection', [ABC, a], {
    fillColor: '#cccccc',
    borders: {strokeWidth: 1, strokeColor: '#cccccc'},
    vertices: {size: 1, strokeColor: '#cccccc', fillColor: '#cccccc'},
    visible: () => {
        return opt;
    }
});

// output data for LMS, additional binding to LMS necessary

let output = function () {
    return [
        A1.X(), A1.Y(),   // point A(x, y)
        B1.X(), B1.Y(),   // point B(x, y)
        C1.X(), C1.Y()   // point C(x, y)
    ];
}

// output events (only necessary for demonstration in share database, not needed in LMS)

A1.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
B1.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
C1.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});

let show = function () {
    opt = !opt;
    board.update();
}
