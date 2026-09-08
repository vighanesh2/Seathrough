// Shortcuts
var ax = board.defaultAxes.x;
var ay = board.defaultAxes.y;

var p0 = board.create('point', [0, 0], { fixed: true, visible: false });
var c = board.create('circle', [p0, 1], { dash: 2, strokeWidth: 1, strokeOpacity: 0.6 });

var p2 = board.create('glider', [0.4, 1.0, c], { name: '', withLabel: false });
var p3 = board.create('point', [() => p2.X(), 0.0], { visible: false, name: '', withLabel: false });
var p4 = board.create('point', [0.0, () => p2.Y()], { visible: false, name: '', withLabel: false });
var angle = board.create('angle', [[10, 0], p0, p2], {name: 'φ' });

// hypotenuse
var hypot = board.create('segment', [p0, p2], {
    strokeColor: 'black',
    withLabel: true,
    name: '1',
    label: {
        position: '50% right',
        distance: 0.5
    }
});

// sine
board.create('segment', [p2, p3], {
    strokeColor: 'red',
    withLabel: true,
    name: 'sinφ',
    label: {
        position: '50% right',
        distance: 0.5,
        anchorY: 'top'
    }
});

// cosine
board.create('segment', [p2, p4], {
    strokeColor: 'red',
    withLabel: true,
    name: 'cosφ',
    label: {
        position: '50% left',
        distance: 2,
        anchorX: 'right',
        anchorY: 'middle'
    }
});

var t = board.create('tangent', [p2], { visible: false });
var p5 = board.create('intersection', [t, ax, 0], { visible: false, name: '', withLabel: false });
var p6 = board.create('intersection', [t, ay, 0], { visible: false, name: '', withLabel: false });

// tangent
board.create('segment', [p2, p5], {
    withLabel: true,
    name: 'tanφ',
    label: {
        position: '50% right',
        distance: 0.5
    }
}); 

// cotangent
board.create('segment', [p2, p6], {
    withLabel: true,
    name: 'cotφ',
    label: {
        position: '50% right',
        distance: 0.1,
        anchorX: 'middle',
    }
});

// cosecant
board.create('segment', [p0, p6], {
    strokeColor: 'green',
    withLabel: true,
    name: 'cscφ',
    label: {
        position: '50% left',
        distance: 1.4,
        anchorX: 'right',
    }
});

// secant
board.create('segment', [p0, p5], {
    strokeColor: 'green',
    withLabel: true,
    name: 'secφ',
    label: {
        position: '50% right',
        distance: 1,
        anchorY: 'top',
    }
});
