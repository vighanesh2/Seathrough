var p = board.create('point', [0, 1], {
    size: 5,
    strokeColor: 'red',
    fillOpacity: 0.3,
    strokeOpacity: 0.3
});
board.create('arrow', [
    [0, 0], p
], {
    strokeWidth: 5,
    strokeOpacity: 0.7,
    strokeColor: 'blue'
});

// Start infinite animation
var i = -1;
setInterval(function() {
    p.moveTo([Math.sin(i * Math.PI * 2 / 12), Math.cos(i * Math.PI * 2 / 12)], 800);
    i++;
}, 1000);
