var EventDispatcher;

EventDispatcher = (function() {
  function EventDispatcher() {
    this.listeners = {};
  }

  EventDispatcher.prototype.addEventListener = function(eventName, listener) {
    var _base;
    if ((_base = this.listeners)[eventName] == null) {
      _base[eventName] = [];
    }
    return this.listeners[eventName].push(listener);
  };

  EventDispatcher.prototype.removeEventListener = function(eventName, listener) {
    var i, registeredListener, _i, _len, _ref, _results;
    if (this.listeners.hasOwnProperty(eventName)) {
      if (listener === 'all') {
        return this.listeners[eventName] = [];
      } else {
        _ref = this.listeners[eventName];
        _results = [];
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          registeredListener = _ref[i];
          if (registeredListener === listener) {
            _results.push(this.listeners[eventName].splice(i--, 1));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    }
  };

  EventDispatcher.prototype.dispatchEvent = function(eventName, data) {
    var listener, _i, _len, _ref, _results;
    if (this.listeners.hasOwnProperty(eventName)) {
      _ref = this.listeners[eventName];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        listener = _ref[_i];
        if (typeof listener === 'function') {
          _results.push(listener.apply(this, [
            {
              type: eventName,
              data: data
            }
          ]));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  return EventDispatcher;

})();
