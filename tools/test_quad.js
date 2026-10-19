#!/usr/bin/env node
// Drives the real web/gl.js through a stub WebGL context and inspects the
// vertices it emits.
//
// The bug this exists to catch: gl.js has two paths for building a quad, one
// for rot === 0 and one for everything else. A sign error in the rotated path
// flipped every rotated sprite upside down while leaving static sprites
// correct -- invisible in a still of a mostly-static scene.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, Path2D } = require('@napi-rs/canvas');

const root = path.join(__dirname, '..');
let failures = 0;
const fail = (m) => { console.error('  ✗ ' + m); failures++; };
const ok = (m) => console.log('  ✓ ' + m);

// ---- a GL context that records what gets drawn -----------------------------
let captured = null;
function stubGL() {
  const target = {
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    getExtension: () => null,
    getParameter: () => 4096,
    bufferSubData: (_t, _o, data) => { captured = Float32Array.from(data); },
    drawArrays: () => {}
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      // Everything else: a no-op function, and constants read as small ints.
      return typeof prop === 'string' && prop === prop.toUpperCase() ? 1 : () => 1;
    }
  });
}

function load() {
  const sandbox = {
    Path2D, Math, console, parseInt,
    WebGL2RenderingContext: function () {},
    document: { createElement: () => createCanvas(16, 16) }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of fs.readdirSync(path.join(root, 'web/art')).filter(f => f.endsWith('.js')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(root, 'web/art', f), 'utf8'), sandbox, { filename: f });
  }
  vm.runInContext(fs.readFileSync(path.join(root, 'web/atlas.js'), 'utf8'), sandbox, { filename: 'atlas.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'web/gl.js'), 'utf8'), sandbox, { filename: 'gl.js' });

  const gl = stubGL();
  sandbox.__canvas = {
    width: 100, height: 100,
    getContext: () => gl,
    addEventListener: () => {}
  };
  sandbox.window = { location: { reload: () => {} } };
  return {
    sandbox,
    renderer: vm.runInContext('createRenderer(__canvas)', sandbox)
  };
}

// One draw command -> the four corner positions, in winding order.
function cornersOf(renderer, cmd) {
  const buf = new Float32Array(12);
  buf.set(cmd);
  captured = null;
  renderer.render(buf, 1, 1000, 1000, [0, 0, 0]);
  if (!captured) throw new Error('nothing was drawn');
  const V = captured, S = 8;
  // Triangles are (v0,v1,v2) and (v0,v2,v3); corners are verts 0,1,2,5.
  return [0, 1, 2, 5].map(i => [V[i * S], V[i * S + 1]]);
}

function cmd(rot) {
  //  sprite, x,  y,   w,   h,  rot, r,g,b,a, flags, spare
  return [0, 500, 400, 200, 100, rot, 1, 1, 1, 1, 0, 0];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

(function main() {
  const { renderer } = load();

  // --- 1. The two code paths must agree in the limit ---------------------
  // rot === 0 takes the fast path; a hair above zero takes the rotated path.
  // Any sign error in the rotated path shows up as a large mismatch here.
  const flat = cornersOf(renderer, cmd(0));
  const nudged = cornersOf(renderer, cmd(1e-7));
  let worst = 0;
  for (let i = 0; i < 4; i++) worst = Math.max(worst, dist(flat[i], nudged[i]));
  if (worst > 0.01) {
    fail(`rot=0 and rot=1e-7 disagree by ${worst.toFixed(1)}px -- the rotated ` +
         `quad path is inconsistent with the flat one`);
    console.error('      flat   ', JSON.stringify(flat));
    console.error('      rotated', JSON.stringify(nudged));
  } else {
    ok('flat and rotated quad paths agree at rot -> 0');
  }

  // --- 2. Corners must match an analytic rotation ------------------------
  const rot = 0.7, cx = 500, cy = 400, hw = 100, hh = 50;
  const co = Math.cos(rot), si = Math.sin(rot);
  // Screen space, y down: a corner at local (lx, ly) lands at
  //   (cx + lx*cos - ly*sin, cy + lx*sin + ly*cos)
  const expect = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(
    ([lx, ly]) => [cx + lx * co - ly * si, cy + lx * si + ly * co]
  );
  const got = cornersOf(renderer, cmd(rot));
  let worst2 = 0;
  for (let i = 0; i < 4; i++) worst2 = Math.max(worst2, dist(expect[i], got[i]));
  if (worst2 > 0.01) {
    fail(`rotated corners are ${worst2.toFixed(1)}px from the analytic result`);
    console.error('      expected', JSON.stringify(expect.map(p => p.map(Math.round))));
    console.error('      got     ', JSON.stringify(got.map(p => p.map(Math.round))));
  } else {
    ok('rotated corners match an analytic rotation');
  }

  // --- 3. Winding must stay counter-clockwise (no mirroring) -------------
  // Signed area of the corner polygon; a flip inverts its sign.
  const area = (c) => {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const af = area(flat), ar = area(got);
  if (Math.sign(af) !== Math.sign(ar)) {
    fail(`rotated quad winding is mirrored (flat ${af.toFixed(0)}, rotated ${ar.toFixed(0)})`);
  } else {
    ok('rotated quads keep the same winding as flat ones');
  }

  // --- 4. Flip flags affect UVs only, never geometry ---------------------
  const plain = cornersOf(renderer, cmd(0.4));
  const fx = [...cmd(0.4)]; fx[10] = 1;            // FLIP_X
  const fy = [...cmd(0.4)]; fy[10] = 2;            // FLIP_Y
  const cfx = cornersOf(renderer, fx);
  const cfy = cornersOf(renderer, fy);
  let moved = 0;
  for (let i = 0; i < 4; i++) {
    moved = Math.max(moved, dist(plain[i], cfx[i]), dist(plain[i], cfy[i]));
  }
  if (moved > 0.01) fail('flip flags moved the quad geometry; they must only swap UVs');
  else ok('flip flags leave geometry untouched');

  console.log('');
  if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
  console.log('quad math OK');
})();
