var i, h, s, v;

for (i = 0; i < 100; i++) {
    // Select random HSV color
    h = Math.random() * 360;
    s = Math.random();
    v = 1.0;
    board.create('point', [Math.random(), Math.random()], {
        withLabel: false,
        face: 'circle',
        size: Math.random() * 65,
        strokeColor: JXG.hsv2rgb(h, s, v),
        fillColor: JXG.hsv2rgb((h + 180) % 360, s, v),
        highlightFillColor: JXG.hsv2rgb(h, s, v),
        fillOpacity: 0.7,
        highlightFillOpacity: 0.4
    });
}
