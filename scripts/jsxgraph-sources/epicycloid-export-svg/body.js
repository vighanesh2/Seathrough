var c1 = 0.6;
var c2 = 0.0;
var f1 = 7;
var f2 = 17;

var cb = board.create('curve', [
    (t) => Math.cos(t) + c1 * Math.cos(f1 * t) + c2 * Math.cos(f2 * t),
    (t) => Math.sin(t) + c1 * Math.sin(f1 * t) + c2 * Math.sin(f2 * t),
    0, 2.02 * Math.PI
], {strokeWidth:4, strokeColor: 'blue', shadow: true});

var cw = board.create('curve', [
    (t) => Math.cos(t) + c1 * Math.cos(f1 * t) + c2 * Math.cos(f2 * t),
    (t) => Math.sin(t) + c1 * Math.sin(f1 * t) + c2 * Math.sin(f2 * t),
    0, 2.02 * Math.PI
], {strokeWidth: 2, strokeColor: 'white'});

// Export to SVG
var toSVG = function(board) {
    var svgRoot = board.renderer.svgRoot, 
        svg;
    
    svgRoot.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgRoot.setAttribute("width", board.canvasWidth);
    svgRoot.setAttribute("height", board.canvasHeight);
    svg = new XMLSerializer().serializeToString(svgRoot);
    document.getElementById('svgout').value = svg.replace(/>/g, '>\n');
}
