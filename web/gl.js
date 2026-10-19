// ============================================================================
// WebGL sprite batcher. Rust writes a flat draw list into wasm memory; this
// expands it into vertices and flushes a batch whenever the blend mode changes.
//
// Draw command = 12 floats:
//   0 sprite  1 x  2 y  3 w  4 h  5 rot  6 r  7 g  8 b  9 a  10 flags  11 spare
//   flags: bit0 flipX, bit1 flipY, bits2-3 blend (0 alpha, 1 add, 2 multiply)
// ============================================================================

var CMD_STRIDE = 12;
var MAX_QUADS = 6000;

function createRenderer(canvas) {
  var gl = canvas.getContext('webgl2', { alpha: false, antialias: true, premultipliedAlpha: false })
        || canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL is unavailable');
  var gl2 = (typeof WebGL2RenderingContext !== 'undefined') && (gl instanceof WebGL2RenderingContext);

  var vsSrc =
    'attribute vec2 aPos;\n' +
    'attribute vec2 aUV;\n' +
    'attribute vec4 aCol;\n' +
    'uniform vec2 uView;\n' +
    'varying vec2 vUV;\n' +
    'varying vec4 vCol;\n' +
    'void main() {\n' +
    '  vUV = aUV; vCol = aCol;\n' +
    '  vec2 p = vec2(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0);\n' +
    '  gl_Position = vec4(p, 0.0, 1.0);\n' +
    '}';

  var fsSrc =
    'precision mediump float;\n' +
    'uniform sampler2D uTex;\n' +
    'varying vec2 vUV;\n' +
    'varying vec4 vCol;\n' +
    'void main() {\n' +
    '  vec4 t = texture2D(uTex, vUV);\n' +
    '  gl_FragColor = t * vCol;\n' +
    '  if (gl_FragColor.a < 0.004) discard;\n' +
    '}';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  var aPos = gl.getAttribLocation(prog, 'aPos');
  var aUV = gl.getAttribLocation(prog, 'aUV');
  var aCol = gl.getAttribLocation(prog, 'aCol');
  var uView = gl.getUniformLocation(prog, 'uView');
  var uTex = gl.getUniformLocation(prog, 'uTex');

  var FLOATS_PER_VERT = 8;
  var verts = new Float32Array(MAX_QUADS * 6 * FLOATS_PER_VERT);
  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);

  var stride = FLOATS_PER_VERT * 4;
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aUV);  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
  gl.enableVertexAttribArray(aCol); gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, stride, 16);

  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);

  // Mobile browsers drop the GL context when the tab is backgrounded. Without
  // this the canvas comes back permanently blank.
  canvas.addEventListener('webglcontextlost', function (e) {
    // Preventing the default is what makes a restore possible at all.
    e.preventDefault();
  }, false);
  canvas.addEventListener('webglcontextrestored', function () {
    window.location.reload();
  }, false);

  // ---- atlas texture ------------------------------------------------------
  // Never ask for a texture the device cannot hold. Every WebGL device
  // supports at least 2048; the atlas is built to fit inside whatever is.
  var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  var atlas = buildAtlas(Math.min(4096, maxTex));
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  if (gl2) {
    var ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  }
  gl.uniform1i(uTex, 0);

  var uvs = atlas.uvs;

  function setBlend(mode) {
    if (mode === 1) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);                      // additive
    else if (mode === 2) gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA); // multiply
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);                 // normal
  }

  var vi = 0, quads = 0, curBlend = -1;

  function flush() {
    if (quads === 0) return;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts.subarray(0, vi));
    gl.drawArrays(gl.TRIANGLES, 0, quads * 6);
    vi = 0; quads = 0;
  }

  function push(x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1, r, g, b, a) {
    var V = verts, i = vi;
    // tri 1
    V[i++] = x0; V[i++] = y0; V[i++] = u0; V[i++] = v0; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    V[i++] = x1; V[i++] = y1; V[i++] = u1; V[i++] = v0; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    V[i++] = x2; V[i++] = y2; V[i++] = u1; V[i++] = v1; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    // tri 2
    V[i++] = x0; V[i++] = y0; V[i++] = u0; V[i++] = v0; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    V[i++] = x2; V[i++] = y2; V[i++] = u1; V[i++] = v1; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    V[i++] = x3; V[i++] = y3; V[i++] = u0; V[i++] = v1; V[i++] = r; V[i++] = g; V[i++] = b; V[i++] = a;
    vi = i; quads++;
  }

  // ---- main entry: consume the Rust draw list ------------------------------
  function render(cmds, count, viewW, viewH, clear) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(clear[0], clear[1], clear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uView, viewW, viewH);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    curBlend = -1;
    for (var n = 0; n < count; n++) {
      var o = n * CMD_STRIDE;
      var id = cmds[o] | 0;
      var cx = cmds[o + 1], cy = cmds[o + 2];
      var hw = cmds[o + 3] * 0.5, hh = cmds[o + 4] * 0.5;
      var rot = cmds[o + 5];
      var r = cmds[o + 6], g = cmds[o + 7], b = cmds[o + 8], a = cmds[o + 9];
      var flags = cmds[o + 10] | 0;
      var blend = (flags >> 2) & 3;

      if (blend !== curBlend) { flush(); setBlend(blend); curBlend = blend; }
      if (quads >= MAX_QUADS) flush();

      var uo = id * 4;
      var u0 = uvs[uo], v0 = uvs[uo + 1], u1 = u0 + uvs[uo + 2], v1 = v0 + uvs[uo + 3];
      if (flags & 1) { var t = u0; u0 = u1; u1 = t; }
      if (flags & 2) { var t2 = v0; v0 = v1; v1 = t2; }

      if (rot === 0) {
        var l = cx - hw, rr = cx + hw, tp = cy - hh, bt = cy + hh;
        push(l, tp, rr, tp, rr, bt, l, bt, u0, v0, u1, v1, r, g, b, a);
      } else {
        // Rotate the half-extents into screen space. Both components of the
        // vertical axis must be negated: getting this wrong flips every
        // rotated sprite upside down while leaving rot==0 sprites correct.
        var co = Math.cos(rot), si = Math.sin(rot);
        var xw = co * hw, yw = si * hw, xh = si * hh, yh = -co * hh;
        push(
          cx - xw + xh, cy - yw + yh,
          cx + xw + xh, cy + yw + yh,
          cx + xw - xh, cy + yw - yh,
          cx - xw - xh, cy - yw - yh,
          u0, v0, u1, v1, r, g, b, a
        );
      }
    }
    flush();
  }

  return { gl: gl, render: render, atlas: atlas };
}
