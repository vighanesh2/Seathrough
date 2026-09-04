// bars with glider for adjustment

    let G = [];
    for (let i = 0; i < max; i++) {
        let par = board.create('segment', [[i + 1, 0], [i + 1, 100]], {name: '', fixed: true, visible: false});
        G[i] = board.create('glider', [i + 1, inputValue[i], par], {
            name: '',
            snapToGrid: true,
            face: 'minus',
            size: width / 2,
            strokeWidth: 4,
            strokeColor: '#00cc00',
            showInfoBox: false
        });
        board.create('segment', [[i + 1, 0], G[i]], {
            name: '',
            fixed: true,
            visible: true,
            strokeWidth: width,
            strokeColor: 'rgb(' + 255 * (max - i) / max + ', 0, ' + 255 * i / max + ')',
            highLightstrokeColor: 'rgb(' + 255 * (max - i) / max + ', 0, ' + 255 * i / max + ')'
        });
        board.create('text', [i + 1, -2, inputLabel[i]], {name: '', fixed: true, anchorX: 'middle'});
        G[i].on('up', function (e) {
            document.getElementById('outputID').innerHTML = output();
        });
    }

    // output data for LMS, additional binding to LMS necessary

    let output = function () {
        let out = [];
        for (let i = 0; i < max; i++)
            out.push(G[i].Y());
        return out;
    }

    // output events (only necessary for demonstration in share database, not needed in LMS)

    for (let i = 0; i < max; i++)
        G[i].on('up', function (e) {
            document.getElementById('outputID').innerHTML = output();
        });
