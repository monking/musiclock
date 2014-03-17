class Player extends EventDispatcher
  defaults:
    id       : null
    basePath : ''

  constructor: (options) ->
    super()
    @options            = overloads options, @defaults
    @currentTime        = 0
    @duration           = 0
    @volume             = 0
    @playtime           = 0
    @element            = null
    @paused             = true
    @muted              = false
    @seeking            = false
    @looped             = false
    @fadeVolumeInterval = null

    @setElement document.getElementById options.id if options.id

  setElement: (element) ->
    @element = element
    @attachHandlers() if element

  attachHandlers: ->
    self = this
    @element.addEventListener 'canplay', ->
      if (self.currentTime > 0)
        @currentTime = self.currentTime
      else
        self.currentTime = @currentTime

      self.duration = @duration
      self.dispatchEvent('canplay')

    @element.addEventListener 'play', ->
      self.paused = false
      self.dispatchEvent('play')

    @element.addEventListener 'pause', ->
      self.paused = true
      self.dispatchEvent('pause')

    @element.addEventListener 'seeking', ->
      self.seeking = true

    @element.addEventListener 'timeupdate', ->
      if (!self.seeking)
        self.playtime += @currentTime - self.currentTime

      self.currentTime = @currentTime
      self.seeking = false
      self.dispatchEvent 'timeupdate'

    @element.addEventListener 'ended', ->
      self.paused = true
      self.dispatchEvent 'ended'

    @element.addEventListener 'volumechange', ->
      if @fadeVolumeInterval isnt null and (not @muted or @volume > 0)
        self.volume = @volume
        self.dispatchEvent 'volumechange'

  load: (src) ->
    @playtime = 0
    @seeking = true
    @element.innerHTML = "<source src=\"#{@options.basePath}/#{src}\" />"
    @element.pause() if @element.pause
    @element.load()

  play: ->
    @element.play()

  pause: ->
    @element.pause()

  seek: (seekTo) ->
    return if @currentTime is seekTo

    @seeking = true
    @currentTime = seekTo
    @element.currentTime = seekTo

  setLoop: (looped) ->
    @looped = looped
    if looped
      @element.setAttribute "loop", "loop"
    else
      @element.removeAttribute "loop"


  setVolume: (volume) ->
    @volume = volume
    @element.volume = volume

  setMute: (muted) ->
    @muted = muted
    @element.volume = if muted then 0 else volume

  fadeVolume: (options) ->
    self = this

    @fadeVolumeInterval = -1 if @fadeVolumeInterval is null

    defaults =
      to       : 1
      duration : 0.5
      rate     : 30
      callback : null
      from     : null
      index    : null

    options ?= {}
    for key of defaults
      options[key] = defaults[key] if typeof options[key] is 'undefined'


    stopFade = (context) ->
      clearInterval @fadeVolumeInterval
      @fadeVolumeInterval = null
      options.callback.call context if typeof options.callback is "function"


    steps = Math.floor options.rate * options.duration
    if @paused
      @setVolume 0
      stopFade false
      return

    if typeof options.from isnt 'undefined' and options.from isnt null
      @setVolume options.from
    else
      options.from = @volume

    options.to = Math.max(0, Math.min(1, options.to))
    fadeIncrement = (options.to - options.from) / steps
    fadeStep = ->
      if (Math.abs(self.volume - options.to) < Math.abs(fadeIncrement))
        self.setVolume options.to
        stopFade self
        return

      self.setVolume self.volume + fadeIncrement

    clearInterval @fadeVolumeInterval
    @fadeVolumeInterval = setInterval(fadeStep, Math.round(1000 / options.rate))

  show: ->
    @element.style.display = 'block'

  hide: ->
    @element.style.display = 'none'

