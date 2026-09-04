// Horizontal axis with polar ticks (grid lines)
var ax1 = board.create('axis', [[0, 0], [1, 0]], {
    ticks: {
        type: 'polar',   // Polar grid
        label: {            // Place the labels centered on the grid lines 
            offset: [0, -3],
            anchorX: 'middle',
            anchorY: 'top'
        }
    }
});

// Vertical axis with horizontal ticks
var ax2 = board.create('axis', [[0, 0], [0, 1]], {
    ticks: {
        majorHeight: 0,      // Do not show the grid lines 
        tickEndings: [1, 0], // Let the ticks point to the left
        label: {                    // Position of the labels
            visible: true,
            offset: [-6, 0],
            anchorY: 'middle',
            anchorX: 'right'
        }
    }
});
