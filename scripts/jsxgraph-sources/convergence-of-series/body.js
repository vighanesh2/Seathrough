var series = board.create('curve', [[], []], {strokeColor: 'black'});
var n, a_n;
 
var series_add = function() {
    var val = a_n(n);
    if (series.dataY.length > 0) {
        val += series.dataY[series.dataY.length - 1];
    }
    series.dataX.push(n);
    series.dataY.push(val);
    n++;
};

var txt = board.create('text', [15, 1.8, () => 'n=' + (series.dataX.length-1) + ': value = ' + series.dataY[series.dataY.length - 1]], {strokeColor: 'blue'});

var timeoutHandle;

// Animation
var approx = function() {
     series_add();
     board.update();
     if (series.dataX.length <= 50) {
         timeoutHandle = setTimeout(approx, 500);
     }
};

// Start animation
var start_approx = function() {
    series.dataX = [];
    series.dataY = [];

    var txtraw = document.getElementById('input').value;
    a_n = board.jc.snippet(txtraw, true, 'n', true);
    n = parseInt(document.getElementById('startval').value);
    approx();
};

// Stop animation
var clear_all = function() {
    clearTimeout(timeoutHandle);
};
