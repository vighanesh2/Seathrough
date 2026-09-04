var r = board.create('point', [-4, -2], {name:'r'});
var r1 = board.create('point', [-1.5, -2.5], {name:'', color: 'blue'});
var r2 = board.create('point', [-1.5, -1.7], {name:'', color: 'blue'});
var r3 = board.create('point', [-1.5, -0.5], {name:'', color: 'blue'});

var l1 = board.create('line', [r, r1], {straightFirst: false, name: 'g_1', withLabel: true, label: {position: 'rt', offset: [-10, 0]}});
var l2 = board.create('line', [r, r2], {straightFirst: false, name: 'g_2', withLabel: true, label: {position: 'rt', offset: [-10, 10]}});
var l3 = board.create('line', [r, r3], {straightFirst: false, name: 'g_3', withLabel: true, label: {position: 'rt', offset: [-10, 0]}});

var p1 = board.create('glider', [-1, -2, l1], {name:'p_1'});
var p2 = board.create('glider', [0.5, -2, l2], {name:'p_2'});
var p3 = board.create('glider', [-0.5, 0, l3], {name:'p_3'});

var q1 = board.create('glider', [0.75, -2, l1], {name:'q_1'});

var s1 = board.create('segment', [p1, p2], {color: 'black'});
var s2 = board.create('segment', [p1, p3], {color: 'black'});
var s3 = board.create('segment', [p2, p3], {color: 'red'});

var par1 = board.create('parallel', [s1, q1], {visible: false});
var par2 = board.create('parallel', [s2, q1], {visible: false});

var q2 = board.create('intersection', [par1, l2], {name:'q_2', color: 'black'});
var q3 = board.create('intersection', [par2, l3], {name:'q_3', color: 'black'});

var s4 = board.create('segment', [q1, q2], {color: 'black'});
var s5 = board.create('segment', [q1, q3], {color: 'black'});
var s6 = board.create('segment', [q2, q3], {color: 'red'});
