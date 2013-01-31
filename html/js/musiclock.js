// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

var MusiClock = function(list) {
	this.list = list;
};
MusiClock.prototype = {
	init: function() {
		this.attachHandlers();
		if (!this.restoreState()) {
			var mood = this.getFirstMood();
			this.update({
				mood: "working_pep",
				playlist: 0,
				track: 0,
				time: 0,
				volume: 1,
				playing: false
			});
		}
		this.checkTime();
		this.startTrackingState();
	},
	saveState: function() {
		if (window.localStorage && JSON) {
			window.localStorage.state = JSON.stringify(this.state);
		}
		// FIXME: fall back to cookies
	},
	restoreState: function() {
		var state;
		if (window.localStorage && window.localStorage.state && JSON) {
			state = JSON.parse(window.localStorage.state);
		}
		// FIXME: fall back to cookies

		if (typeof state === "object") {
			this.update(state);
			return true;
		}
		return false;
	},
	startTrackingState: function() {
		var $this = this;
		this.stateInterval = setInterval(function() {
			$this.saveState();
		}, 1000);
	},
	stopTrackingState: function() {
		clearInterval(this.stateInterval);
	},
	update: function(parameters) {
		var oldState = {}, drawRequired, key, drawWorthy = ["mood","playlist"];
		if (!this.state) {
			this.state = parameters;
			drawRequired = true;
		} else {
			oldState = JSON.parse(JSON.stringify(this.state));
		}
		for (key in parameters) {
			if (this.state.hasOwnProperty(key)) {
				if (this.state[key] !== parameters[key] && drawWorthy.indexOf(key) != -1) {
					drawRequired = true;
				}
				this.state[key] = parameters[key];
				switch(key) {
					case "mood":
						if (!this.list.hasOwnProperty(this.state.mood))
							this.state.mood = this.getFirstMood();
						if (oldState.mood !== this.state.mood)
							parameters.playlist = 0;
						this.checkTime();
						document.getElementById('moods').value = this.state.mood;
						break;
					case "playlist":
						this.state.time = 0;
						if (!this.list[this.state.mood].hasOwnProperty(this.state.playlist))
							this.state.playlist = 0;
						break;
					case "track":
						if (oldState.track !== this.state.track)
							this.killTrack(oldState.track);
						break;
				}
			}
		}
		if (drawRequired)
			this.markupPlaylist();
		if (drawRequired || "track" in parameters)
			this.gotoTrack(this.state.track);
	},
	attachHandlers: function() {
		var $this = this;
		document.getElementById('moods').onchange = function() {
			$this.update({mood: this.selectedOptions[0].value});
		}
		document.getElementsByTagName('body')[0].onkeyup = function(event) {
			console.log(event.keyCode);
			switch(event.keyCode) {
				case 38: $this.upVolume(); break;
				case 40: $this.downVolume(); break;
				case 32: $this.togglePause(); break;
				case 75: $this.prevMood(); break;
				case 74: $this.nextMood(); break;
				case 72: $this.prevTrack(); break;
				case 76: $this.nextTrack(); break;
				default: return true;
			}
			event.preventDefault();
			return false;
		};
	},
	/*
	 * checks the time against the list keys, and automatically repeats on the
	 * next key time.
	 *
	 * expects keys like "1500" to mean 15:00 or 3:00pm
	 */
	checkTime: function() {
		var $this = this, now = new Date(), hour, key, keys = [], nextHour,
			nextTime, wait;

		clearTimeout(this.timeout);

		hour = now.getHours().toString().pad(2, "0") + now.getMinutes().toString();
		for (var i = 0; i < this.list[this.state.mood].length; i++) {
			var playlist = this.list[this.state.mood][i];
			if (!playlist.list.length) continue;
			if (playlist.hour <= hour) { keys[0] = i; }
			else             { keys[1] = i; break; }
		}

		if (keys.length && keys[0] !== this.state.playlist) {
			this.fadeVolume(0, 1, function() {
				$this.update({playlist: keys[0]});
				setTimeout(function() {
					$this.fadeVolume($this.state.volume);
				}, 0);
			});
		}

		if (keys.length > 1) {
			nextHour = this.list[this.state.mood][keys[1]].hour;
			nextHour = nextHour.substr(0,2) + ':' + nextHour.substr(2,2) + ':00';
			nextTime = (new Date(now.toString().replace(/\d\d:\d\d:\d\d/, nextHour))).getTime();
			wait = nextTime - now.getTime();
			this.timeout = setTimeout(function() {
				$this.checkTime();
			}, wait);
		}
	},
	markupPlaylist: function() {
		var $this = this,
			markup = '',
			playlist = this.list[this.state.mood][this.state.playlist];

		markup += '<h2>' + this.state.mood + '</h2>';
		for (var i = 0; i < playlist.list.length; i++) {
			var file = playlist.list[i];
			var id = 'track_' + i;
			markup += '<label for="' + id + '">' + file + '</label>'
			+ '<audio id="' + id + '" controls>'
			+ '<source src="audio/' + this.state.mood + '/' + playlist.hour + '/' + file + '" />'
			+ '</audio>';
		}
		var list = document.getElementById('list');
		list.innerHTML = markup;
		var players = list.getElementsByTagName('audio');
		for (var i = 0; i < players.length; i++) {
			(function(i) {
				players[i].addEventListener('canplay', function() {
					if ($this.state.playing)
						this.currentTime = $this.state.time;
				});
				players[i].addEventListener('play', function() {
					console.log('play ' + i);
					$this.update({
						track: i,
						playing: true,
						insidePlay: true
					});
					// FIXME: messy way to revert outside closure, after event
					// chain finishes
					setTimeout(function() { $this.state.insidePlay = false; }, 0);
				});
				players[i].addEventListener('pause', function() {
					if (!$this.state.insidePlay && !$this.fadeVolumeInterval) {
						console.log('pause ' + i);
						$this.state.playing = false;
					}
				});
				players[i].addEventListener('timeupdate', function() {
					$this.state.time = this.currentTime;
				});
				players[i].addEventListener('ended', function() {
					console.log('end ' + i);
					// FIXME: pause fires before ended; I'm assuming ended
					// implies the audio WAS playing before paused, restoring
					// state
					$this.state.playing = true;
					$this.nextTrack();
				});
				players[i].addEventListener('volumechange', function() {
					if ($this.fadeVolumeInterval) return;
					$this.state.volume = this.volume;
				});
			})(i);
		}
	},
	getFirstMood: function() {
		for (var mood in this.list) { return mood; }
	},
	prevMood: function() {
		var prevMood;
		for (var mood in this.list) {
			if (prevMood && mood == this.state.mood) break;
			prevMood = mood;
		}
		this.update({mood: prevMood});
	},
	nextMood: function() {
		var firstMood, nextMood;
		for (var mood in this.list) {
			if (!firstMood)
				firstMood = mood;
			if (nextMood) {
				nextMood = mood;
				break;
			}
			if (mood == this.state.mood)
				nextMood = mood;
		}
		if (mood == this.state.mood) nextMood = firstMood;
		this.update({mood: nextMood});
	},
	gotoTrack: function(index) {
		this.state.track = index;
		tracks = document.getElementsByTagName('audio');
		for (var i = 0; i < tracks.length; i++) {
			var track = tracks[i];
			// FIXME: add/remove class rather than replacing/wiping
			if (i == index) {
				track.volume = this.state.volume;
				track.className = "active";
				if (this.state.playing) {
					track.play();
				}
			} else {
				track.className = "";
			}
		}
	},
	prevTrack: function() {
		var $this = this;
		var setLength = this.list[this.state.mood][this.state.playlist].list.length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track - 1 + setLength) % setLength;
		this.update({track:index});
	},
	nextTrack: function() {
		var $this = this;
		var setLength = this.list[this.state.mood][this.state.playlist].list.length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track + 1) % setLength;
		this.update({track:index});
	},
	killTrack: function(index) {
		this.fadeVolume({
			to:0,
			callback:function() {
				if (!this.pause) return;
				this.pause();
				if (this.currentTime > 0) {
					this.currentTime = 0;
				}
			}
		});
	},
	togglePause: function() {
		var player = this.getAudio(this.state.track);
		player.paused ? player.play() : player.pause();
	},
	setVolume: function(volume) {
		if (typeof volume === "undefined" || isNaN(volume))
			volume = this.state.volume;
		else
			this.state.volume = volume;

		var player = this.getAudio(this.state.track);
		if (player) player.volume = volume;
	},
	upVolume: function() {
		this.setVolume(Math.min(1, this.state.volume + 0.1));
	},
	downVolume: function() {
		this.setVolume(Math.max(0, this.state.volume - 0.1));
	},
	/*
	 * add listeners on control element's children, by class
	 */
	setListControls: function(element) {
		var $this = this;
		var prev = element.getElementsByClassName('prev')[0];
		if (prev) prev.onclick = function() { $this.prevTrack(); };

		var next = element.getElementsByClassName('next')[0];
		if (next) next.onclick = function() { $this.nextTrack(); };
	},
	getPlayingAudio: function() {
		players = document.getElementsByTagName('audio');
		for (var i = 0; i < players.length; i++) {
			if (!players[i].paused) {
				return players[i];
			}
		}
	},
	getAudio: function(index) {
		return document.getElementById('track_' + index);
	},
	fadeVolume: function(options) {
		var $this = this, player, fadeIncrement, fadeStep, stopFade,
			steps, defaults;
		defaults = {
			to: 1, duration: 0.5, rate: 30, callback: null, from: null, index: null
		};
		if (!options) options = defaults;
		else {
			for(var key in defaults) {
				if (!options.hasOwnProperty(key))
					options[key] = defaults[key];
			}
		}
		steps = Math.floor(options.rate * options.duration);
		player = (options.index !== null) ? this.getAudio(options.index) : this.getPlayingAudio();
		if (!player) {
			if (typeof options.callback === "function")
				options.callback.apply(false);
			return;
		}
		if (typeof options.from !== "undefined" && options.from !== null)
			player.volume = options.from;
		else
			options.from = player.volume;
		options.to = Math.max(0, Math.min(1, options.to));
		fadeIncrement = (options.to - options.from) / steps;
		fadeStep = function() {
			if (Math.abs(player.volume - options.to) < Math.abs(fadeIncrement)) {
				player.volume = options.to;
				clearInterval($this.fadeVolumeInterval);
				if (typeof options.callback === "function")
					options.callback.apply(player);
				setTimeout(function() {
					$this.fadeVolumeInterval = null;
				}, 0);
				return;
			}
			player.volume += fadeIncrement;
		};
		clearInterval(this.fadeVolumeInterval);
		this.fadeVolumeInterval = setInterval(fadeStep, Math.round(1000 / options.rate));
	}
};
