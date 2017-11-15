//All the main js code runs here
window.onload = function() {

    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
    var Orbits = [];
    var Notes = [];
    var Samplers = [];
    var PALETTE = [];
    var SOUND_FILES = ["bass", "snare", "hihat_closed"];
    var MAX_ORBITS = 5;
    var ORBIT_MAX_RADIUS = 300;
    var RADIUS_SNAP = ORBIT_MAX_RADIUS/MAX_ORBITS;
    var TEMPO = 60; //in beats per minute
    var CENTER = {};
    var NOTE_RADIUS = 15;
    var SAMPLER_RADIUS = 20;
    var CENTER_RADIUS = 0.5*RADIUS_SNAP;
    var DRAGGING_DESTROYABLE = false;

    function Init(){
        // Initialize everything here 

         // Make an instance of two and place it on the page.
        var elem = document.getElementById('main-container');
        //var params = { fullscreen: true}, width:'100%', height:'100%' }
        var params = { fullscreen: true };
        two = new Two(params).appendTo(elem);
        // Make the SVG always maintain this aspect ratio
        /*
        var w = 1080;
        var h = 700;
        two.renderer.domElement.setAttribute("viewBox","0 0 " + String(w) + " " + String(h));
        */
        CENTER = { x:two.width / 2, y:two.height / 2 };
        
        PALETTE.push('#F7A055');
        PALETTE.push('#F76055');
        PALETTE.push('#9B3655');
    }
    
    function CreateOrbit(radius){
        /*
            Orbits are the large circlar tracks which notes can be dragged onto.
        */
        var orbit = two.makeCircle(CENTER.x, CENTER.y, radius);
        orbit.fill = 'none';
        orbit.stroke = 'rgba(107,107,107,1)';
        orbit.linewidth = 6;
        orbit.radius = radius; //Just for keeping track of the radius in our own application
        orbit.notes = [];
        orbit.frozen = false;
        

        Orbits.push(orbit);

        orbit.update = function() {
            // For updating anything about the orbit
            this.trigger.update();
        }
        
        orbit.setFreeze = function(bool){
            if(!this.originalStroke) {
                this.originalStroke = this.stroke;
                this.trigger.originalFill = this.trigger.fill;
            }

            if(bool){
                this.stroke = 'rgba(107,107,107,0.1)';
                this.trigger.fill = 'rgba(255,69,0,0.1)';
            } else {
                this.stroke = this.originalStroke;
                this.trigger.fill = this.trigger.originalFill;
            }

            this.frozen = bool;
        }
        
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
            
            DRAGGING_DESTROYABLE = true;
        }
        
        orbit.onDoubleClick = function(e,self){
            // Must use self because the event is bound to the dom element, whereas self is the actual Two element
            self.setFreeze(!self.frozen);
        }

        orbit.onMouseUp = function(e) {
            // Check if note is over trash, to destroy it
            if (isOverCenter(e.clientX, e.clientY)) {
                var index = Orbits.indexOf(this);
                if (index > -1) {
                    Orbits.splice(index, 1);
                    _.each(this.notes, function(n) {
                       two.remove(n); 
                    });
                    two.remove(this.trigger);
                    two.remove(this.polygon);
                    two.remove(this);
                }
            } else {
                // Orbit is not over trash, so don't destroy it; snap it to a grid
                var snapToRadius = Math.max(1, Math.round(this.radius / RADIUS_SNAP)) * RADIUS_SNAP;

                // Create an elastic tween to make a smooth animation
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
        }
        
        orbit.updateNotes = function() {
            // Update the positions of the notes when the orbit resizes
            this.notes.forEach(function(n) {
                var angle = Util.pointDirection(CENTER, n.translation);
                var newX = CENTER.x + Math.cos(angle) * n.orbit.radius;
                var newY = CENTER.y + Math.sin(angle) * n.orbit.radius;
                n.translation.set(newX, newY);
            });
            this.polygon.update();
        }
        
        orbit.removeNote = function(n) {
            var index = this.notes.indexOf(n);
            if (index > -1) {
                this.notes.splice(index, 1);
            }
            this.polygon.update();
        }
        
        orbit.sortNotes = function() {
            this.notes.sort(function(a,b) {
                return a.theta-b.theta; //order the notes by their theta values
            });
        }
    
        addInteraction(orbit);

        // Create a triangle trigger for this orbit
        var size = 15;
        var triggerX = CENTER.x;
        var triggerY = CENTER.y-radius-size - orbit.linewidth/2;
        var trigger = two.makePolygon(triggerX, triggerY, size);
        trigger.fill = 'rgba(255,69,0,1)';
        trigger.stroke = 'none';
        trigger.rotation = Math.PI;
        trigger.orbit = orbit;
        trigger.rotate = true;
        trigger.theta = 0;
        orbit.trigger = trigger;

        trigger.update = function() {
            if(this.orbit.frozen){
                // Stop all update if this thing is frozen
                return;
            }

            // Record angle theta before updating
            var oldTheta = this.theta;
            
            // Rotate the trigger
            if (this.rotate == true) {
                // Set a new angle theta
                var newTheta = (2*Math.PI) * (RADIUS_SNAP / this.orbit.radius) * ((TEMPO/60) * time) - Math.PI;
                this.rotation = newTheta;
                this.theta = ((newTheta-(Math.PI/2)) % (2*Math.PI)) - Math.PI; //lots of maths because two.rotation, note.theta, and the visual rotation all have different spots for 0°
                
                // Play notes that the trigger just passed
                for (var i=0; i<this.orbit.notes.length; i++) {
                    var n = this.orbit.notes[i];
                    var nt = n.theta;
                    if (nt != null) { //just in case
                        if (nt > oldTheta && nt <= this.theta) {
                            // Trigger a note!
                            n.sampler.audio.play();
                        }
                    } else {console.log("error: note on orbit "+this.orbit+" has theta = 'null'.")}
                }
            }
            
            // Move trigger to the edge of the orbit based on the rotation
            var dist = this.orbit.radius + size + this.orbit.linewidth/2
            var angle = this.rotation + Math.PI/2;
            this.translation.x = CENTER.x + Math.cos(angle) * dist;
            this.translation.y = CENTER.y + Math.sin(angle) * dist;
        }
        
        
        // Create a polygon for this orbit
        var polygon = new Two.Path();
        two.add(polygon);
        polygon.fill = polygon.stroke = 'gray';
        polygon.linewidth = 2*NOTE_RADIUS+10;
        polygon.join = 'round';
        polygon.cap = 'round';
        polygon.orbit = orbit;
        orbit.polygon = polygon;
        
        polygon.prevMousePos = new Two.Vector(0, 0);
        polygon.hover = false;
        polygon.dragging = false;
        polygon.maxOpacity = 0.2; //this is what we tween to
        polygon.op = 0; //custom variable for opacity (see method setOpacity())
        
        polygon.setOpacity = function(op) {
            /*
            This custom function manually sets the opacity of the polygon.
            
            Two.js's has a built-in method for setting an object's opacity ( "path.opacity()" ),
            which sets the paramaters 'stroke-opacity' and 'fill-opacity' of the DOM element.
            This is not the same as 'opacity', a different parameter that produces a different result!
            So, to get the desired effect, we have to go in manually and override Two.js's presets.
            */
            var DOMelem = document.getElementById(polygon.id)
            if (DOMelem != null) { //it's possible the polygon doesn't exist anymore; for instance, it was destroyed during a tween
                DOMelem.removeAttribute('fill-opacity');
                DOMelem.removeAttribute('stroke-opacity');
                DOMelem.setAttribute('opacity', op.toString());
                this.op = op;
                //console.log(document.getElementById(polygon.id));
            }
        }
        
        polygon.tweenFade = new TWEEN.Tween(polygon)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(function() {
                this._object.setOpacity(this._object.op);
            });
        polygon.appear = function() {
            this.tweenFade.to({ op:this.maxOpacity }, 500)
                .onComplete(function() {
                    //do nothing: we need an placeholder function to cancel the function set in polygon.disappear()
                })
                .start();
            $(this._renderer.elem).css({'cursor': 'move'});
            this.fill = this.stroke = 'gray';
        }
        polygon.disappear = function() {
            this.tweenFade.to({ op:0 }, 500)
                .onComplete(function() {
                    $(this._object._renderer.elem).css({'cursor': 'default'});
                    this._object.fill = this._object.stroke = 'none';
                })
                .start();
        }
        
        addInteraction(polygon);
        
        polygon.onMouseDown = function(e, offset, localClickPos) {
            if (this.op > 0) {
                this.prevMousePos = {x:e.clientX, y:e.clientY};
                this.dragging = true;
            }
        }
        polygon.onDrag = function(e, offset, localClickPos) {
            if (this.dragging) {
                polygon.fill = polygon.stroke = 'red';
                var dtheta = Util.pointDirection(CENTER, {x:e.clientX, y:e.clientY}) - Util.pointDirection(CENTER, this.prevMousePos);
                var dist = this.orbit.radius;
                _.each(this.orbit.notes, function(n) {
                    n.theta += dtheta;
                    n.translation.x = CENTER.x + Math.cos(n.theta) * dist;
                    n.translation.y = CENTER.y + Math.sin(n.theta) * dist;
                });
                this.update();
                this.prevMousePos = {x:e.clientX, y:e.clientY};
            }
        }
        polygon.onMouseUp = function(e, offset, localClickPos) {
            polygon.fill = polygon.stroke = 'gray';
            this.dragging = false;
            
            // Update the orbit's notes' theta values and sort them
            _.each(this.orbit.notes, function(n) {
                n.theta = Util.pointDirection(CENTER, n.translation); //easiest way to get theta in range [-pi, pi)
            });
            polygon.orbit.sortNotes();
        }
        polygon.onMouseHover = function() {
            this.hover = true;
        }
        polygon.onMouseEnter = function() {
            if (this.op > 0) {
                /* If opacity>0 when the mouse enters, that means the mouse *just* left the polygon, and it is fading away.
                   So, make it appear again. */
                this.appear();
            }
        }
        polygon.onMouseOut = function(e, offset, localClickPos) {
            polygon.hover = false;
            if (!this.dragging) {this.disappear();}
        }
        document.addEventListener('mouseup', function(e) { // Global mouse up
            if (polygon.dragging && !polygon.hover) {
                polygon.dragging = false;
                polygon.disappear();
            }
        });
        
        polygon.update = function() {
            // Update the vertices based on the note array of the orbit
            this.vertices.length = 0; //reset the array
            for (var i=0; i<this.orbit.notes.length; i++) {
                var n = this.orbit.notes[i];
                var pt = Util.polarToCarte(n.orbit.radius, n.theta);
                var v = new Two.Vector(this.orbit.translation.x + pt.x, this.orbit.translation.y + pt.y);
                this.vertices.push(v);
            }
            this.closed = true;
        }

        polygon.setOpacity(0);
        return orbit;
    }
    
    function CreateNote(x, y){
        /* This should create a note that:
            - Has a radius proportional to its volume
        */
        var note = two.makeCircle(x, y, NOTE_RADIUS);
        note.fill = 'red';
        note.stroke = 'none';
        note.linewidth = 0;
        note.radius = NOTE_RADIUS;
        note.orbit = null;
        note.prevOrbit = null; //used when returning to the note's previous location
        note.sampler = null; //set by the sampler when it creates the note
        note.fromSampler = false; //whether or not the note was just dragged from a sampler
        note.prevPos = {x:x, y:y};
        note.theta = 0; //direction (in radians) of the note relative to its orbit's center

        addInteraction(note);

        Notes.push(note);
        
        note.onCreate = function() {
            //make the note tween to appear
            note.radius = 0; //for some reason, setRadius() won't work here
            var tweenCreate = new TWEEN.Tween(this)
                .to({ radius:NOTE_RADIUS }, 200)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    setRadius(this._object, this._object.radius);
                })
            tweenCreate.start();
        }
        
        note.onMouseHover = function(e, offset, localClickPos) {
            if (this.orbit != null) {this.orbit.polygon.appear();}
        }
        
        note.onMouseDown = function (e, offset, localClickPos) {
            note.prevPos = {x:note.translation.x, y:note.translation.y};
            
            //create an elastic tween for moving to desired position
            note.tweenMove = new TWEEN.Tween(this.translation)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    if (note.orbit != null) {
                        note.updateTheta();
                        note.orbit.polygon.update();
                    }
                })
                .onComplete(function() {
                    if (note.orbit != null) {
                        note.updateTheta();
                        note.orbit.polygon.update();
                    }
                });
        }
        
        note.onDrag = function(e, offset, localClickPos) {
            // By default, move to the mouse location
            var goalPos = { x: e.clientX - offset.x, y:e.clientY - offset.y };
            
            // If close enough to an orbit, snap to that orbit
            var notOnOrbit = true;
            var oldOrbit = this.orbit; //save in case orbit changes
            var tweenTime = 150;
            for(var i=0;i<Orbits.length;i++) {
                if (Math.abs(Util.pointDistance(CENTER, goalPos) - Orbits[i].radius) < .5*RADIUS_SNAP) {
                    var dist = Orbits[i].radius;
                    var angle = Util.pointDirection(CENTER, goalPos);
                    goalPos.x = CENTER.x + Math.cos(angle) * dist;
                    goalPos.y = CENTER.y + Math.sin(angle) * dist;
                    
                    // If moved onto a new orbit
                    if ((note.orbit != Orbits[i])) {
                        
                        // Add the note to the orbit
                        note.orbit = Orbits[i];
                        note.orbit.notes.push(note);
                        note.orbit.sortNotes();
                        
                        // Begin a tween to smooth the transition moving onto the orbit
                        note.tweenMove.to(goalPos, tweenTime).start();
                    }
                    notOnOrbit = false;
                    break;
                    
                } else {
                    // Begin a tween to smooth the transition moving off of the orbit
                    if ((note.orbit == Orbits[i])) {
                        note.tweenMove.to(goalPos, tweenTime);
                        note.tweenMove.start();
                    }
                }
            }
            if (notOnOrbit) {note.orbit = null;}
            
            // If orbit has changed, removed the note from the orbit it was just on
            if (note.orbit != oldOrbit && oldOrbit != null) {
                oldOrbit.removeNote(note);
            }
            
            // Finally, actually move to the desired position
            if (note.tweenMove._isPlaying == true) {
                note.tweenMove._valuesEnd = goalPos;
            } else {
                note.translation.set(goalPos.x, goalPos.y);
            }
            
            // After moving, update the notes and polygon of the orbit
            if (note.orbit != null) {
                note.updateTheta();
                note.orbit.polygon.update();
            }
            
            DRAGGING_DESTROYABLE = true;
        }
        
        note.onMouseUp = function(e, offset, localClickPos) {
            // Check if note is over center trash, to destroy it
            if (isOverCenter(e.clientX, e.clientY)) {
               // If dragged directly from a sampler, tell the sampler its note has been removed
                if (this.fromSampler == true) {
                    this.sampler.hasNote = false;
                    this.fromSampler = false;
                }
                
                // Delete this note
                var index = Notes.indexOf(this);
                if (index > -1) {
                    Notes.splice(index, 1);
                    two.remove(this);
                }
            } else {
                if (this.orbit != null) {
                    // If dragged directly from a sampler, tell the sampler its note has been removed
                    if (this.fromSampler == true) {
                        this.sampler.hasNote = false;
                        this.fromSampler = false;
                    }
                    
                    // Record the note's new orbit
                    note.prevOrbit = note.orbit;
                } else {
                    // Note is over blank space, so return to previous position
                    var time = Math.max(200, Util.pointDistance( {x:this.translation.x, y:this.translation.y}, this.prevPos ));
                    note.tweenMove.to(this.prevPos, time);
                    note.tweenMove.start();
                    if (note.prevOrbit != null) { // If the note used to be on an orbit (as opposed to being dragged directly from a sampler)
                        note.orbit = note.prevOrbit;
                        note.orbit.notes.push(note);
                        note.orbit.sortNotes();
                    }
                }
            }
        }
        
        note.updateTheta = function() {
            if (this.orbit != null) {
                this.theta = Util.pointDirection(this.orbit.translation, this.translation);
                this.orbit.sortNotes();
            }
        }

        note.update = function(){
            // For updating anything about the note
        }
        
        note.onCreate();
        return note;
    }
    
    function CreateSampler(x, y) {
        /* This should create a sampler that:
            - creates a new note when the previous one is placed
            - contains a reference to an audio sample which it gives to its note children
            - load in an external sample
        */
        var sampler = two.makeCircle(x, y, SAMPLER_RADIUS);
        sampler.color = PALETTE[Samplers.length];
        sampler.fill = 'none';
        sampler.stroke = '#6b6b6b';
        sampler.linewidth = 4;
        sampler.radius = SAMPLER_RADIUS;
        sampler.hasNote = false;
        var fileName = "assets/samples/" + SOUND_FILES[Samplers.length] + ".wav";
        sampler.audio = new Howl({src: fileName});

        Samplers.push(sampler);

        sampler.update = function() {
            // Check if the sampler needs another note
            if (!this.hasNote) {
                var note = CreateNote(this.translation.x, this.translation.y);
                note.sampler = this;
                note.fromSampler = true;
                note.fill = this.color;
                this.hasNote = true;
            }
        }
        return sampler;
    }
    
    function CreateCenter(x, y) {
        var CreateTrash = function(x, y) {

            var dist = .3*CENTER_RADIUS;
            var line1 = two.makeLine(-dist, -dist, +dist, +dist);
            var line2 = two.makeLine(-dist, +dist, +dist, -dist);
            var X = two.makeGroup(line1, line2);
            X.stroke = 'white';
            X.linewidth = 8;
            X.cap = 'round';

            var circle = two.makeCircle(0, 0, CENTER_RADIUS);
            circle.fill = 'red';
            circle.linewidth = 0;

            var trash = two.makeGroup(circle, X);
            trash.center();
            trash.translation.set(x,y);
            trash.opacity = .5;
            
            trash.clicked = false;
            trash.visible = true;
            trash.hoverOver = false;

            addInteraction(trash);
            $(trash._renderer.elem).css({cursor: 'default'});

            return trash;
}
        var CreatePlus = function(x, y) {
        
        var dist = .4*CENTER_RADIUS;
        var line1 = two.makeLine(0, -dist, 0, +dist);
        var line2 = two.makeLine(-dist, 0, +dist, 0);
        var X = two.makeGroup(line1, line2);
        X.stroke = 'white';
        X.linewidth = 8;
        X.cap = 'round';
        
        var circle = two.makeCircle(0, 0, CENTER_RADIUS);
        circle.fill = 'gray';
        circle.linewidth = 0;
        
        var plus = two.makeGroup(circle, X);
        plus.center();
        plus.translation.set(x,y);
        plus.opacity = .5;
        
        plus.clicked = false;
        plus.visible = true;
        plus.hoverOver = false;
        
        addInteraction(plus);
        $(plus._renderer.elem).css({cursor: 'default'});
        
        plus.onMouseDown = function(e, offset, localClickPos) {
            if (this.visible) {
                // Create a new orbit
                this.clicked = true;
                tweenToScale(this, 0);
                var orbit = CreateOrbit(10);
                orbit.onDrag(e, offset, localClickPos); //force onDrag, which updates the radius, trigger animation, etc
                $(document.getElementById(orbit.id)).trigger('mousedown'); //force trigger the mousedown event for the orbit, which allows us to hold onto it
            }
        }
        
        return plus;
    }
        
        var p = CreatePlus(x, y);
        var t = CreateTrash(x, y);
        var c = two.makeGroup(p, t);
        c.state = 'plus';
        
        var tweenToScale = function(obj, s) {
            // Define and start a tween to scale the object
            var tweenScale = new TWEEN.Tween(obj)
                .to({ scale:s }, 200)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }

        document.addEventListener('mousemove', function(e) { // Global mouse move
            // Check if dragging destroyable
            if (DRAGGING_DESTROYABLE) {
                if ((c.getState() != 'trash') && (!p.clicked)) {
                    c.setState('trash');
                }
            }
            
            // Check if mouse is over the center
            if (isOverCenter(e.clientX, e.clientY)) {
                _.each(c.children, function(child) {
                    if ((child.visible) && (!child.hoverOver) && (!child.clicked)) {
                        tweenToScale(child, 1.2);
                        child.hoverOver = true;
                    }
                });
            } else {
                _.each(c.children, function(child) {
                    if ((child.visible) && (child.hoverOver) && (!child.clicked)) {
                        tweenToScale(child, 1);
                        child.hoverOver = false;
                    }
                });
            }
        });
        document.addEventListener('mouseup', function(e) { // Global mouse move
            /* Use setTimeout() to trigger this function next frame. If an object is being dragged to the trash,
            this ensures the dragged object's mouseUp event triggers before the trash state is updated,
            properly destroying the object. */
            setTimeout( function() {
                c.setState('plus');
                DRAGGING_DESTROYABLE = false;
            }, 1);
        });
        
        c.setState = function(s) {
            c.state = s;
            switch(s) {
                case('plus'): {
                    if (Orbits.length < MAX_ORBITS) {
                        tweenToScale(p, 1);
                        p.visible = true;
                    } else p.visible = false;
                    p.clicked = false;
                    tweenToScale(t, 0);
                    t.visible = false;
                    break;
                }
                case('trash'): {
                    tweenToScale(p, 0);
                    p.visible = false;
                    tweenToScale(t, 1);
                    t.visible = true;
                    break;
                }
            }
        }
        c.getState = function() {
            return c.state;
        }
        
        c.setState('plus');
        return c;
    }
    
    // Reusable function for checking if position (probably mouse) is over the center add/delete area
    var isOverCenter = function(x, y) {
        if (Util.pointDistance(CENTER, {x:x, y:y}) < CENTER_RADIUS) {
            return true;
        } else return false;
    }
    
    // Reuseable function for setting the radius of the svg circle
    var setRadius = function(circle, r) {
        circle.radius = r;
        _.each(circle.vertices, function(v) {
            v.setLength(r);
        });
    }
   
    Init();
    
    var C = CreateCenter(CENTER.x, CENTER.y);
    
    // Create orbits, snapping their radii upon creation
    CreateOrbit(100);
    CreateOrbit(300);
    for(var i=0;i<Orbits.length;i++) {
        setRadius(Orbits[i], Math.max(1, Math.round(Orbits[i].radius / RADIUS_SNAP)) * RADIUS_SNAP)
    }
    
    CreateSampler(two.width-100, 100);
    CreateSampler(two.width-100, 200);
    CreateSampler(two.width-100, 300);
    
    
    // Interactivity code from https://two.js.org/examples/advanced-anchors.html
    function addInteraction(shape) {

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
        var enter = function(e) {
            e.preventDefault();
            
            //Call the shape's mouse enter method, if it has one
            if (typeof shape.onMouseEnter === 'function') {shape.onMouseEnter(e, offset, localClickPos);}
        };
        var leave = function(e) {
            e.preventDefault();
            
            //Call the shape's mouse leave method, if it has one
            if (typeof shape.onMouseLeave === 'function') {shape.onMouseLeave(e, offset, localClickPos);}
        };
        var move = function(e) {
            e.preventDefault();
            
            //Call the shape's mouse move method, if it has one
            if (typeof shape.onMouseMove === 'function') {shape.onMouseMove(e, offset, localClickPos);}
        };
        var hover = function(e) {
            e.preventDefault();
            
            //Call the shape's mouse move method, if it has one
            if (typeof shape.onMouseHover === 'function') {shape.onMouseHover(e, offset, localClickPos);}
        };
        var out = function(e) {
            e.preventDefault();
            
            //Call the shape's mouse move method, if it has one
            if (typeof shape.onMouseOut === 'function') {shape.onMouseOut(e, offset, localClickPos);}
        };

        two.update(); // Need to call this before attempting to touch the SVG so that Twojs will actually create it

        $(shape._renderer.elem)
            .css({
                'cursor': 'move',
                //'pointer-events': 'none'
            })
            .bind('mousedown', dragStart)
            .bind('touchstart', touchStart)
            .bind('mouseenter', enter)
            .bind('mouseleave', leave) //fires when mouse leaves object entirely
            .bind('mousemove', move)
            .bind('mouseover', hover)
            .bind('mouseout', out); //fires when mouse leaves object, or enters one of its children
            //.bind('mouseover', function() {console.log('over')})
            //.bind('dragover', function() {console.log('drag over')});

        $(shape._renderer.elem).dblclick(function(e){
            shape.onDoubleClick(e,shape);
        });
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
        for(var i=0;i<Notes.length;i++) {
            Notes[i].update();
        }
        for(var i=0;i<Samplers.length;i++) {
            Samplers[i].update();
        }
        
        // Ask the browser to run this on the next frame please   「 次のフラムをください。」
        requestAnimationFrame( update );
    }

    update();
}

