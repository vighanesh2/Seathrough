var a = board.create('slider', [[0, 5], [8, 5], [0, 4, 30]], {name: 'a'});

var c = board.create('curve', [(phi) => a.Value() / phi,
    [0, 0], 0, 8 * Math.PI
], {curveType: 'polar', strokewidth: 4});
