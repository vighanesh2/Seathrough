// Create axes manually
board.create('axis', [[0, 2700], [1, 2700]]);
board.create('axis', [[0, 0], [0, 1]]);

// Customize infobox
board.highlightInfobox = function(x, y, el) {
    var date = new Date(x * 1000.0 * 60.0 * 60.0 * 24.0 + birthday.getTime());
    this.infobox.setText('<span style="color:black;font-weight:bold">' + date.getDate() + '.' + (date.getMonth() +
        1) + '.' + date.getFullYear() + ', ' + y + ' g</span>');
    this.infobox.rendNode.style.border = 'groove ' + el.visProp['strokecolor'] + ' 2px';
    this.infobox.rendNode.style.padding = '5px';
    this.infobox.rendNode.style.backgroundColor = 'white';
}

// Transform the dates into days from birthday
for (i = 0; i < table.length; i++) {
    x[i] = Math.round(((toDate(table[i][0])).getTime() - birthday.getTime()) / (1000.0 * 60.0 * 60.0 * 24.0));
    y[i] = table[i][1] * 1;
}

plotChartGoogleStyle(board, x, y, 2700);

// Plot regression polynomial of degree 2
var reg = board.create('functiongraph', [JXG.Math.Numerics.regressionPolynomial(2, x, y)], {
    strokeColor: 'black',
    dash: 3
});
