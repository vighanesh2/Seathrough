var a = board.create('slider', [[1,4], [4,4], [-5, 1, 5]], {name: 'a'});

var c = board.create('curve', [
    (t) => a.Value() * t,
    (t) => a.Value() / (t * t + 1)
], {strokeWidth: 3});
