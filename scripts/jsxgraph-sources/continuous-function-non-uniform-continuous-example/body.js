var f = (x) => 1.0 / x;
 var graph = board.create('functiongraph', [f,0.00001, 15], {strokeColor:'#0000ff'});

 var s = board.create('slider', [[0,-1],[1.5,-1],[0,1,1]], {name:'&epsilon;'});

 var x1 = board.create('glider', [1/2, 0, board.defaultAxes.x], {name:'a'});

// Helper points on x-axis
 var y1 = board.create('point', [0, () => f(x1.X())], {size:2, face:'[]', name:'f(a)'});
 var y2 = board.create('point', [0, () => f(x1.X())-s.Value()], {size:2, face:'[]', name:' '});
 var y3 = board.create('point', [0, () => f(x1.X())+s.Value()], {size:2, face:'[]', name:' '});

//  Helper points on curve
 var z1 = board.create('point', [() => f(y1.Y()), () => y1.Y()], {size:2, face:'[]', name:' '});
 var z2 = board.create('point', [() => f(y2.Y()), () => y2.Y()], {size:2, face:'[]', name:' '});
 var z3 = board.create('point', [() => f(y3.Y()), () => y3.Y()], {size:2, face:'[]', name:' '});

// Horizontal helper lines
 var v1 = board.create('segment', [z1,y1], {strokeColor:'gray', dash:2, strokeWidth:1});
 var v2 = board.create('line', [z2,y2], {strokeColor:'gray', dash:2, strokeWidth:1});
 var v3 = board.create('line', [z3,y3], {strokeColor:'gray', dash:2, strokeWidth:1});

// Vertical helper lines
 var h1 = board.create('curve', [(t) => z1.X(), (t) => t, 0, 20], {strokeColor:'gray',dash:2,strokeWidth:1});
 var h2 = board.create('curve', [(t) => z2.X(), (t) => t, 0, 20], {strokeColor:'gray',dash:2,strokeWidth:1});
 var h3 = board.create('curve', [(t) => z3.X(), (t) => t, 0, 20], {strokeColor:'gray',dash:2,strokeWidth:1});

// Display maximum possible delta for given epsilon
 var txt = board.create('text', [1.2, 4.3, function() { 
            return '&delta; = ' + Math.min(z1.X() - z3.X(), z2.X() - z1.X()).toFixed(5); }]);
