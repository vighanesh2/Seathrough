var H = board.create('slider', [[-3, 3.5], [2, 3.5], [0, 1, 360]], {
    name: 'H',
    fillColor: 'black',
    strokeColor: 'black'
});
var S = board.create('slider', [[-3, 3], [2, 3], [0, 1, 1]], { name: 'S', fillColor: 'black', strokeColor: 'black' });
var V = board.create('slider', [[-3, 2.5], [2, 2.5], [0, 1, 1]], {
    name: 'V',
    fillColor: 'black',
    strokeColor: 'black'
});

var r1 = 2;
var r2 = 1 / 4.75;
var lambda = 8;

var c1 = board.create('curve', [
         (t) => r1 * Math.sin(t) + r2 * Math.sin(lambda * t),
         (t) => r1 * Math.cos(t) + r2 * Math.cos(lambda * t) - 0.2,
         0, 2 * Math.PI
   ], {
    fillcolor: () => JXG.hsv2rgb(H.Value(), S.Value(), V.Value()),
    highlightFillcolor: () => JXG.hsv2rgb(H.Value(), S.Value(), V.Value()),
    strokeColor: 'black',
    strokeWidth: 3
});

var c2 = board.create('curve', [
          (t) => Math.sin(t),
          (t) => Math.cos(t) - 0.2,
          0, 2 * Math.PI
   ], {
    fillcolor: () => JXG.hsv2rgb(180 + H.Value(), S.Value(), V.Value()),
    highlightFillcolor: () => JXG.hsv2rgb(180 + H.Value(), S.Value(), V.Value()),
    strokeColor: 'black',
    strokewidth: 3
});

var t = board.create('text', [1, -3, () => 'RGB=' + JXG.hsv2rgb(H.Value(), S.Value(), V.Value())], { fontSize: 32 });
