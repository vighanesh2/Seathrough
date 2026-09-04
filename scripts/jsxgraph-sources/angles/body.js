var A = board.create('point', [-1, -1]),
    B = board.create('point', [1, -1]),
    C = board.create('point', [0, 1]),
    alpha = board.create('angle', [B, A, C], {
        type: 'sector',
        orthoType: 'square',
        orthoSensitivity: 2,
        radius: 0.5
    }),
    beta = board.create('angle', [C, B, A], {
        type: 'sector',
        orthoType: 'sectordot',
        orthoSensitivity: 2,
        radius: 0.2
    });
