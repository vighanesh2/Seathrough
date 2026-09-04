var O = board.create('point', [0,0], { name: 'O', fixed: true, fillColor: 'blue', strokeColor: 'blue', showClearTraces: true});
var A = board.create('point', [2,0], { name: 'A' });
var k = board.create('circle', [O, A], { name: 'k' });
var B = board.create('glider', [0.7,1,k], { name: 'B drag me' });
var g1 = board.create('line', [O, B], { strokeColor: 'lightgray' });
var C = board.create('reflection', [A, g1], { name: 'C', fillColor: 'blue', strokeColor: 'blue' });

var M = board.create('glider', [2,2,g1], { name: 'M', fillColor: 'red', strokeColor: 'red' });
var k2 = board.create('circle', [M, B], { name: 'k' });  

var gpar = board.create('parallel', [O, C, M], { name: "g", strokeColor: 'lightgray' });
var Cprime = board.create('intersection', [gpar, k2, 0], { name: "C'", fillColor: 'blue', strokeColor: 'blue' });

var g2 = board.create('line', [M, Cprime], { strokeColor: 'lightgray' });
var Cstern = board.create('glider', [1,1,g2], { name: "C*", trace: true, fillColor: 'green', strokeColor: 'green' });
