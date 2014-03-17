/*
 * MusiClock
 */
var MusiClock = function(options) {
  this.basePath = options.basePath;
  this.data = options.library;
};
MusiClock.prototype = {
  init: function() {
    this.setupPlayers();
    this.markupControls();
    this.attachHandlers();
    if (!this.restoreState()) {
      this.update({
        playlist        : null,
        trackStates     : null,
        numActiveTracks : null,
        track           : 0,
        time            : 0,
        volume          : 1,
        muted           : false,
        paused          : false,
        single          : false,
        shuffle         : false,
        repeat          : false,
        minPlaytime     : 100
      });
    }
    this.tickClock();
    this.startTrackingState();
  },
  setupPlayers: function() {
    var self = this,
      connectPlayer,
      isCurrentPlayer;

    this.currentPlayerType = "html";
    this.currentPlayerIndex = 0;
    this.players = {
      "html": [
        new Player({id:'htplayer0', basePath:this.basePath}),
        new Player({id:'htplayer1', basePath:this.basePath})
      ],
      "youtube": [
        new YTPlayer({id:'ytplayer0',replace:'ytapiplayer0',container:'ytcontainer0'}),
        new YTPlayer({id:'ytplayer1',replace:'ytapiplayer1',container:'ytcontainer1'})
      ]
    }
        isCurrentPlayer = function(player) {
      return player.options.id === self.players[self.currentPlayerType][self.currentPlayerIndex].options.id;
    };
    connectPlayer = function(type, i) {
      var player = self.players[type][i];
      player.addEventListener('canplay', function() {
        if (isCurrentPlayer(player)
        && !self.state.paused) {
          console.log(player.options.id + ': ' + arguments[0].type);
          player.seek(self.state.time);
          player.play();
        }
      });
      player.addEventListener('play', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          self.state.paused = false;
        }
      });
      player.addEventListener('pause', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          self.state.paused = true;
        }
      });
      player.addEventListener('timeupdate', function() {
        var currentTrack;
        if (isCurrentPlayer(player)) {
          self.state.time = player.currentTime;
          currentTrack = self.getTrack();
          if (
            currentTrack.ab
            && (
              (
                self.state.repeat
                && self.state.single
              )
              || (
                self.state.minPlaytime
                && player.playtime < self.state.minPlaytime
              )
              || self.state.numActiveTracks === 1
            )
          ) {
            if (self.state.time >= currentTrack.ab[1]) {
              player.seek(currentTrack.ab[0]);
            }
          }
          self.updateTrackProgress();
        }
      });
      player.addEventListener('ended', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          // FIXME: 'ended' should not affect `state.paused`, fix for
          // 'pause' firing before 'ended'
          self.state.paused = false;
          self.state.single || self.nextTrack();
        }
      });
      player.addEventListener('volumechange', function() {
        if (isCurrentPlayer(player)
        && null === player.fadeVolumeInterval) {
          self.update({volume: player.volume}, true);
        }
      });
    };
    for (var type in this.players) {
      for (var i = 0; i < this.players[type].length; i++) {
        connectPlayer(type, i);
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
      /*
      state.trackStates = this.getTrackStates(state.playlist);
      if (!state.trackStates[state.track]) {
        state.track = this.getFirstActiveTrackIndex(state.track, 1, state.trackStates);
      }
      */
      this.update(state);
      return true;
    }
    return false;
  },
  startTrackingState: function() {
    var self = this;
    this.stateInterval = setInterval(function() {
      self.saveState();
    }, 1000);
  },
  stopTrackingState: function() {
    clearInterval(this.stateInterval);
  },
  update: function(parameters, stateOnly) {
    var filters, drawRequired, key, drawWorthy = ["playlist"],
      currentPlayer, trackLabels, track, list, diff;
    if (!this.state) {
      this.state = parameters;
      drawRequired = true;
    }
    currentPlayer = this.getCurrentPlayer();
    trackLabels = document.getElementsByClassName('track');
    filters:{
      if (typeof parameters.playlist !== "undefined") {
        (function() {
          if (typeof this.data.playlists[parameters.playlist] === "undefined") {
            parameters.playlist = this.getFirstPlaylist();
            parameters.trackStates = null;
          }
          document.getElementById('playlists').value = parameters.playlists
        }).call(this);
      }
      if (typeof parameters.trackStates !== "undefined") {
        (function() {
          var playlist, activeTrack;

          playlist = parameters.playlist || this.state.playlist;
          if (!parameters.trackStates) {
            parameters.trackStates = this.getTrackStates(playlist);
          }
          document.getElementById('playlists').value = playlist

          this.state.numActiveTracks = 0;
          for (var i = 0; i < parameters.trackStates.length; i++) {
            if (parameters.trackStates[i]) this.state.numActiveTracks++;
            if (trackLabels && trackLabels.length)
              toggleClass(trackLabels[i], 'inactive', !parameters.trackStates[i]);
          }
          activeTrack = this.getFirstActiveTrackIndex(
            typeof parameters.track !== "undefined" ?
              parameters.track :
              this.state.track,
            1,
            parameters.trackStates
          );
          if (activeTrack !== this.state.track)
            parameters.track = activeTrack;
        }).call(this);
      }
      if (typeof parameters.track !== "undefined") {
        (function() {
          var playlist, newTrackStates;

          playlist = parameters.playlist || this.state.playlist;

          if (typeof this.data.playlists[playlist].tracks[parameters.track] === "undefined") {
            newTrackStates = this.getTrackStates(playlist);
            parameters.track = this.getFirstActiveTrackIndex(parameters.track, 1, newTrackStates);
          }

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
          for (var i = 0; i < trackLabels.length; i++) {
            toggleClass(trackLabels[i], 'current', i == parameters.track);
          }
        }).call(this);
      }
    }

    for (key in parameters) {
      if (typeof this.state[key] !== "undefined") {
        diff = (
          typeof parameters[key] === "object" ?
          JSON.stringify(this.state[key]) !== JSON.stringify(parameters[key]) :
          this.state[key] !== parameters[key]
        );
        if (diff) {
          if (drawWorthy.indexOf(key) != -1)
            drawRequired = true;
          this.state[key] = parameters[key];
        }
      }
    }
    if (drawRequired)
      this.markupPlaylist();
    if (drawRequired || "track" in parameters) {
      track = this.getTrack();
      if (track.src && !/\.(ogg|wav|m4a|mp3)$/.test(track.src)) {
        this.currentPlayerType = 'youtube';
      } else {
        this.currentPlayerType = 'html';
      }
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
      console.log(this.state.muted);
      currentPlayer.setMute(this.state.muted);
    }
    console.log(this.state.volume);
  },
  markupControls: function() {
    var playlistSelector = document.getElementById('playlists');
    var markup = '';
    for (var playlist in this.data.playlists) {
      markup += '<option value="' + playlist + '">' + playlist + '</option>';
    }
    playlistSelector.innerHTML = markup;
  },
  attachHandlers: function() {
    var self = this;
    window.onYouTubePlayerReady = function(playerId) {
      for (var i = 0; i < self.players.youtube.length; i++) {
        if (self.players.youtube[i].options.id == playerId)
          self.players.youtube[i].setElement(document.getElementById(playerId));
      }
    };
    document.getElementById('playlists').onchange = function() {
      self.update({playlist: this.selectedOptions[0].value});
    }
    document.body.onkeydown = function(event) {
      if (/input/i.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) {
        return true; // allow form input and browser shortcuts
      }
      switch(event.keyCode) {
        case 32  : self.togglePause();        break; /* SPACEBAR */
        case 37  : self.seekRelative(-10);    break; /* LEFT */
        case 38  : self.upVolume();           break; /* UP */
        case 39  : self.seekRelative(10);     break; /* RIGHT */
        case 40  : self.downVolume();         break; /* DOWN */
        case 48  : self.seekPortion(0);       break; /* 0 */
        case 49  : self.seekPortion(0.1);     break; /* 1 */
        case 50  : self.seekPortion(0.2);     break; /* 2 */
        case 51  : self.seekPortion(0.3);     break; /* 3 */
        case 52  : self.seekPortion(0.4);     break; /* 4 */
        case 53  : self.seekPortion(0.5);     break; /* 5 */
        case 54  : self.seekPortion(0.6);     break; /* 6 */
        case 55  : self.seekPortion(0.7);     break; /* 7 */
        case 56  : self.seekPortion(0.8);     break; /* 8 */
        case 57  : self.seekPortion(0.9);     break; /* 9 */
        case 72  : self.prevTrack();          break; /* h */
        case 74  : self.nextPlaylist();       break; /* j */
        case 75  : self.prevPlaylist();       break; /* k */
        case 76  : self.nextTrack();          break; /* l */
        case 77  : self.toggleMute();         break; /* m */
        case 82  : self.toggleRepeat();       break; /* r */
        case 83  : self.toggleSingle();       break; /* s */
     // case ??  : self.toggleSShuffle();     break; /* ? */
        case 187 : self.upVolume();           break; /* = */
        case 189 : self.downVolume();         break; /* - */
        default  : return true;
      }
      event.preventDefault();
      return false;
    };
  },
  getTrackStates: function(playlistName) {
    var playlist, now, dateString, nowTime, regular, negative, exclusive,
      i, rules, j, fragments, startTime, endTime, active, states;

    playlist = this.data.playlists[playlistName || this.state.playlist];
    now = new Date();
    nowTime = now.getTime();
    dateString = (now.getMonth() + 1) + "/" + now.getDate() + "/" + now.getFullYear() + " ";
    regular = [];
    negative = [];
    exclusive = [];
    for (i = 0; i < playlist.tracks.length; i++) {
      track = playlist.tracks[i];
      if (typeof track.rules !== "undefined") {
        rules = track.rules.split(" ");
        for (j = 0; j < rules.length; j++) {
          fragments = rules[j].match(/^(.)?{([0-9:]+)-([0-9:]+)}$/);
          if (!fragments) continue;
          startTime = new Date(dateString + fragments[2]).getTime();
          endTime = new Date(dateString + fragments[3]).getTime();
          if (startTime > endTime) {
            endTime += 86400000;
          }
          active = (nowTime >= startTime && nowTime < endTime);
          if (active && fragments[1] === "+")
            exclusive[i] = true;
          if (fragments[1] === "-") {
            if (active)
              negative[i] = true;
            else
              regular[i] = true;
          }
          if (!fragments[1])
            regular[i] = true;
        }
      } else {
        regular[i] = true;
      }
    }
    states = [];
    for (i = 0; i < playlist.tracks.length; i++) {
      if (exclusive.length) {
        states[i] = typeof exclusive[i] !== "undefined";
      } else {
        states[i] = (
          typeof regular[i] !== "undefined"
          && typeof negative[i] === "undefined"
        );
      }
    }
    return states;
  },
  tickClock: function() {
    var self, now, states, nextHour, nextTime, wait;

    self = this;
    now = new Date()
    clearTimeout(this.timeout);

    this.update({trackStates: this.getTrackStates()});

    this.timeout = setTimeout(function() {
      self.tickClock();
    }, 10000);
  },
  markupPlaylist: function() {
    var self, playlist, markup, trackClasses, track, progress, state, title,
      list, tracks, setupTrack;

    self = this;
    playlist = this.data.playlists[this.state.playlist];
    markup = '<h2>' + this.state.playlist + '</h2>';
    for (var i = 0; i < playlist.tracks.length; i++) {
      trackClasses = ["track"];
      if (!this.state.trackStates[i]) trackClasses.push("inactive");
      if (i == this.state.track) trackClasses.push("current");

      track = this.getTrack(this.state.playlist, i);
      progress = '<div class="progress"></div>';
      state = '<span class="state"></span>';
      title = '<h3>' + state + track.title || track.src + '</h3>';
      markup += '<article class="' + trackClasses.join(" ") + '">'
        + progress
        + title
      + '</article>';
    }
    list = document.getElementById('playlist');
    list.innerHTML = markup;
    tracks = document.getElementsByClassName('track');
        setupTrack = function(i) {
      tracks[i].onclick = function() {
        self.update({track:i});
      };
    };
    for (i = 0; i < tracks.length; i++) {
      setupTrack(i);
    }
  },
  updateTrackProgress: function() {
    var track, currentPlayer, loopCount, loopDuration, tailDuration, trackElement, progressBar, totalPlaytime, progress;
    track = this.getTrack(this.state.playlist, this.state.track);
    trackElement = document.querySelector('.track.current');
    progressBar = trackElement.querySelector('.progress');
    currentPlayer = this.getCurrentPlayer();
    trackDuration = currentPlayer.duration

    totalPlaytime = trackDuration;
    if (this.state.minPlaytime > totalPlaytime && track.ab) {
      tailDuration = trackDuration - track.ab[1];
      loopDuration = track.ab[1] - track.ab[0];
      loopCount = Math.ceil((this.state.minPlaytime - trackDuration) / loopDuration);
      totalPlaytime = trackDuration + loopCount * loopDuration
    }
    progress = this.state.time / totalPlaytime;
    progressBar.style.width = (progress * 100) + '%';
  },
  getFirstPlaylist: function() {
    for (var playlist in this.data.playlists) { return playlist; }
  },
  getTrack: function(playlist, index) {
    if (typeof playlist === "undefined") playlist = this.state.playlist;
    if (typeof index === "undefined") index = this.state.track;
    return this.data.library[this.data.playlists[playlist].tracks[index].id];
  },
  getFirstActiveTrackIndex: function(checkFrom, direction, trackStates) {
    var first, next, from, to;

    checkFrom = checkFrom || 0;
    direction = direction || 1;
    trackStates = trackStates || this.state.trackStates;

    from = (direction > 0 ? 0 : trackStates.length - 1);
    to = (direction > 0 ? trackStates.length : -1);
    for (var i = from; i !== to; i += direction) {
      if (!trackStates[i]) continue;

      if (typeof first === "undefined")
        first = i;
      if (typeof next === "undefined" && (direction > 0 ? i >= checkFrom : i <= checkFrom)) {
        next = i;
        break;
      }
    }
    return (typeof next !== "undefined" ? next : first);
  },
  prevPlaylist: function() {
    var prevPlaylist;
    for (var playlist in this.data.playlists) {
      if (prevPlaylist && playlist == this.state.playlist) break;
      prevPlaylist = playlist;
    }
    this.update({playlist: prevPlaylist});
  },
  nextPlaylist: function() {
    var firstPlaylist, nextPlaylist;
    for (var playlist in this.data.playlists) {
      if (!firstPlaylist)
        firstPlaylist = playlist;
      if (nextPlaylist) {
        nextPlaylist = playlist;
        break;
      }
      if (playlist == this.state.playlist)
        nextPlaylist = playlist;
    }
    if (playlist == this.state.playlist) nextPlaylist = firstPlaylist;
    this.update({playlist: nextPlaylist});
  },
  selectPlaylist: function() {
    // STUB: cannot open playlist selector as long as it is an OS select
    // element
  },
  prevTrack: function() {
    // FIXME: if shuffling, get last played, not previous in playlist
    this.update({track:this.getFirstActiveTrackIndex(this.state.track - 1, -1)});
  },
  nextTrack: function() {
    var trackIndex, activeTracks, i, len;
    if (this.state.shuffle) {
      activeTracks = [];
      for (i = 0, len = this.state.trackStates.length; i < len; i++) {
        if (this.state.trackStates[i] && i !== this.state.track)
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
    this.update({track:trackIndex});
  },
  seekPortion: function(portion) {
    var player = this.getCurrentPlayer();
    if (!player) return;
    player.seek(player.duration * portion);
  },
  seekRelative: function(offset) {
    var player, seekTo;

    player = this.getCurrentPlayer();
    if (!player) return;
    seekTo = player.currentTime + offset;
    seekTo = Math.max(seekTo, 0);
    seekTo = Math.min(seekTo, player.duration);
    player.seek(seekTo);
  },
  togglePause: function() {
    var player = this.getCurrentPlayer();
    player.paused ? player.play() : player.pause();
    this.controls.playPause
  },
  toggleRepeat: function(repeat) {
    if (typeof repeat !== "undefined")
      this.state.repeat = repeat;
    else
      this.state.repeat = !this.state.repeat;

    this.getCurrentPlayer().setLoop(
      (
        this.state.repeat
        && this.state.single
      )
      || this.state.numActiveTracks === 1
    );
    if (this.controls && this.controls.repeat) {
      this.controls.repeat.checked = this.state.repeat;
    }
  },
  toggleSingle: function(single) {
    if (typeof single !== "undefined")
      this.state.single = single;
    else
      this.state.single = !this.state.single;

    this.getCurrentPlayer().setLoop(
      (
        this.state.repeat
        && this.state.single
      )
      || this.state.numActiveTracks === 1
    );
    if (this.controls && this.controls.single) {
      this.controls.single.checked = this.state.single;
    }
  },
  toggleShuffle: function(shuffle) {
    if (typeof shuffle !== "undefined")
      this.state.shuffle = shuffle;
    else
      this.state.shuffle = !this.state.shuffle;

    if (this.controls && this.controls.shuffle) {
      this.controls.shuffle.checked = this.state.shuffle;
    }
  },
  setMinPlaytime: function(value, update) {
    this.update({"minPlaytime": Number(value)});
    if (this.controls.minPlaytimeValue) {
      this.controls.minPlaytimeValue.innerHTML = formatSeconds(value);
      if (update !== false) {
        setRangeLog(this.controls.minPlaytime, this.state.minPlaytime, 4);
      }
    }
  },
  setVolume: function(volume, noState) {
    this.update({volume: volume});
  },
  upVolume: function() {
    this.setVolume(Math.min(1, this.state.volume + 0.1));
  },
  downVolume: function() {
    this.setVolume(Math.max(0, this.state.volume - 0.1));
  },
  toggleMute: function() {
    this.update({muted:!this.state.muted});
  },
  /*
   * add listeners on control element's children, by class
   * called externally
   */
  setListControls: function(element) {
    var self = this;
    this.controls = {};
    this.controls.playPause = element.querySelector('[rel=play-pause]');
    if (this.controls.playPause) {
      this.controls.playPause.onclick = function() {
        self.togglePause();
        self.updateControlState(this, self.state.paused ? 'play' : 'pause');
      };
      this.updateControlState(this.controls.playPause, self.state.paused ? 'play' : 'pause');
    }

    this.controls.prev = element.querySelector('[rel=prev]');
    if (this.controls.prev) this.controls.prev.onclick = function() { self.prevTrack(); };

    this.controls.next = element.querySelector('[rel=next]');
    if (this.controls.next) this.controls.next.onclick = function() { self.nextTrack(); };

    this.controls.repeat = element.querySelector('[rel=repeat]');
    if (this.controls.repeat) this.controls.repeat.onclick = function() { self.toggleRepeat(); };
    this.toggleRepeat(!!this.state.repeat);

    this.controls.single = element.querySelector('[rel=single]');
    if (this.controls.single) this.controls.single.onclick = function() { self.toggleSingle(); };
    this.toggleSingle(!!this.state.single);

    this.controls.shuffle = element.querySelector('[rel=shuffle]');
    if (this.controls.shuffle) {
      this.controls.shuffle.onclick = function() {
        self.toggleShuffle();
        self.updateControlState(this, self.state.shuffle);
      };
      this.updateControlState(this.controls.shuffle, this.state.shuffle);
    }
    this.toggleShuffle(!!this.state.shuffle);

    this.controls.volume = element.querySelector('[rel=volume]');
    if (this.controls.volume) this.controls.volume.onclick = function() {
      self.toggleMute();
      self.updateControlState(self.controls.volume, self.state.muted ? 'mute' : 'high');
    };
    this.updateControlState(this.controls.volume, this.state.muted ? 'mute' : 'high');
    this.toggleMute(!!this.state.muted);

    this.controls.minPlaytime = element.querySelector('input[rel=min-playtime]');
    this.controls.minPlaytimeValue = element.querySelector('label[rel=min-playtime] .value');
    if (this.controls.minPlaytime) {
      this.controls.minPlaytime.onchange = function() { self.setMinPlaytime(getRangeLog(this, 4), false); };
    }
    this.setMinPlaytime(this.state.minPlaytime);
  },
  updateControlState: function(element, newState) {
    var statesRaw, states, i, len, pair, state;
    if (!element.hasAttribute('data-states')) {
      toggleClass(element, 'inactive', !newState);
    } else if (!element.hasOwnProperty('states')) {
      statesRaw = element.getAttribute('data-states');
      if (statesRaw) {
        statesRaw = statesRaw.split(',');
        states = {};
        for (i=0, len=statesRaw.length; i < len; i++) {
          pair = statesRaw[i].split(':');
          states[pair[0]] = pair[1];
        }
        element.states = states;
      }
    }
    for (state in element.states) {
      toggleClass(element, element.states[state], state == newState);
    }
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
