// Set some point attributes.
board.options.point.strokeColor = 'red';
board.options.point.fillColor = 'red';
board.options.point.strokeOpacity = 0.8;
board.options.point.fillOpacity = 0.8;

var m = board.create('point', [0.5, 0.3]);
var b = board.create('point', [3, 0]);
var c = board.create('circle', [m, b]);

var p = board.create('point', [-4, 2], {name: 'p', label: {autoPosition: true}});

// If p is not on c, the tangent is the polar.
var t = board.create('tangent', [c, p], { name: 'polar', withLabel: true, label: {position: '0.7 left', distance: 0.5} });

var i1 = board.create('intersection', [c, t, 0], { visible: false });
var i2 = board.create('intersection', [c, t, 1], { visible: false });
var t1 = board.create('tangent', [c, i1]);
var t2 = board.create('tangent', [c, i2]);
