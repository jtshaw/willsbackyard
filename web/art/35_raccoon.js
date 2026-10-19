// ============================================================================
// Raccoons -- the ambushers on the last level, built after Jimmothy.
//
// The proportions ARE the joke: an enormous round boulder of fur, a small head
// carried low and pushed forward, and four spindly dark legs that look wholly
// inadequate for the job. The tail is a short stub, not the long ringed plume
// raccoons are usually drawn with.
//
// Authored FACING RIGHT. Limbs and tail hang DOWNWARD from a joint on their
// top edge, so the rig only ever applies gentle rotations.
// ============================================================================

var RC = {
  fur: '#9a9792',        // silver-grey guard hair
  furLt: '#c3c0ba',
  furDk: '#55524e',
  belly: '#7e7b77',
  leg: '#3f3d3a',        // legs go almost black toward the feet
  mask: '#2b2825',
  muzzle: '#d9d4ca',
  ear: '#a8a39d',
  tailTip: '#9c7f5c',    // the warm brown stub in the photo
  eye: '#efe3ad'
};

// ---- the boulder -----------------------------------------------------------
def('rac_body', 196, 166, function (c, w, h) {
  srnd(61);

  // One big dome: high rounded back, deep sides, belly close to the ground.
  var p = new Path2D();
  p.moveTo(14, 104);
  p.bezierCurveTo(6, 64, 30, 24, 76, 14);        // haunch sweeping up
  p.bezierCurveTo(122, 4, 164, 24, 178, 62);     // over the top of the dome
  p.bezierCurveTo(190, 92, 184, 118, 168, 132);  // down the shoulder
  p.bezierCurveTo(150, 146, 118, 150, 90, 146);
  p.bezierCurveTo(56, 150, 24, 136, 14, 104);
  p.closePath();
  paper(c, p, RC.fur, { w: w, h: h, lw: 3.2 * PIX });

  c.save();
  c.clip(p);
  // Lighter along the top of the dome, darker underneath.
  var g = c.createLinearGradient(0, 6, 0, h);
  g.addColorStop(0, rgba(RC.furLt, 0.8));
  g.addColorStop(0.42, 'rgba(255,255,255,0)');
  g.addColorStop(1, rgba(RC.furDk, 0.78));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // Dark saddle smeared across the shoulders.
  c.fillStyle = rgba(RC.furDk, 0.3);
  c.fill(ellipsePath(120, 56, 56, 34, -0.2));
  c.restore();

  // Spiky guard hairs breaking the top silhouette -- the coat reads coarse.
  c.save();
  c.strokeStyle = RC.fur; c.lineWidth = 2.6 * PIX; c.lineCap = 'round';
  for (var i = 0; i < 34; i++) {
    var t = i / 33;
    var ax = 20 + t * 158;
    // Follow the dome's top edge.
    var ay = 104 - Math.sin(t * Math.PI) * 92 + rnd() * 6;
    var len = 7 + rnd() * 11;
    var dir = -0.9 - t * 0.9 + (rnd() - 0.5) * 0.5;
    c.strokeStyle = rnd() > 0.5 ? RC.furLt : RC.furDk;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(ax + Math.cos(dir) * len, ay + Math.sin(dir) * len);
    c.stroke();
  }
  c.restore();
  grain(c, w, h, 0.05);
});

// ---- the small, low-slung head ---------------------------------------------
function raccoonHead(c, w, h, snarl) {
  srnd(62);

  // Short wedge: rounded skull, muzzle angled DOWN and forward.
  var skull = new Path2D();
  skull.moveTo(10, 36);
  skull.bezierCurveTo(8, 18, 24, 6, 44, 6);       // top of the skull
  skull.bezierCurveTo(62, 6, 72, 16, 76, 30);     // brow
  skull.bezierCurveTo(88, 38, 96, 50, 94, 60);    // muzzle, angling down
  skull.bezierCurveTo(92, 70, 80, 74, 70, 70);
  if (snarl) {
    skull.bezierCurveTo(58, 72, 34, 70, 20, 60);
  } else {
    skull.bezierCurveTo(56, 76, 32, 74, 18, 62);
  }
  skull.bezierCurveTo(11, 54, 10, 44, 10, 36);
  skull.closePath();
  paper(c, skull, RC.fur, { w: w, h: h, lw: 2.6 * PIX });

  c.save();
  c.clip(skull);
  // Pale brow stripe up the middle of the forehead.
  c.fillStyle = rgba(RC.muzzle, 0.8);
  c.fill(ellipsePath(42, 15, 20, 10, -0.12));
  // The mask: a dark band over the eyes, wider at the cheek.
  var mask = new Path2D();
  mask.moveTo(14, 32);
  mask.bezierCurveTo(26, 24, 48, 24, 62, 30);
  mask.bezierCurveTo(72, 34, 78, 40, 79, 46);
  mask.bezierCurveTo(64, 54, 44, 56, 30, 52);
  mask.bezierCurveTo(18, 48, 14, 40, 14, 32);
  mask.closePath();
  c.fillStyle = RC.mask; c.fill(mask);
  c.strokeStyle = rgba(RC.mask, 0.4); c.lineWidth = 3.4 * PIX; c.stroke(mask);
  // Pale muzzle below it.
  c.fillStyle = rgba(RC.muzzle, 0.95);
  c.fill(ellipsePath(78, 58, 18, 11, -0.2));
  c.restore();

  // Small round ears, set back and low -- they almost vanish into the fur.
  paper(c, ellipsePath(24, 10, 12, 11, -0.2), RC.ear, { w: w, h: h, lw: 2.2 * PIX });
  paper(c, ellipsePath(24, 12, 6, 5.5, -0.2), '#bdb0a8', { w: w, h: h, lw: 1.5 * PIX, shade: false });
  paper(c, ellipsePath(58, 8, 11, 10, 0.15), RC.ear, { w: w, h: h, lw: 2.2 * PIX });
  paper(c, ellipsePath(58, 10, 5.5, 5, 0.15), '#bdb0a8', { w: w, h: h, lw: 1.5 * PIX, shade: false });

  // Nose, at the low tip of the muzzle.
  c.fillStyle = '#211d1b';
  c.fill(ellipsePath(91, 56, 6.5, 5, -0.3));
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fill(ellipsePath(89, 54, 2, 1.4, -0.3));

  // Eyes inside the mask -- pale, so they read against the black.
  function eye(x, y, r) {
    c.fillStyle = RC.eye; c.fill(ellipsePath(x, y, r, r * 0.9, 0));
    c.fillStyle = '#17120e'; c.fill(ellipsePath(x + 0.8, y, r * 0.44, r * 0.54, 0));
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill(ellipsePath(x - r * 0.32, y - r * 0.34, r * 0.2, r * 0.2, 0));
  }
  eye(36, 37, 7);
  eye(62, 40, 6.6);

  if (snarl) {
    var mouth = new Path2D();
    mouth.moveTo(60, 68); mouth.bezierCurveTo(76, 70, 86, 78, 80, 88);
    mouth.bezierCurveTo(68, 94, 54, 84, 54, 74);
    mouth.closePath();
    c.fillStyle = '#6d2f2c'; c.fill(mouth);
    c.strokeStyle = sh(RC.fur, -0.42); c.lineWidth = 2.2 * PIX; c.stroke(mouth);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(60, 69); c.lineTo(64, 77); c.lineTo(68, 69); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(71, 71); c.lineTo(74, 78); c.lineTo(77, 72); c.closePath(); c.fill();
    c.fillStyle = '#e88f94'; c.fill(ellipsePath(68, 86, 7, 3.4, 0.2));
  } else {
    c.save();
    c.strokeStyle = 'rgba(60,52,46,0.75)'; c.lineWidth = 1.8 * PIX; c.lineCap = 'round';
    c.beginPath(); c.moveTo(87, 62); c.quadraticCurveTo(76, 67, 68, 65); c.stroke();
    c.restore();
  }

  c.save();
  c.strokeStyle = 'rgba(245,240,232,0.5)'; c.lineWidth = 1.4 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(86, 60); c.quadraticCurveTo(100, 56, 110, 50);
  c.moveTo(86, 63); c.quadraticCurveTo(102, 64, 112, 62);
  c.stroke();
  c.restore();
  grain(c, w, h, 0.03);
}

def('rac_head', 108, 86, function (c, w, h) { raccoonHead(c, w, h, false); });
def('rac_head_snarl', 108, 96, function (c, w, h) { raccoonHead(c, w, h, true); });

// ---- the stub tail ---------------------------------------------------------
// Short and thick, carried low, with the warm brown tip from the photo.
def('rac_tail', 96, 66, function (c, w, h) {
  srnd(63);
  var p = new Path2D();
  p.moveTo(8, 24);
  p.bezierCurveTo(26, 14, 52, 12, 70, 20);
  p.bezierCurveTo(88, 28, 90, 46, 74, 54);
  p.bezierCurveTo(52, 62, 22, 56, 8, 44);
  p.closePath();
  paper(c, p, RC.fur, { w: w, h: h, lw: 2.8 * PIX });
  c.save();
  c.clip(p);
  // Two soft dark bands, then the brown tip.
  c.fillStyle = rgba(RC.furDk, 0.6);
  c.fill(ellipsePath(34, 36, 10, 24, -0.12));
  c.fillStyle = rgba(RC.furDk, 0.5);
  c.fill(ellipsePath(56, 34, 9, 22, -0.1));
  c.fillStyle = rgba(RC.tailTip, 0.95);
  c.fill(ellipsePath(80, 36, 16, 20, -0.08));
  c.restore();
  // Coarse hair along the underside.
  c.save();
  c.strokeStyle = rgba(RC.furLt, 0.5); c.lineWidth = 2 * PIX; c.lineCap = 'round';
  for (var i = 0; i < 9; i++) {
    var x = 14 + i * 8;
    c.beginPath(); c.moveTo(x, 50); c.lineTo(x - 3, 60); c.stroke();
  }
  c.restore();
});

// ---- the famously inadequate legs ------------------------------------------
// Thin, straight, and almost black from the hock down.
def('rac_leg_front', 30, 96, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(10, 2); p.lineTo(21, 2);
  p.bezierCurveTo(23, 26, 21, 52, 20, 74);
  p.lineTo(10, 74);
  p.bezierCurveTo(9, 52, 7, 26, 10, 2);
  p.closePath();
  var g = c.createLinearGradient(0, 0, 0, 74);
  c.save();
  paper(c, p, RC.leg, { w: w, h: h, lw: 2.2 * PIX });
  c.clip(p);
  g.addColorStop(0, rgba(RC.fur, 0.85));   // fur at the top, bare and dark below
  g.addColorStop(0.45, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  // Long-fingered hand.
  paper(c, roundRect(5, 72, 21, 10, 5), RC.leg, { w: w, h: h, lw: 2 * PIX, shade: false });
  c.save();
  c.strokeStyle = RC.leg; c.lineWidth = 2.8 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(9, 80); c.lineTo(6, 92);
  c.moveTo(14, 81); c.lineTo(13, 94);
  c.moveTo(19, 81); c.lineTo(20, 94);
  c.moveTo(23, 80); c.lineTo(26, 92);
  c.stroke();
  c.restore();
});

def('rac_leg_back', 38, 102, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(11, 2);
  p.bezierCurveTo(30, 5, 33, 22, 27, 38);        // a little thigh, then thin
  p.bezierCurveTo(24, 50, 23, 62, 23, 78);
  p.lineTo(12, 78);
  p.bezierCurveTo(12, 62, 13, 50, 11, 38);
  p.bezierCurveTo(6, 24, 5, 8, 11, 2);
  p.closePath();
  c.save();
  paper(c, p, RC.leg, { w: w, h: h, lw: 2.2 * PIX });
  c.clip(p);
  var g = c.createLinearGradient(0, 0, 0, 72);
  g.addColorStop(0, rgba(RC.fur, 0.9));
  g.addColorStop(0.42, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  paper(c, roundRect(7, 76, 23, 10, 5), RC.leg, { w: w, h: h, lw: 2 * PIX, shade: false });
  c.save();
  c.strokeStyle = RC.leg; c.lineWidth = 2.8 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(11, 84); c.lineTo(9, 97);
  c.moveTo(17, 85); c.lineTo(16, 99);
  c.moveTo(23, 85); c.lineTo(24, 99);
  c.moveTo(28, 84); c.lineTo(31, 97);
  c.stroke();
  c.restore();
});

// Eyeshine: the pair of discs that give them away before anything else does.
def('rac_eyeshine', 96, 48, function (c, w, h) {
  for (var i = 0; i < 2; i++) {
    var x = 32 + i * 32;
    var g = c.createRadialGradient(x, 24, 1, x, 24, 22);
    g.addColorStop(0, 'rgba(255,252,210,1)');
    g.addColorStop(0.3, 'rgba(240,226,120,0.55)');
    g.addColorStop(1, 'rgba(230,210,90,0)');
    c.fillStyle = g;
    c.fillRect(x - 24, 0, 48, h);
  }
});
