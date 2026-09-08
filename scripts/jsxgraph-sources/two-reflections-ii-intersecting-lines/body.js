,
       A = board.create('point', [-2, -2], { withLabel: false }),
       B = board.create('point', [4, 0], { withLabel: false }),
       C = board.create('point', [-2, 2], { withLabel: false }),
       s = board.create('line', [A, B], { name: 's', withLabel: true }),
       t = board.create('line', [C, B], { name: 't', withLabel: true }),

       Ss = board.create('transform', [s], { type: 'reflect' }),
       St = board.create('transform', [t], { type: 'reflect' }),

       P1 = board.create('point', [0, -3], { name: 'P_1', color: 'green', size: 8 }),
       P2 = board.create('point', [P1, Ss], { name: 'P_2', color: 'green' }),
       P3 = board.create('point', [P2, St], { name: 'P_3', color: 'green', trace: true }),

       Q1 = board.create('point', [1, -4], { name: 'Q_1', color: 'blue', size: 8 }),
       Q2 = board.create('point', [Q1, Ss], { name: 'Q_2', color: 'blue' }),
       Q3 = board.create('point', [Q2, St], { name: 'Q_3', color: 'blue', trace: true }),

       l1 = board.create('line', [P1, Q1], { color: 'black', strokeWidth: 1, dash: 2 }),
       l2 = board.create('line', [P2, Q2], { color: 'black', strokeWidth: 1, dash: 2 }),
       l3 = board.create('line', [P3, Q3], { color: 'black', strokeWidth: 1, dash: 2 }),

       g1 = board.create('segment', [P1, P2], { color: 'orange', strokeWidth: 1, dash: 3 }),
       g2 = board.create('segment', [P2, P3], { color: 'orange', strokeWidth: 1, dash: 3 }),
       h1 = board.create('segment', [Q1, Q2], { color: 'orange', strokeWidth: 1, dash: 3 }),
       h2 = board.create('segment', [Q2, Q3], { color: 'orange', strokeWidth: 1, dash: 3 });
