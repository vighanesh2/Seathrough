// Vertical line at x=3
board.create('line', [-3, 1, 0], {
    strokeWidth: 1,
    dash: 2
});
board.create('text', [3, 8, "Default"], {
    cssClass: 'mytext'
});
board.create('text', [3, 7, "anchorX left"], {
    anchorX: 'left',
    cssClass: 'mytext'
});
board.create('text', [3, 6, "anchorX middle"], {
    anchorX: 'middle',
    cssClass: 'mytext'
});
board.create('text', [3, 5, "anchorX right"], {
    anchorX: 'right',
    cssClass: 'mytext'
});

// Horizontal line at y=2
board.create('line', [-2, 0, 1], {
    strokeWidth: 1,
    dash: 2
});
board.create('text', [1, 2, "Multiline text<br>default"], {
    cssClass: 'mytext'
});
board.create('text', [2.2, 2, "Multiline text<br>anchorY bottom"], {
    anchorY: 'bottom',
    cssClass: 'mytext'
});
board.create('text', [3.4, 2, "Multiline text<br>anchorY middle"], {
    anchorY: 'middle',
    cssClass: 'mytext'
});
board.create('text', [4.6, 2, "Multiline text<br>anchorY top"], {
    anchorY: 'top',
    cssClass: 'mytext'
});

// Horizontal line at y=2
board.create('line', [-2, 0, 1], {
    strokeWidth: 1,
    dash: 2
});
board.create('text', [3, 2, "Multiline text<br>anchorX right<br>anchorY top"], {
    anchorX: 'right',
    anchorY: 'top',
    cssClass: 'mytext'
});

board.create('text', [0.0, 0.0, 'Rotate'], {
    display: 'internal',
    rotate: 30
});
