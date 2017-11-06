var preload = function(game) {};
 
preload.prototype = {
	preload: function() { 
        this.game.load.image('test_image', 'images/test_image.png');
	},
    
  	create: function(){
		this.game.state.start('mainState');
	}
}