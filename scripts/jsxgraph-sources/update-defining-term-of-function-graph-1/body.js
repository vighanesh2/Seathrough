// Initial plot of the graph
var f = board.jc.snippet(document.getElementById('term_input').value, true, 'x');
var graph = board.create('functiongraph', [f]);

// Glider on curve
var p = board.create('glider', [1, 0, graph], {face: '<>', size: 5, name: 'P'});
// Tangent in P
var t = board.create('tangent', [p]);
// Slope triangle in P
var st = board.create('slopetriangle', [t]);

// Update the defining term
var updateTerm = function() {
    // Redefine function f according to the current text field value
    f = board.jc.snippet(document.getElementById('term_input').value, true, 'x');

    // Change the Y attribute of the graph to the new function 
    graph.Y = f;
    board.update();
};
