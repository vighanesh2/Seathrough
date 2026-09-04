// JSXGraph 3D view

let view = initBoard3D(board);

// JSXGraph construction

let a = board.create('slider', [[9, -5], [9, -1.5], [-3, 1, 3]], { name: 'a', ...(sliderAttr()), ...(elAttr()) });
let b = board.create('slider', [[9, 1.5], [9, 5], [-3, 0, 3]], { name: 'b', ...(sliderAttr()), ...(elAttr()) });

let F = (x, y) => 0.2 * x * x * Math.sin(y) * a.Value() + b.Value();
let fg = view.create('functiongraph3d', [ F, [-Math.PI, Math.PI], [-Math.PI, Math.PI]], { strokeWidth: 1, strokeOpacity: 0.75, stepsU: 50, stepsV: 50 });

// Controls

function initBoard3D(b) {
    let sliderA = sliderAttr();

    let elA = elAttr();

    let v = b.create('view3d', [[-5, -4], [10, 10], [[input['coordinates']['-x'], input['coordinates']['+x']], [input['coordinates']['-y'], input['coordinates']['+y']], [input['coordinates']['-z'], input['coordinates']['+z']]]],
        {
            projection: input['view']['projection'],
            trackball: { enabled: input['view']['trackball'] },

            // Main axes
            axesPosition: input['axis']['position'],
            xAxis: {visible: input['axis']['x'], strokeColor: '#888888', strokeWidth: 2},
            yAxis: {visible: input['axis']['y'], strokeColor: '#888888', strokeWidth: 2},
            zAxis: {visible: input['axis']['z'], strokeColor: '#888888', strokeWidth: 2},

            // Planes
            xPlaneRear: {
                visible: input['planeRear']['x'] | input['planeRear']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeRear']['border'],
                mesh3d: {visible: input['planeRear']['x'] & input['planeRear']['mesh']},
                fillColor: input['planeRear']['x'] ? input['planeRear']['color'] : 'none'
            },
            yPlaneRear: {
                visible: input['planeRear']['y'] | input['planeRear']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeRear']['border'],
                mesh3d: {visible: input['planeRear']['y'] & input['planeRear']['mesh']},
                fillColor: input['planeRear']['y'] ? input['planeRear']['color'] : 'none'
            },
            zPlaneRear: {
                visible: input['planeRear']['z'] | input['planeRear']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeRear']['border'],
                mesh3d: {visible: input['planeRear']['z'] & input['planeRear']['mesh']},
                fillColor: input['planeRear']['z'] ? input['planeRear']['color'] : 'none'
            },
            xPlaneFront: {
                visible: input['planeFront']['x'] | input['planeFront']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeFront']['border'],
                mesh3d: {visible: input['planeFront']['x'] & input['planeFront']['mesh']},
                fillColor: input['planeFront']['x'] ? input['planeFront']['color'] : 'none'
            },
            yPlaneFront: {
                visible: input['planeFront']['y'] | input['planeFront']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeFront']['border'],
                mesh3d: {visible: input['planeFront']['y'] & input['planeFront']['mesh']},
                fillColor: input['planeFront']['y'] ? input['planeFront']['color'] : 'none'
            },
            zPlaneFront: {
                visible: input['planeFront']['z'] | input['planeFront']['border'],
                strokeColor: '#dddddd',
                strokeWidth: input['planeFront']['border'],
                mesh3d: {visible: input['planeFront']['z'] & input['planeFront']['mesh']},
                fillColor: input['planeFront']['z'] ? input['planeFront']['color'] : 'none'
            },

            // Axes on planes
            xPlaneRearYAxis: {visible: input['planeRear']['x'] & input['planeRear']['axis']},
            xPlaneRearZAxis: {visible: input['planeRear']['x'] & input['planeRear']['axis']},
            yPlaneRearXAxis: {visible: input['planeRear']['y'] & input['planeRear']['axis']},
            yPlaneRearZAxis: {visible: input['planeRear']['y'] & input['planeRear']['axis']},
            zPlaneRearXAxis: {visible: input['planeRear']['z'] & input['planeRear']['axis']},
            zPlaneRearYAxis: {visible: input['planeRear']['z'] & input['planeRear']['axis']},
            xPlaneFrontYAxis: {visible: input['planeFront']['x'] & input['planeFront']['axis']},
            xPlaneFrontZAxis: {visible: input['planeFront']['x'] & input['planeFront']['axis']},
            yPlaneFrontXAxis: {visible: input['planeFront']['y'] & input['planeFront']['axis']},
            yPlaneFrontZAxis: {visible: input['planeFront']['y'] & input['planeFront']['axis']},
            zPlaneFrontXAxis: {visible: input['planeFront']['z'] & input['planeFront']['axis']},
            zPlaneFrontYAxis: {visible: input['planeFront']['z'] & input['planeFront']['axis']},

            // Controls
            bank: {
                slider: {...sliderA, ...{visible: input['view']['controls']}}
            },
            az: {
                slider: {...sliderA, ...{visible: input['view']['controls']}}
            },
            el: {
                slider: {...sliderA, ...elA, ...{visible: input['view']['controls']}}
            }
        }
    );

    v.el_slide.point1.setPosition(JXG.COORDS_BY_USER, [-9.5, -5]);
    v.el_slide.point2.setPosition(JXG.COORDS_BY_USER, [-9.5, 5]);
    v.el_slide.setMin(-Math.PI);
    v.el_slide.setMax(Math.PI);
    v.el_slide.setAttribute({ snapValues: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI].concat(input['view']['elevation']) });
    v.el_slide.name = 'EL';

    v.az_slide.point1.setPosition(JXG.COORDS_BY_USER, [-5, -9.5]);
    v.az_slide.point2.setPosition(JXG.COORDS_BY_USER, [5, -9.5]);
    v.az_slide.setMin(0);
    v.az_slide.setMax(Math.PI * 2);
    v.az_slide.setAttribute({ snapValues: [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2].concat(input['view']['azimuth']) });
    v.az_slide.name = 'AZ';

    v.bank_slide.point1.setPosition(JXG.COORDS_BY_USER, [-5, 9.5]);
    v.bank_slide.point2.setPosition(JXG.COORDS_BY_USER, [5, 9.5]);
    v.bank_slide.setAttribute({ snapValues: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI] });
    v.bank_slide.name = 'BK';

    v.setView(input['view']['azimuth'], input['view']['elevation'], 0);

    return v;
}

function boardAttr() {
    let bA = {
        boundingbox: [-10, 10, 10, -10],
        keepaspectratio: true,
        axis: false,
        showcopyright: false,
        shownavigation: false,
        movetarget: null,
        pan: {
            enabled: false
        },
        browserpan: false,
        zoom: {
            enabled: false,
        }
    };
    return bA;
}
function sliderAttr() {
    let slA = {
        baseline: {
            highlight: false,
            strokeWidth: 16,
            lineCap: 'round',
            strokeColor: '#f3f3f3'
        },
        point1: {frozen: false, fixed: true},
        point2: {frozen: false, fixed: true},
        drawLabel: true,
        face: 'o',
        fillColor: '#aaaaaa',
        highlightFillColor: '#aaaaaa',
        highlightStrokeColor: '#aaaaaa',
        highlightStrokeWidth: 5,
        highline: {
            highlight: false,
            strokeWidth: 16,
            lineCap: 'round',
            strokeColor: '#dddddd'
        },
        label: {
            strokeColor: '#aaaaaa',
            anchorX: 'left',
            anchorY: 'middle',
            layer: 0,
            cssStyle: 'border: 0px solid red; padding: 1px 8px 1px 8px; border-radius: 20px;background-color: #f2f2f2',
        },
        size: 7,
        snapValueDistance: 0.1,
        snapWidth: 0.001,
        strokeColor: '#009900',
        strokeWidth: 0,
        ticks: {
            layer: 7,
            digits: 2,
            maxLabelLength: 2,
            majorHeight: 0,
            majorTickEndings: [1, 1],
            strokeWidth: 4,
            strokeColor: '#cccccc'
        },
        visible: true
    };
    return slA;
}
function elAttr() {
    let elA = {
        label: {
            //display: 'internal',
            rotate: 90,
            strokeColor: '#aaaaaa',
            anchorX: 'left',
            anchorY: 'middle',
            layer: 0,
            cssStyle: 'border: 0px solid red; margin-top: -15px; padding: 1px 8px 1px 8px; border-radius: 20px;background-color: #f2f2f2; white-space: nowrap;'
        }
    }
    return elA;
}

// output data for LMS, additional binding to LMS necessary

let output = function () {
    let out = [];
    out.push(JXG.evaluate(() => { return view.az_slide.Value(); }));
    out.push(JXG.evaluate(() => { return view.el_slide.Value(); }));
    out.push(JXG.evaluate(() => { return view.bank_slide.Value(); }));
    out.push(JXG.evaluate(() => { return a.Value(); }));
    out.push(JXG.evaluate(() => { return b.Value(); }));
    return out;
}

// output events, binding to LMS

board.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
