var i, len = 25,
    p = [];

// Create points
for (i = 0; i < len; i++) {
    p[i] = board.create('point', [Math.random(), Math.random()], {
        face: 'o',
        size: 10,
        strokeColor: 'red',
        fillColor: 'red',
        fillOpacity: 0.4,
        strokeOpacity: 0.4,
        withLabel: false
    });
}
// Start animation: remove colliding points
setInterval(function() {
    var i, j;
    for (i = 0; i < p.length; i++) {
        p[i].moveTo([Math.random(), Math.random()], 1000);
    }
    i = 0;
    while (i < p.length) {
        for (j = i + 1; j < p.length; j++) {
            if (p[i].Dist(p[j]) < 0.075) {
                brd.removeObject(p[j]);
                p.splice(j, 1);
                brd.removeObject(p[i]);
                p.splice(i, 1);
                i--;
                break;
            }
        }
        i++;
    }
}, 2000);
