var A = board.create('point',[-1,1]);
var B = board.create('point',[1,1]);
var line = board.create('line',[A,B]);
var C = board.create('point',[0,-1]);
var par = board.create('parabola',[C,line]);
