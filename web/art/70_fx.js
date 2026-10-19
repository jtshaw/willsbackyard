// ============================================================================
// Effects, lighting and the little paper flourishes.
// ============================================================================

def('white', 8, 8, function (c, w, h) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });

def('shadow', 96, 36, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(24,18,12,0.5)'); g.addColorStop(0.55, 'rgba(24,18,12,0.22)'); g.addColorStop(1, 'rgba(24,18,12,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('glow', 96, 96, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2 - 1);
  g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(255,238,190,0.45)'); g.addColorStop(1, 'rgba(255,230,170,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('dust', 48, 48, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2 - 1);
  g.addColorStop(0, 'rgba(226,214,192,0.85)'); g.addColorStop(0.6, 'rgba(206,192,166,0.35)'); g.addColorStop(1, 'rgba(200,186,160,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('star', 80, 80, function (c, w, h) {
  var p = new Path2D();
  for (var i = 0; i < 10; i++) {
    var a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    var r = i % 2 === 0 ? 36 : 15;
    var x = 40 + Math.cos(a) * r, y = 40 + Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.closePath();
  paper(c, p, '#ffd34a', { w: w, h: h, lw: 2.6 * PIX });
});

def('heart', 80, 76, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(40, 72);
  p.bezierCurveTo(4, 46, 6, 16, 24, 10);
  p.bezierCurveTo(34, 6, 40, 16, 40, 22);
  p.bezierCurveTo(40, 16, 46, 6, 56, 10);
  p.bezierCurveTo(74, 16, 76, 46, 40, 72);
  paper(c, p, '#e8536b', { w: w, h: h, lw: 2.8 * PIX });
  c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill(ellipsePath(26, 26, 8, 6, -0.5));
});

def('leaf', 60, 40, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(4, 20); p.bezierCurveTo(16, 2, 44, 2, 56, 20);
  p.bezierCurveTo(44, 38, 16, 38, 4, 20);
  paper(c, p, C.leafB, { w: w, h: h, lw: 2.2 * PIX });
  c.save(); c.strokeStyle = 'rgba(110,60,20,0.6)'; c.lineWidth = 1.8 * PIX;
  c.beginPath(); c.moveTo(6, 20); c.lineTo(54, 20); c.stroke(); c.restore();
});

// Speech-bubble markers for the stealth read.
def('fx_alert', 70, 100, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(35, 4); p.bezierCurveTo(48, 4, 50, 14, 48, 28);
  p.lineTo(43, 62); p.bezierCurveTo(42, 70, 28, 70, 27, 62);
  p.lineTo(22, 28); p.bezierCurveTo(20, 14, 22, 4, 35, 4);
  paper(c, p, '#ff4b3e', { w: w, h: h, lw: 3 * PIX });
  paper(c, ellipsePath(35, 86, 12, 12, 0), '#ff4b3e', { w: w, h: h, lw: 3 * PIX, shade: false });
});

def('fx_question', 76, 100, function (c, w, h) {
  c.save();
  c.strokeStyle = '#2c2a28'; c.lineWidth = 12 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(20, 28); c.quadraticCurveTo(24, 6, 44, 8); c.quadraticCurveTo(64, 10, 58, 32);
  c.quadraticCurveTo(54, 46, 42, 52); c.lineTo(40, 64);
  c.stroke();
  c.strokeStyle = '#ffd34a'; c.lineWidth = 6 * PIX; c.stroke();
  c.restore();
  paper(c, ellipsePath(39, 86, 10, 10, 0), '#ffd34a', { w: w, h: h, lw: 3 * PIX, shade: false });
});

def('fx_zzz', 90, 70, function (c, w, h) {
  c.save();
  c.fillStyle = '#dfe6ec'; c.strokeStyle = '#5d6a74'; c.lineWidth = 2.6 * PIX; c.lineJoin = 'round';
  c.font = 'bold 44px sans-serif';
  c.strokeText('z', 8, 60); c.fillText('z', 8, 60);
  c.font = 'bold 34px sans-serif';
  c.strokeText('z', 40, 38); c.fillText('z', 40, 38);
  c.font = 'bold 24px sans-serif';
  c.strokeText('z', 66, 22); c.fillText('z', 66, 22);
  c.restore();
});

// Vision cone: bright at the eye, fading out at the far edge.
def('vision_cone', 192, 120, function (c, w, h) {
  var g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,244,196,0.50)');
  g.addColorStop(0.55, 'rgba(255,238,170,0.26)');
  g.addColorStop(1, 'rgba(255,232,150,0)');
  var p = new Path2D();
  p.moveTo(0, h / 2);
  p.lineTo(w, h * 0.03);
  p.lineTo(w, h * 0.97);
  p.closePath();
  c.fillStyle = g; c.fill(p);
});

// Flashlight beam for the hutch -- punched through the darkness layer.
def('light_cone', 192, 136, function (c, w, h) {
  var g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,252,230,0.95)');
  g.addColorStop(0.45, 'rgba(255,246,200,0.55)');
  g.addColorStop(1, 'rgba(255,240,180,0)');
  var p = new Path2D();
  p.moveTo(0, h / 2 - h * 0.035); p.lineTo(w, 0); p.lineTo(w, h); p.lineTo(0, h / 2 + h * 0.035);
  p.closePath();
  c.fillStyle = g; c.fill(p);
});

// Soft radial hole -- multiplied over the dark layer to carve out sight.
def('light_blob', 128, 128, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, w / 2 - 1);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

// Cinematic edges. Drawn full-screen, multiplied.
def('vignette', 256, 144, function (c, w, h) {
  var g = c.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.86);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.65, 'rgba(206,196,186,1)');
  g.addColorStop(1, 'rgba(120,110,104,1)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

// Paper-fold seam drawn over the whole frame -- keeps the diorama feel.
def('fold_seam', 8, 144, function (c, w, h) {
  var g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.55, 'rgba(60,50,40,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

def('splash_burst', 168, 168, function (c, w, h) {
  srnd(171);
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(w / 300, h / 300);
  var p = new Path2D();
  for (var i = 0; i < 24; i++) {
    var a = (i / 24) * Math.PI * 2;
    var r = i % 2 === 0 ? 142 : 86 + rnd() * 20;
    var x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.closePath();
  c.fillStyle = '#ffd34a'; c.fill(p);
  c.strokeStyle = '#c9892a'; c.lineWidth = 4 * PIX; c.stroke(p);
  c.restore();
});

// Thermal-camera furniture: scanlines and a sensor-noise tile, both stretched
// across the frame when infrared mode is on.
def('ir_scan', 8, 64, function (c, w, h) {
  c.fillStyle = 'rgba(255,255,255,1)';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(0,0,0,0.30)';
  for (var y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
});

def('ir_noise', 128, 128, function (c, w, h) {
  srnd(181);
  var img = c.createImageData(w, h);
  for (var i = 0; i < w * h; i++) {
    var v = 150 + rnd() * 105;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
});
