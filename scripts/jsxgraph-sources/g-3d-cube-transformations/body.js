// Slider for rotations
        var alpha = board.create('slider', [[-7, -6], [2, -6], [0, 0, 2 * Math.PI]], { name: 'α' });
        var beta = board.create('slider', [[-7, -6.5], [2, -6.5], [0, 0, 2 * Math.PI]], { name: 'β' });
        var gamma = board.create('slider', [[-7, -7], [2, -7], [0, 0, 2 * Math.PI]], { name: 'γ' });

        // 3D view
        var bound = [-5, 5];
        var view = board.create('view3d',
            [[-6, -2], [8, 8],
            [bound, bound, bound]],
            {
                projection: 'parallel',
                trackball: { enabled: true },
                depthOrder: {
                    enabled: true
                },
                xPlaneRear: { visible: false },
                yPlaneRear: { visible: false }
            });

        // Cube
        var r = 2;
        var cube = view.create('polyhedron3d', [
            {
                a: [-r, -r, -r],
                b: [r, -r, -r],
                c: [r, r, -r],
                d: [-r, r, -r],
                e: [-r, -r, r],
                f: [r, -r, r],
                g: [r, r, r],
                h: [-r, r, r]
                },
                [
                    ['a', 'b', 'c', 'd'],
                    ['a', 'b', 'f', 'e'],
                    ['b', 'c', 'g', 'f'],
                    ['c', 'd', 'h', 'g'],
                    ['d', 'a', 'e', 'h'],
                    ['e', 'f', 'g', 'h']
                ]
            ], {
            fillColorArray: ['white', 'blue', 'red', 'green', 'orange', 'yellow'],
            fillOpacity: 0.9
        });

        // Add transformations
        var t1 = view.create('transform3d', [() => alpha.Value()], { type: 'rotateX' });
        var t2 = view.create('transform3d', [() => beta.Value()], { type: 'rotateY' });
        var t3 = view.create('transform3d', [() => gamma.Value()], { type: 'rotateZ' });
        cube.addTransform(cube, [t1, t2, t3]);
