// ============================================================================
// Will's Backyard -- sprite atlas authoring
// Every sprite is drawn synchronously with Canvas2D into one texture atlas.
// Style target: Paper Mario (Switch) -- flat cut-out shapes, inked edges,
// one soft gradient for form, a crease highlight, warm paper grain.
// ============================================================================

// Path2D.roundRect landed in Safari 16.4. Without this the whole atlas throws
// on older iOS and the game never starts.
(function () {
  function roundRectPoly(x, y, w, h, r) {
    if (typeof r !== 'number') r = (r && r.length) ? r[0] : 0;
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y, x + w, y + r, r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
    return this;
  }
  if (typeof Path2D !== 'undefined' && !Path2D.prototype.roundRect) {
    Path2D.prototype.roundRect = roundRectPoly;
  }
  if (typeof CanvasRenderingContext2D !== 'undefined' &&
      !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = roundRectPoly;
  }
})();

var ART = {};           // name -> {w, h, draw}  (insertion order == sprite id)

var PIX = 2;            // authoring supersample
var INK = 0.42;         // how much darker an outline is than its fill

// ---- color utils -----------------------------------------------------------
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgb2hex(r, g, b) {
  var f = function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); };
  return '#' + f(r) + f(g) + f(b);
}
// amt < 0 darkens toward ink; amt > 0 lifts toward paper white
function sh(col, amt) {
  var c = hex2rgb(col), r = c[0], g = c[1], b = c[2];
  if (amt < 0) { var t = -amt; return rgb2hex(r * (1 - t) + 26 * t, g * (1 - t) + 20 * t, b * (1 - t) + 30 * t); }
  return rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (252 - b) * amt);
}
function rgba(col, a) { var c = hex2rgb(col); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

// ---- palette ---------------------------------------------------------------
var C = {
  // rat
  fur: '#8f8279', furDark: '#6b6058', belly: '#cdc0b0', pink: '#e9a7a8',
  // Will
  skin: '#e7b188', skinSh: '#c8906a', hair: '#4b382c',
  plaid: '#5e8bad', plaidDk: '#3c6382', tee: '#b9c3cb', jeans: '#52708f',
  // Popcorn
  coat: '#f7f3ec', coatSh: '#ded5c6', brindle: '#a2866b', brindleDk: '#75604a',
  tutu: '#ff92c6', harness: '#6d4a90', leash: '#ff6f5c',
  // world
  grass: '#7cbf42', grassDk: '#58992d', grassLt: '#9ad85c',
  dirt: '#8a6b4a', dirtDk: '#6a5038',
  wood: '#b07a44', woodDk: '#85592e',
  deck: '#8a6243', deckDk: '#63432c',
  siding: '#4d5f6d', sidingDk: '#3a4955', trim: '#eef2f3',
  hedge: '#3f8f3a', hedgeDk: '#2b6b2a', hedgeLt: '#63b355',
  leafA: '#e9a63c', leafB: '#cf6a26', leafC: '#b8402f', leafD: '#f0c84c',
  pumpkin: '#f0881f', pumpkinDk: '#c4650f', stem: '#6f8a3a',
  steel: '#9aa5ad', steelDk: '#5f6a72',
  slide: '#f5cf3b', cheese: '#f7c93f', bacon: '#d9604a', bun: '#e0a85f'
};

// ---- paper-cutout primitives ----------------------------------------------
// Fill a path, ink its edge, pool a soft form-shadow, keep the light upper-left.
function paper(c, path, fill, o) {
  o = o || {};
  var w = o.w || 100, h = o.h || 100;
  c.save();
  c.fillStyle = fill;
  c.fill(path);
  if (o.shade !== false) {
    var g = c.createLinearGradient(0, 0, w * 0.55, h);
    g.addColorStop(0.0, rgba(sh(fill, 0.34), 0.55));
    g.addColorStop(0.42, 'rgba(255,255,255,0)');
    g.addColorStop(1.0, rgba(sh(fill, -0.38), 0.50));
    c.save(); c.clip(path); c.fillStyle = g; c.fillRect(0, 0, w, h); c.restore();
  }
  if (o.ink !== false) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = o.inkCol || sh(fill, -INK);
    c.lineWidth = o.lw != null ? o.lw : 3.2 * PIX;
    c.stroke(path);
  }
  c.restore();
}

// A thin bright line suggesting a fold in the paper.
function crease(c, d, col, lw, alpha) {
  c.save();
  c.strokeStyle = rgba(col || '#ffffff', alpha != null ? alpha : 0.33);
  c.lineWidth = (lw || 2) * PIX; c.lineCap = 'round';
  c.stroke(new Path2D(d));
  c.restore();
}

// Deterministic noise -- the atlas must be byte-identical between loads.
var _seed = 0x2f6e2b1;
function rnd() { _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; _seed |= 0; return ((_seed >>> 0) % 100000) / 100000; }
function srnd(s) { _seed = (s | 0) || 1; }

// Faint fibrous grain so flat fills read as paper, not plastic.
function grain(c, w, h, amount) {
  var a = amount != null ? amount : 0.05;
  c.save();
  c.globalCompositeOperation = 'overlay';
  var n = w * h * 0.016;
  for (var i = 0; i < n; i++) {
    var x = rnd() * w, y = rnd() * h, l = 1 + rnd() * 3 * PIX;
    c.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(60,40,20,' + a + ')';
    c.lineWidth = PIX * 0.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + l * 0.3); c.stroke();
  }
  c.restore();
}

function ellipsePath(x, y, rx, ry, rot) {
  var p = new Path2D();
  p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  return p;
}
function roundRect(x, y, w, h, r) { var p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }

// Wood grain used by the deck, the hutch and the playhouse.
function woodGrain(c, w, h, base, seed, vertical) {
  srnd(seed);
  c.save();
  c.globalAlpha = 0.5;
  c.strokeStyle = sh(base, -0.3);
  c.lineWidth = 1.4 * PIX; c.lineCap = 'round';
  var n = vertical ? Math.max(2, w / 9) : Math.max(2, h / 9);
  for (var i = 0; i < n; i++) {
    var t = (i + 0.5) / n;
    c.globalAlpha = 0.16 + rnd() * 0.24;
    c.beginPath();
    if (vertical) {
      var x = t * w + (rnd() - 0.5) * 4;
      c.moveTo(x, 0); c.bezierCurveTo(x + 3, h * 0.33, x - 3, h * 0.66, x + 1, h);
    } else {
      var y = t * h + (rnd() - 0.5) * 4;
      c.moveTo(0, y); c.bezierCurveTo(w * 0.33, y + 3, w * 0.66, y - 3, w, y + 1);
    }
    c.stroke();
  }
  // a couple of knots
  c.globalAlpha = 0.3;
  for (var k = 0; k < 2; k++) {
    var kx = rnd() * w, ky = rnd() * h, kr = 2 + rnd() * 3;
    c.lineWidth = 1.2 * PIX;
    c.beginPath(); c.ellipse(kx, ky, kr * 2.2, kr, rnd(), 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(kx, ky, kr, kr * 0.5, rnd(), 0, Math.PI * 2); c.stroke();
  }
  c.restore();
}

// Registers a sprite. w/h are authoring pixels (already supersampled).
function def(name, w, h, draw) { ART[name] = { w: Math.round(w), h: Math.round(h), draw: draw }; }
