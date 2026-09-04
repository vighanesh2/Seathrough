var fun = board.create('functiongraph', ['0.5 * x * x + 1'], { strokeColor: 'black' });
    var funterm = board.create('text', [-3, 6, '\\(\\frac{1}{2}x^2 + 1\\)'], { fontSize: 16 });

    var B = board.create('glider', [1, 1.5, fun], { name: 'B', label: { autoPosition: true } });
    var P = board.create('glider', [3.5, 6.5, fun], { name: 'P', color: JXG.palette.blue, label: { autoPosition: true } });

    // Projection to x axis

    var seg1 = board.create('segment', [
      B, [() => B.X(), 0]
    ], {
      strokeColor: '#888', dash: 2, strokeWidth: 1,
      point2: {
        visible: false, size: 1,
      },
      withLabel: true,
      name: '\\(f(x_0)\\)',
      label: { position: 'last', offset: [5, 30] }
    });

    var seg2 = board.create('segment', [
      P, [() => P.X(), 0]
    ], {
      strokeColor: '#888', dash: 2, strokeWidth: 1,
      point2: {
        visible: false, size: 1
      },
      withLabel: true,
      name: '\\(f(x)\\)',
      label: { position: 'last', offset: [5, 30] }
    });
    var x0 = board.create('text', [() => B.X(), -0.1, '\\(x_0\\)'], {
      anchorY: 'top',
      anchorX: 'middle'
    });
    var x = board.create('text', [() => P.X(), -0.1, '\\(x\\)'], {
      anchorY: 'top',
      anchorX: 'middle'
    });

    // Secant and tangent

    var sek = board.create('line', [B, P], {
      strokeWidth: 2,
      name: 'secant',
      withLabel: true,
      label: { position: 'rt', offset: [-5, -20], color: JXG.palette.blue }
    });
    var tan = board.create('tangent', [B], {
      strokeColor: 'red',
      strokeWidth: 2,
      name: 'tangent',
      withLabel: true,
      label: { position: 'rt', offset: [-5, -40], color: JXG.palette.red }
    });

    // Slope triangles

    // Horizontal line

    var h1 = board.create('segment', [B, [() => P.X(), () => B.Y()]], {
      strokeColor: JXG.palette.red,
      withLabel: true,
      name: '\\(\\Delta x=dx\\)',
      label: { position: 'llft', offset: [20, -12] }
    });

    // Vertical lines:

    var v1 = board.create('segment', [
      [() => P.X() + 0.03, () => B.Y()],
      [() => P.X() + 0.03, () => tan.Slope() * (P.X() - B.X()) + B.Y()]
    ], {
      strokeColor: JXG.palette.red,
      strokeWidth: 2,
      withLabel: true,
      name: '\\(dy\\)',
      label: { offset: [5, 5], color: 'red' }
    });
    var v2 = board.create('segment', [
      [() => P.X(), () => B.Y()],
      [() => P.X(), () => P.Y()]
    ], {
      strokeColor: JXG.palette.blue,
      strokeWidth: 2,
      withLabel: true,
      name: '\\(\\Delta y\\)',
      label: { offset: [5, 30], color: 'blue' }
    });

    // Texts:

    var t1 = board.create('text', [
      8, 3, () => 'Tangent slope (differential quotient): \\[\\frac{dy}{dx} = \\lim_{x\\to x_o}\\frac{f(x)-f(x_0)}{x-x_0} =' + tan.Slope().toFixed(2) + '\\]'
    ], {
      anchorY: 'top',
      color: JXG.palette.red
    });

    var t2 = board.create('text', [
      8, 6, () => 'Secant slope (difference quotient): \\[\\frac{\\Delta y}{\\Delta x} = \\frac{f(x)-f(x_0)}{x-x_0} =' + sek.Slope().toFixed(2) + '\\]'
    ], {
      anchorY: 'top',
      color: JXG.palette.blue
    });
