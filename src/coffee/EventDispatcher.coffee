class EventDispatcher
  constructor: ->
    @listeners = {}

  addEventListener: (eventName, listener) ->
    @listeners[eventName] ?= []
    @listeners[eventName].push listener

  removeEventListener: (eventName, listener) ->
    if @listeners.hasOwnProperty eventName
      if listener is 'all'
        @listeners[eventName] = []
      else
        for registeredListener, i in @listeners[eventName]
          if registeredListener is listener
            @listeners[eventName].splice i--, 1

  dispatchEvent: (eventName, data) ->
    if @listeners.hasOwnProperty eventName
      for listener in @.listeners[eventName]
        listener.apply @, [{type:eventName,data:data}] if typeof listener is 'function'
