,
    bottom = board.create('image', ['https://jsxgraph.uni-bayreuth.de/wiki/images/1/13/Cannon_bottom.png', [0, 0.3],
        [2, 1]
    ], {
        layer: 1, fixed: true
    }),
    muzzle = board.create('image', ['https://jsxgraph.uni-bayreuth.de/wiki/images/e/e4/Cannon_muzzle.png', [0, 1.05],
        [3, 0.75]
    ], {
        layer: 0, fixed: true
    }),
    shootButton,
    resetButton,
    rot, rp, cp, cc, cannonball, cbanim, solution, velocity,

    animTime = function() {
        return 3000;
    },

    fAngle = function() {
        return Math.atan2(cp.Y() - rp.Y(), cp.X() - rp.X());
    },

    fSolution = function(x) {
        var b = fAngle(),
            g = 9.81 / 2;

        return Math.tan(b) * (x - cannonball.X()) - g * (Math.pow((x - cannonball.X()) / (velocity.Value() * Math.cos(b)), 2)) + cannonball.Y();
    },

    fAnim = function(t) {
        var i = Math.floor(solution.points.length * t / animTime()) /*3 + 17*t/animTime()*/ ,
            s = NaN;

        if (JXG.exists(solution.points[i]) && solution.points[i].usrCoords[2] > 0) {
            s = solution.points[i].usrCoords.slice(1);
        }

        return s;
    },

    shoot = function() {
        cannonball.setAttribute({
            visible: false
        });
        cbanim.setAttribute({
            visible: true
        });
        cbanim.moveTo([cannonball.X(), cannonball.Y()]);
        cbanim.moveAlong(fAnim, animTime(), {
            callback: function() {
                // this is executed when the animation is finished
            }
        });
    },
    resetFunc = function() {
        board.stopAllAnimation();
        cbanim.setAttribute({
            visible: false
        });
        cannonball.setAttribute({
            visible: true
        });
    };

board.options.animationDelay = 50;

velocity = board.create('slider', [
    [1, 9.5],
    [6, 9.5],
    [0, 5, 15]
], {
    name: 'Velocity'
});

cp = board.create('point', [1.4, 1.4], {
    fixed: true,
    visible: false
});
cc = board.create('circle', [cp, 1.25], {
    visible: false
});
rp = board.create('glider', [0, 1.4, cc], {
    withLabel: false,
    showInfobox: false,
    color: 'black'
});

rot = board.create('transform', [fAngle, cp], {
    type: 'rotate'
});
rot.bindTo(muzzle);

cannonball = board.create('point', [3, 1.4], {
    size: 8,
    strokeColor: 'black',
    fillColor: 'gray',
    withLabel: false,
    fixed: true
});
cbanim = board.create('point', [3, 1.4], {
    size: 8,
    strokeColor: 'black',
    fillColor: 'gray',
    withLabel: false,
    fixed: true,
    visible: false
});
rot.bindTo(cannonball);
solution = board.create('plot', [fSolution, function() {
    return cannonball.X();
}, 20], {
    visible: true,
    doAdvancedPlot: false
});

board.create('text', [1, 7, () => 'angle = ' + (180 * fAngle() / Math.PI).toFixed(1) + '°'], {fontSize: 20});
shootButton = board.create('button', [10, 9.5, 'Shoot', shoot]);
resetButton = board.create('button', [12, 9.5, 'Reset', resetFunc]);
