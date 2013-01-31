var Playlist = function(list) {
	this.list = list;
};
Playlist.prototype = {
	init: function() {
		this.attachHandlers();
		if (!this.restoreState()) {
			this.checkTime();
		}
	},
	attachHandlers: function() {
		var $this = this;
		document.getElementById('moods').onchange = function() {
			$this.setMood(this.selectedOptions[0].value);
		}
		document.getElementsByTagName('body')[0].onkeyup = function(event) {
			// console.log(event.keyCode);
			switch(event.keyCode) {
				case 32: $this.togglePause(); break;
				case 75: $this.prevMood(); break;
				case 74: $this.nextMood(); break;
				case 72: $this.prevTrack(); break;
				case 76: $this.nextTrack(); break;
			}
		};
	},
	setMood: function(moodKey) {
		if (!this.list.hasOwnProperty(moodKey))
			return;
		this.moodKey = moodKey;
		document.getElementById('moods').value = moodKey;
		this.setKey = null;
		this.trackKey = -1;
		this.checkTime();
	},
	setSet: function(setKey) {
		if (!this.list[this.moodKey].hasOwnProperty(setKey))
			return;
		this.setKey = setKey;
		this.markupSet();
	},
	saveState: function() {
		if (window.localStorage) {
			window.localStorage.moodKey = this.moodKey;
			window.localStorage.setKey = this.setKey;
			window.localStorage.trackKey = this.trackKey;
		}
		// FIXME: fall back to cookies
	},
	restoreState: function() {
		if (window.localStorage) {
			this.setMood(window.localStorage.moodKey);
			// this.setKey = window.localStorage.setKey;
			// this.trackKey = window.localStorage.trackKey;
			return true;
		}
		// FIXME: fall back to cookies
		return false;
	},
	/*
	 * checks the time against the list keys, and automatically repeats on the
	 * next key time.
	 *
	 * expects keys like "1500" to mean 15:00 or 3:00pm
	 */
	checkTime: function() {
		clearTimeout(this.timeout);
		var $this = this;
		var now = new Date();
		var hour = now.getHours().toString() + now.getMinutes().toString();
		var keys = this.getNearestSetKeys(hour);
		if (keys.length && keys[0] !== this.setKey) {
			this.setSet(keys[0]);
		}
		if (keys.length > 1) {
			var nextHour = keys[1].substr(0,2) + ':' + keys[1].substr(2,2) + ':00';
			var nextTime = (new Date(now.toString().replace(/\d\d:\d\d:\d\d/, nextHour))).getTime();
			var wait = nextTime - now.getTime();
			this.timeout = setTimeout(function() {
				$this.checkTime();
			}, wait);
		}
	},
	/*
	 * Returns an array of the last set key before or exactly on the given
	 * time, and the set key which follows.
	 *
	 * (ignores empty sets)
	 */
	getNearestSetKeys: function(hour) {
		var key, keys = [];
		if (!this.moodKey) {
			for (key in this.list) {
				this.moodKey = key;
				break;
			}
		}
		for (key in this.list[this.moodKey]) {
			if (!this.list[this.moodKey][key].length) continue;
			if (key <= hour) {
				keys[0] = key;
			} else {
				keys[1] = key;
				break;
			}
		}
		return keys;
	},
	markupSet: function() {
		var $this = this,
			markup = '',
			set = this.list[this.moodKey][this.setKey];

		markup += '<h2>' + this.moodKey + '</h2>';
		for (var i = 0; i < set.length; i++) {
			var file = set[i];
			var id = 'track_' + i;
			markup += '<label for="' + id + '">' + file + '</label>'
			+ '<audio id="' + id + '" controls>'
			+ '	<source src="audio/' + this.moodKey + '/' + this.setKey + '/' + file + '" />'
			+ '</audio>';
		}
		var list = document.getElementById('list');
		list.innerHTML = markup;
		var players = list.getElementsByTagName('audio');
		for (var i = 0; i < players.length; i++) {
			(function(i) {
				players[i].addEventListener('play', function() {
					$this.trackKey = i;
					for (var j = 0; j < players.length; j++) {
						if (i != j) {
							var player = players[j];
							player.pause();
							if (player.currentTime > 0) {
								player.currentTime = 0;
							}
						}
					}
				});
				players[i].addEventListener('ended', function() {
					$this.nextTrack();
				});
			})(i);
		}
		this.nextTrack();
	},
	gotoTrack: function(index) {
		this.trackKey = index;
		this.saveState();
		document.getElementById('track_' + index).play();
	},
	prevMood: function() {
		var prevMoodKey;
		for (var moodKey in this.list) {
			if (prevMoodKey && moodKey == this.moodKey) break;
			prevMoodKey = moodKey;
		}
		this.setMood(prevMoodKey);
	},
	nextMood: function() {
		var firstMoodKey, nextMoodKey;
		for (var moodKey in this.list) {
			if (!firstMoodKey)
				firstMoodKey = moodKey;
			if (nextMoodKey) {
				nextMoodKey = moodKey;
				break;
			}
			if (moodKey == this.moodKey)
				nextMoodKey = moodKey;
		}
		if (moodKey == this.moodKey) nextMoodKey = firstMoodKey;
		this.setMood(nextMoodKey);
	},
	prevTrack: function() {
		var setLength = this.list[this.moodKey][this.setKey].length;
		index = (isNaN(this.trackKey)) ? 0 : (this.trackKey - 1 + setLength) % setLength;
		this.gotoTrack(index);
	},
	nextTrack: function() {
		var setLength = this.list[this.moodKey][this.setKey].length;
		index = (isNaN(this.trackKey)) ? 0 : (this.trackKey + 1) % setLength;
		this.gotoTrack(index);
	},
	togglePause: function() {
		var audio = document.getElementById('track_' + this.trackKey);
		audio.paused ? audio.play() : audio.pause();
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
