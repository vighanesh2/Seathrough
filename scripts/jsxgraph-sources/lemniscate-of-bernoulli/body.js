var a = board.create('slider', [[1,4], [4,4], [0, 1, 8]], {name: 'a'});

var c = board.create('curve', [
    (t) => a.Value() * Math.cos(t) / (1 + Math.sin(t)**2),
    (t) => a.Value() * Math.sin(t) * Math.cos(t) / (1 + Math.sin(t)**2)
], {strokeWidth: 3});
