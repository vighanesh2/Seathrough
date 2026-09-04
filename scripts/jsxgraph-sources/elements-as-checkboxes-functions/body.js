// JSXGraph construction

board.create('slider', [[1, -2], [7, -2], [-5, 0.5, 5]], { name: 'a' });
board.create('slider', [[1, -4], [7, -4], [-5, 1, 5]], { name: 'b' });
board.create('slider', [[1, -6], [7, -6], [-5, -1, 5]], { name: 'c' });
board.create('slider', [[1, -8], [7, -8], [-5, 2, 5]], { name: 'd' });

for (let i = 0; i < input["clickable"].length; i++) {
    board.create('functiongraph', [input["clickable"][i]], { clickValue: true, strokeWidth: 2 });
    board.create('text', [-8, -2-2*i, 'f(x)=' + input["clickable"][i]], { fixed: true});
}

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
                                strokeWidth: elements[i][2] ? 8 : 2,
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
            //JXG.evaluate(clickablesEl[i][0].getAttribute('clickValue'))
            input['clickable'][i]
        ) : null;
    }
    return out;
}

// output events, binding to LMS

board.on('up', function (e) {
    document.getElementById('outputID').innerHTML = output();
});
