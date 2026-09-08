var line0 = board.create('line', [[-1, 0], [-1, 1]], {
    strokeOpacity: .2,
    strokeColor: '#000000',
    fixed: true,
    name: 'x=-1',
    withLabel: true,
    label: { position: '10% right', distance: 0.1 }
});
var line1 = board.create('line', [[1, 0], [1, 1]], {
    strokeOpacity: .2,
    strokeColor: '#000000',
    fixed: true,
    name: 'x=1',
    withLabel: true,
    label: { position: '10% right', distance: 0.1 }
});

var gl1 = board.create('glider', [0, 0, line0], { name: 'b' });
var gl2 = board.create('glider', [1, -1, line1], { name: 'a' });

var line = board.create('line', [gl1, gl2]);

// offset determines the slope of line
var offset = gl2.Y() - gl1.Y();

// Drag gl1 and keep the slope of the line
gl1.on('drag', function() {
    gl2.moveTo([gl1.X(), gl1.Y() + offset]);
});

// Drag gl2 and adapt the slope of the line
gl2.on('drag', function() {
    offset = gl2.Y() - gl1.Y();
});
