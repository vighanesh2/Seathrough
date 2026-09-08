var f = function(x) {
    if (x < 0)
        return -1;
    if (x >= 0 && x < 2)
        return 1;
    if (x >= 2)
        return 2;
}
board.create('functiongraph', [f]);
