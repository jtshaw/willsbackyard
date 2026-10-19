#!/usr/bin/env node
// Verifies a password-protected build actually protects anything.
//
// Three ways this could silently go wrong:
//   1. the payload ships in plaintext next to the lock screen (gate is theatre)
//   2. the right password does not open it (nobody can play)
//   3. a wrong password opens it anyway (gate does nothing)
//
//   node tools/test_lock.js [password]
// Falls back to $WB_PASSWORD or the .password file.

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const root = path.join(__dirname, '..');
const PAGE = path.join(root, 'dist/willsbackyard.html');

let failures = 0;
const fail = (m) => { console.error('  ✗ ' + m); failures++; };
const ok = (m) => console.log('  ✓ ' + m);

function password() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.WB_PASSWORD) return process.env.WB_PASSWORD;
  const f = path.join(root, '.password');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').replace(/\n+$/, '');
  return null;
}

function open(box, pw) {
  const key = crypto.pbkdf2Sync(pw, Buffer.from(box.salt, 'base64'), box.iterations, 32, 'sha256');
  const raw = Buffer.from(box.data, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8');
}

(function main() {
  const pw = password();
  if (!pw) {
    console.log('  - no password configured; nothing to check');
    return;
  }
  const page = fs.readFileSync(PAGE, 'utf8');

  // --- 1. the page must not carry the game in the clear --------------------
  // Strings that only exist inside the game bundle or the wasm base64.
  const tells = [
    ['wb_tick', 'a wasm export name'],
    ['createRenderer', 'the renderer entry point'],
    ['buildAtlas', 'the atlas packer'],
    ['Under the Hutch', 'a level name'],
    ['W1llC4tch3sR4ts', 'the password itself']
  ];
  let leaked = [];
  for (const [needle, what] of tells) {
    if (page.indexOf(needle) !== -1) leaked.push(`${needle} (${what})`);
  }
  if (leaked.length) fail('payload is readable in the page: ' + leaked.join(', '));
  else ok('no game code, level names or password in the published page');

  // --- 2. pull the sealed box back out of the page -------------------------
  const grab = (k) => {
    const m = page.match(new RegExp(k + ":\\s*'([^']*)'"));
    return m ? m[1] : null;
  };
  const iterM = page.match(/iterations:\s*(\d+)/);
  const box = {
    salt: grab('salt'),
    iv: grab('iv'),
    data: grab('data'),
    iterations: iterM ? Number(iterM[1]) : 0
  };
  if (!box.salt || !box.iv || !box.data || !box.iterations) {
    fail('could not find the sealed payload in the page');
    console.log('');
    process.exit(1);
  }
  if (box.iterations < 100000) {
    fail(`PBKDF2 iterations too low (${box.iterations}) to resist brute force`);
  } else {
    ok(`PBKDF2 ${box.iterations.toLocaleString()} iterations, AES-256-GCM`);
  }

  // --- 3. the real password must open it -----------------------------------
  let plain = null;
  try {
    plain = open(box, pw);
  } catch (e) {
    fail('the configured password does NOT decrypt the page -- nobody could play');
  }
  if (plain) {
    const intact = plain.indexOf('wb_tick') !== -1 &&
                   plain.indexOf('createRenderer') !== -1 &&
                   plain.indexOf('window.WASM_B64') !== -1;
    if (intact) ok('the password decrypts a complete, runnable bundle');
    else fail('decrypted, but the payload is missing the game bundle or the wasm');
  }

  // --- 4. wrong passwords must not ----------------------------------------
  const wrongs = ['', 'password', 'w1llc4tch3sr4ts!', pw + ' ', pw.slice(0, -1), 'W1llC4tch3sR4ts'];
  let opened = [];
  for (const w of wrongs) {
    try { open(box, w); opened.push(JSON.stringify(w)); } catch (e) { /* expected */ }
  }
  if (opened.length) fail('these wrong passwords opened the page: ' + opened.join(', '));
  else ok(`${wrongs.length} wrong passwords all rejected (including case and whitespace variants)`);

  console.log('');
  if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
  console.log('lock OK');
})();
