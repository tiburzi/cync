//All the main js code runs here
window.onload = function() {

    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
    var Orbits = [];
    var Notes = [];
    var RADIUS_SNAP = 5;

    function Init(){
        // Initialize everything here 

         // Make an instance of two and place it on the page.
        var elem = document.getElementById('main-container');
        var params = { fullscreen: true };
        two = new Two(params).appendTo(elem);
    }
    
    function CreateOrbit(radius){
        /* This should create a orbit that: 
            - Can be resized by dragging
            - Can be destroyed by dragging to the center
            - Probably has other properties associated with it later (like dragging a sample onto it)
        */
        var X = two.width / 2;
        var Y = two.height / 2
        var orbit = two.makeCircle(X,Y, radius);
        orbit.fill = 'none';
        orbit.stroke = '#6b6b6b';
        orbit.linewidth = 6;
        orbit.radius = radius; //Just for keeping track of the radius in our own application

        $(document).ready(function() {
            addInteractionDrag(orbit);
        });

        Orbits.push(orbit);

        orbit.update = function() {
            // For updating anything about the orbit
            this.trigger.update();
        }
        
//What is this ' <<<<<<< HEAD ============ >>>>>>> 574389758463450348756435708963456 ' thing?
        
//<<<<<<< HEAD
        
        orbit.onDrag = function (e, offset, localClickPos) {
            var x = e.clientX - offset.x - localClickPos.x;
            var y = e.clientY - offset.y - localClickPos.y;
            var point = {x:e.clientX,y:e.clientY};
            var center = {x:two.width / 2,y:two.height / 2};
            var dist = Math.sqrt(Math.pow(point.x - center.x,2) + Math.pow(point.y - center.y,2));

            var newRadius = Math.round(dist / RADIUS_SNAP) * RADIUS_SNAP;

            this.radius = newRadius;
            _.each(this.vertices, function(v) {
                v.setLength(newRadius);
            });
        }
        
//=======

        // Create a triangle trigger for this orbit
        var size = 15;
        var triggerX = X;
        var triggerY = Y-radius-size - orbit.linewidth/2;
        var trigger = two.makePolygon(triggerX,triggerY, size);
        trigger.fill = 'orangered';
        trigger.stroke = 'none';
        trigger.rotation = Math.PI;
        trigger.orbit = orbit;
        orbit.trigger = trigger;

        trigger.update = function(){
            // Move trigger to the edge of the orbit based on the rotation 
            var distance = this.orbit.radius + size + this.orbit.linewidth/2
            var angle = this.rotation + Math.PI/2;
            this.translation.x = X + Math.cos(angle) * distance;
            this.translation.y = Y + Math.sin(angle) * distance ;

            this.rotation += 0.1 * (1 - (this.orbit.radius / 300));
        }


//>>>>>>> 79f3fda5ca421faf1a374cee9d2107854a1cb054
        return orbit;
    }
    
    function CreateNote(radius){
        /* This should create a note that: 
            - Can be moved onto and along an orbit by dragging
            - Has a radius proportional to its volume
        */
        var note = two.makeCircle(two.width / 2, two.height / 2, radius);
        note.fill = 'red';
        note.stroke = 'none';
        note.linewidth = 0;

        $(document).ready(function() {
            addInteractionDrag(orbit);
        });

        Notes.push(note);

        note.update = function(){
            // For updating anything about the note
        }
        return note;
    }
   
    Init();
    
    
    CreateOrbit(50);
    CreateOrbit(100);

    
    //interactivity code from https://two.js.org/examples/advanced-anchors.html
    function addInteractionDrag(shape) {

        var offset = shape.parent.translation; //offset of the 'two' canvas in the window (I think). not the shape's position in the window
        var localClickPos = {x: 0, y: 0};
        
        var drag = function(e) {
          e.preventDefault();
          shape.onDrag(e, offset, localClickPos);
            
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
        for(var i=0;i<Orbits.length;i++)
            Orbits[i].update();

        // Ask the browser to run this on the next frame please
        requestAnimationFrame( update );
    }

    update();
}

