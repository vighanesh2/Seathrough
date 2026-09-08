var f = board.create('slider', [[1, 8], [6, 8], [0, 4, 8]]);
 var len = board.create('slider', [[1, 7], [6, 7], [0, 2, 8]], { snapWidth: 0.2, name: 'len' });
 var k = board.create('slider', [[1, 6], [6, 6], [0, 2, 12]], { snapWidth: 1, name: 'k' });

 var c = board.create('curve', [
     (phi) => f.Value() * Math.cos(k.Value() * phi), // polar curve term
     [0, 0], // center
     0, // start phi
     () => len.Value() * Math.PI // end phi
], { curveType: 'polar', strokewidth: 2 });
