// ============================================================================
// The rat -- a paper puppet. Rust places and rotates each part every frame.
// ============================================================================

def('rat_body', 132, 92, function (c, w, h) {
  srnd(11);
  var p = new Path2D();
  p.moveTo(10, 56);
  p.bezierCurveTo(6, 24, 42, 8, 70, 10);
  p.bezierCurveTo(104, 12, 126, 30, 124, 54);
  p.bezierCurveTo(122, 78, 96, 88, 64, 86);
  p.bezierCurveTo(34, 84, 13, 76, 10, 56);
  p.closePath();
  paper(c, p, C.fur, { w: w, h: h });
  c.save(); c.clip(p);
  c.fillStyle = rgba(C.belly, 0.78);
  c.fill(ellipsePath(70, 82, 46, 16, 0));
  c.restore();
  crease(c, 'M 30 30 C 60 20 96 26 114 44', '#ffffff', 2.2, 0.30);
  grain(c, w, h);
});

def('rat_head', 104, 92, function (c, w, h) {
  srnd(12);
  // wedge skull tapering into a snout at the right
  var p = new Path2D();
  p.moveTo(8, 40);
  p.bezierCurveTo(10, 14, 40, 4, 62, 10);
  p.bezierCurveTo(86, 16, 100, 38, 98, 52);
  p.bezierCurveTo(96, 62, 86, 68, 74, 70);
  p.bezierCurveTo(56, 80, 22, 76, 12, 60);
  p.closePath();
  paper(c, p, C.fur, { w: w, h: h });
  c.save(); c.clip(p);
  c.fillStyle = rgba(C.belly, 0.8);
  c.fill(ellipsePath(74, 60, 26, 14, -0.18));
  c.restore();
  paper(c, ellipsePath(93, 57, 7.5, 6, -0.2), C.pink, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.save();
  c.strokeStyle = 'rgba(40,32,28,0.5)'; c.lineWidth = 1.6 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(88, 60); c.quadraticCurveTo(70, 72, 52, 74);
  c.moveTo(90, 56); c.quadraticCurveTo(72, 62, 50, 62);
  c.moveTo(88, 52); c.quadraticCurveTo(72, 50, 54, 48);
  c.stroke(); c.restore();
  crease(c, 'M 24 26 C 46 16 70 22 86 40', '#ffffff', 2, 0.28);
  grain(c, w, h);
});

def('rat_ear', 54, 54, function (c, w, h) {
  paper(c, ellipsePath(27, 27, 23, 25, 0), C.fur, { w: w, h: h, lw: 2.8 * PIX });
  paper(c, ellipsePath(27, 29, 13, 15, 0), C.pink, { w: w, h: h, lw: 2 * PIX, shade: false });
});

def('rat_eye', 34, 34, function (c, w, h) {
  paper(c, ellipsePath(17, 17, 13, 14, 0), '#ffffff', { w: w, h: h, lw: 2.4 * PIX, shade: false });
  c.fillStyle = '#20191c'; c.fill(ellipsePath(19, 17, 7.5, 8.5, 0));
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill(ellipsePath(16, 13, 3.2, 3.4, 0));
});

def('rat_arm', 34, 58, function (c, w, h) {
  paper(c, roundRect(8, 4, 18, 50, 9), C.furDark, { w: w, h: h, lw: 2.6 * PIX });
  paper(c, ellipsePath(17, 50, 11, 9, 0), C.pink, { w: w, h: h, lw: 2.2 * PIX, shade: false });
});

def('rat_leg', 40, 62, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(12, 4); p.bezierCurveTo(30, 6, 32, 26, 26, 40);
  p.bezierCurveTo(23, 50, 14, 52, 10, 44);
  p.bezierCurveTo(4, 30, 4, 10, 12, 4);
  paper(c, p, C.furDark, { w: w, h: h, lw: 2.6 * PIX });
  paper(c, ellipsePath(20, 50, 14, 9, -0.12), C.pink, { w: w, h: h, lw: 2.2 * PIX, shade: false });
});

// Tapered segment: thick where it meets the body, thin at the far end.
def('rat_tail', 96, 40, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(2, 6); p.bezierCurveTo(34, 10, 64, 14, 93, 18);
  p.bezierCurveTo(64, 24, 34, 30, 2, 34);
  p.closePath();
  paper(c, p, C.pink, { w: w, h: h, lw: 2.6 * PIX });
  // Faint scale rings, the way a rat tail actually looks.
  c.save();
  c.clip(p);
  c.strokeStyle = 'rgba(150,96,96,0.35)'; c.lineWidth = 1.6 * PIX;
  for (var i = 0; i < 9; i++) {
    var x = 8 + i * 10;
    c.beginPath(); c.moveTo(x, 2); c.lineTo(x - 3, 38); c.stroke();
  }
  c.restore();
});

// Crumb-sized satchel the rat fills as it steals -- bulges with each pickup.
def('rat_sack', 48, 44, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(10, 16); p.bezierCurveTo(4, 32, 14, 42, 24, 42);
  p.bezierCurveTo(34, 42, 44, 32, 38, 16);
  p.bezierCurveTo(32, 10, 16, 10, 10, 16);
  paper(c, p, '#c8a06a', { w: w, h: h, lw: 2.4 * PIX });
  c.save(); c.strokeStyle = '#7d5c33'; c.lineWidth = 2.4 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(12, 17); c.quadraticCurveTo(24, 8, 36, 17); c.stroke(); c.restore();
});
