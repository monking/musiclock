/*
 * EventDispatcher
 */
;var EventDispatcher = function() { }
EventDispatcher.prototype = {
    listeners:{},
	addEventListener:function(eventName, listener){
		if (!this.listeners.hasOwnProperty(eventName))
			this.listeners[eventName] = [];
		this.listeners[eventName].push(listener);
	},
	removeEventListener:function(eventName, listener){
		if (this.listeners.hasOwnProperty(eventName)) {
			if (listener == 'all') {
				this.listeners[eventName] = [];
			} else {
				for (var i = 0; i < this.listeners[eventName].length; i++)
				{
					if (this.listeners[eventName][i] === listener) {
						this.listeners[eventName].splice(i, 1);
					}
				}
			}
		}
	},
	dispatchEvent:function(eventName, data){
		var $this = this;
		if ($this.listeners.hasOwnProperty(eventName)) {
			for (var i = 0; i < $this.listeners[eventName].length; i++)
			{
				if (typeof $this.listeners[eventName][i] === 'function') {
					$this.listeners[eventName][i].apply($this, [data]);;
				}
			}
		}
	}
};