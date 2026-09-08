var N = board.create('slider', [[-7, 9.5], [7, 9.5], [-15, 10, 15]], {name:'N'});
var slider = board.create('slider', [[-7, 8], [7, 8], [-15, 0, 15]], {name:'c'});
var P = board.create('point', [0, 1], {name:'(t_0, y_0)'});
var f;

var doPlot = function() {
    var snip = board.jc.snippet(document.getElementById('odeinput').value, true, 't, y');
    f = (t, y) => [snip(t, y[0])];
    board.update();
}

// Solve ODE
var ode = function() {
   return JXG.Math.Numerics.rungeKutta('heun', [P.Y()], [P.X(), P.X()+N.Value()], 200, f);
}

var g = board.create('curve', [[0],[0]], {strokeColor:'red', strokeWidth:2});

// In each update, solve ODE from t_0 to t_0 + N and plot solution
g.updateDataArray = function() {
    var data = ode();
    var h = N.Value() / 200;
    var i;
    this.dataX = [];
    this.dataY = [];
    for (i = 0; i < data.length; i++) {
        this.dataX[i] = P.X() + i * h;
        this.dataY[i] = data[i][0];
    }
};

// Inital plotting
doPlot();
