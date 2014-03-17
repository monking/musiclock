var Player,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Player = (function(_super) {
  __extends(Player, _super);

  Player.prototype.defaults = {
    id: null,
    basePath: ''
  };

  function Player(options) {
    Player.__super__.constructor.call(this);
    this.options = overloads(options, this.defaults);
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
  }

  Player.prototype.setElement = function(element) {
    this.element = element;
    if (element) {
      return this.attachHandlers();
    }
  };

  Player.prototype.attachHandlers = function() {
    var self;
    self = this;
    this.element.addEventListener('canplay', function() {
      if (self.currentTime > 0) {
        this.currentTime = self.currentTime;
      } else {
        self.currentTime = this.currentTime;
      }
      self.duration = this.duration;
      return self.dispatchEvent('canplay');
    });
    this.element.addEventListener('play', function() {
      self.paused = false;
      return self.dispatchEvent('play');
    });
    this.element.addEventListener('pause', function() {
      self.paused = true;
      return self.dispatchEvent('pause');
    });
    this.element.addEventListener('seeking', function() {
      return self.seeking = true;
    });
    this.element.addEventListener('timeupdate', function() {
      if (!self.seeking) {
        self.playtime += this.currentTime - self.currentTime;
      }
      self.currentTime = this.currentTime;
      self.seeking = false;
      return self.dispatchEvent('timeupdate');
    });
    this.element.addEventListener('ended', function() {
      self.paused = true;
      return self.dispatchEvent('ended');
    });
    return this.element.addEventListener('volumechange', function() {
      if (this.fadeVolumeInterval !== null && (!this.muted || this.volume > 0)) {
        self.volume = this.volume;
        return self.dispatchEvent('volumechange');
      }
    });
  };

  Player.prototype.load = function(src) {
    this.playtime = 0;
    this.seeking = true;
    this.element.innerHTML = "<source src=\"" + this.options.basePath + "/" + src + "\" />";
    if (this.element.pause) {
      this.element.pause();
    }
    return this.element.load();
  };

  Player.prototype.play = function() {
    return this.element.play();
  };

  Player.prototype.pause = function() {
    return this.element.pause();
  };

  Player.prototype.seek = function(seekTo) {
    if (this.currentTime === seekTo) {
      return;
    }
    this.seeking = true;
    this.currentTime = seekTo;
    return this.element.currentTime = seekTo;
  };

  Player.prototype.setLoop = function(looped) {
    this.looped = looped;
    if (looped) {
      return this.element.setAttribute("loop", "loop");
    } else {
      return this.element.removeAttribute("loop");
    }
  };

  Player.prototype.setVolume = function(volume) {
    this.volume = volume;
    return this.element.volume = volume;
  };

  Player.prototype.setMute = function(muted) {
    this.muted = muted;
    return this.element.volume = muted ? 0 : volume;
  };

  Player.prototype.fadeVolume = function(options) {
    var defaults, fadeIncrement, fadeStep, key, self, steps, stopFade;
    self = this;
    if (this.fadeVolumeInterval === null) {
      this.fadeVolumeInterval = -1;
    }
    defaults = {
      to: 1,
      duration: 0.5,
      rate: 30,
      callback: null,
      from: null,
      index: null
    };
    if (options == null) {
      options = {};
    }
    for (key in defaults) {
      if (typeof options[key] === 'undefined') {
        options[key] = defaults[key];
      }
    }
    stopFade = function(context) {
      clearInterval(this.fadeVolumeInterval);
      this.fadeVolumeInterval = null;
      if (typeof options.callback === "function") {
        return options.callback.call(context);
      }
    };
    steps = Math.floor(options.rate * options.duration);
    if (this.paused) {
      this.setVolume(0);
      stopFade(false);
      return;
    }
    if (typeof options.from !== 'undefined' && options.from !== null) {
      this.setVolume(options.from);
    } else {
      options.from = this.volume;
    }
    options.to = Math.max(0, Math.min(1, options.to));
    fadeIncrement = (options.to - options.from) / steps;
    fadeStep = function() {
      if (Math.abs(self.volume - options.to) < Math.abs(fadeIncrement)) {
        self.setVolume(options.to);
        stopFade(self);
        return;
      }
      return self.setVolume(self.volume + fadeIncrement);
    };
    clearInterval(this.fadeVolumeInterval);
    return this.fadeVolumeInterval = setInterval(fadeStep, Math.round(1000 / options.rate));
  };

  Player.prototype.show = function() {
    return this.element.style.display = 'block';
  };

  Player.prototype.hide = function() {
    return this.element.style.display = 'none';
  };

  return Player;

})(EventDispatcher);
