var a = board.create('slider', [[1, 9], [5, 9], [0, 1, 4]], {name: 'a'});

var c1 = board.create('curve', [
    (phi) => a.Value() * Math.sqrt(phi),
    [0, 0], 0, 8 * Math.PI
], {curveType: 'polar', strokewidth: 4});

var c2 = board.create('curve', [
    (phi) => -a.Value() * Math.sqrt(phi),
    [0, 0], 0, 8 * Math.PI
], {curveType: 'polar', strokewidth: 4});
