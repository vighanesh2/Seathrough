// Define the two circles
var o1 = board.create('point', [-2, 2], { name: 'O_1' });
var o2 = board.create('point', [3, -3], { name: 'O_2' });

var p1 = board.create('point', [-3, 5], { name: 'P_1' });
var p2 = board.create('point', [2, -3], { name: 'P_2' });

var c1 = board.create('circle', [o1, p1]);
var c2 = board.create('circle', [o2, p2]);

// The construction of the tangents starts here:
var m = board.create('midpoint', [o1, o2], { name: 'M' });
var lm = board.create('line', [o1, o2], { strokeWidth: 1, strokeColor: 'gray' });

// The circle with center M containing the two centers O_1 and O_2
var c3 = board.create('circle', [m, o2], { strokeColor: 'green', strokeWidth: 1 });

var c4 = board.create('circle', [o1, () => Math.abs(c1.Radius() - c2.Radius())], {
    strokeColor: 'purple',
    strokeWidth: 1
});

var i1 = board.create('intersection', [c3, c4, 0], { visible: true });
var i2 = board.create('intersection', [c3, c4, 1], { visible: true });

var l1 = board.create('line', [o1, i1], { visible: false });
var l2 = board.create('line', [o1, i2], { visible: false });

var i3 = board.create('intersection', [c1, l1, 0]);
var i4 = board.create('intersection', [c1, l2, 0]);

var l3 = board.create('line', [i1, o1], { visible: false });
var l4 = board.create('line', [o1, i2], { visible: false });

// The tangents to circle c1 at points i3 and i4 are the
// also tangent to circle c2
var t1 = board.create('tangent', [c1, i3], { strokeColor: 'darkblue' });
var t2 = board.create('tangent', [c1, i4], { strokeColor: 'darkblue' });

// Supplements:
// The arrows are just for illustration
var v1 = board.create('arrow', [o1, i3], { strokeColor: 'lightblue', strokeWidth: 3 });
var v2 = board.create('arrow', [o1, i4], { strokeColor: 'lightblue', strokeWidth: 3 });

// t3 and t4 are the tangents to circle c4 through point o2
var t3 = board.create('line', [o2, i1], { strokeColor: 'pink' });
var t4 = board.create('line', [o2, i2], { strokeColor: 'pink' });
