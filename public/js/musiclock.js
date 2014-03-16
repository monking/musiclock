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
    var $this = this,
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
      return player.options.id === $this.players[$this.currentPlayerType][$this.currentPlayerIndex].options.id;
    };
    connectPlayer = function(type, i) {
      var player = $this.players[type][i];
      player.addEventListener('canplay', function() {
        if (isCurrentPlayer(player)
        && !$this.state.paused) {
          console.log(player.options.id + ': ' + arguments[0].type);
          player.seek($this.state.time);
          player.play();
        }
      });
      player.addEventListener('play', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          $this.state.paused = false;
        }
      });
      player.addEventListener('pause', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          $this.state.paused = true;
        }
      });
      player.addEventListener('timeupdate', function() {
        var currentTrack;
        if (isCurrentPlayer(player)) {
          $this.state.time = player.currentTime;
          currentTrack = $this.getTrack();
          if (
            currentTrack.ab
            && (
              (
                $this.state.repeat
                && $this.state.single
              )
              || (
                $this.state.minPlaytime
                && player.playtime < $this.state.minPlaytime
              )
              || $this.state.numActiveTracks === 1
            )
          ) {
            if ($this.state.time >= currentTrack.ab[1]) {
              player.seek(currentTrack.ab[0]);
            }
          }
        }
      });
      player.addEventListener('ended', function() {
        if (isCurrentPlayer(player)) {
          console.log(player.options.id + ': ' + arguments[0].type);
          // FIXME: 'ended' should not affect `state.paused`, fix for
          // 'pause' firing before 'ended'
          $this.state.paused = false;
          $this.state.single || $this.nextTrack();
        }
      });
      player.addEventListener('volumechange', function() {
        if (isCurrentPlayer(player)
        && !player.fadeVolumeInterval) {
          $this.state.volume = player.volume;
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
    var $this = this;
    this.stateInterval = setInterval(function() {
      $this.saveState();
    }, 1000);
  },
  stopTrackingState: function() {
    clearInterval(this.stateInterval);
  },
  update: function(parameters) {
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
      currentPlayer.setVolume(this.state.volume);
      this.toggleRepeat(this.state.repeat);
      this.toggleSingle(this.state.single);
      this.toggleShuffle(this.state.shuffle);
    }
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
    var $this = this;
    window.onYouTubePlayerReady = function(playerId) {
      for (var i = 0; i < $this.players.youtube.length; i++) {
        if ($this.players.youtube[i].options.id == playerId)
          $this.players.youtube[i].setElement(document.getElementById(playerId));
      }
    };
    document.getElementById('playlists').onchange = function() {
      $this.update({playlist: this.selectedOptions[0].value});
    }
    document.body.onkeydown = function(event) {
      if (/input/i.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) {
        return true; // allow form input and browser shortcuts
      }
      switch(event.keyCode) {
        case 32  : $this.togglePause();        break; /* SPACEBAR */
        case 37  : $this.seekRelative(-10);    break; /* LEFT */
        case 38  : $this.upVolume();           break; /* UP */
        case 39  : $this.seekRelative(10);     break; /* RIGHT */
        case 40  : $this.downVolume();         break; /* DOWN */
        case 48  : $this.seekPortion(0);       break; /* 0 */
        case 49  : $this.seekPortion(0.1);     break; /* 1 */
        case 50  : $this.seekPortion(0.2);     break; /* 2 */
        case 51  : $this.seekPortion(0.3);     break; /* 3 */
        case 52  : $this.seekPortion(0.4);     break; /* 4 */
        case 53  : $this.seekPortion(0.5);     break; /* 5 */
        case 54  : $this.seekPortion(0.6);     break; /* 6 */
        case 55  : $this.seekPortion(0.7);     break; /* 7 */
        case 56  : $this.seekPortion(0.8);     break; /* 8 */
        case 57  : $this.seekPortion(0.9);     break; /* 9 */
        case 72  : $this.prevTrack();          break; /* h */
        case 74  : $this.nextPlaylist();       break; /* j */
        case 75  : $this.prevPlaylist();       break; /* k */
        case 76  : $this.nextTrack();          break; /* l */
        case 77  : $this.toggleMute();         break; /* m */
        case 82  : $this.toggleRepeat();       break; /* r */
        case 83  : $this.toggleSingle();       break; /* s */
     // case ??  : $this.toggleSShuffle();     break; /* ? */
        case 187 : $this.upVolume();           break; /* = */
        case 189 : $this.downVolume();         break; /* - */
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
    var $this, now, states, nextHour, nextTime, wait;

    $this = this;
    now = new Date()
    clearTimeout(this.timeout);

    this.update({trackStates: this.getTrackStates()});

    this.timeout = setTimeout(function() {
      $this.tickClock();
    }, 10000);
  },
  markupPlaylist: function() {
    var $this, playlist, markup, trackClasses, track, title, list, tracks, setupTrack;

    $this = this;
    playlist = this.data.playlists[this.state.playlist];
    markup = '<h2>' + this.state.playlist + '</h2>';
    for (var i = 0; i < playlist.tracks.length; i++) {
      trackClasses = ["track"];
      if (!this.state.trackStates[i]) trackClasses.push("inactive");
      if (i == this.state.track) trackClasses.push("current");

      track = this.getTrack(this.state.playlist, i);
      title = track.title || track.src;
      markup += '<div class="' + trackClasses.join(" ") + '">' + title + '</div>';
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
    this.state.minPlaytime = Number(value);
    if (this.controls.minPlaytimeValue) {
      this.controls.minPlaytimeValue.innerHTML = formatSeconds(value);
      if (update !== false) {
        setRangeLog(this.controls.minPlaytime, this.state.minPlaytime, 4);
      }
    }
  },
  setVolume: function(volume, noState) {
    if (typeof volume === "undefined" || isNaN(volume))
      volume = this.state.volume;
    else if (!noState)
      this.state.volume = volume;

    this.getCurrentPlayer().setVolume(volume);
  },
  upVolume: function() {
    this.setVolume(Math.min(1, this.state.volume + 0.1));
  },
  downVolume: function() {
    this.setVolume(Math.max(0, this.state.volume - 0.1));
  },
  toggleMute: function() {
    // FIXME: set volume on the player, without triggering a "volumechange"
    // event
  },
  /*
   * add listeners on control element's children, by class
   * called externally
   */
  setListControls: function(element) {
    var $this = this;
    this.controls = {};
    this.controls.prev = element.getElementsByClassName('prev')[0];
    if (this.controls.prev) this.controls.prev.onclick = function() { $this.prevTrack(); };

    this.controls.next = element.getElementsByClassName('next')[0];
    if (this.controls.next) this.controls.next.onclick = function() { $this.nextTrack(); };

    this.controls.repeat = element.getElementsByClassName('repeat')[0];
    if (this.controls.repeat) this.controls.repeat.onclick = function() { $this.toggleRepeat(); };
    this.toggleRepeat(!!this.state.repeat);

    this.controls.single = element.getElementsByClassName('single')[0];
    if (this.controls.single) this.controls.single.onclick = function() { $this.toggleSingle(); };
    this.toggleSingle(!!this.state.single);

    this.controls.shuffle = element.getElementsByClassName('shuffle')[0];
    if (this.controls.shuffle) this.controls.shuffle.onclick = function() { $this.toggleShuffle(); };
    this.toggleShuffle(!!this.state.shuffle);

    this.controls.minPlaytime = element.getElementsByClassName('minPlaytime')[0];
    this.controls.minPlaytimeValue = element.getElementsByClassName('minPlaytime-value')[0];
    if (this.controls.minPlaytime) {
      this.controls.minPlaytime.onchange = function() { $this.setMinPlaytime(getRangeLog(this, 4), false); };
    }
    this.setMinPlaytime(this.state.minPlaytime);
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