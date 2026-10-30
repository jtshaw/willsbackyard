#!/usr/bin/env node
// Offline renderer: runs the real wasm core and draws its real draw list with
// a headless Canvas2D, so frames can be eyeballed without a browser.
//
//   node tools/render.js atlas          -> build/atlas.png
//   node tools/render.js shots          -> build/shot_*.png
//   node tools/render.js repro <level> <x> <y> [frames] [input] [ir]
//                                       -> build/repro.png, from a bug report's
//                                          "Game details" block

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas, Path2D, GlobalFonts } = require('@napi-rs/canvas');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'build');
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// Load the art modules in a sandbox that looks enough like a browser.
// ---------------------------------------------------------------------------
function loadArt() {
  const sandbox = {
    Path2D,
    Math,
    console,
    parseInt,
    document: {
      createElement(tag) {
        if (tag !== 'canvas') throw new Error('unexpected element ' + tag);
        return createCanvas(8, 8);
      }
    }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const artDir = path.join(root, 'web/art');
  const files = fs.readdirSync(artDir).filter(f => f.endsWith('.js')).sort();
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(artDir, f), 'utf8'), sandbox, { filename: f });
  }
  // The atlas packer needs a real canvas, which the shim above provides.
  vm.runInContext(fs.readFileSync(path.join(root, 'web/atlas.js'), 'utf8'), sandbox, { filename: 'atlas.js' });

  // createCanvas(8,8) is a stub; give buildAtlas a resizable one.
  sandbox.document.createElement = () => createCanvas(16, 16);
  const atlas = vm.runInContext('buildAtlas()', sandbox);
  return { atlas, names: vm.runInContext('Object.keys(ART)', sandbox) };
}

// ---------------------------------------------------------------------------
// Tint cache -- Canvas2D has no per-draw colour multiply, so bake variants.
// ---------------------------------------------------------------------------
const tintCache = new Map();
function tinted(atlasCanvas, rect, r, g, b) {
  const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * 16);
  const key = `${rect.join(',')}|${q(r)},${q(g)},${q(b)}`;
  let c = tintCache.get(key);
  if (c) return c;
  const [sx, sy, sw, shh] = rect;
  const cv = createCanvas(Math.max(1, Math.ceil(sw)), Math.max(1, Math.ceil(shh)));
  const cx = cv.getContext('2d');
  cx.drawImage(atlasCanvas, sx, sy, sw, shh, 0, 0, cv.width, cv.height);
  if (q(r) !== 16 || q(g) !== 16 || q(b) !== 16) {
    cx.globalCompositeOperation = 'multiply';
    cx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    cx.fillRect(0, 0, cv.width, cv.height);
    // Restore the alpha the multiply just flattened.
    cx.globalCompositeOperation = 'destination-in';
    cx.drawImage(atlasCanvas, sx, sy, sw, shh, 0, 0, cv.width, cv.height);
  }
  tintCache.set(key, cv);
  return cv;
}

const CMD_STRIDE = 12;

function drawList(ctx, cmds, count, atlas, vw, vh, clear) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgb(${Math.round(clear[0] * 255)},${Math.round(clear[1] * 255)},${Math.round(clear[2] * 255)})`;
  ctx.fillRect(0, 0, vw, vh);

  const size = atlas.size;
  for (let n = 0; n < count; n++) {
    const o = n * CMD_STRIDE;
    const id = cmds[o] | 0;
    const x = cmds[o + 1], y = cmds[o + 2];
    const w = cmds[o + 3], h = cmds[o + 4];
    const rot = cmds[o + 5];
    const r = cmds[o + 6], g = cmds[o + 7], b = cmds[o + 8], a = cmds[o + 9];
    const flags = cmds[o + 10] | 0;
    const blend = (flags >> 2) & 3;
    if (a <= 0.004 || w === 0 || h === 0) continue;

    const uo = id * 4;
    const rect = [
      atlas.uvs[uo] * size, atlas.uvs[uo + 1] * size,
      atlas.uvs[uo + 2] * size, atlas.uvs[uo + 3] * size
    ];
    const src = tinted(atlas.canvas, rect, r, g, b);

    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.globalCompositeOperation = blend === 1 ? 'lighter' : blend === 2 ? 'multiply' : 'source-over';
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale((flags & 1) ? -1 : 1, (flags & 2) ? -1 : 1);
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------

async function main() {
  const mode = process.argv[2] || 'shots';
  const { atlas, names } = loadArt();
  console.log(`atlas ${atlas.size}x${atlas.size}, ${names.length} sprites`);

  if (mode === 'atlas') {
    fs.writeFileSync(path.join(outDir, 'atlas.png'), atlas.canvas.toBuffer('image/png'));
    console.log('wrote build/atlas.png');
    return;
  }

  const wasmBytes = fs.readFileSync(path.join(root, 'rust/target/wasm32-unknown-unknown/release/willsbackyard.wasm'));
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  const w = instance.exports;
  const F32 = () => new Float32Array(w.memory.buffer);

  const VW = 1600, VH = 900;
  const cv = createCanvas(VW, VH);
  const ctx = cv.getContext('2d');

  // Each shot: [label, level, teleport x, y, warm-up frames, input]
  const shots = [
    ['01_lawn_start',     0,  340,    0, 40, 0],
    ['02_lawn_traps',     0, 1250,    0, 30, 2],
    ['03_lawn_dog',       0, 5600,    0, 40, 0],
    ['04_lawn_hedge',     0, 7500,    0, 40, 2],
    ['05_deck_stairs',    1, 1250, -140, 30, 2],
    ['06_deck_table',     1, 3700, -830, 40, 0],
    ['07_deck_grill',     1, 5600, -520, 40, 0],
    ['08_deck_under',     1, 3400,    0, 40, 2],
    ['09_play_house',     2, 2600, -900, 40, 0],
    ['10_play_slide',     2, 1500, -640, 30, 2],
    ['11_play_swings',    2, 4650, -550, 50, 0],
    ['12_play_net',       2, 7300, -600, 40, 4],
    ['13_hutch_bait',     3,  760,    0, 40, 8],
    ['14_hutch_light',    3, 3100,    0, 40, 0],
    ['15_night_deck',     4, 3900, -220, 40, 0],
    ['16_night_dog',      4, 6300,    0, 40, 0],
    ['17_night_IR',       4, 6300,    0, 40, 0, true],
    ['18_hutch_IR',       3, 3100,    0, 40, 0, true],
    ['19_night_IR_deck',  4, 3900, -220, 40, 0, true],
    // Repro of the reported frame: dog + suspicion marker on level 1.
    ['20_repro_marker',   0, 5750,    0, 150, 2],
    // Trash Night: the ambush, in both camera modes.
    ['21_trash_sleep',    6, 2200, -300, 40, 0],
    ['22_trash_ambush',   6,  980,    0, 70, 2],
    ['23_trash_ambush_IR',6,  980,    0, 70, 2, true],
    ['24_trash_gauntlet', 6, 9350,    0, 80, 2, true],
    // Chaos at the Party: the crossing, the bar, the light well, the decks.
    ['25_party_cable',    5, 1500,  -90, 30, 0],
    ['26_party_bar',      5, 3900,    0, 40, 0],
    ['27_party_well',     5, 5600, -200, 40, 0],
    ['28_party_decks',    5, 7250, -500, 40, 0],
    ['29_party_drop',     5, 8300, -150, 560, 0],
    ['30_party_hedge',    5, 9500, -150, 40, 0],
  ];

  if (mode === 'repro') {
    const [lvl, tx, ty, warm = 40, input = 0, ir = 0] = process.argv.slice(3).map(Number);
    if ([lvl, tx, ty].some(Number.isNaN)) {
      console.error('usage: node tools/render.js repro <level> <x> <y> [frames] [input] [ir]');
      process.exit(2);
    }
    shots.length = 0;
    shots.push(['repro', lvl, tx, ty, Math.max(1, warm), input, !!ir]);
  }

  for (const [label, lvl, tx, ty, warm, input, ir] of shots) {
    w.wb_start_level(lvl);
    if (w.wb_set_vision) w.wb_set_vision(ir ? 1 : 0);
    w.wb_tick(1 / 60, 0, VW, VH);
    w.wb_debug_teleport(tx, ty);
    for (let i = 0; i < warm; i++) {
      w.wb_tick(1 / 60, input, VW, VH);
      w.wb_take_events();
    }
    const M = F32();
    const s = M.subarray(w.wb_state_ptr() >> 2, (w.wb_state_ptr() >> 2) + 40);
    const count = w.wb_draw_count();
    const cmds = M.subarray(w.wb_draw_ptr() >> 2, (w.wb_draw_ptr() >> 2) + count * CMD_STRIDE);
    drawList(ctx, cmds, count, atlas, VW, VH, [s[9], s[10], s[11]]);
    const file = label === 'repro' ? 'repro.png' : `shot_${label}.png`;
    fs.writeFileSync(path.join(outDir, file), cv.toBuffer('image/png'));
    console.log(`  ${file}  (${count} quads)  rat at x=${Math.round(s[27])} y=${Math.round(s[28])}`);
  }
  console.log('done');
}

main().catch(e => { console.error(e); process.exit(1); });
