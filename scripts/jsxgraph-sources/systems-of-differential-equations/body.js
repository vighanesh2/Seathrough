var N = board.create('slider', [[-7, 9.5], [7, 9.5], [-15, 10, 15]], { name: 'N' });
var P1 = board.create('point', [1, -1], { name: '(x_0,c_1)' });

var line = board.create('line', [() => -P1.X(), () => 1, () => 0], { visible: false });
var P2 = board.create('glider', [1, -0.5, line], { name: '(x_0,c_2)' }); // P2 and P1 have the same value of x

var f;

function doIt() {
    var txt1 = document.getElementById("odeinput1").value;
    var txt2 = document.getElementById("odeinput2").value;

    // Convert the input into JavaScript functions
    var snip1 = board.jc.snippet(txt1, true, 'x, y1, y2');
    var snip2 = board.jc.snippet(txt2, true, 'x, y1, y2');
    f = function(x, yy) {
        return [snip1(x, yy[0], yy[1]), snip2(x, yy[0], yy[1])];
    }
    board.update();
}

function ode() {
    return JXG.Math.Numerics.rungeKutta('heun', [P1.Y(), P2.Y()], [P1.X(), P1.X() + N.Value()], 200, f);
}

var g1 = board.create('curve', [[0], [0]], { strokeColor: 'red', strokeWidth: 2, name: 'y_1' });
var g2 = board.create('curve', [[0], [0]], { strokeColor: 'black', strokeWidth: 2, name: 'y_2' });

g1.updateDataArray = function() {
    var data = ode(), // Solve the differential equation system
        h = N.Value() / 200,
        i;

    // Plot curve by copying the data from ode() to this.dataX and this.dataY
    this.dataX = [];
    this.dataY = [];
    for (i = 0; i < data.length; i++) {
        this.dataX[i] = P1.X() + i * h;
        this.dataY[i] = data[i][0];
    }
};

g2.updateDataArray = function() {
    var data = ode(), // Solve the differential equation system
        h = N.Value() / 200,
        i;

    // Plot curve by copying the data from ode() to this.dataX and this.dataY
    this.dataX = [];
    this.dataY = [];
    for (i = 0; i < data.length; i++) {
        this.dataX[i] = P2.X() + i * h;
        this.dataY[i] = data[i][1];
    }
};
doIt();
