// ============================================================================
// Popcorn -- white hound/pointer with brown brindle patches, long floppy ears,
// a plum harness and her pink tutu, after the reference photo.
//
// Everything is authored FACING RIGHT with canvas y pointing DOWN, so:
//   * the skull sits up-and-left, the muzzle runs down-and-right
//   * ears and legs hang DOWNWARD from a joint on their top edge
// The rig only ever applies small rotations, so nothing can turn over.
// ============================================================================

// ---- the head --------------------------------------------------------------
// Domed skull, clear stop, long tapering muzzle, nose at the far tip.
function houndHead(c, w, h, open) {
  srnd(32);

  var skull = new Path2D();
  skull.moveTo(16, 46);                          // nape, where the neck meets
  skull.bezierCurveTo(10, 22, 30, 8, 54, 8);     // over the top of the skull
  skull.bezierCurveTo(72, 8, 82, 20, 84, 34);    // forehead down to the stop
  skull.bezierCurveTo(100, 36, 116, 42, 126, 50);// bridge of the muzzle
  skull.bezierCurveTo(133, 55, 131, 64, 122, 66);// over the nose leather
  if (open) {
    skull.bezierCurveTo(112, 68, 102, 66, 94, 62);
    skull.bezierCurveTo(84, 62, 70, 60, 58, 58); // upper jaw only
  } else {
    skull.bezierCurveTo(112, 72, 100, 74, 90, 70);// flews hanging below
    skull.bezierCurveTo(76, 80, 54, 80, 38, 72); // chin and jaw
  }
  skull.bezierCurveTo(24, 66, 17, 56, 16, 46);
  skull.closePath();
  paper(c, skull, C.coat, { w: w, h: h, lw: 2.8 * PIX, inkCol: '#9b8e7d' });

  // Brindle mask across the eye and the base of the ear.
  c.save();
  c.clip(skull);
  c.fillStyle = rgba(C.brindle, 0.92);
  c.fill(ellipsePath(40, 32, 24, 19, 0.15));
  c.fillStyle = rgba(C.brindleDk, 0.3);
  c.fill(ellipsePath(36, 30, 14, 11, 0.15));
  // Faint ticking on the muzzle, like the photo.
  c.fillStyle = rgba(C.brindle, 0.35);
  for (var i = 0; i < 7; i++) c.fill(ellipsePath(84 + rnd() * 38, 46 + rnd() * 18, 3, 2.2, rnd()));
  c.restore();

  if (open) {
    // Dropped lower jaw with tongue and a couple of teeth.
    var jaw = new Path2D();
    jaw.moveTo(60, 58);
    jaw.bezierCurveTo(80, 62, 104, 70, 108, 82);
    jaw.bezierCurveTo(98, 92, 70, 84, 58, 70);
    jaw.closePath();
    paper(c, jaw, C.coat, { w: w, h: h, lw: 2.4 * PIX, inkCol: '#9b8e7d', shade: false });
    var mouth = new Path2D();
    mouth.moveTo(64, 60); mouth.bezierCurveTo(84, 66, 101, 73, 103, 80);
    mouth.bezierCurveTo(92, 85, 68, 74, 62, 64);
    mouth.closePath();
    c.fillStyle = '#7a3430'; c.fill(mouth);
    c.fillStyle = '#ef8f98'; c.fill(ellipsePath(88, 75, 11, 5, 0.3));
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(66, 60); c.lineTo(71, 69); c.lineTo(75, 61); c.closePath(); c.fill();
  }

  // Nose: dark leather at the very tip of the muzzle.
  c.fillStyle = '#2b2420';
  c.fill(ellipsePath(122, 56, 9, 7, -0.3));
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fill(ellipsePath(119, 53, 3, 2, -0.3));
  c.save();
  c.strokeStyle = 'rgba(70,56,44,0.7)'; c.lineWidth = 1.8 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(122, 62); c.lineTo(120, 67); c.stroke();   // philtrum
  c.restore();

  // Eye, set in the brindle mask, looking forward.
  c.fillStyle = '#ffffff'; c.fill(ellipsePath(52, 36, 9, 8, 0));
  c.fillStyle = '#4a3324'; c.fill(ellipsePath(55, 36, 6.4, 6.8, 0));
  c.fillStyle = '#17110d'; c.fill(ellipsePath(56, 36, 3.4, 3.6, 0));
  c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill(ellipsePath(53, 33.5, 2.3, 2.3, 0));
  c.save();
  c.strokeStyle = 'rgba(60,46,34,0.55)'; c.lineWidth = 2 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(45, 28); c.quadraticCurveTo(54, 25, 62, 30); c.stroke();
  c.restore();

  if (!open) {
    // The closed mouth line, running back from the nose under the flews.
    c.save();
    c.strokeStyle = 'rgba(95,78,60,0.8)'; c.lineWidth = 2.2 * PIX; c.lineCap = 'round';
    c.beginPath(); c.moveTo(118, 64); c.quadraticCurveTo(102, 71, 88, 69); c.stroke();
    c.restore();
  }
  grain(c, w, h, 0.03);
}

def('pop_head', 142, 88, function (c, w, h) { houndHead(c, w, h, false); });
def('pop_head_bark', 142, 98, function (c, w, h) { houndHead(c, w, h, true); });

// ---- the ear ---------------------------------------------------------------
// Long brown hound ear. Joint is the top edge; it hangs straight down.
def('pop_ear', 52, 96, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(20, 3);
  p.bezierCurveTo(40, 6, 48, 26, 46, 52);        // outer edge, widening low
  p.bezierCurveTo(44, 74, 35, 90, 24, 92);       // rounded tip
  p.bezierCurveTo(13, 90, 7, 72, 6, 48);
  p.bezierCurveTo(5, 25, 11, 6, 20, 3);
  p.closePath();
  paper(c, p, C.brindle, { w: w, h: h, lw: 2.6 * PIX });
  c.save(); c.clip(p);
  // Darker along the trailing edge so it reads as hanging cloth-like.
  var g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, rgba(C.brindleDk, 0.55));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.restore();
  crease(c, 'M 19 12 C 27 34, 28 62, 22 84', '#ffffff', 1.8, 0.2);
});

// ---- the body --------------------------------------------------------------
// Pointer build: deep chest, tucked loin, and the neck built in so the head
// never looks detached.
def('pop_body', 196, 124, function (c, w, h) {
  srnd(31);
  var p = new Path2D();
  p.moveTo(20, 66);                              // over the hind leg
  p.bezierCurveTo(12, 38, 28, 22, 56, 20);       // croup / rump
  p.bezierCurveTo(88, 18, 114, 22, 132, 30);     // level back
  p.bezierCurveTo(142, 18, 154, 8, 168, 7);      // withers up into the neck
  p.bezierCurveTo(182, 6, 190, 15, 187, 27);     // crest of the neck
  p.bezierCurveTo(182, 40, 166, 50, 152, 56);    // throat
  p.bezierCurveTo(158, 74, 154, 94, 142, 104);   // brisket, deep chest
  p.bezierCurveTo(128, 114, 108, 110, 96, 102);  // behind the front leg
  p.bezierCurveTo(74, 112, 42, 106, 28, 90);     // belly, tucked at the loin
  p.bezierCurveTo(20, 82, 19, 73, 20, 66);
  p.closePath();
  paper(c, p, C.coat, { w: w, h: h, lw: 3 * PIX, inkCol: '#9b8e7d' });

  c.save();
  c.clip(p);
  // Brindle patches, hand-placed so she is the same dog every run.
  var spots = [[52, 40, 21, 15, 0.2], [112, 36, 25, 17, -0.12], [146, 76, 15, 12, 0.35], [74, 86, 13, 10, 0.1]];
  for (var i = 0; i < spots.length; i++) {
    var s = spots[i];
    c.fillStyle = rgba(C.brindle, 0.9);
    c.fill(ellipsePath(s[0], s[1], s[2], s[3], s[4]));
    c.fillStyle = rgba(C.brindleDk, 0.3);
    c.fill(ellipsePath(s[0] + 2, s[1] + 3, s[2] * 0.55, s[3] * 0.55, s[4]));
  }
  // Shading under the ribs and along the belly.
  var g = c.createLinearGradient(0, 24, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, rgba(C.coatSh, 0.8));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // A soft line marking the shoulder.
  c.strokeStyle = rgba(C.coatSh, 0.75); c.lineWidth = 2.4 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(140, 44); c.quadraticCurveTo(132, 70, 136, 96); c.stroke();
  c.restore();
  grain(c, w, h, 0.04);
});

// ---- legs ------------------------------------------------------------------
// Both hang from a joint at the top edge, paw at the bottom.
def('pop_leg_front', 36, 92, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(9, 2); p.lineTo(27, 2);
  p.bezierCurveTo(29, 26, 27, 54, 26, 74);       // straight foreleg
  p.lineTo(10, 74);
  p.bezierCurveTo(9, 54, 7, 26, 9, 2);
  p.closePath();
  paper(c, p, C.coat, { w: w, h: h, lw: 2.4 * PIX, inkCol: '#9b8e7d' });
  // Paw at the bottom.
  paper(c, roundRect(5, 72, 27, 17, 8), C.coat, { w: w, h: h, lw: 2.2 * PIX, inkCol: '#9b8e7d', shade: false });
  c.save();
  c.strokeStyle = 'rgba(150,138,122,0.85)'; c.lineWidth = 1.7 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(13, 80); c.lineTo(13, 87);
  c.moveTo(19, 80); c.lineTo(19, 88);
  c.moveTo(25, 80); c.lineTo(25, 87);
  c.stroke(); c.restore();
});

def('pop_leg_back', 52, 96, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(10, 2);
  p.bezierCurveTo(40, 4, 46, 24, 38, 44);        // broad thigh
  p.bezierCurveTo(33, 56, 31, 66, 31, 76);       // hock down to the pastern
  p.lineTo(15, 76);
  p.bezierCurveTo(15, 62, 16, 52, 13, 42);
  p.bezierCurveTo(6, 28, 4, 9, 10, 2);
  p.closePath();
  paper(c, p, C.coat, { w: w, h: h, lw: 2.4 * PIX, inkCol: '#9b8e7d' });
  paper(c, roundRect(10, 74, 27, 17, 8), C.coat, { w: w, h: h, lw: 2.2 * PIX, inkCol: '#9b8e7d', shade: false });
  c.save();
  c.strokeStyle = 'rgba(150,138,122,0.85)'; c.lineWidth = 1.7 * PIX; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(18, 82); c.lineTo(18, 89);
  c.moveTo(24, 82); c.lineTo(24, 90);
  c.moveTo(30, 82); c.lineTo(30, 89);
  c.stroke(); c.restore();
});

// ---- tail ------------------------------------------------------------------
// Carried up and curving, with the white tip from the photo.
def('pop_tail', 96, 56, function (c, w, h) {
  var p = new Path2D();
  p.moveTo(4, 44);
  p.bezierCurveTo(26, 42, 52, 32, 72, 12);
  p.bezierCurveTo(80, 4, 90, 8, 86, 18);
  p.bezierCurveTo(68, 42, 36, 54, 8, 54);
  p.closePath();
  paper(c, p, C.coat, { w: w, h: h, lw: 2.4 * PIX, inkCol: '#9b8e7d' });
  c.save(); c.clip(p);
  c.fillStyle = rgba(C.brindle, 0.8);
  c.fill(ellipsePath(24, 46, 18, 10, -0.2));
  c.restore();
});

// ---- harness ---------------------------------------------------------------
def('pop_harness', 70, 72, function (c, w, h) {
  // Chest strap running down behind the shoulder.
  c.save();
  c.strokeStyle = C.harness; c.lineWidth = 11 * PIX; c.lineCap = 'round';
  c.beginPath(); c.moveTo(34, 20); c.quadraticCurveTo(24, 44, 30, 66); c.stroke();
  c.strokeStyle = sh(C.harness, -0.34); c.lineWidth = 3 * PIX; c.stroke();
  c.restore();
  // Strap over the withers.
  paper(c, roundRect(8, 8, 56, 22, 10), C.harness, { w: w, h: h, lw: 2.4 * PIX });
  // Steel D-ring on top.
  c.save();
  c.strokeStyle = C.steel; c.lineWidth = 3.6 * PIX;
  c.beginPath(); c.arc(36, 14, 7, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = C.steelDk; c.lineWidth = 1.4 * PIX; c.stroke();
  c.restore();
});

// ---- the tutu --------------------------------------------------------------
// Bright pink tulle gathered at the waist and flaring over the hindquarters,
// as in the reference photo. Layered translucent skirts rather than one slab,
// so it reads as netting rather than fabric.
def('pop_tutu', 156, 118, function (c, w, h) {
  srnd(33);

  // Back skirt, darkest and widest.
  var back = new Path2D();
  back.moveTo(30, 34);
  back.bezierCurveTo(60, 14, 104, 16, 132, 36);
  back.bezierCurveTo(146, 56, 142, 86, 124, 100);
  back.bezierCurveTo(96, 114, 54, 112, 30, 96);
  back.bezierCurveTo(14, 80, 14, 50, 30, 34);
  back.closePath();
  c.save();
  c.globalAlpha = 0.75;
  paper(c, back, sh(C.tutu, -0.18), { w: w, h: h, lw: 2.4 * PIX, shade: false });
  c.restore();

  // Front skirt, brighter and slightly smaller.
  var front = new Path2D();
  front.moveTo(38, 40);
  front.bezierCurveTo(64, 24, 100, 26, 122, 44);
  front.bezierCurveTo(134, 62, 130, 84, 114, 96);
  front.bezierCurveTo(90, 106, 56, 104, 38, 90);
  front.bezierCurveTo(26, 76, 26, 54, 38, 40);
  front.closePath();
  paper(c, front, C.tutu, { w: w, h: h, lw: 2.6 * PIX });

  // Vertical gathers radiating from the waistband.
  c.save();
  c.clip(front);
  c.strokeStyle = 'rgba(255,255,255,0.42)';
  c.lineWidth = 2.2 * PIX;
  c.lineCap = 'round';
  for (var i = 0; i < 11; i++) {
    var t = i / 10;
    var x0 = 48 + t * 60;
    var x1 = 34 + t * 92;
    c.beginPath();
    c.moveTo(x0, 34);
    c.quadraticCurveTo(x1 - 4, 68, x1, 102);
    c.stroke();
  }
  // A little depth under the waistband.
  var g = c.createLinearGradient(0, 24, 0, h);
  g.addColorStop(0, rgba(sh(C.tutu, -0.3), 0.55));
  g.addColorStop(0.4, 'rgba(255,255,255,0)');
  g.addColorStop(1, rgba(sh(C.tutu, -0.22), 0.4));
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();

  // Scalloped hem, so the edge reads as netting.
  c.save();
  c.strokeStyle = rgba(sh(C.tutu, 0.4), 0.8);
  c.lineWidth = 2 * PIX;
  c.beginPath();
  for (var k = 0; k < 7; k++) {
    var hx = 40 + k * 13;
    c.moveTo(hx, 96 + (k % 2) * 4);
    c.arc(hx + 6, 96 + (k % 2) * 4, 7, Math.PI, 0, true);
  }
  c.stroke();
  c.restore();

  // Waistband, gathered tight.
  paper(c, roundRect(52, 22, 56, 18, 9), sh(C.tutu, -0.26), { w: w, h: h, lw: 2.2 * PIX, shade: false });
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 1.8 * PIX;
  c.beginPath();
  for (var j = 0; j < 6; j++) { c.moveTo(58 + j * 9, 24); c.lineTo(58 + j * 9, 38); }
  c.stroke();
  c.restore();
});
