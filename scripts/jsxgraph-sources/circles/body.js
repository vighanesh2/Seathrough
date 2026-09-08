var a = board.create('point', [0, 0], {
        name: 'A',
        size: 4
    });
    var b = board.create('point', [2, 0], {
        name: 'B',
        size: 4
    });
    var ci = board.create('circle', ["A", "B"], {
        strokeColor: '#00ff00',
        strokeWidth: 2
    });
})();

(function() {
