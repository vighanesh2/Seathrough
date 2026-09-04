// unit

let unit = board.create('segment', [[1, 14], [3, 14]], {
    name: '\\(' + input[6] + '\\) \\(cm\\)',
    withLabel: true,
    label: {offset: [-20, -20], fontSize: 16, align: 'middle'},
    fixed: true,
    strokeWidth: 3
});

// triangle ABC

let A = board.create('point', [input[0], input[1]], {
    name: '\\(A\\)',
    label: {offset: [-25, -10], fontSize: 16},
    snapToGrid: true
});
let B = board.create('point', [input[2], input[3]], {
    name: '\\(B\\)',
    label: {offset: [10, -5], fontSize: 16},
    snapToGrid: true
});
let C = board.create('point', [input[4], input[5]], {
    name: '\\(C\\)',
    label: {offset: [0, 15], fontSize: 16},
    snapToGrid: true
});
let ABC = board.create('polygon', [A, B, C], {
    borders: {strokeWidth: 2}
});

// the following elements are visible: true / invisible: false

let opt = false;

// baseline of triangle ABC

let c = board.create('segment', [A, B], {
    name: '',
    withlabel: true,
    label: {offset: [0, -15], fontSize: 16},
    strokeColor: '#ff0000',
    visible: () => {
        return opt;
    }
});

// height of triangle ABC

let F = board.create('perpendicularpoint', [C, c], {
    name: '',
    label: {offset: [0, -15], fontSize: 16},
    strokeColor: '#999999',
    fillColor: '#999999',
    visible: () => {
        return opt;
    }
});
let h = board.create('segment', [C, F], {
    name: '',
    withlabel: true,
    label: {offset: [-20, -15], fontSize: 16},
    strokeColor: '#ff0000',
    dash: 2,
    visible: () => {
        return opt;
    }
});

// output data for LMS, additional binding to LMS necessary

let output = function () {
    return [
        A.X(), A.Y(),   // point A(x, y)
        B.X(), B.Y(),   // point B(x, y)
        C.X(), C.Y(),   // point C(x, y)
        input[6],      // unit
        0.5 * c.L() * input[6] / 2 * h.L() * input[6] / 2   // area
    ];
}

// output events (only necessary for demonstration in share database, not needed in LMS)

A.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
B.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
C.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});

let show = function () {
    opt = !opt;
    board.update();
}
