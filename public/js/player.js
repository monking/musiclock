/*
 *
 * Player
 */
;var Player = function(options) {
    this.init(options);
};
Player.prototype = new EventDispatcher();
Player.constructor = Player;
Player.prototype.defaults = {
  id: null,
  basePath: ''
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
  this.muted = false;
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
  var self = this;
  this.element.addEventListener('canplay', function() {
    if (self.currentTime > 0) {
      this.currentTime = self.currentTime;
    } else {
      self.currentTime = this.currentTime;
    }
    self.duration = this.duration;
    self.dispatchEvent('canplay');
  });
  this.element.addEventListener('play', function() {
    self.paused = false;
    self.dispatchEvent('play');
  });
  this.element.addEventListener('pause', function() {
    self.paused = true;
    self.dispatchEvent('pause');
  });
  this.element.addEventListener('seeking', function() {
    self.seeking = true;
  });
  this.element.addEventListener('timeupdate', function() {
    if (!self.seeking) {
      self.playtime += this.currentTime - self.currentTime;
    }
    self.currentTime = this.currentTime;
    self.seeking = false;
    self.dispatchEvent('timeupdate');
  });
  this.element.addEventListener('ended', function() {
    self.paused = true;
    self.dispatchEvent('ended');
  });
  this.element.addEventListener('volumechange', function() {
    if (this.fadeVolumeInterval !== null && (
      !this.muted || this.volume > 0
    )) {
      self.volume = this.volume;
      self.dispatchEvent('volumechange');
    }
  });
};
Player.prototype.load = function(src) {
  this.playtime = 0;
  this.seeking = true;
  this.element.innerHTML = '<source src="' + this.options.basePath + '/' + src + '" />';
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
Player.prototype.setMute = function(muted) {
  this.muted = muted;
  this.element.volume = muted ? 0 : volume;
};
Player.prototype.fadeVolume = function(options) {
  var self = this, fadeIncrement, fadeStep, stopFade, steps, defaults;

  if (this.fadeVolumeInterval === null) this.fadeVolumeInterval = -1;

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

  stopFade = function(context) {
    clearInterval(this.fadeVolumeInterval);
    this.fadeVolumeInterval = null;
    if (typeof options.callback === "function")
      options.callback.call(context);
  };

  steps = Math.floor(options.rate * options.duration);
  if (this.paused) {
    this.setVolume(0);
    stopFade(false);
    return;
  }
  if (typeof options.from !== "undefined" && options.from !== null)
    this.setVolume(options.from);
  else
    options.from = this.volume;
  options.to = Math.max(0, Math.min(1, options.to));
  fadeIncrement = (options.to - options.from) / steps;
  fadeStep = function() {
    if (Math.abs(self.volume - options.to) < Math.abs(fadeIncrement)) {
      self.setVolume(options.to);
      stopFade(self);
      return;
    }
    self.setVolume(self.volume + fadeIncrement);
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
