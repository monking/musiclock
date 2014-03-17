window.onYouTubePlayerReady = function(playerId) {
  return console.log(playerId);
};

window.onload = function() {
  return loadJSON('/library.json', function(data) {
    var mc;
    mc = new MusiClock({
      data: data,
      repeat: true,
      controls: '.global nav.controls'
    });
    return window.mc = mc;
  });
};
