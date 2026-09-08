var start = -4,
    end = 4,
    x = start,
    step = 0.2,
    turtle = board.create('turtle', [x, f(x)]);

var moveForward = function() {
    x += step;
    if (x > end) {
        return;
    }
    turtle.moveTo([x, f(x)]);
    setTimeout(moveForward, 200); // delay by 200 ms
};

turtle.hideTurtle(); // Hide the turtle arrow
moveForward(); // Start the drawing
