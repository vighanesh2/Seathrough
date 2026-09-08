var o = board.create('point', [0, 0], { name: 'O' });
var c = board.create('circle', [o, 4], { name: 'C' });

var a = board.create('glider', [3, 0, c], { name: 'A' });
var b = board.create('glider', [-3, -3, c], { name: 'B', label: { offset: [-15, 0] } });
var p = board.create('point', [-1, 2], { name: 'P' });

var opts = { strokeColor: 'blue' };
var lab = board.create('segment', [a, b], opts);

var lpb = board.create('segment', [p, b], opts);
var lpa = board.create('segment', [a, p], opts);

var op = board.create('line', [o, p], { visible: false });

var pp = board.create('intersection', [c, op, 0], { name: 'P\'', label: { offset: [0, 15] } });
var opts = { strokeColor: 'green' };
var lppb = board.create('segment', [pp, b], opts);
var lppa = board.create('segment', [a, pp], opts);
var opts = { strokeColor: 'lightblue', strokeWidth: '1px' };
var lopp = board.create('segment', [o, pp], opts);

var angp = board.create('angle', [b, p, a]);
var angpp = board.create('angle', [b, pp, a]);

var label_p = board.create('smartlabel', [angp], {digits: 1, unit: '°', useMathJax: false});
