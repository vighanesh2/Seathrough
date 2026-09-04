board.create('functiongraph', [function(t) { return Math.sin(t); }, -10, 10], { strokeColor: "#cccccc" });

var s = board.create('slider', [[0.75, -1.5], [5.75, -1.5], [0, 1, 10]], { name: 's', snapWidth: 1 });
var a = board.create('glider', [0, 0, board.defaultAxes.x], { name: 'a' });
board.create('functiongraph', [
    function(t) {
        var val = 0,
            n, c,
            sv = s.Value() + 1;

        for (n = 0; n < sv; n++) {
            if (n % 4 == 0) {
                c = Math.sin(a.X()); // 0th, 4th, 8th, ... derivative
            } else if (n % 4 == 1) {
                c = Math.cos(a.X()); // 1st, 5th, 9th, ... derivative
            } else if (n % 4 == 2) {
                c = -Math.sin(a.X()); // 2th, 6th, 10th, ... derivative
            } else if (n % 4 == 3) {
                c = -Math.cos(a.X()); // 3th, 7th, 11th, ... derivative
            }
            val = val + c * Math.pow(t - a.X(), n) / JXG.Math.factorial(n);
        }
        return val;
  },
  -10, 10], {
    strokeColor: "#bb0000"
});
