var alpha = board.create('slider', [[-7, -6], [2, -6], [0, 0, 0.5 * Math.PI]], { name: '&alpha;' });

var bound = [-5, 5];
var view = board.create('view3d',
            [[-6, -2], [8, 8],
            [bound, bound, bound]],
    {
        axesPosition: 'none',
        projection: 'central',
        depthOrder: {
            enabled: true
        },
        az: {
            keyboard: {
                enabled: true
            }
        },
        xPlaneRear: { visible: false },
        yPlaneRear: { visible: false }
    });

var attr = {
    withLabel: false,
    visible: false
};
var r = 2;
var p = [
            view.create('point3d', [-r, -r, -r], attr),
            view.create('point3d', [r, -r, -r], attr),
            view.create('point3d', [r, r, -r], attr),
            view.create('point3d', [-r, r, -r], attr),

            view.create('point3d', [-r, -r, r], attr),
            view.create('point3d', [r, -r, r], attr),
            view.create('point3d', [-r, -r, r], attr),
            view.create('point3d', [r, -r, r], attr),

            view.create('point3d', [r, r, r], attr),
            view.create('point3d', [-r, r, r], attr),
            view.create('point3d', [r, r, r], attr),
            view.create('point3d', [-r, r, r], attr),
            view.create('point3d', [r, r, r], attr),
            view.create('point3d', [-r, r, r], attr),
        ]

var cube = view.create('polyhedron3d', [
    {
        a: p[0],
        b: p[1],
        c: p[2],
        d: p[3],
        e: p[4],
        f: p[5],
        e2: p[6],
        f2: p[7],
        g: p[8],
        h: p[9],
        g2: p[10],
        h2: p[11],
        g3: p[12],
        h3: p[13]
    },
           [
                ['a', 'b', 'c', 'd'], // white
                ['a', 'b', 'f', 'e'], // blue
                ['b', 'c', 'g2', 'f2'], // red
                ['c', 'd', 'h', 'g'], // green
                ['d', 'a', 'e2', 'h2'], // orange
                ['e', 'f', 'g3', 'h3'] // yellow
            ]
        ], {
    fillColorArray: ['white', 'blue', 'red', 'green', 'orange', 'yellow'],
    fillOpacity: 0.9
});

// blue
var t4 = view.create('transform3d', [() => alpha.Value(), [1, 0, 0], () => p[0].coords], { type: 'rotate' });
var t5 = view.create('transform3d', [() => alpha.Value(), [1, 0, 0], p[1]], { type: 'rotate' });
p[4].addTransform(p[4], [t4]);
p[5].addTransform(p[5], [t5]);

// yellow
var t12 = view.create('transform3d', [() => alpha.Value(), [1, 0, 0], p[4]], { type: 'rotate' });
var t13 = view.create('transform3d', [() => alpha.Value(), [1, 0, 0], p[5]], { type: 'rotate' });
p[12].addTransform(p[12], [t4, t12]);
p[13].addTransform(p[13], [t5, t13]);

// red
var t7 = view.create('transform3d', [() => alpha.Value(), [0, 1, 0], p[1]], { type: 'rotate' });
var t10 = view.create('transform3d', [() => alpha.Value(), [0, 1, 0], p[2]], { type: 'rotate' });
p[7].addTransform(p[7], [t7]);
p[10].addTransform(p[10], [t10]);

// green
var t8 = view.create('transform3d', [() => -alpha.Value(), [1, 0, 0], p[2]], { type: 'rotate' });
var t9 = view.create('transform3d', [() => -alpha.Value(), [1, 0, 0], p[3]], { type: 'rotate' });
p[8].addTransform(p[8], [t8]);
p[9].addTransform(p[9], [t9]);

// orange
var t6 = view.create('transform3d', [() => -alpha.Value(), [0, 1, 0], p[0]], { type: 'rotate' });
var t11 = view.create('transform3d', [() => -alpha.Value(), [0, 1, 0], p[3]], { type: 'rotate' });
p[6].addTransform(p[6], [t6]);
p[11].addTransform(p[11], [t11]);
