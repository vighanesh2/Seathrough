var isPlaying = false;
var starttime = 0;
var timeElapsed = 0;
var interval;

var p = board.create('point',
    [() => Math.cos(timeElapsed), () => Math.sin(timeElapsed)]
);

function playing() {
    timeElapsed = (Date.now() - starttime) / 1000;
    board.update();
}

function play() {
    if (!isPlaying) {
        starttime = Date.now();
        isPlaying = true;
        interval = setInterval(playing, 50);
    }
}

function resetAnimation() {
    clearInterval(interval);
    timeElapsed = 0;
    isPlaying = false;
    board.update();
}
