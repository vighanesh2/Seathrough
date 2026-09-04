var A = board.create('point', [1, Math.exp(1)]);
var graph = board.create('functiongraph', [
         function(x) {
             var a = Math.log(A.Y()) / A.X();
             return Math.exp(a * x);
         }]);
           
var txt = board.create('text', [-3, 10, 
        () => 'a = ' + (Math.log(A.Y()) / A.X()).toFixed(2)], 
        {fontSize: 16,
         fixed: true});
