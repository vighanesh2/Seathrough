var a = board.create('slider', [[-5, -2], [5, -2], [-5, 1, 5]], { name: 'a', snapWidth: 0.1 });
var b = board.create('slider', [[-5, -3], [5, -3], [-5, 0, 5]], { name: 'b', snapWidth: 0.1 });
var c = board.create('slider', [[-5, -4], [5, -4], [-5, 0, 5]], { name: 'c', snapWidth: 0.1 });
var d = board.create('slider', [[-5, -5], [5, -5], [-5, 1, 5]], { name: 'd', snapWidth: 0.1 });

var v = board.create('point', [2, 2], { face: 'o', size: 2, name: 'v' });
var va = board.create('arrow', [[0, 0], v]);

var v2 = board.create('point', [
          () => a.Value() * v.X() + b.Value() * v.Y(),
          () => c.Value() * v.X() + d.Value() * v.Y()], 
          { face: 'o', size: 2, name: "v'", fillColor: 'black', strokeColor: 'black'});
var va2 = board.create('arrow', [[0, 0], v2], { strokeColor: 'black', strokeWidth: 1 });

var t = board.create('text', [-8, 5,
            () => '\\[M = \\begin{pmatrix}'
              + (a.Value()).toFixed(2) + '&'
              + (b.Value()).toFixed(2) + '\\\\'
              + (c.Value()).toFixed(2) + '&'
              + (d.Value()).toFixed(2) + '\\end{pmatrix}\\]']);

var t2 = board.create('text', [-8, 2,
             () => "\\[\\lambda = \\frac{|v'|}{|v|} = " + (
                  JXG.Math.Geometry.distance([0, 0], [v2.X(), v2.Y()]) /
                  JXG.Math.Geometry.distance([0, 0], [v.X(), v.Y()])
                  ).toFixed(3)
                  + "\\]"
              ]);

var showTrace = false;
var toggleTrace = function() {
    showTrace = !showTrace;
    v.setAttribute({ trace: showTrace });
    v2.setAttribute({ trace: showTrace });
    var b = document.getElementById("toggleButton");
    if (showTrace) {
        b.value = "Hide trace";
    } else {
        b.value = "Show trace";
        v.clearTrace();
        v2.clearTrace();
    }
};
