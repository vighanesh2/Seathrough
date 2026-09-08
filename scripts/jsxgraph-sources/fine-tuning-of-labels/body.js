var p1 = board.create('point', [-2, 3], {
    size: 20,
    name: 'A',
    fillColor: 'none',
    label: {
        offset: [0, 0],
        anchorX: 'middle',
        anchorY: 'middle',
    }
});

var p2 = board.create('point', [2, 3], {
    size: 5,
    name: 'B',
    label: {
        offset: [0, 10],
        anchorX: 'middle',
        anchorY: 'bottom',
        cssClass: 'myLabel',
        highlightCssClass: 'myLabel'
    }
});
