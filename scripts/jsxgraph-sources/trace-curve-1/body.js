var A = board.create('point', [-1.5, -1.5]);
var B = board.create('point', [1.5, -1.5]);
var C0 = board.create('point', [1.5, 1.0], { visible: false });

var g = board.create('line', [A, B], { visible: false });
var h = board.create('parallel', [g, C0], { visible: true, strokeWidth: 1 });
var C = board.create('glider', [-1.5, 1.0, h], { name: 'C', size: 6 });
var p = board.create('polygon', [A, B, C]);

var s1 = board.create('perpendicular', [p.borders[0], C], { dash: 3, strokeWidth: 1 });
var s2 = board.create('perpendicular', [p.borders[1], A], { dash: 3, strokeWidth: 1 });
var s3 = board.create('perpendicular', [p.borders[2], B], { dash: 3, strokeWidth: 1 });

var S = board.create('intersection', [s1, s2, 0], { name: 'S', trace: true });
var curve = board.create('tracecurve', [C, S], { strokeColor: 'blue' });
