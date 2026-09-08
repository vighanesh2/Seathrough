// Create custom axes
    board.create('axis', [[0, 0], [0, 1]]); // Vertical axis
    board.create('axis', [[0, 400], [1, 400]]); // Horizontal axis

    // The original data
    board.create('curve', [datax, data], { strokeColor: 'gray', dash: 2 }); // plot the observed data

    var alpha = board.create('slider', [[10, 520], [100, 520], [0, 0.1, 1.0]], { name: 'α' });
    var gamma = board.create('slider', [[10, 510], [100, 510], [0, 0.1, 1.0]], { name: 'γ' });

    // The double exponential smoothing
    var estimate = board.create('curve', [[0], [0]]); // The filtered curve
    estimate.updateDataArray = function() {
        var t,
            a = alpha.Value(), // Read the slider value of alpha
            g = gamma.Value(), // Read the slider value of gamma 
            S = data[0], // Set the inital values for S and b
            b = data[1] - data[0],
            S_new;

        this.dataX[0] = 0;
        this.dataY[0] = S;
        for (t = 1; t < data.length; t++) {
            S_new = a * data[t] + (1 - a) * (S + b);
            b = g * (S_new - S) + (1 - g) * b;
            this.dataX[t] = t;
            this.dataY[t] = S_new;
            S = S_new;
        }
    }
    board.update(); // This is necessary to trigger the first computation of the filtered curve.
