var p = [],
    col = 'red';

// Create initial 7 points
p.push(board.create('point', [2, 1], {color: col}));
p.push(board.create('point', [0.75, 2.5], {color: col}));
p.push(board.create('point', [-0.3, 0.3], {color: col}));
p.push(board.create('point', [-3, 1], {color: col}));
p.push(board.create('point', [-0.75, -2.5], {color: col}));
p.push(board.create('point', [1.5, -2.8], {color: col}));
p.push(board.create('point', [2, -0.5], {color: col}));

// Create B-spline curve
var c = board.create('curve', JXG.Math.Numerics.bspline(p, 4), {
    strokecolor: 'blue', strokeOpacity: 0.6, strokeWidth: 5});

var addSegment = function() {
    p.push(board.create('point', [Math.random() * 8 - 4, Math.random() * 8 - 4], {
        strokeColor: col,
        fillColor: col
    }));
    board.update();
};

var removeSegment = function() {
    if (p.length > 2) {
        board.removeObject(p[p.length - 1]); // remove the last point from the list of objects
        p.splice(p.length - 1, 1); // remove the last point from the point array.
        board.update();
    }
};
