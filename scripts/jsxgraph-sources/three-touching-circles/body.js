var A = board.create('point', [0, 0]),
    B = board.create('point', [2, 0]),
    C = board.create('point', [1, 2]),

    a1 = board.create('segment', [A, B], { name: 'a_1', withLabel: true, label: { position: '0.2fr right' } }),
    a2 = board.create('segment', [B, C], { name: 'a_2', withLabel: true, label: { position: '0.2fr right' } }),
    a3 = board.create('segment', [C, A], { name: 'a_3', withLabel: true, label: { position: '0.2fr right' } }),

    c1 = board.create('circle', [A, () => (C.Dist(A) - B.Dist(C) + A.Dist(B)) / 2.0]),
    c2 = board.create('circle', [B, () => A.Dist(B) - c1.Radius()]),
    c3 = board.create('circle', [C, () => B.Dist(C) - c2.Radius()]);
