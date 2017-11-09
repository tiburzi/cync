//All the main js code runs here
window.onload = function() {
<<<<<<< HEAD
<<<<<<< HEAD
    
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
=======
    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
>>>>>>> ba66f0a914d4173e56700eee97b94e672ea977e0
=======
    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
>>>>>>> ba66f0a914d4173e56700eee97b94e672ea977e0

    function Init(){
        // Initialize everything here 

         // Make an instance of two and place it on the page.
        var elem = document.getElementById('main-container');
        var params = { fullscreen: true };
        two = new Two(params).appendTo(elem);
    }
    
    function CreateCircle(radius){
        /* This should create a circle that: 
            - Can be resized by dragging
            - Can be destroyed by dragging to the center
            - Probably has other properties associated with it later (like dragging a sample onto it)
        */
        var circle = two.makeCircle(two.width / 2, two.height / 2, radius);
        circle.fill = 'none';
        circle.stroke = '#6b6b6b';
        circle.linewidth = 6;

        $(document).ready(function() {
            addInteractivity(circle);
        });

        return circle;
    }
   
    Init();
    
    
    CreateCircle(50);
    CreateCircle(100);

    
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


    // Our main update loop!
    function update() {
        // Tween's own update
        TWEEN.update();
        // Two's own update
        two.update();
        // Our own update goes here

        // Ask the browser to run this on the next frame please
        requestAnimationFrame( update );
    }

    update();
}

