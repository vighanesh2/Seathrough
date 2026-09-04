var t1 = board.create('turtle', [], { strokeColor: JXG.palette.blue, strokeWidth: 3 });
var t2 = board.create('turtle', [], { strokeColor: JXG.palette.red, strokeWidth: 3 });

var n = 64;
var delta = 360.0 / n;
var chase = function() {
    t1.fd(20);
    t1.lt(delta);
    t2.lookTo(t1.pos);
    t2.fd(20);
    action = setTimeout(chase, 100);
}

function run() {
    t1.setPos(200, 0);
    t2.setPos(0, 0);
    chase();
}

function clearturtle() {
    clearTimeout(action);
    t1.cs();
    t2.cs();
}
