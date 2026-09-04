var a = board.create('point', [-1.7, 0], { name: 'a' });
var b = board.create('point', [4, -3], { name: 'b' });
var c = board.create('point', [1, 4], { name: 'c' });

var s1 = board.create('segment', [c, a], { color: 'black' });
var s2 = board.create('segment', [c, b], { color: 'black' });
var s3 = board.create('line', [a, b], { color: 'black' });

var as = board.create('glider', [2, 1.8, s2], { name: "a'" })
var bs = board.create('glider', [-1, 1.5, s1], { name: "b'" })
var s4 = board.create('line', [as, bs], { color: 'black' });

var cs = board.create('glider', [-3, 3.3, s3], { name: "c'" });

var TV = function(p, q, t) {
    var v = p.Dist(t) / p.Dist(q);
    if (JXG.Math.Geometry.isSameDir(p.coords, q.coords, p.coords, t.coords)) {
        return v;
    } else {
        return -v;
    }
};

var txt = board.create('text', [-4.5, -4, function() {
    return "TV(a',c,b) * TV(b',a,c) * TV(c',b,a) = " + (TV(as, c, b) * TV(bs, a, c) * TV(cs, b, a)).toFixed(2);
}]);
