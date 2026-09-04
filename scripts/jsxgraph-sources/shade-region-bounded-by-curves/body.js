// 1.  We need the mutual intersections of the curves.
// However, only one intersection is not obvious.
// Numerically compute intersection of the first two curves, 'sqrt(x^2-1)' and '0.707*x'
var diff = x => Math.sqrt(x * x - 1) - 0.707 * x;
var x_intersect = JXG.Math.Numerics.root(diff, 1.5);

// 2. Plot curves only up to the mutual intersections
// We use JessieCode for the function terms
var curve1 = board.create('functiongraph', ['0', 0, 1]);
var curve2 = board.create('functiongraph', ['sqrt(x^2-1)', 1, x_intersect]);
var curve3 = board.create('functiongraph', ['0.707*x', 0, x_intersect]);

// 3. Plot a filled curve which starts at (0,0), contains all points of 'sqrt(x^2-1)'
// and is closed by adding (0,0) at the end.
var curve = board.create('curve', [[], []], { strokeWidth: 3, fillColor: 'yellow', fillOpacity: 0.3 });
curve.updateDataArray = function() {
    // Start with (0, 0)
    this.dataX = [0];
    this.dataY = [0];

    // Copy all points from curve2
    this.dataX = this.dataX.concat(curve2.points.map(p => p.usrCoords[1]));
    this.dataY = this.dataY.concat(curve2.points.map(p => p.usrCoords[2]));

    // Close the curve by adding (0,0)
    this.dataX.push(0);
    this.dataY.push(0);
};
board.update();
