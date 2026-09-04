var p1, p2, p3,
    b1, b2, b3,
    c1, c2, c3, c4, c5,
    ll1, ll2, ll3,
    i1, i2, i3, i4,
    pp1, pp2, pp3;

p1 = board.create('point', [0.5, -1.5], {
    name: 'A',
    size: 5
});
p2 = board.create('point', [7.5, -2.5], {
    name: 'B',
    size: 5
});
p3 = board.create('point', [7, 3], {
    name: 'C',
    size: 5
});

// Triangle ABC
b1 = board.create('segment', ['A', 'B']);
b2 = board.create('segment', ['A', 'C']);
b3 = board.create('segment', ['C', 'B']);

c1 = board.create('circumcircle', ['A', 'B', 'C'], {
    strokeColor: '#afafaf'
});

c2 = board.create('incircle', ['A', 'B', 'C'], {
    strokeColor: '#3CB371'
});

pp1 = board.create('intersection', [c2, b1], {
    name: "C'",
    color: 'blue'
});

pp2 = board.create('intersection', [c2, b2], {
    name: "B'",
    color: 'blue'
});

pp3 = board.create('intersection', [c2, b3], {
    name: "A'",
    color: 'blue'
});

c3 = board.create('circumcircle', [p3, pp2, pp3], {
    strokeColor: '#FF8C00'
});
c4 = board.create('circumcircle', [p2, pp1, pp3], {
    strokeColor: '#FF8C00'
});
c5 = board.create('circumcircle', [p1, pp2, pp1], {
    strokeColor: '#FF8C00'
});

i1 = board.create('otherintersection', [c3, c1, p3], {
    name: "C''",
    color: 'black'
});
i2 = board.create('otherintersection', [c4, c1, p2], {
    name: "B''",
    color: 'black'
});
i3 = board.create('otherintersection', [c5, c1, p1], {
    name: "A''",
    color: 'black'
});

ll1 = board.create('segment', [i1, pp1], {
    strokeColor: '#111111'
});
ll2 = board.create('segment', [i2, pp2], {
    strokeColor: '#111111'
});
ll3 = board.create('segment', [i3, pp3], {
    strokeColor: '#111111'
});

i4 = board.create('intersection', [ll1, ll2, 0], {
    name: "P",
    color: '#9932CC'
});
