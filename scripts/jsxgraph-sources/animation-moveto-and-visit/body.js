var p = board.create('point', [1.5, 1.5], {
    size: 8,
    strokeColor: 'red',
    fillOpacity: 0.6,
    strokeOpacity: 0.6
});

board.create('segment', [
    [0, 0], p
], {
    dash: 3
});
