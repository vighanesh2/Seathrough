// Curated JSXGraph construction — receives (JXG, board).
var a = board.create('point', [-2, -1], {
  name: 'A',
  size: 4,
  strokeColor: '#1b6ca8',
  fillColor: '#1b6ca8'
});

var b = board.create('point', [3, 2], {
  name: 'B',
  size: 4,
  strokeColor: '#1b6ca8',
  fillColor: '#1b6ca8'
});

board.create('line', [a, b], {
  strokeColor: '#1e3a5f',
  strokeWidth: 2.5,
  highlight: false
});

board.create('text', [
  -7.5,
  7.2,
  function () {
    var dx = b.X() - a.X();
    var dy = b.Y() - a.Y();
    if (Math.abs(dx) < 1e-8) return 'slope m = undefined (vertical)';
    var m = dy / dx;
    return 'slope m = ' + (Math.round(m * 100) / 100);
  }
], {
  fontSize: 14,
  fixed: true,
  highlight: false,
  strokeColor: '#1e3a5f'
});
