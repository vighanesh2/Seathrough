var A = board.create('point', [-1, -1], { name: 'A' }),
    B = board.create('point', [-3, -3], { name: 'B' }),
    C = board.create('point', [-2, 0], { name: 'C' });

board.on('move', function() {
    var list = [A, B, C],
        i;

    board.suspendUpdate();   // Prevent updates during correction of the points
    for (i = 0; i < list.length; ++i) {
        list[i].moveTo(
           [
            Math.min(0, list[i].X()),
            Math.min(0, list[i].Y())
           ]
        );
    }
    board.unsuspendUpdate();
});
