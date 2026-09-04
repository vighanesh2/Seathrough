var A = board.create('point', [1,0]);
var B = board.create('point', [0,1]);

board.on('move', function(){
        A.moveTo([1, A.Y()]);
        B.moveTo([B.X(), 1]);
});
