var Q = [-1, 2, 3, 3.5, 5]; // quantiles
    Q.push([6.2, 6.6, -3, -3.3, 0]); // Outliers

    var b = board.create('boxplot', [Q, 2, 4], {
        smallWidth: 1
    });
})();

// Example 2
(function() {
