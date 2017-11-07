function Util () {};
 
Util.carteToPolar = function(x, y) {
    var dis = Math.sqrt(x*x + y*y);
    var rad = Math.atan2(y, x);
    return { distance:dis, radians:rad };
}

Util.polarToCarte = function(radius, theta) {
    var xx = radius * Math.cos(theta);
    var yy = radius * Math.sin(theta);
    return { x:xx, y:yy };
}