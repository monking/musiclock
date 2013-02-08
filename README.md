MusiClock
=========

A music player with timed playlists. Supports HTML5-playable audio and YouTube videos.

Features
--------

- playlists assigned to a time of day, grouped by category ("mood")
- HTML5-playable tracks from any source
- YouTube video support
- cross-fading upon skipping or switching playlists

Installation
------------

Copy `playlist.example.json` to `playlist.json`, and populate it with
your own music. For audio files, create the `/audio` directory and place your files at
whatever depth in this directory. For YouTube videos, enter only the video ID (the bit
after "http://www.youtube.com/watch?v=" in the video URL).

Example:
```
{
  "working out":{
    "0800":[
      "workout_mix/track_01.mp3",
      "workout_mix/track_02.mp3"
    ],
    "0815":[
      "workout_mix/final_push.mp3"
    ]
  },
  "at work":{
    "0900":["wxd56GLRxa0"],
    "1000":["Wdvh7PLW0G0"],
    "1100":["X0FFrjTeWr0"],
    "1200":["_1YpXECC7MY"],
    "1300":["OvhAeNNG-RQ"],
    "1400":["uuduck3SJo8"],
    "1500":["aGUzuX6cJvc"],
    "1600":["uOsads28JTg"],
    "1700":["Wqu5UfBFUW8"],
    "1800":["FtPwnwHmS9I"],
    "1900":["6c7Kgf0d2qk"]
  }
}
```

Credit
------

This project was inspired by the realtime Animal Crossing playlist at http://tane.us/ac/
