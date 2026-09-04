var s = board.create('slider', [
    [1, 8],
    [4, 8],
    [1, 1, 1.5]
], {
    name: 'S',
    strokeColor: 'black',
    fillColor: 'white'
});
var f = [function() {
        return (s.Value() * 4.5).toFixed(2);
    },
    () => (s.Value() * (-1)).toFixed(2),
    () => (s.Value() * 3).toFixed(2),
    () => (s.Value() * 2).toFixed(2),
    () => (s.Value() * (-0.5)).toFixed(2),
    () => (s.Value() * 5.5).toFixed(2),
    () => (s.Value() * 2.5).toFixed(2),
    () => (s.Value() * (-0.75)).toFixed(2),
    () => (s.Value() * 3.5).toFixed(2),
    () => (s.Value() * 2).toFixed(2),
    () => (s.Value() * (-1.25)).toFixed(2)
];

var colors = ['#8E1B77', '#BE1679', '#DC1765', '#DA2130', '#DB311B', '#DF4917', '#E36317', '#E87F1A', '#F1B112', '#FCF302', '#C1E212'];
var chart = board.create('chart', [f], {
    chartStyle: 'bar',
    width: 0.8,
    labels: f,
    colors: colors,
    shadow: true
});

// Legend
var leg = board.create('legend', [10, 8.5], {
    labels: f,
    colorArray: colors
});

// Line and point chart
var dataArr = [4, 1, 3, 2, 5, 6.5, 1.5, 2, 0.5, 1.5, -1];
var chart2 = board.create('chart', dataArr, {
    chartStyle: 'line,point',
    shadow: true
});

// Add shadows to the bar chart.
chart2[0].setAttribute({strokeColor:'black', strokeWidth:3});

for (let i = 0; i < 11; i++) {
    chart2[1][i].setAttribute({
        strokeColor: 'black',
        fillColor: 'white',
        face: '[]',
        size: 4,
        strokeWidth: 2
    });
}
