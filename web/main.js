// ============================================================================
// Will's Backyard -- browser runtime.
// Boots the wasm core, pumps input into it, draws what it hands back, and
// renders the HUD/menus as DOM on top of the GL canvas.
// ============================================================================

var LEVEL_NAMES = [
  "The Back Lawn",
  "Deck Feast",
  "The Playhouse",
  "Under the Hutch",
  "Night Run",
  "Trash Night"
];

var LEVEL_HINTS = [
  "Crumbs are points, real food is loot. Snap traps <em>click</em> before they bite — keep moving.",
  "Will is working the grill. Drop under the deck when he turns your way — he can't see beneath his own boards.",
  "Ride the swings, climb the rope net. Popcorn hears everything, so hold <kbd>Shift</kbd> and sneak.",
  "Pitch dark, and every trap is baited. Crouch beside one and press <kbd>E</kbd> to lift the bait safely. Stay out of the beam.",
  "Will is up, Popcorn is loose, and the hedge is a long way off. Run.",
  "Will and Popcorn are asleep. The raccoons are not. They burst out of the bins when you get close, and they would rather rob you than eat you &mdash; but they will settle for eating you. Thermal shows their body heat <em>through</em> cover: use it."
];

var LEVEL_BLURBS = [
  "Dusk. The leaves are down and nobody is watching. Yet.",
  "The pumpkins are out and the grill is hot. So is Will.",
  "The kids left their snacks on the playhouse deck.",
  "Under the wood hutch, where Will keeps the good traps.",
  "Last run. Get to the neighbour's hedge.",
  "Late. The bins have eyes."
];

var FOOD_NAMES = [
  "Crumb", "Cheese", "Bacon", "Hot Dog", "Marshmallow",
  "Pumpkin Seed", "Cookie", "Juice Box", "Chips"
];

var PHASE = { TITLE: 0, INTRO: 1, PLAYING: 2, CAUGHT: 3, COMPLETE: 4, GAMEOVER: 5, FINISHED: 6 };

var EV = {
  JUMP: 1 << 0, LAND: 1 << 1, PICKUP: 1 << 2, LOOT: 1 << 3, SNAP: 1 << 4,
  ZAP: 1 << 5, HURT: 1 << 6, ALERT: 1 << 7, BARK: 1 << 8, CAUGHT: 1 << 9,
  SAFE: 1 << 10, DISARM: 1 << 11, STUCK: 1 << 12, STEP: 1 << 13, CHECKPOINT: 1 << 14,
  STOLEN: 1 << 15
};

// ---------------------------------------------------------------------------
// Audio -- everything is synthesised; the page stays a single file.
// ---------------------------------------------------------------------------

var Audio_ = (function () {
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var muted = false, started = false;
  var nextNote = 0, step = 0, timer = null, mood = 0;

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.42; sfxGain.connect(master);
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (!started && ctx) { started = true; nextNote = ctx.currentTime + 0.1; schedule(); }
  }

  function env(node, t, a, d, peak) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, t, dur, type, peak, bend) {
    if (!ctx || muted) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(20, bend), t + dur);
    env(g, t, 0.008, dur, peak || 0.3);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(t, dur, peak, lo, hi) {
    if (!ctx || muted) return;
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(hi || 1400, t);
    if (lo) f.frequency.exponentialRampToValueAtTime(lo, t + dur);
    f.Q.value = 1.1;
    var g = ctx.createGain(); env(g, t, 0.004, dur, peak || 0.3);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // ---- the music bed ----
  // One bar of a gentle arpeggio; the scale shifts with the level's mood.
  var SCALES = [
    [0, 4, 7, 11, 14, 11, 7, 4],      // afternoon: major 7, bright
    [0, 3, 7, 10, 14, 10, 7, 3],      // dusk: minor 7, wistful
    [0, 3, 7, 10, 12, 15, 12, 7],     // night: tense
    [0, 1, 5, 8, 12, 8, 5, 1]         // underside: unsettled
  ];
  var ROOTS = [196.0, 174.6, 146.8, 130.8];

  function schedule() {
    if (!ctx) return;
    var ahead = 0.4;
    while (nextNote < ctx.currentTime + ahead) {
      var sc = SCALES[mood], root = ROOTS[mood];
      var n = sc[step % sc.length];
      var f = root * Math.pow(2, n / 12);
      if (!muted) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = mood === 3 ? 'sine' : 'triangle';
        o.frequency.value = f * 2;
        g.gain.setValueAtTime(0.0001, nextNote);
        g.gain.exponentialRampToValueAtTime(0.22, nextNote + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, nextNote + 0.42);
        o.connect(g); g.connect(musicGain);
        o.start(nextNote); o.stop(nextNote + 0.5);
        if (step % 8 === 0) {
          var b = ctx.createOscillator(), bg = ctx.createGain();
          b.type = 'sine'; b.frequency.value = root / 2;
          bg.gain.setValueAtTime(0.0001, nextNote);
          bg.gain.exponentialRampToValueAtTime(0.5, nextNote + 0.04);
          bg.gain.exponentialRampToValueAtTime(0.0001, nextNote + 1.3);
          b.connect(bg); bg.connect(musicGain);
          b.start(nextNote); b.stop(nextNote + 1.4);
        }
      }
      nextNote += mood === 2 ? 0.21 : 0.26;
      step++;
    }
    timer = setTimeout(schedule, 120);
  }

  function setMood(m) { mood = m | 0; }
  function setTension(t) {
    if (musicGain && ctx) {
      musicGain.gain.setTargetAtTime(0.13 + t * 0.16, ctx.currentTime, 0.4);
    }
  }

  function play(name) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    switch (name) {
      case 'jump':   tone(440, t, 0.12, 'square', 0.18, 760); break;
      case 'land':   noise(t, 0.07, 0.12, 300, 900); break;
      case 'step':   noise(t, 0.035, 0.05, 400, 1100); break;
      case 'pickup': tone(880, t, 0.09, 'triangle', 0.2); tone(1320, t + 0.05, 0.1, 'triangle', 0.15); break;
      case 'loot':
        [0, 4, 7, 12].forEach(function (n, i) {
          tone(523.25 * Math.pow(2, n / 12), t + i * 0.055, 0.2, 'triangle', 0.22);
        });
        break;
      case 'snap':   noise(t, 0.11, 0.55, 200, 2600); tone(180, t, 0.09, 'square', 0.3, 60); break;
      case 'zap':
        for (var i = 0; i < 5; i++) tone(900 + Math.random() * 1600, t + i * 0.015, 0.05, 'sawtooth', 0.14);
        noise(t, 0.16, 0.25, 600, 4000);
        break;
      case 'hurt':   tone(320, t, 0.26, 'sawtooth', 0.3, 110); break;
      case 'alert':  tone(660, t, 0.1, 'square', 0.3); tone(880, t + 0.11, 0.22, 'square', 0.3); break;
      case 'bark':
        tone(220, t, 0.07, 'sawtooth', 0.34, 150);
        tone(260, t + 0.1, 0.09, 'sawtooth', 0.3, 140);
        noise(t, 0.12, 0.2, 300, 1200);
        break;
      case 'caught':
        [0, -2, -4, -7].forEach(function (n, i) {
          tone(392 * Math.pow(2, n / 12), t + i * 0.1, 0.3, 'square', 0.26);
        });
        break;
      case 'safe':
        [0, 4, 7, 12, 16].forEach(function (n, i) {
          tone(392 * Math.pow(2, n / 12), t + i * 0.09, 0.45, 'triangle', 0.26);
        });
        break;
      case 'disarm': tone(1046, t, 0.07, 'sine', 0.22); tone(1568, t + 0.06, 0.14, 'sine', 0.18); break;
      case 'stuck':  noise(t, 0.3, 0.2, 120, 500); break;
      case 'check':  tone(659, t, 0.1, 'sine', 0.2); tone(988, t + 0.08, 0.2, 'sine', 0.18); break;
      case 'stolen':
        // A chittering snatch, then the sound of it leaving.
        for (var k = 0; k < 6; k++) tone(900 - k * 60, t + k * 0.035, 0.06, 'square', 0.16);
        tone(330, t + 0.2, 0.3, 'sawtooth', 0.22, 120);
        noise(t, 0.18, 0.2, 400, 2200);
        break;
    }
  }

  function toggle() {
    muted = !muted;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
    return muted;
  }

  return { resume: resume, play: play, toggle: toggle, setMood: setMood, setTension: setTension,
           isMuted: function () { return muted; } };
})();

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

var IN = { LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8, JUMP: 16, SNEAK: 32, ACTION: 64 };
var keys = {};
var touchBits = 0;

var KEYMAP = {
  ArrowLeft: IN.LEFT, KeyA: IN.LEFT,
  ArrowRight: IN.RIGHT, KeyD: IN.RIGHT,
  ArrowUp: IN.UP, KeyW: IN.UP,
  ArrowDown: IN.DOWN, KeyS: IN.DOWN,
  Space: IN.JUMP, KeyZ: IN.JUMP,
  ShiftLeft: IN.SNEAK, ShiftRight: IN.SNEAK,
  KeyE: IN.ACTION, KeyJ: IN.ACTION, KeyX: IN.ACTION
};

function inputBits() {
  var b = touchBits;
  for (var code in keys) if (keys[code] && KEYMAP[code]) b |= KEYMAP[code];
  // Up doubles as jump, the way old platformers did.
  if (b & IN.UP) b |= IN.JUMP;

  var pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (var i = 0; i < pads.length; i++) {
    var p = pads[i];
    if (!p) continue;
    var ax = p.axes[0] || 0;
    if (ax < -0.35) b |= IN.LEFT;
    if (ax > 0.35) b |= IN.RIGHT;
    if (p.axes[1] < -0.5) b |= IN.UP;
    if (p.axes[1] > 0.5) b |= IN.DOWN;
    if (p.buttons[12] && p.buttons[12].pressed) b |= IN.UP;
    if (p.buttons[13] && p.buttons[13].pressed) b |= IN.DOWN;
    if (p.buttons[14] && p.buttons[14].pressed) b |= IN.LEFT;
    if (p.buttons[15] && p.buttons[15].pressed) b |= IN.RIGHT;
    if (p.buttons[0] && p.buttons[0].pressed) b |= IN.JUMP;
    if (p.buttons[2] && p.buttons[2].pressed) b |= IN.ACTION;
    if (p.buttons[1] && p.buttons[1].pressed) b |= IN.ACTION;
    if ((p.buttons[6] && p.buttons[6].value > 0.4) || (p.buttons[10] && p.buttons[10].pressed)) b |= IN.SNEAK;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function base64ToBytes(b64) {
  var bin = atob(b64);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

var wasm = null, mem = null, memF32 = null;
var renderer = null, canvas = null;
var ui = {};
var state = { phase: -1, level: 0, unlocked: 0, levelCount: 5, paused: false, menu: 'title' };
var lastTime = 0, accum = 0;

function refreshViews() {
  if (!mem || mem.buffer !== memF32.buffer) memF32 = new Float32Array(mem.buffer);
}

function el(id) { return document.getElementById(id); }

function boot() {
  canvas = el('game');
  try {
    renderer = createRenderer(canvas);
  } catch (e) {
    showFatal('This browser could not start WebGL.<br><small>' + e.message + '</small>');
    return;
  }

  var bytes = base64ToBytes(WASM_B64);
  WebAssembly.instantiate(bytes, {}).then(function (res) {
    wasm = res.instance.exports;
    mem = wasm.memory;
    memF32 = new Float32Array(mem.buffer);
    wasm.wb_init((Math.random() * 0xffffffff) >>> 0);
    state.levelCount = wasm.wb_level_count();
    cacheUi();
    bindEvents();
    resize();
    showMenu('title');
    requestAnimationFrame(frame);
  }).catch(function (e) {
    showFatal('The game core failed to load.<br><small>' + e.message + '</small>');
  });
}

function showFatal(html) {
  var o = el('fatal');
  o.innerHTML = '<div class="card"><h2>Trouble in the backyard</h2><p>' + html + '</p></div>';
  o.style.display = 'flex';
}

function cacheUi() {
  ['hud', 'hearts', 'score', 'loot', 'lootMax', 'tensionFill', 'levelName', 'timer',
   'powerups', 'toast', 'menu', 'menuBody', 'progressFill', 'promptHint', 'crumbCount',
   'muteBtn', 'irBtn', 'touch', 'rotate'].forEach(function (id) { ui[id] = el(id); });
}

// A phone is anything with touch and no fine pointer; a laptop trackpad has
// touch events in some browsers, so check the pointer type too.
var isTouch = ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) &&
  !(window.matchMedia && window.matchMedia('(pointer: fine)').matches);

var portraitBlocked = false;

function resize() {
  // Phones are slower and the canvas cost scales with pixels, so cap harder.
  var maxDpr = isTouch ? 1.75 : 2;
  var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  var w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  // A side-scroller in portrait shows almost nothing either side of the rat.
  portraitBlocked = isTouch && (w / h) < 1.05;
  ui.rotate.classList.toggle('show', portraitBlocked);
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

function levelCard(i, locked) {
  return '<button class="lvl' + (locked ? ' locked' : '') + '" data-level="' + i + '"' +
    (locked ? ' disabled' : '') + '>' +
    '<span class="num">' + (i + 1) + '</span>' +
    '<span class="info"><strong>' + LEVEL_NAMES[i] + '</strong>' +
    '<em>' + (locked ? 'Locked' : LEVEL_BLURBS[i]) + '</em></span></button>';
}

function showMenu(which, data) {
  state.menu = which;
  var b = ui.menuBody, html = '';
  data = data || {};

  if (which === 'title') {
    html =
      '<div class="title-art">' +
        '<div class="kicker">A paper-thin heist in five acts</div>' +
        '<h1>Will\'s<br><span>Backyard</span></h1>' +
        '<p class="sub">You are a rat. Will has traps, a grill, and a dog in a tutu.<br>' +
        'Steal the good food and make it to the neighbour\'s hedge.</p>' +
      '</div>' +
      '<div class="row">' +
        '<button class="primary" data-act="play">Start the heist</button>' +
        '<button data-act="levels">Choose a level</button>' +
        '<button data-act="controls">Controls</button>' +
      '</div>';
  } else if (which === 'levels') {
    html = '<h2>Pick your night</h2><div class="levels">';
    for (var i = 0; i < state.levelCount; i++) html += levelCard(i, i > state.unlocked);
    html += '</div><div class="row"><button data-act="title">Back</button></div>';
  } else if (which === 'controls') {
    html =
      '<h2>Controls</h2>' +
      '<div class="keys">' +
        '<div><kbd>&larr;</kbd><kbd>&rarr;</kbd> or <kbd>A</kbd><kbd>D</kbd><span>Run</span></div>' +
        '<div><kbd>Space</kbd> / <kbd>&uarr;</kbd><span>Jump &mdash; hold for height, tap twice with a pumpkin seed</span></div>' +
        '<div><kbd>Shift</kbd> or <kbd>&darr;</kbd><span>Sneak &mdash; slow, short, and quiet</span></div>' +
        '<div><kbd>E</kbd><span>Lift bait off a trap (crouch beside it first)</span></div>' +
        '<div><kbd>&uarr;</kbd><kbd>&darr;</kbd><span>Climb ladders and rope nets</span></div>' +
        '<div><kbd>Esc</kbd><span>Pause</span></div>' +
      '</div>' +
      '<p class="note">A gamepad works too. Noise is what gets you caught — running is loud, sneaking is not.</p>' +
      '<div class="row"><button data-act="back">Back</button></div>';
  } else if (which === 'pause') {
    html = '<h2>Paused</h2><div class="row">' +
      '<button class="primary" data-act="resume">Resume</button>' +
      '<button data-act="restart">Restart level</button>' +
      '<button data-act="levels">Level select</button>' +
      '<button data-act="title">Quit to title</button></div>';
  } else if (which === 'complete') {
    var next = data.level + 1;
    html = '<div class="stamp">Safe!</div>' +
      '<h2>' + LEVEL_NAMES[data.level] + ' — cleared</h2>' +
      '<div class="stats">' +
        '<div><b>' + data.score + '</b><span>Level score</span></div>' +
        '<div><b>' + data.crumbs + '</b><span>Crumbs</span></div>' +
        '<div><b>' + data.time.toFixed(1) + 's</b><span>Time</span></div>' +
        '<div><b>' + data.health + '</b><span>Hearts left</span></div>' +
      '</div>' +
      '<div class="row">' +
        (next < state.levelCount
          ? '<button class="primary" data-act="next">Next: ' + LEVEL_NAMES[next] + '</button>'
          : '<button class="primary" data-act="finish">See the results</button>') +
        '<button data-act="restart">Replay</button>' +
        '<button data-act="levels">Level select</button>' +
      '</div>';
  } else if (which === 'gameover') {
    html = '<div class="stamp bad">Caught</div>' +
      '<h2>Will got you</h2>' +
      '<p class="sub">He is holding you by the tail and saying something about the compost.</p>' +
      '<div class="row">' +
        '<button class="primary" data-act="restart">Try again</button>' +
        '<button data-act="levels">Level select</button>' +
        '<button data-act="title">Title</button>' +
      '</div>';
  } else if (which === 'finished') {
    html = '<div class="stamp">Home</div>' +
      '<h2>You made it into the hedge</h2>' +
      '<p class="sub">Five yards, one dog in a tutu, and a hot dog you will never explain.</p>' +
      '<div class="stats big">' +
        '<div><b>' + data.total + '</b><span>Total score</span></div>' +
        '<div><b>' + data.deaths + '</b><span>Times caught</span></div>' +
      '</div>' +
      '<div class="row">' +
        '<button class="primary" data-act="title">Back to the title</button>' +
        '<button data-act="levels">Level select</button>' +
      '</div>';
  }

  b.innerHTML = html;
  ui.menu.classList.add('show');
  ui.hud.classList.toggle('dim', true);
}

function hideMenu() {
  state.menu = null;
  ui.menu.classList.remove('show');
  ui.hud.classList.remove('dim');
}

var prevMenu = 'title';

function menuAction(act, node) {
  Audio_.resume();
  if (act === 'play') { startLevel(0); }
  else if (act === 'levels') { prevMenu = state.menu; showMenu('levels'); }
  else if (act === 'controls') { prevMenu = state.menu; showMenu('controls'); }
  else if (act === 'back') { showMenu(prevMenu === 'controls' ? 'title' : prevMenu); }
  else if (act === 'title') { wasm.wb_set_phase(PHASE.TITLE); wasm.wb_start_level(0); wasm.wb_set_phase(PHASE.TITLE); showMenu('title'); }
  else if (act === 'resume') { state.paused = false; hideMenu(); }
  else if (act === 'restart') { startLevel(state.level); }
  else if (act === 'next') { startLevel(state.level + 1); }
  else if (act === 'finish') { showMenu('finished', { total: lastStats.total, deaths: lastStats.deaths }); }
}

function startLevel(i) {
  state.level = i;
  state.paused = false;
  wasm.wb_start_level(i);
  Audio_.setMood([0, 0, 0, 3, 2][i] !== undefined ? moodFor(i) : 0);
  hideMenu();
}

function moodFor(i) {
  // Matches Level::new in Rust: 0 afternoon, 1 dusk, 2 night, 3 underside.
  return [1, 0, 0, 3, 2, 2][i];
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function bindEvents() {
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', function (e) {
    Audio_.resume();
    if (e.code === 'Escape') {
      if (state.menu === 'pause') { state.paused = false; hideMenu(); }
      else if (!state.menu) { state.paused = true; showMenu('pause'); }
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyM') { ui.muteBtn.textContent = Audio_.toggle() ? '♪ off' : '♪ on'; return; }
    if (e.code === 'KeyI') { toggleIR(); return; }
    if (state.menu && (e.code === 'Enter' || e.code === 'Space')) {
      var btn = ui.menuBody.querySelector('button.primary') || ui.menuBody.querySelector('button');
      if (btn) { btn.click(); e.preventDefault(); return; }
    }
    if (KEYMAP[e.code]) { keys[e.code] = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', function (e) {
    if (KEYMAP[e.code]) { keys[e.code] = false; e.preventDefault(); }
  });

  window.addEventListener('blur', function () { keys = {}; touchBits = 0; });

  ui.menu.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.level !== undefined) { startLevel(parseInt(b.dataset.level, 10)); return; }
    if (b.dataset.act) menuAction(b.dataset.act, b);
  });

  ui.irBtn.addEventListener('click', function () {
    Audio_.resume();
    toggleIR();
  });

  ui.muteBtn.addEventListener('click', function () {
    Audio_.resume();
    ui.muteBtn.textContent = Audio_.toggle() ? '♪ off' : '♪ on';
  });

  // Touch controls.
  var map = { left: IN.LEFT, right: IN.RIGHT, jump: IN.JUMP, sneak: IN.SNEAK, act: IN.ACTION, up: IN.UP, down: IN.DOWN };
  ui.touch.querySelectorAll('[data-btn]').forEach(function (b) {
    var bit = map[b.dataset.btn];
    var on = function (e) { e.preventDefault(); Audio_.resume(); touchBits |= bit; b.classList.add('down'); };
    var off = function (e) { e.preventDefault(); touchBits &= ~bit; b.classList.remove('down'); };
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off, { passive: false });
    b.addEventListener('touchcancel', off, { passive: false });
    b.addEventListener('mousedown', on);
    b.addEventListener('mouseup', off);
    b.addEventListener('mouseleave', off);
  });
  if (isTouch) ui.touch.classList.add('show');
  window.addEventListener('orientationchange', function () {
    touchBits = 0;
    setTimeout(resize, 120);
  });
  // Stop iOS from scrolling/zooming the page out from under the canvas.
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1 || isTouch) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

var lastStats = { total: 0, deaths: 0 };
var irOn = false, irAvailable = false, irHintTimer = 0;

// Infrared is a night-vision aid: it only exists where it would be useful.
function toggleIR() {
  if (!irAvailable) return;
  irOn = !irOn;
  wasm.wb_set_vision(irOn ? 1 : 0);
  ui.irBtn.classList.toggle('on', irOn);
  ui.irBtn.textContent = irOn ? 'IR ON' : 'IR';
  ui.hud.classList.toggle('ir', irOn);
  Audio_.play(irOn ? 'check' : 'pickup');
}

var hudCache = { health: -1, score: -1, loot: -1, lootMax: -1, level: -1, crumbs: -1, pw: '' };

function updateHud(s) {
  var health = s[0] | 0, score = s[1] | 0, loot = s[2] | 0, lootMax = s[3] | 0;
  var tension = s[4], level = s[6] | 0, time = s[7], progress = s[8];
  var toastFood = s[12] | 0, toastT = s[13];
  var shield = s[14] > 0.5, boost = s[15], djump = s[16], prompt = s[17];
  var crumbs = s[18] | 0;
  var hedgeLocked = s[34] > 0.5, shortBy = s[35] | 0;
  var mood = s[36] | 0;

  // Night Run and Under the Hutch carry the thermal camera.
  var canIR = (mood === 2 || mood === 3);
  if (canIR !== irAvailable) {
    irAvailable = canIR;
    ui.irBtn.classList.toggle('hidden', !canIR);
    if (!canIR && irOn) { irOn = false; ui.hud.classList.remove('ir'); ui.irBtn.classList.remove('on'); }
    // The button is small and easy to miss, so announce it on arrival.
    if (canIR) {
      ui.toast.innerHTML = 'Thermal camera available &mdash; press <b>I</b>';
      ui.toast.style.background = '';
      ui.toast.style.opacity = 1;
      clearTimeout(irHintTimer);
      irHintTimer = setTimeout(function () { ui.toast.style.opacity = 0; }, 3200);
    }
  }
  if ((s[37] > 0.5) !== irOn) {
    irOn = s[37] > 0.5;
    ui.irBtn.classList.toggle('on', irOn);
    ui.irBtn.textContent = irOn ? 'IR ON' : 'IR';
    ui.hud.classList.toggle('ir', irOn);
  }

  if (health !== hudCache.health) {
    hudCache.health = health;
    var h = '';
    for (var i = 0; i < 3; i++) h += '<i class="' + (i < health ? 'on' : 'off') + '">\u2665</i>';
    ui.hearts.innerHTML = h;
  }
  if (score !== hudCache.score) { hudCache.score = score; ui.score.textContent = score.toLocaleString(); }
  if (crumbs !== hudCache.crumbs) { hudCache.crumbs = crumbs; ui.crumbCount.textContent = crumbs; }
  if (loot !== hudCache.loot || lootMax !== hudCache.lootMax) {
    hudCache.loot = loot; hudCache.lootMax = lootMax;
    ui.loot.textContent = loot;
    ui.lootMax.textContent = lootMax;
    ui.loot.parentElement.classList.toggle('done', loot >= lootMax);
  }
  if (level !== hudCache.level) {
    hudCache.level = level;
    ui.levelName.innerHTML = '<b>' + (level + 1) + '.</b> ' + LEVEL_NAMES[level];
  }

  ui.tensionFill.style.transform = 'scaleX(' + Math.max(0.001, tension) + ')';
  ui.tensionFill.classList.toggle('hot', tension > 0.75);
  ui.progressFill.style.transform = 'scaleX(' + Math.max(0.001, progress) + ')';
  ui.timer.textContent = time.toFixed(1) + 's';

  var pw = '';
  if (shield) pw += '<i class="pw shield" title="Marshmallow shield">●</i>';
  if (boost > 0) pw += '<i class="pw boost" title="Bacon speed">»</i>';
  if (djump > 0) pw += '<i class="pw jump" title="Double jump">↑</i>';
  if (pw !== hudCache.pw) { hudCache.pw = pw; ui.powerups.innerHTML = pw; }

  if (toastT > 0 && toastFood === -2) {
    ui.toast.textContent = 'A raccoon took it!';
    ui.toast.style.background = '#8c2f24';
    ui.toast.style.opacity = Math.min(1, toastT);
  } else if (toastT > 0 && toastFood >= 0) {
    ui.toast.textContent = 'Got the ' + FOOD_NAMES[toastFood];
    ui.toast.style.background = '';
    ui.toast.style.opacity = Math.min(1, toastT);
  } else {
    ui.toast.style.opacity = 0;
  }

  // The bait prompt wins; otherwise explain a hedge that will not open.
  if (prompt > 0) {
    ui.promptHint.innerHTML = 'Crouch and press <kbd>E</kbd> to lift the bait';
    ui.promptHint.style.opacity = 1;
  } else if (hedgeLocked) {
    ui.promptHint.innerHTML = 'The hedge is no use empty-handed &mdash; find <b>' + shortBy +
      '</b> more piece' + (shortBy === 1 ? '' : 's') + ' of food first';
    ui.promptHint.style.opacity = 1;
  } else {
    ui.promptHint.style.opacity = 0;
  }
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

function handleEvents(bits) {
  if (bits & EV.JUMP) Audio_.play('jump');
  if (bits & EV.LAND) Audio_.play('land');
  if (bits & EV.STEP) Audio_.play('step');
  if (bits & EV.PICKUP) Audio_.play('pickup');
  if (bits & EV.LOOT) Audio_.play('loot');
  if (bits & EV.SNAP) Audio_.play('snap');
  if (bits & EV.ZAP) Audio_.play('zap');
  if (bits & EV.HURT) Audio_.play('hurt');
  if (bits & EV.ALERT) Audio_.play('alert');
  if (bits & EV.BARK) Audio_.play('bark');
  if (bits & EV.CAUGHT) Audio_.play('caught');
  if (bits & EV.SAFE) Audio_.play('safe');
  if (bits & EV.DISARM) Audio_.play('disarm');
  if (bits & EV.STUCK) Audio_.play('stuck');
  if (bits & EV.CHECKPOINT) Audio_.play('check');
  if (bits & EV.STOLEN) Audio_.play('stolen');
}

function frame(now) {
  requestAnimationFrame(frame);
  var dt = lastTime ? (now - lastTime) / 1000 : 0.016;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;

  var input = (state.menu || state.paused || portraitBlocked) ? 0 : inputBits();

  // 1080 units tall by default, but never so narrow that the rat cannot see
  // what is coming -- squat windows zoom out instead of cropping.
  var aspect = canvas.width / Math.max(1, canvas.height);
  var vh = 1080;
  if (vh * aspect < 1500) vh = Math.min(2100, 1500 / aspect);
  var vw = vh * aspect;

  wasm.wb_tick((state.paused && state.menu) || portraitBlocked ? 0 : dt, input, vw, vh);
  refreshViews();

  handleEvents(wasm.wb_take_events());

  var sPtr = wasm.wb_state_ptr() >> 2;
  var s = memF32.subarray(sPtr, sPtr + 48);

  var phase = s[5] | 0;
  state.unlocked = s[23] | 0;
  lastStats.total = s[20] | 0;
  lastStats.deaths = s[19] | 0;

  // Phase transitions that need a menu.
  if (phase !== state.phase) {
    state.phase = phase;
    if (phase === PHASE.COMPLETE) {
      setTimeout(function () {
        if (state.phase === PHASE.COMPLETE) {
          showMenu('complete', {
            level: s[6] | 0, score: s[1] | 0, crumbs: s[18] | 0,
            time: s[7], health: s[0] | 0
          });
        }
      }, 1500);
    } else if (phase === PHASE.GAMEOVER) {
      setTimeout(function () {
        if (state.phase === PHASE.GAMEOVER) showMenu('gameover');
      }, 700);
    }
  }

  Audio_.setTension(s[4]);
  if (!state.menu) updateHud(s);

  var dPtr = wasm.wb_draw_ptr() >> 2;
  var count = wasm.wb_draw_count();
  var cmds = memF32.subarray(dPtr, dPtr + count * CMD_STRIDE);
  renderer.render(cmds, count, vw, vh, [s[9], s[10], s[11]]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
