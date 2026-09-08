var w = board.create('slider', [[0, 8], [0.8, 8], [0, 0.25, 1.5]], {
     name: 'w',
     snapWidth: 0.01,
     snapValues: [0.5, 0.25],
     snapValueDistance: 0.1
 });
 var N = board.create('slider', [[0, 7], [0.8, 7], [0, 5, 40]], { name: 'N' });
 var s = function(x) { return Math.abs(x - Math.round(x)); };
 var c = board.create('functiongraph', [
     function(x) {
         var n, su, wval;
         su = 0.0;
         wval = w.Value();
         for (n = 0; n < N.Value(); n++) {
             su += Math.pow(wval, n) * s(Math.pow(2, n) * x);
         }
         return su;
     },
     0, 1], { strokeColor: 'red' });
