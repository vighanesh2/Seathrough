var k = board.create('slider', [[1, 3], [3, 3], [0, 1, 4]]);
var c = board.create('curve', [function(phi) { return Math.sqrt(k.Value() / phi); }, [0, 0], 0, 8 * Math.PI],
                       { curveType: 'polar', strokewidth: 1 });
