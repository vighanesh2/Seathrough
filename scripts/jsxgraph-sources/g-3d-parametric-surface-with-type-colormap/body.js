var view = board.create('view3d',
		    [
		        [-6, -3], [8, 8],
		        [[-5, 5], [-5, 5], [-5, 5]]
		    ],
    {
        projection: 'central',
        axesPosition: 'center'
    });

var F = (x, y) => 3 * Math.sin(Math.sqrt(x ** 2 + y ** 2));

var box = [-5, 5];
var c = view.create('functiongraph3d', [F, box, box], {
    stepsU: 40,
    stepsV: 40,
    tiling: 'rectangle',
    type: 'colormap',
    colormap: {
        min: [-3.5, 240],
        max: [3.5, 0],
        s: 0.7,
        v: 0.9
    },
    polyhedron: {
        strokeWidth: 0.3,
        fillOpacity: 1
    }
});
