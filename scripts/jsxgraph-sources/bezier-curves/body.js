// Create initial points
var p = [];
var col = 'red';
p.push(board.create('point', [2, 1], {color: col})); // data point
col = 'blue';
p.push(board.create('point', [0.75, 2.5], {color: col})); // control point
p.push(board.create('point', [-0.3, 0.3], {color: col})); // control point
col = 'red';
p.push(board.create('point', [-3, 1], {color: col})); // data point
col = 'blue';
p.push(board.create('point', [-0.75, -2.5], {color: col})); // control point
p.push(board.create('point', [1.5, -2.8], {color: col})); // control point
col = 'red';
p.push(board.create('point', [2, -0.5], {color: col})); // data point

// Bezier curve
var c = board.create('curve', JXG.Math.Numerics.bezier(p), {
    strokecolor: 'blue',
    strokeOpacity: 0.6,
    strokeWidth: 5
});

var addSegment = function() {
    col = 'blue';
    p.push(board.create('point', [Math.random() * 8 - 4, Math.random() * 8 - 4], {
        strokeColor: col,
        fillColor: col
    })); // control point
    p.push(board.create('point', [Math.random() * 8 - 4, Math.random() * 8 - 4], {
        strokeColor: col,
        fillColor: col
    })); // control point
    col = 'red';
    p.push(board.create('point', [Math.random() * 8 - 4, Math.random() * 8 - 4], {
        strokeColor: col,
        fillColor: col
    })); // data point
    board.update();
};
var removeSegment = function() {
    if (p.length > 4) {
        board.removeObject(p[p.length - 1]);
        board.removeObject(p[p.length - 2]);
        board.removeObject(p[p.length - 3]);
        p.splice(p.length - 3, 3);
    }
    board.update();
};
