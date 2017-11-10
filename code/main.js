//All the main js code runs here
window.onload = function() {

    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
    var Orbits = [];
    var Notes = [];
    var MAX_ORBITS = 5;
    var ORBIT_MAX_RADIUS = 300;
    var RADIUS_SNAP = ORBIT_MAX_RADIUS/MAX_ORBITS;
    var TEMPO = 60; //in beats per minute
    var CENTER = {};

    function Init(){
        // Initialize everything here 

         // Make an instance of two and place it on the page.
        var elem = document.getElementById('main-container');
        var params = { fullscreen: true };
        two = new Two(params).appendTo(elem);
        CENTER = { x:two.width / 2, y:two.height / 2 };
    }
    
    function CreateOrbit(radius){
        /* This should create a orbit that: 
            - Can be resized by dragging
            - Can be destroyed by dragging to the center
            - Probably has other properties associated with it later (like dragging a sample onto it)
        */
        var X = two.width / 2;
        var Y = two.height / 2;
        var orbit = two.makeCircle(X,Y, radius);
        orbit.fill = 'none';
        orbit.stroke = '#6b6b6b';
        orbit.linewidth = 6;
        orbit.radius = radius; //Just for keeping track of the radius in our own application
        orbit.notes = [];

        $(document).ready(function() {
            addInteractionDrag(orbit);
        });

        Orbits.push(orbit);

        orbit.update = function() {
            // For updating anything about the orbit
            this.trigger.update();
        }
        
//Omar, what is this ' <<<<<<< HEAD ============ >>>>>>> 574389758463450348756435708963456 ' thing?
        
//<<<<<<< HEAD
        
        orbit.onDrag = function(e, offset, localClickPos) {
            var point = {x:e.clientX - offset.x, y:e.clientY - offset.y};
            var center = {x:two.width / 2, y:two.height / 2};
            var dist = Util.pointDistance(point, center);

            //Drag the orbit's radius around
            if (dist <= ORBIT_MAX_RADIUS) {
                var newRadius = dist;
            } else {
                var newRadius = ORBIT_MAX_RADIUS+(Math.sqrt(dist-ORBIT_MAX_RADIUS));
            }
            
            //Make the orbit's trigger invisible
            trigger.rotate = false;
            
            setRadius(this, newRadius);
            orbit.updateNotes();
        }
        
        orbit.onMouseUp = function(e) {
            //snap the orbit to a grid, tweening to make a smooth animation
            var snapToRadius = Math.max(1, Math.round(this.radius / RADIUS_SNAP)) * RADIUS_SNAP;
            
            //create an elastic tween
            var tweenTime = 500;
            var tweenSnap = new TWEEN.Tween(this)
                .to({ radius:snapToRadius }, tweenTime)
                .easing(TWEEN.Easing.Elastic.Out)
                .onUpdate(function() {
                    setRadius(this._object, this._object.radius); //'this' refers to the tween itself, and _object is what the tween is acting on.
                    this._object.updateNotes();
                })
                .onComplete(function() {
                    this._object.trigger.rotate = true;
                })
            tweenSnap.start();
        }
        
        orbit.updateNotes = function() {
            this.notes.forEach(function(n) {
                var angle = Util.pointDirection(CENTER, n.translation);
                var newX = CENTER.x + Math.cos(angle) * n.orbit.radius;
                var newY = CENTER.y + Math.sin(angle) * n.orbit.radius;
                n.translation.set(newX, newY);
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
        trigger.rotate = true;
        orbit.trigger = trigger;

        trigger.update = function() {
            // Rotate the trigger
            if (this.rotate == true) {
                var theta = (2*Math.PI) * (RADIUS_SNAP / this.orbit.radius) * ((TEMPO/60) * time) - Math.PI;
                this.rotation = theta;
            }
            
            // Move trigger to the edge of the orbit based on the rotation
            var distance = this.orbit.radius + size + this.orbit.linewidth/2
            var angle = this.rotation + Math.PI/2;
            this.translation.x = CENTER.x + Math.cos(angle) * distance;
            this.translation.y = CENTER.y + Math.sin(angle) * distance;
        }


//>>>>>>> 79f3fda5ca421faf1a374cee9d2107854a1cb054
        return orbit;
    }
    
    function CreateNote(radius){
        /* This should create a note that: 
            - Can be moved onto and along an orbit by dragging
            - Has a radius proportional to its volume
        */
        var note = two.makeCircle(two.width / 4, two.height / 4, radius);
        note.fill = 'red';
        note.stroke = 'none';
        note.linewidth = 0;
        note.orbit = null;
        note.goalPos = { x:note.translation.x, y:note.translation.y };

        $(document).ready(function() {
            addInteractionDrag(note);
        });

        Notes.push(note);
        
        note.onMouseDown = function () {
            if (this.orbit != null) {
                // Remove this note from the orbit
                var index = this.orbit.notes.indexOf(this);
                if (index > -1) {
                    this.orbit.notes.splice(index, 1);
                }
                this.orbit = null;
            }
        }
        
        note.onDrag = function(e, offset, localClickPos) {
            // By default, move to the mouse location
            this.goalPos.x = e.clientX - offset.x;// - localClickPos.x;
            this.goalPos.y = e.clientY - offset.y;// - localClickPos.y;
            
            // If close enough to an orbit, snap to that orbit
            for(var i=0;i<Orbits.length;i++) {
                if (Math.abs(Util.pointDistance(CENTER, this.goalPos) - Orbits[i].radius) < .5*RADIUS_SNAP) {
                    var dist = Orbits[i].radius;
                    var dir = Util.pointDirection(CENTER, this.goalPos);
                    this.goalPos.x = CENTER.x + Math.cos(dir) * dist;
                    this.goalPos.y = CENTER.y + Math.sin(dir) * dist;
                    note.orbit = Orbits[i]; // Assign this orbit
                    break;
                } else note.orbit = null;
            }
            
            // Actually move to the desired position
            this.translation.set(this.goalPos.x, this.goalPos.y);
        }
        
        note.onMouseUp = function(e, offset, localClickPos) {
            if (this.orbit != null) {
                // Add this note to its orbit
                this.orbit.notes.push(this);
            }
        }

        note.update = function(){
            // For updating anything about the note
        }
        return note;
    }
    
    // Reuseable function for setting the radius of the svg circle
    var setRadius = function(circle, r) {
        circle.radius = r;
        _.each(circle.vertices, function(v) {
            v.setLength(r);
        });
    }
   
    Init();
    
    // Create orbits, snapping their radii upon creation
    CreateOrbit(50);
    CreateOrbit(100);
    CreateOrbit(300);
    for(var i=0;i<Orbits.length;i++) {
        setRadius(Orbits[i], Math.max(1, Math.round(Orbits[i].radius / RADIUS_SNAP)) * RADIUS_SNAP)
    }
    CreateNote(15);

    
    // Interactivity code from https://two.js.org/examples/advanced-anchors.html
    function addInteractionDrag(shape) {

        var offset = shape.parent.translation; //offset of the 'two' canvas in the window (I think). not the shape's position in the window
        var localClickPos = {x: 0, y: 0};
        
        var drag = function(e) {
            e.preventDefault();
            
            //Call the shape's dragging method, if it has one
            if (typeof shape.onDrag === 'function') {shape.onDrag(e, offset, localClickPos);}
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
            
            //Call the shape's mouse click method, if it has one
            if (typeof shape.onMouseDown === 'function') {shape.onMouseDown(e, offset, localClickPos);}
        };
        var touchStart = function(e) {
            e.preventDefault();
            var touch = e.originalEvent.changedTouches[0];
            localClickPos = {x: touch.pageX-shape.translation.x, y: touch.pageY-shape.translation.y}
            $(window)
                .bind('touchmove', touchDrag)
                .bind('touchend', touchEnd);
            return false;
            
            //Call the shape's mouse click method, if it has one
            if (typeof shape.onMouseDown === 'function') {shape.onMouseDown(e, offset, localClickPos);}
        };
        var dragEnd = function(e) {
            e.preventDefault();
            $(window)
                .unbind('mousemove', drag)
                .unbind('mouseup', dragEnd);
            
            //Call the shape's click release method, if it has one
            if (typeof shape.onMouseUp === 'function') {shape.onMouseUp(e, offset, localClickPos);}
        };
        var touchEnd = function(e) {
            e.preventDefault();
            $(window)
                .unbind('touchmove', touchDrag)
                .unbind('touchend', touchEnd);
            
            //Call the shape's click release method, if it has one
            if (typeof shape.onMouseUp === 'function') {shape.onMouseUp(e, offset, localClickPos);}
            
            return false;
        };

        $(shape._renderer.elem)
            .css({
                cursor: 'move'
            })
            .bind('mousedown', dragStart)
            .bind('touchstart', touchStart);
      }

    var startTime = new Date();
    var time = 0; //how long the app has been running, in seconds
    function updateTime() {
        time = (new Date() - startTime) / 1000;
    }

    // Our main update loop!
    function update() {
        // Keep track of time for time-synced animations and music
        updateTime();
        // Tween's own update
        TWEEN.update();
        // Two's own update
        two.update();
        // Our own update goes here
        for(var i=0;i<Orbits.length;i++) {
            Orbits[i].update();
        }
        
        // Ask the browser to run this on the next frame please
        requestAnimationFrame( update );
    }

    update();
}

