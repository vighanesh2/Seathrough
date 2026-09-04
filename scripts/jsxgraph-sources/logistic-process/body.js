var t = board.create('turtle', [4, 3, 70]);
var s = board.create('slider', [[0, -5], [10, -5], [0, 0.5, 5]], { name: 's' });
var alpha = board.create('slider', [[0, -6], [10, -6], [-1, 0.9, 2]], { name: 'α' });

t.hideTurtle();

var A = 5;
var tau = 0.3;

function clearturtle() {
    t.cs();
    t.ht();
}

function run() {
    t.setPos(0, s.Value());
    t.setPenSize(4);
    dx = 0.1; // global
    x = 0.0; // global
    loop();
}

function loop() {
    var dy = (alpha.Value() * t.Y() - tau * t.Y() * t.Y()) * dx; // Logistic process
    t.moveTo([dx + t.X(), dy + t.Y()]);
    x += dx;
    if (x < 20.0) {
        setTimeout(loop, 10);
    }
}
