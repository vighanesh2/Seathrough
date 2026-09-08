var p = board.create('point', [1, 1], {
    size: 5
});

JXG.addEvent(p.rendNode, 'mouseover',
    function() {
        document.getElementById('myOutput').innerHTML = "Point " + this.name;
    },
    p);
JXG.addEvent(p.rendNode, 'mouseout',
    function() {
        document.getElementById('myOutput').innerHTML = '&nbsp;';
    },
    p);

// User can not move "A" anymore.
p.hasPoint = function() {
    return false;
};

var p2 = board.create('point', [-1, 1], {
    size: 5
});

JXG.addEvent(p2.rendNode, 'mouseover',
    function() {
        document.getElementById('myOutput').innerHTML = "Point " + this.name;
    },
    p2);

JXG.addEvent(p2.rendNode, 'mouseout',
    function() {
        document.getElementById('myOutput').innerHTML = '&nbsp;';
    },
    p2);
