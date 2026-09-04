var b = board.create('slider', [[-14, 8], [-4, 8], [-10, 2.10, 10]], {name: 'a', point1: {frozen: true}, point2: {frozen: true}});
var a = board.create('slider', [[-14, 7], [-4, 7], [-10, -9.52, 10]], {name: 'b', point1: {frozen: true}, point2: {frozen: true}});

var c = board.create('implicitcurve', [
    (x, y) => -(y**2) + x**3 + a.Value() * x + b.Value() 
], { 
  strokeWidth: 3, strokeColor: JXG.palette.red
});
