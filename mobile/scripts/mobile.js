/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — MOBILE TOUCH LAYER v2
   3-zone layout · drawer · jukebox · loaded AFTER main.js
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Guard: touch devices only ────────────────────────────────────────── */
  var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice && !/forcemobile/.test(location.search)) return;

  var $canves = $('#canves');
  var canvesEl = $canves[0];
  if (!canvesEl) return;

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 0 — Language / i18n
     ════════════════════════════════════════════════════════════════════════ */
  var STRINGS = {
    en: {
      startBtn:          'Kill Ruscists Now!',
      gameOver:          'Game <div>Over</div>',
      youWon:            'You <div>Won</div>',
      tapRestart:        'Tap Here to Restart',
      newGame:           '🔄 NEW GAME',
      paused:            'Paused',
      rotateLandscape:   'Rotate your device to landscape mode',
      requiresLandscape: 'This game requires landscape orientation',
      fire:              'FIRE',
      rld:               'RLD',
      pause:             'Pause',
      armory:            'Armory',
      godMode:           'God Mode',
      artillery:         'Artillery',
      drones:            'Drones',
      himars:            'HIMARS',
      bradley:           'Bradley',
      rover:             'Rover',
      fireDrone:         'Fire Drone',
      fpvStrike:         'FPV Strike',
      music:             'Music',
      sfx:               'SFX',
      settings:          'Settings',
      wave:              'Wave',
      jukebox:           'JUKEBOX'
    },
    ua: {
      startBtn:          'Вбий рашистів зараз!',
      gameOver:          'Гру <div>закінчено</div>',
      youWon:            'Ти <div>переміг</div>',
      tapRestart:        'Натисни щоб перезапустити',
      newGame:           '🔄 НОВА ГРА',
      paused:            'Пауза',
      rotateLandscape:   'Поверніть пристрій горизонтально',
      requiresLandscape: 'Ця гра потребує альбомну орієнтацію',
      fire:              'ВОГОНЬ',
      rld:               'ПЗР',
      pause:             'Пауза',
      armory:            'Арсенал',
      godMode:           'Бог-режим',
      artillery:         'Артилерія',
      drones:            'Дрони',
      himars:            'HIMARS',
      bradley:           'Bradley',
      rover:             'Rover',
      fireDrone:         'Вогн. дрон',
      fpvStrike:         'FPV удар',
      music:             'Музика',
      sfx:               'Звуки',
      settings:          'Налаштування',
      wave:              'Хвиля',
      jukebox:           'МУЗИЧНИЙ АВТОМАТ'
    },
    de: {
      startBtn:'Töte Ruschisten jetzt!',gameOver:'Spiel <div>vorbei</div>',youWon:'Du hast <div>gewonnen</div>',
      tapRestart:'Tippe zum Neustart',newGame:'🔄 NEUES SPIEL',paused:'Pausiert',
      rotateLandscape:'Gerät ins Querformat drehen',requiresLandscape:'Querformat erforderlich',
      fire:'FEUER',rld:'NAL',pause:'Pause',armory:'Arsenal',godMode:'Gott-Modus',
      artillery:'Artillerie',drones:'Drohnen',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Feuerdrohne',fpvStrike:'FPV Angriff',music:'Musik',sfx:'SFX',settings:'Einstellungen',
      wave:'Welle',jukebox:'JUKEBOX'
    },
    fr: {
      startBtn:'Tuez les ruscistes!',gameOver:'Jeu <div>terminé</div>',youWon:'Vous avez <div>gagné</div>',
      tapRestart:'Appuyez pour recommencer',newGame:'🔄 NOUVEAU JEU',paused:'Pause',
      rotateLandscape:'Tournez en mode paysage',requiresLandscape:'Mode paysage requis',
      fire:'FEU',rld:'RCH',pause:'Pause',armory:'Armurerie',godMode:'Mode Dieu',
      artillery:'Artillerie',drones:'Drones',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Drone incendiaire',fpvStrike:'Frappe FPV',music:'Musique',sfx:'SFX',settings:'Paramètres',
      wave:'Vague',jukebox:'JUKEBOX'
    },
    es: {
      startBtn:'¡Mata ruscistas ahora!',gameOver:'Juego <div>terminado</div>',youWon:'Has <div>ganado</div>',
      tapRestart:'Toca para reiniciar',newGame:'🔄 NUEVO JUEGO',paused:'Pausado',
      rotateLandscape:'Gira a modo horizontal',requiresLandscape:'Requiere modo horizontal',
      fire:'FUEGO',rld:'RCG',pause:'Pausa',armory:'Armería',godMode:'Modo Dios',
      artillery:'Artillería',drones:'Drones',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Dron de fuego',fpvStrike:'Ataque FPV',music:'Música',sfx:'SFX',settings:'Ajustes',
      wave:'Oleada',jukebox:'JUKEBOX'
    },
    pl: {
      startBtn:'Zabij rusistów teraz!',gameOver:'Koniec <div>gry</div>',youWon:'Wygrałeś<div>!</div>',
      tapRestart:'Dotknij aby zrestartować',newGame:'🔄 NOWA GRA',paused:'Pauza',
      rotateLandscape:'Obróć urządzenie poziomo',requiresLandscape:'Wymagana orientacja pozioma',
      fire:'OGIEŃ',rld:'PRŁ',pause:'Pauza',armory:'Zbrojownia',godMode:'Tryb Boga',
      artillery:'Artyleria',drones:'Drony',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Dron ogniowy',fpvStrike:'Atak FPV',music:'Muzyka',sfx:'SFX',settings:'Ustawienia',
      wave:'Fala',jukebox:'JUKEBOX'
    },
    pt: {
      startBtn:'Mate os ruscistas agora!',gameOver:'Fim de <div>jogo</div>',youWon:'Você <div>venceu</div>',
      tapRestart:'Toque para reiniciar',newGame:'🔄 NOVO JOGO',paused:'Pausado',
      rotateLandscape:'Gire para modo paisagem',requiresLandscape:'Requer modo paisagem',
      fire:'FOGO',rld:'RCG',pause:'Pausa',armory:'Arsenal',godMode:'Modo Deus',
      artillery:'Artilharia',drones:'Drones',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Drone de fogo',fpvStrike:'Ataque FPV',music:'Música',sfx:'SFX',settings:'Configurações',
      wave:'Onda',jukebox:'JUKEBOX'
    },
    it: {
      startBtn:'Uccidi i ruscisti ora!',gameOver:'Gioco <div>finito</div>',youWon:'Hai <div>vinto</div>',
      tapRestart:'Tocca per ricominciare',newGame:'🔄 NUOVO GIOCO',paused:'In pausa',
      rotateLandscape:'Ruota in modalità orizzontale',requiresLandscape:'Richiede orientamento orizzontale',
      fire:'FUOCO',rld:'RIC',pause:'Pausa',armory:'Armeria',godMode:'Modalità Dio',
      artillery:'Artiglieria',drones:'Droni',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Drone incendiario',fpvStrike:'Attacco FPV',music:'Musica',sfx:'SFX',settings:'Impostazioni',
      wave:'Ondata',jukebox:'JUKEBOX'
    },
    nl: {
      startBtn:'Dood de ruschisten nu!',gameOver:'Spel <div>voorbij</div>',youWon:'Je hebt <div>gewonnen</div>',
      tapRestart:'Tik om opnieuw te starten',newGame:'🔄 NIEUW SPEL',paused:'Gepauzeerd',
      rotateLandscape:'Draai naar liggend formaat',requiresLandscape:'Liggend formaat vereist',
      fire:'VUUR',rld:'HRL',pause:'Pauze',armory:'Arsenaal',godMode:'God-modus',
      artillery:'Artillerie',drones:'Drones',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Vuurdrone',fpvStrike:'FPV Aanval',music:'Muziek',sfx:'SFX',settings:'Instellingen',
      wave:'Golf',jukebox:'JUKEBOX'
    },
    cs: {
      startBtn:'Zabij rušisty teď!',gameOver:'Konec <div>hry</div>',youWon:'Vyhrál jsi<div>!</div>',
      tapRestart:'Klepni pro restart',newGame:'🔄 NOVÁ HRA',paused:'Pozastaveno',
      rotateLandscape:'Otočte zařízení na šířku',requiresLandscape:'Vyžaduje orientaci na šířku',
      fire:'PAL',rld:'NAB',pause:'Pauza',armory:'Zbrojnice',godMode:'Režim Boha',
      artillery:'Dělostřelectvo',drones:'Drony',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Ohnivý dron',fpvStrike:'FPV úder',music:'Hudba',sfx:'SFX',settings:'Nastavení',
      wave:'Vlna',jukebox:'JUKEBOX'
    },
    ja: {
      startBtn:'ルシストを倒せ！',gameOver:'ゲーム<div>オーバー</div>',youWon:'<div>勝利！</div>',
      tapRestart:'タップしてリスタート',newGame:'🔄 ニューゲーム',paused:'一時停止',
      rotateLandscape:'横向きに回転してください',requiresLandscape:'横向きが必要です',
      fire:'発射',rld:'装填',pause:'一時停止',armory:'武器庫',godMode:'ゴッドモード',
      artillery:'砲撃',drones:'ドローン',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'火炎ドローン',fpvStrike:'FPV攻撃',music:'音楽',sfx:'効果音',settings:'設定',
      wave:'ウェーブ',jukebox:'ジュークボックス'
    },
    ko: {
      startBtn:'루시스트를 죽여라!',gameOver:'게임 <div>오버</div>',youWon:'<div>승리!</div>',
      tapRestart:'탭하여 재시작',newGame:'🔄 새 게임',paused:'일시정지',
      rotateLandscape:'가로 모드로 회전하세요',requiresLandscape:'가로 모드 필요',
      fire:'발사',rld:'장전',pause:'일시정지',armory:'무기고',godMode:'갓 모드',
      artillery:'포격',drones:'드론',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'화염 드론',fpvStrike:'FPV 공격',music:'음악',sfx:'효과음',settings:'설정',
      wave:'웨이브',jukebox:'주크박스'
    },
    zh: {
      startBtn:'消灭鲁西斯特！',gameOver:'游戏<div>结束</div>',youWon:'你<div>赢了</div>',
      tapRestart:'点击重新开始',newGame:'🔄 新游戏',paused:'已暂停',
      rotateLandscape:'请将设备旋转至横屏',requiresLandscape:'需要横屏模式',
      fire:'开火',rld:'装填',pause:'暂停',armory:'军械库',godMode:'上帝模式',
      artillery:'炮击',drones:'无人机',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'火焰无人机',fpvStrike:'FPV打击',music:'音乐',sfx:'音效',settings:'设置',
      wave:'波次',jukebox:'点唱机'
    },
    tr: {
      startBtn:'Rusçistleri öldür!',gameOver:'Oyun <div>bitti</div>',youWon:'<div>Kazandın!</div>',
      tapRestart:'Yeniden başlamak için dokun',newGame:'🔄 YENİ OYUN',paused:'Duraklatıldı',
      rotateLandscape:'Yatay moda çevirin',requiresLandscape:'Yatay mod gerekli',
      fire:'ATEŞ',rld:'DLD',pause:'Duraklat',armory:'Cephanelik',godMode:'Tanrı Modu',
      artillery:'Topçu',drones:'Dronlar',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Ateş Dronu',fpvStrike:'FPV Saldırı',music:'Müzik',sfx:'SFX',settings:'Ayarlar',
      wave:'Dalga',jukebox:'JUKEBOX'
    },
    sv: {
      startBtn:'Döda ruscisterna nu!',gameOver:'Spelet <div>slut</div>',youWon:'Du <div>vann</div>',
      tapRestart:'Tryck för att starta om',newGame:'🔄 NYTT SPEL',paused:'Pausad',
      rotateLandscape:'Vrid till liggande läge',requiresLandscape:'Kräver liggande läge',
      fire:'ELD',rld:'LAD',pause:'Paus',armory:'Arsenal',godMode:'Gudaläge',
      artillery:'Artilleri',drones:'Drönare',himars:'HIMARS',bradley:'Bradley',rover:'Rover',
      fireDrone:'Branddröner',fpvStrike:'FPV Attack',music:'Musik',sfx:'SFX',settings:'Inställningar',
      wave:'Våg',jukebox:'JUKEBOX'
    }
  };

  var currentLang = localStorage.getItem('arc_lang') || 'en';

  function t(key) { return (STRINGS[currentLang] || STRINGS.en)[key] || STRINGS.en[key] || key; }

  function applyI18n() {
    // data-i18n elements (innerHTML for tags with child <div>)
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val.indexOf('<div>') !== -1) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    // Bottom bar labels
    var fireLbl = document.querySelector('#mob-fire-btn .mob-btn-lbl');
    var rldLbl  = document.querySelector('#mob-reload-btn .mob-btn-lbl');
    if (fireLbl) fireLbl.textContent = t('fire');
    if (rldLbl)  rldLbl.textContent  = t('rld');
    // Drawer labels
    var drwI18n = {
      'drw-pause': 'pause', 'drw-armory': 'armory', 'drw-godmode': 'godMode',
      'drw-arty': 'artillery', 'drw-drones': 'drones', 'drw-himars': 'himars',
      'drw-bradley': 'bradley', 'drw-rover': 'rover', 'drw-firedrone': 'fireDrone',
      'drw-fpv': 'fpvStrike', 'drw-mute-music': 'music', 'drw-mute-sfx': 'sfx',
      'drw-settings': 'settings'
    };
    Object.keys(drwI18n).forEach(function (id) {
      var lbl = document.querySelector('#' + id + ' .drw-lbl');
      if (lbl) lbl.textContent = t(drwI18n[id]);
    });
    // Wave drawer buttons
    for (var w = 1; w <= 4; w++) {
      var wl = document.querySelector('#drw-wave' + w + ' .drw-lbl');
      if (wl) wl.textContent = t('wave') + ' ' + w;
    }
    // Jukebox panel title
    var jbTitle = document.querySelector('.jb-panel-title');
    if (jbTitle) jbTitle.textContent = '🎶 ' + t('jukebox');
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('arc_lang', lang);
    applyI18n();
    // Update picker active state
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
  }

  // Wire language picker buttons
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setLang(btn.getAttribute('data-lang'));
    });
  });

  // Apply saved language on load
  setLang(currentLang);

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 1 — Zoom / Scroll / Bounce Prevention
     ════════════════════════════════════════════════════════════════════════ */
  var scrollAllowed = '#inventory-panel, .sett-overlay, .joke-modal-overlay, .ai-chat-messages, #mob-drawer, #jukebox-panel';

  document.addEventListener('touchmove', function (e) {
    if (e.target.closest(scrollAllowed)) return;
    e.preventDefault();
  }, { passive: false });

  var lastTapTime = 0;
  document.addEventListener('touchend', function (e) {
    // Never suppress taps on interactive controls — preventDefault here
    // cancels the synthesized click, silently eating every second tap on
    // call-in buttons, drawer, pause, lobby cards, etc.
    if (e.target.closest('button, [role="button"], a, input, select, .ci-btn, .lvl-btn')) { lastTapTime = Date.now(); return; }
    var now = Date.now();
    if (now - lastTapTime < 300) e.preventDefault();
    lastTapTime = now;
  }, { passive: false });

  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 2 — Canvas Touch-to-Aim
     ════════════════════════════════════════════════════════════════════════ */
  var touchX = 512, touchY = 275;

  function canvasCoords(touch) {
    var rect = canvesEl.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (1024 / rect.width),
      y: (touch.clientY - rect.top) * (550 / rect.height)
    };
  }

  function updateCrosshair(x, y) {
    var chx = document.getElementById('game-crosshair');
    if (chx) { chx.style.left = x + 'px'; chx.style.top = y + 'px'; }
  }

  function sendMouseMove(clientX, clientY) {
    canvesEl.dispatchEvent(new MouseEvent('mousemove', {
      clientX: clientX, clientY: clientY, bubbles: true
    }));
  }

  var uiElements = 'button, [role="button"], #pause-game, .hud-ctrl-btn, #inventory-panel, .overlay-screen, #weapon-switcher, #mob-topbar, #mob-bottombar, #mob-drawer, #jukebox-mini, #jukebox-panel, .game-cover, .restart-game-btn, .restart-hint, #ai-advisor';

  canvesEl.addEventListener('touchstart', function (e) {
    if (e.target.closest(uiElements)) return;
    // targetTouches: only touches on the canvas — e.touches[0] is the first
    // touch on the PAGE, so holding FIRE (finger 1 on the bottom bar) made
    // aim-taps read the fire button's coordinates instead of the battlefield.
    var t = e.targetTouches[0] || e.touches[0];
    var c = canvasCoords(t);
    touchX = c.x; touchY = c.y;
    updateCrosshair(touchX, touchY);
    sendMouseMove(t.clientX, t.clientY);
  }, { passive: true });

  canvesEl.addEventListener('touchmove', function (e) {
    if (e.target.closest(scrollAllowed)) return;
    var t = e.targetTouches[0] || e.touches[0];
    var c = canvasCoords(t);
    touchX = c.x; touchY = c.y;
    updateCrosshair(touchX, touchY);
    sendMouseMove(t.clientX, t.clientY);
  }, { passive: true });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 3 — Bottom Bar: FIRE + RELOAD + Weapon Nav
     ════════════════════════════════════════════════════════════════════════ */
  var fireBtn = document.getElementById('mob-fire-btn');
  var reloadBtn = document.getElementById('mob-reload-btn');
  var wpnPrev = document.getElementById('mbb-wpn-prev');
  var wpnNext = document.getElementById('mbb-wpn-next');
  var autoFireInterval = null;

  function doFire() {
    var rect = canvesEl.getBoundingClientRect();
    var cx = rect.left + (touchX / 1024) * rect.width;
    var cy = rect.top + (touchY / 550) * rect.height;
    canvesEl.dispatchEvent(new MouseEvent('click', {
      clientX: cx, clientY: cy, bubbles: true
    }));
  }

  function doMouseDown() {
    var rect = canvesEl.getBoundingClientRect();
    var cx = rect.left + (touchX / 1024) * rect.width;
    var cy = rect.top + (touchY / 550) * rect.height;
    canvesEl.dispatchEvent(new MouseEvent('mousedown', {
      clientX: cx, clientY: cy, button: 0, bubbles: true
    }));
  }

  function doMouseUp() {
    $(document).trigger(new $.Event('mouseup', { which: 1 }));
  }

  function startAutoFire() {
    if (autoFireInterval) return;
    // First trigger mousedown to engage the game's auto-fire for auto weapons
    doMouseDown();
    doFire();
    autoFireInterval = setInterval(doFire, 120);
  }

  function stopAutoFire() {
    if (autoFireInterval) { clearInterval(autoFireInterval); autoFireInterval = null; }
    doMouseUp();
  }

  if (fireBtn) {
    fireBtn.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation();
      startAutoFire();
      haptic(12);
    }, { passive: false });
    fireBtn.addEventListener('touchend', function (e) {
      e.preventDefault(); e.stopPropagation();
      stopAutoFire();
    }, { passive: false });
    fireBtn.addEventListener('touchcancel', stopAutoFire, { passive: true });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation();
      // Single trigger only — firing both #reload-fab AND the center prompt
      // ran reload() twice, burning two spare magazines per tap.
      $('#reload-fab').trigger('click');
      haptic(8);
    }, { passive: false });
  }

  function cycleWeapon(dir) {
    var delta = dir > 0 ? 120 : -120;
    canvesEl.dispatchEvent(new WheelEvent('wheel', { deltaY: delta, bubbles: true, cancelable: true }));
    setTimeout(syncBottomBar, 80);
  }

  if (wpnPrev) {
    wpnPrev.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); cycleWeapon(-1); }, { passive: false });
  }
  if (wpnNext) {
    wpnNext.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); cycleWeapon(1); }, { passive: false });
  }

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 4 — HUD Sync (top bar + bottom bar)
     ════════════════════════════════════════════════════════════════════════ */
  function syncTopBar() {
    var $w = $('#hud-wave-val'), $k = $('#hud-kills-val'), $f = $('#credits-val'), $s = $('#score-val');
    $('#mt-wave').text($w.text() || '01');
    $('#mt-kills').text($k.text() || '0');
    $('#mt-funds').text($f.text() || '0');
    $('#mt-score').text($s.text() || '0');
  }

  function syncBottomBar() {
    // Weapon + ammo from crosshair labels
    var wpn = $('#chx-weapon').text() || 'REVOLVER';
    var ammo = $('#chx-ammo').text() || '6 / 6';
    var reserve = $('#ammo-reserve-hud').text() || '';
    $('#mbb-wpn-name').text(wpn);
    $('#mbb-wpn-ammo').text(ammo);
    $('#mbb-wpn-reserve').text(reserve ? '×' + reserve : '');
    // Weapon icon from switcher active glyph
    var WPN_ICONS = {revolver:'🔫',shotgun:'🔫',m16:'🔫',lmg:'🔫',clay:'💩',gl:'💣',sniper:'🎯',ftdrone:'🔥',tank_cannon:'🚛',bradley:'🚛',stugna:'🚀',drone_bomb:'💣',panzerfaust:'🚀',pkm:'🔫',ak12:'🔫',matador:'🚀',nlaw:'🚀',laser:'⚡'};
    var wKey = ($('#weapon-switcher .ws-icon-active').data('w') || 'revolver').toString();
    $('#mbb-wpn-icon').text(WPN_ICONS[wKey] || '🔫');

    // Ammo warning
    var parts = ammo.split('/');
    var cur = parseInt(parts[0]) || 0;
    var max = parseInt(parts[1]) || 1;
    if (cur <= Math.ceil(max * 0.2) && cur > 0) {
      $('#mbb-wpn-ammo').addClass('low');
    } else {
      $('#mbb-wpn-ammo').removeClass('low');
    }

    // HP from shooter-hud
    var hpText = $('#shooter-hp-label').text() || '100%';
    var hpVal = parseInt(hpText) || 100;
    $('#mbb-hp-pct').text(hpVal);
    var $fill = $('#mbb-hp-fill');
    $fill.css('width', hpVal + '%');
    $fill.removeClass('medium low');
    if (hpVal <= 25) $fill.addClass('low');
    else if (hpVal <= 50) $fill.addClass('medium');
  }

  // Poll every 200ms for HUD updates (guarded — skip when game not active)
  var _hudPollId = setInterval(function () {
    var G = window.ARC_GAME;
    if (!G || !G.gameActive) return;
    syncTopBar(); syncBottomBar();
  }, 200);

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 5 — Burger Menu Drawer
     ════════════════════════════════════════════════════════════════════════ */
  var menuBtn = document.getElementById('mob-menu-btn');
  var drawer = document.getElementById('mob-drawer');

  function toggleDrawer() {
    if (!drawer || !menuBtn) return;
    var isOpen = drawer.classList.toggle('open');
    menuBtn.classList.toggle('open', isOpen);
    // Close jukebox panel if opening drawer
    if (isOpen) document.getElementById('jukebox-panel').classList.remove('open');
  }

  if (menuBtn) menuBtn.addEventListener('click', toggleDrawer);

  // Close drawer on outside tap
  document.addEventListener('touchstart', function (e) {
    if (!drawer || !menuBtn) return;
    if (!drawer.classList.contains('open')) return;
    if (e.target.closest('#mob-drawer, #mob-menu-btn')) return;
    drawer.classList.remove('open');
    menuBtn.classList.remove('open');
  }, { passive: true });

  // Wire drawer buttons to their desktop equivalents
  var drawerMap = {
    'drw-pause':     function () { $('#pause-game').trigger('click'); },
    'drw-armory':    function () { openGameSection('armory'); },
    'drw-skills':    function () { openGameSection('skills'); },
    'drw-godmode':   function () { $('#god-mode').trigger('click'); },
    'drw-fullscreen': function () { toggleFullscreen(); },
    'drw-arty':      function () { $('#callin-arty').trigger('click'); },
    'drw-drones':    function () { $('#callin-drones').trigger('click'); },
    'drw-himars':    function () { $('#callin-himars').trigger('click'); },
    'drw-bradley':   function () { $('#callin-bradley').trigger('click'); },
    'drw-rover':     function () { $('#callin-rover').trigger('click'); },
    'drw-firedrone':  function () { $('#callin-firedrone').trigger('click'); },
    'drw-fpv':       function () { $('#callin-fpv').trigger('click'); },
    'drw-mute-music': function () { $('#mute-music').trigger('click'); },
    'drw-mute-sfx':  function () { $('#mute-sounds').trigger('click'); },
    'drw-settings':  function () { $('#settings-btn').trigger('click'); },
    'drw-wave1':     function () { $('.lvl-btn[data-wave="1"]').trigger('click'); },
    'drw-wave2':     function () { $('.lvl-btn[data-wave="2"]').trigger('click'); },
    'drw-wave3':     function () { $('.lvl-btn[data-wave="3"]').trigger('click'); },
    'drw-wave4':     function () { $('.lvl-btn[data-wave="4"]').trigger('click'); }
  };

  Object.keys(drawerMap).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function () {
        drawerMap[id]();
        // Close drawer after action (except settings which opens a modal)
        if (id !== 'drw-settings') {
          drawer.classList.remove('open');
          menuBtn.classList.remove('open');
        }
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 6 — Jukebox Player
     ════════════════════════════════════════════════════════════════════════ */
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
  var TRACK_BASE = '../sounds/music/jukeboxaudios/';
  var jbAudio = null;
  var jbCurrentTrack = -1;
  var jbPlaying = false;
  var jbVolume = parseFloat(localStorage.getItem('arc_music_vol') || '0.38');

  var jbPlayBtn = document.getElementById('mjb-play');
  var jbPrevBtn = document.getElementById('mjb-prev');
  var jbNextBtn = document.getElementById('mjb-next');
  var jbTrackName = document.getElementById('jb-track-name');
  var jbListToggle = document.getElementById('jb-list-toggle');
  var jbPanel = document.getElementById('jukebox-panel');
  var jbTrackList = document.getElementById('jb-track-list');
  var jbVolSlider = document.getElementById('jb-vol-slider');

  // Build track list HTML
  function buildTrackList() {
    if (!jbTrackList) return;
    var html = '';
    TRACKS.forEach(function (t, i) {
      html += '<div class="jb-track-item" data-idx="' + i + '">' +
        '<span class="jb-item-num">' + (i + 1) + '</span>' +
        '<span class="jb-item-name">' + t.name + '</span>' +
        '<div class="jb-item-eq"><span class="jb-eq-bar"></span><span class="jb-eq-bar"></span><span class="jb-eq-bar"></span></div>' +
        '</div>';
    });
    jbTrackList.innerHTML = html;

    // Track item clicks
    jbTrackList.querySelectorAll('.jb-track-item').forEach(function (el) {
      el.addEventListener('click', function () {
        jbPlayTrack(parseInt(el.dataset.idx, 10));
      });
    });
  }

  function jbPlayTrack(idx) {
    if (idx < 0 || idx >= TRACKS.length) idx = 0;
    jbCurrentTrack = idx;
    var track = TRACKS[idx];

    // Stop synthesized music if running
    jbStopSynthMusic();

    // Create or reuse audio element
    if (!jbAudio) {
      jbAudio = new Audio();
      jbAudio.addEventListener('ended', function () { jbPlayTrack((jbCurrentTrack + 1) % TRACKS.length); });
      jbAudio.addEventListener('error', function () {
        console.warn('[Jukebox] Error loading track, skipping');
        setTimeout(function () { jbPlayTrack((jbCurrentTrack + 1) % TRACKS.length); }, 500);
      });
    }

    jbAudio.src = TRACK_BASE + track.file;
    jbAudio.volume = jbVolume;
    jbAudio.play().then(function () {
      jbPlaying = true;
      jbUpdateUI();
    }).catch(function (err) {
      console.warn('[Jukebox] Play blocked:', err.message);
      jbPlaying = false;
      jbUpdateUI();
    });

    jbUpdateUI();
  }

  function jbTogglePlay() {
    if (!jbAudio || jbCurrentTrack < 0) {
      // Start from first track (or random)
      jbPlayTrack(Math.floor(Math.random() * TRACKS.length));
      return;
    }
    if (jbPlaying) {
      jbAudio.pause();
      jbPlaying = false;
      jbRestoreSynthMusic();
    } else {
      jbStopSynthMusic();
      jbAudio.play().catch(function () {});
      jbPlaying = true;
    }
    jbUpdateUI();
  }

  function jbPrev() {
    var idx = jbCurrentTrack <= 0 ? TRACKS.length - 1 : jbCurrentTrack - 1;
    jbPlayTrack(idx);
  }

  function jbNext() {
    var idx = (jbCurrentTrack + 1) % TRACKS.length;
    jbPlayTrack(idx);
  }

  function jbUpdateUI() {
    // Play button icon
    if (jbPlayBtn) jbPlayBtn.textContent = jbPlaying ? '⏸' : '▶';
    if (jbPlayBtn) jbPlayBtn.classList.toggle('playing', jbPlaying);

    // Track name
    if (jbTrackName) {
      jbTrackName.textContent = jbCurrentTrack >= 0 ? TRACKS[jbCurrentTrack].name : '—';
    }

    // Track list active state
    if (jbTrackList) {
      jbTrackList.querySelectorAll('.jb-track-item').forEach(function (el, i) {
        el.classList.toggle('active', i === jbCurrentTrack);
      });
    }
  }

  function jbSetVolume(v) {
    jbVolume = Math.max(0, Math.min(1, v));
    if (jbAudio) jbAudio.volume = jbVolume;
    localStorage.setItem('arc_music_vol', jbVolume.toFixed(2));
  }

  // Stop the synthesized music engine from main.js
  function jbStopSynthMusic() {
    // Stop current synth playback
    if (window.ARC_GAME && typeof window.ARC_GAME.stopMusic === 'function') {
      window.ARC_GAME.stopMusic();
    }
    // Mute the gain node
    if (window.ARC_GAME && window.ARC_GAME._musicGain) {
      try { window.ARC_GAME._musicGain.gain.setValueAtTime(0, window.ARC_GAME._musicGain.context.currentTime); } catch (e) {}
    }
    // Prevent synth music from restarting on wave transitions
    window._arcMusicOverride = function () {};
  }

  // Restore synth music capability when jukebox stops
  function jbRestoreSynthMusic() {
    window._arcMusicOverride = null;
  }

  // Wire jukebox buttons
  if (jbPlayBtn) jbPlayBtn.addEventListener('click', jbTogglePlay);
  if (jbPrevBtn) jbPrevBtn.addEventListener('click', jbPrev);
  if (jbNextBtn) jbNextBtn.addEventListener('click', jbNext);

  // Track list toggle
  if (jbListToggle && jbPanel) {
    jbListToggle.addEventListener('click', function () {
      jbPanel.classList.toggle('open');
      // Close drawer if open
      drawer.classList.remove('open');
      menuBtn.classList.remove('open');
    });
  }

  // Close panel on outside tap
  document.addEventListener('touchstart', function (e) {
    if (!jbPanel || !jbPanel.classList.contains('open')) return;
    if (e.target.closest('#jukebox-panel, #jb-list-toggle')) return;
    jbPanel.classList.remove('open');
  }, { passive: true });

  // Volume slider
  if (jbVolSlider) {
    jbVolSlider.value = Math.round(jbVolume * 100);
    jbVolSlider.addEventListener('input', function () {
      jbSetVolume(parseInt(this.value, 10) / 100);
    });
  }

  // Build track list on load
  buildTrackList();

  // Global override — intercepts ALL internal startMusic() calls in main.js
  window._arcMusicOverride = function () {
    // If jukebox is already playing, do nothing
    if (jbPlaying && jbAudio && !jbAudio.paused) return;
    // Auto-start jukebox instead of synth
    if (jbCurrentTrack < 0) {
      jbPlayTrack(Math.floor(Math.random() * TRACKS.length));
    } else if (!jbPlaying) {
      jbTogglePlay();
    }
  };

  // Kill any synth music that started before our override was set
  $(function () {
    setTimeout(function () {
      jbStopSynthMusic();
    }, 800);
  });

  // Autoplay jukebox when player taps Start Game
  $(document).one('click.jbAutoplay', '#start-game-btn', function () {
    if (!jbPlaying && jbCurrentTrack < 0) {
      jbPlayTrack(Math.floor(Math.random() * TRACKS.length));
    }
  });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 7 — Zombie Direct-Tap
     ════════════════════════════════════════════════════════════════════════ */
  $canves.on('touchstart.mobzombie', '.zombie', function (e) {
    var oe = e.originalEvent;
    var t = (oe.targetTouches && oe.targetTouches[0]) || oe.touches[0];
    if (!t) return;
    // Cancel the browser's compatibility click for this touch — otherwise a
    // single tap fires twice (synthetic click below + native click) = 2 shots.
    e.preventDefault();
    this.dispatchEvent(new MouseEvent('click', {
      clientX: t.clientX, clientY: t.clientY, bubbles: true
    }));
  });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 8 — Fullscreen + Landscape Lock
     ════════════════════════════════════════════════════════════════════════ */
  function tryFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else {
      tryFullscreen();
    }
  }

  $(document).one('click.mobileFullscreen', '#start-game-btn', function () {
    tryFullscreen();
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {});
    }
  });

  // Attempt landscape lock on very first touch anywhere (before start-game-btn),
  // so the rotate-prompt can self-dismiss once the user rotates.
  document.addEventListener('touchstart', function _firstTouchLock() {
    document.removeEventListener('touchstart', _firstTouchLock, true);
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
      }
    } catch (e) { /* unsupported — silently ignore */ }
  }, { capture: true, passive: true, once: true });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 9 — Mobile fitCanvas Override
     ════════════════════════════════════════════════════════════════════════ */
  function mobileFitCanvas() {
    document.documentElement.style.setProperty('--canvas-scale', '1');
  }

  $(window).off('resize.fit');
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', window._oldFitCanvas);
  }
  $(window).on('resize.fit', mobileFitCanvas);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', mobileFitCanvas);
  mobileFitCanvas();

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 10 — Orientation Handler
     ════════════════════════════════════════════════════════════════════════ */
  function handleOrientation() {
    var isPortrait = window.innerHeight > window.innerWidth;
    var promptEl = document.getElementById('rotate-prompt');
    if (isPortrait) {
      promptEl.style.display = 'flex';
      canvesEl.style.display = 'none';
    } else {
      promptEl.style.display = 'none';
      canvesEl.style.display = '';
      mobileFitCanvas();
    }
  }

  $(window).on('resize.orient orientationchange.orient', handleOrientation);
  setTimeout(handleOrientation, 100);

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 11 — Utilities
     ════════════════════════════════════════════════════════════════════════ */
  function haptic(ms) { if (navigator.vibrate) navigator.vibrate(ms || 15); }

  // Hide desktop-only UI hints
  $('.reload-key').hide();
  $('#inv-shortcut-label').hide();

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 12 — Ambient Battlefield Sounds (Web Audio API)
     Thunder · Distant artillery · Distant gunfire
     ════════════════════════════════════════════════════════════════════════ */
  var ambCtx = null;
  var ambGain = null;
  var ambActive = false;
  var ambTimers = [];

  function getAmbCtx() {
    if (!ambCtx) {
      ambCtx = new (window.AudioContext || window.webkitAudioContext)();
      ambGain = ambCtx.createGain();
      ambGain.gain.value = 0.12;
      ambGain.connect(ambCtx.destination);
    }
    if (ambCtx.state === 'suspended') ambCtx.resume();
    return ambCtx;
  }

  // Thunder rumble: filtered noise with envelope
  function playThunder() {
    var ctx = getAmbCtx();
    var dur = 1.5 + Math.random() * 2.5;
    var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 60 + Math.random() * 80;
    lp.Q.value = 0.5;
    var g = ctx.createGain();
    var now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.5, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(ambGain);
    src.start(now);
    src.stop(now + dur);
  }

  // Distant artillery boom: low thud with reverb tail
  function playDistantArtillery() {
    var ctx = getAmbCtx();
    var dur = 0.6 + Math.random() * 0.8;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40 + Math.random() * 30, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.3 + Math.random() * 0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    // Add noise layer for crack
    var noiseDur = 0.08;
    var nBuf = ctx.createBuffer(1, ctx.sampleRate * noiseDur, ctx.sampleRate);
    var nData = nBuf.getChannelData(0);
    for (var i = 0; i < nData.length; i++) nData[i] = (Math.random() * 2 - 1);
    var nSrc = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    var nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.15, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noiseDur);
    osc.connect(g);
    g.connect(ambGain);
    nSrc.connect(hp);
    hp.connect(nGain);
    nGain.connect(ambGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    nSrc.start(ctx.currentTime);
    nSrc.stop(ctx.currentTime + noiseDur);
  }

  // Distant rapid gunfire: short burst of filtered noise
  function playDistantGunfire() {
    var ctx = getAmbCtx();
    var shots = 3 + Math.floor(Math.random() * 8);
    var interval = 0.06 + Math.random() * 0.04;
    for (var s = 0; s < shots; s++) {
      (function (delay) {
        var shotDur = 0.03;
        var buf = ctx.createBuffer(1, ctx.sampleRate * shotDur, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 600 + Math.random() * 400;
        bp.Q.value = 2;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.08 + Math.random() * 0.08, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + shotDur);
        src.connect(bp);
        bp.connect(g);
        g.connect(ambGain);
        src.start(ctx.currentTime + delay);
        src.stop(ctx.currentTime + delay + shotDur + 0.01);
      })(s * interval);
    }
  }

  function scheduleAmbient() {
    if (!ambActive) return;
    // Thunder: every 8-25 seconds
    ambTimers.push(setTimeout(function thunderLoop() {
      if (!ambActive) return;
      playThunder();
      ambTimers.push(setTimeout(thunderLoop, 8000 + Math.random() * 17000));
    }, 3000 + Math.random() * 5000));
    // Distant artillery: every 4-12 seconds
    ambTimers.push(setTimeout(function artyLoop() {
      if (!ambActive) return;
      playDistantArtillery();
      ambTimers.push(setTimeout(artyLoop, 4000 + Math.random() * 8000));
    }, 1000 + Math.random() * 3000));
    // Distant gunfire: every 5-15 seconds
    ambTimers.push(setTimeout(function gunLoop() {
      if (!ambActive) return;
      playDistantGunfire();
      ambTimers.push(setTimeout(gunLoop, 5000 + Math.random() * 10000));
    }, 2000 + Math.random() * 4000));
  }

  function startAmbient() {
    if (ambActive) return;
    ambActive = true;
    getAmbCtx();
    scheduleAmbient();
  }

  function stopAmbient() {
    ambActive = false;
    ambTimers.forEach(function (t) { clearTimeout(t); });
    ambTimers = [];
  }

  // Start ambient sounds when game starts
  $(document).one('click.ambientStart', '#start-game-btn', function () {
    startAmbient();
  });

  // Pause/resume ambient with game
  $(document).on('click', '#pause-game', function () {
    if (ambActive) { stopAmbient(); }
    else { startAmbient(); }
  });

  /* ════════════════════════════════════════════════════════════════════════
     SECTION 13 — Lobby Hub · Watch-to-Earn · Between-Wave · Game-Over
     ════════════════════════════════════════════════════════════════════════ */

  /* ── Lobby balance sync ──────────────────────────────────────────────── */
  function syncLobbyBalance() {
    var bal = parseInt(localStorage.getItem('arc_balance') || '0', 10);
    var el = document.getElementById('lb-arc-amount');
    if (el) el.textContent = bal;
  }
  syncLobbyBalance();

  /* ── Shots-for-Ukraine counter sync ─────────────────────────────────── */
  function syncShotsUkraine() {
    var shots = parseInt(localStorage.getItem('arc_shots_ukraine') || '0', 10);
    var el = document.getElementById('shots-ukraine-val');
    if (el) el.textContent = shots.toLocaleString();
  }
  syncShotsUkraine();
  var _lobbyPollId = setInterval(function() {
    if (window.ARC_GAME && window.ARC_GAME.gameActive) return;
    syncLobbyBalance();
  }, 1000);

  /* ── Helper: trigger main.js section by simulating its open call ──── */
  function openGameSection(sectionId) {
    var tabMap = {
      'spin':     'inv-sec-earn',
      'armory':   'inv-sec-armory',
      'nft':      'inv-sec-nfts',
      'missions': 'inv-sec-missions',
      'stake':    'inv-sec-staking',
      'shop':     'inv-sec-market',
      'skills':   'inv-sec-skills'
    };
    var targetSection = tabMap[sectionId] || 'inv-sec-armory';

    // During gameplay, pause first because desktop flow wires inventory open there.
    if (!document.querySelector('#canves.intro')) {
      var $pauseBtn = $('#pause-game');
      if ($pauseBtn.length && !$pauseBtn.hasClass('paused')) {
        $pauseBtn.trigger('click');
      }
    }

    if (typeof window.openInventory === 'function') {
      setTimeout(function () {
        window.openInventory(targetSection);
      }, 80);
      return;
    }

    // Fallback path for older builds without window.openInventory.
    var $invPanel = $('#inventory-panel');
    $invPanel.addClass('open').scrollTop(0);
    var el = $invPanel[0] && $invPanel[0].querySelector('#' + targetSection);
    if (el) {
      var navH = $invPanel.find('.inv-topbar').outerHeight(true) || 0;
      $invPanel[0].scrollTo({ top: el.offsetTop - navH + 4, behavior: 'smooth' });
      $invPanel.find('.inv-nav-btn').removeClass('active');
      var $btn = $invPanel.find('.inv-nav-btn[data-target="' + targetSection + '"]').addClass('active');
      if ($btn[0]) $btn[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ── Wire lobby buttons ──────────────────────────────────────────────── */
  var lobbyActions = {
    'lobby-spin':     function () { openGameSection('spin'); },
    'lobby-armory':   function () { openGameSection('armory'); },
    'lobby-nft':      function () { openGameSection('nft'); },
    'lobby-missions': function () { openGameSection('missions'); },
    'lobby-stake':    function () { openGameSection('stake'); },
    'lobby-shop':     function () { openGameSection('shop'); },
    'lobby-watch-ad': function () { triggerWatchToEarn(); },
    'lobby-refer':    function () { triggerReferral(); }
  };

  Object.keys(lobbyActions).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        haptic(12);
        lobbyActions[id]();
      });
    }
  });

  /* ── Watch-to-Earn (simulated reward video) ─────────────────────────── */
  var watchAdCooldown = false;

  function triggerWatchToEarn() {
    if (watchAdCooldown) {
      showToast('⏳ Wait before watching another video');
      return;
    }
    // Show a simulated ad overlay
    var overlay = document.createElement('div');
    overlay.className = 'ad-reward-overlay';
    overlay.innerHTML =
      '<div class="ad-reward-box">' +
        '<div class="adr-icon">🎬</div>' +
        '<div class="adr-title">Watch & Earn</div>' +
        '<div class="adr-sub">Watch a short video to earn <b>+3 ARC</b></div>' +
        '<div class="adr-progress"><div class="adr-fill"></div></div>' +
        '<div class="adr-timer">Loading video...</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Simulate ad countdown (5 seconds)
    var remaining = 5;
    var fill = overlay.querySelector('.adr-fill');
    var timer = overlay.querySelector('.adr-timer');

    var countdown = setInterval(function () {
      remaining--;
      var pct = ((5 - remaining) / 5) * 100;
      fill.style.width = pct + '%';
      if (remaining > 0) {
        timer.textContent = 'Video ends in ' + remaining + 's...';
      } else {
        clearInterval(countdown);
        timer.textContent = '✓ Reward earned!';
        timer.style.color = '#44ff44';
        // Award ARC
        if (window.ARC_GAME && typeof window.ARC_GAME.earnArcoin === 'function') {
          window.ARC_GAME.earnArcoin(3, 'Watch-to-earn');
        } else {
          var bal = parseInt(localStorage.getItem('arc_balance') || '0', 10);
          bal += 3;
          localStorage.setItem('arc_balance', String(bal));
          if (typeof window.arcoins !== 'undefined') window.arcoins += 3;
        }
        syncLobbyBalance();

        // Auto-close after 1s
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 1000);

        // Cooldown 60s
        watchAdCooldown = true;
        setTimeout(function () { watchAdCooldown = false; }, 60000);
      }
    }, 1000);
  }

  /* ── Referral link copy ─────────────────────────────────────────────── */
  function triggerReferral() {
    var uid = localStorage.getItem('arc_user_id') || ('u' + Date.now().toString(36));
    localStorage.setItem('arc_user_id', uid);
    var refUrl = location.origin + location.pathname + '?ref=' + uid;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(refUrl).then(function () {
        showToast('🔗 Referral link copied! +2 ARC per friend');
      }).catch(function () {
        showToast('🔗 ' + refUrl);
      });
    } else {
      showToast('🔗 ' + refUrl);
    }
  }

  /* ── Toast notification ─────────────────────────────────────────────── */
  function showToast(msg) {
    var existing = document.querySelector('.mob-toast');
    if (existing) existing.parentNode.removeChild(existing);
    var toast = document.createElement('div');
    toast.className = 'mob-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 20);
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
    }, 2500);
  }

  /* ── Between-wave CTA prompts ───────────────────────────────────────── */
  var waveCTAShown = false;

  function showWaveCTA() {
    if (waveCTAShown) return;
    waveCTAShown = true;
    var div = document.createElement('div');
    div.className = 'wave-cta-overlay';
    div.id = 'wave-cta';
    div.innerHTML =
      '<button class="wave-cta-btn cta-highlight" data-action="armory"><span class="cta-ico">🎒</span> Visit Armory</button>' +
      '<button class="wave-cta-btn" data-action="ad"><span class="cta-ico">🎬</span> Watch Ad +3 ARC</button>';
    canvesEl.appendChild(div);

    div.querySelectorAll('.wave-cta-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        if (action === 'armory') openGameSection('armory');
        else if (action === 'ad') triggerWatchToEarn();
        dismissWaveCTA();
      });
    });

    // Auto-dismiss after 8 seconds
    setTimeout(dismissWaveCTA, 8000);
  }

  function dismissWaveCTA() {
    var el = document.getElementById('wave-cta');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    waveCTAShown = false;
  }

  // Watch for wave transitions via MutationObserver on #canves data-wave attribute
  var lastWave = canvesEl.getAttribute('data-wave') || '';
  var waveObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === 'data-wave') {
        var newWave = canvesEl.getAttribute('data-wave') || '';
        if (newWave !== lastWave && lastWave !== '' && newWave !== '') {
          showWaveCTA();
        }
        lastWave = newWave;
      }
    });
  });
  waveObserver.observe(canvesEl, { attributes: true, attributeFilter: ['data-wave'] });

  /* ── Game-over monetization prompts ─────────────────────────────────── */
  function showGameOverPromo() {
    if (document.getElementById('gameover-promo')) return;
    // Skip if main.js death-upsell is handling it
    if ($('#death-upsell').is(':visible')) return;
    var div = document.createElement('div');
    div.className = 'gameover-promo';
    div.id = 'gameover-promo';
    div.innerHTML =
      '<div class="gameover-promo-title">Continue fighting?</div>' +
      '<div class="gameover-promo-row">' +
        '<button class="gp-btn gp-btn-revive" data-action="ad-revive"><span class="gp-ico">🎬</span> Watch Ad to Revive</button>' +
        '<button class="gp-btn" data-action="arc-revive"><span class="gp-ico">🪙</span> 10 ARC to Revive</button>' +
      '</div>';
    canvesEl.appendChild(div);

    div.querySelectorAll('.gp-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        if (action === 'ad-revive') {
          triggerWatchToEarn();
          // After ad, simulate revive
          setTimeout(function () {
            doRevive();
            removeGameOverPromo();
          }, 6500);
        } else if (action === 'arc-revive') {
          var bal = parseInt(localStorage.getItem('arc_balance') || '0', 10);
          if (bal >= 10) {
            bal -= 10;
            localStorage.setItem('arc_balance', String(bal));
            if (typeof window.arcoins !== 'undefined') window.arcoins -= 10;
            syncLobbyBalance();
            doRevive();
            removeGameOverPromo();
          } else {
            showToast('❌ Not enough ARC (need 10)');
          }
        }
      });
    });
  }

  function removeGameOverPromo() {
    var el = document.getElementById('gameover-promo');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function doRevive() {
    var G = window.ARC_GAME;
    if (!G) { showToast('❌ Revive unavailable'); return; }
    // Mirror desktop revive: restore HP, rebind handlers, respawn zombies
    G.shooterHp = 50;
    G.life = 3;
    G.gameActive = true;
    G.gamePaused = false;
    $('#canves').removeClass('game-over end-game juice-death-desaturate juice-low-hp');
    $('.overlay-screen').css('display', '');
    $('#death-upsell').hide();
    $('.battle-report, .share-score-btn, #gameover-promo').remove();
    if (typeof G.updateScoreHUD === 'function') G.updateScoreHUD();
    if (typeof G.setHandlers === 'function')    G.setHandlers();
    if (typeof G.createZombies === 'function')  G.createZombies();
    showToast('💚 Revived! Keep fighting!');
  }

  // Watch for game-over class on #canves
  var goObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === 'class') {
        var classes = canvesEl.className;
        if (classes.indexOf('game-over') !== -1) {
          // Clear HUD poll on game end (B173 — fix leaked interval)
          if (_hudPollId) { clearInterval(_hudPollId); _hudPollId = null; }
          setTimeout(showGameOverPromo, 1200);
        } else {
          removeGameOverPromo();
          // Restart HUD poll if game resumes
          if (!_hudPollId) {
            _hudPollId = setInterval(function () {
              var G = window.ARC_GAME;
              if (!G || !G.gameActive) return;
              syncTopBar(); syncBottomBar();
            }, 200);
          }
        }
      }
    });
  });
  goObserver.observe(canvesEl, { attributes: true, attributeFilter: ['class'] });

})();
