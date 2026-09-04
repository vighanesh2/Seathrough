var p0 = board.create('point', [0, 0], {name: 'p_0', fixed: true});
var p0s = board.create('point', [2, 1], {name: "p_0'"});
var p1s = board.create('point', [4, 4], {name: "p_1'"});
var p2s = board.create('point', [1, 2], {name: "p_2'"});

var l1 = board.create('line', [p0s, p1s], {lastArrow: true, color: 'orange'});
var l2 = board.create('line', [p0s, p2s], {lastArrow: true, color: 'orange'});

var v1 = board.create('arrow', [p0s, p1s], {
    color: 'black', strokeWidth: 1, layer: 8,
    lastArrow: {
        size: 10
    }
});
var v2 = board.create('arrow', [p0s, p2s], {
    color: 'black', strokeWidth: 1, layer: 8,
    lastArrow: {
        size: 10
    }
});

var v3 = board.create('arrow', [p0, p0s], {
    color: 'black', strokeWidth: 1, layer: 8,
    lastArrow: {
        size: 10
    }
});

var q = board.create('point', [3, 5], {name: 'q'});

var par1 = board.create('parallel', [l1, q], {strokeWidth: 1, dash: 1});
var par2 = board.create('parallel', [l2, q], {strokeWidth: 1, dash: 1});
