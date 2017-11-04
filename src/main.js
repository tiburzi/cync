var main = function(game) {
    counter = 0;
    image = null;
};
 
main.prototype = {
  	create: function() {
		image = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'test_image');
        image.anchor.setTo(0.5, 0.5);
    },
    
    update: function() {
		counter += 0.05;
        image.y = this.game.height/2 + Math.sin(.83*counter) * 100;
        image.x = this.game.width/2 + Math.cos(.97*counter) * 100;
	}
}