// Create circle through D with center M and to gliders A and B
var M = board.create('point', [0, 0], {
    name: 'M'
});
var C = board.create('point', [0, -1], {
    name: 'D'
});
var c = board.create('circle', [M, C], {
    strokeWidth: 1
});
var A = board.create('glider', [1, 0, c], {
    name: 'A'
});
var B = board.create('glider', [0, 1, c], {
    name: 'B'
});

// Determine two optimal control points
var k = function(M, A, B) {
    var ax = A.X() - M.X(),
        ay = A.Y() - M.Y(),
        bx = B.X() - M.X(),
        by = B.Y() - M.Y(),
        d, r;
    r = M.Dist(A);
    d = Math.sqrt((ax + bx) * (ax + bx) + (ay + by) * (ay + by));
    if (JXG.Math.Geometry.rad(A, M, B) > Math.PI) {
        d *= -1;
    }

    if (Math.abs(by - ay) > JXG.Math.eps) {
        return (ax + bx) * (r / d - 0.5) * 8.0 / 3.0 / (by - ay);
    } else {
        return (ay + by) * (r / d - 0.5) * 8.0 / 3.0 / (ax - bx);
    }
};

var P1 = board.create('point', [
    () => A.X() - k(M, A, B) * (A.Y() - M.Y()),
    () => A.Y() + k(M, A, B) * (A.X() - M.X())
], {
    color: 'blue'
});
var P2 = board.create('point', [
    () => B.X() + k(M, A, B) * (B.Y() - M.Y()),
    () => B.Y() - k(M, A, B) * (B.X() - M.X())
], {
    color: 'blue'
});

// Create the Bezier segment
var b = board.create('curve', JXG.Math.Numerics.bezier([A, P1, P2, B]), {
    strokecolor: 'black',
    strokeOpacity: 1,
    strokeWidth: 3
});

var l1 = board.create('segment', [A, P1], {
    dash: 2
});
var l2 = board.create('segment', [B, P2], {
    dash: 2
});
