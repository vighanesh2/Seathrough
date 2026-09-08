// Line y = 2x + 3 or 
// 2x - 1y + 3 = 0
var line1 = board.create('line', [3, 2, -1]); 

// Plot the area 2x - y + 3 <= 0
var ineq1 = board.create('inequality', [line1], {fillColor: 'yellow'}); 

// Vertical line x = 3 or 
// 1x + 0y - 3 = 0
var line2 = board.create('line', [-3, 1, 0], {strokeColor: 'black'}); 

// Plot the area 1x + 0y - 3 >= 0
var ineq2 = board.create('inequality', [line2], {inverse: true, fillColor: 'red'});
