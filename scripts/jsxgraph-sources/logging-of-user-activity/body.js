var A = board.create('point', [-4, 0], { name: 'A' });
var B = board.create('point', [1, 2], { name: 'B' });

var showUserLog = function() {
    var txt = '';
    
    for (let i = 0; i < board.userLog.length; i++) {
        txt += JSON.stringify(board.userLog[i]) + '\n';
    }
    document.getElementById('userLog').value = txt;
};
