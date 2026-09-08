// Create 4 initial points
var p = [];
p[0] = board.create('point', [-1,2], {size: 4});
p[1] = board.create('point', [0,-1], {size: 4});
p[2] = board.create('point', [1,0], {size: 4});
p[3] = board.create('point', [2,1], {size: 4});

// Cubic spline 
var c = board.create('spline', p, {strokeWidth:3});

// Add tangent
var g = board.create('glider', [1.5, 0, c], {name:'', face:'<>', color: 'blue'});
var t = board.create('tangent', [g], {dash:2, strokeColor:'#aa0000'});
     
var addPoint = function() {
    p.push(board.create('point', [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 3], {size: 4}));
    board.update();
    board.update();
}
