#!/usr/bin/env node
// Drives the wasm core headlessly: every level, thousands of frames, with
// synthetic input. Catches panics, NaNs, runaway draw lists and stuck states.

const fs = require('fs');
const path = require('path');

const wasmPath = path.join(__dirname, '..', 'rust/target/wasm32-unknown-unknown/release/willsbackyard.wasm');
const CMD_STRIDE = 12;

const IN = { LEFT: 1, RIGHT: 2, UP: 4, DOWN: 8, JUMP: 16, SNEAK: 32, ACTION: 64 };
const PHASE = ['TITLE', 'INTRO', 'PLAYING', 'CAUGHT', 'COMPLETE', 'GAMEOVER', 'FINISHED'];

let failures = 0;
function fail(msg) { console.error('  ✗ ' + msg); failures++; }
function ok(msg) { console.log('  ✓ ' + msg); }

(async () => {
  const bytes = fs.readFileSync(wasmPath);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const w = instance.exports;
  const memF32 = () => new Float32Array(w.memory.buffer);

  console.log('exports:', Object.keys(w).join(', '), '\n');

  w.wb_init(12345);
  const levelCount = w.wb_level_count();
  if (levelCount < 1) fail(`no levels reported`);
  else ok(`${levelCount} levels`);

  const VW = 1920, VH = 1080, DT = 1 / 60;

  for (let lvl = 0; lvl < levelCount; lvl++) {
    w.wb_start_level(lvl);

    let maxDraws = 0, minDraws = 1e9;
    let sawPlaying = false, sawComplete = false;
    let badFloat = null, stuckAt = null;
    const phasesSeen = new Set();
    let lastX = null, noMove = 0;

    // A crude bot: hold right, jump often, sneak sometimes, mash action.
    for (let f = 0; f < 5400; f++) {           // 90 seconds
      let input = IN.RIGHT;
      if (f % 37 < 9) input |= IN.JUMP;
      if (f % 211 < 46) input |= IN.SNEAK;
      if (f % 23 === 0) input |= IN.ACTION;
      if (f % 400 > 370) input = IN.LEFT;      // occasional backtrack
      if (f % 97 < 6) input |= IN.UP;          // try ladders

      w.wb_tick(DT, input, VW, VH);
      w.wb_take_events();

      const M = memF32();
      const s = M.subarray(w.wb_state_ptr() >> 2, (w.wb_state_ptr() >> 2) + 32);
      const n = w.wb_draw_count();
      maxDraws = Math.max(maxDraws, n);
      minDraws = Math.min(minDraws, n);

      const phase = s[5] | 0;
      phasesSeen.add(phase);
      if (phase === 2) sawPlaying = true;
      if (phase === 4) sawComplete = true;

      // Scan the state block and a slice of the draw list for NaN/Inf.
      if (badFloat === null) {
        for (let i = 0; i < 28; i++) {
          if (!Number.isFinite(s[i])) { badFloat = `state[${i}] on frame ${f}`; break; }
        }
      }
      if (badFloat === null && f % 60 === 0) {
        const d = M.subarray(w.wb_draw_ptr() >> 2, (w.wb_draw_ptr() >> 2) + n * CMD_STRIDE);
        for (let i = 0; i < d.length; i++) {
          if (!Number.isFinite(d[i])) { badFloat = `draw[${i}] on frame ${f}`; break; }
        }
      }

      // Health should never go negative-unbounded or exceed the cap.
      if (s[0] > 3 || s[0] < -1) stuckAt = stuckAt || `health=${s[0]} at frame ${f}`;

      if (sawComplete) break;
    }

    const M = memF32();
    const s = M.subarray(w.wb_state_ptr() >> 2, (w.wb_state_ptr() >> 2) + 32);
    const names = [...phasesSeen].map(p => PHASE[p]).join(',');

    console.log(`level ${lvl}: draws ${minDraws}..${maxDraws}  phases {${names}}  ` +
                `score=${s[1] | 0} loot=${s[2] | 0}/${s[3] | 0} progress=${(s[8] * 100).toFixed(0)}%`);

    if (badFloat) fail(`level ${lvl}: non-finite ${badFloat}`);
    if (stuckAt) fail(`level ${lvl}: ${stuckAt}`);
    if (!sawPlaying) fail(`level ${lvl}: never reached PLAYING`);
    if (maxDraws === 0) fail(`level ${lvl}: drew nothing`);
    if (maxDraws >= 6000) fail(`level ${lvl}: draw list hit the cap (${maxDraws})`);
    if (minDraws < 5) fail(`level ${lvl}: a frame drew only ${minDraws} quads`);
    if (s[8] < 0.08) fail(`level ${lvl}: bot made almost no progress (${(s[8] * 100).toFixed(0)}%)`);
  }

  // Phase/menu transitions should not wedge the core.
  w.wb_start_level(0);
  for (let i = 0; i < 120; i++) w.wb_tick(DT, 0, VW, VH);
  w.wb_retry();
  for (let i = 0; i < 120; i++) w.wb_tick(DT, IN.RIGHT, VW, VH);
  w.wb_set_phase(0);
  for (let i = 0; i < 60; i++) w.wb_tick(DT, 0, VW, VH);
  ok('retry / set_phase survive');

  // Huge and tiny dt must not tunnel or divide by zero.
  w.wb_start_level(2);
  for (let i = 0; i < 200; i++) w.wb_tick(i % 2 ? 5.0 : 0.0, IN.RIGHT | IN.JUMP, VW, VH);
  const s2 = memF32().subarray(w.wb_state_ptr() >> 2, (w.wb_state_ptr() >> 2) + 32);
  if (!Number.isFinite(s2[8])) fail('degenerate dt produced non-finite state');
  else ok('degenerate dt handled');

  console.log('');
  if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
  console.log('core OK');
})();
