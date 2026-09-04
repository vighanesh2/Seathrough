// JSXGraph construction

board.create('polygon', [[ 3,  7], [ 9,  7], [ 4, 11]], { clickValue: 'triangle 1', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });
board.create('polygon', [[ 7, 12], [14, 14], [ 9, 16]], { clickValue: 'triangle 2', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });
board.create('polygon', [[12,  6], [19,  6], [14, 10]], { clickValue: 'triangle 3', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });
board.create('polygon', [[ 1, 14], [ 5, 14], [ 6, 19]], { clickValue: 'triangle 4', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });
board.create('polygon', [[19, 12], [15, 13], [16, 18]], { clickValue: 'triangle 5', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });
board.create('polygon', [[6,  2], [15,  2], [ 4,  5]], { clickValue: 'triangle 6', fixed: true, hasInnerPoints:true, borders: { strokeWidth: 2, lineCap: 'round' }, vertices: { fixed: true, visible: false } });

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
