var view = board.create('view3d',
    [
        [-6, -3],
        [8, 8], // 2D box of view
        [
            [-5, 5],
            [-5, 5],
            [-5, 5]
        ]
    ], // 3D bounding cube
    {});

// Point A (free point)                       
var p = view.create('point3d', [1, 1, 2], {size: 5, name:'A'});

view.create('line3d', [p, [1, 0, 0],  [0, () => -p.X() - 5]], {dash: 1});
view.create('line3d', [p, [0, 1, 0],  [0, () => -p.Y() - 5]], {dash: 1});
view.create('line3d', [p, [0, 0, 1],  [0, () => -p.Z() - 5]], {dash: 1});
