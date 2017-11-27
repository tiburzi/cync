var SaveState = (function (scope) {
	function SaveState(){
		this.state = {
			'orbits':[], // Just need to store radii 
			'notes':[], // Just need to store theta, type, and index of orbit
			'tempo':-1, // Just a number  
		};
	}

	SaveState.prototype.load = function(){
		// Tries to load state from url. Returns null if no state. Otherwise, returns state object 
		if(this._decodeUrl(window.location.href)){
			return JSON.parse(JSON.stringify(this.state)); // Make a copy of the state so we don't change this as we're re-constructing th estate
		}

		return null;
	}

	SaveState.prototype.update = function(orbits,notes,tempo){
		// Extract the bare minimum we need to save this state 
		var orbitData = [];

		orbits.forEach(function(o) { 
			orbitData.push(o.radius);
		}); 
		this.state.orbits = orbitData;

		var noteData = [];
		notes.forEach(function(n) { 
			if(n.orbit){
				// Save this note 
				var orbitIndex = -1;
				for(var i=0;i<orbits.length;i++){
					if(orbits[i] == n.orbit){
						orbitIndex = i;
						break;
					}
				}
				var samplerIndex = n.sampler.index;

				noteData.push({oIndex:orbitIndex,theta:n.theta,sIndex:samplerIndex})
			}
		})
		this.state.notes = noteData;

		this.state.tempo = tempo;

		// Construct url
		var url = this._makeUrl();
		// Put it in the url 
		history.pushState(null,null,url);	

		
	}

	// Underscore means it's a 'private' function. Not supposed to be used outside this class
	SaveState.prototype._makeUrl = function(){
		// Convert the inner state into a url to be saved 
		// First convert to a JSON 
		var jsonString = JSON.stringify(this.state);
		// Now convert it into base64 because you can't put characters like '{}' in a url 
		var b64 = btoa(jsonString);
		// Preserve set param 
		var prepend = '';
		if(Util.getParameterByName('set')){
			prepend += 'set=' + String(Util.getParameterByName('set')) + "&"
		}
		var url = "?"+prepend+"state=" + b64;
		return url;
	}

	SaveState.prototype._decodeUrl = function(url){
		// Parses state from string if found and sets it to the internal state object
		var stateString = Util.getParameterByName("state",url);
		if(stateString == null) return false;
		var jsonString = atob(stateString);
		var state = JSON.parse(jsonString);

		this.state = state;

		return true;
	}

	scope.SaveState = SaveState;
	return SaveState;
})(typeof exports === 'undefined' ? {} : exports);