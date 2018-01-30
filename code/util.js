function Util () {};

// Math utility functions
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
    return Math.atan2(end.y - start.y, end.x - start.x); //returns radians, in range (PI, PI], with 0 radians pointing to the right
}
Util.clamp = function(value, minimum, maximum) {
    return Math.max( Math.min(value, maximum), minimum);
}
Util.isAngleBetween = function(N,a,b){
	// From: https://stackoverflow.com/a/29721295/1278023
	// Add Math.PI to all angles so they're in the range 0 to Math.PI * 2 
	N += Math.PI;
	a += Math.PI;
	b += Math.PI;

	if(a < b)
		return a <= N && N <= b;
	return a <= N || N <= b;
}

// State saving utility functions
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
Util.gcd = function(a, b) {
    return !b ? a : Util.gcd(b, a % b);
}
Util.lcm = function(a, b) {
    return (a*b) / Util.gcd(a, b);
}

