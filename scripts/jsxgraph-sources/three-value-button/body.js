var s = board.create('slider', [[-4, 3], [-2, 3], [1, 1, 3]], {
    name: 's',
    snapWidth: 1,
    digits: 0,

    // Styling
    ticks: { visible: false },
    highline: { visible: false },
    baseline: { strokeWidth: 5, strokeOpacity: 0.7, strokeColor: 'blue' },
    // Point styling
    face: '[]',
    size: 8,
    fillColor: 'blue',
    highlight: false
});

board.create('functiongraph', [
    (x) => Math.sin(s.Value() * x)
]);
