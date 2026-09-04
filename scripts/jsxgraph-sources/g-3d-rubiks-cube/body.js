var view = board.create('view3d',
            [[-4, -3], [8, 8], // 2D box of view
            [[-5, 5], [-5, 5], [-5, 5]]], // 3D bounding cube
    {
        projection: 'parallel',
        depthOrder: {
            enabled: true
        },
        az: {
            keyboard: {
                enabled: true
            }
        },
        xPlaneRear: { visible: false },
        yPlaneRear: { visible: false },
        zPlaneRear: { visible: false },
        xAxis: { visible: false },
        yAxis: { visible: false },
        zAxis: { visible: false }
    });

var getPh = function(negnegCorner, colors) {
    let x = negnegCorner[0];
    let y = negnegCorner[1];
    let z = negnegCorner[2];
    return view.create('polyhedron3d', [
                [
                    [x, y, z],
                    [x, y, z + 2],
                    [x, y + 2, z],
                    [x, y + 2, z + 2],

                    [x + 2, y, z],
                    [x + 2, y, z + 2],
                    [x + 2, y + 2, z],
                    [x + 2, y + 2, z + 2]
                ],
                [
                    [[0, 2, 6, 4], { fillColor: colors[0], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }],
                    [[1, 3, 7, 5], { fillColor: colors[1], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }],
                    [[0, 1, 3, 2], { fillColor: colors[2], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }],
                    [[4, 5, 7, 6], { fillColor: colors[3], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }],
                    [[2, 3, 7, 6], { fillColor: colors[4], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }],
                    [[0, 1, 5, 4], { fillColor: colors[5], fillOpacity: 1, strokeWidth: 3, strokeColor: "black" }]
                ]
            ]);
}

var bk = "#000000", // black
    wh = "#ffffff", // white
    re = "#ff0000", // red
    or = "#ff8800", // orange
    ye = "#ffff00", // yellow
    gr = "#00ff00", // green
    bl = "#0000ff", // blue
    cubes = [
                [
                    [
                        getPh([-3, -3, 1], [bk, ye, or, bk, bk, bl]),
                        getPh([-3, -3, -1], [bk, bk, or, bk, bk, bl]),
                        getPh([-3, -3, -3], [wh, bk, or, bk, bk, bl])],
                    [
                        getPh([-3, -1, 1], [bk, ye, or, bk, bk, bk]),
                        getPh([-3, -1, -1], [bk, bk, or, bk, bk, bk]),
                        getPh([-3, -1, -3], [wh, bk, or, bk, bk, bk])],
                    [
                        getPh([-3, 1, 1], [bk, ye, or, bk, gr, bk]),
                        getPh([-3, 1, -1], [bk, bk, or, bk, gr, bk]),
                        getPh([-3, 1, -3], [wh, bk, or, bk, gr, bk])
                    ]
                ],
                [
                    [
                        getPh([-1, -3, 1], [bk, ye, bk, bk, bk, bl]),
                        getPh([-1, -3, -1], [bk, bk, bk, bk, bk, bl]),
                        getPh([-1, -3, -3], [wh, bk, bk, bk, bk, bl])
                    ],
                    [
                        getPh([-1, -1, 1], [bk, ye, bk, bk, bk, bk]),
                        getPh([-1, -1, -1], [bk, bk, bk, bk, bk, bk]),
                        getPh([-1, -1, -3], [wh, bk, bk, bk, bk, bk])
                    ],
                    [
                        getPh([-1, 1, 1], [bk, ye, bk, bk, gr, bk]),
                        getPh([-1, 1, -1], [bk, bk, bk, bk, gr, bk]),
                        getPh([-1, 1, -3], [wh, bk, bk, bk, gr, bk])
                    ]
                ],
                [
                    [
                        getPh([1, -3, 1], [bk, ye, bk, re, bk, bl]),
                        getPh([1, -3, -1], [bk, bk, bk, re, bk, bl]),
                        getPh([1, -3, -3], [wh, bk, bk, re, bk, bl])
                    ],
                    [
                        getPh([1, -1, 1], [bk, ye, bk, re, bk, bk]),
                        getPh([1, -1, -1], [bk, bk, bk, re, bk, bk]),
                        getPh([1, -1, -3], [wh, bk, bk, re, bk, bk])],
                    [
                        getPh([1, 1, 1], [bk, ye, bk, re, gr, bk]),
                        getPh([1, 1, -1], [bk, bk, bk, re, gr, bk]),
                        getPh([1, 1, -3], [wh, bk, bk, re, gr, bk])
                    ]
                ]
            ];

var doMove = async function(sp) {
    var delay = 1000;
    sp.setPosition(JXG.COORDS_BY_USER, [0, 0]);
    sp.moveTo([0.9, 0], delay, { effect: "<>" });
    return new Promise(resolve => {
        setTimeout(() => resolve("ende"), delay);
    });
};

var U = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateZ' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][ii][0].addTransform(cubes[i][ii][0], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[2][0][0];
    cubes[2][0][0] = cubes[2][2][0];
    cubes[2][2][0] = cubes[0][2][0];
    cubes[0][2][0] = stor;
    stor = cubes[0][1][0];
    cubes[0][1][0] = cubes[1][0][0];
    cubes[1][0][0] = cubes[2][1][0];
    cubes[2][1][0] = cubes[1][2][0];
    cubes[1][2][0] = stor;
}

var Us = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateZ' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][ii][0].addTransform(cubes[i][ii][0], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[0][2][0];
    cubes[0][2][0] = cubes[2][2][0];
    cubes[2][2][0] = cubes[2][0][0];
    cubes[2][0][0] = stor;
    stor = cubes[0][1][0];
    cubes[0][1][0] = cubes[1][2][0];
    cubes[1][2][0] = cubes[2][1][0];
    cubes[2][1][0] = cubes[1][0][0];
    cubes[1][0][0] = stor;
}

var D = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateZ' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][ii][2].addTransform(cubes[i][ii][2], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][2];
    cubes[0][0][2] = cubes[0][2][2];
    cubes[0][2][2] = cubes[2][2][2];
    cubes[2][2][2] = cubes[2][0][2];
    cubes[2][0][2] = stor;
    stor = cubes[0][1][2];
    cubes[0][1][2] = cubes[1][2][2];
    cubes[1][2][2] = cubes[2][1][2];
    cubes[2][1][2] = cubes[1][0][2];
    cubes[1][0][2] = stor;
}

var Ds = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateZ' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][ii][2].addTransform(cubes[i][ii][2], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][2];
    cubes[0][0][2] = cubes[2][0][2];
    cubes[2][0][2] = cubes[2][2][2];
    cubes[2][2][2] = cubes[0][2][2];
    cubes[0][2][2] = stor;
    stor = cubes[0][1][2];
    cubes[0][1][2] = cubes[1][0][2];
    cubes[1][0][2] = cubes[2][1][2];
    cubes[2][1][2] = cubes[1][2][2];
    cubes[1][2][2] = stor;
}

var R = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateY' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][2][ii].addTransform(cubes[i][2][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][2][0];
    cubes[0][2][0] = cubes[2][2][0];
    cubes[2][2][0] = cubes[2][2][2];
    cubes[2][2][2] = cubes[0][2][2];
    cubes[0][2][2] = stor;
    stor = cubes[0][2][1];
    cubes[0][2][1] = cubes[1][2][0];
    cubes[1][2][0] = cubes[2][2][1];
    cubes[2][2][1] = cubes[1][2][2];
    cubes[1][2][2] = stor;
}

var Rs = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateY' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][2][ii].addTransform(cubes[i][2][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][2][0];
    cubes[0][2][0] = cubes[0][2][2];
    cubes[0][2][2] = cubes[2][2][2];
    cubes[2][2][2] = cubes[2][2][0];
    cubes[2][2][0] = stor;
    stor = cubes[0][2][1];
    cubes[0][2][1] = cubes[1][2][2];
    cubes[1][2][2] = cubes[2][2][1];
    cubes[2][2][1] = cubes[1][2][0];
    cubes[1][2][0] = stor;
}

var L = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateY' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][0][ii].addTransform(cubes[i][0][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[0][0][2];
    cubes[0][0][2] = cubes[2][0][2];
    cubes[2][0][2] = cubes[2][0][0];
    cubes[2][0][0] = stor;
    stor = cubes[0][0][1];
    cubes[0][0][1] = cubes[1][0][2];
    cubes[1][0][2] = cubes[2][0][1];
    cubes[2][0][1] = cubes[1][0][0];
    cubes[1][0][0] = stor;
}

var Ls = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateY' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[i][0][ii].addTransform(cubes[i][0][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[2][0][0];
    cubes[2][0][0] = cubes[2][0][2];
    cubes[2][0][2] = cubes[0][0][2];
    cubes[0][0][2] = stor;
    stor = cubes[0][0][1];
    cubes[0][0][1] = cubes[1][0][0];
    cubes[1][0][0] = cubes[2][0][1];
    cubes[2][0][1] = cubes[1][0][2];
    cubes[1][0][2] = stor;
}

var F = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateX' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[2][i][ii].addTransform(cubes[2][i][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[2][0][0];
    cubes[2][0][0] = cubes[2][0][2];
    cubes[2][0][2] = cubes[2][2][2];
    cubes[2][2][2] = cubes[2][2][0];
    cubes[2][2][0] = stor;
    stor = cubes[2][1][0];
    cubes[2][1][0] = cubes[2][0][1];
    cubes[2][0][1] = cubes[2][1][2];
    cubes[2][1][2] = cubes[2][2][1];
    cubes[2][2][1] = stor;
}

var Fs = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateX' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[2][i][ii].addTransform(cubes[2][i][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[2][0][0];
    cubes[2][0][0] = cubes[2][2][0];
    cubes[2][2][0] = cubes[2][2][2];
    cubes[2][2][2] = cubes[2][0][2];
    cubes[2][0][2] = stor;
    stor = cubes[2][1][0];
    cubes[2][1][0] = cubes[2][2][1];
    cubes[2][2][1] = cubes[2][1][2];
    cubes[2][1][2] = cubes[2][0][1];
    cubes[2][0][1] = stor;
}

var B = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * 100 * Math.PI / 180], { type: 'rotateX' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[0][i][ii].addTransform(cubes[0][i][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[0][2][0];
    cubes[0][2][0] = cubes[0][2][2];
    cubes[0][2][2] = cubes[0][0][2];
    cubes[0][0][2] = stor;
    stor = cubes[0][1][0];
    cubes[0][1][0] = cubes[0][2][1];
    cubes[0][2][1] = cubes[0][1][2];
    cubes[0][1][2] = cubes[0][0][1];
    cubes[0][0][1] = stor;
}

var Bs = async function() {
    let sp = board.create('point', [0, 0], { visible: false });
    var t = view.create('transform3d', [() => sp.X() * -100 * Math.PI / 180], { type: 'rotateX' });
    for (var i = 0; i < cubes.length; i++) {
        for (var ii = 0; ii < cubes.length; ii++) {
            cubes[0][i][ii].addTransform(cubes[0][i][ii], t);
        }
    }
    await doMove(sp);
    var stor = cubes[0][0][0];
    cubes[0][0][0] = cubes[0][0][2];
    cubes[0][0][2] = cubes[0][2][2];
    cubes[0][2][2] = cubes[0][2][0];
    cubes[0][2][0] = stor;
    stor = cubes[0][1][0];
    cubes[0][1][0] = cubes[0][0][1];
    cubes[0][0][1] = cubes[0][1][2];
    cubes[0][1][2] = cubes[0][2][1];
    cubes[0][2][1] = stor;
}

var start_animation = function() {
    var moves = [R, R, L, L, F, F, B, B, U, U, D, D];
    // Old style:
    // for (var i = 0; i < moves.length; i++) {
    //   moves[i]();
    // }
    // New style:
    (async () => {
        for (const m of moves) {
            await m();
        }
    })();

};
