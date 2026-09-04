var seq = board.create('curve', [[], []], {strokeColor: 'blue'});
var n, a_n;

 var seq_add = function() {
    var val = a_n(n);
    seq.dataX.push(n);
    seq.dataY.push(val);
    n++;
 };

var txt1 = board.create('text', [15, 1.6, () => 'n=' + (seq.dataX.length-1) + ': value = ' + seq.dataY[seq.dataY.length - 1]], {strokeColor: 'blue'});

var timeoutHandle;

// Approximation animation
var approx = function() {
     seq_add();
     board.update();
     if (n <= 50) {
         timeoutHandle = setTimeout(approx, 500);
     }
};

// Start new approximation
var start_approx = function() {
    // JessieCode function from user input
    var txtraw = document.getElementById('input').value;
    a_n = board.jc.snippet(txtraw, true, 'n', true);

    seq.dataX = [];
    seq.dataY = [];
    n = parseInt(document.getElementById('startval').value);
    approx();
}

// Stop approximation
var clear_all = function() {
    clearTimeout(timeoutHandle);
};
