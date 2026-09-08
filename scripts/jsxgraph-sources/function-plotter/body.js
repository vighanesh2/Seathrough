var f, curve; // global objects

var plotter = function() {
  var txtraw = document.getElementById('input').value;
  f = board.jc.snippet(txtraw, true, 'x', true);
  curve = board.create('functiongraph',[f], {name:txtraw, withLabel:true});
};

var clearAll = function() {
    
    board =
