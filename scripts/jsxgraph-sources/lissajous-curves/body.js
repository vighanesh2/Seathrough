board.suspendUpdate();
var a = board.create('slider', [[2, 8], [6, 8], [0, 3, 6]], { name: 'a' });
var b = board.create('slider', [[2, 7], [6, 7], [0, 2, 6]], { name: 'b' });
var A = board.create('slider', [[2, 6], [6, 6], [0, 3, 6]], { name: 'A' });
var B = board.create('slider', [[2, 5], [6, 5], [0, 3, 6]], { name: 'B' });
var delta = board.create('slider', [[2, 4], [6, 4], [0, 0, Math.PI]], { name: 'δ' });

var c = board.create('curve', [
          function(t) { return A.Value() * Math.sin(a.Value() * t + delta.Value()); },
          function(t) { return B.Value() * Math.sin(b.Value() * t); },
          0, 2 * Math.PI], { strokeColor: '#aa2233', strokeWidth: 3 });
board.unsuspendUpdate();
