var preload = function(game) {};
 
preload.prototype = {
	preload: function() { 
        this.game.load.image('test_image', 'assets/images/test_image.png');
	},
    init: function(){
    	//Set up the background color
    	// We can access `this.stage` because this object (`preload`) is a Phaser game state
    	this.stage.backgroundColor = "#f8f8f8";

    	// Set up how the game resizes
        var ScaleGame = function(s){
            // Make the game maintain 16:9 aspect ratio
            // limiting my width, or height if the height is too small
            s.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
            s.game.scale.pageAlignHorizontally = true;
            s.game.scale.pageAlignVertically = true;
            
            var w = window.innerWidth;
            var h = window.innerHeight;
            var desiredHeight = w * (9/16);
            var factor = 1;
            if(desiredHeight > h){
                // If desired exceeds what we have, then limit by height 
                var newWidth = h * (16/9);
               factor = h/s.game.height;
            } else {
                var newHeight = w * (9/16);
                factor = w/s.game.width;
            }
            s.scale.setUserScale(factor,factor);

        }        

        ScaleGame(this);

        // I'm creating this variable because, accessing `this` inside the following
        // 	function means something different than `this` in here, and  want this `this`
    	var self = this;
        window.addEventListener('resize', function () { 
            ScaleGame(self);
        })
    },
  	create: function(){
		this.game.state.start('main');
	}
}