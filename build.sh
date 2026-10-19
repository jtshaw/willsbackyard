#!/usr/bin/env bash
# Builds dist/willsbackyard.html -- one self-contained file you can double-click.
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
mkdir -p dist build
# Concatenate in load order: art modules, then the atlas packer, renderer, runtime.
cat web/art/*.js web/atlas.js web/gl.js web/main.js > build/bundle.js

python3 - <<'PY'
import base64, pathlib

wasm = pathlib.Path('rust/target/wasm32-unknown-unknown/release/willsbackyard.wasm').read_bytes()
b64 = base64.b64encode(wasm).decode('ascii')
shell = pathlib.Path('web/shell.html').read_text()
bundle = pathlib.Path('build/bundle.js').read_text()

# Order matters: inject the script bundle first, so a stray marker inside the
# base64 blob can never be substituted.
out = shell.replace('__SCRIPTS__', bundle).replace('__WASM_B64__', b64)
dest = pathlib.Path('dist/willsbackyard.html')
dest.write_text(out)

kb = len(out.encode()) / 1024
print(f'    wasm   {len(wasm)/1024:7.1f} KB')
print(f'    bundle {len(bundle)/1024:7.1f} KB')
print(f'    page   {kb:7.1f} KB  -> {dest}')
PY

echo "==> smoke-testing the core"
node tools/test_core.js | tail -3

echo "==> done. Open dist/willsbackyard.html in a browser."
