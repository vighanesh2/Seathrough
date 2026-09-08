var b1 = board.create('point', [1, 0], { size: 6, name: '', color: 'blue' });
var b2 = board.create('point', [0, 1], { size: 6, name: '', color: 'blue' });
var i, j;
for (i = -5; i < 6; i++) {
    for (j = -5; j < 6; j++) {
        if (!(i == 1 && j == 0) && !(i == 0 && j == 1)) {
            board.create('point', [
       function(x, y) { return function() { return x * b1.X() + y * b2.X(); }; }(i, j),
       function(x, y) { return function() { return x * b1.Y() + y * b2.Y(); }; }(i, j)
       ], { name: '', style: 4 });
        }
    }
}
