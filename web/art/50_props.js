// ============================================================================
// Level furniture: the deck + feast, the playhouse, the hutch.
// ============================================================================

// ---- deck -----------------------------------------------------------------
def('deck_plank', 192, 56, function (c, w, h) {
  c.fillStyle = C.deck; c.fillRect(0, 0, w, h);
  woodGrain(c, w, h, C.deck, 111, false);
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, h - 5, w, 5);
  c.fillStyle = 'rgba(255,245,220,0.14)'; c.fillRect(0, 0, w, 4);
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(w - 3, 0, 3, h);
  grain(c, w, h, 0.045);
});

def('deck_face', 192, 120, function (c, w, h) {
  c.fillStyle = C.deckDk; c.fillRect(0, 0, w, h);
  woodGrain(c, w, h, C.deckDk, 112, false);
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('rail_post', 44, 220, function (c, w, h) {
  paper(c, roundRect(2, 0, w - 4, h, 3), C.deckDk, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(roundRect(2, 0, w - 4, h, 3)); woodGrain(c, w, h, C.deckDk, 113, true); c.restore();
  paper(c, roundRect(0, 0, w, 16, 3), C.deck, { w: w, h: h, lw: 2.4 * PIX, shade: false });
});

def('rail_baluster', 20, 150, function (c, w, h) {
  paper(c, roundRect(1, 0, w - 2, h, 2), C.deckDk, { w: w, h: h, lw: 2 * PIX });
});

def('rail_top', 256, 26, function (c, w, h) {
  paper(c, roundRect(0, 0, w, h, 3), C.deck, { w: w, h: h, lw: 2.4 * PIX });
  c.save(); c.clip(roundRect(0, 0, w, h, 3)); woodGrain(c, w, h, C.deck, 114, false); c.restore();
});

// Red-and-white gingham, straight off the picnic table in the photo.
def('gingham', 256, 256, function (c, w, h) {
  var cell = 32;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(206,48,48,0.55)';
  for (var x = 0; x < w; x += cell * 2) c.fillRect(x, 0, cell, h);
  for (var y = 0; y < h; y += cell * 2) c.fillRect(0, y, w, cell);
  c.fillStyle = 'rgba(206,48,48,0.62)';
  for (var x2 = 0; x2 < w; x2 += cell * 2) for (var y2 = 0; y2 < h; y2 += cell * 2) c.fillRect(x2, y2, cell, cell);
  grain(c, w, h, 0.05);
});

def('table_top', 480, 44, function (c, w, h) {
  paper(c, roundRect(0, 0, w, h, 5), C.deck, { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(roundRect(0, 0, w, h, 5)); woodGrain(c, w, h, C.deck, 115, false); c.restore();
});

def('table_leg', 40, 150, function (c, w, h) {
  paper(c, roundRect(4, 0, w - 8, h, 3), C.deckDk, { w: w, h: h, lw: 2.4 * PIX });
});

// Cloth draped over the table edge, with a scalloped hem.
def('cloth_drape', 480, 130, function (c, w, h) {
  srnd(116);
  var p = new Path2D();
  p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, h - 22);
  for (var x = w; x >= 0; x -= 40) p.quadraticCurveTo(x - 20, h + 8, x - 40, h - 22);
  p.lineTo(0, h - 22); p.closePath();
  c.save(); c.clip(p);
  var cell = 32;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(206,48,48,0.55)';
  for (var gx = 0; gx < w; gx += cell * 2) c.fillRect(gx, 0, cell, h);
  for (var gy = 0; gy < h; gy += cell * 2) c.fillRect(0, gy, w, cell);
  c.fillStyle = 'rgba(206,48,48,0.62)';
  for (var ax = 0; ax < w; ax += cell * 2) for (var ay = 0; ay < h; ay += cell * 2) c.fillRect(ax, ay, cell, cell);
  // soft vertical folds
  for (var i = 0; i < 14; i++) {
    var fx = rnd() * w;
    var fg = c.createLinearGradient(fx - 14, 0, fx + 14, 0);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.5, 'rgba(0,0,0,0.16)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = fg; c.fillRect(fx - 14, 0, 28, h);
  }
  c.restore();
  c.save(); c.strokeStyle = 'rgba(120,30,30,0.45)'; c.lineWidth = 2.4 * PIX; c.stroke(p); c.restore();
});

// ---- the feast ------------------------------------------------------------
def('bbq_grill', 300, 260, function (c, w, h) {
  // kettle body
  var body = new Path2D();
  body.moveTo(40, 110); body.bezierCurveTo(44, 182, 96, 200, 150, 200);
  body.bezierCurveTo(204, 200, 256, 182, 260, 110);
  body.closePath();
  paper(c, body, '#2f3338', { w: w, h: h, lw: 3.4 * PIX });
  // lid, cracked open
  var lid = new Path2D();
  lid.moveTo(36, 104); lid.bezierCurveTo(40, 36, 110, 16, 150, 16);
  lid.bezierCurveTo(190, 16, 258, 36, 264, 104);
  lid.closePath();
  paper(c, lid, '#3c4147', { w: w, h: h, lw: 3.4 * PIX });
  c.save(); c.clip(lid);
  var g = c.createLinearGradient(60, 20, 150, 104);
  g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore();
  paper(c, roundRect(126, 2, 48, 18, 8), '#1f2327', { w: w, h: h, lw: 2.4 * PIX, shade: false });
  // legs + wheels
  c.save(); c.strokeStyle = '#4a5055'; c.lineWidth = 9 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(72, 190); c.lineTo(44, 250); c.moveTo(228, 190); c.lineTo(256, 250); c.stroke(); c.restore();
  paper(c, ellipsePath(44, 248, 22, 22, 0), '#23272b', { w: w, h: h, lw: 2.6 * PIX });
  paper(c, ellipsePath(256, 248, 22, 22, 0), '#23272b', { w: w, h: h, lw: 2.6 * PIX });
  // glowing coals in the gap
  var cg = c.createLinearGradient(0, 100, 0, 120);
  cg.addColorStop(0, 'rgba(255,170,60,0.0)'); cg.addColorStop(0.5, 'rgba(255,150,40,0.9)'); cg.addColorStop(1, 'rgba(255,90,20,0.0)');
  c.fillStyle = cg; c.fillRect(44, 98, 212, 22);
});

def('flame', 90, 130, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(45, 4); p.bezierCurveTo(74, 42, 86, 74, 72, 102);
  p.bezierCurveTo(62, 122, 28, 122, 18, 102);
  p.bezierCurveTo(4, 74, 20, 44, 45, 4);
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff2a8'); g.addColorStop(0.35, '#ffc23c'); g.addColorStop(0.72, '#f4722a'); g.addColorStop(1, '#d0341d');
  c.fillStyle = g; c.fill(p);
  var i = new Path2D();
  i.moveTo(45, 40); i.bezierCurveTo(62, 64, 64, 88, 52, 102);
  i.bezierCurveTo(42, 112, 30, 104, 30, 88);
  i.bezierCurveTo(30, 70, 38, 54, 45, 40);
  c.fillStyle = 'rgba(255,248,210,0.85)'; c.fill(i);
});

def('smoke', 64, 64, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2 - 1);
  g.addColorStop(0, 'rgba(228,224,216,0.55)'); g.addColorStop(0.55, 'rgba(206,202,194,0.26)'); g.addColorStop(1, 'rgba(200,196,188,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('pumpkin', 170, 150, function (c, w, h) {
  var p = ellipsePath(85, 84, 78, 62, 0);
  paper(c, p, C.pumpkin, { w: w, h: h, lw: 3.4 * PIX });
  c.save(); c.clip(p);
  c.strokeStyle = rgba(C.pumpkinDk, 0.55); c.lineWidth = 3.4 * PIX;
  for (var i = -2; i <= 2; i++) {
    c.beginPath(); c.moveTo(85 + i * 26, 24); c.quadraticCurveTo(85 + i * 34, 84, 85 + i * 26, 146); c.stroke();
  }
  c.restore();
  paper(c, roundRect(76, 8, 20, 30, 7), C.stem, { w: w, h: h, lw: 2.6 * PIX });
  grain(c, w, h, 0.04);
});

def('pumpkin_carved', 170, 150, function (c, w, h) {
  var p = ellipsePath(85, 84, 78, 62, 0);
  paper(c, p, C.pumpkin, { w: w, h: h, lw: 3.4 * PIX });
  c.save(); c.clip(p);
  c.strokeStyle = rgba(C.pumpkinDk, 0.5); c.lineWidth = 3.2 * PIX;
  for (var i = -2; i <= 2; i++) {
    c.beginPath(); c.moveTo(85 + i * 26, 24); c.quadraticCurveTo(85 + i * 34, 84, 85 + i * 26, 146); c.stroke();
  }
  c.restore();
  // face, lit from within
  c.save();
  c.shadowColor = 'rgba(255,170,40,0.95)'; c.shadowBlur = 16 * PIX;
  c.fillStyle = '#ffd25e';
  c.beginPath(); c.moveTo(44, 62); c.lineTo(68, 62); c.lineTo(56, 84); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(126, 62); c.lineTo(102, 62); c.lineTo(114, 84); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(42, 100); c.lineTo(58, 98); c.lineTo(64, 110); c.lineTo(78, 98); c.lineTo(92, 110);
  c.lineTo(104, 98); c.lineTo(126, 100); c.lineTo(112, 124); c.lineTo(58, 124); c.closePath(); c.fill();
  c.restore();
  paper(c, roundRect(76, 8, 20, 30, 7), C.stem, { w: w, h: h, lw: 2.6 * PIX });
});

def('cooler', 190, 150, function (c, w, h) {
  paper(c, roundRect(8, 36, 174, 110, 10), '#d9453f', { w: w, h: h, lw: 3.2 * PIX });
  paper(c, roundRect(2, 10, 186, 34, 9), '#f0f1f2', { w: w, h: h, lw: 3.2 * PIX });
  paper(c, roundRect(74, 46, 42, 16, 5), '#b2322d', { w: w, h: h, lw: 2.4 * PIX, shade: false });
  grain(c, w, h, 0.04);
});

def('chair', 180, 230, function (c, w, h) {
  paper(c, roundRect(26, 10, 130, 120, 12), '#4a5560', { w: w, h: h, lw: 3 * PIX });
  paper(c, roundRect(14, 120, 154, 32, 8), '#5a6671', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.strokeStyle = '#3a434c'; c.lineWidth = 9 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(34, 150); c.lineTo(24, 222); c.moveTo(148, 150); c.lineTo(158, 222); c.stroke(); c.restore();
});

def('plate', 110, 34, function (c, w, h) {
  paper(c, ellipsePath(55, 17, 52, 15, 0), '#f3f4f2', { w: w, h: h, lw: 2.6 * PIX });
  c.strokeStyle = 'rgba(180,186,190,0.8)'; c.lineWidth = 2 * PIX;
  c.stroke(ellipsePath(55, 16, 38, 9, 0));
});

def('bottle', 50, 120, function (c, w, h) {
  paper(c, roundRect(10, 32, 30, 84, 8), '#5d8a4a', { w: w, h: h, lw: 2.4 * PIX });
  paper(c, roundRect(18, 6, 14, 30, 5), '#5d8a4a', { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(15, 42, 6, 62);
  paper(c, roundRect(12, 58, 26, 30, 3), '#e8d8a8', { w: w, h: h, lw: 1.8 * PIX, shade: false });
});

// Green yard-waste bin -- bottom-left of the deck photo.
def('green_bin', 240, 210, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(14, 44); p.lineTo(226, 44); p.lineTo(210, 204); p.lineTo(30, 204); p.closePath();
  paper(c, p, '#3f7a3c', { w: w, h: h, lw: 3.4 * PIX });
  paper(c, roundRect(2, 14, 236, 34, 8), '#356b33', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(p); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 3 * PIX;
  for (var i = 1; i < 5; i++) { c.beginPath(); c.moveTo(14 + i * 42, 44); c.lineTo(28 + i * 38, 204); c.stroke(); }
  c.restore();
  grain(c, w, h, 0.04);
});

// ---- playhouse ------------------------------------------------------------
def('playhouse_wall', 420, 330, function (c, w, h) {
  c.fillStyle = '#44525e'; c.fillRect(0, 0, w, h);
  for (var y = 0; y < h; y += 30) {
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y + 26, w, 4);
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, y, w, 6);
  }
  c.save(); c.strokeStyle = 'rgba(20,26,32,0.6)'; c.lineWidth = 4 * PIX; c.strokeRect(2, 2, w - 4, h - 4); c.restore();
  grain(c, w, h, 0.04);
});

def('playhouse_window', 150, 160, function (c, w, h) {
  paper(c, roundRect(2, 2, w - 4, h - 4, 4), C.wood, { w: w, h: h, lw: 3.2 * PIX });
  c.fillStyle = '#20272e'; c.fill(roundRect(18, 18, w - 36, h - 36, 3));
  var g = c.createLinearGradient(18, 18, w - 18, h - 18);
  g.addColorStop(0, 'rgba(120,160,180,0.4)'); g.addColorStop(1, 'rgba(120,160,180,0)');
  c.fillStyle = g; c.fill(roundRect(18, 18, w - 36, h - 36, 3));
});

def('playhouse_roof', 520, 160, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(10, h - 6); p.lineTo(100, 12); p.lineTo(420, 12); p.lineTo(510, h - 6); p.closePath();
  paper(c, p, '#3a4650', { w: w, h: h, lw: 3.4 * PIX });
  c.save(); c.clip(p); c.fillStyle = 'rgba(0,0,0,0.16)';
  for (var y = 24; y < h; y += 24) for (var x = (y % 48 ? 0 : 24); x < w; x += 50) c.fillRect(x, y, 44, 10);
  c.restore();
});

// Yellow wave slide from the playground photo.
def('slide', 460, 300, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(400, 18);
  p.bezierCurveTo(300, 40, 230, 120, 150, 200);
  p.bezierCurveTo(100, 250, 60, 266, 18, 268);
  p.lineTo(18, 296); p.bezierCurveTo(78, 294, 130, 272, 186, 220);
  p.bezierCurveTo(262, 148, 320, 76, 444, 56);
  p.closePath();
  paper(c, p, C.slide, { w: w, h: h, lw: 3.6 * PIX });
  c.save(); c.clip(p);
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(160,110,0,0.35)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  // raised side rail
  c.save(); c.strokeStyle = sh(C.slide, -0.28); c.lineWidth = 4 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(404, 30); c.bezierCurveTo(304, 54, 236, 132, 158, 210);
  c.bezierCurveTo(108, 258, 70, 278, 24, 282);
  c.stroke(); c.restore();
});

def('swing_seat', 120, 70, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(8, 14); p.bezierCurveTo(30, 4, 90, 4, 112, 14);
  p.bezierCurveTo(110, 46, 94, 62, 60, 62);
  p.bezierCurveTo(26, 62, 10, 46, 8, 14);
  paper(c, p, '#2f7a46', { w: w, h: h, lw: 3 * PIX });
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill(ellipsePath(60, 22, 40, 9, 0));
});

def('chain', 14, 220, function (c, w, h) {
  c.save(); c.strokeStyle = '#8e99a2'; c.lineWidth = 2.6 * PIX;
  for (var y = 0; y < h; y += 16) { c.beginPath(); c.ellipse(7, y + 8, 4, 7, 0, 0, Math.PI * 2); c.stroke(); }
  c.restore();
});

def('rope_net', 256, 256, function (c, w, h) {
  c.save();
  c.strokeStyle = '#c9a977'; c.lineWidth = 5 * PIX; c.lineCap = 'round';
  for (var i = 0; i <= 4; i++) {
    c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke();
    c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke();
  }
  c.strokeStyle = 'rgba(120,88,48,0.6)'; c.lineWidth = 1.6 * PIX;
  for (var j = 0; j <= 4; j++) {
    c.beginPath(); c.moveTo(j * 64 - 2, 0); c.lineTo(j * 64 - 2, h); c.stroke();
    c.beginPath(); c.moveTo(0, j * 64 - 2); c.lineTo(w, j * 64 - 2); c.stroke();
  }
  c.restore();
});

def('post_wood', 48, 400, function (c, w, h) {
  paper(c, roundRect(2, 0, w - 4, h, 3), C.wood, { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(roundRect(2, 0, w - 4, h, 3)); woodGrain(c, w, h, C.wood, 121, true); c.restore();
});

def('beam_wood', 400, 50, function (c, w, h) {
  paper(c, roundRect(0, 2, w, h - 4, 3), C.wood, { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(roundRect(0, 2, w, h - 4, 3)); woodGrain(c, w, h, C.wood, 122, false); c.restore();
});

def('ladder_rung', 120, 26, function (c, w, h) {
  paper(c, roundRect(0, 2, w, h - 4, 4), C.woodDk, { w: w, h: h, lw: 2.4 * PIX });
});

// Bucket swing, the green toddler kind on yellow chains.
def('bucket_swing', 110, 96, function (c, w, h) {
  paper(c, roundRect(10, 20, 90, 64, 16), '#2f7a46', { w: w, h: h, lw: 3 * PIX });
  paper(c, roundRect(4, 8, 102, 22, 10), '#368b50', { w: w, h: h, lw: 2.6 * PIX, shade: false });
});

// ---- the hutch (dark crawlspace under a wood store) -----------------------
def('hutch_beam', 400, 64, function (c, w, h) {
  paper(c, roundRect(0, 0, w, h, 2), '#5b4530', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(roundRect(0, 0, w, h, 2)); woodGrain(c, w, h, '#5b4530', 131, false); c.restore();
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, h - 6, w, 6);
});

// Stacked firewood rounds seen end-on.
def('log_stack', 300, 200, function (c, w, h) {
  srnd(132);
  for (var row = 0; row < 3; row++) {
    for (var i = 0; i < 5; i++) {
      var x = 32 + i * 60 + (row % 2) * 26, y = 36 + row * 62;
      if (x > w - 20) continue;
      paper(c, ellipsePath(x, y, 30, 29, 0), '#8a6a46', { w: w, h: h, lw: 2.8 * PIX });
      c.save(); c.strokeStyle = 'rgba(90,64,38,0.6)'; c.lineWidth = 1.8 * PIX;
      for (var r = 6; r < 26; r += 7) { c.beginPath(); c.ellipse(x + 1, y, r, r * 0.95, rnd(), 0, Math.PI * 2); c.stroke(); }
      c.restore();
    }
  }
});

def('crate', 160, 150, function (c, w, h) {
  paper(c, roundRect(2, 2, w - 4, h - 4, 4), '#9b7446', { w: w, h: h, lw: 3.2 * PIX });
  c.save(); c.clip(roundRect(2, 2, w - 4, h - 4, 4));
  woodGrain(c, w, h, '#9b7446', 133, false);
  c.strokeStyle = 'rgba(70,48,26,0.6)'; c.lineWidth = 4 * PIX;
  c.beginPath(); c.moveTo(2, 2); c.lineTo(w - 2, h - 2); c.moveTo(w - 2, 2); c.lineTo(2, h - 2); c.stroke();
  c.restore();
});

def('cobweb', 180, 180, function (c, w, h) {
  c.save();
  c.strokeStyle = 'rgba(226,228,232,0.4)'; c.lineWidth = 1.8 * PIX;
  for (var i = 0; i < 7; i++) {
    var a = (i / 7) * Math.PI * 0.55;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 250, Math.sin(a) * 250); c.stroke();
  }
  for (var r = 30; r < 190; r += 30) {
    c.beginPath();
    for (var j = 0; j <= 7; j++) {
      var aa = (j / 7) * Math.PI * 0.55;
      var x = Math.cos(aa) * r, y = Math.sin(aa) * r;
      if (j === 0) c.moveTo(x, y); else c.quadraticCurveTo(Math.cos(aa - 0.07) * (r - 8), Math.sin(aa - 0.07) * (r - 8), x, y);
    }
    c.stroke();
  }
  c.restore();
});

def('pipe', 300, 60, function (c, w, h) {
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7b858c'); g.addColorStop(0.35, '#b8c1c7'); g.addColorStop(1, '#5a646b');
  c.fillStyle = g; c.fillRect(0, 4, w, h - 8);
  c.strokeStyle = '#48525a'; c.lineWidth = 2.4 * PIX;
  c.strokeRect(0, 4, w, h - 8);
  c.fillStyle = 'rgba(70,80,88,0.6)';
  c.fillRect(70, 0, 16, h); c.fillRect(220, 0, 16, h);
});
