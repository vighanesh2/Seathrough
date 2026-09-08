;

board.options.point.showInfobox = false;
board.options.elements.highlight = false;

var points = [],
    t0x = -2, t0y = 3.5,
    t1x = 0, t1y = 3.5,
    t2x = 2, t2y = 3.5;

points.push(board.create('point', [-2, 3.5], {
    fixed: false,
    color: 'yellow',
    size: 6,
    name: '6 am'
}));
points.push(board.create('point', [0, 3.5], {
    fixed: false,
    color: 'yellow',
    size: 6,
    name: '12 pm'
}));
points.push(board.create('point', [2, 3.5], {
    fixed: false,
    color: 'yellow',
    size: 6,
    name: '6 pm'
}));

var fo = board.create('fo', [
    '<video width="100%" height="100%" src="https://benedu.net/moodle/aaimg/ajx_img/astro/tr/1vd.mp4" type="html5video" controls>',
    [-6, -4], // lower left corner
    [12, 8]   // width, height
], {
    layer: 0,
    fixed: true
});

var f = JXG.Math.Numerics.lagrangePolynomial(points);
var graph = board.create('functiongraph', [f, -10, 10], {
    fixed: true,
    strokeWidth: 3,
    layer: 8
});
