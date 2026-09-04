var a = board.create('slider', [[-5, -2], [5, -2], [-5, 1, 5]], { name: 'a', snapWidth: 0.1 });
  var b = board.create('slider', [[-5, -3], [5, -3], [-5, 0, 5]], { name: 'b', snapWidth: 0.1 });
  var c = board.create('slider', [[-5, -4], [5, -4], [-5, 0, 5]], { name: 'c', snapWidth: 0.1 });
  var d = board.create('slider', [[-5, -5], [5, -5], [-5, 1, 5]], { name: 'd', snapWidth: 0.1 });

  var v = board.create('point', [2, 2], { size: 3, name: 'v' });
  var w = board.create('point', [-2, 1], { size: 3, name: 'w' });
  var va = board.create('arrow', [[0, 0], v]);
  var wa = board.create('arrow', [[0, 0], w]);
