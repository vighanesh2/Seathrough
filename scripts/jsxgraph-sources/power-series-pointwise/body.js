var p = board.create('glider', [0, 0, board.defaultAxes.x], { name: 'x' });
var q = board.create('point', [0, 1], { name: '', color: 'blue', trace: true, fixed: true });

p.on('up', function(evt) {

    var x, n, s, m = 51;
    var txtraw = document.getElementById('input').value;
    var a_n = board.jc.snippet(txtraw, true, 'x, n', true);
    var n_0 = parseInt(document.getElementById('startval').value);

    x = p.X();
    for (n = n_0, s = 0; n < m; n++) {
        s += a_n(x, n);
    }
    q.moveTo([x, s], 0);
});
