var point = board.create('point', [1, 1], {
    size: 10
});

var txt = board.create('text', [-3, 3, 'Right click'], {
    fontSize: 24,
    visible: false
});

point.on('up', (evt) => {
    // Check for right button
    if (evt.button === 2) {
        // Show text
        txt.setAttribute({
            visible: true
        });
        // Hide text after two seconds
        setTimeout(() => txt.setAttribute({
            visible: false
        }), 2000);
    }
});
