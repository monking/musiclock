// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

/*
 * MusiClock
 */
var MusiClock = function(list) {
	this.list = list;
};
MusiClock.prototype = {
	init: function() {
		this.setupPlayers();
		this.markupControls();
		this.attachHandlers();
		if (!this.restoreState()) {
			var mood = this.getFirstMood();
			this.update({
				mood: null,
				playlist: null,
				track: 0,
				time: 0,
				volume: 1,
				paused: false
			});
		}
		this.tickClock();
		this.startTrackingState();
	},
	setupPlayers: function() {
		var $this = this;
		this.currentPlayerType = "html";
		this.currentPlayerIndex = 0;
		this.players = {
			"html": [
				new Player({id:'htplayer0'}),
				new Player({id:'htplayer1'})
			]
		}
		for (var type in this.players) {
			for (var i = 0; i < this.players[type].length; i++) {
				(function(type, i) {
					var player = $this.players[type][i];
					player.addEventListener('canplay', function() {
						if ($this.currentPlayerType === type
						&& $this.currentPlayerIndex === i
						&& !$this.state.paused) {
							this.seek($this.state.time);
							this.play();
						}
					});
					player.addEventListener('play', function() {
						console.log('play ' + i);
						if ($this.currentPlayerType === type
						&& $this.currentPlayerIndex === i)
							$this.state.paused = false;
					});
					player.addEventListener('pause', function() {
						if ($this.currentPlayerType === type
						&& $this.currentPlayerIndex === i) {
							console.log('pause ' + i);
							$this.state.paused = true;
						}
					});
					player.addEventListener('timeupdate', function() {
						if ($this.currentPlayerType === type
						&& $this.currentPlayerIndex === i)
							$this.state.time = this.currentTime;
					});
					player.addEventListener('ended', function() {
						console.log('end ' + i);
						// FIXME: pause fires before ended; I'm assuming ended
						// implies the audio WAS playing before paused, restoring
						// state
						$this.state.paused = false;
						$this.nextTrack();
					});
					player.addEventListener('volumechange', function() {
						if ($this.currentPlayerType === type
						&& $this.currentPlayerIndex === i
						&& !this.fadeVolumeInterval)
							$this.state.volume = this.volume;
					});
				})(type, i);
			}
		}
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
			// FIXME: skips to next track. theory: seeking beyond buffer
			// trigers 'ended' event
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
		var filters, drawRequired, key, drawWorthy = ["mood","playlist"],
			currentPlayer, src;
		if (!this.state) {
			this.state = parameters;
			drawRequired = true;
		}
		currentPlayer = this.getPlayer();
		filters = {
			"mood": function() {
				if (!this.list.hasOwnProperty(parameters.mood))
					parameters.mood = this.getFirstMood();
				if (this.state.mood !== parameters.mood) {
					parameters.playlist = null;
					parameters.track = 0;
				}
				document.getElementById('moods').value = parameters.mood;
			},
			"playlist": function() {
				if (typeof this.list[parameters.mood][parameters.playlist] === "undefined") {
					parameters.playlist = this.getNearestLists()[0];
				}
			},
			"track": function() {
				if (!currentPlayer.paused) {
					currentPlayer.fadeVolume({
						to:0,
						callback:function() {
							if (this.pause) {
								this.pause();
								this.seek(0);
							}
						}
					});
				}
			}
		};

		for (key in filters) {
			if (typeof parameters[key] !== "undefined")
				filters[key].apply(this);
		}
		for (key in parameters) {
			if (typeof this.state[key] !== "undefined") {
				if (this.state[key] !== parameters[key]) {
					if (drawWorthy.indexOf(key) != -1)
						drawRequired = true;
					this.state[key] = parameters[key];
				}
			}
		}
		if (drawRequired)
			this.markupPlaylist();
		if (drawRequired || "track" in parameters) {
			src = this.list[this.state.mood][this.state.playlist][this.state.track];
			currentPlayer = this.getPlayer(src);
			currentPlayer.load(src);
			currentPlayer.setVolume(this.state.volume);
		}
	},
	markupControls: function() {
		var moodSelector = document.getElementById('moods');
		var markup = '';
		for (var mood in this.list) {
			markup += '<option value="' + mood + '">' + mood + '</option>';
		}
		moodSelector.innerHTML = markup;
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
				case 77: $this.selectMood(); break;
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
	getNearestLists: function() {
		var now = new Date(), hour, keys = ["0000"];
		hour = now.getHours().toString().pad(2, "0") + now.getMinutes().toString().pad(2, "0");
		for (var listHour in this.list[this.state.mood]) {
			var playlist = this.list[this.state.mood][listHour];
			if (!playlist.length) continue;
			if (listHour <= hour && listHour > keys[0]) { keys[0] = listHour; }
			else if (listHour > hour && (!keys[1] || listHour < keys[1])) { keys[1] = listHour; }
		}
		return keys;
	},
	tickClock: function() {
		var $this = this, now = new Date(), keys = [], nextHour,
			nextTime, wait;

		clearTimeout(this.timeout);

		keys = this.getNearestLists();

		if (keys.length && keys[0] !== this.state.playlist) {
			this.getPlayer().fadeVolume({
				to:0,
				duration:1,
				callback:function() {
					$this.update({playlist: keys[0]});
					// FIXME: using timeout of 0 to allow DOM to catch up
					setTimeout(function() {
						$this.getPlayer().fadeVolume({to:$this.state.volume});
					}, 0);
				}
			});
		}

		if (keys.length > 1) {
			nextHour = keys[1];
			nextHour = nextHour.substr(0,2) + ':' + nextHour.substr(2,2) + ':00';
			nextTime = (new Date(now.toString().replace(/\d\d:\d\d:\d\d/, nextHour))).getTime();
		} else {
			// no next list: loop around to midnight tomorrow
			nextTime = (new Date());
			nextTime.setHours(0);
			nextTime = nextTime.getTime() + 86400;
		}
		wait = nextTime - now.getTime();
		this.timeout = setTimeout(function() {
			$this.tickClock();
		}, wait);
	},
	markupPlaylist: function() {
		var $this = this,
			markup = '',
			playlist = this.list[this.state.mood][this.state.playlist];

		markup += '<h2>' + this.state.mood + '</h2>';
		for (var i = 0; i < playlist.length; i++) {
			markup += '<div class="track">' + playlist[i] + '</div>';
		}
		var list = document.getElementById('list');
		list.innerHTML = markup;
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
	selectMood: function() {
		// STUB: cannot open mood selector as long as it is an OS select
		// element
	},
	gotoTrack: function(index) {
		var nextPlayerIndex = 1 - this.currentPlayerIndex, currentPlayer, nextPlayer;

		this.state.track = index;

		currentPlayer = this.players[this.currentPlayerType][this.currentPlayerIndex];
		nextPlayer = this.players[this.currentPlayerType][nextPlayerIndex];



		currentPlayer.hide();
		nextPlayer.show();
		this.currentPlayerIndex = nextPlayerIndex;
	},
	prevTrack: function() {
		var $this = this;
		var setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track - 1 + setLength) % setLength;
		this.update({track:index});
	},
	nextTrack: function() {
		var $this = this;
		var setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track + 1) % setLength;
		this.update({track:index});
	},
	killTrack: function(index) {
	},
	togglePause: function() {
		var player = this.getPlayer();
		player.paused ? player.play() : player.pause();
	},
	setVolume: function(volume) {
		if (typeof volume === "undefined" || isNaN(volume))
			volume = this.state.volume;
		else
			this.state.volume = volume;

		this.getPlayer().setVolume(volume);
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
	getPlayer: function(src) {
		var type = this.currentPlayerType;

		if (src) {
			// if (!/\.(mp3|ogg|wav|m4a)$/.test(src)) {
			// 	type = 'youtube';
			// }
			this.currentPlayerIndex = 1 - this.currentPlayerIndex;
		}
		return this.players[type][this.currentPlayerIndex];
	}
};

/*
 * EventDispatcher
 */
EventDispatcher = function() { }
EventDispatcher.prototype = {
	listeners:{},
	addEventListener:function(eventName, listener){
		if (!this.listeners.hasOwnProperty(eventName))
			this.listeners[eventName] = [];
		this.listeners[eventName].push(listener);
	},
	removeEventListener:function(eventName, listener){
		if (this.listeners.hasOwnProperty(eventName)) {
			if (listener == 'all') {
				this.listeners[eventName] = [];
			} else {
				for (var i = 0; i < this.listeners[eventName].length; i++)
				{
					if (this.listeners[eventName][i] === listener) {
						this.listeners[eventName].splice(i, 1);
					}
				}
			}
		}
	},
	dispatchEvent:function(eventName, data){
		var $this = this;
		if ($this.listeners.hasOwnProperty(eventName)) {
			for (var i = 0; i < $this.listeners[eventName].length; i++)
			{
				if (typeof $this.listeners[eventName][i] === 'function') {
					$this.listeners[eventName][i].apply($this, [data]);;
				}
			}
		}
	}
}

/*
 * Player
 */
var Player = function(options) {
	this.init(options);
};
Player.prototype = new EventDispatcher();
Player.constructor = Player;
Player.prototype.init = function(options) {
	var defaults = {
		id: null
	};
	options = options || {};
	for (var key in defaults) {
		if (typeof options[key] === "undefined")
			options[key] = defaults[key];
	}
	this.currentTime = 0;
	this.volume = 0;
	this.element = null;
	this.paused = true;
	this.fadeVolumeInterval = null;
	if (options.id) {
		this.setElement(document.getElementById(options.id));
	}
};
Player.prototype.setElement = function(element) {
	this.element = element;
	this.attachHandlers();
};
Player.prototype.attachHandlers = function() {
	var $this = this;
	this.element.addEventListener('canplay', function() {
		if ($this.currentTime > 0) {
			this.currentTime = $this.currentTime;
		} else {
			$this.currentTime = this.currentTime;
		}
		$this.dispatchEvent('canplay');
	});
	this.element.addEventListener('play', function() {
		$this.paused = false;
		$this.dispatchEvent('play');
	});
	this.element.addEventListener('pause', function() {
		$this.paused = true;
		$this.dispatchEvent('pause');
	});
	this.element.addEventListener('timeupdate', function() {
		$this.currentTime = this.currentTime;
		$this.dispatchEvent('timeupdate');
	});
	this.element.addEventListener('ended', function() {
		$this.paused = true;
		$this.dispatchEvent('ended');
	});
	this.element.addEventListener('volumechange', function() {
		$this.volume = this.volume;
		$this.dispatchEvent('volumechange');
	});
};
Player.prototype.load = function(src) {
	this.element.innerHTML = '<source src="audio/' + src + '" />';
	if (this.element.pause) this.element.pause();
	this.element.load();
};
Player.prototype.play = function() {
	this.element.play();
};
Player.prototype.pause = function() {
	this.element.pause();
};
Player.prototype.seek = function(seekTo) {
	if (this.currentTime === seekTo) return;
	this.currentTime = seekTo;
	this.element.currentTime = seekTo;
};
Player.prototype.setVolume = function(volume) {
	this.volume = volume;
	this.element.volume = volume;
};
Player.prototype.fadeVolume = function(options) {
	var $this = this, fadeIncrement, fadeStep, stopFade, steps, defaults;

	defaults = {
		to: 1,
		duration: 0.5,
		rate: 30,
		callback: null,
		from: null,
		index: null
	};
	options = options || {};
	for(var key in defaults) {
		if (typeof options[key] === "undefined")
			options[key] = defaults[key];
	}

	steps = Math.floor(options.rate * options.duration);
	if (this.paused) {
		this.setVolume(0);
		if (typeof options.callback === "function")
			options.callback.apply(false);
		return;
	}
	if (typeof options.from !== "undefined" && options.from !== null)
		this.setVolume(options.from);
	else
		options.from = this.volume;
	options.to = Math.max(0, Math.min(1, options.to));
	fadeIncrement = (options.to - options.from) / steps;
	fadeStep = function() {
		if (Math.abs($this.volume - options.to) < Math.abs(fadeIncrement)) {
			$this.setVolume(options.to);
			clearInterval($this.fadeVolumeInterval);
			if (typeof options.callback === "function")
				options.callback.apply($this);
			setTimeout(function() {
				// empty fadeVolumeInterval after the stack executes
				$this.fadeVolumeInterval = null;
			}, 0);
			return;
		}
		$this.setVolume($this.volume + fadeIncrement);
	};
	clearInterval(this.fadeVolumeInterval);
	this.fadeVolumeInterval = setInterval(fadeStep, Math.round(1000 / options.rate));
};
Player.prototype.show = function() {
	this.element.style.display = 'block';
};
Player.prototype.hide = function() {
	this.element.style.display = 'none';
};
