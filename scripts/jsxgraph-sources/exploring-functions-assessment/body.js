// function graph

let f = board.create('functiongraph', [input[input.length - 1]], {
    strokeWidth: 2
});

// interval bar with green separator box

let A = board.create('point', [xMin, yBar], {
    fixed: true,
    visible: false
});
let B = board.create('point', [xStore, yBar], {
    fixed: true,
    visible: false
});
let s = board.create('segment', [A, B], {
    fixed: true,
    strokeWidth: 20,
    strokeColor: '#ffffff',
    highLight: false
});
let store = board.create('segment', [[xStore, yBar - padding / 2], [xStore, yBar + padding / 2]], {
    fixed: true,
    strokeWidth: 30,
    linecap: 'round',
    strokeColor: '#66cc33',
    highLight: false
});

//  separator handling

let G = [];
let P = [];
let coordsX = [];
let interval = [];
let sCount = (input.length - 7) / 2;

for (let i = 0; i < sCount; i++) {
    G[i] = board.create('glider', [input[6 + i * 2], 0, s], {
        name: '',
        face: '|',
        size: 10,
        strokeWidth: 3,
        strokeColor: '#000000',
        highlight: false,
        showInfoBox: false
    });
    G[i].on('drag', function (e) {
        sortSeparators();
    });
}

// all separators including begin and end separators

P.push(A);
for (let i = 0; i < G.length; i++)
    P.push(G[i]);
P.push(B);

// sort separators

let sortSeparators = function () {
    for (let i = 0; i < P.length; i++)
        coordsX[i] = P[i].X();
    coordsX.sort(function (a, b) {
        return a - b;
    });
    document.getElementById('outputID').innerHTML = output();
}

sortSeparators();

// create separators

for (let i = 0; i < P.length; i++) {
    let Pi = board.create('point', [() => {
        return coordsX[i];
    }, yBar], {visible: false});
    let Pi1 = board.create('point', [() => {
        return coordsX[i + 1];
    }, yBar], {visible: false});
    let l = board.create('segment', [Pi, Pi1], {strokeColor: '#cccccc', highlight: false, strokeWidth: 20});
    let n = board.create('segment', [[() => {
        return coordsX[i];
    }, xMin], [() => {
        return coordsX[i];
    }, xMax]], {
        strokeColor: '#999999', dash: 2, strokeWidth: 1, point1: {visible: false}, visible: () => {
            return (Math.abs(coordsX[i] - xStore) > 0.5 ? true : false);
        }
    });
    let m = board.create('segment', [[() => {
        return (Pi.X() + Pi1.X()) / 2;
    }, yBar - padding / 4], [() => {
        return (Pi.X() + Pi1.X()) / 2;
    }, yBar + padding / 4]], {name: '', visible: false});
    interval[i] = board.create('glider', [0, yBar + input[5 + i * 2] * padding, m], {
        name: '',
        face: '-',
        size: 6,
        strokeWidth: 3,
        strokeColor: '#000000',
        fillColor: '#000000',
        snapToGrid: true,
        highlight: false,
        snapToPoint: true,
        showInfoBox: false,
        visible: () => {
            return (l.L() > 1 ? true : false);
        }
    });
    let p = board.create('polygon', [[() => {
        return Pi.X();
    }, yMax], [() => {
        return (Pi1.X() == xStore ? xMax : Pi1.X());
    }, yMax], [() => {
        return (Pi1.X() == xStore ? xMax : Pi1.X());
    }, yMin], [() => {
        return Pi.X();
    }, yMin]], {
        highlight: false,
        strokeWidth: 20,
        vertices: {visible: false},
        borders: {visible: false},
        visible: () => {
            return (Pi.X() == xStore ? false : true);
        }
    });
    let t = board.create('text', [() => {
        return coordsX[i + 1];
    }, yBar - padding, () => {
        return ' ' + (i + 1) + ' ';
    }], {
        cssStyle: 'border: solid 2px black; padding: 2px 5px 2px 5px; background-color: #ffffff; margin: ' + (padding / 2) + 'px 0px 0px -10px; border-radius: 15px;',
        anchorX: 'left',
        anchorY: 'middle'
    });
    l.setAttribute({
        strokeColor: () => {
            return (interval[i].Y() != yBar ? (interval[i].Y() > yBar ? '#99ccff' : '#ffcccc') : '#cccccc');
        }
    });
    interval[i].setAttribute({
        strokeColor: () => {
            return (interval[i].Y() != yBar ? (interval[i].Y() > yBar ? '#0000ff' : '#ff0000') : '#666666');
        }
    });
    t.setAttribute({
        visible: () => {
            return (l.L() > 0.6 & (Math.abs(coordsX[i + 1] - xStore) > 1) ? true : false);
        }
    });
    p.setAttribute({
        fillColor: () => {
            return (interval[i].Y() != yBar ? (interval[i].Y() > yBar ? '#99ccff' : '#ffcccc') : '#ffffff');
        }
    });
    interval[i].on('drag', function (e) {
        sortSeparators();
    });
}

// output data for LMS, additional binding to LMS necessary

function output () {
    let out = [];
    let i = 0;
    while (coordsX[i] < xStore) {
        out.push(Math.round(coordsX[i] * Math.pow(10, digits)) / Math.pow(10, digits));
        try {
            let x = interval[i].Y() - yBar;
            if (x > 0)
                out.push(1);
            else if (x < 0)
                out.push(-1);
            else
                out.push(0);
        } catch (e) {
        }
        i++;
    }
    out.push(xMax);
    return out;
}
