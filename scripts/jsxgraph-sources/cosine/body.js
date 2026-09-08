// Glider on x-axis
var x = board.create('glider', [-9, 0, board.defaultAxes.x], {name:'x'});
var y = board.create('point', [() => x.X(), () => Math.cos(x.X())], {size:1, name:'', color:'green'});
var x1 = board.create('segment',  [x,y], {strokeColor:'red'});

var f = board.create('functiongraph', [(x) => Math.cos(x)]);

board.create('text',[
         () => x.X()+0.3,
         () => y.Y()*0.5,
         'cos'], {});

// Second board
