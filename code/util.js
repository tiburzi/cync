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
Util.clamp = function(value, minimum, maximum) {
    return Math.max( Math.min(value, maximum), minimum);
}

Util.getParameterByName = function(name, url) {
	// Courtesy of https://stackoverflow.com/a/901144/1278023
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}