var plots = [];

var plot = function() {
    var f = board.jc.snippet(input.Value(), true, 'x', false);
    plots.push(board.create('functiongraph', [f]));
};

var clear = function() {
    var f;
    for (f of plots) {
        board.removeObject(f);
    }
};

var input = board.create('input', [-4.5, 4, 'x^2', 'f: ', {fontSize: 14}]);
var btn_start = board.create('button', [-4.5, 3.2, 'plot', plot]);
var btn_clear = board.create('button', [-3.0, 3.2, 'clear all', clear]);
