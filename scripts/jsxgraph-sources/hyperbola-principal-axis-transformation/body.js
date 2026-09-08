const sq5 = Math.sqrt(5);

// Start with the Euclidean normal form of the quadric,
// because we easily can read off the focal points.
var f1 = board.create('point', [0, -sq5], {name:"f'", fixed: true});
var f2 = board.create('point', [0, sq5], {name:"f", fixed: true});
var p  = board.create('point', [2, Math.sqrt(2)], {name:"p", fixed: true});

var o = board.create('point', [0, 0], {withLabel:false, color: 'blue', fixed: true, trace:true});
var e1 = board.create('point', [1, 0], {withLabel:false, color: 'blue', fixed: true});
var e2 = board.create('point', [0, 1], {withLabel:false, color: 'blue', fixed: true});

// Undo the principal axis transformation to recompute the original form of the quadric
var phi0 = board.create('transform', [-Math.PI * 0.25], {type: 'rotate'});
var t0 = board.create('transform', [-2, 1], {type: 'translate'});
t0.bindTo([f1, f2, p, o, e1, e2]);
phi0.bindTo([f1, f2, p, o, e1, e2]);

var hyp = board.create('hyperbola', [f1, f2, p]);

// Create transformed axes
var ax_z1 = board.create('line', [o, e1], {lastArrow: true, strokeColor:'black'});
var ax_z2 = board.create('line', [o, e2], {lastArrow: true, strokeColor:'black'});
board.update();

// Visualization of the principal axis transformation
var alpha = board.create('slider', [[1,4], [3,4], [0, 0, 45]], {name:'α', unitLabel:'°'});
var f = board.create('slider', [[1,3.5], [3,3.5], [0, 0, 1]], {name:'f'});

var phi = board.create('transform', [function(){ return alpha.Value() * Math.PI / 180; }], {type: 'rotate'});
var t = board.create('transform', [function(){ return 2*f.Value(); }, function(){ return -f.Value(); }], {type: 'translate'});

phi.bindTo([f1, f2, p, e1, e2, o]);
t.bindTo([f1, f2, p, e1, e2, o]);
