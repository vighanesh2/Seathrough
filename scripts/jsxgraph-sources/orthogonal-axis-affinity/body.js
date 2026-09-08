var O = board.create('point', [0, 0], { name: 'O', fixed: true });
var k0 = board.create('circle', [O, 4], { fixed: true, strokeWidth: 0.8 });
var k1 = board.create('circle', [O, 2], { fixed: true, strokeWidth: 0.8 });

var B = board.create('glider', [2.65, 3, k0], { name: 'B' });
var li = board.create('line', [O, B], { straightFirst: false });
var g = board.create('parallel', [B, board.defaultAxes.x]);

var P = board.create('intersection', [li, k1, 0], { name: 'P', trace: true });
var gs = board.create('parallel', [P, board.defaultAxes.y]);
var X = board.create('intersection', [gs, board.defaultAxes.x, 0], { name: 'X' });
var Ps = board.create('intersection', [gs, g, 0], { name: "P'", trace: true, color: 'blue' });

var pol = board.create('polygon', [O, X, P, Ps, B], { fillColor: 'yellow' });
