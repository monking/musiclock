class YoutubePlayer extends Player
  defaults:
    id             : null
    replace        : null
    container      : null
    updateInterval : 17
    playerWidth    : 425
    playerHeight   : 350

  constructor: (options) ->
    super options

  setElement: (element) ->
    @element = element

    if element
      @attachHandlers()
      @duration = element.getDuration()
      @dispatchEvent('canplay')

  attachHandlers: ->
    self = this
    stateHandlerName = "#{@options.id}StateHandler"
    window[stateHandlerName] = (state) ->
      switch state
        # unused statuses: -1, 3, 5
        when 0
          if self.looped
            self.seek 0
            self.play()
          else
            self.paused = true
            self.dispatchEvent 'ended'
        when 1
          self.paused = false
          self.dispatchEvent 'play'
        when 2
          self.paused = true
          self.dispatchEvent 'pause'

    @element.addEventListener('onStateChange', stateHandlerName)
    onTimeChange = ->
      oldTime = self.currentTime
      self.currentTime = self.element.getCurrentTime()
      if oldTime isnt self.currentTime
        if self.currentTime > oldTime and not self.seeking
          self.playtime += self.currentTime - oldTime
        self.seeking = false
        self.dispatchEvent 'timeupdate'

      oldVolume = self.volume
      self.volume = self.element.getVolume() / 100
      if oldVolume isnt self.volume and @fadeVolumeInterval isnt null and (not @muted or @volume > 0)
        self.dispatchEvent 'volumechange'

    @currentTimeInterval = setInterval onTimeChange, @options.updateInterval

  load: (src) ->
    @playtime = 0
    if @element
      @element.loadVideoById
        videoId          : src
        startSeconds     : 0
        suggestedQuality : 'large'
    else
      params = allowScriptAccess: 'always'
      atts = id: @options.id
      swfobject.embedSWF(
        "http://www.youtube.com/v/#{src}?enablejsapi=1&playerapiid=#{@options.id}&version=3&autoplay=1&loop=#{if @options.loop then '1' else '0'}"
        @options.replace
        @options.playerWidth
        @options.playerHeight
        "8"
        null
        null
        params
        atts
      )

    # FIXME: carry MusiClock.state.time into startSeconds

  play: ->
    @element.playVideo()

  pause: ->
    @element.pauseVideo()

  seek: (seekTo) ->
    return if @currentTime is seekTo

    @seeking = true
    @currentTime = seekTo
    @element.seekTo(seekTo) if @element

  setLoop: (looped) ->
    @looped = looped

    # FIXME: YT_API::setLoop isn't working; handling in 'ended' event
    # @element.setLoop(looped)

  setVolume: (volume) ->
    @volume = volume
    @element.setVolume volume * 100 if @element

  setMute: (muted) ->
    @muted = muted
    @element.setVolume muted ? 0 : @volume * 100 if @element

  show: ->
    toggleClass document.getElementById(@options.container), 'hidden', false

  hide: ->
    toggleClass document.getElementById(@options.container), 'hidden', true
