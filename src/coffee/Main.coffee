window.onload = ->
  loadJSON '/library.json', (data) ->

    uriState = parseURIFragment()

    mc = new MusiClock
      data : data
      repeat  : true
      controls: '.global nav.controls'

    if uriState then mc.update uriState

    window.mc = mc
