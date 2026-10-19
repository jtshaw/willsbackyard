// ============================================================================
// Bakes every ART sprite into one texture atlas at load time.
// Sprite id == insertion order in ART, which is also what Rust was generated
// against -- see tools/gen_sprites.js.
//
// Packing matters here: a naive shelf packer wasted enough space to push the
// atlas to 4096x4096, which is ~85MB of GPU memory with mipmaps and sits right
// on iOS Safari's canvas area limit. MaxRects gets the same sprites into
// 2048x2048, a quarter of the memory, which every WebGL device can hold.
// ============================================================================

function buildAtlas(maxSize) {
  var names = Object.keys(ART);
  var PAD = 4;
  maxSize = maxSize || 4096;

  // ---- MaxRects, best-short-side-fit ---------------------------------------
  function pack(size) {
    var free = [{ x: 0, y: 0, w: size, h: size }];
    var out = new Array(names.length);

    // Largest first: big sprites placed early leave usable gaps behind.
    var order = names.map(function (n, i) { return i; });
    order.sort(function (a, b) {
      var A = ART[names[a]], B = ART[names[b]];
      return Math.max(B.w, B.h) - Math.max(A.w, A.h);
    });

    for (var k = 0; k < order.length; k++) {
      var i = order[k];
      var w = ART[names[i]].w + PAD, h = ART[names[i]].h + PAD;

      // Find the free rect with the tightest short-side leftover.
      var best = -1, bestShort = Infinity, bestLong = Infinity;
      for (var f = 0; f < free.length; f++) {
        var r = free[f];
        if (r.w < w || r.h < h) continue;
        var leftX = r.w - w, leftY = r.h - h;
        var shortSide = Math.min(leftX, leftY), longSide = Math.max(leftX, leftY);
        if (shortSide < bestShort || (shortSide === bestShort && longSide < bestLong)) {
          best = f; bestShort = shortSide; bestLong = longSide;
        }
      }
      if (best < 0) return null;

      var node = { x: free[best].x, y: free[best].y, w: w, h: h };
      out[i] = [node.x, node.y, ART[names[i]].w, ART[names[i]].h];

      // Split every free rect the placement overlaps.
      var next = [];
      for (var g = 0; g < free.length; g++) {
        var fr = free[g];
        if (node.x >= fr.x + fr.w || node.x + node.w <= fr.x ||
            node.y >= fr.y + fr.h || node.y + node.h <= fr.y) {
          next.push(fr);
          continue;
        }
        if (node.x > fr.x) next.push({ x: fr.x, y: fr.y, w: node.x - fr.x, h: fr.h });
        if (node.x + node.w < fr.x + fr.w) {
          next.push({ x: node.x + node.w, y: fr.y, w: fr.x + fr.w - (node.x + node.w), h: fr.h });
        }
        if (node.y > fr.y) next.push({ x: fr.x, y: fr.y, w: fr.w, h: node.y - fr.y });
        if (node.y + node.h < fr.y + fr.h) {
          next.push({ x: fr.x, y: node.y + node.h, w: fr.w, h: fr.y + fr.h - (node.y + node.h) });
        }
      }

      // Drop any free rect fully contained in another -- keeps the list small.
      free = [];
      for (var a = 0; a < next.length; a++) {
        var keep = true;
        for (var b = 0; b < next.length; b++) {
          if (a === b) continue;
          var A = next[a], B = next[b];
          if (A.x >= B.x && A.y >= B.y && A.x + A.w <= B.x + B.w && A.y + A.h <= B.y + B.h) {
            // Identical rects would eliminate each other; keep the first.
            if (A.x === B.x && A.y === B.y && A.w === B.w && A.h === B.h && a > b) { keep = false; break; }
            if (!(A.x === B.x && A.y === B.y && A.w === B.w && A.h === B.h)) { keep = false; break; }
          }
        }
        if (keep && next[a].w > 0 && next[a].h > 0) free.push(next[a]);
      }
    }
    return out;
  }

  var size = 512, placed = null;
  while (size <= maxSize) {
    placed = pack(size);
    if (placed) break;
    size *= 2;
  }
  if (!placed) throw new Error('atlas does not fit in ' + maxSize + 'px');

  var cv = document.createElement('canvas');
  cv.width = cv.height = size;
  var c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;

  for (var i = 0; i < names.length; i++) {
    var s = ART[names[i]], r = placed[i];
    c.save();
    c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip();
    c.translate(r[0], r[1]);
    s.draw(c, s.w, s.h);
    c.restore();
  }

  // uv rects, normalised, plus a half-texel inset to kill atlas bleed
  var uvs = new Float32Array(names.length * 4);
  var sizes = new Float32Array(names.length * 2);
  for (var j = 0; j < names.length; j++) {
    var p = placed[j], e = 0.5 / size;
    uvs[j * 4 + 0] = p[0] / size + e;
    uvs[j * 4 + 1] = p[1] / size + e;
    uvs[j * 4 + 2] = p[2] / size - e * 2;
    uvs[j * 4 + 3] = p[3] / size - e * 2;
    sizes[j * 2 + 0] = p[2];
    sizes[j * 2 + 1] = p[3];
  }

  var index = {};
  for (var m = 0; m < names.length; m++) index[names[m]] = m;
  return { canvas: cv, size: size, uvs: uvs, sizes: sizes, names: names, index: index };
}
