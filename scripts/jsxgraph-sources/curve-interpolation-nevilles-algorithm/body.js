// Create initial points
var p = [];
p[0] = board.create('point', [-1, 2], {size:4});
p[1] = board.create('point', [3, -1], {size:4});
p[2] = board.create('point', [2, 1], {size:4});

// Create interpolation curve
var graph = board.create('curve', JXG.Math.Numerics.Neville(p), {strokeWidth:5, strokeOpacity:0.5});

// Add tangent
var g = board.create('glider', [graph], {color: 'blue'});
var t = board.create('tangent', [g], {dash:1, strokeColor:'green'});

// Add point at random position
var addPoint = function () {
    p.push(board.create('point', [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 3], {size:4}));
    board.update();
};
