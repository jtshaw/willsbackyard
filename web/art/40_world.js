// ============================================================================
// Sky, ground, vegetation, the house, fences -- the backyard itself.
// ============================================================================

// ---- skies (stretched full-screen; vertical gradient strips) ---------------
function skyStrip(stops) {
  return function (c, w, h) {
    var g = c.createLinearGradient(0, 0, 0, h);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
}
def('sky_day', 8, 256, skyStrip([[0, '#4fa8d8'], [0.45, '#9ad7f0'], [0.78, '#cfeaf5'], [1, '#f6e9c8']]));
def('sky_dusk', 8, 256, skyStrip([[0, '#39407a'], [0.34, '#8a6a9c'], [0.62, '#e8906a'], [0.84, '#ffc584'], [1, '#ffe2ae']]));
def('sky_night', 8, 256, skyStrip([[0, '#0d1230'], [0.5, '#1b2450'], [0.82, '#2f3a66'], [1, '#4a4f78']]));
def('sky_under', 8, 256, skyStrip([[0, '#1a140f'], [0.5, '#2a2017'], [1, '#3b2c1e']]));

def('cloud_a', 220, 96, function (c, w, h) {
  srnd(41);
  var p = new Path2D();
  p.ellipse(60, 58, 52, 30, 0, 0, Math.PI * 2);
  p.ellipse(118, 44, 46, 36, 0, 0, Math.PI * 2);
  p.ellipse(168, 60, 40, 26, 0, 0, Math.PI * 2);
  c.fillStyle = '#ffffff'; c.fill(p);
  c.fillStyle = 'rgba(176,198,220,0.55)';
  var q = new Path2D(); q.ellipse(104, 74, 84, 16, 0, 0, Math.PI * 2); c.fill(q);
});
def('cloud_b', 170, 80, function (c, w, h) {
  var p = new Path2D();
  p.ellipse(50, 48, 42, 26, 0, 0, Math.PI * 2);
  p.ellipse(104, 40, 38, 30, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.92)'; c.fill(p);
});
def('moon', 120, 120, function (c, w, h) {
  var g = c.createRadialGradient(60, 60, 10, 60, 60, 58);
  g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.45, 'rgba(255,248,210,0.35)'); g.addColorStop(1, 'rgba(255,248,210,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fdf6d8'; c.fill(ellipsePath(60, 60, 30, 30, 0));
  c.fillStyle = 'rgba(214,204,168,0.5)';
  c.fill(ellipsePath(52, 52, 7, 7, 0)); c.fill(ellipsePath(70, 66, 5, 5, 0)); c.fill(ellipsePath(58, 72, 4, 4, 0));
});

// Loose soil: clods, pebbles and root threads. Deliberately not wood grain.
function soil(c, w, h, base, seed) {
  srnd(seed);
  c.save();
  for (var i = 0; i < 90; i++) {
    var x = rnd() * w, y = rnd() * h, r = 2 + rnd() * 9;
    c.globalAlpha = 0.10 + rnd() * 0.22;
    c.fillStyle = rnd() > 0.5 ? sh(base, -0.38) : sh(base, 0.22);
    c.beginPath(); c.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  // A few pale pebbles.
  c.globalAlpha = 0.5;
  for (var k = 0; k < 10; k++) {
    c.fillStyle = '#b9a98f';
    c.beginPath(); c.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 4, 2 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  // Thin roots trailing down.
  c.globalAlpha = 0.3;
  c.strokeStyle = sh(base, -0.45); c.lineWidth = 1.4 * PIX; c.lineCap = 'round';
  for (var j = 0; j < 7; j++) {
    var rx = rnd() * w, ry = rnd() * h * 0.4;
    c.beginPath(); c.moveTo(rx, ry);
    c.bezierCurveTo(rx + 8, ry + 20, rx - 8, ry + 40, rx + 4, ry + 62);
    c.stroke();
  }
  c.restore();
}

// ---- ground ---------------------------------------------------------------
// Tiling grass cap: flat top band, blades biting into the dirt below.
def('ground_grass', 256, 160, function (c, w, h) {
  srnd(42);
  c.fillStyle = C.dirt; c.fillRect(0, 0, w, h);
  soil(c, w, h, C.dirt, 77);
  c.fillStyle = C.dirtDk;
  for (var i = 0; i < 26; i++) c.fill(ellipsePath(rnd() * w, 50 + rnd() * (h - 50), 3 + rnd() * 7, 2 + rnd() * 4, rnd()));
  var top = new Path2D();
  top.moveTo(0, 0); top.lineTo(w, 0); top.lineTo(w, 44);
  for (var x = w; x >= 0; x -= 16) top.quadraticCurveTo(x - 8, 40 + (x % 32 === 0 ? 14 : 4), x - 16, 44);
  top.lineTo(0, 44); top.closePath();
  c.fillStyle = C.grass; c.fill(top);
  var g = c.createLinearGradient(0, 0, 0, 60);
  g.addColorStop(0, rgba(C.grassLt, 0.95)); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, rgba(C.grassDk, 0.8));
  c.save(); c.clip(top); c.fillStyle = g; c.fillRect(0, 0, w, 60); c.restore();
  c.save();
  c.strokeStyle = C.grassDk; c.lineWidth = 3 * PIX; c.lineCap = 'round';
  for (var k = 0; k < 30; k++) {
    var bx = rnd() * w;
    c.beginPath(); c.moveTo(bx, 44); c.quadraticCurveTo(bx + (rnd() - 0.5) * 10, 56, bx + (rnd() - 0.5) * 16, 66); c.stroke();
  }
  c.restore();
  grain(c, w, h, 0.04);
});

def('ground_dirt', 256, 160, function (c, w, h) {
  srnd(43);
  c.fillStyle = C.dirtDk; c.fillRect(0, 0, w, h);
  c.fillStyle = C.dirt; c.fillRect(0, 0, w, 24);
  soil(c, w, h, C.dirtDk, 78);
  for (var i = 0; i < 40; i++) {
    c.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,220,170,0.1)';
    c.fill(ellipsePath(rnd() * w, rnd() * h, 2 + rnd() * 8, 1.5 + rnd() * 4, rnd()));
  }
  grain(c, w, h, 0.05);
});

// Leaf-strewn autumn lawn -- the level-1 floor.
def('ground_leaves', 256, 160, function (c, w, h) {
  srnd(44);
  c.fillStyle = C.dirt; c.fillRect(0, 0, w, h);
  soil(c, w, h, C.dirt, 79);
  var top = new Path2D();
  top.moveTo(0, 0); top.lineTo(w, 0); top.lineTo(w, 40);
  for (var x = w; x >= 0; x -= 14) top.quadraticCurveTo(x - 7, 36 + (x % 28 === 0 ? 12 : 3), x - 14, 40);
  top.lineTo(0, 40); top.closePath();
  c.fillStyle = C.grass; c.fill(top);
  var g = c.createLinearGradient(0, 0, 0, 56);
  g.addColorStop(0, rgba(C.grassLt, 0.9)); g.addColorStop(1, rgba(C.grassDk, 0.85));
  c.save(); c.clip(top); c.fillStyle = g; c.fillRect(0, 0, w, 56); c.restore();
  var cols = [C.leafA, C.leafB, C.leafC, C.leafD];
  for (var i = 0; i < 34; i++) {
    var lx = rnd() * w, ly = rnd() * 44, r = 5 + rnd() * 6;
    c.save(); c.translate(lx, ly); c.rotate(rnd() * 6.28);
    c.fillStyle = cols[(rnd() * 4) | 0];
    c.beginPath(); c.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(90,50,20,0.45)'; c.lineWidth = 1.2 * PIX;
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
    c.restore();
  }
  grain(c, w, h, 0.04);
});

// ---- vegetation -----------------------------------------------------------
function foliageBlob(seed, base, lite) {
  return function (c, w, h) {
    srnd(seed);
    var p = new Path2D();
    var cx = w / 2, cy = h / 2, n = 11;
    for (var i = 0; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var r = 0.34 + rnd() * 0.16;
      var x = cx + Math.cos(a) * w * r, y = cy + Math.sin(a) * h * r;
      if (i === 0) p.moveTo(x, y);
      else {
        var pa = ((i - 0.5) / n) * Math.PI * 2, pr = 0.44 + rnd() * 0.18;
        p.quadraticCurveTo(cx + Math.cos(pa) * w * pr, cy + Math.sin(pa) * h * pr, x, y);
      }
    }
    p.closePath();
    paper(c, p, base, { w: w, h: h, lw: 3.4 * PIX });
    c.save(); c.clip(p);
    c.fillStyle = rgba(lite, 0.55);
    for (var k = 0; k < 7; k++) c.fill(ellipsePath(rnd() * w, rnd() * h * 0.6, w * 0.1, h * 0.07, rnd()));
    c.restore();
    grain(c, w, h, 0.04);
  };
}
def('foliage_a', 300, 240, foliageBlob(51, '#4f9b3a', '#7fc45a'));
def('foliage_b', 260, 210, foliageBlob(52, '#3e8632', '#6bb04c'));
def('foliage_c', 220, 190, foliageBlob(53, '#5fa83f', '#93d66a'));
def('foliage_fall', 280, 230, foliageBlob(54, '#c87a2a', '#eaa744'));
def('foliage_dark', 300, 240, foliageBlob(55, '#27502a', '#3d7338'));

def('tree_trunk', 120, 420, function (c, w, h) {
  srnd(56);
  var p = new Path2D();
  p.moveTo(34, 0); p.bezierCurveTo(28, 140, 24, 280, 10, 418);
  p.lineTo(110, 418); p.bezierCurveTo(96, 280, 88, 140, 82, 0);
  p.closePath();
  paper(c, p, '#7a5536', { w: w, h: h, lw: 3.4 * PIX });
  c.save(); c.clip(p); woodGrain(c, w, h, '#7a5536', 91, true); c.restore();
});

def('bush', 260, 160, foliageBlob(57, '#49933b', '#78c057'));

// The goal: the neighbour's hedge. Deep, welcoming, a dark gap to slip into.
def('hedge', 420, 360, function (c, w, h) {
  srnd(58);
  var body = new Path2D();
  body.moveTo(6, h);
  body.bezierCurveTo(0, 150, 40, 30, 120, 22);
  body.bezierCurveTo(230, 10, 320, 40, 380, 110);
  body.bezierCurveTo(418, 170, 414, 280, 410, h);
  body.closePath();
  paper(c, body, C.hedge, { w: w, h: h, lw: 4 * PIX });
  c.save(); c.clip(body);
  for (var i = 0; i < 150; i++) {
    var x = rnd() * w, y = rnd() * h;
    var t = 1 - y / h;
    c.fillStyle = rnd() > 0.45 ? rgba(C.hedgeLt, 0.25 + t * 0.4) : rgba(C.hedgeDk, 0.3);
    c.fill(ellipsePath(x, y, 10 + rnd() * 16, 7 + rnd() * 10, rnd()));
  }
  // the gap -- a safe dark pocket at the base
  var g = c.createRadialGradient(210, h - 40, 6, 210, h - 30, 120);
  g.addColorStop(0, 'rgba(8,24,10,0.97)'); g.addColorStop(0.6, 'rgba(12,40,16,0.7)'); g.addColorStop(1, 'rgba(12,40,16,0)');
  c.fillStyle = g;
  c.fill(ellipsePath(210, h - 26, 96, 72, 0));
  c.restore();
  grain(c, w, h, 0.05);
});

// ---- fences & house -------------------------------------------------------
// Dog-eared cedar board: flat top with the corners knocked off, as in the
// reference photos -- not a cartoon picket.
def('fence_board', 60, 300, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(4, 14); p.lineTo(12, 4); p.lineTo(48, 4); p.lineTo(56, 14);
  p.lineTo(56, h - 2); p.lineTo(4, h - 2); p.closePath();
  paper(c, p, C.wood, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(p);
  woodGrain(c, w, h, C.wood, 101, true);
  // Weathering: the tops are greyer than the bottoms.
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(206,200,188,0.26)');
  g.addColorStop(0.45, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(40,26,14,0.3)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
});

def('fence_rail', 300, 36, function (c, w, h) {
  paper(c, roundRect(0, 2, w, h - 4, 4), C.woodDk, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(roundRect(0, 2, w, h - 4, 4)); woodGrain(c, w, h, C.woodDk, 102, false); c.restore();
});

def('chainlink', 128, 128, function (c, w, h) {
  c.save();
  c.strokeStyle = 'rgba(150,164,172,0.85)'; c.lineWidth = 2.6 * PIX; c.lineCap = 'round';
  for (var i = -2; i < 10; i++) {
    c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16 + 128, 128); c.stroke();
    c.beginPath(); c.moveTo(i * 16, 128); c.lineTo(i * 16 + 128, 0); c.stroke();
  }
  c.restore();
});

// Lap siding, matched to the house in the reference photos.
def('house_siding', 256, 256, function (c, w, h) {
  c.fillStyle = C.siding; c.fillRect(0, 0, w, h);
  for (var y = 0; y < h; y += 32) {
    c.fillStyle = 'rgba(0,0,0,0.20)'; c.fillRect(0, y + 28, w, 4);
    var g = c.createLinearGradient(0, y, 0, y + 32);
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.07)');
    c.fillStyle = g; c.fillRect(0, y, w, 28);
  }
  grain(c, w, h, 0.035);
});

def('house_window', 220, 180, function (c, w, h) {
  paper(c, roundRect(2, 2, w - 4, h - 4, 4), C.trim, { w: w, h: h, lw: 3 * PIX });
  var inner = roundRect(16, 16, w - 32, h - 32, 2);
  var g = c.createLinearGradient(16, 16, w - 16, h - 16);
  g.addColorStop(0, '#9fc3cf'); g.addColorStop(0.5, '#c9dde2'); g.addColorStop(1, '#7e9fae');
  c.fillStyle = g; c.fill(inner);
  c.save(); c.clip(inner);
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.beginPath(); c.moveTo(0, 150); c.lineTo(120, 0); c.lineTo(180, 0); c.lineTo(50, 170); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = C.trim; c.lineWidth = 7 * PIX;
  c.beginPath(); c.moveTo(w / 2, 16); c.lineTo(w / 2, h - 16); c.moveTo(16, h / 2); c.lineTo(w - 16, h / 2); c.stroke();
  c.strokeStyle = 'rgba(40,52,60,0.5)'; c.lineWidth = 2 * PIX; c.stroke(new Path2D());
});

def('house_window_lit', 220, 180, function (c, w, h) {
  paper(c, roundRect(2, 2, w - 4, h - 4, 4), C.trim, { w: w, h: h, lw: 3 * PIX });
  var inner = roundRect(16, 16, w - 32, h - 32, 2);
  var g = c.createLinearGradient(0, 16, 0, h - 16);
  g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#f0b95e');
  c.fillStyle = g; c.fill(inner);
  c.strokeStyle = C.trim; c.lineWidth = 7 * PIX;
  c.beginPath(); c.moveTo(w / 2, 16); c.lineTo(w / 2, h - 16); c.moveTo(16, h / 2); c.lineTo(w - 16, h / 2); c.stroke();
});

def('house_roof', 512, 150, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(0, h); p.lineTo(60, 10); p.lineTo(w - 60, 10); p.lineTo(w, h); p.closePath();
  paper(c, p, '#42474d', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(p);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  for (var y = 20; y < h; y += 22) for (var x = (y % 44 ? 0 : 20); x < w; x += 46) c.fillRect(x, y, 40, 9);
  c.restore();
});

// Blue poly tarp slumped over a woodpile (right side of the playground photo).
def('tarp', 360, 220, function (c, w, h) {
  srnd(59);
  var p = new Path2D();
  p.moveTo(6, h - 4); p.bezierCurveTo(30, 90, 90, 30, 170, 26);
  p.bezierCurveTo(250, 22, 320, 80, 352, h - 4);
  p.closePath();
  paper(c, p, '#8d7f6a', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(p);
  c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3 * PIX; c.lineCap = 'round';
  for (var i = 0; i < 9; i++) {
    var x = 20 + i * 38;
    c.beginPath(); c.moveTo(x, 30 + rnd() * 30); c.quadraticCurveTo(x + 10, h * 0.6, x - 6, h); c.stroke();
  }
  c.restore();
  grain(c, w, h, 0.05);
});
