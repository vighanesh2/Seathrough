var plot1 = board.create('functiongraph', ["nthroot(x, 3)"], {
    withLabel: true,
    name: 'nthroot(x,3)',
    strokeWidth: 2,
    label: { position: '10% right' }
});
var plot2 = board.create('functiongraph', ["cbrt(x) + 1"], {
    withLabel: true,
    name: 'cbrt(x)+1',
    strokeColor: 'black',
    strokeWidth: 2,
    label: { position: '10% right' }
});
var plot3 = board.create('functiongraph', [(x) => Math.pow(x, 1 / 3) - 1, -1, 5], {
    withLabel: true,
    name: 'Math.pow(x, 1/3) - 1',
    strokeColor: 'red',
    strokeWidth: 2,
    label: { position: 'lft' }
});
