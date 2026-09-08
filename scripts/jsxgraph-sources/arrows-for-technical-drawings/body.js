var l = 5,
        insetRatio,
        tipAngle,
        wingCurve,
        tailCurve;

    insetRatio = board.create('slider', [[-6, 5.5], [0, 5.5], [0, 1, 2]], {name: 'inset ratio', snapWidth: 0.1});
    tipAngle = board.create('slider',   [[-6, 5],   [0, 5],   [0, 30, 90]], {name: 'tip angle', snapWidth: 1});
    wingCurve = board.create('slider',  [[-6, 4.5], [0, 4.5], [0, 0, 30]], {name: 'wing curve', snapWidth: 1});
    tailCurve = board.create('slider',  [[-6, 4],   [0, 4],   [0, 0, 40]], {name: 'tail curve', snapWidth: 1});

    var arrowhead = board.create('curve', [[], []], {strokeColor: 'blue', strokeOpacity: 0.4,
        fillColor: 'blue', fillOpacity: 0.4, strokeWidth: 10, lineCap: 'square'});

    arrowhead.updateDataArray = function() {
        var p = [],
            p2, f,
            ang, res,
            ang1, ang2,
            arr = [], arr2 = [],
            controls,
            ir = insetRatio.Value(),
            ta = tipAngle.Value(),
            wc = wingCurve.Value(),
            tc = tailCurve.Value();

        p.push([0, 0]);
        ang = 0.5 * ta * Math.PI / 180;
        p.push([-l / ir, l * Math.sin(ang) / Math.cos(ang)]);
        p.push([-l, 0]);
        p.push([p[1][0], -p[1][1]]);

        ang1 = Math.atan2(p[2][1] - p[1][1], p[2][0] - p[1][0]) * 180 / Math.PI + tc;
        if (tc === 0) {
            ang2 = [ang1, 180 - ang1];
        } else {
            ang2 = -90;
        }
        controls = {
            tension: 1,
            0: {direction: [0.5 * ta - wc, 180 - 0.5 * ta + wc]},
            1: {direction: [180 - 0.5 * ta - wc, ang1]},
            2: {direction: ang2},
            3: {direction: [180 - ang1, 0.5 * ta + wc]},
            isClosed: true
        };

        res = JXG.Math.Metapost.curve(p, controls);
        this.bezierDegree = 3;
        this.dataX = res[0];
        this.dataY = res[1];

        f = 10 / (p[0][0] - p[1][0]);
        p2 = p.map( z => [f * (z[0] - p[3][0]), f * (z[1] - p[3][1])] );
        res = JXG.Math.Metapost.curve(p2, controls);
        arr = res[0].map( (x, i) => [x.toFixed(2) + ',' + res[1][i].toFixed(2)] );
        arr2 = res[0].map( (x, i) => [(10-x).toFixed(2) + ',' + res[1][i].toFixed(2)] );

        document.getElementById('output').value =
            'insetRatio:' + ir + ' ' +
            'tipAngle:' + ta + ' ' +
            'wingCurve:' + wc + ' ' +
            'tailCurve:' + tc + '\n\n' +
            arr.join(' C ') + '\n\n' +
            arr2.join(' C ');
    };

    var li = board.create('segment', [[-10, 0], [0,0]], {strokeWidth: 10, strokeOpacity: 0.4});
    board.update();
