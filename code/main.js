//All the main js code runs here
window.onload = function() {
    
    // Make an instance of two and place it on the page.
    var elem = document.getElementById('main-container');
    var params = { fullscreen: true };
    var two = new Two(params).appendTo(elem);

    var circle = two.makeCircle(100, 100, 50);
    circle.fill = '#FF8000';
    circle.stroke = 'orangered';
    circle.linewidth = 0;
    
    var centerCircle = two.makeCircle(two.width / 2, two.height / 2, 20);
    centerCircle.fill = 'red';
    centerCircle.linewidth = 0;
    
    var styles = {
        family: 'proxima-nova, sans-serif',
        size: 50,
        leading: 50,
        weight: 900
    };

    var screenSizeText = two.makeText(Math.round(two.width) + ' x ' + Math.round(two.height), 200, 100, styles);
    screenSizeText.fill = 'black';

    //Set tween info
    TWEEN.removeAll();
    var start = { x: 100, y: 100 };
    var end = { x: 300, y: 300 };
    //var position = start;                 //Omar, why doesn't this work in js?
    var position = Object.assign({}, start);// why do you do this instead?
    var ease = TWEEN.Easing.Sinusoidal.InOut;
    var time = 1000;

    //create tweens
    var tween1 = new TWEEN.Tween(position)
        .to(end, time)
        .easing(ease)
        .onUpdate(updateCircle);
    var tween2 = new TWEEN.Tween(position)
        .to(start, time)
        .easing(ease)
        .onUpdate(updateCircle);

    //chain the tweens to produce a cyclic animation
    tween1.chain(tween2);
    tween2.chain(tween1);
    tween1.start();

    //set our update functions
    function updateCircle() {
        circle.translation.set(position.x, position.y);
    };

    function update() {
        TWEEN.update();
        two.update();
        requestAnimationFrame( update );
    }

    update();
    
    window.onresize = function() {
        screenSizeText.value = Math.round(two.width) + ' x ' + Math.round(two.height);
        centerCircle.translation.set( two.width/2, two.height/2 );
    }
}

