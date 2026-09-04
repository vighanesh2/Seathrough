// JSXGraph construction

let A = board.create('point', [1,  1], { });
let B = board.create('point', [7,  2], { });
let C = board.create('point', [6,  7], { });
let ABC = board.create('polygon', [A, B, C], { });
let M = board.create('midpoint', [A, B], { name: 'M' });
let s = board.create('segment', [C, M], {  });
let w = board.create('bisector', [B, A, C], { });
let D = board.create('intersection', [w, ABC.borders[1]], { });
let E = board.create('intersection', [w, s], { });
let alpha    = board.create('nonreflexangle', [B, A, D], { clickValue: 'alpha',   radius: 1.25, hasInnerPoints: true });
let beta     = board.create('nonreflexangle', [D, A, C], { clickValue: 'beta',    radius: 1.75, hasInnerPoints: true });
let gamma    = board.create('nonreflexangle', [A, D, B], { clickValue: 'gamma',   radius: 1.00, hasInnerPoints: true });
let delta    = board.create('nonreflexangle', [A, C, M], { clickValue: 'delta',   radius: 1.25, hasInnerPoints: true });
let epsilon  = board.create('nonreflexangle', [M, C, B], { clickValue: 'epsilon', radius: 1.75, hasInnerPoints: true });
let zeta     = board.create('nonreflexangle', [B, M, C], { clickValue: 'zeta',    radius: 1.00, hasInnerPoints: true });
let eta      = board.create('nonreflexangle', [D, E, C], { clickValue: 'eta',     radius: 1.00, hasInnerPoints: true });

// clickable elements

let clickablesEl = initClickableElements(input["multi"]);

// filter elements with attribute 'clickValue' and add event listeners
function initClickableElements(multi) {
    let elements = [];
    let elType = '';
    let id = board.create('transform', [1, 1], {type: 'scale'});
    for (let key in board.objects)
        if (JXG.exists(board.objects[key].getAttribute('clickValue'))) {
            try {
                elType = board.objects[key].elType;
                if (elType === 'intersection') {
                    elType = 'point';
                }
                if (elType === 'angle') {
                    elType = 'curve';
                }
                let element = board.objects[key];
                let duplicate = board.create(elType, [element, id], {name: '', fillColor: 'none', vertices: { visible: false }});
                elements.push([element, duplicate, false]);
                element.on('down', (e) => {
                    let elIndex = -1;
                    for (let i = 0; i < elements.length; i++)
                        if (elements[i][0] == element) elIndex = i;
                    if (elIndex != -1)
                        for (let i = 0; i < elements.length; i++) {
                            elements[i][2] = multi ? (elIndex == i ? !elements[i][2] : elements[i][2]) : elIndex == i;
                            let attr = {
                                strokeWidth: elements[i][2] ? 8 : 1,
                                strokeColor: elements[i][0].getAttribute('strokeColor') + '77',
                                highlightStrokeColor: elements[i][0].getAttribute('strokeColor') + 'bb'
                            };
                            if (elements[i][0].elType === 'polygon') {
                                elements[i][0].setAttribute({ borders: attr });
                            } else {
                                elements[i][0].setAttribute(attr);
                            }
                        }
                });
            } catch (e) {
                console.log('Attribute "clickValue" not supported!');
                console.log(e)
            }
        }
    return elements;
}

// output data for LMS, additional binding to LMS necessary

let output = function () {
    let out = [];
    for (let i = 0; i < clickablesEl.length; i++) {
        clickablesEl[i][2] ? out.push(
            JXG.evaluate(clickablesEl[i][0].getAttribute('clickValue'))
        ) : null;
    }
    return out;
}

// output events, binding to LMS

board.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
