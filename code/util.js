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
Util.pointDistance = function(start, end) {
    return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
}
Util.pointDirection = function(start, end) {
    return Math.atan2(end.y - start.y, end.x - start.x); //returns radians, in range (PI, PI]
}