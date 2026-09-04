var f = board.create('functiongraph', [(t) => Math.sin(t) * t]);

var ineq = board.create('inequality', [f], {
    fillColor: 'yellow'
});
