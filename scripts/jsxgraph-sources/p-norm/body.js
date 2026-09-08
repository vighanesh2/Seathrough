var pNorm = board.create('slider', [[-3, 4], [3, 4], [0, 2, 10]], {
    name: 'p',
    snapWidth: 0.1,
    snapValues: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    snapValueDistance: 0.1
});
var m = board.create('point', [0, 0], { name: 'M' });

var graph = board.create('curve', [
   (t) => {
        var p = pNorm.Value();
        return 2.0 / Math.pow(Math.pow(Math.abs(Math.cos(t)), p) + Math.pow(Math.abs(Math.sin(t)), p), 1.0 / p);
   },
   [() => m.X(), () => m.Y()], // center
   0, Math.PI * 2
], {
    curveType: 'polar',
    strokeColor: 'red',
    strokeWidth: 2
});
