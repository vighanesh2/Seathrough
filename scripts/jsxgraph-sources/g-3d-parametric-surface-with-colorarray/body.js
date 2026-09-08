var view = board.create('view3d',
		    [
		        [-6, -3], [8, 8],
		        [[-5, 5], [-5, 5], [-5, 5]]
		    ],
    {
        projection: 'central',
        axesPosition: 'center'
    });

var F = (x, y) => 0.5 * Math.abs(y * x) - 4.5;

var c = view.create('functiongraph3d', [
		            F,
		            [-4, 4],
		            [-4, 4],
		        ], {
    tiling: 'triangle',
    stepsU: 26,
    stepsV: 26,
    type: 'colorarray', // 'wireframe', 'shader', 'colormap', 'colorarray'

    polyhedron: {
        strokeWidth: 0.5,
        fillOpacity: 0.7,

        // Colors for 'colorarray':
        fillColorArray: ['white', JXG.palette.blue, JXG.palette.red]
    }
});
