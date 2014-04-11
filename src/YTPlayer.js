var YTPlayer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

YTPlayer = (function(_super) {
  __extends(YTPlayer, _super);

  YTPlayer.prototype.defaults = {
    id: null,
    replace: null,
    container: null,
    updateInterval: 17,
    playerWidth: 425,
    playerHeight: 350
  };

  function YTPlayer(options) {
    YTPlayer.__super__.constructor.call(this, options);
  }

  YTPlayer.prototype.setElement = function(element) {
    this.element = element;
    if (element) {
      this.attachHandlers();
      this.duration = element.getDuration();
      return this.dispatchEvent('canplay');
    }
  };

  YTPlayer.prototype.attachHandlers = function() {
    var onTimeChange, self, stateHandlerName;
    self = this;
    stateHandlerName = "" + this.options.id + "StateHandler";
    window[stateHandlerName] = function(state) {
      switch (state) {
        case 0:
          if (self.looped) {
            self.seek(0);
            return self.play();
          } else {
            self.paused = true;
            return self.dispatchEvent('ended');
          }
          break;
        case 1:
          self.paused = false;
          return self.dispatchEvent('play');
        case 2:
          self.paused = true;
          return self.dispatchEvent('pause');
      }
    };
    this.element.addEventListener('onStateChange', stateHandlerName);
    onTimeChange = function() {
      var oldTime, oldVolume;
      oldTime = self.currentTime;
      self.currentTime = self.element.getCurrentTime();
      if (oldTime !== self.currentTime) {
        if (!self.seeking) {
          self.playtime += self.currentTime - oldTime;
        }
        self.seeking = false;
        self.dispatchEvent('timeupdate');
      }
      oldVolume = self.volume;
      self.volume = self.element.getVolume() / 100;
      if (oldVolume !== self.volume && this.fadeVolumeInterval !== null && (!this.muted || this.volume > 0)) {
        return self.dispatchEvent('volumechange');
      }
    };
    return this.currentTimeInterval = setInterval(onTimeChange, this.options.updateInterval);
  };

  YTPlayer.prototype.load = function(src) {
    var atts, params;
    this.playtime = 0;
    if (this.element) {
      return this.element.loadVideoById({
        videoId: src,
        startSeconds: 0,
        suggestedQuality: 'large'
      });
    } else {
      params = {
        allowScriptAccess: 'always'
      };
      atts = {
        id: this.options.id
      };
      return swfobject.embedSWF("http://www.youtube.com/v/" + src + "?enablejsapi=1&playerapiid=" + this.options.id + "&version=3&autoplay=1&loop=" + (this.options.loop ? '1' : '0'), this.options.replace, this.options.playerWidth, this.options.playerHeight, "8", null, null, params, atts);
    }
  };

  YTPlayer.prototype.play = function() {
    return this.element.playVideo();
  };

  YTPlayer.prototype.pause = function() {
    return this.element.pauseVideo();
  };

  YTPlayer.prototype.seek = function(seekTo) {
    if (this.currentTime === seekTo) {
      return;
    }
    this.seeking = true;
    this.currentTime = seekTo;
    if (this.element) {
      return this.element.seekTo(seekTo);
    }
  };

  YTPlayer.prototype.setLoop = function(looped) {
    return this.looped = looped;
  };

  YTPlayer.prototype.setVolume = function(volume) {
    this.volume = volume;
    if (this.element) {
      return this.element.setVolume(volume * 100);
    }
  };

  YTPlayer.prototype.setMute = function(muted) {
    this.muted = muted;
    if (this.element) {
      return this.element.setVolume(muted != null ? muted : {
        0: this.volume * 100
      });
    }
  };

  YTPlayer.prototype.show = function() {
    return toggleClass(document.getElementById(this.options.container), 'hidden', false);
  };

  YTPlayer.prototype.hide = function() {
    return toggleClass(document.getElementById(this.options.container), 'hidden', true);
  };

  return YTPlayer;

})(Player);
