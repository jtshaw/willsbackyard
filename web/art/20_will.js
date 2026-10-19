// ============================================================================
// Will -- short dark-brown hair, easy grin, blue plaid over a grey tee, jeans.
// ============================================================================

def('will_head', 92, 106, function (c, w, h) {
  srnd(21);
  var face = new Path2D();
  face.moveTo(18, 44);
  face.bezierCurveTo(18, 16, 40, 8, 54, 9);
  face.bezierCurveTo(72, 10, 80, 26, 79, 48);
  face.bezierCurveTo(78, 74, 64, 90, 48, 90);
  face.bezierCurveTo(30, 90, 19, 70, 18, 44);
  paper(c, ellipsePath(17, 52, 7, 10, 0), C.skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, ellipsePath(80, 52, 7, 10, 0), C.skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, face, C.skin, { w: w, h: h, lw: 2.8 * PIX });
  // short dark hair with a slight side sweep
  var hair = new Path2D();
  hair.moveTo(15, 46);
  hair.bezierCurveTo(12, 16, 36, 4, 55, 6);
  hair.bezierCurveTo(76, 8, 84, 26, 82, 44);
  hair.bezierCurveTo(78, 34, 74, 28, 62, 28);
  hair.bezierCurveTo(44, 28, 28, 32, 22, 48);
  hair.closePath();
  paper(c, hair, C.hair, { w: w, h: h, lw: 2.6 * PIX });
  c.save();
  c.strokeStyle = sh(C.hair, -0.2); c.lineWidth = 3.4 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(29, 45); c.quadraticCurveTo(37, 41, 45, 45); c.stroke();
  c.beginPath(); c.moveTo(55, 45); c.quadraticCurveTo(63, 41, 71, 45); c.stroke();
  c.restore();
  c.fillStyle = '#ffffff'; c.fill(ellipsePath(37, 54, 7.5, 5.5, 0)); c.fill(ellipsePath(63, 54, 7.5, 5.5, 0));
  c.fillStyle = '#2d2420'; c.fill(ellipsePath(38, 54, 3.6, 3.8, 0)); c.fill(ellipsePath(64, 54, 3.6, 3.8, 0));
  c.save();
  c.strokeStyle = '#8a5c45'; c.lineWidth = 2 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(47, 58); c.lineTo(45, 68); c.lineTo(51, 69); c.stroke();
  c.strokeStyle = '#8c4a42'; c.lineWidth = 3 * PIX;
  c.beginPath(); c.moveTo(34, 75); c.quadraticCurveTo(48, 86, 64, 74); c.stroke();
  c.restore();
  c.fillStyle = 'rgba(214,120,110,0.26)';
  c.fill(ellipsePath(30, 66, 9, 6, 0)); c.fill(ellipsePath(68, 66, 9, 6, 0));
  grain(c, w, h, 0.035);
});

// Same head, brows down + mouth flat: used the moment he spots you.
def('will_head_mad', 92, 106, function (c, w, h) {
  srnd(21);
  var face = new Path2D();
  face.moveTo(18, 44);
  face.bezierCurveTo(18, 16, 40, 8, 54, 9);
  face.bezierCurveTo(72, 10, 80, 26, 79, 48);
  face.bezierCurveTo(78, 74, 64, 90, 48, 90);
  face.bezierCurveTo(30, 90, 19, 70, 18, 44);
  paper(c, ellipsePath(17, 52, 7, 10, 0), C.skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, ellipsePath(80, 52, 7, 10, 0), C.skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, face, C.skin, { w: w, h: h, lw: 2.8 * PIX });
  var hair = new Path2D();
  hair.moveTo(15, 46);
  hair.bezierCurveTo(12, 16, 36, 4, 55, 6);
  hair.bezierCurveTo(76, 8, 84, 26, 82, 44);
  hair.bezierCurveTo(78, 34, 74, 28, 62, 28);
  hair.bezierCurveTo(44, 28, 28, 32, 22, 48);
  hair.closePath();
  paper(c, hair, C.hair, { w: w, h: h, lw: 2.6 * PIX });
  c.save();
  c.strokeStyle = sh(C.hair, -0.2); c.lineWidth = 4 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(28, 42); c.lineTo(46, 48); c.stroke();
  c.beginPath(); c.moveTo(72, 42); c.lineTo(54, 48); c.stroke();
  c.restore();
  c.fillStyle = '#ffffff'; c.fill(ellipsePath(37, 56, 7, 5, 0)); c.fill(ellipsePath(63, 56, 7, 5, 0));
  c.fillStyle = '#2d2420'; c.fill(ellipsePath(39, 56, 3.8, 4, 0)); c.fill(ellipsePath(65, 56, 3.8, 4, 0));
  c.save();
  c.strokeStyle = '#8a5c45'; c.lineWidth = 2 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(47, 60); c.lineTo(45, 69); c.lineTo(51, 70); c.stroke();
  c.restore();
  // open, shouting mouth
  paper(c, ellipsePath(49, 79, 11, 8, 0), '#7d3833', { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.fillStyle = '#e8837c'; c.fill(ellipsePath(49, 83, 6, 3.4, 0));
  grain(c, w, h, 0.035);
});

def('will_torso', 96, 112, function (c, w, h) {
  srnd(22);
  var p = new Path2D();
  p.moveTo(20, 10); p.lineTo(76, 10);
  p.bezierCurveTo(90, 16, 92, 60, 88, 100);
  p.lineTo(8, 100);
  p.bezierCurveTo(4, 60, 6, 16, 20, 10);
  p.closePath();
  paper(c, p, C.plaid, { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(p);
  c.globalAlpha = 0.5; c.fillStyle = C.plaidDk;
  for (var x = -10; x < w + 20; x += 15) c.fillRect(x, 0, 5, h);
  for (var y = -10; y < h + 20; y += 15) c.fillRect(0, y, w, 5);
  c.globalAlpha = 0.26; c.fillStyle = '#ffffff';
  for (var x2 = -4; x2 < w + 20; x2 += 15) c.fillRect(x2, 0, 2, h);
  for (var y2 = -4; y2 < h + 20; y2 += 15) c.fillRect(0, y2, w, 2);
  c.restore();
  // open shirt over a grey tee
  var tee = new Path2D();
  tee.moveTo(36, 10); tee.lineTo(60, 10); tee.lineTo(62, 100); tee.lineTo(34, 100); tee.closePath();
  paper(c, tee, C.tee, { w: w, h: h, lw: 2.4 * PIX });
  c.save(); c.clip(p);
  c.lineWidth = 3 * PIX; c.strokeStyle = sh(C.plaid, -0.4);
  c.beginPath(); c.moveTo(36, 10); c.lineTo(34, 100); c.moveTo(60, 10); c.lineTo(62, 100); c.stroke();
  c.restore();
  paper(c, roundRect(34, 2, 28, 14, 6), C.skinSh, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  grain(c, w, h, 0.04);
});

def('will_arm', 30, 60, function (c, w, h) {
  var p = roundRect(5, 3, 20, 54, 9);
  paper(c, p, C.plaid, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(p); c.globalAlpha = 0.42; c.fillStyle = C.plaidDk;
  for (var y = 0; y < 60; y += 14) c.fillRect(0, y, 30, 5);
  c.restore();
});

def('will_forearm', 28, 58, function (c, w, h) {
  paper(c, roundRect(5, 2, 18, 40, 8), C.skin, { w: w, h: h, lw: 2.4 * PIX });
  paper(c, ellipsePath(14, 46, 10, 9, 0), C.skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
});

def('will_leg', 34, 66, function (c, w, h) {
  paper(c, roundRect(4, 2, 26, 62, 8), C.jeans, { w: w, h: h, lw: 2.8 * PIX });
  crease(c, 'M 17 6 L 17 60', '#ffffff', 1.6, 0.18);
});

def('will_shin', 32, 64, function (c, w, h) {
  paper(c, roundRect(5, 0, 22, 48, 7), C.jeans, { w: w, h: h, lw: 2.6 * PIX });
  paper(c, roundRect(2, 44, 29, 17, 6), '#54452f', { w: w, h: h, lw: 2.4 * PIX });
});

def('will_tongs', 62, 22, function (c, w, h) {
  c.save();
  c.strokeStyle = C.steelDk; c.lineWidth = 4.5 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(4, 11); c.lineTo(42, 4); c.moveTo(4, 11); c.lineTo(42, 18); c.stroke();
  c.strokeStyle = C.steel; c.lineWidth = 2 * PIX;
  c.beginPath(); c.moveTo(6, 11); c.lineTo(42, 5.5); c.moveTo(6, 11); c.lineTo(42, 16.5); c.stroke();
  c.restore();
  paper(c, roundRect(42, 2, 18, 18, 5), '#2e3338', { w: w, h: h, lw: 2 * PIX, shade: false });
});

def('will_flashlight', 56, 28, function (c, w, h) {
  paper(c, roundRect(2, 7, 34, 14, 5), '#3a4248', { w: w, h: h, lw: 2.2 * PIX });
  paper(c, roundRect(34, 3, 19, 22, 4), C.steel, { w: w, h: h, lw: 2.2 * PIX });
  c.fillStyle = '#fff2b0'; c.fill(ellipsePath(51, 14, 4, 10, 0));
});

// Thrown corn-cob / broom swipe projectile Will uses in chases.
def('will_boot', 46, 30, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(6, 8); p.lineTo(26, 6); p.bezierCurveTo(40, 8, 44, 18, 42, 24);
  p.lineTo(8, 24); p.bezierCurveTo(2, 20, 2, 12, 6, 8);
  paper(c, p, '#54452f', { w: w, h: h, lw: 2.4 * PIX });
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(6, 21, 36, 4);
});
