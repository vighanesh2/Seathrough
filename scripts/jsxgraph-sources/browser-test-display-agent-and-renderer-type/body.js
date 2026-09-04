board.create('text', [-0.5, 2.5, function() {
    return 'userAgent: ' + navigator.userAgent;
}], {
    fontSize: 24,
    parse: false
});
board.create('text', [-0.5, 1, function() {
    return 'Renderer: ' + JXG.JSXGraph.rendererType;
}], {
    fontSize: 24
});
