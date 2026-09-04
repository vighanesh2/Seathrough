var p = board.create('point', [-3, -2], { name: 'p' }),
    q1 = board.create('point', [0, -2], { name: 'q_1' }),
    q2 = board.create('point', [-1, 0.5], { name: 'q_2' }),
    l1 = board.create('line', [p, q1], { straightFirst: false }),
    l2 = board.create('line', [p, q2], { straightFirst: false }),

    l3 = board.create('line', [q1, q2], { color: 'black', dash: 2 }),
    t1 = board.create('glider', [2.5, 2, l1], { name: 't_1' }),
    l4 = board.create('parallel', [l3, t1], { color: 'black', dash: 2 }),
    t2 = board.create('intersection', [l4, l2], { name: 't_2' }),

    txt1 = board.create('text', [-4, -3.5,
        () => 'TV(p,q_1,t_1) = ' + (t1.Dist(p) / q1.Dist(p)).toFixed(2)
    ]),
    txt2 = board.create('text', [-4, -4.2,
        () => 'TV(p,q_2,t_2) = ' + (t2.Dist(p) / q2.Dist(p)).toFixed(2)
    ]);
