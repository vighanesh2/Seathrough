var t0 = board.create("text", [3.5, 7.5, "Peripheriewinkel"], {
    strokeColor: "#60513e",
    fontSize: 24,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var A = board.create("point", [4.5, 4.5], {
    name: "A",
    label: {
        offset: [-30, 30],
        strokeColor: "#60513e",
        fontSize: 24,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    strokeWidth: 3,
    strokeColor: "#60513e",
    fillColor: "#60513e",

    face: "x",
    size: 6,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var B = board.create("point", [8.5, 3], {
    name: "B",
    label: {
        offset: [10, -5],
        strokeColor: "#60513e",
        fontSize: 24,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    strokeWidth: 3,
    strokeColor: "#60513e",
    fillColor: "#60513e",
    face: "x",
    size: 6,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var C = board.create("point", [8, 7], {
    name: "C",
    label: {
        offset: [-10, 30],
        strokeColor: "#60513e",
        fontSize: 24,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    strokeWidth: 3,
    strokeColor: "#60513e",
    fillColor: "#60513e",
    face: "x",
    size: 6,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var c = board.create("circle", [A, B, C], {
    name: "",
    withLabel: false,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var ad = board.create("segment", [B, C], {
    name: "a",
    withLabel: false,
    strokeColor: "#60513e",
    strokeWidth: 2,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var bd = board.create("segment", [A, C], {
    name: "b",
    withLabel: false,
    strokeColor: "#60513e",
    strokeWidth: 2,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var cd = board.create("segment", [A, B], {
    name: "c",
    withLabel: false,
    strokeColor: "#60513e",
    strokeWidth: 2,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});

var D = board.create("glider", [5, 1, c], {
    name: "D",
    label: {
        offset: [-25, -20],
        strokeColor: "#60513e",
        fontSize: 24,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    strokeWidth: 3,
    strokeColor: "#60513e",
    fillColor: "#60513e",
    face: "x",
    size: 6,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var aD = board.create("segment", [A, D], {
    name: "",
    withLabel: false,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var bD = board.create("segment", [B, D], {
    name: "",
    withLabel: false,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var cD = board.create("segment", [C, D], {
    name: "",
    withLabel: false,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var a1 = board.create("nonreflexangle", [D, C, B], {
    name: "",
    withLabel: false,
    strokeWidth: 2,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var a2 = board.create("nonreflexangle", [D, A, B], {
    name: "",
    withLabel: false,
    strokeWidth: 2,
    strokeColor: "#60513e",
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
var ABD = board.create("polygon", [A, B, D], {
    name: "Δ ABC",
    label: { offset: [0, 0] },
    borders: {
        visible: false,
        strokeWidth: 2,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    withLabel: false,
    fillOpacity: 0.82,
    fillColor: "#60513e",
    cssClass: "area handwritten",
    highlightCssClass: "handwritten areahigh"
});
var BCD = board.create("polygon", [B, C, D], {

    name: "Δ BCD",
    label: { offset: [0, 0] },
    borders: {
        visible: false,
        strokeWidth: 2,
        cssClass: "handwritten",
        highlightCssClass: "handwritten"
    },
    withLabel: false,
    fillOpacity: 0.82,
    fillColor: "#60513e",
    cssClass: "area2 handwritten",
    highlightCssClass: "handwritten areahigh"
});
var t0 = board.create("text", [4, 2, "Man veraendere Punkt D dem Kreis entlang."], {
    strokeColor: "#60513e",
    fontSize: 14,
    cssClass: "handwritten",
    highlightCssClass: "handwritten"
});
