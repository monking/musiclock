window.onYouTubePlayerReady = (playerId) -> console.log "too late; #{playerId} has started before the real onYouTubePlayerReady was defined."

class MusiClock
  defaults:
    basePath: ''
    controls: '.controls'
    data: {}

  constructor: (options) ->
    @options = overloads options, @defaults
    @basePath = options.basePath || @defaults.basePath
    @data = options.data || @defaults.data
    @attachHandlers()
    @setupPlayers()
    @markupControls()

    if not @restoreState()
      @update
        playlist        : null
        trackStates     : null
        numActiveTracks : null
        track           : 0
        time            : 0
        volume          : 1
        muted           : false
        paused          : false
        single          : false
        shuffle         : false
        repeat          : false
        softSkip        : false
        minPlaytime     : 100

    if options.controls
      @setListControls document.querySelector options.controls

    @tickClock()
    @startTrackingState()

  setupPlayers: ->
    self = @

    @currentPlayerType = "html"
    @currentPlayerIndex = 0
    @players =
      html: [
        new Player
          id       : 'htplayer0'
          basePath : @basePath
        new Player
          id       : 'htplayer1'
          basePath : @basePath
      ]
      youtube: [
        new YTPlayer
          id        : 'ytplayer0'
          replace   : 'ytapiplayer0'
          container : 'ytcontainer0'
        new YTPlayer
          id        : 'ytplayer1'
          replace   : 'ytapiplayer1'
          container : 'ytcontainer1'
      ]

    isCurrentPlayer = (player) ->
      return player.options.id is self.players[self.currentPlayerType][self.currentPlayerIndex].options.id

    connectPlayer = (type, i) ->
      player = self.players[type][i]

      player.addEventListener 'canplay', ->
        if isCurrentPlayer(player) and !self.state.paused
          player.seek self.state.time
          player.play()

      player.addEventListener 'play', ->
        if isCurrentPlayer(player)
          self.state.paused = false

      player.addEventListener 'pause', ->
        if isCurrentPlayer(player)
          self.state.paused = true

      player.addEventListener 'timeupdate', ->
        return if not isCurrentPlayer player

        self.state.time = player.currentTime
        currentTrack = self.getTrack()
        if currentTrack.ab and not self.state.softSkip and (
          (self.state.repeat and self.state.single) or
          (self.state.minPlaytime and player.playtime < self.state.minPlaytime) or
          self.state.numActiveTracks is 1
        ) and self.state.time >= currentTrack.ab[1]
          player.seek currentTrack.ab[0]

        self.updateTrackProgress()

      player.addEventListener 'ended', ->
        return if not isCurrentPlayer player

        # FIXME: 'ended' should not affect `state.paused`, fix for 'pause' firing before 'ended'
        self.state.paused = false
        self.nextTrack() if not self.state.single

    for type of @players
      connectPlayer(type, i) for player, i in @players[type]

  saveState: ->
    if window.localStorage and JSON
      window.localStorage.state = JSON.stringify @state

    # FIXME: fall back to cookies

  restoreState: ->
    if window.localStorage and window.localStorage.state and JSON
      state = JSON.parse(window.localStorage.state)

    # FIXME: fall back to cookies

    if typeof state is "object"
      # state.trackStates = @getTrackStates(state.playlist)
      # if (!state.trackStates[state.track]) {
      #   state.track = @getFirstActiveTrackIndex(state.track, 1, state.trackStates)
      # }
      @update state
      true
    else
      false

  startTrackingState: ->
    self = @
    @stateInterval = setInterval ->
      self.saveState()
    , 1000

  stopTrackingState: ->
    clearInterval @stateInterval

  update: (parameters, stateOnly) ->
    drawWorthy = ["playlist"]

    if not @state
      @state = parameters
      drawRequired = true

    currentPlayer = @getCurrentPlayer()
    trackLabels = document.getElementsByClassName 'track'

    if typeof parameters.playlist isnt 'undefined'
      if typeof @data.playlists[parameters.playlist] is 'undefined'
        parameters.playlist = @getFirstPlaylistName()
        parameters.trackStates = null
      document.getElementById('playlists').value = parameters.playlists

    if typeof parameters.trackStates isnt 'undefined'
      playlist = parameters.playlist or @state.playlist

      if not parameters.trackStates
        parameters.trackStates = @getTrackStates playlist

      document.getElementById('playlists').value = playlist

      @state.numActiveTracks = 0
      for trackState, i in parameters.trackStates
        @state.numActiveTracks++ if trackState
        toggleClass(trackLabels[i], 'inactive', not trackState) if trackLabels and trackLabels.length

      activeTrack = @getFirstActiveTrackIndex(
        if typeof parameters.track isnt 'undefined' then parameters.track else @state.track,
        1,
        parameters.trackStates
      )

      parameters.track = activeTrack if activeTrack isnt @state.track

    if typeof parameters.track isnt 'undefined'
      playlist = parameters.playlist or @state.playlist
      parameters.softSkip = false

      if typeof @data.playlists[playlist].tracks[parameters.track] is 'undefined'
        newTrackStates = @getTrackStates playlist
        parameters.track = @getFirstActiveTrackIndex parameters.track, 1, newTrackStates

      if not currentPlayer.paused
        currentPlayer.fadeVolume
          to:0,
          callback: ->
            if @pause
              @pause()
              @seek 0

      if typeof parameters.time == 'undefined'
        parameters.time = 0
      for label, i in trackLabels
        toggleClass label, 'current', i is parameters.track

    for key of parameters
      if typeof @state[key] isnt 'undefined'
        if typeof parameters[key] is "object"
          diff = JSON.stringify(@state[key]) isnt JSON.stringify(parameters[key])
        else
          diff = @state[key] isnt parameters[key]

        if diff
          if drawWorthy.indexOf(key) != -1
            drawRequired = true
          @state[key] = parameters[key]

    @markupPlaylist() if drawRequired

    if drawRequired or "track" of parameters
      track = @getTrack parameters.playlist, parameters.track

      @currentPlayerType = if track.src and not /\.(ogg|wav|m4a|mp3)$/.test track.src then 'youtube' else 'html'
      currentPlayer.hide()
      @currentPlayerIndex = 1 - @currentPlayerIndex
      currentPlayer = @players[@currentPlayerType][@currentPlayerIndex]
      currentPlayer.show()
      currentPlayer.load track.src
      @toggleRepeat @state.repeat
      @toggleSingle @state.single
      @toggleShuffle @state.shuffle

    currentPlayer.setVolume(@state.volume) if stateOnly isnt true and "volume" of parameters
    if stateOnly isnt true and "muted" of parameters
      currentPlayer.setMute @state.muted

  markupControls: ->
    playlistSelector = document.getElementById 'playlists'
    markup = ''
    markup += "<option value=\"#{playlist}\">#{playlist}</option>" for playlist of @data.playlists
    playlistSelector.innerHTML = markup

  attachHandlers: ->
    self = @

    window.onYouTubePlayerReady = (playerId) ->
      for player in self.players.youtube
        if player.options.id is playerId
          player.setElement document.getElementById playerId

    document.getElementById('playlists').onchange = ->
      self.update
        playlist: @selectedOptions[0].value

    document.body.onkeydown = (event) ->
      if event.altKey or event.ctrlKey or event.metaKey or /input/i.test event.target.tagName
        return true; # allow form input and browser shortcuts

      switch event.keyCode
        when event.shiftKey && 72 then self.testLoop()      # H
        when event.shiftKey && 76 then self.softSkip()      # L
        when 32                   then self.togglePause()   # SPACEBAR
        when 37                   then self.seek '-10'      # LEFT
        when 38                   then self.upVolume()      # UP
        when 39                   then self.seek '10'       # RIGHT
        when 40                   then self.downVolume()    # DOWN
        when 48                   then self.seekPortion 0   # 0
        when 49                   then self.seekPortion 0.1 # 1
        when 50                   then self.seekPortion 0.2 # 2
        when 51                   then self.seekPortion 0.3 # 3
        when 52                   then self.seekPortion 0.4 # 4
        when 53                   then self.seekPortion 0.5 # 5
        when 54                   then self.seekPortion 0.6 # 6
        when 55                   then self.seekPortion 0.7 # 7
        when 56                   then self.seekPortion 0.8 # 8
        when 57                   then self.seekPortion 0.9 # 9
        when 72                   then self.prevTrack()     # h
        when 74                   then self.nextPlaylist()  # j
        when 75                   then self.prevPlaylist()  # k
        when 76                   then self.nextTrack()     # l
        when 77                   then self.toggleMute()    # m
        when 82                   then self.toggleRepeat()  # r
        when 83                   then self.toggleSingle()  # s
        when 187                  then self.upVolume()      # =
        when 189                  then self.downVolume()    # -
        else return true

      event.preventDefault()
      false

  getTrackStates: (playlistName) ->
    playlist = @data.playlists[playlistName or @state.playlist]
    now = new Date()
    nowTime = now.getTime()
    dateString = "#{now.getMonth() + 1}/#{now.getDate()}/#{now.getFullYear()}"
    regular = []
    negative = []
    exclusive = []
    for track, i in playlist.tracks
      if typeof track.rules isnt 'undefined'
        rules = track.rules.split " "
        for rule in rules
          if not fragments = rule.match /^(.)?{([0-9:]+)-([0-9:]+)}$/ then continue

          startTime = new Date(dateString + fragments[2]).getTime()
          endTime = new Date(dateString + fragments[3]).getTime()
          if startTime > endTime
            endTime += 86400000

          active = (nowTime >= startTime and nowTime < endTime)

          if active and fragments[1] is "+"
            exclusive[i] = true

          if fragments[1] is "-"
            if (active)
              negative[i] = true
            else
              regular[i] = true

          if not fragments[1]
            regular[i] = true
      else
        regular[i] = true

    states = []
    for track, i in playlist.tracks
      if exclusive.length
        states[i] = typeof exclusive[i] isnt 'undefined'
      else
        states[i] = typeof regular[i] isnt 'undefined' and typeof negative[i] is 'undefined'

    states

  tickClock: ->
    self = @
    now = new Date()
    clearTimeout(@timeout)

    @update
      trackStates: @getTrackStates()

    @timeout = setTimeout (-> self.tickClock()), 10000

  markupPlaylist: ->
    self = @
    playlist = @data.playlists[@state.playlist]
    markup = "<h2>#{@state.playlist}</h2>"
    for track, i in playlist.tracks
      trackClasses = ["track"]
      trackClasses.push("inactive") if !@state.trackStates[i]
      trackClasses.push("current") if @state.track is i

      track = @getTrack @state.playlist, i
      progress = '<div class="progress-bar"></div>'
      currentTime = '<div class="current-time-bar"></div>'
      state = '<span class="state"></span>'
      title = "<h3>#{state}#{track.title}</h3>"
      source = "<a class=\"fa fa-youtube source\" href=\"http://youtube.com/watch?v=#{track.src}\" target=\"_blank\"></a>"
      markup += "<article class=\"#{trackClasses.join(" ")}\">#{progress}#{currentTime}#{title}#{source}</article>"

    list = document.getElementById 'playlist'
    list.innerHTML = markup
    tracks = document.getElementsByClassName 'track'

    for track, i in tracks
      do (i) ->
        tracks[i].onclick = (event) ->
          self.update
            track: i

  updateTrackProgress: ->
    track = @getTrack @state.playlist, @state.track
    trackElement = document.querySelector '.track.current'
    progressBar = trackElement.querySelector '.progress-bar'
    currentTimeBar = trackElement.querySelector '.current-time-bar'
    currentPlayer = @getCurrentPlayer()
    trackDuration = currentPlayer.duration

    totalPlaytime = trackDuration
    if @state.minPlaytime > totalPlaytime and track.ab
      tailDuration = trackDuration - track.ab[1]
      loopDuration = track.ab[1] - track.ab[0]
      loopCount = Math.ceil((@state.minPlaytime - trackDuration) / loopDuration)
      totalPlaytime = trackDuration + loopCount * loopDuration

    progress = currentPlayer.playtime / totalPlaytime
    progressBar.style.width = "#{progress * 100}%"

    currentTime = currentPlayer.currentTime / currentPlayer.duration
    currentTimeBar.style.width = "#{currentTime * 100}%"

  getFirstPlaylistName: ->
    return playlist for playlist of @data.playlists

  getTrack: (playlist, index) ->
    playlist ?= @state.playlist
    index ?= @state.track
    @data.library[@data.playlists[playlist].tracks[index].id]

  getFirstActiveTrackIndex: (checkFrom, direction, trackStates) -> #FIXME: this method is a MESS!
    checkfrom   = @realTrackIndex checkFrom
    direction   = if direction then Math.round direction else 1
    trackStates ?= @state.trackStates

    if trackStates
      first = true
      i = checkFrom
      while first or (!isNaN(i) and i isnt checkFrom)
        first = false
        return i if trackStates[i]
        i = @realTrackIndex i + direction

    return NaN

  prevPlaylist: ->
    for playlistName of @data.playlists
      break if prevPlaylistName and playlistName is @state.playlistName
      prevPlaylistName = playlistName
    @update
      playlist: prevPlaylist

  nextPlaylist: ->
    for playlistName of @data.playlistNames
      firstPlaylistName = playlistName if not firstPlaylistName

      if nextPlaylistName
        nextPlaylistName = playlistName
        break

      nextPlaylistName = playlistName if playlistName is @state.playlistName

    nextPlaylistName = firstPlaylistName if playlistName is @state.playlistName

    @update
      playlist: nextPlaylistName

  selectPlaylist: ->
    # STUB: cannot open playlist selector as long as it is an OS select
    # element

  realTrackIndex: (index) ->
    return if @state.trackStates then circular index, @state.trackStates.length else index

  prevTrack: ->
    # FIXME: if shuffling, get last played, not previous in playlist
    @update
      track: @getFirstActiveTrackIndex @state.track - 1, -1

  nextTrack: ->
    if @state.shuffle
      activeTracks = []
      activeTracks.push i if state and i isnt @state.track for state, i in @state.trackStates

      if activeTracks.length
        trackIndex = activeTracks[Math.floor(Math.random() * activeTracks.length)]
      else
        trackIndex = @state.track
    else
      trackIndex = @getFirstActiveTrackIndex @state.track + 1

    @update
      track: trackIndex

  softSkip: ->
    @state.softSkip = true

  testLoop: (leadTime = 2) ->
    track = @getTrack()
    if track.ab
      @seek track.ab[1] - leadTime

  seek: (time) ->
    return if not player = @getCurrentPlayer()

    if typeof time is 'string'
      time = player.currentTime + Number(time)

    time = Math.max time, 0
    time = Math.min time, player.duration

    player.seek time

  seekPortion: (portion) ->
    @seek player.duration * portion

  togglePause: ->
    return if not player = @getCurrentPlayer()

    if player.paused then player.play() else player.pause()
    # @controls.playPause #FIXME: what was this supposed to be? not a function call?

  toggleRepeat: (repeat) ->
    @state.repeat = if typeof repeat isnt 'undefined' then repeat else (not @state.repeat)

    @getCurrentPlayer().setLoop (@state.repeat and @state.single) or @state.numActiveTracks is 1

    @controls.repeat.checked = @state.repeat if @controls and @controls.repeat

  toggleSingle: (single) ->
    @state.single = if typeof single isnt 'undefined' then single else (not @state.single)

    @getCurrentPlayer().setLoop (@state.repeat and @state.single) or @state.numActiveTracks is 1

    @controls.single.checked = @state.single if @controls and @controls.single

  toggleShuffle: (shuffle) ->
    @state.shuffle = if typeof shuffle isnt 'undefined' then shuffle else (not @state.shuffle)
    @controls.shuffle.checked = @state.shuffle if @controls and @controls.shuffle

  setMinPlaytime: (value, update) ->
    @update
      minPlaytime: Number(value)

    if @controls.minPlaytimeValue
      @controls.minPlaytimeValue.innerHTML = formatSeconds(value)
      setRangeLog(@controls.minPlaytime, @state.minPlaytime, 4) if update isnt false

  setVolume: (volume, noState) ->
    @update
      volume: volume

  upVolume: ->
    @setVolume Math.min 1, @state.volume + 0.1

  downVolume: ->
    @setVolume Math.max 0, @state.volume - 0.1

  toggleMute: ->
    @update
      muted: not @state.muted

  #
  # add listeners on control element's children, by class
  # called externally
  #
  setListControls: (element) ->
    self = @
    @controls = {}
    @controls.playPause = element.querySelector '[rel=play-pause]'
    if @controls.playPause
      @controls.playPause.onclick = ->
        self.togglePause()
        self.updateControlState @, if self.state.paused then 'play' else 'pause'

      @updateControlState @controls.playPause, if self.state.paused then 'play' else 'pause'

    @controls.prev = element.querySelector '[rel=prev]'
    if @controls.prev
      @controls.prev.onclick  = -> self.prevTrack()

    @controls.next = element.querySelector '[rel=next]'
    if @controls.next
      @controls.next.onclick = -> self.nextTrack()

    @controls.softSkip = element.querySelector '[rel=soft-skip]'
    if @controls.softSkip
      @controls.softSkip.onclick = -> self.softSkip()

    @controls.repeat = element.querySelector '[rel=repeat]'
    if @controls.repeat
      @controls.repeat.onclick = -> self.toggleRepeat()
    @toggleRepeat Boolean @state.repeat

    @controls.single = element.querySelector '[rel=single]'
    if @controls.single
      @controls.single.onclick = -> self.toggleSingle()
    @toggleSingle Boolean @state.single

    @controls.shuffle = element.querySelector '[rel=shuffle]'
    if @controls.shuffle
      @controls.shuffle.onclick = ->
        self.toggleShuffle()
        self.updateControlState @, self.state.shuffle
      @updateControlState @controls.shuffle, @state.shuffle
    @toggleShuffle Boolean @state.shuffle

    @controls.volume = element.querySelector '[rel=volume]'
    if @controls.volume
      @controls.volume.onclick = ->
        self.toggleMute()
        self.updateControlState self.controls.volume, if self.state.muted then 'mute' else 'high'
    @updateControlState @controls.volume, if @state.muted then 'mute' else 'high'
    @toggleMute Boolean @state.muted

    @controls.minPlaytime = element.querySelector 'input[rel=min-playtime]'
    @controls.minPlaytimeValue = element.querySelector 'label[rel=min-playtime] .value'
    if @controls.minPlaytime
      @controls.minPlaytime.onchange = -> self.setMinPlaytime getRangeLog(@, 4), false
    @setMinPlaytime @state.minPlaytime

  updateControlState: (element, newState) ->
    if not element.hasAttribute 'data-states'
      toggleClass element, 'inactive', not newState
    else if !element.hasOwnProperty 'states'
      statesRaw = element.getAttribute 'data-states'
      if statesRaw
        statesRaw = statesRaw.split ','
        states = {}
        for pair in statesRaw
          pair = pair.split ':'
          states[pair[0]] = pair[1]
        element.states = states

    for state of element.states
      toggleClass element, element.states[state], state == newState

  getPlayingAudio: ->
    return player if not player.paused for player in document.getElementsByTagName 'audio'

  getCurrentPlayer: ->
    return @players[@currentPlayerType][@currentPlayerIndex]
