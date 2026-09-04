var p = [];
p.push(board.create('point', [0, -5]));
p.push(board.create('point', [-5, 0]));
p.push(board.create('point', [-3, 3]));

// Ellipse
var curve1 = board.create('ellipse', p, {strokeColor: 'black'});

// Rose
var curve2 = board.create('curve', [(phi) => 4 * Math.cos(2 * phi), [0, 0], 0, 2 * Math.PI], {
    curveType: 'polar', 
    strokeColor: 'blue', 
    strokewidth: 1
});

// Intersection
var clip_path = board.create('curveintersection', [curve1, curve2], {
    strokeWidth: 3,
    fillColor: 'yellow',
    fillOpacity: 0.3
});
