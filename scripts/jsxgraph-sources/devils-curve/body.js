var a = board.create('slider', [
    [1, 4], [4, 4], [0, 1.5, 3]
], {
    name: 'a'
});
var b = board.create('slider', [
    [1, 3.5], [4, 3.5], [0, 1, 3]
], {
    name: 'b'
});
 
var c = board.create('curve', [
  (theta) => Math.sqrt( (b.Value()**2 * Math.sin(theta)**2 - a.Value()**2 * Math.cos(theta)**2 ) /
                 (Math.sin(theta)**2 - Math.cos(theta)**2 ) ),
    [0, 0],
    0, 2 * Math.PI
], {
    strokeWidth: 3,
    curveType: 'polar'
});
