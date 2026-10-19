#!/usr/bin/env bash
# Builds dist/willsbackyard.html -- one self-contained file you can double-click.
#
# If a password is available the game payload is encrypted and the page ships a
# lock screen instead (see tools/lock.js). The password is read from, in order:
#   $WB_PASSWORD, then the .password file (which is gitignored).
# With neither, an unlocked build is produced and the build says so.
set -euo pipefail

cd "$(dirname "$0")"
export PATH="$HOME/.cargo/bin:$PATH"

echo "==> regenerating sprite ids"
node tools/gen_sprites.js

echo "==> checking level geometry"
HOST_TARGET="$(rustc -vV | sed -n 's/^host: //p')"
( cd rust && cargo test --lib --target "$HOST_TARGET" )

echo "==> checking renderer quad math"
node tools/test_quad.js

echo "==> building wasm"
( cd rust && cargo build --release )

WASM=rust/target/wasm32-unknown-unknown/release/willsbackyard.wasm
if [ ! -f "$WASM" ]; then echo "wasm not found at $WASM" >&2; exit 1; fi

echo "==> bundling"
mkdir -p dist build docs
# Concatenate in load order: art modules, then the atlas packer, renderer, runtime.
cat web/art/*.js web/atlas.js web/gl.js web/main.js > build/bundle.js

# Resolve the password without ever putting it on a command line.
WB_PASSWORD="${WB_PASSWORD:-}"
if [ -z "$WB_PASSWORD" ] && [ -f .password ]; then
  WB_PASSWORD="$(tr -d '\n' < .password)"
fi
export WB_PASSWORD

node - <<'PY'
const fs = require('fs');
const { seal } = require('./tools/lock.js');

const wasm = fs.readFileSync('rust/target/wasm32-unknown-unknown/release/willsbackyard.wasm');
const b64 = wasm.toString('base64');
const bundle = fs.readFileSync('build/bundle.js', 'utf8');
const shell = fs.readFileSync('web/shell.html', 'utf8');

const password = process.env.WB_PASSWORD || '';
let scripts, wasmSlot, mode;

if (password) {
  // Everything that makes the game run becomes one encrypted blob. The page
  // keeps only the static HUD markup, which cannot do anything on its own.
  const payload = 'window.WASM_B64 = "' + b64 + '";\n' + bundle;
  const box = seal(payload, password);
  const sub = (text, token, value) => text.replace(new RegExp(token, 'g'), () => value);
  scripts = fs.readFileSync('web/lock.js', 'utf8');
  scripts = sub(scripts, '__SALT__', box.salt);
  scripts = sub(scripts, '__IV__', box.iv);
  scripts = sub(scripts, '__DATA__', box.data);
  scripts = sub(scripts, '__ITERS__', String(box.iterations));
  if (/__SALT__|__IV__|__DATA__|__ITERS__/.test(scripts)) {
    throw new Error('lock placeholders were not all substituted');
  }
  wasmSlot = '';
  mode = 'locked';
} else {
  scripts = bundle;
  wasmSlot = b64;
  mode = 'open';
}

// Replace via a function so a stray "$&" or "$1" in the payload is not treated
// as a replacement pattern, and inject the scripts first so a marker-looking
// string inside the base64 blob can never be substituted.
const out = shell.replace('__SCRIPTS__', () => scripts)
                 .replace('__WASM_B64__', () => wasmSlot);

fs.writeFileSync('dist/willsbackyard.html', out);
// GitHub Pages serves this one (Settings -> Pages -> branch main, folder /docs).
fs.writeFileSync('docs/index.html', out);
// Tell GitHub Pages not to run Jekyll over this -- it is a single static page
// with a large embedded payload and Jekyll only slows the deploy down.
fs.writeFileSync('docs/.nojekyll', '');
// Pages stores the custom domain in docs/CNAME when publishing from a branch
// folder. Rewriting docs/ without it would drop the domain on the next build.
if (!fs.existsSync('docs/CNAME')) {
  fs.writeFileSync('docs/CNAME', 'willsbackyard.jtshaw.com\n');
}

const kb = (n) => (n / 1024).toFixed(1).padStart(7);
console.log(`    wasm   ${kb(wasm.length)} KB`);
console.log(`    bundle ${kb(Buffer.byteLength(bundle))} KB`);
console.log(`    page   ${kb(Buffer.byteLength(out))} KB  [${mode}]`);
console.log('    -> dist/willsbackyard.html and docs/index.html');
if (mode === 'open') {
  console.log('    NOTE: no password set, so this build is playable by anyone.');
}
PY

echo "==> verifying the lock"
node tools/test_lock.js

echo "==> smoke-testing the core"
node tools/test_core.js | tail -3

echo "==> done. Open dist/willsbackyard.html in a browser."
