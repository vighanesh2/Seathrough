var curve1 = board.create('functiongraph', ['x^2-2'], {strokeColor: 'blue', fixed: false});
var curve2 = board.create('functiongraph', ['4/x', 0.001, 20], {strokeColor: 'black', fixed: false});

var clip_path = board.create('curveintersection', [curve1, curve2], {
    fillColor: 'yellow',
    fillOpacity: 0.3
});
