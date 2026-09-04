var k = board.create('slider', [[1, 8], [5, 8], [0, 2, 8]], {name: 'k'});
var len = board.create('slider', [[1, 7], [5, 7], [1, 2, 3.2]], {name: 'len'});

var c = board.create('curve', [
        (t) => k.Value() * JXG.Math.Numerics.I([0, t], (u) => Math.sin(u * u * 0.5)), // Curve x(t)
        (t) => k.Value() * JXG.Math.Numerics.I([0, t], (u) => Math.cos(u * u * 0.5)), // Curve y(t)
        () => -len.Value() * Math.PI, // Start
        () => len.Value() * Math.PI], // End
    {strokewidth: 1});

var p = board.create('glider', [1, 3, c], {name: ''});
var t = board.create('tangent', [p], {dash: 3, strokeWidth: 1, strokeColor: 'red'});
