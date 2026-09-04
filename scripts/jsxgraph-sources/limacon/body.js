var p3 = board.create('point', [8, 4], {face:'x',size:3,name:"P_{3}",fixed:true});
var p4 = board.create('point', [8, 8], {size:4,face:'x',name:"P_{4}",fixed:true});
var c1 = board.create('circle', [p4, p3]);

var p6 = board.create('glider', [0, 0, c1], {face:'o',size:5,name:"drag me"});
var g = board.create('line', [p3, p6]);

var c2 = board.create('circle', [p6, 3]);

var p14_1 = board.create('intersection', [c2,g,0], {size:3,face:'[]',name:"M",trace:true});
var p14_2 = board.create('intersection', [c2,g,1], {size:3,face:'[]',name:"N",trace:true});

function clearTrace() {
    p14_1.clearTrace();
    p14_2.clearTrace();
}
clearTrace();
