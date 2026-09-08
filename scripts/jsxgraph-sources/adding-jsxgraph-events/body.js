var p = board.create('point', [1, 1], {
    size: 5,
    fixed: true
});
p.on('over', (e) => {
    document.getElementById('myOutput').innerHTML = "Point " + p.name;
});

p.on('out', (e) => {
    document.getElementById('myOutput').innerHTML = ' ';
});

var p2 = board.create('point', [-1, 1], {
    size: 5
});
p2.on('over', function(e) {
    document.getElementById('myOutput').innerHTML = "Point " + this.name;
});
p2.on('out', function(e) {
    document.getElementById('myOutput').innerHTML = ' ';
});
