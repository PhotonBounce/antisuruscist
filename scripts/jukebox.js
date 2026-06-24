/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — JUKEBOX (Desktop)
   Replaces synthesized music with MP3 tracks from jukeboxaudios/
   Loaded AFTER main.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var TRACKS = [
    { file: 'track01-when-occupant-dies.mp3',    name: 'When Occupant Dies' },
    { file: 'track02-when-occupant-dies-v2.mp3',  name: 'When Occupant Dies v2' },
    { file: 'track03-when-occupant-dies-v3.mp3',  name: 'When Occupant Dies v3' },
    { file: 'track04-when-occupant-dies-v4.mp3',  name: 'When Occupant Dies v4' },
    { file: 'track05-when-occupant-dies-v5.mp3',  name: 'When Occupant Dies v5' },
    { file: 'track06-when-occupant-dies-v6.mp3',  name: 'When Occupant Dies v6' },
    { file: 'track07-sunflowers.mp3',             name: 'Sunflowers' },
    { file: 'track08-sunflowers-v2.mp3',          name: 'Sunflowers v2' },
    { file: 'track09-putin-khuilo.mp3',            name: 'Putin Khuilo' }
  ];
  // Prefix with ARC_BASE (set by main.js) so the path resolves to the shared
  // asset root whether served from / (desktop) or /mobile/ (mobile). '' on desktop.
  var BASE = (window.ARC_BASE || '') + 'sounds/music/jukeboxaudios/';
  var audio = null;
  var current = -1;
  var playing = false;
  var starting = false;
  var playToken = 0;
  var volume = parseFloat(localStorage.getItem('arc_music_vol') || '0.38');

  function stopSynth() {
    if (window.ARC_GAME) {
      if (typeof window.ARC_GAME.stopMusic === 'function') window.ARC_GAME.stopMusic();
      if (window.ARC_GAME._musicGain) {
        try { window.ARC_GAME._musicGain.gain.setValueAtTime(0, window.ARC_GAME._musicGain.context.currentTime); } catch (e) {}
      }
    }
  }

  function playTrack(idx) {
    if (idx < 0 || idx >= TRACKS.length) idx = 0;
    current = idx;
    playToken += 1;
    var token = playToken;
    starting = true;
    window._arcMusicOverride = true;
    stopSynth();

    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.addEventListener('ended', function () { playTrack((current + 1) % TRACKS.length); });
      audio.addEventListener('error', function () {
        console.error('[JUKEBOX] Failed to load: ' + BASE + (TRACKS[current] ? TRACKS[current].file : '?') + ' — check the file exists on your server at that path');
        setTimeout(function () { playTrack((current + 1) % TRACKS.length); }, 500);
      });
    }
    if (audio && !audio.paused) audio.pause();
    audio.src = BASE + TRACKS[idx].file;
    audio.volume = volume;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(function () {
        if (token !== playToken) return;
        playing = true;
        starting = false;
      }).catch(function (err) {
        if (token !== playToken) return;
        starting = false;
        // Autoplay blocked — wait for ANY user click then retry
        if (err.name === 'NotAllowedError') {
          console.warn('[JUKEBOX] Autoplay blocked — waiting for user gesture to play track:', TRACKS[idx].name);
          var _resumeOnce = function () {
            document.removeEventListener('click', _resumeOnce, true);
            document.removeEventListener('touchstart', _resumeOnce, true);
            if (!playing) playTrack(idx);
          };
          document.addEventListener('click', _resumeOnce, true);
          document.addEventListener('touchstart', _resumeOnce, true);
        } else {
          console.error('[JUKEBOX] Play error for ' + TRACKS[idx].file + ':', err.message || err);
          playing = false;
        }
      });
    }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume;
    localStorage.setItem('arc_music_vol', volume.toFixed(2));
  }

  // Jukebox is the DEFAULT music — override synth from the start
  window._arcMusicOverride = true;

  $(function () {
    setTimeout(function () {
      if (!window.ARC_GAME) return;

      // Sync with settings music slider
      $(document).on('input', '#set-mus-slider', function () {
        setVolume(parseInt(this.value, 10) / 100);
      });
    }, 1500);
  });

  // Expose for external use
  window.ARC_JUKEBOX = {
    play: playTrack,
    next: function () { playTrack((current + 1) % TRACKS.length); },
    prev: function () { playTrack(current <= 0 ? TRACKS.length - 1 : current - 1); },
    toggle: function () {
      if (!audio || current < 0) { playTrack(Math.floor(Math.random() * TRACKS.length)); return; }
      if (playing) { audio.pause(); playing = false; } else { audio.play().catch(function () {}); playing = true; }
    },
    setVolume: setVolume,
    pause: function () { if (audio && playing) { audio.pause(); playing = false; } },
    resume: function () { if (audio && !playing) { audio.play().catch(function () {}); playing = true; } },
    isPlaying: function () { return playing; },
    isStarting: function () { return starting; },
    currentTrack: function () { return current >= 0 ? TRACKS[current] : null; },
    tracks: TRACKS
  };

  // Pause music when tab hidden, resume when visible
  var _wasPlayingBeforeHide = false;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      _wasPlayingBeforeHide = playing;
      if (playing && audio) { audio.pause(); playing = false; }
    } else {
      if (_wasPlayingBeforeHide && audio) { audio.play().catch(function () {}); playing = true; }
    }
  });

})();
