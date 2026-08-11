/* =================================================================
   ENGINE-EXTRAS.JS  —  Procedural Soldiers · Donkey Rider ·
                         Particles · Enhanced Foreground
   Hooks into main.js via window.ARC_GAME bridge.
   ================================================================= */
'use strict';

(function($) {

  /* ───────────────────────────────────────────────────────────────
     INJECT KEYFRAME CSS
  ─────────────────────────────────────────────────────────────── */
  var _styleEl = document.createElement('style');
  _styleEl.textContent = [
    /* Soldier walk — leg swing */
    '@keyframes solLegL { 0%,100%{transform:rotate(-22deg)} 50%{transform:rotate(22deg)} }',
    '@keyframes solLegR { 0%,100%{transform:rotate(22deg)}  50%{transform:rotate(-22deg)} }',
    '@keyframes solArmL { 0%,100%{transform:rotate(20deg)}  50%{transform:rotate(-20deg)} }',
    '@keyframes solArmR { 0%,100%{transform:rotate(-16deg)} 50%{transform:rotate(16deg)}  }',
    /* Donkey gallop legs */
    '@keyframes dkLegF  { 0%,100%{transform:rotate(-28deg)} 50%{transform:rotate(28deg)}  }',
    '@keyframes dkLegB  { 0%,100%{transform:rotate(28deg)}  50%{transform:rotate(-28deg)} }',
    /* FPV vehicle animations */
    '@keyframes fdHover { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }',
    '@keyframes fpvSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }',
    /* Napalm splat */
    '@keyframes napalmPop { 0%{transform:scale(0.4);opacity:1} 60%{transform:scale(2.2);opacity:0.7} 100%{transform:scale(3);opacity:0} }',
    /* Saved donkey bounce */
    '@keyframes dkSaved { 0%,100%{transform:translateY(0px)} 30%{transform:translateY(-14px)} 60%{transform:translateY(-6px)} }',
    /* Smoke puff */
    '@keyframes smokePuff { 0%{transform:scale(0.5) translateY(0px);opacity:0.7} 100%{transform:scale(2.5) translateY(-30px);opacity:0} }',
    /* Bird flap */
    '@keyframes birdFlap { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(-0.5)} }',

    /* Procedural Soldier */
    /* B191: override .zombie defaults — proc-soldiers use inline top/left + JS movement, not CSS bottom/right/walk animation */
    '.proc-soldier { position:absolute; cursor:crosshair; user-select:none; bottom:auto; right:auto; animation-name:none; transform:none; transform-origin:center center; }',
    '.proc-soldier .sol-leg-l { transform-origin:50% 0%; animation:solLegL 0.55s ease-in-out infinite; }',
    '.proc-soldier .sol-leg-r { transform-origin:50% 0%; animation:solLegR 0.55s ease-in-out infinite; }',
    '.proc-soldier .sol-arm-l { transform-origin:100% 30%; animation:solArmL 0.55s ease-in-out infinite; }',
    '.proc-soldier .sol-arm-r { transform-origin:0%   30%; animation:solArmR 0.55s ease-in-out infinite; }',
    '.proc-soldier .sol-muzzle { position:absolute; right:-8px; top:38px; font-size:10px; opacity:0; transition:opacity 0.05s; }',
    '.proc-soldier .sol-muzzle.active { opacity:1; }',
    '.proc-soldier .strength-bar { position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); width:36px; height:4px; background:#cc2200; border-radius:2px; }',

    /* Sniper */
    '.proc-sniper .strength-bar { background:#8800cc; }',

    /* Drone Operator */
    '.proc-droneop .strength-bar { background:#0088cc; }',
    '.fpv-mini-drone { cursor:crosshair; }',

    /* Donkey+Rider */
    '.proc-donkey { position:absolute; cursor:crosshair; user-select:none; }',
    '.proc-donkey .dk-leg-fl { transform-origin:50% 0%; animation:dkLegF 0.42s ease-in-out infinite; }',
    '.proc-donkey .dk-leg-fr { transform-origin:50% 0%; animation:dkLegF 0.42s ease-in-out infinite 0.21s; }',
    '.proc-donkey .dk-leg-bl { transform-origin:50% 0%; animation:dkLegB 0.42s ease-in-out infinite 0.1s; }',
    '.proc-donkey .dk-leg-br { transform-origin:50% 0%; animation:dkLegB 0.42s ease-in-out infinite 0.31s; }',
    '.proc-donkey.donkey-saved  { filter:hue-rotate(40deg) brightness(1.4); animation:dkSaved 0.6s ease-in-out 3; }',
    '.proc-donkey .strength-bar { position:absolute; bottom:-5px; left:50%; transform:translateX(-50%); width:56px; height:4px; background:#cc2200; border-radius:2px; }',

    /* Fire drone */
    '.firedrone-ci { position:absolute; z-index:400; display:flex; align-items:center; gap:4px; animation:fdHover 1s ease-in-out infinite; }',
    '.firedrone-ci img { width:52px; height:auto; filter:drop-shadow(0 0 6px #ff6600); transform:scaleX(-1); }',
    '.firedrone-ci .fd-flame { font-size:14px; }',
    '.napalm-splat { position:absolute; font-size:28px; pointer-events:none; animation:napalmPop 0.6s ease-out forwards; z-index:350; }',

    /* FPV drone */
    '.fpv-ci { position:absolute; z-index:410; width:42px; height:42px; }',
    '.fpv-ci img { width:100%; height:auto; filter:drop-shadow(0 0 5px #00ccff); }',

    /* Bradley image icon */
    '.ci-icon--img { display:flex; align-items:center; justify-content:center; }',
    '.ci-vehicle-img { width:36px; height:24px; object-fit:contain; filter:brightness(1.1); }',

    /* Particle canvas */
    '#particle-canvas { position:absolute; top:0; left:0; pointer-events:none; z-index:12; }',

    /* Kill stats in skills section */
    '.inv-killstats-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; }',
    '.inv-ks-card { background:rgba(255,215,0,.06); border:1px solid rgba(255,215,0,.18); border-radius:8px; padding:10px 14px; }',
    '.inv-ks-val  { font-size:22px; font-weight:700; color:#FFD700; font-family:"Oswald",sans-serif; }',
    '.inv-ks-lbl  { font-size:11px; color:rgba(200,200,160,.7); margin-top:2px; }',
    '.inv-arc-conv { margin-top:14px; background:rgba(0,91,187,.12); border:1px solid rgba(0,91,187,.3); border-radius:8px; padding:12px 16px; font-size:12px; color:rgba(220,220,180,.8); line-height:1.9; }',
    '.inv-arc-conv b { color:#FFD700; }',
  ].join('\n');
  document.head.appendChild(_styleEl);


  /* ───────────────────────────────────────────────────────────────
     WAIT FOR BRIDGE
  ─────────────────────────────────────────────────────────────── */
  function _waitBridge(cb) {
    if (window.ARC_GAME && window.ARC_GAME.$canves) { cb(); return; }
    setTimeout(function(){ _waitBridge(cb); }, 120);
  }

  _waitBridge(function() {
    var G = window.ARC_GAME;

    /* ─────────────────────────────────────────────────────
       PARTICLE SYSTEM
    ───────────────────────────────────────────────────── */
    var _canvas = document.createElement('canvas');
    _canvas.id = 'particle-canvas';
    G.$canves[0].appendChild(_canvas);
    var _ctx = _canvas.getContext('2d');
    var _particles = [];
    var _birds = [];
    var _pRaf = null;
    var _pRunning = false;
    var _isMobile = window.innerWidth <= 700 || window.innerHeight <= 620;
    var _MAX_PARTICLES = _isMobile ? 40 : 120;

    function _resizeParticleCanvas() {
      _canvas.width  = G.$canves.width()  || 1024;
      _canvas.height = G.$canves.height() || 550;
    }
    _resizeParticleCanvas();
    $(window).on('resize.extras', function() { _resizeParticleCanvas(); });

    // Particle types: 'dust' | 'debris' | 'smoke'
    function _spawnDustPuff(x, y) {
      if (_particles.length >= _MAX_PARTICLES) return;
      var count = _isMobile ? 2 : 5;
      for (var i = 0; i < count; i++) {
        _particles.push({
          type: 'dust',
          x: x + (Math.random()-0.5)*22,
          y: y + (Math.random()-0.5)*10,
          vx: (Math.random()-0.5)*1.2,
          vy: -(0.5 + Math.random()*1.5),
          life: 1.0,
          decay: 0.018 + Math.random()*0.012,
          r: 2 + Math.random()*4,
          col: 'rgba(160,130,90,',
        });
      }
    }

    function _spawnDebris(x, y) {
      if (_particles.length >= _MAX_PARTICLES) return;
      var count = _isMobile ? 2 : 3;
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 1.5 + Math.random() * 2.5;
        _particles.push({
          type: 'debris',
          x: x, y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 2.5,
          ax: 0, ay: 0.12,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random()-0.5)*0.22,
          life: 1.0,
          decay: 0.010 + Math.random()*0.008,
          w: 6 + Math.random()*10,
          h: 3 + Math.random()*5,
          col: Math.random() > 0.5 ? '#e8e0c0' : '#ccc',
        });
      }
    }

    function _spawnSmoke(x, y) {
      _particles.push({
        type: 'smoke',
        x: x, y: y,
        vx: (Math.random()-0.5)*0.6,
        vy: -(0.5 + Math.random()),
        life: 1.0,
        decay: 0.007,
        r: 8 + Math.random()*12,
        col: 'rgba(90,80,70,',
      });
    }

    // Birds
    function _spawnBird() {
      var cw = _canvas.width, ch = _canvas.height;
      var startLeft = Math.random() > 0.5;
      _birds.push({
        x: startLeft ? -20 : cw + 20,
        y: 30 + Math.random() * ch * 0.35,
        vx: startLeft ? (0.8 + Math.random()*1.2) : -(0.8 + Math.random()*1.2),
        vy: (Math.random()-0.5) * 0.4,
        flapT: 0,
        size: 6 + Math.random()*8,
        life: 1.0,
      });
    }

    function _updateParticles() {
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

      for (var i = _particles.length - 1; i >= 0; i--) {
        var p = _particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.ay) p.vy += p.ay;
        p.life -= p.decay;
        if (p.life <= 0) { _particles.splice(i, 1); continue; }

        _ctx.save();
        _ctx.globalAlpha = Math.max(0, p.life);
        if (p.type === 'dust' || p.type === 'smoke') {
          _ctx.beginPath();
          _ctx.arc(p.x, p.y, p.r * (p.type === 'smoke' ? (2 - p.life) : 1), 0, Math.PI*2);
          _ctx.fillStyle = p.col + Math.max(0,p.life) + ')';
          _ctx.fill();
        } else if (p.type === 'debris') {
          _ctx.translate(p.x, p.y);
          p.rot += p.rotV;
          _ctx.rotate(p.rot);
          _ctx.fillStyle = p.col;
          _ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          _ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          _ctx.lineWidth = 0.5;
          _ctx.strokeRect(-p.w/2, -p.h/2, p.w, p.h);
        }
        _ctx.restore();
      }

      for (var j = _birds.length - 1; j >= 0; j--) {
        var b = _birds[j];
        b.x += b.vx; b.y += b.vy; b.flapT += 0.25;
        var cw2 = _canvas.width;
        if ((b.vx > 0 && b.x > cw2 + 30) || (b.vx < 0 && b.x < -30)) {
          _birds.splice(j, 1); continue;
        }
        _ctx.save();
        _ctx.globalAlpha = 0.75;
        var flapOff = Math.sin(b.flapT) * b.size * 0.7;
        _ctx.fillStyle = '#1a1a1a';
        _ctx.beginPath(); // left wing
        _ctx.moveTo(b.x, b.y);
        _ctx.quadraticCurveTo(b.x - b.size, b.y - flapOff, b.x - b.size*2, b.y + b.size*0.3);
        _ctx.lineWidth = 1.5;
        _ctx.strokeStyle = '#111';
        _ctx.stroke();
        _ctx.beginPath(); // right wing
        _ctx.moveTo(b.x, b.y);
        _ctx.quadraticCurveTo(b.x + b.size, b.y - flapOff, b.x + b.size*2, b.y + b.size*0.3);
        _ctx.stroke();
        _ctx.restore();
      }

      _pRaf = requestAnimationFrame(_updateParticles);
    }

    function _startParticles() {
      if (!_pRunning) { _pRunning = true; _updateParticles(); }
    }
    function _stopParticles() {
      _pRunning = false;
      if (_pRaf) { cancelAnimationFrame(_pRaf); _pRaf = null; }
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    }

    // Spawn background dust every 2s when game active
    var _dustInterval = setInterval(function() {
      if (!G.gameActive || G.gamePaused) return;
      var cw = _canvas.width, ch = _canvas.height;
      _spawnDustPuff(Math.random() * cw, ch * 0.6 + Math.random() * ch * 0.3);
      // Debris burst 20% chance
      if (Math.random() < 0.20) {
        _spawnDebris(Math.random() * cw, ch * 0.3 + Math.random() * ch * 0.35);
      }
    }, 2000);

    // Spawn birds at random
    var _birdInterval = setInterval(function() {
      if (!G.gameActive || G.gamePaused || _birds.length >= 5) return;
      if (Math.random() < 0.4) _spawnBird();
    }, 4500);

    _startParticles();

    // Clean up particle/bird intervals when page unloads
    $(window).on('beforeunload.extras', function() {
      clearInterval(_dustInterval);
      clearInterval(_birdInterval);
      _stopParticles();
    });

    // Expose particle triggers for soldier footsteps
    window.ARC_GAME.spawnDustPuff = _spawnDustPuff;
    window.ARC_GAME.spawnDebris   = _spawnDebris;
    window.ARC_GAME.spawnSmoke    = _spawnSmoke;


    /* ─────────────────────────────────────────────────────
       PROCEDURAL RUSSIAN SOLDIER
    ───────────────────────────────────────────────────── */

    // Color variations — uniform, skin, cap
    var _solUniforms = ['#3d5918','#2e4510','#4a5c2a','#546328','#3b4f1e'];
    var _solSkins    = ['#c8a06a','#b8905a','#d4ad7a','#c0956a'];
    var _solCaps     = ['#2a3c10','#1e2e0a','#304515','#263810'];

    function _makeSoldierSvg(uid) {
      var uni  = _solUniforms[uid % _solUniforms.length];
      var skin = _solSkins[uid % _solSkins.length];
      var cap  = _solCaps[uid % _solCaps.length];
      var beltCol = Math.random() > 0.5 ? '#1a1a1a' : '#2a2200';
      var helmetVariant = Math.random() > 0.55;
      var hasBalaclava = Math.random() > 0.6;
      var tactMark = Math.random();
      var markStr = tactMark < 0.3 ? 'Z' : tactMark < 0.55 ? 'V' : tactMark < 0.75 ? 'O' : 'FLAG';
      var markIsText = markStr !== 'FLAG';

      return '<svg class="sol-svg" width="160" height="260" viewBox="0 0 52 88" xmlns="http://www.w3.org/2000/svg">'
        // Left leg — baggy BDU trousers + combat boots
        + '<g class="sol-leg-l" style="transform-origin:17px 55px">'
        + '<rect x="12" y="55" width="10" height="24" rx="3" fill="' + uni + '"/>'
        + '<rect x="13" y="68" width="8" height="3" rx="1" fill="#2a2a1a" opacity="0.4"/>'
        + '<rect x="11" y="76" width="12" height="7" rx="2.5" fill="#1a1a1a"/>'
        + '<rect x="11" y="80" width="12" height="4" rx="1.5" fill="#111"/>'
        + '</g>'
        // Right leg
        + '<g class="sol-leg-r" style="transform-origin:28px 55px">'
        + '<rect x="24" y="55" width="10" height="24" rx="3" fill="' + uni + '"/>'
        + '<rect x="25" y="68" width="8" height="3" rx="1" fill="#2a2a1a" opacity="0.4"/>'
        + '<rect x="23" y="76" width="12" height="7" rx="2.5" fill="#1a1a1a"/>'
        + '<rect x="23" y="80" width="12" height="4" rx="1.5" fill="#111"/>'
        + '</g>'
        // Torso — layered body armour plate carrier
        + '<rect x="11" y="30" width="30" height="28" rx="3" fill="' + uni + '"/>'
        + '<rect x="14" y="32" width="24" height="22" rx="2" fill="#3a3a2a"/>'
        + '<rect x="16" y="34" width="20" height="16" rx="1.5" fill="#4a4a3a" opacity="0.7"/>'
        + '<rect x="18" y="36" width="16" height="12" rx="1" fill="#555544" opacity="0.5"/>'
        // MOLLE webbing straps
        + '<rect x="14" y="30" width="3" height="24" rx="1" fill="#2a2a1a" opacity="0.5"/>'
        + '<rect x="35" y="30" width="3" height="24" rx="1" fill="#2a2a1a" opacity="0.5"/>'
        // Belt + pistol holster
        + '<rect x="11" y="52" width="30" height="5" rx="2" fill="' + beltCol + '"/>'
        + '<rect x="35" y="50" width="6" height="8" rx="1.5" fill="#1a1a1a"/>'
        // Tactical pouches (mag pouches on plate carrier)
        + '<rect x="14" y="47" width="4" height="6" rx="1" fill="#5a5030"/>'
        + '<rect x="19" y="47" width="4" height="6" rx="1" fill="#5a5030"/>'
        + '<rect x="24" y="47" width="4" height="6" rx="1" fill="#5a5030"/>'
        // Tactical Z/V/O marking on chest
        + (markIsText
          ? '<text x="20" y="42" font-size="8" font-weight="900" fill="rgba(255,255,255,0.6)" font-family="monospace">' + markStr + '</text>'
          : '<g transform="translate(19,36)"><rect width="10" height="2.3" fill="#fff"/><rect y="2.3" width="10" height="2.3" fill="#0039a6"/><rect y="4.6" width="10" height="2.3" fill="#d52b1e"/><rect width="10" height="7" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="0.3"/></g>')
        // Left arm
        + '<g class="sol-arm-l" style="transform-origin:11px 36px">'
        + '<rect x="1" y="31" width="12" height="7" rx="3" fill="' + uni + '"/>'
        + '<rect x="0" y="33" width="5" height="4" rx="2" fill="' + skin + '"/>'
        + '<rect x="3" y="31" width="4" height="2" rx="1" fill="#cc0000" opacity="0.7"/>'
        + '</g>'
        // Right arm + AK-74M
        + '<g class="sol-arm-r" style="transform-origin:41px 36px">'
        + '<rect x="39" y="31" width="12" height="7" rx="3" fill="' + uni + '"/>'
        + '<rect x="49" y="33" width="5" height="4" rx="2" fill="' + skin + '"/>'
        // AK-74M body — dark polymer furniture
        + '<rect x="35" y="28" width="20" height="5" rx="1.5" fill="#1a1a1a"/>'
        + '<rect x="51" y="29" width="12" height="3" rx="1" fill="#2a2a2a" class="sol-gun"/>'
        // Handguard
        + '<rect x="35" y="27" width="10" height="3" rx="1" fill="#2a1a0a"/>'
        // Banana mag
        + '<rect x="39" y="33" width="4" height="8" rx="1" fill="#1a1a0a" transform="rotate(5,41,37)"/>'
        // Dust cover
        + '<rect x="42" y="27" width="8" height="2" rx="0.5" fill="#333"/>'
        + '</g>'
        // Head
        + '<ellipse cx="26" cy="22" rx="11" ry="12" fill="' + (hasBalaclava ? '#1a1a1a' : skin) + '"/>'
        // Balaclava mouth hole or bare face
        + (hasBalaclava ? '<ellipse cx="26" cy="25" rx="5" ry="3" fill="' + skin + '"/>' : '')
        // Helmet — 6B47 Ratnik style
        + (helmetVariant
          ? '<path d="M13 20 Q26 6 39 20 L37 23 Q26 11 15 23 Z" fill="#3a4a1a"/>'
            + '<ellipse cx="26" cy="20" rx="14" ry="9" fill="#4a5c1e"/>'
            + '<ellipse cx="26" cy="22" rx="15" ry="4" fill="#3a4a1a"/>'
            + '<rect x="20" y="13" width="12" height="3" rx="1" fill="#2a3a0a"/>'
            + '<rect x="14" y="20" width="3" height="4" rx="1" fill="#3a3a2a"/>'
            + '<g transform="translate(22,14)"><rect width="8" height="1.8" fill="#fff"/><rect y="1.8" width="8" height="1.8" fill="#0039a6"/><rect y="3.6" width="8" height="1.8" fill="#d52b1e"/><rect width="8" height="5.4" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.3" rx="0.3"/></g>'
          : '<path d="M14 17 L38 17 L36 10 L16 10 Z" fill="' + cap + '"/>'
            + '<rect x="12" y="15" width="28" height="5" rx="2" fill="' + cap + '"/>'
            + '<rect x="12" y="15" width="28" height="2" rx="1" fill="rgba(0,0,0,0.15)"/>'
            + '<g transform="translate(22,10)"><rect width="8" height="1.8" fill="#fff"/><rect y="1.8" width="8" height="1.8" fill="#0039a6"/><rect y="3.6" width="8" height="1.8" fill="#d52b1e"/><rect width="8" height="5.4" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.3" rx="0.3"/></g>')
        // Eyes
        + '<circle cx="22" cy="23" r="1.6" fill="#2a1a0a"/>'
        + '<circle cx="30" cy="23" r="1.6" fill="#2a1a0a"/>'
        // Radio antenna on shoulder
        + '<line x1="8" y1="30" x2="5" y2="15" stroke="#555" stroke-width="0.8"/>'
        + '<circle cx="5" cy="14" r="1" fill="#333"/>'
        + '</svg>'
        + '<div class="sol-muzzle">💥</div>';
    }

    var _solUid = 0;
    window.ARC_GAME.spawnSoldier = function() {
      var G = window.ARC_GAME;
      var uid     = _solUid++;
      var cw      = G.$canves.width();
      var ch      = G.$canves.height();
      var side    = Math.random() > 0.5 ? 'left' : 'right';
      var fromLeft = (side === 'left');
      var speed   = (1 + Math.random() * 1.5 + (G.wave * 0.4)) * 2;
      var strength = 1 + G.wave;
      var groundY = ch * 0.52 + Math.random() * ch * 0.18;

      var $sol = $('<div class="zombie proc-soldier" data-strength="' + strength + '" data-strength-max="' + strength + '">'
        + _makeSoldierSvg(uid)
        + '<div class="strength-bar"></div>'
        + '</div>')
        .css({
          position: 'absolute',
          left: fromLeft ? '-160px' : (cw + 160) + 'px',
          top:  (groundY - 260) + 'px',
          width: '160px',
          height: '260px',
          zIndex: 8,
          transform: fromLeft ? 'scaleX(-1)' : 'scaleX(1)',
        });

      G.$canves.append($sol);

      // Walk movement
      var moveId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($sol.hasClass('killed') || !$.contains(document.body, $sol[0])) {
          clearInterval(moveId);
          clearInterval(shootId);
          return;
        }
        var curX = parseFloat($sol.css('left')) || 0;
        var newX = curX + (fromLeft ? speed : -speed);
        $sol.css('left', newX + 'px');

        // Dust on footstep (every ~6 frames)
        if (Math.random() < 0.18 && window.ARC_GAME.spawnDustPuff) {
          var cRect = G.$canves[0].getBoundingClientRect();
          var sx    = parseFloat($sol.css('left')) + 26;
          var sy    = parseFloat($sol.css('top'))  + 82;
          window.ARC_GAME.spawnDustPuff(sx, sy);
        }

        // Screen-cross escape — damage player like regular zombies
        if ((fromLeft && newX > cw + 140) || (!fromLeft && newX < -140)) {
          clearInterval(moveId);
          clearInterval(shootId);
          G.damageShooter(2 + Math.floor(Math.random() * 3));
          $sol.remove();
        }
      }, 40);

      // Shoot at player (damages shooter HP)
      var shootId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($sol.hasClass('killed') || !$.contains(document.body, $sol[0])) {
          clearInterval(shootId); return;
        }
        if (Math.random() < 0.18) {
          $sol.find('.sol-muzzle').addClass('active');
          setTimeout(function() { $sol.find('.sol-muzzle').removeClass('active'); }, 90);
          // Procedural gunshot SFX
          (function() {
            var ac = G.getACtx(), t = ac.currentTime;
            var freq = 280 + Math.random() * 180;
            var o = ac.createOscillator(), g2 = ac.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(freq * 4, t);
            o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
            g2.gain.setValueAtTime(0.09, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            o.connect(g2); g2.connect(G.getMaster()); o.start(t); o.stop(t + 0.14);
            // Noise crack
            var nb = ac.createBuffer(1, Math.floor(ac.sampleRate*0.04), ac.sampleRate);
            var nd = nb.getChannelData(0);
            for (var ii=0;ii<nd.length;ii++) nd[ii]=(Math.random()*2-1);
            var ns = ac.createBufferSource(); ns.buffer = nb;
            var ng = ac.createGain(); ng.gain.setValueAtTime(0.22, t); ng.gain.linearRampToValueAtTime(0, t+0.04);
            ns.connect(ng); ng.connect(G.getMaster()); ns.start(t);
          })();
          // Visual-only: muzzle flash + SFX, no direct damage (damage only on screen-cross)
        }
      }, 2200 + Math.random() * 1500);
    };


    /* ─────────────────────────────────────────────────────
       DONKEY + RIDER
    ───────────────────────────────────────────────────── */

    function _makeDonkeySvg(uid) {
      var uni  = _solUniforms[uid % _solUniforms.length];
      var skin = _solSkins[uid % _solSkins.length];
      var cap  = _solCaps[uid % _solCaps.length];
      return '<svg class="donkey-svg" width="240" height="192" viewBox="0 0 88 96" xmlns="http://www.w3.org/2000/svg">'
        // Donkey body
        + '<ellipse cx="50" cy="64" rx="30" ry="17" fill="#9a8a7a"/>'
        + '<ellipse cx="50" cy="60" rx="30" ry="16" fill="#8a7a6a"/>'
        // Neck + head
        + '<rect x="21" y="46" width="10" height="20" rx="5" fill="#8a7a6a"/>'
        + '<ellipse cx="18" cy="40" rx="11" ry="10" fill="#8a7a6a"/>'
        // Ears
        + '<rect x="10" y="28" width="5" height="11" rx="2.5" fill="#8a7a6a"/>'
        + '<rect x="21" y="27" width="4" height="11" rx="2"   fill="#8a7a6a"/>'
        // Snout
        + '<ellipse cx="11" cy="42" rx="7" ry="5" fill="#9a8a7a"/>'
        + '<circle cx="9"  cy="43" r="1.2" fill="#2a1a0a"/>'
        + '<circle cx="13" cy="43" r="1.2" fill="#2a1a0a"/>'
        // Donkey eye
        + '<circle cx="14" cy="37" r="2"   fill="#2a1a0a"/>'
        // Tail
        + '<path d="M79 60 Q88 52 84 45" stroke="#8a7a6a" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<circle cx="84" cy="44" r="4" fill="#7a6a5a"/>'
        // Front legs (animated)
        + '<g class="dk-leg-fl" style="transform-origin:30px 77px"><rect x="27" y="77" width="7" height="18" rx="3" fill="#7a6a5a"/><rect x="26" y="92" width="9" height="4" rx="2" fill="#3a2a1a"/></g>'
        + '<g class="dk-leg-fr" style="transform-origin:40px 77px"><rect x="37" y="77" width="7" height="18" rx="3" fill="#7a6a5a"/><rect x="36" y="92" width="9" height="4" rx="2" fill="#3a2a1a"/></g>'
        // Back legs
        + '<g class="dk-leg-bl" style="transform-origin:58px 77px"><rect x="55" y="77" width="7" height="18" rx="3" fill="#7a6a5a"/><rect x="54" y="92" width="9" height="4" rx="2" fill="#3a2a1a"/></g>'
        + '<g class="dk-leg-br" style="transform-origin:69px 77px"><rect x="66" y="77" width="7" height="18" rx="3" fill="#7a6a5a"/><rect x="65" y="92" width="9" height="4" rx="2" fill="#3a2a1a"/></g>'
        // Rider (soldier on top — removable group)
        + '<g class="donkey-rider">'
        // Rider body
        + '<rect x="36" y="34" width="20" height="24" rx="4" fill="' + uni + '"/>'
        + '<rect x="36" y="52" width="20" height="5"  rx="2" fill="#1a1a1a"/>'
        // Rider head
        + '<ellipse cx="46" cy="26" rx="9" ry="10" fill="' + skin + '"/>'
        // Rider cap
        + '<path d="M37 23 L55 23 L52 17 L40 17 Z" fill="' + cap + '"/>'
        + '<rect x="35" y="22" width="22" height="4" rx="2" fill="' + cap + '"/>'
        + '<g transform="translate(41,16)"><rect width="7" height="1.5" fill="#fff"/><rect y="1.5" width="7" height="1.5" fill="#0039a6"/><rect y="3" width="7" height="1.5" fill="#d52b1e"/><rect width="7" height="4.5" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.3" rx="0.3"/></g>'
        // Rider eyes
        + '<circle cx="42" cy="27" r="1.5" fill="#2a1a0a"/>'
        + '<circle cx="50" cy="27" r="1.5" fill="#2a1a0a"/>'
        // Rider arms (holding reins)
        + '<rect x="22" y="40" width="14" height="5" rx="2.5" fill="' + uni + '"/>'
        + '<rect x="56" y="40" width="14" height="5" rx="2.5" fill="' + uni + '"/>'
        // Gun held to side
        + '<rect x="58" y="37" width="14" height="3" rx="1.5" fill="#1a1a1a"/>'
        + '<rect x="62" y="37" width="3"  height="6" rx="1"   fill="#1a1a1a"/>'
        + '</g>'
        + '</svg>'
        + '<div class="dk-saved-label" style="display:none;position:absolute;top:-26px;left:50%;transform:translateX(-50%);font-size:13px;font-weight:700;color:#FFD700;font-family:Oswald,sans-serif;white-space:nowrap;text-shadow:0 0 8px #005BBB;">🫏 DONKEY SAVED! +5 ARC</div>';
    }

    var _donkeyUid = 0;
    window.ARC_GAME.spawnDonkeyRider = function() {
      var G   = window.ARC_GAME;
      var uid = _donkeyUid++;
      var cw  = G.$canves.width();
      var ch  = G.$canves.height();
      var fromLeft  = Math.random() > 0.5;
      var speed     = (0.9 + Math.random() * 0.8 + (G.wave * 0.25)) * 2;
      var groundY   = ch * 0.48 + Math.random() * ch * 0.16;
      var riderHp   = 2 + G.wave;

      var $dk = $('<div class="zombie proc-donkey" data-strength="' + riderHp + '" data-strength-max="' + riderHp + '" data-type="donkey">'
        + _makeDonkeySvg(uid)
        + '<div class="strength-bar"></div>'
        + '</div>')
        .css({
          position: 'absolute',
          left: fromLeft ? '-200px' : (cw + 200) + 'px',
          top:  (groundY - 192) + 'px',
          width: '240px',
          height: '192px',
          zIndex: 8,
          transform: fromLeft ? 'scaleX(-1)' : 'scaleX(1)',
        });

      G.$canves.append($dk);

      var moveId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        var hasRider = $dk.find('.donkey-rider').length > 0;
        if ($dk.hasClass('killed') || !$.contains(document.body, $dk[0])) {
          clearInterval(moveId); return;
        }
        var curX = parseFloat($dk.css('left')) || 0;
        var curSpeed = hasRider ? speed : speed * 1.6; // freed donkey gallops away
        $dk.css('left', (curX + (fromLeft ? curSpeed : -curSpeed)) + 'px');

        // Dust on hooves
        if (Math.random() < 0.22 && window.ARC_GAME.spawnDustPuff) {
          window.ARC_GAME.spawnDustPuff(curX + 44, parseFloat($dk.css('top')) + 90);
        }

        if ((fromLeft && curX > cw + 220) || (!fromLeft && curX < -220)) {
          clearInterval(moveId); $dk.remove();
        }
      }, 40);

      // Override killZombieEl behavior for donkey — killing the rider frees the donkey
      $dk.data('_donkeyKillOverride', function() {
        var rider = $dk.find('.donkey-rider');
        if (rider.length) {
          // Rider killed — animate out
          rider.css({ transition: 'opacity 0.4s, transform 0.4s', opacity: 0, transform: 'translateY(20px) rotate(15deg)' });
          setTimeout(function() { rider.remove(); }, 420);
          // Donkey saved!
          $dk.addClass('donkey-saved');
          $dk.find('.dk-saved-label').show();
          $dk.data('strength', 999).attr('data-strength', '999'); // invincible now
          $dk.find('.strength-bar').remove();
          G.shooterSpeech('\uD83ABrutal rider down! \uD83E\uDAF4 Donkey saved! +5 ARC 🇺🇦', true);
          G.earnArcoin(5, 'Donkey saved');
          // Donkey bray SFX
          (function() {
            var ac = G.getACtx(), t = ac.currentTime;
            [220, 180, 200, 165].forEach(function(f, i) {
              var o = ac.createOscillator(), g2 = ac.createGain();
              o.type = 'triangle';
              o.frequency.setValueAtTime(f, t + i * 0.1);
              o.frequency.exponentialRampToValueAtTime(f * 0.6, t + i * 0.1 + 0.18);
              g2.gain.setValueAtTime(0.28, t + i * 0.1);
              g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.22);
              o.connect(g2); g2.connect(G.getMaster()); o.start(t + i*0.1); o.stop(t + i*0.1 + 0.25);
            });
          })();
          return true; // handled
        }
        return false; // donkey hit when already freed — ignore
      });
    };

    // Patch killZombieEl to check for donkey override FIRST
    var _origKill = G.killZombieEl;
    G.killZombieEl = function($z, x, y, h, gn) {
      var override = $z.data('_donkeyKillOverride');
      if (override && override()) return; // rider killed; donkey runs free
      _origKill($z, x, y, h, gn);
    };
    // Also patch applyZombieDmg so it uses the new killZombieEl
    var _origApply = G.applyZombieDmg;
    G.applyZombieDmg = function($z, d, x, y, h, gn) {
      return _origApply($z, d, x, y, h, gn);
    };


    /* ─────────────────────────────────────────────────────
       PROCEDURAL SNIPER (wave 3+) — slow, long-range, high damage
    ───────────────────────────────────────────────────── */
    var _sniperUniforms = ['#2e3c1a','#1e2c0a','#3a4e20','#2a3810'];
    var _sniperGhillie  = ['#4a5c2a','#3a4e1e','#5a6c3a','#445828'];

    function _makeSniperSvg(uid) {
      var uni   = _sniperUniforms[uid % _sniperUniforms.length];
      var gh    = _sniperGhillie[uid % _sniperGhillie.length];
      var skin  = _solSkins[uid % _solSkins.length];
      var prone = Math.random() > 0.5;

      if (prone) {
        // Prone/crouching sniper — wider, shorter
        return '<svg class="sniper-svg" width="220" height="110" viewBox="0 0 110 55" xmlns="http://www.w3.org/2000/svg">'
          + '<ellipse cx="55" cy="38" rx="32" ry="12" fill="' + uni + '"/>'
          + '<ellipse cx="55" cy="36" rx="30" ry="10" fill="' + gh + '" opacity="0.6"/>'
          + '<ellipse cx="30" cy="35" rx="10" ry="8" fill="' + skin + '"/>'
          + '<circle cx="26" cy="34" r="1.5" fill="#1a1a0a"/>'
          + '<rect x="18" y="32" width="6" height="2" rx="1" fill="#3a3a3a"/>'  // scope eye
          + '<rect x="0" y="31" width="45" height="3" rx="1.5" fill="#2a1a0a"/>'  // SVD barrel
          + '<rect x="2" y="28" width="8" height="5" rx="1" fill="#3a3a3a"/>'  // scope
          + '<rect x="20" y="34" width="5" height="6" rx="1" fill="#1a1a1a"/>'  // SVD mag
          + '<rect x="60" y="42" width="18" height="7" rx="3" fill="' + uni + '"/>'
          + '<rect x="78" y="45" width="7" height="4" rx="2" fill="#1a1a1a"/>'
          + '<rect x="85" y="42" width="18" height="7" rx="3" fill="' + uni + '"/>'
          + '<rect x="103" y="45" width="7" height="4" rx="2" fill="#1a1a1a"/>'
          + '</svg>'
          + '<div class="sol-muzzle" style="left:-12px;top:28px">🔥</div>';
      }
      // Standing sniper
      return '<svg class="sniper-svg" width="160" height="260" viewBox="0 0 52 88" xmlns="http://www.w3.org/2000/svg">'
        + '<g class="sol-leg-l" style="transform-origin:17px 55px"><rect x="13" y="55" width="8" height="25" rx="3.5" fill="' + uni + '"/><rect x="12" y="77" width="10" height="5" rx="2" fill="#1a1a1a"/></g>'
        + '<g class="sol-leg-r" style="transform-origin:28px 55px"><rect x="24" y="55" width="8" height="25" rx="3.5" fill="' + uni + '"/><rect x="23" y="77" width="10" height="5" rx="2" fill="#1a1a1a"/></g>'
        + '<rect x="12" y="30" width="28" height="28" rx="4" fill="' + uni + '"/>'
        // Ghillie strips
        + '<rect x="10" y="34" width="4" height="12" rx="1" fill="' + gh + '" opacity="0.7"/>'
        + '<rect x="38" y="36" width="4" height="10" rx="1" fill="' + gh + '" opacity="0.7"/>'
        + '<rect x="14" y="28" width="3" height="8" rx="1" fill="' + gh + '" opacity="0.5"/>'
        + '<rect x="12" y="52" width="28" height="5" rx="2" fill="#1a1a1a"/>'
        + '<g class="sol-arm-l" style="transform-origin:12px 36px"><rect x="2" y="32" width="12" height="6" rx="3" fill="' + uni + '"/><rect x="1" y="33" width="4" height="4" rx="2" fill="' + skin + '"/></g>'
        + '<g class="sol-arm-r" style="transform-origin:40px 36px"><rect x="38" y="32" width="12" height="6" rx="3" fill="' + uni + '"/>'
        // SVD Dragunov (longer than AK)
        + '<rect x="34" y="26" width="24" height="4" rx="1" fill="#2a1a0a"/>'
        + '<rect x="54" y="27" width="12" height="2.5" rx="1" fill="#333"/>'
        + '<rect x="40" y="24" width="8" height="3" rx="1" fill="#4a4a4a"/>' // PSO scope
        + '<rect x="38" y="30" width="4" height="6" rx="1" fill="#1a1a1a"/>'
        + '</g>'
        + '<ellipse cx="26" cy="22" rx="12" ry="13" fill="' + skin + '"/>'
        // Hood/ghillie hat
        + '<path d="M14 20 Q26 6 38 20 L36 24 Q26 10 16 24 Z" fill="' + gh + '"/>'
        + '<rect x="12" y="18" width="28" height="4" rx="2" fill="' + gh + '"/>'
        + '<circle cx="22" cy="23" r="1.8" fill="#2a1a0a"/>'
        + '<circle cx="30" cy="23" r="1.8" fill="#2a1a0a"/>'
        + '</svg>'
        + '<div class="sol-muzzle" style="right:-12px;top:24px">🔥</div>';
    }

    var _sniperUid = 0;
    window.ARC_GAME.spawnSniper = function() {
      var G = window.ARC_GAME;
      if ((G.wave || 1) < 2) return; // snipers from wave 2+
      var uid     = _sniperUid++;
      var cw      = G.$canves.width();
      var ch      = G.$canves.height();
      var side    = Math.random() > 0.5 ? 'left' : 'right';
      var fromLeft = (side === 'left');
      var speed   = (0.5 + Math.random() * 0.6 + (G.wave * 0.15)); // slow movers
      var strength = 2 + Math.floor(G.wave * 1.5); // tougher
      var groundY = ch * 0.50 + Math.random() * ch * 0.15;
      var prone   = Math.random() > 0.5;
      var w = prone ? 220 : 160;
      var h = prone ? 110 : 260;

      var $sn = $('<div class="zombie proc-soldier proc-sniper" data-strength="' + strength + '" data-strength-max="' + strength + '">'
        + _makeSniperSvg(uid)
        + '<div class="strength-bar"></div>'
        + '</div>')
        .css({
          position: 'absolute',
          left: fromLeft ? (-w - 10) + 'px' : (cw + 10) + 'px',
          top:  (groundY - h) + 'px',
          width: w + 'px', height: h + 'px',
          zIndex: 8,
          transform: fromLeft ? 'scaleX(-1)' : 'scaleX(1)',
        });

      G.$canves.append($sn);

      var moveId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($sn.hasClass('killed') || !$.contains(document.body, $sn[0])) {
          clearInterval(moveId); clearInterval(shootId); return;
        }
        var curX = parseFloat($sn.css('left')) || 0;
        $sn.css('left', (curX + (fromLeft ? speed : -speed)) + 'px');
        if ((fromLeft && curX > cw + w + 20) || (!fromLeft && curX < -w - 20)) {
          clearInterval(moveId); clearInterval(shootId);
          G.damageShooter(4 + Math.floor(Math.random() * 4));
          $sn.remove();
        }
      }, 40);

      // Snipers shoot less often — visual + SFX only, damage on screen-cross
      var shootId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($sn.hasClass('killed') || !$.contains(document.body, $sn[0])) {
          clearInterval(shootId); return;
        }
        if (Math.random() < 0.25) {
          $sn.find('.sol-muzzle').addClass('active');
          setTimeout(function() { $sn.find('.sol-muzzle').removeClass('active'); }, 120);
          // Sniper shot SFX — deeper, louder
          (function() {
            var ac = G.getACtx(), t = ac.currentTime;
            var o = ac.createOscillator(), g2 = ac.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(180, t);
            o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
            g2.gain.setValueAtTime(0.14, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.connect(g2); g2.connect(G.getMaster()); o.start(t); o.stop(t + 0.22);
            var nb = ac.createBuffer(1, Math.floor(ac.sampleRate*0.06), ac.sampleRate);
            var nd = nb.getChannelData(0);
            for (var ii=0;ii<nd.length;ii++) nd[ii]=(Math.random()*2-1)*0.8;
            var ns = ac.createBufferSource(); ns.buffer = nb;
            var ng = ac.createGain(); ng.gain.setValueAtTime(0.3, t); ng.gain.linearRampToValueAtTime(0, t+0.06);
            ns.connect(ng); ng.connect(G.getMaster()); ns.start(t);
          })();
          // Visual-only: muzzle flash + SFX (damage dealt on screen-cross, not mid-walk)
        }
      }, 3500 + Math.random() * 2500);
    };


    /* ─────────────────────────────────────────────────────
       PROCEDURAL DRONE OPERATOR (wave 4+) — spawns mini FPV drones
    ───────────────────────────────────────────────────── */

    function _makeDroneOpSvg(uid) {
      var uni  = _solUniforms[uid % _solUniforms.length];
      var skin = _solSkins[uid % _solSkins.length];

      return '<svg class="droneop-svg" width="80" height="130" viewBox="0 0 52 88" xmlns="http://www.w3.org/2000/svg">'
        + '<g class="sol-leg-l" style="transform-origin:17px 55px"><rect x="13" y="55" width="8" height="25" rx="3.5" fill="' + uni + '"/><rect x="12" y="77" width="10" height="5" rx="2" fill="#1a1a1a"/></g>'
        + '<g class="sol-leg-r" style="transform-origin:28px 55px"><rect x="24" y="55" width="8" height="25" rx="3.5" fill="' + uni + '"/><rect x="23" y="77" width="10" height="5" rx="2" fill="#1a1a1a"/></g>'
        + '<rect x="12" y="30" width="28" height="28" rx="4" fill="' + uni + '"/>'
        + '<rect x="12" y="52" width="28" height="5" rx="2" fill="#1a1a1a"/>'
        // Antenna backpack
        + '<rect x="30" y="22" width="8" height="18" rx="2" fill="#3a3a3a"/>'
        + '<line x1="34" y1="22" x2="34" y2="12" stroke="#666" stroke-width="1.5"/>'
        + '<circle cx="34" cy="11" r="2" fill="#cc0000"/>'
        // Arms holding controller
        + '<g class="sol-arm-l" style="transform-origin:12px 40px"><rect x="4" y="38" width="10" height="5" rx="2.5" fill="' + uni + '"/><rect x="2" y="39" width="4" height="3" rx="1.5" fill="' + skin + '"/></g>'
        + '<g class="sol-arm-r" style="transform-origin:40px 40px"><rect x="38" y="38" width="10" height="5" rx="2.5" fill="' + uni + '"/><rect x="46" y="39" width="4" height="3" rx="1.5" fill="' + skin + '"/></g>'
        // Controller box
        + '<rect x="15" y="40" width="22" height="10" rx="3" fill="#2a2a2a"/>'
        + '<rect x="18" y="42" width="16" height="6" rx="1" fill="#004400"/>'  // screen glow
        + '<rect x="19" y="43" width="14" height="4" rx="1" fill="#00aa00" opacity="0.4"/>'
        // Head
        + '<ellipse cx="26" cy="22" rx="12" ry="13" fill="' + skin + '"/>'
        // Headset
        + '<rect x="13" y="19" width="4" height="8" rx="2" fill="#333"/>'
        + '<rect x="35" y="19" width="4" height="8" rx="2" fill="#333"/>'
        + '<path d="M15 19 Q26 14 37 19" stroke="#333" stroke-width="2" fill="none"/>'
        // Goggles
        + '<rect x="18" y="20" width="16" height="6" rx="3" fill="#2a3a1a"/>'
        + '<rect x="19" y="21" width="6" height="4" rx="1.5" fill="#4a6a2a" opacity="0.6"/>'
        + '<rect x="27" y="21" width="6" height="4" rx="1.5" fill="#4a6a2a" opacity="0.6"/>'
        // Cap (brim only)
        + '<rect x="14" y="14" width="24" height="5" rx="2.5" fill="' + uni + '"/>'
        + '</svg>';
    }

    var _droneOpUid = 0;
    window.ARC_GAME.spawnDroneOp = function() {
      var G = window.ARC_GAME;
      if ((G.wave || 1) < 3) return; // drone ops from wave 3+
      var uid     = _droneOpUid++;
      var cw      = G.$canves.width();
      var ch      = G.$canves.height();
      var fromLeft = Math.random() > 0.5;
      var speed   = (0.3 + Math.random() * 0.4 + (G.wave * 0.1)); // very slow — stays back
      var strength = 3 + G.wave;
      var groundY = ch * 0.55 + Math.random() * ch * 0.12;

      var $op = $('<div class="zombie proc-soldier proc-droneop" data-strength="' + strength + '" data-strength-max="' + strength + '">'
        + _makeDroneOpSvg(uid)
        + '<div class="strength-bar"></div>'
        + '</div>')
        .css({
          position: 'absolute',
          left: fromLeft ? '-90px' : (cw + 90) + 'px',
          top:  (groundY - 130) + 'px',
          width: '80px', height: '130px',
          zIndex: 8,
          transform: fromLeft ? 'scaleX(-1)' : 'scaleX(1)',
        });

      G.$canves.append($op);
      var _droneSent = false;

      var moveId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($op.hasClass('killed') || !$.contains(document.body, $op[0])) {
          clearInterval(moveId); clearInterval(droneId); return;
        }
        var curX = parseFloat($op.css('left')) || 0;
        $op.css('left', (curX + (fromLeft ? speed : -speed)) + 'px');

        // Launch one FPV drone when on-screen
        if (!_droneSent && curX > 50 && curX < cw - 50) {
          _droneSent = true;
          _launchMiniDrone(parseFloat($op.css('left')) + 34, parseFloat($op.css('top')) + 10);
        }

        if ((fromLeft && curX > cw + 110) || (!fromLeft && curX < -110)) {
          clearInterval(moveId); clearInterval(droneId);
          G.damageShooter(3 + Math.floor(Math.random() * 3));
          $op.remove();
        }
      }, 40);

      // Periodically launch drones
      var droneId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if ($op.hasClass('killed') || !$.contains(document.body, $op[0])) {
          clearInterval(droneId); return;
        }
        var opX = parseFloat($op.css('left')) || 0;
        if (opX > 20 && opX < cw - 20 && Math.random() < 0.35) {
          _launchMiniDrone(opX + 34, parseFloat($op.css('top')) + 10);
        }
      }, 5000 + Math.random() * 3000);
    };

    // Mini FPV drone — flies toward player position, explodes on contact
    function _launchMiniDrone(startX, startY) {
      var G = window.ARC_GAME;
      var cw  = G.$canves.width();

      var $drone = $('<div class="fpv-mini-drone" style="position:absolute;z-index:410;font-size:16px;filter:drop-shadow(0 0 4px #00ccff);">🛩️</div>')
        .css({ left: startX + 'px', top: startY + 'px' });
      G.$canves.append($drone);

      // Drone buzzing SFX
      var ac = G.getACtx(), t = ac.currentTime;
      var osc = ac.createOscillator(), gn = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(660, t + 1.5);
      gn.gain.setValueAtTime(0.04, t);
      gn.gain.linearRampToValueAtTime(0.08, t + 1.0);
      gn.gain.linearRampToValueAtTime(0, t + 2.0);
      osc.connect(gn); gn.connect(G.getMaster()); osc.start(t); osc.stop(t + 2.0);

      var targetX = 60; // player is roughly at left side
      var droneSpeed = 3 + Math.random() * 2;
      var dY = -1.5 - Math.random(); // slight upward arc

      var dMoveId = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        if (!$.contains(document.body, $drone[0])) { clearInterval(dMoveId); return; }
        var cx = parseFloat($drone.css('left')) || 0;
        var cy = parseFloat($drone.css('top')) || 0;
        cx -= droneSpeed;
        cy += dY;
        $drone.css({ left: cx + 'px', top: cy + 'px' });

        // Hit player zone
        if (cx < 80) {
          clearInterval(dMoveId);
          G.damageShooter(3 + Math.floor(Math.random() * 3));
          $drone.text('💥').css({ fontSize:'24px', transition:'all 0.3s', opacity:0, transform:'scale(2)' });
          setTimeout(function() { $drone.remove(); }, 350);
          if (window.ARC_GAME.spawnDebris) {
            window.ARC_GAME.spawnDebris(cx, cy);
          }
        }
        // Escaped off screen
        if (cx < -50 || cy < -50 || cy > G.$canves.height() + 50) {
          clearInterval(dMoveId); $drone.remove();
        }
      }, 30);

      // Clickable — player can shoot down the drone
      $drone.on('click.fpvmini', function(e) {
        e.stopPropagation();
        clearInterval(dMoveId);
        G.earnArcoin(2, 'FPV drone shot down');
        G.shooterSpeech('🎯 FPV drone destroyed! +2 ARC', true);
        $drone.text('💥').css({ fontSize:'24px', transition:'all 0.3s', opacity:0, transform:'scale(2)' });
        setTimeout(function() { $drone.remove(); }, 350);
      });
    }


    /* ─────────────────────────────────────────────────────
       SPAWN SCHEDULE — integrate with wave spawning
    ───────────────────────────────────────────────────── */
    var _extraSpawnInterval = null;

    function _startExtraSpawning() {
      if (_extraSpawnInterval) return;
      _extraSpawnInterval = setInterval(function() {
        if (!G.gameActive || G.gamePaused) return;
        var w = G.wave || 1;
        var r = Math.random();
        if (r < 0.25) {
          window.ARC_GAME.spawnSoldier();
        } else if (r < 0.45) {
          window.ARC_GAME.spawnDonkeyRider();
        } else if (r < 0.65 && w >= 2) {
          window.ARC_GAME.spawnSniper();
        } else if (r < 0.78 && w >= 3) {
          window.ARC_GAME.spawnDroneOp();
        }
        // Random smoke puffs from battlefield
        if (Math.random() < 0.4 && window.ARC_GAME.spawnSmoke) {
          var cw2 = G.$canves.width(), ch2 = G.$canves.height();
          window.ARC_GAME.spawnSmoke(Math.random() * cw2, ch2 * 0.4 + Math.random() * ch2 * 0.2);
        }
      }, 2800);
    }

    function _stopExtraSpawning() {
      if (_extraSpawnInterval) { clearInterval(_extraSpawnInterval); _extraSpawnInterval = null; }
      if (_dustInterval) { clearInterval(_dustInterval); _dustInterval = null; }
      if (_birdInterval) { clearInterval(_birdInterval); _birdInterval = null; }
      _stopParticles();
      G.$canves.find('.proc-soldier,.proc-donkey,.proc-sniper,.proc-droneop,.fpv-mini-drone').remove();
    }

    // Hook into game state by watching for wave changes
    var _lastWave = 0;
    var _waveWatcher = setInterval(function() {
      var w = G.wave;
      if (G.gameActive && !G.gamePaused && w > 0 && w !== _lastWave) {
        _lastWave = w;
        _startExtraSpawning();
      }
      if (!G.gameActive && _extraSpawnInterval) {
        _stopExtraSpawning();
        _lastWave = 0;
      }
    }, 800);
    // Expose cleanup so main.js endGame() can stop the poll
    G._stopEngineExtras = function() {
      if (_waveWatcher) { clearInterval(_waveWatcher); _waveWatcher = null; }
      _stopExtraSpawning();
      _lastWave = 0;
    };
    G._startEngineExtras = function() {
      if (!_waveWatcher) {
        _waveWatcher = setInterval(function() {
          var w = G.wave;
          if (G.gameActive && !G.gamePaused && w > 0 && w !== _lastWave) {
            _lastWave = w;
            _startExtraSpawning();
          }
          if (!G.gameActive && _extraSpawnInterval) {
            _stopExtraSpawning();
            _lastWave = 0;
          }
        }, 800);
      }
    };


    /* ─────────────────────────────────────────────────────
       ENHANCED SKILLS SECTION — kill stats + ARC conversion
       Inject into buildInventory via DOM patch
    ───────────────────────────────────────────────────── */

    // Track extended kill stats via DOM observation
    var _killStats = {
      headshots: 0, nutshots: 0, combos: 0, soldiers: 0, donkeys: 0,
      arcFromKills: 0, arcFromWaves: 0, arcFromSpin: 0,
    };

    // Watch for HEADSHOT and NUT SHOT speech to count them
    var _headshotObs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        if (m.type === 'childList') {
          var el = document.getElementById('shooter-speech');
          if (el) {
            var txt = el.textContent || '';
            if (txt.indexOf('HEADSHOT') >= 0) _killStats.headshots++;
            if (txt.indexOf('NUT SHOT') >= 0) _killStats.nutshots++;
            if (txt.indexOf('COMBO') >= 0)    _killStats.combos++;
            if (txt.indexOf('SAVED') >= 0)    _killStats.donkeys++;
          }
        }
      });
    });
    var _speechEl = document.getElementById('shooter-speech');
    if (_speechEl) _headshotObs.observe(_speechEl, { childList: true, subtree: true, characterData: true });

    // Expose kill stats for buildInventory enhancement
    window.ARC_GAME.killStats = _killStats;

    // Inject extra HTML into skills section after buildInventory runs
    // We use a MutationObserver on #inv-sec-skills
    var _skillsObs = new MutationObserver(function() {
      var $sec = $('#inv-sec-skills');
      if (!$sec.length || $sec.find('.inv-killstats-grid').length) return;
      var ks = window.ARC_GAME.killStats || {};
      var totalKills  = (window.ARC_GAME.zombieKilled || 0);
      var headshotPct = totalKills > 0 ? Math.round((ks.headshots||0) / totalKills * 100) : 0;
      var arcEarned   = parseInt(localStorage.getItem('arc_balance') || '0');
      var creditsEarned = Math.floor(arcEarned * 2.4); // approximate conv

      var statsHtml = '<div class="inv-killstats-grid">'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + totalKills + '</div><div class="inv-ks-lbl">Total Kills</div></div>'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + (ks.headshots||0) + '</div><div class="inv-ks-lbl">Headshots (' + headshotPct + '%)</div></div>'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + (ks.nutshots||0) + '</div><div class="inv-ks-lbl">Nut Shots 🥜</div></div>'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + (ks.combos||0) + '</div><div class="inv-ks-lbl">Combo Kills</div></div>'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + (ks.donkeys||0) + '</div><div class="inv-ks-lbl">Donkeys Saved 🫏</div></div>'
        + '<div class="inv-ks-card"><div class="inv-ks-val">' + arcEarned + '</div><div class="inv-ks-lbl">Total ARC Earned</div></div>'
        + '</div>'
        + '<div class="inv-arc-conv">'
        + '💰 <b>ARC ↔ In-Game Conversion</b><br>'
        + 'Every kill → +10‒250 score → spent as 💰 credits<br>'
        + 'Each wave cleared → +1 ARC automatically<br>'
        + 'Headshot → 3× XP &amp; +150 score → faster ARC threshold<br>'
        + 'Donkey saved → <b>+5 ARC</b> instant bonus 🫏<br>'
        + '1 ARC ≈ 2.4 💰 credits at current exchange rate<br>'
        + 'Current balance: <b>' + arcEarned + ' ARC</b> ≈ <b>' + creditsEarned + ' 💰</b>'
        + '</div>';

      $sec.find('.inv-skill-p2e-note').before(statsHtml);
    });
    var _obs_target = document.getElementById('inventory-panel');
    if (_obs_target) _skillsObs.observe(_obs_target, { childList: true, subtree: true });

  }); // end _waitBridge

})(jQuery);
