var p1 = board.create('point', [-3, -3], {
    name: '\\(p_1\\)'
});
var p2 = board.create('point', [0, 3], {
    name: '\\(p_2\\)'
});
var p3 = board.create('point', [3, -4], {
    name: '\\(p_3\\)'
});

var l1 = board.create('arrow', [p1, p2], {
    withLabel: true,
    name: '\\(\\vec{v}\\)',
    label: {
        position: 'bot',
        offset: [-25, 0]
    },
    lastArrow: {
        type: 4,
        size: 8
    }
});
var l2 = board.create('arrow', [p1, p3], {
    withLabel: true,
    name: '\\(\\vec{w}\\)',
    label: {
        position: 'top',
        offset: [25, -25]
    },
    lastArrow: {
        type: 4,
        size: 8
    }
});
var l3 = board.create('arrow', [p2, p3], {});

var m1 = board.create('midpoint', [p2, p3], {
    name: '\\(m_1\\)'
});
var m2 = board.create('midpoint', [p1, p3], {
    name: '\\(m_2\\)'
});
var m3 = board.create('midpoint', [p1, p2], {
    name: '\\(m_3\\)'
});

var s1 = board.create('segment', [p1, m1], {});
var s2 = board.create('segment', [p2, m2], {});
var s3 = board.create('segment', [p3, m3], {});

var s = board.create('intersection', [s1, s2], {
    name: '\\(s\\)'
});
