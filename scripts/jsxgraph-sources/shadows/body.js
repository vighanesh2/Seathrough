board.options.line.strokeWidth = 2
// No shadow
var li1 = board.create('line', [[-2, 5], [2, 6]], {strokeColor: 'red', shadow: false});

// Default shadow
var li2 = board.create('line', [[-2, 3], [2, 4]], {strokeColor: 'red', shadow: true});

// No shadow
var li3 = board.create('line', [[-2, 1], [2, 2]], {strokeColor: 'blue', shadow: {enabled: false}});

// Shadow uses same color as line
var li4 = board.create('line', [[-2, -1], [2, 0]], {strokeColor: 'blue',
            shadow: {enabled: true, color: '#000000', blend: 1}
        });

// Shadow color as a mixture between black and the line color, additionally set opacity
var li5 = board.create('line', [[-2, -3], [2, -2]], {strokeColor: 'blue',
            shadow: {enabled: true, color: '#000000', blend: 0.5, opacity: 0.5}
        });

// Use different value for blur and offset [dx, dy]
var li6 = board.create('line', [[-2, -5], [2, -4]], {strokeColor: 'blue',
            shadow: {enabled: true, offset:[0, 25], blur: 6}
        });
