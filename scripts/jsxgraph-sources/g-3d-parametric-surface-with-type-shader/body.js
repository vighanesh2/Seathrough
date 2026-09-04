var view = board.create('view3d',
		    [
		        [-6, -3], [8, 8],
		        [[-5, 5], [-5, 5], [-5, 5]]
		    ],
    {
        projection: 'central',
        axesPosition: 'center'
    });

var b = 1;
var c = view.create('parametricsurface3d', [
		            (u, v) => b * (1 - Math.sin(u)) * Math.cos(u) + (2 - Math.cos(u)) * Math.cos(v)
		                *
    (2 * Math.exp(-Math.pow(u / 2 - Math.PI, 2)) - 1),
		            (u, v) => (2 - Math.cos(u)) * Math.sin(v),
		            (u, v) => 4 * Math.sin(u) + 0.5 * (2 - Math.cos(u)) * Math.sin(u) * Math.cos(v) *
		                Math.exp(-Math.pow(u - 3 * Math.PI / 2, 2)),
		            [0, 2 * Math.PI],
		            [0, 2 * Math.PI],
		        ], {

    type: 'shader', // 'wireframe', 'shader', 'colormap', 'colorarray'
    tiling: 'rectangle', // 'triangle', 'rectangle',
    stepsU: 16,
    stepsV: 25,

    polyhedron: {
        fillOpacity: 0.7,

        // shader: {
        //   fixed: true,    // If false, update shading during rotation of viewport
        //   type: 'angle',  // 'angle', otherwise zIndex
        //   hue: 60, // yellow
        //   saturation: 90,
        //   minLightness: 30,
        //   maxLightness: 90,
        //   light: {
        //     type: 1, // 1: lighting==camera,
        //              2: Fixed: angle(light, object),
        //              3: Fixed: angle(light, camera) (default)
        //              az: -45, // ignored for type==1
        //              el: 20, // ignored for type==1
        //              bank: 0, // ignored for type==1, type==3
        //              dir: -1 // -1, 0 (use abs), 1: Default: -1
        // }
        shader: {
            fixed: true,
            type: 'angle',
            hue: 20,
            saturation: 90,
            minlightness: 50,
            maxLightness: 80,
            light: { dir: 1 }
        }
    }
});
