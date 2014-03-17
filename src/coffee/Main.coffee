window.onYouTubePlayerReady = (playerId) ->
  console.log playerId
window.onload = ->
  loadJSON '/library.json', (data) ->
    mc = new MusiClock
      data : data
      repeat  : true
      controls: '.global nav.controls'
    window.mc = mc
