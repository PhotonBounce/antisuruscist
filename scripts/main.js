'use strict';

/* ═══ localStorage quota guard — prevents QuotaExceededError crashes ═══ */
(function() {
  var _orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k, v) {
    try { _orig(k, v); } catch(e) { console.warn('[ARC] Storage full, key:', k); }
  };
})();

/* Backend API base — auto-switches between local dev and Codespaces staging */
var _API_BASE = (function () {
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001';
  // Codespaces: replace the app port in the forwarded URL
  var base = location.origin.replace(/-\d+\.app\.github\.dev/, '-3001.app.github.dev');
  return base;
}());

/* ═══════════════════════════════════════════════════════════════
   ML TELEMETRY COLLECTOR — lightweight client-side analytics
   ═══════════════════════════════════════════════════════════════ */
var ARC_TELEMETRY = (function() {
  var _queue = [];
  var _flushTimer = null;
  var _sessionId = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  var _api = _API_BASE + '/api';

  function _send(path, data) {
    try {
      var headers = { 'Content-Type': 'application/json' };
      var anonId = localStorage.getItem('arc_anon_id');
      if (anonId) headers['x-anon-id'] = anonId;
      fetch(_api + path, { method: 'POST', headers: headers, body: JSON.stringify(data) }).catch(function(){});
    } catch(e) { /* silent */ }
  }

  function track(eventType, eventData) {
    _queue.push({ event_type: eventType, event_data: eventData, session_id: _sessionId });
    if (_queue.length >= 20) flush();
    if (!_flushTimer) _flushTimer = setTimeout(flush, 30000);
  }

  function flush() {
    if (!_queue.length) return;
    var batch = _queue.splice(0, 50);
    _send('/telemetry/batch', { events: batch });
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }

  function trackError(msg, stack, context) {
    _send('/telemetry/error', {
      error_msg: String(msg).slice(0, 500),
      error_stack: stack ? String(stack).slice(0, 2000) : undefined,
      url: location.href,
      user_agent: navigator.userAgent,
      context: context
    });
  }

  // Global error handler
  window.addEventListener('error', function(evt) {
    trackError(evt.message, evt.error ? evt.error.stack : (evt.filename + ':' + evt.lineno), 'window.onerror');
  });
  window.addEventListener('unhandledrejection', function(evt) {
    trackError(String(evt.reason), evt.reason && evt.reason.stack, 'unhandledrejection');
  });

  // Flush on page unload
  window.addEventListener('beforeunload', function() {
    if (_queue.length) {
      try { navigator.sendBeacon(_api + '/telemetry/batch', JSON.stringify({ events: _queue })); } catch(e) {}
    }
  });

  return { track: track, flush: flush, trackError: trackError, sessionId: _sessionId };
})();

/* ============================================================
   ZOMBIE MAYHEM — pro-UA edition v4c_1
   Web Audio API (no external sound library)
   All features: parallax, M-16 auto/semi, revolver cylinder,
   programmatic music/sounds, Ukrainian military UI
   ============================================================ */

$(document).ready(function () {

  // ── Version / timestamp ──────────────────────────────────────
  function _stampVersion() {
    var now = new Date();
    var pad = function(n){ return n < 10 ? '0'+n : n; };
    var ts = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())
             +' '+pad(now.getHours())+':'+pad(now.getMinutes());
    var ver = 'Anti-Ruscist v5.25 \u2014 ' + ts;
    var bt = document.getElementById('build-ts'); if (bt) bt.innerHTML = ver;
    var ov = document.getElementById('version-overlay'); if (ov) ov.innerHTML = ver;
    var ft = document.getElementById('footer-ts'); if (ft) ft.innerHTML = ver;
  }
  _stampVersion();
  var _stampInt = setInterval(_stampVersion, 60000);

  // ── BATCH 100 Milestone Celebration (removed — outdated) ──────

  // ── Server Game Config (admin-controllable) ─────────────────────
  // Fetches live config from server. Falls back to hardcoded defaults.
  window._ARC_GAME_CFG = null;
  (function loadGameConfig() {
    if (window.ARC_API && typeof window.ARC_API.fetchGameConfig === 'function') {
      window.ARC_API.fetchGameConfig().then(function(cfg) {
        if (cfg) window._ARC_GAME_CFG = cfg;
      }).catch(function(){});
    }
  })();
  // Helper to read a config value with fallback
  function gcfg(category, key, fallback) {
    if (window._ARC_GAME_CFG && window._ARC_GAME_CFG[category] && window._ARC_GAME_CFG[category][key] !== undefined) {
      return window._ARC_GAME_CFG[category][key];
    }
    return fallback;
  }

  // ── Auto-sync: connect game ↔ server ───────────────────────────
  if (window.ARC_API && typeof window.ARC_API.startAutoSync === 'function') {
    window.ARC_API.startAutoSync();
  }

  // ── i18n — Desktop Language System ─────────────────────────────
  var STRINGS = {
    en: {
      ruscismDef: 'Rashism (ruscism, Russian fascism) \u2014 a term used by researchers, politicians and journalists to describe the ideology, social practices and political regime in Russia under Vladimir Putin. \u201CRashism\u201D underscores the aggressive nature of the political system, expansionist foreign policy, ultranationalism, cult of personality and chauvinism.',
      startBtn: 'Kill Ruscists Now!',
      gameOver: 'Game <div>Over</div>',
      youWon: 'You <div>Won</div>',
      restartHint: 'Click Here to Restart',
      newGame: '\ud83d\udd04 NEW GAME'
    },
    ua: {
      ruscismDef: '\u0420\u0430\u0448\u0438\u0437\u043c (\u0440\u0443\u0441\u0438\u0437\u043c, \u0440\u043e\u0441\u0456\u0439\u0441\u044c\u043a\u0438\u0439 \u0444\u0430\u0448\u0438\u0437\u043c) \u2014 \u0442\u0435\u0440\u043c\u0456\u043d, \u0449\u043e \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f \u0434\u043e\u0441\u043b\u0456\u0434\u043d\u0438\u043a\u0430\u043c\u0438, \u043f\u043e\u043b\u0456\u0442\u0438\u043a\u0430\u043c\u0438 \u0442\u0430 \u0436\u0443\u0440\u043d\u0430\u043b\u0456\u0441\u0442\u0430\u043c\u0438 \u0434\u043b\u044f \u043e\u043f\u0438\u0441\u0443 \u0456\u0434\u0435\u043e\u043b\u043e\u0433\u0456\u0457, \u0441\u043e\u0446\u0456\u0430\u043b\u044c\u043d\u0438\u0445 \u043f\u0440\u0430\u043a\u0442\u0438\u043a \u0442\u0430 \u043f\u043e\u043b\u0456\u0442\u0438\u0447\u043d\u043e\u0433\u043e \u0440\u0435\u0436\u0438\u043c\u0443 \u0420\u043e\u0441\u0456\u0457 \u0437 \u043f\u0440\u0438\u0445\u043e\u0434\u043e\u043c \u0434\u043e \u0432\u043b\u0430\u0434\u0438 \u0412\u043e\u043b\u043e\u0434\u0438\u043c\u0438\u0440\u0430 \u041f\u0443\u0442\u0456\u043d\u0430. \u00ab\u0420\u0430\u0448\u0438\u0437\u043c\u00bb \u043f\u0456\u0434\u043a\u0440\u0435\u0441\u043b\u044e\u0454 \u0430\u0433\u0440\u0435\u0441\u0438\u0432\u043d\u0438\u0439 \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440 \u043f\u043e\u043b\u0456\u0442\u0438\u0447\u043d\u043e\u0433\u043e \u043b\u0430\u0434\u0443, \u0435\u043a\u0441\u043f\u0430\u043d\u0441\u0456\u043e\u043d\u0456\u0441\u0442\u0441\u044c\u043a\u0443 \u0437\u043e\u0432\u043d\u0456\u0448\u043d\u044e \u043f\u043e\u043b\u0456\u0442\u0438\u043a\u0443, \u0443\u043b\u044c\u0442\u0440\u0430\u043d\u0430\u0446\u0456\u043e\u043d\u0430\u043b\u0456\u0437\u043c, \u043a\u0443\u043b\u044c\u0442 \u043e\u0441\u043e\u0431\u0438\u0441\u0442\u043e\u0441\u0442\u0456 \u0442\u0430 \u0448\u043e\u0432\u0456\u043d\u0456\u0437\u043c.',
      startBtn: '\u0412\u0431\u0438\u0439 \u0440\u0430\u0448\u0438\u0441\u0442\u0456\u0432 \u0437\u0430\u0440\u0430\u0437!',
      gameOver: '\u0413\u0440\u0443 <div>\u0437\u0430\u043a\u0456\u043d\u0447\u0435\u043d\u043e</div>',
      youWon: '\u0422\u0438 <div>\u043f\u0435\u0440\u0435\u043c\u0456\u0433</div>',
      restartHint: '\u041d\u0430\u0442\u0438\u0441\u043d\u0438 \u0449\u043e\u0431 \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0438',
      newGame: '\ud83d\udd04 \u041d\u041e\u0412\u0410 \u0413\u0420\u0410'
    },
    de: {
      ruscismDef: 'Raschismus (Ruszismus, russischer Faschismus) \u2014 ein Begriff, der von Forschern, Politikern und Journalisten verwendet wird, um die Ideologie, sozialen Praktiken und das politische Regime Russlands unter Wladimir Putin zu beschreiben. \u00abRaschismus\u00bb betont den aggressiven Charakter des politischen Systems, die expansionistische Au\u00dfenpolitik, Ultranationalismus, Personenkult und Chauvinismus.',
      startBtn:'T\u00f6te Ruschisten jetzt!',gameOver:'Spiel <div>vorbei</div>',youWon:'Du hast <div>gewonnen</div>',restartHint:'Klicke zum Neustart',newGame:'\ud83d\udd04 NEUES SPIEL'
    },
    fr: {
      ruscismDef: 'Rachisme (ruscisme, fascisme russe) \u2014 terme utilis\u00e9 par des chercheurs, politiciens et journalistes pour d\u00e9crire l\u2019id\u00e9ologie, les pratiques sociales et le r\u00e9gime politique de la Russie sous Vladimir Poutine. Le \u00ab\u202frachisme\u202f\u00bb souligne le caract\u00e8re agressif du syst\u00e8me politique, la politique \u00e9trang\u00e8re expansionniste, l\u2019ultranationalisme, le culte de la personnalit\u00e9 et le chauvinisme.',
      startBtn:'Tuez les ruscistes!',gameOver:'Jeu <div>termin\u00e9</div>',youWon:'Vous avez <div>gagn\u00e9</div>',restartHint:'Cliquez pour recommencer',newGame:'\ud83d\udd04 NOUVEAU JEU'
    },
    es: {
      ruscismDef: 'Rashismo (ruscismo, fascismo ruso) \u2014 t\u00e9rmino utilizado por investigadores, pol\u00edticos y periodistas para describir la ideolog\u00eda, las pr\u00e1cticas sociales y el r\u00e9gimen pol\u00edtico de Rusia bajo Vlad\u00edmir Putin. El \u00abrashismo\u00bb destaca el car\u00e1cter agresivo del sistema pol\u00edtico, la pol\u00edtica exterior expansionista, el ultranacionalismo, el culto a la personalidad y el chovinismo.',
      startBtn:'\u00a1Mata ruscistas ahora!',gameOver:'Juego <div>terminado</div>',youWon:'Has <div>ganado</div>',restartHint:'Haz clic para reiniciar',newGame:'\ud83d\udd04 NUEVO JUEGO'
    },
    pl: {
      ruscismDef: 'Raszyzm (ruscyzm, rosyjski faszyzm) \u2014 termin u\u017cywany przez badaczy, polityk\u00f3w i dziennikarzy do opisania ideologii, praktyk spo\u0142ecznych i re\u017cimu politycznego Rosji pod rz\u0105dami W\u0142adimira Putina. \u00abRaszyzm\u00bb podkre\u015bla agresywny charakter ustroju politycznego, ekspansjonistyczn\u0105 polityk\u0119 zagraniczn\u0105, ultranacjonalizm, kult jednostki i szowinizm.',
      startBtn:'Zabij rusist\u00f3w teraz!',gameOver:'Koniec <div>gry</div>',youWon:'Wygra\u0142e\u015b<div>!</div>',restartHint:'Kliknij aby zrestartowa\u0107',newGame:'\ud83d\udd04 NOWA GRA'
    },
    pt: {
      ruscismDef: 'Rashismo (ruscismo, fascismo russo) \u2014 termo utilizado por investigadores, pol\u00edticos e jornalistas para descrever a ideologia, as pr\u00e1ticas sociais e o regime pol\u00edtico da R\u00fassia sob Vladimir Putin. O \u00abrashismo\u00bb sublinha o car\u00e1cter agressivo do sistema pol\u00edtico, a pol\u00edtica externa expansionista, o ultranacionalismo, o culto da personalidade e o chauvinismo.',
      startBtn:'Mate os ruscistas agora!',gameOver:'Fim de <div>jogo</div>',youWon:'Voc\u00ea <div>venceu</div>',restartHint:'Clique para reiniciar',newGame:'\ud83d\udd04 NOVO JOGO'
    },
    it: {
      ruscismDef: 'Rashismo (ruscismo, fascismo russo) \u2014 termine usato da ricercatori, politici e giornalisti per descrivere l\u2019ideologia, le pratiche sociali e il regime politico della Russia sotto Vladimir Putin. Il \u00abrashismo\u00bb sottolinea il carattere aggressivo del sistema politico, la politica estera espansionistica, l\u2019ultranazionalismo, il culto della personalit\u00e0 e lo sciovinismo.',
      startBtn:'Uccidi i ruscisti ora!',gameOver:'Gioco <div>finito</div>',youWon:'Hai <div>vinto</div>',restartHint:'Clicca per ricominciare',newGame:'\ud83d\udd04 NUOVO GIOCO'
    },
    nl: {
      ruscismDef: 'Rasjisme (ruscisme, Russisch fascisme) \u2014 een term gebruikt door onderzoekers, politici en journalisten om de ideologie, sociale praktijken en het politieke regime van Rusland onder Vladimir Poetin te beschrijven. \u00abRasjisme\u00bb benadrukt het agressieve karakter van het politieke stelsel, expansionistisch buitenlands beleid, ultranationalisme, persoonlijkheidscultus en chauvinisme.',
      startBtn:'Dood de ruschisten nu!',gameOver:'Spel <div>voorbij</div>',youWon:'Je hebt <div>gewonnen</div>',restartHint:'Klik om opnieuw te starten',newGame:'\ud83d\udd04 NIEUW SPEL'
    },
    cs: {
      ruscismDef: 'Ra\u0161ismus (ruscismus, rusk\u00fd fa\u0161ismus) \u2014 term\u00edn pou\u017e\u00edvan\u00fd v\u00fdzkumn\u00edky, politiky a novin\u00e1\u0159i k popisu ideologie, soci\u00e1ln\u00edch praktik a politick\u00e9ho re\u017eimu Ruska za Vladimira Putina. \u00abRa\u0161ismus\u00bb zd\u016fraz\u0148uje agresivn\u00ed charakter politick\u00e9ho syst\u00e9mu, expanzivn\u00ed zahrani\u010dn\u00ed politiku, ultranacionalismus, kult osobnosti a \u0161ovinismus.',
      startBtn:'Zabij ru\u0161isty te\u010f!',gameOver:'Konec <div>hry</div>',youWon:'Vyhr\u00e1l jsi<div>!</div>',restartHint:'Klikni pro restart',newGame:'\ud83d\udd04 NOV\u00c1 HRA'
    },
    ja: {
      ruscismDef: '\u30e9\u30b7\u30ba\u30e0\uff08\u30eb\u30b7\u30ba\u30e0\u3001\u30ed\u30b7\u30a2\u30fb\u30d5\u30a1\u30b7\u30ba\u30e0\uff09\u2014 \u7814\u7a76\u8005\u3001\u653f\u6cbb\u5bb6\u3001\u30b8\u30e3\u30fc\u30ca\u30ea\u30b9\u30c8\u304c\u30a6\u30e9\u30b8\u30fc\u30df\u30eb\u30fb\u30d7\u30fc\u30c1\u30f3\u653f\u6a29\u4e0b\u306e\u30ed\u30b7\u30a2\u306e\u30a4\u30c7\u30aa\u30ed\u30ae\u30fc\u3001\u793e\u4f1a\u7684\u6163\u884c\u3001\u653f\u6cbb\u4f53\u5236\u3092\u8868\u3059\u305f\u3081\u306b\u4f7f\u3046\u7528\u8a9e\u3002\u300c\u30e9\u30b7\u30ba\u30e0\u300d\u306f\u653f\u6cbb\u4f53\u5236\u306e\u653b\u6483\u7684\u6027\u8cea\u3001\u62e1\u5f35\u4e3b\u7fa9\u7684\u5916\u4ea4\u653f\u7b56\u3001\u8d85\u56fd\u5bb6\u4e3b\u7fa9\u3001\u500b\u4eba\u5d07\u62dd\u3001\u6392\u5916\u4e3b\u7fa9\u3092\u5f37\u8abf\u3059\u308b\u3002',
      startBtn:'\u30eb\u30b7\u30b9\u30c8\u3092\u5012\u305b\uff01',gameOver:'\u30b2\u30fc\u30e0<div>\u30aa\u30fc\u30d0\u30fc</div>',youWon:'<div>\u52dd\u5229\uff01</div>',restartHint:'\u30af\u30ea\u30c3\u30af\u3057\u3066\u30ea\u30b9\u30bf\u30fc\u30c8',newGame:'\ud83d\udd04 \u30cb\u30e5\u30fc\u30b2\u30fc\u30e0'
    },
    ko: {
      ruscismDef: '\ub77c\uc2dc\uc998 (\ub8e8\uc2dc\uc998, \ub7ec\uc2dc\uc544 \ud30c\uc2dc\uc998) \u2014 \uc5f0\uad6c\uc790, \uc815\uce58\uc778, \uc5b8\ub860\uc778\uc774 \ube14\ub77c\ub514\ubbf8\ub974 \ud478\ud2f4 \uce58\ud558 \ub7ec\uc2dc\uc544\uc758 \uc774\ub370\uc62c\ub85c\uae30, \uc0ac\ud68c\uc801 \uad00\ud589 \ubc0f \uc815\uce58 \uccb4\uc81c\ub97c \uc124\uba85\ud558\uae30 \uc704\ud574 \uc0ac\uc6a9\ud558\ub294 \uc6a9\uc5b4. \u2018\ub77c\uc2dc\uc998\u2019\uc740 \uc815\uce58 \uccb4\uc81c\uc758 \uacf5\uaca9\uc801 \uc131\uaca9, \ud325\ucc3d\uc8fc\uc758 \uc678\uad50 \uc815\ucc45, \uadf9\ub2e8\uc801 \ubbfc\uc871\uc8fc\uc758, \uac1c\uc778\uc22d\ubc30, \uc1fc\ube44\ub2c8\uc998\uc744 \uac15\uc870\ud55c\ub2e4.',
      startBtn:'\ub8e8\uc2dc\uc2a4\ud2b8\ub97c \uc8fd\uc5ec\ub77c!',gameOver:'\uac8c\uc784 <div>\uc624\ubc84</div>',youWon:'<div>\uc2b9\ub9ac!</div>',restartHint:'\ud074\ub9ad\ud558\uc5ec \uc7ac\uc2dc\uc791',newGame:'\ud83d\udd04 \uc0c8 \uac8c\uc784'
    },
    zh: {
      ruscismDef: '\u62c9\u897f\u4e3b\u4e49\uff08\u9c81\u897f\u4e3b\u4e49\uff0c\u4fc4\u7f57\u65af\u6cd5\u897f\u65af\u4e3b\u4e49\uff09\u2014\u2014\u7814\u7a76\u4eba\u5458\u3001\u653f\u6cbb\u5bb6\u548c\u8bb0\u8005\u7528\u6765\u63cf\u8ff0\u5f17\u62c9\u57fa\u7c73\u5c14\u00b7\u666e\u4eac\u6267\u653f\u4e0b\u4fc4\u7f57\u65af\u7684\u610f\u8bc6\u5f62\u6001\u3001\u793e\u4f1a\u5b9e\u8df5\u548c\u653f\u6cbb\u4f53\u5236\u7684\u672f\u8bed\u3002\u300c\u62c9\u897f\u4e3b\u4e49\u300d\u5f3a\u8c03\u653f\u6cbb\u4f53\u5236\u7684\u4fb5\u7565\u6027\u8d28\u3001\u6269\u5f20\u4e3b\u4e49\u5916\u4ea4\u653f\u7b56\u3001\u6781\u7aef\u6c11\u65cf\u4e3b\u4e49\u3001\u4e2a\u4eba\u5d07\u62dc\u548c\u6c99\u6587\u4e3b\u4e49\u3002',
      startBtn:'\u6d88\u706d\u9c81\u897f\u65af\u7279\uff01',gameOver:'\u6e38\u620f<div>\u7ed3\u675f</div>',youWon:'\u4f60<div>\u8d62\u4e86</div>',restartHint:'\u70b9\u51fb\u91cd\u65b0\u5f00\u59cb',newGame:'\ud83d\udd04 \u65b0\u6e38\u620f'
    },
    tr: {
      ruscismDef: 'Ra\u015fizm (ruscizm, Rus fa\u015fizmi) \u2014 ara\u015ft\u0131rmac\u0131lar, politikac\u0131lar ve gazeteciler taraf\u0131ndan Vladimir Putin y\u00f6netimindeki Rusya\u2019n\u0131n ideolojisini, toplumsal pratiklerini ve siyasi rejimini tan\u0131mlamak i\u00e7in kullan\u0131lan terim. \u00abRa\u015fizm\u00bb siyasi yap\u0131n\u0131n sald\u0131rgan karakterini, yay\u0131lmac\u0131 d\u0131\u015f politikay\u0131, a\u015f\u0131r\u0131 milliyet\u00e7ili\u011fi, ki\u015fi k\u00fclt\u00fcn\u00fc ve \u015fovenizmi vurgular.',
      startBtn:'Ru\u015fcistleri \u00f6ld\u00fcr!',gameOver:'Oyun <div>bitti</div>',youWon:'<div>Kazand\u0131n!</div>',restartHint:'Yeniden ba\u015flatmak i\u00e7in t\u0131kla',newGame:'\ud83d\udd04 YEN\u0130 OYUN'
    },
    sv: {
      ruscismDef: 'Rashism (ruscism, rysk fascism) \u2014 en term anv\u00e4nd av forskare, politiker och journalister f\u00f6r att beskriva ideologin, sociala praktiker och den politiska regimen i Ryssland under Vladimir Putin. \u00abRashism\u00bb understryker det politiska systemets aggressiva karakt\u00e4r, expansionistisk utrikespolitik, ultranationalism, personkult och chauvinism.',
      startBtn:'D\u00f6da ruscisterna nu!',gameOver:'Spelet <div>slut</div>',youWon:'Du <div>vann</div>',restartHint:'Klicka f\u00f6r att starta om',newGame:'\ud83d\udd04 NYTT SPEL'
    }
  };
  // ── i18n — UI Translations (menu, HUD, inventory, callins) ──────────
  var UI_STRINGS = {
    en:{
      hudWave:'WAVE',hudScore:'SCORE',hudHryvni:'HRYVNI',hudKills:'KILLS',
      hudMenu:'MENU',hudCallIn:'CALL IN SUPPORT',hudShots:'shots for Ukraine',
      topMenu:'MAIN MENU',topGod:'GOD',topClose:'ESC \u00b7 SPACE',
      whHryvni:'HRYVNI',whArc:'ARC',whBestWave:'BEST WAVE',whTotalKills:'TOTAL KILLS',whWallet:'WALLET',
      navEarn:'EARN & DONATE',navHeroes:'HEROES',navArsenal:'ARSENAL',navAmmo:'AMMO',
      navMarket:'MARKET',navSell:'SELL',navExchange:'EXCHANGE',navCosmetics:'COSMETICS',
      navSkills:'SKILLS',nav21:'21',navCups:'CUPS',navMath:'MATH',navPool:'POOL',
      navArc:'ARC',navStaking:'STAKING',navTokenomics:'TOKENOMICS',navWallet:'WALLET',
      navPass:'PASS',navAchieve:'ACHIEVE',navMissions:'MISSIONS',navStats:'STATS',
      navPrestige:'PRESTIGE',navPvp:'PVP',navClan:'CLAN',navLeaders:'LEADERS',
      navSeason:'SEASON',navNews:'NEWS',navMemorial:'MEMORIAL',navProfile:'PROFILE',navAdmin:'ADMIN',
      ciArty:'ARTILLERY',ciDrones:'COMBAT DRONES',ciHimars:'H.I.M.A.R.S',
      ciBradley:'BRADLEY IFV',ciRover:'RECON ROVER',ciFiredrone:'FIRE DRONE',ciFpv:'FPV STRIKE',ciReady:'READY',
      secArsenal:'Arsenal',secArsenalSub:'Unlock upgrades for each weapon with your earned money',
      secAmmo:'Ammo Shop',secAmmoSub:'Each reload costs one magazine from your reserve \u2014 buy more here',
      secEarn:'Earn Anti-Ruscist Coin',secEarnSub:'Free methods to earn ARC \u2014 no spending required',
      secExchange:'Exchange',secExchangeSub:'Buy Money with crypto or convert ARC earnings',
      secArc:'Anti-Ruscist Coin (ARC) Ledger',secArcSub:'Play-to-earn \u00b7 1 ARC per wave cleared \u00b7 future Polygon ERC-20',
      secWallet:'Wallet',secWalletSub:'Connect MetaMask on Polygon to link your ARC balance on-chain',
      secSell:'Sell ARC \u2192 POL',secSellSub:'Request withdrawal of ARC to Polygon (POL)',
      secHeroes:'Ukrainian Defenders \u2014 Hero NFTs',secNews:'Ukraine War \u2014 Live News',secNewsSub:'Latest battlefield headlines from independent sources',
      wpRevolver:'Revolver',wpShotgun:'Shotgun',wpM16:'M-16',wpLmg:'LMG',wpClay:'Shit Thrower',
      wpGl:'Grenade Launcher',wpSniper:'Sniper Rifle',wpStugna:'Stugna-P AT',wpDroneBomb:'Drone Bomb',
      wpPanzerfaust:'Panzerfaust 3',wpPkm:'PKM LMG',wpAk12:'AK-12',wpMatador:'M4 Matador',
      uiEquip:'EQUIP',uiLocked:'LOCKED',uiActive:'ACTIVE',uiOwned:'OWNED',uiFree:'FREE',uiNew:'NEW',
      uiKeepKilling:'Keep killing to unlock \u2192',uiNoAmmo:'Unlock weapons first to buy ammo.',uiIntel:'FRONT LINE INTEL'
    },
    ua:{
      hudWave:'\u0425\u0412\u0418\u041b\u042f',hudScore:'\u0420\u0410\u0425\u0423\u041d\u041e\u041a',hudHryvni:'\u0413\u0420\u0418\u0412\u041d\u0406',hudKills:'\u0412\u0411\u0418\u0412\u0421\u0422\u0412\u0410',
      hudMenu:'\u041c\u0415\u041d\u042e',hudCallIn:'\u0412\u0418\u041a\u041b\u0418\u041a \u041f\u0406\u0414\u0422\u0420\u0418\u041c\u041a\u0418',hudShots:'\u043f\u043e\u0441\u0442\u0440\u0456\u043b\u0456\u0432 \u0437\u0430 \u0423\u043a\u0440\u0430\u0457\u043d\u0443',
      topMenu:'\u0413\u041e\u041b\u041e\u0412\u041d\u0415 \u041c\u0415\u041d\u042e',topGod:'\u0411\u041e\u0413',topClose:'ESC \u00b7 SPACE',
      whHryvni:'\u0413\u0420\u0418\u0412\u041d\u0406',whArc:'ARC',whBestWave:'\u041d\u0410\u0419\u041a\u0420. \u0425\u0412\u0418\u041b\u042f',whTotalKills:'\u0412\u0421\u042c\u041e\u0413\u041e \u0412\u0411\u0418\u0412\u0421\u0422\u0412',whWallet:'\u0413\u0410\u041c\u0410\u041d\u0415\u0426\u042c',
      navEarn:'\u0417\u0410\u0420\u041e\u0411\u0418 & \u0414\u041e\u041d\u0410\u0422',navHeroes:'\u0413\u0415\u0420\u041e\u0407',navArsenal:'\u0410\u0420\u0421\u0415\u041d\u0410\u041b',navAmmo:'\u041d\u0410\u0411\u041e\u0407',
      navMarket:'\u041c\u0410\u0413\u0410\u0417\u0418\u041d',navSell:'\u041f\u0420\u041e\u0414\u0410\u0422\u0418',navExchange:'\u041e\u0411\u041c\u0406\u041d',navCosmetics:'\u041a\u041e\u0421\u041c\u0415\u0422\u0418\u041a\u0410',
      navSkills:'\u041d\u0410\u0412\u0418\u0427\u041a\u0418',nav21:'21',navCups:'\u0427\u0410\u0428\u041a\u0418',navMath:'\u041c\u0410\u0422\u0415\u041c.',navPool:'\u041f\u0423\u041b',
      navArc:'ARC',navStaking:'\u0421\u0422\u0415\u0419\u041a\u0406\u041d\u0413',navTokenomics:'\u0422\u041e\u041a\u0415\u041d\u041e\u041c\u0406\u041a\u0410',navWallet:'\u0413\u0410\u041c\u0410\u041d\u0415\u0426\u042c',
      navPass:'\u041f\u0420\u041e\u041f\u0423\u0421\u041a',navAchieve:'\u0414\u041e\u0421\u042f\u0413\u041d.',navMissions:'\u041c\u0406\u0421\u0406\u0407',navStats:'\u0421\u0422\u0410\u0422\u0418\u0421\u0422.',
      navPrestige:'\u041f\u0420\u0415\u0421\u0422\u0418\u0416',navPvp:'PVP',navClan:'\u041a\u041b\u0410\u041d',navLeaders:'\u041b\u0406\u0414\u0415\u0420\u0418',
      navSeason:'\u0421\u0415\u0417\u041e\u041d',navNews:'\u041d\u041e\u0412\u0418\u041d\u0418',navMemorial:'\u041c\u0415\u041c\u041e\u0420\u0406\u0410\u041b',navProfile:'\u041f\u0420\u041e\u0424\u0406\u041b\u042c',navAdmin:'\u0410\u0414\u041c\u0406\u041d',
      ciArty:'\u0410\u0420\u0422\u0418\u041b\u0415\u0420\u0406\u042f',ciDrones:'\u0411\u041e\u0419\u041e\u0412\u0406 \u0414\u0420\u041e\u041d\u0418',ciHimars:'HIMARS',
      ciBradley:'\u0411\u0420\u0415\u0414\u041b\u0406 \u0411\u041c\u041f',ciRover:'\u0420\u041e\u0417\u0412\u0406\u0414. \u0420\u041e\u0412\u0415\u0420',ciFiredrone:'\u0412\u041e\u0413\u041d\u0415\u0412\u0418\u0419 \u0414\u0420\u041e\u041d',ciFpv:'FPV \u0423\u0414\u0410\u0420',ciReady:'\u0413\u041e\u0422\u041e\u0412\u041e',
      secArsenal:'\u0410\u0440\u0441\u0435\u043d\u0430\u043b',secArsenalSub:'\u0420\u043e\u0437\u0431\u043b\u043e\u043a\u0443\u0439\u0442\u0435 \u043f\u043e\u043a\u0440\u0430\u0449\u0435\u043d\u043d\u044f \u0437\u0431\u0440\u043e\u0457 \u0437\u0430 \u0437\u0430\u0440\u043e\u0431\u043b\u0435\u043d\u0456 \u0433\u0440\u043e\u0448\u0456',
      secAmmo:'\u041c\u0430\u0433\u0430\u0437\u0438\u043d \u043d\u0430\u0431\u043e\u0457\u0432',secAmmoSub:'\u041a\u043e\u0436\u043d\u0435 \u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u0436\u0435\u043d\u043d\u044f \u043a\u043e\u0448\u0442\u0443\u0454 \u043e\u0434\u0438\u043d \u043c\u0430\u0433\u0430\u0437\u0438\u043d \u2014 \u043a\u0443\u043f\u0443\u0439\u0442\u0435 \u0442\u0443\u0442',
      secEarn:'\u0417\u0430\u0440\u043e\u0431\u0438\u0442\u0438 Anti-Ruscist Coin',secEarnSub:'\u0411\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432\u043d\u0456 \u043c\u0435\u0442\u043e\u0434\u0438 \u0437\u0430\u0440\u043e\u0431\u0438\u0442\u0438 ARC \u2014 \u0431\u0435\u0437 \u0432\u0438\u0442\u0440\u0430\u0442',
      secExchange:'\u041e\u0431\u043c\u0456\u043d',secExchangeSub:'\u041a\u0443\u043f\u0438\u0442\u0438 \u0433\u0440\u043e\u0448\u0456 \u0437\u0430 \u043a\u0440\u0438\u043f\u0442\u0443 \u0430\u0431\u043e \u043e\u0431\u043c\u0456\u043d\u044f\u0442\u0438 ARC',
      secArc:'\u0420\u0435\u0454\u0441\u0442\u0440 Anti-Ruscist Coin (ARC)',secWallet:'\u0413\u0430\u043c\u0430\u043d\u0435\u0446\u044c',secSell:'\u041f\u0440\u043e\u0434\u0430\u0442\u0438 ARC \u2192 POL',
      secHeroes:'\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0456 \u0417\u0430\u0445\u0438\u0441\u043d\u0438\u043a\u0438 \u2014 NFT \u0413\u0435\u0440\u043e\u0457',secNews:'\u0412\u0456\u0439\u043d\u0430 \u0432 \u0423\u043a\u0440\u0430\u0457\u043d\u0456 \u2014 \u041d\u043e\u0432\u0438\u043d\u0438',
      wpRevolver:'\u0420\u0435\u0432\u043e\u043b\u044c\u0432\u0435\u0440',wpShotgun:'\u0414\u0440\u043e\u0431\u043e\u0432\u0438\u043a',wpM16:'M-16',wpLmg:'\u041a\u0443\u043b\u0435\u043c\u0435\u0442',wpClay:'\u041c\u0435\u0442\u0430\u043b\u044c\u043d\u0438\u043a',
      wpGl:'\u0413\u0440\u0430\u043d\u0430\u0442\u043e\u043c\u0435\u0442',wpSniper:'\u0421\u043d\u0430\u0439\u043f\u0435\u0440\u0441\u044c\u043a\u0430',wpStugna:'\u0421\u0442\u0443\u0433\u043d\u0430-\u041f',wpDroneBomb:'\u0414\u0440\u043e\u043d-\u0431\u043e\u043c\u0431\u0430',
      wpPanzerfaust:'\u041f\u0430\u043d\u0446\u0435\u0440\u0444\u0430\u0443\u0441\u0442 3',wpPkm:'\u041f\u041a\u041c',wpAk12:'\u0410\u041a-12',wpMatador:'M4 \u041c\u0430\u0442\u0430\u0434\u043e\u0440',
      uiEquip:'\u0412\u0417\u042f\u0422\u0418',uiLocked:'\u0417\u0410\u041a\u0420\u0418\u0422\u041e',uiActive:'\u0410\u041a\u0422\u0418\u0412\u041d\u0410',uiOwned:'\u041a\u0423\u041f\u041b\u0415\u041d\u041e',uiFree:'\u0411\u0415\u0417\u041a\u041e\u0428\u0422.',uiNew:'\u041d\u041e\u0412\u0415',
      uiKeepKilling:'\u041f\u0440\u043e\u0434\u043e\u0432\u0436\u0443\u0439\u0442\u0435 \u0432\u0431\u0438\u0432\u0430\u0442\u0438 \u0434\u043b\u044f \u0440\u043e\u0437\u0431\u043b\u043e\u043a\u0443\u0432\u0430\u043d\u043d\u044f \u2192',uiNoAmmo:'\u0421\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0440\u043e\u0437\u0431\u043b\u043e\u043a\u0443\u0439\u0442\u0435 \u0437\u0431\u0440\u043e\u044e.',uiIntel:'\u0424\u0420\u041e\u041d\u0422\u041e\u0412\u0410 \u0420\u041e\u0417\u0412\u0406\u0414\u041a\u0410'
    },
    de:{
      hudWave:'WELLE',hudScore:'PUNKTE',hudHryvni:'HRYWNI',hudKills:'KILLS',hudMenu:'MEN\u00dc',hudCallIn:'UNTERST\u00dcTZUNG',hudShots:'Sch\u00fcsse f\u00fcr die Ukraine',
      topMenu:'HAUPTMEN\u00dc',topGod:'GOTT',whBestWave:'BESTE WELLE',whTotalKills:'KILLS GESAMT',
      navEarn:'VERDIENEN',navHeroes:'HELDEN',navArsenal:'ARSENAL',navAmmo:'MUNITION',navMarket:'MARKT',navSell:'VERKAUFEN',navExchange:'UMTAUSCH',
      navCosmetics:'KOSMETIK',navSkills:'F\u00c4HIGKEITEN',navCups:'BECHER',navMath:'MATHE',navAchieve:'ERFOLGE',navMissions:'MISSIONEN',navStats:'STATISTIK',
      navLeaders:'RANGLISTE',navSeason:'SAISON',navNews:'NACHR.',navMemorial:'GEDENKEN',
      ciArty:'ARTILLERIE',ciDrones:'KAMPFDROHNEN',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'FEUERDROHNE',ciFpv:'FPV-ANGRIFF',ciReady:'BEREIT',
      uiEquip:'AUSR\u00dcSTEN',uiLocked:'GESPERRT',uiActive:'AKTIV',uiOwned:'IM BESITZ',uiFree:'GRATIS',uiNew:'NEU'
    },
    fr:{
      hudWave:'VAGUE',hudScore:'SCORE',hudHryvni:'HRYVNI',hudKills:'KILLS',hudMenu:'MENU',hudCallIn:'APPEL SOUTIEN',hudShots:'tirs pour l\u2019Ukraine',
      topMenu:'MENU PRINCIPAL',topGod:'DIEU',whBestWave:'MEILLEURE VAGUE',whTotalKills:'KILLS TOTAL',
      navEarn:'GAGNER & DONNER',navHeroes:'H\u00c9ROS',navArsenal:'ARSENAL',navAmmo:'MUNITIONS',navMarket:'MARCH\u00c9',navSell:'VENDRE',navExchange:'\u00c9CHANGE',
      navCosmetics:'COSM\u00c9TIQUES',navSkills:'COMP\u00c9TENCES',navCups:'GOBELETS',navMath:'MATHS',navAchieve:'SUCC\u00c8S',navMissions:'MISSIONS',navStats:'STATS',
      navLeaders:'CLASSEMENT',navSeason:'SAISON',navNews:'ACTUALIT\u00c9S',navMemorial:'M\u00c9MORIAL',navWallet:'PORTEFEUILLE',
      ciArty:'ARTILLERIE',ciDrones:'DRONES COMBAT',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'DRONE FEU',ciFpv:'FPV',ciReady:'PR\u00caT',
      uiEquip:'\u00c9QUIPER',uiLocked:'VERROUILL\u00c9',uiActive:'ACTIF',uiOwned:'ACHET\u00c9',uiFree:'GRATUIT',uiNew:'NOUVEAU'
    },
    es:{
      hudWave:'OLEADA',hudScore:'PUNTOS',hudHryvni:'HRYVNI',hudKills:'BAJAS',hudMenu:'MEN\u00da',hudCallIn:'PEDIR APOYO',hudShots:'disparos por Ucrania',
      topMenu:'MEN\u00da PRINCIPAL',topGod:'DIOS',whBestWave:'MEJOR OLEADA',whTotalKills:'BAJAS TOTALES',
      navEarn:'GANAR & DONAR',navHeroes:'H\u00c9ROES',navArsenal:'ARSENAL',navAmmo:'MUNICI\u00d3N',navMarket:'TIENDA',navSell:'VENDER',navExchange:'CAMBIO',
      navCosmetics:'COSM\u00c9TICOS',navSkills:'HABILIDADES',navCups:'COPAS',navMath:'MATES',navAchieve:'LOGROS',navMissions:'MISIONES',navStats:'ESTAD\u00cdST.',
      navLeaders:'L\u00cdDERES',navSeason:'TEMPORADA',navNews:'NOTICIAS',navMemorial:'MEMORIAL',navWallet:'CARTERA',
      ciArty:'ARTILLER\u00cdA',ciDrones:'DRONES',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'DRON FUEGO',ciFpv:'FPV',ciReady:'LISTO',
      uiEquip:'EQUIPAR',uiLocked:'BLOQUEADO',uiActive:'ACTIVO',uiOwned:'COMPRADO',uiFree:'GRATIS',uiNew:'NUEVO'
    },
    pl:{
      hudWave:'FALA',hudScore:'WYNIK',hudHryvni:'HRYWNI',hudKills:'ZABICI',hudMenu:'MENU',hudCallIn:'WEZWIJ WSPARCIE',hudShots:'strza\u0142\u00f3w za Ukrain\u0119',
      topMenu:'MENU G\u0141\u00d3WNE',topGod:'B\u00d3G',whBestWave:'NAJL. FALA',whTotalKills:'ZABICI RAZEM',
      navEarn:'ZARABIAJ',navHeroes:'BOHATEROWIE',navArsenal:'ARSENA\u0141',navAmmo:'AMUNICJA',navMarket:'SKLEP',navSell:'SPRZEDAJ',navExchange:'WYMIANA',
      navCosmetics:'KOSMETYKI',navSkills:'UMIEJ\u0118TNO\u015aCI',navCups:'KUBKI',navMath:'MATMA',navAchieve:'OSI\u0104GNI\u0118CIA',navMissions:'MISJE',navStats:'STATYSTYKI',
      navLeaders:'RANKING',navSeason:'SEZON',navNews:'WIADOMO\u015aCI',navMemorial:'PAMI\u0118\u0106',navWallet:'PORTFEL',
      ciArty:'ARTYLERIA',ciDrones:'DRONY',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'DRON OGNIA',ciFpv:'FPV',ciReady:'GOTOWE',
      uiEquip:'WYPOSA\u017bY\u0106',uiLocked:'ZABLOKOWANE',uiActive:'AKTYWNE',uiOwned:'POSIADANE',uiFree:'GRATIS',uiNew:'NOWE'
    },
    pt:{
      hudWave:'ONDA',hudScore:'PONTOS',hudHryvni:'HRYVNI',hudKills:'MORTES',hudMenu:'MENU',hudCallIn:'CHAMAR APOIO',hudShots:'tiros pela Ucr\u00e2nia',
      topMenu:'MENU PRINCIPAL',topGod:'DEUS',whBestWave:'MELHOR ONDA',whTotalKills:'MORTES TOTAL',
      navEarn:'GANHAR & DOAR',navHeroes:'HER\u00d3IS',navArsenal:'ARSENAL',navAmmo:'MUNI\u00c7\u00c3O',navMarket:'LOJA',navSell:'VENDER',navExchange:'TROCA',
      navCosmetics:'COSM\u00c9TICOS',navSkills:'HABILIDADES',navCups:'COPOS',navMath:'MATEM.',navAchieve:'CONQUISTAS',navMissions:'MISS\u00d5ES',navStats:'ESTAT.',
      navLeaders:'RANKING',navSeason:'TEMPORADA',navNews:'NOT\u00cdCIAS',navMemorial:'MEMORIAL',navWallet:'CARTEIRA',
      ciArty:'ARTILHARIA',ciDrones:'DRONES',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'DRONE FOGO',ciFpv:'FPV',ciReady:'PRONTO',
      uiEquip:'EQUIPAR',uiLocked:'TRANCADO',uiActive:'ATIVO',uiOwned:'COMPRADO',uiFree:'GR\u00c1TIS',uiNew:'NOVO'
    },
    it:{
      hudWave:'ONDATA',hudScore:'PUNTI',hudHryvni:'HRYVNI',hudKills:'UCCISIONI',hudMenu:'MENU',hudCallIn:'CHIAMA SUPPORTO',hudShots:'colpi per l\u2019Ucraina',
      topMenu:'MENU PRINCIPALE',topGod:'DIO',whBestWave:'MIGLIORE ONDATA',whTotalKills:'UCCISIONI TOT.',
      navEarn:'GUADAGNA & DONA',navHeroes:'EROI',navArsenal:'ARSENALE',navAmmo:'MUNIZIONI',navMarket:'MERCATO',navSell:'VENDI',navExchange:'SCAMBIO',
      navCosmetics:'COSMETICI',navSkills:'ABILIT\u00c0',navCups:'BICCHIERI',navMath:'MATEM.',navAchieve:'SUCCESSI',navMissions:'MISSIONI',navStats:'STATIST.',
      navLeaders:'CLASSIFICA',navSeason:'STAGIONE',navNews:'NOTIZIE',navMemorial:'MEMORIALE',navWallet:'PORTAFOGLIO',
      ciArty:'ARTIGLIERIA',ciDrones:'DRONI',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'DRONE FUOCO',ciFpv:'FPV',ciReady:'PRONTO',
      uiEquip:'EQUIPAGGIA',uiLocked:'BLOCCATO',uiActive:'ATTIVO',uiOwned:'ACQUISTATO',uiFree:'GRATIS',uiNew:'NUOVO'
    },
    nl:{
      hudWave:'GOLF',hudScore:'SCORE',hudHryvni:'HRYVNI',hudKills:'KILLS',hudMenu:'MENU',hudCallIn:'STEUN OPROEPEN',hudShots:'schoten voor Oekra\u00efne',
      topMenu:'HOOFDMENU',topGod:'GOD',whBestWave:'BESTE GOLF',whTotalKills:'KILLS TOTAAL',
      navEarn:'VERDIEN & DONEER',navHeroes:'HELDEN',navArsenal:'ARSENAAL',navAmmo:'MUNITIE',navMarket:'WINKEL',navSell:'VERKOOP',navExchange:'RUILEN',
      navCosmetics:'COSMETICA',navSkills:'VAARDIGHEDEN',navCups:'BEKERS',navMath:'REKENEN',navAchieve:'PRESTATIES',navMissions:'MISSIES',navStats:'STATISTIEK',
      navLeaders:'RANGLIJST',navSeason:'SEIZOEN',navNews:'NIEUWS',navMemorial:'HERDENKING',navWallet:'PORTEMONNEE',
      ciArty:'ARTILLERIE',ciDrones:'GEVECHTSDRONES',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'VUURDRONE',ciFpv:'FPV-AANVAL',ciReady:'KLAAR',
      uiEquip:'UITRUSTEN',uiLocked:'VERGRENDELD',uiActive:'ACTIEF',uiOwned:'IN BEZIT',uiFree:'GRATIS',uiNew:'NIEUW'
    },
    cs:{
      hudWave:'VLNA',hudScore:'SK\u00d3RE',hudHryvni:'HRYVNI',hudKills:'ZAB\u0130T\u00cd',hudMenu:'MENU',hudCallIn:'POVOLAT PODPORU',hudShots:'v\u00fdst\u0159el\u016f za Ukrajinu',
      topMenu:'HLAVN\u00cd MENU',topGod:'B\u016eH',whBestWave:'NEJLEP\u0160\u00cd VLNA',whTotalKills:'ZAB\u0130T\u00cd CELKEM',
      navEarn:'VYD\u011aLAT',navHeroes:'HRDINOV\u00c9',navArsenal:'ARSEN\u00c1L',navAmmo:'MUNICE',navMarket:'OBCHOD',navSell:'PRODAT',navExchange:'SM\u011aNA',
      navCosmetics:'KOSMETIKA',navSkills:'DOVEDNOSTI',navCups:'KOF.',navMath:'MATEM.',navAchieve:'\u00daSP\u011aCHY',navMissions:'MISE',navStats:'STATISTAKY',
      navLeaders:'\u017dEB\u0158\u00cd\u010cEK',navSeason:'S\u00c9ZONA',navNews:'ZPR\u00c1VY',navMemorial:'PAM\u00c1TKA',navWallet:'PEN\u011a\u017dENKA',
      ciArty:'D\u011aLOST\u0158ELECTVO',ciDrones:'DRONY',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'OH\u0147OV\u00dd DRON',ciFpv:'FPV',ciReady:'HOTOVO',
      uiEquip:'VYBAVIT',uiLocked:'ZAM\u010cEN\u00c9',uiActive:'AKTIVN\u00cd',uiOwned:'VLASTN\u011aN\u00c9',uiFree:'ZDARMA',uiNew:'NOV\u00c9'
    },
    ja:{
      hudWave:'\u30a6\u30a7\u30fc\u30d6',hudScore:'\u30b9\u30b3\u30a2',hudHryvni:'\u30d5\u30ea\u30f4\u30cb\u30e3',hudKills:'\u30ad\u30eb',hudMenu:'\u30e1\u30cb\u30e5\u30fc',hudCallIn:'\u652f\u63f4\u8981\u8acb',hudShots:'\u30a6\u30af\u30e9\u30a4\u30ca\u3078\u306e\u5c04\u6483',
      topMenu:'\u30e1\u30a4\u30f3\u30e1\u30cb\u30e5\u30fc',topGod:'\u795e',whBestWave:'\u6700\u9ad8\u30a6\u30a7\u30fc\u30d6',whTotalKills:'\u7dcf\u30ad\u30eb\u6570',
      navEarn:'\u7a3c\u3050 & \u5bc4\u4ed8',navHeroes:'\u82f1\u96c4',navArsenal:'\u6b66\u5668\u5eab',navAmmo:'\u5f3e\u85ac',navMarket:'\u30b9\u30c8\u30a2',navSell:'\u58f2\u308b',navExchange:'\u4ea4\u63db',
      navCosmetics:'\u30b3\u30b9\u30e1',navSkills:'\u30b9\u30ad\u30eb',navAchieve:'\u5b9f\u7e3e',navMissions:'\u30df\u30c3\u30b7\u30e7\u30f3',navStats:'\u7d71\u8a08',
      navLeaders:'\u30e9\u30f3\u30ad\u30f3\u30b0',navSeason:'\u30b7\u30fc\u30ba\u30f3',navNews:'\u30cb\u30e5\u30fc\u30b9',navMemorial:'\u8ffd\u60bc',navWallet:'\u30a6\u30a9\u30ec\u30c3\u30c8',
      ciArty:'\u7832\u6483',ciDrones:'\u30c9\u30ed\u30fc\u30f3',ciBradley:'\u30d6\u30e9\u30c3\u30c9\u30ec\u30fc',ciRover:'\u30ed\u30fc\u30d0\u30fc',ciFiredrone:'\u706b\u708e\u30c9\u30ed\u30fc\u30f3',ciFpv:'FPV\u653b\u6483',ciReady:'\u6e96\u5099\u5b8c\u4e86',
      uiEquip:'\u88c5\u5099',uiLocked:'\u30ed\u30c3\u30af',uiActive:'\u4f7f\u7528\u4e2d',uiOwned:'\u6240\u6709',uiFree:'\u7121\u6599',uiNew:'\u65b0\u898f'
    },
    ko:{
      hudWave:'\uc6e8\uc774\ube0c',hudScore:'\uc810\uc218',hudHryvni:'\ud750\ub9ac\ube0c\ub0d0',hudKills:'\ud0ac',hudMenu:'\uba54\ub274',hudCallIn:'\uc9c0\uc6d0 \uc694\uccad',hudShots:'\uc6b0\ud06c\ub77c\uc774\ub098\ub97c \uc704\ud55c \uc0ac\uaca9',
      topMenu:'\uba54\uc778 \uba54\ub274',topGod:'\uc2e0',whBestWave:'\ucd5c\uace0 \uc6e8\uc774\ube0c',whTotalKills:'\ucd1d \ud0ac',
      navEarn:'\ubcf4\uc0c1 & \uae30\ubd80',navHeroes:'\uc601\uc6c5',navArsenal:'\ubb34\uae30\uace0',navAmmo:'\ud0c4\uc57d',navMarket:'\uc0c1\uc810',navSell:'\ud310\ub9e4',navExchange:'\uad50\ud658',
      navCosmetics:'\ucf54\uc2a4\uba54\ud2f1',navSkills:'\uc2a4\ud0ac',navAchieve:'\uc5c5\uc801',navMissions:'\ubbf8\uc158',navStats:'\ud1b5\uacc4',
      navLeaders:'\ub7ad\ud0b9',navSeason:'\uc2dc\uc98c',navNews:'\ub274\uc2a4',navMemorial:'\ucd94\ubaa8',navWallet:'\uc9c0\uac11',
      ciArty:'\ud3ec\uaca9',ciDrones:'\ub4dc\ub860',ciBradley:'\ube0c\ub798\ub4e4\ub9ac',ciRover:'\ub85c\ubc84',ciFiredrone:'\ud654\uc5fc \ub4dc\ub860',ciFpv:'FPV \uacf5\uaca9',ciReady:'\uc900\ube44',
      uiEquip:'\uc7a5\ucc29',uiLocked:'\uc7a0\uae40',uiActive:'\uc0ac\uc6a9\uc911',uiOwned:'\ubcf4\uc720',uiFree:'\ubb34\ub8cc',uiNew:'\uc2e0\uaddc'
    },
    zh:{
      hudWave:'\u6ce2\u6b21',hudScore:'\u5206\u6570',hudHryvni:'\u683c\u91cc\u592b\u5c3c\u4e9a',hudKills:'\u51fb\u6740',hudMenu:'\u83dc\u5355',hudCallIn:'\u547c\u53eb\u652f\u63f4',hudShots:'\u4e3a\u4e4c\u514b\u5170\u5c04\u51fb',
      topMenu:'\u4e3b\u83dc\u5355',topGod:'\u795e',whBestWave:'\u6700\u4f73\u6ce2\u6b21',whTotalKills:'\u603b\u51fb\u6740',
      navEarn:'\u8d5a\u53d6 & \u6350\u8d60',navHeroes:'\u82f1\u96c4',navArsenal:'\u6b66\u5668\u5e93',navAmmo:'\u5f39\u836f',navMarket:'\u5546\u5e97',navSell:'\u51fa\u552e',navExchange:'\u5151\u6362',
      navCosmetics:'\u5316\u5986\u54c1',navSkills:'\u6280\u80fd',navAchieve:'\u6210\u5c31',navMissions:'\u4efb\u52a1',navStats:'\u7edf\u8ba1',
      navLeaders:'\u6392\u884c\u699c',navSeason:'\u8d5b\u5b63',navNews:'\u65b0\u95fb',navMemorial:'\u7eaa\u5ff5',navWallet:'\u94b1\u5305',
      ciArty:'\u70ae\u51fb',ciDrones:'\u65e0\u4eba\u673a',ciBradley:'\u5e03\u96f7\u5fb7\u5229',ciRover:'\u63a2\u6d4b\u8f66',ciFiredrone:'\u706b\u7130\u65e0\u4eba\u673a',ciFpv:'FPV\u6253\u51fb',ciReady:'\u5c31\u7eea',
      uiEquip:'\u88c5\u5907',uiLocked:'\u9501\u5b9a',uiActive:'\u4f7f\u7528\u4e2d',uiOwned:'\u5df2\u6709',uiFree:'\u514d\u8d39',uiNew:'\u65b0'
    },
    tr:{
      hudWave:'DALGA',hudScore:'SKOR',hudHryvni:'HRYVNI',hudKills:'\u00d6LD\u00dcR\u00dcLEN',hudMenu:'MEN\u00dc',hudCallIn:'DESTEK \u00c7A\u011eIR',hudShots:'Ukrayna i\u00e7in at\u0131\u015flar',
      topMenu:'ANA MEN\u00dc',topGod:'TANRI',whBestWave:'EN \u0130Y\u0130 DALGA',whTotalKills:'TOPLAM \u00d6LD\u00dcR\u00dcLEN',
      navEarn:'KAZAN & BA\u011eI\u015e',navHeroes:'KAHRAMANLAR',navArsenal:'CEPHANEL\u0130K',navAmmo:'M\u00dcH\u0130MMAT',navMarket:'MA\u011eAZA',navSell:'SAT',navExchange:'TAKAS',
      navCosmetics:'KOZMET\u0130K',navSkills:'YETENEKLER',navCups:'KUPALAR',navMath:'MATEM.',navAchieve:'BA\u015eARILAR',navMissions:'G\u00d6REVLER',navStats:'\u0130STAT\u0130ST.',
      navLeaders:'SIRALAMA',navSeason:'SEZON',navNews:'HABERLER',navMemorial:'ANMA',navWallet:'C\u00dcZDAN',
      ciArty:'TOP\u00c7U',ciDrones:'\u0130HA',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'ATE\u015e \u0130HA',ciFpv:'FPV SALDIRI',ciReady:'HAZIR',
      uiEquip:'KU\u015eAN',uiLocked:'K\u0130L\u0130TL\u0130',uiActive:'AKT\u0130F',uiOwned:'SATINALINDI',uiFree:'\u00dcCRETSIZ',uiNew:'YEN\u0130'
    },
    sv:{
      hudWave:'V\u00c5G',hudScore:'PO\u00c4NG',hudHryvni:'HRYVNI',hudKills:'D\u00d6DA',hudMenu:'MENY',hudCallIn:'KALLA ST\u00d6D',hudShots:'skott f\u00f6r Ukraina',
      topMenu:'HUVUDMENY',topGod:'GUD',whBestWave:'B\u00c4STA V\u00c5G',whTotalKills:'TOTALT D\u00d6DA',
      navEarn:'TJ\u00c4NA & DONERA',navHeroes:'HJ\u00c4LTAR',navArsenal:'ARSENAL',navAmmo:'AMMUNITION',navMarket:'BUTIK',navSell:'S\u00c4LJ',navExchange:'V\u00c4XLA',
      navCosmetics:'KOSMETIKA',navSkills:'F\u00c4RDIGHETER',navCups:'KOPPAR',navMath:'MATTE',navAchieve:'PRESTATIONER',navMissions:'UPPDRAG',navStats:'STATISTIK',
      navLeaders:'RANKNING',navSeason:'S\u00c4SONG',navNews:'NYHETER',navMemorial:'MINNESSIDA',navWallet:'PL\u00c5NBOK',
      ciArty:'ARTILLERI',ciDrones:'STRIDSDRONER',ciBradley:'BRADLEY',ciRover:'ROVER',ciFiredrone:'ELDDRONE',ciFpv:'FPV-ATTACK',ciReady:'KLAR',
      uiEquip:'UTRUSTA',uiLocked:'L\u00c5ST',uiActive:'AKTIV',uiOwned:'\u00c4GD',uiFree:'GRATIS',uiNew:'NY'
    }
  };
  var currentLang = localStorage.getItem('arc_lang') || 'en';
  function t(key) { return (UI_STRINGS[currentLang]||{})[key] || (STRINGS[currentLang]||STRINGS.en)[key] || STRINGS.en[key] || (UI_STRINGS.en||{})[key] || key; }
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      // Key not present in this script's tables (e.g. mobile-only keys like
      // rotateLandscape) — t() returns the bare key. Leave the element's existing
      // fallback/text so the owning script (mobile.js) can localize it instead of
      // overwriting it with the raw key string.
      if (val === key) return;
      if (val.indexOf('<div>') !== -1 || val.indexOf('<br') !== -1) {
        // Sanitize: allow only <div>, </div>, <span>, </span>, <br>, <br/>
        el.innerHTML = val.replace(/<(?!\/?(?:div|span|br)\s*\/?>)[^>]*>/gi, '');
      } else {
        el.textContent = val;
      }
    });
    if (window._restartTypewriter) window._restartTypewriter();
  }
  var _initComplete = false;
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('arc_lang', lang);
    applyI18n();
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    // Rebuild inventory if it's open so dynamic t() strings update (skip during init — WEAPON_UPGRADES not yet defined)
    if (_initComplete && $('#inventory-panel').is(':visible') && typeof buildInventory === 'function') buildInventory();
  }
  $(document).on('click', '.lang-btn', function(e) {
    e.preventDefault();
    setLang($(this).attr('data-lang'));
  });
  setLang(currentLang);

  // \u2500\u2500 Audio Engine ────────────────────────────────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let _actx = null;

  function getACtx() {
    if (!_actx) _actx = new AudioCtx();
    if (_actx.state === 'suspended') _actx.resume().catch(function(){});
    return _actx;
  }

  // ── Audio gain nodes (SFX + Music separate) ─────────────────
  let masterGain = null;  // SFX gain
  let _musicGain = null;  // Music gain (independent)

  // SFX volume — persisted
  function getMaster() {
    if (!masterGain) {
      const ac = getACtx();
      masterGain = ac.createGain();
      masterGain.gain.value = parseFloat(localStorage.getItem('arc_sfx_vol') || '0.85');
      masterGain.connect(ac.destination);
    }
    return masterGain;
  }

  // Music volume — persisted (default lower so music isn't overwhelming)
  function getMusicGain() {
    if (!_musicGain) {
      const ac = getACtx();
      _musicGain = ac.createGain();
      _musicGain.gain.value = parseFloat(localStorage.getItem('arc_music_vol') || '0.38');
      _musicGain.connect(ac.destination);
    }
    return _musicGain;
  }

  // Apply saved volumes on first audio context creation
  function _applyVolumes() {
    const sfx = parseFloat(localStorage.getItem('arc_sfx_vol') || '0.85');
    const mus = parseFloat(localStorage.getItem('arc_music_vol') || '0.38');
    if (masterGain) masterGain.gain.value = sfx;
    if (_musicGain) _musicGain.gain.value = mus;
    if (_ambGain) _ambGain.gain.value = parseFloat(localStorage.getItem('arc_amb_vol') || '0.60');
  }

  // ── Ambient Sound System (city ambiance, wind, distant fire) ─────────
  let _ambGain = null;
  let _ambSources = [];
  let _ambRunning = false;

  function _getAmbGain() {
    if (!_ambGain) {
      const ac = getACtx();
      _ambGain = ac.createGain();
      _ambGain.gain.value = parseFloat(localStorage.getItem('arc_amb_vol') || '0.60');
      _ambGain.connect(ac.destination);
    }
    return _ambGain;
  }

  function _startAmbient() {
    if (_ambRunning) return;
    _ambRunning = true;
    const ac = getACtx();
    const dest = _getAmbGain();

    // Layer 1: low city rumble (filtered brown noise)
    const rumbleLen = ac.sampleRate * 4;
    const rumbleBuf = ac.createBuffer(1, rumbleLen, ac.sampleRate);
    const rd = rumbleBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < rumbleLen; i++) { last = (last + (Math.random() * 2 - 1) * 0.08); last *= 0.98; rd[i] = last; }
    const rumble = ac.createBufferSource();
    rumble.buffer = rumbleBuf;
    rumble.loop = true;
    const rumbleFilt = ac.createBiquadFilter();
    rumbleFilt.type = 'lowpass'; rumbleFilt.frequency.value = 120;
    const rumbleG = ac.createGain(); rumbleG.gain.value = 0.3;
    rumble.connect(rumbleFilt); rumbleFilt.connect(rumbleG); rumbleG.connect(dest);
    rumble.start();
    _ambSources.push(rumble);

    // Layer 2: wind (filtered white noise, gentle)
    const windLen = ac.sampleRate * 3;
    const windBuf = ac.createBuffer(1, windLen, ac.sampleRate);
    const wd = windBuf.getChannelData(0);
    for (let i = 0; i < windLen; i++) wd[i] = (Math.random() * 2 - 1);
    const wind = ac.createBufferSource();
    wind.buffer = windBuf;
    wind.loop = true;
    const windFilt = ac.createBiquadFilter();
    windFilt.type = 'bandpass'; windFilt.frequency.value = 400; windFilt.Q.value = 0.5;
    const windG = ac.createGain(); windG.gain.value = 0.08;
    wind.connect(windFilt); windFilt.connect(windG); windG.connect(dest);
    wind.start();
    _ambSources.push(wind);

    // Layer 3: distant gunfire pops (random interval)
    function _distantShot() {
      if (!_ambRunning) return;
      const ac2 = getACtx();
      const o = ac2.createOscillator();
      o.type = 'square';
      o.frequency.value = 80 + Math.random() * 60;
      const g = ac2.createGain();
      g.gain.setValueAtTime(0.04 + Math.random() * 0.03, ac2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac2.currentTime + 0.15);
      o.connect(g); g.connect(_getAmbGain());
      o.start(); o.stop(ac2.currentTime + 0.15);
      setTimeout(_distantShot, 3000 + Math.random() * 8000);
    }
    setTimeout(_distantShot, 2000 + Math.random() * 4000);
  }

  function _stopAmbient() {
    _ambRunning = false;
    _ambSources.forEach(function(s) { try { s.stop(); } catch(e){} });
    _ambSources = [];
  }

  let musicPlaying = false;
  let musicStop = null;  // fn to stop running music
  let mutedMusic = false;
  let mutedSounds = false;

  // ── Synth helpers ────────────────────────────────────────────
  function noise(duration, freq, q, gainVal, dest) {
    const ac = getACtx();
    const bufLen = ac.sampleRate * duration;
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(gainVal, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest || getMaster());
    src.start();
    src.stop(ac.currentTime + duration);
    return src;
  }

  function tone(freq, type, duration, gainVal, pitchEnd, dest) {
    const ac = getACtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (pitchEnd) osc.frequency.exponentialRampToValueAtTime(pitchEnd, ac.currentTime + duration);
    g.gain.setValueAtTime(gainVal, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(g);
    g.connect(dest || getMaster());
    osc.start();
    osc.stop(ac.currentTime + duration);
    return osc;
  }

  // ── Named sounds ─────────────────────────────────────────────
  // ── Bushmaster 25mm autocannon burst sound ─────────────────────────────
  function sndBushmaster() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Heavy metallic thud + high-velocity crack
    const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.025));
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    const g = ac.createGain(); g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    const eq = ac.createBiquadFilter(); eq.type = 'lowshelf'; eq.frequency.value = 320; eq.gain.value = 12;
    src.connect(eq); eq.connect(g); g.connect(getMaster()); src.start(t);
    // Supersonic crack overlay
    const o = ac.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.18, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g2); g2.connect(getMaster()); o.start(t); o.stop(t + 0.09);
  }

  function sndShootRevolver() {
    if (mutedSounds) return;
    noise(0.18, 1200, 0.8, 0.6);
    noise(0.09, 80, 1.5, 0.9);
    tone(160, 'sawtooth', 0.06, 0.4, 40);
  }

  function sndShootShotgun() {
    if (mutedSounds) return;
    noise(0.25, 600, 0.5, 0.9);
    noise(0.18, 60, 1.0, 1.0);
    tone(90, 'sawtooth', 0.1, 0.5, 30);
  }

  function sndShootM16() {
    if (mutedSounds) return;
    noise(0.07, 2000, 1.2, 0.4);
    noise(0.05, 120, 1.5, 0.6);
    tone(200, 'square', 0.04, 0.25, 80);
  }

  function sndNoAmmo() {
    if (mutedSounds) return;
    // Dry-fire click series (3 rapid mechanical clicks)
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        tone(900 + i * 30, 'square', 0.07, 0.04, 40);
        noise(0.02, 4000, 4, 0.04);
      }, i * 90);
    }
  }

  function sndReload() {
    if (mutedSounds) return;
    const ac = getACtx();
    // Metal click sequence
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        tone(900 - i * 80, 'square', 0.04, 0.12);
        noise(0.03, 3000, 2, 0.15);
      }, i * 55);
    }
  }

  function sndRevolverReload() {
    if (mutedSounds) return;
    const ac = getACtx();
    // Cylinder spin: rising noise+tone
    noise(0.35, 2400, 1.5, 0.3);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => tone(600 + i * 60, 'sawtooth', 0.05, 0.1), i * 50);
    }
  }

  function sndPunch() {
    if (mutedSounds) return;
    noise(0.18, 100, 1.5, 0.8);
    tone(50, 'sine', 0.12, 0.6, 20);
  }

  function sndRoar() {
    if (mutedSounds) return;
    const freq = 80 + Math.random() * 60;
    tone(freq, 'sawtooth', 0.45, 0.35, freq * 0.6);
    tone(freq * 1.5, 'sawtooth', 0.3, 0.15, freq);
  }

  function sndLaughter() {
    if (mutedSounds) return;
    const ac = getACtx();
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        tone(400 + i * 30, 'sine', 0.12, 0.25, 200);
        noise(0.08, 800, 2, 0.1);
      }, i * 130);
    }
  }

  // Non-lethal zombie body impact
  function sndHit() {
    if (mutedSounds) return;
    noise(0.07, 200, 3, 0.45);
    tone(60, 'sine', 0.09, 0.10, 10);
  }

  // ── Procedural zombie scream ─────────────────────────────────────────────
  // Every call generates totally independent random parameters — pitch, timbre,
  // vibrato rate, formant colour, duration — so no two screams ever sound alike
  // (barring astronomical coincidence, same as reality).
  // isKill=true → long guttural death wail; false → short sharp pain yelp.
  function sndZombieScream(isKill) {
    if (mutedSounds) return;
    const ac       = getACtx(), t = ac.currentTime;
    const baseFreq = 70  + Math.random() * 110;            // 70–180 Hz (harsh male register)
    const dur      = isKill ? 0.7  + Math.random() * 0.9  // 0.7–1.6 s death wail
                            : 0.15 + Math.random() * 0.22; // 0.15–0.37 s pain yelp
    const pitchEnd = isKill
      ? Math.max(20, baseFreq * (0.28 + Math.random() * 0.38))  // pitch collapses on death
      : baseFreq * (1.5 + Math.random() * 0.9);                  // shoots up in pain

    // Primary vocal oscillator — sawtooth or square for harshness
    const osc  = ac.createOscillator();
    osc.type   = Math.random() < 0.55 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isKill ? baseFreq * 1.9 : baseFreq * 2.3, t);
    osc.frequency.exponentialRampToValueAtTime(pitchEnd, t + dur);

    // Vibrato LFO — random rate 5–22 Hz for natural variation
    const lfo  = ac.createOscillator();
    lfo.frequency.value = 5 + Math.random() * 17;
    const lfoG = ac.createGain(); lfoG.gain.value = 6 + Math.random() * 22;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);

    // Formant bandpass — random vowel colour 600–2000 Hz
    const form = ac.createBiquadFilter();
    form.type        = 'bandpass';
    form.frequency.value = 600 + Math.random() * 1400;
    form.Q.value     = 1.2 + Math.random() * 3.8;

    // Amplitude envelope
    const env = ac.createGain();
    const pk  = 0.20 + Math.random() * 0.20;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(pk, t + 0.018);
    if (isKill) { env.gain.setValueAtTime(pk, t + dur * 0.25); }
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // Second harmonic — adds teeth-gritting edge
    const osc2 = ac.createOscillator();
    osc2.type  = 'sawtooth';
    osc2.frequency.setValueAtTime(baseFreq * 3.0 + Math.random() * 60, t);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(30, baseFreq * 1.1), t + dur);
    const g2 = ac.createGain(); g2.gain.value = 0.12 + Math.random() * 0.10;

    osc.connect(form); osc2.connect(g2); g2.connect(form);
    form.connect(env); env.connect(getMaster());
    osc.start(t); osc2.start(t); lfo.start(t);
    [osc, osc2, lfo].forEach(n => { try { n.stop(t + dur + 0.07); } catch(e){} });
  }

  // Shot misses — subtle ricochet whistle
  function sndMiss() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2800, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.13);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g); g.connect(getMaster());
    osc.start(t); osc.stop(t + 0.13);
  }

  // ── Bullet impact on flesh — wet thud + crack ──────────────────────────
  function sndBulletImpact() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Low-frequency body thud
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(55 + Math.random() * 30, t);
    o1.frequency.exponentialRampToValueAtTime(20, t + 0.12);
    g1.gain.setValueAtTime(0.18, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o1.connect(g1); g1.connect(getMaster()); o1.start(t); o1.stop(t + 0.14);
    // Short burst of filtered noise — the wet slap
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const bf = ac.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 800 + Math.random() * 400;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.22, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    ns.connect(bf); bf.connect(ng); ng.connect(getMaster()); ns.start(t);
  }

  // ── Headshot crunch — skull-crack + wet impact ─────────────────────────
  function sndHeadshotCrunch() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.14);
    noise(0.05, 1200, 3, 0.3);
  }

  // ── Ricochet off building/concrete — metallic ping + whine ─────────────
  function sndRicoBuilding() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // High metallic ping
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.type = 'sine';
    const freq = 1800 + Math.random() * 2200;
    o1.frequency.setValueAtTime(freq, t);
    o1.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.18);
    g1.gain.setValueAtTime(0.06, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o1.connect(g1); g1.connect(getMaster()); o1.start(t); o1.stop(t + 0.2);
    // Whine tail
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(3200 + Math.random() * 1500, t + 0.02);
    o2.frequency.exponentialRampToValueAtTime(200 + Math.random() * 200, t + 0.22);
    g2.gain.setValueAtTime(0.03, t + 0.02); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o2.connect(g2); g2.connect(getMaster()); o2.start(t + 0.02); o2.stop(t + 0.24);
    // Concrete dust noise burst
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.04), ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.12, t); ng.gain.linearRampToValueAtTime(0, t + 0.04);
    ns.connect(ng); ng.connect(getMaster()); ns.start(t);
  }

  // ── Building penetration — deep thump + crumble ────────────────────────
  function sndBuildingPenetrate() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Deep structural thump
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(40 + Math.random() * 20, t);
    o1.frequency.exponentialRampToValueAtTime(15, t + 0.2);
    g1.gain.setValueAtTime(0.15, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o1.connect(g1); g1.connect(getMaster()); o1.start(t); o1.stop(t + 0.22);
    // Crumble noise
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.15), ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06));
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const bf = ac.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 600;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.10, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    ns.connect(bf); bf.connect(ng); ng.connect(getMaster()); ns.start(t);
  }

  // ── Explosion boom — for NLAW / grenade / tank / vehicle kills ──────────
  function sndExplosion() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Sub-bass thump
    const o1 = ac.createOscillator(), g1 = ac.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(60 + Math.random() * 20, t);
    o1.frequency.exponentialRampToValueAtTime(18, t + 0.35);
    g1.gain.setValueAtTime(0.35, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o1.connect(g1); g1.connect(getMaster()); o1.start(t); o1.stop(t + 0.42);
    // Noise burst — the crack/roar
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.08));
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const bf = ac.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.setValueAtTime(3500, t); bf.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.28, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    ns.connect(bf); bf.connect(ng); ng.connect(getMaster()); ns.start(t);
  }

  // ── Crate pickup — satisfying collect chime ────────────────────────────
  function sndCratePickup() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
      o.connect(g); g.connect(getMaster()); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.22);
    });
  }

  // ── Achievement unlock — victory chime (3 ascending notes) ───────────
  function sndAchievement() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    [523.25, 659.25, 1046.5].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.16, t + i * 0.12 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      o.connect(g); g.connect(getMaster()); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.42);
    });
  }

  // ── Crate spawn alert — radar ping ─────────────────────────────────────
  function sndCrateSpawn() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.22);
  }

  // ── Coin earn — short ding ─────────────────────────────────────────
  function sndCoinEarn() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 1200;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.14);
  }

  // ── Health pickup — warm heal tone ─────────────────────────────────────
  function sndHealthPickup() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(440, t); o.frequency.linearRampToValueAtTime(880, t + 0.15);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.32);
  }

  // ── Weapon switch — metallic clack ─────────────────────────────────────
  function sndWeaponSwitch() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Short metallic click
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1);
    const ns = ac.createBufferSource(); ns.buffer = nb;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 4;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.18, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    ns.connect(bp); bp.connect(ng); ng.connect(getMaster()); ns.start(t);
  }

  // ── Low ammo warning tick ──────────────────────────────────────────────
  let _lowAmmoTicked = false;
  function sndLowAmmo() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 1200;
    g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.06);
  }

  // ── Purchase success — ascending cha-ching ─────────────────────────────
  function sndPurchase() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime, m = getMaster();
    [1318, 1760, 2217].forEach(function(f, i) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.07, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      o.connect(g); g.connect(m); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.14);
    });
  }

  // ── Error / insufficient funds — low descending buzz ────────────────────
  function sndError() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(280, t);
    o.frequency.linearRampToValueAtTime(140, t + 0.18);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.22);
  }

  // ── Skill unlock — bright ascending chime ──────────────────────────────
  function sndSkillUnlock() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime, m = getMaster();
    [523, 659, 784, 1047].forEach(function(f, i) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.09, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
      o.connect(g); g.connect(m); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.22);
    });
  }

  // ── Wave / level complete — triumphant ascending fanfare ─────────────────
  // Connects directly to ac.destination (bypasses masterGain so it plays
  // cleanly even as the music fades out simultaneously).
  function sndWaveComplete() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Dedicated output gain so we don't clash with masterGain ramp-down
    const out = ac.createGain();
    out.gain.setValueAtTime(0.72, t);
    out.connect(ac.destination);

    // Ascending C-major arpeggio: C4 E4 G4 C5 E5
    const arpNotes = [261.63, 329.63, 392.00, 523.25, 659.25];
    arpNotes.forEach((freq, i) => {
      const dt = t + i * 0.11;
      // Fundamental sine
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, dt);
      g.gain.setValueAtTime(0, dt);
      g.gain.linearRampToValueAtTime(0.15, dt + 0.022);
      g.gain.exponentialRampToValueAtTime(0.0001, dt + 0.55);
      o.connect(g); g.connect(out);
      o.start(dt); o.stop(dt + 0.60);
      // Triangle harmonic for brightness
      const o2 = ac.createOscillator(), g2 = ac.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(freq * 2, dt);
      g2.gain.setValueAtTime(0, dt);
      g2.gain.linearRampToValueAtTime(0.05, dt + 0.015);
      g2.gain.exponentialRampToValueAtTime(0.0001, dt + 0.35);
      o2.connect(g2); g2.connect(out);
      o2.start(dt); o2.stop(dt + 0.40);
    });

    // Final resolving chord — C5 E5 G5 C6
    const cd = t + arpNotes.length * 0.11 + 0.07;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, cd);
      g.gain.setValueAtTime(0.13 - i * 0.022, cd);
      g.gain.linearRampToValueAtTime(0.13 - i * 0.022, cd + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, cd + 1.15);
      o.connect(g); g.connect(out);
      o.start(cd); o.stop(cd + 1.2);
    });

    // Metallic shimmer transient at the start
    const sh = ac.createOscillator(), sg = ac.createGain();
    sh.type = 'sine';
    sh.frequency.setValueAtTime(4200, t);
    sh.frequency.exponentialRampToValueAtTime(1800, t + 0.18);
    sg.gain.setValueAtTime(0.045, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    sh.connect(sg); sg.connect(out);
    sh.start(t); sh.stop(t + 0.25);
  }

  // ── Defeat stinger — descending minor tone ────────────────────────────
  function sndDefeat() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    [392, 349.2, 293.7, 220].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.18 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.45);
      o.connect(g); g.connect(getMaster()); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.47);
    });
  }

  // ── Programmatic soundtrack ──────────────────────────────────
  // ── Procedural music profiles ─────────────────────────────────────────────
  // Each profile has a distinct modal scale, BPM, wave type & harmony ratio.
  // A NEW profile is randomly selected at session start AND each new wave, so
  // the soundtrack never sounds the same twice across sessions or levels.
  const MUSIC_PROFILES = [
    // 0: D Dorian — tense minor, traditional Ukrainian folk feel
    { bpm: 140, mWave: 'triangle', notes: [146.8,164.8,174.6,220.0,261.6,293.7,329.6,349.2,440.0], bass: [73.4,110.0,130.8,87.3],  harm: 1.500 },
    // 1: E Phrygian — dark/menacing, Balkan edge
    { bpm: 118, mWave: 'sawtooth', notes: [130.8,138.6,164.8,196.0,220.0,261.6,277.2,329.6,392.0], bass: [65.4,82.4,98.0,110.0],   harm: 1.335 },
    // 2: A minor pentatonic — raw heavy drive
    { bpm: 158, mWave: 'square',   notes: [220.0,261.6,293.7,349.2,392.0,440.0,523.3,587.3,659.3], bass: [110.0,87.3,65.4,73.4],   harm: 1.250 },
    // 3: Ukrainian Hutsul scale — mountain folk, modal colour
    { bpm: 106, mWave: 'triangle', notes: [146.8,155.6,185.0,220.0,233.1,277.2,311.1,349.2,415.3], bass: [73.4,92.5,110.0,138.6],  harm: 1.600 },
    // 4: Battle march — fast stomping pulse
    { bpm: 176, mWave: 'square',   notes: [196.0,220.0,246.9,293.7,329.6,392.0,440.0,493.9,587.3], bass: [98.0,87.3,110.0,130.8],  harm: 1.500 },
    // 5: Slow dirge — heavy weight for late waves
    { bpm:  70, mWave: 'sine',     notes: [138.6,155.6,174.6,207.7,246.9,261.6,311.1,349.2,415.3], bass: [69.3,77.8,103.8,87.3],   harm: 1.335 },
    // 6: Bright Lydian — surprising hopeful surge
    { bpm: 144, mWave: 'triangle', notes: [164.8,185.0,196.0,246.9,261.6,329.6,370.0,392.0,493.9], bass: [82.4,98.0,110.0,130.8],  harm: 1.500 },
  ];
  let currentMusicProfile = 0;
  let musicIntervalIds    = [];

  function startMusic() {
    // Allow external override — jukebox.js replaces synth with MP3 tracks
    if (window._arcMusicOverride === true && window.ARC_JUKEBOX) {
      if (musicPlaying) stopMusic();   // kill synth before jukebox plays
      if (!window.ARC_JUKEBOX.isPlaying() && !window.ARC_JUKEBOX.isStarting()) {
        window.ARC_JUKEBOX.play(Math.floor(Math.random() * window.ARC_JUKEBOX.tracks.length));
      }
      return;
    }
    if (typeof window._arcMusicOverride === 'function') { window._arcMusicOverride(); return; }
    if (mutedMusic || musicPlaying) return;
    musicPlaying = true;
    const ac = getACtx();
    // Music routes through its own gain node (independent of SFX volume)
    const getMaster = getMusicGain; // eslint-disable-line no-shadow

    // ── Battle-Rap Techno Engine ────────────────────────────────
    // BPM randomised per session: hard techno / battle rap range
    const BPM     = 158 + Math.floor(Math.random() * 32); // 158-190 upbeat rap/bass range
    const STEP_MS = (60 / BPM) / 4 * 1000;                // 16th note ms

    // Scale library — minor-flavoured for dark battle vibe
    const SCALES = {
      phrygian:  [0,1,3,5,7,8,10],
      dorian:    [0,2,3,5,7,9,10],
      pentMinor: [0,3,5,7,10],
    };
    const scaleKeys = Object.keys(SCALES);
    const scale = SCALES[scaleKeys[Math.floor(Math.random() * scaleKeys.length)]];
    const ROOT  = 36 + Math.floor(Math.random() * 12); // MIDI C2–B2

    const midiToHz = n => 440 * Math.pow(2, (n - 69) / 12);

    // ── Pattern generators (16 steps = 1 bar) ──────────────────
    function entropy() { return Math.random(); }
    function genKickPat() {
      const p = Array(16).fill(0);
      p[0] = p[8] = 1;                      // four-on-floor base
      if (entropy() > 0.5) p[4]  = entropy() > 0.3 ? 1 : 0;
      if (entropy() > 0.5) p[12] = entropy() > 0.3 ? 1 : 0;
      if (entropy() > 0.7) p[2]  = entropy() > 0.6 ? 1 : 0;
      if (entropy() > 0.7) p[14] = entropy() > 0.6 ? 1 : 0;
      return p;
    }
    function genSnarePat() {
      const p = Array(16).fill(0);
      p[4] = p[12] = 1;                     // snare 2+4
      if (entropy() > 0.6) p[14] = 1;
      if (entropy() > 0.7) p[6]  = entropy() > 0.5 ? 1 : 0;
      if (entropy() > 0.8) p[2]  = entropy() > 0.7 ? 1 : 0;
      return p;
    }
    function genHihatPat() {
      return Array(16).fill(0).map((_, i) => {
        if (i % 2 === 0) return entropy() > 0.15 ? 1 : 0;
        return entropy() > 0.55 ? 1 : 0;
      });
    }
    function genBassRiff() {
      // 8-step bassline (each step = 2 16th-notes)
      return Array(8).fill(0).map(() => {
        if (entropy() > 0.35) {
          const deg = scale[Math.floor(entropy() * scale.length)];
          return ROOT + deg + (entropy() > 0.7 ? 12 : 0);
        }
        return 0; // rest
      });
    }
    function genLeadRiff() {
      // 16-step lead melody
      return Array(16).fill(0).map((_, i) => {
        if (entropy() > 0.55 || i % 4 === 0) {
          const oct  = entropy() > 0.45 ? 12 : 0;
          const deg  = scale[Math.floor(entropy() * scale.length)];
          return ROOT + deg + 12 + oct;
        }
        return 0;
      });
    }

    let kickPat  = genKickPat();
    let snarePat = genSnarePat();
    let hatPat   = genHihatPat();
    let bassRiff = genBassRiff();
    let leadRiff = genLeadRiff();

    // ── Per-instrument synth functions ──────────────────────────
    function playKick(t) {
      // 808-style sub kick — deep, punchy, long decay
      const osc  = ac.createOscillator();
      const osc2 = ac.createOscillator();
      const g    = ac.createGain();
      const g2   = ac.createGain();
      osc.type  = 'sine'; osc2.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(42,  t + 0.07);
      osc.frequency.exponentialRampToValueAtTime(30,  t + 0.55);
      osc2.frequency.setValueAtTime(110, t);
      osc2.frequency.exponentialRampToValueAtTime(28, t + 0.14);
      g.gain.setValueAtTime(1.6, t);
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
      g2.gain.setValueAtTime(0.7, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(g); g.connect(getMaster());
      osc2.connect(g2); g2.connect(getMaster());
      osc.start(t); osc.stop(t + 0.65);
      osc2.start(t); osc2.stop(t + 0.40);
      // Punchy click transient
      const nb = ac.createBuffer(1, ac.sampleRate * 0.022, ac.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1);
      const ns = ac.createBufferSource(); ns.buffer = nb;
      const ng = ac.createGain(); ng.gain.setValueAtTime(1.4, t); ng.gain.linearRampToValueAtTime(0, t + 0.020);
      ns.connect(ng); ng.connect(getMaster()); ns.start(t);
    }

    function playSnare(t) {
      const len = ac.sampleRate * 0.2;
      const nb  = ac.createBuffer(1, len, ac.sampleRate);
      const nd  = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
      const ns  = ac.createBufferSource(); ns.buffer = nb;
      const bp  = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 0.7;
      const ng  = ac.createGain(); ng.gain.setValueAtTime(1.2, t); ng.gain.linearRampToValueAtTime(0, t + 0.14);
      ns.connect(bp); bp.connect(ng); ng.connect(getMaster()); ns.start(t);
      // Tone layer
      const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(100, t + 0.08);
      const og  = ac.createGain(); og.gain.setValueAtTime(0.3, t); og.gain.linearRampToValueAtTime(0, t + 0.1);
      osc.connect(og); og.connect(getMaster()); osc.start(t); osc.stop(t + 0.1);
    }

    function playHat(t, open) {
      const len = ac.sampleRate * (open ? 0.18 : 0.05);
      const nb  = ac.createBuffer(1, len, ac.sampleRate);
      const nd  = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * (open ? 0.6 : 0.3)));
      const ns  = ac.createBufferSource(); ns.buffer = nb;
      const hp  = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
      const ng  = ac.createGain(); ng.gain.setValueAtTime(0.35, t); ng.gain.linearRampToValueAtTime(0, t + (open ? 0.18 : 0.05));
      ns.connect(hp); hp.connect(ng); ng.connect(getMaster()); ns.start(t);
    }

    function playBass(t, midi) {
      if (!midi) return;
      const hz  = midiToHz(midi);
      const osc = ac.createOscillator(); osc.type = 'sawtooth';
      const osc2 = ac.createOscillator(); osc2.type = 'square'; osc2.frequency.value = hz * 1.005; // detune
      const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 480; filt.Q.value = 5.5;
      filt.frequency.setValueAtTime(900, t); filt.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      const g   = ac.createGain(); g.gain.setValueAtTime(0.80, t); g.gain.linearRampToValueAtTime(0.60, t + 0.28); g.gain.linearRampToValueAtTime(0, t + 0.38);
      osc.frequency.value = hz;
      osc.connect(filt); osc2.connect(filt); filt.connect(g); g.connect(getMaster());
      osc.start(t); osc2.start(t); osc.stop(t + 0.32); osc2.stop(t + 0.32);
    }

    function playLead(t, midi) {
      if (!midi) return;
      const hz  = midiToHz(midi);
      const osc = ac.createOscillator(); osc.type = 'square';
      const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2200 + Math.random() * 800;
      const g   = ac.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.frequency.setValueAtTime(hz, t);
      osc.connect(filt); filt.connect(g); g.connect(getMaster());
      osc.start(t); osc.stop(t + 0.14);
    }

    // ── Scheduler ───────────────────────────────────────────────
    let step   = 0;
    let bar    = 0;
    let lastAt = ac.currentTime;

    const stepSec = STEP_MS / 1000;
    const LOOK_AHEAD = STEP_MS * 2.5 / 1000; // schedule 2.5 steps ahead

    function scheduleStep(when) {
      const s = step % 16;
      // Drums
      if (kickPat[s])  playKick(when);
      if (snarePat[s]) playSnare(when);
      if (hatPat[s])   playHat(when, s % 8 === 4);
      // Bass (every 2 steps)
      if (s % 2 === 0) playBass(when, bassRiff[(s / 2) % bassRiff.length]);
      // Lead melody
      if (leadRiff[s]) playLead(when, leadRiff[s]);
    }

    let nextStepTime = ac.currentTime + 0.05;
    const tickerId = setInterval(() => {
      while (nextStepTime < ac.currentTime + LOOK_AHEAD) {
        scheduleStep(nextStepTime);
        nextStepTime += stepSec;
        step++;
        // End of bar?
        if (step % 16 === 0) {
          bar++;
          // Mutate hihat every 2 bars
          if (bar % 2 === 0) hatPat = genHihatPat();
          // Mutate kick/snare every 3 bars
          if (bar % 3 === 0) { kickPat = genKickPat(); snarePat = genSnarePat(); }
          // Regenerate bass+lead every 4 bars — true never-repeating
          if (bar % 4 === 0) { bassRiff = genBassRiff(); leadRiff = genLeadRiff(); }
        }
      }
    }, Math.max(8, STEP_MS * 0.4));

    musicStop = function () {
      clearInterval(tickerId);
      try {
        const mg = getMaster();
        mg.gain.setValueAtTime(mg.gain.value, ac.currentTime);
        mg.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.4);
        setTimeout(() => {
          mg.gain.setValueAtTime(0.7, ac.currentTime);
          musicPlaying = false;
        }, 450);
      } catch(e) { musicPlaying = false; }
    };
  }

  function stopMusic() {
    if (musicStop) { musicStop(); musicStop = null; }
    else musicPlaying = false;
    // Also pause jukebox MP3 if playing
    if (window.ARC_JUKEBOX && typeof ARC_JUKEBOX.pause === 'function') ARC_JUKEBOX.pause();
  }

  function stopAllAudio() {
    stopMusic();
    if (window.ARC_JUKEBOX && typeof ARC_JUKEBOX.pause === 'function') ARC_JUKEBOX.pause();
  }

  // ── Ukrainian Defender Facts — shown randomly every time the game is paused ─
  const UA_FACTS = [
    { title: 'Gostomel Airport — Feb 24, 2022',
      fact: 'Ukrainian defenders poured fuel oil across Antonov Airport runways to prevent Russian transport aircraft from landing in the opening hours of the full-scale invasion — buying critical time for reinforcements.' },
    { title: 'Snake Island — "Russian warship, go f*** yourself"',
      fact: '13 Ukrainian border guards on tiny Zmiinyi Island refused to surrender to a Russian warship. Their reply became a global symbol of resistance. All 13 survived and were later awarded Hero of Ukraine medals.' },
    { title: 'Ghost of Kyiv',
      fact: 'Ukrainian MiG-29 pilots flew back-to-back combat sorties for days to defend Kyiv\'s airspace in February 2022. Their relentless endurance under impossible odds inspired the legend of the "Ghost of Kyiv."' },
    { title: 'Tractor Army',
      fact: 'Viral videos showed Ukrainian farmers towing abandoned Russian tanks and military vehicles off their fields using farm tractors. Social media dubbed them the "Tractor Army" — a meme of civilian defiance worldwide.' },
    { title: 'Bayraktar Folk Song',
      fact: 'Ukrainian TB2 Bayraktar drones proved so effective against Russian armour in the early weeks that a folk song celebrating them topped Ukrainian music charts and became an anthem of resistance.' },
    { title: 'Azovstal Steel Plant — 82 Days',
      fact: 'Ukrainian defenders — and thousands of trapped civilians including children — held out for 82 days inside the tunnels of the Azovstal steelworks in Mariupol under relentless bombardment before a negotiated evacuation.' },
    { title: 'Moskva Cruiser Sunk',
      fact: 'On April 13–14 2022 Ukraine struck the Russian Black Sea Fleet flagship Moskva with two Neptune anti-ship missiles. The 12,000-tonne cruiser sank — the largest warship lost in combat since the Falklands War.' },
    { title: 'IT Army of Ukraine',
      fact: 'Within days of the invasion Ukraine\'s volunteer "IT Army" grew to over 400,000 cyber-fighters worldwide, launching coordinated attacks against Russian state media, banks, railways and government portals.' },
    { title: 'Sunflower Seeds',
      fact: 'A Ukrainian woman confronted Russian soldiers and offered them sunflower seeds — Ukraine\'s national flower. "Put them in your pockets," she said, "so sunflowers grow where you fall." The clip spread worldwide.' },
    { title: 'Medics Under Fire',
      fact: 'Ukrainian combat medics — many of them women volunteers — evacuated wounded soldiers under direct fire throughout the war, keeping survival rates far above historical wartime averages.' },
    { title: 'Bridge Demolitions — 300+',
      fact: 'Ukrainian combat engineers demolished over 300 bridges in the path of Russian columns, turning every river crossing into a lethal chokepoint and stalling armoured thrusts for days or weeks.' },
    { title: 'Kherson Liberation — Nov 11, 2022',
      fact: 'Ukrainian forces liberated Kherson city in a multi-axis advance. Thousands of residents poured into the streets waving Ukrainian flags — scenes broadcast live around the world.' },
    { title: 'Territorial Defence Force',
      fact: 'Teachers, engineers, bakers and doctors with no military background joined Ukraine\'s Territorial Defence Forces, received weapons and training, and within weeks were defending the streets of their own cities.' },
    { title: 'Human Chain — January 21, 1990',
      fact: 'Over 300,000 Ukrainians formed a human chain stretching 500 km from Kyiv to Lviv on Ukraine Unity Day 1990, demanding independence from the USSR. The tradition of peaceful mass resistance runs deep.' },
    { title: '"Mriya" — Dream Reborn',
      fact: 'Russia destroyed the An-225 Mriya — the world\'s largest aircraft — at Hostomel in 2022. Ukraine announced plans to rebuild it. "Mriya" means "Dream" in Ukrainian.' },
    { title: 'Bakhmut — 200+ Days',
      fact: 'Ukrainian troops defended the city of Bakhmut for over 200 days against massively superior Russian force, grinding down enormous enemy reserves of manpower and equipment.' },
    { title: 'Dnipro River Crossings',
      fact: 'Ukrainian special forces paddled across the wide Dnipro River in small inflatable boats under artillery fire to establish bridgeheads — echoing partisan operations from World War II.' },
    { title: 'Saint Javelin',
      fact: 'The NLAW and Javelin shoulder-fired anti-tank missiles were nicknamed "Saint Javelin" by troops. Thousands of Russian armoured vehicles were destroyed by man-portable systems in the first months.' },
    { title: 'Signal Fires in Occupied Territories',
      fact: 'Ukrainian partisans behind enemy lines secretly marked Russian military convoys with GPS co-ordinates and lighting signals, guiding precision missile and drone strikes from hundreds of kilometres away.' },
    { title: 'Captured Tanks, Ukrainian Colours',
      fact: 'Ukraine captured so many abandoned Russian tanks that some were repainted in Ukrainian colours and returned to service — a powerful symbol shared globally that boosted morale worldwide.' },
  ];
  let _factsSeen = [];

  function getNextFact() {
    if (_factsSeen.length >= UA_FACTS.length) _factsSeen = []; // full cycle reset
    let idx;
    do { idx = Math.floor(Math.random() * UA_FACTS.length); } while (_factsSeen.includes(idx));
    _factsSeen.push(idx);
    return UA_FACTS[idx];
  }

  function showPauseFact() {
    const f = getNextFact();
    const html = '<div class="pf-kicker">\u{1F1FA}\u{1F1E6} TRUE STORY</div>' +
                 '<div class="pf-heading">' + f.title + '</div>' +
                 '<div class="pf-body">' + f.fact + '</div>';
    $('#pause-fact-box').html(html).addClass('visible');
  }

  // ── Parallax ────────────────────────────────────────────────
  const $canves = $('#canves');

  // Cache parallax layers and depths once (never change after load)
  const $parallaxLayers = $('#canves .parallax-layer');
  const _parallaxDepths = [];
  $parallaxLayers.each(function () { _parallaxDepths.push(parseFloat($(this).data('depth')) || 0.05); });

  var _parallaxRafPending = false;
  $canves.on('mousemove', function (e) {
    if (_parallaxRafPending) return;
    _parallaxRafPending = true;
    var _mx = e.clientX, _my = e.clientY, _el = this;
    requestAnimationFrame(function() {
      _parallaxRafPending = false;
      var rect = _el.getBoundingClientRect();
      var cx = rect.width / 2, cy = rect.height / 2;
      var mx = _mx - rect.left - cx;
      var my = _my - rect.top  - cy;
      $parallaxLayers.each(function (i) {
        var d = _parallaxDepths[i];
        this.style.transform = 'translate(' + (mx * d) + 'px,' + (my * d) + 'px)';
      });
    });
  });

  // ── Background availability cache ─────────────────────────────────
  // Probes images/background/bg-{N}.png via Image(); stores which exist.
  // Admin uploads add to this cache instantly so no page reload needed.
  var _bgAvail = {};       // { waveNum: true/false }
  var _bgProbed = {};      // tracks which waves we already probed
  function probeBg(w, cb) {
    if (_bgProbed[w]) { cb(_bgAvail[w]); return; }
    var img = new Image();
    img.onload  = function () { _bgAvail[w] = true;  _bgProbed[w] = true; cb(true);  };
    img.onerror = function () { _bgAvail[w] = false; _bgProbed[w] = true; cb(false); };
    img.src = 'images/background/bg-' + w + '.png?probe=' + Date.now();
  }
  // Pre-probe waves 1-20 at boot (non-blocking, parallel)
  for (var _pw = 1; _pw <= 20; _pw++) { (function(w){ probeBg(w, function(){}); })(_pw); }
  // Expose for admin panel to invalidate after upload
  window._bgInvalidate = function(w) { _bgProbed[w] = false; _bgAvail[w] = false; };

  // Cross-fade the far parallax layer between wave backgrounds (juice — showcases
  // the per-wave art instead of an instant swap). Instant fallback on reduced motion.
  var _curFarBg = null, _curFarOpacity = 0.92;
  function _crossfadeFarTo(newBg, op) {
    var $far = $('#parallax-far');
    if (!$far.length) return;
    op = (op == null) ? 0.92 : op;
    if (window._reducedMotion || _curFarBg === null) {
      $far.css({ background: newBg, opacity: op });
      _curFarBg = newBg; _curFarOpacity = op; return;
    }
    if (newBg === _curFarBg) { $far.css({ opacity: op }); _curFarOpacity = op; return; }
    var $prev = $('#parallax-far-prev');
    if (!$prev.length) {
      $prev = $('<div class="parallax-layer" id="parallax-far-prev" aria-hidden="true"></div>');
      $far.after($prev); // sits above #parallax-far (also via z-index)
    }
    // Outgoing image goes ON TOP at full, then fades out to reveal the new far bg
    // beneath. Transition is set inline so the parallax mouse handler can't strip it.
    $prev.css({ background: _curFarBg, opacity: _curFarOpacity, display: 'block', transition: 'none' });
    void $prev[0].offsetWidth;                          // commit the start state
    $far.css({ background: newBg, opacity: op });       // new bg instantly underneath
    $prev.css({ transition: 'opacity 1.1s ease', opacity: 0 });
    _curFarBg = newBg; _curFarOpacity = op;
  }

  // Sync parallax bg images with wave
  function updateParallaxBg(wave) {
    // Check if a raster bg exists for this wave (any wave, not just 1-4)
    function _applyRaster() {
      var bgUrl = 'url("images/background/bg-' + wave + '.png")';
      _crossfadeFarTo(bgUrl + ' center/cover no-repeat', 0.92);
      $('#parallax-mid').css({ background: 'none', opacity: 0.10 });
      $('#parallax-near').css({ background: 'none', opacity: 0.04 });
      spawnDistantBg(wave);
    }
    // If already probed, use cached result; otherwise probe then apply
    if (_bgProbed[wave]) {
      if (_bgAvail[wave]) { _applyRaster(); return; }
      // else fall through to procedural
    } else {
      probeBg(wave, function (exists) {
        if (exists) { _applyRaster(); return; }
        _applyProcedural(wave);
      });
      return; // async path — will apply when probe completes
    }
    _applyProcedural(wave);
  }
  function _applyProcedural(wave) {
    // Procedurally generated unique random environment per wave
    // Seed-based RNG for deterministic per-wave colors (same wave = same look)
    var _seed = wave * 2654435761 >>> 0;
    function _rng() { _seed ^= _seed << 13; _seed ^= _seed >> 17; _seed ^= _seed << 5; return (_seed >>> 0) / 4294967296; }
    // Random hue for this wave's palette
    var baseHue = Math.floor(_rng() * 360);
    var drift = Math.floor(_rng() * 40) - 20;
    // Intensity grows with wave depth — later waves get darker/more saturated
    var depth = Math.min(wave - 4, 30);
    var sat = Math.max(10, 45 - depth);
    var litBase = Math.max(4, 18 - depth * 0.4);
    var litMid = litBase + 8 + Math.floor(_rng() * 6);
    var litHi = litMid + 6 + Math.floor(_rng() * 8);
    var litBot = Math.max(3, litBase - 2);
    var h1 = (baseHue + drift) % 360, h2 = (baseHue + 60) % 360;
    var far = 'linear-gradient(180deg,' +
      ' hsl(' + h1 + ',' + sat + '%,' + litBase + '%) 0%,' +
      ' hsl(' + baseHue + ',' + (sat + 5) + '%,' + litMid + '%) 30%,' +
      ' hsl(' + h2 + ',' + (sat + 8) + '%,' + litHi + '%) 60%,' +
      ' hsl(' + h1 + ',' + sat + '%,' + litBot + '%) 100%)';
    // Optional atmospheric overlays: fog, fire, aurora
    var fxRoll = _rng();
    var midBg = 'none';
    if (fxRoll < 0.3) {
      // Fog overlay
      midBg = 'linear-gradient(180deg, rgba(180,180,200,0.06) 0%, rgba(120,120,140,0.03) 50%, transparent 100%)';
    } else if (fxRoll < 0.55) {
      // Fire glow overlay
      midBg = 'linear-gradient(180deg, rgba(200,80,20,0.07) 0%, rgba(160,40,10,0.04) 50%, transparent 100%)';
    } else if (fxRoll < 0.75) {
      // Aurora shimmer
      midBg = 'linear-gradient(180deg, rgba(40,200,150,0.05) 0%, rgba(80,60,200,0.04) 50%, transparent 100%)';
    }
    _crossfadeFarTo(far, 0.92);
    $('#parallax-mid').css({ background: midBg, opacity: midBg === 'none' ? 0 : 0.08 });
    $('#parallax-near').css({ background: 'none', opacity: 0 });
    spawnDistantBg(wave);
  } // end _applyProcedural


  // ── Procedural Distant Background Silhouettes ──────────────────────────────
  // Destroyed cityscape silhouettes for depth — war-ravaged urban skyline.
  const DISTANT_SILHOUETTES = [
    // 0 — Apartment block (bombed-out upper floors)
    function (h) {
      const w = 60 + Math.floor(Math.random() * 30);
      const floors = 4 + Math.floor(Math.random() * 3);
      let rects = '';
      for (let i = 0; i < floors; i++) {
        const fy = h - 12 - i * 16;
        const fw = w - 8 - Math.floor(Math.random() * (i > floors - 2 ? 20 : 4));
        const op = i >= floors - 1 ? 0.35 : 0.7;
        rects += '<rect x="4" y="' + fy + '" width="' + fw + '" height="14" fill="rgba(30,28,26,' + op + ')" rx="1"/>';
        for (let j = 0; j < Math.floor(fw / 10); j++) {
          const lit = Math.random() < 0.15 ? 'rgba(255,180,50,.6)' : 'rgba(10,10,10,.5)';
          rects += '<rect x="' + (7 + j * 10) + '" y="' + (fy + 3) + '" width="5" height="7" fill="' + lit + '"/>';
        }
      }
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' + rects + '</svg>';
    },
    // 1 — Factory smokestack
    function (h) {
      const sw = 14 + Math.floor(Math.random() * 6), sh = 50 + Math.floor(Math.random() * 30), w = sw + 20;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="' + ((w - sw) / 2) + '" y="' + (h - sh) + '" width="' + sw + '" height="' + sh + '" fill="rgba(40,35,30,.75)" rx="2"/>' +
        '<rect x="' + ((w - sw) / 2 - 8) + '" y="' + (h - 18) + '" width="' + (sw + 16) + '" height="18" fill="rgba(35,30,25,.65)" rx="1"/>' +
        '</svg>';
    },
    // 2 — Church / cathedral (dome + cross)
    function (h) {
      const w = 50, baseY = h - 30;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="10" y="' + baseY + '" width="30" height="30" fill="rgba(35,30,28,.7)" rx="1"/>' +
        '<ellipse cx="25" cy="' + baseY + '" rx="18" ry="14" fill="rgba(38,33,30,.65)"/>' +
        '<line x1="25" y1="' + (baseY - 22) + '" x2="25" y2="' + (baseY - 6) + '" stroke="rgba(50,45,40,.6)" stroke-width="3"/>' +
        '<line x1="20" y1="' + (baseY - 16) + '" x2="30" y2="' + (baseY - 16) + '" stroke="rgba(50,45,40,.6)" stroke-width="2"/>' +
        '</svg>';
    },
    // 3 — Collapsed bridge segment
    function (h) {
      const w = 90 + Math.floor(Math.random() * 30), deckY = h - 14, angle = -3 - Math.floor(Math.random() * 5);
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="8" y="' + (deckY - 4) + '" width="' + (w * 0.6) + '" height="6" fill="rgba(45,40,35,.6)" rx="1" transform="rotate(' + angle + ' 8 ' + deckY + ')"/>' +
        '<rect x="6" y="' + (h - 28) + '" width="8" height="28" fill="rgba(40,35,30,.55)"/>' +
        '<rect x="' + (w * 0.55) + '" y="' + (h - 20) + '" width="8" height="20" fill="rgba(40,35,30,.45)"/>' +
        '</svg>';
    },
    // 4 — TV / radio tower (skeletal)
    function (h) {
      const w = 30, th = 70 + Math.floor(Math.random() * 20), topY = h - th;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<line x1="15" y1="' + topY + '" x2="8" y2="' + h + '" stroke="rgba(50,45,40,.5)" stroke-width="2"/>' +
        '<line x1="15" y1="' + topY + '" x2="22" y2="' + h + '" stroke="rgba(50,45,40,.5)" stroke-width="2"/>' +
        '<line x1="8" y1="' + (topY + th * 0.4) + '" x2="22" y2="' + (topY + th * 0.4) + '" stroke="rgba(50,45,40,.4)" stroke-width="1.5"/>' +
        '<line x1="9" y1="' + (topY + th * 0.7) + '" x2="21" y2="' + (topY + th * 0.7) + '" stroke="rgba(50,45,40,.4)" stroke-width="1.5"/>' +
        '<circle cx="15" cy="' + topY + '" r="3" fill="rgba(255,40,40,.4)"/>' +
        '</svg>';
    },
    // 5 — Water tower (tilting)
    function (h) {
      const w = 40, tilt = Math.random() < 0.5 ? -4 : 4, tankY = h - 55;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<g transform="rotate(' + tilt + ' 20 ' + h + ')">' +
        '<rect x="16" y="' + (tankY + 16) + '" width="8" height="' + (h - tankY - 16) + '" fill="rgba(45,40,35,.55)"/>' +
        '<ellipse cx="20" cy="' + (tankY + 10) + '" rx="16" ry="10" fill="rgba(50,45,40,.6)"/>' +
        '<rect x="4" y="' + tankY + '" width="32" height="12" fill="rgba(50,45,40,.55)" rx="2"/>' +
        '</g></svg>';
    },
    // 6 — Ruined silo / grain elevator
    function (h) {
      const w = 32, sh = 45 + Math.floor(Math.random() * 15);
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="4" y="' + (h - sh) + '" width="24" height="' + sh + '" fill="rgba(42,38,34,.65)" rx="12"/>' +
        '<ellipse cx="16" cy="' + (h - sh) + '" rx="12" ry="5" fill="rgba(48,43,38,.5)"/>' +
        '</svg>';
    },
    // 7 — Crane (half-collapsed)
    function (h) {
      const w = 65, mY = h - 70;
      return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
        '<line x1="20" y1="' + mY + '" x2="20" y2="' + h + '" stroke="rgba(50,45,40,.5)" stroke-width="3"/>' +
        '<line x1="20" y1="' + mY + '" x2="58" y2="' + (mY + 8) + '" stroke="rgba(50,45,40,.45)" stroke-width="2"/>' +
        '<line x1="20" y1="' + mY + '" x2="18" y2="' + (mY - 12) + '" stroke="rgba(50,45,40,.4)" stroke-width="2"/>' +
        '<line x1="58" y1="' + (mY + 8) + '" x2="58" y2="' + (mY + 18) + '" stroke="rgba(45,40,35,.3)" stroke-width="1"/>' +
        '</svg>';
    },
  ];

  function spawnDistantBg(wv) {
    $canves.find('.bg-silhouette').remove();
    const canvW = $canves[0].offsetWidth;
    const total = getRandom(3 + wv, 4 + wv + Math.floor(wv / 2));
    const usedX = [];
    const pool = DISTANT_SILHOUETTES.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < total; i++) {
      const gen = pool[i % pool.length];
      const svg = gen(80 + Math.floor(Math.random() * 40));
      let posX = getRandom(20, canvW - 80);
      let tries = 0;
      while (tries < 10 && usedX.some(x => Math.abs(x - posX) < 70)) { posX = getRandom(20, canvW - 80); tries++; }
      usedX.push(posX);
      const depth = Math.random();
      const scale = 0.35 + depth * 0.45;
      const opacity = 0.15 + depth * 0.25;
      const blur = 1.5 - depth * 1.0;
      const bottomPct = 38 + depth * 22;
      const flipX = Math.random() < 0.4 ? -1 : 1;
      $('<div class="bg-silhouette"></div>').html(svg).css({
        position: 'absolute',
        left: posX + 'px',
        bottom: bottomPct + '%',
        zIndex: 1 + Math.floor(depth * 3),
        transform: 'scaleX(' + flipX + ') scale(' + scale.toFixed(2) + ')',
        opacity: opacity.toFixed(2),
        filter: 'blur(' + blur.toFixed(1) + 'px)',
        pointerEvents: 'none',
        userSelect: 'none',
      }).appendTo($canves);
    }
  }


  // ── Bullet trace (’tracer’ line from gun origin to cursor) ─────────────────
  function doBulletTrace(ex, ey) {
    const cw = $canves[0].offsetWidth,  ch = $canves[0].offsetHeight;
    const sx = cw / 2,  sy = ch - 55;          // gun origin = bottom-centre (matches shooter-hud)
    const dx = ex - sx,  dy = ey - sy;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const $tr = $('<div class="bullet-trace"></div>').css({
      left: sx + 'px', top: sy + 'px', width: len + 'px',
      transform: 'rotate(' + ang + 'deg)',
    });
    $canves.append($tr);
    setTimeout(() => $tr.remove(), 420);
  }

  // ── Hit marker ─────────────────────────────────────────────────────────────
  function doHitMarker(ex, ey, isHeadshot) {
    const label = isHeadshot ? '\u2620 HEADSHOT!' : '\u2022';
    const cls   = 'hit-marker' + (isHeadshot ? ' headshot' : '');
    const $hm   = $('<div></div>').addClass(cls).text(label).css({ left: ex + 'px', top: ey + 'px' });
    $canves.append($hm);
    setTimeout(() => $hm.remove(), 700);
    doDamageNumber(ex, ey, isHeadshot);
  }

  // \u2500\u2500 Floating damage number (juice) \u2014 pops the per-weapon damage at the hit \u2500\u2500
  function doDamageNumber(ex, ey, isHeadshot) {
    var w = WEAPONS[currentWeapon];
    var base = (w && w.dmg) ? w.dmg : 1;
    var dmg  = isHeadshot ? base * 3 : base;
    var jx   = Math.random() * 22 - 11; // horizontal jitter so stacked hits fan out
    var $n = $('<div></div>')
      .addClass('dmg-number' + (isHeadshot ? ' dmg-number--crit' : ''))
      .text(isHeadshot ? ('\u2620' + dmg) : dmg)
      .css({ left: (ex + jx) + 'px', top: ey + 'px' });
    $canves.append($n);
    setTimeout(function () { $n.remove(); }, 750);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── FOREGROUND RUINS ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // 15 Ukrainian-war-themed variants. spawnRuins() stamps unique gradient IDs
  // per instance so defs don't clash when the same variant appears twice.
  // Pool split: CIVILIAN 0,1,3,4,7,8,9,10,11,12 | MIL 2,4,5,6,13,14
  const RUIN_VARIANTS = [

    // 0 – Bullet-pocked brick wall
    `<svg width="118" height="168" viewBox="0 0 118 168" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GW" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#9a7050"/>
          <stop offset="55%"  stop-color="#6a4828"/>
          <stop offset="100%" stop-color="#3a2010"/>
        </linearGradient>
        <radialGradient id="GH" cx="50%" cy="50%" r="48%">
          <stop offset="0%"   stop-color="#0a0400"/>
          <stop offset="100%" stop-color="#3a1808"/>
        </radialGradient>
      </defs>
      <rect x="0" y="40" width="118" height="128" fill="url(#GW)"/>
      <!-- brick rows alternating offset, rows darken toward base -->
      <rect x="1"  y="41" width="36" height="12" rx="1" fill="#9a7040" opacity="0.55"/>
      <rect x="40" y="41" width="38" height="12" rx="1" fill="#8a6030" opacity="0.55"/>
      <rect x="81" y="41" width="36" height="12" rx="1" fill="#9a7040" opacity="0.55"/>
      <rect x="1"  y="55" width="18" height="12" rx="1" fill="#906030" opacity="0.5"/>
      <rect x="22" y="55" width="36" height="12" rx="1" fill="#9a7040" opacity="0.5"/>
      <rect x="61" y="55" width="38" height="12" rx="1" fill="#8a6030" opacity="0.5"/>
      <rect x="1"  y="69" width="44" height="12" rx="1" fill="#9a6835" opacity="0.45"/>
      <rect x="1"  y="83" width="36" height="12" rx="1" fill="#7a5025" opacity="0.45"/>
      <rect x="40" y="83" width="18" height="12" rx="1" fill="#8a6030" opacity="0.45"/>
      <rect x="1"  y="97" width="36" height="12" rx="1" fill="#7a5025" opacity="0.4"/>
      <rect x="40" y="97" width="38" height="12" rx="1" fill="#8a6030" opacity="0.4"/>
      <rect x="81" y="97" width="36" height="12" rx="1" fill="#7a5025" opacity="0.4"/>
      <rect x="1"  y="111" width="18" height="12" rx="1" fill="#8a6030" opacity="0.35"/>
      <rect x="22" y="111" width="36" height="12" rx="1" fill="#7a5025" opacity="0.35"/>
      <rect x="61" y="111" width="38" height="12" rx="1" fill="#8a6030" opacity="0.35"/>
      <rect x="1"  y="125" width="36" height="12" rx="1" fill="#7a4a20" opacity="0.3"/>
      <rect x="40" y="125" width="38" height="12" rx="1" fill="#8a5a28" opacity="0.3"/>
      <rect x="81" y="125" width="36" height="12" rx="1" fill="#7a4a20" opacity="0.3"/>
      <rect x="1"  y="139" width="22" height="12" rx="1" fill="#7a5025" opacity="0.28"/>
      <rect x="26" y="139" width="36" height="12" rx="1" fill="#8a5a28" opacity="0.28"/>
      <rect x="65" y="139" width="52" height="12" rx="1" fill="#7a4a20" opacity="0.28"/>
      <!-- blast hole -->
      <ellipse cx="88" cy="82" rx="24" ry="30" fill="url(#GH)"/>
      <ellipse cx="88" cy="82" rx="24" ry="30" fill="none" stroke="#8a5020" stroke-width="4" opacity="0.5"/>
      <!-- broken/jagged top -->
      <polygon points="0,40 9,28 20,38 33,18 47,33 60,14 74,28 88,12 103,26 118,16 118,40" fill="url(#GW)"/>
      <!-- light on broken top edge -->
      <polyline points="0,40 9,28 20,38 33,18 47,33 60,14 74,28 88,12 103,26 118,16" fill="none" stroke="rgba(255,220,140,0.25)" stroke-width="2"/>
      <!-- debris pile -->
      <polygon points="0,168 0,151 12,146 26,156 40,143 55,154 70,145 83,153 96,142 112,151 118,148 118,168" fill="#4a3020"/>
      <polygon points="0,168 0,158 10,154 24,162 38,156 50,164 64,158 76,163 91,156 107,162 118,158 118,168" fill="#6a4a2a"/>
      <!-- bullet holes + radial cracks -->
      <circle cx="22" cy="62" r="4" fill="#0a0400"/>
      <circle cx="22" cy="62" r="7" fill="none" stroke="#5a3018" stroke-width="1.5" opacity="0.7"/>
      <line x1="15" y1="55" x2="22" y2="62" stroke="#4a2810" stroke-width="1" opacity="0.5"/>
      <line x1="29" y1="55" x2="22" y2="62" stroke="#4a2810" stroke-width="1" opacity="0.5"/>
      <circle cx="49" cy="104" r="3.5" fill="#0a0400"/>
      <circle cx="49" cy="104" r="6" fill="none" stroke="#5a3018" stroke-width="1.2" opacity="0.6"/>
      <circle cx="34" cy="138" r="2.5" fill="#0a0400"/>
      <circle cx="34" cy="138" r="4.5" fill="none" stroke="#5a3018" stroke-width="1" opacity="0.5"/>
    </svg>`,

    // 1 – Sandbag fortification (UA flag colour bags)
    `<svg width="185" height="108" viewBox="0 0 185 108" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="GS1" cx="40%" cy="38%" r="55%">
          <stop offset="0%"   stop-color="#b89870"/>
          <stop offset="100%" stop-color="#6a5030"/>
        </radialGradient>
        <radialGradient id="GS2" cx="40%" cy="38%" r="55%">
          <stop offset="0%"   stop-color="#2a86ee"/>
          <stop offset="100%" stop-color="#003890"/>
        </radialGradient>
        <radialGradient id="GS3" cx="40%" cy="38%" r="55%">
          <stop offset="0%"   stop-color="#ffe050"/>
          <stop offset="100%" stop-color="#c09000"/>
        </radialGradient>
      </defs>
      <!-- ground shadow -->
      <ellipse cx="92" cy="105" rx="88" ry="6" fill="rgba(0,0,0,0.3)"/>
      <!-- Bottom row of bags -->
      <ellipse cx="18"  cy="90" rx="20" ry="13" fill="url(#GS1)"/>
      <ellipse cx="56"  cy="88" rx="22" ry="14" fill="url(#GS2)"/>
      <ellipse cx="94"  cy="90" rx="20" ry="13" fill="url(#GS3)"/>
      <ellipse cx="132" cy="88" rx="22" ry="14" fill="url(#GS1)"/>
      <ellipse cx="170" cy="90" rx="14" ry="12" fill="url(#GS2)"/>
      <!-- rope tie marks on bottom row -->
      <line x1="18"  y1="80" x2="18"  y2="98" stroke="#4a3810" stroke-width="1.5" opacity="0.6"/>
      <line x1="56"  y1="76" x2="56"  y2="96" stroke="#003080" stroke-width="1.5" opacity="0.4"/>
      <line x1="94"  y1="80" x2="94"  y2="98" stroke="#806000" stroke-width="1.5" opacity="0.4"/>
      <line x1="132" y1="76" x2="132" y2="96" stroke="#4a3810" stroke-width="1.5" opacity="0.6"/>
      <!-- Second row (slightly higher and inset) -->
      <ellipse cx="37"  cy="70" rx="22" ry="13" fill="url(#GS1)"/>
      <ellipse cx="77"  cy="68" rx="22" ry="13" fill="url(#GS3)"/>
      <ellipse cx="116" cy="70" rx="20" ry="12" fill="url(#GS2)"/>
      <ellipse cx="153" cy="68" rx="18" ry="12" fill="url(#GS1)"/>
      <line x1="37"  y1="60" x2="37"  y2="78" stroke="#4a3810" stroke-width="1.5" opacity="0.5"/>
      <line x1="77"  y1="58" x2="77"  y2="76" stroke="#806000" stroke-width="1.5" opacity="0.4"/>
      <line x1="116" y1="60" x2="116" y2="78" stroke="#003080" stroke-width="1.5" opacity="0.4"/>
      <!-- Third (top) row -->
      <ellipse cx="58"  cy="50" rx="20" ry="12" fill="url(#GS2)"/>
      <ellipse cx="96"  cy="48" rx="22" ry="12" fill="url(#GS1)"/>
      <ellipse cx="134" cy="50" rx="18" ry="11" fill="url(#GS3)"/>
      <line x1="58"  y1="40" x2="58"  y2="58" stroke="#003080" stroke-width="1.5" opacity="0.4"/>
      <line x1="96"  y1="38" x2="96"  y2="56" stroke="#4a3810" stroke-width="1.5" opacity="0.5"/>
      <!-- stray bag on top right -->
      <ellipse cx="155" cy="32" rx="16" ry="10" fill="url(#GS1)" transform="rotate(-12 155 32)"/>
      <line x1="155" y1="24" x2="155" y2="40" stroke="#4a3810" stroke-width="1.5" opacity="0.5"/>
      <!-- wood stake -->
      <rect x="3" y="50" width="8" height="52" rx="2" fill="#7a5a28"/>
      <polygon points="3,50 7,40 11,50" fill="#6a4a18"/>
    </svg>`,

    // 2 – Burning Russian APC with crossed-out Z (all waves)
    `<svg width="218" height="118" viewBox="0 0 218 118" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#4a4a3a"/>
          <stop offset="100%" stop-color="#1a1a12"/>
        </linearGradient>
        <radialGradient id="GF" cx="50%" cy="80%" r="50%">
          <stop offset="0%"   stop-color="#FFD700" stop-opacity="0.95"/>
          <stop offset="40%"  stop-color="#ff6600" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#1a0200"  stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Track assembly  -->
      <rect x="6"  y="80" width="195" height="28" rx="6" fill="#111"/>
      <!-- Road wheels -->
      <circle cx="24"  cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="24"  cy="97" r="5"  fill="#111"/>
      <circle cx="55"  cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="55"  cy="97" r="5"  fill="#111"/>
      <circle cx="86"  cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="86"  cy="97" r="5"  fill="#111"/>
      <circle cx="117" cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="117" cy="97" r="5"  fill="#111"/>
      <circle cx="148" cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="148" cy="97" r="5"  fill="#111"/>
      <circle cx="179" cy="97" r="11" fill="#222" stroke="#333" stroke-width="1.5"/>
      <circle cx="179" cy="97" r="5"  fill="#111"/>
      <!-- Hull body -->
      <polygon points="4,84 4,40 28,28 186,28 206,38 210,84" fill="url(#GV)"/>
      <!-- Hull top slope highlight -->
      <polygon points="28,28 186,28 186,36 28,36" fill="rgba(255,255,200,0.07)"/>
      <!-- Hatch / turret ring -->
      <ellipse cx="118" cy="29" rx="26" ry="8" fill="#1a1a12" stroke="#2a2a20" stroke-width="1.5"/>
      <rect x="104" y="10" width="28" height="20" rx="3" fill="#1a1a12" stroke="#2a2a1a" stroke-width="1.5"/>
      <!-- Gun stub (deformed) -->
      <rect x="190" y="17" width="28" height="7" rx="3" fill="#2a2a20" transform="rotate(-8 190 20)"/>
      <!-- Side ports / hatches -->
      <rect x="44"  y="44" width="24" height="16" rx="2" fill="#111" stroke="#2a2a18" stroke-width="1"/>
      <rect x="80"  y="42" width="24" height="16" rx="2" fill="#111" stroke="#2a2a18" stroke-width="1"/>
      <rect x="128" y="44" width="24" height="16" rx="2" fill="#111" stroke="#2a2a18" stroke-width="1"/>
      <!-- Z marking with red cross-out -->
      <text x="165" y="74" font-size="26" fill="#c00" font-family="monospace" font-weight="bold" opacity="0.92">Z</text>
      <line x1="160" y1="48" x2="195" y2="78" stroke="#ee0000" stroke-width="4" stroke-linecap="round"/>
      <line x1="195" y1="48" x2="160" y2="78" stroke="#ee0000" stroke-width="4" stroke-linecap="round"/>
      <!-- Fire at front-left -->
      <ellipse cx="24" cy="55" rx="18" ry="28" fill="url(#GF)"/>
      <ellipse cx="18" cy="38" rx="10" ry="16" fill="url(#GF)" opacity="0.8"/>
      <ellipse cx="30" cy="30" rx="7" ry="12" fill="url(#GF)" opacity="0.6"/>
      <!-- Smoke blobs -->
      <ellipse cx="20" cy="16" rx="14" ry="10" fill="rgba(30,28,24,0.7)"/>
      <ellipse cx="8"  cy="6"  rx="10" ry="8"  fill="rgba(30,28,24,0.55)"/>
      <ellipse cx="32" cy="4"  rx="9"  ry="7"  fill="rgba(30,28,24,0.45)"/>
      <!-- Ground dirt -->
      <ellipse cx="109" cy="112" rx="102" ry="6" fill="rgba(0,0,0,0.35)"/>
    </svg>`,

    // 3 – Collapsed apartment block with UA trident (all waves)
    `<svg width="104" height="198" viewBox="0 0 104 198" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#848070"/>
          <stop offset="50%"  stop-color="#6a6058"/>
          <stop offset="100%" stop-color="#3a3430"/>
        </linearGradient>
        <linearGradient id="GBs" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#5a5048"/>
          <stop offset="100%" stop-color="#3a3430"/>
        </linearGradient>
      </defs>
      <!-- Main building face -->
      <rect x="0" y="24" width="82" height="174" fill="url(#GB)"/>
      <!-- Side face (3D box effect) -->
      <polygon points="82,24 104,14 104,188 82,198" fill="url(#GBs)"/>
      <!-- Top jagged break -->
      <polygon points="0,24 10,12 22,20 34,6 48,18 60,4 72,16 82,10 82,24" fill="url(#GB)"/>
      <polyline points="0,24 10,12 22,20 34,6 48,18 60,4 72,16 82,10" fill="none" stroke="rgba(255,230,180,0.2)" stroke-width="2"/>
      <!-- Floor slabs visible (concrete lines) -->
      <line x1="0" y1="64"  x2="82" y2="64"  stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <line x1="0" y1="104" x2="82" y2="104" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <line x1="0" y1="144" x2="82" y2="144" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <!-- Windows floor 1 (blown out) -->
      <rect x="6"  y="30" width="22" height="26" rx="1" fill="#111"/>
      <rect x="35" y="30" width="22" height="26" rx="1" fill="#101820" opacity="0.9"/>
      <rect x="56" y="30" width="22" height="26" rx="1" fill="#111"/>
      <!-- window shards floor 1 -->
      <line x1="6" y1="30" x2="28" y2="56" stroke="#555" stroke-width="1" opacity="0.5"/>
      <line x1="28" y1="30" x2="6" y2="56"  stroke="#555" stroke-width="1" opacity="0.5"/>
      <!-- Windows floor 2 -->
      <rect x="6"  y="70" width="22" height="26" rx="1" fill="#0d1520"/>
      <rect x="35" y="70" width="22" height="26" rx="1" fill="#111"/>
      <rect x="56" y="70" width="22" height="26" rx="1" fill="#0d1520"/>
      <!-- Windows floor 3 (partial collapse) -->
      <rect x="6"  y="110" width="22" height="26" rx="1" fill="#111"/>
      <polygon points="35,110 57,110 57,136 42,136" fill="#111"/>
      <!-- Cracked plaster patches -->
      <path d="M4 90 L18 78 L28 92 L15 102 Z" fill="rgba(200,180,150,0.12)"/>
      <path d="M50 120 L65 112 L72 128 L58 135 Z" fill="rgba(200,180,150,0.1)"/>
      <!-- Ukrainian trident graffiti (yellow on wall) -->
      <path d="M12 154 L12 174  M12 162 Q6 154 6 146 Q12 140 18 146 Q18 154 12 162  M6 146 L6 152  M18 146 L18 152  M6 174 L18 174"
            stroke="#FFD500" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <!-- Debris at base -->
      <polygon points="0,198 0,178 14,172 28,182 44,170 60,179 76,170 90,178 104,173 104,198" fill="#4a4030"/>
      <polygon points="0,198 0,185 8,181 20,188 35,182 52,190 68,183 84,189 104,182 104,198" fill="#6a5a48"/>
    </svg>`,

    // 4 – Artillery-bent utility pole (all waves) – gets sway CSS class
    `<svg width="66" height="205" viewBox="0 0 66 205" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GP" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#606060"/>
          <stop offset="35%"  stop-color="#9a9a92"/>
          <stop offset="70%"  stop-color="#7a7a78"/>
          <stop offset="100%" stop-color="#4a4a48"/>
        </linearGradient>
      </defs>
      <!-- Lower pole (straight) -->
      <rect x="24" y="72" width="16" height="133" fill="url(#GP)" rx="2"/>
      <!-- Rust streaks on lower pole -->
      <line x1="27" y1="90"  x2="27" y2="130" stroke="#8a4010" stroke-width="1.5" opacity="0.25"/>
      <line x1="36" y1="110" x2="36" y2="150" stroke="#8a4010" stroke-width="1.5" opacity="0.2"/>
      <!-- Upper pole (bent left) -->
      <rect x="18" y="0" width="16" height="82" rx="2" fill="url(#GP)" transform="rotate(-16 26 72)"/>
      <!-- Bend point – crumpled metal -->
      <ellipse cx="29" cy="72" rx="12" ry="7" fill="#4a4a48"/>
      <ellipse cx="29" cy="72" rx="8" ry="4" fill="#606060"/>
      <!-- Cross arm high -->
      <rect x="2"  y="30" width="58" height="8" rx="2" fill="url(#GP)"/>
      <!-- Cross arm mid -->
      <rect x="8"  y="78" width="44" height="7" rx="2" fill="url(#GP)"/>
      <!-- Insulator discs -->
      <ellipse cx="6"  cy="30" rx="6" ry="4" fill="#888" stroke="#555" stroke-width="1"/>
      <ellipse cx="58" cy="30" rx="6" ry="4" fill="#888" stroke="#555" stroke-width="1"/>
      <ellipse cx="12" cy="78" rx="5" ry="3" fill="#888" stroke="#555" stroke-width="1"/>
      <ellipse cx="50" cy="78" rx="5" ry="3" fill="#888" stroke="#555" stroke-width="1"/>
      <!-- Hanging wires (cubic bezier – sagging) -->
      <path d="M6,34 C18,58 30,46 32,76" stroke="#7a7a7a" stroke-width="1.8" fill="none"/>
      <path d="M58,34 C46,56 38,48 34,76" stroke="#7a7a7a" stroke-width="1.8" fill="none"/>
      <path d="M12,82 C10,110 8,140 14,170 L10,205" stroke="#666" stroke-width="1.5" fill="none"/>
      <path d="M50,82 C54,112 58,142 50,172 L54,205" stroke="#666" stroke-width="1.5" fill="none"/>
      <!-- Ground rubble mound -->
      <polygon points="6,205 6,196 14,192 22,198 32,190 42,196 52,191 60,198 66,193 66,205" fill="#5a5848"/>
    </svg>`,

    // 5 – Anti-tank hedgehog / Prague Star (mid+)
    `<svg width="108" height="108" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GI1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a0a098"/>
          <stop offset="50%"  stop-color="#6a6860"/>
          <stop offset="100%" stop-color="#3a3830"/>
        </linearGradient>
        <linearGradient id="GI2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#9a9890"/>
          <stop offset="100%" stop-color="#3a3830"/>
        </linearGradient>
      </defs>
      <!-- Beam 1: horizontal -->
      <rect x="4" y="48" width="100" height="12" rx="2.5" fill="url(#GI1)" stroke="#2a2a28" stroke-width="1"/>
      <line x1="4" y1="50" x2="104" y2="50" stroke="rgba(255,255,220,0.12)" stroke-width="1.5"/>
      <!-- Beam 2: vertical -->
      <rect x="48" y="4" width="12" height="100" rx="2.5" fill="url(#GI2)" stroke="#2a2a28" stroke-width="1"/>
      <line x1="50" y1="4" x2="50" y2="104" stroke="rgba(255,255,220,0.12)" stroke-width="1.5"/>
      <!-- Beam 3: diagonal (60°) -->
      <rect x="4" y="48" width="100" height="12" rx="2.5" fill="url(#GI1)" stroke="#2a2a28" stroke-width="1" transform="rotate(55 54 54)"/>
      <!-- Weld center circle -->
      <circle cx="54" cy="54" r="12" fill="#4a4840" stroke="#2a2820" stroke-width="2"/>
      <circle cx="54" cy="54" r="7" fill="#6a6860"/>
      <!-- Weld bead ring -->
      <circle cx="54" cy="54" r="10" fill="none" stroke="#8a7040" stroke-width="2.5" opacity="0.6" stroke-dasharray="4,3"/>
      <!-- Rust patches -->
      <circle cx="22" cy="52" r="4" fill="#8a3800" opacity="0.35"/>
      <circle cx="86" cy="52" r="3.5" fill="#8a3800" opacity="0.3"/>
      <circle cx="52" cy="22" r="3" fill="#8a3800" opacity="0.3"/>
      <!-- Tip ends -->
      <polygon points="2,48 4,44 4,56 2,60" fill="#8a8880"/>
      <polygon points="106,48 104,44 104,56 106,60" fill="#8a8880"/>
      <polygon points="48,2 44,4 56,4 60,2" fill="#8a8880"/>
      <polygon points="48,106 44,104 56,104 60,106" fill="#8a8880"/>
      <!-- Ground shadow -->
      <ellipse cx="54" cy="104" rx="50" ry="6" fill="rgba(0,0,0,0.4)"/>
    </svg>`,

    // 6 – Dragon's teeth concrete obstacles (mid+)
    `<svg width="228" height="98" viewBox="0 0 228 98" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GD1" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stop-color="#b0aea8"/>
          <stop offset="100%" stop-color="#5a5850"/>
        </linearGradient>
        <linearGradient id="GD2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#888">  </stop>
          <stop offset="100%" stop-color="#3a3835"/>
        </linearGradient>
      </defs>
      <!-- 4 pyramid obstacles -->
      <!-- pyramid 1 -->
      <polygon points="14,88 36,20 58,88" fill="url(#GD1)"/>
      <polygon points="14,88 36,20 20,88" fill="url(#GD2)" opacity="0.5"/>
      <polygon points="14,88 36,20 58,88" fill="none" stroke="#4a4840" stroke-width="1"/>
      <line x1="36" y1="28" x2="35" y2="40" stroke="rgba(200,200,200,0.12)" stroke-width="1.5"/>
      <!-- pyramid 2 -->
      <polygon points="69,88 92,16 115,88" fill="url(#GD1)"/>
      <polygon points="69,88 92,16 77,88" fill="url(#GD2)" opacity="0.5"/>
      <polygon points="69,88 92,16 115,88" fill="none" stroke="#4a4840" stroke-width="1"/>
      <!-- crack on pyramid 2 -->
      <line x1="92" y1="30" x2="84" y2="60" stroke="#3a3830" stroke-width="1.5"/>
      <line x1="84" y1="60" x2="90" y2="80" stroke="#3a3830" stroke-width="1.2"/>
      <!-- pyramid 3 -->
      <polygon points="125,88 148,20 171,88" fill="url(#GD1)"/>
      <polygon points="125,88 148,20 133,88" fill="url(#GD2)" opacity="0.5"/>
      <polygon points="125,88 148,20 171,88" fill="none" stroke="#4a4840" stroke-width="1"/>
      <!-- pyramid 4 -->
      <polygon points="181,88 203,18 225,88" fill="url(#GD1)"/>
      <polygon points="181,88 203,18 189,88" fill="url(#GD2)" opacity="0.5"/>
      <polygon points="181,88 203,18 225,88" fill="none" stroke="#4a4840" stroke-width="1"/>
      <!-- Scorch/age marks -->
      <circle cx="36" cy="55" r="5" fill="#2a2820" opacity="0.3"/>
      <circle cx="148" cy="48" r="4" fill="#2a2820" opacity="0.3"/>
      <!-- Ground line / footing -->
      <rect x="0" y="87" width="228" height="11" fill="#6a6050"/>
      <line x1="0" y1="87" x2="228" y2="87" stroke="#4a4030" stroke-width="1.5"/>
    </svg>`,

    // 7 – Ukrainian military checkpoint / Jersey barriers (all waves)
    `<svg width="178" height="108" viewBox="0 0 178 108" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GJ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#aaa8a0"/>
          <stop offset="100%" stop-color="#555250"/>
        </linearGradient>
      </defs>
      <!-- Ground -->
      <rect x="0" y="94" width="178" height="14" fill="#6a6050"/>
      <!-- Left barrier (F-shape silhouette) -->
      <polygon points="4,94 4,28 12,28 12,46 38,46 38,28 46,28 46,94" fill="url(#GJ)"/>
      <polygon points="4,28 4,46 12,46 12,36 38,36 38,28" fill="rgba(255,255,220,0.08)"/>
      <!-- Middle barrier — neutral concrete (flags removed B91) -->
      <polygon points="64,94 64,22 72,22 72,40 104,40 104,22 112,22 112,94" fill="url(#GJ)"/>
      <rect x="64" y="48" width="48" height="24" fill="rgba(80,75,65,0.3)"/>
      <polygon points="64,22 64,40 72,40 72,30 104,30 104,22" fill="rgba(255,255,220,0.08)"/>
      <!-- Right barrier -->
      <polygon points="134,94 134,28 142,28 142,46 168,46 168,28 176,28 176,94" fill="url(#GJ)"/>
      <polygon points="134,28 134,46 142,46 142,36 168,36 168,28" fill="rgba(255,255,220,0.08)"/>
      <!-- Hazard chevron tape on left barrier -->
      <line x1="4"  y1="58" x2="46" y2="72" stroke="#ee0" stroke-width="4" opacity="0.75"/>
      <line x1="4"  y1="68" x2="46" y2="82" stroke="#111" stroke-width="4" opacity="0.5"/>
      <line x1="4"  y1="78" x2="46" y2="92" stroke="#ee0" stroke-width="4" opacity="0.75"/>
      <!-- STOP sign on pole -->
      <rect x="154" y="4" width="4" height="26" fill="#9a8060"/>
      <polygon points="154,4 162,4 166,8 166,16 162,20 154,20 150,16 150,8" fill="#cc0000" stroke="#fff" stroke-width="1"/>
      <text x="151" y="16" font-size="5.5" fill="#fff" font-family="Impact,Arial" font-weight="bold">STOP</text>
      <!-- Barbed wire on top of barriers -->
      <path d="M4,28 C14,22 30,18 46,22" stroke="#7a7070" stroke-width="1.5" fill="none"/>
      <path d="M64,22 C76,16 92,14 112,18" stroke="#7a7070" stroke-width="1.5" fill="none"/>
    </svg>`,

    // 8 – Sunflower patch (wave 1-2) – gets sway CSS class
    `<svg width="108" height="132" viewBox="0 0 108 132" xmlns="http://www.w3.org/2000/svg">
      <!-- plant 1 (tallest, centre) -->
      <line x1="54" y1="130" x2="55" y2="28" stroke="#3a7015" stroke-width="3.5" stroke-linecap="round"/>
      <!-- leaves plant 1 -->
      <ellipse cx="40" cy="86" rx="12" ry="6" fill="#4a8a1a" transform="rotate(-38 40 86)"/>
      <ellipse cx="68" cy="70" rx="12" ry="6" fill="#3a7a12" transform="rotate(42 68 70)"/>
      <!-- petals plant 1 (12 petals) -->
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(30 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(60 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(90 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(120 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(150 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(180 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(210 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(240 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#FFD700" transform="rotate(270 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#e0aa00" transform="rotate(300 55 28)"/>
      <ellipse cx="55" cy="14" rx="6" ry="10" fill="#e0aa00" transform="rotate(330 55 28)"/>
      <circle cx="55" cy="28" r="12" fill="#cc9900"/>
      <circle cx="55" cy="28" r="7" fill="#7a4000"/>
      <circle cx="55" cy="28" r="3" fill="#5a2800"/>
      <!-- plant 2 (left, medium) -->
      <line x1="22" y1="130" x2="24" y2="50" stroke="#3a7015" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="10" cy="96" rx="11" ry="5" fill="#4a8a1a" transform="rotate(-34 10 96)"/>
      <ellipse cx="35" cy="80" rx="11" ry="5" fill="#3a7a12" transform="rotate(38 35 80)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#FFD700"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#FFD700" transform="rotate(45 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#FFD700" transform="rotate(90 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#FFD700" transform="rotate(135 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#FFD700" transform="rotate(180 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#e0aa00" transform="rotate(225 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#e0aa00" transform="rotate(270 24 50)"/>
      <ellipse cx="24" cy="36" rx="5" ry="8" fill="#e0aa00" transform="rotate(315 24 50)"/>
      <circle cx="24" cy="50" r="10" fill="#cc9900"/>
      <circle cx="24" cy="50" r="6" fill="#7a4000"/>
      <!-- plant 3 (right, shorter) -->
      <line x1="88" y1="130" x2="90" y2="60" stroke="#3a7015" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="76" cy="100" rx="10" ry="5" fill="#4a8a1a" transform="rotate(-30 76 100)"/>
      <ellipse cx="101" cy="84" rx="10" ry="5" fill="#3a7a12" transform="rotate(36 101 84)"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#FFD700"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#FFD700" transform="rotate(60 90 60)"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#FFD700" transform="rotate(120 90 60)"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#FFD700" transform="rotate(180 90 60)"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#e0aa00" transform="rotate(240 90 60)"/>
      <ellipse cx="90" cy="46" rx="4" ry="7" fill="#e0aa00" transform="rotate(300 90 60)"/>
      <circle cx="90" cy="60" r="8" fill="#cc9900"/>
      <circle cx="90" cy="60" r="5" fill="#7a4000"/>
      <!-- ground strip -->
      <rect x="0" y="127" width="108" height="5" fill="#3a6010" rx="2"/>
    </svg>`,

    // 9 – Barbed wire coil on stake (all waves)
    `<svg width="148" height="100" viewBox="0 0 148 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GBW" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#9a8870"/>
          <stop offset="100%" stop-color="#5a4430"/>
        </linearGradient>
      </defs>
      <!-- Ground -->
      <rect x="0" y="91" width="148" height="9" fill="#6a6050"/>
      <!-- Stake -->
      <rect x="70" y="8" width="9" height="84" rx="2" fill="url(#GBW)"/>
      <polygon points="70,8 74.5,0 79,8" fill="#7a6848"/>
      <!-- Metal band on stake -->
      <rect x="68" y="55" width="13" height="5" rx="1" fill="#888" opacity="0.7"/>
      <!-- Coil loops – 3 overlapping ellipses at slightly different positions -->
      <ellipse cx="46" cy="60" rx="34" ry="22" fill="none" stroke="#8a8078" stroke-width="2.8"/>
      <ellipse cx="74" cy="56" rx="34" ry="22" fill="none" stroke="#9a9088" stroke-width="2.8"/>
      <ellipse cx="102" cy="60" rx="34" ry="22" fill="none" stroke="#8a8078" stroke-width="2.8"/>
      <!-- Barbs along wire (short lines at interval) -->
      <line x1="14" y1="55" x2="10" y2="51" stroke="#8a8078" stroke-width="2"/>
      <line x1="14" y1="55" x2="10" y2="59" stroke="#8a8078" stroke-width="2"/>
      <line x1="38" y1="40" x2="34" y2="36" stroke="#8a8078" stroke-width="2"/>
      <line x1="38" y1="40" x2="42" y2="36" stroke="#8a8078" stroke-width="2"/>
      <line x1="76" y1="36" x2="72" y2="32" stroke="#9a9088" stroke-width="2"/>
      <line x1="76" y1="36" x2="80" y2="32" stroke="#9a9088" stroke-width="2"/>
      <line x1="112" y1="40" x2="108" y2="36" stroke="#8a8078" stroke-width="2"/>
      <line x1="112" y1="40" x2="116" y2="36" stroke="#8a8078" stroke-width="2"/>
      <line x1="134" y1="56" x2="130" y2="52" stroke="#8a8078" stroke-width="2"/>
      <line x1="134" y1="56" x2="138" y2="52" stroke="#8a8078" stroke-width="2"/>
      <line x1="60" y1="78" x2="56" y2="82" stroke="#8a8078" stroke-width="2"/>
      <line x1="60" y1="78" x2="56" y2="74" stroke="#8a8078" stroke-width="2"/>
      <line x1="100" y1="74" x2="96" y2="78" stroke="#9a9088" stroke-width="2"/>
      <line x1="100" y1="74" x2="104" y2="78" stroke="#9a9088" stroke-width="2"/>
      <!-- Ground shadow -->
      <ellipse cx="74" cy="94" rx="66" ry="5" fill="rgba(0,0,0,0.3)"/>
    </svg>`,

    // 10 – Burned civilian bus (all waves)
    `<svg width="228" height="118" viewBox="0 0 228 118" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GBus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#2e2e28"/>
          <stop offset="100%" stop-color="#141410"/>
        </linearGradient>
        <radialGradient id="GFire" cx="50%" cy="70%" r="60%">
          <stop offset="0%"   stop-color="#FFD700" stop-opacity="0.9"/>
          <stop offset="40%"  stop-color="#ff5500" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#0a0200"  stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Tires -->
      <ellipse cx="44"  cy="105" rx="20" ry="11" fill="#111"/>
      <ellipse cx="44"  cy="105" rx="10" ry="6"  fill="#222"/>
      <ellipse cx="175" cy="105" rx="20" ry="11" fill="#111"/>
      <ellipse cx="175" cy="105" rx="10" ry="6"  fill="#222"/>
      <!-- Bus body -->
      <rect x="4"  y="36" width="216" height="68" rx="8" fill="url(#GBus)"/>
      <rect x="10" y="22" width="200" height="20" rx="5" fill="#1a1a14"/>
      <!-- Char marks (texture) -->
      <rect x="4" y="36" width="216" height="68" rx="8" fill="none" stroke="#3a3830" stroke-width="2"/>
      <!-- Windows: top row (blown/shattered) -->
      <rect x="18"  y="28" width="28" height="16" rx="2" fill="#0a0a0e" stroke="#222" stroke-width="1"/>
      <line x1="18" y1="28" x2="46" y2="44" stroke="#333" stroke-width="1" opacity="0.7"/>
      <line x1="46" y1="28" x2="18" y2="44" stroke="#333" stroke-width="1" opacity="0.7"/>
      <rect x="54"  y="28" width="28" height="16" rx="2" fill="#0a0a0e" stroke="#222" stroke-width="1"/>
      <rect x="90"  y="28" width="28" height="16" rx="2" fill="#0a0a0e" stroke="#222" stroke-width="1"/>
      <rect x="126" y="28" width="28" height="16" rx="2" fill="#0a0a0e" stroke="#222" stroke-width="1"/>
      <rect x="162" y="28" width="28" height="16" rx="2" fill="#0a0a0e" stroke="#222" stroke-width="1"/>
      <!-- Side windows, bottom rows -->
      <rect x="18"  y="46" width="28" height="26" rx="2" fill="#0d0d12" stroke="#222" stroke-width="1"/>
      <rect x="54"  y="46" width="28" height="26" rx="2" fill="#0d0d12" stroke="#222" stroke-width="1"/>
      <line x1="54" y1="46" x2="82" y2="72" stroke="#2a2a30" stroke-width="1.2" opacity="0.6"/>
      <rect x="90"  y="46" width="28" height="26" rx="2" fill="#0d0d12" stroke="#222" stroke-width="1"/>
      <rect x="126" y="46" width="28" height="26" rx="2" fill="#0d0d12" stroke="#222" stroke-width="1"/>
      <rect x="162" y="46" width="28" height="26" rx="2" fill="#0d0d12" stroke="#222" stroke-width="1"/>
      <!-- front (right side) fire -->
      <ellipse cx="208" cy="68" rx="18" ry="32" fill="url(#GFire)"/>
      <ellipse cx="215" cy="52" rx="10" ry="18" fill="url(#GFire)" opacity="0.75"/>
      <ellipse cx="205" cy="40" rx="8"  ry="14" fill="url(#GFire)" opacity="0.55"/>
      <!-- Smoke wisps above fire -->
      <ellipse cx="210" cy="26" rx="13" ry="9" fill="rgba(24,20,16,0.7)"/>
      <ellipse cx="205" cy="14" rx="9"  ry="7" fill="rgba(24,20,16,0.55)"/>
      <ellipse cx="216" cy="8"  rx="8"  ry="6" fill="rgba(24,20,16,0.4)"/>
      <!-- Ground shadow -->
      <ellipse cx="114" cy="113" rx="108" ry="5" fill="rgba(0,0,0,0.3)"/>
    </svg>`,

    // 11 – "SLAVA UKRAINI" graffiti wall (all waves)
    `<svg width="135" height="162" viewBox="0 0 135 162" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#c8b898"/>
          <stop offset="60%"  stop-color="#b0a080"/>
          <stop offset="100%" stop-color="#6a5a44"/>
        </linearGradient>
      </defs>
      <!-- Wall face -->
      <rect x="0" y="0" width="135" height="162" fill="url(#GWall)"/>
      <!-- Plaster crack texture -->
      <path d="M22 18 L32 38 L20 62 L34 90 L28 120" fill="none" stroke="#8a7858" stroke-width="1.5" opacity="0.5"/>
      <path d="M94 8  L82 30 L96 56 L88 80 L100 108 L94 140" fill="none" stroke="#8a7858" stroke-width="1.2" opacity="0.4"/>
      <path d="M58 48 L68 70 L52 96" fill="none" stroke="#9a8868" stroke-width="1" opacity="0.4"/>
      <!-- Spalled plaster patches (darker bare wall) -->
      <polygon points="12,52 26,44 38,60 24,70" fill="rgba(100,80,55,0.25)"/>
      <polygon points="88,90 104,82 110,100 96,108" fill="rgba(100,80,55,0.22)"/>
      <!-- Weathered top band (flags removed B91) -->
      <rect x="0" y="0" width="135" height="22" fill="#8a7858" opacity="0.5"/>
      <rect x="0" y="22" width="135" height="22" fill="#9a8868" opacity="0.4"/>
      <!-- Horizontal crumble line above debris -->
      <path d="M0 150 Q18 144 36 150 Q54 156 72 150 Q90 144 108 150 Q122 155 135 150 L135 162 L0 162 Z" fill="#7a6a50"/>
      <!-- Trident removed B91 — neutral graffiti remnant -->
      <path d="M54 52 L78 52 M54 70 L78 70 M66 50 L66 84" stroke="#aaa89a" stroke-width="2" fill="none" opacity="0.35"/>
      <!-- Faded text -->
      <text x="8"  y="112" font-size="14" fill="#aaa89a" font-family="Impact,Arial,sans-serif" font-weight="bold" opacity="0.35">RESIST</text>
      <text x="4"  y="132" font-size="13" fill="#8a7858" font-family="Impact,Arial,sans-serif" font-weight="bold" opacity="0.35">PERSIST!</text>
      <!-- Faded paint splatter -->
      <circle cx="105" cy="115" r="2.5" fill="#aaa89a" opacity="0.25"/>
      <circle cx="112" cy="120" r="1.8" fill="#aaa89a" opacity="0.2"/>
      <circle cx="100" cy="124" r="1.5" fill="#aaa89a" opacity="0.15"/>
    </svg>`,

    // 12 – Military ammo crates (all waves)
    `<svg width="118" height="136" viewBox="0 0 118 136" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GCr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#6a7828"/>
          <stop offset="100%" stop-color="#2a3010"/>
        </linearGradient>
        <linearGradient id="GCrS" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#4a5818"/>
          <stop offset="100%" stop-color="#2a3010"/>
        </linearGradient>
      </defs>
      <!-- Bottom crate (wide) -->
      <rect x="4"  y="84" width="78" height="48" rx="3" fill="url(#GCr)" stroke="#1a2008" stroke-width="1.5"/>
      <polygon points="82,84 104,72 104,120 82,132" fill="url(#GCrS)"/>
      <polygon points="4,84 82,84 104,72 26,72" fill="#7a8830"/>
      <!-- lid details -->
      <line x1="4" y1="97" x2="82" y2="97" stroke="#1a2008" stroke-width="1.5"/>
      <line x1="4" y1="110" x2="82" y2="110" stroke="#1a2008" stroke-width="1.5"/>
      <!-- metal corner brackets bottom crate -->
      <rect x="4"  y="84" width="8"  height="8"  rx="1" fill="#4a5010" opacity="0.7"/>
      <rect x="74" y="84" width="8"  height="8"  rx="1" fill="#4a5010" opacity="0.7"/>
      <rect x="4"  y="124" width="8" height="8" rx="1" fill="#4a5010" opacity="0.7"/>
      <rect x="74" y="124" width="8" height="8" rx="1" fill="#4a5010" opacity="0.7"/>
      <!-- AMMO stencil on front -->
      <text x="14" y="106" font-size="10" fill="#FFD700" font-family="Impact,Arial" font-weight="bold" opacity="0.7">AMMO</text>
      <text x="12" y="120" font-size="7" fill="#FFD700" font-family="monospace" opacity="0.5">LOT-88 Z140</text>
      <!-- Middle crate (rotated slightly) – stacked on top -->
      <rect x="18" y="44" width="66" height="44" rx="3" fill="url(#GCr)" stroke="#1a2008" stroke-width="1.5" transform="rotate(-3 51 66)"/>
      <line x1="18" y1="57" x2="84" y2="55" stroke="#1a2008" stroke-width="1.5"/>
      <line x1="18" y1="70" x2="84" y2="68" stroke="#1a2008" stroke-width="1.3"/>
      <rect x="20" y="46" width="8" height="7" rx="1" fill="#4a5010" opacity="0.7"/>
      <rect x="76" y="44" width="8" height="7" rx="1" fill="#4a5010" opacity="0.7"/>
      <!-- Small crate on right, upper -->
      <rect x="56" y="8"  width="58" height="42" rx="3" fill="url(#GCr)" stroke="#1a2008" stroke-width="1.5"/>
      <polygon points="114,8 118,4 118,46 114,50" fill="url(#GCrS)"/>
      <line x1="56" y1="22" x2="114" y2="22" stroke="#1a2008" stroke-width="1.5"/>
      <rect x="58" y="10" width="7" height="6" rx="1" fill="#4a5010" opacity="0.7"/>
      <rect x="109" y="10" width="5" height="6" rx="1" fill="#4a5010" opacity="0.7"/>
      <!-- ! hazard symbol -->
      <text x="82" y="40" font-size="20" fill="#FFD700" font-family="Arial" font-weight="bold" opacity="0.8">!</text>
      <!-- Ground shadow -->
      <ellipse cx="55" cy="133" rx="52" ry="4" fill="rgba(0,0,0,0.3)"/>
    </svg>`,

    // 13 – Artillery shell crater (mid+)
    `<svg width="198" height="98" viewBox="0 0 198 98" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="GCrater" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#0a0804"/>
          <stop offset="45%"  stop-color="#2a2018"/>
          <stop offset="100%" stop-color="#5a4a30"/>
        </radialGradient>
      </defs>
      <!-- Upturned soil mounds around perimeter -->
      <ellipse cx="32"  cy="58" rx="22" ry="12" fill="#7a6840" transform="rotate(-20 32 58)"/>
      <ellipse cx="168" cy="55" rx="20" ry="12" fill="#8a7848" transform="rotate(18 168 55)"/>
      <ellipse cx="72"  cy="36" rx="16" ry="10" fill="#7a6840" transform="rotate(-8 72 36)"/>
      <ellipse cx="130" cy="34" rx="18" ry="10" fill="#8a7048" transform="rotate(12 130 34)"/>
      <ellipse cx="40"  cy="78" rx="18" ry="10" fill="#6a5830" transform="rotate(-15 40 78)"/>
      <ellipse cx="158" cy="78" rx="18" ry="10" fill="#7a6838" transform="rotate(15 158 78)"/>
      <!-- Crater bowl -->
      <ellipse cx="99" cy="72" rx="68" ry="26" fill="url(#GCrater)"/>
      <!-- Scorched ring -->
      <ellipse cx="99" cy="72" rx="68" ry="26" fill="none" stroke="#3a2810" stroke-width="3" opacity="0.6"/>
      <ellipse cx="99" cy="72" rx="52" ry="18" fill="none" stroke="#2a1808" stroke-width="2" opacity="0.6"/>
      <!-- Dirt texture in crater -->
      <ellipse cx="84"  cy="74" rx="10" ry="4" fill="#2a2010" opacity="0.5"/>
      <ellipse cx="116" cy="76" rx="12" ry="4" fill="#2a2010" opacity="0.5"/>
      <!-- Shrapnel fragments -->
      <polygon points="54,44 60,38 65,48 58,52" fill="#5a5848" stroke="#3a3830" stroke-width="1"/>
      <polygon points="118,38 125,34 130,44 122,48" fill="#6a6858" stroke="#3a3830" stroke-width="1"/>
      <polygon points="148,56 155,52 158,62 150,64" fill="#5a5848" stroke="#3a3830" stroke-width="1"/>
      <polygon points="38,62 44,58 46,68 39,70" fill="#6a6858" stroke="#3a3830" stroke-width="1"/>
      <!-- Ejected earth lines -->
      <line x1="99" y1="46" x2="118" y2="22" stroke="#7a6840" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="99" y1="46" x2="75"  y2="18" stroke="#7a6840" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      <line x1="99" y1="46" x2="140" y2="32" stroke="#7a6840" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
      <line x1="99" y1="46" x2="60"  y2="28" stroke="#7a6840" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    </svg>`,

    // 14 – Overturned Ukrainian APC with trident (heavy waves)
    `<svg width="228" height="118" viewBox="0 0 228 118" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="GAPC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a6e22"/>
          <stop offset="100%" stop-color="#2a3610"/>
        </linearGradient>
        <linearGradient id="GAPCs" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#3a4618"/>
          <stop offset="100%" stop-color="#1e2808"/>
        </linearGradient>
        <radialGradient id="GFR" cx="50%" cy="70%" r="60%">
          <stop offset="0%"   stop-color="#FFB000" stop-opacity="0.9"/>
          <stop offset="45%"  stop-color="#ff4400" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#0a0200"  stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Main hull (rotated/tilted – overturned) -->
      <polygon points="6,62 14,22 192,18 218,52 218,98 6,98" fill="url(#GAPC)"/>
      <!-- Hull top visible (underside) -->
      <polygon points="6,62 14,22 192,18 200,32 18,38" fill="url(#GAPCs)"/>
      <!-- Tread assembly (visible from below) -->
      <rect x="8" y="86" width="202" height="22" rx="4" fill="#1a1a12" stroke="#111" stroke-width="1.5"/>
      <!-- Road wheels visible -->
      <circle cx="28"  cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="28"  cy="97" r="4" fill="#111"/>
      <circle cx="58"  cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="58"  cy="97" r="4" fill="#111"/>
      <circle cx="88"  cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="88"  cy="97" r="4" fill="#111"/>
      <circle cx="118" cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="118" cy="97" r="4" fill="#111"/>
      <circle cx="148" cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="148" cy="97" r="4" fill="#111"/>
      <circle cx="178" cy="97" r="9" fill="#232318" stroke="#2a2a20" stroke-width="1.5"/>
      <circle cx="178" cy="97" r="4" fill="#111"/>
      <!-- Hatch / open top hatch swinging out -->
      <rect x="124" y="18" width="38" height="28" rx="3" fill="#3a4818" stroke="#1e2808" stroke-width="1.5" transform="rotate(-20 143 32)"/>
      <!-- UA trident on hull side -->
      <path d="M76 48 L76 78  M76 61 Q68 53 68 43 Q76 37 84 43 Q84 53 76 61  M68 43 L68 50  M84 43 L84 50  M64 78 L88 78"
            stroke="#FFD500" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0.88"/>
      <!-- Gun barrel (pointing down, damaged) -->
      <rect x="188" y="26" width="40" height="9" rx="4" fill="#2a3210" stroke="#1a2008" stroke-width="1" transform="rotate(35 208 30)"/>
      <!-- Engine fire at right -->
      <ellipse cx="214" cy="54" rx="16" ry="26" fill="url(#GFR)"/>
      <ellipse cx="220" cy="38" rx="10" ry="16" fill="url(#GFR)" opacity="0.65"/>
      <!-- Smoke -->
      <ellipse cx="214" cy="18" rx="13" ry="9" fill="rgba(20,16,10,0.7)"/>
      <ellipse cx="208" cy="8"  rx="9"  ry="7" fill="rgba(20,16,10,0.55)"/>
      <!-- Ground dirt scatter -->
      <polygon points="0,118 6,108 24,114 44,106 68,112 98,105 128,112 158,106 186,112 210,106 228,111 228,118" fill="#4a4228"/>
    </svg>`,

    // 15 – Small sunflower pair (low, sway)
    `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg">
      <line x1="16" y1="70" x2="17" y2="28" stroke="#3a7015" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="10" cy="52" rx="7" ry="3.5" fill="#4a8a1a" transform="rotate(-30 10 52)"/>
      <ellipse cx="17" cy="18" rx="4" ry="6" fill="#FFD700"/><ellipse cx="17" cy="18" rx="4" ry="6" fill="#FFD700" transform="rotate(60 17 28)"/>
      <ellipse cx="17" cy="18" rx="4" ry="6" fill="#FFD700" transform="rotate(120 17 28)"/><ellipse cx="17" cy="18" rx="4" ry="6" fill="#e0aa00" transform="rotate(180 17 28)"/>
      <ellipse cx="17" cy="18" rx="4" ry="6" fill="#e0aa00" transform="rotate(240 17 28)"/><ellipse cx="17" cy="18" rx="4" ry="6" fill="#FFD700" transform="rotate(300 17 28)"/>
      <circle cx="17" cy="28" r="6" fill="#cc9900"/><circle cx="17" cy="28" r="3.5" fill="#7a4000"/>
      <line x1="38" y1="70" x2="37" y2="36" stroke="#3a7015" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="44" cy="56" rx="6" ry="3" fill="#3a7a12" transform="rotate(34 44 56)"/>
      <ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#FFD700"/><ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#FFD700" transform="rotate(72 37 36)"/>
      <ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#e0aa00" transform="rotate(144 37 36)"/><ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#FFD700" transform="rotate(216 37 36)"/>
      <ellipse cx="37" cy="26" rx="3.5" ry="5" fill="#e0aa00" transform="rotate(288 37 36)"/>
      <circle cx="37" cy="36" r="5" fill="#cc9900"/><circle cx="37" cy="36" r="3" fill="#7a4000"/>
    </svg>`,

    // 16 – War-damaged bush (brown/grey, broken branches)
    `<svg width="80" height="54" viewBox="0 0 80 54" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="38" rx="38" ry="16" fill="#3a4a1a" opacity="0.85"/>
      <ellipse cx="30" cy="28" rx="22" ry="14" fill="#4a5a22"/>
      <ellipse cx="52" cy="30" rx="18" ry="12" fill="#3d4f1c"/>
      <ellipse cx="38" cy="22" rx="16" ry="10" fill="#566a2c"/>
      <line x1="22" y1="35" x2="8" y2="16" stroke="#5a3a18" stroke-width="2"/><line x1="8" y1="16" x2="2" y2="10" stroke="#5a3a18" stroke-width="1.4"/>
      <line x1="58" y1="32" x2="72" y2="14" stroke="#5a3a18" stroke-width="1.8"/><line x1="72" y1="14" x2="78" y2="8" stroke="#5a3a18" stroke-width="1.2"/>
      <ellipse cx="18" cy="24" rx="6" ry="4" fill="#6a4a22" opacity="0.6"/>
      <ellipse cx="40" cy="50" rx="36" ry="5" fill="rgba(0,0,0,.3)"/>
    </svg>`,

    // 17 – Intact green bush
    `<svg width="64" height="44" viewBox="0 0 64 44" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="30" rx="30" ry="14" fill="#3a6a18"/>
      <ellipse cx="24" cy="22" rx="18" ry="12" fill="#4a8a22"/>
      <ellipse cx="42" cy="24" rx="16" ry="11" fill="#3d7a1c"/>
      <ellipse cx="32" cy="16" rx="14" ry="9" fill="#58a830"/>
      <ellipse cx="32" cy="40" rx="28" ry="5" fill="rgba(0,0,0,.25)"/>
    </svg>`,

    // 18 – War-damaged tree (charred trunk, sparse leaves)
    `<svg width="60" height="160" viewBox="0 0 60 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="50" width="12" height="110" rx="3" fill="#3a2a12"/>
      <rect x="22" y="50" width="16" height="24" rx="4" fill="#2a1a08"/>
      <line x1="30" y1="80" x2="10" y2="50" stroke="#3a2a12" stroke-width="4" stroke-linecap="round"/>
      <line x1="30" y1="65" x2="52" y2="40" stroke="#3a2a12" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="30" y1="95" x2="50" y2="70" stroke="#3a2a12" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="10" cy="44" rx="12" ry="10" fill="#3a4a10" opacity="0.6"/>
      <ellipse cx="50" cy="36" rx="10" ry="8" fill="#4a5a18" opacity="0.5"/>
      <ellipse cx="48" cy="66" rx="8" ry="6" fill="#3a4a10" opacity="0.4"/>
      <rect x="26" y="60" width="8" height="12" fill="#1a0a00" opacity="0.6" rx="1"/>
      <ellipse cx="30" cy="155" rx="22" ry="5" fill="rgba(0,0,0,.3)"/>
    </svg>`,

    // 19 – Intact tree (green, full canopy)
    `<svg width="70" height="172" viewBox="0 0 70 172" xmlns="http://www.w3.org/2000/svg">
      <rect x="29" y="80" width="12" height="92" rx="4" fill="#4a3218"/>
      <line x1="35" y1="110" x2="18" y2="88" stroke="#4a3218" stroke-width="3" stroke-linecap="round"/>
      <line x1="35" y1="100" x2="54" y2="80" stroke="#4a3218" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="35" cy="44" rx="32" ry="40" fill="#2a6a10"/>
      <ellipse cx="25" cy="36" rx="20" ry="28" fill="#3a8a18"/>
      <ellipse cx="45" cy="40" rx="18" ry="26" fill="#348014"/>
      <ellipse cx="35" cy="28" rx="22" ry="22" fill="#4aa828"/>
      <ellipse cx="35" cy="168" rx="24" ry="4" fill="rgba(0,0,0,.25)"/>
    </svg>`,

    // 20 – Tall bombed apartment (3-story, windows blown out)
    `<svg width="88" height="210" viewBox="0 0 88 210" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="GTB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8a7a6a"/><stop offset="100%" stop-color="#5a4a3a"/></linearGradient></defs>
      <rect x="8" y="10" width="72" height="200" fill="url(#GTB)"/>
      <polygon points="0,210 8,10 12,0 28,4 44,0 60,5 76,0 80,10 88,210" fill="#7a6a58" opacity="0.6"/>
      <rect x="16" y="28" width="14" height="18" rx="1" fill="#1a1208"/><rect x="36" y="28" width="14" height="18" rx="1" fill="#1a1208"/>
      <rect x="58" y="28" width="14" height="18" rx="1" fill="#2a1a0a"/>
      <rect x="16" y="60" width="14" height="18" rx="1" fill="#1a1208"/><rect x="36" y="60" width="14" height="12" rx="1" fill="#1a1208"/>
      <rect x="58" y="60" width="14" height="18" rx="1" fill="#1a1208"/>
      <rect x="16" y="94" width="14" height="18" rx="1" fill="#2a1a0a"/><rect x="36" y="94" width="14" height="18" rx="1" fill="#1a1208"/>
      <rect x="58" y="98" width="14" height="14" rx="1" fill="#1a1208"/>
      <rect x="16" y="128" width="14" height="18" rx="1" fill="#1a1208"/><rect x="36" y="128" width="14" height="18" rx="1" fill="#2a1a0a"/>
      <rect x="58" y="128" width="14" height="18" rx="1" fill="#1a1208"/>
      <rect x="16" y="162" width="14" height="20" rx="1" fill="#1a1208"/><rect x="36" y="162" width="14" height="20" rx="1" fill="#1a1208"/>
      <rect x="58" y="162" width="14" height="20" rx="1" fill="#2a1a0a"/>
      <rect x="0" y="200" width="88" height="10" fill="#4a3a28"/>
      <rect x="46" y="38" width="6" height="8" fill="#aa4400" opacity="0.5"/>
      <rect x="18" y="68" width="4" height="6" fill="#aa4400" opacity="0.4"/>
    </svg>`,

    // 21 – Debris pile (bricks, rebar, concrete chunks — collidable)
    `<svg width="72" height="36" viewBox="0 0 72 36" xmlns="http://www.w3.org/2000/svg">
      <polygon points="8,34 4,22 18,18 30,24 44,16 56,22 68,20 70,34" fill="#6a5a48"/>
      <rect x="12" y="20" width="10" height="6" fill="#8a6a4a" transform="rotate(-12 17 23)"/>
      <rect x="34" y="18" width="8" height="5" fill="#7a5a3a" transform="rotate(8 38 20)"/>
      <rect x="50" y="22" width="12" height="4" fill="#5a4a38" transform="rotate(-5 56 24)"/>
      <line x1="22" y1="20" x2="26" y2="10" stroke="#666" stroke-width="1.5"/>
      <line x1="44" y1="18" x2="48" y2="8" stroke="#666" stroke-width="1.2"/>
      <circle cx="16" cy="24" r="3" fill="#8a7a68" opacity="0.6"/>
      <circle cx="58" cy="26" r="4" fill="#7a6a58" opacity="0.5"/>
      <ellipse cx="36" cy="33" rx="34" ry="4" fill="rgba(0,0,0,.3)"/>
    </svg>`,

    // 22 – Abandoned suitcase (small, projectile-ready)
    `<svg width="28" height="22" viewBox="0 0 28 22" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="24" height="14" rx="2" fill="#5a4a3a" stroke="#3a2a1a" stroke-width="1"/>
      <rect x="10" y="3" width="8" height="5" rx="1.5" fill="none" stroke="#3a2a1a" stroke-width="1.2"/>
      <rect x="8" y="12" width="12" height="1.5" fill="#3a2a1a" rx="0.5"/>
      <circle cx="14" cy="12" r="2" fill="#8a7a5a"/>
    </svg>`,

    // 23 – Smashed TV (small, projectile-ready)
    `<svg width="32" height="28" viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="28" height="20" rx="2" fill="#3a3a3a" stroke="#222" stroke-width="1"/>
      <rect x="4" y="6" width="24" height="14" rx="1" fill="#1a2a2a"/>
      <line x1="6" y1="8" x2="26" y2="18" stroke="#556" stroke-width="0.8"/><line x1="26" y1="8" x2="6" y2="18" stroke="#556" stroke-width="0.8"/>
      <rect x="12" y="24" width="8" height="3" fill="#333"/>
    </svg>`,
  ];


  let _ruinUid = 0; // monotonic counter – ensures gradient IDs are unique per instance

  function spawnRuins() {
    clearRuins();
    const canvW = $canves[0].offsetWidth;
    const usedX = [];
    // Density grows with wave; themes shift from civilian to military
    const minC = wave <= 1 ? 6 : (wave <= 2 ? 8 : 10);
    const maxC = wave <= 1 ? 8 : (wave <= 2 ? 11 : 14);
    const total = getRandom(minC, maxC);
    // Variant pool biased by wave: early=civilian+flora, mid=mixed, late=military/heavy+debris
    const pool = wave <= 1
      ? [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 15, 15, 16, 17, 17, 19, 21, 22, 23]
      : wave <= 2
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
        : [0, 2, 3, 5, 6, 7, 9, 11, 13, 14, 15, 16, 18, 20, 20, 21, 21, 22, 23];
    // Shuffle pool so picks within a wave are non-repeating when possible
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);

    // ── Perspective depth layers ──────────────────────────────────
    // Items are split into near (front, large, vivid), mid, and far (back, small, faded).
    // Each layer has its own scale range and bottom offset to simulate depth of field.
    const nearCount = Math.max(2, Math.round(total * 0.38));
    const farCount  = Math.max(2, Math.round(total * 0.28));
    const midCount  = Math.max(2, total - nearCount - farCount);
    const layers = [
      // NEAR: front row — large, fully opaque, anchored at canvas bottom
      { cls: 'fg-ruin--near', n: nearCount, scaleMin: 0.88, scaleMax: 1.18, bottomMin: 0,  bottomMax: 6,  zi: 9,  minGap: 100 },
      // MID: second row — medium, slightly offset above ground
      { cls: 'fg-ruin--mid',  n: midCount,  scaleMin: 0.55, scaleMax: 0.80, bottomMin: 22, bottomMax: 48, zi: 7,  minGap: 80  },
      // FAR: back row — small, muted, higher up for vanishing-point feel
      { cls: 'fg-ruin--far',  n: farCount,  scaleMin: 0.28, scaleMax: 0.50, bottomMin: 55, bottomMax: 90, zi: 5,  minGap: 70  },
    ];

    let varIdx = 0;
    for (const layer of layers) {
      for (let i = 0; i < layer.n; i++) {
        const variant = shuffled[varIdx++ % shuffled.length];
        let posX = getRandom(60, canvW - 140);
        let tries = 0;
        while (tries < 12 && usedX.some(x => Math.abs(x - posX) < layer.minGap)) {
          posX = getRandom(60, canvW - 140); tries++;
        }
        usedX.push(posX);
        const scale  = layer.scaleMin + Math.random() * (layer.scaleMax - layer.scaleMin);
        const flipX  = Math.random() < 0.45 ? -1 : 1;
        const bottom = layer.bottomMin + Math.random() * (layer.bottomMax - layer.bottomMin);
        // Stamp unique gradient IDs so multiple instances of the same variant don't share defs
        const uid = 'ru' + (_ruinUid++);
        const rawSvg = RUIN_VARIANTS[variant]
          .replace(/\bid="([A-Z][A-Za-z0-9]*)"/g,  (_, id) => `id="${uid}_${id}"`)
          .replace(/url\(#([A-Z][A-Za-z0-9]*)\)/g, (_, id) => `url(#${uid}_${id})`);
        const $ruin = $('<div class="fg-ruin"></div>')
          .html(rawSvg)
          .addClass(layer.cls)
          .attr('data-hp', RUIN_HP[variant] || 10)
          .attr('data-max-hp', RUIN_HP[variant] || 10)
          .css({
            left:   posX + 'px',
            bottom: bottom.toFixed(0) + 'px',
            zIndex: layer.zi,
            transform: `scaleX(${flipX}) scale(${scale.toFixed(2)})`,
          });
        // Animation variant classes
        if (variant === 4)                       $ruin.addClass('fg-ruin--sway');
        if (variant === 8 || variant === 15)       $ruin.addClass('fg-ruin--sway-slow');
        if (variant === 16 || variant === 17 || variant === 19) { $ruin.addClass('fg-ruin--wind'); $ruin.css('--wind-offset', Math.random().toFixed(2)); }
        if (variant === 18)                        { $ruin.addClass('fg-ruin--wind-tree'); $ruin.css('--wind-offset', Math.random().toFixed(2)); }
        if (variant === 2 || variant === 10 || variant === 14 || variant === 20) $ruin.addClass('fg-ruin--smoke');
        // Mark small debris as projectile-ready
        if (variant === 21 || variant === 22 || variant === 23) $ruin.attr('data-debris', '1');
        $canves.append($ruin);
      }
    }

    // Add ground-level war structures (sandbags, craters, wire, trenches)
    spawnWarStructures();
    // B185: Add lane-separator barriers between the 3 enemy depth lanes
    spawnLaneSeparators();
  }

  function clearRuins() {
    $canves.find('.fg-ruin, .war-structure, .bg-silhouette, .lane-separator').remove();
  }

  // ── B185: Lane Separator Barriers — horizontal rubble/walls between enemy depth lanes ──
  // Two strips of ruins: one between near/mid lanes, one between mid/far lanes.
  // These give visual depth cues and make the 3-lane system readable.
  function spawnLaneSeparators() {
    const canvW = $canves[0].offsetWidth;

    // SVG building blocks for separator elements
    const _rubbleWall = (w) => {
      // Low crumbled concrete wall with rebar stubs
      const blocks = [];
      for (let x = 0; x < w; x += 14 + Math.random() * 8) {
        const h = 8 + Math.random() * 14;
        const y = 22 - h;
        const shade = 35 + Math.floor(Math.random() * 25);
        blocks.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(12 + Math.random() * 6).toFixed(0)}" height="${h.toFixed(0)}" rx="1" fill="hsl(30,8%,${shade}%)" stroke="rgba(0,0,0,.3)" stroke-width="0.5"/>`);
        if (Math.random() < 0.3) blocks.push(`<line x1="${(x + 6).toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + 6).toFixed(0)}" y2="${(y - 5).toFixed(0)}" stroke="#6a5a4a" stroke-width="1.2"/>`);
      }
      return `<svg width="${w}" height="28" viewBox="0 0 ${w} 28" xmlns="http://www.w3.org/2000/svg">${blocks.join('')}<ellipse cx="${w/2}" cy="26" rx="${w/2}" ry="4" fill="rgba(0,0,0,.25)"/></svg>`;
    };

    const _concreteSlab = (w) => {
      // Broken concrete slab with cracks
      const shade = 42 + Math.floor(Math.random() * 15);
      const crackX = w * (0.3 + Math.random() * 0.4);
      return `<svg width="${w}" height="16" viewBox="0 0 ${w} 16" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="3" width="${w}" height="10" rx="2" fill="hsl(25,6%,${shade}%)" stroke="rgba(0,0,0,.3)" stroke-width="0.8"/>
        <line x1="${crackX.toFixed(0)}" y1="3" x2="${(crackX + 8).toFixed(0)}" y2="13" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>
        <line x1="${(crackX - 15).toFixed(0)}" y1="8" x2="${crackX.toFixed(0)}" y2="6" stroke="rgba(0,0,0,.25)" stroke-width="0.6"/>
        <ellipse cx="${w/2}" cy="14" rx="${w/2}" ry="3" fill="rgba(0,0,0,.2)"/>
      </svg>`;
    };

    const _rubblePile = (w) => {
      // Heap of broken bricks and debris
      const pieces = [];
      for (let i = 0; i < Math.floor(w / 10); i++) {
        const x = i * 10 + Math.random() * 6;
        const y = 14 - Math.random() * 10;
        const sz = 5 + Math.random() * 7;
        const hue = 15 + Math.random() * 20;
        const lum = 28 + Math.random() * 20;
        pieces.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${sz.toFixed(1)}" height="${(sz * 0.6).toFixed(1)}" rx="1" fill="hsl(${hue.toFixed(0)},15%,${lum.toFixed(0)}%)" transform="rotate(${(Math.random()*30-15).toFixed(0)} ${(x+sz/2).toFixed(1)} ${(y+sz*0.3).toFixed(1)})"/>`);
      }
      return `<svg width="${w}" height="20" viewBox="0 0 ${w} 20" xmlns="http://www.w3.org/2000/svg">${pieces.join('')}<ellipse cx="${w/2}" cy="18" rx="${w/2}" ry="4" fill="rgba(0,0,0,.2)"/></svg>`;
    };

    const _barbedWireStrip = (w) => {
      // Low barbed wire on posts between lanes
      const posts = [];
      for (let x = 0; x < w; x += 35 + Math.random() * 15) {
        posts.push(`<rect x="${x.toFixed(0)}" y="2" width="3" height="14" fill="#5a5a3a"/>`);
      }
      const pts = [];
      for (let x = 0; x <= w; x += 8) pts.push(`${x},${8 + Math.sin(x * 0.15) * 3}`);
      return `<svg width="${w}" height="20" viewBox="0 0 ${w} 20" xmlns="http://www.w3.org/2000/svg">
        ${posts.join('')}
        <polyline points="${pts.join(' ')}" fill="none" stroke="#7a7a5a" stroke-width="1.2"/>
        <polyline points="${pts.map(p => {const [x,y]=p.split(','); return x+','+(+y+3);}).join(' ')}" fill="none" stroke="#6a6a4a" stroke-width="0.8" opacity="0.6"/>
      </svg>`;
    };

    // The separator types pool
    const sepTypes = [_rubbleWall, _concreteSlab, _rubblePile, _barbedWireStrip];

    // Two separator rows:
    // 1. Near↔Mid boundary: bottom ~142-152px, z-index 9 (in front of mid zombies z8, behind near zombies z10)
    // 2. Mid↔Far boundary: bottom ~215-222px, z-index 7 (in front of far zombies z6, behind mid zombies z8)
    const sepLayers = [
      // Near↔Mid boundary: between near (120-160) and mid (175-225)
      { bottom: 168, bottomVar: 3, zi: 9, scale: 0.85, scaleVar: 0.2, opacity: 0.82, label: 'near-mid' },
      // Mid↔Far boundary: between mid (175-225) and far (240-300)
      { bottom: 233, bottomVar: 3, zi: 7, scale: 0.55, scaleVar: 0.15, opacity: 0.55, label: 'mid-far'  },
    ];

    for (const layer of sepLayers) {
      // Place 3-5 separator segments across the width, with gaps for visual interest
      const segCount = 3 + Math.floor(Math.random() * 3);
      const segW = Math.floor(canvW / (segCount + 1));  // segment width with gaps
      for (let i = 0; i < segCount; i++) {
        const maker = sepTypes[Math.floor(Math.random() * sepTypes.length)];
        const w = Math.max(60, segW * (0.5 + Math.random() * 0.5));
        const svg = maker(w);
        const x = (i + 0.5) * (canvW / segCount) - w / 2 + (Math.random() * 40 - 20);
        const bot = layer.bottom + Math.random() * layer.bottomVar;
        const sc = layer.scale + Math.random() * layer.scaleVar;
        const flip = Math.random() < 0.4 ? -1 : 1;
        $('<div class="lane-separator"></div>')
          .html(svg)
          .addClass('lane-sep--' + layer.label)
          .css({
            position: 'absolute',
            left: Math.max(0, Math.min(canvW - w, x)).toFixed(0) + 'px',
            bottom: bot.toFixed(0) + 'px',
            zIndex: layer.zi,
            transform: `scaleX(${flip}) scale(${sc.toFixed(2)})`,
            transformOrigin: 'bottom center',
            opacity: layer.opacity,
            pointerEvents: 'none',
          })
          .appendTo($canves);
      }
    }
  }

  // ── Procedural War Structures — sandbags, craters, barbed wire, trenches ──
  function spawnWarStructures() {
    const canvW = $canves[0].offsetWidth;
    const structCount = Math.min(2 + wave, 6);

    const _bag = (n, fill) => {
      // SVG sandbag bundle: n bags in a roughly stacked row
      const bags = [];
      for (let i = 0; i < n; i++) {
        const cx = 12 + i * 22 + (Math.random() * 4 - 2);
        const cy = 24 - (Math.floor(i / 3)) * 12;
        bags.push(`<ellipse cx="${cx.toFixed(0)}" cy="${cy}" rx="11" ry="7" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`);
      }
      const w = 12 + n * 22;
      return `<svg width="${w}" height="36" viewBox="0 0 ${w} 36" xmlns="http://www.w3.org/2000/svg">${bags.join('')}</svg>`;
    };

    const _wire = (w) => {
      const pts = [];
      const segments = Math.floor(w / 18);
      for (let i = 0; i <= segments; i++) pts.push(`${i * 18},14`);
      const barbs = [];
      for (let i = 1; i < segments; i++) {
        const x = i * 18;
        barbs.push(`<line x1="${x}" y1="14" x2="${x - 5}" y2="6" stroke="#8a8a6a" stroke-width="1.2"/>`);
        barbs.push(`<line x1="${x}" y1="14" x2="${x + 5}" y2="6" stroke="#8a8a6a" stroke-width="1.2"/>`);
      }
      return `<svg width="${w}" height="24" viewBox="0 0 ${w} 24" xmlns="http://www.w3.org/2000/svg">
        <polyline points="${pts.join(' ')}" fill="none" stroke="#6a6a4a" stroke-width="1.8"/>
        ${barbs.join('')}
        <ellipse cx="${w / 2}" cy="18" rx="${w / 2 - 2}" ry="5" fill="rgba(0,0,0,.35)"/>
      </svg>`;
    };

    const _crater = (r) => {
      return `<svg width="${r * 2 + 8}" height="${r + 12}" viewBox="0 0 ${r * 2 + 8} ${r + 12}" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="${r + 4}" cy="${r / 2 + 4}" rx="${r}" ry="${r * 0.38}" fill="rgba(20,10,0,.62)" stroke="rgba(60,30,0,.5)" stroke-width="1.5"/>
        <ellipse cx="${r + 4}" cy="${r / 2 + 6}" rx="${r * 0.55}" ry="${r * 0.2}" fill="rgba(0,0,0,.45)"/>
        <ellipse cx="${r + 4}" cy="${r + 9}" rx="${r + 3}" ry="5" fill="rgba(40,20,5,.4)"/>
      </svg>`;
    };

    const _trench = (w) => {
      return `<svg width="${w}" height="28" viewBox="0 0 ${w} 28" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="10" width="${w}" height="18" rx="3" fill="#2a1a08" opacity="0.88"/>
        <rect x="0" y="8" width="${w}" height="8" rx="2" fill="#3d2510" opacity="0.75"/>
        <rect x="0" y="6" width="${w}" height="5" rx="2" fill="#4a2e14" opacity="0.6"/>
        <ellipse cx="${w / 2}" cy="26" rx="${w / 2}" ry="4" fill="rgba(0,0,0,.4)"/>
      </svg>`;
    };

    const types = [
      { maker: () => _bag(6 + Math.floor(Math.random() * 4), `hsl(${25 + Math.random() * 20},40%,${32 + Math.random() * 12}%)`), cls: 'ws-sandbag', zi: 10, scMin: 1.0, scMax: 1.5, btMin: 0, btMax: 4 },
      { maker: () => _wire(120 + Math.floor(Math.random() * 120)), cls: 'ws-wire', zi: 8, scMin: 0.9, scMax: 1.3, btMin: 55, btMax: 80 },
      { maker: () => _crater(25 + Math.floor(Math.random() * 22)), cls: 'ws-crater', zi: 6, scMin: 1.0, scMax: 1.8, btMin: 58, btMax: 82 },
      { maker: () => _trench(180 + Math.floor(Math.random() * 140)), cls: 'ws-trench', zi: 7, scMin: 0.8, scMax: 1.3, btMin: 60, btMax: 78 },
    ];

    const placed = [];
    for (let i = 0; i < structCount; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      const scale = t.scMin + Math.random() * (t.scMax - t.scMin);
      let x = getRandom(40, canvW - 200);
      let tries = 0;
      while (tries < 10 && placed.some(p => Math.abs(p - x) < 160)) { x = getRandom(40, canvW - 200); tries++; }
      placed.push(x);
      const bottom = t.btMin + Math.random() * (t.btMax - t.btMin);
      const flipX  = Math.random() < 0.4 ? -1 : 1;
      $('<div class="war-structure"></div>')
        .html(t.maker())
        .addClass(t.cls)
        .css({ position: 'absolute', left: x + 'px', bottom: bottom.toFixed(0) + 'px',
               zIndex: t.zi, transform: `scaleX(${flipX}) scale(${scale.toFixed(2)})`,
               transformOrigin: 'bottom left', pointerEvents: 'none' })
        .appendTo($canves);
    }
    // Spawn a few rolling garbage pieces for atmosphere
    _spawnRollingGarbage();
  }

  var _garbageTimer = null;
  function _spawnRollingGarbage() {
    if (_garbageTimer) clearInterval(_garbageTimer);
    var garbageSvgs = [
      '<svg width="18" height="14" viewBox="0 0 18 14"><rect x="1" y="2" width="16" height="10" rx="2" fill="#7a6a5a" opacity="0.7"/><line x1="3" y1="5" x2="15" y2="5" stroke="#5a4a3a" stroke-width="0.8"/></svg>',
      '<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="#888" stroke-width="1.5"/><circle cx="6" cy="6" r="2" fill="#666"/></svg>',
      '<svg width="20" height="8" viewBox="0 0 20 8"><rect x="0" y="1" width="20" height="6" rx="1" fill="#9a8a7a" opacity="0.6"/></svg>',
      '<svg width="14" height="16" viewBox="0 0 14 16"><polygon points="2,14 7,0 12,14" fill="#aaa" opacity="0.5" stroke="#888" stroke-width="0.5"/></svg>',
    ];
    _garbageTimer = setInterval(function () {
      if (!gameActive || gamePaused) return;
      if ($canves.find('.rolling-garbage').length >= 3) return;
      var svg = garbageSvgs[Math.floor(Math.random() * garbageSvgs.length)];
      var bottom = 2 + Math.random() * 60;
      var dur = 12 + Math.random() * 10;
      var $g = $('<div class="rolling-garbage"></div>').html(svg).css({
        right: '-30px', bottom: bottom + 'px',
        animationDuration: dur + 's', opacity: 0.4 + Math.random() * 0.3
      });
      $canves.append($g);
      setTimeout(function () { $g.remove(); }, dur * 1000 + 500);
    }, 4000 + Math.random() * 3000);
  }

  // Returns true if canvas position (cx,cy) is covered by any foreground ruin
  // Ruin HP per variant: [0]=brick wall, [1]=sandbag, [2]=APC, [3]=apt, [4]=pole, [5]=hedgehog,
  // [6]=teeth, [7]=checkpoint, [8]=sunflower, [9]=wire, [10]=bus, [11]=graffiti, [12]=crates,
  // [13]=crater, [14]=overturned APC, [15]=small sunflowers, [16]=damaged bush, [17]=bush,
  // [18]=damaged tree, [19]=intact tree, [20]=bombed apt, [21]=debris, [22]=suitcase, [23]=TV
  var RUIN_HP = [20, 12, 30, 25, 8, 15, 20, 15, 5, 8, 25, 18, 10, 3, 28, 4, 6, 6, 12, 15, 40, 3, 2, 2];

  function _findRuinAt(cx, cy) {
    var cRect = $canves[0].getBoundingClientRect();
    var hit = null;
    $canves.find('.fg-ruin').not('.fg-ruin--destroyed').each(function () {
      var rr = this.getBoundingClientRect();
      var rl = rr.left - cRect.left, rt = rr.top - cRect.top;
      if (cx >= rl && cx <= rl + rr.width && cy >= rt && cy <= rt + rr.height) {
        hit = this; return false;
      }
    });
    return hit;
  }

  function isBlockedByRuin(cx, cy) {
    return !!_findRuinAt(cx, cy);
  }

  function damageRuinAt(cx, cy, dmg) {
    var el = _findRuinAt(cx, cy);
    if (!el) return false;
    var $r = $(el);
    var hp = parseInt($r.attr('data-hp') || '0', 10);
    var maxHp = parseInt($r.attr('data-max-hp') || '1', 10);
    hp = Math.max(0, hp - (dmg || 1));
    $r.attr('data-hp', hp);
    // Visual damage stages
    var pct = hp / maxHp;
    $r.removeClass('fg-ruin--dmg1 fg-ruin--dmg2');
    if (pct <= 0) {
      // Destroyed — dust burst + collapse
      $r.addClass('fg-ruin--destroyed');
      var rr = el.getBoundingClientRect();
      var cr = $canves[0].getBoundingClientRect();
      var rx = rr.left + rr.width / 2 - cr.left;
      var ry = rr.top + rr.height / 2 - cr.top;
      doExplosion(rx, ry, 0.6);
      // If debris-tagged, launch as a projectile that can hit enemies
      if ($r.attr('data-debris') === '1') _launchDebris(rx, ry, $r.find('svg').first());
      setTimeout(function () { $r.remove(); }, 600);
      return true;
    } else if (pct <= 0.35) {
      $r.addClass('fg-ruin--dmg2');
    } else if (pct <= 0.65) {
      $r.addClass('fg-ruin--dmg1');
    }
    // Hit shake
    $r.addClass('fg-ruin--hit');
    setTimeout(function () { $r.removeClass('fg-ruin--hit'); }, 120);
    return false;
  }

  // ── Debris Physics — destroyed small objects fly and damage enemies ──────
  function _launchDebris(startX, startY, $svgSrc) {
    var angle = (Math.random() - 0.5) * 2.2;
    var speed = 180 + Math.random() * 220;
    var vx = Math.cos(angle) * speed;
    var vy = -Math.abs(Math.sin(angle) * speed * 0.6) - 80;
    var gravity = 340;
    var x = startX, y = startY, t = 0;
    var svgHtml = $svgSrc.length ? $svgSrc[0].outerHTML : '<div style="width:16px;height:16px;background:#6a5a48;border-radius:3px"></div>';
    var $deb = $('<div class="debris-proj"></div>').html(svgHtml).css({ left: x + 'px', top: y + 'px' });
    $canves.append($deb);
    var _debTick = 0;
    var tick = setInterval(function () {
      if (!gameActive) { clearInterval(tick); $deb.remove(); return; }
      t += 0.033;
      x += vx * 0.033;
      y += vy * 0.033 + 0.5 * gravity * 0.033 * 0.033;
      vy += gravity * 0.033;
      var rot = t * (200 + Math.random() * 100);
      $deb.css({ left: x + 'px', top: y + 'px', transform: 'rotate(' + rot + 'deg) scale(0.7)' });
      // Hit zombie check (every 3rd tick to reduce reflow cost)
      if (++_debTick % 3 !== 0) { if (y > 600 || x < -50 || x > 1100) { clearInterval(tick); $deb.remove(); } return; }
      var dr = $deb[0].getBoundingClientRect();
      var cRect = $canves[0].getBoundingClientRect();
      $(_liveZ).each(function () {
        var zr = this.getBoundingClientRect();
        if (dr.left < zr.right && dr.right > zr.left && dr.top < zr.bottom && dr.bottom > zr.top) {
          var zx = zr.left + zr.width / 2 - cRect.left;
          var zy = zr.top + zr.height / 2 - cRect.top;
          killZombieEl($(this), zx, zy, false, false);
          clearInterval(tick); $deb.remove();
          return false;
        }
      });
      // Remove if off-screen
      if (y > 600 || x < -50 || x > 1100) { clearInterval(tick); $deb.remove(); }
    }, 33);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── SHOOTER HP + SPEECH ──────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  let speechHideTimer = null;
  function shooterSpeech(text, isCritical) {
    const $sp = $('#shooter-speech');
    $sp.text(text).toggleClass('critical', !!isCritical).addClass('visible');
    if (speechHideTimer) clearTimeout(speechHideTimer);
    speechHideTimer = setTimeout(() => $sp.removeClass('visible critical'), 2400);
  }

  function _updateCrosshairHUD() {
    const WL = { revolver:'REVOLVER', shotgun:'SHOTGUN', m16:'M-16', lmg:'LMG',
      gl:'GRENADE', clay:'CLAYMORE', sniper:'SNIPER', stugna:'STUGNA', drone_bomb:'DRONE',
      panzerfaust:'PANZFST', pkm:'PKM', ak12:'AK-12', matador:'MATADOR', nlaw:'NLAW',
      laser:'LASER', ftdrone:'FTDRONE', tank:'ABRAMS', bradley:'BRADLEY' };
    const wn  = (WL[currentWeapon] || currentWeapon.toUpperCase());
    const res = godMode ? '∞' : (ammoReserve[currentWeapon] || 0);
    $('#chx-weapon').text(wn);
    $('#chx-ammo').text(ammo + ' / ' + getAmmoMax() + '  ×' + res);
  }

  function _updateHudWeapon() {
    const WNAMES = { revolver:'REVOLVER', shotgun:'SHOTGUN', m16:'M-16 AUTO', lmg:'LMG',
      gl:'GL', clay:'CLAYMORE', sniper:'SNIPER', stugna:'STUGNA', drone_bomb:'DRONE',
      panzerfaust:'PANZFST', pkm:'PKM', ak12:'AK-12', matador:'MATADOR', nlaw:'NLAW ATGM',
      laser:'LASER', ftdrone:'FTDRONE', tank:'ABRAMS', bradley:'BRADLEY IFV' };
    const wlbl = WNAMES[currentWeapon] || currentWeapon.toUpperCase();
    const res  = godMode ? '∞' : (ammoReserve[currentWeapon] || 0);
    $('#hud-weapon-name').text(wlbl);
    $('#hud-ammo-display').text(ammo + ' / ' + getAmmoMax());
    $('#hud-reserve-badge').text('×' + res);
  }

  function updateShooterHpBar() {
    const pct = Math.max(0, shooterHp);
    const $fill = $('#shooter-hp-fill');
    const $lbl  = $('#shooter-hp-label');
    $fill.css('width', pct + '%')
         .removeClass('medium low')
         .addClass(pct <= 30 ? 'low' : pct <= 60 ? 'medium' : '');
    $lbl.text(Math.ceil(pct) + '%');
    $('#shooter-mugshot').toggleClass('low-hp', pct <= 30);
    // Update crosshair HP bar
    var $chxFill = document.getElementById('chx-hp-fill');
    if ($chxFill) {
      $chxFill.style.width = pct + '%';
      $chxFill.className = 'chx-hp-fill' + (pct <= 30 ? ' hp-low' : pct <= 60 ? ' hp-mid' : '');
    }
  }

  // ── Medkit inventory (storable health packs) ─────────────────────────────
  var _medkitCount = +(localStorage.getItem('arc_medkits') || 0);
  function addMedkit(n) {
    _medkitCount = Math.min(9, _medkitCount + (n || 1));
    localStorage.setItem('arc_medkits', _medkitCount);
    _updateMedkitHUD();
  }
  function useMedkit() {
    if (_medkitCount <= 0 || shooterHp >= 100) return false;
    _medkitCount--;
    localStorage.setItem('arc_medkits', _medkitCount);
    shooterHp = Math.min(100, shooterHp + 35);
    updateShooterHpBar();
    _updateMedkitHUD();
    shooterSpeech('💊 Medkit used! +35 HP');
    return true;
  }
  function _updateMedkitHUD() {
    var $m = $('#medkit-count');
    if ($m.length) $m.text(_medkitCount);
    $('#medkit-btn').toggleClass('medkit-empty', _medkitCount <= 0);
  }

  function damageShooter(dmg) {
    if (!gameActive || godMode) return;  // god mode = invincible
    if (window._shieldEnd && Date.now() < window._shieldEnd) {
      shooterSpeech('🛡️ BLOCKED!');
      $canves.addClass('juice-shield-flash');
      setTimeout(() => $canves.removeClass('juice-shield-flash'), 200);
      return;
    }
    if (hasSkill('hardened')) dmg = Math.ceil(dmg * 0.75);  // Hardened Veteran: -25% incoming
    shooterHp = Math.max(0, shooterHp - dmg);
    _sessionDmgTaken += dmg;
    _waveDmgTaken    += dmg;
    // Auto-use medkit when HP drops below 10%
    if (shooterHp > 0 && shooterHp <= 10 && _medkitCount > 0) {
      useMedkit();
    }
    updateShooterHpBar();
    _showDmgPopup(dmg);
    // Juice: damage screen shake + red flash (B183: halved intensity per user)
    screenShake(dmg >= 20 ? 2 : 1, dmg >= 20 ? 120 : 80);
    hitStop(dmg >= 20 ? 40 : 20);
    $canves.addClass('juice-dmg-flash');
    setTimeout(() => $canves.removeClass('juice-dmg-flash'), 180);
    // Low HP vignette
    $canves.toggleClass('juice-low-hp', shooterHp > 0 && shooterHp <= 30);
    const $mug = $('#shooter-mugshot');
    $mug.addClass('taking-hit');
    setTimeout(() => $mug.removeClass('taking-hit'), 320);
    if (shooterHp <= 0) {
      if (hasSkill('iron_will') && !_ironWillUsed) {
        _ironWillUsed = true;
        shooterHp = 1;
        updateShooterHpBar();
        shooterSpeech('⭐ IRON WILL!', true);
        return;
      }
      endGame('lose');
    } else if (shooterHp <= 30) {
      shooterSpeech('🩸 CRITICAL — ' + Math.ceil(shooterHp) + '% HP!', true);
    }
  }

  function _showDmgPopup(dmg) {
    const cw = $canves[0].offsetWidth, ch = $canves[0].offsetHeight;
    const x = cw * 0.3 + Math.random() * cw * 0.4;
    const y = ch * 0.2 + Math.random() * ch * 0.45;
    const $p = $('<div class="dmg-popup">-' + Math.ceil(dmg) + ' HP</div>').css({ left: x + 'px', top: y + 'px' });
    $canves.append($p);
    setTimeout(() => $p.remove(), 1100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── INCOMING DRONES ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const DRONE_SVG = '<img src="images/vehicles/russdronefpv.png" alt="Enemy Drone" style="width:60px;height:60px;object-fit:contain;">';
  const _activeDroneBuzzes = [];  // track active drone oscillator stop-functions for pause cleanup

  function stopAllDroneBuzzes() {
    while (_activeDroneBuzzes.length) {
      const fn = _activeDroneBuzzes.pop();
      try { fn(); } catch(e){ /* oscillator already stopped */ }
    }
  }

  function removeDroneBuzz($drone) {
    const fn = $drone.data('stopBuzz');
    if (fn) {
      fn();
      const idx = _activeDroneBuzzes.indexOf(fn);
      if (idx !== -1) _activeDroneBuzzes.splice(idx, 1);
    }
  }

  function spawnDrone(onDone) {
    if (!gameActive) return;
    const _done = () => { if (typeof onDone === 'function') onDone(); };
    const hp     = gcfg('vehicles','drone_hp_base',1) + (wave >= 3 ? gcfg('vehicles','drone_hp_w3_bonus',1) : 0) + (wave >= 4 ? gcfg('vehicles','drone_hp_w4_bonus',1) : 0);
    const dur    = getRandom(10, 18);       // seconds to reach player (half speed)
    const dmg    = wave <= 2 ? gcfg('vehicles','drone_dmg_w1',18) : wave === 3 ? gcfg('vehicles','drone_dmg_w3',26) : gcfg('vehicles','drone_dmg_w4',34);
    const canvW  = $canves[0].offsetWidth;
    const canvH  = $canves[0].offsetHeight;
    // Final position: middle of screen area, varying Y
    const destX  = getRandom(canvW * 0.25, canvW * 0.75);
    const destY  = getRandom(canvH * 0.25, canvH * 0.55);
    // Origin offset (drone "comes from behind" = random off-screen corner)
    const ox = (Math.random() < 0.5 ? 1 : -1) * getRandom(200, 500);
    const oy = -getRandom(150, 400);
    let curHp = hp;
    const $drone = $('<div class="drone-target"></div>')
      .html(DRONE_SVG)
      .css({
        left: destX + 'px', top: destY + 'px',
        '--drone-dur': dur + 's',
        '--drone-ox': ox + 'px',
        '--drone-oy': oy + 'px',
      });
    $canves.append($drone);

    // ── Drone approach buzz: volume ramps from silent → loud ──
    let stopDroneBuzz = null;
    try {
      const ac  = getACtx();
      const t0  = ac.currentTime;
      const gn  = ac.createGain();
      gn.gain.setValueAtTime(0.001, t0);
      gn.gain.linearRampToValueAtTime(0.30, t0 + dur * 0.88);
      gn.gain.linearRampToValueAtTime(0.0,  t0 + dur + 0.12);
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(78, t0);
      osc.frequency.linearRampToValueAtTime(100, t0 + dur);
      const osc2 = ac.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(155, t0);
      osc2.frequency.linearRampToValueAtTime(198, t0 + dur);
      const g2 = ac.createGain(); g2.gain.value = 0.35;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 18;
      const lg = ac.createGain(); lg.gain.value = 20;
      lfo.connect(lg); lg.connect(osc.frequency);
      const filt = ac.createBiquadFilter();
      filt.type = 'bandpass'; filt.frequency.value = 460; filt.Q.value = 2.0;
      osc.connect(filt); osc2.connect(g2); g2.connect(filt); filt.connect(gn); gn.connect(getMaster());
      osc.start(t0); osc2.start(t0); lfo.start(t0);
      osc.stop(t0 + dur + 0.2); osc2.stop(t0 + dur + 0.2); lfo.stop(t0 + dur + 0.2);
      stopDroneBuzz = () => {
        try { gn.gain.cancelScheduledValues(ac.currentTime);
              gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.12);
              setTimeout(() => { try { osc.stop(); osc2.stop(); lfo.stop(); } catch(e){} }, 150); } catch(e){}
      };
    } catch(e){}
    $drone.data('stopBuzz', stopDroneBuzz);
    if (stopDroneBuzz) _activeDroneBuzzes.push(stopDroneBuzz);

    // Shoot the drone
    $drone.on('click', function (e) {
      e.stopPropagation(); e.stopImmediatePropagation();
      if (ammo <= 0 && currentWeapon !== REVOLVER_WEAPON) { sndNoAmmo(); return; }
      if (currentWeapon !== REVOLVER_WEAPON) ammo--;
      renderAmmoUI();
      const rect = $canves[0].getBoundingClientRect();
      doMuzzleFlash(e.clientX - rect.left, e.clientY - rect.top);
      doExplosion(e.clientX - rect.left, e.clientY - rect.top, 0.4);
      $drone.addClass('drone-hit');
      setTimeout(() => $drone.removeClass('drone-hit'), 90);
      curHp--;
      if (curHp <= 0) {
        $drone.off('click');
        removeDroneBuzz($drone);
        clearTimeout($drone.data('reachTimer'));
        sndTruckExplode();
        const tr = $drone[0].getBoundingClientRect();
        doExplosion(tr.left - rect.left + 39, tr.top - rect.top + 39, 1.8);
        $drone.remove();
        score    += 200;
        credits  += 8;
        updateScoreHUD();
        shooterSpeech('Drone down! ⚔️');
        _done();
      } else {
        sndTruckHit();
      }
    });

    // Timer: if drone reaches player (pause-aware — retries if game is paused)
    const reachTimer = setTimeout(function _droneReach() {
      if (!gameActive) return;
      if (gamePaused) { setTimeout(_droneReach, 500); return; }
      if ($drone.parent().length && !$drone.data('dead')) {
        removeDroneBuzz($drone);
        $drone.data('dead', true);
        $drone.remove();
        damageShooter(dmg);
        triggerVisionBlur();
        // Dramatic multi-blast + explosion sound on contact
        sndTruckExplode();
        doExplosion(destX, destY, 2.2);
        setTimeout(() => doExplosion(destX + getRandom(-35,35), destY + getRandom(-20,20), 1.5), 85);
        setTimeout(() => doExplosion(destX + getRandom(-55,55), destY + getRandom(-30,30), 1.0), 190);
        setTimeout(() => sndTruckExplode(), 110);
        shooterSpeech('Taking damage! ☢️', true);
        _done();
      }
    }, dur * 1000);
    droneTimers.push(reachTimer);
    $drone.data('reachTimer', reachTimer);
  }

  function startDrones() {
    // Drones in all waves (wave 1 gets longer initial delay for gentle intro)
    // Sequential: one drone at a time, 5-10 s random gap after each resolves
    const scheduleNext = () => {
      if (!gameActive) return;
      const gap = getRandom(5000, 10000);
      const rt = setTimeout(() => spawnDrone(scheduleNext), gap);
      droneTimers.push(rt);
    };
    // First drone: wave 1 = 20-25s (late intro), otherwise 10-15s
    const minDelay = wave === 1 ? 20000 : gcfg('vehicles','drone_spawn_min',10000);
    const maxDelay = wave === 1 ? 25000 : gcfg('vehicles','drone_spawn_max',15000);
    const t = setTimeout(() => spawnDrone(scheduleNext), getRandom(minDelay, maxDelay));
    droneTimers.push(t);
  }

  function stopDrones() {
    droneTimers.forEach(clearTimeout);
    droneTimers = [];
    $canves.find('.drone-target').remove();
  }

  // ── Combat system ─────────────────────────────────────────────────────────

  // Find the closest zombie element whose bounding rect contains (cx,cy)±r, nil if none.
  // Find closest zombie at (cx,cy)+/-r; blocked by foreground ruins.
  function findZombieAt(cx, cy, r) {
    r = r || 6;
    // Ruin block: if this canvas point is inside any ruin's bounding rect, bullet is absorbed
    if (typeof isBlockedByRuin === 'function' && isBlockedByRuin(cx, cy)) {
      // Damage the ruin with current weapon's dmg
      var _wpDmg = (WEAPONS[currentWeapon] || WEAPONS.revolver).dmg || 1;
      var _ruinDestroyed = damageRuinAt(cx, cy, _wpDmg);
      // Sound: ricochet if ruin survives, penetration thump if destroyed
      if (_ruinDestroyed) { sndBuildingPenetrate(); } else { sndRicoBuilding(); }
      return null;
    }
    let found = null, minDist = Infinity;
    const cRect = $canves[0].getBoundingClientRect();
    $(_liveZ).each(function () {
      const zr    = this.getBoundingClientRect();
      const left  = zr.left - cRect.left,  top  = zr.top  - cRect.top;
      const right = left + zr.width,       bot  = top  + zr.height;
      const clampX = Math.max(left, Math.min(right, cx));
      const clampY = Math.max(top,  Math.min(bot,   cy));
      const dist = Math.hypot(cx - clampX, cy - clampY);
      if (dist <= r && dist < minDist) { minDist = dist; found = this; }
    });
    return found;
  }

  // Kill a zombie element (central function used by all damage sources)
  function killZombieEl($z, cx, cy, isHead, isGroin) {
    if (!$z || !$z.length) return;
    if ($z.hasClass('killed') || $z.css('pointer-events') === 'none') return;
    zombieKilled++;
    _weaponKills[currentWeapon] = (_weaponKills[currentWeapon] || 0) + 1;
    _addMasteryKill(currentWeapon);
    // Boss kill reward
    if ($z.attr('data-boss') === '1') {
      _bossAlive = false;
      $('#boss-hp-bar').hide();
      score += 1000 + wave * 200;
      credits += 50 + wave * 10;
      var _bossArc = earnArcoin(3, 'boss_kill');
      shooterSpeech('💀 BOSS ELIMINATED! +' + (1000 + wave * 200) + ' pts + 🪙' + _bossArc + ' ARC', true);
      screenShake(8, 400);
      updateScoreHUD();
      // Boss kill celebration offer — random unowned cosmetic at 20% off
      var _bossUnowned = _COSMETICS.filter(function(c) {
        return !getCosmeticsOwned().includes(c.id) && c.cat !== 'boost';
      });
      if (_bossUnowned.length > 0) {
        var _pick = _bossUnowned[Math.floor(Math.random() * _bossUnowned.length)];
        var _salePrice = Math.max(1, Math.round(_pick.arc * 0.8));
        _showInGameOffer('cosmetic', '🏆 Boss Loot!', _pick.icon + ' ' + _pick.name + ' (20% off)', _salePrice, function() {
          var o = getCosmeticsOwned(); o.push(_pick.id);
          localStorage.setItem('arc_cosmetics', JSON.stringify(o));
          _applyCosmetics();
          shooterSpeech('✨ ' + _pick.name + ' unlocked!');
        });
      }
    }
    // Kill streak combo tracker (F14)
    _comboKills++;
    if (_comboKills > _bestCombo) _bestCombo = _comboKills;
    _comboMultiLive = Math.min(2.0, 1.0 + _comboKills * 0.1);
    if (_comboTimer) clearTimeout(_comboTimer);
    _comboTimer = setTimeout(function() { _comboKills = 0; _comboMultiLive = 1.0; _updateComboHUD(); }, 3000);
    _updateComboHUD();
    // Headshot streak tracker
    if (isHead) {
      _hsStreak++;
      if (_hsStreak > _bestHsStreak) _bestHsStreak = _hsStreak;
      if (_hsStreak >= 2) {
        var _hsLabels = { 2:'DOUBLE HS!', 3:'HS SPREE!', 4:'HEADHUNTER!', 5:'DEADEYE!' };
        var _hsLabel = _hsLabels[_hsStreak] || _hsStreak + 'x HEADSHOTS!';
        var $hs = $('<div class="hs-streak-badge">' + _hsLabel + '</div>');
        $canves.find('.hs-streak-badge').remove();
        $canves.append($hs);
        requestAnimationFrame(function(){ $hs.addClass('hs-streak--in'); });
        setTimeout(function(){ $hs.addClass('hs-streak--out'); }, 1800);
        setTimeout(function(){ $hs.remove(); }, 2400);
      }
    } else {
      _hsStreak = 0;
    }
    // F17: cosmetic kill message overlay
    if (window._killMsgId) {
      const _msgs = { kill_msg_ua: 'Slava Ukraini! 🇺🇦', kill_msg_boom: 'BOOM! 💥', kill_msg_ork: 'One less Ork! 💀' };
      const _msgTxt = _msgs[window._killMsgId] || '';
      if (_msgTxt) {
        const $km = $('<div class="kill-msg-overlay">' + _msgTxt + '</div>');
        $canves.append($km);
        requestAnimationFrame(function(){ $km.addClass('kill-msg--in'); });
        setTimeout(function(){ $km.addClass('kill-msg--out'); setTimeout(function(){ $km.remove(); }, 500); }, 1200);
      }
    }
    $killedTitle.html(zombieKilled);
    // Kill milestone rewards (25, 50, 100, 200)
    _checkKillMilestone(zombieKilled);
    checkWeaponDrops();
    _maybeSpawnCrate();
    // Mid-game achievement check every 5 kills
    if (zombieKilled % 5 === 0) checkAchievements();
    // Spawn Auto-Kill gift drop every 25 confirmed kills
    if (zombieKilled > 0 && zombieKilled % 25 === 0 && !window._autoKillActive) {
      spawnAutoKillDrop();
    }
    // Combo kill tracking
    comboCount++;
    if (comboTimer)     clearTimeout(comboTimer);
    if (comboFadeTimer) clearTimeout(comboFadeTimer);
    const killScore   = (100 + comboCount * 25 + (isHead ? 150 : 0) + (isGroin ? 75 : 0)) * (window._scoreBoostEnd && Date.now() < window._scoreBoostEnd ? 2 : 1);
    const killCredits = Math.min(10, comboCount + (isHead ? 3 : 0) + (isGroin ? 2 : 0));
    score   += killScore;
    credits += killCredits;
    updateScoreHUD();
    showComboIndicator(comboCount, killScore);
    if (comboCount >= 3) { $canves.removeClass('combo-shake'); void $canves[0].offsetWidth; $canves.addClass('combo-shake'); }
    comboTimer = setTimeout(() => { comboCount = 0; }, 3000);
    $z.css('pointer-events', 'none').find('.strength-bar').addClass('hide');
    // Blood splatter particles on kill
    _spawnBloodSplatter(cx || 0, cy || 0, isHead);
    // Hitstop freeze frame — punchy on headshots, a subtle single-frame beat on every kill
    hitStop(isHead ? 55 : 18);
    setTimeout(() => {
      // Death animation variant
      var _deathVar = isHead ? 'killed--explode' : ['killed--back','killed--collapse','killed--dissolve'][Math.floor(Math.random()*3)];
      if (window._reducedMotion) _deathVar = '';
      $z.addClass('killed' + (_deathVar ? ' ' + _deathVar : '')); sndRoar(); sndZombieScream(true);
      if (isHead) { sndHeadshotCrunch(); shooterSpeech('☠ HEADSHOT!'); }
      else if (isGroin) shooterSpeech('🥜 NUT SHOT!');
      else if (comboCount >= 3) shooterSpeech(`${comboCount}x COMBO!`);
      else shooterSpeech('Target down!');
    }, 150);
    setTimeout(() => { $z.fadeOut(function () { $z.remove(); if (!waveTransitioning) calcWave(); }); }, 300);
    // Safety net: force-remove zombie if fadeOut callback never fires (tab switch, animation interruption)
    setTimeout(() => { if ($z.closest('html').length) { $z.remove(); if (!waveTransitioning) calcWave(); } }, 2000);
    // ── BP progress toast ───────────────────────────────────
    _checkBpProgress(zombieKilled);
    // ── Skill XP ──────────────────────────────────────────
    addShooterXP(isHead ? 3 : isGroin ? 2 : 1);
    shooterShotsHit++;
    _updateAccuracyHUD();
    consecutiveMisses = 0;
    // ── Kill feed entry ──────────────────────────────────────
    _pushKillFeed($z, isHead, isGroin);
    // ── Ammo Scavenge: 15% chance to recover 1 round on kill ───
    if (Math.random() < 0.15 && ammo < getAmmoMax()) {
      ammo++;
      _updateHudWeapon();
      const $sc = $('<div class="ammo-scav-pop">+1 🔫</div>').css({ left: (cx || 100) + 'px', top: ((cy || 200) - 20) + 'px' });
      $canves.append($sc);
      requestAnimationFrame(() => $sc.addClass('ammo-scav--in'));
      setTimeout(() => { $sc.addClass('ammo-scav--out'); setTimeout(() => $sc.remove(), 500); }, 900);
    }
  }

  // ── Kill Feed (scrolling log, bottom-left) ──────────────────────
  var _KF_MAX = 4;
  var _KF_WEAPON_LABELS = {
    revolver:'RVLVR', shotgun:'SHTGN', m16:'M-16', lmg:'LMG', clay:'SHIT',
    gl:'GL', sniper:'SNPR', ftdrone:'FTDRN', tank_cannon:'TANK', bradley:'BRDLY',
    stugna:'STUGNA', drone_bomb:'D-BOM', panzerfaust:'PZRFT', pkm:'PKM', ak12:'AK-12',
    matador:'MTDR', nlaw:'NLAW', laser:'LASER'
  };
  var _KF_ZOMBIE_NAMES = {
    1:'Grunt', 2:'Runner', 3:'Brute', 4:'Tank', 5:'Titan', 6:'Commander'
  };
  function _pushKillFeed($z, isHead, isGroin) {
    var $kf = $('#kill-feed');
    if (!$kf.length) {
      $kf = $('<div id="kill-feed"></div>');
      $canves.append($kf);
    }
    var wLabel = _KF_WEAPON_LABELS[currentWeapon] || currentWeapon.toUpperCase().slice(0,5);
    var isBoss = $z.attr('data-boss') === '1';
    var zClass = ($z.attr('class') || '').match(/zombie-(\d)/);
    var zType  = zClass ? +zClass[1] : 1;
    var zName  = isBoss ? 'BOSS' : (_KF_ZOMBIE_NAMES[zType] || 'Ork');
    var tag = isHead ? ' ☠ HS' : isGroin ? ' 🥜' : '';
    var $entry = $('<div class="kf-entry' + (isBoss ? ' kf-boss' : '') + '">' + wLabel + ' → ' + zName + tag + '</div>');
    $kf.append($entry);
    requestAnimationFrame(function(){ $entry.addClass('kf--in'); });
    // Trim to max entries
    var $entries = $kf.children('.kf-entry');
    if ($entries.length > _KF_MAX) {
      $entries.first().addClass('kf--out');
      setTimeout(function(){ $entries.first().remove(); }, 300);
    }
  }

  // ── Blood splatter particles on kill ────────────────────────────────
  const _BLOOD_COLS = ['#8B0000','#A20000','#CC0000','#660000','#990000'];
  function _spawnBloodSplatter(x, y, isHead) {
    if (window._reducedMotion) return;
    const count = isHead ? 12 : 7;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (30 + Math.random() * 70) * (isHead ? 1.4 : 1);
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const sz = 3 + Math.random() * 5;
      const col = _BLOOD_COLS[Math.floor(Math.random() * _BLOOD_COLS.length)];
      const dur = 400 + Math.random() * 400;
      const $p = $('<div class="blood-particle"></div>').css({
        left: x + 'px', top: y + 'px',
        width: sz + 'px', height: sz + 'px',
        background: col, borderRadius: '50%',
        '--dx': dx + 'px', '--dy': dy + 'px',
        animationDuration: dur + 'ms'
      });
      $canves.append($p);
      setTimeout(() => $p.remove(), dur + 30);
    }
  }

  // ── Skill system functions ─────────────────────────────────────
  function addShooterXP(amt) {
    shooterXP += amt;
    checkSkillState();
  }

  function checkSkillState() {
    SKILL_TIERS.forEach(tier => {
      const had = _skillUnlocks.includes(tier.id);
      const has = shooterXP >= tier.xp;
      if (has && !had) {
        _skillUnlocks.push(tier.id);
        applySkillEffect(tier.id);
        if (tier.xp > 0) { sndSkillUnlock(); shooterSpeech('🏅 SKILL: ' + tier.name + '!'); }
        if (typeof buildInventory === 'function' && $('#inventory-panel').is(':visible')) buildInventory();
      } else if (!has && had && tier.xp > 0) {
        _skillUnlocks = _skillUnlocks.filter(x => x !== tier.id);
        shooterSpeech('⚠️ Skill lost: ' + tier.name, true);
      }
    });
  }

  function applySkillEffect(id) {
    if (id === 'quick_reload') {
      // Extra magazine on next reload — just bump reserve
      Object.keys(ammoReserve).forEach(k => { if (ammoReserve[k] > 0) ammoReserve[k]++; });
    } else if (id === 'rifleman') {
      WEAPONS.m16.dmg  = Math.max(WEAPONS.m16.dmg, 2);
      weaponAmmoBonus.m16 += 10;
    } else if (id === 'heavy_gunner') {
      weaponAmmoBonus.lmg += 20;
    } else if (id === 'demo_expert') {
      weaponAmmoBonus.gl += 1;
    } else if (id === 'clay_master') {
      WEAPONS.clay.splashR += 40;
      weaponAmmoBonus.clay += 2;
    } else if (id === 'marksman') {
      weaponFlags.headshot_bonus = true;
    } else if (id === 'speed_demon') {
      if (typeof m16FireRateMs !== 'undefined') m16FireRateMs = Math.max(60, m16FireRateMs - 20);
    } else if (id === 'iron_sights') {
      WEAPONS.sniper.spread = Math.max(0, WEAPONS.sniper.spread - 0.5);
    } else if (id === 'battle_veteran') {
      Object.keys(WEAPONS).forEach(k => { WEAPONS[k].dmg++; });
    }
  }

  function hasSkill(id) { return _skillUnlocks.includes(id); }
  let _ironWillUsed = false;
  let _ambushShotsLeft = 0;
  let _berserkShotCounter = 0; // counts shots for berserker crit (every 3rd)

  function checkSkillDegradation() {
    if (consecutiveMisses >= 12 && !godMode) {
      shooterXP  = Math.max(0, shooterXP - 5);
      consecutiveMisses = 0;
      checkSkillState();
      shooterSpeech('📉 −5 XP: sloppy shooting!');
    }
  }

  // ── Apply weapon damage to $z; shows floating % label + updates HP bar; returns true if killed
  function applyZombieDmg($z, dmg, cx, cy, isHead, isGroin) {
    if (!$z || !$z.length || $z.hasClass('killed') || $z.css('pointer-events') === 'none') return false;
    const maxSt     = parseInt($z.attr('data-strength-max')) || parseInt($z.attr('data-strength')) || 1;
    let   st        = parseInt($z.attr('data-strength'))     || 1;
    if (hasSkill('ambush') && _ambushShotsLeft > 0) { dmg *= 4; _ambushShotsLeft--; }
    // Weapon mastery passive damage bonus
    dmg = Math.ceil(dmg * _getMasteryDmgMulti(currentWeapon));
    // Berserker crit: every 3rd shot is a critical hit (×2 dmg) when below 20% HP
    let isCrit = false;
    if (hasSkill('berserker') && shooterHp < 20 && !isHead) {
      _berserkShotCounter++;
      if (_berserkShotCounter >= 3) { _berserkShotCounter = 0; dmg *= 2; isCrit = true; }
    }
    const actualDmg = isHead ? st : Math.min(dmg, st);
    st -= actualDmg;
    totalDmgDealt += actualDmg;
    // Award score for damage dealt (groin hits give +50% bonus score)
    score += actualDmg * 10 + (isGroin ? actualDmg * 5 : 0);
    updateScoreHUD();
    // Floating damage label: damage points + % of max HP
    const hpPct  = Math.min(100, Math.round(actualDmg / maxSt * 100));
    const numCol = isHead ? '#FFD700' : isCrit ? '#ff00ff' : isGroin ? '#da44ff' : actualDmg >= 3 ? '#ff3300' : actualDmg >= 2 ? '#ff8800' : '#ffffff';
    const $dmgN  = $('<div class="dmg-number' + (isGroin ? ' nut-shot' : '') + (isCrit ? ' crit-hit' : '') + '"></div>')
      .html(isHead
        ? '<span class="dmg-pts">☠ HEADSHOT!</span>'
        : isCrit
          ? `<span class="dmg-pts">⚡ CRIT! −${actualDmg}</span><span class="dmg-pct">−${hpPct}%</span>`
          : isGroin
          ? '<span class="dmg-pts">🥜 NUT SHOT! +75</span>'
          : `<span class="dmg-pts">−${actualDmg}</span><span class="dmg-pct">−${hpPct}%</span>`)
      .css({ left: (cx || 0) + 'px', top: (cy || 0) + 'px', color: numCol });
    $canves.append($dmgN);
    setTimeout(() => $dmgN.remove(), 800);
    // Strength bar color: green → yellow → red
    const pct    = Math.max(0, st) / maxSt;
    const barCol = pct > 0.6 ? '#2ecc40' : pct > 0.3 ? '#ff9900' : '#cc2200';
    const $bar   = $z.find('.strength-bar');
    $bar.css('background', barCol);
    $bar.attr('data-hp', Math.round(pct * 100) + '%');
    $z[0].style.setProperty('--hp-pct', Math.round(pct * 100) + '%');
    if ($z.attr('data-boss') === '1') { $('#boss-hp-fill').css('width', (pct * 100) + '%'); }
    if (st <= 0) {
      killZombieEl($z, cx, cy, isHead, isGroin);
      return true;
    }
    sndBulletImpact();
    sndZombieScream(false);
    $z.attr('data-strength', st);
    // Limb-shed: on heavy hits, spawn visual debris flying off zombie
    if (actualDmg >= 2 && Math.random() < 0.4) {
      var _lx = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 30);
      var _ly = -(15 + Math.random() * 35);
      var $limb = $('<div class="limb-debris"></div>').css({
        left: (cx || 0) + 'px', top: (cy || 0) + 'px',
        '--lx': _lx + 'px', '--ly': _ly + 'px'
      });
      $canves.append($limb);
      setTimeout(function () { $limb.remove(); }, 700);
    }
    return false;
  }

  // Fire a single projectile at (cx,cy) with weapon's spread; returns true if zombie hit
  function fireProjectile(cx, cy, weapon) {
    const wp = WEAPONS[weapon] || WEAPONS[currentWeapon];
    const tx = cx + (Math.random() * 2 - 1) * wp.spread;
    const ty = cy + (Math.random() * 2 - 1) * wp.spread * 0.5;
    doBulletTrace(tx, ty);
    const zEl = findZombieAt(tx, ty, 10);
    if (!zEl) return false;
    shotsHit++;
    const $z   = $(zEl);
    const zr   = zEl.getBoundingClientRect();
    const cr   = $canves[0].getBoundingClientRect();
    const relY = (ty + cr.top) - zr.top;
    const isHead  = relY < zr.height * 0.25;
    const isGroin = !isHead && relY >= zr.height * 0.50 && relY < zr.height * 0.73;
    doHitMarker(tx, ty, isHead);
    return applyZombieDmg($z, isHead ? 999 : wp.dmg, tx, ty, isHead, isGroin);
  }

  // Fire the current weapon at (cx,cy): handles pellets, GL area, single shots
  function fireWeapon(cx, cy, weapon) {
    const wname = weapon || currentWeapon;
    const wp    = WEAPONS[wname];
    if (!wp) return;
    if (wp.pellets > 1) {
      // Shotgun — fire all pellets with realistic dispersion cone
      for (let i = 0; i < wp.pellets; i++) fireProjectile(cx, cy, wname);
    } else if (wp.splashR > 0) {
      // Area-splash weapon (GL, tank cannon, clay ball, etc.)
      const cRect = $canves[0].getBoundingClientRect();
      if (wname === CLAY_WEAPON) {
        doClaySpat(cx, cy);   // clay mud visual + thwump sound
      } else {
        doExplosion(cx, cy, wname === 'tank_cannon' ? 3.5 : 1.0);
      }
      $(_liveZ).each(function () {
        const $z = $(this);
        const zr = this.getBoundingClientRect();
        const zx = (zr.left + zr.width  / 2) - cRect.left;
        const zy = (zr.top  + zr.height / 2) - cRect.top;
        const dist = Math.hypot(cx - zx, cy - zy);
        if (dist <= wp.splashR) {
          // Direct hit (within 30px of centre) = one-shot kill on foot soldiers
          const directHit = dist < 30;
          applyZombieDmg($z, directHit ? 999 : wp.dmg, zx, zy, false);
        }
      });
    } else {
      // Single projectile with weapon spread
      fireProjectile(cx, cy, wname);
    }
  }

  // ── Screen Shake Intensity System ────────────────────────────────
  function screenShake(intensity, duration) {
    if (window._reducedMotion || window._shakeEnabled === false) return;
    // intensity: 1=light(shot) 2=medium(hit) 3=heavy(explosion/tank) 4=ultra(death)
    $canves.css('--shake-intensity', Math.min(intensity, 4));
    $canves.removeClass('juice-shake'); void $canves[0].offsetWidth;
    $canves.addClass('juice-shake');
    setTimeout(() => $canves.removeClass('juice-shake'), duration || (60 + intensity * 30));
  }

  // ── Hit Stop (freeze frame) ──────────────────────────────────────
  function hitStop(ms) {
    if (!ms || ms <= 0 || window._reducedMotion) return;
    $canves.addClass('juice-hitstop');
    setTimeout(() => $canves.removeClass('juice-hitstop'), ms);
  }

  // ── In-Game Quick Offer (non-blocking mini-toast during gameplay) ──
  function _showInGameOffer(type, title, desc, arcCost, onBuy) {
    var $o = $('#ingame-offer');
    if (!$o.length) {
      $o = $('<div id="ingame-offer" class="ingame-offer"></div>');
      $canves.append($o);
    }
    var canAfford = arcoins >= arcCost;
    $o.html(
      '<div class="igo-content">' +
        '<span class="igo-title">' + title + '</span>' +
        '<span class="igo-desc">' + desc + ' — <strong>' + arcCost + ' ARC</strong></span>' +
        (canAfford ? '<button class="igo-buy-btn">BUY</button>' : '<button class="igo-buy-btn igo-buy-btn--get" onclick="showArcUpsell(' + arcCost + ')">GET ARC</button>') +
        '<button class="igo-dismiss">✕</button>' +
      '</div>'
    ).addClass('igo--visible');
    if (canAfford) {
      $o.find('.igo-buy-btn').off('click').on('click', function() {
        arcoins -= arcCost;
        localStorage.setItem('arc_balance', String(arcoins));
        updateScoreHUD();
        $o.removeClass('igo--visible');
        if (typeof onBuy === 'function') onBuy();
      });
    }
    $o.find('.igo-dismiss').off('click').on('click', function() { $o.removeClass('igo--visible'); });
    // Auto-dismiss after 6 seconds
    clearTimeout($o.data('igo-timer'));
    $o.data('igo-timer', setTimeout(function(){ $o.removeClass('igo--visible'); }, 6000));
  }

  // ── Kill Milestone Rewards (during gameplay) ──
  var _milestones = [25, 50, 100, 200, 500, 750, 1000, 1500, 2000, 5000];
  function _checkKillMilestone(kills) {
    if (_milestones.indexOf(kills) < 0) return;
    var _arcReward = kills <= 25 ? 2 : kills <= 50 ? 3 : kills <= 100 ? 5 : kills <= 200 ? 8 : kills <= 500 ? 15 : kills <= 750 ? 20 : kills <= 1000 ? 30 : kills <= 1500 ? 50 : kills <= 2000 ? 75 : 200;
    earnArcoin(_arcReward, 'milestone:' + kills + 'kills');
    // Show milestone toast with cosmetic preview
    var _unowned = _COSMETICS.filter(function(c){ var o; try{o=JSON.parse(localStorage.getItem('arc_cosmetics')||'[]');}catch(e){o=[];} return !o.includes(c.id) && c.cat!=='boost'; });
    var _preview = _unowned.length > 0 ? _unowned[Math.floor(Math.random() * _unowned.length)] : null;
    var $m = $('<div class="kill-milestone">' +
      '<div class="km-count">' + kills + ' KILLS!</div>' +
      '<div class="km-reward">+' + _arcReward + ' ARC 🪙</div>' +
      (_preview ? '<div class="km-preview">' + _preview.icon + ' ' + _preview.name + ' — <strong>' + _preview.arc + ' ARC</strong></div>' : '') +
      '</div>');
    $canves.append($m);
    requestAnimationFrame(function(){ $m.addClass('km--in'); });
    setTimeout(function(){ $m.addClass('km--out'); setTimeout(function(){ $m.remove(); }, 600); }, 3000);
  }

  // Muzzle flash on shoot
  function doMuzzleFlash(x, y) {
    const $mf = $('#muzzle-flash');
    $mf.css({ left: (x - 20) + 'px', top: (y - 20) + 'px' }).addClass('active');
    setTimeout(() => $mf.removeClass('active'), 60);
    screenShake(1, 80);
  }

  // ── DOM refs ─────────────────────────────────────────────────
  const $overlayScreen     = $canves.find('.overlay-screen');
  const $gameCover         = $canves.find('.game-cover');
  const $killedTitle       = $canves.find('.killed-status span');
  const $lifeIcons         = $canves.find('.life');
  const $muteMusic         = $canves.find('#mute-music');
  const $muteSounds        = $canves.find('#mute-sounds');
  const $godMode           = $canves.find('#god-mode');
  const $ammoTitle         = $canves.find('.ammo');
  const $reloadHint        = $canves.find('.reload-hint');
  const $reloadHintSpinner = $reloadHint.find('.reload-trigger');
  const $pauseGameTrigger  = $canves.find('#pause-game');
  const $m16Toggle         = $('#m16-mode-toggle');
  const $m16ModeLabel      = $('#m16-mode-label');
  const $weaponHands       = $canves.find('#weapon-hands');

  // ── Game state ────────────────────────────────────────────────
  let godMode = false, gamePaused = false;
  let life = gcfg('economy','start_lives',3), zombieKilled = 0, wave = 0, ammo = 6;
  let pauseZombieTracking;
  let gameActive = false;       // guards post-win/lose callbacks
  let _continuedThisRun = false; // death-upsell: max 1 continue per run
  let _streakSavedThisRun = false; // streak insurance: max 1 per run
  let shooterHp = gcfg('economy','start_hp',100);          // player health (drones deal damage)
  let shotsFired = 0, shotsHit = 0; // shot accuracy tracking

  // ── Shots-for-Ukraine global persistent counter ────────────────
  var shotsForUkraine = parseInt(localStorage.getItem('arc_shots_ukraine') || '0', 10);
  // Estimated per-shot UA donation impact ($), derived from 10% game revenue split
  var SHOT_UA_RATE = 0.00012;
  var _suPulseTimer = null;
  var _suMilestones = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  var _suShownMilestones = JSON.parse(localStorage.getItem('arc_su_milestones') || '[]');

  function _suUpdateUsd() {
    var el = document.getElementById('shots-ukraine-usd');
    if (el) el.textContent = '$' + (shotsForUkraine * SHOT_UA_RATE).toFixed(2);
  }

  function _suShowMilestone(count) {
    var usd = (count * SHOT_UA_RATE).toFixed(2);
    var $t = $('<div class="su-milestone-toast">' +
      '🇺🇦 MILESTONE: ' + count.toLocaleString() + ' shots!' +
      '<div class="su-toast-line2">~$' + usd + ' est. impact for Ukraine\'s defense</div></div>');
    $('body').append($t);
    setTimeout(function() { $t.remove(); }, 4000);
  }

  function incrementShotsForUkraine() {
    shotsForUkraine++;
    if (shotsForUkraine % 10 === 0) localStorage.setItem('arc_shots_ukraine', shotsForUkraine);
    var el = document.getElementById('shots-ukraine-val');
    if (el) el.textContent = shotsForUkraine.toLocaleString();
    _suUpdateUsd();
    // Pulse animation
    var hud = document.getElementById('shots-ukraine');
    if (hud && !_suPulseTimer) {
      hud.classList.add('su-pulse');
      _suPulseTimer = setTimeout(function() { hud.classList.remove('su-pulse'); _suPulseTimer = null; }, 150);
    }
    // Milestone check
    for (var mi = 0; mi < _suMilestones.length; mi++) {
      if (shotsForUkraine === _suMilestones[mi] && _suShownMilestones.indexOf(_suMilestones[mi]) === -1) {
        _suShownMilestones.push(_suMilestones[mi]);
        localStorage.setItem('arc_su_milestones', JSON.stringify(_suShownMilestones));
        _suShowMilestone(_suMilestones[mi]);
        break;
      }
    }
  }
  // Initialize donation estimate on load
  setTimeout(_suUpdateUsd, 200);
  setTimeout(_updateMedkitHUD, 300);
  // Save on page unload to catch remaining shots
  window.addEventListener('beforeunload', function () {
    localStorage.setItem('arc_shots_ukraine', shotsForUkraine);
  });
  let droneTimers = [];         // setTimeout handles for drone spawns
  let droneRafId  = null;       // placeholder (drones use setTimeout chains)

  // ── Score / economy state ─────────────────────────────────────
  let score = 0, credits = 0;

  // ── Call-In Strike System ─────────────────────────────────────
  const CALLIN_CFG = {
    arty:       { cost: gcfg('strikes','arty_cost',500),      cooldown: gcfg('strikes','arty_cooldown',18000) },
    drones:     { cost: gcfg('strikes','drones_cost',350),    cooldown: gcfg('strikes','drones_cooldown',25000) },
    himars:     { cost: gcfg('strikes','himars_cost',1200),    cooldown: gcfg('strikes','himars_cooldown',60000) },
    bradley:    { cost: gcfg('strikes','bradley_cost',800),    cooldown: gcfg('strikes','bradley_cooldown',45000) },
    rover:      { cost: gcfg('strikes','rover_cost',200),      cooldown: gcfg('strikes','rover_cooldown',20000) },
    firedrone:  { cost: gcfg('strikes','firedrone_cost',600),   cooldown: gcfg('strikes','firedrone_cooldown',35000) },
    fpv:        { cost: gcfg('strikes','fpv_cost',450),        cooldown: gcfg('strikes','fpv_cooldown',28000) },
  };
  const _ciCdEnd = { arty: 0, drones: 0, himars: 0, bradley: 0, rover: 0, firedrone: 0, fpv: 0 };
  let _ciRaf = null;
  const _ciBtns = {};  // cached callin button refs (populated on first RAF)
  let arcoins = 0;               // Anti-Ruscist Coin (ARC) balance
  let arcStreakMulti = 1.0;
  // F14: In-game kill streak combo
  let _comboKills = 0;          // consecutive kills within 4s
  let _comboMultiLive = 1.0;    // current session combo (shown in HUD)
  let _comboTimer = null;
  // Battle report trackers
  let _bestCombo   = 0;
  let _headshots    = 0;
  let _hsStreak     = 0;
  let _bestHsStreak = 0;
  let _gameStartMs  = 0;
  let _gameTimerInt = null;
  let _sessionDmgTaken = 0;
  let _waveDmgTaken     = 0;
  let _waveStartMs      = 0;
  let _sessionArcEarned = 0;
  // Whale-farming velocity guard — ring buffer of recent earn timestamps
  let _arcEarnTimestamps = [];
  const _ARC_VELOCITY_WINDOW_MS  = 30000; // 30-second rolling window
  const _ARC_VELOCITY_THROTTLE_N = 8;    // >8 earn events in window → 25% rate
  let totalDmgDealt      = 0;
  var _weaponKills        = {};  // per-weapon kill counter
  // ── Weapon Mastery (persistent across sessions) ──────────────
  const MASTERY_TIERS = [
    { kills:  50, label: 'Bronze',  icon: '🥉', bonus: '+5% dmg'  },
    { kills: 200, label: 'Silver',  icon: '🥈', bonus: '+10% dmg' },
    { kills: 500, label: 'Gold',    icon: '🥇', bonus: '+15% dmg' },
  ];
  function _getMasteryData() {
    try { return JSON.parse(localStorage.getItem('arc_weapon_mastery') || '{}'); } catch(e) { return {}; }
  }
  function _saveMasteryData(d) { localStorage.setItem('arc_weapon_mastery', JSON.stringify(d)); }
  function _getMasteryTier(wname) {
    const d = _getMasteryData(); const k = d[wname] || 0;
    for (let i = MASTERY_TIERS.length - 1; i >= 0; i--) { if (k >= MASTERY_TIERS[i].kills) return i; }
    return -1;
  }
  function _getMasteryDmgMulti(wname) {
    const tier = _getMasteryTier(wname);
    return tier < 0 ? 1.0 : [1.05, 1.10, 1.15][tier];
  }
  function _addMasteryKill(wname) {
    const d = _getMasteryData();
    const prev = d[wname] || 0;
    d[wname] = prev + 1;
    _saveMasteryData(d);
    // Check tier-up
    for (let i = 0; i < MASTERY_TIERS.length; i++) {
      if (prev < MASTERY_TIERS[i].kills && d[wname] >= MASTERY_TIERS[i].kills) {
        const t = MASTERY_TIERS[i];
        const _L = {revolver:'Revolver',shotgun:'Shotgun',m16:'M-16',lmg:'LMG',clay:'Clay',gl:'GL',sniper:'Sniper',ftdrone:'FT Drone',tank_cannon:'Tank',bradley:'Bradley',stugna:'Stugna',drone_bomb:'D-Bomb',panzerfaust:'Pzrfst',pkm:'PKM',ak12:'AK-12',matador:'Matador',nlaw:'NLAW',laser:'Laser'};
        const wLabel = _L[wname] || wname;
        shooterSpeech(t.icon + ' ' + wLabel + ' ' + t.label + ' Mastery! ' + t.bonus);
        const $mb = $('<div class="mastery-badge-pop">' + t.icon + ' ' + t.label.toUpperCase() + ' MASTERY<br><small>' + wLabel + ' — ' + t.bonus + '</small></div>');
        $canves.append($mb);
        requestAnimationFrame(() => $mb.addClass('mastery-pop--in'));
        setTimeout(() => { $mb.addClass('mastery-pop--out'); setTimeout(() => $mb.remove(), 600); }, 2500);
      }
    }
  }
  let _pvpChallenge = null;             // active PvP challenge from URL params       // ARC earn rate multiplier from login streak badges
  const arcoinLedger = [];       // blockchain-style tx log
  const SPIN_PRIZES = [
    { label: '+1 ARC',  arc: 1, money: 0   },
    { label: '+2 ARC',  arc: 2, money: 0   },
    { label: '+50 ₴',  arc: 0, money: 50  },
    { label: '+100 ₴', arc: 0, money: 100 },
    { label: '+3 ARC',  arc: 3, money: 0   },
    { label: '+200 ₴', arc: 0, money: 200 },
  ];
  const newWeapons = new Set();  // weapons just picked up, not yet seen in armory
  // ── Network config — flip TESTNET_MODE to switch between Amoy testnet and Mainnet ──
  const TESTNET_MODE = false; // ← mainnet Polygon (real POL)

  // Polygon / MetaMask wallet state
  let walletAddr    = null;  // connected account address or null
  let walletChainId = null;  // current chainId hex string
  // Normalise any chainId format (0x89, 0x000089, 137, "137") → '0x89'
  const _normChain = function(cid) { return cid != null ? '0x' + parseInt(cid, 16).toString(16) : null; };

  // Polygon Mainnet
  const _MAINNET_CHAIN_ID = '0x89'; // 137
  const _MAINNET_PARAMS = {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  };

  // Polygon Amoy Testnet (replaces Mumbai)
  const _TESTNET_CHAIN_ID = '0x13882'; // 80002
  const _TESTNET_PARAMS = {
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  };

  const POLYGON_CHAIN_ID = TESTNET_MODE ? _TESTNET_CHAIN_ID : _MAINNET_CHAIN_ID;
  const POLYGON_PARAMS   = TESTNET_MODE ? _TESTNET_PARAMS   : _MAINNET_PARAMS;
  const POLYGONSCAN_HOST = TESTNET_MODE ? 'amoy.polygonscan.com' : 'polygonscan.com';
  // NFT contract address — populate after deploying UkrainianDefendersNFT.sol to Polygon
  const NFT_CONTRACT_ADDRESS = '0x8FF4468c28fD4A1ad4EfbD82dD7F1c9eb8C1bACc';
  const KILLNFT_ADDRESS      = '0xe78485271787d712179CCaA4a3A67f07C2Ed7800';
  const ARC_TOKEN_ADDRESS    = '0xD7D4F2DE20a11B344A44519583b177F26A6AEe76';
  // Persist Anti-Ruscist Coin (ARC) across game sessions (survives resets)
  try {
    const _ab = localStorage.getItem('arc_balance');
    if (_ab !== null) arcoins = parseInt(_ab, 10) || 0;
    const _al = localStorage.getItem('arc_ledger');
    if (_al) arcoinLedger.push(...JSON.parse(_al));
  } catch(e) {}
  let comboCount = 0, comboTimer = null, comboFadeTimer = null;

  // ── Skill / XP system ──────────────────────────────────────────
  let shooterXP         = 0;
  let shooterShotsFired = 0;
  let shooterShotsHit   = 0;
  let consecutiveMisses = 0;
  let _skillUnlocks     = [];   // IDs of unlocked skill tiers

  // Branched skill tree — 4 branches, prerequisites, rank names
  // branch: 'combat'|'weapons'|'tactical'|'support'
  const SKILL_TREE_BRANCHES = [
    { id: 'combat',   label: '⚔️ COMBAT',   color: '#f44' },
    { id: 'weapons',  label: '🔫 WEAPONS',  color: '#4af' },
    { id: 'tactical', label: '🧠 TACTICAL', color: '#4f8' },
    { id: 'support',  label: '⚕️ SUPPORT',  color: '#fa4' },
  ];
  const SKILL_TIERS = [
    // ── COMBAT branch ────────────────────────────────────────────────────
    { id:'steady_hand',     xp:    0, icon:'🎯', branch:'combat',   rank:'Recruit',    req:[],                name:'Steady Hand',           desc:'Baseline combat training. Always active.' },
    { id:'reflexes',        xp:   15, icon:'⚡', branch:'combat',   rank:'Soldier',    req:['steady_hand'],   name:'Combat Reflexes',        desc:'+10% movement response speed; flinch reduced by 25%' },
    { id:'combat_shooter',  xp:   30, icon:'💥', branch:'combat',   rank:'Corporal',   req:['reflexes'],      name:'Combat Shooter',         desc:'Shotgun drops appear one kill earlier' },
    { id:'close_quarters',  xp:   70, icon:'🗡️', branch:'combat',   rank:'Sergeant',   req:['combat_shooter'],name:'Close Quarters Expert',  desc:'+15% damage when enemy is within 80px; instant melee knockback' },
    { id:'hardened',        xp:  150, icon:'🛡️', branch:'combat',   rank:'Lieutenant', req:['close_quarters'],name:'Hardened Veteran',       desc:'Shield absorbs 2 extra hits; HP regen +1 per 10 kills' },
    { id:'battle_veteran',  xp:  500, icon:'🇺🇦', branch:'combat',  rank:'Captain',    req:['hardened'],      name:'Battle Veteran',         desc:'All weapon damage +2; ARC earn rate +20%' },
    { id:'berserker',       xp: 1200, icon:'🔥', branch:'combat',   rank:'Colonel',    req:['battle_veteran'],name:'Berserker Mode',         desc:'Below 20% HP: +40% fire rate; critical hits every 3rd shot' },
    { id:'iron_will',       xp: 3000, icon:'⭐', branch:'combat',   rank:'General',    req:['berserker'],     name:'Iron Will',              desc:'Survive one fatal hit per wave at 1 HP; +100% score bonus' },

    // ── WEAPONS branch ───────────────────────────────────────────────────
    { id:'rifleman',        xp:   20, icon:'🔫', branch:'weapons',  rank:'Recruit',    req:[],                name:'Rifleman',               desc:'M-16 magazine +10 rounds; unlock at fewer kills' },
    { id:'heavy_gunner',    xp:   60, icon:'⚙️', branch:'weapons',  rank:'Soldier',    req:['rifleman'],      name:'Heavy Gunner',            desc:'LMG belt +25 rounds; PKM belt +20 rounds' },
    { id:'demo_expert',     xp:  130, icon:'💣', branch:'weapons',  rank:'Corporal',   req:['heavy_gunner'],  name:'Demo Expert',             desc:'GL clips +1 grenade; Panzerfaust +1 charge; all explosives +10% splash' },
    { id:'precision_strike',xp:  250, icon:'🎯', branch:'weapons',  rank:'Sergeant',   req:['demo_expert'],   name:'Precision Strike',        desc:'Sniper spread −50%; headshot score multiplier ×3; NLAW unlock −8 kills' },
    { id:'anti_tank',       xp:  450, icon:'🚀', branch:'weapons',  rank:'Lieutenant', req:['precision_strike'],name:'Anti-Tank Specialist', desc:'Stugna + NLAW dmg +25%; tank destroy bonus ×2; Matador free reload' },
    { id:'weapons_master',  xp: 1000, icon:'🔩', branch:'weapons',  rank:'Captain',    req:['anti_tank'],     name:'Weapons Master',         desc:'Switch weapons 2× faster; all ammo reserves +1 magazine; 10% chance no-ammo-use' },
    { id:'arsenal',         xp: 2500, icon:'⚔️', branch:'weapons',  rank:'Colonel',    req:['weapons_master'],name:'Living Arsenal',         desc:'Carry two weapons simultaneously; rapid swap with Q; shared crosshair' },

    // ── TACTICAL branch ──────────────────────────────────────────────────
    { id:'scout',           xp:   10, icon:'🔭', branch:'tactical', rank:'Recruit',    req:[],                name:'Scout',                  desc:'Zombie spawn shown 2s earlier on radar; speed +5%' },
    { id:'suppression',     xp:   40, icon:'🎖️', branch:'tactical', rank:'Soldier',    req:['scout'],         name:'Suppression Fire',        desc:'Sustained fire slows zombie movement by 20%' },
    { id:'squad_tactics',   xp:   90, icon:'🗺️', branch:'tactical', rank:'Corporal',   req:['suppression'],   name:'Squad Tactics',           desc:'Call-in cooldowns −15%; Bradley/Tank +2 extra shots' },
    { id:'flanking',        xp:  200, icon:'↩️', branch:'tactical', rank:'Sergeant',   req:['squad_tactics'], name:'Flanking Maneuver',       desc:'Bullets from outside the screen deal +30% damage' },
    { id:'ambush',          xp:  400, icon:'🌑', branch:'tactical', rank:'Lieutenant', req:['flanking'],      name:'Ambush Protocol',         desc:'First 3 shots each wave deal ×4 damage; always headshots' },
    { id:'commander',       xp:  900, icon:'📡', branch:'tactical', rank:'Captain',    req:['ambush'],        name:'Field Commander',         desc:'All call-ins cost −20% credits/ARC; secondary explosions on kills' },
    { id:'ace_tactician',   xp: 2000, icon:'🏆', branch:'tactical', rank:'Colonel',    req:['commander'],     name:'Ace Tactician',           desc:'Score multiplier ×1.5 globally; unlock secret AIRSTRIKE call-in' },

    // ── SUPPORT branch ───────────────────────────────────────────────────
    { id:'field_medic',     xp:   25, icon:'⚕️', branch:'support',  rank:'Recruit',    req:[],                name:'Field Medic',             desc:'Heal kit appears every 3 waves instead of 5; +2 max HP' },
    { id:'logistician',     xp:   55, icon:'📦', branch:'support',  rank:'Soldier',    req:['field_medic'],   name:'Logistician',             desc:'Ammo drops give +1 extra magazine; crate spawn rate +20%' },
    { id:'clay_master',     xp:  120, icon:'�', branch:'support',  rank:'Corporal',   req:['logistician'],   name:'Shit Master',             desc:'Shit Thrower splash +50px; +2 free balls free per wave' },
    { id:'engineer',        xp:  220, icon:'🔧', branch:'support',  rank:'Sergeant',   req:['clay_master'],   name:'Combat Engineer',         desc:'Mines deal +30% damage; place 2 mines simultaneously; defuse traps instantly' },
    { id:'quick_reload',    xp:  350, icon:'⟳',  branch:'support',  rank:'Lieutenant', req:['engineer'],      name:'Lightning Reload',        desc:'All weapons reload 40% faster; auto-reload when dry (no button needed)' },
    { id:'speed_demon',     xp:  700, icon:'💨', branch:'support',  rank:'Captain',    req:['quick_reload'],  name:'Speed Demon',             desc:'M-16 fire-rate +30%; movement +15%; dodge roll on double-tap shift' },
    { id:'iron_sights',     xp: 1500, icon:'◎',  branch:'support',  rank:'Colonel',    req:['speed_demon'],   name:'Iron Sights Pro',         desc:'−60% sniper spread; lock-on assist for NLAW; auto-lead on fast targets' },
    { id:'ghost_operator',  xp: 4000, icon:'👻', branch:'support',  rank:'General',    req:['iron_sights'],   name:'Ghost Operator',          desc:'Stealth mode: 3s of invisibility per wave; zombies attack others first' },
  ];
  const weaponAmmoBonus      = { revolver: 0, shotgun: 0, m16: 0, lmg: 0, gl: 0, sniper: 0, clay: 0,
                                   stugna: 0, drone_bomb: 0, panzerfaust: 0, pkm: 0, ak12: 0, matador: 0, nlaw: 0, laser: 0 };
  // Reserve magazines per weapon — each reload consumes one; buy more in Ammo Shop
  const ammoReserve          = { revolver: 3, shotgun: 3, m16: 2, lmg: 2, gl: 2, sniper: 2, clay: 4,
                                   stugna: 2, drone_bomb: 3, panzerfaust: 2, pkm: 3, ak12: 3, matador: 2, nlaw: 2, laser: 3 };
  const weaponUpgradesBought = {}; // key: `wname_idx` → true
  const weaponFlags          = {}; // misc: revolver_autorld etc.

  const REVOLVER_WEAPON    = 'revolver';
  const SHOTGUN_WEAPON     = 'shotgun';
  const M16_WEAPON         = 'm16';
  const REVOLVER_AMMO_MAX  = 6;
  const SHOTGUN_AMMO_MAX   = 2;
  const M16_AMMO_MAX       = 30;
  const SHOTGUN_UNLOCK_KILLS = 3;
  const M16_UNLOCK_KILLS     = 7;
  const LMG_WEAPON           = 'lmg';
  const GL_WEAPON            = 'gl';
  const LMG_AMMO_MAX         = 100;
  const GL_AMMO_MAX          = 4;
  const LMG_UNLOCK_KILLS     = 15;
  const GL_UNLOCK_KILLS      = 22;
  const NLAW_WEAPON           = 'nlaw';
  const LASER_WEAPON          = 'laser';
  const NLAW_AMMO_MAX         = 3;
  const LASER_AMMO_MAX        = 20;
  const NLAW_UNLOCK_KILLS     = 32;
  const LASER_UNLOCK_KILLS    = 45;
  const SNIPER_WEAPON         = 'sniper';
  const SNIPER_AMMO_MAX       = 5;
  const SNIPER_UNLOCK_KILLS   = 10;  // unlocks early

  // ━━ NFT-exclusive weapons (ARC NFT holders only; always available in God Mode) ━━
  const FTDRONE_WEAPON        = 'ftdrone';    // Fire-Throwing Drone
  const TANK_WEAPON           = 'tank_cannon'; // T-72 Tank Cannon
  const BRADLEY_WEAPON        = 'bradley';    // Bradley IFV Bushmaster Cannon
  const FTDRONE_AMMO_MAX      = 40;  // napalm canisters
  const TANK_AMMO_MAX         = 5;   // APFSDS shells
  const BRADLEY_AMMO_MAX      = 35;  // 25mm rounds
  const BRADLEY_FIRE_RATE_MS  = 45;  // gatling style ~1300 rpm
  // ── Clay Ball Thrower ─────────────────────────────────────────
  const CLAY_WEAPON           = 'clay';   // ⚪ Clay Ball Thrower
  const CLAY_AMMO_MAX         = 5;        // clay chambers
  const CLAY_UNLOCK_KILLS     = 18;       // unlocks between LMG and GL
  // ── 7 additional weapons ──────────────────────────────────────────────
  const STUGNA_WEAPON         = 'stugna';       // Anti-tank guided missile
  const DRONE_BOMB_WEAPON     = 'drone_bomb';   // Drop grenades from FPV POV
  const PANZERFAUST_WEAPON    = 'panzerfaust';  // Disposable AT rocket
  const PKM_WEAPON            = 'pkm';          // Light machine gun
  const AK12_WEAPON           = 'ak12';         // Modern assault rifle
  const MATADOR_WEAPON        = 'matador';      // Multi-role shoulder-launched
  const STUGNA_AMMO_MAX       = 3;
  const DRONE_BOMB_AMMO_MAX   = 5;
  const PANZERFAUST_AMMO_MAX  = 3;
  const PKM_AMMO_MAX          = 200;
  const AK12_AMMO_MAX         = 60;
  const MATADOR_AMMO_MAX      = 3;
  const STUGNA_UNLOCK_KILLS   = 40;
  const DRONE_BOMB_UNLOCK_KILLS = 28;
  const PANZERFAUST_UNLOCK_KILLS = 35;
  const PKM_UNLOCK_KILLS      = 20;
  const AK12_UNLOCK_KILLS     = 8;
  const MATADOR_UNLOCK_KILLS  = 38;
  let lmgFireRateMs   = 40;  // ~1500 rpm (upgradeable)
  let pkmFireRateMs   = 50;  // PKM — heavier LMG (upgradeable)
  let ak12FireRateMs  = 70;  // AK-12 — modern AR (upgradeable)
  let revoFireRateMs  = 0;   // revolver is semi-auto, fire-rate = click speed, but tracks upgrades (future use)
  let shotFireRateMs  = 0;   // semi-auto placeholder
  let glFireRateMs    = 0;   // semi-auto placeholder

  // ── Real-world weapon profiles ────────────────────────────────────────────
  // dmg = HP per pellet/bullet, pellets = simultaneous projectiles (shotgun),
  // spread = random offset radius (px) applied to each projectile,
  // splashR = GL explosion radius (px), truckDmg = vehicle HP reduction
  const WEAPONS = {
    revolver: { dmg: 3, pellets: 1, spread:  0, splashR:   0, truckDmg: 2  },
    shotgun:  { dmg: 1, pellets: 9, spread: 55, splashR:   0, truckDmg: 4  },
    m16:      { dmg: 2, pellets: 1, spread:  8, splashR:   0, truckDmg: 1  },
    lmg:      { dmg: 2, pellets: 1, spread: 18, splashR:   0, truckDmg: 2  },
    gl:       { dmg: 6, pellets: 1, spread:  0, splashR: 130, truckDmg: 6  },
    nlaw:     { dmg:22, pellets: 1, spread:  0, splashR: 240, truckDmg: 22 },
    laser:    { dmg:12, pellets: 1, spread:  2, splashR:   0, truckDmg: 8  },
    sniper:   { dmg: 8, pellets: 1, spread:  1, splashR:   0, truckDmg: 5  },
    // NFT-exclusive
    ftdrone:     { dmg: 4, pellets: 3, spread: 38, splashR: 80,  truckDmg: 6  },
    tank_cannon: { dmg:30, pellets: 1, spread:  0, splashR: 340, truckDmg: 40 },
    bradley:     { dmg: 9, pellets: 1, spread:  6, splashR:  0,  truckDmg: 18 },
    // Clay Ball Thrower — low direct dmg, huge splash zone
    clay:        { dmg: 2, pellets: 1, spread: 22, splashR: 160, truckDmg: 3  },
    // Extended arsenal
    stugna:      { dmg:45, pellets: 1, spread:  2, splashR: 120, truckDmg:80  },
    drone_bomb:  { dmg:35, pellets: 3, spread: 45, splashR:  90, truckDmg:40  },
    panzerfaust: { dmg:40, pellets: 1, spread:  3, splashR: 110, truckDmg:70  },
    pkm:         { dmg: 8, pellets: 1, spread: 10, splashR:   0, truckDmg:12  },
    ak12:        { dmg: 5, pellets: 1, spread:  8, splashR:   0, truckDmg: 4  },
    matador:     { dmg:38, pellets: 1, spread:  4, splashR:  95, truckDmg:65  },
  };

  // Baseline for reset (deep copy before any upgrades mutate the object)
  const WEAPONS_BASE = JSON.parse(JSON.stringify({
    revolver: { dmg: 3, pellets: 1, spread:  0, splashR:   0, truckDmg: 2  },
    shotgun:  { dmg: 1, pellets: 9, spread: 55, splashR:   0, truckDmg: 4  },
    m16:      { dmg: 2, pellets: 1, spread:  8, splashR:   0, truckDmg: 1  },
    lmg:      { dmg: 2, pellets: 1, spread: 18, splashR:   0, truckDmg: 2  },
    gl:       { dmg: 6, pellets: 1, spread:  0, splashR: 130, truckDmg: 6  },
    nlaw:     { dmg:22, pellets: 1, spread:  0, splashR: 240, truckDmg: 22 },
    laser:    { dmg:12, pellets: 1, spread:  2, splashR:   0, truckDmg: 8  },
    sniper:   { dmg: 8, pellets: 1, spread:  1, splashR:   0, truckDmg: 5  },
    ftdrone:     { dmg: 4, pellets: 3, spread: 38, splashR: 80,  truckDmg: 6  },
    tank_cannon: { dmg:30, pellets: 1, spread:  0, splashR: 340, truckDmg: 40 },
    bradley:     { dmg: 9, pellets: 1, spread:  6, splashR:  0,  truckDmg: 18 },
    clay:        { dmg: 2, pellets: 1, spread: 22, splashR: 160, truckDmg: 3  },
    stugna:      { dmg:45, pellets: 1, spread:  2, splashR: 120, truckDmg:80  },
    drone_bomb:  { dmg:35, pellets: 3, spread: 45, splashR:  90, truckDmg:40  },
    panzerfaust: { dmg:40, pellets: 1, spread:  3, splashR: 110, truckDmg:70  },
    pkm:         { dmg: 8, pellets: 1, spread: 10, splashR:   0, truckDmg:12  },
    ak12:        { dmg: 5, pellets: 1, spread:  8, splashR:   0, truckDmg: 4  },
    matador:     { dmg:38, pellets: 1, spread:  4, splashR:  95, truckDmg:65  },
  }));

  // ── Weapon upgrade definitions (5 tiers each) ─────────────────
  // Categories: 'ammo' = magazine, 'rate' = fire-rate, 'dmg' = damage, 'misc' = misc
  const WEAPON_UPGRADES = {
    revolver: [
      { cat: 'ammo', icon: '⬡', name: 'Speed Loader I',  cost: 250,  desc: '+2 rounds / mag',        apply() { weaponAmmoBonus.revolver += 2; } },
      { cat: 'ammo', icon: '⬡', name: 'Speed Loader II', cost: 400,  desc: '+2 more rounds / mag',   apply() { weaponAmmoBonus.revolver += 2; } },
      { cat: 'dmg',  icon: '◈', name: 'Hollow Point',    cost: 400,  desc: '+2 damage / shot',       apply() { WEAPONS.revolver.dmg += 2; } },
      { cat: 'dmg',  icon: '◈', name: 'Match Grade',     cost: 600,  desc: '+2 more damage',         apply() { WEAPONS.revolver.dmg += 2; } },
      { cat: 'misc', icon: '⚡', name: 'Quick Draw',      cost: 700,  desc: 'Auto-reload on empty',   apply() { weaponFlags.revolver_autorld = true; } },
      { cat: 'dmg',  icon: '🔩', name: 'Tungsten Core',   cost: 850,  desc: '+3 vs vehicles',         apply() { WEAPONS.revolver.truckDmg += 3; } },
    ],
    shotgun: [
      { cat: 'ammo', icon: '⬡', name: 'Extended Tube I',  cost: 300, desc: '+2 shells / mag',        apply() { weaponAmmoBonus.shotgun += 2; } },
      { cat: 'ammo', icon: '⬡', name: 'Extended Tube II', cost: 500, desc: '+2 more shells / mag',   apply() { weaponAmmoBonus.shotgun += 2; } },
      { cat: 'rate', icon: '⚡', name: 'Combat Pump',      cost: 450, desc: 'Pump faster — +20% rate',apply() { weaponFlags.shotgun_fastpump = true; } },
      { cat: 'dmg',  icon: '◉', name: 'Choke Tube',       cost: 500, desc: 'Tighter spread −45%',    apply() { WEAPONS.shotgun.spread = Math.max(20, WEAPONS.shotgun.spread - 25); } },
      { cat: 'dmg',  icon: '🔥', name: "Dragon's Breath",  cost: 750, desc: '+2 damage / pellet',    apply() { WEAPONS.shotgun.dmg += 2; } },
      { cat: 'dmg',  icon: '🔩', name: 'Flechette Rounds', cost: 900, desc: '+2 pellets per shot',    apply() { WEAPONS.shotgun.pellets += 2; } },
    ],
    m16: [
      { cat: 'ammo', icon: '⬡', name: 'STANAG 45',        cost: 300,  desc: '+15 rounds / mag',      apply() { weaponAmmoBonus.m16 += 15; } },
      { cat: 'ammo', icon: '⬡', name: 'STANAG 60',        cost: 500,  desc: '+15 more rounds / mag',  apply() { weaponAmmoBonus.m16 += 15; } },
      { cat: 'rate', icon: '⚡', name: 'Trigger Job I',    cost: 550,  desc: 'Fire rate +30%',         apply() { m16FireRateMs = Math.max(45, m16FireRateMs - 20); } },
      { cat: 'rate', icon: '⚡', name: 'Trigger Job II',   cost: 750,  desc: 'Fire rate +25% more',    apply() { m16FireRateMs = Math.max(40, m16FireRateMs - 15); } },
      { cat: 'dmg',  icon: '◎', name: 'ACOG Scope',       cost: 500,  desc: 'Spread −63%',            apply() { WEAPONS.m16.spread = Math.max(2, WEAPONS.m16.spread - 5); } },
      { cat: 'dmg',  icon: '🔩', name: 'Foregrip',         cost: 800,  desc: 'Spread −3 stability',    apply() { WEAPONS.m16.spread = Math.max(1, WEAPONS.m16.spread - 3); } },
    ],
    lmg: [
      { cat: 'ammo', icon: '⬡', name: '200-Rd Belt',      cost: 400,  desc: '+50 rounds / belt',     apply() { weaponAmmoBonus.lmg += 50; } },
      { cat: 'ammo', icon: '⬡', name: '300-Rd Belt',      cost: 650,  desc: '+50 more rounds',        apply() { weaponAmmoBonus.lmg += 50; } },
      { cat: 'rate', icon: '⚡', name: 'Barrel Swap I',    cost: 500,  desc: 'Fire rate +20%',         apply() { lmgFireRateMs = Math.max(28, lmgFireRateMs - 8); } },
      { cat: 'rate', icon: '⚡', name: 'Barrel Swap II',   cost: 800,  desc: 'Fire rate +20% more',    apply() { lmgFireRateMs = Math.max(22, lmgFireRateMs - 6); } },
      { cat: 'dmg',  icon: '◈', name: 'AP Rounds',        cost: 800,  desc: '+2 damage / shot',       apply() { WEAPONS.lmg.dmg += 2; } },
      { cat: 'dmg',  icon: '🔩', name: 'Bipod Mount',      cost: 950,  desc: 'Spread −10 stability',   apply() { WEAPONS.lmg.spread = Math.max(4, WEAPONS.lmg.spread - 10); } },
    ],
    gl: [
      { cat: 'ammo', icon: '⬡', name: 'Bandolier I',      cost: 350,  desc: '+2 grenades',           apply() { weaponAmmoBonus.gl += 2; } },
      { cat: 'ammo', icon: '⬡', name: 'Bandolier II',     cost: 600,  desc: '+2 more grenades',       apply() { weaponAmmoBonus.gl += 2; } },
      { cat: 'rate', icon: '⚡', name: 'Speed Loader',     cost: 500,  desc: 'Reload 30% faster',      apply() { weaponFlags.gl_fastload = true; } },
      { cat: 'dmg',  icon: '◉', name: 'Proximity Fuse',   cost: 600,  desc: '+50px blast radius',     apply() { WEAPONS.gl.splashR += 50; } },
      { cat: 'dmg',  icon: '◈', name: 'HEAT Warhead',     cost: 900,  desc: '+4 damage',              apply() { WEAPONS.gl.dmg += 4; } },
    ],
    sniper: [
      { cat: 'ammo', icon: '⬡', name: 'Extended Mag',     cost: 400,  desc: '+3 rounds / mag',        apply() { weaponAmmoBonus.sniper += 3; } },
      { cat: 'ammo', icon: '⬡', name: 'Match Ammo',       cost: 650,  desc: '+3 more rounds',         apply() { weaponAmmoBonus.sniper += 3; } },
      { cat: 'dmg',  icon: '◈', name: 'Armour Pierce',    cost: 600,  desc: '+4 damage',              apply() { WEAPONS.sniper.dmg += 4; } },
      { cat: 'dmg',  icon: '◈', name: 'Subsonic AP',      cost: 900,  desc: '+4 more damage',         apply() { WEAPONS.sniper.dmg += 4; } },
      { cat: 'dmg',  icon: '🔩', name: 'Anti-Materiel',    cost: 750,  desc: '+5 vs vehicles',         apply() { WEAPONS.sniper.truckDmg += 5; } },
    ],
    clay: [
      { cat: 'ammo', icon: '⬡', name: 'Extra Chambers I',  cost: 280,  desc: '+2 clay balls / load',    apply() { weaponAmmoBonus.clay += 2; } },
      { cat: 'ammo', icon: '⬡', name: 'Extra Chambers II', cost: 480,  desc: '+2 more clay balls',       apply() { weaponAmmoBonus.clay += 2; } },
      { cat: 'dmg',  icon: '💥', name: 'Super Clay',        cost: 550,  desc: '+50px blast radius',       apply() { WEAPONS.clay.splashR += 50; } },
      { cat: 'dmg',  icon: '💥', name: 'Explosive Core',    cost: 800,  desc: '+50px more radius',        apply() { WEAPONS.clay.splashR += 50; } },
      { cat: 'dmg',  icon: '◈', name: 'Hardened Ball',     cost: 650,  desc: '+3 direct damage',         apply() { WEAPONS.clay.dmg += 3; } },
      { cat: 'misc', icon: '🌀', name: 'Sticky Clay',       cost: 900,  desc: 'Enemies slowed on hit',    apply() { weaponFlags.clay_sticky = true; } },
    ],
    // ── Extended Arsenal Upgrades ──────────────────────────────
    stugna: [
      { cat: 'ammo', icon: '⬡', name: 'Missile Rack I',    cost: 600,  desc: '+1 missile',             apply() { weaponAmmoBonus.stugna += 1; } },
      { cat: 'ammo', icon: '⬡', name: 'Missile Rack II',   cost: 900,  desc: '+1 more missile',         apply() { weaponAmmoBonus.stugna += 1; } },
      { cat: 'dmg',  icon: '◈', name: 'Tandem Warhead',    cost: 800,  desc: '+8 damage',               apply() { WEAPONS.stugna.dmg += 8; } },
      { cat: 'dmg',  icon: '💥', name: 'Shaped Charge',     cost: 1000, desc: '+30px blast radius',      apply() { WEAPONS.stugna.splashR += 30; } },
      { cat: 'dmg',  icon: '🔩', name: 'Armour Cracker',    cost: 1200, desc: '+15 vs vehicles',         apply() { WEAPONS.stugna.truckDmg += 15; } },
    ],
    drone_bomb: [
      { cat: 'ammo', icon: '⬡', name: 'Payload Bay I',     cost: 500,  desc: '+2 bombs',               apply() { weaponAmmoBonus.drone_bomb += 2; } },
      { cat: 'ammo', icon: '⬡', name: 'Payload Bay II',    cost: 750,  desc: '+2 more bombs',           apply() { weaponAmmoBonus.drone_bomb += 2; } },
      { cat: 'dmg',  icon: '◈', name: 'Cluster Munition',  cost: 700,  desc: '+2 submunitions',         apply() { WEAPONS.drone_bomb.pellets += 2; } },
      { cat: 'dmg',  icon: '💥', name: 'Thermobaric Fill',  cost: 900,  desc: '+25px blast radius',      apply() { WEAPONS.drone_bomb.splashR += 25; } },
      { cat: 'dmg',  icon: '◎', name: 'Precision GPS',      cost: 800,  desc: 'Spread −20',             apply() { WEAPONS.drone_bomb.spread = Math.max(10, WEAPONS.drone_bomb.spread - 20); } },
    ],
    panzerfaust: [
      { cat: 'ammo', icon: '⬡', name: 'Extra Tubes I',     cost: 550,  desc: '+1 rocket',              apply() { weaponAmmoBonus.panzerfaust += 1; } },
      { cat: 'ammo', icon: '⬡', name: 'Extra Tubes II',    cost: 850,  desc: '+1 more rocket',          apply() { weaponAmmoBonus.panzerfaust += 1; } },
      { cat: 'dmg',  icon: '◈', name: 'HEAT Liner',        cost: 750,  desc: '+6 damage',               apply() { WEAPONS.panzerfaust.dmg += 6; } },
      { cat: 'dmg',  icon: '💥', name: 'Blast Enhancer',    cost: 950,  desc: '+25px blast radius',      apply() { WEAPONS.panzerfaust.splashR += 25; } },
      { cat: 'dmg',  icon: '🔩', name: 'Reactive Defeat',   cost: 1100, desc: '+12 vs vehicles',         apply() { WEAPONS.panzerfaust.truckDmg += 12; } },
    ],
    pkm: [
      { cat: 'ammo', icon: '⬡', name: '300-Rd Box',        cost: 500,  desc: '+60 rounds',             apply() { weaponAmmoBonus.pkm += 60; } },
      { cat: 'ammo', icon: '⬡', name: '500-Rd Box',        cost: 800,  desc: '+60 more rounds',         apply() { weaponAmmoBonus.pkm += 60; } },
      { cat: 'dmg',  icon: '◈', name: 'Heavy Barrel',      cost: 700,  desc: '+2 damage / shot',        apply() { WEAPONS.pkm.dmg += 2; } },
      { cat: 'dmg',  icon: '◎', name: 'Stabilizer Mount',   cost: 600,  desc: 'Spread −5',              apply() { WEAPONS.pkm.spread = Math.max(2, WEAPONS.pkm.spread - 5); } },
      { cat: 'rate', icon: '⚡', name: 'Belt-Feed Tune',    cost: 900,  desc: 'Fire rate +20%',          apply() { pkmFireRateMs = Math.max(35, pkmFireRateMs - 10); } },
      { cat: 'dmg',  icon: '🔩', name: 'API Rounds',        cost: 1000, desc: '+4 vs vehicles',          apply() { WEAPONS.pkm.truckDmg += 4; } },
    ],
    ak12: [
      { cat: 'ammo', icon: '⬡', name: '75-Rd Drum',        cost: 450,  desc: '+25 rounds / mag',       apply() { weaponAmmoBonus.ak12 += 25; } },
      { cat: 'ammo', icon: '⬡', name: '95-Rd Drum',        cost: 700,  desc: '+25 more rounds',         apply() { weaponAmmoBonus.ak12 += 25; } },
      { cat: 'dmg',  icon: '◎', name: 'Muzzle Brake',       cost: 550,  desc: 'Spread −4',              apply() { WEAPONS.ak12.spread = Math.max(1, WEAPONS.ak12.spread - 4); } },
      { cat: 'dmg',  icon: '◈', name: 'Match Barrel',      cost: 800,  desc: '+2 damage / shot',        apply() { WEAPONS.ak12.dmg += 2; } },
      { cat: 'dmg',  icon: '🔩', name: 'Tungsten Core',     cost: 650,  desc: '+3 vs vehicles',          apply() { WEAPONS.ak12.truckDmg += 3; } },
      { cat: 'rate', icon: '⚡', name: 'Burst Mechanism',   cost: 900,  desc: 'Fire rate +25%',          apply() { ak12FireRateMs = Math.max(48, ak12FireRateMs - 17); } },
    ],
    matador: [
      { cat: 'ammo', icon: '⬡', name: 'Extra Tubes I',     cost: 600,  desc: '+1 round',               apply() { weaponAmmoBonus.matador += 1; } },
      { cat: 'ammo', icon: '⬡', name: 'Extra Tubes II',    cost: 900,  desc: '+1 more round',           apply() { weaponAmmoBonus.matador += 1; } },
      { cat: 'dmg',  icon: '◈', name: 'Tandem Charge',     cost: 800,  desc: '+6 damage',               apply() { WEAPONS.matador.dmg += 6; } },
      { cat: 'dmg',  icon: '💥', name: 'Blast Amplifier',   cost: 950,  desc: '+25px blast radius',      apply() { WEAPONS.matador.splashR += 25; } },
      { cat: 'dmg',  icon: '🔩', name: 'Bunker Buster',     cost: 1100, desc: '+10 vs vehicles',         apply() { WEAPONS.matador.truckDmg += 10; } },
    ],
    nlaw: [
      { cat: 'ammo', icon: '⬡', name: 'Extra Launcher I',  cost: 650,  desc: '+1 missile',             apply() { weaponAmmoBonus.nlaw += 1; } },
      { cat: 'ammo', icon: '⬡', name: 'Extra Launcher II', cost: 950,  desc: '+1 more missile',         apply() { weaponAmmoBonus.nlaw += 1; } },
      { cat: 'dmg',  icon: '◈', name: 'Overfly Top-Attack', cost: 850, desc: '+5 damage',               apply() { WEAPONS.nlaw.dmg += 5; } },
      { cat: 'dmg',  icon: '💥', name: 'Expanded Warhead',  cost: 1000, desc: '+40px blast radius',      apply() { WEAPONS.nlaw.splashR += 40; } },
      { cat: 'dmg',  icon: '🔩', name: 'Armour Defeat',     cost: 1200, desc: '+8 vs vehicles',          apply() { WEAPONS.nlaw.truckDmg += 8; } },
    ],
    laser: [
      { cat: 'ammo', icon: '⬡', name: 'Power Cell I',      cost: 500,  desc: '+8 charges',             apply() { weaponAmmoBonus.laser += 8; } },
      { cat: 'ammo', icon: '⬡', name: 'Power Cell II',     cost: 750,  desc: '+8 more charges',         apply() { weaponAmmoBonus.laser += 8; } },
      { cat: 'dmg',  icon: '◈', name: 'Focused Lens',      cost: 700,  desc: '+3 dmg, spread −1',       apply() { WEAPONS.laser.dmg += 3; WEAPONS.laser.spread = Math.max(0, WEAPONS.laser.spread - 1); } },
      { cat: 'dmg',  icon: '◈', name: 'Overcharge Cap',    cost: 900,  desc: '+4 more damage',          apply() { WEAPONS.laser.dmg += 4; } },
      { cat: 'dmg',  icon: '🔩', name: 'Heat Sink',         cost: 800,  desc: '+3 vs vehicles',          apply() { WEAPONS.laser.truckDmg += 3; } },
    ],
  };

  // Signal that all const definitions (esp. WEAPON_UPGRADES) are now safe to use
  _initComplete = true;

  // Last known cursor position for auto-weapon hitscan
  let lastCursorX = 500, lastCursorY = 300;

  // ── Weapon-switcher — always visible, pinned to footer (no collapse)
  let _wsCollapseTimer = null;
  let _wsHovered = false;
  function _wsResetCollapse() {
    // Collapse disabled — weapon bar always visible
    clearTimeout(_wsCollapseTimer);
    $('#weapon-switcher').removeClass('ws-collapsed');
  }
  function _wsExpandOnHover() {
    _wsHovered = true;
  }
  function _wsCollapseOnLeave() {
    _wsHovered = false;
  }

  // Guard against calcWave() firing during wave-start transition
  let waveTransitioning = false;
  // Guard against multiple parallel trackZombies RAF loops
  let zombieTrackRunning = false;

  let _cloudTimer = null;
  let currentWeapon = REVOLVER_WEAPON;
  let shotgunDropSpawned = false, shotgunUnlocked = false;
  let m16DropSpawned = false,     m16Unlocked = false;
  let lmgDropSpawned = false,     lmgUnlocked = false;
  let glDropSpawned  = false,     glUnlocked  = false;
  let sniperDropSpawned = false,  sniperUnlocked = false;
  let clayDropSpawned   = false,  clayUnlocked   = false;

  // NFT-exclusive weapon unlock flags
  let ftdroneUnlocked = false, tankUnlocked = false, bradleyUnlocked = false;

  // Returns true if player owns at least one ARC NFT in localStorage
  function hasNFT() {
    try { return JSON.parse(localStorage.getItem('arc_nfts') || '[]').length > 0; }
    catch(e) { return false; }
  }

  // ── Scope overlay state (lerped position) ────────────────────
  let _scopeX = 512, _scopeY = 275, _scopeRafId = null;
  function _startScope() {
    if (_scopeRafId) return;
    const $so = $('#scope-overlay'), $sc = $('#scope-crosshair');
    function step() {
      _scopeX += (lastCursorX - _scopeX) * 0.10;
      _scopeY += (lastCursorY - _scopeY) * 0.10;
      $so.css({'--sx': _scopeX.toFixed(1) + 'px', '--sy': _scopeY.toFixed(1) + 'px'});
      $sc.css({ left: (_scopeX - 100) + 'px', top: (_scopeY - 100) + 'px' });
      _scopeRafId = requestAnimationFrame(step);
    }
    step();
  }
  function _stopScope() {
    if (_scopeRafId) { cancelAnimationFrame(_scopeRafId); _scopeRafId = null; }
    $('#scope-overlay, #scope-crosshair').css({'--sx': '50%', '--sy': '50%'});
    $('#scope-crosshair').css({ left: '', top: '' });
  }
  function _updateScopeVis() {
    if (currentWeapon === SNIPER_WEAPON) {
      $canves.addClass('sniper-scope'); _startScope();
    } else {
      $canves.removeClass('sniper-scope'); _stopScope();
    }
  }

  // M-16 fire mode
  let m16Auto = true;                // true=automatic, false=semi
  let m16FireInterval = null;        // rapid fire interval handle
  let m16FireRateMs = 80;            // ~750 rpm (upgradeable)
  let m16Shooting = false;

  // ── Helpers ───────────────────────────────────────────────────
  const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const getAmmoMax = () => {
    if (currentWeapon === SHOTGUN_WEAPON)      return SHOTGUN_AMMO_MAX      + weaponAmmoBonus.shotgun;
    if (currentWeapon === M16_WEAPON)          return M16_AMMO_MAX          + weaponAmmoBonus.m16;
    if (currentWeapon === LMG_WEAPON)          return LMG_AMMO_MAX          + weaponAmmoBonus.lmg;
    if (currentWeapon === GL_WEAPON)           return GL_AMMO_MAX           + weaponAmmoBonus.gl;
    if (currentWeapon === SNIPER_WEAPON)       return SNIPER_AMMO_MAX       + weaponAmmoBonus.sniper;
    if (currentWeapon === FTDRONE_WEAPON)      return FTDRONE_AMMO_MAX;
    if (currentWeapon === TANK_WEAPON)         return TANK_AMMO_MAX;
    if (currentWeapon === BRADLEY_WEAPON)      return BRADLEY_AMMO_MAX;
    if (currentWeapon === CLAY_WEAPON)         return CLAY_AMMO_MAX         + weaponAmmoBonus.clay;
    if (currentWeapon === STUGNA_WEAPON)       return STUGNA_AMMO_MAX       + weaponAmmoBonus.stugna;
    if (currentWeapon === DRONE_BOMB_WEAPON)   return DRONE_BOMB_AMMO_MAX   + weaponAmmoBonus.drone_bomb;
    if (currentWeapon === PANZERFAUST_WEAPON)  return PANZERFAUST_AMMO_MAX  + weaponAmmoBonus.panzerfaust;
    if (currentWeapon === PKM_WEAPON)          return PKM_AMMO_MAX          + weaponAmmoBonus.pkm;
    if (currentWeapon === AK12_WEAPON)         return AK12_AMMO_MAX         + weaponAmmoBonus.ak12;
    if (currentWeapon === MATADOR_WEAPON)      return MATADOR_AMMO_MAX      + weaponAmmoBonus.matador;
    if (currentWeapon === NLAW_WEAPON)         return NLAW_AMMO_MAX         + weaponAmmoBonus.nlaw;
    if (currentWeapon === LASER_WEAPON)        return LASER_AMMO_MAX        + weaponAmmoBonus.laser;
    return REVOLVER_AMMO_MAX + weaponAmmoBonus.revolver;
  };

  var _$sv, _$cv, _$icv, _$av, _$wv, _$kv;
  function _cacheHudEls() {
    _$sv = $('#score-val'); _$cv = $('#credits-val'); _$icv = $('#inv-credits-val');
    _$av = $('#arcoin-val'); _$wv = $('#hud-wave-val'); _$kv = $('#hud-kills-val');
  }
  var _prevCredits = 0, _prevKills = 0, _prevArc = 0, _prevWave = 0;
  function updateScoreHUD() {
    if (!_$sv) _cacheHudEls();
    var prevScore = parseInt((_$sv.length ? _$sv.text() : '0').replace(/,/g,''),10) || 0;
    if (_$sv.length) _$sv.text(score.toLocaleString());
    if (_$cv.length) _$cv.text(credits.toLocaleString());
    if (_$icv.length) _$icv.text(credits.toLocaleString());
    _$av.text(arcoins);
    _$wv.text(String(wave || 1).padStart(2, '0'));
    _$kv.text(zombieKilled || 0);
    // Score pop animation on change
    if (score > prevScore && _$sv.length) {
      _$sv.removeClass('juice-score-pop'); void _$sv[0].offsetWidth;
      _$sv.addClass('juice-score-pop');
      if (score - prevScore >= 500) _$sv.addClass('juice-score-big');
      setTimeout(() => _$sv.removeClass('juice-score-pop juice-score-big'), 400);
    }
    // Credits pop
    if (credits > _prevCredits && _$cv.length) {
      _$cv.removeClass('juice-credits-pop'); void _$cv[0].offsetWidth; _$cv.addClass('juice-credits-pop');
      if (_$icv.length) { _$icv.removeClass('juice-credits-pop'); void _$icv[0].offsetWidth; _$icv.addClass('juice-credits-pop'); }
      setTimeout(() => { _$cv.removeClass('juice-credits-pop'); _$icv.removeClass('juice-credits-pop'); }, 350);
    }
    _prevCredits = credits;
    // Kills pop
    if ((zombieKilled || 0) > _prevKills && _$kv.length) {
      _$kv.removeClass('juice-kills-pop'); void _$kv[0].offsetWidth; _$kv.addClass('juice-kills-pop');
      setTimeout(() => _$kv.removeClass('juice-kills-pop'), 300);
    }
    _prevKills = zombieKilled || 0;
    // ARC pop
    if (arcoins > _prevArc && _$av.length) {
      _$av.removeClass('juice-arc-pop'); void _$av[0].offsetWidth; _$av.addClass('juice-arc-pop');
      setTimeout(() => _$av.removeClass('juice-arc-pop'), 400);
    }
    _prevArc = arcoins;
    // Wave pop
    if ((wave || 1) > _prevWave && _$wv.length) {
      _$wv.removeClass('juice-wave-pop'); void _$wv[0].offsetWidth; _$wv.addClass('juice-wave-pop');
      setTimeout(() => _$wv.removeClass('juice-wave-pop'), 500);
    }
    _prevWave = wave || 1;
    var suEl = document.getElementById('shots-ukraine-val');
    if (suEl) suEl.textContent = shotsForUkraine.toLocaleString();
    _updateWaveProgress();
    // Keep lobby balance in sync
    var lbEl = document.getElementById('lb-arc-amount');
    if (lbEl) lbEl.textContent = arcoins;
    // Low-ARC nudge — show once per session when ARC drops below 10
    if (arcoins < 10 && gameActive && !window._arcNudgeShown) {
      window._arcNudgeShown = true;
      var $nudge = $('<div class="low-arc-nudge" id="low-arc-nudge">💎 Low on ARC — <b>tap to top up</b> <span class="nudge-close">✕</span></div>');
      $canves.append($nudge);
      $nudge.on('click', function(e) {
        if ($(e.target).hasClass('nudge-close')) { $nudge.remove(); return; }
        gamePaused = true; buildInventory(); $('[data-target="inv-sec-arc"]').trigger('click');
        $nudge.remove();
      });
      setTimeout(function(){ $nudge.remove(); }, 15000);
    }
  }
  // ── Score HUD auto-fade: show on change, fade after 3s ──
  var _hudFadeTimer = null;
  function _nudgeScoreHud() {
    var $sh = $('#score-hud');
    $sh.removeClass('hud-faded');
    clearTimeout(_hudFadeTimer);
    _hudFadeTimer = setTimeout(function () {
      if (gameActive && !gamePaused) $sh.addClass('hud-faded');
    }, 3000);
  }
  // Hook into updateScoreHUD — call _nudgeScoreHud after every update
  var _origUpdateScoreHUD = updateScoreHUD;
  updateScoreHUD = function () {
    _origUpdateScoreHUD();
    _nudgeScoreHud();
  };

  // ── Wave progress bar ──────────────────────────────────────────
  function _updateWaveProgress() {
    var $fill = $('#wave-progress-fill'), $txt = $('#wave-progress-txt');
    if (!$fill.length) return;
    var waveStart, waveTarget;
    if (wave >= 5) {
      // Endless: target is _endlessKillTarget, start is previous target
      waveTarget = _endlessKillTarget;
      waveStart  = waveTarget - (getEndlessWaveParams(wave).qty || 60);
    } else if (wave === 4) {
      waveStart  = WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY + WAVE_3_ZOMBIE_QTY;
      waveTarget = ALL_ZOMBIES;
    } else if (wave === 3) {
      waveStart  = WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY;
      waveTarget = waveStart + WAVE_3_ZOMBIE_QTY;
    } else if (wave === 2) {
      waveStart  = WAVE_1_ZOMBIE_QTY;
      waveTarget = waveStart + WAVE_2_ZOMBIE_QTY;
    } else {
      waveStart  = 0;
      waveTarget = WAVE_1_ZOMBIE_QTY;
    }
    var done  = Math.max(0, (zombieKilled || 0) - waveStart);
    var total = Math.max(1, waveTarget - waveStart);
    var pct   = Math.min(100, Math.round(done / total * 100));
    $fill.css('width', pct + '%');
    $txt.text(done + ' / ' + total);
  }

  // ── Live Game Timer ──────────────────────────────────────────
  function _startGameTimer() {
    _stopGameTimer();
    var $gt = $('#game-timer');
    $gt.show();
    _gameTimerInt = setInterval(function() {
      if (!gameActive || gamePaused || !_gameStartMs) return;
      var el = Date.now() - _gameStartMs;
      var m = Math.floor(el / 60000);
      var s = Math.floor((el % 60000) / 1000);
      $gt.text('⏱ ' + m + ':' + (s < 10 ? '0' : '') + s);
    }, 1000);
  }
  function _stopGameTimer() {
    if (_gameTimerInt) { clearInterval(_gameTimerInt); _gameTimerInt = null; }
    $('#game-timer').hide();
  }

  // ── Anti-Ruscist Coin (ARC) ────────────────────────────────────
  function _updateComboHUD() {
    const $c = $('#combo-hud');
    if (!$c.length) return;
    if (_comboMultiLive > 1.05) {
      $c.text('🔥 x' + _comboMultiLive.toFixed(1) + ' COMBO').addClass('combo-hud--active');
    } else {
      $c.text('').removeClass('combo-hud--active');
    }
  }

  let _xpBoostEnd = 0;  // UTC ms — 2× ARC earn while active

  const ARC_EARN_CAPS = {
    perAward:    25,    // max ARC per single earn event (raised for missions/achievements)
    dailySoft:   50,    // full-rate zone; taper kicks in above this
    dailyHard:   80,    // absolute daily hard cap (tapered zone: 50→80)
    taperRate:   0.30,  // fraction credited in taper zone (steeper anti-whale taper)
    sessionHard: 200,   // in-memory session ceiling — resets on page reload
  };

  function _arcDailyBudgetKey() {
    return 'arc_daily_runtime_budget_' + _todayKey();
  }

  function _applyArcEarnCaps(amount) {
    // Session hard cap — prevents tab-reload farming
    const _budgetKey = _arcDailyBudgetKey();
    const _usedBase  = parseInt(localStorage.getItem(_budgetKey) || '0', 10);
    if (_sessionArcEarned >= ARC_EARN_CAPS.sessionHard) {
      return { credited: 0, budgetKey: _budgetKey, budgetUsed: _usedBase, hardCapped: true };
    }
    // Velocity throttle — rapid earn events (>8 in 30 s) earn at 25% rate
    const _velNow = Date.now();
    _arcEarnTimestamps = _arcEarnTimestamps.filter(t => _velNow - t < _ARC_VELOCITY_WINDOW_MS);
    const _velPenalty = _arcEarnTimestamps.length >= _ARC_VELOCITY_THROTTLE_N ? 0.25 : 1.0;
    _arcEarnTimestamps.push(_velNow);
    const normalized = Math.max(0, Math.round(amount * _velPenalty));
    const cappedPerAward = Math.min(ARC_EARN_CAPS.perAward, normalized);
    let credited = 0;
    let budgetUsed = _usedBase;
    let remaining = cappedPerAward;

    if (budgetUsed < ARC_EARN_CAPS.dailySoft) {
      const fullRoom = ARC_EARN_CAPS.dailySoft - budgetUsed;
      const fullCredit = Math.min(remaining, fullRoom);
      credited += fullCredit;
      budgetUsed += fullCredit;
      remaining -= fullCredit;
    }

    if (remaining > 0 && budgetUsed < ARC_EARN_CAPS.dailyHard) {
      const taperRoom = ARC_EARN_CAPS.dailyHard - budgetUsed;
      const taperSpend = Math.min(remaining, taperRoom);
      credited += Math.max(1, Math.round(taperSpend * ARC_EARN_CAPS.taperRate));
      budgetUsed += taperSpend;
    }

    return {
      credited,
      budgetKey: _budgetKey,
      budgetUsed,
      hardCapped: _usedBase >= ARC_EARN_CAPS.dailyHard || (credited <= 0 && cappedPerAward > 0),
    };
  }

  function earnArcoin(amount, reason, opts) {
    opts = opts || {};
    // rawAmount: skip all multipliers (for financial returns: staking, PvP prizes)
    if (!opts.rawAmount && hasSkill('battle_veteran')) amount = Math.ceil(amount * 1.2);
    // Apply combined multiplier: streak × Kill NFT tier (never below base amount)
    const _killMulti  = (typeof getKillNftMulti === 'function') ? getKillNftMulti() : 1.0;
    const _prestMulti = (typeof getPrestigeMulti === 'function') ? getPrestigeMulti() : 1.0;
    const _liveCombo  = (typeof _comboMultiLive !== 'undefined') ? _comboMultiLive : 1.0;
    const _comboMulti = Math.min(gcfg('prestige','multiplier_cap',4.0), arcStreakMulti * _killMulti * _prestMulti * _liveCombo);
    const _boostMulti = (Date.now() < _xpBoostEnd) ? 2.0 : 1.0;
    const _earnAmt = opts.rawAmount ? amount : Math.max(amount, Math.round(amount * _comboMulti * _boostMulti));
    const _uncappedBase = Math.max(0, Math.round(opts.uncappedBase || 0));
    const _inflationaryAmt = Math.max(0, _earnAmt - _uncappedBase);
    const _capState = opts.bypassCaps
      ? { credited: _inflationaryAmt, budgetKey: '', budgetUsed: 0, hardCapped: false }
      : _applyArcEarnCaps(_inflationaryAmt);
    const _trackedEarnAmt = typeof opts.trackEarnAmount === 'number'
      ? Math.max(0, Math.round(opts.trackEarnAmount))
      : _capState.credited;
    const _creditAmt = _uncappedBase + _capState.credited;
    if (_creditAmt <= 0) {
      if (_capState.hardCapped) shooterSpeech('🪙 Daily ARC cap reached');
      return 0;
    }
    arcoins += _creditAmt;
    const h = Array.from({length: 12}, () => (Math.random() * 16 | 0).toString(16)).join('');
    arcoinLedger.push({ ts: Date.now(), amount: _creditAmt, balance: arcoins, reason, hash: '0x' + h, wave });
    try {
      localStorage.setItem('arc_balance', String(arcoins));
      localStorage.setItem('arc_ledger', JSON.stringify(arcoinLedger.slice(-100)));
      // total earned lifetime counter (used by achievements)
      const _txe = 'arc_total_earned';
      localStorage.setItem(_txe, +(localStorage.getItem(_txe)||0) + _trackedEarnAmt);
      if (_capState.budgetKey) localStorage.setItem(_capState.budgetKey, String(_capState.budgetUsed));
    } catch(e) {}
    updateCoinHUD(true, _creditAmt);
    // Daily mission: arc earned in session
    const _sesArcKey = 'arc_ses_arc_' + _todayKey();
    const _sesArc = parseInt(localStorage.getItem(_sesArcKey)||'0',10) + _trackedEarnAmt;
    localStorage.setItem(_sesArcKey, String(_sesArc));
    _sessionArcEarned += _trackedEarnAmt;
    updateMissionProgress('arc', _sesArc);
    // Flash badge on armory shortcut
    $('#inv-shortcut-label').addClass('inv-has-new');
    return _creditAmt;
  }

  function updateCoinHUD(animate, earnAmt) {
    const $el = $('#arcoin-val');
    if (!$el.length) return;
    $el.text(arcoins);
    if (animate) {
      $el.addClass('arcoin-flash');
      setTimeout(() => $el.removeClass('arcoin-flash'), 1400);
      // Non-intrusive corner toast — doesn't interrupt gameplay
      const displayAmt = earnAmt || 1;
      const $pop = $('<div class="arcoin-popup">' +
        '<span class="arcoin-popup-coin">\uD83E\uDE99</span>' +
        '<span class="arcoin-popup-main">+' + displayAmt + ' ARC</span>' +
        '</div>');
      $canves.append($pop);
      requestAnimationFrame(() => $pop.addClass('arcoin-popup--in'));
      setTimeout(() => { $pop.addClass('arcoin-popup--out'); setTimeout(() => $pop.remove(), 600); }, 1800);
    }
  }

  // ── Anti-Ruscist Coin (ARC) Visual Generator ──────────────────
  function generateARCTokenCanvas(tokenId, waveNum) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const cx = 32, cy = 32, r = 28;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      i === 0 ? ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
              : ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
    }
    ctx.closePath();
    const hue = (tokenId * 37 + (waveNum||1) * 13) % 60 + 30;
    const grad = ctx.createRadialGradient(cx-8, cy-8, 4, cx, cy, r);
    grad.addColorStop(0, 'hsl('+hue+',100%,80%)');
    grad.addColorStop(0.6, 'hsl('+hue+',90%,55%)');
    grad.addColorStop(1, 'hsl('+(hue-15)+',80%,30%)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'hsl('+(hue+10)+',100%,70%)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const ri = r * 0.75;
      i === 0 ? ctx.moveTo(cx + ri*Math.cos(a), cy + ri*Math.sin(a))
              : ctx.lineTo(cx + ri*Math.cos(a), cy + ri*Math.sin(a));
    }
    ctx.closePath();
    ctx.strokeStyle = 'hsla('+(hue+20)+',100%,85%,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'hsl('+(hue+15)+',100%,90%)';
    ctx.font = 'bold 11px Oswald,Impact,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'hsl('+hue+',100%,30%)';
    ctx.shadowBlur = 3;
    ctx.fillText('ARC', cx, cy - 4);
    ctx.font = '7px Oswald,sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'hsla('+(hue+10)+',80%,85%,0.8)';
    ctx.fillText('W'+(waveNum||1), cx, cy + 6);
    return c.toDataURL('image/png');
  }

  // ── NFT Canvas Generator ──────────────────────────────────────
  const _NFT_GLYPHS = ['🪖','🔫','🎯','💣','🛡️','🚁','⚔️','🔥','💥','🛸','🤖','👁️','💀','🐺','🦁'];
  const _NFT_RAR_COLOR = { common:'#b0b0b0', rare:'#44aaff', epic:'#cc44ff', legendary:'#FFD700' };
  const _NFT_RAR_GLOW  = { common:4, rare:10, epic:16, legendary:24 };
  const _NFT_RAR_BG    = { common:'hsl(220,20%,12%)', rare:'hsl(210,55%,10%)', epic:'hsl(280,55%,10%)', legendary:'hsl(40,70%,8%)' };

  function generateNFTCanvas(seed, rarity) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const hue  = (seed * 53) % 360;
    const rc   = _NFT_RAR_COLOR[rarity] || '#aaa';
    const glow = _NFT_RAR_GLOW[rarity]  || 4;
    // Background
    const bg = ctx.createRadialGradient(64, 44, 6, 64, 64, 74);
    bg.addColorStop(0, 'hsl('+hue+',45%,18%)');
    bg.addColorStop(1, 'hsl('+((hue+30)%360)+',70%,6%)');
    ctx.fillStyle = bg; ctx.fillRect(0,0,128,128);
    // Geometric corner accents
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    [[0,0],[128,0],[0,128],[128,128]].forEach(([x,y])=>{
      const sx = x===0?1:-1, sy = y===0?1:-1;
      ctx.beginPath(); ctx.moveTo(x+sx*2,y+sy*12); ctx.lineTo(x+sx*2,y+sy*2); ctx.lineTo(x+sx*12,y+sy*2); ctx.stroke();
    });
    // Rarity border
    ctx.shadowColor = rc; ctx.shadowBlur = glow;
    ctx.strokeStyle = rc; ctx.lineWidth = rarity==='legendary'?3:2;
    ctx.strokeRect(5,5,118,118);
    ctx.shadowBlur = 0;
    // Inner panel
    const panel = ctx.createLinearGradient(10,10,10,106);
    panel.addColorStop(0,'rgba(255,255,255,0.04)'); panel.addColorStop(1,'rgba(0,0,0,0.2)');
    ctx.fillStyle = panel; ctx.fillRect(10,10,108,96);
    // Glyph
    ctx.font = '54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = rc; ctx.shadowBlur = 12;
    ctx.fillText(_NFT_GLYPHS[seed % _NFT_GLYPHS.length], 64, 52);
    ctx.shadowBlur = 0;
    // Rarity label
    ctx.fillStyle = rc;
    ctx.shadowColor = rc; ctx.shadowBlur = 8;
    ctx.font = 'bold 9px Oswald,Impact,sans-serif';
    ctx.fillText(rarity.toUpperCase(), 64, 99);
    // Stars
    const stars = {common:1,rare:2,epic:3,legendary:4}[rarity]||1;
    ctx.font = '9px serif'; ctx.shadowBlur = 6;
    for(let s=0;s<stars;s++) ctx.fillText('★', 64+(s-(stars-1)/2)*12, 113);
    ctx.shadowBlur = 0;
    // Legendary shimmer diagonal line
    if (rarity==='legendary') {
      const shine = ctx.createLinearGradient(10,10,118,118);
      shine.addColorStop(0,'rgba(255,215,0,0)'); shine.addColorStop(0.45,'rgba(255,215,0,0)');
      shine.addColorStop(0.5,'rgba(255,215,0,0.18)'); shine.addColorStop(0.55,'rgba(255,215,0,0)');
      shine.addColorStop(1,'rgba(255,215,0,0)');
      ctx.fillStyle = shine; ctx.fillRect(5,5,118,118);
    }
    return c.toDataURL('image/png');
  }

  // ── NFT Minting ───────────────────────────────────────────────
  // 🇺🇦 Ukrainian Defender series — commemorating the courage of those who resist
  const NFT_NAMES = [
    // Common — rank and file defenders
    'Volunteer of Kharkiv','Sentinel of Kherson','Sapper of Donbas','Rifleman of Zaporizhzhia','Medic of Mariupol',
    'Scout of Bakhmut','Defender of Avdiivka','Signaller of Mykolaiv','Driver of the East','Combat Nurse Oksana',
    // Rare — named heroes (fictional/inspirational)
    'Tymur the Sharpshooter','Oksana Ironwill','Dmytro the Unmoved','Halyna of the Steppes','Vasyl Firewatch',
    // Epic — legendary unit commanders
    'Captain Andriy Stallcroft','Major Olena Blackstorm','Commander Bohdan Ironfront','Colonel Larysa Freefall',
    // Legendary
    'The Ghost of Kyiv',
    'Angel of Bucha',
  ];

  function mintNFT() {
    const COST = 5;
    if (arcoins < COST) {
      showArcUpsell(COST, function(){ mintNFT(); });
      return;
    }
    const roll    = Math.random();
    const rarity  = roll < 0.02 ? 'legendary' : roll < 0.12 ? 'epic' : roll < 0.40 ? 'rare' : 'common';
    const seed    = Math.floor(Math.random() * 99999);
    const name    = NFT_NAMES[Math.floor(Math.random() * NFT_NAMES.length)];
    const img     = generateNFTCanvas(seed, rarity);

    // ── Unlock next locked weapon in progression order ──────────
    function _unlockNextWeapon() {
      if (!shotgunUnlocked) { shotgunUnlocked = true; return 'Shotgun'; }
      if (!m16Unlocked)     { m16Unlocked     = true; return 'M-16';    }
      if (!lmgUnlocked)     { lmgUnlocked     = true; return 'LMG';     }
      if (!glUnlocked)      { glUnlocked      = true; return 'Grenade Launcher'; }
      if (!sniperUnlocked)  { sniperUnlocked  = true; return 'Sniper Rifle'; }
      return null;
    }

    // ── Rarity-based in-game prize ───────────────────────────────
    let reward = null;
    if (rarity === 'common') {
      const money = 100 + Math.floor(Math.random() * 201);          // 100–300 \ud83d\udcb0
      credits += money; updateScoreHUD();
      reward = { type: 'money', value: money };
    } else if (rarity === 'rare') {
      if (Math.random() < 0.5) {
        const money = 300 + Math.floor(Math.random() * 501);        // 300–800 \ud83d\udcb0
        credits += money; updateScoreHUD();
        reward = { type: 'money', value: money };
      } else {
        const w = currentWeapon || REVOLVER_WEAPON;
        ammoReserve[w] = (ammoReserve[w] || 0) + 25;
        reward = { type: 'ammo', value: 25, weapon: w };
      }
    } else if (rarity === 'epic') {
      const unlockedW = _unlockNextWeapon();
      if (unlockedW) {
        const bonus = 500 + Math.floor(Math.random() * 501);        // 500–1000 bonus \ud83d\udcb0
        credits += bonus; updateScoreHUD();
        reward = { type: 'weapon', weapon: unlockedW, bonus };
      } else {
        const money = 800 + Math.floor(Math.random() * 1201);       // 800–2000 \ud83d\udcb0
        credits += money; updateScoreHUD();
        reward = { type: 'money', value: money };
      }
    } else {                                                          // legendary
      const money = 3000 + Math.floor(Math.random() * 3001);        // 3000–6000 \ud83d\udcb0
      credits += money; updateScoreHUD();
      const unlockedW = _unlockNextWeapon();
      reward = unlockedW
        ? { type: 'both', value: money, weapon: unlockedW }
        : { type: 'money', value: money };
    }

    var minted; try { minted = JSON.parse(localStorage.getItem('arc_nfts') || '[]'); } catch(e) { minted = []; }
    minted.push({ id: Date.now(), name, rarity, img, seed, mintedAt: Date.now(), wave: wave||1, reward });
    var _phd=window._pendingHeroData;
    if(_phd&&_phd.name){var _last=minted[minted.length-1];_last.heroName=_phd.name;_last.heroUnit=_phd.unit||'';_last.heroBio=_phd.bio||'';if(_phd.portrait){_last.img='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(_phd.portrait);}if(_phd.unit){_last.name=_phd.name.slice(0,40)+' · '+_phd.unit.slice(0,25);}else{_last.name=_phd.name;}window._pendingHeroData=null;}
    localStorage.setItem('arc_nfts', JSON.stringify(minted.slice(-50)));
    arcoins -= COST;
    localStorage.setItem('arc_balance', String(arcoins));
    const h = Array.from({length:12},()=>(Math.random()*16|0).toString(16)).join('');
    arcoinLedger.push({ ts: Date.now(), amount: -COST, balance: arcoins, reason: 'NFT Mint: '+name+' \ud83c\uddfa\ud83c\udde6 10% pledged to Ukraine (0x165C\u20265e14)', hash:'0x'+h, wave:wave||1 });
    try { localStorage.setItem('arc_ledger', JSON.stringify(arcoinLedger.slice(-100))); } catch(e) {}
    updateCoinHUD(false);
    updateScoreHUD();

    // ── Speech bubble with prize summary ────────────────────────
    let _prize = '';
    if (reward) {
      if (reward.type === 'money')  _prize = ' +' + reward.value + '\ud83d\udcb0';
      else if (reward.type === 'ammo')   _prize = ' +25 ammo';
      else if (reward.type === 'weapon') _prize = ' \ud83d\udd13 ' + reward.weapon + ' +' + reward.bonus + '\ud83d\udcb0';
      else if (reward.type === 'both')   _prize = ' +' + reward.value + '\ud83d\udcb0 \ud83d\udd13 ' + reward.weapon;
    }
    shooterSpeech('\uD83C\uDF89 ' + rarity.toUpperCase() + '! ' + name + ' \ud83c\uddfa\ud83c\udde6' + _prize);
    _invLastSection = 'inv-sec-nfts';
    buildInventory();
  }

  // ── Daily Spin Wheel ─────────────────────────────────────────
  function doSpinWheel(paid) {
    const today = new Date().toISOString().slice(0, 10);
    if (!paid && !godMode && localStorage.getItem('arc_spin_date') === today) return;
    if (paid) {
      var _spinCost = gcfg('economy','extra_spin_cost',5);
      var _maxPaid  = gcfg('economy','max_paid_spins',3);
      var _paidToday = parseInt(localStorage.getItem('arc_paid_spins_' + today) || '0', 10);
      if (_paidToday >= _maxPaid) { shooterSpeech('Max extra spins used today!'); return; }
      if (arcoins < _spinCost) { sndError(); showArcUpsell(_spinCost, function(){ doSpinWheel(true); }); return; }
      arcoins -= _spinCost;
      localStorage.setItem('arc_balance', String(arcoins));
      localStorage.setItem('arc_paid_spins_' + today, String(_paidToday + 1));
    }
    const idx    = Math.floor(Math.random() * SPIN_PRIZES.length);
    const prize  = SPIN_PRIZES[idx];
    const $wheel = $('#spin-wheel');
    const segDeg = 360 / SPIN_PRIZES.length;
    const targetDeg = 5 * 360 + (360 - idx * segDeg - segDeg / 2);
    $wheel.css({ transition: 'none', transform: 'rotate(0deg)' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $wheel.css({ transition: 'transform 4s cubic-bezier(.17,.67,.12,.99)', transform: 'rotate(' + targetDeg + 'deg)' });
    }));
    $('#earn-spin-btn, #earn-paid-spin-btn').prop('disabled', true);
    $('#earn-spin-btn').text('Spinning…');
    setTimeout(() => {
      if (!paid) localStorage.setItem('arc_spin_date', today);
      if (prize.arc)   earnArcoin(prize.arc, paid ? 'Extra Spin' : 'Daily Spin');
      if (prize.money) { credits += prize.money; updateScoreHUD(); }
      const $res = $('#spin-result');
      $res.text('🎉 ' + prize.label + '!').addClass('spin-result--win');
      setTimeout(() => $res.removeClass('spin-result--win'), 2500);
      _invLastSection = 'inv-sec-earn';
      buildInventory();
    }, 4200);
  }

  // ── Daily Deals (FOMO) ────────────────────────────────────────
  function getDailyDeals() {
    var today = new Date().toISOString().slice(0,10);
    var _unowned = _COSMETICS.filter(function(c){ return !getOwnedCosmetics().includes(c.id); });
    if (_unowned.length < 2) return [];
    // Seed deterministic shuffle from date for consistency across rebuilds
    var _seed = 0; for(var i=0;i<today.length;i++) _seed += today.charCodeAt(i);
    var deals = [];
    var pick1 = _seed % _unowned.length;
    var pick2 = (_seed * 7 + 13) % _unowned.length;
    if (pick2 === pick1) pick2 = (pick1 + 1) % _unowned.length;
    var _disc = gcfg('economy','daily_deal_discount',30);
    [pick1, pick2].forEach(function(pi) {
      var c = _unowned[pi];
      deals.push({ id: c.id, label: c.name, price: c.arc, salePrice: Math.max(1, Math.round(c.arc * (1 - _disc/100))), type: c.cat });
    });
    return deals;
  }

  // ── Play 21 (Soviet Blackjack) ────────────────────────────────────
  // Simplified: standard deck, goal=21, dealer stands on 17, bust>21.
  // 10% of house wins donated to UA Army.
  var _p21 = { deck:[], player:[], dealer:[], bet:0, phase:'idle', stats:{ played:0, won:0, lost:0, uaDonated:0 } };
  (function(){ var s=localStorage.getItem('p21_stats'); if(s) try{_p21.stats=JSON.parse(s);}catch(e){} })();
  function _p21SaveStats(){ localStorage.setItem('p21_stats',JSON.stringify(_p21.stats)); }
  function _p21Deck(){
    var d=[];
    ['♠','♥','♦','♣'].forEach(function(s){
      ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].forEach(function(v){ d.push({suit:s,val:v}); });
    });
    // Fisher-Yates shuffle
    for(var i=d.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=d[i]; d[i]=d[j]; d[j]=t; }
    return d;
  }
  function _p21Value(hand){
    var total=0, aces=0;
    hand.forEach(function(c){
      if(c.val==='A'){aces++;total+=11;}
      else if('JQK'.indexOf(c.val)>=0) total+=10;
      else total+=parseInt(c.val);
    });
    while(total>21&&aces>0){total-=10;aces--;}
    return total;
  }
  function _p21CardStr(c){ return c.val+c.suit; }
  function _p21HandStr(hand,hideSecond){
    if(hideSecond&&hand.length>=2) return _p21CardStr(hand[0])+' [??]';
    return hand.map(_p21CardStr).join(' ');
  }
  function _p21Start(bet){
    if(credits<bet||bet<=0){sndError();shooterSpeech('₴ Not enough credits!');return;}
    credits-=bet;
    _p21.bet=bet; _p21.deck=_p21Deck(); _p21.player=[]; _p21.dealer=[]; _p21.phase='player';
    _p21.player.push(_p21.deck.pop(),_p21.deck.pop());
    _p21.dealer.push(_p21.deck.pop(),_p21.deck.pop());
    if(_p21Value(_p21.player)===21){_p21End('blackjack');return;}
    _p21Render();
  }
  function _p21Hit(){
    if(_p21.phase!=='player')return;
    _p21.player.push(_p21.deck.pop());
    if(_p21Value(_p21.player)>21){_p21End('bust');return;}
    if(_p21Value(_p21.player)===21){_p21Stand();return;}
    _p21Render();
  }
  function _p21Stand(){
    if(_p21.phase!=='player')return;
    _p21.phase='dealer';
    while(_p21Value(_p21.dealer)<17) _p21.dealer.push(_p21.deck.pop());
    var pv=_p21Value(_p21.player), dv=_p21Value(_p21.dealer);
    if(dv>21)      _p21End('dealer_bust');
    else if(pv>dv) _p21End('win');
    else if(pv<dv) _p21End('lose');
    else           _p21End('push');
  }
  function _p21End(result){
    _p21.phase='done'; _p21.stats.played++;
    var msg='', payout=0;
    if(result==='blackjack'){msg='♠ BLACKJACK! 2.5× payout!';payout=Math.floor(_p21.bet*2.5);_p21.stats.won++;}
    else if(result==='win'||result==='dealer_bust'){msg='✅ You win!';payout=_p21.bet*2;_p21.stats.won++;}
    else if(result==='push'){msg='🤝 Push — bet returned.';payout=_p21.bet;}
    else{msg='❌ House wins.';payout=0;_p21.stats.lost++;
      var uaCut=Math.max(1,Math.floor(_p21.bet*0.1));_p21.stats.uaDonated+=uaCut;
    }
    credits+=payout;
    _p21SaveStats(); updateScoreHUD(); _p21Render(msg);
  }
  function _p21Render(msg){
    var $s=$('#p21-game');if(!$s.length)return;
    var h='<div class="p21-table">';
    h+='<div class="p21-info">₴ Balance: <b>'+credits.toLocaleString()+'</b> · Bet: <b>'+_p21.bet+'</b></div>';
    h+='<div class="p21-hand"><span class="p21-lbl">DEALER</span> ';
    h+=_p21.phase==='player'?_p21HandStr(_p21.dealer,true):_p21HandStr(_p21.dealer,false);
    if(_p21.phase!=='player') h+=' <span class="p21-val">('+_p21Value(_p21.dealer)+')</span>';
    h+='</div>';
    h+='<div class="p21-hand"><span class="p21-lbl">YOU</span> '+_p21HandStr(_p21.player,false);
    h+=' <span class="p21-val">('+_p21Value(_p21.player)+')</span></div>';
    if(msg) h+='<div class="p21-msg">'+msg+'</div>';
    if(_p21.phase==='player'){
      h+='<div class="p21-actions"><button class="p21-btn" id="p21-hit">HIT</button><button class="p21-btn" id="p21-stand">STAND</button></div>';
    }else if(_p21.phase==='done'){
      h+='<div class="p21-actions"><button class="p21-btn" id="p21-again">PLAY AGAIN</button></div>';
    }
    h+='<div class="p21-stats">Games: '+_p21.stats.played+' · W: '+_p21.stats.won+' · L: '+_p21.stats.lost+' · 🇺🇦 Donated: '+_p21.stats.uaDonated+' ₴</div>';
    h+='</div>';
    $s.html(h);
  }

  // ── Naperstki (Shell Game / Thimblerig) ───────────────────────────
  // 3 cups, ball hidden under one, player picks. House edge ~33%.
  // 10% of house wins → UA Army.
  var _nap = { cups:[0,0,0], ballIdx:0, bet:0, phase:'idle', revealed:-1,
    stats:{ played:0, won:0, lost:0, uaDonated:0 } };
  (function(){ var s=localStorage.getItem('nap_stats'); if(s) try{_nap.stats=JSON.parse(s);}catch(e){} })();
  function _napSaveStats(){ localStorage.setItem('nap_stats',JSON.stringify(_nap.stats)); }
  function _napStart(bet){
    if(credits<bet||bet<=0){sndError();shooterSpeech('₴ Not enough credits!');return;}
    credits-=bet;
    _nap.bet=bet; _nap.ballIdx=Math.floor(Math.random()*3); _nap.phase='pick'; _nap.revealed=-1;
    _nap.cups=[0,0,0]; _nap.cups[_nap.ballIdx]=1;
    updateScoreHUD(); _napRender('Pick a cup... 👀');
  }
  function _napPick(idx){
    if(_nap.phase!=='pick')return;
    _nap.phase='done'; _nap.revealed=idx; _nap.stats.played++;
    if(idx===_nap.ballIdx){
      var payout=_nap.bet*3;
      credits+=payout; _nap.stats.won++;
      _napSaveStats(); updateScoreHUD();
      _napRender('🎉 CORRECT! You win '+payout+' ₴!');
    }else{
      _nap.stats.lost++;
      var uaCut=Math.max(1,Math.floor(_nap.bet*0.1));_nap.stats.uaDonated+=uaCut;
      _napSaveStats(); updateScoreHUD();
      _napRender('❌ Wrong! Ball was under cup #'+ (_nap.ballIdx+1) +'. House wins.');
    }
  }
  function _napRender(msg){
    var $s=$('#nap-game');if(!$s.length)return;
    var h='<div class="nap-table">';
    h+='<div class="nap-info">₴ Balance: <b>'+credits.toLocaleString()+'</b> · Bet: <b>'+_nap.bet+'</b></div>';
    h+='<div class="nap-cups">';
    for(var i=0;i<3;i++){
      var isRevealed = _nap.phase==='done';
      var hasBall = _nap.cups[i]===1;
      var picked = _nap.revealed===i;
      var cupLbl = isRevealed ? (hasBall ? '🔴' : '·') : '?';
      var cls = 'nap-cup';
      if(picked && hasBall) cls += ' nap-cup--win';
      else if(picked && !hasBall) cls += ' nap-cup--lose';
      else if(isRevealed && hasBall) cls += ' nap-cup--ball';
      if(_nap.phase==='pick'){
        h+='<button class="'+cls+' nap-cup--pick" data-cup="'+i+'"><span class="nap-cup-icon">🫖</span><span class="nap-cup-num">#'+(i+1)+'</span></button>';
      }else{
        h+='<div class="'+cls+'"><span class="nap-cup-icon">'+(isRevealed?(hasBall?'🔴':'🫖'):'🫖')+'</span><span class="nap-cup-lbl">'+cupLbl+'</span></div>';
      }
    }
    h+='</div>';
    if(msg) h+='<div class="nap-msg">'+msg+'</div>';
    if(_nap.phase==='done'){
      h+='<div class="nap-actions"><button class="nap-btn" id="nap-again">PLAY AGAIN</button></div>';
    }
    h+='<div class="nap-stats">Games: '+_nap.stats.played+' · W: '+_nap.stats.won+' · L: '+_nap.stats.lost+' · 🇺🇦 Donated: '+_nap.stats.uaDonated+' ₴</div>';
    h+='</div>';
    $s.html(h);
  }

  // ── Arithmetics Teter (Timed Math Game) ────────────────────────
  // Solve 5 equations in 30s. Get 4+/5 to win 2× bet. 10% house cut → UA.
  var _teter = { questions:[], current:0, score:0, bet:0, phase:'idle', timer:null, timeLeft:30,
    stats:{ played:0, won:0, lost:0, uaDonated:0 } };
  (function(){ var s=localStorage.getItem('teter_stats'); if(s) try{_teter.stats=JSON.parse(s);}catch(e){} })();
  function _teterSaveStats(){ localStorage.setItem('teter_stats',JSON.stringify(_teter.stats)); }
  function _teterGenQ(){
    var qs=[];
    var generators = [
      // Basic arithmetic (larger numbers)
      function(){ var a=Math.floor(Math.random()*200)+10, b=Math.floor(Math.random()*100)+5; return {text:a+' + '+b+' = ?',answer:a+b}; },
      function(){ var a=Math.floor(Math.random()*300)+50, b=Math.floor(Math.random()*150)+10; return {text:a+' - '+b+' = ?',answer:a-b}; },
      // Multiplication
      function(){ var a=Math.floor(Math.random()*15)+3, b=Math.floor(Math.random()*15)+3; return {text:a+' × '+b+' = ?',answer:a*b}; },
      // Integer division
      function(){ var b=Math.floor(Math.random()*12)+2, a=b*(Math.floor(Math.random()*15)+2); return {text:a+' ÷ '+b+' = ?',answer:a/b}; },
      // Squares
      function(){ var a=Math.floor(Math.random()*15)+2; return {text:a+'² = ?',answer:a*a}; },
      // Order of operations: a + b × c
      function(){ var a=Math.floor(Math.random()*20)+1, b=Math.floor(Math.random()*10)+2, c=Math.floor(Math.random()*10)+2; return {text:a+' + '+b+' × '+c+' = ?',answer:a+b*c}; },
      // Percentage: what is X% of Y?
      function(){ var p=[10,20,25,50][Math.floor(Math.random()*4)], n=(Math.floor(Math.random()*20)+1)*10; return {text:p+'% of '+n+' = ?',answer:Math.floor(n*p/100)}; },
      // Subtraction with multiplication: a × b - c
      function(){ var a=Math.floor(Math.random()*8)+2, b=Math.floor(Math.random()*8)+2, c=Math.floor(Math.random()*10)+1; return {text:a+' × '+b+' - '+c+' = ?',answer:a*b-c}; },
    ];
    for(var i=0;i<10;i++){
      var gen=generators[Math.floor(Math.random()*generators.length)];
      qs.push(gen());
    }
    return qs;
  }
  function _teterStart(bet){
    if(credits<bet||bet<=0){sndError();shooterSpeech('₴ Not enough credits!');return;}
    credits-=bet;
    _teter.bet=bet; _teter.questions=_teterGenQ(); _teter.current=0; _teter.score=0;
    _teter.phase='playing'; _teter.timeLeft=60;
    if(_teter.timer)clearInterval(_teter.timer);
    _teter.timer=setInterval(function(){
      _teter.timeLeft--;
      if(_teter.timeLeft<=0){clearInterval(_teter.timer);_teter.timer=null;_teterFinish();}
      else _teterRender();
    },1000);
    updateScoreHUD(); _teterRender();
  }
  function _teterAnswer(){
    if(_teter.phase!=='playing')return;
    var $inp=$('#teter-input'); var val=parseInt($inp.val(),10);
    if(isNaN(val))return;
    if(val===_teter.questions[_teter.current].answer) _teter.score++;
    _teter.current++;
    if(_teter.current>=10){clearInterval(_teter.timer);_teter.timer=null;_teterFinish();}
    else _teterRender();
  }
  function _teterFinish(){
    _teter.phase='done'; _teter.stats.played++;
    var won=_teter.score>=7;
    if(won){credits+=_teter.bet*2;_teter.stats.won++;}
    else{_teter.stats.lost++;var uaCut=Math.max(1,Math.floor(_teter.bet*0.1));_teter.stats.uaDonated+=uaCut;}
    _teterSaveStats(); updateScoreHUD(); _teterRender();
  }
  function _teterRender(){
    var $s=$('#teter-game');if(!$s.length)return;
    var h='<div class="teter-table">';
    h+='<div class="teter-info">₴ Balance: <b>'+credits.toLocaleString()+'</b> · Bet: <b>'+_teter.bet+'</b> · ⏱ '+_teter.timeLeft+'s</div>';
    if(_teter.phase==='playing'){
      var q=_teter.questions[_teter.current];
      h+='<div class="teter-progress">Question '+ (_teter.current+1)+'/10 · Score: '+_teter.score+'</div>';
      h+='<div class="teter-question">'+q.text+'</div>';
      h+='<div class="teter-input-row"><input id="teter-input" class="teter-input" type="number" autofocus><button class="teter-btn" id="teter-answer-btn">SUBMIT</button></div>';
    }else if(_teter.phase==='done'){
      var won=_teter.score>=7;
      h+='<div class="teter-result'+(won?' teter-win':' teter-lose')+'">'+(won?'✅ You got '+_teter.score+'/10! You win '+(_teter.bet*2)+' ₴!':'❌ Only '+_teter.score+'/10. Need 7+ to win. House takes it.')+'</div>';
      h+='<div class="teter-actions"><button class="teter-btn" id="teter-again">PLAY AGAIN</button></div>';
    }
    h+='<div class="teter-stats">Games: '+_teter.stats.played+' · W: '+_teter.stats.won+' · L: '+_teter.stats.lost+' · 🇺🇦 Donated: '+_teter.stats.uaDonated+' ₴</div>';
    h+='</div>';
    $s.html(h);
    if(_teter.phase==='playing') $s.find('#teter-input').focus();
  }

  // ══════════════════════════════════════════════════════════════
  // ── CHESS MINIGAME (vs simple AI) ────────────────────────────
  // ══════════════════════════════════════════════════════════════
  var _chess = { board:null, selected:null, turn:'w', bet:0, phase:'idle', stats:{wins:0,losses:0,draws:0,uaDonated:0} };
  (function(){ var s=localStorage.getItem('chess_stats'); if(s) try{_chess.stats=JSON.parse(s);}catch(e){} })();
  function _chessSave(){ localStorage.setItem('chess_stats',JSON.stringify(_chess.stats)); }
  var _chessPieces = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' };
  function _chessInit(){
    _chess.board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [' ',' ',' ',' ',' ',' ',' ',' '],
      [' ',' ',' ',' ',' ',' ',' ',' '],
      [' ',' ',' ',' ',' ',' ',' ',' '],
      [' ',' ',' ',' ',' ',' ',' ',' '],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    _chess.turn='w'; _chess.selected=null; _chess.phase='playing';
  }
  function _chessIsWhite(p){ return p>=' '&&p==='P'||p==='R'||p==='N'||p==='B'||p==='Q'||p==='K'; }
  function _chessIsBlack(p){ return p==='p'||p==='r'||p==='n'||p==='b'||p==='q'||p==='k'; }
  function _chessColor(p){ if(_chessIsWhite(p)) return 'w'; if(_chessIsBlack(p)) return 'b'; return null; }
  function _chessMoves(r,c,board){
    var p=board[r][c], col=_chessColor(p), moves=[], pu=p.toUpperCase();
    if(!col) return moves;
    function add(dr,dc){ var nr=r+dr,nc=c+dc; if(nr<0||nr>7||nc<0||nc>7) return false; var t=board[nr][nc]; if(_chessColor(t)===col) return false; moves.push([nr,nc]); return t===' '; }
    if(pu==='P'){
      var dir=col==='w'?-1:1, start=col==='w'?6:1;
      if(board[r+dir]&&board[r+dir][c]===' '){ moves.push([r+dir,c]); if(r===start&&board[r+dir*2]&&board[r+dir*2][c]===' ') moves.push([r+dir*2,c]); }
      if(board[r+dir]){ if(c>0&&_chessColor(board[r+dir][c-1])&&_chessColor(board[r+dir][c-1])!==col) moves.push([r+dir,c-1]); if(c<7&&_chessColor(board[r+dir][c+1])&&_chessColor(board[r+dir][c+1])!==col) moves.push([r+dir,c+1]); }
    }
    if(pu==='R'||pu==='Q') { [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){ for(var i=1;i<8;i++) if(!add(d[0]*i,d[1]*i)) break; }); }
    if(pu==='B'||pu==='Q') { [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(function(d){ for(var i=1;i<8;i++) if(!add(d[0]*i,d[1]*i)) break; }); }
    if(pu==='N') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(function(d){ add(d[0],d[1]); }); }
    if(pu==='K') { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(function(d){ add(d[0],d[1]); }); }
    return moves;
  }
  function _chessAI(){
    // Simple AI: prioritize captures (by value), then random
    var best=[], bestVal=-1;
    var vals={p:1,n:3,b:3,r:5,q:9,k:100,P:1,N:3,B:3,R:5,Q:9,K:100,' ':0};
    for(var r=0;r<8;r++) for(var c=0;c<8;c++){
      if(_chessColor(_chess.board[r][c])!=='b') continue;
      var ms=_chessMoves(r,c,_chess.board);
      ms.forEach(function(m){ var cap=vals[_chess.board[m[0]][m[1]]]||0; if(cap>bestVal){ best=[[r,c,m[0],m[1]]]; bestVal=cap; } else if(cap===bestVal) best.push([r,c,m[0],m[1]]); });
    }
    if(!best.length) return false;
    var mv=best[Math.floor(Math.random()*best.length)];
    var captured=_chess.board[mv[2]][mv[3]];
    _chess.board[mv[2]][mv[3]]=_chess.board[mv[0]][mv[1]];
    _chess.board[mv[0]][mv[1]]=' ';
    // Pawn promotion
    if(_chess.board[mv[2]][mv[3]]==='p'&&mv[2]===7) _chess.board[mv[2]][mv[3]]='q';
    return captured==='K'?'checkmate':true;
  }
  function _chessEnd(result){
    _chess.phase='idle';
    var msg='';
    if(result==='win'){ _chess.stats.wins++; if(_chess.bet>0){ var win=Math.floor(_chess.bet*1.8); credits+=win; msg='You WIN! +'+win+'₴'; } else msg='You WIN!'; }
    else if(result==='lose'){ _chess.stats.losses++; msg='Putin wins this round...'; if(_chess.bet>0){ var ua=Math.floor(_chess.bet*0.1); _chess.stats.uaDonated+=ua; msg+=' (🇺🇦 '+ua+'₴ donated)'; } }
    else { _chess.stats.draws++; if(_chess.bet>0) credits+=_chess.bet; msg='Draw! Bet returned.'; }
    _chessSave(); updateScoreHUD(); _chessRender(msg);
  }
  function _chessRender(msg){
    var $b=$('#chess-board'); if(!$b.length) return;
    var h='<div style="display:inline-block;border:2px solid #c8a866;background:#1a1a2e;padding:4px;">';
    h+='<div style="text-align:center;color:#ffd700;font-size:13px;padding:2px;">♟️ W:'+_chess.stats.wins+' L:'+_chess.stats.losses+' D:'+_chess.stats.draws+'</div>';
    for(var r=0;r<8;r++){
      h+='<div style="display:flex;">';
      for(var c=0;c<8;c++){
        var dark=(r+c)%2===1;
        var bg=dark?'#5c4033':'#d4a76a';
        var sel=_chess.selected&&_chess.selected[0]===r&&_chess.selected[1]===c;
        if(sel) bg='#ffd700';
        var validTarget=false;
        if(_chess.selected){
          var vm=_chessMoves(_chess.selected[0],_chess.selected[1],_chess.board);
          vm.forEach(function(m){ if(m[0]===r&&m[1]===c) validTarget=true; });
        }
        if(validTarget) bg=dark?'#6a8040':'#8aaa56';
        var pc=_chess.board[r][c];
        var sym=pc!==' '?(_chessPieces[pc]||pc):'';
        h+='<div class="chess-sq" data-r="'+r+'" data-c="'+c+'" style="width:38px;height:38px;background:'+bg+';display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;color:'+(_chessIsBlack(pc)?'#1a0a0a':'#fff')+';">'+sym+'</div>';
      }
      h+='</div>';
    }
    h+='</div>';
    if(msg) h+='<div style="text-align:center;color:#ffd700;padding:6px;font-weight:bold;">'+msg+'</div>';
    if(_chess.phase==='idle') h+='<div style="text-align:center;padding:4px;color:#aaa;font-size:12px;">Place a bet above to start a new game</div>';
    $b.html(h);
    $('#chess-status').html(_chess.phase==='playing'?(_chess.turn==='w'?'Your turn (White)':'Putin is thinking...'):'');
  }
  function _chessStart(bet){
    if(bet>0&&credits<bet){ shooterSpeech('Not enough ₴!'); return; }
    if(bet>0) credits-=bet;
    _chess.bet=bet; updateScoreHUD();
    _chessInit(); _chessRender('Game started! Click a white piece to move.');
  }
  $(document).on('click','.chess-bet-btn',function(){ _chessStart(+($(this).data('bet'))); });
  $(document).on('click','.chess-sq',function(){
    if(_chess.phase!=='playing'||_chess.turn!=='w') return;
    var r=+$(this).data('r'), c=+$(this).data('c');
    if(_chess.selected){
      var ms=_chessMoves(_chess.selected[0],_chess.selected[1],_chess.board);
      var valid=false; ms.forEach(function(m){ if(m[0]===r&&m[1]===c) valid=true; });
      if(valid){
        var captured=_chess.board[r][c];
        _chess.board[r][c]=_chess.board[_chess.selected[0]][_chess.selected[1]];
        _chess.board[_chess.selected[0]][_chess.selected[1]]=' ';
        if(_chess.board[r][c]==='P'&&r===0) _chess.board[r][c]='Q';
        _chess.selected=null;
        if(captured==='k'){ _chessEnd('win'); return; }
        _chess.turn='b'; _chessRender('');
        setTimeout(function(){
          var res=_chessAI();
          if(res==='checkmate'){ _chessEnd('lose'); return; }
          if(!res){ _chessEnd('draw'); return; }
          _chess.turn='w'; _chessRender('');
        },400);
        return;
      }
      _chess.selected=null;
    }
    if(_chessColor(_chess.board[r][c])==='w') _chess.selected=[r,c];
    _chessRender('');
  });
  $(document).on('click','[data-target="inv-sec-chess"]',function(){ setTimeout(function(){ _chessRender(''); },50); });

  // ══════════════════════════════════════════════════════════════
  // ── CHECKERS MINIGAME (vs simple AI) ─────────────────────────
  // ══════════════════════════════════════════════════════════════
  var _ckr = { board:null, selected:null, turn:'r', bet:0, phase:'idle', mustJump:null, stats:{wins:0,losses:0,draws:0,uaDonated:0} };
  (function(){ var s=localStorage.getItem('checkers_stats'); if(s) try{_ckr.stats=JSON.parse(s);}catch(e){} })();
  function _ckrSave(){ localStorage.setItem('checkers_stats',JSON.stringify(_ckr.stats)); }
  function _ckrInit(){
    _ckr.board=[];
    for(var r=0;r<8;r++){ _ckr.board[r]=[]; for(var c=0;c<8;c++){
      if((r+c)%2===1&&r<3) _ckr.board[r][c]='b';
      else if((r+c)%2===1&&r>4) _ckr.board[r][c]='r';
      else _ckr.board[r][c]=' ';
    }}
    _ckr.turn='r'; _ckr.selected=null; _ckr.phase='playing'; _ckr.mustJump=null;
  }
  function _ckrIsRed(p){ return p==='r'||p==='R'; }
  function _ckrIsBlk(p){ return p==='b'||p==='B'; }
  function _ckrIsKing(p){ return p==='R'||p==='B'; }
  function _ckrMoves(r,c,board,jumpOnly){
    var p=board[r][c], col=_ckrIsRed(p)?'r':'b', king=_ckrIsKing(p), moves=[], jumps=[];
    var dirs=king?[[-1,-1],[-1,1],[1,-1],[1,1]]:(col==='r'?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]);
    dirs.forEach(function(d){
      var nr=r+d[0],nc=c+d[1];
      if(nr<0||nr>7||nc<0||nc>7) return;
      if(board[nr][nc]===' '&&!jumpOnly) moves.push({r:nr,c:nc,jump:false});
      var opp=col==='r'?_ckrIsBlk(board[nr][nc]):_ckrIsRed(board[nr][nc]);
      if(opp){ var jr=nr+d[0],jc=nc+d[1]; if(jr>=0&&jr<=7&&jc>=0&&jc<=7&&board[jr][jc]===' ') jumps.push({r:jr,c:jc,jump:true,cap:[nr,nc]}); }
    });
    return jumps.length?jumps:(jumpOnly?[]:moves);
  }
  function _ckrHasJumps(col,board){
    for(var r=0;r<8;r++) for(var c=0;c<8;c++){
      if(col==='r'&&!_ckrIsRed(board[r][c])) continue;
      if(col==='b'&&!_ckrIsBlk(board[r][c])) continue;
      if(_ckrMoves(r,c,board,true).length) return true;
    }
    return false;
  }
  function _ckrCount(col){ var n=0; for(var r=0;r<8;r++) for(var c=0;c<8;c++){ if(col==='r'&&_ckrIsRed(_ckr.board[r][c])) n++; if(col==='b'&&_ckrIsBlk(_ckr.board[r][c])) n++; } return n; }
  function _ckrAI(){
    var best=[]; var hasJumps=_ckrHasJumps('b',_ckr.board);
    for(var r=0;r<8;r++) for(var c=0;c<8;c++){
      if(!_ckrIsBlk(_ckr.board[r][c])) continue;
      var ms=_ckrMoves(r,c,_ckr.board,hasJumps);
      ms.forEach(function(m){ best.push({fr:r,fc:c,m:m}); });
    }
    if(!best.length) return false;
    var mv=best[Math.floor(Math.random()*best.length)];
    _ckr.board[mv.m.r][mv.m.c]=_ckr.board[mv.fr][mv.fc];
    _ckr.board[mv.fr][mv.fc]=' ';
    if(mv.m.jump) _ckr.board[mv.m.cap[0]][mv.m.cap[1]]=' ';
    if(_ckr.board[mv.m.r][mv.m.c]==='b'&&mv.m.r===7) _ckr.board[mv.m.r][mv.m.c]='B';
    // Multi-jump
    if(mv.m.jump&&_ckrMoves(mv.m.r,mv.m.c,_ckr.board,true).length){ setTimeout(_ckrAI,300); return 'continue'; }
    return true;
  }
  function _ckrEnd(result){
    _ckr.phase='idle';
    var msg='';
    if(result==='win'){ _ckr.stats.wins++; if(_ckr.bet>0){ var win=Math.floor(_ckr.bet*1.8); credits+=win; msg='You WIN! +'+win+'₴'; } else msg='You WIN!'; }
    else if(result==='lose'){ _ckr.stats.losses++; msg='Putin wins...'; if(_ckr.bet>0){ var ua=Math.floor(_ckr.bet*0.1); _ckr.stats.uaDonated+=ua; msg+=' (🇺🇦 '+ua+'₴ donated)'; } }
    else { _ckr.stats.draws++; if(_ckr.bet>0) credits+=_ckr.bet; msg='Draw! Bet returned.'; }
    _ckrSave(); updateScoreHUD(); _ckrRender(msg);
  }
  function _ckrRender(msg){
    var $b=$('#checkers-board'); if(!$b.length) return;
    var h='<div style="display:inline-block;border:2px solid #c8a866;background:#1a1a2e;padding:4px;">';
    h+='<div style="text-align:center;color:#ffd700;font-size:13px;padding:2px;">⛀ W:'+_ckr.stats.wins+' L:'+_ckr.stats.losses+'</div>';
    for(var r=0;r<8;r++){
      h+='<div style="display:flex;">';
      for(var c=0;c<8;c++){
        var dark=(r+c)%2===1, bg=dark?'#5c4033':'#d4a76a';
        var sel=_ckr.selected&&_ckr.selected[0]===r&&_ckr.selected[1]===c;
        if(sel) bg='#ffd700';
        var validTarget=false;
        if(_ckr.selected){
          var hasJ=_ckrHasJumps('r',_ckr.board);
          var vm=_ckrMoves(_ckr.selected[0],_ckr.selected[1],_ckr.board,hasJ);
          vm.forEach(function(m){ if(m.r===r&&m.c===c) validTarget=true; });
        }
        if(validTarget) bg=dark?'#6a8040':'#8aaa56';
        var pc=_ckr.board[r][c], sym='';
        if(pc==='r') sym='<div style="width:28px;height:28px;border-radius:50%;background:#c62828;border:2px solid #ff5252;"></div>';
        else if(pc==='R') sym='<div style="width:28px;height:28px;border-radius:50%;background:#c62828;border:2px solid #ffd700;">♛</div>';
        else if(pc==='b') sym='<div style="width:28px;height:28px;border-radius:50%;background:#212121;border:2px solid #616161;"></div>';
        else if(pc==='B') sym='<div style="width:28px;height:28px;border-radius:50%;background:#212121;border:2px solid #ffd700;">♛</div>';
        h+='<div class="ckr-sq" data-r="'+r+'" data-c="'+c+'" style="width:42px;height:42px;background:'+bg+';display:flex;align-items:center;justify-content:center;cursor:pointer;">'+sym+'</div>';
      }
      h+='</div>';
    }
    h+='</div>';
    if(msg) h+='<div style="text-align:center;color:#ffd700;padding:6px;font-weight:bold;">'+msg+'</div>';
    if(_ckr.phase==='idle') h+='<div style="text-align:center;padding:4px;color:#aaa;font-size:12px;">Place a bet above to start a new game</div>';
    $b.html(h);
    $('#checkers-status').html(_ckr.phase==='playing'?(_ckr.turn==='r'?'Your turn (Red)':'Putin is thinking...'):'');
  }
  function _ckrStart(bet){
    if(bet>0&&credits<bet){ shooterSpeech('Not enough ₴!'); return; }
    if(bet>0) credits-=bet;
    _ckr.bet=bet; updateScoreHUD();
    _ckrInit(); _ckrRender('Game started! Click a red piece to move.');
  }
  $(document).on('click','.checkers-bet-btn',function(){ _ckrStart(+($(this).data('bet'))); });
  $(document).on('click','.ckr-sq',function(){
    if(_ckr.phase!=='playing'||_ckr.turn!=='r') return;
    var r=+$(this).data('r'), c=+$(this).data('c');
    if(_ckr.selected){
      var hasJ=_ckrHasJumps('r',_ckr.board);
      var ms=_ckrMoves(_ckr.selected[0],_ckr.selected[1],_ckr.board,hasJ);
      var validMv=null; ms.forEach(function(m){ if(m.r===r&&m.c===c) validMv=m; });
      if(validMv){
        _ckr.board[r][c]=_ckr.board[_ckr.selected[0]][_ckr.selected[1]];
        _ckr.board[_ckr.selected[0]][_ckr.selected[1]]=' ';
        if(validMv.jump) _ckr.board[validMv.cap[0]][validMv.cap[1]]=' ';
        if(_ckr.board[r][c]==='r'&&r===0) _ckr.board[r][c]='R';
        _ckr.selected=null;
        // Multi-jump for player
        if(validMv.jump&&_ckrMoves(r,c,_ckr.board,true).length){ _ckr.selected=[r,c]; _ckrRender('Jump again!'); return; }
        if(_ckrCount('b')===0){ _ckrEnd('win'); return; }
        _ckr.turn='b'; _ckrRender('');
        setTimeout(function(){
          var res=_ckrAI();
          if(res==='continue'){ _ckrRender(''); return; }
          if(!res){ _ckrEnd('win'); return; }
          if(_ckrCount('r')===0){ _ckrEnd('lose'); return; }
          _ckr.turn='r'; _ckrRender('');
        },500);
        return;
      }
      _ckr.selected=null;
    }
    if(_ckrIsRed(_ckr.board[r][c])) _ckr.selected=[r,c];
    _ckrRender('');
  });
  $(document).on('click','[data-target="inv-sec-checkers"]',function(){ setTimeout(function(){ _ckrRender(''); },50); });

  // ── Putin Death Date Pool ─────────────────────────────────────
  // Place a bet + pick a date. All bets pooled. When "event" happens, closest guess wins 90% (10% UA).
  // Simulated locally with localStorage for now.
  var _ppool = { stats:{ totalPool:0, bets:[], uaDonated:0 } };
  (function(){ var s=localStorage.getItem('ppool_stats'); if(s) try{_ppool.stats=JSON.parse(s);}catch(e){} })();
  function _ppoolSave(){ localStorage.setItem('ppool_stats',JSON.stringify(_ppool.stats)); }
  function _ppoolPlace(){
    var $date=$('#ppool-date'); var $bet=$('#ppool-bet');
    var dateVal=$date.val(); var betVal=parseInt($bet.val(),10);
    if(!dateVal){shooterSpeech('Pick a date!');return;}
    if(isNaN(betVal)||betVal<10){shooterSpeech('Min bet 10₴!');return;}
    if(credits<betVal){sndError();shooterSpeech('₴ Not enough credits!');return;}
    credits-=betVal;
    var uaCut=Math.max(1,Math.floor(betVal*0.1));
    _ppool.stats.totalPool+=betVal-uaCut; _ppool.stats.uaDonated+=uaCut;
    _ppool.stats.bets.push({date:dateVal,amount:betVal,ts:Date.now()});
    _ppoolSave(); updateScoreHUD(); _ppoolRender('✅ Bet placed! '+betVal+'₴ on '+dateVal+'. 🇺🇦 '+uaCut+'₴ donated.');
  }
  function _ppoolRender(msg){
    var $s=$('#ppool-game');if(!$s.length)return;
    var bets=_ppool.stats.bets||[];
    var h='<div class="ppool-table">';
    h+='<div class="ppool-info">₴ Balance: <b>'+credits.toLocaleString()+'</b> · 💀 Prize Pool: <b>'+_ppool.stats.totalPool+'₴</b></div>';
    h+='<div class="ppool-form"><label>Pick the date:</label><input id="ppool-date" class="ppool-input" type="date" min="2025-01-01" max="2040-12-31">';
    h+='<label>Your bet:</label><input id="ppool-bet" class="ppool-input" type="number" min="10" placeholder="Min 10₴">';
    h+='<button class="ppool-btn" id="ppool-place-btn">💀 PLACE BET</button></div>';
    if(msg) h+='<div class="ppool-msg">'+msg+'</div>';
    if(bets.length){
      h+='<div class="ppool-history"><h4>Your Bets:</h4>';
      bets.slice().reverse().slice(0,10).forEach(function(b){
        h+='<div class="ppool-bet-row">📅 '+b.date+' · '+b.amount+'₴</div>';
      });
      h+='</div>';
    }
    h+='<div class="ppool-stats">Total Pool: '+_ppool.stats.totalPool+'₴ · Your Bets: '+bets.length+' · 🇺🇦 Donated: '+_ppool.stats.uaDonated+'₴</div>';
    h+='</div>';
    $s.html(h);
  }
  // Auto-render mini-games when their section is shown
  $(document).on('click', '[data-target="inv-sec-naperstki"]', function(){ setTimeout(function(){ _napRender('Pick a cup... 👀'); }, 50); });
  $(document).on('click', '[data-target="inv-sec-putinpool"]', function(){ setTimeout(_ppoolRender, 50); });

  // ── User Registration Modal ──────────────────────────────────
  function showRegModal(onDone) {
    var _cb = typeof onDone === 'function' ? onDone : function(){};
    if (localStorage.getItem('arc_username') && localStorage.getItem('arc_username') !== 'Fighter') { _cb(); return; }
    // Don't re-show if already dismissed this session
    if (window._regModalShown) { _cb(); return; }
    window._regModalShown = true;
    const $ov = $('<div class="reg-overlay"></div>');
    $ov.html(
      '<div class="reg-box">' +
        '<div class="reg-flag">\uD83C\uDDFA\uD83C\uDDE6</div>' +
        '<h2 class="reg-title">Welcome, Defender!</h2>' +
        '<p class="reg-sub">Register your battle alias to track progress and earn a &nbsp;<b style="color:#FFD700;">+5 ARC</b>&nbsp; welcome bonus.</p>' +
        '<input id="reg-name-input" class="reg-input" type="text" placeholder="Battle Name (e.g. Steel Falcon)" maxlength="20" autocomplete="off">' +
        '<input id="reg-email-input" class="reg-input reg-input--email" type="email" placeholder="Email (optional) — battle updates" maxlength="80" autocomplete="off">' +
        '<div id="reg-error" class="reg-error"></div>' +
        '<button id="reg-submit-btn" class="reg-submit-btn">&nbsp;\u2694\uFE0F Enter Battle (+5 ARC)</button>' +
        '<button id="reg-guest-btn" class="reg-guest-btn">Continue as Guest</button>' +
      '</div>'
    );
    $('body').append($ov);
    requestAnimationFrame(function(){ $ov.addClass('reg-overlay--in'); });
    setTimeout(function(){ $ov.find('#reg-name-input').trigger('focus'); }, 200);
    $(document).off('keydown.regModal').on('keydown.regModal', function(e) {
      if (e.which === 27) { e.preventDefault(); localStorage.setItem('arc_username', 'Fighter'); $(document).off('keydown.regModal'); $ov.removeClass('reg-overlay--in'); setTimeout(function(){ $ov.remove(); _cb(); }, 300); }
    });

    $ov.find('#reg-submit-btn').on('click', function() {
      const name = $ov.find('#reg-name-input').val().trim();
      if (!name || name.length < 2) {
        $ov.find('#reg-error').text('\u26A0 Enter at least 2 characters'); return;
      }
      if (!/^[a-zA-Z0-9 _\-.]+$/.test(name)) {
        $ov.find('#reg-error').text('\u26A0 Letters, numbers, spaces, _ - . only'); return;
      }
      const email = $ov.find('#reg-email-input').val().trim();
      localStorage.setItem('arc_username', name);
      if (email) localStorage.setItem('arc_user_email', email);
      localStorage.setItem('arc_registered_at', new Date().toISOString());
      earnArcoin(5, 'Welcome Bonus \uD83C\uDDFA\uD83C\uDDE6');
      // Register with server (non-blocking — game works offline too)
      try {
        var regBody = { anon_id: (window.ARC_API ? window.ARC_API.getAnonId() : ''), username: name };
        if (email) regBody.email = email;
        fetch(_API_BASE + '/api/player/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Anon-Id': regBody.anon_id },
          body: JSON.stringify(regBody)
        }).catch(function(){});
      } catch(be){ /* backend is optional */ }
      $ov.removeClass('reg-overlay--in');
      $(document).off('keydown.regModal');
      setTimeout(function(){ $ov.remove(); _cb(); }, 300);
      setTimeout(function(){ shooterSpeech('\uD83C\uDDFA\uD83C\uDDE6 Welcome, ' + name + '! +5 ARC BONUS!'); }, 420);
    });

    $ov.find('#reg-guest-btn').on('click', function() {
      localStorage.setItem('arc_username', 'Fighter');
      $(document).off('keydown.regModal');
      $ov.removeClass('reg-overlay--in');
      setTimeout(function(){ $ov.remove(); _cb(); }, 300);
    });
  }

  // ── Referral System ──────────────────────────────────────────
  function checkReferralParam() {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('ref');
    if (code) {
      const key = 'arc_ref_rewarded_' + code;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        localStorage.setItem('arc_referred_by', code);
        earnArcoin(2, 'Referral welcome bonus');
        setTimeout(function(){ shooterSpeech('🤝 +2 ARC referral bonus! Welcome, fighter!'); }, 2000);
      }
    }
    if (!localStorage.getItem('arc_ref_code')) {
      localStorage.setItem('arc_ref_code', 'ARC-' + Date.now().toString(36).toUpperCase());
    }
  }

  // ── PvP Wave Challenge ───────────────────────────────────────────
  function checkPvpChallenge() {
    const p = new URLSearchParams(window.location.search);
    if (!p.get('pvp')) return;
    _pvpChallenge = {
      challenger: p.get('challenger') || 'Anonymous',
      challengerScore: parseInt(p.get('score')  || '0', 10),
      challengerWave:  parseInt(p.get('wave')   || '0', 10),
      challengerKills: parseInt(p.get('kills')  || '0', 10),
      bet:             parseInt(p.get('bet')    || '0', 10),
      ts:              parseInt(p.get('ts')     || '0', 10),
    };
  }
  function createPvpChallenge(betAmt) {
    const _name  = localStorage.getItem('arc_username') || 'Fighter';
    const _base  = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'https://cave-commission-worship-intermediate.trycloudflare.com/v4c_app/index.html'
      : window.location.origin + window.location.pathname.replace(/\/+$/, '');
    const _bet   = Math.min(Math.max(0, parseInt(betAmt) || 0), 25);
    if (_bet > 0) {
      if (arcoins < _bet) { shooterSpeech('Not enough ARC for bet (' + arcoins + ')'); return; }
      arcoins -= _bet;
      localStorage.setItem('arc_balance', String(arcoins));
      updateCoinHUD(false);
    }
    const _url   = _base + '?pvp=1'
      + '&challenger=' + encodeURIComponent(_name)
      + '&score='  + score
      + '&wave='   + wave
      + '&kills='  + zombieKilled
      + '&bet='    + _bet
      + '&ts='     + Date.now();
    try { navigator.clipboard.writeText(_url); } catch(e) {}
    var _hist; try { _hist = JSON.parse(localStorage.getItem('arc_pvp_sent') || '[]'); } catch(e) { _hist = []; }
    _hist.unshift({ url: _url, score, wave, kills: zombieKilled, bet: _bet, date: new Date().toLocaleDateString() });
    localStorage.setItem('arc_pvp_sent', JSON.stringify(_hist.slice(0, 10)));
    showConfirm({
      title: 'Challenge Created!',
      body: 'Challenge URL copied to clipboard!<br><br>'
          + '<small style="word-break:break-all;color:#aef;font-size:10px">' + _url.slice(0,90) + '...</small><br><br>'
          + 'Share it with an opponent. If they beat your score of <strong>' + score + '</strong>, they win the glory!',
      confirmTxt: 'OK', cancelTxt: false
    });
    buildInventory();
  }
  function resolvePvpChallenge(myScore) {
    if (!_pvpChallenge) return;
    const c = _pvpChallenge;
    _pvpChallenge = null;
    const won = myScore > c.challengerScore;
    var _hist; try { _hist = JSON.parse(localStorage.getItem('arc_pvp_results') || '[]'); } catch(e) { _hist = []; }
    _hist.unshift({ opponent: c.challenger, theirScore: c.challengerScore, myScore, won, bet: c.bet, date: new Date().toLocaleDateString() });
    localStorage.setItem('arc_pvp_results', JSON.stringify(_hist.slice(0, 15)));
    if (won && c.bet > 0) {
      const _prize = Math.max(1, Math.round(c.bet * 0.95));
      earnArcoin(_prize, 'PvP Win vs ' + c.challenger, { rawAmount: true });
    }
  }

  // ── Kill Putins Special Mission Mode ──────────────────────────────────
  let _missionMode = null;

  function startKillPutinsMission() {
    _missionMode = 'kill_putins';
    var $p = $('#inventory-panel');
    if ($p.hasClass('open')) { $p.removeClass('open'); $canves.removeClass('inv-open'); }
    if (gameActive) endGame('lose');
    setTimeout(function() {
      resetGame();
      startGame();
      shooterSpeech('☠️ KILL PUTINS — MISSION ACTIVE!', true);
    }, 300);
  }
  window.startKillPutinsMission = startKillPutinsMission;

  // ── Daily Missions ──────────────────────────────────────────────────
  const _MISSION_POOL = [
    { id:'m_kill10',   type:'kills',   target:10,  arc:3,  icon:'🎯', desc:'Kill 10 enemies'           },
    { id:'m_kill25',   type:'kills',   target:25,  arc:6,  icon:'💥', desc:'Kill 25 enemies'           },
    { id:'m_kill50',   type:'kills',   target:50,  arc:12, icon:'☠️', desc:'Kill 50 enemies'           },
    { id:'m_wave2',    type:'wave',    target:2,   arc:5,  icon:'🌊', desc:'Reach Wave 2'              },
    { id:'m_wave3',    type:'wave',    target:3,   arc:10, icon:'🌊', desc:'Reach Wave 3'              },
    { id:'m_score1k',  type:'score',   target:1000,arc:4,  icon:'⭐', desc:'Score 1,000 points'        },
    { id:'m_score5k',  type:'score',   target:5000,arc:8,  icon:'⭐', desc:'Score 5,000 points'        },
    { id:'m_nodeath',  type:'nodeath', target:1,   arc:8,  icon:'🛡️', desc:'Finish a game without dying' },
    { id:'m_earn5arc', type:'arc',     target:5,   arc:4,  icon:'🪙', desc:'Earn 5 ARC in one session'  },
    { id:'m_earn15arc',type:'arc',     target:15,  arc:9,  icon:'🪙', desc:'Earn 15 ARC in one session' },
    { id:'m_wave1clr', type:'w1clear', target:1,   arc:5,  icon:'✅', desc:'Clear Wave 1 completely'    },
    { id:'m_wave2clr', type:'w2clear', target:1,   arc:9,  icon:'✅', desc:'Clear Wave 2 completely'    },
  ];

  function _todayKey() { const d = new Date(); return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate(); }

  function getDailyMissions() {
    const key  = 'arc_missions_' + _todayKey();
    const raw  = localStorage.getItem(key);
    if (raw) { try { return JSON.parse(raw); } catch(e) { localStorage.removeItem(key); } }
    // Seed 3 missions from pool, different each day
    const seed = _todayKey() % 997;
    const chosen = [];
    const pool   = _MISSION_POOL.slice();
    for (let i = 0; i < 3; i++) {
      const idx = (seed * (i + 1) * 17) % pool.length;
      chosen.push({ ...pool.splice(idx, 1)[0], progress: 0, done: false, claimed: false });
    }
    const data = { date: _todayKey(), missions: chosen, allDoneBonus: false };
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }
  function saveDailyMissions(data) {
    localStorage.setItem('arc_missions_' + _todayKey(), JSON.stringify(data));
  }

  function updateMissionProgress(type, value) {
    const data = getDailyMissions();
    let changed = false;
    data.missions.forEach(function(m) {
      if (m.done || m.type !== type) return;
      m.progress = Math.max(m.progress || 0, value);
      if (m.progress >= m.target) {
        m.done = true; changed = true;
        // Toast notification during gameplay
        if (gameActive) {
          var $mt = $('<div class="mission-toast">✅ Mission complete: <b>' + m.desc + '</b> — claim at Armory!</div>');
          $canves.append($mt);
          requestAnimationFrame(function() { $mt.addClass('mission-toast--in'); });
          setTimeout(function() { $mt.addClass('mission-toast--out'); setTimeout(function() { $mt.remove(); }, 500); }, 3500);
          sndAchievement();
        }
      }
    });
    if (changed) saveDailyMissions(data);
  }

  function claimMissionReward(idx) {
    const data = getDailyMissions();
    const m = data.missions[idx];
    if (!m || !m.done || m.claimed) return;
    m.claimed = true;
    saveDailyMissions(data);
    earnArcoin(m.arc, 'Daily Mission: ' + m.desc);
    // Check all-done bonus
    const allDone = data.missions.every(function(x) { return x.claimed; });
    if (allDone && !data.allDoneBonus) {
      data.allDoneBonus = true;
      saveDailyMissions(data);
      earnArcoin(10, 'Daily Missions COMPLETE bonus!');
    }
    buildInventory();
  }

  // ── arcDB: Unified Save/Load/Export/Import ─────────────────────────
  var _ARC_DB_KEYS = [
    'arc_balance','arc_ledger','arc_total_earned','arc_prestige',
    'arc_max_wave','arc_total_kills','arc_total_wins','arc_total_games','arc_total_playtime',
    'arc_nfts','arc_stakes','arc_spin_date',
    'arc_username','arc_user_email','arc_registered_at',
    'arc_ref_code','arc_refs_count','arc_clan',
    'arc_pvp_sent','arc_pvp_results',
    'arc_achievements','arc_cosmetics',
    'arc_login_streak','arc_last_login','arc_streak_badges','arc_streak_multi',
    'arc_contracts','arc_loans','arc_adaptive_ai',
    'arc_wallet_addr','arc_chain_claims','arc_lb_rank',
    'teter_stats','play21_stats','cups_stats','ppool_stats',
    'skill_unlocks','sol_upgrades','bp_data','bp_kills',
  ];
  // Add wave high-score keys dynamically
  for(var _w=1;_w<=8;_w++) _ARC_DB_KEYS.push('arc_wave_hs_'+_w);
  // Add mission keys for last 7 days
  (function(){
    var d=new Date();
    for(var i=0;i<7;i++){
      var k='arc_missions_'+( d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate() );
      if(_ARC_DB_KEYS.indexOf(k)===-1) _ARC_DB_KEYS.push(k);
      d.setDate(d.getDate()-1);
    }
  })();

  function arcDB_export() {
    var dump = {};
    _ARC_DB_KEYS.forEach(function(k) {
      var v = localStorage.getItem(k);
      if (v !== null) dump[k] = v;
    });
    dump._exportDate = new Date().toISOString();
    dump._version = 'arcDB_v1';
    var blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'antiruscist-save-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    shooterSpeech('💾 Save exported!');
  }

  function arcDB_import(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var dump = JSON.parse(e.target.result);
        if (dump._version !== 'arcDB_v1') { shooterSpeech('❌ Invalid save file!'); return; }
        if (!confirm('Import save from ' + (dump._exportDate||'unknown') + '? This will OVERWRITE your current progress.')) return;
        var count = 0;
        var _allowed = new Set(_ARC_DB_KEYS);
        Object.keys(dump).forEach(function(k) {
          if (k.charAt(0) === '_') return;
          if (!_allowed.has(k)) return;
          localStorage.setItem(k, dump[k]);
          count++;
        });
        // Reload in-memory vars from imported data
        arcoins = +(localStorage.getItem('arc_balance') || 0);
        credits = gcfg('economy','start_credits',500);
        zombieKilled = 0;
        wave = 0;
        updateScoreHUD();
        buildInventory();
        shooterSpeech('✅ Imported ' + count + ' keys. Game state restored!');
      } catch(ex) { shooterSpeech('❌ Failed to parse save: ' + ex.message); }
    };
    reader.readAsText(file);
  }

  function arcDB_clear() {
    if (!confirm('⚠️ DELETE ALL SAVE DATA? This cannot be undone!')) return;
    if (!confirm('Are you REALLY sure? All progress, ARC, achievements, everything will be lost.')) return;
    _ARC_DB_KEYS.forEach(function(k) { localStorage.removeItem(k); });
    arcoins = 0; credits = gcfg('economy','start_credits',500); zombieKilled = 0; wave = 0;
    updateScoreHUD();
    shooterSpeech('🗑️ All data cleared. Refresh to start fresh.');
  }

  // ── Timed Contracts (WoT-style) ───────────────────────────────────
  const _CONTRACT_POOL = [
    { id:'c_kill15_2h',  type:'kills', target:15, arc:8,  money:200, hours:2, icon:'⚔️', desc:'Kill 15 enemies in 2 hours' },
    { id:'c_kill30_4h',  type:'kills', target:30, arc:15, money:400, hours:4, icon:'⚔️', desc:'Kill 30 enemies in 4 hours' },
    { id:'c_kill60_6h',  type:'kills', target:60, arc:25, money:800, hours:6, icon:'☠️', desc:'Kill 60 enemies in 6 hours' },
    { id:'c_score2k_2h', type:'score', target:2000,arc:10,money:300, hours:2, icon:'🎯', desc:'Score 2,000 points in 2 hours' },
    { id:'c_score8k_4h', type:'score', target:8000,arc:20,money:600, hours:4, icon:'🎯', desc:'Score 8,000 points in 4 hours' },
    { id:'c_wave2_2h',   type:'wave',  target:2,  arc:12, money:250, hours:2, icon:'🌊', desc:'Reach Wave 2 in 2 hours' },
    { id:'c_wave3_4h',   type:'wave',  target:3,  arc:22, money:500, hours:4, icon:'🌊', desc:'Reach Wave 3 in 4 hours' },
    { id:'c_nodeath_2h', type:'nodeath',target:1, arc:18, money:350, hours:2, icon:'🛡️', desc:'Deathless run within 2 hours' },
    { id:'c_headshot20', type:'kills', target:20, arc:14, money:300, hours:3, icon:'💀', desc:'Kill 20 enemies in 3 hours' },
    { id:'c_marathon',   type:'kills', target:100,arc:40, money:1500,hours:6, icon:'🔥', desc:'Kill 100 enemies in 6 hours' },
  ];

  function getContracts() {
    const raw = localStorage.getItem('arc_contracts');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return { active: [], available: [], lastRefresh: 0 };
  }
  function saveContracts(d) { localStorage.setItem('arc_contracts', JSON.stringify(d)); }

  function refreshContractPool() {
    const d = getContracts();
    const now = Date.now();
    // Refresh available pool every 4 hours
    if (d.lastRefresh && (now - d.lastRefresh) < 4 * 3600000 && d.available.length) return d;
    // Pick 3 random contracts not already active
    const activeIds = d.active.map(function(c) { return c.id; });
    const pool = _CONTRACT_POOL.filter(function(c) { return activeIds.indexOf(c.id) === -1; });
    const chosen = [];
    const tmp = pool.slice();
    for (let i = 0; i < Math.min(3, tmp.length); i++) {
      const idx = Math.floor(Math.random() * tmp.length);
      chosen.push(tmp.splice(idx, 1)[0]);
    }
    d.available = chosen;
    d.lastRefresh = now;
    // Expire and penalize timed-out active contracts
    var kept = [];
    d.active.forEach(function(c) {
      if (c.claimed) return; // already claimed, drop
      if (c.expires <= now && !c.done) {
        // CONTRACT FAILED — apply penalty
        var penalty = Math.floor(c.money * 0.5);
        if (credits >= penalty) {
          credits -= penalty;
        } else {
          // Not enough ₴ — auto-loan
          var shortfall = penalty - credits;
          credits = 0;
          var loans = _getLoans();
          if (loans.active.length < 5) { // cap at 5 active loans
            loans.active.push({
              id: 'loan_' + Date.now(),
              amount: shortfall,
              interest: Math.ceil(shortfall * gcfg('economy','loan_interest_rate',0.15)),
              total: shortfall + Math.ceil(shortfall * gcfg('economy','loan_interest_rate',0.15)),
              reason: 'Contract penalty: ' + c.desc,
              taken: Date.now()
            });
            _saveLoans(loans);
          }
        }
        if (typeof updateScoreHUD === 'function') updateScoreHUD();
        return; // drop expired contract
      }
      if (c.expires <= now && c.done) return; // done but unclaimed, drop
      kept.push(c);
    });
    d.active = kept;
    saveContracts(d);
    return d;
  }

  // ── Loans System ──────────────────────────────────────────────────
  function _getLoans() {
    var raw = localStorage.getItem('arc_loans');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return { active: [], paid: [] };
  }
  function _saveLoans(d) { localStorage.setItem('arc_loans', JSON.stringify(d)); }

  function repayLoan(loanId) {
    var loans = _getLoans();
    var idx = loans.active.findIndex(function(l) { return l.id === loanId; });
    if (idx === -1) return;
    var loan = loans.active[idx];
    if (credits < loan.total) { shooterSpeech('₴ Not enough to repay! Need ' + loan.total); return; }
    credits -= loan.total;
    loan.repaid = Date.now();
    loans.paid.push(loan);
    loans.active.splice(idx, 1);
    _saveLoans(loans);
    updateScoreHUD();
    buildInventory();
  }

  function getTotalDebt() {
    var loans = _getLoans();
    return loans.active.reduce(function(s, l) { return s + l.total; }, 0);
  }

  function acceptContract(contractId) {
    const d = refreshContractPool();
    const idx = d.available.findIndex(function(c) { return c.id === contractId; });
    if (idx === -1) return;
    if (d.active.length >= 3) return; // max 3 active
    const contract = d.available.splice(idx, 1)[0];
    contract.accepted = Date.now();
    contract.expires = Date.now() + contract.hours * 3600000;
    contract.progress = 0;
    contract.done = false;
    contract.claimed = false;
    d.active.push(contract);
    saveContracts(d);
    buildInventory();
  }

  function updateContractProgress(type, value) {
    const d = getContracts();
    const now = Date.now();
    let changed = false;
    d.active.forEach(function(c) {
      if (c.done || c.claimed || c.expires < now) return;
      if (c.type !== type) return;
      c.progress = Math.max(c.progress || 0, value);
      if (c.progress >= c.target) { c.done = true; changed = true; }
    });
    if (changed) saveContracts(d);
  }

  function claimContractReward(contractId) {
    const d = getContracts();
    const c = d.active.find(function(x) { return x.id === contractId; });
    if (!c || !c.done || c.claimed) return;
    c.claimed = true;
    saveContracts(d);
    earnArcoin(c.arc, 'Contract: ' + c.desc);
    credits += c.money;
    if (!_$cv) _cacheHudEls();
    _$cv.text(credits);
    if (_$icv.length) _$icv.text(credits.toLocaleString());
    buildInventory();
  }

  // ── Achievements ──────────────────────────────────────────────────
  const _ACHIEVEMENTS = [
    { id:'first_kill',     icon:'🎯', name:'First Blood',       desc:'Get your first kill',            cond:()=>+(localStorage.getItem('arc_total_kills')||0)>=1,           arc:5  },
    { id:'kills_10',       icon:'💀', name:'Killing Spree',      desc:'10 total kills',                 cond:()=>+(localStorage.getItem('arc_total_kills')||0)>=10,          arc:10 },
    { id:'kills_50',       icon:'💥', name:'War Machine',        desc:'50 total kills',                 cond:()=>+(localStorage.getItem('arc_total_kills')||0)>=50,          arc:20 },
    { id:'kills_100',      icon:'🔥', name:'Century Mark',       desc:'100 total kills',                cond:()=>+(localStorage.getItem('arc_total_kills')||0)>=100,         arc:30 },
    { id:'kills_500',      icon:'☠️', name:'Reaper',              desc:'500 total kills',                cond:()=>+(localStorage.getItem('arc_total_kills')||0)>=500,         arc:75 },
    { id:'first_wave',     icon:'🌊', name:'Wave Survivor',      desc:'Survive to wave 1',              cond:()=>+(localStorage.getItem('arc_max_wave')||0)>=1,              arc:5  },
    { id:'wave3',          icon:'⚡', name:'Deep Defender',      desc:'Reach wave 3',                   cond:()=>+(localStorage.getItem('arc_max_wave')||0)>=3,              arc:25 },
    { id:'first_win',      icon:'🏆', name:'Victory!',           desc:'Win your first game',            cond:()=>+(localStorage.getItem('arc_total_wins')||0)>=1,            arc:30 },
    { id:'streak3',        icon:'🔥', name:'Committed',          desc:'3-day login streak',             cond:()=>+(localStorage.getItem('arc_login_streak')||0)>=3,          arc:15 },
    { id:'streak7',        icon:'💎', name:'Veteran',            desc:'7-day login streak',             cond:()=>+(localStorage.getItem('arc_login_streak')||0)>=7,          arc:40 },
    { id:'join_clan',      icon:'🛡️', name:'Band of Brothers',  desc:'Join or create a clan',          cond:()=>!!localStorage.getItem('arc_clan'),                         arc:20 },
    { id:'missions_done',  icon:'📋', name:'Mission Complete',   desc:'Finish all 3 daily missions',    cond:()=>{try{const d=getDailyMissions();return d&&d.every(m=>m.claimed);}catch(e){return false;}}, arc:20 },
    { id:'wallet_link',    icon:'👛', name:'On-Chain Soldier',   desc:'Connect your wallet',            cond:()=>!!localStorage.getItem('arc_wallet_addr'),                  arc:15 },
    { id:'first_arc_claim',icon:'🪙', name:'Claimant',           desc:'Make your first on-chain claim', cond:()=>+(localStorage.getItem('arc_chain_claims')||0)>=1,          arc:25 },
    { id:'earn_100arc',    icon:'₴', name:'ARC Accumulator',    desc:'Earn 100 total ARC',             cond:()=>+(localStorage.getItem('arc_total_earned')||0)>=100,         arc:20 },
    { id:'earn_500arc',    icon:'💎', name:'ARC Whale',          desc:'Earn 500 total ARC',             cond:()=>+(localStorage.getItem('arc_total_earned')||0)>=500,         arc:50 },
    { id:'earn_1000arc',   icon:'👑', name:'ARC Legend',         desc:'Earn 1000 total ARC',            cond:()=>+(localStorage.getItem('arc_total_earned')||0)>=1000,        arc:100},
    { id:'multi_x15',      icon:'🚀', name:'Streak Master',      desc:'Reach ×1.5 earn multiplier',    cond:()=>+(localStorage.getItem('arc_login_streak')||0)>=14,         arc:30 },
    { id:'rank_top10',     icon:'🥇', name:'Elite Ten',          desc:'Top 10 on weekly leaderboard',   cond:()=>+(localStorage.getItem('arc_lb_rank')||999)<=10,            arc:35 },
  ];

  function checkAchievements() {
    var earned; try { earned = JSON.parse(localStorage.getItem('arc_achievements') || '[]'); } catch(e) { earned = []; }
    let changed = false;
    _ACHIEVEMENTS.forEach(function(a) {
      if (!earned.includes(a.id)) {
        try {
          if (a.cond()) {
            earned.push(a.id);
            earnArcoin(a.arc, 'achievement:' + a.id);
            showAchievementBanner(a);
            changed = true;
          }
        } catch(e) {}
      }
    });
    if (changed) localStorage.setItem('arc_achievements', JSON.stringify(earned));
  }

  // Achievement unlock banner (golden toast) with shop CTA
  function showAchievementBanner(a) {
    var $b = $('<div class="achievement-banner">' +
      '<span class="ab-icon">' + (a.icon||'🏆') + '</span>' +
      '<span class="ab-text"><strong>' + a.name + '</strong><br>' + a.desc + '</span>' +
      '<span class="ab-arc">+' + a.arc + ' ARC</span>' +
      '<button class="ab-cta" type="button">🛒 Shop</button></div>');
    $b.find('.ab-cta').on('click', function(e) {
      e.stopPropagation();
      $b.remove();
      _invLastSection = 'inv-sec-shop';
      buildInventory();
    });
    $canves.append($b);
    sndAchievement();
    requestAnimationFrame(function(){ $b.addClass('ab--in'); });
    setTimeout(function(){ $b.addClass('ab--out'); setTimeout(function(){ $b.remove(); }, 600); }, 3500);
  }

  // ── ARC Cosmetics Shop (F15) ──────────────────────────────────────────
  const _COSMETICS = [
    { id:'title_sniper',   cat:'title', icon:'🎯', name:'Sniper',          desc:'Display title: SNIPER',      arc:25  },
    { id:'title_general',  cat:'title', icon:'🎖️', name:'General',         desc:'Display title: GENERAL',     arc:50  },
    { id:'title_legend',   cat:'title', icon:'👑', name:'Legend',          desc:'Display title: LEGEND',      arc:100 },
    { id:'hud_gold',       cat:'skin',  icon:'🟡', name:'Gold HUD',         desc:'Golden HUD accent color',    arc:40  },
    { id:'hud_blue',       cat:'skin',  icon:'🔵', name:'Blue HUD',         desc:'Blue HUD accent color',      arc:30  },
    { id:'hud_red',        cat:'skin',  icon:'🔴', name:'Red HUD',          desc:'Red HUD accent color',       arc:30  },
    { id:'badge_wolf',     cat:'badge', icon:'🐺', name:'Wolf Badge',       desc:'Wolf badge on leaderboard',  arc:35  },
    { id:'badge_eagle',    cat:'badge', icon:'🦅', name:'Eagle Badge',      desc:'Eagle badge on leaderboard', arc:35  },
    { id:'badge_trident',  cat:'badge', icon:'🔱', name:'Trident Badge',    desc:'UA Trident on leaderboard',  arc:50  },
    { id:'vfx_trail_fire', cat:'vfx',   icon:'🔥', name:'Fire Trail',       desc:'Bullet tracer fire trail',   arc:60  },
    { id:'vfx_trail_gold', cat:'vfx',   icon:'✨', name:'Gold Trail',      desc:'Golden bullet tracer',       arc:60  },
    { id:'kill_msg_ua',    cat:'msg',   icon:'🇺🇦', name:'UA Kill Msg',     desc:'"Slava Ukraini!" on kill',   arc:35  },
    { id:'kill_msg_boom',  cat:'msg',   icon:'💥', name:'BOOM Kill Msg',    desc:'"BOOM!" on every kill',      arc:35  },
    { id:'kill_msg_ork',   cat:'msg',   icon:'❤️', name:'Ork Down Msg',     desc:'"One less Ork!" on kill',    arc:40  },
    { id:'xh_neon',        cat:'xhair', icon:'💚', name:'Neon Crosshair',   desc:'Green neon glow crosshair',  arc:35  },
    { id:'xh_laser',       cat:'xhair', icon:'❤️', name:'Laser Crosshair',  desc:'Red laser dot crosshair',    arc:35  },
    { id:'xh_gold',        cat:'xhair', icon:'🟡', name:'Gold Crosshair',   desc:'Golden crosshair + glow',    arc:45  },
    { id:'xh_cyber',       cat:'xhair', icon:'🔷', name:'Cyber Crosshair',  desc:'Cyan cyberpunk crosshair',   arc:40  },
    { id:'xh_fire',        cat:'xhair', icon:'🔥', name:'Fire Crosshair',   desc:'Fiery animated crosshair',   arc:55  },
    { id:'xh_ua',          cat:'xhair', icon:'🇺🇦', name:'UA Crosshair',     desc:'Blue-yellow UA crosshair',   arc:60  },
    // ── Weapon Skins ──
    { id:'wskin_gold_ak',  cat:'wskin', icon:'🔫', name:'Gold Malyuk',         desc:'Golden Malyuk bullpup skin',       arc:40  },
    { id:'wskin_gold_m16', cat:'wskin', icon:'🔫', name:'Gold M4A1',           desc:'Golden M4A1 carbine skin',         arc:40  },
    { id:'wskin_gold_shot',cat:'wskin', icon:'🔫', name:'Gold Benelli M4',     desc:'Golden Benelli M4 skin',           arc:35  },
    { id:'wskin_gold_lmg', cat:'wskin', icon:'🔫', name:'Gold M249 SAW',       desc:'Golden M249 SAW skin',             arc:35  },
    { id:'wskin_gold_revo',cat:'wskin', icon:'🔫', name:'Gold Fort-12',        desc:'Golden Fort-12 pistol skin',       arc:30  },
    { id:'wskin_gold_gl',  cat:'wskin', icon:'🔫', name:'Gold RPG-7V2',        desc:'Golden RPG-7V2 launcher skin',     arc:35  },
    { id:'wskin_diamond_ak',cat:'wskin',icon:'💎', name:'Diamond AKS-74U',     desc:'Diamond AKS-74U Krinkov',          arc:75  },
    { id:'wskin_diamond_m16',cat:'wskin',icon:'💎',name:'Diamond HK416',       desc:'Diamond HK416 NATO rifle',         arc:75  },
    { id:'wskin_diamond_revo',cat:'wskin',icon:'💎',name:'Diamond Fort-17',    desc:'Diamond Fort-17 pistol',           arc:60  },
    { id:'wskin_inferno_m16',cat:'wskin',icon:'🔥',name:'Inferno FN SCAR',     desc:'Flame-wrapped FN SCAR skin',       arc:45  },
    { id:'wskin_inferno_ak',cat:'wskin',icon:'🔥', name:'Inferno RPK-74',      desc:'Flame-wrapped RPK-74 skin',        arc:45  },
    { id:'wskin_arctic_shot',cat:'wskin',icon:'❄️',name:'Arctic KS-23',        desc:'Ice-blue KS-23 special shotgun',   arc:45  },
    { id:'wskin_arctic_lmg',cat:'wskin',icon:'❄️', name:'Arctic PKM',          desc:'Ice-blue PKM machine gun',         arc:45  },
    { id:'wskin_shadow_ak',cat:'wskin', icon:'🌑', name:'Shadow Vepr',         desc:'Dark shadow Vepr AK skin',         arc:45  },
    { id:'wskin_shadow_revo',cat:'wskin',icon:'🌑',name:'Shadow Glock-17',     desc:'Dark shadow Glock-17 skin',        arc:40  },
    // ── Premium Legendary ──
    { id:'title_supreme',  cat:'title', icon:'💠', name:'Supreme',          desc:'Animated SUPREME title',         arc:250 },
    { id:'hud_diamond',    cat:'skin',  icon:'💎', name:'Diamond HUD',       desc:'Diamond-encrusted HUD theme',    arc:200 },
    { id:'vfx_nuke',       cat:'vfx',   icon:'☢️', name:'Nuke VFX',          desc:'Nuclear kill explosion effect',   arc:300 },
    { id:'xh_supreme',     cat:'xhair', icon:'💠', name:'Supreme Crosshair', desc:'Animated diamond crosshair',     arc:500 },
    { id:'wskin_supreme_ak',cat:'wskin', icon:'💠', name:'Supreme Malyuk',    desc:'Animated supreme Malyuk skin',    arc:750 },
    // ── Consumable Boosts ──
    { id:'boost_xp2x',    cat:'boost', icon:'⚡', name:'2× ARC Boost',     desc:'Double ARC earn for 5 min',  arc:15, consumable:true },
    { id:'boost_shield',  cat:'boost', icon:'🛡️', name:'Shield Recharge',  desc:'+50 HP instant heal',        arc:10, consumable:true },
    { id:'boost_ammo',    cat:'boost', icon:'🔋', name:'Ammo Resupply',    desc:'+5 mags all weapons',        arc:8,  consumable:true },
    { id:'boost_drone',   cat:'boost', icon:'🚁', name:'Instant Drone',    desc:'Call drone strike now',      arc:12, consumable:true },
    { id:'boost_combo',   cat:'boost', icon:'🔥', name:'Combo Freeze',     desc:'Combo timer paused 30s',     arc:10, consumable:true },
    // ── BP-Exclusive Cosmetics (not sold in shop) ──
    { id:'title_founder', cat:'title', icon:'🏴', name:'Founder',          desc:'Display title: FOUNDER',     arc:0, bpExclusive:true  },
    { id:'name_gold',     cat:'skin',  icon:'✨', name:'Gold Name',        desc:'Golden name plate',          arc:0, bpExclusive:true  },
    { id:'xh_bp_s1',      cat:'xhair', icon:'🎖️', name:'BP Crosshair S1',  desc:'Season 1 BP crosshair',      arc:0, bpExclusive:true  },
    { id:'title_bp_s1',   cat:'title', icon:'💎', name:'BP Diamond',       desc:'Season 1 Diamond title',     arc:0, bpExclusive:true  },
  ];

  function getCosmeticsOwned() {
    try { return JSON.parse(localStorage.getItem('arc_cosmetics') || '[]'); } catch(e) { return []; }
  }
  const getOwnedCosmetics = getCosmeticsOwned;
  function buyCosmetic(id) {
    const owned = getCosmeticsOwned();
    if (owned.includes(id)) { shooterSpeech('Already owned!'); return; }
    const c = _COSMETICS.find(x => x.id === id);
    if (!c) return;
    const bal = +(localStorage.getItem('arc_balance') || 0);
    if (bal < c.arc) { sndError(); showArcUpsell(c.arc); return; }
    // Consumable items: activate effect, don't add to permanent ownership
    if (c.consumable) {
      const newBal = bal - c.arc;
      localStorage.setItem('arc_balance', String(newBal));
      arcoins = newBal;
      updateCoinHUD(false);
      if (c.id === 'boost_xp2x') _xpBoostEnd = Date.now() + 5 * 60 * 1000;
      else if (c.id === 'boost_shield') { shooterHp = Math.min(100, shooterHp + 50); if (typeof updateShooterHpBar === 'function') updateShooterHpBar(); }
      else if (c.id === 'boost_ammo') { Object.keys(ammoReserve).forEach(function(k){ ammoReserve[k] += 5; }); if (typeof renderAmmoUI === 'function') renderAmmoUI(); }
      else if (c.id === 'boost_drone') { if (typeof spawnDrone === 'function') spawnDrone(3, 15, 3.5); }
      else if (c.id === 'boost_combo') { clearTimeout(_comboTimer); setTimeout(function(){ _comboKills = 0; _comboMultiLive = 1.0; _updateComboHUD(); }, 30000); }
      sndPurchase();
      shooterSpeech('⚡ ' + c.name + ' activated!');
      buildInventory();
      return;
    }
    owned.push(id);
    localStorage.setItem('arc_cosmetics', JSON.stringify(owned));
    const newBal = bal - c.arc;
    localStorage.setItem('arc_balance', String(newBal));
    arcoins = newBal;
    updateCoinHUD(false);
    sndPurchase();
    shooterSpeech('✨ ' + c.name + ' unlocked!');
    _applyCosmetics();
  }
  function equipCosmetic(id, cat) {
    localStorage.setItem('arc_cos_equipped_' + cat, id);
    _applyCosmetics();
    buildInventory();
    shooterSpeech('✅ Equipped!');
  }
  window.equipCosmetic = equipCosmetic;
  function _applyCosmetics() {
    const owned = getCosmeticsOwned();
    // Apply HUD skin — respect player's equipped choice
    $('body').removeClass('hud-gold hud-blue hud-red hud-diamond');
    var _eqSkin = localStorage.getItem('arc_cos_equipped_skin') || '';
    if (_eqSkin && owned.includes(_eqSkin)) {
      if (_eqSkin === 'hud_gold') $('body').addClass('hud-gold');
      else if (_eqSkin === 'hud_blue') $('body').addClass('hud-blue');
      else if (_eqSkin === 'hud_red') $('body').addClass('hud-red');
      else if (_eqSkin === 'hud_diamond') $('body').addClass('hud-diamond');
    } else {
      if (owned.includes('hud_diamond')) $('body').addClass('hud-diamond');
      else if (owned.includes('hud_gold')) $('body').addClass('hud-gold');
      else if (owned.includes('hud_blue')) $('body').addClass('hud-blue');
      else if (owned.includes('hud_red')) $('body').addClass('hud-red');
    }
    // Active title — respect equipped choice
    const titles = ['title_supreme','title_legend','title_general','title_sniper'];
    window._activeTitle = '';
    var _eqTitle = localStorage.getItem('arc_cos_equipped_title') || '';
    if (_eqTitle && owned.includes(_eqTitle)) {
      var _tc = _COSMETICS.find(x=>x.id===_eqTitle);
      if (_tc) window._activeTitle = _tc.name.toUpperCase();
    } else {
      for (const t of titles) { if (owned.includes(t)) { window._activeTitle = _COSMETICS.find(x=>x.id===t).name.toUpperCase(); break; } }
    }
    // Active badge — respect equipped choice
    const badges = ['badge_trident','badge_eagle','badge_wolf'];
    window._activeBadge = '';
    var _eqBadge = localStorage.getItem('arc_cos_equipped_badge') || '';
    if (_eqBadge && owned.includes(_eqBadge)) {
      var _bc = _COSMETICS.find(x=>x.id===_eqBadge);
      if (_bc) window._activeBadge = _bc.icon;
    } else {
      for (const b of badges) { if (owned.includes(b)) { window._activeBadge = _COSMETICS.find(x=>x.id===b).icon; break; } }
    }
    // Kill messages
    var _eqKill = localStorage.getItem('arc_cos_equipped_killmsg') || '';
    if (_eqKill && owned.includes(_eqKill)) window._killMsgId = _eqKill;
    else window._killMsgId = owned.includes('kill_msg_ua') ? 'kill_msg_ua' : owned.includes('kill_msg_boom') ? 'kill_msg_boom' : owned.includes('kill_msg_ork') ? 'kill_msg_ork' : '';
    // Crosshair skins — respect equipped choice
    $('body').removeClass('xh-neon xh-laser xh-gold xh-cyber xh-fire xh-ua xh-supreme');
    var xhSkins = ['xh_supreme','xh_ua','xh_fire','xh_gold','xh_cyber','xh_laser','xh_neon'];
    var _eqXh = localStorage.getItem('arc_cos_equipped_crosshair') || '';
    if (_eqXh && owned.includes(_eqXh)) { $('body').addClass(_eqXh.replace('_','-')); }
    else { for (var xi = 0; xi < xhSkins.length; xi++) { if (owned.includes(xhSkins[xi])) { $('body').addClass(xhSkins[xi].replace('_','-')); break; } } }
  }

  // ── ARC Staking Simulator (F13) ──────────────────────────────────────
  const _STAKE_PLANS = [
    { id:'s7',  days:7,  apr:gcfg('staking','apr_7d',12), label:'Flexible (7d)',  icon:'🟢' },
    { id:'s30', days:30, apr:gcfg('staking','apr_30d',24), label:'Standard (30d)', icon:'🟡' },
    { id:'s90', days:90, apr:gcfg('staking','apr_90d',48), label:'Power (90d)',   icon:'🔴' },
  ];

  function getStakeData() {
    try { return JSON.parse(localStorage.getItem('arc_stakes') || '[]'); } catch(e) { return []; }
  }
  function saveStakeData(d) { localStorage.setItem('arc_stakes', JSON.stringify(d)); }

  function createStake(planId, amount) {
    const plan = _STAKE_PLANS.find(p => p.id === planId);
    if (!plan) { shooterSpeech('Invalid staking plan'); return; }
    const bal = +(localStorage.getItem('arc_balance') || 0);
    if (amount < 10) { shooterSpeech('Minimum stake is 10 ARC'); return; }
    if (amount > bal) { shooterSpeech('Insufficient ARC (' + bal + ')'); return; }
    const stakes = getStakeData();
    const now = Date.now();
    stakes.push({ id: planId + '_' + now, planId, amount, startTs: now, endTs: now + plan.days*86400000, apr: plan.apr, label: plan.label, claimed: false });
    // deduct from balance
    const newBal = bal - amount;
    localStorage.setItem('arc_balance', String(newBal));
    arcoins = newBal;
    updateCoinHUD(false);
    saveStakeData(stakes);
    shooterSpeech('📈 Staked ' + amount + ' ARC!');
    buildInventory();
  }

  function _stakePlanDays(apr) {
    var p = _STAKE_PLANS.find(function(x){return x.apr===apr;});
    return p ? p.days : 7;
  }
  function claimStake(stakeId) {
    const stakes = getStakeData();
    const s = stakes.find(x => x.id === stakeId);
    if (!s || s.claimed) return;
    const now = Date.now();
    const mature = now >= s.endTs;
    const elapsed = Math.min(1, (now - s.startTs) / (s.endTs - s.startTs));
    const planDays = _stakePlanDays(s.apr);
    const fullYield = Math.round(s.amount * s.apr / 100 * planDays / 365);
    if (!mature) {
      // Early withdrawal: 25% principal penalty, no yield
      var penalty = Math.round(s.amount * gcfg('staking','early_penalty_pct',0.25));
      var returned = s.amount - penalty;
      if (!confirm('⚠️ Early withdrawal! You lose 25% of principal (' + penalty + ' ARC) and get NO yield. Return: ' + returned + ' ARC. Continue?')) return;
      s.claimed = true;
      s.earlyWithdraw = true;
      s.penalty = penalty;
      saveStakeData(stakes);
      earnArcoin(returned, 'Stake early exit: -' + penalty + ' ARC penalty', { rawAmount: true, bypassCaps: true, uncappedBase: returned, trackEarnAmount: 0 });
      shooterSpeech('⚠️ -' + penalty + ' ARC penalty!');
    } else {
      var yieldArc = fullYield;
      var total = s.amount + yieldArc;
      s.claimed = true;
      saveStakeData(stakes);
      earnArcoin(total, 'Stake claim: ' + s.label + ' +' + yieldArc + ' yield', { rawAmount: true, uncappedBase: s.amount, trackEarnAmount: yieldArc });
      shooterSpeech('✅ +' + yieldArc + ' ARC yield!');
    }
    buildInventory();
  }
  // Expose staking functions to window so inline onclick handlers work
  window.createStake = createStake;
  window.claimStake  = claimStake;

  // ── Staking maturity auto-check on load ──────────────────────────
  (function checkStakingMaturity() {
    var stakes = getStakeData();
    var changed = false;
    stakes.forEach(function(s) {
      if (s.claimed) return;
      if (Date.now() >= s.endTs) {
        var planDays = _stakePlanDays(s.apr);
        var yieldArc = Math.round(s.amount * s.apr / 100 * planDays / 365);
        s.claimed = true;
        s.autoMatured = true;
        earnArcoin(s.amount + yieldArc, 'Staking matured: ' + s.label + ' +' + yieldArc + ' yield', { rawAmount: true, uncappedBase: s.amount, trackEarnAmount: yieldArc });
        changed = true;
        setTimeout(function() { shooterSpeech('✅ Stake matured! +' + yieldArc + ' ARC yield!'); }, 1500);
      }
    });
    if (changed) saveStakeData(stakes);
  })();
  // Expose all other onclick-called functions to window scope
  window.doPrestige         = doPrestige;
  window.repayLoan          = repayLoan;
  window.buyCosmetic        = buyCosmetic;
  window.claimArcOnChain    = claimArcOnChain;
  window.claimMissionReward = claimMissionReward;
  window.claimContractReward = claimContractReward;
  window.acceptContract     = acceptContract;
  window.createClan         = createClan;
  window.joinClanByCode     = joinClanByCode;
  window.leaveClan          = leaveClan;
  window.claimBpReward      = claimBpReward;
  window.unlockPremiumPass  = unlockPremiumPass;
  window.createPvpChallenge = createPvpChallenge;

  // ── Prestige System ──────────────────────────────────────────────────
  function getPrestigeData() {
    const lvl = +(localStorage.getItem('arc_prestige') || 0);
    const multi = Math.min(3.0, 1.0 + lvl * 0.05);  // +5% per level, cap ×3.0
    return { level: lvl, multiplier: multi };
  }
  function getPrestigeMulti() { return getPrestigeData().multiplier; }

  function doPrestige() {
    const maxWave = +(localStorage.getItem('arc_max_wave') || 0);
    if (maxWave < 3) {
      shooterSpeech('Reach Wave 3 first to prestige!');
      return;
    }
    const pd = getPrestigeData();
    if (pd.level >= 40) {
      shooterSpeech('Max prestige level 40 reached!');
      return;
    }
    if (!confirm('Prestige to level ' + (pd.level + 1) + '? This resets kills/wave/wins but keeps ARC, achievements, missions. You gain +5% ARC multiplier (×' + pd.multiplier.toFixed(2) + ' -> x' + Math.min(3.0, pd.multiplier + 0.05).toFixed(2) + ').')) return;
    const bonus = gcfg('prestige','bonus_base',50) + pd.level * gcfg('prestige','bonus_per_level',10);
    const newLvl = pd.level + 1;
    localStorage.setItem('arc_prestige', String(newLvl));
    // Reset stat counters (keep history/achievements/ARC balance)
    localStorage.removeItem('arc_total_kills');
    localStorage.removeItem('arc_max_wave');
    localStorage.removeItem('arc_total_wins');
    // Reset in-memory game vars so prestige takes effect immediately
    zombieKilled = 0;
    wave = 0;
    score = 0;
    life = gcfg('economy','start_lives',3) === 3 ? 100 : gcfg('economy','start_hp',100);
    credits = gcfg('economy','start_credits',500);
    updateScoreHUD();
    earnArcoin(bonus, 'Prestige ' + newLvl + ' bonus!');
    shooterSpeech('🌟 PRESTIGE ' + newLvl + '! +' + bonus + ' ARC · x' + Math.min(3.0, 1.0 + newLvl*0.05).toFixed(2) + ' earn rate');
    buildInventory();
  }

  // ── Clan / Squad System ─────────────────────────────────────────
  const _CLAN_SEED = [
    { name:'Banderivets_UA', wave:4, score:9840, kills:180, arc:42 },
    { name:'DrohneKiller',   wave:4, score:8720, kills:165, arc:38 },
    { name:'GhostOfKyiv',    wave:4, score:8210, kills:158, arc:35 },
    { name:'SlavaNation',    wave:3, score:6580, kills:129, arc:24 },
    { name:'StalkerZSU',     wave:3, score:5910, kills:112, arc:18 },
  ];
  function getClanData() {
    const raw = localStorage.getItem('arc_clan');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }
  function saveClanData(d) {
    localStorage.setItem('arc_clan', JSON.stringify(d));
  }
  function createClan(name, tag) {
    if (!name || !tag) { shooterSpeech('Enter clan name and tag!'); return; }
    name = name.slice(0, 24).trim();
    tag  = tag.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (getClanData()) { if (!confirm('Leave current clan and create a new one?')) return; }
    const _myName = localStorage.getItem('arc_username') || 'Fighter';
    const _code   = tag + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
    const _member = { name: _myName, wave, score, kills: zombieKilled, arc: arcoins, joined: new Date().toLocaleDateString(), isLeader: true };
    const _members = [_member, ..._CLAN_SEED];
    saveClanData({ name, tag, code: _code, created: new Date().toLocaleDateString(), members: _members, leader: _myName });
    buildInventory();
  }
  function joinClanByCode(code) {
    code = (code || '').trim().toUpperCase();
    if (!code) { shooterSpeech('Enter an invite code!'); return; }
    const _myName = localStorage.getItem('arc_username') || 'Fighter';
    const _tag = code.split('-')[0] || 'CLAN';
    const _name = 'Squad ' + _tag;
    const _member = { name: _myName, wave, score, kills: zombieKilled, arc: arcoins, joined: new Date().toLocaleDateString(), isLeader: false };
    const _members = [_member, ..._CLAN_SEED];
    saveClanData({ name: _name, tag: _tag, code, created: new Date().toLocaleDateString(), members: _members, leader: '' });
    buildInventory();
  }
  function leaveClan() {
    showConfirm({ title: 'Leave Clan?', body: 'Are you sure you want to leave your clan?', danger: true, confirmTxt: 'Leave',
      onConfirm: function() { localStorage.removeItem('arc_clan'); buildInventory(); }
    });
  }
  function updateClanWithLastGame() {
    const d = getClanData();
    if (!d) return;
    const _myName = localStorage.getItem('arc_username') || 'Fighter';
    const me = d.members.find(function(m) { return m.name === _myName; });
    if (me) { if (score > (me.score || 0)) me.score = score; me.kills = (me.kills||0) + zombieKilled; me.arc = arcoins; me.wave = wave; }
    saveClanData(d);
  }

  // ── Daily Login Streak System ─────────────────────────────────
  // Kill-to-Earn NFT multiplier tiers (mirrors ARC_KillNFT.sol)
  const _KILL_NFT_TIERS = [
    { tier:1, kills:   25, icon:'🎯', name:'Rookie',  multi:1.05 },
    { tier:2, kills:  100, icon:'💥', name:'Fighter', multi:1.10 },
    { tier:3, kills:  250, icon:'🔥', name:'Veteran', multi:1.25 },
    { tier:4, kills:  500, icon:'☠️', name:'Elite',   multi:1.50 },
    { tier:5, kills: 1000, icon:'👑', name:'Legend',  multi:2.00 },
  ];
  function getKillNftMulti() {
    const totalKills = (getBpData && getBpData().totalKills) || 0;
    let best = 1.0;
    _KILL_NFT_TIERS.forEach(function(t) {
      if (totalKills >= t.kills && t.multi > best) best = t.multi;
    });
    return best;
  }
  function getKillNftTier() {
    const totalKills = (getBpData && getBpData().totalKills) || 0;
    let tier = null;
    _KILL_NFT_TIERS.forEach(function(t) { if (totalKills >= t.kills) tier = t; });
    return tier;
  }

  const _STREAK_BADGES = [
    { days: 3,   id: 'trooper',  icon: '🎯', name: 'Front Line Trooper', multi: 1.05, arc: 2   },
    { days: 7,   id: 'veteran',  icon: '⚔️',  name: '7-Day Veteran',      multi: 1.10, arc: 5   },
    { days: 14,  id: 'hero',     icon: '🦁', name: '2-Week Hero',         multi: 1.20, arc: 10  },
    { days: 30,  id: 'legend',   icon: '🏆', name: 'Month Legend',        multi: 1.35, arc: 25  },
    { days: 100, id: 'immortal', icon: '🇺🇦', name: 'Immortal Defender',  multi: 1.60, arc: 100 },
  ];

  function initLoginStreak() {
    var _now       = new Date();
    var todayStr   = _now.getFullYear() + '-' + String(_now.getMonth()+1).padStart(2,'0') + '-' + String(_now.getDate()).padStart(2,'0');
    const lastLogin  = localStorage.getItem('arc_last_login');
    let   streak     = parseInt(localStorage.getItem('arc_login_streak') || '0', 10);
    let   isNewDay   = false;

    if (!lastLogin) {
      streak = 1;  // First ever login
    } else if (lastLogin === todayStr) {
      // Already recorded today — nothing to do
    } else {
      var _yd = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - 1);
      var yesterday = _yd.getFullYear() + '-' + String(_yd.getMonth()+1).padStart(2,'0') + '-' + String(_yd.getDate()).padStart(2,'0');
      isNewDay = true;
      if (lastLogin === yesterday) {
        streak += 1;  // Consecutive — extend streak
      } else {
        streak = 1;   // Gap — streak broken, restart from 1
      }
    }

    localStorage.setItem('arc_last_login', todayStr);
    localStorage.setItem('arc_login_streak', String(streak));

    // Check for newly earned milestone badges
    var badges; try { badges = JSON.parse(localStorage.getItem('arc_streak_badges') || '[]'); } catch(e) { badges = []; }
    _STREAK_BADGES.forEach(b => {
      if (streak >= b.days && !badges.includes(b.id)) {
        badges.push(b.id);
        localStorage.setItem('arc_streak_badges', JSON.stringify(badges));
        setTimeout(() => {
          earnArcoin(b.arc, b.days + '-day streak: ' + b.name);
          shooterSpeech('🔥 ' + b.days + '-DAY STREAK! ' + b.icon + ' +' + b.arc + ' ARC BONUS!');
        }, 2500);
      }
    });

    // Update earn rate multiplier from highest badge earned
    const topBadge = _STREAK_BADGES.slice().reverse().find(b => badges.includes(b.id));
    arcStreakMulti = topBadge ? topBadge.multi : 1.0;
    localStorage.setItem('arc_streak_multi', String(arcStreakMulti));

    // Update streak HUD indicator
    if (streak > 1) { $('#streak-hud').text('🔥' + streak).show(); }

    // Daily streak continuation bonus ARC (only on a new consecutive day)
    if (isNewDay && streak > 1) {
      const bonus = Math.min(5, 1 + Math.floor(streak / 7));
      setTimeout(() => {
        earnArcoin(bonus, '🔥 Day ' + streak + ' login streak bonus!');
        shooterSpeech('🔥 DAY ' + streak + ' STREAK! +' + bonus + ' ARC!');
      }, 2000);
    }
  }

  // ── Weekly Leaderboard ───────────────────────────────────────────
  const _LB_SEED = [
    { name:'Banderivets_UA', country:'🇺🇦', wave:4, kills:180, score:9840, arc:42, title:'Legend',  badge:'🔱', cosm:6 },
    { name:'DrohneKiller',   country:'🇩🇪', wave:4, kills:165, score:8720, arc:38, title:'General', badge:'🦅', cosm:4 },
    { name:'GhostOfKyiv',    country:'🇺🇦', wave:4, kills:158, score:8210, arc:35, title:'Sniper',  badge:'🐺', cosm:3 },
    { name:'NATOStrike',     country:'🇺🇸', wave:3, kills:142, score:7450, arc:30, title:'General', badge:'🦅', cosm:5 },
    { name:'Azov_Mariupol',  country:'🇺🇦', wave:3, kills:136, score:7100, arc:28, title:'',        badge:'🔱', cosm:2 },
    { name:'SlavaNation',    country:'🇺🇦', wave:3, kills:129, score:6580, arc:24, title:'Sniper',  badge:'',   cosm:1 },
    { name:'BritSlapper',    country:'🇬🇧', wave:3, kills:121, score:6100, arc:22, title:'',        badge:'',   cosm:0 },
    { name:'CanadaCares',    country:'🇨🇦', wave:2, kills:108, score:5400, arc:20, title:'',        badge:'🐺', cosm:2 },
    { name:'Bayraktar88',    country:'🇹🇷', wave:2, kills:95,  score:4720, arc:18, title:'',        badge:'',   cosm:0 },
    { name:'PolskaFirst',    country:'🇵🇱', wave:2, kills:88,  score:4300, arc:16, title:'',        badge:'',   cosm:1 },
    { name:'KrakenUA',       country:'🇺🇦', wave:2, kills:82,  score:3980, arc:14, title:'Sniper',  badge:'',   cosm:3 },
    { name:'EuroVolunteer',  country:'🇪🇺', wave:1, kills:74,  score:3400, arc:12, title:'',        badge:'',   cosm:0 },
    { name:'FreedomHawk',    country:'🇺🇸', wave:1, kills:65,  score:2900, arc:10, title:'',        badge:'',   cosm:0 },
    { name:'LvivDefender',   country:'🇺🇦', wave:1, kills:52,  score:2200, arc:8,  title:'',        badge:'',   cosm:0 },
  ];

  function submitLeaderboard() {
    const name  = localStorage.getItem('arc_username') || 'Fighter';
    const _ownedCosm = getCosmeticsOwned();
    const entry = {
      name, country: '🏳️', wave: wave, kills: zombieKilled,
      score: score, arc: arcoins,
      streak: parseInt(localStorage.getItem('arc_login_streak') || '0', 10),
      title: window._activeTitle || '', badge: window._activeBadge || '',
      cosm: _ownedCosm ? _ownedCosm.length : 0,
      ts: Date.now()
    };
    var lb; try { lb = JSON.parse(localStorage.getItem('arc_leaderboard') || '[]'); } catch(e) { lb = []; }
    const idx = lb.findIndex(e => e.name === name);
    if (idx >= 0) { if (entry.score > lb[idx].score) lb[idx] = entry; }
    else           { lb.push(entry); }
    lb.sort((a, b) => b.score - a.score);
    localStorage.setItem('arc_leaderboard', JSON.stringify(lb.slice(0, 50)));
    const _myRankIdx = lb.findIndex(e => e.name === name);
    if (_myRankIdx >= 0) localStorage.setItem('arc_lb_rank', String(_myRankIdx + 1));
  }

  function getLeaderboard() {
    var local; try { local = JSON.parse(localStorage.getItem('arc_leaderboard') || '[]'); } catch(e) { local = []; }
    const merged = [..._LB_SEED, ...local];
    const seen   = new Set();
    return merged.filter(e => { if (seen.has(e.name)) return false; seen.add(e.name); return true; })
                 .sort((a, b) => b.score - a.score);
  }

  // ── Battle Pass ──────────────────────────────────────────────────
  const _BP_SEASON = 1;
  const _BP_FREE_TIERS = [
    { tier:1, killReq:  25, reward:'5 ARC',   arc:5,   icon:'⚡', label:'ROOKIE'   },
    { tier:2, killReq:  75, reward:'10 ARC',  arc:10,  icon:'💥', label:'FIGHTER'  },
    { tier:3, killReq: 150, reward:'20 ARC + 🎯 BP Crosshair', arc:20,  icon:'🔥', label:'VETERAN', cosmetic:'xh_bp_s1' },
    { tier:4, killReq: 300, reward:'35 ARC',  arc:35,  icon:'☠️', label:'ELITE'    },
    { tier:5, killReq: 500, reward:'60 ARC',  arc:60,  icon:'👑', label:'LEGEND'   },
  ];
  const _BP_PREM_TIERS = [
    { tier:1,  killReq:  10, reward:'3 ARC',   arc:3,   icon:'🪙', label:'PREM I'    },
    { tier:2,  killReq:  30, reward:'7 ARC',   arc:7,   icon:'🪙', label:'PREM II'   },
    { tier:3,  killReq:  60, reward:'12 ARC',  arc:12,  icon:'🪙', label:'PREM III'  },
    { tier:4,  killReq: 100, reward:'18 ARC',  arc:18,  icon:'🏅', label:'PREM IV'   },
    { tier:5,  killReq: 175, reward:'25 ARC',  arc:25,  icon:'🏅', label:'PREM V'    },
    { tier:6,  killReq: 250, reward:'35 ARC',  arc:35,  icon:'🏅', label:'PREM VI'   },
    { tier:7,  killReq: 350, reward:'50 ARC',  arc:50,  icon:'💎', label:'PREM VII'  },
    { tier:8,  killReq: 450, reward:'65 ARC',  arc:65,  icon:'💎', label:'PREM VIII' },
    { tier:9,  killReq: 600, reward:'85 ARC',  arc:85,  icon:'💎', label:'PREM IX'   },
    { tier:10, killReq: 800, reward:'150 ARC + 💎 BP Diamond Title', arc:150, icon:'🌟', label:'PREM X', cosmetic:'title_bp_s1' },
  ];
  const _BP_PREM_COST = gcfg('battlepass', 'premium_cost', 100);

  function getBpData() {
    const raw = localStorage.getItem('arc_battlepass_s' + _BP_SEASON);
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return { premium:false, freeClaimed:[], premClaimed:[], totalKills:0 };
  }
  function saveBpData(d) {
    localStorage.setItem('arc_battlepass_s' + _BP_SEASON, JSON.stringify(d));
  }
  function addBpKills(n) {
    const d = getBpData();
    d.totalKills = (d.totalKills || 0) + n;
    saveBpData(d);
  }
  // ── BP mid-game progress toasts ──────────────────────────────────
  var _bpLastToast = 0;
  function _checkBpProgress(sessionKills) {
    var d = getBpData();
    var projected = (d.totalKills || 0) + sessionKills;
    var tiers = _BP_FREE_TIERS;
    if (d.premium) tiers = tiers.concat(_BP_PREM_TIERS);
    tiers.sort(function(a,b){ return a.killReq - b.killReq; });
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (projected >= t.killReq && projected - sessionKills < t.killReq && t.killReq > _bpLastToast) {
        _bpLastToast = t.killReq;
        shooterSpeech('🎖 BP ' + t.label + ' unlocked! ' + t.reward);
        return;
      }
      var diff = t.killReq - projected;
      if (diff > 0 && diff <= 5 && t.killReq > _bpLastToast) {
        _bpLastToast = t.killReq;
        shooterSpeech('🎖 ' + diff + ' kill' + (diff>1?'s':'') + ' to BP ' + t.label + '!');
        return;
      }
    }
  }
  function unlockPremiumPass() {
    const d = getBpData();
    if (d.premium) return;
    if (arcoins < _BP_PREM_COST) { showArcUpsell(_BP_PREM_COST, function(){ unlockPremiumPass(); }); return; }
    arcoins -= _BP_PREM_COST;
    localStorage.setItem('arc_balance', String(arcoins));
    d.premium = true;
    saveBpData(d);
    updateCoinHUD(false);
    openInventory('inv-sec-battlepass');
  }
  function claimBpReward(track, tier) {
    const d     = getBpData();
    const tiers   = track === 'free' ? _BP_FREE_TIERS : _BP_PREM_TIERS;
    const claimed = track === 'free' ? d.freeClaimed  : d.premClaimed;
    const t = tiers.find(x => x.tier === tier);
    if (!t) return;
    if (claimed.includes(tier)) return;
    if (d.totalKills < t.killReq)  return;
    if (track === 'prem' && !d.premium) return;
    claimed.push(tier);
    saveBpData(d);
    earnArcoin(t.arc, 'Battle Pass Tier ' + tier);
    // Grant cosmetic if tier has one
    if (t.cosmetic) {
      var cOwned = getCosmeticsOwned();
      if (!cOwned.includes(t.cosmetic)) {
        cOwned.push(t.cosmetic);
        localStorage.setItem('arc_cosmetics', JSON.stringify(cOwned));
        _applyCosmetics();
        shooterSpeech('✨ BP Exclusive: ' + t.cosmetic + ' unlocked!');
      }
    }
    openInventory('inv-sec-battlepass');
  }

  // ── ARC On-Chain Claim ───────────────────────────────────────────
  const ARC_CLAIM_LIMITS = {
    daily: 150,
    weekly: 800,
  };

  function _getArcClaimWindowState() {
    let log;
    try { log = JSON.parse(localStorage.getItem('arc_chain_claim_log') || '[]'); } catch(e) { log = []; }
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const activeLog = log.filter(function(entry) { return entry && entry.ts >= weekAgo; });
    const todayKey = _todayKey();
    const daily = activeLog.reduce(function(sum, entry) {
      return sum + (entry.dayKey === todayKey ? (entry.amount || 0) : 0);
    }, 0);
    const weekly = activeLog.reduce(function(sum, entry) { return sum + (entry.amount || 0); }, 0);
    return { log: activeLog, daily: daily, weekly: weekly };
  }

  async function claimArcOnChain() {
    if (!walletAddr) { openInventory('inv-sec-wallet'); return; }
    if (arcoins < 1) { shooterSpeech('No ARC to claim yet!'); return; }
    let _claims; try { _claims = JSON.parse(localStorage.getItem('arc_chain_claims') || '[]'); } catch(e) { _claims = []; }
    const _claimWindow = _getArcClaimWindowState();
    const _dailyRemaining = Math.max(0, ARC_CLAIM_LIMITS.daily - _claimWindow.daily);
    const _weeklyRemaining = Math.max(0, ARC_CLAIM_LIMITS.weekly - _claimWindow.weekly);
    const _claimAmt = Math.min(arcoins, _dailyRemaining, _weeklyRemaining);
    if (_claimAmt < 1) { shooterSpeech('🪙 Claim cap reached. Try again tomorrow.'); return; }
    const _msg = 'Claim ' + _claimAmt + ' ARC to ' + walletAddr + ' at ' + Date.now();
    showConfirm({
      title: 'Claim ARC On-Chain',
      body: 'You are about to claim <strong>' + _claimAmt + ' ARC</strong> to:<br>'
          + '<code style="color:#FFD700;font-size:11px">' + walletAddr.slice(0,10) + '...' + walletAddr.slice(-6) + '</code><br><br>'
          + (_claimAmt < arcoins ? 'Claim throttled by anti-whale limits. Daily remaining: <strong>' + _dailyRemaining + ' ARC</strong>. Weekly remaining: <strong>' + _weeklyRemaining + ' ARC</strong>.<br><br>' : '')
          + 'MetaMask will ask you to <strong>sign a message</strong> (no gas). '
          + 'Your ARC is queued for the Token Generation Event.',
      confirmTxt: 'Sign & Claim',
      onConfirm: async function() {
        try {
          const _sig = await window.ethereum.request({
            method: 'personal_sign',
            params: [_msg, walletAddr]
          });
          const _tx = '0x' + Array.from({length:64}, () =>
            Math.floor(Math.random()*16).toString(16)).join('');
          _claims.push({
            addr: walletAddr, amount: _claimAmt,
            ts: Date.now(), date: new Date().toLocaleDateString(),
            sig: _sig.slice(0,22) + '...', txHash: _tx, status: 'pending'
          });
          localStorage.setItem('arc_chain_claims', JSON.stringify(_claims.slice(-20)));
          _claimWindow.log.push({ ts: Date.now(), dayKey: _todayKey(), amount: _claimAmt });
          localStorage.setItem('arc_chain_claim_log', JSON.stringify(_claimWindow.log.slice(-40)));
          arcoins -= _claimAmt;
          arcoinLedger.push({ ts: Date.now(), amount: -_claimAmt, reason: 'On-chain claim' });
          localStorage.setItem('arc_balance', String(arcoins));
          try { localStorage.setItem('arc_ledger', JSON.stringify(arcoinLedger.slice(-100))); } catch(e) {}
          updateCoinHUD(false);
          openInventory('inv-sec-wallet');
        } catch(_e) {
          shooterSpeech('Claim cancelled: ' + (_e.message || 'rejected'));
        }
      }
    });
  }

  // ── Custom Confirmation Dialog ─────────────────────────────────
  function showConfirm(opts) {
    const $ov = $('<div class="confirm-overlay" role="alertdialog" aria-modal="true"></div>');
    const $bx = $('<div class="confirm-box"></div>');
    const okTxt  = opts.confirmTxt !== undefined ? opts.confirmTxt : 'Confirm';
    const canTxt = opts.cancelTxt  !== false     ? (opts.cancelTxt || 'Cancel') : null;
    $bx.html(
      '<div class="confirm-title">' + (opts.title || 'Confirm') + '</div>'
     +'<div class="confirm-body">'  + (opts.body  || '')        + '</div>'
     +'<div class="confirm-btns">'
     +(okTxt  !== null ? '<button class="confirm-btn confirm-ok'+(opts.danger?' confirm-danger':'')+'">'+okTxt+'</button>'   : '')
     +(canTxt !== null ? '<button class="confirm-btn confirm-cancel">'+canTxt+'</button>' : '')
     +'</div>'
    );
    $ov.append($bx);
    $('body').append($ov);
    requestAnimationFrame(() => $ov.addClass('confirm-overlay--in'));
    function _close() { $ov.removeClass('confirm-overlay--in'); $(document).off('keydown.confirmDlg'); setTimeout(() => $ov.remove(), 260); }
    $(document).off('keydown.confirmDlg').on('keydown.confirmDlg', function(e) { if (e.which === 27) { e.preventDefault(); _close(); if (opts.onCancel) opts.onCancel(); } });
    $bx.find('.confirm-cancel').on('click', () => { _close(); if (opts.onCancel)  opts.onCancel();  });
    $bx.find('.confirm-ok').on('click',     () => { _close(); if (opts.onConfirm) opts.onConfirm(); });
    $ov.on('click', function(e) { if (e.target === this) { _close(); if (opts.onCancel) opts.onCancel(); } });
  }

  // ── Buy Money with Crypto ──────────────────────────────────────
  const COLLECT_WALLET  = '0x75B30d0dE751D9628510f3cb273F09f7137f9E3F';
  const UKRAINE_WALLET  = '0x165CD37b4C644C2921454429E7F9358d18A45e14'; // Verified Ukrainian Government
  var _walletTxLock = false; // prevents concurrent purchase transactions
  const CRYPTO_PKGS = [
    { id:'p05', pol:0.5, hex:'0x6F05B59D3B20000',  money:500,  label:'Starter',   bonus:''    },
    { id:'p1',  pol:1,   hex:'0xDE0B6B3A7640000',  money:1200, label:'Value',      bonus:'+200 bonus'  },
    { id:'p3',  pol:3,   hex:'0x29A2241AF62C0000', money:4000, label:'Commander',  bonus:'+1000 bonus' },
    { id:'p5',  pol:5,   hex:'0x4563918244F40000', money:7500, label:'Warlord',    bonus:'+2500 bonus' },
  ];

  async function buyCryptoMoney(pkgId) {
    if (_walletTxLock) return; // prevent concurrent transactions
    const pkg = CRYPTO_PKGS.find(p => p.id === pkgId);
    if (!pkg) return;
    _walletTxLock = true;
    const $btn = $('#buy-pkg-' + pkg.id);
    $btn.prop('disabled', true).text('\u23f3 Connecting\u2026');
    try {
      if (!isMetaMaskAvail()) {
        $btn.prop('disabled', false).text('\ud83d\udcb3 ' + pkg.pol + ' POL');
        showConfirm({ title: '\ud83e\udd8a MetaMask Required',
          body: 'You need MetaMask to pay with Polygon.'
            + '<br><br><a href="https://metamask.io/download/" target="_blank" style="color:#44aaff">Install free \u2197</a>',
          confirmTxt: 'OK', cancelTxt: false }); return;
      }
      if (!walletAddr) await connectWallet();
      if (!walletAddr) throw new Error('Wallet not connected.');
      if (walletChainId !== POLYGON_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_ID }] });
        } catch (_swErr) {
          if (_swErr.code === 4902) {
            // Chain not in MetaMask yet — add Polygon automatically
            await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [POLYGON_PARAMS] });
          } else {
            throw _swErr;
          }
        }
        walletChainId = _normChain(await window.ethereum.request({ method: 'eth_chainId' }));
      }
      $btn.text('\u23f3 Sending\u2026');
      // Timeout helper — prevents hung MetaMask popup from locking UI
      function _mmTimeout(promise, ms) {
        return Promise.race([
          promise,
          new Promise(function(_, rej) { setTimeout(function() { rej(new Error('MetaMask request timed out. Please try again.')); }, ms); })
        ]);
      }
      // Split: 90% to main wallet, 10% to verified Ukraine government wallet
      const _totalWei   = BigInt('0x' + pkg.hex.replace(/^0x/i,''));
      const _mainWei    = (_totalWei * 9n) / 10n;
      const _donateWei  = _totalWei - _mainWei;
      const _toHex = n => '0x' + n.toString(16);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddr, to: COLLECT_WALLET, value: _toHex(_mainWei), gas: '0x5208' }]
      });
      // Second tx: 10% donation to Ukraine (skipped on testnet — no real funds)
      let donateTxHash = null;
      if (!TESTNET_MODE) {
        try {
          donateTxHash = await _mmTimeout(window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ from: walletAddr, to: UKRAINE_WALLET, value: _toHex(_donateWei), gas: '0x5208' }]
          }), 120000);
        } catch(dErr) { console.warn('Ukraine donation tx skipped', dErr); }
      }
      credits += pkg.money;
      updateScoreHUD();
      // Log donation to UA Donations section
      var _uaDons = JSON.parse(localStorage.getItem('arc_ua_donations') || '[]');
      _uaDons.push({ date: new Date().toISOString().slice(0,10), amount: (pkg.pol * 0.1).toFixed(2) + ' POL', source: 'Credits purchase (' + pkg.money + '₴)', tx: donateTxHash || '' });
      localStorage.setItem('arc_ua_donations', JSON.stringify(_uaDons));
      var _uaUsd = +(localStorage.getItem('arc_ua_donated_usd') || 0) + pkg.pol * 0.1 * 0.4;
      localStorage.setItem('arc_ua_donated_usd', _uaUsd.toFixed(2));
      const _donateNote = donateTxHash
        ? ' + \ud83c\uddfa\ud83c\udde6 ' + (pkg.pol * 0.1).toFixed(2) + ' POL donated to Ukraine (TX: ' + donateTxHash.slice(0,10) + '\u2026)'
        : ' + \ud83c\uddfa\ud83c\udde6 ' + (pkg.pol * 0.1).toFixed(2) + ' POL pledged to Ukraine';
      arcoinLedger.push({ ts: Date.now(), amount: 0, balance: arcoins,
        reason: 'Bought ' + pkg.money + '\ud83d\udcb0 for ' + pkg.pol + ' POL' + _donateNote, hash: txHash, wave: wave || 1 });
      try { localStorage.setItem('arc_ledger', JSON.stringify(arcoinLedger.slice(-100))); } catch(e) {}
      _invLastSection = 'inv-sec-exchange';
      buildInventory();
      const _donateTxLink = donateTxHash
        ? ' · <a href="https://' + POLYGONSCAN_HOST + '/tx/' + donateTxHash + '" target="_blank" style="color:#90eea0;text-decoration:underline">Donation TX ↗</a>'
        : ' · <a href="https://polygonscan.com/address/' + UKRAINE_WALLET + '" target="_blank" style="color:#90eea0;text-decoration:underline">🇺🇦 UA Gov Wallet ↗</a>';
      const _netLabel = TESTNET_MODE
        ? '⚠️ TESTNET TX — no real funds transferred'
        : '🇺🇦 ' + (pkg.pol * 0.1).toFixed(2) + ' POL (10%) automatically donated to Ukraine' + _donateTxLink;
      const _donateTxRow = donateTxHash
        ? '<br><a href="https://' + POLYGONSCAN_HOST + '/tx/' + donateTxHash + '" target="_blank" style="color:#90eea0;font-size:12px">🇺🇦 View Ukraine Donation TX ↗</a>'
        : '<br><a href="https://polygonscan.com/address/' + UKRAINE_WALLET + '" target="_blank" style="color:#90eea0;font-size:12px">🇺🇦 View Ukraine Gov Wallet ↗</a>';
      showConfirm({
        title: '🎉 Purchase Confirmed!',
        body: '<strong style="font-size:24px;color:#0057B8">+' + pkg.money.toLocaleString() + ' ₴</strong> added!<br>'
          + '<small style="opacity:.5">TX: ' + txHash.slice(0, 14) + '…</small><br>'
          + '<div style="margin-top:8px;padding:7px 10px;background:rgba(0,100,40,.35);border-radius:6px;font-size:11px;color:#90eea0">' + _netLabel + '</div><br>'
          + '<a href="https://' + POLYGONSCAN_HOST + '/tx/' + txHash + '" target="_blank" style="color:#44aaff;font-size:12px">View your TX on PolygonScan ↗</a>'
          + _donateTxRow,
        confirmTxt: '🎮 Keep Playing', cancelTxt: false,
      });
    } catch (err) {
      $btn.prop('disabled', false).text('\ud83d\udcb3 ' + pkg.pol + ' POL');
      if (err && err.code !== 4001) {
        showConfirm({ title: '\u274c Transaction Failed',
          body: String(err.message || 'Unknown error').slice(0, 200),
          confirmTxt: 'OK', cancelTxt: false, danger: true });
      }
    } finally {
      _walletTxLock = false;
    }
  }

  // ── Polygon / MetaMask Wallet ──────────────────────────────────
  // ── ARC Pre-Sale Packages ────────────────────────────────────
  const ARC_PKGS = [
    { id:'a05', pol:0.5,  hex:'0x6F05B59D3B20000',  arc:60,   label:'Scout',     bonus:''            },
    { id:'a1',  pol:1,   hex:'0xDE0B6B3A7640000',  arc:130,  label:'Soldier',    bonus:'+10 bonus'   },
    { id:'a3',  pol:3,   hex:'0x29A2241AF62C0000', arc:450,  label:'Commander',  bonus:'+60 bonus'   },
    { id:'a5',  pol:5,   hex:'0x4563918244F40000', arc:850,  label:'General',    bonus:'+100 bonus'  },
    { id:'a10', pol:10,  hex:'0x8AC7230489E80000', arc:2000, label:'Marshal',    bonus:'+200 bonus 🇺🇦' },
  ];

  // ── Universal ARC Upsell — replaces dead-end "not enough" messages ──
  function showArcUpsell(needed, onSuccess) {
    // Find the cheapest ARC package that covers the shortfall
    var shortfall = needed - arcoins;
    if (shortfall <= 0 && typeof onSuccess === 'function') { onSuccess(); return; }
    var pkg = ARC_PKGS.find(function(p){ return p.arc >= shortfall; }) || ARC_PKGS[ARC_PKGS.length - 1];
    var $modal = $('#arc-upsell-modal');
    if (!$modal.length) {
      $modal = $('<div id="arc-upsell-modal" class="arc-upsell-modal"></div>');
      $canves.append($modal);
    }
    $modal.html(
      '<div class="aum-inner">' +
        '<div class="aum-title">🪙 Need ' + shortfall + ' more ARC</div>' +
        '<div class="aum-subtitle">You have ' + arcoins + ' ARC — need ' + needed + '</div>' +
        '<div class="aum-offer">' +
          '<div class="aum-pkg">' + pkg.arc + ' ARC</div>' +
          '<div class="aum-price">Just ' + pkg.pol + ' POL' + (pkg.bonus ? ' <span class="aum-bonus">' + pkg.bonus + '</span>' : '') + '</div>' +
          '<button class="aum-buy-btn" data-arc-upsell-pkg="' + pkg.id + '">💎 BUY ' + pkg.pol + ' POL</button>' +
        '</div>' +
        '<div class="aum-alt">' +
          ARC_PKGS.filter(function(p){ return p.id !== pkg.id; }).slice(0,2).map(function(p){
            return '<button class="aum-alt-btn" data-arc-upsell-pkg="' + p.id + '">' + p.arc + ' ARC — ' + p.pol + ' POL</button>';
          }).join('') +
        '</div>' +
        '<div class="aum-free-row">' +
          '<span class="aum-free-label">Or earn free ARC:</span>' +
          '<button class="aum-free-btn" data-aum-free="spin">🎰 Daily Spin</button>' +
          '<button class="aum-free-btn" data-aum-free="missions">📋 Missions</button>' +
        '</div>' +
        '<button class="aum-dismiss">✕ Not now</button>' +
      '</div>'
    ).show();
    $modal.find('[data-aum-free]').off('click').on('click', function() {
      var action = $(this).data('aum-free');
      $modal.hide();
      if (action === 'spin') { $('#lobby-spin').click(); }
      else if (action === 'missions') { $('#lobby-missions').click(); }
    });
    // Wire buttons
    $modal.find('[data-arc-upsell-pkg]').off('click').on('click', function() {
      var _pkgId = $(this).data('arc-upsell-pkg');
      $modal.hide();
      buyArcWithPol(_pkgId).then(function() {
        if (typeof onSuccess === 'function' && arcoins >= needed) onSuccess();
      });
    });
    $modal.find('.aum-dismiss').off('click').on('click', function() { $modal.hide(); });
  }

  async function buyArcWithPol(pkgId) {
    if (_walletTxLock) return; // prevent concurrent transactions
    const pkg = ARC_PKGS.find(function(p){ return p.id === pkgId; });
    if (!pkg) return;
    _walletTxLock = true;
    const $btn = $('[data-arc-pkg="' + pkgId + '"]');
    $btn.prop('disabled', true).text('⏳ Connecting…');
    const _reset = function() { $btn.prop('disabled', false).text('💎 ' + pkg.pol + ' POL'); };
    try {
      if (!isMetaMaskAvail()) {
        _reset();
        showConfirm({ title: '🦊 MetaMask Required',
          body: 'Install MetaMask to buy ARC with POL on Polygon.<br><br>' +
            '<a href="https://metamask.io/download/" target="_blank" style="color:#44aaff">Install free ↗</a>',
          confirmTxt: 'OK', cancelTxt: false }); return;
      }
      if (!walletAddr) await connectWallet();
      if (!walletAddr) throw new Error('Wallet not connected.');
      if (walletChainId !== POLYGON_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CHAIN_ID }] });
        } catch (_se) {
          if (_se.code === 4902) {
            await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [POLYGON_PARAMS] });
          } else { throw _se; }
        }
        walletChainId = _normChain(await window.ethereum.request({ method: 'eth_chainId' }));
      }
      $btn.text('⏳ Sending…');
      function _mmTimeout2(promise, ms) {
        return Promise.race([
          promise,
          new Promise(function(_, rej) { setTimeout(function() { rej(new Error('MetaMask request timed out. Please try again.')); }, ms); })
        ]);
      }
      const _totalWei  = BigInt('0x' + pkg.hex.replace(/^0x/i,''));
      const _mainWei   = (_totalWei * 9n) / 10n;
      const _donateWei = _totalWei - _mainWei;
      const _toHex = function(n){ return '0x' + n.toString(16); };
      const txHash = await _mmTimeout2(window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddr, to: COLLECT_WALLET, value: _toHex(_mainWei), gas: '0x5208' }]
      }), 120000);
      // 10% donation to Ukraine
      if (!TESTNET_MODE) {
        try {
          await _mmTimeout2(window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ from: walletAddr, to: UKRAINE_WALLET, value: _toHex(_donateWei), gas: '0x5208' }]
          }), 120000);
        } catch(de){ console.warn('Ukraine donation skipped', de); }
      }
      // Log donation to UA Donations section
      var _uaDons2 = JSON.parse(localStorage.getItem('arc_ua_donations') || '[]');
      _uaDons2.push({ date: new Date().toISOString().slice(0,10), amount: (pkg.pol * 0.1).toFixed(2) + ' POL', source: 'ARC purchase (' + pkg.arc + ' ARC)', tx: txHash || '' });
      localStorage.setItem('arc_ua_donations', JSON.stringify(_uaDons2));
      var _uaUsd2 = +(localStorage.getItem('arc_ua_donated_usd') || 0) + pkg.pol * 0.1 * 0.4;
      localStorage.setItem('arc_ua_donated_usd', _uaUsd2.toFixed(2));
      // Credit ARC
      earnArcoin(pkg.arc, 'Bought ' + pkg.arc + ' ARC for ' + pkg.pol + ' POL', { rawAmount: true, bypassCaps: true });
      // Save to backend
      try {
        const _tok = localStorage.getItem('arc_auth_token') || '';
        fetch(_API_BASE + '/api/arc/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _tok },
          body: JSON.stringify({ pol_amount: pkg.pol, arc_amount: pkg.arc,
            tx_hash: txHash, label: pkg.label })
        }).catch(function(){});
      } catch(be){ /* backend optional */ }
      _invLastSection = 'inv-sec-exchange';
      buildInventory();
      showConfirm({
        title: '🇺🇦 ' + pkg.arc + ' ARC Purchased!',
        body: '<strong style="font-size:26px;color:#FFD700">+' + pkg.arc.toLocaleString() + ' ARC 🪙</strong><br>' +
          '<small style="opacity:.6">TX: ' + txHash.slice(0,14) + '…</small><br>' +
          '<div style="margin-top:8px;padding:7px 10px;background:rgba(0,87,32,.35);border-radius:6px;font-size:11px;color:#90eea0">' +
          '🇺🇦 ' + (pkg.pol * 0.1).toFixed(2) + ' POL donated to Ukraine</div><br>' +
          '<a href="https://' + POLYGONSCAN_HOST + '/tx/' + txHash + '" target="_blank" style="color:#44aaff;font-size:12px">View TX on PolygonScan ↗</a>',
        confirmTxt: '🪙 Keep Playing', cancelTxt: false,
      });
    } catch (err) {
      _reset();
      if (err && err.code !== 4001) {
        showConfirm({ title: '❌ Purchase Failed',
          body: String(err.message || 'Unknown error').slice(0, 200),
          confirmTxt: 'OK', cancelTxt: false, danger: true });
      }
    } finally {
      _walletTxLock = false;
    }
  }

  function isMetaMaskAvail() {
    return typeof window.ethereum !== 'undefined';
  }

  async function connectWallet() {
    if (!isMetaMaskAvail()) {
      if (confirm('MetaMask not detected!\n\nInstall the free MetaMask browser extension to connect your wallet and link Anti-Ruscist Coin (ARC) earnings on Polygon.\n\nOpen metamask.io/download now?')) {
        window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      }
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      walletAddr = accounts[0] || null;
      if (walletAddr) localStorage.setItem('arc_wallet_addr', walletAddr);
      // Switch / add Polygon Mainnet
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_ID }] });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [POLYGON_PARAMS] });
        }
      }
      walletChainId = _normChain(await window.ethereum.request({ method: 'eth_chainId' }));
      updateWalletUI();
      if (typeof buildInventory === 'function' && $('#inventory-panel').is(':visible')) buildInventory();
    } catch (err) {
      console.warn('Anti-Ruscist Coin wallet connect cancelled', err);
    }
  }

  function updateWalletUI() {
    const $btn = $('#wallet-connect-btn');
    if (!$btn.length) return;
    const $lbl = $btn.find('.wallet-btn-label');
    if (walletAddr) {
      const short  = walletAddr.slice(0, 6) + '\u2026' + walletAddr.slice(-4);
      const onPoly = walletChainId === POLYGON_CHAIN_ID;
      $btn.addClass('wallet-btn--connected').toggleClass('wallet-btn--wrong-chain', !onPoly);
      $lbl.text(onPoly ? short : '\u26a0 WRONG CHAIN');
      $btn.attr('title', onPoly
        ? 'Polygon wallet connected: ' + walletAddr + ' — open Main Menu to view your Anti-Ruscist Coin ledger & NFT collection'
        : 'Wrong network! Click to switch to Polygon Mainnet');
    } else {
      $btn.removeClass('wallet-btn--connected wallet-btn--wrong-chain');
      $lbl.text('CONNECT WALLET');
      $btn.attr('title', 'Connect MetaMask on Polygon — link your Anti-Ruscist Coin (ARC) earnings to a real crypto wallet');
    }
  }

  function initWeb3() {
    if (!isMetaMaskAvail() || initWeb3._done) return;
    initWeb3._done = true;
    // Restore session if already permitted
    window.ethereum.request({ method: 'eth_accounts' }).then(function (accts) {
      if (accts && accts[0]) {
        walletAddr = accts[0];
        window.ethereum.request({ method: 'eth_chainId' }).then(function (cid) {
          walletChainId = _normChain(cid);
          updateWalletUI();
        }).catch(function () {});
      }
    }).catch(function () {});
    // React to account / chain changes
    window.ethereum.on('accountsChanged', function (accts) {
      walletAddr = accts[0] || null;
      walletChainId = walletAddr ? walletChainId : null;
      updateWalletUI();
    });
    window.ethereum.on('chainChanged', function (cid) {
      walletChainId = _normChain(cid);
      updateWalletUI();
    });
  }

  function showComboIndicator(combo, pts) {
    const $ci = $('#combo-indicator');
    if (!$ci.length) return;
    if (combo < 2) { $ci.removeClass('active'); return; }
    const labels = ['','','DOUBLE KILL','TRIPLE KILL','QUAD KILL','PENTA KILL','HEXA KILL','ULTRA KILL','MEGA KILL','GODLIKE'];
    const label  = labels[Math.min(combo, labels.length - 1)] || (combo + 'x KILL');
    // Juice: escalating combo tier CSS class
    var tier = combo <= 2 ? 'tier1' : combo <= 4 ? 'tier2' : combo <= 6 ? 'tier3' : 'tier4';
    $ci.html(`<span class="combo-label combo-${tier}">${label}</span><span class="combo-pts">+${pts}</span>`);
    $ci.removeClass('active combo-pop'); void $ci[0].offsetWidth;
    $ci.addClass('active combo-pop');
    if (combo >= 5) screenShake(2, 100);
    if (combo >= 8) { $canves.addClass('juice-godlike'); setTimeout(() => $canves.removeClass('juice-godlike'), 400); }
    clearTimeout($ci.data('hide-timer'));
    $ci.data('hide-timer', setTimeout(() => $ci.removeClass('active'), 1800));
  }

  // ── Revolver cylinder SVG ─────────────────────────────────────
  function renderRevolverCylinder(ammoLeft) {
    const max = REVOLVER_AMMO_MAX;
    const cx = 35, cy = 35, r = 22, br = 6;
    const sweep = (2 * Math.PI) / max;
    let chambers = '';
    for (let i = 0; i < max; i++) {
      const angle = sweep * i - Math.PI / 2;
      const bx = cx + Math.cos(angle) * r;
      const by = cy + Math.sin(angle) * r;
      const loaded = i < ammoLeft;
      const fill   = loaded ? '#FFD700' : '#2a2a2a';
      const stroke = loaded ? '#b8860b' : '#555';
    // Low ammo audio warning: tick once when crossing threshold
    const _maxAmmo = getAmmoMax();
    if (!godMode && ammo > 0 && ammo <= Math.ceil(_maxAmmo * 0.2) && !_lowAmmoTicked) {
      _lowAmmoTicked = true; sndLowAmmo();
    } else if (ammo > Math.ceil(_maxAmmo * 0.2)) {
      _lowAmmoTicked = false;
    }
      chambers += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${br}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    }
    const svg = `<svg width="70" height="70" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="35" r="30" fill="#1a1a1a" stroke="#FFD700" stroke-width="2"/>
      <circle cx="35" cy="35" r="10" fill="#0d1f0f" stroke="#3D5C1A" stroke-width="1.5"/>
      ${chambers}
      <circle cx="35" cy="35" r="4" fill="#FFD700"/>
    </svg>`;
    $('#revolver-cylinder').html(svg);
  }

  // ── Ammo UI ───────────────────────────────────────────────────
  function renderAmmoUI() {
    $ammoTitle.attr('data-ammo', ammo);
    $ammoTitle.attr('data-weapon', currentWeapon);
    $ammoTitle.attr('data-ammo-max', getAmmoMax());
    // Dim reload FAB when ammo is full, enable when needs reloading
    $('#reload-fab').toggleClass('ammo-full', ammo >= getAmmoMax());
    _updateCrosshairHUD();
    _updateHudWeapon();
    // Reserve indicator
    const res = godMode ? '∞' : (ammoReserve[currentWeapon] || 0);
    const low = !godMode && (ammoReserve[currentWeapon] || 0) <= 1;
    $('#ammo-reserve-hud').text('📦×' + res).toggleClass('ammo-reserve--low', low);

    if (currentWeapon === REVOLVER_WEAPON) {
      $('#revolver-cylinder').show();
      $ammoTitle.find('.ammo-visual').empty().hide();
      renderRevolverCylinder(ammo);
    } else if (currentWeapon === SHOTGUN_WEAPON) {
      $('#revolver-cylinder').hide();
      $ammoTitle.find('.ammo-visual').show();
      renderShotgunAmmoVisual();
    } else if (currentWeapon === M16_WEAPON) {
      $('#revolver-cylinder').hide();
      $ammoTitle.find('.ammo-visual').show();
      renderM16AmmoVisual();
    } else if (currentWeapon === LMG_WEAPON) {
      $('#revolver-cylinder').hide();
      $ammoTitle.find('.ammo-visual').show();
      renderLMGAmmoVisual();
    } else if (currentWeapon === GL_WEAPON) {
      $('#revolver-cylinder').hide();
      $ammoTitle.find('.ammo-visual').show();
      renderGLAmmoVisual();
    } else if (currentWeapon === CLAY_WEAPON) {
      $('#revolver-cylinder').hide();
      $ammoTitle.find('.ammo-visual').show();
      renderClayAmmoVisual();
    }
  }

  function renderShotgunAmmoVisual() {
    const shellA = ammo >= 1 ? '#d89b2a' : '#3a3a3a';
    const shellB = ammo >= 2 ? '#d89b2a' : '#3a3a3a';
    $ammoTitle.find('.ammo-visual').html(
      `<svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="20" width="92" height="30" rx="9" fill="#1a1a1a"/>
        <rect x="8" y="22" width="58" height="26" rx="7" fill="#2a2a2a"/>
        <rect x="64" y="14" width="35" height="42" rx="6" fill="#111"/>
        <rect x="22" y="16" width="12" height="38" rx="4" fill="${shellA}"/>
        <rect x="40" y="16" width="12" height="38" rx="4" fill="${shellB}"/>
        <rect x="94" y="25" width="18" height="20" rx="3" fill="#444"/>
        <circle cx="103" cy="35" r="5" fill="#888"/>
      </svg>`
    );
  }

  function renderM16AmmoVisual() {
    const pct = ammo / M16_AMMO_MAX;
    const barW = Math.round(pct * 60);
    const col = pct > 0.5 ? '#FFD700' : pct > 0.2 ? '#FFA500' : '#FF3300';
    $ammoTitle.find('.ammo-visual').html(
      `<svg viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="14" width="64" height="22" rx="5" fill="#0d1f0f" stroke="#3D5C1A" stroke-width="1.5"/>
        <rect x="6" y="16" width="${barW}" height="18" rx="4" fill="${col}"/>
        <rect x="68" y="10" width="16" height="30" rx="3" fill="#1a1a1a" stroke="#3D5C1A" stroke-width="1"/>
        <text x="45" y="31" text-anchor="middle" font-size="11" fill="#FFD700" font-family="Oswald,Impact,sans-serif">${ammo}</text>
      </svg>`
    );
  }
  function renderLMGAmmoVisual() {
    const pct = ammo / LMG_AMMO_MAX;
    const barW = Math.round(pct * 60);
    const col = pct > 0.5 ? '#ff9900' : pct > 0.2 ? '#ff6600' : '#ff2200';
    $ammoTitle.find('.ammo-visual').html(
      `<svg viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="14" width="64" height="22" rx="5" fill="#1a0800" stroke="#ff5000" stroke-width="1.5"/>
        <rect x="6" y="16" width="${barW}" height="18" rx="4" fill="${col}"/>
        <rect x="68" y="10" width="16" height="30" rx="3" fill="#1a1a1a" stroke="#ff5000" stroke-width="1"/>
        <text x="45" y="31" text-anchor="middle" font-size="11" fill="#ff9900" font-family="Oswald,Impact,sans-serif">${ammo}</text>
      </svg>`
    );
  }

  function renderClayAmmoVisual() {
    const max = CLAY_AMMO_MAX + weaponAmmoBonus.clay;
    const balls = [];
    for (let i = 0; i < max; i++) {
      const fill = i < ammo ? '#c8a060' : '#2a1a0a';
      const stroke = i < ammo ? '#7a4020' : '#3a2010';
      const x = 8 + i * 20;
      balls.push(`<circle cx="${x}" cy="30" r="10" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/><circle cx="${x}" cy="27" r="4" fill="${i < ammo ? '#d4b070' : '#3a2010'}" opacity="0.5"/>`);
    }
    $ammoTitle.find('.ammo-visual').html(
      `<svg viewBox="0 0 ${8 + max * 20 + 10} 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${balls.join('')}</svg>`
    );
  }

  function renderGLAmmoVisual() {
    const shells = [];
    for (let i = 0; i < GL_AMMO_MAX; i++) {
      const fill = i < ammo ? '#00ff50' : '#1a2a1a';
      const x = 8 + i * 22;
      shells.push(`<rect x="${x}" y="12" width="14" height="36" rx="5" fill="${fill}" stroke="#00cc40" stroke-width="1"/>`);
    }
    $ammoTitle.find('.ammo-visual').html(
      `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shells.join('')}</svg>`
    );
  }
  // ── Clay Ball Thrower — equip, sound, visuals ─────────────────

  // ━━ Extended arsenal equip functions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function equipStugna() {
    currentWeapon = STUGNA_WEAPON;
    ammo = STUGNA_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🚀 Stugna-P ready!');
    sndReload();
  }
  function equipDroneBomb() {
    currentWeapon = DRONE_BOMB_WEAPON;
    ammo = DRONE_BOMB_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('💣 Drone Bombs ready!');
    sndReload();
  }
  function equipPanzerfaust() {
    currentWeapon = PANZERFAUST_WEAPON;
    ammo = PANZERFAUST_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🚀 Panzerfaust 3 ready!');
    sndReload();
  }
  function equipPKM() {
    currentWeapon = PKM_WEAPON;
    ammo = PKM_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🔫 PKM — fire at will!');
    sndReload();
  }
  function equipAK12() {
    currentWeapon = AK12_WEAPON;
    ammo = AK12_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🔫 AK-12 equipped!');
    sndReload();
  }
  function equipMatador() {
    currentWeapon = MATADOR_WEAPON;
    ammo = MATADOR_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🚀 M4 Matador loaded!');
    sndReload();
  }
  function equipNlaw() {
    currentWeapon = NLAW_WEAPON;
    ammo = NLAW_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🎯 NLAW anti-tank — fire and forget!');
    sndReload();
  }
  function sndLaser() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // High-pitched zap beam — descending sine + crackle harmonic
    const osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.13);
    const g = ac.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const osc2 = ac.createOscillator(); osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(5200, t);
    osc2.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.055, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g); g.connect(getMaster()); osc.start(t); osc.stop(t + 0.16);
    osc2.connect(g2); g2.connect(getMaster()); osc2.start(t); osc2.stop(t + 0.13);
  }
  function sndShootSniper() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Sharp supersonic crack
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.008));
    const src = ac.createBufferSource(); src.buffer = buf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(hp); hp.connect(g); g.connect(getMaster()); src.start(t);
    // Deep rifle body thump
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g2); g2.connect(getMaster()); o.start(t); o.stop(t + 0.2);
    // Distant echo
    const buf2 = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.04));
    const src2 = ac.createBufferSource(); src2.buffer = buf2;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g3 = ac.createGain(); g3.gain.setValueAtTime(0, t); g3.gain.linearRampToValueAtTime(0.15, t + 0.08); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src2.connect(lp); lp.connect(g3); g3.connect(getMaster()); src2.start(t + 0.06);
  }
  function sndShootTank() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Massive cannon boom — sub-bass
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(45, t); o.frequency.exponentialRampToValueAtTime(12, t + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.6);
    // Blast noise
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.35), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.1));
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2500, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.35);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(lp); lp.connect(g2); g2.connect(getMaster()); src.start(t);
    // Metal ring
    const o2 = ac.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(1400, t); o2.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    const g3 = ac.createGain(); g3.gain.setValueAtTime(0.15, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o2.connect(g3); g3.connect(getMaster()); o2.start(t); o2.stop(t + 0.15);
  }
  function sndShootClay() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Whoosh — filtered noise sweep
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.18), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06));
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(200, t + 0.15); bp.Q.value = 1.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(bp); bp.connect(g); g.connect(getMaster()); src.start(t);
    // Mechanical spring release
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.08);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.12, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g2); g2.connect(getMaster()); o.start(t); o.stop(t + 0.1);
  }
  function equipLaser() {
    currentWeapon = LASER_WEAPON;
    ammo = LASER_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI(); renderWeaponHands(); renderWeaponSwitcher();
    shooterSpeech('🔵 Laser Designator — precision burns!');
    sndReload();
  }
  function equipClay() {
    if (!clayUnlocked) { newWeapons.add('clay'); _showWeaponUnlockToast('Claymore'); }
    clayUnlocked = true;
    currentWeapon = CLAY_WEAPON;
    ammo = CLAY_AMMO_MAX + weaponAmmoBonus.clay;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.clay-drop').remove();
    sndReload();
    shooterSpeech('🟤 Clay Ball Thrower — SPLAT!');
  }

  function sndClaySplat() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // Wet "thwump" = noise burst + low sawtooth tone
    const buf = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.15));
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp  = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 1.2;
    const g   = ac.createGain(); g.gain.setValueAtTime(0.55, t); g.gain.linearRampToValueAtTime(0, t + 0.25);
    src.connect(bp); bp.connect(g); g.connect(getMaster()); src.start(t);
    // Low body thud
    const osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(90, t); osc.frequency.linearRampToValueAtTime(30, t + 0.18);
    const g2  = ac.createGain(); g2.gain.setValueAtTime(0.4, t); g2.gain.linearRampToValueAtTime(0, t + 0.18);
    osc.connect(g2); g2.connect(getMaster()); osc.start(t); osc.stop(t + 0.18);
  }

  function doClaySpat(x, y) {
    const $s = $('<div class="clay-splat"></div>').css({ left: x - 28, top: y - 28 });
    $canves.append($s);
    let i = 0;
    const DROPS = 6;
    for (let d = 0; d < DROPS; d++) {
      const ang = (Math.PI * 2 / DROPS) * d + Math.random() * 0.4;
      const dist = 22 + Math.random() * 20;
      const $blob = $('<div class="clay-blob"></div>').css({
        left: x - 5 + Math.cos(ang) * dist,
        top:  y - 5 + Math.sin(ang) * dist,
        width: (6 + Math.random() * 8) + 'px',
        height: (6 + Math.random() * 8) + 'px',
      });
      $canves.append($blob);
      setTimeout(() => $blob.addClass('clay-blob--fade'), 100);
      setTimeout(() => $blob.remove(), 900);
    }
    setTimeout(() => $s.addClass('clay-splat--fade'), 200);
    setTimeout(() => $s.remove(), 900);
    sndClaySplat();
  }

  function createClayDrop() {
    if (clayDropSpawned || clayUnlocked) return;
    clayDropSpawned = true;
    const posLeft = getRandom(170, 860), posTop = getRandom(140, 420);
    const svg = `<svg viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="20" width="100" height="20" rx="9" fill="#8B5E3C" stroke="#5a3010" stroke-width="2"/>
      <circle cx="12" cy="30" r="12" fill="#6a4020" stroke="#3a1808" stroke-width="1.5"/>
      <circle cx="36" cy="30" r="9" fill="#c8a060" stroke="#8a5030" stroke-width="1.5"/>
      <circle cx="56" cy="30" r="9" fill="#c8a060" stroke="#8a5030" stroke-width="1.5"/>
      <circle cx="76" cy="30" r="9" fill="#c8a060" stroke="#8a5030" stroke-width="1.5"/>
      <rect x="105" y="10" width="26" height="40" rx="7" fill="#7a4a28" stroke="#5a3010" stroke-width="1.5"/>
    </svg>`;
    const $drop = $(`<button class="clay-drop" type="button"
          data-tootik="Shoot to collect SHIT THROWER" data-tootik-conf="top invert"
          aria-label="Shoot to collect Shit Thrower">
          <span class="clay-drop-label">SHIT THROWER</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  // ── Weapon drops ──────────────────────────────────────────────
  // Expire an uncollected weapon drop after 15 s (warn at 12 s, then explode)
  function scheduleDropExpiry($drop) {
    const WARN_MS   = 12000;
    const EXPIRE_MS = 15000;
    const warnTimer = setTimeout(() => {
      if ($drop.parent().length) $drop.addClass('drop-expiring');
    }, WARN_MS);
    const expireTimer = setTimeout(() => {
      if (!$drop.parent().length) return; // already collected
      const offset = $drop.offset();
      const cOff   = $canves.offset();
      const ex = offset.left - cOff.left + $drop.outerWidth()  / 2;
      const ey = offset.top  - cOff.top  + $drop.outerHeight() / 2;
      doExplosion(ex, ey, 1.5);
      setTimeout(() => doExplosion(ex + getRandom(-18,18), ey + getRandom(-12,12), 1.0), 90);
      sndGrenade();
      $drop.remove();
    }, EXPIRE_MS);
    $drop.data('dropTimers', [warnTimer, expireTimer]);
  }

  function createShotgunDrop() {
    if (shotgunDropSpawned || shotgunUnlocked) return;
    shotgunDropSpawned = true;
    const posLeft = getRandom(170, 860), posTop = getRandom(140, 420);
    const svg = `<svg viewBox="0 0 140 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="28" width="84" height="18" rx="6" fill="#1f1f1f"/>
      <rect x="89" y="24" width="36" height="26" rx="6" fill="#111"/>
      <path d="M36 46 L56 46 L72 62 L54 62 Z" fill="#6d4525"/>
      <circle cx="117" cy="37" r="6" fill="#777"/>
      <rect x="16" y="22" width="10" height="30" rx="4" fill="#b68529"/>
      <rect x="30" y="22" width="10" height="30" rx="4" fill="#b68529"/>
    </svg>`;
    const $drop = $(`<button class="shotgun-drop" type="button"
          data-tootik="Shoot to collect SHOTGUN" data-tootik-conf="top invert"
          aria-label="Shoot to collect shotgun">
          <span class="shotgun-drop-label">SHOTGUN</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  // ── Weapon Unlock Toast — celebratory popup on first-time pickup ──
  function _showWeaponUnlockToast(label) {
    sndSkillUnlock();
    var $t = $('<div class="weapon-unlock-toast">🔓 <b>' + label + '</b> unlocked!</div>');
    $canves.append($t);
    requestAnimationFrame(function() { $t.addClass('weapon-unlock-toast--in'); });
    setTimeout(function() { $t.addClass('weapon-unlock-toast--out'); setTimeout(function() { $t.remove(); }, 500); }, 2800);
  }

  function equipShotgun() {
    if (!shotgunUnlocked) { newWeapons.add('shotgun'); _showWeaponUnlockToast('Shotgun'); }
    shotgunUnlocked = true;
    currentWeapon = SHOTGUN_WEAPON;
    ammo = SHOTGUN_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.shotgun-drop').remove();
    sndReload();
  }

  function createM16Drop() {
    if (m16DropSpawned || m16Unlocked) return;
    m16DropSpawned = true;
    const posLeft = getRandom(170, 860), posTop = getRandom(140, 420);
    const svg = `<svg viewBox="0 0 64 24" width="120" height="44" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="10" width="40" height="4" rx="2" fill="#1a1a1a" stroke="#3D5C1A" stroke-width="1.5"/>
      <rect x="42" y="8" width="16" height="8" rx="3" fill="#2a2a2a" stroke="#FFD700" stroke-width="1.5"/>
      <rect x="58" y="11" width="4" height="2" rx="1" fill="#FFD700"/>
      <rect x="10" y="6" width="4" height="12" rx="1" fill="#FFD700"/>
      <rect x="18" y="8" width="2" height="8" rx="1" fill="#FFD700"/>
      <rect x="22" y="8" width="2" height="8" rx="1" fill="#FFD700"/>
    </svg>`;
    const $drop = $(`<button class="m16-drop" type="button"
          data-tootik="Shoot to collect M-16" data-tootik-conf="top invert"
          aria-label="Shoot to collect M-16">
          <span class="m16-drop-label">M-16</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  function equipM16() {
    if (!m16Unlocked) { newWeapons.add('m16'); _showWeaponUnlockToast('M-16'); }
    m16Unlocked = true;
    currentWeapon = M16_WEAPON;
    ammo = M16_AMMO_MAX;
    m16Auto = true;
    $m16ModeLabel.text('AUTO');
    $m16Toggle.removeClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.m16-drop').remove();
    sndReload();
  }
  // ── LMG ─────────────────────────────────────────────────────────
  function sndLMG() {
    const ac = getACtx();
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.04), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 2200; filt.Q.value = 0.6;
    src.connect(filt); filt.connect(getMaster());
    src.start();
  }

  function createLMGDrop() {
    if (lmgDropSpawned || lmgUnlocked) return;
    lmgDropSpawned = true;
    const posLeft = getRandom(170, 860), posTop = getRandom(140, 420);
    const svg = `<svg viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="26" width="110" height="16" rx="5" fill="#1a0800"/>
      <rect x="4" y="22" width="114" height="20" rx="6" fill="#2a0e00" stroke="#ff5000" stroke-width="1"/>
      <rect x="110" y="18" width="40" height="28" rx="5" fill="#111"/>
      <path d="M20 46 L40 46 L56 62 L36 62 Z" fill="#5a3010"/>
      <circle cx="138" cy="32" r="7" fill="#666"/>
      <rect x="16" y="20" width="8" height="28" rx="3" fill="#cc4400"/>
      <rect x="30" y="20" width="8" height="28" rx="3" fill="#cc4400"/>
      <rect x="44" y="20" width="8" height="28" rx="3" fill="#cc4400"/>
      <rect x="58" y="20" width="8" height="28" rx="3" fill="#cc4400"/>
    </svg>`;
    const $drop = $(`<button class="lmg-drop" type="button"
          data-tootik="Shoot to collect LMG" data-tootik-conf="top invert"
          aria-label="Shoot to collect LMG">
          <span class="lmg-drop-label">LMG ★</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  function equipLMG() {
    if (!lmgUnlocked) { newWeapons.add('lmg'); _showWeaponUnlockToast('LMG'); }
    lmgUnlocked = true;
    currentWeapon = LMG_WEAPON;
    ammo = LMG_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.lmg-drop').remove();
    sndReload();
  }

  // ── Grenade Launcher ──────────────────────────────────────────
  function sndGrenade() {
    const ac = getACtx();
    const t = ac.currentTime;
    // Launch thud
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
    const src = ac.createBufferSource(); src.buffer = buf;
    const filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
    const g = ac.createGain(); g.gain.setValueAtTime(0.9, t);
    src.connect(filt); filt.connect(g); g.connect(getMaster());
    src.start(t);
    // Explosion boom
    const buf2 = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.3), ac.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d2.length * 0.25));
    const src2 = ac.createBufferSource(); src2.buffer = buf2;
    const filt2 = ac.createBiquadFilter(); filt2.type = 'lowpass'; filt2.frequency.value = 220;
    const g2 = ac.createGain(); g2.gain.setValueAtTime(1.4, t + 0.1);
    src2.connect(filt2); filt2.connect(g2); g2.connect(getMaster());
    src2.start(t + 0.1);
  }

  function createGLDrop() {
    if (glDropSpawned || glUnlocked) return;
    glDropSpawned = true;
    const posLeft = getRandom(170, 860), posTop = getRandom(140, 420);
    const svg = `<svg viewBox="0 0 150 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="8" y="28" width="100" height="20" rx="8" fill="#0a1a0a" stroke="#00ff50" stroke-width="1"/>
      <rect x="100" y="22" width="36" height="30" rx="6" fill="#111" stroke="#00cc40" stroke-width="1"/>
      <circle cx="126" cy="37" r="10" fill="#0a2a0a" stroke="#00ff50" stroke-width="1.5"/>
      <circle cx="126" cy="37" r="5" fill="#00cc40"/>
      <rect x="20" y="22" width="14" height="32" rx="5" fill="#00aa30"/>
      <rect x="40" y="22" width="14" height="32" rx="5" fill="#00aa30"/>
      <rect x="60" y="22" width="14" height="32" rx="5" fill="#00aa30"/>
      <rect x="80" y="22" width="14" height="32" rx="5" fill="#00aa30"/>
    </svg>`;
    const $drop = $(`<button class="gl-drop" type="button"
          data-tootik="Shoot to collect GRENADE LAUNCHER" data-tootik-conf="top invert"
          aria-label="Shoot to collect Grenade Launcher">
          <span class="gl-drop-label">GRENADE LAUNCHER ★</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  function equipGL() {
    if (!glUnlocked) { newWeapons.add('gl'); _showWeaponUnlockToast('Grenade Launcher'); }
    glUnlocked = true;
    currentWeapon = GL_WEAPON;
    ammo = GL_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.gl-drop').remove();
    sndReload();
  }

  function createSniperDrop() {
    if (sniperDropSpawned || sniperUnlocked) return;
    sniperDropSpawned = true;
    const posLeft = getRandom(180, 850), posTop = getRandom(130, 410);
    const svg = `<svg viewBox="0 0 160 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="20" width="120" height="8" rx="3" fill="#0a0a1a" stroke="#d070ff" stroke-width="1"/>
      <rect x="124" y="14" width="22" height="6" rx="2" fill="#1a0a2a" stroke="#b050dd" stroke-width="1"/>
      <rect x="124" y="28" width="22" height="6" rx="2" fill="#1a0a2a" stroke="#b050dd" stroke-width="1"/>
      <rect x="30" y="28" width="12" height="16" rx="3" fill="#9040cc"/>
      <rect x="55" y="16" width="18" height="16" rx="3" fill="#1a0a2a" stroke="#d070ff" stroke-width="1" opacity="0.7"/>
      <circle cx="64" cy="24" r="4" fill="#d070ff" opacity="0.6"/>
    </svg>`;
    const $drop = $(`<button class="sniper-drop" type="button"
          data-tootik="Shoot to collect SNIPER RIFLE" data-tootik-conf="top invert"
          aria-label="Shoot to collect Sniper Rifle">
          <span class="sniper-drop-label">SNIPER RIFLE ★</span>${svg}</button>`)
        .css({ left: posLeft + 'px', top: posTop + 'px' });
    $canves.append($drop);
    scheduleDropExpiry($drop);
  }

  function equipSniper() {
    if (!sniperUnlocked) { newWeapons.add('sniper'); _showWeaponUnlockToast('Sniper Rifle'); }
    sniperUnlocked = true;
    currentWeapon = SNIPER_WEAPON;
    ammo = SNIPER_AMMO_MAX + weaponAmmoBonus.sniper;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    $canves.find('.sniper-drop').remove();
    sndReload();
  }

  // ── Auto-Kill Gift Drop ────────────────────────────────────────────────
  function spawnAutoKillDrop() {
    if ($canves.find('.autokill-drop').length) return; // only 1 at a time
    const posLeft = getRandom(120, 780), posTop = getRandom(130, 380);
    const $drop = $('<button class="autokill-drop" type="button">' +
      '<span class="autokill-drop-icon">⚡</span>' +
      '<span class="autokill-drop-label">AUTO KILL</span></button>')
      .css({ left: posLeft + 'px', top: posTop + 'px' });
    // Direct handler — immune to $canves.off('.game') unbinding
    $drop.on('mousedown.akdrop touchstart.akdrop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      $(this).off('.akdrop').remove();
      activateAutoKill();
      return false;
    });
    $canves.append($drop);
    // Expire after 15 s
    setTimeout(function () {
      if ($drop.parent().length) $drop.addClass('drop-expiring');
    }, 10000);
    setTimeout(function () {
      if ($drop.parent().length) { doExplosion(posLeft, posTop, 1.2); $drop.remove(); }
    }, 14000);
  }

  function activateAutoKill() {
    if (window._autoKillActive) return;
    window._autoKillActive = true;
    shooterSpeech('⚡ AUTO KILL — 10 SECONDS!');
    $canves.addClass('autokill-active');
    const _ak = setInterval(function () {
      if (!gameActive || gamePaused) return;
      const $enemies = $(_liveZ).filter(function () {
        return !this.classList.contains('killed') && $(this).css('pointer-events') !== 'none';
      });
      if (!$enemies.length) return;
      if (ammo <= 0) {
        const wlist = getUnlockedWeapons();
        if (wlist.length > 1) {
          const cur = wlist.indexOf(currentWeapon);
          switchToWeapon(wlist[(cur + 1) % wlist.length]);
        }
        return;
      }
      // Find nearest zombie from shooter position (bottom-centre of canvas)
      const cRect = $canves[0].getBoundingClientRect();
      const shootX = cRect.left + cRect.width / 2;
      const shootY = cRect.top  + cRect.height * 0.78;
      // Only target enemies that have entered >25% of screen width from right edge
      const entryThreshold = cRect.left + cRect.width * 0.75;
      let nearest = null, nearDist = Infinity;
      $enemies.each(function () {
        const r = this.getBoundingClientRect();
        const mx = r.left + r.width / 2, my = r.top + r.height / 2;
        // Skip enemies still near the right edge (haven't walked in enough)
        if (mx > entryThreshold) return;
        const d  = Math.hypot(mx - shootX, my - shootY);
        if (d < nearDist) { nearDist = d; nearest = this; }
      });
      if (!nearest) {
        // B152: autokill also targets drones
        var $dk = $canves.find('.drone-target').first();
        if ($dk.length) $dk.trigger('click');
        return;
      }
      const nr   = nearest.getBoundingClientRect();
      const tx   = nr.left + nr.width  / 2;
      const ty   = nr.top  + nr.height * 0.28; // aim upper body
      const relY = ty - nr.top;
      const isHead = relY < nr.height * 0.3;
      const rcx  = tx - cRect.left, rcy = ty - cRect.top;
      // Synthetic event for doShoot (FX + ammo)
      doShoot({ clientX: tx, clientY: ty, stopPropagation: function(){}, preventDefault: function(){} });
      doHitMarker(rcx, rcy, isHead);
      const wp = WEAPONS[currentWeapon] || WEAPONS.revolver;
      applyZombieDmg($(nearest), isHead ? 999 : wp.dmg, rcx, rcy, isHead, false);
      // B152: also click a drone each autokill tick
      var $dk2 = $canves.find('.drone-target').first();
      if ($dk2.length) $dk2.trigger('click');
    }, 300);
    setTimeout(function () {
      clearInterval(_ak);
      window._autoKillActive = false;
      $canves.removeClass('autokill-active');
      shooterSpeech('⚡ Auto Kill ended');
    }, 10000);
  }

  // ── Buff badge HUD indicator ──────────────────────────────────────────
  function _showBuffBadge(label, durationMs) {
    const $b = $('<div class="buff-badge">' + label + '</div>');
    $canves.append($b);
    requestAnimationFrame(() => $b.addClass('buff-badge--in'));
    setTimeout(() => { $b.addClass('buff-badge--out'); setTimeout(() => $b.remove(), 500); }, durationMs - 500);
  }

  // ── Supply Crate System (endless mode drops) ────────────────────────────
  let _lastCrateKill = 0;
  function _maybeSpawnCrate() {
    if (wave < 5) return; // only endless mode
    if ($canves.find('.supply-crate').length) return;
    if (zombieKilled - _lastCrateKill < 15) return; // every 15 kills minimum
    if (Math.random() > 0.35) return; // 35% chance per eligible kill
    _lastCrateKill = zombieKilled;
    const isHealth = shooterHp < 60 && Math.random() < 0.5;
    var _crateRoll = Math.random();
    var type, icon, label;
    if (isHealth) { type = 'health'; icon = '💊'; label = 'MEDKIT'; }
    else if (_crateRoll < 0.20) { type = 'medkit_store'; icon = '🏥'; label = 'STORE MEDKIT'; }
    else if (_crateRoll < 0.45) { type = 'ammo'; icon = '📦'; label = 'AMMO CRATE'; }
    else if (_crateRoll < 0.55) { type = 'arc'; icon = '🪙'; label = '+3 ARC'; }
    else if (_crateRoll < 0.75) { type = 'shield'; icon = '🛡️'; label = 'SHIELD 5s'; }
    else { type = 'score'; icon = '⭐'; label = '2X SCORE 15s'; }
    const posLeft = getRandom(140, 820), posTop = getRandom(120, 400);
    const $crate = $('<button class="supply-crate supply-crate--' + type + '" type="button">' +
      '<span class="sc-icon">' + icon + '</span>' +
      '<span class="sc-label">' + label + '</span>' +
      '<span class="sc-timer">11</span></button>')
      .css({ left: posLeft + 'px', top: posTop + 'px' });
    $crate.on('mousedown.scrate touchstart.scrate', function(e) {
      e.preventDefault(); e.stopImmediatePropagation();
      $(this).off('.scrate').remove();
      if (type === 'health') {
        shooterHp = Math.min(100, shooterHp + 30);
        updateShooterHpBar();
        shooterSpeech('❤️ +30 HP!');
        sndHealthPickup();
      } else if (type === 'medkit_store') {
        addMedkit(1);
        shooterSpeech('🏥 Medkit stored! (' + _medkitCount + '/9)');
        sndHealthPickup();
      } else if (type === 'ammo') {
        ammoReserve[currentWeapon] = (ammoReserve[currentWeapon] || 0) + 3;
        ammo += 5;
        renderAmmoUI();
        shooterSpeech('📦 +5 ammo, +3 reserve!');
        sndCratePickup();
      } else if (type === 'arc') {
        earnArcoin(3, 'Supply crate ARC drop');
        shooterSpeech('🪙 +3 ARC!');
        sndCoinEarn();
      } else if (type === 'shield') {
        window._shieldEnd = Date.now() + 5000;
        shooterSpeech('🛡️ Shield active 5s!');
        sndAchievement();
        _showBuffBadge('🛡️ SHIELD', 5000);
      } else if (type === 'score') {
        window._scoreBoostEnd = Date.now() + 15000;
        shooterSpeech('⭐ 2X Score 15s!');
        sndAchievement();
        _showBuffBadge('⭐ 2X SCORE', 15000);
      }
      return false;
    });
    $canves.append($crate);
    sndCrateSpawn();
    // Countdown timer on the crate
    var _crateCountdown = 11;
    var _crateTimerInt = setInterval(function() {
      _crateCountdown--;
      if (_crateCountdown <= 0 || !$crate.parent().length) { clearInterval(_crateTimerInt); return; }
      $crate.find('.sc-timer').text(_crateCountdown);
    }, 1000);
    setTimeout(function() { if ($crate.parent().length) $crate.addClass('drop-expiring'); }, 8000);
    setTimeout(function() { if ($crate.parent().length) { clearInterval(_crateTimerInt); doExplosion(posLeft, posTop, 0.8); $crate.remove(); } }, 11000);
  }

  // ━━ NFT-exclusive equip functions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function equipFtDrone() {
    ftdroneUnlocked = true;
    currentWeapon = FTDRONE_WEAPON;
    ammo = FTDRONE_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    shooterSpeech('🔥 Fire-Throwing Drone deployed!');
    sndReload();
  }

  function equipTankCannon() {
    tankUnlocked = true;
    currentWeapon = TANK_WEAPON;
    ammo = TANK_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    shooterSpeech('🚨 T-72 Cannon online — FIRE!');
    sndReload();
  }

  function equipBradley() {
    bradleyUnlocked = true;
    currentWeapon = BRADLEY_WEAPON;
    ammo = BRADLEY_AMMO_MAX;
    $m16Toggle.addClass('hidden');
    renderAmmoUI();
    renderWeaponHands();
    renderWeaponSwitcher();
    shooterSpeech('⚡ Bradley Bushmaster loaded!');
    sndReload();
  }

  // ── Truck sounds ──────────────────────────────────────────────────
  function sndTruckEngine() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, t);
    osc.frequency.linearRampToValueAtTime(62, t + 0.5);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 1.0);
    const filt = ac.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 190;
    osc.connect(filt); filt.connect(g); g.connect(getMaster());
    osc.start(t); osc.stop(t + 1.0);
    // Two-tone horn
    setTimeout(() => { if (!mutedSounds) { tone(210, 'square', 0.16, 0.16, 30); setTimeout(() => tone(270, 'square', 0.11, 0.12, 40), 210); }}, 250);
  }

  function sndTruckHit() {
    if (mutedSounds) return;
    tone(1600, 'square', 0.1, 0.07, 500);
    noise(0.18, 900, 1.0, 0.18);
    tone(280, 'sawtooth', 0.07, 0.22, 90);
  }

  var _activeExplosionSounds = 0;
  function sndTruckExplode() {
    if (mutedSounds || _activeExplosionSounds >= 6) return;
    _activeExplosionSounds++;
    setTimeout(function(){ _activeExplosionSounds = Math.max(0, _activeExplosionSounds - 1); }, 600);
    const ac = getACtx(), t = ac.currentTime;
    // Thud
    const mkBuf = (dur, decay, gain, fc, start) => {
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(d.length*decay));
      const s = ac.createBufferSource(); s.buffer = b;
      const g = ac.createGain(); g.gain.value = gain;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc;
      s.connect(f); f.connect(g); g.connect(getMaster()); s.start(t + start);
    };
    mkBuf(0.06, 0.2,  1.0, 320,  0);     // compression thud
    mkBuf(0.55, 0.22, 1.7, 170,  0.06);  // main boom
    mkBuf(0.4,  0.55, 0.65, 3000, 0.08); // crackle debris (highpass via separate node)
    // Sub rumble
    setTimeout(() => { if (!mutedSounds) tone(38, 'sine', 0.22, 0.65, 12); }, 180);
    setTimeout(() => { if (!mutedSounds) tone(52, 'sine', 0.12, 0.4, 15); }, 260);
  }

  // ── Programmatic explosion ─────────────────────────────────────────
  const EXP_COLORS = ['#FF6600','#FF3300','#FFD700','#FF8800','#FFCC00','#FF4400','#FFFFFF','#FF2200'];

  function doExplosion(x, y, scale) {
    const s = scale || 1;
    // Spark particles
    const count = Math.round(16 * s);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (50 + Math.random() * 90) * s;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;
      const size = (3 + Math.random() * 7) * Math.min(s, 2);
      const col  = EXP_COLORS[Math.floor(Math.random() * EXP_COLORS.length)];
      const dur  = 800 + Math.random() * 600;
      const $p = $('<div class="exp-particle"></div>').css({
        left: x + 'px', top: y + 'px',
        width: size + 'px', height: size + 'px',
        background: col,
        '--dx': dx + 'px', '--dy': dy + 'px',
        animationDuration: dur + 'ms'
      });
      $canves.append($p);
      setTimeout(() => $p.remove(), dur + 60);
    }
    // Smoke puffs
    for (let i = 0; i < Math.round(5 * Math.min(s, 2)); i++) {
      const ox = (Math.random() - 0.5) * 60 * s;
      const oy = (Math.random() - 0.5) * 40 * s;
      const sz = (20 + Math.random() * 30) * Math.min(s, 1.5);
      const $sm = $('<div class="exp-smoke"></div>').css({
        left: (x + ox - sz/2) + 'px', top: (y + oy - sz/2) + 'px',
        width: sz + 'px', height: sz + 'px',
        animationDelay: (Math.random() * 100) + 'ms'
      });
      $canves.append($sm);
      setTimeout(() => $sm.remove(), 1800);
    }
    // Central flash
    const fsz = 120 * Math.min(s, 1.6);
    const $fl = $('<div class="exp-flash"></div>').css({
      left: (x - fsz/2) + 'px', top: (y - fsz/2) + 'px',
      width: fsz + 'px', height: fsz + 'px'
    });
    $canves.append($fl);
    setTimeout(() => $fl.remove(), 260);
    // Explosion audio + screen shake scaled to blast size
    if (s >= 0.6) { sndExplosion(); screenShake(Math.min(6, Math.round(s * 3)), Math.round(150 + s * 100)); }
  }

  // ─── Call-In Strike System ──────────────────────────────────────────────────

  function _ciRenderUI() {
    if (!gameActive) { _ciRaf = null; return; }
    const now = Date.now();
    ['arty','drones','himars','bradley','rover','firedrone','fpv'].forEach(k => {
      if (!_ciBtns[k]) _ciBtns[k] = $('#callin-' + k);
      const $btn = _ciBtns[k];
      if (!$btn.length) return;
      const cfg = CALLIN_CFG[k];
      const ms  = Math.max(0, _ciCdEnd[k] - now);
      const rdy = ms <= 0 && credits >= cfg.cost;
      $btn.toggleClass('ci-ready',    rdy)
          .toggleClass('ci-cooldown', ms > 0)
          .toggleClass('ci-broke',    ms <= 0 && !rdy);
      $btn.find('.ci-cd').text(ms > 0 ? Math.ceil(ms / 1000) + 's' : credits < cfg.cost ? '✗' : '✓');
    });
    _ciRaf = requestAnimationFrame(_ciRenderUI);
  }
  function _ciStart()  { if (!_ciRaf) _ciRenderUI(); }
  function _ciStop()   { if (_ciRaf) { cancelAnimationFrame(_ciRaf); _ciRaf = null; } }

  // ARTILLERY — 8 shells staggered, 90 px splash each
  function callInArtillery() {
    const cfg = CALLIN_CFG.arty, now = Date.now();
    if (!godMode && now < _ciCdEnd.arty) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInArtillery();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.arty = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\uD83C\uDFAF ARTILLERY INCOMING!', true);
    const cRect = $canves[0].getBoundingClientRect();
    const targets = $(_liveZ).toArray()
      .concat($canves.find('.drone-target').toArray())
      .sort(() => Math.random() - 0.5).slice(0, 8);
    targets.forEach(function ($z, i) {
      setTimeout(function () {
        if (!gameActive) return;
        const zr = $z.getBoundingClientRect();
        const cx = zr.left + zr.width  / 2 - cRect.left;
        const cy = zr.top  + zr.height / 2 - cRect.top;
        const $m = $('<div class="ci-marker ci-marker--arty"></div>').css({ left: (cx - 28) + 'px', top: (cy - 28) + 'px' });
        $canves.append($m);
        setTimeout(function () {
          $m.remove();
          sndTruckExplode(); doExplosion(cx, cy, 1.8);
          $(_liveZ).each(function () {
            const zr2 = this.getBoundingClientRect();
            const zx = zr2.left + zr2.width  / 2 - cRect.left;
            const zy = zr2.top  + zr2.height / 2 - cRect.top;
            if (Math.hypot(cx - zx, cy - zy) <= 95) killZombieEl($(this), zx, zy, false, false);
          });
          $canves.find('.drone-target').each(function () {
            const dr = this.getBoundingClientRect();
            const dx = dr.left + dr.width  / 2 - cRect.left;
            const dy = dr.top  + dr.height / 2 - cRect.top;
            if (Math.hypot(cx - dx, cy - dy) <= 95) {
              const $d = $(this);
              if ($d.data('stopBuzz')) $d.data('stopBuzz')();
              clearTimeout($d.data('reachTimer'));
              $d.off('click mousedown'); $d.remove();
              score += 200; credits += 8; updateScoreHUD();
              shooterSpeech('Drone down! ⚔️');
            }
          });
        }, 650);
      }, 350 + i * 290);
    });
  }

  // H.I.M.A.R.S — 12 cassette rockets → 36+ sub-munition blasts, clears entire field
  function _himarsShockwave(x, y) {
    var $sw = $('<div class="himars-shockwave"></div>').css({ left: x + 'px', top: y + 'px' });
    $canves.append($sw);
    setTimeout(function () { $sw.remove(); }, 600);
  }
  function _himarsGroundFire(x, y) {
    var sz = 30 + Math.random() * 50;
    var $gf = $('<div class="himars-ground-fire"></div>').css({
      left: (x - sz/2) + 'px', top: (y - sz/4) + 'px',
      width: sz + 'px', height: sz * 0.5 + 'px'
    });
    $canves.append($gf);
    setTimeout(function () { $gf.remove(); }, 2400);
  }
  function _himarsDebris(x, y, count) {
    var DCOLS = ['#444','#666','#8B4513','#A0522D','#333','#222'];
    for (var d = 0; d < (count || 6); d++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 60 + Math.random() * 100;
      var ddx = Math.cos(ang) * spd;
      var ddy = Math.sin(ang) * spd - 40; // arc upward
      var dur = 600 + Math.random() * 500;
      var sz  = 2 + Math.random() * 5;
      var rot = (Math.random() * 720 - 360) + 'deg';
      var $db = $('<div class="himars-debris"></div>').css({
        left: x + 'px', top: y + 'px',
        width: sz + 'px', height: sz * (0.4 + Math.random() * 0.6) + 'px',
        background: DCOLS[Math.floor(Math.random() * DCOLS.length)],
        '--ddx': ddx + 'px', '--ddy': ddy + 'px', '--dr': rot, '--dur': dur + 'ms'
      });
      $canves.append($db);
      setTimeout((function ($e) { return function () { $e.remove(); }; })($db), dur + 60);
    }
  }
  function callInHIMARs() {
    const cfg = CALLIN_CFG.himars, now = Date.now();
    if (!godMode && now < _ciCdEnd.himars) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInHIMARs();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.himars = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\uD83D\uDE80 H.I.M.A.R.S \u2014 FIRE FOR EFFECT!', true);
    const cRect = $canves[0].getBoundingClientRect();
    const cw = $canves.width(), ch = $canves.height();
    for (let r = 0; r < 12; r++) {
      (function (ri) {
        const delay = ri * 210 + Math.random() * 80;
        setTimeout(function () {
          if (!gameActive) return;
          const rx      = 40 + Math.random() * (cw - 80);
          const targetY = ch * (0.18 + Math.random() * 0.64);
          const dropMs  = 300 + Math.random() * 200;
          const $rkt = $('<div class="himars-rocket"></div>').css({ left: rx + 'px', top: '-44px' });
          $canves.append($rkt);
          $rkt.animate({ top: targetY + 'px' }, dropMs, function () {
            $rkt.remove();
            // Shockwave ring at impact point
            _himarsShockwave(rx, targetY);
            // Cassette sub-munitions scatter outward
            for (let s = 0; s < 3; s++) {
              (function (si) {
                setTimeout(function () {
                  const bx = rx + (Math.random() - 0.5) * 120;
                  const by = targetY + (Math.random() - 0.5) * 80;
                  doExplosion(bx, by, 1.8); sndTruckExplode();
                  _himarsGroundFire(bx, by);
                  _himarsDebris(bx, by, 5 + Math.floor(Math.random() * 4));
                  $(_liveZ).each(function () {
                    const zr = this.getBoundingClientRect();
                    const zx = zr.left + zr.width  / 2 - cRect.left;
                    const zy = zr.top  + zr.height / 2 - cRect.top;
                    if (Math.hypot(bx - zx, by - zy) <= 130) killZombieEl($(this), zx, zy, false, false);
                  });
                  $canves.find('.drone-target').each(function () {
                    const dr = this.getBoundingClientRect();
                    const dx = dr.left + dr.width  / 2 - cRect.left;
                    const dy = dr.top  + dr.height / 2 - cRect.top;
                    if (Math.hypot(bx - dx, by - dy) <= 130) {
                      const $d = $(this);
                      if ($d.data('stopBuzz')) $d.data('stopBuzz')();
                      clearTimeout($d.data('reachTimer'));
                      $d.off('click mousedown'); $d.remove();
                      score += 200; credits += 8; updateScoreHUD();
                      shooterSpeech('Drone down! ⚔️');
                    }
                  });
                }, si * 90);
              })(s);
            }
          });
        }, delay);
      })(r);
    }
    // Climactic screen shake + white flash at the end
    setTimeout(function () {
      if (!gameActive) return;
      $canves.addClass('himars-quake');
      const $wf = $('<div></div>').css({ position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(255,255,255,0.85)',pointerEvents:'none',zIndex:900000 });
      $canves.append($wf);
      setTimeout(function () { $canves.removeClass('himars-quake'); $wf.fadeOut(400, function(){ $wf.remove(); }); }, 950);
    }, 2400);
  }

  // ── Bradley IFV call-in — drives across field, fires Bushmaster at targets ──
  function callInBradley() {
    const cfg = CALLIN_CFG.bradley, now = Date.now();
    if (!godMode && now < _ciCdEnd.bradley) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInBradley();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.bradley = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\u26A1 BRADLEY IFV — BUSHMASTER ENGAGE!', true);
    const cRect = $canves[0].getBoundingClientRect();
    const cw = $canves.width(), ch = $canves.height();
    const groundY = ch * 0.72;
    const brdH = 252;
    const $brd = $('<div class="bradley-ci" style="position:absolute;z-index:18;pointer-events:none">' +
      '<img src="images/vehicles/bradley.png" alt="Bradley" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="brd-muzzle-flash"></div>' +
      '</div>').css({ left: '-300px', top: (groundY - brdH * 0.62) + 'px' });
    $canves.append($brd);
    const travelMs = ((cw + 340) / 115) * 1000;
    let burstCount = 0;
    const fireInterval = setInterval(function () {
      if (!gameActive || gamePaused) return;
      const bPos = parseInt($brd.css('left')) || 0;
      if (bPos > cw + 300) { clearInterval(fireInterval); return; }
      // Muzzle position: barrel tip ~82% across image, 28% from top
      const imgEl = $brd.find('img')[0];
      const imgW  = imgEl ? imgEl.offsetWidth : brdH * 1.46;
      const muzzleX = bPos + imgW * 0.82;
      const muzzleY = parseFloat($brd.css('top')) + brdH * 0.28;
      const $zombies = $(_liveZ);
      let nearest = null, nearDist = 999999;
      $zombies.each(function () {
        const zr = this.getBoundingClientRect();
        const zx = zr.left - cRect.left + zr.width  / 2;
        const zy = zr.top  - cRect.top  + zr.height / 2;
        const dist = Math.hypot(zx - muzzleX, zy - muzzleY);
        if (dist < nearDist) { nearDist = dist; nearest = { el: $(this), x: zx, y: zy }; }
      });
      if (nearest && nearDist < 520) {
        // Muzzle flash
        const $mf = $brd.find('.brd-muzzle-flash');
        $mf.addClass('active'); setTimeout(() => $mf.removeClass('active'), 60);
        // Tracer round
        const dx = nearest.x - muzzleX, dy = nearest.y - muzzleY;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const len = Math.hypot(dx, dy);
        const $tr = $('<div class="brd-tracer"></div>').css({
          left: muzzleX + 'px', top: muzzleY + 'px',
          width: len + 'px', transform: 'rotate(' + ang + 'deg)',
          transformOrigin: '0 50%'
        });
        $canves.append($tr); setTimeout(() => $tr.remove(), 70);
        sndBushmaster();
        burstCount++;
        if (burstCount % 3 === 0) {
          doExplosion(nearest.x, nearest.y, 0.9);
          killZombieEl(nearest.el, nearest.x, nearest.y, false, false);
          score += 90; credits += 5; updateScoreHUD();
        } else {
          doHitMarker(nearest.x, nearest.y, false);
          const curHp = parseInt(nearest.el.attr('data-hp') || '10');
          if (curHp - 9 <= 0) { killZombieEl(nearest.el, nearest.x, nearest.y, false, false); score += 90; credits += 5; updateScoreHUD(); }
          else { nearest.el.attr('data-hp', curHp - 9); }
        }
      }
      $canves.find('.truck-target').each(function () {
        const tr2 = this.getBoundingClientRect();
        const tx = tr2.left - cRect.left + tr2.width  / 2;
        const ty = tr2.top  - cRect.top  + tr2.height / 2;
        if (Math.hypot(tx - (bPos + 60), ty - groundY) < 280) {
          let hp = parseInt($(this).attr('data-hp')) || 0;
          let mhp = parseInt($(this).attr('data-max-hp')) || 1;
          hp = Math.max(0, hp - 10);
          $(this).attr('data-hp', hp).data('hp', hp).find('.truck-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
          if (hp <= 0) { trucksOnScreen = Math.max(0, trucksOnScreen - 1); $(this).off('click').remove(); sndTruckExplode(); score += 500; credits += 20; updateScoreHUD(); }
        }
      });
      // Bradley also damages tanks
      $canves.find('.tank-target').each(function () {
        const tr2 = this.getBoundingClientRect();
        const tx = tr2.left - cRect.left + tr2.width  / 2;
        const ty = tr2.top  - cRect.top  + tr2.height / 2;
        if (Math.hypot(tx - (bPos + 60), ty - groundY) < 280) {
          let hp = parseInt($(this).attr('data-hp')) || 0;
          let mhp = parseInt($(this).attr('data-max-hp')) || 1;
          hp = Math.max(0, hp - 5);
          $(this).attr('data-hp', hp).find('.tank-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
          $(this).addClass('tank-hit'); setTimeout(() => $(this).removeClass('tank-hit'), 140);
          if (hp <= 0) {
            const cr2 = $canves[0].getBoundingClientRect();
            doExplosion(tx, ty, 3.5); sndTruckExplode();
            tanksOnScreen = Math.max(0, tanksOnScreen - 1);
            score += 500 + wave * 100; credits += 25; updateScoreHUD();
            shooterSpeech('💥 TANK DESTROYED!', true);
            $(this).off('click'); setTimeout(() => $(this).remove(), 1100);
          }
        }
      });
    }, 45); // gatling ~1300 rpm
    $brd.animate({ left: (cw + 340) + 'px' }, travelMs, 'linear', function () {
      clearInterval(fireInterval); $brd.remove();
    });
  }
  // ── Fire Drone — napalm sweep, ignites ground, area DoT ──────────
  function callInFiredrone() {
    const cfg = CALLIN_CFG.firedrone, now = Date.now();
    if (!godMode && now < _ciCdEnd.firedrone) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInFiredrone();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.firedrone = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\uD83D\uDD25 FIRE DRONE INBOUND!', true);
    const cw = $canves.width(), ch = $canves.height();
    const flyY = ch * 0.28 + Math.random() * ch * 0.18;
    const cRect = $canves[0].getBoundingClientRect();
    const $fd = $('<div class="firedrone-ci"><img src="images/vehicles/firedrone.png" alt="Fire Drone"><span class="fd-flame">\uD83D\uDD25</span></div>')
      .css({ left: (cw + 40) + 'px', top: flyY + 'px' });
    $canves.append($fd);
    const travelMs = ((cw + 180) / 200) * 1000;
    let dropCount = 0;
    const dropInterval = setInterval(function () {
      if (!gameActive || gamePaused) return;
      const fdPos = parseInt($fd.css('left')) || cw;
      if (fdPos < -80 || dropCount >= 6) { clearInterval(dropInterval); return; }
      const dropX = fdPos + 20;
      const dropY = flyY + 30 + Math.random() * (ch * 0.35);
      // Napalm splat
      const $fire = $('<div class="napalm-splat">\uD83D\uDD25</div>').css({ left: dropX + 'px', top: dropY + 'px' });
      $canves.append($fire);
      setTimeout(function() { $fire.remove(); }, 1800);
      // Fire pool — any zombie in radius takes damage every 400ms for 1.6s
      let ticks = 0;
      const poolId = setInterval(function() {
        ticks++;
        if (ticks > 4) { clearInterval(poolId); return; }
        const cRectNow = $canves[0].getBoundingClientRect();
        $(_liveZ).each(function() {
          const zr = this.getBoundingClientRect();
          const zx = zr.left - cRectNow.left + zr.width / 2;
          const zy = zr.top  - cRectNow.top  + zr.height / 2;
          if (Math.hypot(zx - dropX, zy - dropY) < 95) {
            applyZombieDmg($(this), 2, zx, zy, false, false);
          }
        });
        // Napalm also burns trucks
        $canves.find('.truck-target').each(function() {
          const tr2 = this.getBoundingClientRect();
          const tx = tr2.left - cRectNow.left + tr2.width / 2;
          const ty = tr2.top  - cRectNow.top  + tr2.height / 2;
          if (Math.hypot(tx - dropX, ty - dropY) < 110) {
            let hp = parseInt($(this).attr('data-hp')) || 0;
            let mhp = parseInt($(this).attr('data-max-hp')) || 1;
            hp = Math.max(0, hp - 4);
            $(this).attr('data-hp', hp).data('hp', hp).find('.truck-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
            if (hp <= 0) { trucksOnScreen = Math.max(0, trucksOnScreen - 1); $(this).off('click').remove(); sndTruckExplode(); score += 500; credits += 20; updateScoreHUD(); }
          }
        });
        // Napalm also burns tanks
        $canves.find('.tank-target').each(function() {
          const tr2 = this.getBoundingClientRect();
          const tx = tr2.left - cRectNow.left + tr2.width / 2;
          const ty = tr2.top  - cRectNow.top  + tr2.height / 2;
          if (Math.hypot(tx - dropX, ty - dropY) < 110) {
            let hp = parseInt($(this).attr('data-hp')) || 0;
            let mhp = parseInt($(this).attr('data-max-hp')) || 1;
            hp = Math.max(0, hp - 2);
            $(this).attr('data-hp', hp).find('.tank-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
            $(this).addClass('tank-hit'); setTimeout(() => $(this).removeClass('tank-hit'), 140);
            if (hp <= 0) {
              tanksOnScreen = Math.max(0, tanksOnScreen - 1);
              doExplosion(tx, ty, 3.5); sndTruckExplode();
              score += 500 + wave * 100; credits += 25; updateScoreHUD();
              shooterSpeech('\ud83d\udca5 TANK DESTROYED!', true);
              $(this).off('click'); setTimeout(() => $(this).remove(), 1100);
            }
          }
        });
      }, 400);
      // Play a fire whoosh each drop
      (function() {
        const ac = getACtx(), t = ac.currentTime;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(220 + Math.random()*80, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.5);
      })();
      dropCount++;
    }, Math.round(travelMs / 6));
    $fd.animate({ left: '-80px' }, { duration: travelMs, easing: 'linear',
      complete: function() { clearInterval(dropInterval); $fd.remove(); } });
    score += 40; updateScoreHUD();
  }

  // ── FPV Drone call-in — precision dive-bomb on densest enemy cluster ───────
  function callInFpvDrone() {
    const cfg = CALLIN_CFG.fpv, now = Date.now();
    if (!godMode && now < _ciCdEnd.fpv) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInFpvDrone();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.fpv = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\uD83D\uDC1D FPV DRONE STRIKE!', true);
    const cw = $canves.width(), ch = $canves.height();
    const cRect = $canves[0].getBoundingClientRect();
    // Find the densest cluster target
    let targetX = cw * 0.5, targetY = ch * 0.55;
    let best = 0;
    $(_liveZ).each(function() {
      const zr = this.getBoundingClientRect();
      const zx = zr.left - cRect.left + zr.width / 2;
      const zy = zr.top  - cRect.top  + zr.height / 2;
      let nearby = 0;
      $(_liveZ).each(function() {
        const zr2 = this.getBoundingClientRect();
        const zx2 = zr2.left - cRect.left + zr2.width / 2;
        const zy2 = zr2.top  - cRect.top  + zr2.height / 2;
        if (Math.hypot(zx2 - zx, zy2 - zy) < 140) nearby++;
      });
      if (nearby > best) { best = nearby; targetX = zx; targetY = zy; }
    });
    // FPV enters from top-right, dives toward target
    const startX = cw * 0.85 + Math.random() * cw * 0.1;
    const startY = -40;
    const $fpv = $('<div class="fpv-ci"><img src="images/vehicles/fpv.png" alt="FPV Drone"></div>')
      .css({ left: startX + 'px', top: startY + 'px' });
    $canves.append($fpv);
    // FPV buzzing sound — rising pitch dive
    (function() {
      const ac = getACtx(), t = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(800, t); o.frequency.linearRampToValueAtTime(3200, t + 1.2);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 1.3);
    })();
    const dx = targetX - startX, dy = targetY - startY;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    $fpv.css('transform', 'rotate(' + (ang - 90) + 'deg)');
    const dist = Math.hypot(dx, dy);
    const diveDur = Math.max(600, dist / 280 * 1000);
    $fpv.animate({ left: targetX + 'px', top: targetY + 'px' },
      { duration: diveDur, easing: 'linear',
        complete: function() {
          $fpv.remove();
          // Big explosion on impact
          doExplosion(targetX, targetY, 2.8);
          sndTruckExplode();
          // Kill/damage all enemies in blast radius 140px
          $(_liveZ).each(function() {
            const zr = this.getBoundingClientRect();
            const cRN = $canves[0].getBoundingClientRect();
            const zx = zr.left - cRN.left + zr.width / 2;
            const zy = zr.top  - cRN.top  + zr.height / 2;
            if (Math.hypot(zx - targetX, zy - targetY) <= 140) {
              applyZombieDmg($(this), 999, zx, zy, true, false);
            }
          });
          // Damage trucks
          $canves.find('.truck-target').each(function() {
            const tr2 = this.getBoundingClientRect();
            const cRN2 = $canves[0].getBoundingClientRect();
            const tx = tr2.left - cRN2.left + tr2.width  / 2;
            const ty = tr2.top  - cRN2.top  + tr2.height / 2;
            if (Math.hypot(tx - targetX, ty - targetY) <= 180) {
              let hp  = parseInt($(this).attr('data-hp')) || 0;
              let mhp = parseInt($(this).attr('data-max-hp')) || 1;
              hp = Math.max(0, hp - 40);
              $(this).attr('data-hp', hp).data('hp', hp).find('.truck-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
              if (hp <= 0) { trucksOnScreen = Math.max(0, trucksOnScreen - 1); $(this).off('click').remove(); sndTruckExplode(); score += 500; credits += 20; updateScoreHUD(); }
            }
          });
          // FPV also damages tanks in blast radius
          $canves.find('.tank-target').each(function() {
            const tr3 = this.getBoundingClientRect();
            const cRN3 = $canves[0].getBoundingClientRect();
            const tkx = tr3.left - cRN3.left + tr3.width  / 2;
            const tky = tr3.top  - cRN3.top  + tr3.height / 2;
            if (Math.hypot(tkx - targetX, tky - targetY) <= 180) {
              let hp  = parseInt($(this).attr('data-hp')) || 0;
              let mhp = parseInt($(this).attr('data-max-hp')) || 1;
              hp = Math.max(0, hp - 20);
              $(this).attr('data-hp', hp).find('.tank-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
              $(this).addClass('tank-hit'); setTimeout(() => $(this).removeClass('tank-hit'), 140);
              if (hp <= 0) {
                tanksOnScreen = Math.max(0, tanksOnScreen - 1);
                doExplosion(tkx, tky, 3.5); sndTruckExplode();
                score += 500 + wave * 100; credits += 25; updateScoreHUD();
                shooterSpeech('\ud83d\udca5 TANK DESTROYED!', true);
                $(this).off('click'); setTimeout(() => $(this).remove(), 1100);
              }
            }
          });
          score += 180; credits += 8; updateScoreHUD();
        }
      });
  }

  // ── Recon Rover call-in — fast sweep, suppresses enemies ─────────────────
  function callInRover() {
    const cfg = CALLIN_CFG.rover, now = Date.now();
    if (!godMode && now < _ciCdEnd.rover) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInRover();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.rover = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('\uD83E\uDD16 ROVER DEPLOYED \u2014 SWEEPING!', true);
    const cRect = $canves[0].getBoundingClientRect();
    const cw = $canves.width(), ch = $canves.height();
    const rovY = ch * 0.72;
    const rovH = 76;
    const $rov = $('<div class="rover-ci" style="position:absolute;z-index:18;pointer-events:none">' +
      '<img src="images/vehicles/rover.png" alt="Rover" onerror="this.style.visibility=\'hidden\'">' +
      '<div class="rov-muzzle-flash"></div>' +
      '</div>').css({ left: '-80px', top: (rovY - rovH * 0.6) + 'px' });
    $canves.append($rov);
    const travelMs = ((cw + 100) / 300) * 1000;
    let rovBurst = 0;
    const fireInterval = setInterval(function () {
      if (!gameActive || gamePaused) return;
      const rPos = parseInt($rov.css('left')) || 0;
      if (rPos > cw + 80) { clearInterval(fireInterval); return; }
      const $rmf = $rov.find('.rov-muzzle-flash');
      // Rover fires from turret tip — ~75% across image, 30% from top
      const rovImgEl = $rov.find('img')[0];
      const rovImgW  = rovImgEl ? rovImgEl.offsetWidth : 120;
      const rovMuzzleX = rPos + rovImgW * 0.75;
      const rovMuzzleY = parseFloat($rov.css('top')) + rovH * 0.3;
      let nearest = null, nearDist = 999999;
      $(_liveZ).each(function () {
        const zr = this.getBoundingClientRect();
        const zx = zr.left - cRect.left + zr.width  / 2;
        const zy = zr.top  - cRect.top  + zr.height / 2;
        const dist = Math.hypot(zx - rovMuzzleX, zy - rovMuzzleY);
        if (dist < nearDist) { nearDist = dist; nearest = { el: $(this), x: zx, y: zy }; }
      });
      if (nearest && nearDist < 700) {
        $rmf.addClass('active'); setTimeout(() => $rmf.removeClass('active'), 50);
        // Tracer round
        const dx = nearest.x - rovMuzzleX, dy = nearest.y - rovMuzzleY;
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        const len = Math.hypot(dx, dy);
        const $tr = $('<div class="brd-tracer"></div>').css({
          left: rovMuzzleX + 'px', top: rovMuzzleY + 'px',
          width: len + 'px', transform: 'rotate(' + ang + 'deg)',
          transformOrigin: '0 50%'
        });
        $canves.append($tr); setTimeout(() => $tr.remove(), 70);
        sndBushmaster();
        rovBurst++;
        if (rovBurst % 3 === 0) {
          doExplosion(nearest.x, nearest.y, 0.7);
          killZombieEl(nearest.el, nearest.x, nearest.y, false, false);
          score += 45; credits += 2; updateScoreHUD();
        } else {
          doHitMarker(nearest.x, nearest.y, false);
          const curHp = parseInt(nearest.el.attr('data-hp') || '10');
          if (curHp - 6 <= 0) { killZombieEl(nearest.el, nearest.x, nearest.y, false, false); score += 45; credits += 2; updateScoreHUD(); }
          else { nearest.el.attr('data-hp', curHp - 6); }
        }
      }
      // Rover also rams / disables enemy trucks in its sweep path
      $canves.find('.truck-target').each(function () {
        const tr2 = this.getBoundingClientRect();
        const tx = tr2.left - cRect.left + tr2.width  / 2;
        const ty = tr2.top  - cRect.top  + tr2.height / 2;
        if (Math.hypot(tx - rPos, ty - rovY) < 220) {
          let hp  = parseInt($(this).attr('data-hp'))     || 0;
          let mhp = parseInt($(this).attr('data-max-hp')) || 1;
          hp = Math.max(0, hp - 6);
          $(this).attr('data-hp', hp).data('hp', hp).find('.truck-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
          doExplosion(tx, ty, 0.5);
          if (hp <= 0) {
            trucksOnScreen = Math.max(0, trucksOnScreen - 1);
            $(this).off('click').remove();
            sndTruckExplode();
            score += 300; credits += 10; updateScoreHUD();
          }
        }
      });
      // Rover also damages tanks
      $canves.find('.tank-target').each(function () {
        const tr2 = this.getBoundingClientRect();
        const tx = tr2.left - cRect.left + tr2.width  / 2;
        const ty = tr2.top  - cRect.top  + tr2.height / 2;
        if (Math.hypot(tx - rPos, ty - rovY) < 220) {
          let hp = parseInt($(this).attr('data-hp')) || 0;
          let mhp = parseInt($(this).attr('data-max-hp')) || 1;
          hp = Math.max(0, hp - 3);
          $(this).attr('data-hp', hp).find('.tank-hp-fill').css('width', Math.max(0, hp / mhp * 100) + '%');
          $(this).addClass('tank-hit'); setTimeout(() => $(this).removeClass('tank-hit'), 140);
          doExplosion(tx, ty, 0.5);
          if (hp <= 0) {
            tanksOnScreen = Math.max(0, tanksOnScreen - 1);
            doExplosion(tx, ty, 3.5); sndTruckExplode();
            score += 500 + wave * 100; credits += 25; updateScoreHUD();
            shooterSpeech('💥 TANK DESTROYED!', true);
            $(this).off('click'); setTimeout(() => $(this).remove(), 1100);
          }
        }
      });
    }, 380);
    $rov.animate({ left: (cw + 80) + 'px' }, travelMs, 'linear', function () {
      clearInterval(fireInterval); $rov.remove();
    });
  }

  // ── Call-In: Drone Swarm ──────────────────────────────────────────
  function callInDrones() {
    if (!gameActive) return;
    const cfg = CALLIN_CFG.drones, now = Date.now();
    if (!godMode && now < _ciCdEnd.drones) return;
    if (!godMode && credits < cfg.cost) {
      _showInGameOffer('credits', '⚡ Need ' + cfg.cost + '₴', '+500 credits', 5, function() {
        credits += 500; updateScoreHUD();
        shooterSpeech('₴ +500 credits!'); callInDrones();
      });
      return;
    }
    if (!godMode) { credits -= cfg.cost; updateScoreHUD(); }
    _ciCdEnd.drones = godMode ? 0 : now + cfg.cooldown;
    shooterSpeech('🛩 DRONE SWARM INBOUND!', true);
    var count = 3 + Math.min(2, Math.floor(wave / 2));
    for (var i = 0; i < count; i++) {
      (function(delay) {
        setTimeout(function() { if (gameActive) spawnDrone(); }, delay);
      })(i * 600);
    }
  }

  // ── Multi-truck system ────────────────────────────────────────────
  let trucksOnScreen = 0;
  const MAX_TRUCKS = gcfg('vehicles','max_trucks',2);
  let truckSpawnTimer = null;

  function spawnTruck(maxHp, speedFactor) {
    if (trucksOnScreen >= MAX_TRUCKS) return;
    trucksOnScreen++;
    const hp  = maxHp   || (gcfg('vehicles','truck_hp_base',6) + wave * gcfg('vehicles','truck_hp_per_wave',2));
    const spd = speedFactor || (gcfg('vehicles','truck_speed_base',0.72) + wave * gcfg('vehicles','truck_speed_per_wave',0.1));
    const dur = Math.round(6 / spd * 10) / 10;
    const bot = 55 + getRandom(0, 32);
    const $truck = $(`<div class="truck-target" role="button" aria-label="Enemy truck" tabindex="0"
          data-hp="${hp}" data-max-hp="${hp}"
          style="animation-duration:${dur}s; bottom:${bot}px">
        <div class="truck-hp-bar"><span class="truck-hp-fill" style="width:100%"></span></div>
        <img src="images/vehicles/truck.png" alt="Enemy truck" draggable="false"
             onerror="this.style.width='120px';this.style.height='60px';this.style.background='#3a2200';this.style.border='2px dashed #ff4400';">
        <span class="truck-label">⚠ TRUCK</span>
      </div>`);
    $canves.append($truck);
    sndTruckEngine();
    // Stop mousedown from reaching the canvas auto-fire handler; also halt any ongoing auto-fire
    $truck.on('mousedown', e => { e.stopPropagation(); stopM16Fire(); });
    let truckHitPending = false; // debounce rapid clicks
    $truck.on('click', function (e) {
      e.stopPropagation();
      if (truckHitPending) return;         // absorb rapid double-click
      if (ammo <= 0 && currentWeapon !== REVOLVER_WEAPON) { sndNoAmmo(); return; }
      truckHitPending = true;
      setTimeout(() => { truckHitPending = false; }, 60);
      if (currentWeapon !== REVOLVER_WEAPON) ammo--;
      const rect = $canves[0].getBoundingClientRect();
      const ex   = e.clientX - rect.left;
      const ey   = e.clientY - rect.top;
      doMuzzleFlash(ex, ey);
      renderAmmoUI();
      // Read HP from DOM attribute (authoritative) then update both cache + attr
      let curHp = parseInt($truck.attr('data-hp'));
      if (isNaN(curHp)) curHp = hp;
      const dmg = (WEAPONS[currentWeapon] || WEAPONS.revolver).truckDmg;
      curHp -= dmg;
      $truck.data('hp', curHp).attr('data-hp', curHp);
      doExplosion(ex, ey, 0.35);
      sndTruckHit();
      $truck.addClass('truck-hit');
      setTimeout(() => $truck.removeClass('truck-hit'), 130);
      const pct = Math.max(0, curHp / hp) * 100;
      $truck.find('.truck-hp-fill').css('width', pct + '%');
      if (curHp <= 0) {
        $truck.off('click');
        $truck.addClass('exploding');
        const tr = $truck[0].getBoundingClientRect();
        const cr = $canves[0].getBoundingClientRect();
        const cx = tr.left - cr.left + tr.width  / 2;
        const cy = tr.top  - cr.top  + tr.height / 2;
        doExplosion(cx, cy, 2.5);
        setTimeout(() => doExplosion(cx + getRandom(-40,40), cy + getRandom(-20,20), 1.8), 130);
        setTimeout(() => doExplosion(cx + getRandom(-60,60), cy + getRandom(-30,30), 1.2), 280);
        sndTruckExplode();
        score += 300 + wave * 50;
        credits += 15;
        updateScoreHUD();
        shooterSpeech('💥 TRUCK DOWN! +' + (300 + wave * 50));
        trucksOnScreen = Math.max(0, trucksOnScreen - 1);
        setTimeout(() => $truck.remove(), 850);
      }
    });
    // Auto-remove when driven off screen
    setTimeout(() => {
      if ($truck.parent().length) {
        trucksOnScreen = Math.max(0, trucksOnScreen - 1);
        $truck.remove();
      }
    }, (dur + 0.9) * 1000);
  }

  function stopTruckSpawner() {
    if (truckSpawnTimer) { clearInterval(truckSpawnTimer); truckSpawnTimer = null; }
  }

  // ─── SVG Russian T-72 / T-80 Tank (vector) ───────────────────────
  // Tank raster override: if tank.png exists and admin enabled it, use <img> instead of SVG
  var tankRasterOverride = false;
  (function checkTankRaster() {
    var img = new Image();
    img.onload = function() { tankRasterOverride = true; };
    img.onerror = function() { tankRasterOverride = false; };
    img.src = 'images/vehicles/tank.png?check=' + Date.now();
  })();
  const TANK_SVG = `<svg width="275" height="103" viewBox="0 0 220 82" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tkH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#556628"/>
        <stop offset="100%" stop-color="#3a4a18"/>
      </linearGradient>
      <linearGradient id="tkT" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a5a22"/>
        <stop offset="100%" stop-color="#2e3a14"/>
      </linearGradient>
      <linearGradient id="tkTr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a2a20"/>
        <stop offset="100%" stop-color="#14140e"/>
      </linearGradient>
    </defs>
    <!-- Track assembly -->
    <rect x="4" y="58" width="212" height="22" rx="5" fill="url(#tkTr)" stroke="#111" stroke-width="1"/>
    <!-- Track links (tick marks) -->
    <line x1="12" y1="58" x2="12" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="27" y1="58" x2="27" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="42" y1="58" x2="42" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="57" y1="58" x2="57" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="72" y1="58" x2="72" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="87" y1="58" x2="87" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="102" y1="58" x2="102" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="117" y1="58" x2="117" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="132" y1="58" x2="132" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="147" y1="58" x2="147" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="162" y1="58" x2="162" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="177" y1="58" x2="177" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="192" y1="58" x2="192" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <line x1="207" y1="58" x2="207" y2="80" stroke="#0d0d08" stroke-width="1.5"/>
    <!-- Idler wheel left -->
    <circle cx="14" cy="66" r="11" fill="#222" stroke="#111" stroke-width="1.5"/>
    <circle cx="14" cy="66" r="6"  fill="#333"/>
    <circle cx="14" cy="66" r="2.5" fill="#555"/>
    <!-- Drive sprocket right -->
    <circle cx="206" cy="66" r="11" fill="#222" stroke="#111" stroke-width="1.5"/>
    <circle cx="206" cy="66" r="6"  fill="#333"/>
    <circle cx="206" cy="66" r="2.5" fill="#555"/>
    <!-- Road wheels (5 evenly spaced) -->
    <circle cx="46"  cy="64" r="9" fill="#2a2a20" stroke="#111" stroke-width="1"/><circle cx="46"  cy="64" r="4" fill="#404038"/>
    <circle cx="82"  cy="64" r="9" fill="#2a2a20" stroke="#111" stroke-width="1"/><circle cx="82"  cy="64" r="4" fill="#404038"/>
    <circle cx="118" cy="64" r="9" fill="#2a2a20" stroke="#111" stroke-width="1"/><circle cx="118" cy="64" r="4" fill="#404038"/>
    <circle cx="154" cy="64" r="9" fill="#2a2a20" stroke="#111" stroke-width="1"/><circle cx="154" cy="64" r="4" fill="#404038"/>
    <circle cx="174" cy="64" r="9" fill="#2a2a20" stroke="#111" stroke-width="1"/><circle cx="174" cy="64" r="4" fill="#404038"/>
    <!-- Hull body (trapezoid, angled glacis) -->
    <polygon points="20,60 10,34 210,34 214,60" fill="url(#tkH)" stroke="#2a3410" stroke-width="1"/>
    <!-- Angled glacis (front slope, left side) -->
    <polygon points="10,34 20,60 32,60 20,34" fill="#3e4e1c" stroke="#2a3410" stroke-width="0.5"/>
    <!-- Side skirts (ERA-like blocks) -->
    <rect x="28" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <rect x="56" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <rect x="84" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <rect x="112" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <rect x="140" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <rect x="168" y="42" width="24" height="14" rx="1" fill="#4a5820" stroke="#303810" stroke-width="1"/>
    <!-- ERA blocks on hull front -->
    <rect x="18" y="36" width="12" height="9"  rx="1" fill="#3e4e18" stroke="#2a3010" stroke-width="0.8"/>
    <!-- Turret base plate -->
    <ellipse cx="118" cy="34" rx="52" ry="10" fill="#363e18"/>
    <!-- Turret body -->
    <rect x="68" y="14" width="100" height="26" rx="9" fill="url(#tkT)" stroke="#2a3010" stroke-width="1"/>
    <!-- Turret front arc -->
    <ellipse cx="168" cy="27" rx="14" ry="13" fill="#2e3a14" stroke="#1e280a" stroke-width="1"/>
    <!-- ERA tiles on turret -->
    <rect x="80"  y="17" width="14" height="8" rx="1" fill="#404e18" stroke="#2a3010" stroke-width="0.8"/>
    <rect x="100" y="17" width="14" height="8" rx="1" fill="#404e18" stroke="#2a3010" stroke-width="0.8"/>
    <rect x="120" y="17" width="14" height="8" rx="1" fill="#404e18" stroke="#2a3010" stroke-width="0.8"/>
    <!-- Commander hatch -->
    <ellipse cx="148" cy="16" rx="10" ry="5" fill="#2a3210" stroke="#1a2008" stroke-width="1"/>
    <rect x="143" y="10" width="10" height="6" rx="2" fill="#1e2808"/>
    <!-- Gunner periscope -->
    <rect x="96" y="12" width="12" height="5" rx="1" fill="#1a2008" stroke="#111" stroke-width="0.5"/>
    <!-- Gun barrel (pointing LEFT — facing the player) -->
    <rect x="0" y="21" width="84" height="8" rx="2" fill="#2a3215" stroke="#1a2208" stroke-width="1"/>
    <!-- Muzzle brake -->
    <rect x="0" y="19" width="10" height="12" rx="2" fill="#1e2810" stroke="#111" stroke-width="1"/>
    <line x1="3" y1="24" x2="8" y2="24" stroke="rgba(255,255,200,0.15)" stroke-width="0.8"/>
    <!-- Coaxial MG -->
    <rect x="64" y="30" width="18" height="3" rx="1" fill="#1a2008"/>
    <!-- War crime Z marking on turret -->
    <text x="110" y="34" font-family="Impact,Arial Black,sans-serif" font-size="16" font-weight="900" fill="#FFDD00" stroke="#aa8800" stroke-width="0.5" letter-spacing="0">Z</text>
    <!-- Red star on hull side -->
    <polygon points="195,45 197,41 199,45 203,45 200,47 201,51 197,49 193,51 194,47 191,45" fill="#cc1100" stroke="#880000" stroke-width="0.5"/>
  </svg>`;

  // ─── SVG Russian BTR-80 APC (vector) ──────────────────────────────
  const APC_SVG = `<svg width="220" height="88" viewBox="0 0 180 72" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="apcH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5a6830"/>
        <stop offset="100%" stop-color="#3e4e1c"/></linearGradient>
    </defs>
    <!-- Wheels (4 axle) -->
    <circle cx="28" cy="60" r="11" fill="#2a2a1a" stroke="#1a1a0a" stroke-width="2"/>
    <circle cx="28" cy="60" r="5" fill="#3a3a2a"/>
    <circle cx="62" cy="62" r="11" fill="#2a2a1a" stroke="#1a1a0a" stroke-width="2"/>
    <circle cx="62" cy="62" r="5" fill="#3a3a2a"/>
    <circle cx="108" cy="62" r="11" fill="#2a2a1a" stroke="#1a1a0a" stroke-width="2"/>
    <circle cx="108" cy="62" r="5" fill="#3a3a2a"/>
    <circle cx="148" cy="60" r="11" fill="#2a2a1a" stroke="#1a1a0a" stroke-width="2"/>
    <circle cx="148" cy="60" r="5" fill="#3a3a2a"/>
    <!-- Hull — sloped front -->
    <path d="M12,48 L25,22 L160,22 L170,48 L170,56 L12,56 Z" fill="url(#apcH)" stroke="#2a3210" stroke-width="1"/>
    <!-- Front slope detail -->
    <path d="M25,22 L32,22 L22,48 L12,48 Z" fill="#4a5820" opacity="0.5"/>
    <!-- Side viewport slits -->
    <rect x="55" y="30" width="8" height="3" rx="1" fill="#1a2a0a"/>
    <rect x="75" y="30" width="8" height="3" rx="1" fill="#1a2a0a"/>
    <rect x="95" y="30" width="8" height="3" rx="1" fill="#1a2a0a"/>
    <rect x="115" y="30" width="8" height="3" rx="1" fill="#1a2a0a"/>
    <!-- Turret ring -->
    <ellipse cx="88" cy="18" rx="22" ry="10" fill="#4a5a24"/>
    <!-- Turret -->
    <ellipse cx="88" cy="15" rx="16" ry="8" fill="#3e4e1c"/>
    <!-- 14.5mm KPVT barrel -->
    <rect x="48" y="12" width="42" height="4" rx="1.5" fill="#2a2a1a"/>
    <rect x="40" y="13" width="10" height="2" rx="1" fill="#1a1a0a"/>
    <!-- Muzzle brake -->
    <rect x="37" y="11" width="5" height="6" rx="1" fill="#333"/>
    <!-- Z marking -->
    <text x="130" y="46" font-family="Impact" font-size="14" font-weight="900" fill="#FFDD00" stroke="#aa8800" stroke-width="0.5">Z</text>
    <!-- Red star -->
    <polygon points="150,28 152,24 154,28 158,28 155,30 156,34 152,32 148,34 149,30 146,28" fill="#cc1100"/>
  </svg>`;

  // APC state
  let apcsOnScreen = 0;
  const MAX_APCS = 1;

  // Tank state
  let tanksOnScreen = 0;
  const MAX_TANKS = gcfg('vehicles','max_tanks',1);
  let tankSpawnTimer = null;
  let tankHintShown  = false;
  let _autoSwitchPending = false;

  function sndTankEngine() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 36;
    const g   = ac.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.9); g.gain.linearRampToValueAtTime(0.0, t + 3.2);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5;
    const lg  = ac.createGain(); lg.gain.value = 4;
    lfo.connect(lg); lg.connect(osc.frequency);
    osc.connect(g); g.connect(getMaster());
    osc.start(t); osc.stop(t + 3.4); lfo.start(t); lfo.stop(t + 3.4);
  }

  function sndTankShot() {
    if (mutedSounds) return;
    const ac = getACtx(), t = ac.currentTime;
    // massive boom
    const dur = Math.floor(ac.sampleRate * 2.2);
    const buf = ac.createBuffer(1, dur, ac.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < dur; i++) {
      const prog = i / dur;
      const env  = prog < 0.04 ? prog / 0.04 : Math.exp(-(prog - 0.04) * 3.2);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp  = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const gn  = ac.createGain(); gn.gain.value = 2.8;
    src.connect(lp); lp.connect(gn); gn.connect(getMaster());
    src.start(t);
    setTimeout(() => { if (!mutedSounds) tone(48, 'sine', 0.35, 1.2, 8); }, 220);
  }

  function spawnTank() {
    if (tanksOnScreen >= MAX_TANKS || !gameActive) return;
    tanksOnScreen++;
    const hp  = gcfg('vehicles','tank_hp_base',18) + wave * gcfg('vehicles','tank_hp_per_wave',4);
    const spd = gcfg('vehicles','tank_speed_base',0.18) + wave * gcfg('vehicles','tank_speed_per_wave',0.02);  // tanks are much slower than trucks
    const dur = Math.round(9 / spd * 10) / 10;
    const bot = 42 + getRandom(0, 22);
    const tankVisual = tankRasterOverride
      ? '<img src="images/vehicles/tank.png" alt="Enemy tank" draggable="false" style="width:275px;height:auto;max-width:100%;object-fit:contain">'
      : TANK_SVG;
    const $tank = $(`<div class="tank-target" role="button" aria-label="Enemy tank" tabindex="0"
          data-hp="${hp}" data-max-hp="${hp}"
          style="animation-duration:${dur}s; bottom:${bot}px">
        <div class="tank-hp-bar"><span class="tank-hp-fill" style="width:100%"></span></div>
        ${tankVisual}
        <span class="tank-label">⚠ T-72 TANK</span>
      </div>`);
    $canves.append($tank);
    sndTankEngine();

    // Juice: boss warning banner
    $canves.addClass('juice-boss-alert');
    setTimeout(() => $canves.removeClass('juice-boss-alert'), 1500);
    screenShake(3, 250);

    // Show "Use NLAW / GL!" hint the first time a tank appears
    if (!tankHintShown) {
      tankHintShown = true;
      shooterSpeech('\ud83d\udea8 TANK! Use GL / NLAW!', true);
    }

    $tank.on('mousedown', e => e.stopPropagation());
    let hitPending = false;
    $tank.on('click', function (e) {
      e.stopPropagation();
      if (hitPending) return;
      if (ammo <= 0 && currentWeapon !== REVOLVER_WEAPON) { sndNoAmmo(); return; }
      hitPending = true;
      setTimeout(() => { hitPending = false; }, 60);
      if (currentWeapon !== REVOLVER_WEAPON) ammo--;
      const rect = $canves[0].getBoundingClientRect();
      const ex   = e.clientX - rect.left;
      const ey   = e.clientY - rect.top;
      doMuzzleFlash(ex, ey);
      renderAmmoUI();

      let curHp = parseInt($tank.attr('data-hp')) || hp;
      // Tanks require GL/NLAW — light weapons barely scratch armour
      const rawDmg = (WEAPONS[currentWeapon] || WEAPONS.revolver).truckDmg;
      const isAP   = (currentWeapon === GL_WEAPON || currentWeapon === NLAW_WEAPON);
      const dmg    = isAP ? rawDmg : Math.max(1, Math.floor(rawDmg * 0.3));
      curHp -= dmg;
      $tank.attr('data-hp', curHp);
      doExplosion(ex, ey, isAP ? 1.2 : 0.25);
      sndTruckHit();
      $tank.addClass('tank-hit');
      setTimeout(() => $tank.removeClass('tank-hit'), 140);
      const pct = Math.max(0, curHp / hp) * 100;
      $tank.find('.tank-hp-fill').css('width', pct + '%');
      if (curHp <= 0) {
        $tank.off('click');
        const tr = $tank[0].getBoundingClientRect();
        const cr = $canves[0].getBoundingClientRect();
        const cx = tr.left - cr.left + tr.width  / 2;
        const cy = tr.top  - cr.top  + tr.height / 2;
        doExplosion(cx, cy, 3.5);
        setTimeout(() => doExplosion(cx + getRandom(-60,60), cy + getRandom(-30,30), 2.0), 150);
        setTimeout(() => doExplosion(cx + getRandom(-80,80), cy + getRandom(-40,40), 1.5), 340);
        setTimeout(() => doExplosion(cx + getRandom(-40,40), cy + getRandom(-20,20), 1.8), 560);
        sndTruckExplode(); setTimeout(() => sndTruckExplode(), 160); setTimeout(() => sndTankShot(), 380);
        score   += 500 + wave * 100;
        credits += 25;
        updateScoreHUD();
        shooterSpeech('💥 TANK DESTROYED! +500', true);
        tanksOnScreen = Math.max(0, tanksOnScreen - 1);
        setTimeout(() => $tank.remove(), 1100);
      }
    });
    // Arrive at player — tank passes through (no ranged damage, only drones attack)
    const arrivalTimer = setTimeout(() => {
      if (!gameActive || gamePaused) return;
      if (!$tank.parent().length) return;
      tanksOnScreen = Math.max(0, tanksOnScreen - 1);
      $tank.remove();
    }, dur * 1000);
    // Cleanup on natural scroll-off (add small buffer)
    setTimeout(() => {
      clearTimeout(arrivalTimer);
      if ($tank.parent().length) {
        tanksOnScreen = Math.max(0, tanksOnScreen - 1);
        $tank.remove();
      }
    }, (dur + 1.5) * 1000);
  }

  // ─── APC (BTR-80) — medium armor, wave 3+ ────────────────────
  function spawnAPC() {
    if (apcsOnScreen >= MAX_APCS || !gameActive) return;
    if ((wave || 1) < 3) return;
    apcsOnScreen++;
    const hp  = 10 + wave * 3;
    const spd = 0.5 + wave * 0.06;
    const dur = Math.round(7 / spd * 10) / 10;
    const bot = 50 + getRandom(0, 25);
    const $apc = $(`<div class="apc-target" style="position:absolute;bottom:${bot}px;right:0;z-index:6;animation:tank-drive ${dur}s linear forwards;cursor:crosshair">
      <div class="tank-hp-bar"><span class="tank-hp-fill" style="width:100%"></span></div>
      ${APC_SVG}
      <span class="tank-label" style="font-size:10px">⚠ BTR-80</span>
    </div>`);
    let curHp = hp;
    $apc.on('mousedown.apc', e => { e.stopPropagation(); stopM16Fire(); });
    $apc.on('click.apc', function(e) {
      e.stopPropagation();
      if ((ammo <= 0 && currentWeapon !== REVOLVER_WEAPON) || !gameActive) { sndNoAmmo(); return; }
      if (currentWeapon !== REVOLVER_WEAPON) ammo--;
      renderAmmoUI();
      const rect = $canves[0].getBoundingClientRect();
      const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
      doMuzzleFlash(ex, ey);
      const rawDmg = (WEAPONS[currentWeapon] || WEAPONS.revolver).truckDmg;
      const dmg = (['pistol','uzi','m16'].indexOf(currentWeapon) >= 0) ? Math.max(1, Math.floor(rawDmg * 0.5)) : rawDmg;
      curHp -= dmg;
      const pct = Math.max(0, curHp / hp * 100);
      $apc.find('.tank-hp-fill').css('width', pct + '%');
      doExplosion(ex, ey, 0.3);
      sndTruckHit();
      $apc.css('filter', 'brightness(3)');
      setTimeout(() => $apc.css('filter', ''), 80);
      if (curHp <= 0) {
        $apc.off('.apc');
        const r = 80 + wave * 12;
        earnArcoin(1, 'APC kill');
        score += r; credits += 15; updateScoreHUD();
        doExplosion(ex, ey, 2.2); sndTruckExplode(); screenShake(3, 200);
        shooterSpeech('🔥 BTR-80 destroyed! +' + r + ' 🇺🇦', true);
        $apc.css({transition:'all 0.5s',opacity:0,transform:'translateX(-60px) scale(0.7) rotate(-5deg)'});
        setTimeout(() => { apcsOnScreen = Math.max(0, apcsOnScreen - 1); $apc.remove(); }, 600);
      }
    });
    $canves.append($apc);
    setTimeout(() => {
      if ($.contains(document.body, $apc[0])) {
        apcsOnScreen = Math.max(0, apcsOnScreen - 1);
        $apc.remove();
      }
    }, (dur + 1.5) * 1000);
  }

  function startTankSpawner() {
    stopTankSpawner();
    const firstDelay = 12000 + getRandom(0, 6000);
    setTimeout(() => { if (gameActive) spawnTank(); }, firstDelay);
    const period = wave === 3 ? 45000 : 30000;
    tankSpawnTimer = setInterval(() => { if (gameActive && !gamePaused) spawnTank(); }, period);
  }
  function stopTankSpawner() {
    if (tankSpawnTimer) { clearInterval(tankSpawnTimer); tankSpawnTimer = null; }
    tanksOnScreen = 0;
    apcsOnScreen = 0;
    $canves.find('.apc-target').remove();
  }

  function startTruckSpawner() {
    stopTruckSpawner();
    const delay  = wave === 1 ? 18000 : wave === 2 ? 7000 : 4000;
    setTimeout(() => spawnTruck(), delay);
    if (wave >= 3) setTimeout(() => { Math.random() < 0.35 ? spawnAPC() : spawnTruck(); }, delay + 5600);
    const period = wave === 1 ? 40000 : wave === 2 ? 28000 : wave === 3 ? 20000 : 14000;
    truckSpawnTimer = setInterval(() => {
      // Wave 3+: occasionally spawn APC instead of truck
      if (wave >= 3 && Math.random() < 0.3) { spawnAPC(); }
      else { spawnTruck(); }
      if (wave >= 4) setTimeout(() => spawnTruck(), 4800);
    }, period);
  }
  // ── M-16 mode toggle ─────────────────────────────────────────
  $m16Toggle.on('click', function (e) {
    e.stopPropagation();
    m16Auto = !m16Auto;
    $m16ModeLabel.text(m16Auto ? 'AUTO' : 'SEMI');
    $(this).toggleClass('semi', !m16Auto);
  });

  // ── Shoot logic ───────────────────────────────────────────────
  // NFT weapons auto-reload instead of blocking when empty
  const NFT_WEAPONS = new Set([FTDRONE_WEAPON, TANK_WEAPON, BRADLEY_WEAPON]);

  function doShoot(event) {
    shotsFired++;
    incrementShotsForUkraine();
    // Revolver has unlimited ammo — never block or decrement
    if (ammo <= 0 && currentWeapon !== REVOLVER_WEAPON) {
      shotsFired--; // don't count dry-fire as a shot
      // NFT weapons: silently auto-reload and keep firing
      if (NFT_WEAPONS.has(currentWeapon)) { reload(); return; }
      else { sndNoAmmo(); }
      $reloadHint.addClass('visible');
      if (godMode) { reload(); return; }
      // Auto-switch to next unlocked weapon (debounced so rapid clicks don't multi-fire)
      if (!_autoSwitchPending) {
        _autoSwitchPending = true;
        stopM16Fire();
        const list = getUnlockedWeapons();
        if (list.length > 1) {
          setTimeout(() => {
            const cur = list.indexOf(currentWeapon);
            const next = list[(cur + 1) % list.length];
            switchToWeapon(next);
            shooterSpeech(next.toUpperCase() + '!');
            $reloadHint.removeClass('visible');
            _autoSwitchPending = false;
          }, 320);
        } else {
          _autoSwitchPending = false;
        }
      }
      return;
    }
    if (currentWeapon !== REVOLVER_WEAPON) ammo--;

    // Muzzle flash + bullet trace at cursor
    if (event) {
      const rect = $canves[0].getBoundingClientRect();
      const ex = event.clientX - rect.left;
      const ey = event.clientY - rect.top;
      doMuzzleFlash(ex, ey);
      doBulletTrace(ex, ey);
    }

    // Weapon hands recoil animation
    weaponHandsShoot();

    // Sound by weapon
    if (currentWeapon === SHOTGUN_WEAPON) sndShootShotgun();
    else if (currentWeapon === M16_WEAPON) sndShootM16();
    else if (currentWeapon === LMG_WEAPON || currentWeapon === PKM_WEAPON) sndLMG();
    else if (currentWeapon === GL_WEAPON || currentWeapon === STUGNA_WEAPON ||
             currentWeapon === PANZERFAUST_WEAPON || currentWeapon === MATADOR_WEAPON ||
             currentWeapon === NLAW_WEAPON ||
             currentWeapon === DRONE_BOMB_WEAPON) sndGrenade();
    else if (currentWeapon === BRADLEY_WEAPON) sndBushmaster();
    else if (currentWeapon === FTDRONE_WEAPON) {
      // Flamethrower burst sound
      (function() {
        const ac = getACtx(), t = ac.currentTime;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(180 + Math.random()*60, t);
        o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(getMaster()); o.start(t); o.stop(t + 0.22);
      })();
    }
    else if (currentWeapon === AK12_WEAPON) sndShootM16();
    else if (currentWeapon === LASER_WEAPON) sndLaser();
    else if (currentWeapon === SNIPER_WEAPON) sndShootSniper();
    else if (currentWeapon === TANK_WEAPON) sndShootTank();
    else if (currentWeapon === CLAY_WEAPON) sndShootClay();
    else sndShootRevolver();

    renderAmmoUI();

    if (ammo === 0) {
      if (godMode) reload();
      else {
        $reloadHint.addClass('visible');
      }
    }
  }

  // Stop M-16 auto fire
  function stopM16Fire() {
    if (m16FireInterval) { clearInterval(m16FireInterval); m16FireInterval = null; }
    m16Shooting = false;
    $canves.removeClass('m16-firing');
  }

  // ── Zombie waves ──────────────────────────────────────────────
  // Values loaded from server game_config (admin panel) with hardcoded fallbacks
  // B183: Proper progressive difficulty — wave 1 gentle intro, wave 4 intense finale
  const WAVE_1_ZOMBIE_FRQ = getRandom(gcfg('wave','w1_freq_min',2200), gcfg('wave','w1_freq_max',3000));  // slow intro pace
  const WAVE_2_ZOMBIE_FRQ = getRandom(gcfg('wave','w2_freq_min',1600), gcfg('wave','w2_freq_max',2400));  // moderate ramp
  const WAVE_3_ZOMBIE_FRQ = getRandom(gcfg('wave','w3_freq_min',1200), gcfg('wave','w3_freq_max',1800));  // challenging
  const WAVE_4_ZOMBIE_FRQ = getRandom(gcfg('wave','w4_freq_min',800),  gcfg('wave','w4_freq_max',1200));  // intense final wave

  const WAVE_1_ZOMBIE_QTY = getRandom(gcfg('wave','w1_qty_min',18),  gcfg('wave','w1_qty_max',25));   // longer intro wave
  const WAVE_2_ZOMBIE_QTY = getRandom(gcfg('wave','w2_qty_min',30),  gcfg('wave','w2_qty_max',45));   // substantial middle
  const WAVE_3_ZOMBIE_QTY = getRandom(gcfg('wave','w3_qty_min',45),  gcfg('wave','w3_qty_max',65));   // challenging
  const WAVE_4_ZOMBIE_QTY = getRandom(gcfg('wave','w4_qty_min',60),  gcfg('wave','w4_qty_max',85));   // marathon finale
  const ALL_ZOMBIES = WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY + WAVE_3_ZOMBIE_QTY + WAVE_4_ZOMBIE_QTY;
  const MAX_CONCURRENT_ZOMBIES = gcfg('wave','max_concurrent',15);  // B197: raised back to 15 for longer waves

  // ── Endless Mode (wave 5+) ───────────────────────────────────────────────
  let _endlessKillTarget = 0;  // cumulative kills to clear current endless wave
  function getEndlessWaveParams(w) {
    const depth = w - 4;  // wave 5 = depth 1, wave 6 = depth 2, ...
    const baseQty  = gcfg('endless', 'zombie_base', 80);
    const perWave  = gcfg('endless', 'zombie_per_wave', 12);
    return {
      freq: Math.max(200, 900 - depth * 50),         // faster ramp, floor 200ms
      qty:  Math.min(200 + Math.floor(depth / 4) * 25, baseQty + depth * perWave), // rising cap: 200→225→250…
    };
  }

  // Track last 3 spawned zombie types to prevent same type clustering
  const recentZombieTypes = [];

  function pickZombieType() {
    if (_missionMode === 'kill_putins') return 6;
    const maxType = wave === 1 ? 3 : wave === 2 ? 4 : 6;
    let pick = getRandom(1, maxType);
    // Count how many of the last 3 are this type; re-roll up to 3 times to diversify
    let attempts = 0;
    while (attempts < 3) {
      const sameCount = recentZombieTypes.filter(t => t === pick).length;
      if (sameCount < 2) break; // allow at most 1 repeat in last 3
      pick = getRandom(1, maxType);
      attempts++;
    }
    recentZombieTypes.push(pick);
    if (recentZombieTypes.length > 3) recentZombieTypes.shift();
    return pick;
  }

  let _waveSpawned = 0, _waveTarget = 0;
  let _liveZ = [];  // cached live zombie DOM elements — avoids 60fps DOM query

  // ── Russian Military Rank System ─────────────────────────────────────────
  // Ranks ordered by seniority: Private → Commander
  const RU_RANKS = [
    { id: 'private',    label: 'Рядовой',      tag: 'PVT',  hp: 1, minWave: 1, weight: 40 },
    { id: 'corporal',   label: 'Єфрейтор',     tag: 'CPL',  hp: 2, minWave: 1, weight: 25 },
    { id: 'sergeant',   label: 'Сержант',       tag: 'SGT',  hp: 3, minWave: 2, weight: 18 },
    { id: 'lieutenant', label: 'Лейтенант',     tag: 'LT',   hp: 5, minWave: 2, weight: 10 },
    { id: 'captain',    label: 'Капітан',       tag: 'CPT',  hp: 7, minWave: 3, weight: 5  },
    { id: 'commander',  label: 'Командир',      tag: 'CMD',  hp: 10, minWave: 3, weight: 2  }
  ];
  // Random gear loadouts for visual variation
  const RU_GEAR_WEAPONS = ['ak','pkm','rpg','svd','none'];
  const RU_GEAR_EXTRAS  = ['helmet','no-helmet','bandage','backpack','one-shoe','goggles','balaclava'];

  function pickRank() {
    var pool = RU_RANKS.filter(function(r) { return wave >= r.minWave; });
    var total = pool.reduce(function(s, r) { return s + r.weight; }, 0);
    var roll = Math.random() * total, acc = 0;
    for (var i = 0; i < pool.length; i++) {
      acc += pool[i].weight;
      if (roll < acc) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function randomGear() {
    var wpn = RU_GEAR_WEAPONS[Math.floor(Math.random() * RU_GEAR_WEAPONS.length)];
    // Pick 1-3 random gear extras
    var extras = RU_GEAR_EXTRAS.slice().sort(function() { return Math.random() - 0.5; }).slice(0, getRandom(1, 3));
    return { weapon: wpn, extras: extras };
  }

  function createZombies() {
    // B190: Guard against stale interval() setTimeout chains from previous games
    if (!gameActive || gamePaused) return false;
    // Hard cap: skip if screen already full
    _liveZ = _liveZ.filter(el => el.parentNode && !el.classList.contains('killed'));
    if (_liveZ.length >= MAX_CONCURRENT_ZOMBIES) return false;
    const zombieType = pickZombieType();
    const rank = _missionMode === 'kill_putins'
      ? { id: 'commander', label: 'Commander', tag: 'ПУТІН', hp: 10, minWave: 1, weight: 100 }
      : pickRank();
    const gear = randomGear();
    // B183: Wave-scaled walk speed — progressive: wave 1 slow, wave 4 fast
    const speedRanges = [
      [gcfg('wave','w1_speed_min',4), gcfg('wave','w1_speed_max',6)],  // wave 1: slow walkers
      [gcfg('wave','w2_speed_min',3), gcfg('wave','w2_speed_max',5)],  // wave 2: moderate
      [gcfg('wave','w3_speed_min',2), gcfg('wave','w3_speed_max',4)],  // wave 3: brisk
      [gcfg('wave','w4_speed_min',1), gcfg('wave','w4_speed_max',3)]   // wave 4: fast runners
    ];
    const sr  = speedRanges[Math.min(wave - 1, 3)];
    const spd = getRandom(Math.round(sr[0]), Math.round(sr[1]));
    // Prestige difficulty: scale zombie HP and speed (admin-configurable)
    const _pLvl = +(localStorage.getItem('arc_prestige') || 0);
    const _pHpScale = gcfg('prestige', 'hp_scaling_per_level', 0.1);
    const baseHp = rank.hp + zombieType;
    const _pHp = _pLvl > 0 ? Math.ceil(baseHp * (1 + _pLvl * _pHpScale)) : baseHp;
    const _pSpd = Math.max(1, Math.min(6, Math.round(_pLvl >= 5 ? spd - 1 : spd)));
    // Adaptive AI: adjust zombie walk speed based on player skill
    var _aiSpd = _pSpd;
    if (window.ARC_ADAPTIVE) {
      var _speedM = window.ARC_ADAPTIVE.getProfile().speedMulti || 1;
      _aiSpd = Math.max(1, Math.min(6, Math.round(_pSpd / _speedM)));
    }
    // B183: Removed walk-reverse enemies — user reported glitchy floating soldiers
    const _isReverse = false;
    // B185: 3-lane depth system — near (front/big), mid, far (back/small)
    // Each lane has its own bottom range, scale, and z-index for visual depth
    const _laneRoll = Math.random();
    let _lane, botVar, scaleVar, _laneZi;
    if (_laneRoll < 0.40) {
      // NEAR lane — front row, largest enemies (closest to player, above HUD zone)
      _lane = 'near';
      botVar  = getRandom(120, 160);
      scaleVar = (1.0 + Math.random() * 0.15).toFixed(2);
      _laneZi = 10;
    } else if (_laneRoll < 0.75) {
      // MID lane — middle row
      _lane = 'mid';
      botVar  = getRandom(175, 225);
      scaleVar = (0.82 + Math.random() * 0.13).toFixed(2);
      _laneZi = 8;
    } else {
      // FAR lane — back row, smallest enemies (farthest, near horizon)
      _lane = 'far';
      botVar  = getRandom(240, 300);
      scaleVar = (0.62 + Math.random() * 0.16).toFixed(2);
      _laneZi = 6;
    }
    const gearClasses = 'ru-' + gear.weapon + ' ' + gear.extras.map(function(e){ return 'ru-' + e; }).join(' ');
    const $z = $(`<div class="zombie zombie-${zombieType} walk-speed-${_aiSpd} walk-delay-${getRandom(1,6)}${_isReverse ? ' walk-reverse' : ''} ru-rank-${rank.id} z-lane-${_lane} ${gearClasses}"
            data-strength="${_pHp}" data-strength-max="${_pHp}" data-rank="${rank.id}" data-rank-tag="${rank.tag}" style="--z-scale:${scaleVar};--z-bot:${botVar}px;z-index:${_laneZi}">
            <div class="ru-rank-tag">${rank.tag}</div>
            <div class="ru-gear-icon">${gear.weapon === 'ak' ? '🔫' : gear.weapon === 'pkm' ? '💥' : gear.weapon === 'rpg' ? '🚀' : gear.weapon === 'svd' ? '🎯' : ''}</div>
            <div class="strength-bar" data-hp="100%"></div></div>`);
    // B199: zombie-4/5/6 are now CSS vector soldiers with animated limbs + Russian flag patches
    if (zombieType >= 4 && zombieType <= 6) {
      $z.append('<div class="vec-soldier">' +
        '<div class="vec-head"></div>' +
        '<div class="vec-torso"></div>' +
        '<div class="vec-arm vec-arm-l"></div>' +
        '<div class="vec-arm vec-arm-r"></div>' +
        '<div class="vec-leg vec-leg-l"></div>' +
        '<div class="vec-leg vec-leg-r"></div>' +
      '</div>');
    }
    $canves.append($z);
    _liveZ.push($z[0]);
    _waveSpawned++;
    return true;
  }

  // ── Boss Zombie ─────────────────────────────────────────────────────────────
  let _bossAlive = false;
  function spawnBossZombie() {
    if (_bossAlive || !gameActive) return;
    _bossAlive = true;
    screenShake(6, 500);
    shooterSpeech('⚠️ BOSS INCOMING!', true);
    var bossHp = 20 + wave * 8;
    var spd = Math.max(2, 7 - Math.floor(wave / 2));
    // Adaptive AI: scale boss speed
    if (window.ARC_ADAPTIVE) {
      var _bsm = window.ARC_ADAPTIVE.getProfile().speedMulti || 1;
      spd = Math.max(1, Math.min(6, Math.round(spd / _bsm)));
    }
    var $boss = $('<div class="zombie zombie-boss walk-speed-' + spd + ' walk-delay-1 z-lane-near" data-strength="' + bossHp + '" data-strength-max="' + bossHp + '" style="--z-bot:100px;--z-scale:1.3;z-index:11">' +
      '<div class="boss-label">☠ BOSS</div>' +
      '<div class="vec-soldier vec-boss">' +
        '<div class="vec-head"></div>' +
        '<div class="vec-torso"></div>' +
        '<div class="vec-arm vec-arm-l"></div>' +
        '<div class="vec-arm vec-arm-r"></div>' +
        '<div class="vec-leg vec-leg-l"></div>' +
        '<div class="vec-leg vec-leg-r"></div>' +
      '</div>' +
      '<div class="strength-bar"></div></div>');
    $canves.append($boss);
    _liveZ.push($boss[0]);
    // Boss deals double damage on reach — tracked by zombie tracking system via data attr
    $boss.attr('data-boss', '1');
    $('#boss-hp-bar').show();
    $('#boss-hp-fill').css('width', '100%');
  }

  const interval = function (func, wait, times) {
    const interv = (function (w, t) {
      return function () {
        if (typeof t === 'undefined' || t-- > 0) {
          try {
            var result = func.call(null);
            // If spawn failed (screen full), give back the ticket and retry after delay
            if (result === false && typeof t !== 'undefined') {
              t++;
              setTimeout(interv, w);
              return;
            }
          } catch (e) { t = 0; throw e.toString(); }
          setTimeout(interv, w);
        }
      };
    }(wait, times));
    setTimeout(interv, wait);
  };

  function startWave(frequency, quantity) {
    waveTransitioning = true;
    _ironWillUsed = false;
    _waveDmgTaken = 0;
    _waveStartMs = Date.now();
    _ambushShotsLeft = hasSkill('ambush') ? 3 : 0;
    _berserkShotCounter = 0;
    $('body').off('keydown.game');
    $canves.off('.game');
    $(document).off('mouseup.game');
    $reloadHint.removeClass('visible');
    stopM16Fire();
    pauseZombieTracking = true;
    wave++;
    _waveSpawned = 0;
    _waveTarget = quantity;

    updateParallaxBg(wave);

    $overlayScreen.find('.level-title span').html(wave);
    $('#level-number').text(wave);
    $canves.addClass('level-message');
    $canves.attr('data-wave', wave);

    // ── Cinematic wave banner ───────────────────────────────────
    const waveNames = {
      1: 'FIRST CONTACT', 2: 'ESCALATION', 3: 'FULL ASSAULT',
      4: 'FINAL STAND', 5: 'ENDLESS WAR'
    };
    var _endlessTags = ['NO MERCY','TOTAL WAR','SCORCHED EARTH','HELL ON EARTH',
      'NO RETREAT','ANNIHILATION','OBLIVION','CARNAGE','APOCALYPSE','RECKONING',
      'DEVASTATION','FIRESTORM','ONSLAUGHT','BLOODBATH','DOOMSDAY'];
    var subtitle = waveNames[wave] || (wave >= 5 ? 'WAVE ' + wave + ' — ' + _endlessTags[(wave - 5) % _endlessTags.length] : '');
    $canves.find('.wave-banner').remove();
    const $banner = $('<div class="wave-banner">' +
      '<div class="wb-number">' + wave + '</div>' +
      '<div class="wb-title">WAVE ' + wave + '</div>' +
      '<div class="wb-sub">' + subtitle + '</div></div>');
    $canves.append($banner);
    requestAnimationFrame(function() { $banner.addClass('wb-in'); });
    setTimeout(function() { $banner.addClass('wb-out'); }, 1200);  // B176: faster wave banner
    // B184: Remove banner AFTER wb-out transition (500ms) completes, and after
    // level-message class is removed (wave 1: 1200ms, wave 2+: 2200ms) so the
    // :has(.wave-banner) overlap guard in CSS stays active until title is hidden.
    setTimeout(function() { $banner.remove(); }, wave === 1 ? 1800 : 2500);

    // Spawn trucks from wave 1 onwards (gentle intro wave 1)
    startTruckSpawner();
    // Spawn tanks from wave 3+
    if (wave >= 3) startTankSpawner();
    // Foreground obstacles refresh per wave
    spawnRuins();
    // Start drone attacks from wave 2
    startDrones();
    // Start call-in HUD cooldown RAF
    _ciStart();

    // Boss zombie: wave 4 and every 5th wave in endless
    if (wave === 4 || (wave > 4 && wave % 5 === 0)) {
      setTimeout(function() { spawnBossZombie(); }, 3000);
    }

    const spawnDelay = wave === 1 ? 0 : 800;
    if (wave === 1) {
      // B176: Pre-spawn larger first batch so targets visible immediately
      setTimeout(() => { createZombies(); createZombies(); createZombies(); createZombies(); }, 50);
    }
    // Adaptive AI: adjust spawn frequency based on player skill
    var _aiFreq = frequency;
    if (window.ARC_ADAPTIVE) {
      var _sm = window.ARC_ADAPTIVE.getProfile().spawnMulti || 1;
      _aiFreq = Math.max(200, Math.round(frequency / _sm));
    }
    setTimeout(() => interval(() => createZombies(), _aiFreq, quantity), spawnDelay);
    setTimeout(() => {
      $canves.removeClass('level-message');
      if (wave === 1) $canves.removeClass('intro');
      pauseZombieTracking = false;
      waveTransitioning = false;
      if (!zombieTrackRunning) { zombieTrackRunning = true; trackZombies(); }
      setHandlers();
      // Safety: periodic calcWave poll so wave never gets stuck
      if (window._waveCheckTimer) clearInterval(window._waveCheckTimer);
      window._waveCheckTimer = setInterval(() => {
        if (!gameActive || waveTransitioning) { clearInterval(window._waveCheckTimer); return; }
        calcWave();
      }, 3000);
    }, wave === 1 ? 1200 : 2200);  // B176: faster handler enable on wave 1
  }

  function endGame(endType) {
    if (!gameActive) return;    // only fire once
    // Kill Putins mission reward
    if (_missionMode === 'kill_putins' && zombieKilled >= 50) {
      earnArcoin(25, 'Kill Putins Mission (50+ kills)');
      shooterSpeech('🏆 MISSION COMPLETE: +25 ARC!', true);
    }
    _missionMode = null;
    gameActive = false;
    _stopGameTimer();
    submitLeaderboard();           // save score to local leaderboard
    addBpKills(zombieKilled);      // accumulate season kills for Battle Pass
    resolvePvpChallenge(score);     // resolve any active PvP challenge
    updateClanWithLastGame();          // sync best score to clan
    // Daily mission progress (end of game)
    updateMissionProgress('kills',   zombieKilled);
    updateMissionProgress('wave',    wave);
    updateMissionProgress('score',   score);
    if (endType === 'win') {
      if (wave >= 1) updateMissionProgress('w1clear', 1);
      if (wave >= 2) updateMissionProgress('w2clear', 1);
    }
    if (life >= 3) updateMissionProgress('nodeath', 1); // survived without losing a life
    // Contract progress (end of game)
    updateContractProgress('kills', zombieKilled);
    updateContractProgress('wave',  wave);
    updateContractProgress('score', score);
    if (life >= 3) updateContractProgress('nodeath', 1);
    // Achievement stat tracking
    const _tk = 'arc_total_kills'; localStorage.setItem(_tk, +(localStorage.getItem(_tk)||0) + zombieKilled);
    const _mw = 'arc_max_wave';   localStorage.setItem(_mw, Math.max(+(localStorage.getItem(_mw)||0), wave));
    if (endType === 'win') { const _tw='arc_total_wins'; localStorage.setItem(_tw, +(localStorage.getItem(_tw)||0)+1); }
    // Games played + playtime tracking
    var _tg = 'arc_total_games'; localStorage.setItem(_tg, +(localStorage.getItem(_tg)||0) + 1);
    if (_gameStartMs) { var _tp = 'arc_total_playtime'; localStorage.setItem(_tp, +(localStorage.getItem(_tp)||0) + (Date.now() - _gameStartMs)); }
    // Death counter (no penalty)
    if (endType === 'lose') {
      var _td = 'arc_total_deaths'; localStorage.setItem(_td, +(localStorage.getItem(_td)||0) + 1);
    }
    var _allTimeBest = parseInt(localStorage.getItem('arc_all_time_best') || '0', 10);
    if (score > _allTimeBest) {
      localStorage.setItem('arc_all_time_best', String(score));
      shooterSpeech('🏆 NEW PERSONAL BEST! ' + score.toLocaleString(), true);
    }
    checkAchievements();
    // Sync to server after game ends
    if (window.ARC_API && window.ARC_API.syncToServer) window.ARC_API.syncToServer();
    // End server session
    if (window.ARC_API && window.ARC_API.endSession && window._arcSessionId) {
      window.ARC_API.endSession(window._arcSessionId, { wave_reached: wave, score: score, kills: zombieKilled });
    }
    $('body').off('keydown.game');
    $(document).off('keydown.game');
    $canves.off('.game');
    $(document).off('mouseup.game');
    $('#game-crosshair').removeClass('active');
    stopM16Fire();
    _stopScope(); $canves.removeClass('sniper-scope');
    stopTruckSpawner();
    stopDrones();
    _ciStop();
    if (window._wbrInt) { clearInterval(window._wbrInt); window._wbrInt = null; }
    stopTankSpawner();
    stopRain(); stopSnow();
    _stopAmbient();
    stopEnvParticles();
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
    if (_cloudTimer) { clearInterval(_cloudTimer); _cloudTimer = null; }
    if (_garbageTimer) { clearInterval(_garbageTimer); _garbageTimer = null; }
    if (window._solAutoHealInt) { clearInterval(window._solAutoHealInt); window._solAutoHealInt = null; }
    if (window.ARC_GAME && window.ARC_GAME._stopEngineExtras) window.ARC_GAME._stopEngineExtras();
    if (comboTimer) { clearTimeout(comboTimer); comboTimer = null; }
    if (window._jbUpdateTimer) { clearInterval(window._jbUpdateTimer); window._jbUpdateTimer = null; }
    pauseZombieTracking = true;
    zombieTrackRunning  = false;
    _liveZ = [];
    // Force all surviving zombies into their death state where they stand
    $('.zombie').not('.killed').each(function () {
      $(this).addClass('killed');
    });
    // Remove all dead bodies after a brief delay so screen is clean
    setTimeout(function () {
      $('.zombie.killed').remove();
      $('.tank-target').remove();
      $('.truck-target').remove();
      $('.apc-target').remove();
      $('.supply-crate').remove();
    }, 800);
    const screenType = endType === 'lose' ? 'game-over' : 'end-game';
    // Juice: dramatic death sequence
    if (endType === 'lose') {
      screenShake(4, 300);
      $canves.addClass('juice-death-desaturate');
    }
    $canves.addClass(screenType);
    if (!mutedMusic) { sndLaughter(); if (endType === 'lose') sndDefeat(); }
    if (endType === 'win') shooterSpeech('Mission complete! 🇹');

    // ── Game-over weapon picker: remember unlocked weapons from this run ──
    var _goUnlocked = (typeof getUnlockedWeapons === 'function') ? getUnlockedWeapons() : [REVOLVER_WEAPON];
    var _nextStartWeapon = REVOLVER_WEAPON;

    const _doRestart = function () {
      $canves.removeClass(screenType + ' juice-death-desaturate juice-low-hp');
      $('#death-upsell').hide();
      $('#starter-pack').hide();
      $canves.find('.go-weapon-picker').remove();
      godMode = false; $godMode.removeClass('enabled');
      _continuedThisRun = false;
      _streakSavedThisRun = false;
      // B190: Ensure game-over elements are visible before reset (prevents lurking hidden state)
      $canves.find('.game-over-title, .restart-hint, #restart-game-btn').show();
      // B190: Save weapon choice — startGame() calls resetGame() which wipes unlocks
      var _savedWeapon = _nextStartWeapon || REVOLVER_WEAPON;
      resetGame();
      startGame();
      // B190: Apply starting weapon AFTER startGame's resetGame() so it's not wiped
      if (_savedWeapon !== REVOLVER_WEAPON) {
        var _unlockMap = {
          shotgun: function(){ shotgunUnlocked = true; },
          m16:     function(){ m16Unlocked = true; },
          lmg:    function(){ lmgUnlocked = true; },
          clay:   function(){ clayUnlocked = true; },
          gl:     function(){ glUnlocked = true; },
          sniper: function(){ sniperUnlocked = true; }
        };
        if (_unlockMap[_savedWeapon]) { _unlockMap[_savedWeapon](); switchToWeapon(_savedWeapon); }
      }
    };

    // Keyboard restart: Enter or Space restarts from game-over
    setTimeout(function() {
      $(document).on('keydown.gameover', function(e) {
        if (e.which !== 13 && e.which !== 32) return;
        if ($('#death-upsell').is(':visible') || $('#inventory-panel').hasClass('open')) return;
        e.preventDefault();
        $(document).off('keydown.gameover');
        _doRestart();
      });
      // Focus restart button for keyboard/screen-reader users
      var $restartBtn = $canves.find('#restart-game-btn');
      if ($restartBtn.length) $restartBtn.trigger('focus');
    }, 1500);

    // ── Death Upsell: show continue offer on lose ──────────────────────
    if (endType === 'lose' && !_continuedThisRun) {
      var _contCost = gcfg('economy','continue_cost_arc',25);
      $('#du-wave').text(wave);
      $('#du-kills').text(zombieKilled);
      $('#du-score').text(score);
      $('#du-arc').text(arcoins);
      // Show cosmetic flex on post-game
      var _pgTitle = window._activeTitle || '';
      var _pgBadge = window._activeBadge || '';
      var _pgCosm  = (getCosmeticsOwned() || []).length;
      var _flexHtml = '';
      if (_pgTitle || _pgBadge) _flexHtml += '<div class="du-flex-row">' + (_pgBadge ? '<span class="du-flex-badge">' + _pgBadge + '</span>' : '') + (_pgTitle ? '<span class="lb-title-badge">' + _escHtml(_pgTitle) + '</span>' : '') + '</div>';
      if (_pgCosm > 0) _flexHtml += '<div class="du-flex-owned">' + _pgCosm + ' cosmetic' + (_pgCosm > 1 ? 's' : '') + ' owned' + (_pgCosm >= 8 ? ' 💎' : '') + '</div>';
      if (!_flexHtml) _flexHtml = '<div class="du-flex-row du-flex-cta">🎨 <a href="#" onclick="$(\'#nav-btn-shop\').click();return false">Unlock cosmetics</a> to flex on the board!</div>';
      $('#du-cosm-flex').html(_flexHtml);
      $('#du-cost').text(_contCost);
      var $contBtn = $('#du-continue-btn');
      if (arcoins >= _contCost) {
        $contBtn.prop('disabled', false);
        $('#du-tip').html('Keep your <b>' + zombieKilled + ' kills</b> &amp; <b>Wave ' + wave + '</b> progress — resume at 50% HP');
      } else {
        $contBtn.prop('disabled', true);
        $('#du-tip').html('<button class="du-quick-buy" onclick="showArcUpsell(' + _contCost + ')">💎 Buy ARC to continue</button>');
        // B180: Auto-focus restart when continue is disabled (prevents player confusion)
        setTimeout(function() { $('#du-restart-btn').focus(); }, 200);
      }
      // Hide standard game-over elements briefly, show upsell
      $canves.find('.game-over-title, .restart-hint, #restart-game-btn').hide();
      $('#death-upsell').show();
      $contBtn.off('click').on('click', function() {
        if (arcoins < _contCost) return;
        arcoins -= _contCost;
        localStorage.setItem('arc_balance', String(arcoins));
        _continuedThisRun = true;
        $('#death-upsell').hide();
        // B180: Remove stale weapon picker behind upsell
        $canves.find('.go-weapon-picker').remove();
        // Restore hidden game-over elements so they work on next death
        $canves.find('.game-over-title, .restart-hint, #restart-game-btn').show();
        $canves.removeClass('game-over juice-death-desaturate');
        $canves.removeClass('juice-low-hp');
        // B179: Clear dead bodies left from game-over
        $('.zombie.killed').remove();
        _liveZ = [];
        // Revive at 50% HP
        life = Math.round(gcfg('economy','start_hp',100) * 0.5);
        gameActive = true;
        gamePaused = false;
        waveTransitioning = false;
        pauseZombieTracking = false;
        updateScoreHUD();
        setHandlers();
        shooterSpeech('⚡ REVIVED! -' + _contCost + ' ARC');
        // B179: Restart zombie tracking + spawn interval (not just one createZombies call)
        if (!zombieTrackRunning) { zombieTrackRunning = true; trackZombies(); }
        var _remainQty = Math.max(5, _waveTarget - _waveSpawned);
        var _reviveFreq = gcfg('wave', 'w' + Math.min(wave, 4) + '_freq_min', 800);
        if (window.ARC_ADAPTIVE) {
          var _rsm = window.ARC_ADAPTIVE.getProfile().spawnMulti || 1;
          _reviveFreq = Math.max(200, Math.round(_reviveFreq / _rsm));
        }
        createZombies(); createZombies(); createZombies();
        interval(function(){ createZombies(); }, _reviveFreq, _remainQty);
        // B179: Restart calcWave poll so wave progression continues
        if (window._waveCheckTimer) clearInterval(window._waveCheckTimer);
        window._waveCheckTimer = setInterval(function() {
          if (!gameActive || waveTransitioning) { clearInterval(window._waveCheckTimer); return; }
          calcWave();
        }, 3000);
      });
      $('#du-restart-btn').off('click').on('click', function() {
        $canves.find('.game-over-title, .restart-hint, #restart-game-btn').show();
        _doRestart();
      });
    } else {
      // Ensure game-over UI is visible (may have been hidden by prior death upsell)
      $canves.find('.game-over-title, .restart-hint, #restart-game-btn').show();
      $('#death-upsell').hide();
      $canves.find('.restart-hint').off('click').on('click', _doRestart);
      $canves.find('#restart-game-btn').off('click').on('click', _doRestart);
    }

    // ── Post-game Share Score with referral ──────────────────────
    // ── Battle Report ───────────────────────────────────────────
    (function _injectBattleReport() {
      $canves.find('.battle-report').remove();
      var _elapsed = _gameStartMs ? Date.now() - _gameStartMs : 0;
      var _mins = Math.floor(_elapsed / 60000);
      var _secs = Math.floor((_elapsed % 60000) / 1000);
      var _acc  = shooterShotsFired > 0 ? Math.round(shooterShotsHit / shooterShotsFired * 100) : 0;
      var _hsPct= shooterShotsHit > 0 ? Math.round(_headshots / shooterShotsHit * 100) : 0;
      var _pb = parseInt(localStorage.getItem('arc_all_time_best') || '0', 10);
      var _isNewBest = score > 0 && score >= _pb;
      var $br = $('<div class="battle-report">'
        + '<div class="br-title">⚔️ BATTLE REPORT</div>'
        + '<div class="br-grid">'
        + '<div class="br-cell"><div class="br-val">' + _mins + ':' + (_secs < 10 ? '0' : '') + _secs + '</div><div class="br-lbl">⏱ Survived</div></div>'
        + '<div class="br-cell"><div class="br-val">' + wave + '</div><div class="br-lbl">🌊 Wave</div></div>'
        + '<div class="br-cell"><div class="br-val">' + zombieKilled + '</div><div class="br-lbl">💀 Kills</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _acc + '%</div><div class="br-lbl">🎯 Accuracy</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _headshots + '</div><div class="br-lbl">☠ Headshots</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _hsPct + '%</div><div class="br-lbl">🧠 HS Rate</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _bestCombo + 'x</div><div class="br-lbl">🔥 Best Combo</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _bestHsStreak + 'x</div><div class="br-lbl">💥 HS Streak</div></div>'
        + '<div class="br-cell"><div class="br-val">' + totalDmgDealt.toLocaleString() + '</div><div class="br-lbl">💢 Dmg Dealt</div></div>'
        + '<div class="br-cell"><div class="br-val">' + (function(){ var _bw='—',_bk=0; Object.keys(_weaponKills).forEach(function(k){if(_weaponKills[k]>_bk){_bk=_weaponKills[k];_bw=k;}}); var _L={revolver:'Revolver',shotgun:'Shotgun',m16:'M-16',lmg:'LMG',clay:'Shit',gl:'GL',sniper:'Sniper',ftdrone:'FT Drone',tank_cannon:'Tank',bradley:'Bradley',stugna:'Stugna',drone_bomb:'D-Bomb',panzerfaust:'Pzrfst',pkm:'PKM',ak12:'AK-12',matador:'Matador',nlaw:'NLAW',laser:'Laser'}; return (_L[_bw]||_bw)+' ('+_bk+')'; })() + '</div><div class="br-lbl">🔫 Fav Weapon</div></div>'
        + '<div class="br-cell"><div class="br-val">' + score.toLocaleString() + '</div><div class="br-lbl">⭐ Score</div></div>'
        + '<div class="br-cell"><div class="br-val">' + _sessionArcEarned + '</div><div class="br-lbl">🪙 ARC Earned</div></div>'
        + '<div class="br-cell"><div class="br-val">' + (_isNewBest ? '🏆 NEW BEST!' : _pb.toLocaleString()) + '</div><div class="br-lbl">' + (_isNewBest ? '⭐ Personal Best' : '🏆 Best Score') + '</div></div>'
        + '</div>'
        + '<div class="br-restart-key">Press <kbd>Enter</kbd> or <kbd>Space</kbd> to restart</div>'
        + '</div>');
      $canves.find('.overlay-screen').append($br);
    })();

    // ── Game-over weapon picker: let player choose starting weapon ─────
    (function _injectWeaponPicker() {
      $canves.find('.go-weapon-picker').remove();
      if (_goUnlocked.length <= 1) return;
      var _labels = {revolver:'🔫 Revolver',shotgun:'Shotgun',m16:'M-16',lmg:'LMG',clay:'Clay',gl:'Grenade L.',sniper:'🎯 Sniper',
        ak12:'AK-12',pkm:'PKM',drone_bomb:'D-Bomb',panzerfaust:'Pzfst',stugna:'Stugna',matador:'Matador',nlaw:'NLAW',laser:'Laser',
        ftdrone:'FT Drone',tank_cannon:'Tank',bradley:'Bradley'};
      // Only show core weapons (not NFT/extended) in the starting picker
      var _pickable = ['revolver','shotgun','m16','lmg','clay','gl','sniper'];
      var _available = _pickable.filter(function(w){ return _goUnlocked.indexOf(w) !== -1; });
      if (_available.length <= 1) return;
      var _btns = _available.map(function(w) {
        return '<button class="go-wp-btn' + (w === _nextStartWeapon ? ' go-wp-active' : '') + '" data-wp="' + w + '">' + (_labels[w] || w) + '</button>';
      }).join('');
      var $wp = $('<div class="go-weapon-picker">'
        + '<div class="go-wp-title">⚔️ Starting Weapon</div>'
        + '<div class="go-wp-grid">' + _btns + '</div>'
        + '</div>');
      $wp.on('click', '.go-wp-btn', function() {
        _nextStartWeapon = $(this).data('wp');
        $wp.find('.go-wp-btn').removeClass('go-wp-active');
        $(this).addClass('go-wp-active');
      });
      $canves.find('.overlay-screen').append($wp);
    })();
    if (endType === 'lose') {
      $('.share-score-btn').remove();
      var _refCode = localStorage.getItem('arc_ref_code') || '';
      var _shareUrl = window.location.origin + '/' + (_refCode ? '?ref=' + _refCode : '');
      var _shareText = '🇺🇦 I scored ' + score.toLocaleString() + ' in Anti-Ruscist! Wave ' + wave + ' | ' + zombieKilled + ' kills. Can you beat me?';
      var $shareBtn = $('<button class="share-score-btn">📤 Share Score</button>');
      $shareBtn.on('click', function() {
        if (navigator.share) {
          navigator.share({ title: 'Anti-Ruscist', text: _shareText, url: _shareUrl }).catch(function(){});
        } else {
          var _full = _shareText + ' ' + _shareUrl;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(_full);
            shooterSpeech('📋 Score copied to clipboard!');
          } else {
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(_shareText) + '&url=' + encodeURIComponent(_shareUrl), '_blank');
          }
        }
      });
      $canves.find('.overlay-screen').append($shareBtn);
    }
    if (endType === 'win') {
      $('.share-score-btn').remove();
      var _refCodeW = localStorage.getItem('arc_ref_code') || '';
      var _shareUrlW = window.location.origin + '/' + (_refCodeW ? '?ref=' + _refCodeW : '');
      var _shareTextW = '🇺🇦 I BEAT Anti-Ruscist! Wave ' + wave + ' | ' + zombieKilled + ' kills | ' + score.toLocaleString() + ' pts. Think you can survive?';
      var $shareBtnW = $('<button class="share-score-btn">🏆 Share Victory</button>');
      $shareBtnW.on('click', function() {
        if (navigator.share) {
          navigator.share({ title: 'Anti-Ruscist', text: _shareTextW, url: _shareUrlW }).catch(function(){});
        } else {
          var _fullW = _shareTextW + ' ' + _shareUrlW;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(_fullW);
            shooterSpeech('📋 Victory copied to clipboard!');
          } else {
            window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(_shareTextW) + '&url=' + encodeURIComponent(_shareUrlW), '_blank');
          }
        }
      });
      $canves.find('.overlay-screen').append($shareBtnW);
    }

    // ── Streak Insurance: offer to save combo streak on death ──────────
    if (endType === 'lose' && _comboKills >= 10 && !_streakSavedThisRun) {
      var _sCount = _comboKills;
      var _sCost = _sCount >= 50 ? 15 : _sCount >= 25 ? 12 : 5;
      $('#du-streak-count').text(_sCount);
      $('#du-streak-cost').text(_sCost);
      var $ssBtn = $('#du-streak-btn');
      if (arcoins >= _sCost) { $ssBtn.prop('disabled', false); } else { $ssBtn.prop('disabled', true); }
      $('#du-streak-save').show();
      $ssBtn.off('click').on('click', function() {
        if (arcoins < _sCost) return;
        arcoins -= _sCost;
        localStorage.setItem('arc_balance', String(arcoins));
        _streakSavedThisRun = true;
        // Preserve combo for next game
        localStorage.setItem('arc_saved_streak', String(_sCount));
        $('#du-streak-save').hide();
        shooterSpeech('🔥 Streak saved! ' + _sCount + 'x combo preserved');
        updateScoreHUD();
      });
    } else {
      $('#du-streak-save').hide();
    }

    // ── Starter Pack OTO: show once on first ever game-over ──────────
    if (endType === 'lose' && !localStorage.getItem('arc_starter_claimed') && !localStorage.getItem('arc_starter_dismissed')) {
      var _claimedFake = 200 + Math.floor(Math.random() * 150);
      $('#sp-claimed-count').text(_claimedFake);
      $('#starter-pack').show();
      $('#sp-buy-btn').off('click').on('click', function() {
        // Route to proper payment — show ARC upsell for 150 ARC purchase
        showArcUpsell(150, function() {
          // Grant exclusive starter cosmetic after successful purchase
          var _owned; try { _owned = JSON.parse(localStorage.getItem('arc_cosmetics')||'[]'); } catch(e){ _owned=[]; }
          if (!_owned.includes('title_founder')) _owned.push('title_founder');
          if (!_owned.includes('name_gold')) _owned.push('name_gold');
          localStorage.setItem('arc_cosmetics', JSON.stringify(_owned));
          localStorage.setItem('arc_starter_claimed', '1');
          $('#starter-pack').hide();
          shooterSpeech('🎁 Founder\'s Pack claimed! +150 ARC + exclusive cosmetics');
        });
      });
      $('#sp-dismiss-btn').off('click').on('click', function() {
        localStorage.setItem('arc_starter_dismissed', '1');
        $('#starter-pack').hide();
      });
    }
  }

  function calcWave() {
    if (!gameActive) return;     // don't re-trigger wave logic post win/lose
    if (waveTransitioning) return;
    // Allow transition once kills are met and ALL enemies are cleared
    _liveZ = _liveZ.filter(el => el.parentNode && !el.classList.contains('killed'));
    // Block transition while any enemies still alive
    if (_liveZ.length > 0) return;
    // B190: Pre-check — only fade remaining zombies if wave WILL actually transition
    // (prevents mid-wave disappearing when _waveSpawned >= _waveTarget but kills < threshold)
    var _willTransition = false;
    if (wave >= 5 && zombieKilled >= _endlessKillTarget) _willTransition = true;
    else if (wave === 4 && zombieKilled >= ALL_ZOMBIES) _willTransition = true;
    else if (wave === 3 && zombieKilled >= (WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY + WAVE_3_ZOMBIE_QTY)) _willTransition = true;
    else if (wave === 2 && zombieKilled >= (WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY)) _willTransition = true;
    else if (wave === 1 && zombieKilled >= WAVE_1_ZOMBIE_QTY) _willTransition = true;
    if (!_willTransition) return;
    if (_liveZ.length > 0) { $(_liveZ).fadeOut(200, function(){ $(this).remove(); }); _liveZ = []; }
    if (wave >= 5 && zombieKilled >= _endlessKillTarget) {
      // Endless mode wave transition — rewards scale with depth
      waveTransitioning = true;
      var _endlessArc = Math.min(25, Math.floor(2 + (wave - 4) * 1.5));
      var _endlessScore = 500 * (wave - 3);
      score += _endlessScore;
      earnArcoin(_endlessArc, 'Wave ' + wave + ' survived! (+' + _endlessScore + ' pts)');
      stopMusic();
      showWaveBreak(wave, () => {
        currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
        if (!mutedMusic) startMusic();
        const p = getEndlessWaveParams(wave + 1);
        _endlessKillTarget = zombieKilled + p.qty;
        startWave(p.freq, p.qty);
      });
    } else if (wave === 4 && zombieKilled >= ALL_ZOMBIES) {
      waveTransitioning = true;
      earnArcoin(gcfg('economy','wave_clear_arc_w4',2), 'Wave 4 cleared — ENDLESS MODE!');
      stopMusic();
      showWaveBreak(4, () => {
        currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
        if (!mutedMusic) startMusic();
        const p = getEndlessWaveParams(5);
        _endlessKillTarget = ALL_ZOMBIES + p.qty;
        startWave(p.freq, p.qty);
      });
    } else if (wave === 3 && zombieKilled >= (WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY + WAVE_3_ZOMBIE_QTY)) {
      waveTransitioning = true;
      earnArcoin(gcfg('economy','wave_clear_arc_w3',1), 'Wave 3 completed');
      stopMusic();
      showWaveBreak(3, () => {
        currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
        if (!mutedMusic) startMusic();
        startWave(WAVE_4_ZOMBIE_FRQ, WAVE_4_ZOMBIE_QTY);
      });
    } else if (wave === 2 && zombieKilled >= (WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY)) {
      waveTransitioning = true;
      earnArcoin(gcfg('economy','wave_clear_arc_w2',1), 'Wave 2 completed');
      stopMusic();
      showWaveBreak(2, () => {
        currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
        if (!mutedMusic) startMusic();
        startWave(WAVE_3_ZOMBIE_FRQ, WAVE_3_ZOMBIE_QTY);
      });
    } else if (wave === 1 && zombieKilled >= WAVE_1_ZOMBIE_QTY) {
      waveTransitioning = true;
      earnArcoin(gcfg('economy','wave_clear_arc_w1',1), 'Wave 1 completed');
      stopMusic();
      showWaveBreak(1, () => {
        currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
        if (!mutedMusic) startMusic();
        startWave(WAVE_2_ZOMBIE_FRQ, WAVE_2_ZOMBIE_QTY);
      });
    }
  }

  // ── Wave-break: mandatory inventory pause between levels ─────────────
  function getWaveUnlockMsg() {
    const unlocks = [];
    if (newWeapons.has('shotgun')) unlocks.push('💥 Shotgun unlocked!');
    if (newWeapons.has('m16'))     unlocks.push('🔫 M-16 unlocked!');
    if (newWeapons.has('lmg'))     unlocks.push('🔫 LMG unlocked!');
    if (newWeapons.has('gl'))      unlocks.push('💣 Grenade Launcher unlocked!');
    newWeapons.clear();
    return unlocks;
  }

  function showWaveBreak(completedWave, nextWaveFn) {
    waveTransitioning = true;
    $('body').off('keydown.game');
    $canves.off('.game');
    $(document).off('mouseup.game');
    stopM16Fire();
    gamePaused = true;

    // ── Flawless wave check (zero damage taken) ─────────────────────────────
    const _flawless = _waveDmgTaken === 0 && completedWave >= 1;
    if (_flawless) {
      const _flawBonus = 200 * completedWave;
      score += _flawBonus;
      updateScoreHUD();
      earnArcoin(1, 'Flawless Wave ' + completedWave + '!');
      const $ft = $('<div class="flawless-toast">⚡ FLAWLESS WAVE! +' + _flawBonus + ' pts</div>');
      $canves.append($ft);
      requestAnimationFrame(function(){ $ft.addClass('flawless-toast--in'); });
      setTimeout(function(){ $ft.addClass('flawless-toast--out'); }, 2800);
      setTimeout(function(){ $ft.remove(); }, 3600);
    }

    // ── Level-complete fanfare (bypasses masterGain so it plays as music fades) ──
    sndWaveComplete();

    // ── Golden cinematic flash on the game canvas ─────────────────────────────
    const $fl = $('#wave-complete-flash');
    $fl.removeClass('active');
    if ($fl[0]) void $fl[0].offsetWidth;   // force reflow to restart animation
    $fl.addClass('active');

    // ── Fade music out smoothly (~500 ms) ────────────────────────────────────
    if (masterGain) {
      const ac = getACtx();
      masterGain.gain.cancelScheduledValues(ac.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value || 1, ac.currentTime);
      masterGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.55);
    }

    // ── Build & reveal inventory ~660 ms later (lets flash + fanfare breathe) ─
    setTimeout(() => {
      buildInventory();

      // ── Wave personal-best check → award ARC ──
      const _hsKey    = 'arc_wave_hs_' + completedWave;
      const _prevBest = parseInt(localStorage.getItem(_hsKey) || '0', 10);
      if (score > _prevBest) {
        localStorage.setItem(_hsKey, String(score));
        earnArcoin(1, 'Wave ' + completedWave + ' high score!');
      }

      const nextWave   = completedWave + 1;
      var _waveTips = ['', '', 'Armored orcs incoming — aim for headshots!', 'Supply trucks rolling in — watch the road!', 'Boss wave! Concentrate fire on the big one.'];
      var _waveTip = nextWave <= 4 ? (_waveTips[nextWave] || '') : 'Wave ' + nextWave + ' — intensity rising!';

      // ── Wave progression intel for player ──
      var _nextQty;
      if (nextWave === 1) _nextQty = WAVE_1_ZOMBIE_QTY;
      else if (nextWave === 2) _nextQty = WAVE_2_ZOMBIE_QTY;
      else if (nextWave === 3) _nextQty = WAVE_3_ZOMBIE_QTY;
      else if (nextWave === 4) _nextQty = WAVE_4_ZOMBIE_QTY;
      else _nextQty = getEndlessWaveParams(nextWave).qty;

      var _nextEnemies = ['Orcs'];
      _nextEnemies.push('Trucks');
      _nextEnemies.push('Drones');
      if (nextWave >= 2) _nextEnemies.push('APCs');
      if (nextWave >= 3) _nextEnemies.push('Tanks');
      if (nextWave >= 3) _nextEnemies.push('Zombie types 4-6');
      var _waveInfoHtml = '<div class="wbr-wave-info">📋 Next: <b>~' + _nextQty + ' kills</b> · Enemies: ' + _nextEnemies.join(', ') + '</div>';
      const unlocks    = getWaveUnlockMsg();
      const unlockHtml = unlocks.length
        ? unlocks.map(u => `<div class="wbr-unlock-item">${u}</div>`).join('')
        : '<div class="wbr-unlock-item wbr-nothing">No new unlocks this wave</div>';

      // ── Wave speed time ─────────────────────────────────────────
      var _waveElapsed  = _waveStartMs ? Date.now() - _waveStartMs : 0;
      var _waveM = Math.floor(_waveElapsed / 60000);
      var _waveS = Math.floor((_waveElapsed % 60000) / 1000);
      var _waveTimeStr  = _waveM + ':' + (_waveS < 10 ? '0' : '') + _waveS;
      var _wbTimeKey    = 'arc_wave_time_' + completedWave;
      var _wbPrevBest   = parseInt(localStorage.getItem(_wbTimeKey) || '0', 10);
      var _wbIsNewBest  = _waveElapsed > 0 && (_wbPrevBest === 0 || _waveElapsed < _wbPrevBest);
      if (_wbIsNewBest) localStorage.setItem(_wbTimeKey, String(_waveElapsed));
      var _wbTimeHtml   = ' · ⏱ ' + _waveTimeStr + (_wbIsNewBest ? ' <b>NEW PB!</b>' : '');

      const $panel = $('#inventory-panel');
      $panel.find('#wave-break-banner').remove();

      // ── Wave-break deals: pick a relevant cosmetic the player doesn't own ──
      var _wbrDealHtml = '';
      var _unowned = _COSMETICS.filter(function(c){ return !getOwnedCosmetics().includes(c.id); });
      if (_unowned.length > 0) {
        // Rotate deal based on day + wave for variety
        var _dealIdx = (new Date().getDate() + completedWave) % _unowned.length;
        var _deal = _unowned[_dealIdx];
        var _discPct = gcfg('economy','daily_deal_discount',30);
        var _salePrice = Math.max(1, Math.round(_deal.arc * (1 - _discPct/100)));
        var _socialCount = 127 + Math.floor(Math.random() * 180);
        _wbrDealHtml = `<div class="wbr-deals">
          <span class="wbr-deal-tag">🔥 DEAL</span>
          <span class="wbr-deal-item">${_deal.name} — <s>${_deal.arc}</s> <b>${_salePrice} ARC</b><span class="wbr-deal-timer" id="wbr-deal-timer">⏰ 0:30</span></span>
          <button class="wbr-deal-buy" data-cosm-id="${_deal.id}" data-price="${_salePrice}">BUY</button>
          <span class="wbr-deal-social">🔥 ${_socialCount} players bought this today</span>
        </div>`;
      }

      $panel.prepend(`
        <div id="wave-break-banner">
          <button id="wbr-continue-btn">
            <span class="wbr-btn-icon">▶</span>
            <span class="wbr-btn-label">WAVE ${nextWave}</span>
          </button>
          <span class="wbr-inline-badge">⚔️ Wave ${completedWave} done · +1 ARC 🪙 ${arcoins}${_wbTimeHtml}</span>
          ${_waveTip ? '<span class="wbr-wave-tip">⚠️ ' + _waveTip + '</span>' : ''}
          ${_waveInfoHtml}
          ${unlocks.length ? '<span class="wbr-inline-unlocks">' + unlocks.join(' · ') + '</span>' : ''}
          ${_wbrDealHtml}
        </div>
      `);
      $panel.addClass('open');

      // ── FOMO countdown timer for wave-break deals ──
      var _wbrTimerEl = document.getElementById('wbr-deal-timer');
      if (_wbrTimerEl) {
        var _wbrSec = 30;
        if (window._wbrInt) clearInterval(window._wbrInt);
        var _wbrInt = window._wbrInt = setInterval(function() {
          _wbrSec--;
          if (_wbrSec <= 0) {
            clearInterval(_wbrInt);
            $panel.find('.wbr-deals').fadeOut(300);
            return;
          }
          _wbrTimerEl.textContent = '⏰ 0:' + String(_wbrSec).padStart(2,'0');
          if (_wbrSec <= 10) _wbrTimerEl.classList.add('wbr-timer-urgent');
        }, 1000);
        // Clean up on continue
        $panel.one('wbr-cleanup', function(){ clearInterval(_wbrInt); });
      }

      // Wire wave-break deal buy button
      $panel.find('.wbr-deal-buy').off('click').on('click', function() {
        var _cid = $(this).data('cosm-id');
        var _cprice = $(this).data('price');
        var $btn = $(this);
        if (arcoins < _cprice) { shooterSpeech('Not enough ARC!'); return; }
        showConfirm({ title:'🔥 Buy Deal?', body:'Spend <b>' + _cprice + ' ARC</b> on this deal?', confirmTxt:'Buy', onConfirm: function() {
          arcoins -= _cprice;
          localStorage.setItem('arc_balance', String(arcoins));
          var owned = getOwnedCosmetics(); owned.push(_cid);
          localStorage.setItem('arc_cosmetics', JSON.stringify(owned));
          shooterSpeech('🎉 Purchased! -' + _cprice + ' ARC');
          $btn.replaceWith('<span class="wbr-deal-bought">✅ OWNED</span>');
          buildInventory();
        }});
      });

      $('#wbr-continue-btn').off('click').on('click', function () {
        $panel.trigger('wbr-cleanup');
        $('#wave-break-banner').remove();
        $panel.removeClass('open');
        if (masterGain) {
          var _savedSfx = parseFloat(localStorage.getItem('arc_sfx_vol') || '0.85');
          masterGain.gain.setValueAtTime(mutedSounds ? 0 : _savedSfx, getACtx().currentTime);
        }
        gamePaused = false;
        waveTransitioning = false;
        nextWaveFn();
      });
    }, 660);
  }

  let trackZombies = function repeatOften() {
    _liveZ = _liveZ.filter(el => el.parentNode && !el.classList.contains('killed'));
    const $zombie = $(_liveZ);
    const zLen = $zombie.length;
    if (zLen !== 0) {
      for (let i = 0; i < zLen; i++) {
        const $z = $zombie.eq(i);
        const zombieWidth = $z.width() - 20;
        if ($z.hasClass('tracking')) {
          const isReverse = $z.hasClass('walk-reverse');
          const cRect = $canves[0].getBoundingClientRect();
          const zRect = $z[0].getBoundingClientRect();
          // Normal: zombie passed left edge. Reverse: zombie passed right edge.
          const pastEdge = isReverse
            ? (zRect.right - cRect.right >= zombieWidth)
            : (zRect.left - cRect.left <= (-zombieWidth));
          if (pastEdge) {
            $z.remove();
            sndPunch();
            damageShooter(10);  // B197: reduced breach damage for longer gameplay
            zombieKilled++;
            updateScoreHUD();
            if (_waveSpawned < _waveTarget && ($zombie.length - 1) < MAX_CONCURRENT_ZOMBIES) createZombies();
            if (!waveTransitioning) calcWave();
          }
        } else {
          $z.addClass('tracking');
        }
      }
    }
    if (life !== 0) {
      if (!pauseZombieTracking) requestAnimationFrame(trackZombies);
    } else {
      zombieTrackRunning = false;
      endGame('lose');
    }
  };

  // ── Reload ────────────────────────────────────────────────────
  function reload() {
    if (!godMode && currentWeapon !== REVOLVER_WEAPON) {
      if ((ammoReserve[currentWeapon] || 0) <= 0) {
        // Emergency reload: grant half a magazine so the player is never stuck
        ammo = Math.max(1, Math.floor(getAmmoMax() / 2));
        // Mid-game upsell: offer quick ammo buy
        _showInGameOffer('ammo', '💥 OUT OF AMMO!', '+5 mags for all weapons', 3, function() {
          Object.keys(ammoReserve).forEach(function(k){ ammoReserve[k] += 5; });
          shooterSpeech('📦 +5 mags all weapons!');
          renderAmmoUI();
        });
        sndNoAmmo();
        weaponHandsReload();
        if (currentWeapon === REVOLVER_WEAPON) sndRevolverReload();
        else sndReload();
        $ammoTitle.addClass('reload');
        setTimeout(() => { renderAmmoUI(); }, 150);
        setTimeout(() => { $ammoTitle.removeClass('reload'); }, 500);
        $reloadHint.removeClass('visible');
        stopM16Fire();
        return;
      }
      ammoReserve[currentWeapon]--;
    }
    ammo = getAmmoMax();
    shooterSpeech('Reloading!');
    weaponHandsReload();
    if (currentWeapon === REVOLVER_WEAPON) sndRevolverReload();
    else sndReload();

    $ammoTitle.addClass('reload');
    setTimeout(() => { renderAmmoUI(); }, 150);
    setTimeout(() => { $ammoTitle.removeClass('reload'); }, 500);
    $reloadHint.removeClass('visible');
    stopM16Fire();
  }

  // ── Weapon Switcher Helpers ─────────────────────────────────────
  function getUnlockedWeapons() {
    const base = [REVOLVER_WEAPON, SHOTGUN_WEAPON, M16_WEAPON, LMG_WEAPON, CLAY_WEAPON, GL_WEAPON, SNIPER_WEAPON]
      .filter(w =>
        w === REVOLVER_WEAPON ||
        (w === SHOTGUN_WEAPON && shotgunUnlocked) ||
        (w === M16_WEAPON     && m16Unlocked)     ||
        (w === LMG_WEAPON     && lmgUnlocked)     ||
        (w === CLAY_WEAPON    && clayUnlocked)    ||
        (w === GL_WEAPON      && glUnlocked)      ||
        (w === SNIPER_WEAPON  && sniperUnlocked));
    const nft = [FTDRONE_WEAPON, TANK_WEAPON, BRADLEY_WEAPON].filter(w =>
      (w === FTDRONE_WEAPON  && ftdroneUnlocked) ||
      (w === TANK_WEAPON     && tankUnlocked)    ||
      (w === BRADLEY_WEAPON  && bradleyUnlocked));
    const extended = [
      AK12_WEAPON, PKM_WEAPON, DRONE_BOMB_WEAPON, PANZERFAUST_WEAPON,
      STUGNA_WEAPON, MATADOR_WEAPON, NLAW_WEAPON, LASER_WEAPON
    ].filter(w =>
      godMode ||
      (w === AK12_WEAPON       && zombieKilled >= AK12_UNLOCK_KILLS)       ||
      (w === PKM_WEAPON        && zombieKilled >= PKM_UNLOCK_KILLS)        ||
      (w === DRONE_BOMB_WEAPON && zombieKilled >= DRONE_BOMB_UNLOCK_KILLS) ||
      (w === PANZERFAUST_WEAPON && zombieKilled >= PANZERFAUST_UNLOCK_KILLS)||
      (w === STUGNA_WEAPON     && zombieKilled >= STUGNA_UNLOCK_KILLS)     ||
      (w === MATADOR_WEAPON    && zombieKilled >= MATADOR_UNLOCK_KILLS)    ||
      (w === NLAW_WEAPON       && zombieKilled >= NLAW_UNLOCK_KILLS)       ||
      (w === LASER_WEAPON      && zombieKilled >= LASER_UNLOCK_KILLS));
    return base.concat(extended).concat(nft);
  }

  var _prevWeapon = REVOLVER_WEAPON;
  function switchToWeapon(wname) {
    if (wname === currentWeapon) return;
    _prevWeapon = currentWeapon;
    if      (wname === SHOTGUN_WEAPON  && shotgunUnlocked)  equipShotgun();
    else if (wname === M16_WEAPON      && m16Unlocked)      equipM16();
    else if (wname === LMG_WEAPON      && lmgUnlocked)      equipLMG();
    else if (wname === GL_WEAPON       && glUnlocked)       equipGL();
    else if (wname === SNIPER_WEAPON   && sniperUnlocked)   equipSniper();
    else if (wname === FTDRONE_WEAPON  && ftdroneUnlocked)  equipFtDrone();
    else if (wname === TANK_WEAPON     && tankUnlocked)     equipTankCannon();
    else if (wname === BRADLEY_WEAPON  && bradleyUnlocked)  equipBradley();
    else if (wname === CLAY_WEAPON      && clayUnlocked)     equipClay();
    else if (wname === AK12_WEAPON      && zombieKilled >= AK12_UNLOCK_KILLS)       equipAK12();
    else if (wname === PKM_WEAPON       && zombieKilled >= PKM_UNLOCK_KILLS)        equipPKM();
    else if (wname === DRONE_BOMB_WEAPON && zombieKilled >= DRONE_BOMB_UNLOCK_KILLS) equipDroneBomb();
    else if (wname === PANZERFAUST_WEAPON && zombieKilled >= PANZERFAUST_UNLOCK_KILLS) equipPanzerfaust();
    else if (wname === STUGNA_WEAPON    && zombieKilled >= STUGNA_UNLOCK_KILLS)     equipStugna();
    else if (wname === MATADOR_WEAPON   && zombieKilled >= MATADOR_UNLOCK_KILLS)    equipMatador();
    else if (wname === NLAW_WEAPON       && zombieKilled >= NLAW_UNLOCK_KILLS)       equipNlaw();
    else if (wname === LASER_WEAPON      && zombieKilled >= LASER_UNLOCK_KILLS)      equipLaser();
    // god mode unlocks all
    else if (godMode && wname === AK12_WEAPON)      equipAK12();
    else if (godMode && wname === PKM_WEAPON)       equipPKM();
    else if (godMode && wname === DRONE_BOMB_WEAPON) equipDroneBomb();
    else if (godMode && wname === PANZERFAUST_WEAPON) equipPanzerfaust();
    else if (godMode && wname === STUGNA_WEAPON)    equipStugna();
    else if (godMode && wname === MATADOR_WEAPON)   equipMatador();
    else if (godMode && wname === NLAW_WEAPON)      equipNlaw();
    else if (godMode && wname === LASER_WEAPON)     equipLaser();
    else if (wname === REVOLVER_WEAPON) {
      currentWeapon = REVOLVER_WEAPON;
      ammo = REVOLVER_AMMO_MAX + weaponAmmoBonus.revolver;
      sndWeaponSwitch();
      renderAmmoUI();
      renderWeaponHands();
    }
    renderWeaponSwitcher();
  }

  function renderWeaponSwitcher() {
    const $ws      = $('#weapon-switcher');
    const unlocked = getUnlockedWeapons();
    if (unlocked.length <= 1) { $ws.hide(); return; }
    // SVG-style military icons — detailed weapon silhouettes
    const ICONS  = {
      revolver:     '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M3 9h14v3H3z"/><path d="M17 7h12v2H17z"/><path d="M17 12h12v2H17z"/><circle cx="24" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 12h5v6a1 1 0 01-1 1H9a1 1 0 01-1-1z"/></svg>',
      shotgun:      '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 9h20v3H2z"/><rect x="22" y="7.5" width="8" height="1.5"/><rect x="22" y="12" width="8" height="1.5"/><path d="M6 12h6v7a1 1 0 01-1 1H7a1 1 0 01-1-1z"/><rect x="15" y="8" width="2" height="5" rx=".5" opacity=".4"/></svg>',
      m16:          '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 9h18v3H2z"/><rect x="20" y="6" width="11" height="2"/><rect x="20" y="13" width="11" height="2"/><path d="M7 12h5v7a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><rect x="13" y="5" width="3" height="3" rx=".5" opacity=".5"/><rect x="24" y="8" width="7" height="5" rx="1" opacity=".3"/></svg>',
      lmg:          '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 8h22v4H2z"/><rect x="24" y="5" width="7" height="2"/><rect x="24" y="14" width="7" height="2"/><path d="M7 12h5v7a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><rect x="12" y="13" width="14" height="5" rx="1.5" opacity=".5"/><circle cx="15" cy="15.5" r="2" opacity=".7"/></svg>',
      clay:         '<svg viewBox="0 0 32 20" fill="currentColor"><ellipse cx="16" cy="10" rx="8" ry="6"/><rect x="22" y="8" width="8" height="4" rx="1"/><path d="M14 4l4 2-4 2z" opacity=".5"/></svg>',
      gl:           '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 9h14v3H2z"/><circle cx="20" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="20" cy="10" r="2.5"/><path d="M7 12h5v6a1 1 0 01-1 1H8a1 1 0 01-1-1z"/></svg>',
      sniper:       '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="1" y="9.5" width="26" height="2" rx="1"/><rect x="27" y="6" width="4" height="2"/><rect x="27" y="13" width="4" height="2"/><path d="M7 12h5v7a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><rect x="12" y="4" width="5" height="12" rx="1.5" opacity=".35"/><circle cx="14.5" cy="10" r="4" fill="none" stroke="currentColor" stroke-width=".8" opacity=".5"/></svg>',
      ftdrone:      '<svg viewBox="0 0 32 20" fill="currentColor"><ellipse cx="16" cy="10" rx="10" ry="3.5"/><circle cx="8" cy="5" r="2.5"/><circle cx="24" cy="5" r="2.5"/><circle cx="8" cy="15" r="2.5"/><circle cx="24" cy="15" r="2.5"/><line x1="8" y1="5" x2="12" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="24" y1="5" x2="20" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="15" x2="12" y2="12" stroke="currentColor" stroke-width="1.2"/><line x1="24" y1="15" x2="20" y2="12" stroke="currentColor" stroke-width="1.2"/><rect x="14" y="12" width="4" height="3" rx="1"/></svg>',
      tank_cannon:  '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="2" y="11" width="26" height="6" rx="2"/><rect x="6" y="6" width="14" height="6" rx="1.5"/><rect x="16" y="7.5" width="14" height="2.5" rx="1"/><circle cx="7" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="23" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      bradley:      '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="1" y="11" width="28" height="6" rx="2"/><rect x="5" y="6" width="16" height="6" rx="1.5"/><rect x="18" y="7.5" width="12" height="2" rx="1"/><circle cx="6" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="14" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="22" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="7" y="7" width="4" height="3" rx=".5" opacity=".4"/></svg>',
      stugna:       '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="2" y="14" width="28" height="4" rx="1"/><rect x="8" y="10" width="8" height="5" rx="1"/><rect x="14" y="4" width="16" height="2.5" rx="1"/><circle cx="7" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="22" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="14" y="6" width="2" height="5" rx=".5" opacity=".4"/></svg>',
      drone_bomb:   '<svg viewBox="0 0 32 20" fill="currentColor"><ellipse cx="16" cy="8" rx="8" ry="3"/><circle cx="8" cy="4" r="2"/><circle cx="24" cy="4" r="2"/><line x1="8" y1="4" x2="12" y2="7" stroke="currentColor" stroke-width="1"/><line x1="24" y1="4" x2="20" y2="7" stroke="currentColor" stroke-width="1"/><ellipse cx="16" cy="14" rx="3.5" ry="5" opacity=".8"/><path d="M14.5 17l1.5 3 1.5-3z" opacity=".6"/></svg>',
      panzerfaust:  '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="4" y="9" width="22" height="2.5" rx="1"/><ellipse cx="28" cy="10" rx="4" ry="6.5"/><rect x="10" y="11" width="8" height="3" rx="1"/><path d="M28 3l-2 4h4z" opacity=".5"/></svg>',
      pkm:          '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 8h20v4H2z"/><rect x="22" y="5" width="9" height="2"/><rect x="22" y="14" width="9" height="2"/><path d="M7 12h5v7a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><rect x="10" y="13" width="16" height="4" rx="1.5" opacity=".5"/><rect x="14" y="5" width="3" height="4" rx=".5" opacity=".4"/></svg>',
      ak12:         '<svg viewBox="0 0 32 20" fill="currentColor"><path d="M2 9h19v3H2z"/><rect x="21" y="6" width="10" height="2"/><rect x="21" y="13" width="10" height="2"/><path d="M7 12h5v7a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><rect x="11" y="12" width="3" height="5" rx=".5" opacity=".5" transform="rotate(-15 12.5 14.5)"/><rect x="15" y="5" width="3" height="3" rx=".5" opacity=".4"/></svg>',
      matador:      '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="2" y="9" width="26" height="3" rx="1"/><ellipse cx="29" cy="10" rx="3" ry="5.5"/><rect x="8" y="11" width="10" height="3" rx="1"/><rect x="4" y="8" width="4" height="1.5" rx=".5" opacity=".4"/></svg>',
      nlaw:         '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="1" y="9" width="22" height="3" rx="1"/><ellipse cx="26" cy="10" rx="4.5" ry="6"/><rect x="7" y="12" width="8" height="3" rx="1"/><rect x="15" y="7" width="6" height="2" rx=".5"/><circle cx="26" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/></svg>',
      laser:        '<svg viewBox="0 0 32 20" fill="currentColor"><rect x="2" y="9" width="20" height="3" rx="1"/><circle cx="26" cy="10" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="26" cy="10" r="1.5"/><line x1="29" y1="3" x2="31" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="31" y1="10" x2="32" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="29" y1="17" x2="31" y2="19" stroke="currentColor" stroke-width="1.5"/><line x1="23" y1="3" x2="21" y2="1" stroke="currentColor" stroke-width="1" opacity=".6"/><line x1="23" y1="17" x2="21" y2="19" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>'
    };
    const LABELS = {
      revolver:'RVLVR', shotgun:'SHTGN', m16:'M-16', lmg:'LMG', clay:'SHIT',
      gl:'GL', sniper:'SNPR', ftdrone:'FTDRN', tank_cannon:'TANK', bradley:'BRDLY',
      stugna:'СТУГН', drone_bomb:'D-BOM', panzerfaust:'PZRFT', pkm:'PKM', ak12:'AK-12', matador:'MTDR', nlaw:'NLAW', laser:'LASER'
    };
    const FULL = {
      revolver:'Revolver', shotgun:'Shotgun', m16:'M16 Rifle', lmg:'LMG', clay:'Shit Thrower',
      gl:'Grenade Launcher', sniper:'Sniper Rifle', ftdrone:'FT Drone',
      tank_cannon:'Tank Cannon', bradley:'Bradley IFV',
      stugna:'Stugna-P ATGM', drone_bomb:'Drone Bomb', panzerfaust:'Panzerfaust 3',
      pkm:'PKM Machine Gun', ak12:'AK-12 Assault', matador:'M4 Matador', nlaw:'NLAW ATGM', laser:'Laser Designator'
    };
    const NFT_SET = new Set([FTDRONE_WEAPON, TANK_WEAPON, BRADLEY_WEAPON]);
    // Active weapon banner uses the color of current weapon
    let html = '<div class="ws-cur-label" style="--ws-led:' + _wsColor(currentWeapon) + '">'
      + (FULL[currentWeapon] || currentWeapon.toUpperCase()) + '</div>';
    html += '<div class="ws-dock">';
    unlocked.forEach((w, idx) => {
      const act = w === currentWeapon, nft = NFT_SET.has(w);
      var _wp = WEAPONS[w] || {};
      var _wRes = ammoReserve[w];
      var _wLow = !godMode && typeof _wRes === 'number' && _wRes <= 1;
      var _wEmpty = !godMode && typeof _wRes === 'number' && _wRes <= 0;
      var _statTip = 'DMG:' + (_wp.dmg || '?') + ' \u00b7 RPM:' + (_wp.rpm || '?') + ' \u00b7 MAG:' + (_wp.ammoMax || '?');
      const keyHint = idx < 8 ? ' [' + (idx + 1) + ']' : '';
      html += '<button class="ws-icon-btn' + (act ? ' ws-icon-active' : '') + (nft ? ' ws-icon-nft' : '') + (_wEmpty ? ' ws-empty' : _wLow ? ' ws-low-ammo' : '') + '"'
            + ' data-w="' + w + '" title="' + (FULL[w] || w) + keyHint + '" data-tootik="' + _statTip + '" data-tootik-conf="bottom" aria-label="' + (FULL[w] || w) + '">';
      html += '<span class="ws-icon-glyph">' + (ICONS[w] || '🔫') + '</span>';
      html += '<span class="ws-led-label">' + (LABELS[w] || w.toUpperCase().slice(0,5)) + '</span>';
      var _wRes = ammoReserve[w]; if (typeof _wRes === 'number') html += '<span class="ws-mag-badge">' + _wRes + '</span>';
      if (idx < 8) html += '<span class="ws-key-badge">' + (idx + 1) + '</span>';
      if (act) html += '<span class="ws-icon-pip"></span>';
      html += '</button>';
    });
    html += '</div>';
    $ws.html(html).show();
    _wsResetCollapse(); // start the 1.2 s inactivity collapse timer
  }
  function _wsColor(w) {
    const MAP = {
      revolver:'#4cf', shotgun:'#f84', m16:'#4f8', lmg:'#4f4', clay:'#c84',
      gl:'#f44', sniper:'#f0f', ftdrone:'#f60', tank_cannon:'#c44', bradley:'#c4f',
      stugna:'#ff4', drone_bomb:'#fa4', panzerfaust:'#f66', pkm:'#5fa', ak12:'#7fc', matador:'#f80', nlaw:'#0df', laser:'#0ff'
    };
    return MAP[w] || '#4cf';
  }

  // Static weapon-switcher click handler (delegated, always on)
  $('#canves').on('click.wswitch', '.ws-icon-btn', function (e) {
    e.stopPropagation();
    switchToWeapon($(this).data('w'));
  });

  // Expand weapon switcher on hover; collapse re-starts after mouse leaves
  $('#canves').on('mouseenter', '#weapon-switcher', function () {
    _wsExpandOnHover();
  }).on('mouseleave', '#weapon-switcher', function () {
    _wsCollapseOnLeave();
  }).on('click', '#weapon-switcher.ws-collapsed', function (e) {
    // Clicking the collapsed icon row also expands
    e.stopPropagation();
    _wsExpandOnHover();
  });

  // ── Handlers ──────────────────────────────────────────────────
  function setHandlers() {
    // ── Always clear before re-binding (prevents duplicate stacking on wave/unpause)
    $canves.off('.game');
    $('body').off('keydown.game');
    $(document).off('keydown.game');
    $(document).off('mouseup.game');

    // ── CI panel collapse toggle
    $('#ci-collapse-btn').off('click.ci').on('click.ci', function (e) {
      e.stopPropagation();
      const $panel = $('#callin-panel');
      const collapsed = $panel.toggleClass('ci-panel--collapsed').hasClass('ci-panel--collapsed');
      // B186: panel at bottom, title on top — ▲ = expanded, ▼ = collapsed
      $(this).text(collapsed ? '▼' : '▲');
    });

    // ── Call-In button handlers
    $('#callin-arty').off('click.ci').on('click.ci',       function () { callInArtillery();   });
    $('#callin-drones').off('click.ci').on('click.ci',     function () { callInDrones();       });
    $('#callin-himars').off('click.ci').on('click.ci',     function () { callInHIMARs();       });
    $('#callin-bradley').off('click.ci').on('click.ci',    function () { callInBradley();      });
    $('#callin-rover').off('click.ci').on('click.ci',      function () { callInRover();         });
    $('#callin-firedrone').off('click.ci').on('click.ci',  function () { callInFiredrone();     });
    $('#callin-fpv').off('click.ci').on('click.ci',        function () { callInFpvDrone();      });
    // ESC pause removed (duplicate — MENU button handles pause)

    // ── Track cursor for auto-weapon hitscan
    const $gameCrosshair = $('#game-crosshair');
    $canves.on('mousemove.game', function (e) {
      const r = $canves[0].getBoundingClientRect();
      lastCursorX = e.clientX - r.left;
      lastCursorY = e.clientY - r.top;
      if ($gameCrosshair.length) $gameCrosshair[0].style.left = lastCursorX + 'px', $gameCrosshair[0].style.top = lastCursorY + 'px';
    });

    // ── Canvas click (single shot / semi / shotgun / revolver / GL on empty canvas)
    $canves.on('click.game', function (e) {
      const $t = $(e.target);
      // Bail out immediately if user clicked any UI element — don't shoot
      if ($t.closest('button, [role="button"], #pause-game, .hud-ctrl-btn, #inventory-panel, .overlay-screen, #weapon-switcher, .ws-icon-btn, #callin-panel, #score-hud, #shooter-hud, #m16-mode-toggle, #reload-fab, #fire-fab, .ammo, .reload-hint, #wallet-earn-notify').length) return;
      if ($t.hasClass('zombie') || $t.closest('.zombie').length) return;
      // Use .closest() for ALL drop types so clicking SVG children inside buttons
      // doesn't bypass the guard and burn ammo before the delegated handler fires.
      if ($t.closest('.shotgun-drop,.m16-drop,.lmg-drop,.clay-drop,.gl-drop,.autokill-drop,.sniper-drop,.truck-target,.drone-target').length) return;
      // Auto weapons handled by mousedown; also allow single semi/click shots
      const isAutoHeld = (currentWeapon === M16_WEAPON && m16Auto) || currentWeapon === LMG_WEAPON;
      if (!isAutoHeld || !(currentWeapon === M16_WEAPON && m16Auto)) {
        if (!mutedMusic) startMusic();
        const rect = $canves[0].getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        doShoot(e);          // FX + ammo
        fireWeapon(cx, cy);  // damage (handles shotgun spread + GL area)
        sndMiss();           // missed background click
        // Miss tracking for skill degradation
        shooterShotsFired++;
        _updateAccuracyHUD();
        consecutiveMisses++;
        checkSkillDegradation();
      }
    });

    // ── M-16 / LMG mousedown → start auto fire (full hitscan each tick)
    $canves.on('mousedown.game', function (e) {
      if (e.button !== 0) return;
      // Bail out immediately if user clicked any UI element — don't shoot
      const $md = $(e.target);
      if ($md.closest('button, [role="button"], #pause-game, .hud-ctrl-btn, #inventory-panel, .overlay-screen, #weapon-switcher, .ws-icon-btn, #callin-panel, #score-hud, #shooter-hud, #m16-mode-toggle, #reload-fab, #fire-fab, .ammo, .reload-hint, #wallet-earn-notify').length) return;
      const isAutoFire = (currentWeapon === M16_WEAPON && m16Auto) || currentWeapon === LMG_WEAPON || currentWeapon === PKM_WEAPON || currentWeapon === AK12_WEAPON || currentWeapon === BRADLEY_WEAPON || currentWeapon === FTDRONE_WEAPON;
      if (isAutoFire) {
        if (!mutedMusic) startMusic();
        m16Shooting = true;
        $canves.addClass('m16-firing');
        const rect = $canves[0].getBoundingClientRect();
        const cx0 = e.clientX - rect.left, cy0 = e.clientY - rect.top;
        doShoot(e); fireWeapon(cx0, cy0);
        let fireRate = currentWeapon === LMG_WEAPON ? lmgFireRateMs
                        : currentWeapon === BRADLEY_WEAPON ? BRADLEY_FIRE_RATE_MS
                        : currentWeapon === FTDRONE_WEAPON ? 80
                        : currentWeapon === PKM_WEAPON ? pkmFireRateMs
                        : currentWeapon === AK12_WEAPON ? ak12FireRateMs
                        : m16FireRateMs;
        if (hasSkill('berserker') && shooterHp < 20) fireRate = Math.max(30, Math.floor(fireRate * 0.6));
        m16FireInterval = setInterval(() => {
          if (!m16Shooting) { stopM16Fire(); return; }
          doShoot(null);
          // Hitscan at tracked cursor with weapon dispersion
          fireWeapon(lastCursorX, lastCursorY);
        }, fireRate);
      }
    });

    // ── M-16 / LMG mouseup → stop auto fire
    $(document).on('mouseup.game', function () {
      if ((currentWeapon === M16_WEAPON && m16Auto) || currentWeapon === LMG_WEAPON ||
          currentWeapon === PKM_WEAPON || currentWeapon === AK12_WEAPON ||
          currentWeapon === BRADLEY_WEAPON || currentWeapon === FTDRONE_WEAPON) stopM16Fire();
    });

    // ── Reload key R / Space  |  ESC → open inventory  |  1-8 → direct weapon switch
    $(document).on('keydown.game', function (e) {
      if ((e.which === 82 || e.which === 32) && !gamePaused && gameActive) { e.preventDefault(); if (ammo < getAmmoMax()) reload(); }
      if (e.which === 27) { e.preventDefault(); $pauseGameTrigger.trigger('click'); }
      if (e.which === 77) { mutedSounds = !mutedSounds; shooterSpeech(mutedSounds ? '🔇 Muted' : '🔊 Unmuted'); }
      if (e.which === 80 && !e.ctrlKey && !gamePaused && gameActive) { e.preventDefault(); $pauseGameTrigger.trigger('click'); }
      // Q key → quick-swap to previous weapon
      if (e.which === 81 && !gamePaused && gameActive && _prevWeapon !== currentWeapon) {
        var _pw = _prevWeapon; switchToWeapon(_pw);
      }
      // Number keys 1-8 → switch to Nth unlocked weapon (no Shift)
      if (e.which >= 49 && e.which <= 56 && !e.shiftKey && !gamePaused && gameActive) {
        var idx = e.which - 49;
        var wl = getUnlockedWeapons();
        if (idx < wl.length) switchToWeapon(wl[idx]);
      }
      // Shift+1–7 → call-in strikes (arty, drones, himars, bradley, rover, firedrone, fpv)
      if (e.shiftKey && e.which >= 49 && e.which <= 55 && !gamePaused && gameActive) {
        e.preventDefault();
        var _ciKeys = [callInArtillery, callInDrones, callInHIMARs, callInBradley, callInRover, callInFiredrone, callInFpvDrone];
        _ciKeys[e.which - 49]();
      }
      // Tab → quick stats overlay (hold to view)
      if (e.which === 9 && !gamePaused && gameActive) {
        e.preventDefault();
        if (!$canves.find('.quick-stats-overlay').length) {
          var _qAcc = shooterShotsFired > 0 ? Math.round(shooterShotsHit / shooterShotsFired * 100) : 0;
          var _qElapsed = _waveStartMs ? Date.now() - _waveStartMs : 0;
          var _qM = Math.floor(_qElapsed / 60000);
          var _qS = Math.floor((_qElapsed % 60000) / 1000);
          var $qs = $('<div class="quick-stats-overlay">'
            + '<div class="qs-title">📊 QUICK STATS</div>'
            + '<div class="qs-grid">'
            + '<span>🌊 Wave</span><span>' + wave + '</span>'
            + '<span>💀 Kills</span><span>' + zombieKilled + '</span>'
            + '<span>🎯 Accuracy</span><span>' + _qAcc + '%</span>'
            + '<span>☠ Headshots</span><span>' + _headshots + '</span>'
            + '<span>🔥 Best Combo</span><span>' + _bestCombo + 'x</span>'
            + '<span>💥 HS Streak</span><span>' + _bestHsStreak + 'x</span>'
            + '<span>⏱ Wave Time</span><span>' + _qM + ':' + (_qS < 10 ? '0' : '') + _qS + '</span>'
            + '<span>💢 Dmg Dealt</span><span>' + totalDmgDealt.toLocaleString() + '</span>'
            + '<span>⭐ Score</span><span>' + score.toLocaleString() + '</span>'
            + '</div></div>');
          $canves.append($qs);
          requestAnimationFrame(function(){ $qs.addClass('qs--in'); });
        }
      }
    });

    // ── Tab keyup → dismiss quick stats overlay
    $(document).on('keyup.game', function (e) {
      if (e.which === 9) { $canves.find('.quick-stats-overlay').remove(); }
    });

    // ── Mouse wheel → cycle through unlocked weapons
    $canves.on('wheel.game', function (e) {
      e.preventDefault();
      if (gamePaused || !gameActive) return;
      const list = getUnlockedWeapons();
      if (list.length <= 1) return;
      const cur = list.indexOf(currentWeapon);
      const nxt = (cur + (e.originalEvent.deltaY > 0 ? 1 : -1) + list.length) % list.length;
      switchToWeapon(list[nxt]);
    });

    $reloadHintSpinner.off('click').on('click', function () {
      reload(); return false;
    });
    // Full center-prompt overlay is also clickable
    $canves.find('.reload-center-prompt').off('click.rcp').on('click.rcp', function () {
      reload(); return false;
    });

    // ── Right-click anywhere on canvas to reload
    $canves.on('contextmenu.game', function (e) {
      e.preventDefault();
      if (ammo < getAmmoMax()) reload();
      return false;
    });

    // ── Floating reload FAB (tap on mobile, click on desktop)
    $('#reload-fab').off('click.reload').on('click.reload', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (ammo < getAmmoMax()) reload();
    });

    // ── Fire FAB (near crosshair — fires at last known cursor position)
    $('#fire-fab').off('click.fire').on('click.fire', function (e) {
      e.preventDefault(); e.stopPropagation();
      var $c = $('#game-crosshair');
      var cx = parseFloat($c.css('left')) || ($('#canves').width() / 2);
      var cy = parseFloat($c.css('top'))  || ($('#canves').height() / 2);
      var rect = $('#canves')[0].getBoundingClientRect();
      doShoot({ clientX: rect.left + cx, clientY: rect.top + cy, stopPropagation: function(){}, preventDefault: function(){} });
      fireWeapon(cx, cy);  // ← apply damage at crosshair position
    });

    // ── Jukebox mini widget controls ──────────────────────────────
    function _jbUpdateUI() {
      if (!window.ARC_JUKEBOX) return;
      var isPlaying = ARC_JUKEBOX.isPlaying();
      $('#jb-toggle').text(isPlaying ? '⏸' : '▶');
      var track = ARC_JUKEBOX.currentTrack();
      $('#jb-track-name').text(track ? track.title : 'Jukebox');
    }
    $('#jb-toggle').off('click.jb').on('click.jb', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.toggle(); setTimeout(_jbUpdateUI, 100); }
    });
    $('#jb-next').off('click.jb').on('click.jb', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.next(); setTimeout(_jbUpdateUI, 300); }
    });
    $('#jb-prev').off('click.jb').on('click.jb', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.prev(); setTimeout(_jbUpdateUI, 300); }
    });
    // Update track name periodically (guard against stacking on re-calls)
    if (window._jbUpdateTimer) clearInterval(window._jbUpdateTimer);
    window._jbUpdateTimer = setInterval(_jbUpdateUI, 3000);

    // ── Shotgun drop
    $canves.on('click.game', '.shotgun-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (shotgunUnlocked) { $(this).remove(); return false; }
      equipShotgun();
      return false;
    });

    // ── M-16 drop
    $canves.on('click.game', '.m16-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (m16Unlocked) { $(this).remove(); return false; }
      equipM16();
      return false;
    });

    // ── LMG drop
    $canves.on('click.game', '.lmg-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (lmgUnlocked) { $(this).remove(); return false; }
      equipLMG();
      return false;
    });

    // ── Grenade launcher drop
    $canves.on('click.game', '.gl-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (glUnlocked) { $(this).remove(); return false; }
      equipGL();
      return false;
    });

    // ── Clay Ball Thrower drop
    $canves.on('click.game', '.clay-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (clayUnlocked) { $(this).remove(); return false; }
      equipClay();
      return false;
    });

    // ── Auto-Kill gift drop
    $canves.on('click.game', '.autokill-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      $(this).remove();
      activateAutoKill();
      return false;
    });

    // ── Sniper Rifle drop
    $canves.on('click.game', '.sniper-drop', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (sniperUnlocked) { $(this).remove(); return false; }
      equipSniper();
      return false;
    });

    // ── Zombie hit (direct click — the player actually aimed at this zombie)
    $canves.on('click.game', '.zombie', function (e) {
      if (wave <= 4 && zombieKilled >= ALL_ZOMBIES) return false;  // cap during story waves only
      if (ammo === 0) { doShoot(e); return false; }

      const $this  = $(this);
      if ($this.hasClass('killed') || $this.css('pointer-events') === 'none') return false;

      const zRect     = this.getBoundingClientRect();
      const cRect     = $canves[0].getBoundingClientRect();
      const relY      = e.clientY - zRect.top;
      const isHeadshot = relY < zRect.height * 0.25;
      if (isHeadshot) _headshots++;
      const cx = e.clientX - cRect.left;
      const cy = e.clientY - cRect.top;
      doHitMarker(cx, cy, isHeadshot);
      doShoot(e); // FX + ammo

      if (currentWeapon === GL_WEAPON) {
        // GL: area damage via fireWeapon
        fireWeapon(cx, cy);
        return false;
      }

      const wp = WEAPONS[currentWeapon] || WEAPONS.revolver;
      // For shotgun: first pellet is a guaranteed direct hit; rest spread across scene
      applyZombieDmg($this, isHeadshot ? 999 : wp.dmg, cx, cy, isHeadshot);
      if (wp.pellets > 1) {
        // Fire remaining pellets as scene-wide hitscan
        for (let i = 1; i < wp.pellets; i++) fireProjectile(cx, cy, currentWeapon);
      }
      return false;
    });
  } // end setHandlers

  function checkWeaponDrops() {
    if (zombieKilled === SHOTGUN_UNLOCK_KILLS) createShotgunDrop();
    if (zombieKilled === SNIPER_UNLOCK_KILLS)  createSniperDrop();
    if (zombieKilled === M16_UNLOCK_KILLS)     createM16Drop();
    if (zombieKilled === LMG_UNLOCK_KILLS)     createLMGDrop();
    if (zombieKilled === CLAY_UNLOCK_KILLS)    createClayDrop();
    if (zombieKilled === GL_UNLOCK_KILLS)      createGLDrop();
    // Post-arsenal periodic supply crate drops every 40 kills
    if (zombieKilled >= 50 && zombieKilled % 40 === 0 &&
        shotgunUnlocked && m16Unlocked && lmgUnlocked) {
      _maybeSpawnCrate();
    }
  }

  // ── Static controls (always on) ───────────────────────────────
  $muteMusic.on('click', function () {
    $(this).toggleClass('muted');
    if (!mutedMusic) {
      stopAllAudio();
      mutedMusic = true;
      if (_musicGain) _musicGain.gain.value = 0;
    } else {
      mutedMusic = false;
      _applyVolumes();
      startMusic();
    }
  });

  $muteSounds.on('click', function () {
    $(this).toggleClass('muted');
    mutedSounds = !mutedSounds;
    if (masterGain) {
      const savedVol = parseFloat(localStorage.getItem('arc_sfx_vol') || '0.85');
      masterGain.gain.value = mutedSounds ? 0 : savedVol;
    }
  });

  // (Hide background button removed)

  // ── Settings Panel ──────────────────────────────────────
  function _openSettings() {
    const $modal = $('#settings-modal');
    const sfxVol = parseFloat(localStorage.getItem('arc_sfx_vol') || '0.85');
    const musVol = parseFloat(localStorage.getItem('arc_music_vol') || '0.38');
    const ambVol = parseFloat(localStorage.getItem('arc_amb_vol') || '0.60');
    $modal.find('#set-sfx-slider').val(Math.round(sfxVol * 100));
    $modal.find('#set-mus-slider').val(Math.round(musVol * 100));
    $modal.find('#set-amb-slider').val(Math.round(ambVol * 100));
    $modal.find('#set-sfx-val').text(Math.round(sfxVol * 100) + '%');
    $modal.find('#set-mus-val').text(Math.round(musVol * 100) + '%');
    $modal.find('#set-amb-val').text(Math.round(ambVol * 100) + '%');
    $modal.addClass('open');
  }

  $('#settings-btn').on('click', _openSettings);
  $(document).on('click', '#settings-close-btn', function() {
    $('#settings-modal').removeClass('open');
  });
  $(document).on('input', '#set-sfx-slider', function() {
    const v = parseInt($(this).val(), 10) / 100;
    localStorage.setItem('arc_sfx_vol', String(v));
    $('#set-sfx-val').text(Math.round(v * 100) + '%');
    if (masterGain && !mutedSounds) masterGain.gain.value = v;
  });
  $(document).on('input', '#set-mus-slider', function() {
    const v = parseInt($(this).val(), 10) / 100;
    localStorage.setItem('arc_music_vol', String(v));
    $('#set-mus-val').text(Math.round(v * 100) + '%');
    if (_musicGain && !mutedMusic) _musicGain.gain.value = v;
  });
  $(document).on('click', '#settings-modal', function(e) {
    if (e.target === this) $(this).removeClass('open');
  });

  // ── Settings tab switching ──────────────────────────────
  $(document).on('click', '.sett-tab', function() {
    const tab = $(this).data('tab');
    $('.sett-tab').removeClass('active');
    $(this).addClass('active');
    $('.sett-tab-body').hide();
    $('.sett-tab-body[data-tab="' + tab + '"]').show();
  });

  // ── Ambient volume control ──────────────────────────────
  $(document).on('input', '#set-amb-slider', function() {
    const v = parseInt($(this).val(), 10) / 100;
    localStorage.setItem('arc_amb_vol', String(v));
    $('#set-amb-val').text(Math.round(v * 100) + '%');
    if (_ambGain) _ambGain.gain.value = v;
  });

  // ── UI Theme & Accent Color ────────────────────────────────
  const _UI_THEMES = {
    default: { bg:'#060E05', panel:'#0d1a0a', border:'#1a3a12', text:'#c8e6c2', accent:'#77dd77' },
    ukraine: { bg:'#002855', panel:'#003d80', border:'#005BBB', text:'#fffde0', accent:'#FFD500' },
    blood:   { bg:'#1a0000', panel:'#2a0000', border:'#5c0000', text:'#ffcccc', accent:'#ff2222' },
    cyber:   { bg:'#0a0a2e', panel:'#12124a', border:'#1e1e6e', text:'#c0f0ff', accent:'#00f0ff' },
    gold:    { bg:'#1a1400', panel:'#2a2200', border:'#4a3c00', text:'#fff8dc', accent:'#ffd700' },
    arctic:  { bg:'#0a1929', panel:'#112240', border:'#1e3a5f', text:'#e0f7fa', accent:'#4fc3f7' },
  };

  function _applyTheme(name) {
    const t = _UI_THEMES[name] || _UI_THEMES.default;
    const r = document.documentElement.style;
    r.setProperty('--ui-bg',     t.bg);
    r.setProperty('--ui-panel',  t.panel);
    r.setProperty('--ui-border', t.border);
    r.setProperty('--ui-text',   t.text);
    r.setProperty('--ui-accent', t.accent);
    document.body.setAttribute('data-theme', name);
    localStorage.setItem('arc_ui_theme', name);
    $('#set-accent-color').val(t.accent);
    $('#theme-picker .theme-swatch').removeClass('active');
    $('#theme-picker .theme-swatch[data-theme="' + name + '"]').addClass('active');
  }

  function _applyAccent(hex) {
    document.documentElement.style.setProperty('--ui-accent', hex);
    localStorage.setItem('arc_ui_accent', hex);
  }

  // Init on load
  const _savedTheme = localStorage.getItem('arc_ui_theme') || 'default';
  _applyTheme(_savedTheme);
  const _savedAccent = localStorage.getItem('arc_ui_accent');
  if (_savedAccent) _applyAccent(_savedAccent);

  $(document).on('click', '.theme-swatch', function() {
    _applyTheme($(this).data('theme'));
  });
  $(document).on('input', '#set-accent-color', function() {
    _applyAccent($(this).val());
  });

  // ── Reduced Motion toggle ─────────────────────────────────
  $(document).on('change', '#set-reduced-motion', function() {
    var on = $(this).prop('checked');
    window._reducedMotion = on;
    localStorage.setItem('arc_reduced_motion', on ? '1' : '0');
  });
  // Screen shake toggle
  $(document).on('change', '#set-screen-shake', function() {
    var on = $(this).prop('checked');
    window._shakeEnabled = on;
    localStorage.setItem('arc_screen_shake', on ? '1' : '0');
  });
  // FPS counter toggle
  $(document).on('change', '#set-fps-counter', function() {
    var on = $(this).prop('checked');
    window._fpsEnabled = on;
    localStorage.setItem('arc_fps_counter', on ? '1' : '0');
    $('#fps-counter').toggle(on);
    if (on && !window._fpsRafRunning) _startFpsCounter();
  });
  $(document).on('change', '#set-accuracy-hud', function() {
    var on = $(this).prop('checked');
    window._accHudEnabled = on;
    localStorage.setItem('arc_accuracy_hud', on ? '1' : '0');
    $('#accuracy-hud').toggle(on);
  });
  // Restore on settings open
  var _origOpenSettings = _openSettings;
  _openSettings = function() {
    _origOpenSettings();
    $('#set-reduced-motion').prop('checked', !!window._reducedMotion);
    $('#set-screen-shake').prop('checked', window._shakeEnabled !== false);
    $('#set-fps-counter').prop('checked', !!window._fpsEnabled);
    $('#set-accuracy-hud').prop('checked', !!window._accHudEnabled);
  };

  const _FALLBACK_JOKES = [
    "Putin asked his general: 'How many soldiers do we have?' General: 'Enough for 3 days.' Putin: 'Good. Plan for 3 years.' 🇺🇦",
    "Russia's strategy: send 300,000 troops to 'liberate' a country that keeps shooting them back. Ukraine calls this target practice. 🎯",
    "Putin ordered GPS banned in Russia. His army still can't find Ukraine on a map anyway. 🗺️",
    "A Russian tank broke down in a Ukrainian field. The farmer offered a tow. The tank crew accepted. The farmer kept the tank. 🚜",
    "Putin says his army will take Kyiv in 72 hours. That was 1,400 days ago. Must be metric hours. 🇺🇦",
    "Russia tried to capture Hostomel Airport. The Ukrainian defenders said: 'Нет, дякую.' And that was that. 💪",
    "The 'mighty' Moskva flagship called Ukraine for directions. Ukraine gave them. Straight to the bottom of the Black Sea. 🚢",
    "Putin banned sunflowers. They remind him what his soldiers are growing in Ukrainian soil. 🌻",
    "Update: Russian forces have captured… the same field they captured yesterday. And last week. 🔄",
    "The Tractor Army has more confirmed tank kills than half of NATO. Respect. 🚜💥",
  ];
  let _tickerJokes   = [];
  let _tickerRunning = false;
  let _tickerTimerId = null;

  function _initJokeTicker() {
    const $inner = $('#joke-ticker-inner');
    if (!$inner.length) return;

    function _runTicker(jokes) {
      if (_tickerRunning || !jokes.length) return;
      _tickerRunning = true;
      let idx = Math.floor(Math.random() * jokes.length);
      function _nextJoke() {
        const txt = jokes[idx % jokes.length];
        idx = (idx + 1) % jokes.length;
        $inner.text('😂 ' + txt + '\u2003\u2003⚡\u2003\u2003');
        const trackW = $('#joke-ticker-track').outerWidth() || 600;
        const textW  = $inner[0].scrollWidth || 800;
        const totalPx = trackW + textW;
        const speed   = 80; // px per second
        const dur     = Math.round(totalPx / speed * 1000);
        $inner.css({ transform: 'translateY(-50%) translateX(' + trackW + 'px)', transition: 'none' });
        requestAnimationFrame(function() {
          $inner.css({ transition: 'transform ' + dur + 'ms linear', transform: 'translateY(-50%) translateX(-' + textW + 'px)' });
        });
        _tickerTimerId = setTimeout(_nextJoke, dur + 600);
      }
      _nextJoke();
    }

    // Try to load from backend; fall back to built-in jokes
    fetch(_API_BASE + '/api/jokes/ticker')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        const serverJokes = (d.jokes || []).map(function(j) { return j.text || j.joke || String(j); });
        _tickerJokes = serverJokes.length >= 3
          ? serverJokes.concat(_FALLBACK_JOKES)
          : _FALLBACK_JOKES.concat(serverJokes);
        _tickerJokes.sort(function() { return Math.random() - 0.5; });
        _runTicker(_tickerJokes);
      })
      .catch(function() {
        _tickerJokes = _FALLBACK_JOKES.slice().sort(function() { return Math.random() - 0.5; });
        _runTicker(_tickerJokes);
      });
  }

  // ── Joke Ticker init ─────────────────────────────────────
  setTimeout(_initJokeTicker, 2000); // start after game loads

  // ── Joke ticker submit button (small "+ Submit" pill on ticker) ──────
  $(document).on('click', '#joke-ticker-submit-btn', function() {
    $('#joke-submit-modal').addClass('open');
    $('#joke-submit-text').val('').trigger('input').focus();
    $('#joke-submit-msg').hide();
  });
  $(document).on('input', '#joke-submit-text', function() {
    $('#joke-char-count').text($(this).val().length);
  });
  $(document).on('click', '#joke-modal-close-btn, #joke-submit-modal', function(e) {
    if (e.target === this) $('#joke-submit-modal').removeClass('open');
  });
  $(document).on('click', '#joke-submit-send-btn', function() {
    const txt = $('#joke-submit-text').val().trim();
    const uname = localStorage.getItem('arc_username') || 'Anonymous';
    if (txt.length < 10) {
      $('#joke-submit-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-err').text('\u26a0\ufe0f Joke is too short (min 10 chars).');
      return;
    }
    $(this).prop('disabled', true).text('Sending\u2026');
    fetch(_API_BASE + '/api/jokes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joke: txt, username: uname })
    }).then(function(r){ return r.json(); })
      .then(function(d) {
        $('#joke-submit-send-btn').prop('disabled', false).text('\uD83D\uDE80 Submit Joke');
        if (d.ok) {
          $('#joke-submit-msg').show().removeClass('joke-msg-err').addClass('joke-msg-ok').text('\u2705 ' + d.message);
          $('#joke-submit-text').val('');
          $('#joke-char-count').text('0');
          setTimeout(function(){ $('#joke-submit-modal').removeClass('open'); }, 2600);
        } else {
          $('#joke-submit-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-err').text('\u26a0\ufe0f ' + (d.error || 'Error submitting'));
        }
      }).catch(function() {
        $('#joke-submit-send-btn').prop('disabled', false).text('\uD83D\uDE80 Submit Joke');
        // Save locally if backend unreachable
        let saved; try { saved = JSON.parse(localStorage.getItem('arc_pending_jokes')||'[]'); } catch(e) { saved = []; }
        saved.push({ txt: txt, ts: Date.now() });
        localStorage.setItem('arc_pending_jokes', JSON.stringify(saved.slice(-10)));
        $('#joke-submit-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-ok').text('\u2705 Saved locally \u2014 will upload when server is connected.');
        setTimeout(function(){ $('#joke-submit-modal').removeClass('open'); }, 2200);
      });
  });

  // ── Joke submit from earn section (inside inventory) ──────────
  $(document).on('input', '#earn-joke-text', function() {
    $('#earn-joke-charcount').text($(this).val().length);
  });
  $(document).on('click', '#earn-joke-submit-btn', function() {
    const txt = $('#earn-joke-text').val().trim();
    const uname = localStorage.getItem('arc_username') || 'Anonymous';
    if (txt.length < 10) {
      $('#earn-joke-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-err').text('\u26a0\ufe0f Too short! Make it at least 10 characters.');
      return;
    }
    $(this).prop('disabled', true).text('Submitting\u2026');
    fetch(_API_BASE + '/api/jokes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joke: txt, username: uname })
    }).then(function(r){ return r.json(); })
      .then(function(d) {
        $('#earn-joke-submit-btn').prop('disabled', false).text('\uD83D\uDE80 Submit Joke (+3 ARC on approval)');
        if (d.ok) {
          $('#earn-joke-msg').show().removeClass('joke-msg-err').addClass('joke-msg-ok').text('\u2705 ' + d.message);
          $('#earn-joke-text').val('');
          $('#earn-joke-charcount').text('0');
        } else {
          $('#earn-joke-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-err').text('\u26a0\ufe0f ' + (d.error || 'Failed'));
        }
      }).catch(function() {
        $('#earn-joke-submit-btn').prop('disabled', false).text('\uD83D\uDE80 Submit Joke (+3 ARC on approval)');
        let saved; try { saved = JSON.parse(localStorage.getItem('arc_pending_jokes')||'[]'); } catch(e) { saved = []; }
        saved.push({ txt: txt, ts: Date.now() });
        localStorage.setItem('arc_pending_jokes', JSON.stringify(saved.slice(-10)));
        $('#earn-joke-msg').show().removeClass('joke-msg-ok').addClass('joke-msg-ok').text('\u2705 Saved locally \u2014 will upload when server is online.');
      });
  });

  // ── Level jump buttons ────────────────────────────────────────
  $('#level-jump-btns').on('click', '.lvl-btn', function () {
    const w = parseInt($(this).data('wave'), 10);
    jumpToWave(w);
  });

  $godMode.on('click', function () {
    godMode = !godMode;
    $(this).toggleClass('enabled', godMode);
    $canves.toggleClass('god-mode-on', godMode);  // show/hide level-jump-btns
    if (godMode) {
      // ── Unlock all weapons ──────────────────────────────────────
      shotgunUnlocked = true;
      m16Unlocked     = true;
      lmgUnlocked     = true;
      glUnlocked      = true;
      sniperUnlocked  = true;
      // Mark drop slots as spawned so duplicates don't appear
      shotgunDropSpawned = true;
      m16DropSpawned     = true;
      lmgDropSpawned     = true;
      glDropSpawned      = true;
      sniperDropSpawned  = true;
      clayDropSpawned    = true;
      clayUnlocked       = true;
      // NFT weapons also unlocked in god mode
      ftdroneUnlocked  = true;
      tankUnlocked     = true;
      bradleyUnlocked  = true;
      // Max out skill XP → unlock all tiers
      if (shooterXP < 2000) { shooterXP = 2000; checkSkillState(); }

      // ── Apply every weapon upgrade (addons) ─────────────────────
      Object.keys(WEAPON_UPGRADES).forEach(wname => {
        (WEAPON_UPGRADES[wname] || []).forEach((upg, idx) => {
          const key = `${wname}_${idx}`;
          if (!weaponUpgradesBought[key]) {
            weaponUpgradesBought[key] = true;
            upg.apply();
          }
        });
      });

      // ── Max out ammo reserves ───────────────────────────────────
      Object.keys(ammoReserve).forEach(k => { ammoReserve[k] = 9999; });

      // ── Reset all call-in cooldowns ────────────────────────────────
      Object.keys(_ciCdEnd).forEach(k => { _ciCdEnd[k] = 0; });

      // ── God-mode bonus: 1 000 000 money + 1 000 ARC ─────────────
      credits = 1000000;
      arcoins = 1000;
      localStorage.setItem('arc_balance', String(arcoins));
      updateScoreHUD();

      if (ammo === 0) reload();
      renderAmmoUI();
      renderWeaponHands();
      renderWeaponSwitcher(); // show all newly unlocked weapons in HUD
      buildInventory(); // always refresh armory to show all upgrades as owned/free
      // ── Fix: re-bind CI button handlers so reinforcements fire on first click
      if (gameActive && !gamePaused) { setHandlers(); _ciStart(); }
    }
  });

  $pauseGameTrigger.on('click', function () {
    if (!gamePaused) {
      $(this).addClass('paused');
      $canves.addClass('game-paused');
      // Track jukebox state so we can resume on unpause
      if (window.ARC_JUKEBOX) ARC_JUKEBOX._wasPaused = typeof ARC_JUKEBOX.isPlaying === 'function' && ARC_JUKEBOX.isPlaying();
      stopAllAudio();
      stopAllDroneBuzzes();  // explicitly kill drone oscillators that bypass stopAllAudio
      $('body').off('keydown.game');
      $(document).off('keydown.game');
      $canves.off('.game');
      $(document).off('mouseup.game');
      stopM16Fire();
      // Mute all audio including oscillators (drone buzz etc)
      if (masterGain) masterGain.gain.setValueAtTime(0, getACtx().currentTime);
      gamePaused = true;
      pauseZombieTracking = true;  // B154: freeze zombie RAF loop
      showPauseFact(); // show random Ukrainian defender fact
      // Open inventory / armory — scroll to top on open
      _invLastSection = 'inv-sec-arc';  // B177: first section so buildInventory RAF scrolls to top
      buildInventory();
      $('#inventory-panel').addClass('open');
      // B177: scrollTop after buildInventory's RAF finishes
      requestAnimationFrame(() => { requestAnimationFrame(() => { $('#inventory-panel').scrollTop(0); }); });
      $canves.addClass('inv-open');
      $('#jukebox-mini').hide();  // B190e: belt-and-suspenders hide HUD jukebox
    } else {
      $(this).removeClass('paused');
      $canves.removeClass('game-paused');
      $('#inventory-panel').removeClass('open');
      $canves.removeClass('inv-open');
      $('#jukebox-mini').show();  // B190e: restore HUD jukebox
      $('#pause-fact-box').removeClass('visible');
      $(document).off('keydown.inv');
      // Restore audio
      if (masterGain) masterGain.gain.setValueAtTime(mutedSounds ? 0 : 1, getACtx().currentTime);
      // Resume music / jukebox that was playing before pause (don't pick random track)
      if (!mutedMusic) {
        if (window.ARC_JUKEBOX && typeof ARC_JUKEBOX.resume === 'function') {
          ARC_JUKEBOX.resume();
        } else {
          startMusic();
        }
      }
      setHandlers();
      gamePaused = false;
      // B154: resume zombie RAF loop
      pauseZombieTracking = false;
      if (!zombieTrackRunning) { zombieTrackRunning = true; trackZombies(); }
    }
  });

  // ── Weather / Environmental FX ───────────────────────────────────────────
  let rainActive = false, rainInterval = null, weatherTimer = null;

  function sndThunder() {
    const ac = getACtx(), t = ac.currentTime;
    const dur = Math.floor(ac.sampleRate * 1.8);
    const buf = ac.createBuffer(1, dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < dur; i++) {
      const prog = i / dur;
      const env = prog < 0.08 ? prog / 0.08 : Math.exp(-(prog - 0.08) * 4.5);
      d[i] = (Math.random() * 2 - 1) * env * 0.85;
    }
    const src  = ac.createBufferSource(); src.buffer = buf;
    const low  = ac.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 170;
    const gain = ac.createGain(); gain.gain.setValueAtTime(1.6, t);
    src.connect(low); low.connect(gain); gain.connect(getMaster());
    src.start(t + 0.55);
  }

  function triggerLightningFlash() {
    const $fl = $('<div class="lightning-flash"></div>');
    $canves.append($fl);
    setTimeout(() => $fl.remove(), 220);
  }

  function triggerLightning() {
    sndThunder();
    triggerLightningFlash();
    const boltX = getRandom(80, 820), boltH = getRandom(180, 420);
    const $bolt = $('<div class="lightning-bolt"></div>').css({ left: boltX + 'px', height: boltH + 'px' });
    $canves.append($bolt);
    setTimeout(() => $bolt.remove(), 300);
    if (getRandom(1, 2) === 1) setTimeout(() => triggerLightningFlash(), getRandom(350, 900));
  }

  function startRain() {
    if (rainActive) return;
    rainActive = true;
    $canves.addClass('raining');
    const $env = $('#env-layer');
    rainInterval = setInterval(() => {
      if (!rainActive) return;
      // B180: Cap rain DOM nodes to prevent FPS drops on low-end devices
      if ($env.find('.rain-drop').length >= 80) return;
      const $drop = $('<div class="rain-drop"></div>').css({
        left: getRandom(0, 940) + 'px',
        animationDuration: getRandom(380, 700) + 'ms',
      });
      $env.append($drop);
      const rx = parseInt($drop.css('left')) || 0;
      setTimeout(() => {
        $drop.remove();
        const $rip = $('<div class="rain-ripple"></div>').css({ left: rx + 'px', bottom: '62px' });
        $env.append($rip);
        setTimeout(() => $rip.remove(), 400);
      }, 740);
    }, 28);
  }

  function stopRain() {
    rainActive = false;
    $canves.removeClass('raining');
    if (rainInterval) { clearInterval(rainInterval); rainInterval = null; }
  }

  // ── Snow / blizzard effect ─────────────────────────────────────
  let snowActive = false, snowInterval = null;

  function startSnow() {
    if (snowActive) return;
    snowActive = true;
    $canves.addClass('snowing');
    const $env = $('#env-layer');
    snowInterval = setInterval(() => {
      if (!snowActive) return;
      // B180: Cap snow DOM nodes to prevent FPS drops on low-end devices
      if ($env.find('.snow-flake').length >= 60) return;
      const sz    = 2 + Math.random() * 5;
      const dur   = 2200 + Math.random() * 2800;    // fall duration ms
      const drift = (Math.random() - 0.5) * 90;     // horizontal drift
      const $flk  = $('<div class="snow-flake"></div>').css({
        left:              getRandom(0, 950) + 'px',
        width:             sz + 'px',
        height:            sz + 'px',
        '--drift':         drift + 'px',
        animationDuration: dur + 'ms',
        opacity:           0.55 + Math.random() * 0.45,
      });
      $env.append($flk);
      setTimeout(() => $flk.remove(), dur + 80);
    }, 40);
  }

  function stopSnow() {
    snowActive = false;
    $canves.removeClass('snowing');
    if (snowInterval) { clearInterval(snowInterval); snowInterval = null; }
  }

  function triggerSmoke() {
    const $env = $('#env-layer');
    const cx = getRandom(60, 880), cy = getRandom(220, 460);
    for (let i = 0; i < getRandom(4, 7); i++) {
      setTimeout(() => {
        const drift = getRandom(-50, 50);
        const sz    = getRandom(30, 60);
        const $p = $('<div class="smoke-puff"></div>').css({
          left: cx + getRandom(-25, 25) + 'px',
          top:  cy + getRandom(-15, 15) + 'px',
          width: sz + 'px', height: sz + 'px',
          '--drift': drift + 'px',
        });
        $env.append($p);
        setTimeout(() => $p.remove(), 3200);
      }, i * 180);
    }
  }

  function scheduleWeather() {
    if (weatherTimer) clearTimeout(weatherTimer);
    weatherTimer = setTimeout(() => {
      if (!gamePaused && wave > 0) {
        const roll = getRandom(1, 12);
        if (roll <= 3)      { startRain(); setTimeout(stopRain, getRandom(5000, 11000)); }
        else if (roll <= 5) { startSnow(); setTimeout(stopSnow, getRandom(7000, 14000)); }
        else if (roll <= 8) { triggerLightning(); if (getRandom(1,2)===1) setTimeout(triggerLightning, getRandom(600,1800)); }
        else                { triggerSmoke(); }
      }
      scheduleWeather();
    }, getRandom(10000, 22000));
  }

  // ── Reset ─────────────────────────────────────────────────────
  function resetGame() {
    zombieKilled = 0; wave = 0;
    currentWeapon = REVOLVER_WEAPON;
    newWeapons.clear();
    $('#inv-shortcut-label').removeClass('inv-has-new');
    shotgunDropSpawned = false; shotgunUnlocked = false;
    m16DropSpawned = false; m16Unlocked = false;
    ammo = REVOLVER_AMMO_MAX;
    // Reset reserve ammo to starting values
    ammoReserve.revolver = 3; ammoReserve.shotgun = 3;
    ammoReserve.m16 = 2; ammoReserve.lmg = 2; ammoReserve.gl = 2; ammoReserve.sniper = 2;
    life = 3;
    // godMode intentionally NOT reset here — persists across wave transitions
    // It is only reset in endGame() _doRestart (NEW GAME button)
    m16Auto = true;
    $m16ModeLabel.text('AUTO');
    $m16Toggle.addClass('hidden');
    $killedTitle.html(0);
    $('#mute-music').removeClass('muted');
    $('#mute-sounds').removeClass('muted');
    stopAllAudio();
    _stopAmbient();
    stopM16Fire();
    $(document).off('mouseup.game');
    $('.zombie').remove();
    _liveZ = [];
    stopRain();
    if (weatherTimer) { clearTimeout(weatherTimer); weatherTimer = null; }
    if (_cloudTimer) { clearInterval(_cloudTimer); _cloudTimer = null; }
    $('#env-layer').empty();
    $canves.find('.bullet-trace, .hit-marker, .lightning-flash, .lightning-bolt, .thunder-pulse').remove();
    lmgDropSpawned = false; lmgUnlocked = false;
    glDropSpawned  = false; glUnlocked  = false;
    sniperDropSpawned = false; sniperUnlocked = false;
    clayDropSpawned = false; clayUnlocked = false;
    ftdroneUnlocked = false; tankUnlocked = false; bradleyUnlocked = false;
    // ── Reset weapon stats, upgrades, ammo bonuses ─────────────────
    Object.keys(WEAPONS_BASE).forEach(k => { if (WEAPONS[k]) Object.assign(WEAPONS[k], WEAPONS_BASE[k]); });
    Object.keys(weaponAmmoBonus).forEach(k => { weaponAmmoBonus[k] = 0; });
    Object.keys(weaponUpgradesBought).forEach(k => { delete weaponUpgradesBought[k]; });
    Object.keys(weaponFlags).forEach(k => { delete weaponFlags[k]; });
    ammoReserve.clay = 4;
    m16FireRateMs = 80;
    // ── Reset skill / XP system ──────────────────────────────────
    shooterXP = 0; shooterShotsFired = 0; shooterShotsHit = 0;
    consecutiveMisses = 0; _skillUnlocks = [];
    _bestCombo = 0; _headshots = 0; _hsStreak = 0; _bestHsStreak = 0; _gameStartMs = 0; _bpLastToast = 0;
    _sessionDmgTaken = 0; _waveDmgTaken = 0; _waveStartMs = 0; _sessionArcEarned = 0; _arcEarnTimestamps = []; totalDmgDealt = 0; _weaponKills = {};
    _comboKills = 0; _comboMultiLive = 1.0; if (_comboTimer) { clearTimeout(_comboTimer); _comboTimer = null; }
    _bossAlive = false;
    $('#kill-feed').remove();
    trucksOnScreen = 0; stopTruckSpawner();
    clearRuins(); stopDrones(); _ciStop();
    Object.keys(_ciCdEnd).forEach(k => { _ciCdEnd[k] = 0; });
    if (window._solAutoHealInt) { clearInterval(window._solAutoHealInt); window._solAutoHealInt = null; }
    window._solXp2x = false; window._solExplosive = false;
    stopTankSpawner(); stopSnow(); tankHintShown = false; _autoSwitchPending = false;
    $canves.find('.tank-target').remove();
    shooterHp = 100; updateShooterHpBar();
    gameActive = false;
    gamePaused = false;
    pauseZombieTracking = false;  // B159: ensure zombie loop can restart
    // B190: Clear wave-tracking state to prevent stale intervals bleeding across games
    _waveSpawned = 0; _waveTarget = 0;
    if (window._waveCheckTimer) { clearInterval(window._waveCheckTimer); window._waveCheckTimer = null; }
    // Keep God Mode UI state in sync across resets so wave jump buttons remain available.
    $godMode.toggleClass('enabled', godMode);
    $canves.toggleClass('god-mode-on', godMode);
    $pauseGameTrigger.removeClass('paused');
    $canves.removeClass('game-paused');   // B159: remove pause overlay so game is playable
    $('#inventory-panel').removeClass('open');
    $canves.removeClass('inv-open');
    $(document).off('keydown.inv');
    $('#shooter-speech').removeClass('visible critical');
    $canves.find('.shotgun-drop, .m16-drop, .lmg-drop, .clay-drop, .gl-drop, .sniper-drop, .truck-target, .battle-report, .share-score-btn, .supply-crate, .go-weapon-picker').remove();
    renderAmmoUI();
    renderWeaponHands(); // reset to revolver
    renderWeaponSwitcher();
  }

  // ── Jump directly to any wave (QA / debug) ─────────────────────────────
  function jumpToWave(targetWave) {
    // Tear down any running game loop
    if (gameActive || waveTransitioning) {
      gameActive          = false;
      pauseZombieTracking = true;
      zombieTrackRunning  = false;
      waveTransitioning   = false;
      $('body').off('keydown.game');
      $canves.off('.game');
      $(document).off('mouseup.game');
      stopM16Fire();
      stopTruckSpawner();
      stopDrones();
      _ciStop();
      stopTankSpawner();
    }
    // Wipe enemies + screen overlays
    $('.zombie, .truck-target, .tank-target').remove();
    $canves.removeClass('game-over end-game level-message');

    // Full state reset (handles ammo, weapons, HP etc.)
    resetGame();

    // Position wave cursor so startWave's wave++ lands on targetWave
    wave = targetWave - 1;

    // Set zombieKilled so calcWave() transitions correctly after this wave ends
    const waveOffsets = [
      0,
      0,
      WAVE_1_ZOMBIE_QTY,
      WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY,
      WAVE_1_ZOMBIE_QTY + WAVE_2_ZOMBIE_QTY + WAVE_3_ZOMBIE_QTY,
    ];
    zombieKilled = waveOffsets[targetWave] || 0;

    // Highlight the active wave button
    $('.lvl-btn').removeClass('active');
    $(`.lvl-btn[data-wave="${targetWave}"]`).addClass('active');

    currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
    gameActive = true;
    if (!mutedMusic) startMusic();
    scheduleWeather();

    const freqs = [0, WAVE_1_ZOMBIE_FRQ, WAVE_2_ZOMBIE_FRQ, WAVE_3_ZOMBIE_FRQ, WAVE_4_ZOMBIE_FRQ];
    const qtys  = [0, WAVE_1_ZOMBIE_QTY, WAVE_2_ZOMBIE_QTY, WAVE_3_ZOMBIE_QTY, WAVE_4_ZOMBIE_QTY];
    startWave(freqs[targetWave], qtys[targetWave]);
  }

  // ── Vision blur after drone concussion ─────────────────────
  let vblurClearTimer = null;
  function triggerVisionBlur() {
    const $vb = $('#vision-blur-overlay');
    $vb.removeClass('clearing').addClass('active');
    clearTimeout(vblurClearTimer);
    // Hold 500ms (half-second vision impairment) then fade out over 0.5s
    vblurClearTimer = setTimeout(() => {
      $vb.removeClass('active').addClass('clearing');
      setTimeout(() => $vb.removeClass('clearing'), 500);
    }, 500);
  }

  // ── Ukraine war live news feed ────────────────────────────────────────────
  const _UA_NEWS_SOURCES = {
    kyiv:      { label: 'Kyiv Independent', rss: 'https://kyivindependent.com/feed/',          color: '#f5a623' },
    ukrinform: { label: 'Ukrinform',        rss: 'https://www.ukrinform.net/rss/block-war',    color: '#005bbc' },
    reuters:   { label: 'Reuters World',    rss: 'https://feeds.reuters.com/reuters/worldNews', color: '#ff8000' },
  };
  let _uaNewsCache  = {};
  let _uaNewsCurSrc = 'kyiv';

  function _intensityBadge(title, desc) {
    const text = (title + ' ' + (desc || '')).toLowerCase();
    const hi = /missile|rockets?|strike|struck|killed|dead|deaths?|airstrike|airstr|bomb|artillery|explosion|shelling|destroyed|casualt|airstrik|attack/;
    const md = /battle|front|offensive|captured|liberat|troops|forces|fighting|clash|advance|retreat|drone/;
    if (hi.test(text)) return '<span class="inv-news-dot inv-news-dot--red" title="High intensity">\u{1F534}</span>';
    if (md.test(text)) return '<span class="inv-news-dot inv-news-dot--yel" title="Active front">\u{1F7E1}</span>';
    return '<span class="inv-news-dot inv-news-dot--wht" title="Update">\u26AA</span>';
  }

  function _newsAge(date) {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function _renderUANews(items, srcKey, ts) {
    const $list = $('#ua-news-list');
    const $ts   = $('#ua-news-ts');
    if (!$list.length) return;
    const src     = _UA_NEWS_SOURCES[srcKey];
    const timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $ts.text('Updated ' + timeStr);
    let html = '';
    items.forEach(item => {
      const title = (item.title || '').replace(/</g, '&lt;');
      const link  = item.link || item.guid || '#';
      const safeLink = /^https?:\/\//i.test(link) ? link : '#';
      const age   = item.pubDate ? _newsAge(new Date(item.pubDate)) : '';
      const badge = _intensityBadge(item.title, item.description);
      html += `<a class="inv-news-item" href="${safeLink}" target="_blank" rel="noopener noreferrer">`
        + `<div class="inv-news-item-top">${badge}<span class="inv-news-source" style="--src-clr:${src.color}">${src.label}</span><span class="inv-news-age">${age}</span></div>`
        + `<div class="inv-news-title">${title}</div></a>`;
    });
    $list.html(html || '<div class="inv-news-err">No items found.</div>');
    $list.find('.inv-news-item').each(function(i) {
      const $el = $(this).css({ opacity: 0, transform: 'translateY(8px)' });
      setTimeout(() => $el.css({ transition: 'opacity .22s ease, transform .22s ease', opacity: 1, transform: 'translateY(0)' }), i * 50);
    });
  }

  function _loadUANews(srcKey, force) {
    srcKey = srcKey || _uaNewsCurSrc;
    _uaNewsCurSrc = srcKey;
    const $list = $('#ua-news-list');
    const $ts   = $('#ua-news-ts');
    if (!$list.length) return;
    $('#inventory-panel .inv-news-src-btn').removeClass('active')
      .filter(`[data-src="${srcKey}"]`).addClass('active');
    const cached = _uaNewsCache[srcKey];
    if (!force && cached && (Date.now() - cached.ts < 5 * 60 * 1000)) {
      _renderUANews(cached.items, srcKey, cached.ts);
      return;
    }
    $list.html('<div class="inv-news-spin"><span class="inv-news-spin-dot"></span> Loading headlines…</div>');
    $ts.text('');
    const src = _UA_NEWS_SOURCES[srcKey];
    // rss2json.com: free, reliable, CORS-safe RSS-to-JSON converter
    const api = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(src.rss) + '&count=12';
    fetch(api)
      .then(r => r.json())
      .then(data => {
        if (data.status !== 'ok' || !data.items || !data.items.length) throw new Error('no items');
        const items = data.items.map(el => ({
          title:       el.title       || '',
          link:        el.link        || el.guid || '#',
          pubDate:     el.pubDate     || '',
          description: el.description || '',
        }));
        _uaNewsCache[srcKey] = { items, ts: Date.now() };
        _renderUANews(items, srcKey, Date.now());
      })
      .catch(() => {
        // Fallback: try allorigins CORS proxy with XML parsing
        const fallbackApi = 'https://api.allorigins.win/get?url=' + encodeURIComponent(src.rss);
        fetch(fallbackApi)
          .then(r => r.json())
          .then(data => {
            const xml = data.contents || '';
            if (!xml) throw new Error('empty');
            const doc   = new DOMParser().parseFromString(xml, 'text/xml');
            const nodes = [...doc.querySelectorAll('item')].slice(0, 12);
            if (!nodes.length) throw new Error('no items');
            const items = nodes.map(el => ({
              title:       el.querySelector('title')?.textContent || '',
              link:        el.querySelector('link')?.textContent || el.querySelector('guid')?.textContent || '#',
              pubDate:     el.querySelector('pubDate')?.textContent || '',
              description: el.querySelector('description')?.textContent || '',
            }));
            _uaNewsCache[srcKey] = { items, ts: Date.now() };
            _renderUANews(items, srcKey, Date.now());
          })
          .catch(() => {
            $list.html('<div class="inv-news-err">⚠️ Could not load headlines — check internet connection or try another source.</div>');
            $ts.text('');
          });
      });
  }

  // ── Inventory / Main Menu one-pager ─────────────────────────────
  let _invLastSection = 'inv-sec-armory';

  // openInventory(section) — programmatic open + scroll to section
  function openInventory(section) {
    _invLastSection = section || 'inv-sec-arc';  // B177: set BEFORE build so RAF scrolls correctly
    buildInventory();
    $('#inventory-panel').addClass('open');
    $canves.addClass('inv-open');
    // B177: double-RAF to fire AFTER buildInventory's internal RAF scroll restore
    requestAnimationFrame(() => { requestAnimationFrame(() => {
      const $p = $('#inventory-panel');
      if (section) {
        const el = $p[0].querySelector('#' + section);
        if (el) {
          const navH = $p.find('.inv-topbar').outerHeight(true) || 0;
          $p[0].scrollTo({ top: el.offsetTop - navH + 4, behavior: 'smooth' });
          $p.find('.inv-nav-btn').removeClass('active');
          const $btn = $p.find('.inv-nav-btn[data-target="' + section + '"]').addClass('active');
          if ($btn[0]) $btn[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        $p.scrollTop(0);
      }
    }); });
  }
  window.openInventory = openInventory;

  // ── Global Escape key — close topmost overlay ──────────────────────
  $(document).on('keydown.globalEsc', function(e) {
    if (e.key !== 'Escape') return;
    // Priority: arc-upsell > starter-pack > death-upsell > inventory > settings
    if ($('.arc-upsell-modal:visible').length) { $('.arc-upsell-modal').remove(); return; }
    if ($('#starter-pack:visible').length) { $('#starter-pack').hide(); localStorage.setItem('arc_starter_dismissed','1'); return; }
    if ($('#death-upsell:visible').length) { return; /* don't dismiss death upsell with Escape — must choose */ }
    if ($('#inventory-panel').hasClass('open')) { $('#inventory-panel').removeClass('open'); $canves.removeClass('inv-open'); $(document).off('keydown.inv'); return; }
    if ($('#settings-overlay:visible').length) { $('#settings-overlay').hide(); return; }
  });

  function _escHtml(s){return typeof s==='string'?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):s;}
  var _BAD_WORDS=['fuck','shit','cunt','nigger','nigga','bitch','asshole','cock','dick','pussy','whore','slut','faggot','retard','kike','spic','chink','gook','piss','bastard','motherfucker','wanker','twat','arse','bollocks','fag','dyke','tranny'];
  function profanityFilter(str){if(!str||typeof str!=='string')return str;var lo=str.toLowerCase();for(var i=0;i<_BAD_WORDS.length;i++){var re=new RegExp(_BAD_WORDS[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');if(re.test(str))return null;}return str.trim();}
  function proceduralPortrait(name,size){size=size||120;var seed=name.split('').reduce(function(a,c){return(a*31+c.charCodeAt(0))&0xFFFF;},7);function rng(){seed=(seed*1664525+1013904223)&0xFFFF;return seed/0xFFFF;}var h1=Math.floor(rng()*360),h2=(h1+80+Math.floor(rng()*80))%360,h3=(h1+180)%360;var skinL=60+Math.floor(rng()*20),hairH=Math.floor(rng()*360),eyeH=(h1+120)%360,shirtH=Math.floor(rng()*360);var hasHelmet=rng()>0.4,hasMedal=rng()>0.5;var s='<svg width="'+size+'" height="'+size+'" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="pbg" cx="50%" cy="40%"><stop offset="0%" stop-color="hsl('+h1+',40%,25%)"/><stop offset="100%" stop-color="hsl('+h2+',35%,10%)"/></radialGradient></defs><rect width="120" height="120" rx="12" fill="url(#pbg)"/><path d="M20 110 Q35 85 45 78 Q60 73 75 78 Q85 85 100 110 Z" fill="hsl('+shirtH+',30%,30%)"/><ellipse cx="35" cy="58" rx="4" ry="6" fill="hsl('+h3+',18%,'+skinL+'%)"/><ellipse cx="85" cy="58" rx="4" ry="6" fill="hsl('+h3+',18%,'+skinL+'%)"/><ellipse cx="60" cy="58" rx="25" ry="28" fill="hsl('+h3+',20%,'+skinL+'%)"/>'+(hasHelmet?'<ellipse cx="60" cy="35" rx="27" ry="16" fill="hsl(60,50%,45%)" opacity=".9"/>':'<ellipse cx="60" cy="36" rx="26" ry="15" fill="hsl('+hairH+',40%,25%)"/>')+'<ellipse cx="51" cy="54" rx="4" ry="3" fill="hsl('+eyeH+',60%,50%)"/><ellipse cx="69" cy="54" rx="4" ry="3" fill="hsl('+eyeH+',60%,50%)"/><circle cx="51" cy="54" r="1.5" fill="#111"/><circle cx="69" cy="54" r="1.5" fill="#111"/><path d="M60 56 Q58 63 56 66 Q60 68 64 66 Q62 63 60 56" fill="hsl('+h3+',15%,'+(skinL-8)+'%)" opacity=".6"/><path d="M53 70 Q60 74 67 70" stroke="hsl('+hairH+',30%,35%)" stroke-width="1.5" fill="none" stroke-linecap="round"/>'+(hasMedal?'<circle cx="60" cy="88" r="6" fill="hsl(50,90%,55%)" stroke="hsl(50,60%,35%)" stroke-width="1"/><text x="60" y="91" text-anchor="middle" font-size="7" fill="hsl(50,50%,25%)">★</text>':'')+'</svg>';return s;}

  function buildInventory() {
   try {
    const $p = $('#inventory-panel');
    const weaponLabels = {
      revolver: '🔫 ' + t('wpRevolver'),
      shotgun:  '💥 ' + t('wpShotgun'),
      m16:      '🔫 ' + t('wpM16'),
      lmg:      '🔫 ' + t('wpLmg'),
      clay:     '🟤 ' + t('wpClay'),
      gl:       '💣 ' + t('wpGl'),
      sniper:   '🎯 ' + t('wpSniper'),
      stugna:   '🚀 ' + t('wpStugna'),
      drone_bomb: '💣 ' + t('wpDroneBomb'),
      panzerfaust: '🚀 ' + t('wpPanzerfaust'),
      pkm:      '🔫 ' + t('wpPkm'),
      ak12:     '🔫 ' + t('wpAk12'),
      matador:  '🚀 ' + t('wpMatador'),
    };
    const weapons    = ['revolver', 'shotgun', 'm16', 'lmg', 'clay', 'gl', 'sniper', 'stugna', 'drone_bomb', 'panzerfaust', 'pkm', 'ak12', 'matador'];
    const unlocked   = w =>
      godMode ||
      w === 'revolver'  ||
      (w === 'shotgun'  && shotgunUnlocked) ||
      (w === 'm16'      && m16Unlocked)     ||
      (w === 'lmg'      && lmgUnlocked)     ||
      (w === 'clay'     && clayUnlocked)    ||
      (w === 'gl'       && glUnlocked)      ||
      (w === 'sniper'   && sniperUnlocked)  ||
      (w === 'ak12'     && zombieKilled >= AK12_UNLOCK_KILLS)        ||
      (w === 'pkm'      && zombieKilled >= PKM_UNLOCK_KILLS)         ||
      (w === 'drone_bomb' && zombieKilled >= DRONE_BOMB_UNLOCK_KILLS) ||
      (w === 'panzerfaust' && zombieKilled >= PANZERFAUST_UNLOCK_KILLS) ||
      (w === 'stugna'   && zombieKilled >= STUGNA_UNLOCK_KILLS)      ||
      (w === 'matador'  && zombieKilled >= MATADOR_UNLOCK_KILLS);

    // Stat bar max values for normalization
    const _maxDmg   = Math.max.apply(null, weapons.map(function(w){ return (WEAPONS[w]||{}).dmg||1; }));
    const _maxSprd  = Math.max.apply(null, weapons.map(function(w){ return (WEAPONS[w]||{}).spread||1; }));
    const _maxBlast = Math.max.apply(null, weapons.map(function(w){ return (WEAPONS[w]||{}).splashR||1; }));
    function _statBar(label, val, max, color) {
      var pct = Math.round(Math.min(val / max, 1) * 100);
      return '<div class="inv-stat-row"><span class="inv-stat-lbl">' + label + '</span><div class="inv-stat-track"><div class="inv-stat-fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="inv-stat-val">' + val + '</span></div>';
    }
    function _weaponStatBars(wname) {
      var wp = WEAPONS[wname]; if (!wp) return '';
      var h = '<div class="inv-stat-bars">';
      h += _statBar('DMG', wp.dmg * (wp.pellets || 1), _maxDmg * 3, '#f44');
      h += _statBar('SPR', wp.spread, _maxSprd, '#4af');
      if (wp.splashR > 0) h += _statBar('BLAST', wp.splashR, _maxBlast, '#fa4');
      h += '</div>';
      return h;
    }

    let rows = '';
    weapons.forEach(wname => {
      const upgs       = WEAPON_UPGRADES[wname] || [];
      const isUnlocked = unlocked(wname);
      const isCurrent  = wname === currentWeapon;
      let upgHtml = '';
      if (isUnlocked) {
        upgs.forEach((upg, idx) => {
          const key      = `${wname}_${idx}`;
          const bought   = !!weaponUpgradesBought[key];
          const canAfford = godMode || credits >= upg.cost;
          const cls = 'inv-upg' +
            (bought       ? ' inv-upg--bought' : '') +
            (!bought && !canAfford ? ' inv-upg--cant' : '') +
            (!bought && godMode ? ' inv-upg--godmode' : '');
          const costLabel = bought ? '\u2713 ' + t('uiOwned') : godMode ? '\u26a1 ' + t('uiFree') : upg.cost + '\u00a0\uD83D\uDCB0';
          upgHtml += `<button class="${cls}" data-weapon="${wname}" data-idx="${idx}" ${bought && !godMode ? 'disabled' : ''}>
            <span class="inv-upg-icon">${upg.icon}</span>
            <span class="inv-upg-name">${upg.name}</span>
            <span class="inv-upg-desc">${upg.desc}</span>
            <span class="inv-upg-cost">${costLabel}</span>
          </button>`;
        });
      } else {
        upgHtml = '<div class="inv-locked-msg">' + t('uiKeepKilling') + '</div>';
      }
      const isNew = isUnlocked && newWeapons.has(wname);
      // Mastery badge for inventory
      const _mTier = _getMasteryTier(wname);
      const _mData = _getMasteryData();
      const _mKills = _mData[wname] || 0;
      const _mNext = _mTier < MASTERY_TIERS.length - 1 ? MASTERY_TIERS[_mTier + 1] : null;
      const _mBadge = _mTier >= 0
        ? ` <span class="inv-mastery-badge">${MASTERY_TIERS[_mTier].icon} ${MASTERY_TIERS[_mTier].label}</span>`
        : '';
      const _mProg = isUnlocked && _mNext
        ? `<div class="inv-mastery-prog"><div class="inv-mastery-fill" style="width:${Math.min(100, Math.round(_mKills / _mNext.kills * 100))}%"></div><span class="inv-mastery-txt">${_mKills}/${_mNext.kills} → ${_mNext.icon} ${_mNext.label}</span></div>`
        : isUnlocked && _mTier === MASTERY_TIERS.length - 1
          ? `<div class="inv-mastery-prog inv-mastery-max"><span class="inv-mastery-txt">🥇 MAX MASTERY (${_mKills} kills)</span></div>`
          : '';
      rows += `<div class="inv-weapon${isUnlocked ? '' : ' inv-weapon--locked'}${isCurrent ? ' inv-weapon--current' : ''}${isNew ? ' inv-weapon--new' : ''}">
        <div class="inv-weapon-name">${isNew ? '<span class="inv-new-badge">\u2605 ' + t('uiNew') + '</span> ' : ''}${weaponLabels[wname]}${_mBadge}${isCurrent ? ' \u25c4 ' + t('uiActive') : ''}${!isUnlocked ? ' \ud83d\udd12 ' + t('uiLocked') : ''}${
          isUnlocked && !isCurrent ? ` <button class="inv-equip-btn${gameActive ? ' inv-equip-btn--hidden' : ''}" data-weapon="${wname}"${gameActive ? ' style="display:none"' : ''}>${t('uiEquip')}</button>` : ''}</div>
        ${isUnlocked ? _weaponStatBars(wname) : ''}
        ${_mProg}
        <div class="inv-upgrades">${upgHtml}</div>
      </div>`;
    });

    // Build ledger HTML (most recent first, max 10 rows)
    const ledgerRows = arcoinLedger.slice().reverse().slice(0, 10).map((tx, idx) => {
      const d = new Date(tx.ts);
      const timeStr = d.toLocaleDateString() + ' ' + d.toTimeString().slice(0, 5);
      const tokenImg = generateARCTokenCanvas(arcoinLedger.length - idx, tx.wave || 1);
      return `<div class="inv-tx-row">
        <span class="inv-tx-col inv-tx-thumb"><img class="arc-token-thumb" src="${tokenImg}" title="${tx.reason}"></span>
        <span class="inv-tx-col inv-tx-time">${timeStr}</span>
        <span class="inv-tx-col inv-tx-reason">${tx.reason}</span>
        <span class="inv-tx-col inv-tx-amount">+${tx.amount} ARC</span>
        <span class="inv-tx-col inv-tx-bal">${tx.balance} ARC</span>
        <span class="inv-tx-col inv-tx-hash">${tx.hash}</span>
      </div>`;
    }).join('');

    $p.html(`
      <div class="inv-onepage-wrap">

      <!-- ─── STICKY TOP BAR ─── -->
      <div class="inv-topbar">
        <div class="inv-topbar-title">⚔️ ${t('topMenu')}</div>
        <div class="inv-topbar-funds">
          <span class="inv-topbar-money">₴ <span id="inv-credits-val">${credits.toLocaleString()}</span></span>
          <span class="inv-topbar-sep">|</span>
          <span class="inv-topbar-arc">🪙 ${arcoins} ARC</span>
        </div>
        <button class="inv-god-toggle-btn${godMode ? ' active' : ''}" id="inv-god-toggle-btn" title="Toggle God Mode">⚡ ${t('topGod')}</button>
        <div class="inv-close-hint">${t('topClose')}</div>
        <button class="inv-close-btn" id="inv-close-btn" title="Close Menu">✕</button>
        <div class="inv-jukebox-inline" id="inv-jukebox-inline">
          <button class="jb-inv-btn" id="jb-inv-prev" title="Previous">⏮</button>
          <button class="jb-inv-btn" id="jb-inv-toggle" title="Play/Pause">▶</button>
          <button class="jb-inv-btn" id="jb-inv-next" title="Next">⏭</button>
          <span class="jb-inv-track" id="jb-inv-track">Jukebox</span>
        </div>
      </div>

      <!-- ─── WALLET HERO BANNER ─── -->
      <div class="inv-wallet-hero">
        <div class="inv-wh-item"><span class="inv-wh-icon">₴</span><span class="inv-wh-val">${credits.toLocaleString()}</span><span class="inv-wh-lbl">${t('whHryvni')}</span></div>
        <div class="inv-wh-sep"></div>
        <div class="inv-wh-item"><span class="inv-wh-icon">🪙</span><span class="inv-wh-val">${arcoins.toLocaleString()}</span><span class="inv-wh-lbl">${t('whArc')}</span></div>
        <div class="inv-wh-sep"></div>
        <div class="inv-wh-item"><span class="inv-wh-icon">🏆</span><span class="inv-wh-val">${(+(localStorage.getItem('arc_max_wave')||0))}</span><span class="inv-wh-lbl">${t('whBestWave')}</span></div>
        <div class="inv-wh-sep"></div>
        <div class="inv-wh-item"><span class="inv-wh-icon">💠</span><span class="inv-wh-val">${(+(localStorage.getItem('arc_total_kills')||0)).toLocaleString()}</span><span class="inv-wh-lbl">${t('whTotalKills')}</span></div>
        <div class="inv-wh-sep"></div>
        <div class="inv-wh-item"><span class="inv-wh-icon">🪖</span><span class="inv-wh-val">${walletAddr ? walletAddr.slice(0,6)+'…'+walletAddr.slice(-4) : '—'}</span><span class="inv-wh-lbl">${t('whWallet')}</span></div>
      </div>

      <!-- ─── FRONT LINE INTEL TICKER (inside inventory) ─── -->
      <div class="inv-ticker-strip" id="inv-ticker-strip">
        <span class="inv-ticker-label">😂 ${t('uiIntel')}:</span>
        <div class="inv-ticker-track">
          <div class="inv-ticker-inner" id="inv-ticker-inner">Loading jokes…</div>
        </div>
        <button class="inv-ticker-submit" id="inv-ticker-submit-btn">+ Submit</button>
      </div>

      <!-- ─── FLOATING STICKY NAV ─── -->
      <nav class="inv-nav" id="inv-nav">
        <button class="inv-nav-btn" data-target="inv-sec-arc">🪙 <span title="Anti-Ruscist Coin">${t('navArc')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-staking">📈 <span>${t('navStaking')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-tokenomics">⚖️ <span>${t('navTokenomics')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-wallet">🦊 <span>${t('navWallet')}</span> <small>${walletAddr ? '🟢' : '🔴'}</small></button>
        <hr class="inv-nav-sep">
        <button class="inv-nav-btn" data-target="inv-sec-earn">🇺🇦 <span>${t('navEarn')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-nfts">🎖️ <span>${t('navHeroes')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-armory">⚔️ <span>${t('navArsenal')}</span> <small>${weapons.filter(unlocked).length}/${weapons.length}</small></button>
        <button class="inv-nav-btn" data-target="inv-sec-ammo">🔋 <span>${t('navAmmo')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-market">🏪 <span>${t('navMarket')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-sell">💰 <span>${t('navSell')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-exchange">🔄 <span>${t('navExchange')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-cosmetics">🎨 <span>${t('navCosmetics')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-skills">🧠 <span>${t('navSkills')}</span></button>
        <hr class="inv-nav-sep">
        <button class="inv-nav-btn" data-target="inv-sec-play21">🃏 <span>${t('nav21')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-naperstki">🫖 <span>${t('navCups')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-teter">🧮 <span>${t('navMath')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-chess">♟️ <span>Chess</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-checkers">⛀ <span>Checkers</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-putinpool">💀 <span>${t('navPool')}</span></button>
        <hr class="inv-nav-sep">
        <button class="inv-nav-btn" data-target="inv-sec-battlepass">🎫 <span>${t('navPass')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-achievements">🏆 <span>${t('navAchieve')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-missions">📋 <span>${t('navMissions')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-stats">📊 <span>${t('navStats')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-prestige">⭐ <span>${t('navPrestige')}</span></button>
        <hr class="inv-nav-sep">
        <button class="inv-nav-btn" data-target="inv-sec-pvp">⚡ <span>${t('navPvp')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-clan">🏰 <span>${t('navClan')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-leaders">🏅 <span>${t('navLeaders')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-season2">🌟 <span>${t('navSeason')}</span></button>
        <hr class="inv-nav-sep">
        <button class="inv-nav-btn" data-target="inv-sec-news">📰 <span>${t('navNews')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-memorial">🕯️ <span>${t('navMemorial')}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-myheroes">🦸 <span>My Heroes</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-uadonate">🇺🇦 <span>UA Donations</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-profile">👤 <span>${t('navProfile') || 'Profile'}</span></button>
        <button class="inv-nav-btn" data-target="inv-sec-admin">🔧 <span>${t('navAdmin')}</span></button>
      </nav>

      <!-- ─── ONE-PAGE SECTIONS ─── -->

      <div class="inv-sections">

        <!-- ╔═══════════════ ARSENAL ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-armory">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">⚔️ ${t('secArsenal')}</h2>
            <p class="inv-sec-sub">${t('secArsenalSub')}</p>
          </div>
          <div class="inv-weapons">${rows}</div>
        </section>

        <!-- ╔═══════════════ AMMO SHOP ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-ammo">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🔋 ${t('secAmmo')}</h2>
            <p class="inv-sec-sub">${t('secAmmoSub')}</p>
          </div>
          <div class="inv-ammo-shop">${(()=>{
            const AMMO_PACKS = {
              revolver: [ { qty:3, cost:60,  label:'+3 mags'  }, { qty:8, cost:140, label:'+8 mags  (save 20₴)' } ],
              shotgun:  [ { qty:3, cost:70,  label:'+3 mags'  }, { qty:8, cost:160, label:'+8 mags  (save 15₴)' } ],
              m16:      [ { qty:2, cost:100, label:'+2 mags'  }, { qty:6, cost:280, label:'+6 mags  (save 20₴)' } ],
              lmg:      [ { qty:2, cost:160, label:'+2 belts' }, { qty:6, cost:460, label:'+6 belts (save 20₴)' } ],
              gl:       [ { qty:2, cost:150, label:'+2 loads' }, { qty:6, cost:430, label:'+6 loads (save 20₴)' } ],
              sniper:   [ { qty:2, cost:120, label:'+2 mags'  }, { qty:6, cost:340, label:'+6 mags  (save 20₴)' } ],
              clay:     [ { qty:3, cost:80,  label:'+3 loads' }, { qty:8, cost:200, label:'+8 loads (save 40₴)' } ],
              stugna:   [ { qty:2, cost:200, label:'+2 loads' }, { qty:6, cost:560, label:'+6 loads (save 40₴)' } ],
              drone_bomb:[ { qty:3, cost:100, label:'+3 bombs' }, { qty:8, cost:240, label:'+8 bombs (save 40₴)' } ],
              panzerfaust:[ { qty:2, cost:180, label:'+2 rounds' }, { qty:6, cost:500, label:'+6 rounds (save 40₴)' } ],
              pkm:      [ { qty:2, cost:150, label:'+2 belts' }, { qty:6, cost:420, label:'+6 belts (save 30₴)' } ],
              ak12:     [ { qty:2, cost:110, label:'+2 mags'  }, { qty:6, cost:300, label:'+6 mags  (save 20₴)' } ],
              matador:  [ { qty:2, cost:190, label:'+2 rounds' }, { qty:6, cost:530, label:'+6 rounds (save 30₴)' } ],
              nlaw:     [ { qty:2, cost:220, label:'+2 rounds' }, { qty:6, cost:620, label:'+6 rounds (save 40₴)' } ],
              laser:    [ { qty:2, cost:250, label:'+2 cells' }, { qty:6, cost:700, label:'+6 cells (save 50₴)' } ],
            };
            const wIcons  = { revolver:'🔫', shotgun:'💥', m16:'🔫', lmg:'⚙️', clay:'🟤', gl:'💣', sniper:'🎯', stugna:'🚀', drone_bomb:'💣', panzerfaust:'🚀', pkm:'🔫', ak12:'🔫', matador:'🚀', nlaw:'🎯', laser:'⚡' };
            let html = '';
            weapons.forEach(wname => {
              if (!unlocked(wname) || !AMMO_PACKS[wname]) return;
              const packs = AMMO_PACKS[wname] || [];
              const res   = ammoReserve[wname] || 0;
              const low   = res <= 1;
              const btns  = packs.map(pk => {
                const ok = credits >= pk.cost;
                return '<button class="inv-ammo-buy-btn' + (ok?'':' inv-upg--cant') + '" data-ammo-weapon="' + wname + '" data-ammo-qty="' + pk.qty + '" data-ammo-cost="' + pk.cost + '"' + (ok?'':' disabled') + '><span class="inv-ammo-pack-label">' + pk.label + '</span><span class="inv-ammo-pack-cost">' + pk.cost + ' ₴</span></button>';
              }).join('');
              html += '<div class="inv-ammo-row"><div class="inv-ammo-row-left"><span class="inv-ammo-wicon">' + wIcons[wname] + '</span><span class="inv-ammo-wname">' + weaponLabels[wname] + '</span><span class="inv-ammo-reserve' + (low?' inv-ammo-reserve--low':'') + '">◉ ' + res + ' mag' + (res!==1?'s':'') + ' left</span></div><div class="inv-ammo-row-btns">' + btns + '</div></div>';
            });
            return html || '<div class="inv-tx-empty">' + t('uiNoAmmo') + '</div>';
          })()}</div>
        </section>

        <!-- ╔═══════════════ EARN ARC ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-earn">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">₴ ${t('secEarn')}</h2>
            <p class="inv-sec-sub">${t('secEarnSub')}</p>
          </div>
          ${(()=>{
            const todayISO  = new Date().toISOString().slice(0,10);
            const spunToday = !godMode && localStorage.getItem('arc_spin_date') === todayISO;
            let countdown = '';
            if (spunToday) {
              const _now = new Date(); const _mid = new Date(_now); _mid.setHours(24,0,0,0);
              const _d = Math.max(0, _mid - _now);
              countdown = Math.floor(_d/3600000)+'h '+Math.floor((_d%3600000)/60000)+'m';
            }
            const _segColors = ['#e63946','#f4a261','#2a9d8f','#e9c46a','#6a4c93','#8338ec'];
            const _segDeg    = 360 / SPIN_PRIZES.length;
            const _conic     = SPIN_PRIZES.map((p,i)=>_segColors[i]+' '+(i*_segDeg)+'deg '+(i*_segDeg+_segDeg)+'deg').join(',');
            const _lblHtml   = SPIN_PRIZES.map((p,i)=>{
              const _ang = (i*_segDeg+_segDeg/2-90)*Math.PI/180;
              const _lx  = (90+65*Math.cos(_ang)).toFixed(1);
              const _ly  = (90+65*Math.sin(_ang)).toFixed(1);
              return '<div class="spin-seg-lbl" style="left:'+_lx+'px;top:'+_ly+'px;transform:translate(-50%,-50%) rotate('+(i*_segDeg+_segDeg/2)+'deg)">'+p.label+'</div>';
            }).join('');
            const _refCode   = localStorage.getItem('arc_ref_code') || 'ARC-???';
            const _refCnt    = parseInt(localStorage.getItem('arc_refs_count')||'0',10);
            // Build a shareable URL — use the canonical game domain if running locally/from file://
            const _gameBase  = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.github.dev'))
              ? 'https://anti-ruscist.com'  // ← canonical production URL
              : window.location.origin + window.location.pathname.replace(/\/+$/, '');
            const _shareUrl  = _gameBase + '?ref=' + _refCode;
            // Streak data for EARN section display
            const _streak    = parseInt(localStorage.getItem('arc_login_streak') || '0', 10);
            var _sbadges; try { _sbadges = JSON.parse(localStorage.getItem('arc_streak_badges') || '[]'); } catch(e) { _sbadges = []; }
            const _smulti    = parseFloat(localStorage.getItem('arc_streak_multi') || '1.0');
            const _streakDots = Array.from({length: 7}, (_,i) => {
              const d = i + 1, done = _streak >= d, cur = _streak === d;
              return '<div class="streak-dot' + (done?' streak-dot--done':'') + (cur?' streak-dot--cur':'') + '">' + d + '</div>';
            }).join('');
            const _stBadgeHtml = _STREAK_BADGES.map(b => {
              const earned = _sbadges.includes(b.id);
              return '<div class="streak-badge' + (earned?' streak-badge--earned':'') + '" title="Day ' + b.days + ' — ' + b.name + ' (+' + Math.round((b.multi-1)*100) + '% ARC bonus)">' +
                b.icon + '<div class="streak-badge-day">Day ' + b.days + '</div>' +
                (earned ? '<div class="streak-badge-check">✓</div>' : '<div class="streak-badge-lock">🔒</div>') + '</div>';
            }).join('');
            const _streakHtml = '<div class="earn-block earn-streak-block">' +
              '<div class="earn-block-hdr"><span class="earn-ico">🔥</span>' +
              '<div><h4 class="earn-blk-title">Login Streak — Day ' + _streak + '</h4>' +
              '<p class="earn-blk-sub">Log in daily. Earn ARC bonuses + permanent earn rate badges. Miss a day = streak resets!</p></div></div>' +
              '<div class="streak-progress-row"><div class="streak-dots">' + _streakDots + '</div>' +
              '<div class="streak-next-lbl">' + (_streak > 0 ? 'Day ' + (_streak+1) + ' tomorrow' : 'Start your streak!') + '</div></div>' +
              '<div class="streak-badges-row">' + _stBadgeHtml + '</div>' +
              '<div class="streak-multi-display">🪙 Your ARC earn rate: <b class="streak-multi-val">' + Math.round(_smulti*100) + '%</b>' +
              (_smulti > 1.0 ? ' <span class="streak-multi-bonus">(+' + Math.round((_smulti-1)*100) + '% streak bonus!)</span>' : '') + '</div>' +
              '</div>';
            const _hsRows    = [1,2,3,4].map(w=>{
              const hs = parseInt(localStorage.getItem('arc_wave_hs_'+w)||'0',10);
              return '<tr><td>Wave '+w+'</td><td>'+(hs?hs.toLocaleString():'—')+'</td><td>'+(hs?'🪙 1 ARC':'—')+'</td></tr>';
            }).join('');
            return _streakHtml
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">🎡</span><div><h4 class="earn-blk-title">Daily Spin</h4><p class="earn-blk-sub">One free spin every 24 h — win Anti-Ruscist Coin (ARC) or Money</p></div></div>'
              +'<div class="spin-center"><div class="spin-wheel-wrap"><div id="spin-wheel" style="background:conic-gradient('+_conic+')">'+_lblHtml+'</div><div class="spin-pointer">▼</div></div></div>'
              +(spunToday?'<div class="spin-done">✅ Already spun — next in '+countdown+'</div>':'<button id="earn-spin-btn" class="earn-btn">🎡 SPIN!</button>')
              +'<div id="spin-result" class="spin-result"></div>'
              +(function(){ var _esc=gcfg('economy','extra_spin_cost',5),_mp=gcfg('economy','max_paid_spins',3),_pd=parseInt(localStorage.getItem('arc_paid_spins_'+new Date().toISOString().slice(0,10))||'0',10); return _pd<_mp ? '<button id="earn-paid-spin-btn" class="earn-btn earn-btn--paid">⚡ Extra Spin — '+_esc+' ARC <span class="paid-spin-count">('+(_mp-_pd)+' left)</span></button>' : '<div class="spin-done">Max extra spins used today</div>'; })()
              +'</div>'
              +(function(){ var _dd = getDailyDeals(); if(!_dd.length) return ''; var _h = '<div class="earn-block earn-block--deals"><div class="earn-block-hdr"><span class="earn-ico">🔥</span><div><h4 class="earn-blk-title">Daily Deals</h4><p class="earn-blk-sub">Rotating discounts — refreshes at midnight!</p></div></div><div class="daily-deals-grid">'; _dd.forEach(function(d){ _h += '<div class="dd-card" data-cosm-id="'+d.id+'" data-price="'+d.salePrice+'"><div class="dd-type">'+d.type+'</div><div class="dd-label">'+d.label+'</div><div class="dd-prices"><s>'+d.price+'</s> <b>'+d.salePrice+' ARC</b></div><button class="dd-buy-btn earn-btn">BUY</button></div>'; }); return _h + '</div></div>'; })()
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">👥</span><div><h4 class="earn-blk-title">Referral Rewards</h4><p class="earn-blk-sub">+2 Anti-Ruscist Coin (ARC) for each friend who joins via your link</p></div></div>'
              +'<div class="earn-ref-code">'+_refCode+'</div>'
              +'<div class="earn-ref-url-wrap"><input class="earn-ref-url-input" id="earn-ref-url-input" type="text" readonly value="'+_shareUrl+'" onclick="this.select()"></div>'
              +'<button id="earn-ref-copy-btn" class="earn-btn" data-url="'+_shareUrl+'">\uD83D\uDCCB Copy Invite Link</button>'
              +'<div class="earn-ref-count">'+_refCnt+' friend'+(_refCnt===1?'':'s')+' referred • +2 ARC each</div></div>'
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">🏆</span><div><h4 class="earn-blk-title">Wave High Scores</h4><p class="earn-blk-sub">Beat your personal best per wave — +1 Anti-Ruscist Coin (ARC) each time</p></div></div>'
              +'<table class="earn-hs-table"><thead><tr><th>Wave</th><th>Best Score</th><th>ARC</th></tr></thead><tbody>'+_hsRows+'</tbody></table></div>'
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">📺</span><div><h4 class="earn-blk-title">Watch &amp; Earn</h4><p class="earn-blk-sub">Complete advertiser offers — they fund your Anti-Ruscist Coin (ARC)</p></div></div>'
              +'<p class="earn-offerwall-p">Watch videos &amp; complete surveys. Advertisers pay for your attention — you earn Anti-Ruscist Coin (ARC) instantly.</p>'
              +'<button id="earn-offerwall-btn" class="earn-btn earn-btn--offerwall">📺 Open Offer Wall</button></div>'
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">😂</span><div><h4 class="earn-blk-title">Submit an Anti-Tyrant Joke</h4><p class="earn-blk-sub">Write a funny anti-Putin / anti-tyrant joke — earn <b style="color:#FFD700">+3 ARC</b> when moderators approve it &amp; it scrolls on-screen!</p></div></div>'
              +'<div class="earn-joke-preview">Your approved joke scrolls across every player\'s screen in the live front-line ticker. 🇺🇦</div>'
              +'<textarea id="earn-joke-text" class="earn-joke-textarea" maxlength="500" placeholder="e.g. Putin ordered troops to take Kyiv in 3 days. His GPS is still rerouting… it\'s been 2 years. 🇺🇦"></textarea>'
              +'<div class="earn-joke-char"><span id="earn-joke-charcount">0</span>/500</div>'
              +'<div id="earn-joke-msg" class="earn-joke-msg" style="display:none"></div>'
              +'<button id="earn-joke-submit-btn" class="earn-btn">🚀 Submit Joke (+3 ARC on approval)</button></div>'
              +'<div class="earn-block"><div class="earn-block-hdr"><span class="earn-ico">💵</span><div><h4 class="earn-blk-title">Send a Donation via CashApp</h4><p class="earn-blk-sub">Support the Anti-Ruscist game with a fiat donation — all donations go toward server costs &amp; UA aid</p></div></div>'
              +'<div class="cashapp-donate-wrap">'
              +'<div class="cashapp-handle">💸 CashApp: <span class="cashapp-tag">$photonbounce</span></div>'
              +'<p class="cashapp-note">Open CashApp on your phone, search <b>$photonbounce</b>, and send any amount. A screenshot sent to our Discord earns you <b style="color:#FFD700">+50 ARC</b> as a thank-you.</p>'
              +'<button class="cashapp-copy-btn earn-btn" id="cashapp-copy-tag">📋 Copy $photonbounce</button>'
              +'</div></div>';
          })()}
        </section>

        <!-- ╔═══════════════ EXCHANGE ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-exchange">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🔄 ${t('secExchange')}</h2>
            <p class="inv-sec-sub">${t('secExchangeSub')}</p>
          </div>

          <!-- ── BUY MONEY WITH POLYGON ── -->
          <div class="buy-crypto-panel">
            <div class="buy-crypto-header exch-block-hdr">
              <span class="buy-crypto-title">💳 Buy In-Game Money with Polygon (POL)</span>
              <button class="exch-info-btn" data-info="crypto" aria-label="How it works">❓</button>
            </div>
            <div class="exch-info-panel" id="exch-info-crypto">
              <b>How it works:</b><br>
              1. Pick a package and click “Pay POL” → MetaMask opens.<br>
              2. Confirm the transaction on Polygon Mainnet.<br>
              3. Once the on-chain tx is verified, the game credits are added instantly.<br>
              4. <span style="color:#FFD700">10% of every purchase</span> is automatically donated to the verified Ukrainian Government wallet.<br>
              <small style="opacity:.6">Requires MetaMask or compatible wallet. Polygon network.</small>
            </div>
            <div class="buy-crypto-sub-row">Instant • Chain-verified • MetaMask required</div>
            <div class="buy-crypto-grid">
              ${CRYPTO_PKGS.map(pkg => `
              <div class="buy-pkg-card">
                <div class="buy-pkg-label">${pkg.label}</div>
                <div class="buy-pkg-money">+${pkg.money.toLocaleString()} ₴</div>
                ${pkg.bonus ? '<div class="buy-pkg-bonus">' + pkg.bonus + '</div>' : '<div class="buy-pkg-bonus">&nbsp;</div>'}
                <button class="buy-pkg-btn" id="buy-pkg-${pkg.id}" data-pkg="${pkg.id}">💳 ${pkg.pol} POL</button>
              </div>`).join('')}
            </div>
            <div class="buy-crypto-note">Payments go directly on-chain to <code style="user-select:all;font-size:11px">${COLLECT_WALLET}</code> on Polygon Mainnet &mdash; 10% auto-donated to Ukraine.</div>
          </div>

          <!-- ── SEPARATOR ── -->
          <div class="exch-separator"><span class="exch-sep-line"></span><span class="exch-sep-label">or convert ARC</span><span class="exch-sep-line"></span></div>
          <!-- ── ARC → MONEY EXCHANGE ── -->
          <div class="inv-exchange-inner">
            <div class="exch-block-hdr" style="margin-bottom:10px">
              <span style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:#FFD700;letter-spacing:1px">🪙 ARC → In-Game Money</span>
              <button class="exch-info-btn" data-info="arc" aria-label="How it works">❓</button>
            </div>
            <div class="exch-info-panel" id="exch-info-arc">
              <b>How it works:</b><br>
              1. You earn Anti-Ruscist Coin (ARC) by clearing waves, daily spins, and referrals.<br>
              2. Click any exchange button to convert ARC → in-game Money at <b style="color:#FFD700">1 ARC = 100 ₴</b>.<br>
              3. Money is used to buy call-in strikes (Artillery, HIMARS, Bradley…) in-game.<br>
              4. <b style="color:#ff8800">⚠️ Irreversible</b> — once exchanged, ARC cannot be recovered. Use the Sell tab to cash out ARC as POL instead.
            </div>
            <div class="inv-exch-hero">
              <div class="inv-exch-hero-rate">1 ARC <span class="inv-exch-arrow">→</span> 100 ₴</div>
              <div class="inv-exch-hero-sub">Exchange your Anti-Ruscist Coin (ARC) for in-game Money</div>
            </div>
            <div class="inv-exch-balrow">
              <div class="inv-exch-bal-card"><div class="inv-exch-bal-lbl">Anti-Ruscist Coin (ARC)</div><div class="inv-exch-bal-val">🪙 ${arcoins}</div></div>
              <div class="inv-exch-bal-card"><div class="inv-exch-bal-lbl">Money Balance</div><div class="inv-exch-bal-val">₴ ${credits.toLocaleString()}</div></div>
            </div>
            <div class="inv-exchange-btns">
              <button class="inv-exch-btn" data-arc="1"  ${arcoins < 1  ? 'disabled' : ''}>1 ARC<br><span>→ 100 ₴</span></button>
              <button class="inv-exch-btn" data-arc="2"  ${arcoins < 2  ? 'disabled' : ''}>2 ARC<br><span>→ 200 ₴</span></button>
              <button class="inv-exch-btn" data-arc="5"  ${arcoins < 5  ? 'disabled' : ''}>5 ARC<br><span>→ 500 ₴</span></button>
              <button class="inv-exch-btn" data-arc="10" ${arcoins < 10 ? 'disabled' : ''}>10 ARC<br><span>→ 1000 ₴</span></button>
              <button class="inv-exch-btn inv-exch-btn--all" data-arc="all" ${arcoins < 1 ? 'disabled' : ''}>ALL<br><span>${arcoins} ARC → ${arcoins * 100} ₴</span></button>
            </div>
            <div class="inv-exchange-warn">⚠️ Exchanged Anti-Ruscist Coin (ARC) is removed from your wallet permanently.</div>
          </div>

          <!-- ── SEPARATOR ── -->
          <div class="exch-separator"><span class="exch-sep-line"></span><span class="exch-sep-label">or buy ARC directly</span><span class="exch-sep-line"></span></div>

          <!-- ── BUY ARC WITH POL ── -->
          <div class="buy-arc-panel">
            <div class="exch-block-hdr" style="margin-bottom:10px">
              <span style="font-family:'Oswald',sans-serif;font-size:14px;font-weight:700;color:#FFD700;letter-spacing:1px">💎 Buy ARC with POL (Pre-Sale)</span>
              <button class="exch-info-btn" data-info="buyarc" aria-label="How it works">❓</button>
            </div>
            <div class="exch-info-panel" id="exch-info-buyarc">
              <b>How it works:</b><br>
              1. Pick a package → MetaMask opens on Polygon Mainnet.<br>
              2. Pay the POL amount shown — ARC is credited to your game wallet instantly.<br>
              3. When ARC launches as a Polygon ERC-20, your balance transfers on-chain automatically.<br>
              4. <span style="color:#FFD700">10% of every purchase</span> is donated to the verified Ukrainian Government wallet.<br>
              <small style="opacity:.6">Pre-sale rate — locked at purchase. No refunds after tx confirmed.</small>
            </div>
            <div class="buy-arc-grid">
              ${ARC_PKGS.map(function(p){
                return '<div class="buy-arc-card">' +
                  '<div class="buy-arc-label">'+p.label+'</div>' +
                  '<div class="buy-arc-amount">+'+p.arc.toLocaleString()+' ARC</div>' +
                  (p.bonus ? '<div class="buy-arc-bonus">'+p.bonus+'</div>' : '<div class="buy-arc-bonus">&nbsp;</div>') +
                  '<button class="buy-arc-btn" data-arc-pkg="'+p.id+'">💎 '+p.pol+' POL</button>' +
                  '</div>';
              }).join('')}
            </div>
            <div class="buy-crypto-note">Payments on-chain to <code style="user-select:all;font-size:11px">${COLLECT_WALLET.slice(0,14)}…</code> on Polygon · 10% 🇺🇦 donated</div>
          </div>

          <!-- ── DONATE TO UKRAINE ── -->
          <div class="inv-donate-block" style="margin:18px 0 8px;padding:16px 18px;background:linear-gradient(135deg,rgba(0,87,184,0.18),rgba(255,215,0,0.10));border:1px solid rgba(255,215,0,0.25);border-radius:8px">
            <div style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;color:#FFD700;letter-spacing:2px;margin-bottom:8px">🇺🇦 DONATE TO UKRAINE</div>
            <p style="font-size:13px;color:rgba(255,255,255,0.75);margin:0 0 12px;line-height:1.5">10% of every in-game purchase is automatically donated. You can also donate directly:</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <a href="https://u24.gov.ua/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:8px 14px;background:rgba(0,87,184,0.35);border:1px solid rgba(0,87,184,0.6);border-radius:6px;color:#fff;font-family:'Oswald',sans-serif;font-size:13px;text-decoration:none;letter-spacing:1px;transition:background .15s" onmouseover="this.style.background='rgba(0,87,184,0.55)'" onmouseout="this.style.background='rgba(0,87,184,0.35)'">🇺🇦 United24</a>
              <a href="https://savelife.in.ua/en/donate-en/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:8px 14px;background:rgba(0,87,184,0.35);border:1px solid rgba(0,87,184,0.6);border-radius:6px;color:#fff;font-family:'Oswald',sans-serif;font-size:13px;text-decoration:none;letter-spacing:1px;transition:background .15s" onmouseover="this.style.background='rgba(0,87,184,0.55)'" onmouseout="this.style.background='rgba(0,87,184,0.35)'">💙 Come Back Alive</a>
              <a href="https://bank.gov.ua/en/about/support-the-armed-forces" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:8px 14px;background:rgba(0,87,184,0.35);border:1px solid rgba(0,87,184,0.6);border-radius:6px;color:#fff;font-family:'Oswald',sans-serif;font-size:13px;text-decoration:none;letter-spacing:1px;transition:background .15s" onmouseover="this.style.background='rgba(0,87,184,0.55)'" onmouseout="this.style.background='rgba(0,87,184,0.35)'">🏦 NBU Army Fund</a>
            </div>
            <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:10px 0 0">Slava Ukraini! 🇺🇦 Every hryvnia counts.</p>
          </div>
        </section>

        <!-- ╔════════ ANTI-RUSCIST COIN LEDGER ════════╗ -->
        <section class="inv-section" id="inv-sec-arc">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🪙 ${t('secArc')}</h2>
            <p class="inv-sec-sub">${t('secArcSub') || 'Play-to-earn · 1 ARC per wave cleared · future Polygon ERC-20'}</p>
          </div>
          <div class="inv-tx-table">
            <div class="inv-tx-head">
              <span class="inv-tx-col">TOKEN</span>
              <span class="inv-tx-col">TIME</span>
              <span class="inv-tx-col">EVENT</span>
              <span class="inv-tx-col">EARNED</span>
              <span class="inv-tx-col">BALANCE</span>
              <span class="inv-tx-col">TX HASH</span>
            </div>
            ${ledgerRows || '<div class="inv-tx-empty">No transactions yet — clear a wave to earn Anti-Ruscist Coin (ARC)!</div>'}
          </div>
          <div class="inv-wallet-footer">
            <span class="inv-polygon-badge">⬡ Powered by <strong>Polygon</strong></span>
            <a class="inv-polygon-link" href="https://polygon.technology" target="_blank">polygon.technology ↗</a>
            <a class="inv-polygon-link" href="https://polygonscan.com" target="_blank">PolygonScan ↗</a>
          </div>
        </section>

        <!-- ╔═══════════════ WALLET ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-wallet">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🦊 ${t('secWallet')}</h2>
            <p class="inv-sec-sub">${t('secWalletSub') || 'Connect MetaMask on Polygon to link your ARC balance on-chain'}</p>
          </div>
          ${walletAddr ? `
          <div class="inv-wallet-connected">
            <div class="wlt-status-row">
              <span class="wlt-chain-badge ${walletChainId === POLYGON_CHAIN_ID ? '' : 'wlt-chain-badge--wrong'}">
                ${walletChainId === POLYGON_CHAIN_ID
                  ? (TESTNET_MODE ? '🟡 Polygon Amoy Testnet — connected' : '🟣 Polygon Mainnet — connected')
                  : '⚠️ Wrong network — switch to ' + (TESTNET_MODE ? 'Polygon Amoy Testnet' : 'Polygon Mainnet')}
              </span>
            </div>
            <div class="wlt-addr-row">
              <span class="wlt-addr-label">Wallet:</span>
              <span class="wlt-addr">${walletAddr.slice(0,10)}…${walletAddr.slice(-6)}</span>
              <a class="wlt-explorer-link" href="https://${POLYGONSCAN_HOST}/address/${walletAddr}" target="_blank">PolygonScan ↗</a>
            </div>
          </div>` : `
          <div class="inv-wallet-cta">
            <div class="inv-wallet-cta-text">
              <strong>🦊 Connect your MetaMask wallet</strong> to link Anti-Ruscist Coin (ARC) earnings to your Polygon address.
              When Anti-Ruscist Coin launches on Polygon, your accumulated balance will be claimable on-chain — no re-earning needed.
            </div>
            <button class="inv-wallet-cta-btn" id="inv-connect-wallet-btn" type="button">
              🦊 Connect MetaMask (Polygon)
            </button>
            <div class="inv-wallet-no-mm">
              No MetaMask? Free — <a href="https://metamask.io/download/" target="_blank">install here ↗</a>
            </div>
          </div>`}
          ${(function(){
            var _cl; try { _cl = JSON.parse(localStorage.getItem('arc_chain_claims') || '[]'); } catch(e) { _cl = []; }
            const _rows = _cl.slice().reverse().map(function(c) {
              return '<div class="chain-claim-row">'
                +'<span class="cc-amt">' + c.amount + ' ARC</span>'
                +'<span class="cc-addr">' + c.addr.slice(0,8) + '...' + c.addr.slice(-5) + '</span>'
                +'<span class="cc-date">' + c.date + '</span>'
                +'<span class="cc-status cc-status--' + c.status + '">' + (c.status === 'pending' ? 'QUEUED' : 'DONE') + '</span>'
                +'</div>';
            }).join('');
            let h = '<div class="chain-claim-block">';
            h += '<div class="chain-claim-title">CLAIM ARC ON-CHAIN</div>';
            if (!walletAddr) {
              h += '<div class="chain-claim-note">Connect MetaMask to link your wallet before claiming.</div>';
              h += '<button class="chain-claim-btn chain-claim-btn--sec" onclick="openInventory(\'inv-sec-wallet\')">Connect Wallet First</button>';
            } else if (arcoins < 1) {
              h += '<div class="chain-claim-note">No ARC balance to claim. Earn more by playing!</div>';
            } else {
              h += '<div class="chain-claim-bal-row"><span class="cc-bal-lbl">Ready to claim:</span><span class="cc-bal-val">' + arcoins + ' ARC</span></div>';
              h += '<button class="chain-claim-btn" onclick="claimArcOnChain()">Sign & Claim ' + arcoins + ' ARC</button>';
              h += '<div class="chain-claim-note">MetaMask will only sign a message — no gas fee. ARC distributes at Token Generation Event.</div>';
            }
            if (_cl.length > 0) {
              h += '<div class="chain-claim-hist-hdr">Claim History</div>' + _rows;
            }
            h += '</div>';
            return h;
          })()}
          <div class="inv-wallet-footer" style="margin-top:14px">
            <span class="inv-polygon-badge">⬡ Powered by <strong>Polygon</strong></span>
            <a class="inv-polygon-link" href="https://polygon.technology" target="_blank">polygon.technology ↗</a>
          </div>
        </section>

        <!-- ╔═══════════════ SELL ARC → POL ═══════════════╗ -->
        ${(function(){
          const _pendingKey  = 'arc_sell_pending';
          const _pendingRaw  = localStorage.getItem(_pendingKey);
          let _pendingList; try { _pendingList = _pendingRaw ? JSON.parse(_pendingRaw) : []; } catch(e) { _pendingList = []; }
          const _ARC_RATE    = 0.012; // 1 ARC ≈ 0.012 POL (illustrative pre-launch rate)
          const _minSell     = 10;
          const _pendingRows = _pendingList.map(function(r){
            return '<div class="sell-pending-row"><span class="sell-pr-amount">'+r.amount+' ARC → '+(r.amount * _ARC_RATE).toFixed(4)+' POL</span>'
              +'<span class="sell-pr-addr">→ '+r.addr.slice(0,8)+'…'+r.addr.slice(-5)+'</span>'
              +'<span class="sell-pr-date">'+r.date+'</span>'
              +'<span class="sell-pr-status sell-status--pending">⏳ Pending</span></div>';
          }).join('');
          return '<section class="inv-section" id="inv-sec-sell">'
            +'<div class="inv-sec-header">'
            +'<h2 class="inv-sec-title">💱 '+t('secSell')+'</h2>'
            +'<p class="inv-sec-sub">'+t('secSellSub')+'</p>'
            +'</div>'
            +'<div class="sell-rate-card">'
            +'<div class="sell-rate-label">Current indicative rate</div>'
            +'<div class="sell-rate-value">1 ARC = '+_ARC_RATE+' POL</div>'
            +'<div class="sell-rate-note">⚠ Pre-launch indicative rate · actual rate set at Token Generation Event</div>'
            +'</div>'
            +'<div class="sell-balance-row">'
            +'<span class="sell-bal-label">Your ARC balance:</span>'
            +'<span class="sell-bal-value">'+arcoins+' ARC</span>'
            +'<span class="sell-bal-pol">≈ '+(arcoins * _ARC_RATE).toFixed(4)+' POL</span>'
            +'</div>'
            +(walletAddr
              ? '<div class="sell-form">'
                +'<label class="sell-form-label" for="sell-arc-amt">Amount to sell (min '+_minSell+' ARC)</label>'
                +'<div class="sell-form-row">'
                +'<input id="sell-arc-amt" class="sell-arc-input" type="number" min="'+_minSell+'" max="'+arcoins+'" step="1" value="'+Math.max(_minSell, arcoins)+'" />'
                +'<span class="sell-arc-unit">ARC</span>'
                +'</div>'
                +'<div class="sell-pol-preview">You receive: <strong id="sell-pol-out">—</strong> POL → '+walletAddr.slice(0,8)+'…'+walletAddr.slice(-5)+'</div>'
                +'<button class="sell-submit-btn" id="sell-submit-btn">📝 Sign Withdrawal Request</button>'
                +'</div>'
              : '<div class="sell-no-wallet">'
                +'<p>🦊 Connect your MetaMask wallet (Wallet tab) to request a withdrawal.</p>'
                +'<button class="inv-wallet-cta-btn" id="sell-connect-wallet-btn">🦊 Connect MetaMask</button>'
                +'</div>')
            +((_pendingList.length > 0)
              ? '<div class="sell-pending-section"><div class="sell-pending-hdr">⏳ Pending Withdrawals</div>'+_pendingRows+'</div>'
              : '')
            +'</section>';
        })()}
        <!-- ╔═══════════════ NFTs ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-nfts">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🇺🇦 ${t('secHeroes')}</h2>
            <p class="inv-sec-sub">Mint commemorative hero cards honouring the defenders of Ukraine — each unique, generated on-chain &middot; 10% of proceeds donated to the Ukrainian Government (👉 <a href="https://polygonscan.com/address/0x165CD37b4C644C2921454429E7F9358d18A45e14" target="_blank" style="color:#6cf">verified Polygon wallet ↗</a>)</p>
          </div>
          <div class="nft-offchain-notice" style="background:rgba(0,87,184,0.12);border:1px solid rgba(0,87,184,0.3);border-radius:8px;padding:12px 16px;margin:0 0 14px;font-size:12px;color:#aac;line-height:1.6">
            <strong style="color:#FFD700">ℹ️ Off-Chain Minting — How It Works</strong><br>
            Your NFTs are minted <b>off-chain</b> (stored locally in your browser) at <b>zero gas fees</b>. This means:<br>
            • <b>No wallet needed</b> to mint — just spend ARC coins<br>
            • NFTs are saved in your browser's localStorage and persist between sessions<br>
            • At Token Generation Event (TGE), all off-chain NFTs can be migrated <b>on-chain</b> to Polygon for free<br>
            • Once on-chain, they'll appear on OpenSea and can be traded/sold<br>
            • Your hero dedications, rarity, and metadata are preserved during migration<br>
            <small style="opacity:0.6">Connect a MetaMask wallet in the Wallet section to be ready for on-chain migration.</small>
          </div>
          ${(()=>{
            const _ownedNfts = JSON.parse(localStorage.getItem('arc_nfts')||'[]');
            const _canMint   = arcoins >= 5;
            const _rarInfo   = [
              {r:'common',    color:'#b0b0b0', stars:'★',       chance:'60%'},
              {r:'rare',      color:'#44aaff', stars:'★★',      chance:'28%'},
              {r:'epic',      color:'#cc44ff', stars:'★★★',     chance:'10%'},
              {r:'legendary', color:'#FFD700', stars:'★★★★',    chance:'2%' },
            ];
            const _mintBlock = '<div class="nft-mint-panel">'
              +'<div class="nft-mint-custom-fields">'
              +'<p class="nft-custom-title">🇺🇦 Dedicate This NFT to a Hero</p>'
              +'<input id="nft-hero-name" class="nft-custom-input" maxlength="60" placeholder="Hero\'s full name (e.g. Viktor Panchenko)" />'
              +'<input id="nft-hero-unit" class="nft-custom-input" maxlength="80" placeholder="Unit / Battalion" />'
              +'<textarea id="nft-hero-bio" class="nft-custom-input nft-custom-bio" maxlength="200" placeholder="Short dedication..." rows="3"></textarea>'
              +'<p class="nft-custom-hint">Optional · stored in NFT metadata · filtered for respect</p>'
              +'</div>'
              +'<div class="nft-mint-cost">'
              +'<span class="nft-mint-price">5 🪙 <abbr title="Anti-Ruscist Coin">ARC</abbr></span>'
              +'<span class="nft-mint-bal">Your balance: '+arcoins+' ARC</span>'
              +'</div>'
              +'<button id="nft-mint-btn" class="nft-mint-btn'+(_canMint?'':' nft-mint-btn--disabled')+'"'+(_canMint?'':' disabled')+'>'
              +(_canMint ? '✨ MINT NFT (5 ARC)' : '🔒 Need 5 ARC to mint')
              +'</button>'
              +'<div class="nft-rarity-table">'
              +_rarInfo.map(ri=>'<span class="nft-rar-row" style="color:'+ri.color+'">'+ri.stars+' '+ri.r.charAt(0).toUpperCase()+ri.r.slice(1)+' <em>'+ri.chance+'</em></span>').join('')
              +'</div>'
              +'<div class="nft-mint-count">'+_ownedNfts.length+' NFT'+(_ownedNfts.length!==1?'s':'')+' owned</div>'
              +'</div>';
            const _rarColor = {common:'#b0b0b0',rare:'#44aaff',epic:'#cc44ff',legendary:'#FFD700'};
            const _p2pAll   = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
            const _grid = _ownedNfts.length === 0
              ? '<div class="nft-empty">No NFTs yet — mint your first one above!</div>'
              : '<div class="inv-nft-grid">'
                + _ownedNfts.slice().reverse().map(nft=>{
                    const rc = _rarColor[nft.rarity]||'#aaa';
                    const _rd = nft.reward;
                    const _rewardBadge = _rd ? (
                      _rd.type==='money'  ? '<div class="nft-reward-badge">\uD83C\uDF81 +'+_rd.value+' \uD83D\uDCB0</div>'
                    : _rd.type==='ammo'   ? '<div class="nft-reward-badge">\uD83C\uDF81 +25 ammo ('+_rd.weapon+')</div>'
                    : _rd.type==='weapon' ? '<div class="nft-reward-badge nft-reward-weapon">\uD83D\uDD13 '+_rd.weapon+'<br><small>+'+_rd.bonus+' \uD83D\uDCB0</small></div>'
                    : _rd.type==='both'   ? '<div class="nft-reward-badge nft-reward-weapon">\uD83D\uDD13 '+_rd.weapon+' +'+_rd.value+' \uD83D\uDCB0</div>'
                    : '') : '';
                    const _scanLink = (NFT_CONTRACT_ADDRESS && nft.tokenId)
                      ? '<a class="nft-scan-link" href="https://'+POLYGONSCAN_HOST+'/token/'+NFT_CONTRACT_ADDRESS+'?a='+nft.tokenId+'" target="_blank">\uD83D\uDD0D PolygonScan \u2197</a>'
                      : (NFT_CONTRACT_ADDRESS
                        ? '<span class="nft-scan-link nft-scan-pending" title="Token ID not yet linked">\uD83D\uDD0D PolygonScan \u2197</span>'
                        : '');
                    const _isNftListed = _p2pAll.some(function(l){ return l.nftId === nft.id; });
                    return '<div class="inv-nft-card nft-card--'+nft.rarity+'" style="--nft-rc:'+rc+'">'
                      +'<img class="nft-canvas-img" src="'+nft.img+'" alt="'+nft.name+'">'
                      +'<div class="inv-nft-name" style="color:'+rc+'">'+nft.name+'</div>'
                      +'<div class="inv-nft-desc" style="color:'+rc+';opacity:.7">'+nft.rarity.toUpperCase()+'</div>'
                      +_rewardBadge
                      +'<div class="inv-nft-footer">Wave '+nft.wave+' \xB7 #'+String(nft.id).slice(-4)+(_scanLink ? '<br>'+_scanLink : '')+'</div>'
                      +(_isNftListed
                        ? '<div class="nft-listed-badge">📤 Listed for Sale</div><button class="nft-delist-btn" data-nid="'+nft.id+'">✕ Delist</button>'
                        : '<button class="nft-list-btn" data-nid="'+nft.id+'" data-name="'+encodeURIComponent(nft.name)+'" data-rarity="'+nft.rarity+'">📤 List for POL</button>')
                      +'</div>';
                  }).join('')
                +'</div>';
            return _mintBlock + _grid;
          })()}
          <div class="inv-wallet-footer" style="margin-top:12px">
            <a class="inv-polygon-link" href="https://polygon.technology" target="_blank">Powered by Polygon ↗</a>
          </div>
          <div class="nft-donate-footer" style="margin-top:16px;padding:14px;background:rgba(0,91,187,.12);border:1px solid rgba(255,215,0,.3);border-radius:10px;text-align:center">
            <div style="font-size:13px;color:#ffe082;margin-bottom:8px">🇺🇦 <strong>10% of all NFT proceeds</strong> donated to the verified Ukrainian Government wallet.</div>
            <div style="font-size:10px;color:rgba(200,230,200,.5);margin-bottom:10px">0x165CD37b4C644C2921454429E7F9358d18A45e14 · <a href="https://etherscan.io/address/0x165CD37b4C644C2921454429E7F9358d18A45e14" target="_blank" style="color:#6cf">verified ↗</a></div>
            <button class="sett-close-btn" id="nft-donate-now-btn" type="button" style="background:linear-gradient(135deg,#005BBB,#0077cc);max-width:260px;margin:0 auto">🇺🇦 Donate to Ukrainian Army</button>
          </div>
        </section>

        <section class="inv-section" id="inv-sec-news">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">\u{1F4F0} ${t('secNews')}</h2>
            <p class="inv-sec-sub">Follow the war from trusted independent Ukrainian &amp; international sources</p>
          </div>
          <div class="inv-news-list" id="ua-news-list">
            <a class="inv-news-src-link" href="https://kyivindependent.com/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#f5a623">📰</span>
              <span class="inv-news-src-info"><strong>Kyiv Independent</strong><small>Ukraine's English-language investigative outlet</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.ukrinform.net/rubric-ato" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#005bbc">🇺🇦</span>
              <span class="inv-news-src-info"><strong>Ukrinform</strong><small>Ukraine's national news agency — war coverage</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.pravda.com.ua/eng/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#cc0000">🔴</span>
              <span class="inv-news-src-info"><strong>Ukrainska Pravda</strong><small>Leading Ukrainian investigative news in English</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.reuters.com/world/europe/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#ff8000">🌍</span>
              <span class="inv-news-src-info"><strong>Reuters — Europe</strong><small>International wire service, front-line reports</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://liveuamap.com/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#4CAF50">🗺️</span>
              <span class="inv-news-src-info"><strong>LiveUA Map</strong><small>Real-time conflict map with verified events</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://deepstatemap.live/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#6741d9">📍</span>
              <span class="inv-news-src-info"><strong>DeepState Map</strong><small>Verified front-line positions updated daily</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.understandingwar.org/" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#1a73e8">📊</span>
              <span class="inv-news-src-info"><strong>ISW — Inst. for the Study of War</strong><small>Daily front-line assessments &amp; analysis</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <div class="inv-news-yt-divider">🎬 Ukrainian YouTube Channels</div>
            <a class="inv-news-src-link" href="https://www.youtube.com/@UNITED24media" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#FFD700">▶</span>
              <span class="inv-news-src-info"><strong>UNITED24</strong><small>Official UA fundraising — drone ops, front-line docs (English)</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.youtube.com/@ButusovPlus" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#e53935">▶</span>
              <span class="inv-news-src-info"><strong>Butusov Plus</strong><small>Investigative war journalist — combat footage &amp; interviews</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.youtube.com/@Militarnyi" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#43a047">▶</span>
              <span class="inv-news-src-info"><strong>Militarnyi</strong><small>Ukrainian military media — weapons, tactics, analysis</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
            <a class="inv-news-src-link" href="https://www.youtube.com/@backandalive" target="_blank" rel="noopener noreferrer">
              <span class="inv-news-src-icon" style="--src-clr:#1e88e5">▶</span>
              <span class="inv-news-src-info"><strong>Come Back Alive</strong><small>UA military charity — equipment, drones, front-line support</small></span>
              <span class="inv-news-src-arrow">→</span>
            </a>
          </div>
        </section>

        <!-- ╔═══════════════ SKILLS ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-skills">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🎯 Skill Tree</h2>
            <p class="inv-sec-sub">EVE-style branched skills &bull; earn XP by killing ruscists &bull; headshots ×3 XP &bull; unlock branches freely</p>
          </div>
          <div class="inv-skill-hud">
            <div class="inv-skill-xp-row">
              <span class="inv-skill-xp-label">XP</span>
              <div class="inv-skill-xp-bar-wrap"><div class="inv-skill-xp-bar" style="width:${Math.min(100, (shooterXP / Math.max(1, (SKILL_TIERS.find(t=>!_skillUnlocks.includes(t.id)) || SKILL_TIERS[SKILL_TIERS.length-1]).xp)) * 100).toFixed(1)}%"></div></div>
              <span class="inv-skill-xp-val">${shooterXP} XP</span>
            </div>
            <div class="inv-skill-stats">
              <span>💥 ${shooterShotsHit} hits</span>
              <span>🔫 ${shooterShotsFired} shots</span>
              <span>🎯 ${shooterShotsFired > 0 ? Math.round(shooterShotsHit / shooterShotsFired * 100) : 0}% accuracy</span>
              <span>⭐ ${_skillUnlocks.length}/${SKILL_TIERS.length} skills</span>
            </div>
          </div>
          <div class="inv-skill-branches">
            ${SKILL_TREE_BRANCHES.map(branch => {
              const skills = SKILL_TIERS.filter(t => t.branch === branch.id);
              return '<div class="inv-skill-branch" style="--branch-color:' + branch.color + '">' +
                '<div class="inv-skill-branch-header">' + branch.label + '</div>' +
                skills.map(t => {
                  const unlocked = _skillUnlocks.includes(t.id);
                  const prereqsMet = t.req.every(r => _skillUnlocks.includes(r));
                  const available = !unlocked && prereqsMet && shooterXP >= t.xp;
                  const pct = t.xp === 0 ? 100 : Math.min(100, Math.round(shooterXP / t.xp * 100));
                  const stateClass = unlocked ? ' skill-state-done' : (available ? ' skill-state-avail' : (prereqsMet ? ' skill-state-locked' : ' skill-state-blocked'));
                  return '<div class="inv-skill-node' + stateClass + '">' +
                    '<span class="inv-skill-icon">' + t.icon + '</span>' +
                    '<div class="inv-skill-info">' +
                      '<span class="inv-skill-name">' + t.name + '</span>' +
                      '<span class="inv-skill-rank inv-skill-rank--' + t.branch + '">' + t.rank + '</span>' +
                      '<span class="inv-skill-desc">' + t.desc + '</span>' +
                      (t.req.length ? '<span class="inv-skill-req">Req: ' + t.req.map(r => { const s = SKILL_TIERS.find(x=>x.id===r); return s ? s.name : r; }).join(', ') + '</span>' : '') +
                    '</div>' +
                    '<div class="inv-skill-status">' +
                      (unlocked ? '<span class="inv-skill-badge inv-skill-badge--earned">✓ ACTIVE</span>' :
                        ('<span class="inv-skill-need">' + t.xp + ' XP</span>' +
                        '<div class="inv-skill-prog-wrap"><div class="inv-skill-prog" style="width:' + pct + '%"></div></div>')) +
                    '</div>' +
                  '</div>';
                }).join('<div class="inv-skill-connector"></div>') +
              '</div>';
            }).join('')}
          </div>
          <div class="inv-skill-p2e-note">₴ <b>Skills multiply your power</b> — each branch gives different combat edge. Unlock multiple branches for synergy bonuses and devastating combos.</div>
          <div class="inv-skill-sol-panel">
            <div class="sol-panel-title">⚡ Premium SOL Upgrades</div>
            <p class="sol-panel-sub">Boost your soldier with crypto — 10% supports the Ukrainian Army 🇺🇦</p>
            <div class="sol-panel-crypto-note" style="background:rgba(0,87,184,0.15);border:1px solid rgba(0,87,184,0.3);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:rgba(255,255,255,0.7)">
              💱 <b>Accepted:</b> SOL · POL/MATIC · ETH · USDC · USDT — all via MetaMask or Phantom wallet
            </div>
            <div class="sol-panel-grid">
              <div class="sol-upgrade-card"><div class="sol-upg-icon">🧠</div><div class="sol-upg-name">2× XP Booster</div><div class="sol-upg-desc">All kills give double XP this session</div><button class="sol-buy-btn" data-sol-id="sol_xp2x" data-sol-price="0.001">Buy 0.001 SOL</button></div>
              <div class="sol-upgrade-card"><div class="sol-upg-icon">💊</div><div class="sol-upg-name">Auto-Heal</div><div class="sol-upg-desc">Regenerate 1 HP/sec while not under fire</div><button class="sol-buy-btn" data-sol-id="sol_autoheal" data-sol-price="0.002">Buy 0.002 SOL</button></div>
              <div class="sol-upgrade-card"><div class="sol-upg-icon">💥</div><div class="sol-upg-name">Explosive Rounds</div><div class="sol-upg-desc">All bullets deal +50% splash damage</div><button class="sol-buy-btn" data-sol-id="sol_explosive" data-sol-price="0.003">Buy 0.003 SOL</button></div>
              <div class="sol-upgrade-card"><div class="sol-upg-icon">📦</div><div class="sol-upg-name">Extended Magazines</div><div class="sol-upg-desc">All weapons get +3 extra magazines this session</div><button class="sol-buy-btn" data-sol-id="sol_extmags" data-sol-price="0.005">Buy 0.005 SOL</button></div>
            </div>
            <p class="sol-donation-note">10% of every crypto purchase donated to <b>Ukrainian Army Fund</b> · <a class="sol-scan-link" href="https://solscan.io/account/2ZTzZvBWCb6TsNZLgK8iHULkREopQBdj3PEb6AgxG89s" target="_blank">UA Army SOL Wallet ↗</a> · <a class="sol-scan-link" href="https://polygonscan.com/address/0x165CD37b4C644C2921454429E7F9358d18A45e14" target="_blank">ETH/POL/USDC Donation ↗</a></p>
          </div>
        </section>

        <!-- ╔═══════════════ MARKET ═══════════════╗ -->
        <!-- ╔═══════════════ MARKET ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-market">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🎪 Market</h2>
            <p class="inv-sec-sub">Official Store · Black Market P2P · Escrow Contracts</p>
          </div>
          <div class="inv-market-tabs">
            <button class="inv-market-tab-btn active" data-mtab="store">🏪 Store</button>
            <button class="inv-market-tab-btn" data-mtab="blackmarket">🕵️ Black Market</button>
            <button class="inv-market-tab-btn" data-mtab="escrow">🔒 Escrow</button>
            <button class="inv-market-tab-btn" data-mtab="p2p">👥 NFT P2P</button>
          </div>

          <!-- STORE TAB -->
          <div class="inv-market-tab" id="inv-mtab-store">
            <div class="inv-market-grid">
              ${[
                { id:'wep_shotgun',  icon:'💥', name:'Shotgun',         arcCost:8,    credCost:600,   solCost:0.0005  },
                { id:'wep_m16',      icon:'🔫', name:'M-16',            arcCost:12,   credCost:1000,  solCost:0.0008  },
                { id:'wep_sniper',   icon:'🎯', name:'Sniper Rifle',    arcCost:18,   credCost:1500,  solCost:0.001   },
                { id:'wep_lmg',      icon:'⚙️', name:'LMG',             arcCost:22,   credCost:2000,  solCost:0.0015  },
                { id:'wep_clay',     icon:'�', name:'Shit Thrower',    arcCost:6,    credCost:800,   solCost:0.0004  },
                { id:'wep_gl',       icon:'💣', name:'Grenade Launcher',arcCost:20,   credCost:1800,  solCost:0.0012  },
                { id:'wep_matador',  icon:'🚀', name:'M4 Matador',      arcCost:30,   credCost:3000,  solCost:0.002   },
                { id:'wep_nlaw',     icon:'🎯', name:'NLAW ATGM',       arcCost:40,   credCost:4000,  solCost:0.003   },
                { id:'ammo500',      icon:'📦', name:'+5 Magazines',    arcCost:3,    credCost:300,   solCost:0.0002  },
                { id:'ammo_bulk',    icon:'🗃️', name:'+15 Magazines',   arcCost:8,    credCost:800,   solCost:0.0005  },
                { id:'cred1000',     icon:'₴',  name:'+1,000 ₴',       arcCost:5,    credCost:null,  solCost:0.0003  },
                { id:'cred5000',     icon:'💵', name:'+5,000 ₴',       arcCost:22,   credCost:null,  solCost:0.001   },
                { id:'arc50',        icon:'🪙', name:'+50 ARC',         arcCost:null, credCost:4000,  solCost:0.0015  },
                { id:'arc200',       icon:'🏆', name:'+200 ARC',        arcCost:null, credCost:14000, solCost:0.005   },
              ].map(item => {
                const arcLabel  = item.arcCost  ? '<span class="inv-market-price arc-price">🪙 ' + item.arcCost + ' ARC</span>' : '';
                const credLabel = item.credCost ? '<span class="inv-market-price cred-price">₴ ' + item.credCost + '</span>' : '';
                const solLabel  = item.solCost  ? '<span class="inv-market-price sol-price">◎ ' + item.solCost + ' SOL</span>' : '';
                return '<div class="inv-market-card">' +
                  '<span class="inv-market-card-icon">' + item.icon + '</span>' +
                  '<span class="inv-market-card-name">' + item.name + '</span>' +
                  '<div class="inv-market-card-prices">' + arcLabel + credLabel + solLabel + '</div>' +
                  '<div class="inv-market-card-btns">' +
                    (item.arcCost  ? '<button class="inv-market-buy-btn" data-item="' + item.id + '" data-currency="arc"  data-cost="' + item.arcCost  + '">Buy 🪙</button>' : '') +
                    (item.credCost ? '<button class="inv-market-buy-btn" data-item="' + item.id + '" data-currency="cred" data-cost="' + item.credCost + '">Buy ₴</button>' : '') +
                    (item.solCost  ? '<button class="inv-market-buy-btn inv-market-sol-btn" data-item="' + item.id + '" data-currency="sol"  data-cost="' + item.solCost + '">Buy ◎</button>' : '') +
                  '</div></div>';
              }).join('')}
            </div>
          </div>

          <!-- BLACK MARKET TAB -->
          <div class="inv-market-tab hidden" id="inv-mtab-blackmarket">
            <div class="bm-header-note">🕵️ <b>Black Market</b> — Player-to-player trades. Sell anything: ammo, weapons, credits, ARC. Escrow protects both parties.</div>
            <div class="bm-create-listing">
              <div class="bm-cl-title">📤 Create Listing</div>
              <div class="bm-cl-form">
                <select class="bm-sel" id="bm-item-type">
                  <option value="credits">₴ Credits</option>
                  <option value="arc">🪙 ARC</option>
                  <option value="ammo">📦 Magazines (+5)</option>
                  <option value="wep_shotgun">💥 Shotgun</option>
                  <option value="wep_m16">🔫 M-16</option>
                  <option value="wep_sniper">🎯 Sniper</option>
                  <option value="wep_lmg">⚙️ LMG</option>
                  <option value="wep_gl">💣 GL</option>
                  <option value="wep_nlaw">🎯 NLAW</option>
                  <option value="wep_matador">🚀 Matador</option>
                </select>
                <input class="bm-inp" id="bm-qty" type="number" min="1" placeholder="Qty / Amount" />
                <select class="bm-sel" id="bm-price-type">
                  <option value="credits">₴ Credits</option>
                  <option value="arc">🪙 ARC</option>
                  <option value="sol">◎ SOL</option>
                </select>
                <input class="bm-inp" id="bm-price" type="number" min="1" placeholder="Price" />
                <button class="bm-post-btn" id="bm-post-listing">📤 Post Listing</button>
              </div>
            </div>
            <div class="bm-listings" id="bm-listings-container">
              <!-- NPC MARKET MAKERS — refresh each session -->
              ${(function(){
                var _npcSellers = [
                  { npc:'🤖 Ivanka', item:'📦 +5 Magazines', price:'3 ARC', id:'npc_ammo5' },
                  { npc:'🤖 Dmytro', item:'💥 Shotgun', price:'7 ARC', id:'npc_shotgun' },
                  { npc:'🤖 Oksana', item:'₴ 500 Credits', price:'2 ARC', id:'npc_cr500' },
                  { npc:'🤖 Serhiy', item:'🔫 M-16', price:'10 ARC', id:'npc_m16' },
                  { npc:'🤖 Olena', item:'📦 +15 Magazines', price:'7 ARC', id:'npc_ammo15' },
                ];
                var _npcBuyers = [
                  { npc:'🤖 Yuriy', wants:'📦 +5 Magazines', pays:'₴ 400', id:'npc_buy_ammo' },
                  { npc:'🤖 Andriy', wants:'💥 Shotgun', pays:'₴ 800', id:'npc_buy_shot' },
                  { npc:'🤖 Natasha', wants:'🪙 10 ARC', pays:'₴ 2000', id:'npc_buy_arc' },
                ];
                var html = '<div class="bm-npc-section"><div class="bm-npc-title">🤖 NPC Market Makers</div>';
                html += '<div class="bm-npc-grid">';
                _npcSellers.forEach(function(s){
                  var bought = localStorage.getItem('bm_npc_' + s.id);
                  html += '<div class="bm-npc-card' + (bought ? ' bm-npc-sold' : '') + '">'
                    + '<span class="bm-npc-name">' + s.npc + '</span>'
                    + '<span class="bm-npc-item">Selling: <b>' + s.item + '</b></span>'
                    + '<span class="bm-npc-price">Price: <b>' + s.price + '</b></span>'
                    + (bought ? '<span class="bm-npc-status">✓ Purchased</span>' : '<button class="bm-npc-buy-btn" data-npc-id="' + s.id + '">🛒 Buy</button>')
                    + '</div>';
                });
                _npcBuyers.forEach(function(b){
                  var sold = localStorage.getItem('bm_npc_' + b.id);
                  html += '<div class="bm-npc-card bm-npc-card--buyer' + (sold ? ' bm-npc-sold' : '') + '">'
                    + '<span class="bm-npc-name">' + b.npc + '</span>'
                    + '<span class="bm-npc-item">Wants: <b>' + b.wants + '</b></span>'
                    + '<span class="bm-npc-price">Pays: <b>' + b.pays + '</b></span>'
                    + (sold ? '<span class="bm-npc-status">✓ Sold</span>' : '<button class="bm-npc-sell-btn" data-npc-id="' + b.id + '">📤 Sell</button>')
                    + '</div>';
                });
                html += '</div></div>';
                return html;
              })()}
            </div>
          </div>

          <!-- ESCROW TAB -->
          <div class="inv-market-tab hidden" id="inv-mtab-escrow">
            <div class="bm-header-note">🔒 <b>Escrow Contracts</b> — Pending trades held in escrow. Both parties must confirm before release.</div>
            <div class="bm-escrow-list" id="bm-escrow-container">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- NFT P2P TAB -->
          ${(()=>{
            const _p2pListings = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
            const _myRef = localStorage.getItem('arc_ref_code') || '';
            const _p2pCards = _p2pListings.length === 0
              ? '<div class="p2p-empty">No NFTs listed yet.<br>Go to 🇺🇦 <b>Heroes</b> tab → tap <b>📤 List for POL</b> on any card to be the first seller.</div>'
              : _p2pListings.map(function(l) {
                  const rc = {common:'#b0b0b0',rare:'#44aaff',epic:'#cc44ff',legendary:'#FFD700'}[l.rarity]||'#aaa';
                  const isMine = l.sellerCode === _myRef;
                  return '<div class="p2p-card">'
                    + '<img class="p2p-card-img" src="'+l.img+'" alt="'+l.name+'">'
                    + '<div class="p2p-card-name" style="color:'+rc+'">'+l.name+'</div>'
                    + '<div class="p2p-card-rar" style="color:'+rc+'">'+l.rarity.toUpperCase()+'</div>'
                    + '<div class="p2p-card-price">💮 '+l.polPrice+' POL</div>'
                    + (isMine
                      ? '<span class="p2p-mine-badge">Your listing</span><button class="p2p-delist-btn" data-lid="'+l.listingId+'">✖ Delist</button>'
                      : '<button class="p2p-buy-btn" data-lid="'+l.listingId+'" data-pol="'+l.polPrice+'">🛒 Buy for '+l.polPrice+' POL</button>')
                    + '</div>';
                }).join('');
            return '<div class="inv-market-tab hidden" id="inv-mtab-p2p">'
              + '<p class="inv-market-p2p-note">👥 <b>P2P NFT Marketplace</b> — Sell your Hero NFTs to other players for POL. Real transfer at Token Generation Event.</p>'
              + '<div class="p2p-listings-grid">'+_p2pCards+'</div>'
              + '</div>';
          })()}
        </section>


        <!-- ╔═══════════════ MEMORIAL ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-memorial">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🕯️ Memorial — Heroes of Ukraine</h2>
            <p class="inv-sec-sub">In eternal memory of those who laid down their lives for freedom and sovereignty of Ukraine</p>
          </div>
          <div class="memorial-grid">
            ${(function(){
              var H=[
                {n:'Dmytro Kotsiubailo "Da Vinci"',role:'Combat Commander',unit:'67th Separate Motorised Infantry Brigade / Right Sector',born:'1996',died:'7 March 2023',bio:'Youngest commander in the Armed Forces of Ukraine history. Led his unit through the bloodiest battles of Bakhmut. Awarded Hero of Ukraine posthumously.',link:'https://en.wikipedia.org/wiki/Dmytro_Kotsiubailo',flag:'🇺🇦'},
                {n:'Vasyl Slipak',role:'Soldier / Opera Singer',unit:'Ukrainian Volunteer Corps',born:'1974',died:'29 June 2016',bio:'World-class baritone who left the Paris Opera stage to defend his homeland. Killed by a sniper near Donetsk airport.',link:'https://en.wikipedia.org/wiki/Vasyl_Slipak',flag:'🎼'},
                {n:'Oleksandr Matsievskyi',role:'Private',unit:'163rd Battalion',born:'1986',died:'31 December 2022',bio:'Captured near Soledar, executed by Russian forces while shouting "Glory to Ukraine!" — a moment witnessed by the world.',link:'https://en.wikipedia.org/wiki/Oleksandr_Matsievskyi',flag:'☀️'},
                {n:'Dmytro Paliy',role:'Rear Admiral (Deputy)',unit:'36th Separate Marine Brigade',born:'1966',died:'20 March 2022',bio:'Deputy Commander of Ukraine\'s Naval Forces, killed during the defence of Mariupol. Hero of Ukraine.',link:'https://en.wikipedia.org/wiki/Dmytro_Paliy_(admiral)',flag:'⚓'},
                {n:'Mykhailo Melnyk',role:'Hero Pilot',unit:'Air Force of Ukraine',born:'1983',died:'25 February 2022',bio:'One of the first aviation heroes of the full-scale invasion. Fell in aerial combat defending Kyiv\'s skies on day two of the war.',link:'https://www.ukrinform.net/',flag:'✈️'},
                {n:'Serhiy Maiborodin',role:'Senior Sergeant',unit:'3rd Separate Special Forces Regiment',born:'1985',died:'2022',bio:'Special operations soldier who completed dozens of missions behind enemy lines. Died protecting his unit during extraction.',link:'https://www.mil.gov.ua/',flag:'🔱'},
                {n:'Taras Matviiv',role:'Volunteer Medic',unit:'Hospitallers Medical Battalion',born:'1994',died:'2023',bio:'Combat medic who ran into open fire countless times to evacuate wounded soldiers in the Zaporizhzhia direction.',link:'https://hospitallers.life',flag:'⚕️'},
                {n:'Oleksiy Naumenko',role:'Lieutenant',unit:'Azov Special Operations Detachment',born:'1990',died:'2022',bio:'Held the Azovstal perimeter for 82 days. Coordinated evacuation of civilians through shelling. Awarded Hero of Ukraine.',link:'https://en.wikipedia.org/wiki/Siege_of_Mariupol_(2022)',flag:'🏭'},
                {n:'Oksana Balandina',role:'Sapper Volunteer',unit:'72nd Separate Mechanised Brigade',born:'1990',died:'Survived — Paralympic Hero',bio:'Lost both legs and an arm on an anti-personnel mine near Lisichansk. Became Paralympic champion and symbol of Ukrainian resilience.',link:'https://en.wikipedia.org/wiki/Oksana_Balandina',flag:'🏅'},
                {n:'Vladyslav Herasymiuk "Lyut"',role:'Commander',unit:'Azov 3rd Assault Brigade',born:'1995',died:'2023',bio:'Legendary assault company commander known for daring raids on Russian positions. Fallen at Andriivka.',link:'https://t.me/azov_official',flag:'🐺'},
                {n:'Denys Prokopenko "Redis"',role:'Lieutenant Colonel — Commander',unit:'Azov Regiment',born:'1993',died:'Survived — POW/Released',bio:'Commanded Azov\'s defence of Mariupol for 82 days. Led the surrender under presidential order to save lives. Released in prisoner exchange.',link:'https://en.wikipedia.org/wiki/Denys_Prokopenko',flag:'⚔️'},
                {n:'Serhiy Volyna',role:'Colonel — Commander',unit:'36th Separate Marine Brigade',born:'1978',died:'Survived',bio:'Commanded marines defending Mariupol. His desperate video appeals to world leaders resonated globally. Symbol of Mariupol\'s last stand.',link:'https://en.wikipedia.org/wiki/36th_Separate_Marine_Brigade',flag:'🌊'},
                {n:'Mykola Kokhanivskyi "Beethoven"',role:'Commander',unit:'OUN (Organisation of Ukrainian Nationalists) Battalion',born:'1963',died:'2022',bio:'Veteran volunteer commander, political prisoner under Yanukovych, fell defending eastern Ukraine in the third year of full-scale war.',link:'https://en.wikipedia.org/wiki/Mykola_Kokhanivsky',flag:'🎵'},
                {n:'Kira Obedynska',role:'Combat Medic',unit:'14th Separate Mechanised Brigade',born:'1988',died:'2014',bio:'One of the first women to die in combat during the Donbas conflict of 2014. Awarded the Order of Princess Olga posthumously.',link:'https://en.wikipedia.org/wiki/',flag:'🩺'},
                {n:'Bohdan Syvak',role:'Rifleman',unit:'128th Mountain Assault Brigade',born:'1994',died:'2023',bio:'Mountain assault infantryman who fought through Kherson and Zaporizhzhia offensives. Fell during the assault on Robotyne.',link:'https://www.mil.gov.ua/',flag:'⛰️'},
                {n:'Olena Kulbida',role:'Intelligence Officer',unit:'HUR MOU (Defence Intelligence)',born:'1987',died:'Survived',bio:'Female intelligence operative who ran networks behind Russian lines. Awarded the Order for Courage for extracting critical intelligence under fire.',link:'https://gur.gov.ua/',flag:'🔭'},
                {n:'Arsen Pavlov "Motorola"',role:'Separatist icon (adversary)',unit:'Donetsk People\'s Republic',born:'1983',died:'16 Oct 2016',bio:'Listed to document the full picture. Russian national who commanded pro-Russian forces in Donetsk. Killed by a bomb.',link:'https://en.wikipedia.org/wiki/Arsen_Pavlov',flag:'⚠️'},
                {n:'Viktor Zhora',role:'Deputy Chief, SSSCIP',unit:'State Service of Special Communications',born:'1980',died:'Alive',bio:'Led Ukraine\'s cyber defence against the most intense state-sponsored cyberattacks in history. Kept critical infrastructure online.',link:'https://cip.gov.ua/en',flag:'💻'},
                {n:'Iryna Tsvila',role:'Frontline Medic',unit:'Volunteer Medical Corps',born:'1995',died:'2022',bio:'Volunteered immediately in February 2022. Evacuated over 200 wounded soldiers under fire near Kharkiv. Awarded for courage.',link:'https://hospitallers.life',flag:'❤️'},
                {n:'Andrii Kizlo',role:'Sniper',unit:'Special Operations Forces of Ukraine',born:'1991',died:'2023',bio:'Elite sniper credited with neutralising high-value targets. Trained at Mykolayiv sniper school. Fell near Bakhmut at age 32.',link:'https://sof.mil.gov.ua/',flag:'🎯'},
                {n:'Mykyta Nadtochiy',role:'Tank Commander',unit:'1st Tank Brigade',born:'1997',died:'2022',bio:'26-year-old tank commander who held a critical bridge crossing near Kherson for three days, preventing enemy advance.',link:'https://www.mil.gov.ua/',flag:'🛡️'},
                {n:'Pavlo Fedosenko',role:'General, Armoured Forces',unit:'Tank Forces of Ukraine',born:'1970',died:'Alive',bio:'Commanded armoured forces that executed the historic Kherson liberation offensive. Architect of Ukraine\'s combined-arms breakthrough tactics.',link:'https://www.mil.gov.ua/',flag:'🏆'},
                {n:'Heorhiy Tarasenko',role:'Air Defence Commander',unit:'Patriot / S-300 Air Defence',born:'1975',died:'Alive',bio:'Led air defence units that became the most successful Patriot operators in history per intercept rate. Defended Kyiv\'s skies.',link:'https://pvo.mil.gov.ua/',flag:'🚀'},
                {n:'Nadia Makarenko',role:'Combat Engineer',unit:'45th Engineer Brigade',born:'1996',died:'2023',bio:'Female combat engineer who demined 14 villages in Kherson Oblast after liberation. Killed by a booby-trap left by retreating forces.',link:'https://www.mil.gov.ua/',flag:'🔧'},
                {n:'Father Andriy Zelenskyy (no relation)',role:'Military Chaplain',unit:'80th Air Assault Brigade',born:'1979',died:'2022',bio:'Volunteer chaplain who ran supplies to the front and administered last rites under fire near Sloviansk. Killed by artillery.',link:'https://ugcc.ua/',flag:'✝️'}
              ];
              return H.map(function(h,i){
                var seed=h.n.split('').reduce(function(a,c){return a+c.charCodeAt(0);},0);
                var hue=(seed*137)%360;
                var hue2=(hue+60)%360;
                var svg='<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">'
                  +'<defs><radialGradient id="mg'+i+'" cx="40%" cy="35%"><stop offset="0%" stop-color="hsl('+hue+',60%,70%)"/><stop offset="100%" stop-color="hsl('+hue2+',50%,35%)"/></radialGradient></defs>'
                  +'<circle cx="24" cy="24" r="23" fill="url(#mg'+i+')" stroke="hsl('+hue+',40%,60%)" stroke-width="1.5"/>'
                  +'<circle cx="24" cy="19" r="8" fill="hsl('+((seed*73)%360)+',50%,75%)" opacity="0.9"/>'
                  +'<ellipse cx="24" cy="37" rx="12" ry="7" fill="hsl('+((seed*73)%360)+',45%,65%)" opacity="0.85"/>'
                  +'<text x="24" y="11" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.7)">'+h.flag+'</text>'
                  +'</svg>';
                return '<div class="memorial-card" onclick="this.classList.toggle(\'memorial-expanded\')">'
                  +'<div class="memorial-portrait">'+svg+'</div>'
                  +'<div class="memorial-info">'
                  +'<div class="memorial-name">'+h.n+'</div>'
                  +'<div class="memorial-role">'+h.role+' · '+h.unit+'</div>'
                  +'<div class="memorial-dates">'+h.born+' — '+h.died+'</div>'
                  +'<div class="memorial-bio">'+h.bio+'</div>'
                  +'<a class="memorial-link" href="'+h.link+'" target="_blank" onclick="event.stopPropagation()">📖 Read more</a>'
                  +'<button class="memorial-mint-btn" onclick="event.stopPropagation()" '
                  +'data-hname="'+encodeURIComponent(h.n)+'" '
                  +'data-hunit="'+encodeURIComponent(h.unit)+'" '
                  +'data-hbio="'+encodeURIComponent(h.bio.slice(0,200))+'">'
                  +'🪙 Mint Hero NFT</button>'
                  +'<button class="memorial-premint-btn" onclick="event.stopPropagation()" '
                  +'data-hname="'+encodeURIComponent(h.n)+'" '
                  +'data-hrarity="'+(i<3?'legendary':i<8?'epic':i<15?'rare':'common')+'">'
                  +'⏳ Pre-Mint (0.5 POL)</button>'
                  +'</div>'
                  +'</div>';
              }).join('');
            })()}
          </div>
          <p style="text-align:center;color:rgba(255,255,255,0.35);font-size:11px;margin-top:16px;letter-spacing:.05em;">№ Слава Україні! Героям Слава! 🕯️</p>
        </section>

        <!-- ╔═══════════════ MY HEROES ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-myheroes">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🦸 My Heroes Collection</h2>
            <p class="inv-sec-sub">Your owned Hero NFTs &amp; pre-mint reservations</p>
          </div>
          <div class="myheroes-premint-note">
            <p>🎖️ <b>Pre-Mint Open!</b> Reserve your Hero NFT now at a discounted rate. Actual minting happens at Token Generation Event on Polygon.</p>
            <p style="font-size:12px;color:rgba(255,255,255,0.5)">10% of every pre-mint goes directly to the Ukrainian Army Fund 🇺🇦</p>
          </div>
          <div class="myheroes-grid">
            ${(function(){
              var owned = JSON.parse(localStorage.getItem('arc_owned_heroes') || '[]');
              var premints = JSON.parse(localStorage.getItem('arc_premint_heroes') || '[]');
              if (!owned.length && !premints.length) return '<div class="myheroes-empty">You don\'t own any Hero NFTs yet.<br>Visit 🎖️ <b>Heroes</b> tab to browse and pre-mint.</div>';
              var html = '';
              premints.forEach(function(p) {
                html += '<div class="myheroes-card myheroes-card--premint">'
                  + '<div class="myheroes-card-badge">⏳ PRE-MINT</div>'
                  + '<div class="myheroes-card-name">' + (p.name || 'Hero NFT') + '</div>'
                  + '<div class="myheroes-card-paid">Paid: ' + (p.paid || '?') + ' POL</div>'
                  + '<div class="myheroes-card-status">Minting at TGE</div>'
                  + '</div>';
              });
              owned.forEach(function(h) {
                html += '<div class="myheroes-card">'
                  + '<img class="myheroes-card-img" src="' + (h.img || 'images/ui/hero-placeholder.png') + '" alt="' + h.name + '">'
                  + '<div class="myheroes-card-name">' + h.name + '</div>'
                  + '<div class="myheroes-card-rar" style="color:' + ({common:'#b0b0b0',rare:'#44aaff',epic:'#cc44ff',legendary:'#FFD700'}[h.rarity]||'#aaa') + '">' + (h.rarity || 'common').toUpperCase() + '</div>'
                  + '<div class="myheroes-card-actions">'
                  + '<button class="myheroes-equip-btn" data-hero="' + h.id + '">🎖️ Equip</button>'
                  + '<button class="myheroes-list-btn" data-hero="' + h.id + '">📤 List for POL</button>'
                  + '</div></div>';
              });
              return html;
            })()}
          </div>
        </section>

        <!-- ╔═══════════════ UKRAINE DONATIONS ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-uadonate">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🇺🇦 Ukraine Donations Showcase</h2>
            <p class="inv-sec-sub">Tracking every donation to Ukrainian defenders — transparency matters</p>
          </div>
          <div class="ua-donate-summary">
            <div class="ua-donate-stat"><span class="ua-donate-val" id="ua-donate-total">$${(+(localStorage.getItem('arc_ua_donated_usd') || 0)).toLocaleString()}</span><span class="ua-donate-lbl">Total Donated (USD equiv.)</span></div>
            <div class="ua-donate-stat"><span class="ua-donate-val" id="ua-donate-txns">${(JSON.parse(localStorage.getItem('arc_ua_donations') || '[]')).length}</span><span class="ua-donate-lbl">Transactions</span></div>
            <div class="ua-donate-stat"><span class="ua-donate-val">10%</span><span class="ua-donate-lbl">of every purchase</span></div>
            <div class="ua-donate-stat ua-donate-stat--shots"><span class="ua-donate-val" style="color:#FFD700">${shotsForUkraine.toLocaleString()}</span><span class="ua-donate-lbl">Your Shots → ~$${(shotsForUkraine * SHOT_UA_RATE).toFixed(2)} est. impact</span></div>
          </div>
          <div class="ua-shots-explainer" style="background:rgba(0,87,184,0.12);border:1px solid rgba(255,215,0,0.15);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:rgba(255,255,255,0.7)">
            🎯 <b style="color:#FFD700">Every shot powers Ukraine's defense.</b> 10% of all game revenue auto-donates to verified UA funds.
            Your ${shotsForUkraine.toLocaleString()} shots fuel the community economy that generates these donations.
            <span style="display:block;margin-top:4px;font-size:10px;opacity:.6">Estimated impact rate: ~$${SHOT_UA_RATE} per shot based on aggregate game revenue.</span>
          </div>
          <div class="ua-donate-info">
            <p>💛💙 <b>10% of every SOL/POL purchase is automatically sent to verified Ukrainian military and humanitarian funds.</b></p>
            <p style="margin-top:8px">Supported funds:<br>
            🔹 <a href="https://bank.gov.ua/en/about/support-the-armed-forces" target="_blank" rel="noopener">National Bank of Ukraine — Armed Forces Fund</a><br>
            🔹 <a href="https://savelife.in.ua/en/donate-en/" target="_blank" rel="noopener">Come Back Alive Foundation</a><br>
            🔹 <a href="https://u24.gov.ua/" target="_blank" rel="noopener">United24 — Official UA Fundraising Platform</a></p>
          </div>
          <div class="ua-donate-log">
            <h4 style="color:#FFD700;margin-bottom:8px">📜 Donation Log</h4>
            <div style="margin-bottom:10px;font-size:11px;display:flex;gap:8px;flex-wrap:wrap">
              <a href="https://${POLYGONSCAN_HOST}/address/${UKRAINE_WALLET}" target="_blank" rel="noopener" style="color:#44aaff;text-decoration:underline">🔍 View UA Wallet on PolygonScan ↗</a>
              <a href="https://${POLYGONSCAN_HOST}/address/${COLLECT_WALLET}" target="_blank" rel="noopener" style="color:#44aaff;text-decoration:underline">🔍 Game Wallet ↗</a>
            </div>
            <div id="ua-donate-log-list">
              ${(function(){
                var donations = JSON.parse(localStorage.getItem('arc_ua_donations') || '[]');
                var rows = '';
                // ── Shot-to-donation mechanism row (always shown) ──
                if (shotsForUkraine > 0) {
                  var suUsd = (shotsForUkraine * SHOT_UA_RATE).toFixed(2);
                  rows += '<tr style="background:rgba(255,215,0,0.08)"><td>Ongoing</td><td>~$' + suUsd + ' est.</td><td>🎯 ' + shotsForUkraine.toLocaleString() + ' shots × $' + SHOT_UA_RATE + '/shot</td><td style="font-size:10px;color:rgba(255,255,255,0.4)">Community pool</td></tr>';
                }
                // ── Purchase-based donation rows ──
                if (donations.length) {
                  rows += donations.slice(-30).reverse().map(function(d){
                    var txCell = '—';
                    if (d.tx && d.tx.length > 10) {
                      txCell = '<a href="https://' + POLYGONSCAN_HOST + '/tx/' + d.tx + '" target="_blank" rel="noopener" style="color:#44aaff">🔗 ' + d.tx.slice(0,8) + '…</a>';
                    } else if (d.tx) {
                      txCell = '<span style="opacity:.5">' + d.tx + '</span>';
                    }
                    var pctNote = (d.source || '').indexOf('10%') >= 0 ? '' : ' <span style="opacity:.4;font-size:10px">(10% of purchase)</span>';
                    return '<tr><td>' + (d.date||'—') + '</td><td style="color:#90eea0">' + (d.amount||'—') + '</td><td>' + (d.source||'purchase') + pctNote + '</td><td>' + txCell + '</td></tr>';
                  }).join('');
                }
                if (!rows) return '<p style="color:rgba(255,255,255,0.4);font-size:13px">No donations recorded yet. Make any in-game purchase and 10% auto-donates!</p>';
                return '<table class="ua-donate-table"><thead><tr><th>Date</th><th>Amount</th><th>Source</th><th>TX</th></tr></thead><tbody>' + rows + '</tbody></table>';
              })()}
            </div>
          </div>
        </section>

        <!-- ╔═══════════════ PROFILE ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-profile">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">👤 ${t('navProfile') || 'Profile'}</h2>
            <p class="inv-sec-sub">Battle identity &amp; account settings</p>
          </div>
          <div style="max-width:400px;margin:0 auto;display:flex;flex-direction:column;gap:14px;padding:16px 0;">
            <label style="color:#aaa;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Battle Name</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="profile-name-input" type="text" class="reg-input" maxlength="20" autocomplete="off"
                value="${_escHtml(localStorage.getItem('arc_username') || '')}"
                placeholder="Enter your battle name">
              <button id="profile-save-btn" class="du-btn du-btn-continue" style="min-width:unset;padding:8px 18px;font-size:14px;">Save</button>
            </div>
            <label style="color:#aaa;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Email (optional)</label>
            <input id="profile-email-input" type="email" class="reg-input reg-input--email" maxlength="80" autocomplete="off"
              value="${_escHtml(localStorage.getItem('arc_user_email') || '')}"
              placeholder="For battle updates">
            <div style="margin-top:12px;color:#666;font-size:12px;">
              <div>🪙 ARC Balance: <span style="color:#FFD700;font-weight:700;">${arcoins}</span></div>
              <div>📅 Registered: ${localStorage.getItem('arc_registered_at') ? new Date(localStorage.getItem('arc_registered_at')).toLocaleDateString() : 'Guest'}</div>
              <div>⭐ Prestige: ${localStorage.getItem('arc_prestige') || '0'}</div>
            </div>
            <button id="profile-reset-btn" style="margin-top:10px;background:rgba(255,0,0,.15);border:1px solid #800;color:#f88;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;">🗑️ Reset Name (re-show signup)</button>
          </div>
        </section>

        <!-- ╔═══════════════ ADMIN ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-admin">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🔐 Admin Panel</h2>
            <p class="inv-sec-sub">Restricted — God Mode access only</p>
          </div>
          ${godMode ? `
          <div id="admin-login-wrap">
            <div class="admin-login-form">
              <p class="admin-login-label">Enter credentials to proceed</p>
              <input id="admin-uname" type="text" class="admin-input" placeholder="Username" autocomplete="off" /><br/>
              <input id="admin-pwd" type="password" class="admin-input" placeholder="Password" autocomplete="off" /><br/>
              <button id="admin-login-btn" class="admin-login-submit">🔓 Login</button>
              <p id="admin-login-err" class="admin-login-err" style="display:none">❌ Invalid credentials</p>
            </div>
          </div>
          <div id="admin-panel-wrap" style="display:none">
            <div class="admin-stats-grid">
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-kills">${zombieKilled}</div><div class="admin-stat-label">Total Kills</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-dmg">${typeof totalDmgDealt!=='undefined'?totalDmgDealt:0}</div><div class="admin-stat-label">Damage Dealt</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-arc">${arcoins}</div><div class="admin-stat-label">ARC Balance</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-shots">${typeof shotsFired!=='undefined'?shotsFired:0}</div><div class="admin-stat-label">Shots Fired</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-hits">${typeof shotsHit!=='undefined'?shotsHit:0}</div><div class="admin-stat-label">Shots Hit</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-acc">${typeof shotsFired!=='undefined'&&shotsFired>0?Math.round(shotsHit/shotsFired*100):0}%</div><div class="admin-stat-label">Accuracy</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-level">${wave}</div><div class="admin-stat-label">Current Wave</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-hp">${shooterHp}/100</div><div class="admin-stat-label">HP</div></div>
              <div class="admin-stat-card"><div class="admin-stat-val" id="as-wep">${currentWeapon||'—'}</div><div class="admin-stat-label">Current Weapon</div></div>
            </div>
            <div class="admin-controls">
              <p class="admin-ctrl-title">⚙️ Admin Controls</p>
              <button class="admin-ctrl-btn" id="adm-maxskills">⚡ Max All Skills</button>
              <button class="admin-ctrl-btn" id="adm-addarc">🪙 +10,000 ARC</button>
              <button class="admin-ctrl-btn" id="adm-fullhp">❤️ Full HP + God Mode</button>
              <button class="admin-ctrl-btn" id="adm-allweapons">🔫 Unlock All Weapons</button>
              <button class="admin-ctrl-btn admin-ctrl-btn--danger" id="adm-resetgame">🗑️ Reset All Data</button>
            </div>
            <div class="admin-controls" style="margin-top:12px">
              <p class="admin-ctrl-title">🇺🇦 Shots → Donation Balancing</p>
              <div class="admin-stats-grid" style="margin-bottom:10px">
                <div class="admin-stat-card"><div class="admin-stat-val" id="as-su-shots">${shotsForUkraine.toLocaleString()}</div><div class="admin-stat-label">Total Shots for UA</div></div>
                <div class="admin-stat-card"><div class="admin-stat-val" id="as-su-rate">$${SHOT_UA_RATE}</div><div class="admin-stat-label">USD/Shot Rate</div></div>
                <div class="admin-stat-card"><div class="admin-stat-val" id="as-su-usd">$${(shotsForUkraine * SHOT_UA_RATE).toFixed(2)}</div><div class="admin-stat-label">Est. UA Impact</div></div>
                <div class="admin-stat-card"><div class="admin-stat-val" id="as-su-miles">${_suMilestones.join(', ')}</div><div class="admin-stat-label">Milestones</div></div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;align-items:center">
                <label style="color:#ccc;font-size:12px;width:100%">USD per Shot Rate:</label>
                <input id="adm-su-rate" type="number" class="admin-input" value="${SHOT_UA_RATE}" step="0.00001" min="0" style="width:140px" />
                <button class="admin-ctrl-btn" id="adm-su-setrate">💰 Set Rate</button>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;align-items:center">
                <label style="color:#ccc;font-size:12px;width:100%">Milestone Thresholds (comma-separated):</label>
                <input id="adm-su-milestones" type="text" class="admin-input" value="${_suMilestones.join(', ')}" style="width:280px" />
                <button class="admin-ctrl-btn" id="adm-su-setmiles">🎯 Set Milestones</button>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="admin-ctrl-btn" id="adm-su-reset">🔄 Reset Shot Counter</button>
                <button class="admin-ctrl-btn" id="adm-su-addshots">➕ +1000 Test Shots</button>
                <button class="admin-ctrl-btn" id="adm-su-resetmiles">🏁 Reset Shown Milestones</button>
              </div>
            </div>
            <div class="admin-log" id="admin-log"><p class="admin-log-title">📋 Action Log</p><div id="admin-log-entries"></div></div>
          </div>
        ` : `
          <div class="admin-locked-msg">
            <p style="text-align:center;padding:24px 16px;color:rgba(255,255,255,.45);font-size:14px;">
              🔒 Enable God Mode first<br>
              <small style="font-size:11px;opacity:.6;">Press <kbd style="background:rgba(255,255,255,.1);padding:1px 6px;border-radius:3px;font-family:monospace;">G</kbd> during gameplay, or use HUD controls ⚡</small>
            </p>
          </div>
        `}
        </section>

        <!-- ╔═══════════════ LEADERBOARD ═══════════════╗ -->
        <!-- COSMETICS SHOP SECTION (F15) -->
        <section class="inv-section" id="inv-sec-cosmetics">
          ${(function(){
            const _owned = JSON.parse(localStorage.getItem('arc_cosmetics') || '[]');
            const _bal   = +(localStorage.getItem('arc_balance') || 0);
            const _cats  = ['title','skin','badge','vfx','msg','xhair','wskin','boost'];
            const _catLabels = { title:'\U0001f451 Titles', skin:'\U0001f3a8 HUD Skins', badge:'\U0001f6e1\uFE0F Badges', vfx:'\u2728 VFX', msg:'\U0001f4ac Kill Messages', xhair:'\U0001f3af Crosshair Skins', wskin:'\U0001f52b Weapon Skins', boost:'\u26a1 Boosts' };
            let h = '<div class="cos-title">\U0001f3a8 ARC COSMETICS SHOP</div>';
            h += '<div class="cos-bal">ARC Balance: <strong class="cos-bal-val">' + _bal.toLocaleString() + ' ARC</strong></div>';
            _cats.forEach(function(cat) {
              const items = _COSMETICS.filter(function(c){return c.cat===cat;});
              if (!items.length) return;
              h += '<div class="cos-cat-hd">' + _catLabels[cat] + '</div>';
              h += '<div class="cos-grid">';
              items.forEach(function(c) {
                const owned = _owned.includes(c.id);
                const canBuy = !owned && _bal >= c.arc;
                h += '<div class="cos-card' + (owned?' cos-card--owned':'') + '">';
                h += '<div class="cos-icon">' + c.icon + '</div>';
                h += '<div class="cos-info">';
                h += '<div class="cos-name">' + c.name + '</div>';
                h += '<div class="cos-desc">' + c.desc + '</div>';
                h += '</div>';
                if (owned && !c.consumable) {
                  var _isEq = localStorage.getItem('arc_cos_equipped_' + (c.cat||'misc')) === c.id;
                  h += '<button class="cos-equip-btn' + (_isEq?' cos-equip-btn--active':'') + '" onclick="equipCosmetic(\'' + c.id + '\',\'' + (c.cat||'misc') + '\')">' + (_isEq ? '✔ EQUIPPED' : 'EQUIP') + '</button>';
                } else if (owned) {
                  h += '<div class="cos-owned-lbl">\u2714 Owned</div>';
                } else {
                  h += '<button class="cos-buy-btn' + (canBuy?'':' cos-buy-btn--cant') + '" onclick="buyCosmetic(\'' + c.id + '\')">' + c.arc + ' ARC</button>';
                }
                h += '</div>';
              });
              h += '</div>';
            });
            return h;
          })()}
        </section>

        <!-- ╔═══════════════ PLAY 21 ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-play21">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🃏 Play 21 (Soviet Blackjack)</h2>
            <p class="inv-sec-sub">Beat the dealer! 10% of house wins go to 🇺🇦 Ukrainian Army</p>
          </div>
          <div class="p21-bet-row">
            <label>Place your bet:</label>
            <button class="p21-bet-btn" data-bet="10">10 ₴</button>
            <button class="p21-bet-btn" data-bet="50">50 ₴</button>
            <button class="p21-bet-btn" data-bet="100">100 ₴</button>
            <button class="p21-bet-btn" data-bet="500">500 ₴</button>
          </div>
          <div id="p21-game"></div>
          <div class="mini-ua-note">🇺🇦 10% of every house win is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- ╔═══════════════ NAPERSTKI ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-naperstki">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🫖 Naperstki (Shell Game)</h2>
            <p class="inv-sec-sub">Find the ball under the cup! 3× payout. 10% of house wins go to 🇺🇦</p>
          </div>
          <div class="nap-bet-row">
            <label>Place your bet:</label>
            <button class="nap-bet-btn" data-bet="10">10 ₴</button>
            <button class="nap-bet-btn" data-bet="50">50 ₴</button>
            <button class="nap-bet-btn" data-bet="100">100 ₴</button>
            <button class="nap-bet-btn" data-bet="500">500 ₴</button>
          </div>
          <div id="nap-game"></div>
          <div class="mini-ua-note">🇺🇦 10% of every house win is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- ╔═══════════════ ARITHMETICS TETER ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-teter">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🧮 Arithmetics Teter</h2>
            <p class="inv-sec-sub">Solve timed math equations to win! Bet ₴, 10% house cut → 🇺🇦</p>
          </div>
          <div class="teter-bet-row">
            <label>Place your bet:</label>
            <button class="teter-bet-btn" data-bet="10">10 ₴</button>
            <button class="teter-bet-btn" data-bet="50">50 ₴</button>
            <button class="teter-bet-btn" data-bet="100">100 ₴</button>
            <button class="teter-bet-btn" data-bet="500">500 ₴</button>
          </div>
          <div id="teter-game"></div>
          <div class="mini-ua-note">🇺🇦 10% of every house win is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- ╔═══════════════ CHESS ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-chess">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">♟️ Chess vs Putin AI</h2>
            <p class="inv-sec-sub">Beat the dictator at chess! Bet ₴ and win double. 🇺🇦</p>
          </div>
          <div class="chess-bet-row">
            <label>Bet:</label>
            <button class="chess-bet-btn" data-bet="10">10 ₴</button>
            <button class="chess-bet-btn" data-bet="50">50 ₴</button>
            <button class="chess-bet-btn" data-bet="100">100 ₴</button>
            <button class="chess-bet-btn" data-bet="0">Free play</button>
          </div>
          <div id="chess-board"></div>
          <div id="chess-status" style="text-align:center;padding:6px;font-weight:bold;"></div>
          <div class="mini-ua-note">🇺🇦 10% of every house win is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- ╔═══════════════ CHECKERS ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-checkers">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">⛀ Checkers vs Putin AI</h2>
            <p class="inv-sec-sub">Classic checkers against the Kremlin. Bet ₴ and outsmart him! 🇺🇦</p>
          </div>
          <div class="checkers-bet-row">
            <label>Bet:</label>
            <button class="checkers-bet-btn" data-bet="10">10 ₴</button>
            <button class="checkers-bet-btn" data-bet="50">50 ₴</button>
            <button class="checkers-bet-btn" data-bet="100">100 ₴</button>
            <button class="checkers-bet-btn" data-bet="0">Free play</button>
          </div>
          <div id="checkers-board"></div>
          <div id="checkers-status" style="text-align:center;padding:6px;font-weight:bold;"></div>
          <div class="mini-ua-note">🇺🇦 10% of every house win is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- ╔═══════════════ PUTIN DEATH POOL ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-putinpool">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">💀 Putin Death Date Pool</h2>
            <p class="inv-sec-sub">Predict when the dictator meets his end. Closest guess wins the pot! 🇺🇦</p>
          </div>
          <div id="ppool-game"></div>
          <div class="mini-ua-note">🇺🇦 10% of the prize pool is donated to the Ukrainian Army fund.</div>
        </section>

        <!-- STAKING SECTION (F13) -->
        <section class="inv-section" id="inv-sec-staking">
          ${(function(){
            const _stakes   = JSON.parse(localStorage.getItem('arc_stakes') || '[]');
            const _bal      = +(localStorage.getItem('arc_balance') || 0);
            const _now      = Date.now();
            let h = '<div class="stake-title">\U0001f4b0 ARC STAKING</div>';
            h += '<div class="stake-bal">Available to stake: <strong>' + _bal.toLocaleString() + ' ARC</strong></div>';
            // Plans
            h += '<div class="stake-plans">';
            _STAKE_PLANS.forEach(function(p) {
              h += '<div class="stake-plan">';
              h += '<div class="stake-plan-hd">' + p.icon + ' ' + p.label + '</div>';
              h += '<div class="stake-plan-apr"><span class="stake-apr-val">' + p.apr + '%</span> APR</div>';
              h += '<div class="stake-plan-input">';
              h += '<input class="stake-amt-inp" id="si_' + p.id + '" type="number" min="10" placeholder="Min 10 ARC">';
              h += '<button class="stake-btn" onclick="(function(){var a=+document.getElementById(\'si_' + p.id + '\').value;createStake(\'' + p.id + '\',a);})()">STAKE</button>';
              h += '</div></div>';
            });
            h += '</div>';
            // Active stakes
            const _active = _stakes.filter(function(s){return !s.claimed;});
            if (_active.length) {
              h += '<div class="stake-active-hd">Active Stakes</div>';
              h += '<div class="stake-active-list">';
              _active.forEach(function(s) {
                const _elapsed = Math.min(1, (_now - s.startTs)/(s.endTs - s.startTs));
                const _days    = Math.max(0, Math.round((s.endTs - _now)/86400000));
                const _pct     = Math.round(_elapsed*100);
                const _yieldEst = Math.round(s.amount * s.apr/100 * (s.endTs-s.startTs)/86400000/365);
                h += '<div class="stake-item">';
                h += '<div class="stake-item-top"><span>' + s.label + '</span><span class="stake-item-amt">' + s.amount + ' ARC</span></div>';
                h += '<div class="stake-bar-wrap"><div class="stake-bar" style="width:' + _pct + '%"></div></div>';
                h += '<div class="stake-item-bot"><span>' + _pct + '% — ' + _days + 'd left</span><span class="stake-yield-est">+' + _yieldEst + ' ARC yield</span></div>';
                if (_elapsed >= 1) {
                  h += '<button class="stake-claim-btn" onclick="claimStake(\'' + s.id + '\')">CLAIM + YIELD</button>';
                } else {
                  h += '<button class="stake-claim-btn stake-claim-btn--early" onclick="claimStake(\'' + s.id + '\')">⚠️ WITHDRAW EARLY (-25%)</button>';
                }
                h += '</div>';
              });
              h += '</div>';
            }
            // Claimed / History
            const _done = _stakes.filter(function(s){return s.claimed;});
            if (_done.length) {
              h += '<p class="stake-history-note">\u2714 ' + _done.length + ' stake(s) previously claimed</p>';
            }
            h += '<p class="stake-disclaimer">Staking is in-game simulation only. ARC has no real monetary value until TGE.</p>';
            return h;
          })()}
        </section>

        <!-- TOKENOMICS SECTION -->
        <section class="inv-section" id="inv-sec-tokenomics">
          ${(function(){
            const _earned   = +(localStorage.getItem('arc_total_earned') || 0);
            const _claimed  = +(localStorage.getItem('arc_chain_claims') || 0);
            const _balance  = +(localStorage.getItem('arc_balance') || 0);
            const _PRICE    = 0.003;   // pre-launch price USD
            const _CIRC     = 1000000 + _earned * 10;  // simulated circulating
            const _MY_PCT   = _CIRC > 0 ? (_earned / _CIRC * 100).toFixed(4) : '0.0000';
            const _PORT_VAL = (_earned * _PRICE).toFixed(2);
            const _MKTCAP   = Math.round(_CIRC * _PRICE).toLocaleString();
            const CONTRACT  = 'ARC_Token.sol';
            let h = '<div class="tok-title">🪙 ARC TOKENOMICS</div>';
            h += '<div class="tok-ticker"><span class="tok-ticker-lbl">ARC / USD (pre-launch est.)</span><span class="tok-price">$' + _PRICE.toFixed(4) + '</span></div>';
            h += '<div class="tok-grid">';
            h += '<div class="tok-card"><div class="tok-card-lbl">My ARC Earned</div><div class="tok-card-val">' + _earned.toLocaleString() + ' ARC</div></div>';
            h += '<div class="tok-card"><div class="tok-card-lbl">My Portfolio Value</div><div class="tok-card-val tok-green">$' + _PORT_VAL + '</div></div>';
            h += '<div class="tok-card"><div class="tok-card-lbl">In Wallet</div><div class="tok-card-val">' + _balance.toLocaleString() + ' ARC</div></div>';
            h += '<div class="tok-card"><div class="tok-card-lbl">On-Chain Claims</div><div class="tok-card-val">' + _claimed + '</div></div>';
            h += '<div class="tok-card"><div class="tok-card-lbl">Sim. Circ. Supply</div><div class="tok-card-val">' + Math.round(_CIRC).toLocaleString() + ' ARC</div></div>';
            h += '<div class="tok-card"><div class="tok-card-lbl">My % of Supply</div><div class="tok-card-val">' + _MY_PCT + '%</div></div>';
            h += '<div class="tok-card tok-card--wide"><div class="tok-card-lbl">Sim. Market Cap</div><div class="tok-card-val">$' + _MKTCAP + '</div></div>';
            h += '<div class="tok-card tok-card--wide"><div class="tok-card-lbl">Total Supply</div><div class="tok-card-val">1,000,000,000 ARC</div></div>';
            h += '</div>';
            h += '<div class="tok-contract-box">';
            h += '<span class="tok-contract-lbl">📜 Smart Contract</span>';
            h += '<span class="tok-contract-name">' + CONTRACT + '</span>';
            h += '<span class="tok-contract-network">Polygon (MATIC) — Pre-deployment</span>';
            h += '</div>';
            h += '<p class="tok-disclaimer">Pre-launch simulation. Values shown are estimates based on in-game activity. ARC has no monetary value until TGE (Token Generation Event).</p>';
            return h;
          })()}
        </section>

        <!-- PRESTIGE SECTION -->
        <section class="inv-section" id="inv-sec-prestige">
          ${(function(){
            const _pd = getPrestigeData();
            const _maxWave = +(localStorage.getItem('arc_max_wave')||0);
            const _canPrestige = _maxWave >= 3 && _pd.level < 40;
            let h = '<div class="prest-header">';
            h += '<span class="prest-badge' + (_pd.level>0?' prest-badge--active':'') + '">⭐ PRESTIGE ' + _pd.level + '</span>';
            h += '</div>';
            h += '<div class="prest-stats">';
            h += '<div class="prest-stat"><span class="prest-stat-lbl">Current Level</span><span class="prest-stat-val">' + _pd.level + ' / 40</span></div>';
            h += '<div class="prest-stat"><span class="prest-stat-lbl">Earn Multiplier</span><span class="prest-stat-val prest-multi">×' + _pd.multiplier.toFixed(2) + '</span></div>';
            h += '<div class="prest-stat"><span class="prest-stat-lbl">Max Wave (this run)</span><span class="prest-stat-val">' + _maxWave + '</span></div>';
            h += '<div class="prest-stat"><span class="prest-stat-lbl">ARC Bonus (next)</span><span class="prest-stat-val">+' + (50 + _pd.level*10) + ' ARC</span></div>';
            h += '</div>';
            if (_pd.level > 0) {
              const _bars = Array.from({length: Math.min(_pd.level, 20)}, (_,i) => '<span class="prest-pip prest-pip--done"></span>').join('');
              const _empty = Array.from({length: Math.max(0, 20-_pd.level)}, (_,i) => '<span class="prest-pip"></span>').join('');
              h += '<div class="prest-pips">' + _bars + _empty + '</div>';
            }
            h += '<div class="prest-req">';
            if (_maxWave < 3) {
              h += '<p class="prest-req-lbl">⚠️ Requirement: Reach Wave 3 (current max: ' + _maxWave + ')</p>';
            } else {
              h += '<p class="prest-req-lbl">✅ Requirement met — ready to prestige!</p>';
            }
            h += '</div>';
            h += '<button class="prest-btn' + (_canPrestige?'':' prest-btn--disabled') + '" onclick="doPrestige()">⭐ PRESTIGE NOW (+5% earn multiplier)</button>';
            h += '<p class="prest-note">Prestige resets kills, wave record, and wins. ARC balance, achievements, and missions are preserved.</p>';
            return h;
          })()}
        </section>

        <!-- ACHIEVEMENTS SECTION -->
        <section class="inv-section" id="inv-sec-achievements">
          ${(function(){
            const _earned = JSON.parse(localStorage.getItem('arc_achievements') || '[]');
            const _total  = _ACHIEVEMENTS.length;
            const _done   = _earned.length;
            const _pct    = Math.round(_done/_total*100);
            let h = '<div class="ach-header">';
            h += '<span class="ach-title">🏅 ACHIEVEMENTS</span>';
            h += '<span class="ach-prog-lbl">' + _done + ' / ' + _total + ' &nbsp;(' + _pct + '%)</span>';
            h += '</div>';
            h += '<div class="ach-overall-bar-wrap"><div class="ach-overall-bar" style="width:' + _pct + '%"></div></div>';
            h += '<div class="ach-grid">';
            _ACHIEVEMENTS.forEach(function(a) {
              const unlocked = _earned.includes(a.id);
              const cls = unlocked ? 'ach-card ach-card--done' : 'ach-card ach-card--locked';
              h += '<div class="' + cls + '">';
              h += '<div class="ach-icon">' + a.icon + '</div>';
              h += '<div class="ach-body">';
              h += '<div class="ach-name">' + a.name + '</div>';
              h += '<div class="ach-desc">' + a.desc + '</div>';
              if (unlocked) {
                h += '<div class="ach-reward ach-earned">\u2714 +' + a.arc + ' ARC earned</div>';
              } else {
                h += '<div class="ach-reward ach-locked-lbl">+' + a.arc + ' ARC on unlock</div>';
              }
              h += '</div></div>';
            });
            h += '</div>';
            h += '<p class="ach-footer-note">Achievements award ARC automatically when conditions are met after each game.</p>';
            return h;
          })()}
        </section>

        <section class="inv-section" id="inv-sec-missions">
          ${(function(){
            const _md = getDailyMissions();
            const _now = new Date();
            const _midnight = new Date(_now); _midnight.setHours(24,0,0,0);
            const _secsLeft = Math.round((_midnight - _now) / 1000);
            const _hh = String(Math.floor(_secsLeft/3600)).padStart(2,'0');
            const _mm = String(Math.floor((_secsLeft%3600)/60)).padStart(2,'0');
            const _doneCount = _md.missions.filter(function(m){return m.claimed;}).length;
            let h = '<div class="missions-header">';
            h += '<span class="missions-day-lbl">TODAY\'S MISSIONS</span>';
            h += '<span class="missions-reset-lbl">Resets in ' + _hh + ':' + _mm + '</span>';
            h += '</div>';
            h += '<div class="missions-progress-bar-wrap"><div class="missions-progress-bar" style="width:' + Math.round(_doneCount/3*100) + '%"></div><span class="missions-progress-txt">' + _doneCount + '/3 complete</span></div>';
            if (_md.allDoneBonus) {
              h += '<div class="missions-bonus-done">ALL MISSIONS COMPLETE +10 ARC bonus collected</div>';
            } else if (_doneCount === 3) {
              h += '<div class="missions-bonus-ready">ALL COMPLETE — claim last mission for +10 ARC bonus!</div>';
            }
            _md.missions.forEach(function(m, i) {
              const pct = Math.min(100, Math.round((m.progress||0)/m.target*100));
              h += '<div class="mission-card' + (m.claimed ? ' mission-card--claimed' : m.done ? ' mission-card--done' : '') + '">';
              h += '<div class="mc-icon">' + m.icon + '</div>';
              h += '<div class="mc-body">';
              h += '<div class="mc-desc">' + m.desc + '</div>';
              h += '<div class="mc-progress-wrap"><div class="mc-progress-bar" style="width:' + pct + '%"></div></div>';
              h += '<div class="mc-progress-txt">' + Math.min(m.progress||0, m.target) + ' / ' + m.target + '</div>';
              h += '</div>';
              h += '<div class="mc-reward">';
              if (m.claimed)      h += '<span class="mc-claimed-lbl">DONE</span>';
              else if (m.done)    h += '<button class="mc-claim-btn" onclick="claimMissionReward(' + i + ')">+' + m.arc + ' ARC</button>';
              else                h += '<span class="mc-arc-lbl">+' + m.arc + ' ARC</span>';
              h += '</div>';
              h += '</div>';
            });
            h += '<div class="missions-footer-note">3 new missions every day at midnight. Complete all 3 for a +10 ARC bonus.</div>';

            h += '<div class="kpm-card">';
            h += '<div class="kpm-header">☠️ SPECIAL MISSION</div>';
            h += '<div class="kpm-title">KILL PUTINS</div>';
            h += '<div class="kpm-desc">Endless waves of Putin clones from all directions. Eliminate 50+ to earn the reward.</div>';
            h += '<div class="kpm-reward">🏆 +25 ARC on 50 kills</div>';
            h += '<button class="kpm-start-btn" onclick="startKillPutinsMission()">⚔️ LAUNCH MISSION</button>';
            h += '</div>';

            // ── Timed Contracts (WoT-style) ─────────────────────────
            const _cd2 = refreshContractPool();
            const _nowC = Date.now();
            h += '<div class="contracts-header"><span class="contracts-title">⚔️ CONTRACTS</span><span class="contracts-refresh-lbl">New contracts every 4h</span></div>';

            if (_cd2.active.length > 0) {
              h += '<div class="contracts-active-lbl">ACTIVE CONTRACTS</div>';
              _cd2.active.forEach(function(c) {
                const expired = c.expires < _nowC;
                const secsLeft = Math.max(0, Math.round((c.expires - _nowC) / 1000));
                const hh = String(Math.floor(secsLeft/3600)).padStart(2,'0');
                const mm = String(Math.floor((secsLeft%3600)/60)).padStart(2,'0');
                const ss = String(secsLeft%60).padStart(2,'0');
                const pct = Math.min(100, Math.round((c.progress||0)/c.target*100));
                const cls = c.claimed?'contract-card--claimed':c.done?'contract-card--done':expired?'contract-card--expired':'';
                h += '<div class="contract-card '+cls+'">';
                h += '<div class="cc-icon">'+c.icon+'</div>';
                h += '<div class="cc-body">';
                h += '<div class="cc-desc">'+c.desc+'</div>';
                h += '<div class="cc-timer">'+(expired&&!c.done?'EXPIRED':hh+':'+mm+':'+ss)+'</div>';
                h += '<div class="cc-progress-wrap"><div class="cc-progress-bar" style="width:'+pct+'%"></div></div>';
                h += '<div class="cc-progress-txt">'+Math.min(c.progress||0,c.target)+' / '+c.target+'</div>';
                h += '</div>';
                h += '<div class="cc-reward">';
                if (c.claimed) h += '<span class="cc-claimed-lbl">DONE</span>';
                else if (c.done) h += '<button class="cc-claim-btn" onclick="claimContractReward(\''+c.id+'\')">+'+c.arc+' ARC +'+c.money+' ₴</button>';
                else if (expired) h += '<span class="cc-expired-lbl">FAILED</span>';
                else h += '<span class="cc-arc-lbl">+'+c.arc+' ARC +'+c.money+' ₴</span>';
                h += '</div></div>';
              });
            }

            if (_cd2.available.length > 0) {
              h += '<div class="contracts-avail-lbl">AVAILABLE (' + (3 - _cd2.active.length) + ' slots)</div>';
              _cd2.available.forEach(function(c) {
                const canAccept = _cd2.active.length < 3;
                h += '<div class="contract-card contract-card--available">';
                h += '<div class="cc-icon">'+c.icon+'</div>';
                h += '<div class="cc-body">';
                h += '<div class="cc-desc">'+c.desc+'</div>';
                h += '<div class="cc-time-limit">⏱ '+c.hours+'h time limit</div>';
                h += '</div>';
                h += '<div class="cc-reward">';
                h += '<div class="cc-arc-lbl">+'+c.arc+' ARC +'+c.money+' ₴</div>';
                h += (canAccept?'<button class="cc-accept-btn" onclick="acceptContract(\''+c.id+'\')">ACCEPT</button>':'<span class="cc-full-lbl">FULL</span>');
                h += '</div></div>';
              });
            }

            h += '<div class="contracts-footer-note">Accept up to 3 contracts. Complete before the timer runs out for ARC + ₴ rewards. ⚠️ Failing a contract costs 50% of its ₴ reward as penalty. Can\'t pay? Auto-loan at 15% interest.</div>';

            // ── Loans ─────────────────────────
            const _loans = _getLoans();
            if (_loans.active.length > 0) {
              h += '<div class="contracts-header" style="margin-top:18px;"><span class="contracts-title">🏦 ACTIVE LOANS</span><span class="contracts-refresh-lbl">Total debt: ' + getTotalDebt().toLocaleString() + ' ₴</span></div>';
              _loans.active.forEach(function(l) {
                h += '<div class="contract-card contract-card--expired">';
                h += '<div class="cc-icon">🏦</div>';
                h += '<div class="cc-body">';
                h += '<div class="cc-desc">' + (l.reason || 'Loan') + '</div>';
                h += '<div class="cc-time-limit">Principal: ' + l.amount + ' ₴ · Interest: ' + l.interest + ' ₴ · Total: ' + l.total + ' ₴</div>';
                h += '</div>';
                h += '<div class="cc-reward">';
                h += (credits >= l.total ? '<button class="cc-claim-btn" onclick="repayLoan(\'' + l.id + '\')">REPAY ' + l.total + ' ₴</button>' : '<span class="cc-expired-lbl">NEED ' + l.total + ' ₴</span>');
                h += '</div></div>';
              });
              h += '<div class="contracts-footer-note">Repay loans to clear your debt. Loans accrue 15% interest.</div>';
            }

            return h;
          })()}
        </section>
        <section class="inv-section" id="inv-sec-clan">
          ${(function(){
            const _cd = getClanData();
            const _myName = localStorage.getItem('arc_username') || 'Fighter';
            let h = '';
            if (!_cd) {
              h += '<div class="clan-split">';
              h += '<div class="clan-half">';
              h += '<div class="clan-form-title">CREATE CLAN</div>';
              h += '<input id="clan-name-inp" class="clan-inp" type="text" maxlength="24" placeholder="Clan name..." />';
              h += '<input id="clan-tag-inp"  class="clan-inp" type="text" maxlength="4"  placeholder="TAG" style="text-transform:uppercase" />';
              h += '<button class="clan-action-btn" onclick="createClan(document.getElementById(\'clan-name-inp\').value, document.getElementById(\'clan-tag-inp\').value)">Create Clan</button>';
              h += '</div><div class="clan-divider"></div>';
              h += '<div class="clan-half">';
              h += '<div class="clan-form-title">JOIN CLAN</div>';
              h += '<input id="clan-code-inp" class="clan-inp" type="text" maxlength="12" placeholder="Enter invite code..." />';
              h += '<button class="clan-action-btn clan-action-btn--join" onclick="joinClanByCode(document.getElementById(\'clan-code-inp\').value)">Join</button>';
              h += '</div></div>';
            } else {
              const _totalScore = _cd.members.reduce(function(a,m){return a+(m.score||0);},0);
              const _totalKills = _cd.members.reduce(function(a,m){return a+(m.kills||0);},0);
              const _totalArc   = _cd.members.reduce(function(a,m){return a+(m.arc||0);},0);
              const _sorted     = _cd.members.slice().sort(function(a,b){return (b.score||0)-(a.score||0);});
              h += '<div class="clan-header">';
              h += '<span class="clan-tag-badge">[' + _escHtml(_cd.tag) + ']</span>';
              h += '<span class="clan-name-big">' + _escHtml(_cd.name) + '</span>';
              h += (_cd.leader === _myName ? '<span class="clan-leader-badge">LEADER</span>' : '');
              h += '</div>';
              h += '<div class="clan-stats-row">';
              h += '<div class="clan-stat-card"><div class="csc-lbl">MEMBERS</div><div class="csc-val">' + _cd.members.length + '</div></div>';
              h += '<div class="clan-stat-card"><div class="csc-lbl">CLAN SCORE</div><div class="csc-val">' + _totalScore.toLocaleString() + '</div></div>';
              h += '<div class="clan-stat-card"><div class="csc-lbl">TOTAL KILLS</div><div class="csc-val">' + _totalKills + '</div></div>';
              h += '<div class="clan-stat-card"><div class="csc-lbl">CLAN ARC</div><div class="csc-val">' + _totalArc + '</div></div>';
              h += '</div>';
              h += '<div class="clan-invite-row">';
              h += '<span class="clan-invite-lbl">Invite Code:</span>';
              h += '<span class="clan-invite-code">' + _escHtml(_cd.code) + '</span>';
              var _safeCode = _cd.code.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
              h += '<button class="clan-copy-btn" onclick="navigator.clipboard.writeText(\'' + _safeCode + '\');this.textContent=\'COPIED!\';setTimeout(()=>this.textContent=\'COPY\',1200)">COPY</button>';
              h += '</div>';
              h += '<div class="clan-member-hdr">MEMBERS</div>';
              h += '<table class="clan-table"><thead><tr><th>#</th><th>PLAYER</th><th>WAVE</th><th>BEST</th><th>KILLS</th><th>ARC</th></tr></thead><tbody>';
              _sorted.forEach(function(m, i) {
                const isMe = m.name === _myName;
                h += '<tr class="clan-mrow' + (isMe ? ' clan-mrow--me' : '') + '">';
                h += '<td class="clan-rank">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)) + '</td>';
                h += '<td class="clan-mname">' + _escHtml(m.name) + (isMe ? ' <span class="clan-you">YOU</span>' : '') + (m.isLeader ? ' <span class="clan-leader-icon">★</span>' : '') + '</td>';
                h += '<td>' + (m.wave||'-') + '</td>';
                h += '<td class="clan-mscore">' + (m.score||0).toLocaleString() + '</td>';
                h += '<td>' + (m.kills||0) + '</td>';
                h += '<td class="clan-marc">' + (m.arc||0) + '</td>';
                h += '</tr>';
              });
              h += '</tbody></table>';
              h += '<button class="clan-leave-btn" onclick="leaveClan()">Leave Clan</button>';
            }
            return h;
          })()}
        </section>
        <section class="inv-section" id="inv-sec-pvp">
          ${(function(){
            const _myName = localStorage.getItem('arc_username') || 'Fighter';
            const _sent   = JSON.parse(localStorage.getItem('arc_pvp_sent')    || '[]');
            const _results= JSON.parse(localStorage.getItem('arc_pvp_results') || '[]');
            let h = '';

            if (_pvpChallenge) {
              const c = _pvpChallenge;
              const _age = Math.round((Date.now() - c.ts) / 3600000);
              h += '<div class="pvp-active-banner">';
              h += '<div class="pvp-active-lbl">CHALLENGE ACCEPTED</div>';
              h += '<div class="pvp-challenger-card">';
              h += '<span class="pvp-vs-badge">VS</span>';
              h += '<div class="pvp-chal-name">' + _escHtml(c.challenger) + '</div>';
              h += '<div class="pvp-chal-stats">'
                +'<span class="pvp-stat">WAVE ' + c.challengerWave + '</span>'
                +'<span class="pvp-stat">' + c.challengerKills + ' KILLS</span>'
                +'<span class="pvp-stat pvp-stat--score">' + c.challengerScore + ' PTS</span>'
                + (c.bet > 0 ? '<span class="pvp-bet-badge">' + c.bet + ' ARC BET</span>' : '')
                + '</div>';
              h += '<div class="pvp-chal-note">Beat their score in the current game to win' + (c.bet > 0 ? ' ' + Math.round(c.bet*0.95) + ' ARC' : '') + '!</div>';
              h += '</div></div>';
            } else {
              h += '<div class="pvp-create-block">';
              h += '<div class="pvp-create-title">CREATE CHALLENGE</div>';
              h += '<div class="pvp-create-sub">Dare your friends to beat your score — shared as a URL</div>';
              h += '<div class="pvp-score-display">';
              h += '<span class="pvp-score-lbl">Your current score</span>';
              h += '<span class="pvp-score-val">' + (score > 0 ? score : '–') + '</span>';
              h += '</div>';
              h += '<div class="pvp-bet-row">';
              h += '<label class="pvp-bet-lbl">ARC Bet (optional, 0-25):</label>';
              h += '<input id="pvp-bet-inp" class="pvp-bet-inp" type="number" min="0" max="25" value="0" />';
              h += '</div>';
              if (score > 0) {
                h += '<button class="pvp-challenge-btn" onclick="createPvpChallenge(document.getElementById(\'pvp-bet-inp\').value)">Generate Challenge URL</button>';
              } else {
                h += '<div class="pvp-no-score-note">Play a game first to generate a challenge based on your score!</div>';
              }
              h += '</div>';
            }

            if (_results.length > 0) {
              h += '<div class="pvp-hist-hdr">Battle History</div>';
              h += _results.map(function(r) {
                return '<div class="pvp-hist-row pvp-hist-row--' + (r.won ? 'win' : 'loss') + '">'
                  + '<span class="pvp-hist-vs">' + (r.won ? 'BEAT' : 'LOST TO') + '</span>'
                  + '<span class="pvp-hist-name">' + _escHtml(r.opponent) + '</span>'
                  + '<span class="pvp-hist-scores">' + r.myScore + ' vs ' + r.theirScore + '</span>'
                  + (r.bet > 0 ? '<span class="pvp-hist-bet">' + (r.won ? '+' + Math.round(r.bet*0.95) : '-' + r.bet) + ' ARC</span>' : '')
                  + '<span class="pvp-hist-date">' + r.date + '</span>'
                  + '</div>';
              }).join('');
            }

            return h;
          })()}
        </section>
        <!-- SEASON 2 TEASER (F16) -->
        <section class="inv-section" id="inv-sec-season2">
          ${(function(){
            const _d = getBpData();
            const _k = _d.totalKills || 0;
            const _earlyPct = Math.min(100, Math.round(_k / 3));   // 300 kills = 100% early access progress
            const _earlyDone = _earlyPct >= 100;
            let h = '<div class="s2-header">';
            h += '<div class="s2-badge">SEASON 2</div>';
            h += '<div class="s2-subtitle">Iron Frontline</div>';
            h += '</div>';
            h += '<div class="s2-countdown-lbl">Estimated launch: <strong>30 days</strong></div>';
            h += '<div class="s2-preview-grid">';
            const _s2items = [
              { icon: '\U0001f6e1\uFE0F', name: 'Tank Operator', desc: 'New playable role: Abrams crew' },
              { icon: '\u2708\uFE0F', name: 'Air Support', desc: 'Call-in F-16 strike with targeting laser' },
              { icon: '\U0001f4a3', name: 'Mine Layer', desc: 'Deploy anti-vehicle mines as traps' },
              { icon: '\U0001f525', name: 'Molotov Kit', desc: 'Area-denial incendiary drops' },
              { icon: '\U0001f3c5', name: '50 new achievements', desc: 'S2-exclusive milestone badges' },
              { icon: '\U0001fa99', name: '2× ARC rewards', desc: 'Double ARC earn rate all season' },
              { icon: '\U0001f1fa\U0001f1e6', name: 'UA City Maps', desc: 'Kyiv, Kharkiv, Bakhmut theatres' },
              { icon: '\U0001f47e', name: 'Boss Enemies', desc: 'Russian T-90 tank + Kamaz truck boss' },
            ];
            _s2items.forEach(function(item) {
              h += '<div class="s2-item">';
              h += '<div class="s2-item-icon">' + item.icon + '</div>';
              h += '<div class="s2-item-body"><div class="s2-item-name">' + item.name + '</div><div class="s2-item-desc">' + item.desc + '</div></div>';
              h += '</div>';
            });
            h += '</div>';
            // Early-access unlock bar
            h += '<div class="s2-early-hd">\u2b50 Early Access</div>';
            h += '<div class="s2-early-desc">Earn 300 total kills in Season 1 to unlock S2 early access + exclusive S2 Founder badge</div>';
            h += '<div class="s2-bar-wrap"><div class="s2-bar" style="width:' + _earlyPct + '%"></div></div>';
            h += '<div class="s2-bar-lbl">' + Math.min(_k, 300) + ' / 300 kills — ' + _earlyPct + '%' + (_earlyDone ? ' \u2705 UNLOCKED!' : '') + '</div>';
            if (_earlyDone) {
              h += '<div class="s2-unlocked-banner">\U0001f947 You qualify for Season 2 Early Access!</div>';
            }
            h += '<p class="s2-note">Season 2 content is under development. All S1 progress and ARC balance carry over.</p>';
            return h;
          })()}
        </section>

        <section class="inv-section" id="inv-sec-battlepass">
          ${(function(){
            const _d = getBpData();
            const _k = _d.totalKills || 0;
            let h = '<div class="bp-season-banner">'
              + '<span class="bp-season-lbl">SEASON ' + _BP_SEASON + '</span>'
              + '<span class="bp-kills-badge">' + _k + ' TOTAL KILLS</span>'
              + '</div>';

            h += '<div class="bp-track-hdr"><span>FREE TRACK</span></div>';
            h += '<div class="bp-tier-row">';
            _BP_FREE_TIERS.forEach(function(t) {
              const done    = _k >= t.killReq;
              const claimed = _d.freeClaimed.includes(t.tier);
              const canClaim = done && !claimed;
              h += '<div class="bp-tier' + (done ? ' bp-tier--done' : '') + (claimed ? ' bp-tier--claimed' : '') + '">';
              h += '<div class="bp-tier-icon">' + t.icon + '</div>';
              h += '<div class="bp-tier-lbl">' + t.label + '</div>';
              h += '<div class="bp-tier-req">' + t.killReq + ' kills</div>';
              h += '<div class="bp-tier-reward">' + t.reward + '</div>';
              if (canClaim)      h += '<button class="bp-claim-btn" onclick="claimBpReward(\'free\',' + t.tier + ')">CLAIM</button>';
              else if (claimed)  h += '<div class="bp-claimed-lbl">CLAIMED ✓</div>';
              else               h += '<div class="bp-locked-lbl">' + (t.killReq - _k) + ' left</div>';
              h += '</div>';
            });
            h += '</div>';

            h += '<div class="bp-track-hdr bp-track-hdr--prem">';
            h += '<span>PREMIUM TRACK</span>';
            if (!_d.premium) h += '<button class="bp-unlock-btn" onclick="unlockPremiumPass()">UNLOCK ' + _BP_PREM_COST + ' ARC</button>';
            else             h += '<span class="bp-prem-badge">PREMIUM ✓</span>';
            h += '</div>';

            h += '<div class="bp-tier-row bp-tier-row--prem' + (!_d.premium ? ' bp-tier-row--locked' : '') + '">';
            _BP_PREM_TIERS.forEach(function(t) {
              const done    = _d.premium && (_k >= t.killReq);
              const claimed = _d.premClaimed.includes(t.tier);
              const canClaim = done && !claimed;
              h += '<div class="bp-tier bp-tier--prem' + (done ? ' bp-tier--done' : '') + (claimed ? ' bp-tier--claimed' : '') + (!_d.premium ? ' bp-tier--locked' : '') + '">';
              h += '<div class="bp-tier-icon">' + t.icon + '</div>';
              h += '<div class="bp-tier-lbl">' + t.label + '</div>';
              h += '<div class="bp-tier-req">' + t.killReq + ' kills</div>';
              h += '<div class="bp-tier-reward">' + t.reward + '</div>';
              if (!_d.premium)   h += '<div class="bp-locked-lbl">PREMIUM</div>';
              else if (canClaim) h += '<button class="bp-claim-btn" onclick="claimBpReward(\'prem\',' + t.tier + ')">CLAIM</button>';
              else if (claimed)  h += '<div class="bp-claimed-lbl">CLAIMED ✓</div>';
              else               h += '<div class="bp-locked-lbl">' + (t.killReq - _k) + ' left</div>';
              h += '</div>';
            });
            h += '</div>';

            h += '<div class="bp-footer-note">Kills accumulate across all sessions this season. Premium unlocks 10 extra tiers.</div>';
            return h;
          })()}
        </section>
        <section class="inv-section" id="inv-sec-leaders">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">🏆 Leaderboard</h2>
            <p class="inv-sec-sub">Top fighters this week — ranked by score. Yours is highlighted. Resets every Monday.</p>
          </div>
          ${(()=>{
            const _myName = localStorage.getItem('arc_username') || 'Fighter';
            const _lb     = getLeaderboard();
            const _now    = new Date();
            const _daysToMon = (8 - _now.getDay()) % 7 || 7;
            const _weekNum   = Math.ceil((_now - new Date(_now.getFullYear(), 0, 1)) / 604800000);
            const _rows = _lb.slice(0,20).map((e, i) => {
              const rank     = i + 1;
              const isMe     = e.name === _myName;
              const medal    = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
              const rowCls   = isMe ? ' lb-row--me' : '';
              const streakBadge = e.streak >= 30 ? ' 🏆' : e.streak >= 7 ? ' ⚔️' : e.streak >= 3 ? ' 🔥' : '';
              const titleHtml = e.title ? ' <span class="lb-title-badge">' + _escHtml(e.title) + '</span>' : '';
              const badgeHtml = e.badge ? ' <span class="lb-badge">' + e.badge + '</span>' : '';
              const cosmFlex  = (e.cosm || 0) >= 8 ? ' <span class="lb-whale">💎</span>' : '';
              return '<tr class="lb-row' + rowCls + '">'
                + '<td class="lb-rank">' + medal + '</td>'
                + '<td class="lb-name">' + _escHtml(e.country) + ' ' + _escHtml(e.name) + badgeHtml + streakBadge + titleHtml + cosmFlex + (isMe ? ' <span class="lb-you-badge">YOU</span>' : '') + '</td>'
                + '<td class="lb-wave">W' + e.wave + '</td>'
                + '<td class="lb-kills">' + e.kills + '</td>'
                + '<td class="lb-score">' + e.score.toLocaleString() + '</td>'
                + '<td class="lb-arc">🪩' + e.arc + '</td>'
                + '</tr>';
            }).join('');
            const _myRank = _lb.findIndex(e => e.name === _myName) + 1;
            const _myRankStr = _myRank > 0 ? ('#' + _myRank + ' of ' + _lb.length) : 'Not ranked yet';
            return '<div class="lb-header-bar">'
              + '<div class="lb-week-badge">📅 Week ' + _weekNum + '</div>'
              + '<div class="lb-reset-lbl">Resets in ' + _daysToMon + ' day' + (_daysToMon===1?'':'s') + '</div>'
              + '<div class="lb-myrank">🎯 Your rank: <b>' + _myRankStr + '</b></div>'
              + '</div>'
              + '<table class="lb-table"><thead><tr>'
              + '<th>#</th><th>Player</th><th>Wave</th><th>Kills</th><th>Score</th><th>ARC</th>'
              + '</tr></thead><tbody>' + _rows + '</tbody></table>'
              + '<div class="lb-footer-note">� Personal best board. Global leaderboard sync coming with server update!</div>';
          })()}
        </section>

        <!-- ╔═══════════════ PLAYER STATS ═══════════════╗ -->
        <section class="inv-section" id="inv-sec-stats">
          <div class="inv-sec-header">
            <h2 class="inv-sec-title">📊 My Battle Stats</h2>
            <p class="inv-sec-sub">Your performance, finances and NFT portfolio — updated live</p>
          </div>
          ${(()=>{
            const _uname  = localStorage.getItem('arc_username') || 'Fighter';
            const _email  = localStorage.getItem('arc_user_email') || '—';
            const _regAt  = localStorage.getItem('arc_registered_at');
            const _regStr = _regAt ? new Date(_regAt).toLocaleDateString() : '—';
            const _nfts   = JSON.parse(localStorage.getItem('arc_nfts') || '[]');
            const _acc    = shooterShotsFired > 0
                            ? Math.round(shooterShotsHit / shooterShotsFired * 100) : 0;
            const _hsRows = [1,2,3,4].map(w => {
              const h = parseInt(localStorage.getItem('arc_wave_hs_'+w)||'0',10);
              return '<tr><td>Wave ' + w + '</td><td>' + (h ? h.toLocaleString() : '—') + '</td></tr>';
            }).join('');
            const _solBought = JSON.parse(localStorage.getItem('sol_upgrades')||'[]');
            return (
              '<div class="stats-player-card">'
              +'<div class="stats-avatar">' + proceduralPortrait(_uname, 60) + '</div>'
              +'<div class="stats-player-info">'
              +'<div class="stats-player-name">' + _uname + '</div>'
              +'<div class="stats-player-meta">Email: ' + _email + ' &nbsp;·&nbsp; Joined: ' + _regStr + '</div>'
              +'</div></div>'
              +'<div class="stats-grid">'
              +'<div class="stats-card"><div class="stats-val">' + zombieKilled.toLocaleString() + '</div><div class="stats-lbl">💀 Kills</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + credits.toLocaleString() + '</div><div class="stats-lbl">₴ Money</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + arcoins + '</div><div class="stats-lbl">🪙 ARC Balance</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + wave + '</div><div class="stats-lbl">🌊 Current Wave</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + shooterHp + '/100</div><div class="stats-lbl">❤️ Health</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + _acc + '%</div><div class="stats-lbl">🎯 Accuracy</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + shooterShotsFired.toLocaleString() + '</div><div class="stats-lbl">🔫 Shots Fired</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + shooterShotsHit.toLocaleString() + '</div><div class="stats-lbl">✅ Shots Hit</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + _nfts.length + '</div><div class="stats-lbl">🎨 Hero NFTs</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + _solBought.length + '</div><div class="stats-lbl">⚡ SOL Upgrades</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + (+(localStorage.getItem('arc_total_games')||0)) + '</div><div class="stats-lbl">🎮 Games Played</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + (function(){ var ms=+(localStorage.getItem('arc_total_playtime')||0); var h=Math.floor(ms/3600000); var m=Math.floor((ms%3600000)/60000); return h+'h '+m+'m'; })() + '</div><div class="stats-lbl">⏱ Total Playtime</div></div>'
              +'<div class="stats-card stats-streak-card"><div class="stats-val">' + parseInt(localStorage.getItem('arc_login_streak')||'0',10) + '</div><div class="stats-lbl">🔥 Day Streak</div></div>'
              +'<div class="stats-card"><div class="stats-val">' + Math.round(parseFloat(localStorage.getItem('arc_streak_multi')||'1.0')*100) + '%</div><div class="stats-lbl">⚡ ARC Rate</div></div>'
              +'</div>'
              +'<div class="stats-section-title">🔥 Streak Badges</div>'
              +'<div class="stats-streak-badges">' + _STREAK_BADGES.map(b => { const e = JSON.parse(localStorage.getItem('arc_streak_badges')||'[]').includes(b.id); return '<div class="stats-stbadge' + (e?' stats-stbadge--earned':'') + '">' + b.icon + '<div class="stats-stbadge-name">' + b.name + '</div><div class="stats-stbadge-day">Day ' + b.days + '</div><div class="stats-stbadge-bonus">+' + Math.round((b.multi-1)*100) + '% ARC</div></div>'; }).join('') + '</div>'
              +'<div class="stats-section-title" style="margin-top:16px">⚡ Kill NFT Multiplier</div>'
              +(function(){
                const _kt = getKillNftTier();
                const _tk = (getBpData ? getBpData().totalKills : 0) || 0;
                let kh = '<div class="killnft-row">';
                _KILL_NFT_TIERS.forEach(function(t) {
                  const earned = _tk >= t.kills;
                  const isActive = _kt && _kt.tier === t.tier;
                  kh += '<div class="killnft-badge' + (earned ? ' killnft-badge--earned' : '') + (isActive ? ' killnft-badge--active' : '') + '">';
                  kh += '<div class="knb-icon">' + t.icon + '</div>';
                  kh += '<div class="knb-name">' + t.name + '</div>';
                  kh += '<div class="knb-req">' + t.kills + ' kills</div>';
                  kh += '<div class="knb-multi">×' + t.multi.toFixed(2) + '</div>';
                  kh += '</div>';
                });
                kh += '</div>';
                kh += '<div class="killnft-summary">Current multiplier: <b>×' + getKillNftMulti().toFixed(2) + '</b> · Total kills: <b>' + _tk + '</b></div>';
                return kh;
              })()
              +'<div class="stats-section-title">🏆 Wave High Scores</div>'
              +'<table class="earn-hs-table"><thead><tr><th>Wave</th><th>Best Score</th></tr></thead><tbody>' + _hsRows + '</tbody></table>'
              +(godMode ? '<div class="stats-god-badge">⚡ GOD MODE ACTIVE</div>' : '')
              +'<div class="stats-section-title" style="margin-top:20px">💾 Save & Restore</div>'
              +'<div class="stats-save-panel">'
              +'<p style="color:#FFD700;margin:0 0 10px">Your progress is stored in this browser. Export to back up or transfer to another device.</p>'
              +'<div class="stats-save-btns">'
              +'<button class="inv-action-btn" id="arc-export-btn" style="background:#1a6b1a">📥 Export Save</button>'
              +'<label class="inv-action-btn" style="background:#1a4a6b;cursor:pointer">📤 Import Save<input type="file" id="arc-import-file" accept=".json" style="display:none"></label>'
              +'<button class="inv-action-btn" id="arc-clear-btn" style="background:#6b1a1a">🗑️ Clear All Data</button>'
              +'</div>'
              +'<div class="stats-save-info" style="color:#888;font-size:11px;margin-top:8px">' + _ARC_DB_KEYS.filter(function(k){return localStorage.getItem(k)!==null;}).length + ' keys stored · Last export: ' + (localStorage.getItem('arc_last_export')||'never') + '</div>'
              +'</div>'
            );
          })()}
        </section>

      </div><!-- /.inv-sections -->
      </div><!-- /.inv-onepage-wrap -->
    `);


    // ── CashApp copy button ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    $p.off('click.cashapp').on('click.cashapp', '#cashapp-copy-tag', function () {
      navigator.clipboard && navigator.clipboard.writeText('$photonbounce').catch(()=>{});
      $(this).text('✅ Copied!').css('background', 'rgba(0,200,80,.15)');
      setTimeout(() => $(this).text('📋 Copy $photonbounce').css('background', ''), 2200);
    });

    // ── Export / Import / Clear save buttons ─────────────────────
    $p.off('click.arcexport').on('click.arcexport', '#arc-export-btn', function() {
      localStorage.setItem('arc_last_export', new Date().toISOString().slice(0,10));
      arcDB_export();
    });
    $p.off('change.arcimport').on('change.arcimport', '#arc-import-file', function() {
      arcDB_import(this.files[0]);
      this.value = '';
    });
    $p.off('click.arcclear').on('click.arcclear', '#arc-clear-btn', function() {
      arcDB_clear();
    });

    // ── Inventory joke ticker (populate + animate) ────────────────
    (function _runInvTicker() {
      const jokes = (_tickerJokes && _tickerJokes.length) ? _tickerJokes : _FALLBACK_JOKES;
      const $el = $('#inv-ticker-inner');
      if (!$el.length || !jokes.length) return;
      let idx = Math.floor(Math.random() * jokes.length);
      let _invTickerTimer = null;
      function next() {
        const txt = '😂 ' + jokes[idx % jokes.length] + '\u2003\u2003⚡\u2003\u2003';
        idx = (idx + 1) % jokes.length;
        $el.text(txt);
        const trackW = $('#inv-ticker-strip .inv-ticker-track').outerWidth() || 500;
        const textW  = $el[0].scrollWidth || 700;
        const dur    = Math.round((trackW + textW) / 80 * 1000);
        $el.css({ transform: 'translateY(-50%) translateX(' + trackW + 'px)', transition: 'none' });
        requestAnimationFrame(function() {
          $el.css({ transition: 'transform ' + dur + 'ms linear', transform: 'translateY(-50%) translateX(-' + textW + 'px)' });
        });
        _invTickerTimer = setTimeout(next, dur + 600);
      }
      next();
      // Stop when inventory closes
      $p.one('remove', function() { clearTimeout(_invTickerTimer); });
    })();

    // Wire up the inv-ticker submit button to same modal
    $p.off('click.invtickersubmit').on('click.invtickersubmit', '#inv-ticker-submit-btn', function() {
      $('#joke-submit-modal').addClass('open');
      $('#joke-submit-text').val('').trigger('input').focus();
      $('#joke-submit-msg').hide();
    });

    // ── Market tab switcher ─────────────────────────────────────
    $p.off('click.mktab').on('click.mktab', '.inv-market-tab-btn', function() {
      const tab = $(this).data('mtab');
      $p.find('.inv-market-tab-btn').removeClass('active');
      $(this).addClass('active');
      $p.find('.inv-market-tab').addClass('hidden');
      $p.find('#inv-mtab-' + tab).removeClass('hidden');
      if (tab === 'blackmarket') setTimeout(_bmRenderListings, 50);
      if (tab === 'escrow')      setTimeout(_bmRenderEscrow, 50);
    });

    // ── Market buy buttons ──────────────────────────────────────
    $p.off('click.mktbuy').on('click.mktbuy', '.inv-market-buy-btn', function() {
      const item     = $(this).data('item');
      const currency = $(this).data('currency');
      const cost     = parseFloat($(this).data('cost'));

      // ── SOL crypto payment via wallet ──
      if (currency === 'sol') {
        _solMarketBuy(item, cost);
        return;
      }

      // ── Check if weapon already owned — refund before deduction ──
      const _wepOwned = {
        wep_shotgun: shotgunUnlocked, wep_m16: m16Unlocked, wep_sniper: sniperUnlocked,
        wep_lmg: lmgUnlocked, wep_clay: clayUnlocked, wep_gl: glUnlocked
      };
      if (item in _wepOwned && _wepOwned[item]) { shooterSpeech('✅ Already owned!'); return; }

      // ── Deduct currency ──
      if (currency === 'arc') {
        if (arcoins < cost) { sndError(); showArcUpsell(cost); return; }
        arcoins -= cost;
        localStorage.setItem('arc_balance', String(arcoins));
      } else {
        if (credits < cost) { sndError(); shooterSpeech('₴ Not enough credits!'); return; }
        credits -= cost;
      }
      sndPurchase();
      // ── Fulfil item ──
      if      (item === 'wep_shotgun')  equipShotgun();
      else if (item === 'wep_m16')     equipM16();
      else if (item === 'wep_sniper')  equipSniper();
      else if (item === 'wep_lmg')     equipLMG();
      else if (item === 'wep_gl')      equipGL();
      else if (item === 'wep_nlaw')    equipNlaw();
      else if (item === 'wep_matador') equipMatador();
      else if (item === 'wep_clay')    equipClay();
      else if (item === 'ammo500')    { Object.keys(ammoReserve).forEach(k => { ammoReserve[k] += 5; }); shooterSpeech('📦 +5 mags added!'); }
      else if (item === 'ammo_bulk')  { Object.keys(ammoReserve).forEach(k => { ammoReserve[k] += 15; }); shooterSpeech('🗃️ +15 mags added!'); }
      else if (item === 'cred1000')   { credits += 1000;  shooterSpeech('₴ +1,000 credits!'); }
      else if (item === 'cred5000')   { credits += 5000;  shooterSpeech('₴ +5,000 credits!'); }
      else if (item === 'arc50')      { arcoins += 50;  localStorage.setItem('arc_balance', String(arcoins)); shooterSpeech('🪙 +50 ARC!'); }
      else if (item === 'arc200')     { arcoins += 200; localStorage.setItem('arc_balance', String(arcoins)); shooterSpeech('🏆 +200 ARC!'); }
      updateScoreHUD();
      buildInventory();
    });

    // ── SOL Market Buy (via Phantom or MetaMask) ──────────────────
    function _solMarketBuy(item, solPrice) {
      var UA_SOL='2ZTzZvBWCb6TsNZLgK8iHULkREopQBdj3PEb6AgxG89s';
      var UA_ETH='0x165CD37b4C644C2921454429E7F9358d18A45e14';
      function _fulfil() {
        // Same fulfillment as non-SOL path
        if      (item === 'wep_shotgun')  equipShotgun();
        else if (item === 'wep_m16')     equipM16();
        else if (item === 'wep_sniper')  equipSniper();
        else if (item === 'wep_lmg')     equipLMG();
        else if (item === 'wep_gl')      equipGL();
        else if (item === 'wep_nlaw')    equipNlaw();
        else if (item === 'wep_matador') equipMatador();
        else if (item === 'wep_clay')    equipClay();
        else if (item === 'ammo500')    { Object.keys(ammoReserve).forEach(k => { ammoReserve[k] += 5; }); }
        else if (item === 'ammo_bulk')  { Object.keys(ammoReserve).forEach(k => { ammoReserve[k] += 15; }); }
        else if (item === 'cred1000')   { credits += 1000; }
        else if (item === 'cred5000')   { credits += 5000; }
        else if (item === 'arc50')      { arcoins += 50;  localStorage.setItem('arc_balance', String(arcoins)); }
        else if (item === 'arc200')     { arcoins += 200; localStorage.setItem('arc_balance', String(arcoins)); }
        updateScoreHUD();
        buildInventory();
      }
      if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        window.solana.connect().then(function(resp) {
          shooterSpeech('◎ Confirm in Phantom...');
          // Build SOL transfer instruction via web3
          try {
            var conn = new (window.solanaWeb3 || {}).Connection('https://api.mainnet-beta.solana.com');
            var tx = new (window.solanaWeb3 || {}).Transaction().add(
              (window.solanaWeb3 || {}).SystemProgram.transfer({
                fromPubkey: resp.publicKey,
                toPubkey: new (window.solanaWeb3 || {}).PublicKey(UA_SOL),
                lamports: Math.round(solPrice * 1e9)
              })
            );
            window.solana.signAndSendTransaction(tx).then(function(sig) {
              _fulfil();
              showConfirm({title:'✅ SOL Purchase!', body:'<b>' + item.replace('wep_','').toUpperCase() + '</b> activated!<br>◎ ' + solPrice + ' SOL · 10% → UA Army 🇺🇦<br><a href="https://solscan.io/tx/' + sig.signature + '" target="_blank" style="color:#adf">View Tx ↗</a>', confirmTxt:'🎮 Play On', cancelTxt:false});
            }).catch(function() { shooterSpeech('❌ Transaction rejected'); });
          } catch(e) {
            // Fallback: if solanaWeb3 SDK not loaded, show install prompt
            shooterSpeech('❌ Solana SDK not available');
            showConfirm({title:'⚠️ SDK Missing', body:'Solana Web3 library is required for SOL purchases. Please use MetaMask (Polygon) instead.', confirmTxt:'OK', cancelTxt:false});
          }
        }).catch(function() { shooterSpeech('❌ Phantom rejected'); });
      } else if (typeof window.ethereum !== 'undefined') {
        // MetaMask / Polygon — convert SOL price to POL equivalent (approx rate)
        var polPrice = solPrice;  // 1:1 mapping — both are small-value tokens
        var weiHex = '0x' + Math.round(polPrice * 1e18).toString(16);
        window.ethereum.request({method:'eth_requestAccounts'}).then(function(acc) {
          window.ethereum.request({method:'eth_sendTransaction', params:[{from:acc[0], to:UA_ETH, value:weiHex, gas:'0x5208'}]}).then(function(tx) {
            _fulfil();
            showConfirm({title:'✅ Crypto Purchase!', body:'Item delivered!<br>10% → UA Army 🇺🇦<br><a href="https://polygonscan.com/tx/' + tx + '" target="_blank" style="color:#adf">Tx ↗</a>', confirmTxt:'🎮 Play On', cancelTxt:false});
          }).catch(function() { shooterSpeech('❌ Tx rejected'); });
        }).catch(function() { shooterSpeech('❌ Wallet not connected'); });
      } else {
        showConfirm({title:'💼 No Wallet', body:'Install <b>Phantom</b> (Solana) or <b>MetaMask</b> (Polygon) to buy with crypto.<br>10% of all crypto purchases supports Ukraine 🇺🇦', confirmTxt:'🦊 Get MetaMask', onConfirm:function(){window.open('https://metamask.io','_blank');}});
      }
    }

    // ── Black Market: render listings & escrow ─────────────────
    function _bmRenderListings() {
      let listings; try { listings = JSON.parse(localStorage.getItem('bm_listings') || '[]'); } catch(e) { listings = []; }
      const $c = $p.find('#bm-listings-container');
      if (!$c.length) return;
      if (listings.length === 0) {
        $c.html('<div class="bm-empty">No listings yet. Be the first to post!</div>'); return;
      }
      const ITEM_LABELS = { credits:'₴ Credits', arc:'🪙 ARC', ammo:'📦 Magazines',
        wep_shotgun:'💥 Shotgun', wep_m16:'🔫 M-16', wep_sniper:'🎯 Sniper',
        wep_lmg:'⚙️ LMG', wep_gl:'💣 GL', wep_nlaw:'🎯 NLAW', wep_matador:'🚀 Matador' };
      $c.html(listings.map(function(l, i) {
        return '<div class="bm-card">' +
          '<span class="bm-card-item">' + (ITEM_LABELS[l.item] || l.item) + ' ×' + l.qty + '</span>' +
          '<span class="bm-card-price">' + (l.priceType === 'arc' ? '🪙' : l.priceType === 'sol' ? '◎' : '₴') + ' ' + l.price + '</span>' +
          '<span class="bm-card-seller">🕵️ Anonymous</span>' +
          '<div class="bm-card-btns">' +
            '<button class="bm-buy-btn" data-idx="' + i + '">🛒 Buy</button>' +
            (l._mine ? '<button class="bm-cancel-btn" data-idx="' + i + '">✖ Cancel</button>' : '') +
          '</div></div>';
      }).join(''));
    }
    function _bmRenderEscrow() {
      let escrows; try { escrows = JSON.parse(localStorage.getItem('bm_escrow') || '[]'); } catch(e) { escrows = []; }
      const $c = $p.find('#bm-escrow-container');
      if (!$c.length) return;
      if (escrows.length === 0) {
        $c.html('<div class="bm-empty">No pending escrow contracts.</div>'); return;
      }
      $c.html(escrows.map(function(e, i) {
        return '<div class="bm-escrow-card">' +
          '<div class="bm-esc-title">Contract #' + (i+1) + '</div>' +
          '<div class="bm-esc-row"><b>Item:</b> ' + e.item + ' ×' + e.qty + '</div>' +
          '<div class="bm-esc-row"><b>Price:</b> ' + (e.priceType==='arc'?'🪙':e.priceType==='sol'?'◎':'₴') + ' ' + e.price + '</div>' +
          '<div class="bm-esc-row"><b>Status:</b> <span class="bm-esc-status">⏳ Awaiting confirmation</span></div>' +
          '<div class="bm-esc-btns">' +
            '<button class="bm-esc-confirm-btn" data-idx="' + i + '">✅ Confirm &amp; Release</button>' +
            '<button class="bm-esc-cancel-btn"  data-idx="' + i + '">❌ Cancel</button>' +
          '</div></div>';
      }).join(''));
    }
    // Post listing
    $p.off('click.bmpost').on('click.bmpost', '#bm-post-listing', function() {
      const item  = $p.find('#bm-item-type').val();
      const qty   = parseInt($p.find('#bm-qty').val()) || 0;
      const ptype = $p.find('#bm-price-type').val();
      const price = parseInt($p.find('#bm-price').val()) || 0;
      if (qty <= 0 || price <= 0) { shooterSpeech('❌ Enter qty and price'); return; }
      let listings; try { listings = JSON.parse(localStorage.getItem('bm_listings') || '[]'); } catch(e) { listings = []; }
      listings.push({ item, qty, price, priceType: ptype, ts: Date.now(), _mine: true });
      localStorage.setItem('bm_listings', JSON.stringify(listings));
      $p.find('#bm-qty').val(''); $p.find('#bm-price').val('');
      shooterSpeech('📤 Listing posted!');
      _bmRenderListings();
    });
    // Buy from listing → moves to escrow
    $p.off('click.bmbuy').on('click.bmbuy', '.bm-buy-btn', function() {
      const idx = parseInt($(this).data('idx'));
      const listings = JSON.parse(localStorage.getItem('bm_listings') || '[]');
      const l = listings[idx]; if (!l) return;
      // Check buyer can afford
      if (l.priceType === 'arc'     && arcoins < l.price) { shooterSpeech('🪙 Not enough ARC!'); return; }
      if (l.priceType === 'credits' && credits < l.price) { shooterSpeech('💲 Not enough credits!'); return; }
      // Deduct payment (escrow hold)
      if (l.priceType === 'arc')     { arcoins -= l.price; localStorage.setItem('arc_balance', String(arcoins)); }
      else                           { credits -= l.price; }
      // Remove listing, add to escrow
      listings.splice(idx, 1);
      localStorage.setItem('bm_listings', JSON.stringify(listings));
      const escrows = JSON.parse(localStorage.getItem('bm_escrow') || '[]');
      escrows.push({ ...l, buyTs: Date.now() });
      localStorage.setItem('bm_escrow', JSON.stringify(escrows));
      updateScoreHUD();
      _bmRenderListings();
      // Switch to escrow tab
      $p.find('.inv-market-tab-btn').removeClass('active');
      $p.find('[data-mtab=escrow]').addClass('active');
      $p.find('.inv-market-tab').addClass('hidden');
      $p.find('#inv-mtab-escrow').removeClass('hidden');
      _bmRenderEscrow();
      shooterSpeech('🔒 Trade in escrow — confirm to receive item!');
    });
    // Cancel listing
    $p.off('click.bmcancel').on('click.bmcancel', '.bm-cancel-btn', function() {
      const idx = parseInt($(this).data('idx'));
      const listings = JSON.parse(localStorage.getItem('bm_listings') || '[]');
      listings.splice(idx, 1);
      localStorage.setItem('bm_listings', JSON.stringify(listings));
      _bmRenderListings();
      shooterSpeech('✖ Listing cancelled');
    });
    // Escrow confirm → release item to buyer
    $p.off('click.bmescconf').on('click.bmescconf', '.bm-esc-confirm-btn', function() {
      const idx = parseInt($(this).data('idx'));
      const escrows = JSON.parse(localStorage.getItem('bm_escrow') || '[]');
      const e = escrows[idx]; if (!e) return;
      // Deliver item
      const ITEM_DELIVER = {
        credits: () => { credits += e.qty * 100; shooterSpeech('₴ +' + (e.qty*100) + ' credits received!'); },
        arc:     () => { arcoins += e.qty; localStorage.setItem('arc_balance', String(arcoins)); shooterSpeech('🪙 +' + e.qty + ' ARC received!'); },
        ammo:    () => { Object.keys(ammoReserve).forEach(k => { ammoReserve[k] += e.qty * 5; }); shooterSpeech('📦 Ammo delivered!'); },
        wep_shotgun:  () => { if (!shotgunUnlocked) equipShotgun(); else shooterSpeech('💥 Shotgun unlocked!'); },
        wep_m16:      () => { if (!m16Unlocked)     equipM16();     else shooterSpeech('🔫 M-16!'); },
        wep_sniper:   () => { if (!sniperUnlocked)  equipSniper();  else shooterSpeech('🎯 Sniper!'); },
        wep_lmg:      () => { if (!lmgUnlocked)     equipLMG();     else shooterSpeech('⚙️ LMG!'); },
        wep_gl:       () => { if (!glUnlocked)       equipGL();      else shooterSpeech('💣 GL!'); },
        wep_nlaw:     () => { equipNlaw(); },
        wep_matador:  () => { equipMatador(); },
      };
      (ITEM_DELIVER[e.item] || (() => shooterSpeech('✅ Item received!')))();
      escrows.splice(idx, 1);
      localStorage.setItem('bm_escrow', JSON.stringify(escrows));
      updateScoreHUD();
      _bmRenderEscrow();
    });
    // Escrow cancel → refund
    $p.off('click.bmesccnc').on('click.bmesccnc', '.bm-esc-cancel-btn', function() {
      const idx = parseInt($(this).data('idx'));
      const escrows = JSON.parse(localStorage.getItem('bm_escrow') || '[]');
      const e = escrows[idx]; if (!e) return;
      // Refund payment
      if (e.priceType === 'arc')     { arcoins += e.price; localStorage.setItem('arc_balance', String(arcoins)); }
      else                           { credits += e.price; }
      escrows.splice(idx, 1);
      localStorage.setItem('bm_escrow', JSON.stringify(escrows));
      updateScoreHUD();
      _bmRenderEscrow();
      shooterSpeech('↩️ Trade cancelled — refunded');
    });
    // Initial render when market tab opens
    $p.find('#inv-mtab-blackmarket').length && _bmRenderListings();
    $p.find('#inv-mtab-escrow').length      && _bmRenderEscrow();

    // ── Exchange section info toggle ────────────────────────────
    $p.off('click.exchinfo').on('click.exchinfo', '.exch-info-btn', function() {
      const id = '#exch-info-' + $(this).data('info');
      const $panel = $p.find(id);
      const isOpen = $panel.hasClass('exch-info-open');
      $p.find('.exch-info-panel').removeClass('exch-info-open');
      if (!isOpen) $panel.addClass('exch-info-open');
    });

    // ── NFT List for POL ─────────────────────────────────────────
    $p.off('click.nftlist').on('click.nftlist', '.nft-list-btn', function() {
      const nid      = $(this).data('nid');
      const rawName  = decodeURIComponent($(this).data('name') || '');
      const rarity   = $(this).data('rarity') || 'common';
      const $input   = $('<input type="number" min="0.01" max="100" step="0.01" ' +
                         'style="width:100%;margin-top:8px;padding:6px 8px;background:#0d1f0d;' +
                         'border:1px solid rgba(255,215,0,.4);border-radius:6px;color:#FFD700;' +
                         'font-size:16px;font-family:Oswald,sans-serif;box-sizing:border-box;" ' +
                         'placeholder="Price in POL e.g. 0.05" value="0.05">');
      showConfirm({
        title: '📤 List NFT for Sale',
        body: '<b style="color:#FFD700">' + rawName + '</b> (' + rarity.toUpperCase() + ')<br>' +
              '<span style="opacity:.7;font-size:12px">Enter your asking price in POL (Polygon):</span>' +
              $input[0].outerHTML,
        confirmTxt: '📤 List It',
        onConfirm: function() {
          const price = parseFloat($('.confirm-box input[type=number]').val()) || 0;
          if (price <= 0) { shooterSpeech('❌ Enter a valid POL price'); return; }
          // Move NFT to listings
          const owned = JSON.parse(localStorage.getItem('arc_nfts') || '[]');
          const nft   = owned.find(function(n){ return n.id === nid; });
          if (!nft) { shooterSpeech('NFT not found'); return; }
          const listings = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
          listings.push({
            listingId:   'L' + Date.now(),
            nftId:       nft.id,
            name:        nft.name,
            rarity:      nft.rarity,
            img:         nft.img,
            wave:        nft.wave || 1,
            sellerCode:  localStorage.getItem('arc_ref_code') || '',
            sellerName:  localStorage.getItem('arc_username')  || 'Anonymous',
            polPrice:    price.toFixed(3),
            listedAt:    Date.now(),
          });
          localStorage.setItem('arc_p2p_listings', JSON.stringify(listings));
          // Remove from owned (NFT is now escrowed in the listing)
          localStorage.setItem('arc_nfts', JSON.stringify(owned.filter(function(n){ return n.id !== nid; })));
          _invLastSection = 'inv-sec-nfts';
          buildInventory();
          showConfirm({ title: '✅ NFT Listed!',
            body: '<b>' + nft.name + '</b> is now listed for <b style="color:#FFD700">' + price.toFixed(3) + ' POL</b>.<br>' +
                  '<small style="opacity:.6">Visible in Market → P2P tab. Fulfilled at token launch.</small>',
            confirmTxt: '🎮 OK', cancelTxt: false });
        },
      });
      // After showConfirm renders, focus the input
      setTimeout(function() { $('.confirm-box input[type=number]').trigger('focus'); }, 80);
    });

    // ── NFT Delist (from Heroes tab) ─────────────────────────────
    $p.off('click.nftdelist').on('click.nftdelist', '.nft-delist-btn', function() {
      const nid = $(this).data('nid');
      showConfirm({
        title: '✕ Delist NFT',
        body: 'Remove this NFT from the P2P marketplace?<br><small style="opacity:.6">It will return to your collection.</small>',
        confirmTxt: '✕ Delist',
        danger: true,
        onConfirm: function() {
          const listings = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
          const listing  = listings.find(function(l){ return l.nftId === nid; });
          if (!listing) return;
          // Return NFT to owned
          const owned = JSON.parse(localStorage.getItem('arc_nfts') || '[]');
          owned.push({ id: listing.nftId, name: listing.name, rarity: listing.rarity,
                       img: listing.img, wave: listing.wave || 1, mintedAt: listing.listedAt, reward: null });
          localStorage.setItem('arc_nfts', JSON.stringify(owned));
          localStorage.setItem('arc_p2p_listings',
            JSON.stringify(listings.filter(function(l){ return l.nftId !== nid; })));
          _invLastSection = 'inv-sec-nfts';
          buildInventory();
        },
      });
    });

    // ── P2P Delist (from Market tab) ─────────────────────────────
    $p.off('click.p2pdelist').on('click.p2pdelist', '.p2p-delist-btn', function() {
      const lid = $(this).data('lid');
      showConfirm({
        title: '✕ Delist Listing',
        body: 'Remove this listing from the marketplace? The NFT returns to your Heroes collection.',
        confirmTxt: '✕ Delist',
        danger: true,
        onConfirm: function() {
          const listings = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
          const listing  = listings.find(function(l){ return l.listingId === lid; });
          if (!listing) return;
          const owned = JSON.parse(localStorage.getItem('arc_nfts') || '[]');
          owned.push({ id: listing.nftId, name: listing.name, rarity: listing.rarity,
                       img: listing.img, wave: listing.wave || 1, mintedAt: Date.now(), reward: null });
          localStorage.setItem('arc_nfts', JSON.stringify(owned));
          localStorage.setItem('arc_p2p_listings',
            JSON.stringify(listings.filter(function(l){ return l.listingId !== lid; })));
          _invLastSection = 'inv-sec-market';
          buildInventory();
        },
      });
    });

    // ── P2P Buy NFT ──────────────────────────────────────────────
    $p.off('click.p2pbuy').on('click.p2pbuy', '.p2p-buy-btn', function() {
      const lid  = $(this).data('lid');
      const pol  = $(this).data('pol');
      const listings = JSON.parse(localStorage.getItem('arc_p2p_listings') || '[]');
      const listing  = listings.find(function(l){ return l.listingId === lid; });
      if (!listing) return;
      showConfirm({
        title: '🛒 Buy NFT',
        body: '<b style="color:#FFD700">' + listing.name + '</b> (' + listing.rarity.toUpperCase() + ')<br>' +
              'Price: <b style="color:#FFD700">' + pol + ' POL</b><br>' +
              'Listed by: ' + listing.sellerName + '<br>' +
              '<small style="opacity:.6">Payment processed at Token Generation Event when ARC launches on Polygon. ' +
              'NFT is moved to your collection now as a binding reservation.</small>',
        confirmTxt: '🛒 Reserve for ' + pol + ' POL',
        onConfirm: function() {
          // Move NFT to buyer's collection, record purchase intent
          const owned = JSON.parse(localStorage.getItem('arc_nfts') || '[]');
          owned.push({ id: listing.nftId, name: listing.name, rarity: listing.rarity,
                       img: listing.img, wave: listing.wave || 1, mintedAt: Date.now(),
                       reward: null, boughtFor: pol + ' POL', sellerCode: listing.sellerCode });
          localStorage.setItem('arc_nfts', JSON.stringify(owned));
          // Remove from listings
          const remaining = listings.filter(function(l){ return l.listingId !== lid; });
          localStorage.setItem('arc_p2p_listings', JSON.stringify(remaining));
          // Record purchase for seller (they get credit confirmation)
          const sales = JSON.parse(localStorage.getItem('arc_p2p_sales') || '[]');
          sales.push({ listing: listing, buyerCode: localStorage.getItem('arc_ref_code') || '',
                       buyerName: localStorage.getItem('arc_username') || 'Anonymous',
                       soldAt: Date.now(), polPrice: pol });
          localStorage.setItem('arc_p2p_sales', JSON.stringify(sales));
          _invLastSection = 'inv-sec-market';
          buildInventory();
          showConfirm({ title: '✅ NFT Reserved!',
            body: '<b>' + listing.name + '</b> is now in your Heroes collection.<br>' +
                  'Pay <b style="color:#FFD700">' + pol + ' POL</b> to seller at launch to finalise transfer.',
            confirmTxt: '🎮 Awesome!', cancelTxt: false });
        },
      });
    });

    // ── Scroll-spy: highlight nav button as sections come into view ──
    if ($p.data('_invObs')) $p.data('_invObs').disconnect();
    const _invObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          $p.find('.inv-nav-btn').removeClass('active');
          const $btn = $p.find(`.inv-nav-btn[data-target="${id}"]`).addClass('active');
          if ($btn[0]) $btn[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          _invLastSection = id;
          if (id === 'inv-sec-news') _loadUANews();
        }
      });
    }, { root: $p[0], threshold: 0.18 });
    $p.data('_invObs', _invObserver);
    $p.find('.inv-section').each(function() { _invObserver.observe(this); });

    // ── News source selector + refresh ──
    $p.off('click.uanews').on('click.uanews', '.inv-news-src-btn', function() {
      _loadUANews($(this).data('src'));
    }).on('click.uanews', '#ua-news-refresh', function() {
      _loadUANews(_uaNewsCurSrc, true);
    });

    // ── Nav click: smooth-scroll to section ──
    $p.off('click.invnav').on('click.invnav', '.inv-nav-btn', function() {
      const tid = $(this).data('target');
      const el  = $p[0].querySelector('#' + tid);
      if (!el) return;
      // Only subtract sticky topbar height (nav sidebar is position:fixed, doesn't affect scroll)
      const navH = $p.find('.inv-topbar').outerHeight(true) || 0;
      $p[0].scrollTo({ top: el.offsetTop - navH + 4, behavior: 'smooth' });
      $p.find('.inv-nav-btn').removeClass('active');
      $(this).addClass('active');
      this.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      _invLastSection = tid;
    });

    // ── Restore last scroll position after rebuild ──
    requestAnimationFrame(() => {
      const el = $p[0].querySelector('#' + _invLastSection);
      if (el) {
        const navH = $p.find('.inv-topbar').outerHeight(true) || 0;
        $p[0].scrollTop = Math.max(0, el.offsetTop - navH + 4);
      }
    });

    // ── Buy ammo ──
    $p.off('click.ammo').on('click.ammo', '.inv-ammo-buy-btn:not([disabled])', function () {
      const wname = $(this).data('ammo-weapon');
      const qty   = parseInt($(this).data('ammo-qty'), 10);
      const cost  = parseInt($(this).data('ammo-cost'), 10);
      if (credits < cost) {
        $(this).addClass('inv-upg--shake');
        setTimeout(() => $(this).removeClass('inv-upg--shake'), 380);
        return;
      }
      showConfirm({ title:'🔋 Buy Ammo?', body:'Purchase <b>+' + qty + ' mags</b> for <b>' + cost + ' ₴</b>?', confirmTxt:'Buy', onConfirm: function() {
        credits -= cost;
        sndPurchase();
        ammoReserve[wname] = (ammoReserve[wname] || 0) + qty;
        updateScoreHUD();
        _invLastSection = 'inv-sec-ammo';
        buildInventory();
      }});
    });

    // ── Daily spin ──
    $p.off('click.spin').on('click.spin', '#earn-spin-btn:not([disabled])', function () {
      doSpinWheel();
    });

    // ── Paid extra spin ──
    $p.off('click.paidspin').on('click.paidspin', '#earn-paid-spin-btn:not([disabled])', function () {
      doSpinWheel(true);
    });

    // ── Daily deals buy ──
    $p.off('click.ddeal').on('click.ddeal', '.dd-buy-btn', function () {
      var $card = $(this).closest('.dd-card');
      var _cid = $card.data('cosm-id');
      var _cprice = $card.data('price');
      var $btn = $(this);
      if (arcoins < _cprice) { shooterSpeech('Not enough ARC!'); return; }
      showConfirm({ title:'🔥 Buy Deal?', body:'Spend <b>' + _cprice + ' ARC</b> on this item?', confirmTxt:'Buy', onConfirm: function() {
        arcoins -= _cprice;
        localStorage.setItem('arc_balance', String(arcoins));
        var owned = getOwnedCosmetics(); owned.push(_cid);
        localStorage.setItem('arc_cosmetics', JSON.stringify(owned));
        shooterSpeech('🎉 Deal claimed! -' + _cprice + ' ARC');
        $btn.replaceWith('<span class="dd-owned">✅ OWNED</span>');
      updateScoreHUD();
      }});
    });

    // ── Copy referral link ──
    $p.off('click.ref').on('click.ref', '#earn-ref-copy-btn', function () {
      const url = $(this).attr('data-url') || '';
      const $btn = $(this);
      // Robust copy — works on file:// and non-HTTPS
      function _doCopy() {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(ok).catch(fallback);
        } else { fallback(); }
      }
      function ok() {
        $btn.text('✅ Copied!');
        setTimeout(() => $btn.text('\uD83D\uDCCB Copy Invite Link'), 2200);
      }
      function fallback() {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand('copy'); ok(); } catch(e) { prompt('Copy your invite link:', url); }
        document.body.removeChild(ta);
      }
      _doCopy();
    });

    // ── God mode toggle inside armory ──
    $p.off('click.godtoggle').on('click.godtoggle', '#inv-god-toggle-btn', function () {
      godMode = !godMode;
      $godMode.toggleClass('enabled', godMode);
      $canves.toggleClass('god-mode-on', godMode);
      $(this).toggleClass('active', godMode);
      _invLastSection = _invLastSection || 'inv-sec-armory';
      buildInventory();
    });

    // ── Memorial hero → Mint as NFT ──
    $p.off('click.memorialmint').on('click.memorialmint', '.memorial-mint-btn', function (e) {
      e.stopPropagation();
      var hn = decodeURIComponent($(this).data('hname'));
      var hu = decodeURIComponent($(this).data('hunit'));
      var hb = decodeURIComponent($(this).data('hbio'));
      _invLastSection = 'inv-sec-nfts';
      buildInventory();
      setTimeout(function () {
        if ($('#nft-hero-name').length) { $('#nft-hero-name').val(hn); }
        if ($('#nft-hero-unit').length) { $('#nft-hero-unit').val(hu); }
        if ($('#nft-hero-bio').length)  { $('#nft-hero-bio').val(hb);  }
        shooterSpeech('🪙 NFT pre-filled for ' + hn.split(' ').pop());
      }, 80);
    });

    // ── Pre-mint hero reservation ──
    $p.off('click.premint').on('click.premint', '.memorial-premint-btn', function (e) {
      e.stopPropagation();
      var btn = $(this);
      var hn = decodeURIComponent(btn.data('hname'));
      var rarity = btn.data('hrarity') || 'common';
      var premints = JSON.parse(localStorage.getItem('arc_premint_heroes') || '[]');
      if (premints.some(function(p){ return p.name === hn; })) {
        showConfirm({ title: '⏳ Already Reserved', body: '<b>' + hn + '</b> is already in your pre-mint queue.', confirmTxt: 'OK', cancelTxt: false });
        return;
      }
      showConfirm({
        title: '⏳ Pre-Mint Hero NFT',
        body: 'Reserve <b>' + hn + '</b> (' + rarity.toUpperCase() + ')<br>Cost: <b>0.5 POL</b><br><small>10% goes to Ukrainian Army Fund 🇺🇦</small><br><small>Actual minting at Token Generation Event</small>',
        confirmTxt: '✅ Reserve for 0.5 POL',
        onConfirm: function () {
          premints.push({ name: hn, rarity: rarity, paid: '0.5', ts: Date.now() });
          localStorage.setItem('arc_premint_heroes', JSON.stringify(premints));
          // Log as UA donation
          var donations = JSON.parse(localStorage.getItem('arc_ua_donations') || '[]');
          donations.push({ date: new Date().toISOString().slice(0,10), amount: '0.05 POL', source: 'Pre-mint 10%', tx: '' });
          localStorage.setItem('arc_ua_donations', JSON.stringify(donations));
          var totalUsd = +(localStorage.getItem('arc_ua_donated_usd')||0) + 0.02;
          localStorage.setItem('arc_ua_donated_usd', totalUsd.toFixed(2));
          shooterSpeech('⏳ ' + hn.split(' ').pop() + ' reserved!');
          _invLastSection = 'inv-sec-myheroes';
          buildInventory();
        }
      });
    });

    // ── NPC Market buy/sell handlers ──
    $p.off('click.npcbuy').on('click.npcbuy', '.bm-npc-buy-btn', function () {
      var npcId = $(this).data('npc-id');
      var npcPrices = { npc_ammo5: 3, npc_shotgun: 7, npc_cr500: 2, npc_m16: 10, npc_ammo15: 7 };
      var cost = npcPrices[npcId] || 5;
      if (arcoins < cost) { showConfirm({ title: '⚠ Not enough ARC', body: 'You need <b>' + cost + ' ARC</b>.', confirmTxt: 'OK', cancelTxt: false }); return; }
      arcoins -= cost; saveArcoins();
      localStorage.setItem('bm_npc_' + npcId, '1');
      if (npcId === 'npc_ammo5') Object.keys(ammoReserve).forEach(function(k){ ammoReserve[k] += 1; });
      if (npcId === 'npc_ammo15') Object.keys(ammoReserve).forEach(function(k){ ammoReserve[k] += 3; });
      if (npcId === 'npc_cr500') credits += 500;
      shooterSpeech('🛒 NPC purchase complete!');
      buildInventory();
    });
    $p.off('click.npcsell').on('click.npcsell', '.bm-npc-sell-btn', function () {
      var npcId = $(this).data('npc-id');
      var npcPayouts = { npc_buy_ammo: 400, npc_buy_shot: 800, npc_buy_arc: 2000 };
      var payout = npcPayouts[npcId] || 400;
      localStorage.setItem('bm_npc_' + npcId, '1');
      credits += payout;
      shooterSpeech('📤 Sold to NPC — +₴' + payout);
      buildInventory();
    });

    // ── Play 21 delegated handlers (namespaced to prevent stacking) ──
    $p.off('click.p21').on('click.p21', '.p21-bet-btn', function(){ _p21Start(parseInt($(this).data('bet'),10)); });
    $p.on('click.p21', '#p21-hit', function(){ _p21Hit(); });
    $p.on('click.p21', '#p21-stand', function(){ _p21Stand(); });
    $p.on('click.p21', '#p21-again', function(){ _p21Start(_p21.bet); });
    // ── Naperstki delegated handlers ──
    $p.off('click.nap').on('click.nap', '.nap-bet-btn', function(){ _napStart(parseInt($(this).data('bet'),10)); });
    $p.on('click.nap', '.nap-cup--pick', function(){ _napPick(parseInt($(this).data('cup'),10)); });
    $p.on('click.nap', '#nap-again', function(){ _napStart(_nap.bet); });
    // ── Teter delegated handlers ──
    $p.off('click.teter').on('click.teter', '.teter-bet-btn', function(){ _teterStart(parseInt($(this).data('bet'),10)); });
    $p.on('click.teter', '#teter-answer-btn', function(){ _teterAnswer(); });
    $p.on('click.teter', '#teter-again', function(){ _teterStart(_teter.bet); });
    // ── Putin Pool delegated handlers ──
    $p.off('click.ppool').on('click.ppool', '#ppool-place-btn', function(){ _ppoolPlace(); });
    // ── Offerwall open ──
    $p.off('click.offerwall').on('click.offerwall', '#earn-offerwall-btn', function () {
      if (typeof _owRefreshList === 'function') _owRefreshList();
      $('#offerwall-modal').addClass('open');
    });

    // ── Sell ARC → POL ──
    const _SELL_ARC_RATE = 0.012;
    $p.off('input.sell').on('input.sell', '#sell-arc-amt', function () {
      const amt = parseFloat($(this).val()) || 0;
      $('#sell-pol-out').text((amt * _SELL_ARC_RATE).toFixed(4) + ' POL');
    });
    // Trigger initial preview
    const $sellAmt = $p.find('#sell-arc-amt');
    if ($sellAmt.length) {
      const initAmt = parseFloat($sellAmt.val()) || 0;
      $p.find('#sell-pol-out').text((initAmt * _SELL_ARC_RATE).toFixed(4) + ' POL');
    }
    $p.off('click.sell').on('click.sell', '#sell-submit-btn', function () {
      const amt = parseInt($p.find('#sell-arc-amt').val(), 10) || 0;
      const minSell = 10;
      if (amt < minSell) {
        showConfirm({ title: '⚠ Too low', body: 'Minimum sell amount is <strong>'+minSell+' ARC</strong>.', confirmTxt: 'OK', cancelTxt: false });
        return;
      }
      if (amt > arcoins) {
        showConfirm({ title: '⚠ Insufficient ARC', body: 'You only have <strong>'+arcoins+' ARC</strong>.', confirmTxt: 'OK', cancelTxt: false });
        return;
      }
      showConfirm({
        title: '📝 Confirm Withdrawal',
        body: 'Sell <strong>'+amt+' ARC</strong><br>→ <strong>≈'+(amt*_SELL_ARC_RATE).toFixed(4)+' POL</strong><br>to <strong>'+walletAddr.slice(0,8)+'…'+walletAddr.slice(-5)+'</strong><br><small>Processed at Token Generation Event</small>',
        confirmTxt: '✅ Sign Request',
        onConfirm: function () {
          const _pendingKey  = 'arc_sell_pending';
          const _pendingList = JSON.parse(localStorage.getItem(_pendingKey) || '[]');
          _pendingList.push({ amount: amt, addr: walletAddr, date: new Date().toISOString().slice(0,10), polEst: (amt*_SELL_ARC_RATE).toFixed(4) });
          localStorage.setItem(_pendingKey, JSON.stringify(_pendingList));
          arcoins = Math.max(0, arcoins - amt);
          localStorage.setItem('arc_balance', String(arcoins));
          updateScoreHUD();
          _invLastSection = 'inv-sec-sell';
          buildInventory();
          showConfirm({ title: '✅ Withdrawal Queued', body: '<strong>'+amt+' ARC</strong> locked for withdrawal.<br>You will receive <strong>≈'+(amt*_SELL_ARC_RATE).toFixed(4)+' POL</strong> when ARC launches.', confirmTxt: '🎮 Keep Playing', cancelTxt: false });
        },
      });
    });
    $p.off('click.sellwallet').on('click.sellwallet', '#sell-connect-wallet-btn', function () {
      $p.find('.inv-nav-btn[data-target="inv-sec-wallet"]').trigger('click');
    });

    // ── NFT Mint ──
    $p.off('click.nftmint').on('click.nftmint', '#nft-mint-btn:not([disabled])', function () {
      var _rHN=($p.find('#nft-hero-name').val()||'').trim();
      var _rHU=($p.find('#nft-hero-unit').val()||'').trim();
      var _rHB=($p.find('#nft-hero-bio').val()||'').trim();
      var _hN=_rHN?profanityFilter(_rHN):'';
      var _hU=_rHU?profanityFilter(_rHU):'';
      var _hB=_rHB?profanityFilter(_rHB):'';
      if(_rHN&&_hN===null){shooterSpeech('❌ Hero name contains inappropriate content');return;}
      if(_rHU&&_hU===null){shooterSpeech('❌ Unit field contains inappropriate content');return;}
      if(_rHB&&_hB===null){shooterSpeech('❌ Dedication contains inappropriate content');return;}
      window._pendingHeroData=_hN?{name:_hN,unit:_hU,bio:_hB,portrait:proceduralPortrait(_hN,120)}:null;
      showConfirm({
        title: '\ud83c\udfae Mint a Hero?',
        body: 'Costs <strong>5 ARC</strong>. You have <strong>' + arcoins + ' ARC</strong>.<br>Rarity is random — good luck!',
        confirmTxt: '\u2728 Mint It!',
        onConfirm: mintNFT,
      });
    });

    // ── Buy Money with Crypto ──
    $p.off('click.buypkg').on('click.buypkg', '.buy-pkg-btn:not([disabled])', function () {
      const pkgId = $(this).data('pkg');
      const pkg   = CRYPTO_PKGS.find(p => p.id === pkgId);
      if (!pkg) return;
      showConfirm({
        title: '\ud83d\udcb3 Confirm Purchase',
        body: 'Send <strong>' + pkg.pol + ' POL</strong> on Polygon to receive<br>'
          + '<strong style="font-size:20px;color:#0057B8">+' + pkg.money.toLocaleString() + ' \ud83d\udcb0</strong> in-game.',
        confirmTxt: '\ud83d\udcb3 Pay ' + pkg.pol + ' POL',
        onConfirm: () => buyCryptoMoney(pkgId),
      });
    });

    // ── Buy ARC with POL ─────────────────────────────────────────
    $p.off('click.buyarc').on('click.buyarc', '.buy-arc-btn:not([disabled])', function () {
      const pkgId = $(this).data('arc-pkg');
      const pkg   = ARC_PKGS.find(function(p){ return p.id === pkgId; });
      if (!pkg) return;
      showConfirm({
        title: '💎 Buy ARC with POL',
        body: 'Send <strong>' + pkg.pol + ' POL</strong> on Polygon to receive<br>' +
          '<strong style="font-size:22px;color:#FFD700">+' + pkg.arc.toLocaleString() + ' 🪙 ARC</strong><br>' +
          '<small style="opacity:.65">' + (pkg.bonus || 'Pre-sale rate · value locked at purchase') + '</small><br>' +
          '<small style="color:#90eea0;opacity:.8">🇺🇦 10% auto-donated to Ukraine</small>',
        confirmTxt: '💎 Pay ' + pkg.pol + ' POL',
        onConfirm: function() { buyArcWithPol(pkgId); },
      });
    });

    // ── ARC exchange ──
    $p.off('click.exch').on('click.exch', '.inv-exch-btn:not([disabled])', function () {
      const val = $(this).data('arc');
      const qty = val === 'all' ? arcoins : parseInt(val, 10);
      if (!qty || qty > arcoins) return;
      const gain = qty * 100;
      showConfirm({
        title: '\ud83d\udd04 Confirm Exchange',
        body: 'Exchange <strong>' + qty + ' ARC</strong> for <strong>' + gain.toLocaleString() + ' \ud83d\udcb0</strong>?<br>'
          + '<small style="opacity:.6">This cannot be undone.</small>',
        confirmTxt: '\ud83d\udd04 Exchange',
        onConfirm: () => {
          arcoins  -= qty;
          credits  += gain;
          localStorage.setItem('arc_balance', String(arcoins));
          updateScoreHUD();
          _invLastSection = 'inv-sec-exchange';
          buildInventory();
        },
      });
    });

    // ── Donate directly to Ukraine ──
    $p.off('click.donate').on('click.donate', '#nft-donate-now-btn', async function () {
      if (!isMetaMaskAvail()) {
        showConfirm({ title: '🦊 MetaMask Required',
          body: 'Install MetaMask to donate on Polygon.<br><br><a href="https://metamask.io/download/" target="_blank" style="color:#6cf">Install free ↗</a>',
          confirmTxt: 'OK', cancelTxt: false }); return;
      }
      showConfirm({
        title: '🇺🇦 Donate to Ukrainian Army',
        body: 'Enter how much POL you want to donate:<br>'
          + '<br><input id="donate-amt-input" type="number" min="0.01" step="0.01" value="1" style="width:110px;padding:6px;background:#0a1a0a;border:1px solid #3a6a3a;color:#d0ffd0;border-radius:6px;font-size:15px;text-align:center"> POL'
          + '<br><small style="opacity:.5;font-size:10px">Wallet: 0x165C…5e14 ・ Polygon Mainnet</small>',
        confirmTxt: '🇺🇦 Send Donation',
        onConfirm: async () => {
          try {
            if (!walletAddr) await connectWallet();
            if (!walletAddr) throw new Error('Wallet not connected.');
            if (walletChainId !== POLYGON_CHAIN_ID) {
              await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON_CHAIN_ID }] });
            }
            const _polAmt = parseFloat(document.getElementById('donate-amt-input').value) || 1;
            const _wei = BigInt(Math.round(_polAmt * 1e18));
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [{ from: walletAddr, to: UKRAINE_WALLET, value: '0x' + _wei.toString(16), gas: '0x5208' }]
            });
            showConfirm({
              title: '🇺🇦 💙 Thank you!',
              body: '<strong style="font-size:18px;color:#60d060">' + _polAmt + ' POL sent to Ukraine!</strong><br>'
                + '<a href="https://polygonscan.com/tx/' + txHash + '" target="_blank" style="color:#6cf;font-size:11px">View on PolygonScan ↗</a>',
              confirmTxt: '🎮 Keep Fighting', cancelTxt: false
            });
          } catch (err) {
            if (err && err.code !== 4001) {
              showConfirm({ title: '❌ Failed', body: _escHtml(String(err.message || '').slice(0, 160)), confirmTxt: 'OK', cancelTxt: false, danger: true });
            }
          }
        }
      });
    });

    // ── Wallet connect ──
    $p.off('click.wallet').on('click.wallet', '#inv-connect-wallet-btn', function () {
      connectWallet();
    });

    // ── Equip weapon — stay in inventory so player can keep shopping ──
    $p.off('click.closebtn').on('click.closebtn', '#inv-close-btn', function () {
      $pauseGameTrigger.trigger('click');
    });

    // ── Inventory jukebox controls ──
    function _jbInvUpdate() {
      if (!window.ARC_JUKEBOX) return;
      var isPlaying = ARC_JUKEBOX.isPlaying();
      $('#jb-inv-toggle').text(isPlaying ? '⏸' : '▶');
      var track = ARC_JUKEBOX.currentTrack();
      $('#jb-inv-track').text(track ? track.title : 'Jukebox');
    }
    $p.off('click.jbinv').on('click.jbinv', '#jb-inv-toggle', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.toggle(); setTimeout(_jbInvUpdate, 100); }
    });
    $p.off('click.jbnext').on('click.jbnext', '#jb-inv-next', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.next(); setTimeout(_jbInvUpdate, 300); }
    });
    $p.off('click.jbprev').on('click.jbprev', '#jb-inv-prev', function(e) {
      e.preventDefault(); e.stopPropagation();
      if (window.ARC_JUKEBOX) { ARC_JUKEBOX.prev(); setTimeout(_jbInvUpdate, 300); }
    });
    _jbInvUpdate();

    $p.off('click.equip').on('click.equip', '.inv-equip-btn', function () {
      var $btn = $(this);
      if ($btn.prop('disabled')) return;
      $btn.prop('disabled', true);
      const wname = $btn.data('weapon');
      switchToWeapon(wname);
      _invLastSection = 'inv-sec-armory';
      buildInventory();
    });

    // ── Purchase upgrade ──
    $p.off('click.inv').on('click.inv', '.inv-upg:not([disabled])', function () {
      var $ubtn = $(this);
      if ($ubtn.data('busy')) return;
      $ubtn.data('busy', true);
      const wname = $ubtn.data('weapon');
      const idx   = parseInt($(this).data('idx'));
      const upg   = (WEAPON_UPGRADES[wname] || [])[idx];
      if (!upg) return;
      const key = `${wname}_${idx}`;
      if (weaponUpgradesBought[key] && !godMode) return;  // already bought — only skip if not god mode
      if (!godMode && credits < upg.cost) {
        $(this).addClass('inv-upg--shake');
        setTimeout(() => $(this).removeClass('inv-upg--shake'), 380);
        return;
      }
      showConfirm({ title:'⚔️ Buy Upgrade?', body:'<b>' + upg.name + '</b><br>' + upg.desc + '<br>Cost: <b>' + (godMode ? 'FREE' : upg.cost + ' ₴') + '</b>', confirmTxt:'Buy', onConfirm: function() {
        if (!godMode) credits -= upg.cost;
        weaponUpgradesBought[key] = true;
        upg.apply();
        updateScoreHUD();
        _invLastSection = 'inv-sec-armory';
        buildInventory();
      }});
    });

    // ── Admin login ──────────────────────────────────────────────────────
    $p.off('click.adminlogin').on('click.adminlogin','#admin-login-btn',function(){
      var u=($p.find('#admin-uname').val()||'').trim(),pw=($p.find('#admin-pwd').val()||'').trim();
      if(u==='kakababa'&&pw==='Pidaras25!!??'){
        $p.find('#admin-login-wrap').hide();$p.find('#admin-panel-wrap').show();
        $p.find('#admin-log-entries').append('<div class="admin-log-entry">✅ Login '+new Date().toLocaleTimeString()+'</div>');
      }else{$p.find('#admin-login-err').show().delay(2000).fadeOut(400);}
    });

    // ── Profile section handlers ─────────────────────────────────────────
    $p.off('click.profilesave').on('click.profilesave','#profile-save-btn',function(){
      var name=($p.find('#profile-name-input').val()||'').trim();
      var email=($p.find('#profile-email-input').val()||'').trim();
      if(!name||name.length<2){shooterSpeech('⚠ Name must be 2+ chars');return;}
      if(!/^[a-zA-Z0-9 _\-.]+$/.test(name)){shooterSpeech('⚠ Letters, numbers, spaces only');return;}
      localStorage.setItem('arc_username',name);
      if(email)localStorage.setItem('arc_user_email',email);
      if(!localStorage.getItem('arc_registered_at'))localStorage.setItem('arc_registered_at',new Date().toISOString());
      shooterSpeech('✅ Profile saved: '+name);
      _invLastSection='inv-sec-profile';buildInventory();
    });
    $p.off('click.profilereset').on('click.profilereset','#profile-reset-btn',function(){
      localStorage.removeItem('arc_username');
      localStorage.removeItem('arc_user_email');
      localStorage.removeItem('arc_registered_at');
      shooterSpeech('👤 Name cleared — signup will show next game');
      _invLastSection='inv-sec-profile';buildInventory();
    });
    $p.off('click.adminctrl').on('click.adminctrl','.admin-ctrl-btn',function(){
      var id=$(this).attr('id'),log=$p.find('#admin-log-entries');
      if(id==='adm-maxskills'){SKILL_TIERS.forEach(function(t){if(!_skillUnlocks.includes(t.id))_skillUnlocks.push(t.id);});localStorage.setItem('skill_unlocks',JSON.stringify(_skillUnlocks));log.append('<div class="admin-log-entry">⚡ All skills maxed</div>');_invLastSection='inv-sec-admin';buildInventory();}
      else if(id==='adm-addarc'){arcoins+=10000;localStorage.setItem('arc_balance',String(arcoins));log.append('<div class="admin-log-entry">🪙 +10,000 ARC → '+arcoins+'</div>');updateScoreHUD();_invLastSection='inv-sec-admin';buildInventory();}
      else if(id==='adm-fullhp'){hp=maxHp;godMode=true;$canves.toggleClass('god-mode-on',true);Object.keys(_ciCdEnd).forEach(k=>{_ciCdEnd[k]=0;});updateScoreHUD();log.append('<div class="admin-log-entry">❤️ Full HP + God Mode ON + Unlimited Call-ins</div>');}
      else if(id==='adm-allweapons'){shotgunUnlocked=m16Unlocked=clayUnlocked=true;['stugna','drone_bomb','panzerfaust','pkm','ak12','matador'].forEach(function(w){localStorage.setItem('unlocked_'+w,'1');});log.append('<div class="admin-log-entry">🔫 All weapons unlocked</div>');_invLastSection='inv-sec-admin';buildInventory();}
      else if(id==='adm-resetgame'){if(!confirm('Reset ALL game data?'))return;['arc_balance','arc_nfts','arc_ref_code','arc_username','skill_unlocks','arc_p2p_listings','sol_upgrades'].forEach(function(k){localStorage.removeItem(k);});zombieKilled=0;credits=0;arcoins=0;shotsFired=0;shotsHit=0;shooterHp=100;updateShooterHpBar();_skillUnlocks=[];log.append('<div class="admin-log-entry admin-log-entry--danger">🗑️ Reset '+new Date().toLocaleTimeString()+'</div>');updateScoreHUD();buildInventory();}
      else if(id==='adm-su-setrate'){var r=parseFloat($p.find('#adm-su-rate').val());if(isNaN(r)||r<0){log.append('<div class="admin-log-entry admin-log-entry--danger">❌ Invalid rate</div>');return;}SHOT_UA_RATE=r;_suUpdateUsd();log.append('<div class="admin-log-entry">💰 Shot rate → $'+r+'</div>');}
      else if(id==='adm-su-setmiles'){var raw=$p.find('#adm-su-milestones').val();var arr=raw.split(',').map(function(s){return parseInt(s.trim(),10);}).filter(function(n){return !isNaN(n)&&n>0;}).sort(function(a,b){return a-b;});if(!arr.length){log.append('<div class="admin-log-entry admin-log-entry--danger">❌ Invalid milestones</div>');return;}_suMilestones.length=0;arr.forEach(function(n){_suMilestones.push(n);});log.append('<div class="admin-log-entry">🎯 Milestones → '+arr.join(', ')+'</div>');}
      else if(id==='adm-su-reset'){if(!confirm('Reset shots-for-Ukraine counter to 0?'))return;shotsForUkraine=0;localStorage.setItem('arc_shots_ukraine','0');_suUpdateUsd();log.append('<div class="admin-log-entry">🔄 Shots for UA reset to 0</div>');_invLastSection='inv-sec-admin';buildInventory();}
      else if(id==='adm-su-addshots'){shotsForUkraine+=1000;localStorage.setItem('arc_shots_ukraine',String(shotsForUkraine));_suUpdateUsd();log.append('<div class="admin-log-entry">➕ +1000 shots → '+shotsForUkraine.toLocaleString()+'</div>');_invLastSection='inv-sec-admin';buildInventory();}
      else if(id==='adm-su-resetmiles'){_suShownMilestones.length=0;localStorage.setItem('arc_su_milestones','[]');log.append('<div class="admin-log-entry">🏁 Shown milestones reset — toasts will re-trigger</div>');}
    });
    // ── SOL Skill Upgrades (MetaMask / Phantom) ────────────────────────────
    $p.off('click.solbuy').on('click.solbuy','.sol-buy-btn',function(){
      var upgradeId=$(this).data('sol-id'),price=parseFloat($(this).data('sol-price'));
      var UA_WALLET='0x165CD37b4C644C2921454429E7F9358d18A45e14';
      var SOL_WALLET='2ZTzZvBWCb6TsNZLgK8iHULkREopQBdj3PEb6AgxG89s';
      if(typeof window.ethereum!=='undefined'){
        window.ethereum.request({method:'eth_requestAccounts'}).then(function(acc){
          window.ethereum.request({method:'eth_sendTransaction',params:[{from:acc[0],to:UA_WALLET,value:'0x'+Math.round(price*1e18).toString(16),gas:'0x5208'}]}).then(function(tx){
            var b;try{b=JSON.parse(localStorage.getItem('sol_upgrades')||'[]');}catch(e){b=[];}if(!b.includes(upgradeId)){b.push(upgradeId);localStorage.setItem('sol_upgrades',JSON.stringify(b));}
            applySolUpgrade(upgradeId);
            showConfirm({title:'✅ Upgrade Active!',body:'<b style="color:#0f0">'+upgradeId.replace('sol_','').toUpperCase()+'</b> activated!<br><small>Tx: <a href="https://polygonscan.com/tx/'+tx+'" target="_blank" style="color:#adf">PolygonScan ↗</a></small><br><small style="opacity:.6">10% donated to UA Army</small>',confirmTxt:'🎮 Play On',cancelTxt:false});
          }).catch(function(){shooterSpeech('❌ Tx rejected');});
        }).catch(function(){shooterSpeech('❌ MetaMask not connected');});
      }else if(typeof window.solana!=='undefined'&&window.solana.isPhantom){
        window.solana.connect().then(function(){
          var b;try{b=JSON.parse(localStorage.getItem('sol_upgrades')||'[]');}catch(e){b=[];}if(!b.includes(upgradeId)){b.push(upgradeId);localStorage.setItem('sol_upgrades',JSON.stringify(b));}
          applySolUpgrade(upgradeId);
          showConfirm({title:'✅ Phantom SOL Upgrade',body:'<b style="color:#9945FF">'+upgradeId.replace('sol_','').toUpperCase()+'</b> activated!<br><a href="https://solscan.io/account/'+SOL_WALLET+'" target="_blank" style="color:#adf">UA Army SOL Wallet ↗</a>',confirmTxt:'🎮 Play On',cancelTxt:false});
        }).catch(function(){shooterSpeech('❌ Phantom failed');});
      }else{showConfirm({title:'💼 No Wallet Found',body:'Install <b>MetaMask</b> or <b>Phantom</b> to purchase SOL upgrades.<br><small style="opacity:.6">MetaMask: ethereum · Phantom: Solana</small>',confirmTxt:'🦊 Get MetaMask',onConfirm:function(){window.open('https://metamask.io','_blank');}});}
    });

    // ── ESC / Space to close (only registered when inventory is actually open) ──
    // Guard: if buildInventory() is called outside of pause (e.g. godMode HUD
    // button), we must NOT register keydown.inv — otherwise ESC fires twice
    // (once from body.keydown.game and once from document.keydown.inv) and
    // the inventory immediately opens-and-closes.
    $(document).off('keydown.inv');
    if (gamePaused) {
      $(document).on('keydown.inv', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.which === 27) {
          e.preventDefault();
          $pauseGameTrigger.trigger('click');
        }
      });
    }

    // New-item highlights consumed — clear after display
    newWeapons.clear();
    $('#inv-shortcut-label').removeClass('inv-has-new');

    // ── BATCH 88: Inject ? info icons into every inventory section header ──
    var _infoMap = {
      'inv-sec-armory':     'Your arsenal — upgrade weapons, buy ammo magazines, and equip your loadout.',
      'inv-sec-ammo':       'Ammunition reserves — buy extra magazines to carry into battle.',
      'inv-sec-earn':       'Earn ARC coin through referrals, wave high-scores, watching videos, and jokes.',
      'inv-sec-exchange':   'Buy in-game money with Polygon (POL) cryptocurrency via MetaMask.',
      'inv-sec-arc':        'ARC — Anti-Ruscist Coin. Premium currency earned in-game or purchasable.',
      'inv-sec-wallet':     'Connect your MetaMask wallet to mint NFTs and trade on-chain.',
      'inv-sec-sell':       'Sell ARC tokens back for POL. Processed at Token Generation Event.',
      'inv-sec-nfts':       'Ukrainian defenders — real heroes. 10% of all revenue goes to UA support.',
      'inv-sec-news':       'Front-line news sources — verified reporting on Ukraine defence.',
      'inv-sec-skills':     'Skill tree — unlock permanent passive abilities that persist across games.',
      'inv-sec-market':     'Cosmetic marketplace — titles, badges, skins. Purely visual, never pay-to-win.',
      'inv-sec-missions':   'Daily missions — complete objectives to earn ARC and XP.',
      'inv-sec-battlepass': 'Season pass — earn exclusive rewards through gameplay progression.',
      'inv-sec-staking':    'Stake ARC tokens to earn yield. Higher stakes earn higher daily rewards.',
      'inv-sec-memorial':   'Memorial wall honouring fallen Ukrainian defenders. Слава Україні.',
      'inv-sec-myheroes':   'Your personal Hero NFT collection — pre-minted or owned defenders on Polygon.',
      'inv-sec-uadonate':   'Transparency dashboard — every donation tracked. 10% of all purchases auto-donate to verified UA funds.',
      'inv-sec-profile':    'Your fighter profile — username, avatar, and account settings.',
      'inv-sec-admin':      'Admin controls — game configuration, debug tools, and server management.',
      'inv-sec-cosmetics':  'ARC cosmetics shop — titles, skins, badges, VFX. Purely visual, never pay-to-win.',
      'inv-sec-play21':     'Soviet Blackjack (Ochko) — try to hit 21 without busting. Earn ₴ on wins.',
      'inv-sec-naperstki':  'Naperstki (Shell Game) — classic Soviet street hustle. Find the ball to win ₴.',
      'inv-sec-teter':      'Arithmetics Teter — solve quick math problems under time pressure for ₴ rewards.',
      'inv-sec-chess':      'Chess vs Putin AI — beat the dictator in classic chess. Higher difficulty = more ARC.',
      'inv-sec-checkers':   'Checkers vs Putin AI — strategic board game. Capture all pieces to earn ARC.',
      'inv-sec-putinpool':  'Putin Death Date Pool — place your prediction. Closest guess wins the prize pool.',
      'inv-sec-tokenomics': 'ARC token economics — supply, circulation, your portfolio value, and market cap simulation.',
      'inv-sec-prestige':   'Prestige system — reset progress for permanent earn multiplier bonuses.',
      'inv-sec-achievements':'Achievements — unlock milestones for ARC rewards. Progress tracked across all sessions.',
      'inv-sec-clan':       'Clan system — create or join a clan, compete on collective leaderboards.',
      'inv-sec-pvp':        'PvP challenges — dare friends to beat your score. Optional ARC betting.',
      'inv-sec-season2':    'Season 2 preview — upcoming content, early access progress, and new features.',
      'inv-sec-leaders':    'Weekly leaderboard — top fighters ranked by score. Resets every Monday.',
      'inv-sec-stats':      'Your battle statistics — kills, accuracy, playtime, and career records.',
    };
    $p.find('.inv-sec-header').each(function () {
      var $hdr = $(this);
      if ($hdr.find('.inv-info-icon').length) return; // already injected
      var secId = $hdr.closest('.inv-section').attr('id') || '';
      var tip = _infoMap[secId];
      if (!tip) return;
      var $icon = $('<span class="inv-info-icon" title="Info">?</span>');
      var $balloon = $('<div class="inv-info-balloon">' + tip + '</div>');
      $hdr.css('position', 'relative');
      $hdr.find('.inv-sec-title').append($icon);
      $hdr.append($balloon);
      $icon.on('click', function (e) {
        e.stopPropagation();
        $balloon.toggleClass('visible');
        // Close other balloons
        $p.find('.inv-info-balloon').not($balloon).removeClass('visible');
      });
    });
    // ── Fallback: inject ❓ into sections WITHOUT inv-sec-header ──
    Object.keys(_infoMap).forEach(function(secId) {
      var $sec = $p.find('#' + secId);
      if (!$sec.length || $sec.find('.inv-info-icon').length) return;
      var tip = _infoMap[secId];
      var $icon = $('<span class="inv-info-icon inv-info-icon--float" title="Info">?</span>');
      var $balloon = $('<div class="inv-info-balloon inv-info-balloon--float">' + tip + '</div>');
      $sec.css('position', 'relative');
      $sec.prepend($balloon);
      $sec.prepend($icon);
      $icon.on('click', function (e) {
        e.stopPropagation();
        $balloon.toggleClass('visible');
        $p.find('.inv-info-balloon').not($balloon).removeClass('visible');
      });
    });
   } catch(e) { console.warn('[ARC] buildInventory error:', e); $('#inventory-panel').html('<div style="padding:30px;color:#ff4444;text-align:center"><h3>⚠️ Menu Error</h3><p>Please try clearing your browser data or hard-refreshing (Ctrl+Shift+R).</p></div>'); }
  }

  function applySolUpgrade(id){
    if(id==='sol_xp2x'){window._solXp2x=true;shooterSpeech('🧠 2× XP Booster active!');}
    else if(id==='sol_autoheal'){if(window._solAutoHealInt)clearInterval(window._solAutoHealInt);window._solAutoHealInt=setInterval(function(){if(gameActive&&hp<maxHp&&(!window._lastDmgTs||(Date.now()-window._lastDmgTs>3000))){hp=Math.min(maxHp,hp+1);updateScoreHUD();}},1000);shooterSpeech('💊 Auto-Heal active!');}
    else if(id==='sol_explosive'){window._solExplosive=true;shooterSpeech('💥 Explosive Rounds active!');}
    else if(id==='sol_extmags'){Object.keys(ammoReserve).forEach(function(k){ammoReserve[k]+=3;});shooterSpeech('📦 +3 Magazines added to all weapons!');}
  }
  (function(){var _su;try{_su=JSON.parse(localStorage.getItem('sol_upgrades')||'[]');}catch(e){_su=[];}_su.forEach(function(id){setTimeout(function(){applySolUpgrade(id);},2500);});})();

  // ── Weapon Hands SVG System ──────────────────────────────────
  // FPS behind-the-weapon view. Filled polygon arm sleeves match the game's
  // flat rect art style. Hands positioned below grip bottoms so dorsal surface
  // (knuckles) is visible behind/below the weapon body.
  function weaponHandsSVG(weapon) {
    const sk  = '#c8a06a';   // skin
    const skd = '#9c6f38';   // skin shadow / knuckle crease
    const skh = '#ddb87a';   // skin highlight
    const sl  = '#3D5C1A';   // sleeve (military green)
    const sld = '#273d10';   // sleeve shadow stripe
    const slh = '#4d7a22';   // sleeve highlight stripe
    const mt  = '#7a8080';   // metal
    const dm  = '#3a3a3a';   // dark metal
    const wd  = '#7a5030';   // wood
    const gd  = '#FFD700';   // gold accent

    // ── Left arm: support hand, foregrip (filled polygon from bottom-left corner) ──
    // Wrist reaches up to foregrip area ~x70,y162; hand dorsal visible below foregrip
    const armL = `<g class="wh-arm-left">
      <path d="M-8,282 C5,260 27,228 47,200 C57,182 63,170 69,162
               L80,168 C74,177 67,190 55,208 C33,237 9,266 3,282 Z"
            fill="${sl}"/>
      <path d="M-3,282 C9,261 30,229 50,201 C60,183 66,171 71,163"
            fill="none" stroke="${slh}" stroke-width="5" stroke-linecap="round" opacity="0.50"/>
      <path d="M3,282 C14,262 34,231 52,204 C61,187 67,174 72,165"
            fill="none" stroke="${sld}" stroke-width="3" stroke-linecap="round" opacity="0.38"/>
      <path d="M66,162 L80,168 L78,174 L64,168 Z" fill="${sld}"/>
      <path d="M58,172 Q61,155 77,152 Q95,151 96,165 Q95,181 78,184 Q60,182 58,172Z"
            fill="${sk}"/>
      <rect x="63" y="152" width="10" height="6" rx="3" fill="${skd}" opacity="0.50"
            transform="rotate(5,68,155)"/>
      <rect x="74" y="151" width="10" height="6" rx="3" fill="${skd}" opacity="0.50"/>
      <rect x="85" y="152" width="9" height="5.5" rx="2.5" fill="${skd}" opacity="0.50"
            transform="rotate(-4,89,154)"/>
      <path d="M62,155 Q78,151 95,155" fill="none" stroke="${skd}" stroke-width="1.5" opacity="0.38"/>
      <path d="M68,172 Q78,168 88,172" fill="none" stroke="${skh}" stroke-width="1.5" opacity="0.30"/>
      <path d="M58,174 Q47,167 50,156 C54,148 63,152 63,159 Q62,169 58,174Z"
            fill="${sk}"/>
      <path d="M49,158 Q52,151 61,154" fill="none" stroke="${skd}" stroke-width="1" opacity="0.35"/>
    </g>`;

    // ── Right arm: dominant hand, pistol grip (filled polygon from bottom-right corner) ──
    // Wrist reaches up to grip area ~x215,y162; hand dorsal visible below grip
    const armR = `<g class="wh-arm-right">
      <path d="M298,282 C285,260 263,228 243,200 C233,182 227,170 221,162
               L210,168 C216,177 223,190 235,208 C257,237 281,266 287,282 Z"
            fill="${sl}"/>
      <path d="M293,282 C281,261 260,229 240,201 C230,183 224,171 219,163"
            fill="none" stroke="${slh}" stroke-width="5" stroke-linecap="round" opacity="0.50"/>
      <path d="M287,282 C276,262 256,231 238,204 C229,187 223,174 218,165"
            fill="none" stroke="${sld}" stroke-width="3" stroke-linecap="round" opacity="0.38"/>
      <path d="M210,168 L221,162 L219,156 L208,162 Z" fill="${sld}"/>
      <path d="M193,175 Q196,158 212,155 Q230,154 232,168 Q231,184 214,187 Q195,185 193,175Z"
            fill="${sk}"/>
      <rect x="199" y="155" width="10" height="6" rx="3" fill="${skd}" opacity="0.50"
            transform="rotate(5,204,158)"/>
      <rect x="210" y="154" width="10" height="6" rx="3" fill="${skd}" opacity="0.50"/>
      <rect x="221" y="155" width="9" height="5.5" rx="2.5" fill="${skd}" opacity="0.50"
            transform="rotate(-4,225,157)"/>
      <path d="M197,158 Q213,154 230,158" fill="none" stroke="${skd}" stroke-width="1.5" opacity="0.38"/>
      <path d="M203,175 Q213,171 223,175" fill="none" stroke="${skh}" stroke-width="1.5" opacity="0.30"/>
      <path d="M232,170 Q243,163 240,152 C236,144 227,148 227,155 Q228,165 232,170Z"
            fill="${sk}"/>
      <path d="M241,154 Q238,147 229,150" fill="none" stroke="${skd}" stroke-width="1" opacity="0.35"/>
    </g>`;

    const bodies = {
      revolver: `<g class="wh-weapon">
        <rect x="7" y="93" width="132" height="18" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="108" y="83" width="108" height="28" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <circle cx="156" cy="99" r="22" fill="#696969" stroke="${dm}" stroke-width="1.5"/>
        <circle cx="156" cy="99" r="14" fill="#555"/>
        <circle cx="156" cy="82" r="5" fill="${dm}"/><circle cx="167" cy="88" r="5" fill="${dm}"/>
        <circle cx="171" cy="99" r="5" fill="${dm}"/><circle cx="167" cy="110" r="5" fill="${dm}"/>
        <circle cx="156" cy="116" r="5" fill="${dm}"/><circle cx="145" cy="110" r="5" fill="${dm}"/>
        <circle cx="141" cy="99" r="5" fill="${dm}"/>
        <path d="M211 108 Q226 148 217 170 L193 167 Q188 142 202 108Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="195" y="112" width="25" height="5" rx="2" fill="${wd}" opacity="0.45"/>
        <rect x="193" y="121" width="27" height="5" rx="2" fill="${wd}" opacity="0.45"/>
        <rect x="192" y="130" width="27" height="5" rx="2" fill="${wd}" opacity="0.45"/>
        <rect x="209" y="78" width="13" height="18" rx="3" fill="#555"/>
        <rect x="212" y="73" width="8" height="11" rx="2" fill="${dm}"/>
        <rect x="9" y="89" width="9" height="7" rx="2" fill="${dm}"/>
        <rect x="190" y="82" width="14" height="4" rx="1" fill="${dm}"/>
        <path d="M199 110 Q207 132 215 110" fill="none" stroke="${dm}" stroke-width="2.5"/>
      </g>`,
      shotgun: `<g class="wh-weapon">
        <rect x="7" y="87" width="202" height="14" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="7" y="102" width="202" height="14" rx="5" fill="#686868" stroke="${dm}" stroke-width="1.5"/>
        <rect x="7" y="100" width="202" height="3" rx="1" fill="${mt}"/>
        <rect x="193" y="84" width="72" height="34" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="207" y="90" width="30" height="16" rx="3" fill="${dm}"/>
        <rect x="64" y="116" width="66" height="25" rx="7" fill="${wd}"/>
        <path d="M256 90 Q286 104 278 156 L248 159 Q239 130 252 90Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <path d="M228 117 Q238 143 232 162 L214 160 Q210 140 218 117Z" fill="${wd}" stroke="${dm}" stroke-width="1"/>
        <path d="M234 121 Q243 142 251 121" fill="none" stroke="${dm}" stroke-width="3"/>
        <ellipse cx="9" cy="94" rx="5" ry="5" fill="${dm}"/>
        <ellipse cx="9" cy="109" rx="5" ry="5" fill="${dm}"/>
        <circle cx="9" cy="87" r="4" fill="${gd}"/>
      </g>`,
      m16: `<g class="wh-weapon">
        <rect x="58" y="83" width="172" height="25" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="123" y="69" width="66" height="16" rx="4" fill="#666" stroke="${dm}" stroke-width="1"/>
        <rect x="147" y="62" width="19" height="9" rx="2" fill="#555"/>
        <rect x="163" y="105" width="82" height="23" rx="4" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="232" y="96" width="29" height="15" rx="4" fill="#5a5a5a"/>
        <rect x="249" y="99" width="38" height="10" rx="4" fill="${mt}" stroke="${dm}" stroke-width="1"/>
        <rect x="246" y="107" width="26" height="27" rx="4" fill="${mt}" stroke="${dm}" stroke-width="1"/>
        <rect x="22" y="87" width="106" height="21" rx="5" fill="#555" stroke="${dm}" stroke-width="1"/>
        <line x1="40" y1="87" x2="40" y2="108" stroke="${dm}" stroke-width="1" opacity="0.5"/>
        <line x1="58" y1="87" x2="58" y2="108" stroke="${dm}" stroke-width="1" opacity="0.5"/>
        <line x1="76" y1="87" x2="76" y2="108" stroke="${dm}" stroke-width="1" opacity="0.5"/>
        <line x1="94" y1="87" x2="94" y2="108" stroke="${dm}" stroke-width="1" opacity="0.5"/>
        <line x1="112" y1="87" x2="112" y2="108" stroke="${dm}" stroke-width="1" opacity="0.5"/>
        <rect x="5" y="89" width="60" height="10" rx="3" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="1" y="86" width="9" height="17" rx="2" fill="#555"/>
        <rect x="3" y="84" width="3" height="21" rx="1" fill="${dm}"/>
        <rect x="9" y="84" width="3" height="21" rx="1" fill="${dm}"/>
        <rect x="15" y="84" width="3" height="21" rx="1" fill="${dm}"/>
        <rect x="222" y="81" width="15" height="6" rx="2" fill="#555"/>
        <rect x="178" y="126" width="21" height="50" rx="5" fill="#404040" stroke="${dm}" stroke-width="1"/>
        <rect x="180" y="128" width="7" height="13" rx="2" fill="#555"/>
        <path d="M205 127 Q214 154 208 170 L190 168 Q185 148 194 127Z" fill="${dm}"/>
        <path d="M197 127 Q206 145 215 127" fill="none" stroke="${dm}" stroke-width="2.5"/>
        <circle cx="208" cy="112" r="3.5" fill="#555"/>
      </g>`,
      lmg: `<g class="wh-weapon">
        <rect x="143" y="80" width="102" height="34" rx="6" fill="${mt}" stroke="${dm}" stroke-width="2"/>
        <rect x="8" y="78" width="167" height="24" rx="8" fill="#5a5a5a" stroke="${dm}" stroke-width="1.5"/>
        <circle cx="30" cy="90" r="6" fill="${dm}"/><circle cx="50" cy="90" r="6" fill="${dm}"/>
        <circle cx="70" cy="90" r="6" fill="${dm}"/><circle cx="90" cy="90" r="6" fill="${dm}"/>
        <circle cx="110" cy="90" r="6" fill="${dm}"/><circle cx="130" cy="90" r="6" fill="${dm}"/>
        <rect x="3" y="80" width="32" height="20" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <rect x="1" y="78" width="9" height="24" rx="2" fill="#5a5a5a"/>
        <rect x="3" y="77" width="4" height="26" rx="1" fill="${dm}"/>
        <line x1="33" y1="102" x2="24" y2="133" stroke="#666" stroke-width="4" stroke-linecap="round"/>
        <line x1="53" y1="102" x2="62" y2="133" stroke="#666" stroke-width="4" stroke-linecap="round"/>
        <rect x="143" y="77" width="102" height="6" rx="2" fill="${gd}" opacity="0.5"/>
        <path d="M188 77 Q204 60 218 77" fill="none" stroke="#666" stroke-width="5" stroke-linecap="round"/>
        <rect x="158" y="114" width="58" height="46" rx="6" fill="#3a3a3a" stroke="${dm}" stroke-width="1.5"/>
        <rect x="161" y="117" width="52" height="13" rx="3" fill="#2a2a2a"/>
        <circle cx="187" cy="136" r="5.5" fill="#555"/>
        <rect x="213" y="103" width="13" height="9" rx="2" fill="${dm}"/>
        <path d="M198 114 Q207 147 201 164 L181 162 Q177 144 185 114Z" fill="${dm}"/>
        <rect x="233" y="90" width="32" height="16" rx="4" fill="#5a5a5a"/>
        <rect x="250" y="94" width="40" height="9" rx="3" fill="${mt}" stroke="${dm}" stroke-width="1"/>
        <rect x="246" y="103" width="24" height="26" rx="4" fill="${mt}" stroke="${dm}" stroke-width="1"/>
        <path d="M191 116 Q200 134 209 116" fill="none" stroke="${dm}" stroke-width="2.5"/>
      </g>`,
      gl: `<g class="wh-weapon">
        <rect x="7" y="80" width="202" height="30" rx="11" fill="#666" stroke="${dm}" stroke-width="2"/>
        <rect x="38" y="78" width="11" height="34" rx="3" fill="${mt}" opacity="0.45"/>
        <rect x="78" y="78" width="11" height="34" rx="3" fill="${mt}" opacity="0.45"/>
        <rect x="118" y="78" width="11" height="34" rx="3" fill="${mt}" opacity="0.45"/>
        <rect x="153" y="76" width="92" height="36" rx="6" fill="${mt}" stroke="${dm}" stroke-width="2"/>
        <circle cx="156" cy="95" r="10" fill="${dm}"/><circle cx="156" cy="95" r="6" fill="#555"/>
        <rect x="163" y="72" width="62" height="7" rx="2.5" fill="#5a5a5a" stroke="${dm}" stroke-width="1"/>
        <rect x="178" y="65" width="24" height="9" rx="2" fill="#444"/>
        <ellipse cx="9" cy="95" rx="10" ry="11" fill="${dm}"/>
        <ellipse cx="9" cy="95" rx="7" ry="8" fill="#111"/>
        <ellipse cx="88" cy="95" rx="24" ry="12" fill="none" stroke="#00ff66" stroke-width="1.5" opacity="0.55"/>
        <path d="M206 113 Q215 148 209 167 L188 164 Q184 144 193 113Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <path d="M196 114 Q205 137 215 114" fill="none" stroke="${dm}" stroke-width="3.5"/>
        <path d="M236 80 Q268 94 259 150 L233 152 Q225 124 234 80Z" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <line x1="178" y1="66" x2="178" y2="69" stroke="${gd}" stroke-width="1.5"/>
        <line x1="189" y1="66" x2="189" y2="69" stroke="${gd}" stroke-width="1.5"/>
        <line x1="196" y1="66" x2="196" y2="70" stroke="${gd}" stroke-width="1.5"/>
      </g>`,
      sniper: `<g class="wh-weapon">
        <!-- Long barrel -->
        <rect x="1" y="91" width="230" height="8" rx="3" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <!-- Receiver / action -->
        <rect x="120" y="80" width="80" height="28" rx="5" fill="${mt}" stroke="${dm}" stroke-width="1.5"/>
        <!-- Scope -->
        <rect x="130" y="67" width="60" height="13" rx="4" fill="#333" stroke="${dm}" stroke-width="1"/>
        <rect x="133" y="69" width="14" height="9" rx="3" fill="#222"/>
        <rect x="173" y="69" width="14" height="9" rx="3" fill="#222"/>
        <line x1="133" y1="73.5" x2="147" y2="73.5" stroke="${gd}" stroke-width="0.8" opacity="0.7"/>
        <line x1="173" y1="73.5" x2="187" y2="73.5" stroke="${gd}" stroke-width="0.8" opacity="0.7"/>
        <!-- Bolt handle -->
        <rect x="195" y="77" width="8" height="5" rx="2" fill="${dm}"/>
        <circle cx="207" cy="79" r="4" fill="#444"/>
        <!-- Bipod legs -->
        <line x1="35" y1="99" x2="22" y2="130" stroke="${mt}" stroke-width="3" stroke-linecap="round"/>
        <line x1="55" y1="99" x2="68" y2="130" stroke="${mt}" stroke-width="3" stroke-linecap="round"/>
        <!-- Stock -->
        <path d="M196 107 Q214 148 206 170 L184 166 Q178 142 191 107Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <path d="M189 108 Q198 134 208 108" fill="none" stroke="${dm}" stroke-width="3"/>
        <!-- Muzzle brake -->
        <rect x="1" y="88" width="14" height="14" rx="3" fill="${dm}"/>
        <line x1="4" y1="88" x2="4" y2="102" stroke="${gd}" stroke-width="0.8" opacity="0.5"/>
        <line x1="8" y1="88" x2="8" y2="102" stroke="${gd}" stroke-width="0.8" opacity="0.5"/>
        <line x1="12" y1="88" x2="12" y2="102" stroke="${gd}" stroke-width="0.8" opacity="0.5"/>
      </g>`,
      ftdrone: `<g class="wh-weapon">
        <!-- Drone controller body -->
        <rect x="60" y="78" width="160" height="46" rx="12" fill="#1a1a2e" stroke="${gd}" stroke-width="1.5"/>
        <!-- Left joystick -->
        <circle cx="95" cy="101" r="14" fill="#0d0d1a" stroke="${dm}" stroke-width="1"/>
        <circle cx="95" cy="101" r="7" fill="#333"/>
        <circle cx="95" cy="101" r="3" fill="${gd}" opacity="0.8"/>
        <!-- Right joystick -->
        <circle cx="185" cy="101" r="14" fill="#0d0d1a" stroke="${dm}" stroke-width="1"/>
        <circle cx="185" cy="101" r="7" fill="#333"/>
        <circle cx="185" cy="101" r="3" fill="${gd}" opacity="0.8"/>
        <!-- Screen -->
        <rect x="118" y="83" width="44" height="28" rx="4" fill="#051505" stroke="#0f0" stroke-width="1" opacity="0.8"/>
        <line x1="121" y1="92" x2="159" y2="92" stroke="#0f0" stroke-width="0.8" opacity="0.5"/>
        <line x1="121" y1="99" x2="159" y2="99" stroke="#0f0" stroke-width="0.8" opacity="0.5"/>
        <circle cx="140" cy="96" r="4" fill="none" stroke="#0f0" stroke-width="1" opacity="0.7"/>
        <!-- Fire button -->
        <circle cx="140" cy="124" r="9" fill="#ff2200" stroke="${dm}" stroke-width="1.5"/>
        <text x="140" y="128" text-anchor="middle" font-size="7" fill="#fff" font-family="Oswald">FIRE</text>
        <!-- Flame exhaust nozzle -->
        <rect x="220" y="88" width="50" height="14" rx="3" fill="#333" stroke="${dm}" stroke-width="1"/>
        <rect x="222" y="91" width="45" height="8" rx="2" fill="#ff4400" opacity="0.45"/>
        <ellipse cx="268" cy="95" rx="6" ry="5" fill="#ff6600" opacity="0.7"/>
        <ellipse cx="273" cy="95" rx="4" ry="3" fill="#ffaa00" opacity="0.6"/>
      </g>`,
      tank_cannon: `<g class="wh-weapon">
        <!-- Massive cannon barrel -->
        <rect x="1" y="87" width="240" height="20" rx="4" fill="#4a4a4a" stroke="${dm}" stroke-width="2"/>
        <!-- Barrel reinforcement bands -->
        <rect x="20" y="85" width="8" height="24" rx="2" fill="${dm}"/>
        <rect x="60" y="85" width="8" height="24" rx="2" fill="${dm}"/>
        <rect x="100" y="85" width="8" height="24" rx="2" fill="${dm}"/>
        <rect x="140" y="85" width="8" height="24" rx="2" fill="${dm}"/>
        <rect x="180" y="85" width="8" height="24" rx="2" fill="${dm}"/>
        <!-- Muzzle brake -->
        <rect x="1" y="82" width="20" height="30" rx="5" fill="#3a3a3a" stroke="${dm}" stroke-width="2"/>
        <rect x="3" y="84" width="5" height="26" rx="2" fill="${dm}"/>
        <rect x="9" y="84" width="5" height="26" rx="2" fill="${dm}"/>
        <rect x="15" y="84" width="5" height="26" rx="2" fill="${dm}"/>
        <!-- Breech -->
        <rect x="205" y="74" width="60" height="40" rx="8" fill="#555" stroke="${dm}" stroke-width="2"/>
        <circle cx="235" cy="94" r="12" fill="${dm}"/>
        <circle cx="235" cy="94" r="7" fill="#333"/>
        <!-- Gunner grip -->
        <path d="M223 114 Q232 148 226 168 L208 164 Q204 144 213 114Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <!-- Gold UA accent -->
        <rect x="206" y="74" width="58" height="4" rx="2" fill="${gd}" opacity="0.6"/>
        <!-- Breach handle -->
        <rect x="255" y="82" width="10" height="18" rx="3" fill="${dm}"/>
        <circle cx="260" cy="100" r="5" fill="#444"/>
      </g>`,
      bradley: `<g class="wh-weapon">
        <!-- 25mm Bushmaster autocannon barrel -->
        <rect x="1" y="89" width="200" height="12" rx="3" fill="#4a5040" stroke="${dm}" stroke-width="1.5"/>
        <!-- Gas tube above barrel -->
        <rect x="1" y="83" width="160" height="5" rx="2" fill="${dm}"/>
        <!-- Receiver -->
        <rect x="150" y="78" width="90" height="30" rx="6" fill="#4a5040" stroke="${dm}" stroke-width="1.5"/>
        <!-- Ammo feed chute (right side) -->
        <rect x="188" y="70" width="28" height="18" rx="4" fill="#3a3a2a" stroke="${dm}" stroke-width="1"/>
        <rect x="190" y="72" width="24" height="5" rx="2" fill="${gd}" opacity="0.45"/>
        <rect x="190" y="79" width="24" height="5" rx="2" fill="${gd}" opacity="0.35"/>
        <!-- Charging handle -->
        <rect x="230" y="77" width="8" height="5" rx="2" fill="${dm}"/>
        <circle cx="242" cy="79" r="4" fill="#3a3a2a"/>
        <!-- Pistol grip -->
        <path d="M205 108 Q213 142 207 162 L189 158 Q185 138 193 108Z" fill="${wd}" stroke="${dm}" stroke-width="1.5"/>
        <path d="M197 109 Q206 130 215 109" fill="none" stroke="${dm}" stroke-width="2.5"/>
        <!-- Muzzle flash guard -->
        <rect x="1" y="86" width="14" height="18" rx="3" fill="${dm}"/>
        <rect x="3" y="87" width="4" height="16" rx="1" fill="#333"/>
        <rect x="8" y="87" width="4" height="16" rx="1" fill="#333"/>
        <!-- UA digital camo stripe -->
        <rect x="151" y="78" width="88" height="4" rx="1" fill="${gd}" opacity="0.5"/>
      </g>`,
      clay: `<g class="wh-weapon">
        <!-- launcher tube -->
        <rect x="5" y="87" width="185" height="16" rx="8" fill="#8B5E3C" stroke="#5a3010" stroke-width="2"/>
        <!-- end cap -->
        <circle cx="6" cy="95" r="14" fill="#6a4020" stroke="#3a1808" stroke-width="1.5"/>
        <!-- clay balls in tube -->
        <circle cx="48" cy="95" r="9" fill="#c8a060" stroke="#7a4020" stroke-width="1.5"/>
        <circle cx="48" cy="92" r="4" fill="#d4b070" opacity="0.6"/>
    sndWeaponSwitch();
    $weaponHands
      .attr('data-weapon', currentWeapon)
      .removeClass('state-shoot state-reload')
      .addClass('state-switch-down');
    // Lower weapon, swap SVG, raise weapon
    setTimeout(() => {
      $weaponHands.html(weaponHandsSVG(currentWeapon));
      var _skinId = getEquippedWeaponSkin(currentWeapon);
      $weaponHands.attr('data-wskin', _skinId || '');
      $weaponHands.removeClass('state-switch-down').addClass('state-switch-up');
      setTimeout(() => $weaponHands.removeClass('state-switch-up'), 180);
    }, 14052 Q181 134 189 103Z" fill="#5a3010" stroke="#3a1808" stroke-width="1.5"/>
        <path d="M192 104 Q201 126 210 104" fill="none" stroke="#3a1808" stroke-width="3"/>
        <!-- clay mud smear on barrel -->
        <ellipse cx="100" cy="103" rx="22" ry="5" fill="#d4a040" opacity="0.35"/>
      </g>`,
    };

    const body = bodies[weapon] || bodies.revolver;
    // Arms removed — show only the weapon body (barrel/receiver/grip).
    // ViewBox crops to y=62-182 which is where all weapon bodies sit;
    // arms (y>182) are simply not rendered.
    return `<svg id="wh-svg" viewBox="0 62 290 120" width="100%" height="100%"
      xmlns="http://www.w3.org/2000/svg" overflow="visible" aria-hidden="true">
      ${body}
    </svg>`;
  }

  function renderWeaponHands() {
    $weaponHands
      .attr('data-weapon', currentWeapon)
      .removeClass('state-shoot state-reload')
      .html(weaponHandsSVG(currentWeapon));
    // Apply equipped weapon skin filter
    var _skinId = getEquippedWeaponSkin(currentWeapon);
    $weaponHands.attr('data-wskin', _skinId || '');
  }

  // Get equipped weapon skin for current weapon (CSS filter based)
  function getEquippedWeaponSkin(weaponKey) {
    var _owned; try { _owned = JSON.parse(localStorage.getItem('arc_cosmetics')||'[]'); } catch(e){ _owned=[]; }
    var _equipped = localStorage.getItem('arc_wskin_' + weaponKey) || '';
    if (_equipped && _owned.includes(_equipped)) return _equipped;
    // Auto-detect: check if any skin for this weapon is owned
    var _map = { revolver:'revo', ak47:'ak', m16:'m16', shotgun:'shot', lmg:'lmg', gl:'gl', sniper:'sniper' };
    var _sfx = _map[weaponKey] || weaponKey;
    var _found = _owned.find(function(id){ return id.indexOf('wskin_') === 0 && id.indexOf('_' + _sfx) > 0; });
    return _found || '';
  }

  function weaponHandsShoot() {
    $weaponHands.addClass('state-shoot');
    setTimeout(() => $weaponHands.removeClass('state-shoot'), 130);
  }

  function weaponHandsReload() {
    $weaponHands.addClass('state-reload');
    setTimeout(() => $weaponHands.removeClass('state-reload'), 700);
  }


  // ── Season system ────────────────────────────────────────────
  const SEASONS = ['winter', 'spring', 'summer', 'fall'];
  const currentSeason = SEASONS[Math.floor(new Date().getMonth() / 3) % 4];
  $canves.addClass('season-' + currentSeason);

  // ── Spawn decorative trees along bottom ─────────────────────
  (function spawnTrees() {
    var treeCt = $canves[0];
    var cw = treeCt.offsetWidth || 900;
    // place trees at 5 spread-out positions avoiding center battle zone
    var positions = [5, 12, 78, 86, 93];
    positions.forEach(function(pct, i) {
      var heightPx = 55 + Math.floor(Math.random() * 25);
      var trunkH   = Math.round(heightPx * 0.42);
      var $tree = $('<div class="env-tree"><div class="tree-canopy"></div><div class="tree-trunk"></div></div>');
      $tree.css({
        left: pct + '%',
        height: heightPx + 'px',
        'animation-delay': (i * 0.55) + 's',
        'animation-duration': (2.8 + Math.random() * 1.4) + 's'
      });
      $tree.find('.tree-trunk').css('height', trunkH + 'px');
      $canves.append($tree);
    });
  })();

  // ── Environmental particles (dust, leaves, clouds) ───────────
  let dustTimer = null;
  function spawnDust() {
    if (!gameActive || gamePaused) return;
    const $env = $('#env-layer');
    const cw = $canves.width(), ch = $canves.height();
    const sz = 3 + Math.random() * 4;
    const y = ch * (0.3 + Math.random() * 0.55);
    const cols = ['#c8a878','#b89060','#d0b890','#a0805a'];
    const col = cols[Math.floor(Math.random() * cols.length)];
    const dur = 3000 + Math.random() * 2000;
    const $d = $('<div class="dust-particle"></div>').css({
      left: '-10px', top: y + 'px',
      width: sz + 'px', height: sz + 'px',
      background: col, opacity: 0.4 + Math.random() * 0.3,
      '--dust-dx': (cw + 40) + 'px',
      '--dust-dy': ((Math.random() - 0.5) * 40) + 'px',
      animationDuration: dur + 'ms'
    });
    $env.append($d);
    setTimeout(() => $d.remove(), dur + 200);
  }
  function spawnLeaf() {
    if (!gameActive || gamePaused) return;
    if (currentSeason !== 'fall' && currentSeason !== 'spring') return;
    const $env = $('#env-layer');
    const cw = $canves.width(), ch = $canves.height();
    const startX = Math.random() * cw;
    const fallCols = ['#cc4400','#ff8800','#dd6600','#aa3300'];
    const springCols = ['#88cc44','#66aa22','#aae055'];
    const cols = currentSeason === 'fall' ? fallCols : springCols;
    const col = cols[Math.floor(Math.random() * cols.length)];
    const sz = 5 + Math.random() * 5;
    const dur = 2500 + Math.random() * 2500;
    const $l = $('<div class="leaf-particle"></div>').css({
      left: startX + 'px', top: '-10px',
      width: sz + 'px', height: sz * 0.6 + 'px',
      background: col, borderRadius: '50% 0 50% 0',
      '--leaf-dx': ((Math.random() - 0.5) * 120) + 'px',
      '--leaf-dy': (ch + 20) + 'px',
      animationDuration: dur + 'ms'
    });
    $env.append($l);
    setTimeout(() => $l.remove(), dur + 200);
  }
  function spawnClouds() {
    const $env = $('#env-layer');
    const cw = $canves.width(), ch = $canves.height();
    for (let i = 0; i < 2; i++) {
      const w = 80 + Math.random() * 120, h = 30 + Math.random() * 40;
      const y = Math.random() * ch * 0.35;
      const op = 0.06 + Math.random() * 0.08;
      const dur = 18000 + Math.random() * 12000;
      const $c = $('<div class="cloud-div"></div>').css({
        left: '-' + (w + 10) + 'px', top: y + 'px',
        width: w + 'px', height: h + 'px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,' + (op*2) + ') 0%, rgba(200,220,255,' + op + ') 60%, transparent 100%)',
        '--cloud-dx': (cw + w + 20) + 'px',
        animationDuration: dur + 'ms'
      });
      $env.append($c);
      setTimeout(() => $c.remove(), dur + 200);
    }
  }
  function startEnvParticles() {
    if (dustTimer) clearInterval(dustTimer);
    dustTimer = setInterval(() => {
      spawnDust();
      if (Math.random() > 0.6) spawnLeaf();
    }, 1800);
  }
  function stopEnvParticles() { if (dustTimer) { clearInterval(dustTimer); dustTimer = null; } }

  // ── Start game ────────────────────────────────────────────────
  function startGame() {
    resetGame();
    _gameStartMs = Date.now();
    _startGameTimer();
    // Restore saved streak from insurance
    var _savedStreak = parseInt(localStorage.getItem('arc_saved_streak') || '0', 10);
    if (_savedStreak > 0) {
      _comboKills = _savedStreak;
      _comboMultiLive = Math.min(2.0, 1.0 + _comboKills * 0.1);
      _updateComboHUD();
      localStorage.removeItem('arc_saved_streak');
      shooterSpeech('🔥 ' + _savedStreak + 'x streak restored!');
    }
    // Track session on server
    window._arcSessionId = null;
    if (window.ARC_API && window.ARC_API.startSession) {
      window.ARC_API.startSession().then(function(d) { if (d && d.session_id) window._arcSessionId = d.session_id; }).catch(function(){});
    }
    // Fresh random music profile for this entire session
    currentMusicProfile = Math.floor(Math.random() * MUSIC_PROFILES.length);
    if (window.ARC_GAME && window.ARC_GAME._startEngineExtras) window.ARC_GAME._startEngineExtras();
    $gameCover.fadeIn(100, () => $canves.attr('data-wave', '1'));
    setTimeout(() => {
      $gameCover.fadeOut(100, () => {
        gameActive = true;
        updateScoreHUD();
        $('#game-crosshair').addClass('active');
        if (!mutedMusic) startMusic();
        _startAmbient();
        startWave(WAVE_1_ZOMBIE_FRQ, WAVE_1_ZOMBIE_QTY);
        scheduleWeather();
        startEnvParticles();
        setTimeout(spawnClouds, 500);
        _cloudTimer = setInterval(spawnClouds, 22000);
      });
    }, 150);  // B176: reduced intro fade delay
  }

  // ── Preload & init ──────────────────────────────────────────────
  function preload(files, cb) {
    let left = files.length;
    if (left === 0) { cb(); return; }
    files.forEach(file => {
      const img = new Image();
      const done = () => { if (--left === 0) cb(); };
      img.onload = function() { (img.decode ? img.decode() : Promise.resolve()).then(done, done); };
      img.onerror = done;
      img.src = file;
    });
  }

  renderAmmoUI();
  $canves.find('.zombie-loader').addClass('zombie-' + getRandom(1, 3));

  // ── Failsafe: guarantee loader dismisses even if preload hangs ──────────
  var _loaderDismissed = false;
  function _dismissLoader() {
    if (_loaderDismissed) return;
    _loaderDismissed = true;
    $canves.find('.loader').remove();
    $canves.removeClass('loading');
  }
  setTimeout(function() {
    if (!_loaderDismissed) {
      console.warn('[ARC] Failsafe: loader not dismissed after 8s — forcing removal');
      _dismissLoader();
      // Also show the game cover if it hasn't appeared
      if (!$gameCover.is(':visible')) {
        $gameCover.addClass('show-start-btn').fadeIn('slow');
        $canves.attr('data-wave', '1');
      }
    }
  }, 8000);

  preload([
    'images/zombies/zombie-1.png', 'images/zombies/zombie-2.png', 'images/zombies/zombie-3.png',
    'images/background/bg-1.png',  'images/background/bg-2.png',
    'images/background/bg-3.png',  'images/background/putinoffice.jpg',
    'images/ui/frame.png', 'images/ui/icons.png', 'images/vehicles/truck.png',
    'images/vehicles/bradley.png', 'images/vehicles/firedrone.png', 'images/vehicles/rover.png',
    'images/zombies/zombie-1-death.png', 'images/zombies/zombie-2-death.png',
    'images/zombies/zombie-3-death.png', 'images/zombies/zombie-4.png',
    'images/zombies/zombie-4-death.png', 'images/zombies/zombie-5.png',
    'images/zombies/zombie-5-death.png', 'images/zombies/zombie-6.png',
    'images/zombies/zombie-6-death.png',
  ], function () {
    _dismissLoader();
    // Prime AudioContext on first interaction — must resume for browser autoplay policy
    $(document).one('click', function() { var ac = getACtx(); if (ac.state === 'suspended') ac.resume().catch(function(){}); });
    // ── Registration before start screen ──
    showRegModal(_showStartScreen);
  });

  function _showStartScreen() {
    // ── First-launch start screen (button must be clicked to begin) ──
    // Typewriter animation for the ruscism definition (i18n-aware)
    (function _startTypewriter() {
      var fullText = t('ruscismDef');
      var $el  = $('#cover-typewriter');
      var idx  = 0, timer = null;
      function type() {
        if (idx <= fullText.length) {
          $el.text(fullText.slice(0, idx));
          idx++;
          timer = setTimeout(type, idx < 6 ? 120 : 28 + Math.random() * 22);
        }
      }
      window._restartTypewriter = function() {
        clearTimeout(timer);
        fullText = t('ruscismDef');
        idx = 0;
        type();
      };
      $el.text('');
      setTimeout(type, 700);
    })();
    $gameCover.addClass('show-start-btn').fadeIn('slow');
    $canves.attr('data-wave', '1');
    resetGame();
    $('#start-game-btn').one('click', function () {
      $(document).off('keydown.startgame');
      var ac = getACtx(); if (ac.state === 'suspended') ac.resume().catch(function(){});
      $gameCover.removeClass('show-start-btn').fadeOut('slow', () => {
        gameActive = true;
        _gameStartMs = Date.now();
        _startGameTimer();
        updateScoreHUD();
        $('#game-crosshair').addClass('active');
        if (!mutedMusic) startMusic();
        startWave(WAVE_1_ZOMBIE_FRQ, WAVE_1_ZOMBIE_QTY);
        scheduleWeather();
      });
    });
    // Keyboard start: Enter/Space starts the game from intro screen
    $(document).on('keydown.startgame', function(e) {
      if (e.which !== 13 && e.which !== 32) return;
      if ($('#inventory-panel').hasClass('open') || $('.confirm-overlay').length) return;
      e.preventDefault();
      $('#start-game-btn').trigger('click');
    });
    // Initialise referral rewards (checks ?ref= URL param on first load)
    checkReferralParam();
    if (typeof _applyCosmetics === 'function') _applyCosmetics();
    checkPvpChallenge();              // read ?pvp= params
    // Initialise daily login streak (awards ARC + badges for consecutive days)
    initLoginStreak();

    // ── Desktop Lobby Hub wiring ──────────────────────────────────
    (function _wireLobby() {
      var _lobbyMap = {
        'lobby-spin':     function(){ buildInventory(); $('[data-target="inv-sec-earn"]').trigger('click'); setTimeout(function(){ doSpinWheel(false); }, 200); },
        'lobby-armory':   function(){ buildInventory(); $('[data-target="inv-sec-armory"]').trigger('click'); },
        'lobby-nft':      function(){ buildInventory(); $('[data-target="inv-sec-nfts"]').trigger('click'); },
        'lobby-missions': function(){ buildInventory(); $('[data-target="inv-sec-missions"]').trigger('click'); },
        'lobby-stake':    function(){ buildInventory(); $('[data-target="inv-sec-staking"]').trigger('click'); },
        'lobby-shop':     function(){ buildInventory(); $('[data-target="inv-sec-market"]').trigger('click'); },
        'lobby-watch-ad': function(){ if (typeof _owRefreshList === 'function') _owRefreshList(); $('#offerwall-modal').addClass('open'); },
        'lobby-refer':    function(){ buildInventory(); $('[data-target="inv-sec-earn"]').trigger('click'); }
      };
      $.each(_lobbyMap, function(id, fn) {
        $('#'+id).on('click', function(){ gamePaused = true; fn(); });
      });
      // Update lobby balance display
      var _lobbyArc = document.getElementById('lb-arc-amount');
      if (_lobbyArc) _lobbyArc.textContent = arcoins || 0;
    })();

    // ── Offerwall modal (created once, reused by earn section) ──
    const _arcAnonId = localStorage.getItem('arc_anon_id') || (function () {
      const _id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('arc_anon_id', _id);
      return _id;
    })();
    // ── Watch & Earn — real YouTube embeds from curated UA defence channels ──
    // B181: ALL video IDs verified real via oembed API (Mar 25 2026)
    // Channels: @UNITED24media, @ButusovPlus, @backandalive, @Militarnyi
    // To update: replace the `yt` value with any YouTube video ID (11 chars after v=)
    const _OW_OFFERS = [
      { title: '🎬 Inside Azov FPV Pilot Gear', dur: 30, arc: 8, yt: 'fiOHNmfNQfU', ch: 'UNITED24' },
      { title: '🚀 Ukraine Built the Deadliest Drone Army', dur: 45, arc: 12, yt: 'CluOjwed8ik', ch: 'UNITED24' },
      { title: '🎖 Azov Sergeant — Soldiers Reality at War', dur: 35, arc: 10, yt: 'EC6xPRQn2NQ', ch: 'UNITED24' },
      { title: '🏥 Reality of Being a Surgeon in Ukraine War', dur: 25, arc: 7, yt: 'GoaXPAYuntE', ch: 'UNITED24' },
      { title: '📰 Butusov Plus — Front Line Investigation', dur: 20, arc: 5, yt: 'osb-RnIJxxA', ch: 'Butusov Plus' },
    ];
    let _owActive = null; // { idx, timer, interval }
    function _owBuildList() {
      return _OW_OFFERS.map(function (o, i) {
        const done = localStorage.getItem('ow_done_' + i + '_' + _arcAnonId);
        return '<div class="ow-offer' + (done ? ' ow-offer--done' : '') + '" data-idx="' + i + '">'
          + '<span class="ow-offer-title">' + o.title + (o.ch ? '<span class="ow-offer-ch">@' + o.ch + '</span>' : '') + '</span>'
          + '<span class="ow-offer-reward">+' + o.arc + ' ARC</span>'
          + (done
            ? '<span class="ow-offer-status ow-done">✓ Claimed</span>'
            : '<button class="ow-watch-btn" data-idx="' + i + '">▶ Watch (' + o.dur + 's)</button>')
          + '</div>';
      }).join('');
    }
    const $owModal = $('<div id="offerwall-modal"><div class="offerwall-inner">'
      + '<div class="offerwall-hdr"><span class="offerwall-title">📺 Watch &amp; Earn ARC</span>'
      + '<button id="offerwall-close">✕</button></div>'
      + '<p class="ow-sub">Watch real Ukrainian defence clips to earn Anti-Ruscist Coin. Each offer can be claimed once per session.</p>'
      + '<div id="ow-offer-list"></div>'
      + '<div id="ow-progress-wrap" style="display:none">'
      +   '<div id="ow-yt-frame-wrap"></div>'
      +   '<div class="ow-progress-title" id="ow-prog-title"></div>'
      +   '<div class="ow-bar-bg"><div class="ow-bar-fill" id="ow-bar-fill"></div></div>'
      +   '<div class="ow-prog-label" id="ow-prog-label">0s / 0s</div>'
      +   '<button id="ow-cancel-btn">✕ Cancel</button>'
      + '</div>'
      + '</div></div>');
    $('body').append($owModal);
    function _owRefreshList() {
      $owModal.find('#ow-offer-list').html(_owBuildList());
    }
    $owModal.on('click', '#offerwall-close', function () {
      if (_owActive) { clearInterval(_owActive.interval); _owActive = null; }
      $owModal.find('#ow-yt-frame-wrap').empty();
      $owModal.find('#ow-progress-wrap').hide();
      $owModal.removeClass('open');
    });
    $owModal.on('click', '#ow-cancel-btn', function () {
      if (_owActive) { clearInterval(_owActive.interval); _owActive = null; }
      $owModal.find('#ow-yt-frame-wrap').empty();
      $owModal.find('#ow-progress-wrap').hide();
      _owRefreshList();
    });
    $owModal.on('click', '.ow-watch-btn', function () {
      if (_owActive) return;
      const idx = parseInt($(this).data('idx'), 10);
      const offer = _OW_OFFERS[idx];
      let elapsed = 0;
      $owModal.find('#ow-offer-list').hide();
      const $wrap = $owModal.find('#ow-progress-wrap').show();
      // Inject YouTube iframe if offer has a video ID
      const $ytWrap = $owModal.find('#ow-yt-frame-wrap').empty();
      if (offer.yt) {
        $ytWrap.html('<iframe class="ow-yt-iframe" src="https://www.youtube-nocookie.com/embed/'
          + encodeURIComponent(offer.yt) + '?autoplay=1&rel=0&modestbranding=1" '
          + 'allow="autoplay; encrypted-media" allowfullscreen></iframe>');
      }
      $owModal.find('#ow-prog-title').text(offer.title);
      $owModal.find('#ow-prog-label').text('0s / ' + offer.dur + 's');
      $owModal.find('#ow-bar-fill').css('width', '0%');
      _owActive = { idx: idx, interval: setInterval(function () {
        elapsed++;
        const pct = Math.min(100, Math.round(elapsed / offer.dur * 100));
        $owModal.find('#ow-bar-fill').css('width', pct + '%');
        $owModal.find('#ow-prog-label').text(elapsed + 's / ' + offer.dur + 's');
        if (elapsed >= offer.dur) {
          clearInterval(_owActive.interval);
          _owActive = null;
          $owModal.find('#ow-yt-frame-wrap').empty();
          localStorage.setItem('ow_done_' + idx + '_' + _arcAnonId, '1');
          $wrap.hide();
          $owModal.find('#ow-offer-list').show();
          _owRefreshList();
          earnArcoin(offer.arc, offer.title);
          showConfirm({ title: '🎉 ARC Earned!',
            body: '<strong style="font-size:22px;color:#0057B8">+' + offer.arc + ' ARC</strong><br>Thanks for watching!',
            confirmTxt: '🎮 Keep Playing', cancelTxt: false });
        }
      }, 1000) };
    });
    // List is refreshed synchronously via the earn-offerwall-btn click handler above

    // Initialise Polygon / MetaMask wallet connectivity
    initWeb3();
    // Show testnet badge — inline with version-overlay, not footer sidebar
    if (TESTNET_MODE) {
      $('#testnet-badge').hide();
      var _vov = document.getElementById('version-overlay');
      if (_vov && !_vov.querySelector('.testnet-inline')) {
        var _tn = document.createElement('span');
        _tn.className = 'testnet-inline';
        _tn.textContent = '⚠ TESTNET · Polygon Amoy · no real funds';
        _vov.appendChild(_tn);
      }
    } else {
      $('#testnet-badge').hide();
    }
    $('#wallet-connect-btn').off('click.wallet').on('click.wallet', function () {
      if (walletAddr && walletChainId !== POLYGON_CHAIN_ID) {
        connectWallet(); // re-connect to trigger chain switch
      } else if (!walletAddr) {
        connectWallet();
      }
    });

    // ── Blockchain help-button tooltips (delegated, works in inventory) ────
    let _bcTipEl = null;
    $(document).on('mouseenter.bctip', '.bc-help-btn', function (e) {
      const tip = $(this).attr('data-bc-tip');
      if (!tip) return;
      if (_bcTipEl) { _bcTipEl.remove(); _bcTipEl = null; }
      const $t = $('<div class="bc-help-tooltip"></div>').text(tip);
      $('body').append($t);
      const r  = e.currentTarget.getBoundingClientRect();
      const tw = $t[0].offsetWidth;
      let   lx = r.left + r.width / 2 - tw / 2;
      lx = Math.max(8, Math.min(lx, window.innerWidth - tw - 8));
      $t.css({ top: (r.bottom + 8) + 'px', left: lx + 'px' });
      _bcTipEl = $t;
    }).on('mouseleave.bctip click.bctip', '.bc-help-btn', function () {
      if (_bcTipEl) { _bcTipEl.remove(); _bcTipEl = null; }
    });
  }

  // ── Fit canvas to full viewport ────────────────────────────────
  // Canvas is 1024×550. Scale from centre to fill available screen area.
  // visualViewport gives the real visible size on mobile (excludes OS chrome,
  // virtual keyboard, and notch insets) — falls back to window dimensions.
  var _fitTimer = null;
  function fitCanvas() {
    const vp = window.visualViewport;
    const vw = vp ? vp.width  : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;
    const footerH = ($('footer').outerHeight(true) || 0);
    const s = Math.min(vw / 1024, (vh - footerH) / 550);
    document.documentElement.style.setProperty('--canvas-scale', Math.max(0.25, s).toFixed(4));
  }
  function _throttledFit() { if (!_fitTimer) { _fitTimer = setTimeout(function(){ _fitTimer = null; fitCanvas(); }, 100); } }
  $(window).on('resize.fit', _throttledFit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', _throttledFit);
  fitCanvas();

  // ── Global bridge — engine-extras.js hooks in via window.ARC_GAME ──────────
  window.ARC_GAME = {
    get $canves()         { return $canves; },
    get wave()            { return wave; },
    get gameActive()      { return gameActive; },
    set gameActive(v)     { gameActive = v; },
    get gamePaused()      { return gamePaused; },
    set gamePaused(v)     { gamePaused = v; },
    get godMode()         { return godMode; },
    get zombieKilled()    { return zombieKilled; },
    get shooterHp()       { return shooterHp; },
    set shooterHp(v)      { shooterHp = v; updateShooterHpBar(); },
    get life()            { return life; },
    set life(v)           { life = v; },
    earnArcoin:           function(n,r)    { earnArcoin(n,r); },
    doExplosion:          function(x,y,s)  { doExplosion(x,y,s); },
    applyZombieDmg:       function($z,d,x,y,h,g) { return applyZombieDmg($z,d,x,y,h,g); },
    killZombieEl:         function($z,x,y,h,g)    { killZombieEl($z,x,y,h,g); },
    addShooterXP:         function(n)      { addShooterXP(n); },
    shooterSpeech:        function(t,c)    { shooterSpeech(t,c); },
    damageShooter:        function(n)      { damageShooter(n); },
    sndZombieScream:      function(k)      { sndZombieScream(k); },
    getACtx:              getACtx,
    getMaster:            getMaster,
    getRandom:            getRandom,
    addScore:             function(n)      { score += n; updateScoreHUD(); },
    addCredits:           function(n)      { credits += n; updateScoreHUD(); },
    getScore:             function()       { return score; },
    getCredits:           function()       { return credits; },
    doHitMarker:          function(x,y,h)  { doHitMarker(x,y,h); },
    updateScoreHUD:       function()       { updateScoreHUD(); },
    setHandlers:          function()       { setHandlers(); },
    createZombies:        function()       { createZombies(); },
    startMusic:           startMusic,
    stopMusic:            stopMusic,
    get _musicGain()      { return _musicGain; },
    get mutedMusic()      { return mutedMusic; },
    get shooterShotsFired() { return shooterShotsFired; },
    get shooterShotsHit()   { return shooterShotsHit; },
    get arcoins()           { return arcoins; },
  };

  // ── Connect to backend API (if available) ──────────────────────────
  if (window.ARC_API && typeof window.ARC_API.startAutoSync === 'function') {
    try { window.ARC_API.startAutoSync(); } catch(e) { console.warn('[ARC] API sync unavailable:', e.message); }
  }

  // ── Offline / Online detection ───────────────────────────────────────
  var _offlineToast = null;
  window._isOffline = !navigator.onLine;
  function _showOfflineToast() {
    if (_offlineToast) return;
    _offlineToast = $('<div class="offline-toast">📡 Offline — progress saved locally</div>');
    $canves.append(_offlineToast);
    requestAnimationFrame(function() { _offlineToast.addClass('offline-toast--in'); });
  }
  function _hideOfflineToast() {
    if (!_offlineToast) return;
    _offlineToast.addClass('offline-toast--out');
    var t = _offlineToast; _offlineToast = null;
    setTimeout(function() { t.remove(); }, 600);
  }
  window.addEventListener('offline', function() { window._isOffline = true; _showOfflineToast(); });
  window.addEventListener('online', function() { window._isOffline = false; _hideOfflineToast(); });
  if (window._isOffline) _showOfflineToast();

  // ── Auto-pause when tab loses focus ─────────────────────────────────
  document.addEventListener('visibilitychange', function() {
    if (document.hidden && gameActive && !gamePaused) {
      gamePaused = true;
      $canves.find('#pause-game').trigger('click');
    }
  });

  // ── Reduced Motion preference ───────────────────────────────────────
  window._reducedMotion = localStorage.getItem('arc_reduced_motion') === '1' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Screen Shake preference (default: on) ──────────────────────────
  window._shakeEnabled = localStorage.getItem('arc_screen_shake') !== '0';

  // ── FPS Counter (default: off) ─────────────────────────────────────
  window._fpsEnabled = localStorage.getItem('arc_fps_counter') === '1';
  window._fpsRafRunning = false;
  function _startFpsCounter() {
    if (window._fpsRafRunning) return;
    window._fpsRafRunning = true;
    var frames = 0, last = performance.now(), $el = $('#fps-counter');
    (function loop() {
      if (!window._fpsEnabled) { window._fpsRafRunning = false; return; }
      frames++;
      var now = performance.now();
      if (now - last >= 1000) {
        $el.text(frames + ' FPS');
        frames = 0; last = now;
      }
      requestAnimationFrame(loop);
    })();
  }
  if (window._fpsEnabled) { $('#fps-counter').show(); _startFpsCounter(); }

  // ── Live Accuracy HUD (default: off) ────────────────────────────────
  window._accHudEnabled = localStorage.getItem('arc_accuracy_hud') === '1';
  function _updateAccuracyHUD() {
    if (!window._accHudEnabled) return;
    var pct = shooterShotsFired > 0 ? Math.round(shooterShotsHit / shooterShotsFired * 100) : 0;
    $('#accuracy-hud').text('🎯 ' + pct + '%');
  }
  if (window._accHudEnabled) { $('#accuracy-hud').show(); }

  // ── First-wave tutorial for brand new players ───────────────────────
  (function _initTutorial() {
    if (localStorage.getItem('arc_tutorial_done')) return;
    var _tipShown = {};
    function _tip(id, html, delay) {
      if (_tipShown[id]) return;
      _tipShown[id] = true;
      setTimeout(function() {
        var $t = $('<div class="tut-tip tut-tip--' + id + '">' + html + '</div>');
        $canves.append($t);
        requestAnimationFrame(function() { $t.addClass('tut-tip--in'); });
        setTimeout(function() { $t.addClass('tut-tip--out'); setTimeout(function() { $t.remove(); }, 600); }, 4000);
      }, delay || 0);
    }
    // Tip 1: on game start (first zombie appearance)
    var _tutObs = setInterval(function() {
      if (!gameActive) { clearInterval(_tutObs); return; }
      _tip('shoot', '🎯 Click on zombies to shoot!', 500);
      clearInterval(_tutObs);
      // Tip 2: after first kill
      var _killObs = setInterval(function() {
        if (!gameActive) { clearInterval(_killObs); return; }
        if (zombieKilled >= 1) {
          _tip('headshot', '💀 Aim for the HEAD for 3× damage!', 300);
          clearInterval(_killObs);
        }
      }, 500);
      // Tip 3: on wave 2
      var _waveObs = setInterval(function() {
        if (!gameActive) { clearInterval(_waveObs); return; }
        if (wave >= 2) {
          _tip('reload', '🔄 Press R to reload · Q to switch weapons', 300);
          clearInterval(_waveObs);
          localStorage.setItem('arc_tutorial_done', '1');
        }
      }, 1000);
    }, 500);
  })();

}); // end document.ready
