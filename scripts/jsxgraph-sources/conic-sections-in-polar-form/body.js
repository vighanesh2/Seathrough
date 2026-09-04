var p = board.create('slider', [
    [2, 8],
    [6, 8],
    [0, 3, 6]
], {
    name: 'p'
});

var eps = board.create('slider', [
    [2, 7],
    [6, 7],
    [-6, 0.5, 6]
], {
    name: '&epsilon;'
});

var len = board.create('slider', [
    [2, 6],
    [6, 6],
    [0, 3, 6]
], {
    name: 'len'
});

var rho = board.create('slider', [
    [2, 5],
    [6, 5],
    [0, 0, 2 * Math.PI]
], {
    name: '&rho;'
});

var f = board.create('curve',
    [function(phi) {
            return p.Value() / (1 - eps.Value() * Math.cos(phi + rho.Value()));
        },
        [1, 0], 0,
        function() {
            return len.Value() * Math.PI
        }
    ], {
        curveType: 'polar',
        strokewidth: 2,
        strokeColor: '#CA7291'
    }
);

// Show tangent:
var q = board.create('glider', [f], {
    style: 6,
    name: 'G'
});
board.create('tangent', [q], {
    dash: 3
});

// Show the curve term
board.on('update', function() {
    var _p = (p.Value()).toFixed(1),
 _eps = (eps.Value()).toFixed(1),
_rho = (rho.Value()).toFixed(1);

    document.getElementById('output').innerHTML =  `r = ${_p} / (1 - (${_eps})*cos(&phi;+${_rho})`;
});
