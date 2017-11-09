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
    
    var filledCircle = two.makeCircle(two.width * .75, two.height * .75, 50);
    filledCircle.fill = 'green';
    filledCircle.linewidth = 0;
    
    var strokedCircle = two.makeCircle(two.width * .75-120, two.height * .75, 50);
    strokedCircle.fill = 'none';
    strokedCircle.stroke = 'green';
    strokedCircle.linewidth = 10;
    
    $(document).ready(function() {
        addInteractionDrag(filledCircle, dragPosition);
        addInteractionDrag(strokedCircle, dragPosition);
    });
    
    // Update the renderer in order to generate the actual elements.
    two.update();
    
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
    
    //interactivity code from https://two.js.org/examples/advanced-anchors.html
    function addInteractionDrag(shape, action) {

        var offset = shape.parent.translation; //offset of the 'two' canvas in the window (I think). not the shape's position in the window
        var localClickPos = {x: 0, y: 0};
        
        var drag = function(e) {
          e.preventDefault();
          action(); //dragPosition();
        };
        var touchDrag = function(e) {
          e.preventDefault();
          var touch = e.originalEvent.changedTouches[0];
          drag({
            preventDefault: _.identity,
            clientX: touch.pageX,
            clientY: touch.pageY
          });
          return false;
        };
        var dragStart = function(e) {
            e.preventDefault();
            localClickPos = {x: e.clientX-shape.translation.x, y: e.clientY-shape.translation.y}
            $(window)
              .bind('mousemove', drag)
              .bind('mouseup', dragEnd);
        };
        var touchStart = function(e) {
            e.preventDefault();
            var touch = e.originalEvent.changedTouches[0];
            localClickPos = {x: touch.pageX-shape.translation.x, y: touch.pageY-shape.translation.y}
            $(window)
              .bind('touchmove', touchDrag)
              .bind('touchend', touchEnd);
            return false;
        };
        var dragEnd = function(e) {
          e.preventDefault();
          $(window)
            .unbind('mousemove', drag)
            .unbind('mouseup', dragEnd);
        };
        var touchEnd = function(e) {
          e.preventDefault();
          $(window)
            .unbind('touchmove', touchDrag)
            .unbind('touchend', touchEnd);
          return false;
        };
        
        var dragPosition = function(e) {
            var x = e.clientX - offset.x - localClickPos.x;
            var y = e.clientY - offset.y - localClickPos.y;
            shape.translation.set(x, y);
        }

        $(shape._renderer.elem)
          .css({
            cursor: 'move'
          })
          .bind('mousedown', dragStart)
          .bind('touchstart', touchStart);
      }
}

