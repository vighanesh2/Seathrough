var a = board.create('slider', [[1, -1], [5, -1], [0, 0.3, 1]], { name: 'a' });
 var b = board.create('slider', [[1, -2], [5, -2], [0, 0.7, 1]], { name: 'b' });
 var tau = board.create('slider', [[-5, -3], [5, -3], [0, 0, 0.5]], { name: 'τ' });

 for (var i = 0; i < 8; i++) {
     // Use closures to define the 8 curves
     (function(x) { return board.create('curve', [
            (phi) => a.Value() * Math.exp(b.Value() * (phi + Math.PI * x * 0.25 + tau.Value() * Math.PI)), 
            [0, 0], 
            -4 * Math.PI, 8 * Math.PI],
            { curveType: 'polar', strokewidth: 1 }
         );
     })(i);
 }
