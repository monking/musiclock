// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

// toggleClass
var toggleClass = function(element, className, override) {
	var added = override,
		classes = element.className.match(/([^\s]+)/g) || [],
		classIndex = classes.indexOf(className);

	if (classIndex > -1) {
		if (!override) {
			classes.splice(classIndex, 1);
			added = false;
		}
	} else if (override !== false) {
		classes.push(className);
		added = true;
	}
	if (typeof added !== 'undefined')
		element.className = classes.join(' ');
	return added;
};

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
			this.update({
				mood: null,
				playlist: null,
				track: 0,
				time: 0,
				volume: 1,
				paused: false,
				repeatSingle: false
			});
		}
		this.tickClock();
		this.startTrackingState();
	},
	setupPlayers: function() {
		var $this = this, setupPlayer;
		this.currentPlayerType = "html";
		this.currentPlayerIndex = 0;
		this.players = {
			"html": [
				new Player({id:'htplayer0'}),
				new Player({id:'htplayer1'})
			],
			"youtube": [
				new YTPlayer({id:'ytplayer0',replace:'ytapiplayer0',container:'ytcontainer0'}),
				new YTPlayer({id:'ytplayer1',replace:'ytapiplayer1',container:'ytcontainer1'})
			]
		}
        setupPlayer = function(type, i) {
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
				console.log('play ' + $this.state.track);
				if ($this.currentPlayerType === type
				&& $this.currentPlayerIndex === i)
					$this.state.paused = false;
			});
			player.addEventListener('pause', function() {
				if ($this.currentPlayerType === type
				&& $this.currentPlayerIndex === i) {
					console.log('pause ' + $this.state.track);
					$this.state.paused = true;
				}
			});
			player.addEventListener('timeupdate', function() {
				if ($this.currentPlayerType === type
				&& $this.currentPlayerIndex === i)
					$this.state.time = this.currentTime;
			});
			player.addEventListener('ended', function() {
				if ($this.currentPlayerType === type
				&& $this.currentPlayerIndex === i) {
					console.log('end ' + $this.state.track);
					// FIXME: pause fires before ended; I'm assuming ended
					// implies the audio WAS playing before paused, restoring
					// state
					$this.state.paused = false;
					$this.nextTrack();
				}
			});
			player.addEventListener('volumechange', function() {
				if ($this.currentPlayerType === type
				&& $this.currentPlayerIndex === i
				&& !this.fadeVolumeInterval)
					$this.state.volume = this.volume;
			});
        };
		for (var type in this.players) {
			for (var i = 0; i < this.players[type].length; i++) {
				setupPlayer(type, i);
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
			// triggers 'ended' event
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
			currentPlayer, src, list;
		if (!this.state) {
			this.state = parameters;
			drawRequired = true;
		}
		currentPlayer = this.getCurrentPlayer();
		if (!this.state.mood) this.state.mood = this.getFirstMood();
		filters = {
			"mood": function() {
				if (!this.list.hasOwnProperty(parameters.mood))
					parameters.mood = this.state.mood;
				if (this.state.mood !== parameters.mood) {
					parameters.playlist = null;
					parameters.track = 0;
				}
				document.getElementById('moods').value = parameters.mood;
			},
			"playlist": function() {
				if (typeof this.list[parameters.mood || this.state.mood][parameters.playlist] === "undefined") {
					parameters.playlist = this.getNearestLists()[0];
				}
			},
			"track": function() {
                var tracks;

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
				if (typeof parameters.time == "undefined")
					parameters.time = 0;
				tracks = document.getElementsByClassName('track');
				for (var i = 0; i < tracks.length; i++) {
					toggleClass(tracks[i], 'active', i == parameters.track);
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
			if (!/\.(ogg|wav|m4a|mp3)$/.test(src)) {
				this.currentPlayerType = 'youtube';
			}
			currentPlayer.hide();
			this.currentPlayerIndex = 1 - this.currentPlayerIndex;
			currentPlayer = this.players[this.currentPlayerType][this.currentPlayerIndex];
			currentPlayer.show();
			currentPlayer.load(src);
			currentPlayer.setVolume(this.state.volume);
			this.toggleRepeatSingle(this.state.repeatSingle);
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
		window.onYouTubePlayerReady = function(playerId) {
			for (var i = 0; i < $this.players.youtube.length; i++) {
				if ($this.players.youtube[i].options.id == playerId)
					$this.players.youtube[i].setElement(document.getElementById(playerId));
			}
		};
		document.getElementById('moods').onchange = function() {
			$this.update({mood: this.selectedOptions[0].value});
		}
		document.getElementsByTagName('body')[0].onkeyup = function(event) {
			console.log(event.keyCode);
			switch(event.keyCode) {
				case 32: $this.togglePause(); break; /* SPACEBAR */
				case 38: $this.upVolume(); break; /* UP */
				case 40: $this.downVolume(); break; /* DOWN */
				case 48: $this.seekPortion(0); break; /* 0 */
				case 49: $this.seekPortion(0.1); break; /* 1 */
				case 50: $this.seekPortion(0.2); break; /* 2 */
				case 51: $this.seekPortion(0.3); break; /* 3 */
				case 52: $this.seekPortion(0.4); break; /* 4 */
				case 53: $this.seekPortion(0.5); break; /* 5 */
				case 54: $this.seekPortion(0.6); break; /* 6 */
				case 55: $this.seekPortion(0.7); break; /* 7 */
				case 56: $this.seekPortion(0.8); break; /* 8 */
				case 57: $this.seekPortion(0.9); break; /* 9 */
				case 72: $this.prevTrack(); break; /* h */
				case 74: $this.nextMood(); break; /* j */
				case 75: $this.prevMood(); break; /* k */
				case 76: $this.nextTrack(); break; /* l */
				case 77: $this.selectMood(); break; /* m */
				case 82: $this.toggleRepeatSingle(); break; /* r */
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
			this.getCurrentPlayer().fadeVolume({
				to:0,
				duration:1,
				callback:function() {
					$this.update({playlist: keys[0]});
					// FIXME: using timeout of 0 to allow DOM to catch up
					setTimeout(function() {
						$this.getCurrentPlayer().fadeVolume({to:$this.state.volume});
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
		var $this = this, markup = '', list, tracks, setupTrack,
			playlist = this.list[this.state.mood][this.state.playlist];

		markup += '<h2>' + this.state.mood + '</h2>';
		for (var i = 0; i < playlist.length; i++) {
			markup += '<div class="track' + (i == this.state.track ? ' active' : '') + '">' + playlist[i] + '</div>';
		}
		list = document.getElementById('list');
		list.innerHTML = markup;
		tracks = document.getElementsByClassName('track');
        setupTrack = function(i) {
			tracks[i].onclick = function() {
				$this.update({track:i});
			};
		};
		for (i = 0; i < tracks.length; i++) {
			setupTrack(i);
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
	selectMood: function() {
		// STUB: cannot open mood selector as long as it is an OS select
		// element
	},
	prevTrack: function() {
		var $this = this, index, setLength;
		setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track - 1 + setLength) % setLength;
		this.update({track:index});
	},
	nextTrack: function() {
		var $this = this, index, setLength;
		setLength = this.list[this.state.mood][this.state.playlist].length;
		index = (isNaN(this.state.track)) ? 0 : (this.state.track + 1) % setLength;
		this.update({track:index});
	},
	seekPortion: function(portion) {
		var player = this.getCurrentPlayer();
		if (!player) return;
		player.seek(player.duration * portion);
	},
	togglePause: function() {
		var player = this.getCurrentPlayer();
		player.paused ? player.play() : player.pause();
	},
	toggleRepeatSingle: function(repeat) {
		if (typeof repeat === "undefined")
			this.state.repeatSingle = !this.state.repeatSingle;

		this.getCurrentPlayer().setLoop(
			this.state.repeatSingle
			|| this.list[this.state.mood][this.state.playlist].length === 1
		);
		if (this.controls && this.controls.repeat) {
			if (this.state.repeatSingle)
				this.controls.repeat.setAttribute("checked", "checked");
			else
				this.controls.repeat.removeAttribute("checked");
		}
	},
	setVolume: function(volume) {
		if (typeof volume === "undefined" || isNaN(volume))
			volume = this.state.volume;
		else
			this.state.volume = volume;

		this.getCurrentPlayer().setVolume(volume);
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
		this.controls = {};
		this.controls.prev = element.getElementsByClassName('prev')[0];
		if (this.controls.prev) this.controls.prev.onclick = function() { $this.prevTrack(); };

		this.controls.next = element.getElementsByClassName('next')[0];
		if (this.controls.next) this.controls.next.onclick = function() { $this.nextTrack(); };

		this.controls.repeat = element.getElementsByClassName('repeat')[0];
		if (this.controls.repeat) this.controls.repeat.onclick = function() { $this.toggleRepeatSingle(); };
		this.toggleRepeatSingle(!!this.state.repeatSingle);
	},
	getPlayingAudio: function() {
        var players;
		players = document.getElementsByTagName('audio');
		for (var i = 0; i < players.length; i++) {
			if (!players[i].paused) {
				return players[i];
			}
		}
	},
	getCurrentPlayer: function() {
		return this.players[this.currentPlayerType][this.currentPlayerIndex];
	}
};