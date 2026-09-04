var t = board.create('turtle');
var acc = 0.0;
var acc_n = 0;

function run() {
    var i, j, dist, sumdist = 0.0;
    var stepSize = 5;
    t.hideTurtle();
    board.suspendUpdate();
    var nr = document.getElementById('number').value * 1;
    for (i = 0; i < nr; i++) {
        t.setPenColor(JXG.hsv2rgb(Math.round(Math.random() * 255), Math.random(), Math.random()));
        for (j = 0; j < 100; j++) {
            var a = Math.floor(360 * Math.random());
            t.right(a);
            t.forward(stepSize);
        }
        dist = t.pos[0] * t.pos[0] + t.pos[1] * t.pos[1];
        sumdist += dist;
        t.home();
    }
    document.getElementById('output').value = (sumdist / nr).toFixed(3);
    acc += sumdist;
    acc_n += nr;
    document.getElementById('output2').value = (acc / acc_n).toFixed(3);
    board.unsuspendUpdate();
}

function clearturtle() {
    t.cs();
    acc = 0.0;
    acc_n = 0;
}
