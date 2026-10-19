// ============================================================================
// Will's traps, the food worth stealing, and the effects layer.
// ============================================================================

// ---- traps ----------------------------------------------------------------
function trapBase(c, w, h) {
  paper(c, roundRect(4, h - 30, w - 8, 26, 4), '#c89a5e', { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(roundRect(4, h - 30, w - 8, 26, 4)); woodGrain(c, w, h, '#c89a5e', 141, false); c.restore();
}

def('trap_snap_set', 150, 110, function (c, w, h) {
  trapBase(c, w, h);
  // bar cocked back, spring wound
  c.save();
  c.strokeStyle = C.steelDk; c.lineWidth = 6 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(34, 80); c.lineTo(34, 24); c.lineTo(116, 24); c.lineTo(116, 80); c.stroke();
  c.strokeStyle = C.steel; c.lineWidth = 2.6 * PIX; c.stroke();
  c.restore();
  paper(c, ellipsePath(34, 80, 13, 13, 0), '#8e99a1', { w: w, h: h, lw: 2.4 * PIX });
  c.save(); c.strokeStyle = '#6d777e'; c.lineWidth = 2 * PIX;
  for (var r = 4; r < 12; r += 3) { c.beginPath(); c.arc(34, 80, r, 0, Math.PI * 2); c.stroke(); }
  c.restore();
  // bait on the trigger plate
  paper(c, roundRect(88, 64, 30, 20, 4), '#f6d479', { w: w, h: h, lw: 2.2 * PIX });
  c.fillStyle = 'rgba(190,140,40,0.6)';
  c.fill(ellipsePath(97, 72, 3.4, 3.4, 0)); c.fill(ellipsePath(108, 78, 2.8, 2.8, 0));
});

def('trap_snap_fired', 150, 110, function (c, w, h) {
  trapBase(c, w, h);
  c.save();
  c.strokeStyle = C.steelDk; c.lineWidth = 6 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(34, 80); c.lineTo(36, 66); c.lineTo(118, 66); c.lineTo(116, 80); c.stroke();
  c.strokeStyle = C.steel; c.lineWidth = 2.6 * PIX; c.stroke();
  c.restore();
  paper(c, ellipsePath(34, 80, 13, 13, 0), '#8e99a1', { w: w, h: h, lw: 2.4 * PIX });
});

def('trap_glue', 170, 50, function (c, w, h) {
  paper(c, roundRect(2, 10, w - 4, 34, 5), '#e8dcc0', { w: w, h: h, lw: 2.6 * PIX });
  var g = c.createLinearGradient(0, 10, 0, 44);
  g.addColorStop(0, 'rgba(226,186,96,0.85)'); g.addColorStop(1, 'rgba(198,150,62,0.9)');
  c.fillStyle = g; c.fill(roundRect(12, 16, w - 24, 24, 4));
  c.save(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2 * PIX;
  for (var i = 0; i < 6; i++) { c.beginPath(); c.moveTo(20 + i * 24, 18); c.quadraticCurveTo(26 + i * 24, 28, 20 + i * 24, 38); c.stroke(); }
  c.restore();
});

def('trap_bucket', 180, 200, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(20, 40); p.lineTo(160, 40); p.lineTo(142, 190); p.lineTo(38, 190); p.closePath();
  paper(c, p, '#4a7fb5', { w: w, h: h, lw: 3.2 * PIX });
  paper(c, ellipsePath(90, 40, 72, 18, 0), '#3f6d9c', { w: w, h: h, lw: 3 * PIX });
  c.fillStyle = 'rgba(20,40,70,0.75)'; c.fill(ellipsePath(90, 40, 60, 13, 0));
  c.save(); c.strokeStyle = C.steel; c.lineWidth = 3.4 * PIX;
  c.beginPath(); c.arc(90, 36, 76, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); c.restore();
});

def('trap_zapper', 160, 150, function (c, w, h) {
  paper(c, roundRect(6, 30, w - 12, 108, 8), '#d8d2c6', { w: w, h: h, lw: 3 * PIX });
  paper(c, roundRect(26, 48, w - 52, 56, 5), '#2b3036', { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.strokeStyle = '#8e99a1'; c.lineWidth = 2.4 * PIX;
  for (var i = 0; i < 5; i++) { c.beginPath(); c.moveTo(34 + i * 20, 50); c.lineTo(34 + i * 20, 102); c.stroke(); }
  c.restore();
  paper(c, ellipsePath(80, 122, 9, 9, 0), '#e04a3a', { w: w, h: h, lw: 2 * PIX, shade: false });
  c.fillStyle = 'rgba(255,160,140,0.8)'; c.fill(ellipsePath(77, 119, 3, 3, 0));
});

def('spark', 110, 110, function (c, w, h) {
  c.save();
  c.strokeStyle = '#bfe9ff'; c.lineWidth = 4 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.shadowColor = '#7fd4ff'; c.shadowBlur = 12 * PIX;
  c.beginPath();
  c.moveTo(10, 54); c.lineTo(38, 40); c.lineTo(28, 62); c.lineTo(58, 44);
  c.lineTo(48, 70); c.lineTo(82, 50); c.lineTo(68, 76); c.lineTo(100, 58);
  c.stroke();
  c.restore();
});

def('bait_station', 160, 120, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(8, 112); p.lineTo(8, 44); p.quadraticCurveTo(80, 10, 152, 44); p.lineTo(152, 112); p.closePath();
  paper(c, p, '#3f4a52', { w: w, h: h, lw: 3.2 * PIX });
  // dark entry arch
  c.fillStyle = '#14181c';
  var e = new Path2D(); e.moveTo(50, 112); e.lineTo(50, 78); e.quadraticCurveTo(80, 58, 110, 78); e.lineTo(110, 112); e.closePath();
  c.fill(e);
  paper(c, roundRect(34, 20, 92, 20, 6), '#5a6770', { w: w, h: h, lw: 2.4 * PIX, shade: false });
});

def('mouse_hole', 160, 130, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(14, 126); p.bezierCurveTo(14, 40, 60, 12, 80, 12);
  p.bezierCurveTo(100, 12, 146, 40, 146, 126); p.closePath();
  c.fillStyle = '#120f12'; c.fill(p);
  c.save(); c.clip(p);
  var g = c.createRadialGradient(80, 60, 4, 80, 90, 90);
  g.addColorStop(0, 'rgba(60,46,50,0.9)'); g.addColorStop(1, 'rgba(10,8,10,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  c.strokeStyle = 'rgba(255,240,220,0.22)'; c.lineWidth = 3 * PIX; c.stroke(p);
});

// ---- food -----------------------------------------------------------------
def('food_cheese', 110, 90, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(8, 76); p.lineTo(16, 24); p.lineTo(100, 42); p.lineTo(96, 80); p.closePath();
  paper(c, p, C.cheese, { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(p); c.fillStyle = rgba(sh(C.cheese, -0.32), 0.9);
  c.fill(ellipsePath(40, 56, 9, 8, 0)); c.fill(ellipsePath(68, 66, 7, 6, 0)); c.fill(ellipsePath(80, 52, 5, 5, 0));
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.moveTo(16, 24); c.lineTo(100, 42); c.lineTo(98, 50); c.lineTo(15, 32); c.closePath(); c.fill();
});

def('food_bacon', 120, 70, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(6, 30); p.bezierCurveTo(30, 6, 56, 50, 80, 22);
  p.bezierCurveTo(98, 4, 112, 20, 116, 28);
  p.bezierCurveTo(108, 50, 94, 36, 80, 50);
  p.bezierCurveTo(56, 76, 30, 34, 10, 56);
  p.closePath();
  paper(c, p, C.bacon, { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(p);
  c.strokeStyle = 'rgba(248,226,206,0.9)'; c.lineWidth = 6 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(8, 40); c.bezierCurveTo(32, 18, 58, 60, 82, 32); c.bezierCurveTo(100, 14, 112, 28, 118, 34); c.stroke();
  c.restore();
});

def('food_hotdog', 140, 64, function (c, w, h) {
  paper(c, roundRect(4, 16, 132, 40, 18), C.bun, { w: w, h: h, lw: 2.8 * PIX });
  paper(c, roundRect(12, 10, 116, 26, 13), '#c0503e', { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.strokeStyle = '#f2c233'; c.lineWidth = 5 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(22, 22); c.quadraticCurveTo(44, 14, 62, 24); c.quadraticCurveTo(84, 34, 104, 20); c.stroke();
  c.restore();
});

def('food_marshmallow', 90, 90, function (c, w, h) {
  paper(c, roundRect(14, 20, 62, 58, 14), '#fbf6ee', { w: w, h: h, lw: 2.8 * PIX });
  c.fillStyle = 'rgba(214,166,112,0.55)'; c.fill(roundRect(16, 60, 58, 16, 10));
  c.save(); c.strokeStyle = '#8a7a66'; c.lineWidth = 2.6 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(6, 86); c.lineTo(84, 10); c.stroke(); c.restore();
});

def('food_seed', 64, 64, function (c, w, h) {
  paper(c, ellipsePath(32, 34, 17, 23, 0.2), '#efe2bd', { w: w, h: h, lw: 2.4 * PIX });
  c.strokeStyle = 'rgba(160,138,92,0.8)'; c.lineWidth = 2 * PIX;
  c.stroke(ellipsePath(32, 34, 11, 17, 0.2));
});

def('food_cookie', 90, 90, function (c, w, h) {
  srnd(151);
  paper(c, ellipsePath(45, 46, 38, 36, 0), '#d8a35c', { w: w, h: h, lw: 2.8 * PIX });
  c.fillStyle = '#4a2f1e';
  for (var i = 0; i < 7; i++) c.fill(ellipsePath(18 + rnd() * 54, 20 + rnd() * 52, 5 + rnd() * 3, 4 + rnd() * 3, rnd()));
});

def('food_juice', 78, 110, function (c, w, h) {
  paper(c, roundRect(8, 16, 62, 88, 5), '#4fa3d8', { w: w, h: h, lw: 2.8 * PIX });
  paper(c, roundRect(16, 28, 46, 42, 4), '#f4f0e6', { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.fillStyle = '#e0533f'; c.fill(ellipsePath(39, 49, 15, 15, 0));
  c.save(); c.strokeStyle = '#f2c233'; c.lineWidth = 6 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(56, 16); c.lineTo(66, 2); c.stroke(); c.restore();
});

def('food_chips', 100, 120, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(14, 16); p.lineTo(86, 16); p.lineTo(80, 108); p.lineTo(20, 108); p.closePath();
  paper(c, p, '#e8622f', { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(p);
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill(ellipsePath(50, 54, 26, 18, 0));
  c.fillStyle = '#c23b22'; c.fill(ellipsePath(50, 54, 17, 11, 0));
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(20, 16, 10, 92);
  c.restore();
  c.save(); c.strokeStyle = sh('#e8622f', -0.4); c.lineWidth = 2.4 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(14, 16); c.lineTo(24, 6); c.lineTo(40, 16); c.lineTo(56, 6); c.lineTo(72, 16); c.lineTo(86, 8); c.stroke();
  c.restore();
});

def('food_crumb', 36, 32, function (c, w, h) {
  paper(c, ellipsePath(18, 18, 12, 10, 0.3), '#e4b572', { w: w, h: h, lw: 2 * PIX });
  c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill(ellipsePath(14, 14, 4, 3, 0.3));
});
