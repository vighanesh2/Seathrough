// Primal basis vectors
var b1 = board.create('point', [4,0], {size:6, name:'b_1', color:'blue', snaptogrid: true}),
    b2 = board.create('point', [3,3], {size:6, name:'b_2', color:'blue', snaptogrid: true}),
    v1 = board.create('arrow', [[0,0], b1], {strokeColor: 'black', fixed: true}),   
    v2 = board.create('arrow', [[0,0], b2], {strokeColor: 'red', fixed: true}),
    w1, w2;


// Plot lattice points
for (let i = -5; i < 6; i++) {
    for (let j = -5; j < 6; j++) {
        if (!(i == 1 && j == 0) && !(i == 0 && j == 1)) { 
            board.create('point', [
                () => i * b1.X() + j * b2.X(),
                () => i * b1.Y() + j * b2.Y()
            ], {name:'', withLabel: false, size:2});
        }
    }
}

// Dual basis vectors
w1 = board.create('arrow', [[0,0], function() {
            var num = b1.X() * b2.Y() - b2.X() * b1.Y();
            return [b2.Y() / num,  -b2.X() / num];
}], {strokeColor: 'black', name:"b_1'", withLabel:true, label:{position:'rt'}});

w2 = board.create('arrow', [[0,0], function() {
            var num = b1.X() * b2.Y() - b2.X() * b1.Y();
            return [-b1.Y() / num,  b1.X() / num];
}], {strokeColor: 'red', name:"b_2'", withLabel:true, label:{position:'rt'}});
