// Create three circles
var p1 = board.create('point', [1, 1]);
var p2 = board.create('point', [3, 0]);
var c1 = board.create('circle', [p1, p2], {strokeWidth:2});
 
var p3 = board.create('point', [4, 1]);
var p4 = board.create('point', [2, 0]);
var c2 = board.create('circle', [p3, p4], {strokeWidth:2});
 
var p5 = board.create('point', [2.5, 4.5]);
var p6 = board.create('point', [-0.5, 4.5]);
var c3 = board.create('circle', [p5, p6], {strokeWidth:2});

// The curve a1 is the intersection of c1 and c2
var a1 = board.create('curveintersection', [c1, c2], {visible: false});

// Intersect a1 and c2
var a2 = board.create('curveintersection', [a1, c3], {
    strokeColor: 'red', 
    strokeWidth: 4, 
    fillColor: 'yellow',
    fillOpacity: 0.3,
    highlightFillColor: 'blue',
    highlightFillOpacity: 0.3,
    hasInnerPoints: true
});
