var a = board.create('point', [-4, 0], {
    name: 'a'
});
var b = board.create('point', [4, -3], {
    name: 'b'
});
var c = board.create('point', [1, 4], {
    name: 'c'
});

var s1 = board.create('segment', [a, b], {
    color: 'black'
});
var s2 = board.create('segment', [a, c], {
    color: 'black'
});
var s3 = board.create('segment', [c, b], {
    color: 'black'
});

var as = board.create('glider', [3, 0, s3], {
    name: "a'"
});
var bs = board.create('glider', [4, -3, s2], {
    name: "b'"
});
var cs = board.create('glider', [1, 4, s1], {
    name: "c'"
});

var s4 = board.create('segment', [a, as], {
    color: 'black'
});
var s5 = board.create('segment', [b, bs], {
    color: 'black'
});
var s6 = board.create('segment', [c, cs], {
    color: 'black'
});

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
