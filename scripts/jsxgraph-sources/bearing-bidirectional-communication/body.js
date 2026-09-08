var c = board.create('circle', [
    [0, 0], 1
], {fixed:true});
var g = board.create('glider', [-1, 0.5, c], {
    name: 'drag me'
}); // global variable
var p0 = board.create('point', [1, 0], {visible: false});
var p1 = board.create('point', [0, 0], {visible: false});
var a = board.create('angle', [p0, p1, g], {withLabel: false, radius: 0.35});
g.on('drag', function() {
    document.getElementById('degrees').value = (Math.atan2(g.Y(), g.X()) * 180 / Math.PI).toFixed(0);
});

var setDirection = function() {
    var phi = 1 * document.getElementById('degrees').value * Math.PI / 180.0;
    var r = c.Radius();
    g.moveTo([r * Math.cos(phi), r * Math.sin(phi)], 1000);

}
