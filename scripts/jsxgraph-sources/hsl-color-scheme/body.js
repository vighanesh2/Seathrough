board.create('point', [6, 3], {
    withLabel: false,
    size:10,
    highlight: false,
    color: (self) => `hsl( ${ Math.atan2(self.Y(), self.X()) * 180 / Math.PI} 95% 60%)`,
    trace: true
});
