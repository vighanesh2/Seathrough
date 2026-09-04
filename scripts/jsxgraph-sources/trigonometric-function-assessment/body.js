// function (given/blue part)

let f = board.create('functiongraph', [input[0] + '*sin(' + input[1] + '*x-' + input[2] + ')', -10, 0], {
    name: '\\(f\\)',
    strokeWidth: 2
});

// sliders a, b, c

let a = board.create('slider', [[-9, 9], [-3, 9], [1, input[3], 10]], {
    name: 'a',
    ticks: { visible: false },
    snapWidth: 1
});

let b = board.create('slider', [[-9, 8], [-3, 8], [1, input[4], 10]], {
    name: 'b',
    ticks: { visible: false },
    snapWidth: 1
});

let c = board.create('slider', [[-9, 7], [-3, 7], [1, input[5], 10]], {
    name: 'c',
    ticks: { visible: false },
    snapWidth: 1
});

// function (red part)

let g = board.create('functiongraph', [ (x) => { return a.Value()*Math.sin(b.Value()*x-c.Value()); }, 0, 10], {
    name: '\\(f\\)',
    strokeColor: '#cc0000',
    strokeWidth: 2
});

// function term

let t = board.create('text', [1, 8, () => { return 'f(x)='+a.Value()+'*sin('+b.Value()+'*x-'+c.Value()+')'; }], {
    name: '\\(f\\)',
    strokeColor: '#cc0000',
    strokeWidth: 2
});

// the following elements are visible: true / invisible: false

let opt = false;

let h = board.create('functiongraph', [input[0] + '*sin(' + input[1] + '*x-' + input[2] + ')', 0, 10], {
    name: '',
    strokeColor: '#cccccc',
    strokeWidth: 1,
    visible: () => {
        return opt;
    }
});

// output data for LMS, additional binding to LMS necessary

let output = function () {
    return [
        a.Value(), b.Value(), c.Value()  // param a, b, c
    ];
}

// output events (only necessary for demonstration in share database, not needed in LMS)

a.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
b.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
c.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});

let show = function () {
    opt = !opt;
    board.update();
}
