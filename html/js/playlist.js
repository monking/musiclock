var Playlist = function(list) {
	this.list = list;
	this.init();
};
Playlist.prototype = {
	init: function() {
		this.attitudeKey = null;
		this.setKey = null;
		this.trackKey = null;
	},
	setAttitude: function(attitude) {
		if (!this.list.hasOwnProperty(attitude))
			return;
		this.attitudeKey = attitude;
		this.checkTime();
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
			this.setKey = keys[0];
			this.markupSet();
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
		if (!this.attitudeKey) {
			for (key in this.list) {
				this.attitudeKey = key;
				break;
			}
		}
		for (key in this.list[this.attitudeKey]) {
			if (!this.list[this.attitudeKey][key].length) continue;
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
			set = this.list[this.attitudeKey][this.setKey];

		for (var i = 0; i < set.length; i++) {
			var file = set[i];
			var id = 'track_' + i;
			markup += '<label for="' + id + '">' + file + '</label>'
			+ '<audio id="' + id + '" controls>'
			+ '	<source src="audio/' + this.setKey + '/' + file + '" />'
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
							if (player.currentTime > 0) {
								player.currentTime = 0;
							}
							player.pause();
						}
					}
				});
				players[i].addEventListener('ended', function() {
					$this.next();
				});
			})(i);
		}
		this.next();
	},
	next: function() {
		if (this.trackKey !==  null) {
			this.trackKey = (this.trackKey + 1) % this.list[this.attitudeKey][this.setKey].length;
		} else {
			this.trackKey = 0;
		}
		document.getElementById('track_' + this.trackKey).play();
	},
	/*
	 * add listeners on control element's children, by class
	 */
	setListControls: function(element) {
		var $this = this;
		element.getElementsByClassName('next')[0].onclick = function() { $this.next(); };
	}
};
