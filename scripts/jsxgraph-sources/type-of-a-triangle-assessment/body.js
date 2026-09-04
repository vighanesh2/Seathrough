// triangle ABC

let A = board.create('point', [input[0], input[1]], {
    name: '\\(A\\)',
    snapToGrid: true,
    label: {offset: [-25, -10], fontSize: 16}
});
let B = board.create('point', [input[2], input[3]], {
    name: '\\(B\\)',
    snapToGrid: true,
    label: {offset: [10, -5], fontSize: 16}
});
let C = board.create('point', [input[4], input[5]], {
    name: '\\(C\\)',
    snapToGrid: true,
    label: {offset: [0, 15], fontSize: 16}
});
let ABC = board.create('polygon', [A, B, C], {
    borders: {strokeWidth: 2}
});

// angles alpha, beta, gamma

let alpha = board.create('nonreflexangle', [B, A, C], {
    orthoType: 'square',
    withLabel: false,
    visible: false
});
let beta = board.create('nonreflexangle', [C, B, A], {
    orthoType: 'square',
    withLabel: false,
    visible: false
});
let gamma = board.create('nonreflexangle', [A, C, B], {
    orthoType: 'square',
    withLabel: false,
    visible: false
});

// the following properties are visible: true / invisible: false

let opt = false;

// show right angle

alpha.setAttribute({
    visible: () => {
        return opt;
    }
});
beta.setAttribute({
    visible: () => {
        return opt;
    }
});
gamma.setAttribute({
    visible: () => {
        return opt;
    }
});

// output data for LMS, additional binding to LMS necessary

let output = function () {
    let type = -1;
    if (Math.max(alpha.Value(), beta.Value(), gamma.Value())<0.5*Math.PI)
        type = 0; // acute
    else if (Math.max(alpha.Value(), beta.Value(), gamma.Value()) == 0.5 * Math.PI)
        type = 1; // right
    else
        type = 2; //obtuse
    return [
        A.X(), A.Y(),   // point A(x, y)
        B.X(), B.Y(),   // point B(x, y)
        C.X(), C.Y(),   // point C(x, y)
        type            // 0: acute, 1: right, 2: obtuse
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


let show = function show() {
    opt = !opt;
    board.update();
}
