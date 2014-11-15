window.onload = function() {
  return loadJSON('/library.json', function(data) {
    var mc, uriState;
    uriState = parseURIFragment();
    mc = new MusiClock({
      data: data,
      repeat: true,
      controls: '.global nav.controls'
    });
    if (uriState) {
      mc.update(uriState);
    }
    return window.mc = mc;
  });
};
