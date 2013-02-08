/*
 * YTPlayer
 * A YouTube Player interface
 */
;var YTPlayer = function(options) {
	this.init(options);
};
YTPlayer.prototype = new Player();
YTPlayer.constructor = YTPlayer;
Player.prototype.defaults = {
	id: null,
	replace: null,
	container: null
};
YTPlayer.prototype.setElement = function(element) {
	this.element = element;
	if (!element) return;

	this.attachHandlers();
	this.duration = element.getDuration();
	this.dispatchEvent('canplay');
};
YTPlayer.prototype.attachHandlers = function() {
	var $this = this;
	var stateHandlerName = this.options.id + 'StateHandler';
	window[stateHandlerName] = function(state) {
		switch(state) {
			case -1:
				break;
			case 0:
				$this.paused = true;
				$this.dispatchEvent('ended');
				break;
			case 1:
				$this.paused = false;
				$this.dispatchEvent('play');
				break;
			case 2:
				$this.paused = true;
				$this.dispatchEvent('pause');
				break;
			case 3:
				break;
			case 5:
				break;
		}
	};
	this.element.addEventListener('onStateChange', stateHandlerName);
	this.currentTimeInterval = setInterval(function() {
		$this.currentTime = $this.element.getCurrentTime();
		$this.volume = $this.element.getVolume() / 100;
	}, 1000);
};
YTPlayer.prototype.load = function(src) {
	if (this.element) {
		this.element.loadVideoById({'videoId': src, 'startSeconds': 0, 'suggestedQuality': 'large'});
	} else {
		var params = { allowScriptAccess: "always" };
		var atts = { id: this.options.id };
		swfobject.embedSWF("http://www.youtube.com/v/" + src + "?enablejsapi=1&playerapiid=" + this.options.id + "&version=3&autoplay=1",
			this.options.replace, "425", "350", "8", null, null, params, atts);
		return;
	}
	// FIXME: carry MusiClock.state.time into startSeconds
};
YTPlayer.prototype.play = function() {
	this.element.playVideo();
};
YTPlayer.prototype.pause = function() {
	this.element.pauseVideo();
};
YTPlayer.prototype.seek = function(seekTo) {
	if (this.currentTime === seekTo) return;
	this.currentTime = seekTo;
	this.element.seekTo(seekTo);
};
YTPlayer.prototype.setLoop = function(looped) {
	this.looped = looped;
	this.element.setLoop(looped);
};
YTPlayer.prototype.setVolume = function(volume) {
	this.volume = volume;
	if (this.element)
		this.element.setVolume(volume * 100);
};
YTPlayer.prototype.show = function() {
	toggleClass(
		document.getElementById(this.options.container),
		'hidden',
		false
	);
};
YTPlayer.prototype.hide = function() {
	toggleClass(
		document.getElementById(this.options.container),
		'hidden',
		true
	);
};