var MusiClock = function(list) {
	this.list = list;
};
MusiClock.prototype = {
	init: function() {
		this.attachHandlers();
		if (!this.restoreState()) {
			var mood = this.getFirstMood();
			this.update({
				mood: mood,
				playlist: this.getFirstPlaylist(mood),
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
		var diff, drawRequired, key, drawWorthy = ["mood","playlist"];
		if (!this.state) {
			this.state = parameters;
			drawRequired = true;
		}
		for (key in parameters) {
			if (this.state.hasOwnProperty(key)) {
				if (this.state[key] !== parameters[key] && drawWorthy.indexOf(key) != -1) {
					drawRequired = true;
				}
				this.state[key] = parameters[key];
				switch(key) {
					case "mood":
						document.getElementById('moods').value = this.state.mood;
						break;
				}
			}
		}
		if (!this.state.mood) this.state.mood = this.getFirstMood();
		if (!this.state.playlist) this.state.playlist = this.getFirstPlaylist();
		if (drawRequired) {
			this.markupPlaylist();
			this.gotoTrack(this.state.track);
		}
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
		var $this = this, now = new Date(), hour, key, keys = [], nextHour, nextTime, wait;

		clearTimeout(this.timeout);

		hour = now.getHours().toString() + now.getMinutes().toString();
		for (key in this.list[this.state.mood]) {
			if (!this.list[this.state.mood][key].length) continue;
			if (key <= hour) { keys[0] = key; }
			else             { keys[1] = key; break; }
		}

		if (keys.length && keys[0] !== this.state.playlist) {
			this.update({playlist: keys[0]});
		}

		if (keys.length > 1) {
			nextHour = keys[1].substr(0,2) + ':' + keys[1].substr(2,2) + ':00';
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
		for (var i = 0; i < playlist.length; i++) {
			var file = playlist[i];
			var id = 'track_' + i;
			markup += '<label for="' + id + '">' + file + '</label>'
			+ '<audio id="' + id + '" controls>'
			+ '	<source src="audio/' + this.state.mood + '/' + this.state.playlist + '/' + file + '" />'
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
					$this.state.track = i;
					$this.state.playing = true;
					$this.state.insidePlay = true;
					for (var j = 0; j < players.length; j++) {
						if (i != j) {
							var player = players[j];
							player.pause();
							if (player.currentTime > 0) {
								player.currentTime = 0;
							}
						}
					}
					// FIXME: messy way to revert outside closure, after event
					// chain finishes
					setTimeout(function() { $this.state.insidePlay = false; }, 0);
				});
				players[i].addEventListener('pause', function() {
					if (!$this.state.insidePlay) {
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
					$this.state.volume = this.state.volume;
				});
			})(i);
		}
	},
	getFirstMood: function() {
		for (var mood in this.list) { return mood; }
	},
	getFirstPlaylist: function(mood) {
		for (var playlist in this.list[mood || this.state.mood]) { return playlist; }
	},
	prevMood: function() {
		var prevMood;
		for (var mood in this.list) {
			if (prevMood && mood == this.state.mood) break;
			prevMood = mood;
		}
		this.update({mood: prevMood, playlist: null, track: 0, time: 0});
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
		this.update({mood: nextMood, playlist: null, track: 0, time: 0});
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
		var setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track - 1 + setLength) % setLength;
		this.gotoTrack(index);
	},
	nextTrack: function() {
		var setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track + 1) % setLength;
		this.gotoTrack(index);
	},
	togglePause: function() {
		var player = document.getElementById('track_' + this.state.track);
		player.paused ? player.play() : player.pause();
	},
	setVolume: function(volume) {
		if (typeof volume === "undefined" || isNaN(volume))
			volume = this.state.volume;
		else
			this.state.volume = volume;

		var player = document.getElementById('track_' + this.state.track);
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
	}
};
