var A = board.create('point', [-3, -1], { color: 'blue' }),
        B = board.create('point', [0, -1], { color: 'blue' }),
        E = board.create('point', [1, -2], { name: 'E', color: 'blue' }),

        square1 = board.create('regularpolygon', [A, B, 4], { name: 'Square 1' }),
        square2 = board.create('regularpolygon', [B, E, 4], { name: 'Square 2' }),

        C = square1.vertices[2],
        H = square2.vertices[3],

        p = board.create('line', [A, H]),
        q = board.create('line', [E, C]);
