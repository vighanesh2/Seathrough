var A = [],
    s = [],
    B = [],
    c = [],
    r = [],
    k;

var attA = {
    name: '',
    strokeColor: '#7355ff',
    fillColor: '#7355ff'
};
A[0] = board.create('point', [2.5, -3], attA);
A[1] = board.create('point', [2, 4], attA);
A[2] = board.create('point', [-2.5, 3], attA);
A[3] = board.create('point', [-4, -2], attA);
A[4] = board.create('point', [0, -4], attA);

for (k = 0; k < 5; k++) {
    s[k] = board.create('segment', [A[k], A[(k + 2) % 5]], {
        strokeColor: 'blue',
        strokeWidth: 1
    });
}

var attB = {
    name: '',
    strokeColor: '#EA0000',
    fillColor: '#EA0000'
};
for (k = 0; k < 5; k++) {
    B[k] = board.create('intersection', [s[k], s[(k - 1 + 5) % 5], 0], attB);
}

var attC = {
    strokeColor: '#aaaaaa',
    strokeWidth: 1
};
for (k = 0; k < 5; k++) {
    c[k] = board.create('circle', [A[k], B[k], A[(k + 1) % 5]], attC);
}

var attR = {
    strokeColor: '#ff0000',
    strokeWidth: 2
};
for (k = 0; k < 5; k++) {
    r[k] = board.create('radicalaxis', [c[k], c[(k - 1 + 5) % 5]], attR);
}
