// Load external svg assets before the window loads
var svgAssets = {};
document.addEventListener("DOMContentLoaded", function() {
    var _getSvgData = function(imageURL, assetName) {
        var file = new XMLHttpRequest();
        file.open("GET", imageURL, false);
        file.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200 || this.status == 0) {
                    var dataXML = this.responseXML;
                    var svgElem = dataXML.getElementsByTagName('svg')[0];
                    svgAssets[assetName] = svgElem;
                    //console.log(svgElem);
                }
            }
        }
        file.send(null);
    }
    
    _getSvgData("assets/images/play.svg", "play");
    _getSvgData("assets/images/pause.svg", "pause");
    _getSvgData("assets/images/metronome.svg", "metronome");
    _getSvgData("assets/images/volume_full.svg", "volume_full");
    _getSvgData("assets/images/volume_half.svg", "volume_half");
    _getSvgData("assets/images/volume_zero.svg", "volume_zero");
    _getSvgData("assets/images/volume_off.svg", "volume_off");
    _getSvgData("assets/images/reset.svg", "reset");
    _getSvgData("assets/images/polygon.svg", "polygon");
    _getSvgData("assets/images/randomize.svg", "randomize");
    _getSvgData("assets/images/save.svg", "save");
    _getSvgData("assets/images/cync_logo_color.svg", "cync_logo_color");
});

// All the main js code runs here
window.onload = function() {

    // Our 'global' variables defined up here so they're accessible everywhere below
    var two;
    var GLOBAL_MUTE = false; //so we can mute everything while working
    var LINE_W = 5; //global line width unit
    var PHI = 1.618;
    var Orbits = [];
    var Notes = [];
    var Samplers = [];
    var PALETTE = [];
    var LAYERS = [];
    var AVAILABLE_SAMPLES_ARRAYS = [
        ["CYNC_kick", "CYNC_tom", "CYNC_snare", "CYNC_clap", "CYNC_shaker", "CYNC_hihat"],
        ["808_kick", "808_bass", "808_snare", "808_clap", "808_hihat_closed", "808_hihat_open", "808_tom", "808_cymbal"],
        ["postal_kick", "postal_slap1", "postal_slap2", "postal_snare"],
        ["bell_1", "bell_2", "bell_3", "bell_4", "bell_5", "bell_6", "bell_7"],
    ];
    var SOUND_FILES = AVAILABLE_SAMPLES_ARRAYS[Util.getParameterByName('set') || 0];
    var SAMPLERS_MAX = SOUND_FILES.length;
    var MAX_ORBITS = 4;
    var ORBIT_MAX_RADIUS = 240; //default, updated in Init()
    var RADIUS_SNAP = ORBIT_MAX_RADIUS/MAX_ORBITS;
    var TEMPO = 60; //in beats per minute
    var TEMPO_MIN = 30;
    var TEMPO_MAX = 120;
    var MASTER_VOLUME = 1;
    var SHOW_POLYGONS = true;
    var PAUSED = false;
    var CENTER = {}; //default, updated in Init()
    var NOTE_RADIUS = 12;
    var CTL_RADIUS = 36;
    var SAMPLER_RADIUS = NOTE_RADIUS+LINE_W;
    var DRAGGING_DESTROYABLE = false;
    var GRAY = 'rgba(190,190,190,1)';
    var LT_GRAY = '#f0f0f0';
    var state = new SaveState(); //keeps track of everything the user has done so we can save this state to URL 

    function UpdateState() {
        // Just a helper function to make it easy to update parameters of state without changing lots of lines of code 
        state.update(Orbits,Notes,TEMPO);
    } 

    function Init() {
        // Initialize everything here
        var TWO_WIDTH = 1280;
        var TWO_HEIGHT = 720;

         // Make an instance of two and place it on the page
        var elem = document.getElementById('main-container');
        var params = { fullscreen: false, width: TWO_WIDTH, height: TWO_HEIGHT };
        two = new Two(params).appendTo(elem);
        
        two.renderer.domElement.setAttribute("viewBox", "0 0 " + String(TWO_WIDTH) + " " + String(TWO_HEIGHT));
        two.renderer.domElement.removeAttribute("width");
        two.renderer.domElement.removeAttribute("height");
        
        CENTER = { x:two.width / 3 * 2, y:two.height / 2 };
        ORBIT_MAX_RADIUS = .8*two.height/2;
        RADIUS_SNAP = ORBIT_MAX_RADIUS/MAX_ORBITS;
        
        // Create palette
        PALETTE.push('#6F69B2'); //purple
        PALETTE.push('#33A6E0'); //blue
        PALETTE.push('#EC4784'); //red
        PALETTE.push('#F6A450'); //yellow
        PALETTE.push('#A2D66B'); //green
        PALETTE.push('#3FC6B7'); //teal
        
        PALETTE.push('#A19EC1'); //light purple
        PALETTE.push('#80BEDD'); //light blue
        PALETTE.push('#F289B0'); //light red
        PALETTE.push('#EDC393'); //light yellow
        PALETTE.push('#BCD6A0'); //light green
        PALETTE.push('#84DAD1'); //light teal
        
        // Create visual layers of depth
        LAYERS['bg'] = two.makeGroup();
        LAYERS['hud'] = two.makeGroup();
        LAYERS['orbits'] = two.makeGroup();
        LAYERS['polygons'] = two.makeGroup();
        LAYERS['notes'] = two.makeGroup();
        LAYERS['fg'] = two.makeGroup();
    }
    
    function CreateHUD() {
        var controlsX = two.width/4;
        var controlsY = two.height/2;
        
        // Create samplers
        for (var i=0; i<SAMPLERS_MAX; i++) {
            var h = 9*CTL_RADIUS - 2*SAMPLER_RADIUS;
            var yy = controlsY - 4.5*CTL_RADIUS + SAMPLER_RADIUS + h*(i/(SAMPLERS_MAX-1));
            CreateSampler(controlsX+3.5*CTL_RADIUS, yy);
        }
        
        // Create global controls
        var tempoBtn = CreateSliderButton(controlsX-3.5*CTL_RADIUS, controlsY-3.5*CTL_RADIUS, CTL_RADIUS, 150, "metronome");
        tempoBtn.btn.setImageOffset(-2, 0);
        tempoBtn.slider.setValue( (TEMPO-TEMPO_MIN)/(TEMPO_MAX-TEMPO_MIN) );
        tempoBtn.slider.callBack = function() {
            TEMPO = Math.round(TEMPO_MIN + (TEMPO_MAX-TEMPO_MIN)*this.value);
        }
        tempoBtn.slider.dial.onMouseUp = function() {
            UpdateState();
        }
        LAYERS['hud'].add(tempoBtn);
        
        var volumeBtn = CreateSliderButton(controlsX, controlsY-3.5*CTL_RADIUS, CTL_RADIUS, 150, "volume_full");
        volumeBtn.slider.setValue(MASTER_VOLUME);
        volumeBtn.prevVol = 1;
        volumeBtn.slider.callBack = function() {
            MASTER_VOLUME = this.value;
            Howler.volume(MASTER_VOLUME);
            volumeBtn.updateImage();
        }
        volumeBtn.btn.callBack = function() {
            if (MASTER_VOLUME > 0) {
                this.prevVol = MASTER_VOLUME;
                MASTER_VOLUME = 0;
                volumeBtn.slider.setValue(MASTER_VOLUME);
            } else {
                MASTER_VOLUME = this.prevVol;
                volumeBtn.slider.setValue(MASTER_VOLUME);
            }
            Howler.volume(MASTER_VOLUME);
            volumeBtn.updateImage();
        }
        volumeBtn.updateImage = function() {
            // Change the little volume image based on the MASTER_VOLUME
            if (MASTER_VOLUME > 0) {
                if (MASTER_VOLUME > .3) {
                    if (MASTER_VOLUME > .6) {
                        this.btn.setImage("volume_full");
                        this.btn.setImageOffset(0, 0);
                    } else {
                        this.btn.setImage("volume_half");
                        this.btn.setImageOffset(-4, 0);
                    }
                } else {
                    this.btn.setImage("volume_zero");
                    this.btn.setImageOffset(-8, 0);
                }
            } else {
                this.btn.setImage("volume_off");
                this.btn.setImageOffset(1, 0);
            }
        }
        LAYERS['hud'].add(volumeBtn);
        
        var randomizeBtn = CreateButton(controlsX-3.5*CTL_RADIUS, controlsY, CTL_RADIUS, "randomize");
        randomizeBtn.callBack = function() {
            
            var _getRandomSampler = function() {
                return Samplers[Math.round(Math.random()*(SAMPLERS_MAX-1))];
            }
            
            // Create a random configuration
            var maxNotes = 6+Math.round(Math.random()*5);
            var totalNotes = 0;
            while(Orbits.length > 0) { Orbits[0].destroy(); }
            for (var i=1; i<=MAX_ORBITS; i++) {
                if (Math.random() < 1.05-.15*i) {
                    // Create a new orbit
                    var o = CreateOrbit(i*RADIUS_SNAP);
                    
                    // Assign a radial grid which notes will align to
                    var radialDivisions = Math.random()<.5 ? 2 : 3;
                    if (Math.random()<.8) {radialDivisions *= Math.random()<.4 ? i : 2*i;}
                    
                    // Populate orbit with notes
                    var notes = Math.round(Math.random()*3) + 1;
                    var mostCommonSamp = _getRandomSampler();
                    while(notes > 0 && totalNotes < maxNotes) {
                        var angleBase = Math.round(Math.random()*radialDivisions)/radialDivisions * 2*Math.PI;
                        var angleOffset = Math.random()>.08 ? 0 : Math.random()*radialDivisions;
                        var angleFinal = (angleBase+angleOffset + Math.PI/2) % (2*Math.PI) - Math.PI;
                        var samp = Math.random()<.5 ? mostCommonSamp : _getRandomSampler();
                        o.addNewNote(angleFinal, samp);
                        notes --;
                        totalNotes ++;
                    }
                    o.polygon.update();
                }
            }
            
            // Remove any orbits that didn't get any notes
            for (var i=0; i<Orbits.length; i++) {
                if (Orbits[i].notes.length == 0) {
                    Orbits[i].destroy();
                    i--;
                }
            }
            
            tempoBtn.slider.setValue(.2+.5*Math.random());
            UpdateState();
        };
        LAYERS['hud'].add(randomizeBtn);
        
        var playBtn = CreateButton(controlsX, controlsY, CTL_RADIUS, "pause");
        playBtn.callBack = function() {
            PAUSED = !this.on;
            this.setImage(PAUSED ? "play" : "pause");
            this.setImageOffset(PAUSED ? 2 : 0, 0);
            /*if (PAUSED) {TIME = (new Date() - START_TIME) / 1000;}
            else {PREV_TIME = (new Date() - START_TIME) / 1000;}*/
        };
        playBtn.space_pressed = false;
        //make the play button also toggle with the spacebar
        document.addEventListener("keydown", function(e) {
            var key = e.keyCode || e.which; //cross-browser support
            if (key === 32 && !playBtn.space_pressed) { //spacebar
                playBtn.on = !playBtn.on;
                playBtn.callBack();
                tweenToScale(playBtn, 0.8, 100);
                playBtn.space_pressed = true;
            }
        });
        document.addEventListener("keyup", function(e) {
            var key = e.keyCode || e.which; //cross-browser support
            if (key === 32 && playBtn.space_pressed) { //spacebar
                tweenToScale(playBtn, 1, 100);
                playBtn.space_pressed = false;
            }
        });
        LAYERS['hud'].add(playBtn);
        
        var saveBtn = CreateButton(controlsX-3.5*CTL_RADIUS, controlsY+3.5*CTL_RADIUS, CTL_RADIUS, "save");
        saveBtn.callBack = function() {
            saveMIDI();
        };
        LAYERS['hud'].add(saveBtn);
        
        /*var polygonBtn = CreateButton(controlsX-3.5*CTL_RADIUS, controlsY+3.5*CTL_RADIUS, CTL_RADIUS, "polygon");
        polygonBtn.setImageOffset(0, -2);
        polygonBtn.callBack = function() {
            SHOW_POLYGONS = this.on;
            this.image.opacity = this.on ? 1 : 0.5;
        };
        LAYERS['hud'].add(polygonBtn);*/
        
        var resetBtn = CreateButton(controlsX, controlsY+3.5*CTL_RADIUS, CTL_RADIUS, "reset");
        resetBtn.setImageOffset(0, -3);
        resetBtn.tween = new TWEEN.Tween(resetBtn.image)
            .easing(TWEEN.Easing.Linear.None)
            .onComplete(function() {
                    if (this._object.rotation >= 2*Math.PI) {resetBtn.reset();}
                    this._object.rotation = 0;
                })
        resetBtn.callBack = function() {
            this.tween.stop()
                .to({ rotation:2*Math.PI }, 800)
                .start();
        }
        resetBtn.callBackUp = function() {
            if (this.image.rotation < 2*Math.PI) {
                this.tween.stop()
                    .to({ rotation:0 }, 100)
                    .start();
            }
        }
        resetBtn.reset = function() {
            // Reset the orbits and notes
            while(Orbits.length > 0) { Orbits[0].destroy(); };
            SetupDefault();
        }
        LAYERS['hud'].add(resetBtn);
        
        
        // Create CYNC logo with corresponding text and author links
        var logoSVGnode = two.interpret(svgAssets["cync_logo_color"]);
        var logoDot = logoSVGnode._collection[1];
        var image = two.makeGroup(logoSVGnode);
        image.center();
        image.translation.set(0, -20);
        image.rotation = Math.PI;
        image.scale = 1.5;
        
        var image_bbox = image.getBoundingClientRect(false);
        var bbox = two.makeRectangle(0, 0, image_bbox.width+100, image_bbox.height+50);
        bbox.fill = '#ffffff00'; //make invisible but retain hover-ability
        bbox.stroke = 'none';
        
        var t1 = two.makeText("a cyclic drum machine by", 0, 25);
        var t2 = two.makeText("Jon Tiburzi", -100, 50);             t2.link = 'http://jontiburzi.com/';     t2.color = PALETTE[3];
        var t3 = two.makeText("Terrane", -6, 50);                   t3.link = 'http://terranemusic.com/';   t3.color = PALETTE[3];
        var t4 = two.makeText("Omar Shehata", 100, 50);             t4.link = 'http://omarshehata.me/';     t4.color = PALETTE[3];
        var text = two.makeGroup(t1, t2, t3, t4);
        _.each(text._collection, function(t) {
            t.family = 'Comfortaa';
            t.size = 14;
            if (typeof t.link !== 'undefined') {
                addInteraction(t);
                setCursor(t, 'pointer');
                t.onMouseDown = function() {
                    window.open(t.link,'_blank');
                }
                t.onMouseEnter = function() {
                    t.fill = t.color;
                }
                t.onMouseLeave = function() {
                    t.fill = GRAY;
                }
            }
        });
        text.fill = GRAY;
        text.opacity = 0;
        
        var logo = two.makeGroup(bbox, image, text);
        logo.translation.set(controlsX, two.height-100);
        logo.xStart = logo.translation.x;
        logo.yStart = logo.translation.y;
        logo.bbox = bbox;
        logo.image = image;
        logo.text = text;
        logo.dot = logoDot;
        logo.image.fill = GRAY;
        logo.hoverOver = false;
        addInteraction(logo);
        setCursor(logo, 'default');
        
        logo.onMouseEnter = function(e) {
            if (!this.hoverOver && !this.clicked) {
                tweenToScale(this, 1.2, 200);
                var textTween = new TWEEN.Tween(this.text)
                    .to({ opacity: 1 }, 200)
                    .start();
                this.bbox.scale = 2;
                this.hoverOver = true;
                logo.image.fill = 'rgba(90, 90, 90, 1)';
                logo.dot.fill = PALETTE[3];
            }
        }
        logo.onMouseLeave = function(e) {
            if (this.hoverOver && !this.clicked) {
                tweenToScale(this, 1, 200);
                var textTween = new TWEEN.Tween(this.text)
                    .to({ opacity: 0 }, 200)
                    .start();
                this.bbox.scale = 1;
                this.hoverOver = false;
                logo.image.fill = GRAY;
                logo.dot.fill = GRAY;
            }
        }
    }

    function SetupInitialState() {
        var stateData = state.load();
        //var stateData = null; //uncomment this line to prevent state loading while working
        
        //This will either load from URL or just create the default orbits
        if (stateData != null) {
            stateData.orbits.forEach(function(radius) {
                CreateOrbit(radius);
            })
            
            // Snap orbit radii upon creation
            for (var i=0; i<Orbits.length; i++) {
                setRadius(Orbits[i], Math.max(1, Math.round(Orbits[i].radius / RADIUS_SNAP)) * RADIUS_SNAP);
                Orbits[i].polygon.update();
                Orbits[i].trigger.sync();
            }
            
            //load in note data
            stateData.notes.forEach(function(n) {
                var sampler = Samplers[n.sIndex];
                var orbit = Orbits[n.oIndex];
                orbit.addNewNote(n.theta, sampler);
             })
            
            //load tempo data
            if (typeof stateData.tempo == "number" && stateData.tempo != -1) {
                TEMPO = stateData.tempo;
            }
            
        } else { SetupDefault(); }
    }
    
    function SetupDefault() {
        CreateOrbit(2*RADIUS_SNAP);
    }
    
    function CreateOrbit(radius) {
        /*
            Orbits are the large circlar tracks which notes can be dragged onto.
        */
        var orbit = two.makeCircle(CENTER.x, CENTER.y, radius);
        orbit.fill = 'none';
        orbit.stroke = GRAY;
        orbit.linewidth = LINE_W;
        orbit.radius = radius; //Just for keeping track of the radius in our own application
        orbit.notes = [];
        orbit.frozen = false;

        Orbits.push(orbit);
        LAYERS['orbits'].add(orbit);
        
        // Create a triangle trigger for this orbit
        orbit.trigger = CreateTrigger(orbit);
        
        // Create a polygon for this orbit
        orbit.polygon = CreatePolygon(orbit);

        orbit.update = function() {
            // For updating anything about the orbit
            this.trigger.update();
        }
        orbit.destroy = function() {
            var index = Orbits.indexOf(this);
            if (index > -1) {
                Orbits.splice(index, 1);
            }
            
            _.each(this.notes, function(n) {
                n.destroy();
            });
            LAYERS['orbits'].remove(this.trigger);
            two.remove(this.trigger);
            
            LAYERS['polygons'].remove(this.polygon);
            two.remove(this.polygon);
            
            LAYERS['orbits'].remove(this);
            two.remove(this);

            UpdateState();
        }
        orbit.setFreeze = function(bool){
            if (!this.originalStroke) {
                this.originalStroke = this.stroke;
                this.trigger.originalFill = this.trigger.fill;
            }

            if (bool) {
                this.stroke = 'rgba(107,107,107,0.1)';
                this.trigger.fill = 'rgba(255,69,0,0.1)';
            } else {
                this.stroke = this.originalStroke;
                this.trigger.fill = this.trigger.originalFill;
                this.trigger.sync();
            }

            this.frozen = bool;
        }
        orbit.onDrag = function(e, offset, localClickPos) {
            var point = {x:e.clientX - offset.x, y:e.clientY - offset.y};
            var center = CENTER;
            var dist = Util.pointDistance(point, center);

            //Drag the orbit's radius around
            if (dist <= ORBIT_MAX_RADIUS) {
                var newRadius = dist;
            } else {
                var newRadius = ORBIT_MAX_RADIUS+(Math.sqrt(dist-ORBIT_MAX_RADIUS));
            }
            
            //Make the orbit's trigger stop rotating, but update its radius
            this.trigger.rotate = false;
            this.trigger._updatePosition();
            
            setRadius(this, newRadius);
            orbit.updateNotes();
            
            DRAGGING_DESTROYABLE = true;
        }
        orbit.onDoubleClick = function(e, self){
            // Must use self because the event is bound to the dom element, whereas self is the actual Two element
            self.setFreeze(!self.frozen);
        }
        orbit.onMouseUp = function(e) {
            // Check if orbit is over trash, to destroy it
            if (isOverCenter(e.clientX, e.clientY)) {
                this.destroy();
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
                        this._object.trigger._updatePosition();
                    })
                    .onComplete(function() {
                        this._object.trigger.rotate = true;
                        this._object.trigger.sync();
                        UpdateState();
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
                var aa = (a.theta<-Math.PI/2 ? a.theta+2*Math.PI : a.theta);
                var bb = (b.theta<-Math.PI/2 ? b.theta+2*Math.PI : b.theta);
                return aa-bb; //organize notes in same order they play (clockwise from top)
            });
        }
        orbit.addNewNote = function(angle, sampler) {
            var dist = this.radius;
            var X = orbit.translation.x + Math.cos(angle) * dist;
            var Y = orbit.translation.y + Math.sin(angle) * dist;
            
            var note = CreateNote(X,Y);
            note.sampler = sampler;
            note.onSampler = false;
            note.fill = sampler.color;
            note.theta = angle;
            note.prevOrbit = note.orbit = this;
            this.notes.push(note);
            this.sortNotes();
        }
    
        addInteraction(orbit);

        return orbit;
    }
    
    function CreateTrigger(orbit) {
        /*
            A marker that triggers notes as it rotates around its orbit.
        */
        var size = 12;
        var triggerX = CENTER.x;
        var triggerY = CENTER.y-orbit.radius-size - orbit.linewidth/2;
        var trigger = two.makePolygon(triggerX, triggerY, size);
        trigger.fill = '#777777';
        trigger.stroke = 'none';
        trigger.orbit = orbit;
        trigger.rotate = true;
        trigger.theta = -Math.PI/2; //local variable for tracking the trigger's angle
        trigger.rotation = 0; //two.js built-in variable

        LAYERS['orbits'].add(trigger);
        
        trigger.update = function() {
            if (this.orbit.frozen || PAUSED) {
                // Stop all updates
                return;
            }

            // Record angle theta before updating
            var oldTheta = this.theta;
            
            // Rotate the trigger
            if (this.rotate == true) {
                // Set a new angle theta
                var dTheta = (2*Math.PI) * (RADIUS_SNAP / this.orbit.radius) * ((TEMPO/60) * dt);
                var newTheta = oldTheta + dTheta;
                this.theta = ((newTheta + Math.PI) % (2*Math.PI)) - Math.PI;
                this._setRotation();
                
                // Play notes that the trigger just passed
                for (var i=0; i<this.orbit.notes.length; i++) {
                    var n = this.orbit.notes[i];
                    var nt = n.theta;
                    if (nt != null) { //just in case
                        if (Util.isAngleBetween(nt, oldTheta, this.theta)) {
                            // Trigger a note!
                            if (!GLOBAL_MUTE) {
                                var snd = n.sampler.audio.play();
                                n.sampler.audio.volume(n.volume, snd);
                            }
                            // Animate the note
                            n.scale = 1.5;
                            tweenToScale(n, 1, 200);
                        }
                    } else {console.log("error: note on orbit "+this.orbit+" has theta = 'null'.")}
                }
            }
            
            this._updatePosition();
        }
        trigger.sync = function() {
            // Resync the trigger according to the global time. Needs to happen if orbit is resized, frozen, or other such nonsense.
            var newTheta = (2*Math.PI) * (RADIUS_SNAP / this.orbit.radius) * ((TEMPO/60) * TIME) - Math.PI/2;
            this.theta = ((newTheta + Math.PI) % (2*Math.PI)) - Math.PI;
            this._setRotation();
            this._updatePosition();
        }
        trigger._setRotation = function() {
            this.rotation = this.theta - Math.PI/2;
        }
        trigger._updatePosition = function() {
            // Move trigger along the edge of the orbit based on the rotation
            var dist = this.orbit.radius + size + this.orbit.linewidth/2;
            this.translation.x = CENTER.x + Math.cos(this.theta) * dist;
            this.translation.y = CENTER.y + Math.sin(this.theta) * dist;
        }
        
        trigger.sync();
        
        return trigger;
    }
    
    function CreatePolygon(orbit) {
        /*
            A representation of the layout of notes on an orbit. Can be dragged to move all notes simultaneously.
        */
        var polygon = new Two.Path();
        two.add(polygon);
        polygon.fill = polygon.stroke = '#aaaaaa';
        polygon.linewidth = 2*NOTE_RADIUS+10;
        polygon.join = 'round';
        polygon.cap = 'round';
        polygon.orbit = orbit;
        
        LAYERS['polygons'].add(polygon);
        
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
            if (SHOW_POLYGONS) {
                this.tweenFade.to({ op:this.maxOpacity }, 500)
                    .onComplete(function() {
                        //do nothing: we need an placeholder function to cancel the function set in polygon.disappear()
                    })
                    .start();
                $(this._renderer.elem).css({'cursor': 'move'});
                this.fill = this.stroke = '#aaaaaa';
            }
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

            UpdateState();
        }
        polygon.onMouseHover = function() {
            this.hover = true;
        }
        polygon.onMouseEnter = function() {
            if (this.op > .5) {
                /* The mouse *just* left the polygon, and it is fading away.
                   So, make it appear again. */
                this.appear();
            }
        }
        polygon.onMouseLeave = function(e, offset, localClickPos) {
            polygon.hover = false;
            if (!this.dragging) {this.disappear();}
        }
        polygon.onGlobalMouseUp = function(e) {
            if (polygon.dragging && !polygon.hover) {
                polygon.dragging = false;
                polygon.disappear();
            }
        };
        
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
        
        return polygon;
    }
    
    function CreateNote(x, y) {
        /*
            Drag notes onto and around orbits to create the groove structure.
        */
        var note = two.makeCircle(x, y, NOTE_RADIUS);
        note.fill = 'red';
        note.stroke = 'none';
        note.linewidth = 0;
        note.radius = NOTE_RADIUS;
        note.orbit = null;
        note.prevOrbit = null; //used when returning to the note's previous location
        note.sampler = null; //set by the sampler when it creates the note
        note.onSampler = true;
        note.prevPos = {x:x, y:y};
        note.theta = 0; //direction (in radians) of the note relative to its orbit's center
        note.volume = 1;
        note.hovering = false;
        note.dragging = false;
        note.selected = false;

        addInteraction(note);

        Notes.push(note);
        LAYERS['notes'].add(note);
        
        note.tweenToRadius = function(r) {
            var tweenRadius = new TWEEN.Tween(this)
                .to({ radius:r }, 200)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    setRadius(this._object, this._object.radius);
                })
                .start();
        }
        /*note.onGlobalMouseMove = function(e, offset, localClickPos) {
            // If on a sampler, make a growing animation
            if (this.onSampler && !this.dragging) {
                setCursor(this, "hand");
                if (isOverCircle(e.clientX, e.clientY, this.translation.x, this.translation.y, 2.5*this.radius)) {
                    if (!this.hovering) {
                        this.hovering = true;
                        tweenToScale(this, PHI, 200);
                    }
                } else {
                    if (!this.selected && this.hovering) {
                        this.hovering = false;
                        tweenToScale(this, 1, 200);
                    }
                }
            }
            
            // If on an orbit, make the orbit's polygon appear
            if (this.orbit != null) {
                if (isOverCircle(e.clientX, e.clientY, this.translation.x, this.translation.y, this.radius)) {
                    if (!this.hovering) {
                        this.hovering = true;
                        this.orbit.polygon.appear();
                    }
                } else {
                    if (this.hovering) {
                        this.hovering = false;
                    }
                }
            }
        }*/
        note.onMouseEnter = function(e) {
            // If on a sampler, make a growing animation
            if (this.onSampler && !this.dragging) {
                setCursor(this, "hand");
                if (!this.hovering) {
                    this.hovering = true;
                    tweenToScale(this, PHI, 200);
                }
            }
            
            // If on an orbit, make the orbit's polygon appear
            if (this.orbit != null) {
                if (!this.hovering) {
                    this.hovering = true;
                    this.orbit.polygon.appear();
                }
            }
        }
        note.onMouseLeave = function(e) {
            // If on a sampler, make a shrinking animation
            if (this.onSampler && !this.dragging) {
                if (!this.selected && this.hovering) {
                    this.hovering = false;
                    tweenToScale(this, 1, 200);
                }
            }
            
            // If on an orbit, make the orbit's polygon disappear
            if (this.orbit != null) {
                if (this.hovering) {
                    this.hovering = false;
                }
            }
        }
        note.onClick = function(e) {
            // If on a sampler, preview this note
            if (this.onSampler) {
                this.sampler.audio.play();
                var t2 = tweenToScale(this, 1.5, 50);
                var t1 = tweenToScale(this, 1, 50);
                t1.chain(t2);
            }
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
            if (!this.dragging) {
                this.dragging = true;

                // Return to regular size if dragged off sampler
                if (this.sampler != null) {tweenToScale(this, 1, 200);}
            }

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
                    if ((this.orbit != Orbits[i])) {

                        // Add the note to the orbit
                        this.orbit = Orbits[i];
                        this.orbit.notes.push(this);
                        this.orbit.sortNotes();

                        // Begin a tween to smooth the transition moving onto the orbit
                        this.tweenMove.to(goalPos, tweenTime).start();
                    }
                    notOnOrbit = false;
                    break;

                } else {
                    // Begin a tween to smooth the transition moving off of the orbit
                    if ((this.orbit == Orbits[i])) {
                        this.tweenMove.to(goalPos, tweenTime);
                        this.tweenMove.start();
                    }
                }
            }
            if (notOnOrbit) {note.orbit = null;}

            // If orbit has changed, removed the note from the orbit it was just on
            if (this.orbit != oldOrbit && oldOrbit != null) {
                oldOrbit.removeNote(this);
            }

            // Finally, actually move to the desired position
            if (this.tweenMove._isPlaying == true) {
                this.tweenMove._valuesEnd = goalPos;
            } else {
                this.translation.set(goalPos.x, goalPos.y);
            }

            // After moving, update the note and its related objects
            if (this.orbit != null) {
                this.updateTheta();
                this.orbit.polygon.update();
            }

            this.dragging = true;
            DRAGGING_DESTROYABLE = true;
        }
        note.onMouseUp = function(e, offset, localClickPos) {
            this.dragging = false;
            
            // Check if note is over center trash, to destroy it
            if (isOverCenter(e.clientX, e.clientY)) {
               // If dragged directly from a sampler, tell the sampler its note has been removed
                if (this.onSampler == true) {
                    this.sampler.hasNote = false;
                    this.onSampler = false;
                }
                
                // Delete this note
                this.destroy();
                
            } else {
                if (this.orbit != null) {
                    // If dragged directly from a sampler, tell the sampler its note has been removed
                    if (this.onSampler == true) {
                        this.sampler.hasNote = false;
                        this.onSampler = false;
                    }
                    
                    // Record the note's new orbit
                    this.prevOrbit = this.orbit;
                } else {
                    if (this.prevPos != undefined) {
                        // Note is over blank space, so return to previous position
                        var time = Math.max(200, Util.pointDistance( {x:this.translation.x, y:this.translation.y}, this.prevPos ));
                        this.tweenMove.to(this.prevPos, time);
                        this.tweenMove.start();
                        if (this.prevOrbit != null) { // If the note used to be on an orbit (as opposed to being dragged directly from a sampler)
                            this.orbit = this.prevOrbit;
                            this.orbit.notes.push(this);
                            this.orbit.sortNotes();
                        }
                    } else {this.destroy();}
                }
            }

            UpdateState();
        }
        note.setVolume = function(v) {
            var vol = Util.clamp(v, 0, 1);
            this.volume = vol;
            setRadius(this, (.5+.5*vol)*NOTE_RADIUS);
        }
        note.updateTheta = function() {
            if (this.orbit != null) {
                this.theta = Util.pointDirection(this.orbit.translation, this.translation);
                this.orbit.sortNotes();
            }
        }
        note.update = function() {
            // Update note's parameter object
            if (note.parameter != undefined) {
                var X = this.translation.x + 2.5*NOTE_RADIUS*Math.cos(this.theta);
                var Y = this.translation.y + 2.5*NOTE_RADIUS*Math.sin(this.theta);
                note.parameter.translation.set(X, Y);
            }
        }
        note.destroy = function() {
            var index = Notes.indexOf(this);
            if (index > -1) {Notes.splice(index, 1);}
            LAYERS['notes'].remove(this);
            two.remove(this.parameter);
            two.remove(this);
        }
        
        // Make the note tween to appear when created
        note.scale = 0;
        tweenToScale(note, 1, 300);

        //UpdateState();

        return note;
    }
    
    function CreateNoteParameter(note) {
        var par = two.makeRectangle(-LINE_W, -LINE_W, 2*LINE_W, 2*LINE_W);
        par.stroke = "gray";
        par.linewidth = .5*LINE_W;
        
        par.note = note;
        par.volValue = note.volume;
        
        addInteraction(par);
        setCursor(par, 'ns-resize');
        
        par.onDrag = function(e) {
            var vol = Util.clamp( par.volValue + (this.translation.y - e.clientY)/100, .25, 1);
            this.note.setVolume( vol );
        }
        
        /*par.tweenFade = new TWEEN.Tween(par)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(function() {
                this._object.opacity = this._object.op;
            });
        
        par.appear = function() {
            this.tweenFade.to({ op:1 }, 500)
                .start();
        }
        par.disappear = function() {
            this.tweenFade.to({ op:.5 }, 500)
                .start();
        }*/
        
        return par;
    }
    
    function CreateSampler(x, y) {
        /*
            Samplers create notes and stores references to their audio files.
        */
        var sampler = two.makeCircle(x, y, .5*NOTE_RADIUS);
        sampler.color = PALETTE[Samplers.length];
        sampler.stroke = 'none';
        sampler.fill = '#cccccc';
        sampler.linewidth = 0;
        sampler.radius = .5*NOTE_RADIUS;
        sampler.hasNote = false;
        sampler.index = Samplers.length;
        if (SOUND_FILES[Samplers.length] !== undefined) {
            var fileName = "assets/samples/" + SOUND_FILES[Samplers.length] + ".wav";
            sampler.audio = new Howl({src: fileName});
        } else {
            sampler.audio = null;
        }
        

        Samplers.push(sampler);
        LAYERS['hud'].add(sampler);

        sampler.update = function() {
            // Check if the sampler needs another note
            if (!this.hasNote && this.audio != null) {
                var note = CreateNote(this.translation.x, this.translation.y);
                note.sampler = this;
                note.onSampler = true;
                note.fill = this.color;
                this.hasNote = true;
            }
        }
        return sampler;
    }
    
    function CreateCenter(x, y) {
        /*
            A button that either which adds orbits (+), or destroys notes and orbits dragged onto it (-).
        */
        var CreateTrash = function(x, y) {
            var dist = .4*CTL_RADIUS;
            var line = two.makeLine(-dist, 0, +dist, 0);
            line.stroke = LT_GRAY;
            line.linewidth = LINE_W;
            line.cap = 'round';

            var trash = CreateButton(0, 0, CTL_RADIUS);
            trash.fill = 'rgba(250,155,155,1)';
            trash.add(line);
            trash.center();
            trash.translation.set(x,y);
            
            trash.visible = true;

            addInteraction(trash);
            setCursor(trash, 'default');

            return trash;
}
        var CreatePlus = function(x, y) {
            var dist = .4*CTL_RADIUS;
            var line1 = two.makeLine(0, -dist, 0, +dist);
            var line2 = two.makeLine(-dist, 0, +dist, 0);
            var X = two.makeGroup(line1, line2);
            X.stroke = LT_GRAY;
            X.linewidth = LINE_W;
            X.cap = 'round';
            
            var plus = CreateButton(0, 0, CTL_RADIUS);
            plus.add(X);
            plus.center();
            plus.translation.set(x, y);
            
            plus.visible = true; //custom variable for keeping track of if button is visible
            
            plus.callBack = function(e) {
                if (this.visible) {
                    // Create a new orbit
                    this.clicked = true;
                    this.hoverOver = false;
                    tweenToScale(this, 0, 200);
                    var orbit = CreateOrbit(10);
                    
                    // Transfer mouse control to the newly created orbit
                    $(document.getElementById(this.id)).trigger('mouseup');    //end the click event on the (+)
                    $(document.getElementById(orbit.id)).trigger('mousedown'); //force trigger the mousedown event for the orbit, which allows us to hold onto it
                    orbit.onDrag(e, {x:0, y:0});                               //forces orbit.onDrag, which updates the radius, trigger animation, etc
                }
            }

            return plus;
        }
        
        var p = CreatePlus(x, y);
        var t = CreateTrash(x, y);
        var c = two.makeGroup(p, t);
        c.state = 'plus';
        LAYERS['hud'].add(c);

        addInteraction(c);
        
        c.onGlobalMouseMove = function(e) {
            // Check if dragging destroyable
            if (DRAGGING_DESTROYABLE) {
                if ((c.getState() != 'trash') && (!p.clicked)) {
                    c.setState('trash');
                }
            }
        };
        c.onGlobalMouseUp = function(e) {
            /* Use setTimeout() to trigger this function next frame. If an object is being dragged to the trash,
            this ensures the dragged object's mouseUp event triggers before the trash state is updated,
            properly destroying the object. */
            setTimeout( function() {
                c.setState('plus');
                DRAGGING_DESTROYABLE = false;
            }, 1);
        };
        
        c.setState = function(s) {
            c.state = s;
            switch(s) {
                case('plus'): {
                    if (Orbits.length < MAX_ORBITS) {
                        tweenToScale(p, 1, 200);
                        p.visible = true;
                    } else p.visible = false;
                    p.clicked = false;
                    tweenToScale(t, 0, 200);
                    t.visible = false;
                    break;
                }
                case('trash'): {
                    tweenToScale(p, 0, 200);
                    p.visible = false;
                    tweenToScale(t, 1, 200);
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
    
    function CreateSlider(x, y, length) {
        /*
            A template for interactive sliders that vary a parameter (such as volume).
        */
        var line = two.makeLine(0, 0, 0, -length);
        line.linewidth = 5*LINE_W;
        line.cap = 'round';
        line.stroke = '#333333';
        
        var dial = two.makeCircle(0, 0, PHI*LINE_W);
        dial.fill = 'LT_GRAY';
        dial.linewidth = .5*LINE_W;
        dial.stroke = '#333333';
        
        var slider = two.makeGroup(line, dial);
        slider.length = length;
        slider.dragging = false;
        slider.line = line;
        slider.dial = dial;
        dial.slider = slider;
        
        addInteraction(slider);
        setCursor(slider, 'pointer');
        slider.onMouseDown = slider.onDrag = function(e) {
            var top = $(slider.line._renderer.elem).offset().top - $('#main-container')[0].getBoundingClientRect().top;
            var scalar = slider.scale*slider.parent.scale;
            var val = Math.max(0, Math.min(1, 1-(e.clientY-top) / (length*scalar) ));
            slider.setValue(val);
            slider.dragging = true;
        }
        slider.onGlobalMouseUp = function() {
            slider.dragging = false;
        }
        slider.callBack = function() {
            // a default empty callback function. overwritten by specific instances of 'slider'
        }
        slider.setValue = function(val) {
            this.value = val;
            this.dial.translation.y = -length * this.value;
            this.dial.slider.callBack();
        };
        
        
        slider.setValue(1); //default value
        
        slider.translation.set(x, y);
        
        return slider;
    }
    
    function CreateSliderButton(x, y, r, h, imageName) {
        var bg = two.makeLine(0, 0, 0, 0);
        bg.linewidth = 2*r;
        bg.cap = "round";
        bg.stroke = GRAY;

        var slider = CreateSlider(0, -50, h-50);
        slider.fill = bg.stroke;
        slider.stroke = LT_GRAY;
        
        var mask = two.makeRectangle(0, 0, 2*r, 2*r);
        
        var btn = CreateButton(0, 0, r, imageName);
        btn.onMouseEnter = btn.onMouseLeave = function(e) {
            // Overwrite default function
        }
        
        var sliderBtn = two.makeGroup(bg, btn, slider, mask);
        sliderBtn.translation.set(x, y);
        sliderBtn.btn = btn;
        sliderBtn.slider = slider;
        sliderBtn.hovering = false;
        sliderBtn.expanded = false;
        sliderBtn.height = 0;
        sliderBtn.mask = mask;
        
        addInteraction(sliderBtn);
        setCursor(sliderBtn, 'pointer');

        sliderBtn.appear = function() {
            var tweenGrow = new TWEEN.Tween(this)
                .to({ height:h }, 500)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    bg.vertices[0].y = -this._object.height;
                    mask.vertices[0].y = -(this._object.height+r);
                    mask.vertices[1].y = -(this._object.height+r);
                })
                .start();
            tweenToScale(this, 1.2, 200);
        }
        sliderBtn.disappear = function() {
            var tweenShrink = new TWEEN.Tween(this)
                .to({ height:0 }, 500)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(function() {
                    bg.vertices[0].y = -this._object.height;
                    mask.vertices[0].y = -(this._object.height+r);
                    mask.vertices[1].y = -(this._object.height+r);
                })
                .start();
            tweenToScale(this, 1, 200);
        }
        sliderBtn.onMouseEnter = function() {
            this.hovering = true;
            this.expanded = true;
            this.appear();
        }
        sliderBtn.onMouseLeave = function() {
            this.hovering = false;
            if (!slider.dragging) {
                this.expanded = false;
                this.disappear();
            }
        }
        sliderBtn.onGlobalMouseUp = function() {
            if (this.expanded && !this.hovering) {this.disappear();}
        }
        sliderBtn.btn.onMouseDown = function() { //overwrite default to remove tween
            this.on = !this.on;
            this.callBack();
        }
        sliderBtn.btn.onMouseUp = function() { //overwrite default to remove tween
            this.callBackUp();
        }

        return sliderBtn;
    }
    
    function CreateButton(x, y, r, imageName) {
        var circle = two.makeCircle(0, 0, r);
        circle.fill = GRAY;
        circle.stroke = 'none';
        circle.linewidth = 0;
        circle.radius = r;

        var image = null; //set later
        
        var btn = two.makeGroup(circle, image);
        btn.center();
        btn.translation.set(x, y);
        btn.circle = circle;
        btn.image = image;
        btn.hoverOver = false;
        btn.on = true;
        btn.clicked = false;
        
        addInteraction(btn);
        setCursor(btn, 'pointer');
        
        btn.setImage = function(iName) {
            if (iName !== undefined && iName !== null) {
                if (this.image != null) {
                    btn.remove(this.image);
                    two.remove(this.image);
                }
                var preimage = two.interpret(svgAssets[iName]);
                preimage.center();
                preimage.fill = LT_GRAY;
                var image = two.makeGroup(preimage);
                this.add(image);
                this.image = image;
            }
        }
        btn.setImageOffset = function(xoff, yoff) {
            this.image.children[0].translation.x = xoff;
            this.image.children[0].translation.y = yoff;
        }
        btn.callBack = function() {} // empty function by default
        btn.callBackUp = function() {} // empty function by default
        /*btn.onGlobalMouseMove = function(e) {
            // Check if mouse is over the button
            if (isOverCircle(e.clientX, e.clientY, this.translation.x, this.translation.y, this.circle.radius)) {
                if (!this.hoverOver && !this.clicked) {
                    tweenToScale(this, 1.2, 200);
                    this.hoverOver = true;
                }
            } else {
                if (this.hoverOver && !this.clicked) {
                    tweenToScale(this, 1, 200);
                    this.hoverOver = false;
                }
            }
        }*/
        btn.onMouseEnter = function(e) {
            if (!this.hoverOver && !this.clicked) {
                tweenToScale(this, 1.2, 200);
                this.hoverOver = true;
            }
        }
        btn.onMouseLeave = function(e) {
            if (this.hoverOver && !this.clicked) {
                tweenToScale(this, 1, 200);
                this.hoverOver = false;
            }
        }
        btn.onMouseDown = function(e) {
            this.on = !this.on;
            this.clicked = true;
            tweenToScale(this, 1, 100);
            this.callBack(e);
        }
        btn.onMouseUp = function(e) {
            this.clicked = false;
            tweenToScale(this, 1.2, 100);
            this.callBackUp(e);
        }
        
        btn.setImage(imageName);
        return btn;
    }
    
    // Reusable global functions
    var isOverCircle = function(x, y, cx, cy, r) {
        if (Util.pointDistance({x:cx, y:cy}, {x:x, y:y}) < r) {
            return true;
        } else return false;
    }
    var isOverCenter = function(x, y) {
        return isOverCircle(CENTER.x, CENTER.y, x, y, CTL_RADIUS)
    }
    var isOverRectangle = function(x, y, rx1, ry1, rx2, ry2) {
        return ((rx1 <= x && x <= rx2) && (ry1 <= y && y <= ry2));
    }
    var setRadius = function(circle, r) {
        circle.radius = r;
        _.each(circle.vertices, function(v) {
            v.setLength(r);
        });
    }
    var tweenToScale = function(obj, s, time) {
        // Define and start a tween to scale the object
        var tweenScale = new TWEEN.Tween(obj)
            .to({ scale:s }, time)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        return tweenScale;
    }
    var tweenToPosition = function(obj, xx, yy, time) {
        // Define and start a tween to move the object
        var tweenPos = new TWEEN.Tween(obj.translation)
            .to({ x: xx, y: yy }, time)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
        return tweenPos;
    }
    var setCursor = function(obj, type) {
        $(obj._renderer.elem).css({cursor: String(type)});
    }
    var saveMIDI = function() {
        
        //Confirm there are notes to save, aborting if there are none
        var noteNum = 0;
        for (var i=0; i<Orbits.length; i++) {
            noteNum += Orbits[i].notes.length;
        }
        if (noteNum == 0) {return false;}
        
        // Create a new MIDI file with jsmidgen, and a track to store the note data
        var file = new Midi.File();
        var track = new Midi.Track();
        file.addTrack(track);
        track.setTempo(TEMPO);
        
        // Determine MIDI length that guarentees all orbits loop and end aligned
        var len = 1;
        for (var i=0; i<Orbits.length; i++) {
            for (var j=i+1; j<Orbits.length; j++) {
                var a = Math.round(Orbits[i].radius/RADIUS_SNAP);
                var b = Math.round(Orbits[j].radius/RADIUS_SNAP);
                len = Math.max(len, Util.lcm(a, b));
            }
        }
        
        // Compile an array of all the notes on all the orbits
        var allNotes = [];
        for (var i=0; i<Orbits.length; i++) {
            var o = Orbits[i];
            
            // Smaller orbits need to repeat since bigger orbits take longer to complete
            var repeats = len/Math.round(o.radius/RADIUS_SNAP);
            for (var j=0; j<repeats; j++) {
                for (var k=0; k<o.notes.length; k++) {
                    // Record the time and type of each note on this orbit
                    var n = o.notes[k];
                    var angle = n.theta<-Math.PI/2 ? n.theta+2*Math.PI : n.theta; //returns a theta between (-Pi/2, 3Pi/2]
                    var fraction = (angle+Math.PI/2)/(2*Math.PI); //returns the fraction of the note's angle on the orbit (0 at top, increases clockwise up to 1)
                    var time = (j+fraction) * (o.radius/RADIUS_SNAP) * file.ticks; //(ticks per beat, default=128)
                    var noteMarker = {
                        time: time,
                        type: n.sampler.index,
                    };
                    allNotes.push(noteMarker);
                }
            }
        }
        
        // Sort all notes chronologically
        allNotes.sort(function(a,b) {
            return a.time-b.time;
        });
        
        // Add all notes to MIDI track
        var tPrev = 0;
        var noteDur = 16; //default
        for (var i=0; i<allNotes.length; i++) {
            var t = allNotes[i].time;
            var dur = noteDur;
            
            // Shorten note if following note is closer than noteDur
            if (i < allNotes.length-1) {dur = Math.min(noteDur, allNotes[i+1].time-t);}
            
            // Add the note and record the time it finishes
            track.addNote(0, 35+allNotes[i].type, dur, (t-tPrev));
            tPrev = t + dur;
        }
        
        /* // For testing purposes:
        // Create a new Track for the MIDI file
        var track = new Midi.Track();
        file.addTrack(track);
        
        // Populate track with a scale
        track.addNote(0, 'c4', 64);
        track.addNote(0, 'd4', 64);
        track.addNote(0, 'e4', 64);
        track.addNote(0, 'f4', 64);
        track.addNote(0, 'g4', 64);
        track.addNote(0, 'a4', 64);
        track.addNote(0, 'b4', 64);
        track.addNote(0, 'c5', 64);
        */
        
        // Get MIDI data to be saved
        var bytesU16 = file.toBytes(); //returns a UTF-16 encoded string
        
        // Convert data to UTF-8 encoding
        var bytesU8 = new Uint8Array(bytesU16.length);
        for (var i=0; i<bytesU16.length; i++) {
            bytesU8[i] = bytesU16[i].charCodeAt(0);
        }

        // Populate a blob with the data
        var blob = new Blob([bytesU8], {type: "audio/midi"});
        /*
          NOTE: FileSaver.min.js uses blob object to save data, but blobs only save with UTF-8 encoding.
          Setting the blob's charset=ANSI or =UTF-16 does not change encoding.
        */
        
        // Export the file!
        saveAs(blob, "cyclic_drums.mid");
        
        return true;
    }
    
    // Interactivity code from https://two.js.org/examples/advanced-anchors.html
    function addInteraction(shape) {

        var offset = shape.parent.translation; //translation relative to parent (ie if in group, where coordinates of a child are relative to the parent)
        var localClickPos = {x: 0, y: 0};
        var dragDist = 0; //differentiate a click from a drag (and give the user a bit of buffer) by measuring the distance the mouse moves during a mousedown-mouseup interval
        
        var correctE = function(e) {
            // Correct e to account for TWO's offset and scaling in the window
            var SVGscale = $(two.renderer.domElement).height() / two.height;
            var SVGorigin = $('#main-container')[0].getBoundingClientRect();
            e.clientX -= SVGorigin.left;
            e.clientX /= SVGscale;
            e.clientY -= SVGorigin.top;
            e.clientY /= SVGscale;
        }
        
        var drag = function(e) {
            e.preventDefault();
            correctE(e);
            dragDist += 1;
            
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
            correctE(e);
            localClickPos = {x: e.clientX-shape.translation.x, y: e.clientY-shape.translation.y};
            dragDist = 0;
            $(window)
                .bind('mousemove', drag)
                .bind('mouseup', dragEnd);
            
            //Call the shape's mouse click method, if it has one
            if (typeof shape.onMouseDown === 'function') {shape.onMouseDown(e, offset, localClickPos);}
        };
        var touchStart = function(e) {
            e.preventDefault();
            var touch = e.originalEvent.changedTouches[0];
            correctE(e);
            localClickPos = {x: touch.pageX-shape.translation.x, y: touch.pageY-shape.translation.y}
            dragDist = 0;
            $(window)
                .bind('touchmove', touchDrag)
                .bind('touchend', touchEnd);
            return false;
            
            //Call the shape's mouse click method, if it has one
            if (typeof shape.onMouseDown === 'function') {shape.onMouseDown(e, offset, localClickPos);}
        };
        var dragEnd = function(e) {
            e.preventDefault();
            correctE(e);
            $(window)
                .unbind('mousemove', drag)
                .unbind('mouseup', dragEnd);
            
            //Call the shape's click release method, if it has one
            if (typeof shape.onMouseUp === 'function') {shape.onMouseUp(e, offset, localClickPos);}
            if (dragDist < 5) {if (typeof shape.onClick === 'function') {shape.onClick(e, offset, localClickPos);}}
        };
        var touchEnd = function(e) {
            e.preventDefault();
            correctE(e);
            $(window)
                .unbind('touchmove', touchDrag)
                .unbind('touchend', touchEnd);
            
            //Call the shape's click release method, if it has one
            if (typeof shape.onMouseUp === 'function') {shape.onMouseUp(e, offset, localClickPos);}
            if (dragDist < 5) {if (typeof shape.onClick === 'function') {shape.onClick(e, offset, localClickPos);}}
            
            return false; //<--- anyone know why this returns false?
        };
        var enter = function(e) {
            correctE(e);
            e.preventDefault();
            
            //Call the shape's mouse enter method, if it has one
            if (typeof shape.onMouseEnter === 'function') {shape.onMouseEnter(e, offset, localClickPos);}
        };
        var leave = function(e) {
            correctE(e);
            e.preventDefault();
            
            //Call the shape's mouse leave method, if it has one
            if (typeof shape.onMouseLeave === 'function') {shape.onMouseLeave(e, offset, localClickPos);}
        };
        var hover = function(e) {
            correctE(e);
            e.preventDefault();
            
            //Call the shape's mouse move method, if it has one
            if (typeof shape.onMouseHover === 'function') {shape.onMouseHover(e, offset, localClickPos);}
        };

        two.update(); // Need to call this before attempting to touch the SVG so that Twojs will actually create it

        $(shape._renderer.elem)
            .css({
                'cursor': 'move',
            })
            .bind('mousedown', dragStart)
            .bind('mouseup', dragEnd)
            .bind('touchstart', touchStart)
            .bind('mouseenter', enter)
            .bind('mouseleave', leave)
            .bind('mouseover', hover);

        $(shape._renderer.elem).dblclick(function(e){
            e.preventDefault();
            correctE(e);
            if (typeof shape.onDoubleClick === 'function') {shape.onDoubleClick(e,shape);}
        });
        
        // Define global mouse events
        document.addEventListener('mousemove', function(e) {
            e.preventDefault();
            correctE(e);
            dragDist += 1;
            if (typeof shape.onGlobalMouseMove === 'function') {shape.onGlobalMouseMove(e);}
        });
        document.addEventListener('mouseup', function(e) {
            e.preventDefault();
            correctE(e);
            if (typeof shape.onGlobalMouseUp === 'function') {shape.onGlobalMouseUp(e);}
            if (!dragDist < 5) {if (typeof shape.onGlobalClick === 'function') {shape.onGlobalClick(e);}}
        });
        document.addEventListener('mousedown', function(e) {
            e.preventDefault();
            correctE(e);
            dragDist = 0;
            if (typeof shape.onGlobalMouseDown === 'function') {shape.onGlobalMouseDown(e);}
        });
      }

    // Global time, in seconds
    var START_TIME = new Date();
    var REAL_TIME = START_TIME;
    var REAL_PREV_TIME = 0;
    var REAL_dt = 0;
    var TIME = 0;
    var dt = 0;
    function updateTime() {
        REAL_TIME = (new Date() - START_TIME) / 1000;
        REAL_dt = REAL_TIME-REAL_PREV_TIME;
        REAL_PREV_TIME = REAL_TIME;
        
        if (!PAUSED) {
            dt = REAL_dt;
            TIME += dt;
        }
    }
   
    // Initialize and create the UI
    Init();
    CreateCenter(CENTER.x, CENTER.y);
    CreateHUD();
    SetupInitialState();
    
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
