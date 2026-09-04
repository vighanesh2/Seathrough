// Create two circles
var p1 = board.create('point', [1, 1]);
var p2 = board.create('point', [3, 0]);
var c1 = board.create('circle', [p1, p2], {strokeWidth:1});

var p3 = board.create('point', [4, 1]);
var p4 = board.create('point', [2, 0]);
var c2 = board.create('circle', [p3, p4], {strokeWidth:1});

// Intersecting curve
var a = board.create('curveintersection', [c1, c2], {
    strokeColor: 'red', 
    strokeWidth:3, 
    fillColor: 'yellow',
    fillOpacity: 0.3,
    highlightFillColor: 'blue',
    highlightFillOpacity: 0.3,
    hasInnerPoints: true
});
