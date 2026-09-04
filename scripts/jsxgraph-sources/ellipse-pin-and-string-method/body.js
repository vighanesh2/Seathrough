var f1 = board.create('glider', [-2, 0, board.defaultAxes.x], {name:"f'"});
var f2 = board.create('glider', [2,  0, board.defaultAxes.x], {name:"f"});
var ell = board.create('ellipse', [f1, f2, [0,3]]);

var P = board.create('glider', [-1, 2, ell], {name: 'p'}); 
var s1 = board.create('segment', [f1,P]);
var s2 = board.create('segment', [f2,P]);

var txt = board.create('text', [0.2, 4, 
    () => "|pf| + |pf'| = " + P.Dist(f1).toFixed(2) + ' + ' +  P.Dist(f2).toFixed(2) + ' = ' + (P.Dist(f1) + P.Dist(f2)).toFixed(2)
]);
