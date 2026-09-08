var t = board.create('turtle', [4, 3, 70]);

var s = board.create('slider', [
    [0, -5],
    [10, -5],
    [-5, 0.5, 5]
], {
    name: 's'
});
var alpha = board.create('slider', [
    [0, -6],
    [10, -6],
    [-1, 0.2, 2]
], {
    name: 'α'
});
t.hideTurtle();

var A = 5;
var tau = 0.3;
var dx = 0.1;
var x;

function clearturtle() {
    t.cs();
    t.ht();
}

function run() {
    t.setPos(0, s.Value());
    t.setPenSize(4);
    x = 0.0; // global
    loop();
}

function loop() {
    var dy = alpha.Value() * t.Y() * (A - t.Y()) * dx; // Autocatalytic process
    t.moveTo([dx + t.X(), dy + t.Y()]);
    x += dx;
    if (x < 20.0) {
        setTimeout(loop, 10);
    }
}
