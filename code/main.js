//All the main js code runs here
window.onload = function() {

    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
    var Circles = [];

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
            addInteractionDrag(circle);
        });

        Circles.push(circle);

        circle.update = function(){
            // For updating anything about the circle
        }
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

          var x = e.clientX - offset.x - localClickPos.x;
          var y = e.clientY - offset.y - localClickPos.y;
          var point = {x:e.clientX,y:e.clientY};
          var center = {x:two.width / 2,y:two.height / 2};
          var dist = Math.sqrt(Math.pow(point.x - center.x,2) + Math.pow(point.y - center.y,2));

          var newRadius = dist;

          _.each(shape.vertices, function(v) {
             v.setLength(newRadius);
          });


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
        for(var i=0;i<Circles.length;i++)
            Circles[i].update();

        // Ask the browser to run this on the next frame please
        requestAnimationFrame( update );
    }

    update();
}

