var view = board.create(
    'view3d',
            [[-4, -4], [8, 8],
            [[-2, 2], [-2, 2], [-2, 2]]],
    {
        projection: 'central',
        trackball: { enabled: true },
        depthOrder: {
            enabled: true
        },
        xPlaneRear: { visible: false },
        yPlaneRear: { visible: false },
        zPlaneRear: { fillOpacity: 0.2, visible: true }
    }
);

// Basic icosahedron
let radius = 2; // Our icosahedron runs from +1 to -1
let rho = 1.6180339887;
let vertexList = [
            [0, -1, -rho], [0, +1, -rho], [0, -1, rho], [0, +1, rho],
            [1, rho, 0], [-1, rho, 0], [1, -rho, 0], [-1, -rho, 0],
            [-rho, 0, 1], [-rho, 0, -1], [rho, 0, 1], [rho, 0, -1]
        ];

// Normalize vector to length r
let scaleVertex = (v, r) => {
    let len = JXG.Math.hypot(...v);
    return [v[0] * r / len, v[1] * r / len, v[2] * r / len];
};

// Normalize initial vertices
for (let i = 0; i < vertexList.length; i++) {
    // vertexList[i] = scaleVertex(vertexList[i], radius);
}

let faceArray = [
            [4, 1, 11],
            [11, 1, 0],
            [6, 11, 0],
            [0, 1, 9],
            [11, 10, 4],
            [9, 1, 5],
            [8, 9, 5],
            [5, 3, 8],
            [6, 10, 11],
            [2, 3, 10],
            [2, 10, 6],
            [8, 3, 2],
            [3, 4, 10],
            [7, 8, 2],
            [9, 8, 7],
            [0, 9, 7],
            [4, 3, 5],
            [5, 1, 4],
            [0, 7, 6],
            [7, 2, 6]
        ];

// Midpoint between two vertices
let midPoint = (p1, p2) => [(p2[0] + p1[0]) * 0.5, (p2[1] + p1[1]) * 0.5, (p2[2] + p1[2]) * 0.5];

let newFaceArray = [];

// Iterate the construction
let iterations = 3;
for (let j = 0; j < iterations; j++) {
    newFaceArray = [];
    for (let i = 0; i < faceArray.length; i++) {
        let f = faceArray[i];

        // Three new points at the midpoint of each vertex
        let m0 = scaleVertex(midPoint(vertexList[f[1]], vertexList[f[2]]), radius);
        let m1 = scaleVertex(midPoint(vertexList[f[0]], vertexList[f[2]]), radius);
        let m2 = scaleVertex(midPoint(vertexList[f[0]], vertexList[f[1]]), radius);

        // Add the new points to the vertexList and store their positions
        let p0 = vertexList.push(m0) - 1;
        let p1 = vertexList.push(m1) - 1;
        let p2 = vertexList.push(m2) - 1;

        // Add four new faces - the three corner-to-midpoints and then all three midpoints
        newFaceArray.push([f[0], p2, p1]);
        newFaceArray.push([f[1], p0, p2]);
        newFaceArray.push([f[2], p1, p0]);
        newFaceArray.push([p0, p1, p2]);
    }
    faceArray = newFaceArray; // In case we go around again
}

var ico = view.create('polyhedron3d', [vertexList, faceArray], {
    fillColorArray: [],
    fillOpacity: 1,
    strokeWidth: 0.1,
    layer: 12,
    shader: {
        enabled: true,
        type: 'angle',
        hue: 0,
        saturation: 90,
        minlightness: 60,
        maxLightness: 80
    }
});
