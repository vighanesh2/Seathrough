// Slider
var s = board.create('slider', [[1,8],[5,8],[0,0,1]]);

// If s < 0.5: red and thick, else blue and thin
var g = board.create('functiongraph', [(x) => x*x], {
          strokeColor: () => (s.Value() < 0.5) ? 'red' : 'blue',
          strokeWidth: () => (s.Value() < 0.5) ? 4 : 1
});

// If s >= 0.5: red and thick, else blue and thin
var f = board.create('functiongraph', [(x) => x + 1], {
          strokeColor: () => (s.Value() >= 0.5) ? 'red' : 'blue',
          strokeWidth: () => (s.Value() >= 0.5) ? 4 : 1
});
