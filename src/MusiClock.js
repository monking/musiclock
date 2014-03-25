var MusiClock;

window.onYouTubePlayerReady = function(playerId) {
  return console.log("too late; " + playerId + " has started before the real onYouTubePlayerReady was defined.");
};

MusiClock = (function() {
  MusiClock.prototype.defaults = {
    basePath: '',
    controls: '.controls',
    data: {}
  };

  function MusiClock(options) {
    this.options = overloads(options, this.defaults);
    this.basePath = options.basePath || this.defaults.basePath;
    this.data = options.data || this.defaults.data;
    this.attachHandlers();
    this.setupPlayers();
    this.markupControls();
    if (!this.restoreState()) {
      this.update({
        playlist: null,
        trackStates: null,
        numActiveTracks: null,
        track: 0,
        time: 0,
        volume: 1,
        muted: false,
        paused: false,
        single: false,
        shuffle: false,
        repeat: false,
        minPlaytime: 100
      });
    }
    if (options.controls) {
      this.setListControls(document.querySelector(options.controls));
    }
    this.tickClock();
    this.startTrackingState();
  }

  MusiClock.prototype.setupPlayers = function() {
    var connectPlayer, i, isCurrentPlayer, player, self, type, _results;
    self = this;
    this.currentPlayerType = "html";
    this.currentPlayerIndex = 0;
    this.players = {
      html: [
        new Player({
          id: 'htplayer0',
          basePath: this.basePath
        }), new Player({
          id: 'htplayer1',
          basePath: this.basePath
        })
      ],
      youtube: [
        new YTPlayer({
          id: 'ytplayer0',
          replace: 'ytapiplayer0',
          container: 'ytcontainer0'
        }), new YTPlayer({
          id: 'ytplayer1',
          replace: 'ytapiplayer1',
          container: 'ytcontainer1'
        })
      ]
    };
    isCurrentPlayer = function(player) {
      return player.options.id === self.players[self.currentPlayerType][self.currentPlayerIndex].options.id;
    };
    connectPlayer = function(type, i) {
      var player;
      player = self.players[type][i];
      player.addEventListener('canplay', function() {
        if (isCurrentPlayer(player) && !self.state.paused) {
          player.seek(self.state.time);
          return player.play();
        }
      });
      player.addEventListener('play', function() {
        if (isCurrentPlayer(player)) {
          return self.state.paused = false;
        }
      });
      player.addEventListener('pause', function() {
        if (isCurrentPlayer(player)) {
          return self.state.paused = true;
        }
      });
      player.addEventListener('timeupdate', function() {
        var currentTrack;
        if (!isCurrentPlayer(player)) {
          return;
        }
        self.state.time = player.currentTime;
        currentTrack = self.getTrack();
        if (currentTrack.ab && ((self.state.repeat && self.state.single) || (self.state.minPlaytime && player.playtime < self.state.minPlaytime) || self.state.numActiveTracks === 1) && self.state.time >= currentTrack.ab[1]) {
          player.seek(currentTrack.ab[0]);
        }
        return self.updateTrackProgress();
      });
      return player.addEventListener('ended', function() {
        if (!isCurrentPlayer(player)) {
          return;
        }
        self.state.paused = false;
        if (!self.state.single) {
          return self.nextTrack();
        }
      });
    };
    _results = [];
    for (type in this.players) {
      _results.push((function() {
        var _i, _len, _ref, _results1;
        _ref = this.players[type];
        _results1 = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          player = _ref[i];
          _results1.push(connectPlayer(type, i));
        }
        return _results1;
      }).call(this));
    }
    return _results;
  };

  MusiClock.prototype.saveState = function() {
    if (window.localStorage && JSON) {
      return window.localStorage.state = JSON.stringify(this.state);
    }
  };

  MusiClock.prototype.restoreState = function() {
    var state;
    if (window.localStorage && window.localStorage.state && JSON) {
      state = JSON.parse(window.localStorage.state);
    }
    if (typeof state === "object") {
      this.update(state);
      return true;
    } else {
      return false;
    }
  };

  MusiClock.prototype.startTrackingState = function() {
    var self;
    self = this;
    return this.stateInterval = setInterval(function() {
      return self.saveState();
    }, 1000);
  };

  MusiClock.prototype.stopTrackingState = function() {
    return clearInterval(this.stateInterval);
  };

  MusiClock.prototype.update = function(parameters, stateOnly) {
    var activeTrack, currentPlayer, diff, drawRequired, drawWorthy, i, key, label, newTrackStates, playlist, track, trackLabels, trackState, _i, _j, _len, _len1, _ref;
    drawWorthy = ["playlist"];
    if (!this.state) {
      this.state = parameters;
      drawRequired = true;
    }
    currentPlayer = this.getCurrentPlayer();
    trackLabels = document.getElementsByClassName('track');
    if (typeof parameters.playlist !== 'undefined') {
      if (typeof this.data.playlists[parameters.playlist] === 'undefined') {
        parameters.playlist = this.getFirstPlaylistName();
        parameters.trackStates = null;
      }
      document.getElementById('playlists').value = parameters.playlists;
    }
    if (typeof parameters.trackStates !== 'undefined') {
      playlist = parameters.playlist || this.state.playlist;
      if (!parameters.trackStates) {
        parameters.trackStates = this.getTrackStates(playlist);
      }
      document.getElementById('playlists').value = playlist;
      this.state.numActiveTracks = 0;
      _ref = parameters.trackStates;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        trackState = _ref[i];
        if (trackState) {
          this.state.numActiveTracks++;
        }
        if (trackLabels && trackLabels.length) {
          toggleClass(trackLabels[i], 'inactive', !trackState);
        }
      }
      activeTrack = this.getFirstActiveTrackIndex(typeof parameters.track !== 'undefined' ? parameters.track : this.state.track, 1, parameters.trackStates);
      if (activeTrack !== this.state.track) {
        parameters.track = activeTrack;
      }
    }
    if (typeof parameters.track !== 'undefined') {
      playlist = parameters.playlist || this.state.playlist;
      if (typeof this.data.playlists[playlist].tracks[parameters.track] === 'undefined') {
        newTrackStates = this.getTrackStates(playlist);
        parameters.track = this.getFirstActiveTrackIndex(parameters.track, 1, newTrackStates);
      }
      if (!currentPlayer.paused) {
        currentPlayer.fadeVolume({
          to: 0,
          callback: function() {
            if (this.pause) {
              this.pause();
              return this.seek(0);
            }
          }
        });
      }
      if (typeof parameters.time === 'undefined') {
        parameters.time = 0;
      }
      for (i = _j = 0, _len1 = trackLabels.length; _j < _len1; i = ++_j) {
        label = trackLabels[i];
        toggleClass(label, 'current', i === parameters.track);
      }
    }
    for (key in parameters) {
      if (typeof this.state[key] !== 'undefined') {
        if (typeof parameters[key] === "object") {
          diff = JSON.stringify(this.state[key]) !== JSON.stringify(parameters[key]);
        } else {
          diff = this.state[key] !== parameters[key];
        }
        if (diff) {
          if (drawWorthy.indexOf(key) !== -1) {
            drawRequired = true;
          }
          this.state[key] = parameters[key];
        }
      }
    }
    if (drawRequired) {
      this.markupPlaylist();
    }
    if (drawRequired || "track" in parameters) {
      track = this.getTrack(parameters.playlist, parameters.track);
      this.currentPlayerType = track.src && !/\.(ogg|wav|m4a|mp3)$/.test(track.src) ? 'youtube' : 'html';
      currentPlayer.hide();
      this.currentPlayerIndex = 1 - this.currentPlayerIndex;
      currentPlayer = this.players[this.currentPlayerType][this.currentPlayerIndex];
      currentPlayer.show();
      currentPlayer.load(track.src);
      this.toggleRepeat(this.state.repeat);
      this.toggleSingle(this.state.single);
      this.toggleShuffle(this.state.shuffle);
    }
    if (stateOnly !== true && "volume" in parameters) {
      currentPlayer.setVolume(this.state.volume);
    }
    if (stateOnly !== true && "muted" in parameters) {
      return currentPlayer.setMute(this.state.muted);
    }
  };

  MusiClock.prototype.markupControls = function() {
    var markup, playlist, playlistSelector;
    playlistSelector = document.getElementById('playlists');
    markup = '';
    for (playlist in this.data.playlists) {
      markup += "<option value=\"" + playlist + "\">" + playlist + "</option>";
    }
    return playlistSelector.innerHTML = markup;
  };

  MusiClock.prototype.attachHandlers = function() {
    var self;
    self = this;
    window.onYouTubePlayerReady = function(playerId) {
      var player, _i, _len, _ref, _results;
      _ref = self.players.youtube;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        player = _ref[_i];
        if (player.options.id === playerId) {
          _results.push(player.setElement(document.getElementById(playerId)));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };
    document.getElementById('playlists').onchange = function() {
      return self.update({
        playlist: this.selectedOptions[0].value
      });
    };
    return document.body.onkeydown = function(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || /input/i.test(event.target.tagName)) {
        return true;
      }
      switch (event.keyCode) {
        case 32:
          self.togglePause();
          break;
        case 37:
          self.seekRelative(-10);
          break;
        case 38:
          self.upVolume();
          break;
        case 39:
          self.seekRelative(10);
          break;
        case 40:
          self.downVolume();
          break;
        case 48:
          self.seekPortion(0);
          break;
        case 49:
          self.seekPortion(0.1);
          break;
        case 50:
          self.seekPortion(0.2);
          break;
        case 51:
          self.seekPortion(0.3);
          break;
        case 52:
          self.seekPortion(0.4);
          break;
        case 53:
          self.seekPortion(0.5);
          break;
        case 54:
          self.seekPortion(0.6);
          break;
        case 55:
          self.seekPortion(0.7);
          break;
        case 56:
          self.seekPortion(0.8);
          break;
        case 57:
          self.seekPortion(0.9);
          break;
        case 72:
          self.prevTrack();
          break;
        case 74:
          self.nextPlaylist();
          break;
        case 75:
          self.prevPlaylist();
          break;
        case 76:
          self.nextTrack();
          break;
        case 77:
          self.toggleMute();
          break;
        case 82:
          self.toggleRepeat();
          break;
        case 83:
          self.toggleSingle();
          break;
        case 187:
          self.upVolume();
          break;
        case 189:
          self.downVolume();
          break;
        default:
          return true;
      }
      event.preventDefault();
      return false;
    };
  };

  MusiClock.prototype.getTrackStates = function(playlistName) {
    var active, dateString, endTime, exclusive, fragments, i, negative, now, nowTime, playlist, regular, rule, rules, startTime, states, track, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    playlist = this.data.playlists[playlistName || this.state.playlist];
    now = new Date();
    nowTime = now.getTime();
    dateString = "" + (now.getMonth() + 1) + "/" + (now.getDate()) + "/" + (now.getFullYear());
    regular = [];
    negative = [];
    exclusive = [];
    _ref = playlist.tracks;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      track = _ref[i];
      if (typeof track.rules !== 'undefined') {
        rules = track.rules.split(" ");
        for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
          rule = rules[_j];
          if (!(fragments = rule.match(/^(.)?{([0-9:]+)-([0-9:]+)}$/))) {
            continue;
          }
          startTime = new Date(dateString + fragments[2]).getTime();
          endTime = new Date(dateString + fragments[3]).getTime();
          if (startTime > endTime) {
            endTime += 86400000;
          }
          active = nowTime >= startTime && nowTime < endTime;
          if (active && fragments[1] === "+") {
            exclusive[i] = true;
          }
          if (fragments[1] === "-") {
            if (active) {
              negative[i] = true;
            } else {
              regular[i] = true;
            }
          }
          if (!fragments[1]) {
            regular[i] = true;
          }
        }
      } else {
        regular[i] = true;
      }
    }
    states = [];
    _ref1 = playlist.tracks;
    for (i = _k = 0, _len2 = _ref1.length; _k < _len2; i = ++_k) {
      track = _ref1[i];
      if (exclusive.length) {
        states[i] = typeof exclusive[i] !== 'undefined';
      } else {
        states[i] = typeof regular[i] !== 'undefined' && typeof negative[i] === 'undefined';
      }
    }
    return states;
  };

  MusiClock.prototype.tickClock = function() {
    var now, self;
    self = this;
    now = new Date();
    clearTimeout(this.timeout);
    this.update({
      trackStates: this.getTrackStates()
    });
    return this.timeout = setTimeout((function() {
      return self.tickClock();
    }), 10000);
  };

  MusiClock.prototype.markupPlaylist = function() {
    var currentTime, i, list, markup, playlist, progress, self, source, state, title, track, trackClasses, tracks, _i, _j, _len, _len1, _ref, _results;
    self = this;
    playlist = this.data.playlists[this.state.playlist];
    markup = "<h2>" + this.state.playlist + "</h2>";
    _ref = playlist.tracks;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      track = _ref[i];
      trackClasses = ["track"];
      if (!this.state.trackStates[i]) {
        trackClasses.push("inactive");
      }
      if (this.state.track === i) {
        trackClasses.push("current");
      }
      track = this.getTrack(this.state.playlist, i);
      progress = '<div class="progress-bar"></div>';
      currentTime = '<div class="current-time-bar"></div>';
      state = '<span class="state"></span>';
      title = "<h3>" + state + track.title + "</h3>";
      source = "<a class=\"fa fa-youtube source\" href=\"http://youtube.com/watch?v=" + track.src + "\" target=\"_blank\"></a>";
      markup += "<article class=\"" + (trackClasses.join(" ")) + "\">" + progress + currentTime + title + source + "</article>";
    }
    list = document.getElementById('playlist');
    list.innerHTML = markup;
    tracks = document.getElementsByClassName('track');
    _results = [];
    for (i = _j = 0, _len1 = tracks.length; _j < _len1; i = ++_j) {
      track = tracks[i];
      _results.push((function(i) {
        return tracks[i].onclick = function(event) {
          return self.update({
            track: i
          });
        };
      })(i));
    }
    return _results;
  };

  MusiClock.prototype.updateTrackProgress = function() {
    var currentPlayer, currentTime, currentTimeBar, loopCount, loopDuration, progress, progressBar, tailDuration, totalPlaytime, track, trackDuration, trackElement;
    track = this.getTrack(this.state.playlist, this.state.track);
    trackElement = document.querySelector('.track.current');
    progressBar = trackElement.querySelector('.progress-bar');
    currentTimeBar = trackElement.querySelector('.current-time-bar');
    currentPlayer = this.getCurrentPlayer();
    trackDuration = currentPlayer.duration;
    totalPlaytime = trackDuration;
    if (this.state.minPlaytime > totalPlaytime && track.ab) {
      tailDuration = trackDuration - track.ab[1];
      loopDuration = track.ab[1] - track.ab[0];
      loopCount = Math.ceil((this.state.minPlaytime - trackDuration) / loopDuration);
      totalPlaytime = trackDuration + loopCount * loopDuration;
    }
    progress = currentPlayer.playtime / totalPlaytime;
    progressBar.style.width = "" + (progress * 100) + "%";
    currentTime = currentPlayer.currentTime / currentPlayer.duration;
    return currentTimeBar.style.width = "" + (currentTime * 100) + "%";
  };

  MusiClock.prototype.getFirstPlaylistName = function() {
    var playlist;
    for (playlist in this.data.playlists) {
      return playlist;
    }
  };

  MusiClock.prototype.getTrack = function(playlist, index) {
    if (playlist == null) {
      playlist = this.state.playlist;
    }
    if (index == null) {
      index = this.state.track;
    }
    return this.data.library[this.data.playlists[playlist].tracks[index].id];
  };

  MusiClock.prototype.getFirstActiveTrackIndex = function(checkFrom, direction, trackStates) {
    var checkfrom, first, i;
    checkfrom = this.realTrackIndex(checkFrom);
    direction = direction ? Math.round(direction) : 1;
    if (trackStates == null) {
      trackStates = this.state.trackStates;
    }
    if (trackStates) {
      first = true;
      i = checkFrom;
      while (first || (!isNaN(i) && i !== checkFrom)) {
        first = false;
        if (trackStates[i]) {
          return i;
        }
        i = this.realTrackIndex(i + direction);
      }
    }
    return NaN;
  };

  MusiClock.prototype.prevPlaylist = function() {
    var playlistName, prevPlaylistName;
    for (playlistName in this.data.playlists) {
      if (prevPlaylistName && playlistName === this.state.playlistName) {
        break;
      }
      prevPlaylistName = playlistName;
    }
    return this.update({
      playlist: prevPlaylist
    });
  };

  MusiClock.prototype.nextPlaylist = function() {
    var firstPlaylistName, nextPlaylistName, playlistName;
    for (playlistName in this.data.playlistNames) {
      if (!firstPlaylistName) {
        firstPlaylistName = playlistName;
      }
      if (nextPlaylistName) {
        nextPlaylistName = playlistName;
        break;
      }
      if (playlistName === this.state.playlistName) {
        nextPlaylistName = playlistName;
      }
    }
    if (playlistName === this.state.playlistName) {
      nextPlaylistName = firstPlaylistName;
    }
    return this.update({
      playlist: nextPlaylistName
    });
  };

  MusiClock.prototype.selectPlaylist = function() {};

  MusiClock.prototype.realTrackIndex = function(index) {
    if (this.state.trackStates) {
      return circular(index, this.state.trackStates.length);
    } else {
      return index;
    }
  };

  MusiClock.prototype.prevTrack = function() {
    return this.update({
      track: this.getFirstActiveTrackIndex(this.state.track - 1, -1)
    });
  };

  MusiClock.prototype.nextTrack = function() {
    var activeTracks, i, state, trackIndex;
    if (this.state.shuffle) {
      activeTracks = [];
      if ((function() {
        var _i, _len, _ref, _results;
        _ref = this.state.trackStates;
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          state = _ref[i];
          _results.push(state && i !== this.state.track);
        }
        return _results;
      }).call(this)) {
        activeTracks.push(i);
      }
      if (activeTracks.length) {
        trackIndex = activeTracks[Math.floor(Math.random() * activeTracks.length)];
      } else {
        trackIndex = this.state.track;
      }
    } else {
      trackIndex = this.getFirstActiveTrackIndex(this.state.track + 1);
    }
    return this.update({
      track: trackIndex
    });
  };

  MusiClock.prototype.seekPortion = function(portion) {
    var player;
    if (!(player = this.getCurrentPlayer())) {
      return;
    }
    return player.seek(player.duration * portion);
  };

  MusiClock.prototype.seekRelative = function(offset) {
    var player, seekTo;
    if (!(player = this.getCurrentPlayer())) {
      return;
    }
    seekTo = player.currentTime + offset;
    seekTo = Math.max(seekTo, 0);
    seekTo = Math.min(seekTo, player.duration);
    return player.seek(seekTo);
  };

  MusiClock.prototype.togglePause = function() {
    var player;
    if (!(player = this.getCurrentPlayer())) {
      return;
    }
    if (player.paused) {
      return player.play();
    } else {
      return player.pause();
    }
  };

  MusiClock.prototype.toggleRepeat = function(repeat) {
    this.state.repeat = typeof repeat !== 'undefined' ? repeat : !this.state.repeat;
    this.getCurrentPlayer().setLoop((this.state.repeat && this.state.single) || this.state.numActiveTracks === 1);
    if (this.controls && this.controls.repeat) {
      return this.controls.repeat.checked = this.state.repeat;
    }
  };

  MusiClock.prototype.toggleSingle = function(single) {
    this.state.single = typeof single !== 'undefined' ? single : !this.state.single;
    this.getCurrentPlayer().setLoop((this.state.repeat && this.state.single) || this.state.numActiveTracks === 1);
    if (this.controls && this.controls.single) {
      return this.controls.single.checked = this.state.single;
    }
  };

  MusiClock.prototype.toggleShuffle = function(shuffle) {
    this.state.shuffle = typeof shuffle !== 'undefined' ? shuffle : !this.state.shuffle;
    if (this.controls && this.controls.shuffle) {
      return this.controls.shuffle.checked = this.state.shuffle;
    }
  };

  MusiClock.prototype.setMinPlaytime = function(value, update) {
    this.update({
      minPlaytime: Number(value)
    });
    if (this.controls.minPlaytimeValue) {
      this.controls.minPlaytimeValue.innerHTML = formatSeconds(value);
      if (update !== false) {
        return setRangeLog(this.controls.minPlaytime, this.state.minPlaytime, 4);
      }
    }
  };

  MusiClock.prototype.setVolume = function(volume, noState) {
    return this.update({
      volume: volume
    });
  };

  MusiClock.prototype.upVolume = function() {
    return this.setVolume(Math.min(1, this.state.volume + 0.1));
  };

  MusiClock.prototype.downVolume = function() {
    return this.setVolume(Math.max(0, this.state.volume - 0.1));
  };

  MusiClock.prototype.toggleMute = function() {
    return this.update({
      muted: !this.state.muted
    });
  };

  MusiClock.prototype.setListControls = function(element) {
    var self;
    self = this;
    this.controls = {};
    this.controls.playPause = element.querySelector('[rel=play-pause]');
    if (this.controls.playPause) {
      this.controls.playPause.onclick = function() {
        self.togglePause();
        return self.updateControlState(this, self.state.paused ? 'play' : 'pause');
      };
      this.updateControlState(this.controls.playPause, self.state.paused ? 'play' : 'pause');
    }
    this.controls.prev = element.querySelector('[rel=prev]');
    if (this.controls.prev) {
      this.controls.prev.onclick = function() {
        return self.prevTrack();
      };
    }
    this.controls.next = element.querySelector('[rel=next]');
    if (this.controls.next) {
      this.controls.next.onclick = function() {
        return self.nextTrack();
      };
    }
    this.controls.repeat = element.querySelector('[rel=repeat]');
    if (this.controls.repeat) {
      this.controls.repeat.onclick = function() {
        return self.toggleRepeat();
      };
    }
    this.toggleRepeat(Boolean(this.state.repeat));
    this.controls.single = element.querySelector('[rel=single]');
    if (this.controls.single) {
      this.controls.single.onclick = function() {
        return self.toggleSingle();
      };
    }
    this.toggleSingle(Boolean(this.state.single));
    this.controls.shuffle = element.querySelector('[rel=shuffle]');
    if (this.controls.shuffle) {
      this.controls.shuffle.onclick = function() {
        self.toggleShuffle();
        return self.updateControlState(this, self.state.shuffle);
      };
      this.updateControlState(this.controls.shuffle, this.state.shuffle);
    }
    this.toggleShuffle(Boolean(this.state.shuffle));
    this.controls.volume = element.querySelector('[rel=volume]');
    if (this.controls.volume) {
      this.controls.volume.onclick = function() {
        self.toggleMute();
        return self.updateControlState(self.controls.volume, self.state.muted ? 'mute' : 'high');
      };
    }
    this.updateControlState(this.controls.volume, this.state.muted ? 'mute' : 'high');
    this.toggleMute(Boolean(this.state.muted));
    this.controls.minPlaytime = element.querySelector('input[rel=min-playtime]');
    this.controls.minPlaytimeValue = element.querySelector('label[rel=min-playtime] .value');
    if (this.controls.minPlaytime) {
      this.controls.minPlaytime.onchange = function() {
        return self.setMinPlaytime(getRangeLog(this, 4), false);
      };
    }
    return this.setMinPlaytime(this.state.minPlaytime);
  };

  MusiClock.prototype.updateControlState = function(element, newState) {
    var pair, state, states, statesRaw, _i, _len, _results;
    if (!element.hasAttribute('data-states')) {
      toggleClass(element, 'inactive', !newState);
    } else if (!element.hasOwnProperty('states')) {
      statesRaw = element.getAttribute('data-states');
      if (statesRaw) {
        statesRaw = statesRaw.split(',');
        states = {};
        for (_i = 0, _len = statesRaw.length; _i < _len; _i++) {
          pair = statesRaw[_i];
          pair = pair.split(':');
          states[pair[0]] = pair[1];
        }
        element.states = states;
      }
    }
    _results = [];
    for (state in element.states) {
      _results.push(toggleClass(element, element.states[state], state === newState));
    }
    return _results;
  };

  MusiClock.prototype.getPlayingAudio = function() {
    var player;
    if ((function() {
      var _i, _len, _ref, _results;
      _ref = document.getElementsByTagName('audio');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        player = _ref[_i];
        _results.push(!player.paused);
      }
      return _results;
    })()) {
      return player;
    }
  };

  MusiClock.prototype.getCurrentPlayer = function() {
    return this.players[this.currentPlayerType][this.currentPlayerIndex];
  };

  return MusiClock;

})();
