var i, j, step, f,
    list = [];

var c = board.create('slider', [[1, 4.5], [4, 4.5], [1, 1, 5]]);
f = (x, y) => Math.sin(c.Value() * x) * Math.cos(c.Value() * y);

step = 0.5;
for (i = -4; i <= 4; i += step) {
    for (j = -4; j <= 4; j += step) {
        list.push(board.create('point', [i, j], {
            face: '[]',
            withLabel: false,
            highlight: false,
            strokeWidth: 0,
            name: '',
            size: (self) => 2 + 8 * Math.abs(f(self.X(), self.Y())),
            fillColor: (self) => (f(self.X(), self.Y()) >= 0) ? '#0000ff50' : '#ff000050'
        }));
    }
}
