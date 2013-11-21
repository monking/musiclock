/*
 * Player
 */
;var Player = function(options) {
    this.init(options);
};
Player.prototype = new EventDispatcher();
Player.constructor = Player;
Player.prototype.defaults = {
	id: null
};
Player.prototype.init = function(options) {
	options = options || {};
	for (var key in this.defaults) {
		if (typeof options[key] === "undefined")
			options[key] = this.defaults[key];
	}
	this.options = options;
	this.currentTime = 0;
	this.duration = 0;
	this.volume = 0;
	this.playtime = 0;
	this.element = null;
	this.paused = true;
	this.seeking = false;
	this.looped = false;
	this.fadeVolumeInterval = null;
	if (options.id) {
		this.setElement(document.getElementById(options.id));
	}
};
Player.prototype.setElement = function(element) {
	this.element = element;
	if (!element) return;

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
		$this.duration = this.duration;
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
	this.element.addEventListener('seeking', function() {
    $this.seeking = true;
	});
	this.element.addEventListener('timeupdate', function() {
    if (!$this.seeking) {
      $this.playtime += this.currentTime - $this.currentTime;
    }
    window.log(Math.round($this.playtime*10)/10);
		$this.currentTime = this.currentTime;
    $this.seeking = false;
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
  this.playtime = 0;
  this.seeking = true;
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
  this.seeking = true
	this.currentTime = seekTo;
	this.element.currentTime = seekTo;
};
Player.prototype.setLoop = function(looped) {
	this.looped = looped;
	if (looped) {
		this.element.setAttribute("loop", "loop");
	} else {
		this.element.removeAttribute("loop");
	}
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
				options.callback.call($this);
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
