var p = [];
    p[0] = board.create('point', [-1, 2], { size: 2, name: '' });
    p[1] = board.create('point', [0, -2], { size: 2, name: '' });
    p[2] = board.create('point', [2, 1], { size: 2, name: '' });

    var graph = board.create('curve', JXG.Math.Numerics.Neville(p), { strokeWidth: 5, strokeOpacity: 0.5 });

    var gliders = [];
    gliders[0] = board.create('glider', [-1, 0, graph], { size: 4 });
    gliders[1] = board.create('glider', [-0.5, -2, graph], { size: 4 });
    gliders[2] = board.create('glider', [1, -3, graph], { size: 4 });
    gliders[3] = board.create('glider', [1.5, -1, graph], { size: 4 });

    board.create('polygon', gliders, { strokeColor: 'red' });

    board.updateConditions = function() {
        var i;
        for (i = 1; i < gliders.length; i++) {
            if (gliders[i].position < gliders[i - 1].position) {
                gliders[i].coords = new JXG.Coords(JXG.COORDS_BY_USER, gliders[i - 1].coords.usrCoords, board);
                gliders[i].update();
            }
        };
    }
