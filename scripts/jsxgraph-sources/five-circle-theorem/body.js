var p = [], l = [], i = [], c = [], j = [], k, cc;

// Blue points
var attr = {
    name: '',
    color: '#7355ff'
};
p[0] = board.create('point', [-2.5, -3], attr);
p[1] = board.create('point', [-0, 4], attr);
p[2] = board.create('point', [2.5, -3], attr);
p[3] = board.create('point', [-4, 0], attr);
p[4] = board.create('point', [4, 0], attr);

for (k = 0; k < 5; k++) {
    l[k] = board.create('segment', [p[k], p[(k + 1) % 5]], {strokeColor: 'black', strokeWidth: 1});
}

// Intersection points: yellow
for (k = 0; k < 5; k++) {
    i[k] = board.create('intersection', [l[k], l[(k + 2) % 5], 0], {name: '', color: '#EAEA00'});
}

for (k = 0; k < 5; k++) {
    c[k] = board.create('circumcircle', [p[k], i[k], i[(k + 2) % 5]], {
        strokeColor: 'gray', strokeWidth: 1, 
        point: {
            visible: false
        }
    });
}

// Intersection points: red
for (k = 0; k < 5; k++) {
    j[k] = board.create('intersection', [c[k], c[(k + 2) % 5], 0], {name: '', color: '#EA0000'});
}

// 6th circle: circumcircle
cc = board.create('circumcircle', [j[0], j[2], j[3]], {
    strokeColor: 'red',
    strokeWidth: 2,
    point: {
        strokeColor: '#000000',
        fillColor: '#000000',
        size: 1
    }
});
