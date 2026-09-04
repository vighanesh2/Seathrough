board.on('move', function(evt) {
    if (this.isSketching[0]) {
        // Access the first curve by e.g. 
        // console.log(this.sketch.dataX.length);
    }
});

board.on('up', function(evt) {
    // Access the two curves by e.g. 
    // Finger 1:
    if (this.isSketching[0] && this.sketches[0]) {
        // console.log(this.sketches[0].dataX.length);
    }
    // Finger 2:
    if (this.isSketching[1] && this.sketches[1]) {
        // console.log(this.sketches[1].dataX.length);
    }
});

var txt = board.create('text', [1, 8, 'Start sketching into the board']);
