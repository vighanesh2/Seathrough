// Curated JSXGraph construction — receives (JXG, board).
var center = board.create('point', [0, 0], {
  name: 'O',
  size: 3,
  fixed: true,
  strokeColor: '#1e3a5f',
  fillColor: '#1e3a5f'
});

var rim = board.create('point', [3, 0], {
  name: 'P',
  size: 4,
  strokeColor: '#1b6ca8',
  fillColor: '#1b6ca8'
});

var circle = board.create('circle', [center, rim], {
  strokeColor: '#1e3a5f',
  strokeWidth: 2.5,
  highlight: false
});

board.create('segment', [center, rim], {
  strokeColor: '#6a7d90',
  strokeWidth: 1.5,
  dash: 2,
  highlight: false
});

board.create('tangent', [rim, circle], {
  strokeColor: '#b8431e',
  strokeWidth: 2,
  highlight: false
});
