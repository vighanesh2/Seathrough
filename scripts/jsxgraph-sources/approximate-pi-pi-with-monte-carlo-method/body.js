var c, i, count = 0,
    tin = 0,
    tout = 0,
    p = [],
    updateText;
var c = board.create('circle', [
    [0, 0], 1
]);

p = [];
for (var i = 0; i < 50; i++) {
    p[i] = board.create('point',
        [function() {
            return 2 * Math.random() - 1;
        }, function() {
            return 2 * Math.random() - 1;
        }], {
            name: ' ',
            withLabel: false
        });
}

updateText = function() {
    var i, inp, outp, x, y, text = '';
    count++;

    inp = 0;
    outp = 0;

    for (i = 0; i < p.length; i++) {
        x = p[i].X();
        y = p[i].Y();

        if (x * x + y * y <= 1) {
            inp++;
        } else {
            outp++;
        }
    }
    tin += inp;
    tout += outp;

    text += '<b>Current:</b><br />in: ' + inp + ', out: ' + outp + ', total: ' + (inp + outp) +
        '; ratio: ' + (inp / (inp + outp)) + ', ratio*4: ' + (4 * inp / (inp + outp)) +
        '.<br /><b>Total:</b> (' + count + ' updates in total)<br/>I´in: ' + tin + ', out: ' + tout +
        ', total: ' + (tin + tout) + '; <br />ratio: ' + (tin / (tin + tout)) + ', <br />ratio*4: ' + (4 * tin / (tin + tout));

    document.getElementById('resulttext').innerHTML = text;
}

board.on('update', updateText);

JXG.addEvent(document.getElementById("unused-board-id"), 'mousemove', function() {
    this.update();
}, board);
