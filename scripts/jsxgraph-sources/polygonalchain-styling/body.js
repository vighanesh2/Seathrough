var pc = board.create('polygonalchain', [[-2, 2], [0, -3], [2, 1], [3, -1]], {
    borders: {strokeWidth: 3},
    vertices: {size: 2}
});

pc.borders[2].setAttribute({lastArrow: {type: 7}});
