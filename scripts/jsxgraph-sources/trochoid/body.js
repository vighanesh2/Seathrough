var D = JXG.Math.Numerics.D;
var a = board.create('slider', [[1, -1], [8, -1], [-5, 1, 5]], { style: 6, name: 'a' });
var b = board.create('slider', [[1, -2], [8, -2], [-5, 1, 5]], { style: 6, name: 'b' });

var x = (phi) => a.Value() * phi - b.Value() * Math.sin(phi);
var y = (phi) => a.Value() - b.Value() * Math.cos(phi);

var c1 = board.create('curve', [x, y, -Math.PI * 4, Math.PI * 4], { strokeWidth: 3 });

var dualCurve = function(x, y, board) {
    var X = (phi) => D(y)(phi) / (y(phi) * D(x)(phi) - x(phi) * D(y)(phi)),
        Y = (phi) => D(x)(phi) / (x(phi) * D(y)(phi) - y(phi) * D(x)(phi));
    return [X, Y];
}
var dual = dualCurve(x, y, board);
var c2 = board.create('curve', [dual[0], dual[1], -Math.PI, Math.PI], {
    strokeWidth: 3,
    strokeColor: 'red'
});
