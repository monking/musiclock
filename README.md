MusiClock
=========

A music player with timed playlists. Supports HTML5-playable audio and YouTube
videos.

Features
--------

- playlists with fluid rules defining which tracks play at what times of day.
- HTML5-playable tracks from any source
- YouTube video support
- cross-fading upon skipping or switching playlists

Installation
------------

Copy `library.example.json` to `library.json`, and populate it with your own
music. For audio files, create the `/audio` directory and place your files at
whatever depth in this directory. For YouTube videos, enter only the video ID
(the bit after "http://www.youtube.com/watch?v=" in the video URL).

Library
-------

Tracks in the library have the following attributes:

- **src**: the path or identifier of the track. Relative paths are assumed to
  be in the `/audio` directory, and values which don't have a file extension
  are assumed to be a YouTube video ID.
- **title**: (optional) Track title
- **album**: (optional) Album title
- **artist**: (optional) Artist name
- **ab**: (optional) Times in seconds for the start and end of a loop. If a the
  player is set to repeat one song, or if a playlist only contains one song,
  the song plays from the beginning, and when the second time (**b**) is
  reached, the player skips to the first time (**a**).
- **rating**: (optional) A numeric rating from **1** to **5**

Rules
-----

Rules determine whether a track will be allowed to play at a given time. Tracks
without rules are treated as if they always have an active **regular** rule.

###Format:

```json
    "rules":"<priority (optional)>{<start time>-<end time>} ..."
```

e.g. `"rules":"{08:00-05:00} +{18:00-18:30}"`

Each rule string can contain multiple rule definitions. Time periods are
`<start time>` inclusive, `<end time>` exclusive. Rules which span midnight
will behave as expected (e.g. `{23:00-01:00}` will be in the playlist for two
hours).

###Priorities:
- **Regular**: With no priority given, a rule is **regular**, and can be
  overridden.
- **`+` Exclusive**: if any tracks have an active **exclusive** rule, any
  tracks with active **regular** rules will be _deactivated_.
- **`-` Negative**: behaves just as a **regular** rule defining the opposite
  hour span.  
  e.g. `{09:00-18:00}` and `-{18:00-09:00}` are equivalient.  

**Negative** rules trump **regular** rules, and **exclusive** rules trump both
others.

Credit
------

This project was inspired by the realtime Animal Crossing playlist at
[http://tane.us/ac/](http://tane.us/ac/), which I found by its mention in an
[interview with animator Mariel
Cartwright](http://www.youtube.com/watch?v=WCQuwwbVyVE).
