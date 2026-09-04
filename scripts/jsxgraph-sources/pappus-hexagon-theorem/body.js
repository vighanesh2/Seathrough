var q = board.create('point', [-4, -2], { name: 'q' });
var q1 = board.create('point', [-1.5, -2], { name: '', color: 'blue' });
var q2 = board.create('point', [-1.5, -1], { name: '', color: 'blue' });
var l1 = board.create('line', [q, q1], { straightFirst: false });
var l2 = board.create('line', [q, q2], { straightFirst: false });

var p1 = board.create('glider', [-1, -2, l1], { name: 'p_1' });
var p3 = board.create('glider', [3, -2, l1], { name: 'p_3' });

var p3s = board.create('glider', [-1.5, 1, l2], { name: "p_3'" });
var p2s = board.create('glider', [0, 1, l2], { name: "p_2'" });

// Lines p_1p_3' and p_1'p_3
var s3 = board.create('segment', [p1, p3s], { color: 'black' });
var par1 = board.create('parallel', [s3, p3], { visible: false });
var p1s = board.create('intersection', [par1, l2], { name: "p_1'", color: 'black' });
var s1 = board.create('segment', [p1s, p3], { color: 'black' });

// Lines p_1p_2' and p_1'p_2
var s2 = board.create('segment', [p1, p2s], { color: JXG.palette.red });
var par2 = board.create('parallel', [s2, p1s], { visible: false });
var p2 = board.create('intersection', [par2, l1], { name: "p_2", color: 'black' });
var s4 = board.create('segment', [p1s, p2], { color: JXG.palette.red });

// Lines p_2p_3' and p_2'p_3
var s5 = board.create('segment', [p2, p3s], { color: JXG.palette.blue, dash: 3 });
var s6 = board.create('segment', [p2s, p3], { color: JXG.palette.blue, dash: 3 });
