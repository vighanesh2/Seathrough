var A = board.create('point', [-3,3]);
var B = board.create('point', [3,-2]);
var line = board.create('segment', [A,B]);

var height = 0.5; // height of the curly bracket

// Build the curly bracket
var crl = board.create('curve', [[0],[0]], {strokeWidth:1, strokeColor:'black'});
crl.bezierDegree = 3;

crl.updateDataArray = function() {
    var d = [B.X() - A.X(), B.Y() - A.Y()],
        dl = Math.sqrt(d[0] * d[0] + d[1] * d[1]),
        mid = [(A.X() + B.X()) * 0.5, (A.Y() + B.Y()) * 0.5];

    d[0] *= height / dl;
    d[1] *= height / dl;

    this.dataX = [ A.X(), A.X() - d[1], mid[0], mid[0] - d[1], mid[0], B.X() - d[1], B.X() ];
    this.dataY = [ A.Y(), A.Y() + d[0], mid[1], mid[1] + d[0], mid[1], B.Y() + d[0], B.Y() ];
};

// Text
var txt = board.create('text', [
                    function() { 
                        var d = [B.X() - A.X(), B.Y() - A.Y()],
                            dl = Math.sqrt(d[0] * d[0] + d[1] * d[1]),
                            mid = (A.X() + B.X()) * 0.5;

                        d[1] *= height / dl;
                        return mid - d[1] + 0.1; 
                    },
                    function() { 
                        var d = [B.X() - A.X(), B.Y() - A.Y()],
                            dl = Math.sqrt(d[0] * d[0] + d[1] * d[1]),
                            mid = (A.Y() + B.Y()) * 0.5;

                        d[0] *= height / dl;
                        return mid + d[0] + 0.1; 
                    },
                    () => 'length=' + B.Dist(A).toFixed(2)
                ]);


board.update(); // This update is necessary to call updateDataArray the first time.
