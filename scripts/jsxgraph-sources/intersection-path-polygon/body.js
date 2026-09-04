var curve1 = board.create('curve', [
    [-3, 3, 0, -3],
    [3, 3, 0, 3]
], {strokeColor: 'black', fillColor: 'none', fillOpacity: 0.8});

var curve2 = board.create('polygon', [
    [3, 4],
    [-4, 0],
    [-4, 4]
], {strokeColor: 'blue', fillColor: 'red', fillOpacity: 0.3});

var clip_path = board.create('curveintersection', [curve1, curve2], {
    strokeWidth: 3,
    fillColor: 'yellow',
    fillOpacity: 0.6
});
