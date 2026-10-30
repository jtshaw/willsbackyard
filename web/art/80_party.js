// ============================================================================
// Chaos at the Party -- the rooftop next door, its guests, and the DJ.
// Every guest part is authored at Will's sizes (see 20_will.js) so the
// costumes hang on his skeleton in puppet.rs without any new joints.
// ============================================================================

var P = {
  stucco: '#e9e6df', charcoal: '#2c2f34', glass: '#1d2a38',
  navy: '#26345a', fleece: '#9aa1a8', khaki: '#c8b48a', loafer: '#6a4426',
  coat: '#f6f6f2', cross: '#d8383a', heel: '#c41e3a', steth: '#3c4148',
  olive: '#6f7a4a', oliveDk: '#4d5533', boot: '#2a2622',
  sheet: '#f3efe6', laurel: '#d6b23a', sandal: '#8a5a32',
  blu: '#2f7bff', bluLt: '#79b6ff', hoodie: '#1b1d22'
};

// Will's face shape, ears and eyes, in another skin. Hair, eyewear and
// mouth are added per costume on top.
function guestFace(c, w, h, skin, opts) {
  opts = opts || {};
  var face = new Path2D();
  face.moveTo(18, 44);
  face.bezierCurveTo(18, 16, 40, 8, 54, 9);
  face.bezierCurveTo(72, 10, 80, 26, 79, 48);
  face.bezierCurveTo(78, 74, 64, 90, 48, 90);
  face.bezierCurveTo(30, 90, 19, 70, 18, 44);
  paper(c, ellipsePath(17, 52, 7, 10, 0), skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, ellipsePath(80, 52, 7, 10, 0), skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
  paper(c, face, skin, { w: w, h: h, lw: 2.8 * PIX });
  if (!opts.noEyes) {
    c.fillStyle = '#ffffff'; c.fill(ellipsePath(37, 54, 7, 5, 0)); c.fill(ellipsePath(63, 54, 7, 5, 0));
    c.fillStyle = '#2d2420'; c.fill(ellipsePath(38, 54, 3.4, 3.6, 0)); c.fill(ellipsePath(64, 54, 3.4, 3.6, 0));
  }
  c.save();
  c.strokeStyle = sh(skin, -0.35); c.lineWidth = 2 * PIX; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(47, 58); c.lineTo(45, 68); c.lineTo(51, 69); c.stroke();
  c.restore();
}

// One-sided smirk: the face of a man who has explained the blockchain to you.
function smirk(c, col) {
  c.save();
  c.strokeStyle = col || '#7d3d36'; c.lineWidth = 3 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(38, 77); c.quadraticCurveTo(52, 81, 64, 72); c.stroke();
  c.restore();
}

function shades(c, frame, lens, aviator) {
  c.save();
  var l = aviator ? ellipsePath(36, 55, 11, 9, 0.15) : roundRect(25, 47, 22, 14, 4);
  var r = aviator ? ellipsePath(63, 55, 11, 9, -0.15) : roundRect(53, 47, 22, 14, 4);
  paper(c, l, lens, { w: 92, h: 106, lw: 2.2 * PIX, inkCol: frame, shade: false });
  paper(c, r, lens, { w: 92, h: 106, lw: 2.2 * PIX, inkCol: frame, shade: false });
  c.strokeStyle = frame; c.lineWidth = 2.4 * PIX;
  c.beginPath(); c.moveTo(46, 52); c.lineTo(53, 52); c.stroke();
  c.beginPath(); c.moveTo(25, 51); c.lineTo(17, 49); c.moveTo(75, 51); c.lineTo(81, 49); c.stroke();
  // a glint
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6 * PIX;
  c.beginPath(); c.moveTo(30, 51); c.lineTo(35, 50); c.moveTo(57, 51); c.lineTo(62, 50); c.stroke();
  c.restore();
}

function limbRect(c, w, h, col, x, y, ww, hh, r) {
  paper(c, roundRect(x, y, ww, hh, r), col, { w: w, h: h, lw: 2.6 * PIX });
}
function hand(c, w, h, skin) {
  paper(c, ellipsePath(14, 46, 10, 9, 0), skin, { w: w, h: h, lw: 2.2 * PIX, shade: false });
}

// ---- Crypto Bro ------------------------------------------------------------
// Puffer vest, quarter-zip, chinos, loafers, sunglasses at night, AirPods in.

var SKIN_A = '#ecbf9c';
def('guest_crypto_head', 92, 106, function (c, w, h) {
  srnd(81);
  guestFace(c, w, h, SKIN_A, { noEyes: true });
  var hair = new Path2D();
  hair.moveTo(16, 44);
  hair.bezierCurveTo(10, 14, 34, 0, 58, 4);
  hair.bezierCurveTo(80, 6, 88, 22, 84, 40);
  hair.bezierCurveTo(76, 24, 60, 22, 46, 26);
  hair.bezierCurveTo(34, 30, 24, 34, 20, 48);
  hair.closePath();
  paper(c, hair, '#d9b25a', { w: w, h: h, lw: 2.6 * PIX });
  crease(c, 'M 30 16 Q 50 8 72 16', '#fff4c0', 2, 0.5);
  shades(c, '#111111', '#22262c', false);
  smirk(c);
  // AirPod
  paper(c, roundRect(80, 54, 6, 12, 3), '#ffffff', { w: w, h: h, lw: 1.4 * PIX, shade: false });
  grain(c, w, h, 0.03);
});

def('guest_crypto_torso', 96, 112, function (c, w, h) {
  srnd(82);
  var body = new Path2D();
  body.moveTo(20, 10); body.lineTo(76, 10);
  body.bezierCurveTo(90, 16, 92, 60, 88, 100);
  body.lineTo(8, 100);
  body.bezierCurveTo(4, 60, 6, 16, 20, 10);
  body.closePath();
  paper(c, body, P.fleece, { w: w, h: h, lw: 3 * PIX });
  // quarter-zip collar
  paper(c, roundRect(32, 2, 32, 18, 6), sh(P.fleece, -0.1), { w: w, h: h, lw: 2.2 * PIX });
  c.save(); c.strokeStyle = '#3a3f45'; c.lineWidth = 2 * PIX;
  c.beginPath(); c.moveTo(48, 4); c.lineTo(48, 30); c.stroke(); c.restore();
  // the vest, open down the front
  var vl = new Path2D();
  vl.moveTo(14, 14); vl.lineTo(40, 18); vl.lineTo(42, 100); vl.lineTo(8, 100);
  vl.bezierCurveTo(4, 60, 6, 22, 14, 14); vl.closePath();
  var vr = new Path2D();
  vr.moveTo(82, 14); vr.lineTo(56, 18); vr.lineTo(54, 100); vr.lineTo(88, 100);
  vr.bezierCurveTo(92, 60, 90, 22, 82, 14); vr.closePath();
  [vl, vr].forEach(function (v) {
    paper(c, v, P.navy, { w: w, h: h, lw: 2.8 * PIX });
    c.save(); c.clip(v); c.strokeStyle = sh(P.navy, -0.35); c.lineWidth = 2 * PIX;
    for (var y = 30; y < 100; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 2); c.stroke(); }
    c.restore();
  });
  // a coin logo, so you know
  paper(c, ellipsePath(70, 34, 7, 7, 0), '#f2a33a', { w: w, h: h, lw: 1.6 * PIX, shade: false });
  c.fillStyle = '#ffffff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('B', 70, 35);
  grain(c, w, h, 0.035);
});

def('guest_crypto_arm', 30, 60, function (c, w, h) {
  limbRect(c, w, h, P.fleece, 5, 3, 20, 54, 9);
});
def('guest_crypto_forearm', 28, 58, function (c, w, h) {
  limbRect(c, w, h, P.fleece, 5, 2, 18, 30, 8);
  limbRect(c, w, h, SKIN_A, 6, 28, 16, 14, 6);
  hand(c, w, h, SKIN_A);
});
def('guest_crypto_leg', 34, 66, function (c, w, h) {
  limbRect(c, w, h, P.khaki, 4, 2, 26, 62, 8);
  crease(c, 'M 17 6 L 17 60', '#ffffff', 1.6, 0.25);
});
def('guest_crypto_shin', 32, 64, function (c, w, h) {
  limbRect(c, w, h, P.khaki, 5, 0, 22, 46, 7);
  // bare ankle, because of course
  limbRect(c, w, h, SKIN_A, 7, 42, 18, 6, 3);
  paper(c, roundRect(2, 46, 29, 15, 6), P.loafer, { w: w, h: h, lw: 2.4 * PIX });
});

// ---- Sexy Doctor -----------------------------------------------------------
// A white coat that stopped at mid-thigh, a stethoscope, red heels, and a
// head mirror nobody has used since 1950.

var SKIN_B = '#c98b62';
def('guest_doctor_head', 92, 106, function (c, w, h) {
  srnd(83);
  // high ponytail, behind the head
  paper(c, ellipsePath(14, 30, 12, 22, -0.6), '#2f1f1a', { w: w, h: h, lw: 2.4 * PIX });
  guestFace(c, w, h, SKIN_B);
  var hair = new Path2D();
  hair.moveTo(16, 46);
  hair.bezierCurveTo(12, 14, 36, 4, 56, 6);
  hair.bezierCurveTo(78, 8, 86, 26, 82, 46);
  hair.bezierCurveTo(74, 30, 56, 24, 40, 26);
  hair.bezierCurveTo(28, 30, 20, 36, 16, 46);
  hair.closePath();
  paper(c, hair, '#2f1f1a', { w: w, h: h, lw: 2.6 * PIX });
  // head mirror on its band
  c.save(); c.strokeStyle = '#3a3a3a'; c.lineWidth = 3 * PIX;
  c.beginPath(); c.moveTo(18, 34); c.quadraticCurveTo(48, 18, 80, 34); c.stroke(); c.restore();
  paper(c, ellipsePath(50, 22, 12, 12, 0), '#d7dde2', { w: w, h: h, lw: 2.2 * PIX });
  c.fillStyle = '#2a2a2a'; c.fill(ellipsePath(50, 22, 3, 3, 0));
  // lashes and lipstick
  c.save(); c.strokeStyle = '#1a1210'; c.lineWidth = 2 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(29, 49); c.lineTo(26, 46); c.moveTo(71, 49); c.lineTo(74, 46); c.stroke();
  c.restore();
  paper(c, ellipsePath(49, 77, 8, 4, 0), '#c2273a', { w: w, h: h, lw: 1.6 * PIX, shade: false });
  grain(c, w, h, 0.03);
});

def('guest_doctor_torso', 96, 112, function (c, w, h) {
  srnd(84);
  var coat = new Path2D();
  coat.moveTo(22, 10); coat.lineTo(74, 10);
  coat.bezierCurveTo(86, 16, 84, 46, 76, 60);
  coat.bezierCurveTo(82, 76, 90, 92, 92, 104);
  coat.lineTo(4, 104);
  coat.bezierCurveTo(6, 92, 14, 76, 20, 60);
  coat.bezierCurveTo(12, 46, 10, 16, 22, 10);
  coat.closePath();
  paper(c, coat, P.coat, { w: w, h: h, lw: 3 * PIX });
  // lapels and buttons
  c.save(); c.strokeStyle = '#b9bcbf'; c.lineWidth = 2 * PIX;
  c.beginPath(); c.moveTo(38, 10); c.lineTo(48, 40); c.lineTo(58, 10); c.stroke();
  c.beginPath(); c.moveTo(48, 40); c.lineTo(48, 104); c.stroke(); c.restore();
  c.fillStyle = '#9aa0a5'; [52, 68, 84].forEach(function (y) { c.fill(ellipsePath(52, y, 2.4, 2.4, 0)); });
  // neckline
  paper(c, roundRect(38, 2, 20, 16, 6), SKIN_B, { w: w, h: h, lw: 2 * PIX, shade: false });
  // red cross pocket badge
  c.fillStyle = P.cross; c.fillRect(66, 28, 12, 4); c.fillRect(70, 24, 4, 12);
  // stethoscope round the neck
  c.save(); c.strokeStyle = P.steth; c.lineWidth = 3 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(30, 12); c.bezierCurveTo(26, 40, 40, 56, 44, 60); c.stroke();
  c.beginPath(); c.moveTo(66, 12); c.bezierCurveTo(70, 40, 56, 56, 52, 60); c.stroke();
  c.restore();
  paper(c, ellipsePath(48, 64, 7, 7, 0), '#c7ccd1', { w: w, h: h, lw: 2 * PIX });
  grain(c, w, h, 0.03);
});

def('guest_doctor_arm', 30, 60, function (c, w, h) {
  limbRect(c, w, h, SKIN_B, 6, 3, 18, 54, 9);
  limbRect(c, w, h, P.coat, 4, 2, 22, 22, 8);
});
def('guest_doctor_forearm', 28, 58, function (c, w, h) {
  limbRect(c, w, h, SKIN_B, 6, 2, 16, 40, 8);
  hand(c, w, h, SKIN_B);
  c.fillStyle = '#c2273a'; c.fill(ellipsePath(10, 52, 2, 2, 0));
});
def('guest_doctor_leg', 34, 66, function (c, w, h) {
  limbRect(c, w, h, SKIN_B, 6, 2, 22, 62, 9);
});
def('guest_doctor_shin', 32, 64, function (c, w, h) {
  limbRect(c, w, h, SKIN_B, 8, 0, 16, 48, 7);
  // a red stiletto
  var shoe = new Path2D();
  shoe.moveTo(6, 46); shoe.lineTo(26, 54); shoe.lineTo(30, 60); shoe.lineTo(10, 60);
  shoe.lineTo(8, 52); shoe.closePath();
  paper(c, shoe, P.heel, { w: w, h: h, lw: 2.2 * PIX });
  c.save(); c.strokeStyle = sh(P.heel, -0.4); c.lineWidth = 2.4 * PIX;
  c.beginPath(); c.moveTo(8, 52); c.lineTo(6, 63); c.stroke(); c.restore();
});

// ---- Fighter Pilot ---------------------------------------------------------
// Aviators, a flight suit, and a call sign he gave himself.

var SKIN_C = '#8d5a3b';
def('guest_pilot_head', 92, 106, function (c, w, h) {
  srnd(85);
  guestFace(c, w, h, SKIN_C, { noEyes: true });
  var hair = new Path2D();
  hair.moveTo(18, 40);
  hair.bezierCurveTo(16, 16, 36, 8, 54, 8);
  hair.bezierCurveTo(72, 9, 82, 22, 80, 40);
  hair.bezierCurveTo(70, 28, 30, 26, 18, 40);
  hair.closePath();
  paper(c, hair, '#1c1612', { w: w, h: h, lw: 2.2 * PIX });
  shades(c, '#c9a13a', '#3e8a9a', true);
  // the grin
  c.save(); c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(36, 74); c.quadraticCurveTo(50, 88, 64, 73); c.closePath(); c.fill();
  c.strokeStyle = '#4a2a20'; c.lineWidth = 2.4 * PIX; c.stroke(); c.restore();
  grain(c, w, h, 0.03);
});

def('guest_pilot_torso', 96, 112, function (c, w, h) {
  srnd(86);
  var body = new Path2D();
  body.moveTo(20, 10); body.lineTo(76, 10);
  body.bezierCurveTo(90, 16, 92, 60, 88, 104);
  body.lineTo(8, 104);
  body.bezierCurveTo(4, 60, 6, 16, 20, 10);
  body.closePath();
  paper(c, body, P.olive, { w: w, h: h, lw: 3 * PIX });
  paper(c, roundRect(34, 2, 28, 16, 6), P.oliveDk, { w: w, h: h, lw: 2 * PIX });
  c.save(); c.strokeStyle = '#c8c8b8'; c.lineWidth = 2 * PIX;
  c.beginPath(); c.moveTo(50, 8); c.lineTo(50, 104); c.stroke(); c.restore();
  // name tag
  paper(c, roundRect(16, 28, 28, 14, 3), '#3a3324', { w: w, h: h, lw: 1.6 * PIX, shade: false });
  c.fillStyle = '#e8dcb0'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('BRO', 30, 35.5);
  // squadron patch
  paper(c, ellipsePath(70, 38, 10, 10, 0), '#b8322e', { w: w, h: h, lw: 1.6 * PIX, shade: false });
  c.fillStyle = '#f2d34a'; c.fill(ellipsePath(70, 38, 4, 4, 0));
  // belt
  c.fillStyle = P.oliveDk; c.fillRect(8, 86, 80, 8);
  grain(c, w, h, 0.035);
});

def('guest_pilot_arm', 30, 60, function (c, w, h) {
  limbRect(c, w, h, P.olive, 5, 3, 20, 54, 9);
});
def('guest_pilot_forearm', 28, 58, function (c, w, h) {
  limbRect(c, w, h, P.olive, 5, 2, 18, 22, 8);
  limbRect(c, w, h, SKIN_C, 6, 20, 16, 22, 6);
  hand(c, w, h, SKIN_C);
});
def('guest_pilot_leg', 34, 66, function (c, w, h) {
  limbRect(c, w, h, P.olive, 4, 2, 26, 62, 8);
  // thigh pocket
  paper(c, roundRect(8, 24, 18, 16, 3), P.oliveDk, { w: w, h: h, lw: 1.6 * PIX, shade: false });
});
def('guest_pilot_shin', 32, 64, function (c, w, h) {
  limbRect(c, w, h, P.olive, 5, 0, 22, 40, 7);
  paper(c, roundRect(2, 36, 29, 25, 6), P.boot, { w: w, h: h, lw: 2.4 * PIX });
});

// ---- Toga Bro ----------------------------------------------------------------
// A fitted sheet, a plastic laurel, and a sunburn from a different party.

var SKIN_D = '#f2c7a6';
def('guest_toga_head', 92, 106, function (c, w, h) {
  srnd(87);
  guestFace(c, w, h, SKIN_D);
  var hair = new Path2D();
  hair.moveTo(16, 44);
  for (var i = 0; i <= 8; i++) {
    var a = Math.PI + i / 8 * Math.PI;
    var r = 36 + (i % 2) * 6;
    hair.lineTo(49 + Math.cos(a) * r, 40 + Math.sin(a) * r * 0.85);
  }
  hair.lineTo(82, 44);
  hair.bezierCurveTo(70, 30, 30, 30, 16, 44);
  hair.closePath();
  paper(c, hair, '#7a4f2e', { w: w, h: h, lw: 2.4 * PIX });
  // the laurel
  c.save(); c.strokeStyle = sh(P.laurel, -0.2); c.lineWidth = 2.4 * PIX;
  c.beginPath(); c.moveTo(16, 38); c.quadraticCurveTo(48, 22, 82, 38); c.stroke(); c.restore();
  for (var k = 0; k < 7; k++) {
    var t = k / 6, x = 18 + t * 62, y = 37 - Math.sin(t * Math.PI) * 9;
    paper(c, ellipsePath(x, y - 4, 4.5, 2.4, -0.6 + t * 1.2), P.laurel, { w: w, h: h, lw: 1.2 * PIX, shade: false });
  }
  // sunburnt cheeks and an open-mouthed "WOOO"
  c.fillStyle = 'rgba(228,96,80,0.4)';
  c.fill(ellipsePath(28, 66, 10, 6, 0)); c.fill(ellipsePath(70, 66, 10, 6, 0));
  paper(c, ellipsePath(49, 78, 7, 6, 0), '#7d3833', { w: w, h: h, lw: 2 * PIX, shade: false });
  grain(c, w, h, 0.03);
});

def('guest_toga_torso', 96, 112, function (c, w, h) {
  srnd(88);
  var body = new Path2D();
  body.moveTo(20, 10); body.lineTo(76, 10);
  body.bezierCurveTo(90, 16, 92, 60, 88, 100);
  body.lineTo(8, 100);
  body.bezierCurveTo(4, 60, 6, 16, 20, 10);
  body.closePath();
  paper(c, body, SKIN_D, { w: w, h: h, lw: 3 * PIX });
  // the sheet, over one shoulder and round the waist
  var sheet = new Path2D();
  sheet.moveTo(56, 8); sheet.lineTo(78, 10);
  sheet.bezierCurveTo(92, 30, 92, 70, 90, 104);
  sheet.lineTo(6, 104); sheet.lineTo(8, 70);
  sheet.bezierCurveTo(28, 60, 44, 36, 56, 8);
  sheet.closePath();
  paper(c, sheet, P.sheet, { w: w, h: h, lw: 2.8 * PIX });
  c.save(); c.clip(sheet); c.strokeStyle = '#cfc8b8'; c.lineWidth = 2 * PIX;
  for (var i = 0; i < 5; i++) {
    c.beginPath(); c.moveTo(20 + i * 16, 104); c.quadraticCurveTo(50 + i * 8, 60, 66 + i * 6, 12); c.stroke();
  }
  c.restore();
  // a mattress-label tag nobody cut off
  paper(c, roundRect(80, 82, 10, 14, 2), '#ffffff', { w: w, h: h, lw: 1.2 * PIX, shade: false });
  grain(c, w, h, 0.03);
});

def('guest_toga_arm', 30, 60, function (c, w, h) {
  limbRect(c, w, h, SKIN_D, 5, 3, 20, 54, 9);
});
def('guest_toga_forearm', 28, 58, function (c, w, h) {
  limbRect(c, w, h, SKIN_D, 5, 2, 18, 40, 8);
  hand(c, w, h, SKIN_D);
});
def('guest_toga_leg', 34, 66, function (c, w, h) {
  limbRect(c, w, h, SKIN_D, 5, 2, 24, 62, 9);
  paper(c, roundRect(3, 0, 28, 24, 6), P.sheet, { w: w, h: h, lw: 2 * PIX });
});
def('guest_toga_shin', 32, 64, function (c, w, h) {
  limbRect(c, w, h, SKIN_D, 7, 0, 18, 50, 7);
  paper(c, roundRect(3, 52, 27, 9, 4), P.sandal, { w: w, h: h, lw: 2 * PIX });
  c.save(); c.strokeStyle = P.sandal; c.lineWidth = 2.4 * PIX;
  c.beginPath(); c.moveTo(7, 46); c.lineTo(25, 52); c.moveTo(7, 52); c.lineTo(25, 40); c.stroke();
  c.restore();
});

// An open, shrieking mouth, laid over any guest's face once they spot you.
def('guest_shout', 30, 24, function (c, w, h) {
  paper(c, ellipsePath(15, 12, 11, 9, 0), '#6e2c2a', { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.fillStyle = '#e8837c'; c.fill(ellipsePath(15, 16, 6, 3.4, 0));
  c.fillStyle = '#ffffff'; c.fillRect(8, 4, 14, 3);
});

// ---- things in hands ---------------------------------------------------------
def('guest_phone', 26, 42, function (c, w, h) {
  paper(c, roundRect(2, 2, 22, 38, 5), '#1b1d21', { w: w, h: h, lw: 2 * PIX, shade: false });
  c.fillStyle = '#0f2a1c'; c.fillRect(5, 6, 16, 30);
  // number go up
  c.save(); c.strokeStyle = '#38e07a'; c.lineWidth = 2 * PIX; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(6, 32); c.lineTo(10, 26); c.lineTo(13, 28); c.lineTo(17, 16); c.lineTo(20, 10); c.stroke();
  c.restore();
});

def('guest_cup', 30, 36, function (c, w, h) {
  var cup = new Path2D();
  cup.moveTo(3, 4); cup.lineTo(27, 4); cup.lineTo(23, 34); cup.lineTo(7, 34); cup.closePath();
  paper(c, cup, '#d9312e', { w: w, h: h, lw: 2 * PIX });
  c.fillStyle = '#f4f0ea'; c.fillRect(3, 3, 24, 4);
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(6, 20, 19, 2); c.fillRect(6, 26, 18, 2);
});

def('guest_syringe', 70, 24, function (c, w, h) {
  // A novelty one, full of something blue.
  paper(c, roundRect(14, 6, 40, 12, 3), '#e8f1f6', { w: w, h: h, lw: 2 * PIX, shade: false });
  c.fillStyle = '#4fb0ff'; c.fillRect(30, 8, 22, 8);
  paper(c, roundRect(2, 9, 14, 6, 2), '#bfc6cc', { w: w, h: h, lw: 1.6 * PIX, shade: false });
  paper(c, roundRect(0, 4, 4, 16, 1), '#bfc6cc', { w: w, h: h, lw: 1.4 * PIX, shade: false });
  c.save(); c.strokeStyle = '#9aa3aa'; c.lineWidth = 1.6 * PIX;
  c.beginPath(); c.moveTo(54, 12); c.lineTo(68, 12); c.stroke(); c.restore();
});

// ---- DJ Benny Blu3 -------------------------------------------------------------
// From the reference: dark wavy hair, full beard, dark sunglasses, big black
// over-ear headphones, a cream floral jacket over a black tee, wooden beads.

var SKIN_E = '#d9a27c';
var JACKET = '#e9dccb';

// Roses and blue blooms scattered over the jacket, the same every load.
function florals(c, w, h, seed, scale) {
  srnd(seed);
  var n = Math.round(w * h / 260);
  for (var i = 0; i < n; i++) {
    var x = rnd() * w, y = rnd() * h, r = (2.6 + rnd() * 2.6) * (scale || 1);
    c.fillStyle = 'rgba(96,120,70,0.6)';
    c.fill(ellipsePath(x + r, y + r * 0.6, r * 0.9, r * 0.4, rnd() * 3));
    c.fillStyle = rnd() < 0.55 ? '#c9474a' : '#5a86c4';
    c.fill(ellipsePath(x, y, r, r * 0.85, 0));
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fill(ellipsePath(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.3, 0));
  }
}

def('dj_head', 92, 106, function (c, w, h) {
  srnd(89);
  // Wavy hair spills out behind the headphone band.
  var back = new Path2D();
  back.moveTo(12, 56); back.bezierCurveTo(4, 30, 18, 4, 46, 2);
  back.bezierCurveTo(74, 0, 90, 18, 86, 50); back.lineTo(80, 60);
  back.bezierCurveTo(78, 40, 20, 40, 18, 62); back.closePath();
  paper(c, back, '#2a1d16', { w: w, h: h, lw: 2.4 * PIX });
  guestFace(c, w, h, SKIN_E, { noEyes: true });
  var fringe = new Path2D();
  fringe.moveTo(18, 40);
  fringe.bezierCurveTo(20, 14, 40, 8, 58, 10);
  fringe.bezierCurveTo(70, 12, 80, 22, 82, 36);
  fringe.bezierCurveTo(72, 26, 66, 30, 58, 24);
  fringe.bezierCurveTo(50, 32, 40, 26, 34, 32);
  fringe.bezierCurveTo(28, 30, 22, 36, 18, 40);
  fringe.closePath();
  paper(c, fringe, '#2a1d16', { w: w, h: h, lw: 2.2 * PIX });
  c.save(); c.strokeStyle = '#4a3428'; c.lineWidth = 1.6 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(30, 18); c.quadraticCurveTo(38, 12, 46, 18); c.stroke();
  c.beginPath(); c.moveTo(52, 14); c.quadraticCurveTo(60, 10, 68, 18); c.stroke();
  c.restore();
  // Full dark beard up to the cheekbones.
  var beard = new Path2D();
  beard.moveTo(19, 52); beard.bezierCurveTo(18, 84, 34, 98, 49, 98);
  beard.bezierCurveTo(66, 98, 80, 84, 79, 52);
  beard.bezierCurveTo(74, 64, 66, 68, 60, 66); beard.bezierCurveTo(54, 64, 44, 64, 38, 66);
  beard.bezierCurveTo(30, 68, 22, 62, 19, 52); beard.closePath();
  paper(c, beard, '#2e211a', { w: w, h: h, lw: 2 * PIX });
  // The big grin through it.
  c.save(); c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(36, 76); c.quadraticCurveTo(50, 88, 64, 75); c.closePath(); c.fill();
  c.strokeStyle = '#3a221a'; c.lineWidth = 2.2 * PIX; c.stroke(); c.restore();
  shades(c, '#111111', '#1e2226', false);
  // Headphones: band over the top, a big cup over the ear.
  c.save(); c.strokeStyle = '#121316'; c.lineWidth = 6 * PIX; c.lineCap = 'round';
  c.beginPath(); c.arc(50, 46, 40, Math.PI * 1.08, Math.PI * 1.95); c.stroke(); c.restore();
  paper(c, roundRect(76, 34, 16, 34, 7), '#1a1b1f', { w: w, h: h, lw: 2 * PIX });
  paper(c, roundRect(2, 36, 16, 32, 7), '#1a1b1f', { w: w, h: h, lw: 2 * PIX });
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.fill(ellipsePath(10, 52, 3, 10, 0));
  grain(c, w, h, 0.03);
});

def('dj_torso', 96, 112, function (c, w, h) {
  srnd(90);
  var body = new Path2D();
  body.moveTo(16, 10); body.lineTo(80, 10);
  body.bezierCurveTo(94, 16, 96, 60, 92, 106);
  body.lineTo(4, 106);
  body.bezierCurveTo(0, 60, 2, 16, 16, 10);
  body.closePath();
  paper(c, body, JACKET, { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(body); florals(c, w, h, 191); c.restore();
  // Black tee down the open front.
  var tee = new Path2D();
  tee.moveTo(34, 8); tee.lineTo(62, 8); tee.lineTo(60, 106); tee.lineTo(36, 106); tee.closePath();
  paper(c, tee, '#1c1c1e', { w: w, h: h, lw: 2.2 * PIX });
  // Lapels.
  c.save(); c.strokeStyle = sh(JACKET, -0.35); c.lineWidth = 2.4 * PIX; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(30, 8); c.lineTo(24, 30); c.lineTo(36, 46); c.stroke();
  c.beginPath(); c.moveTo(66, 8); c.lineTo(72, 30); c.lineTo(60, 46); c.stroke();
  c.restore();
  paper(c, roundRect(36, 0, 24, 14, 6), SKIN_E, { w: w, h: h, lw: 2 * PIX, shade: false });
  // Wooden bead necklace.
  for (var i = 0; i <= 10; i++) {
    var t = i / 10, a = Math.PI * (0.1 + 0.8 * t);
    paper(c, ellipsePath(48 - Math.cos(a) * 16, 10 + Math.sin(a) * 26, 2.8, 2.8, 0),
      i % 3 === 0 ? '#3a2a1e' : '#a77a4a', { w: w, h: h, lw: 1 * PIX, shade: false });
  }
  grain(c, w, h, 0.03);
});

def('dj_arm', 30, 60, function (c, w, h) {
  var p = roundRect(4, 3, 22, 54, 9);
  paper(c, p, JACKET, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(p); florals(c, w, h, 192, 0.9); c.restore();
});
def('dj_forearm', 28, 58, function (c, w, h) {
  var p = roundRect(4, 2, 20, 32, 8);
  paper(c, p, JACKET, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(p); florals(c, w, h, 193, 0.9); c.restore();
  limbRect(c, w, h, SKIN_E, 6, 30, 16, 12, 6);
  hand(c, w, h, SKIN_E);
});

// ---- the set -------------------------------------------------------------------
def('dj_booth', 300, 170, function (c, w, h) {
  srnd(91);
  // decks and mixer on top
  paper(c, roundRect(16, 6, 92, 26, 5), '#2b2e33', { w: w, h: h, lw: 2.2 * PIX });
  paper(c, roundRect(192, 6, 92, 26, 5), '#2b2e33', { w: w, h: h, lw: 2.2 * PIX });
  paper(c, roundRect(118, 2, 64, 30, 4), '#1d1f23', { w: w, h: h, lw: 2.2 * PIX });
  [62, 238].forEach(function (x) {
    paper(c, ellipsePath(x, 16, 30, 7, 0), '#141518', { w: w, h: h, lw: 1.6 * PIX, shade: false });
    c.fillStyle = P.bluLt; c.fill(ellipsePath(x, 16, 4, 2, 0));
  });
  c.fillStyle = '#ff4fb0'; for (var k = 0; k < 6; k++) c.fillRect(126 + k * 9, 10, 4, 14 - (k % 3) * 4);
  // the booth front
  var front = roundRect(4, 30, w - 8, h - 34, 6);
  paper(c, front, '#16171b', { w: w, h: h, lw: 3 * PIX });
  c.save(); c.clip(front);
  var g = c.createLinearGradient(0, 30, 0, h);
  g.addColorStop(0, 'rgba(47,123,255,0.35)'); g.addColorStop(1, 'rgba(47,123,255,0)');
  c.fillStyle = g; c.fillRect(0, 30, w, h);
  c.restore();
  // LED strip
  c.fillStyle = P.bluLt; c.fillRect(10, 36, w - 20, 4);
  // logo roundel
  paper(c, ellipsePath(w / 2, 100, 40, 40, 0), '#0e1a33', { w: w, h: h, lw: 2.4 * PIX, inkCol: P.blu, shade: false });
  c.fillStyle = '#ffffff'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('B3', w / 2, 101);
});

def('dj_banner', 340, 64, function (c, w, h) {
  paper(c, roundRect(4, 4, w - 8, h - 8, 8), '#0b0f1c', { w: w, h: h, lw: 3 * PIX, inkCol: P.blu, shade: false });
  c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  // neon: a soft halo under a hot core
  c.fillStyle = 'rgba(47,123,255,0.45)';
  [-2, 2].forEach(function (d) { c.fillText('DJ BENNY BLU3', w / 2 + d, h / 2 + 2); });
  c.fillStyle = '#cfe4ff';
  c.fillText('DJ BENNY BLU3', w / 2, h / 2 + 1);
});

def('speaker', 110, 190, function (c, w, h) {
  srnd(92);
  paper(c, roundRect(4, 4, w - 8, h - 8, 6), '#1e2024', { w: w, h: h, lw: 3 * PIX });
  [[55, 52, 30], [55, 132, 40]].forEach(function (d) {
    paper(c, ellipsePath(d[0], d[1], d[2], d[2], 0), '#2f3237', { w: w, h: h, lw: 2.4 * PIX, shade: false });
    paper(c, ellipsePath(d[0], d[1], d[2] * 0.55, d[2] * 0.55, 0), '#15161a', { w: w, h: h, lw: 2 * PIX });
    c.fillStyle = '#3d4148'; c.fill(ellipsePath(d[0], d[1], d[2] * 0.18, d[2] * 0.18, 0));
  });
});

def('lantern', 64, 84, function (c, w, h) {
  // A paper jack-o'-lantern, the kind that lasts one party.
  c.save(); c.strokeStyle = '#2a2a2a'; c.lineWidth = 2 * PIX;
  c.beginPath(); c.moveTo(32, 0); c.lineTo(32, 10); c.stroke(); c.restore();
  paper(c, ellipsePath(32, 46, 28, 32, 0), '#ff8a1f', { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.strokeStyle = 'rgba(160,70,10,0.5)'; c.lineWidth = 1.6 * PIX;
  [24, 34, 44, 54, 64].forEach(function (y) { c.beginPath(); c.moveTo(6, y); c.quadraticCurveTo(32, y + 4, 58, y); c.stroke(); });
  c.restore();
  c.fillStyle = '#fff2a8';
  c.beginPath(); c.moveTo(18, 38); c.lineTo(26, 32); c.lineTo(28, 42); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(46, 38); c.lineTo(38, 32); c.lineTo(36, 42); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(16, 54); c.quadraticCurveTo(32, 66, 48, 54); c.lineTo(42, 58); c.lineTo(32, 56); c.lineTo(22, 58); c.closePath(); c.fill();
  paper(c, roundRect(26, 10, 12, 8, 2), '#3a3a3a', { w: w, h: h, lw: 1.4 * PIX, shade: false });
});

def('party_bulb', 22, 28, function (c, w, h) {
  // White, so the level tints each one its own colour.
  paper(c, roundRect(7, 0, 8, 8, 2), '#444444', { w: w, h: h, lw: 1.2 * PIX, shade: false });
  paper(c, ellipsePath(11, 17, 8, 10, 0), '#ffffff', { w: w, h: h, lw: 1.4 * PIX, inkCol: '#bbbbbb', shade: false });
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill(ellipsePath(9, 14, 2.4, 3.4, 0));
});

def('couch', 250, 120, function (c, w, h) {
  srnd(93);
  var col = '#c9c1b5';
  paper(c, roundRect(14, 6, w - 28, 62, 14), col, { w: w, h: h, lw: 2.8 * PIX });
  paper(c, roundRect(2, 34, 34, 70, 12), sh(col, -0.06), { w: w, h: h, lw: 2.6 * PIX });
  paper(c, roundRect(w - 36, 34, 34, 70, 12), sh(col, -0.06), { w: w, h: h, lw: 2.6 * PIX });
  paper(c, roundRect(30, 56, w - 60, 38, 10), sh(col, 0.08), { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.strokeStyle = sh(col, -0.25); c.lineWidth = 1.6 * PIX;
  c.beginPath(); c.moveTo(w / 2, 58); c.lineTo(w / 2, 92); c.stroke(); c.restore();
  // throw pillows: one says LIVE LAUGH LOVE, you can tell
  paper(c, roundRect(40, 26, 44, 36, 8), '#d97a4a', { w: w, h: h, lw: 2 * PIX });
  paper(c, roundRect(w - 86, 26, 44, 36, 8), '#5d7f8c', { w: w, h: h, lw: 2 * PIX });
  c.fillStyle = '#2a2622'; c.fillRect(30, 94, 10, 22); c.fillRect(w - 40, 94, 10, 22);
  grain(c, w, h, 0.04);
});

def('cauldron', 120, 96, function (c, w, h) {
  paper(c, ellipsePath(60, 56, 54, 36, 0), '#26282c', { w: w, h: h, lw: 3 * PIX });
  paper(c, ellipsePath(60, 24, 52, 12, 0), '#3a3d42', { w: w, h: h, lw: 2.6 * PIX, shade: false });
  // dry-ice fog spilling over the rim
  c.fillStyle = 'rgba(190,255,200,0.55)';
  [[34, 20, 16], [58, 16, 20], [84, 20, 16], [24, 28, 10], [96, 30, 10]].forEach(function (b) { c.fill(ellipsePath(b[0], b[1], b[2], b[2] * 0.6, 0)); });
  c.fillStyle = '#1b1c1f'; c.fillRect(20, 86, 12, 10); c.fillRect(88, 86, 12, 10);
});

def('planter', 240, 80, function (c, w, h) {
  paper(c, roundRect(2, 4, w - 4, h - 6, 4), '#3a3c40', { w: w, h: h, lw: 3 * PIX });
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(8, 10, w - 16, 6);
});

// ---- party food ------------------------------------------------------------------
def('food_pizza', 80, 70, function (c, w, h) {
  var slice = new Path2D();
  slice.moveTo(6, 10); slice.quadraticCurveTo(40, -2, 74, 10); slice.lineTo(42, 66); slice.closePath();
  paper(c, slice, '#f2c75a', { w: w, h: h, lw: 2.6 * PIX });
  paper(c, roundRect(4, 4, 72, 12, 6), '#c98a3e', { w: w, h: h, lw: 2.2 * PIX });
  c.fillStyle = '#c0392b';
  [[30, 26], [48, 28], [40, 42], [26, 18], [56, 18]].forEach(function (p) { c.fill(ellipsePath(p[0], p[1], 5, 5, 0)); });
});

def('food_candy', 80, 44, function (c, w, h) {
  // A fun-size bar in a crackly orange wrapper.
  var wrap = new Path2D();
  wrap.moveTo(4, 10); wrap.lineTo(14, 14); wrap.lineTo(66, 14); wrap.lineTo(76, 10);
  wrap.lineTo(76, 34); wrap.lineTo(66, 30); wrap.lineTo(14, 30); wrap.lineTo(4, 34); wrap.closePath();
  paper(c, wrap, '#ff7a1a', { w: w, h: h, lw: 2.4 * PIX });
  c.fillStyle = '#3a1d0e'; c.fillRect(22, 18, 36, 8);
  c.fillStyle = '#ffd34a'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('BOO!', 40, 22.5);
});
