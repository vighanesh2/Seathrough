var R = 2.0;
var r = board.create('slider',[[-3,4],[3,4],[-5,1,5]],{name:'r'});
var a = board.create('slider',[[-3,3],[3,3],[-5,1,5]],{name:'a'});

var c = board.create('curve',[
     function(t){ 
        var r1 = Math.round(100.0*r.Value())/100.0; 
        var a1 = Math.round(100.0*a.Value())/100.0; 
        return (R-r1)*Math.cos(r1/R*t)+a1*Math.cos((1-r1/R)*t); 
     },
     function(t){ 
        var r1 = Math.round(100.0*r.Value())/100.0; 
        var a1 = Math.round(100.0*a.Value())/100.0; 
        return (R-r1)*Math.sin(r1/R*t)+a1*Math.sin((1-r1/R)*t); 
     }, 
     -40*Math.PI,40*Math.PI
     ], {strokeWidth:3, strokeColor:'#3355ff', strokeOpacity:0.7});
