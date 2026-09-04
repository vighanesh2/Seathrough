// Vertices of the polygon
 var a = board.create('point', [-2, 1]);
 var b = board.create('point', [-4, -5]);
 var c = board.create('point', [3, -6]);
 var d = board.create('point', [2, 3]);

// Polygon
 var p = board.create('polygon', [a, b, c, d], {hasInnerPoints: true});
