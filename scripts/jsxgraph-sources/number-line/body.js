var axisx = board.create('axis', [[0, 0], [1, 0]],
{
    firstArrow: true,
    lastArrow: true,
    ticks: {
        strokeOpacity: 1,
        drawZero: true,
        ticksDistance: 1,
        majorHeight: 30,
        tickEndings: [1, 1],
        minorTicks: 0,
        label: { anchorX: 'middle', offset: [0, -25] }
    }
});
var p = board.create('glider', [2.2, 0, axisx], {});
