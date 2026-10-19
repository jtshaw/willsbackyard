// ============================================================================
// Unlock screen. Injected in place of the game bundle when the build is
// password-protected; the bundle itself only exists as ciphertext until the
// right password derives the key that opens it.
//
// The sealed box below is filled in at build time by build.sh.
// ============================================================================

(function () {
  var BOX = {
    salt: '__SALT__',
    iv: '__IV__',
    data: '__DATA__',
    iterations: __ITERS__
  };

  var STYLE =
    '#gate{position:fixed;inset:0;z-index:100;display:flex;align-items:center;' +
    'justify-content:center;background:radial-gradient(ellipse at center,#1d2430,#0b0e14);' +
    'font-family:"Trebuchet MS","Segoe UI",Avenir,-apple-system,system-ui,sans-serif;padding:6vmin}' +
    '#gate .box{background:linear-gradient(#fffdf4,#fdf6e6);border:5px solid #2e2822;' +
    'border-radius:26px;box-shadow:0 10px 0 rgba(0,0,0,.18),0 18px 40px rgba(0,0,0,.45);' +
    'padding:clamp(22px,4vmin,44px);max-width:min(520px,94vw);width:100%;text-align:center;color:#2e2822}' +
    '#gate .kick{font-size:clamp(10px,1.5vmin,13px);letter-spacing:.22em;text-transform:uppercase;' +
    'font-weight:800;color:#7a4a1e;opacity:.8}' +
    '#gate h1{margin:.3em 0 .1em;font-size:clamp(30px,6.5vmin,56px);font-weight:900;line-height:.95;' +
    'letter-spacing:-.03em;color:#7a4a1e;text-shadow:0 3px 0 #e9d3a8}' +
    '#gate h1 span{color:#3f8f3a}' +
    '#gate p{margin:.2em 0 1.4em;opacity:.72;font-size:clamp(13px,1.8vmin,16px)}' +
    '#gate form{display:flex;gap:.6em;flex-wrap:wrap;justify-content:center}' +
    '#gate input{flex:1 1 14em;min-width:0;font:inherit;font-size:clamp(14px,2vmin,17px);' +
    'padding:.7em .9em;border:4px solid #2e2822;border-radius:14px;background:#fff;color:#2e2822;' +
    'text-align:center;letter-spacing:.04em}' +
    '#gate input:focus{outline:none;border-color:#3f8f3a;box-shadow:0 0 0 4px rgba(63,143,58,.25)}' +
    '#gate button{font:inherit;font-weight:800;font-size:clamp(14px,2vmin,17px);cursor:pointer;' +
    'padding:.7em 1.3em;border:4px solid #2e2822;border-radius:14px;background:#3f8f3a;color:#fff;' +
    'box-shadow:0 5px 0 rgba(0,0,0,.3)}' +
    '#gate button:active{transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.3)}' +
    '#gate button[disabled]{opacity:.55;cursor:default;transform:none}' +
    '#gate .msg{margin-top:1em;min-height:1.4em;font-weight:700;font-size:clamp(12px,1.7vmin,15px)}' +
    '#gate .msg.bad{color:#c6382c}' +
    '#gate .msg.work{color:#7a4a1e}' +
    '#gate .paw{font-size:2.4em;line-height:1}';

  var style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  var gate = document.createElement('div');
  gate.id = 'gate';
  gate.innerHTML =
    '<div class="box">' +
      '<div class="paw">🐀</div>' +
      '<div class="kick">Keep out</div>' +
      '<h1>Will\'s<br><span>Backyard</span></h1>' +
      '<p>This one is invite-only. If you were given a password, now is the time.</p>' +
      '<form id="gateForm">' +
        '<input id="gatePw" type="password" placeholder="Password" autocomplete="current-password" ' +
        'autocapitalize="off" autocorrect="off" spellcheck="false">' +
        '<button id="gateGo" type="submit">Let me in</button>' +
      '</form>' +
      '<div class="msg" id="gateMsg"></div>' +
    '</div>';
  document.body.appendChild(gate);

  var input = document.getElementById('gatePw');
  var button = document.getElementById('gateGo');
  var msg = document.getElementById('gateMsg');
  setTimeout(function () { input.focus(); }, 60);

  function say(text, cls) {
    msg.textContent = text;
    msg.className = 'msg' + (cls ? ' ' + cls : '');
  }

  function b64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var subtle = window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle);
  if (!subtle) {
    say('This browser cannot unlock the page (no Web Crypto). Try a newer browser, or open it over https.', 'bad');
    input.disabled = button.disabled = true;
    return;
  }

  function unlock(password) {
    var enc = new TextEncoder();
    return subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: b64(BOX.salt), iterations: BOX.iterations, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      })
      .then(function (key) {
        return subtle.decrypt({ name: 'AES-GCM', iv: b64(BOX.iv) }, key, b64(BOX.data));
      })
      .then(function (buf) {
        return new TextDecoder().decode(buf);
      });
  }

  function run(source) {
    gate.parentNode.removeChild(gate);
    style.parentNode.removeChild(style);
    var s = document.createElement('script');
    s.textContent = source;
    document.body.appendChild(s);
  }

  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = input.value;
    if (!pw) { say('Enter the password.', 'bad'); return; }

    button.disabled = input.disabled = true;
    say('Checking…', 'work');

    // Let the browser paint the pending state before the slow key derivation.
    setTimeout(function () {
      unlock(pw).then(function (source) {
        say('Welcome in.', 'work');
        setTimeout(function () { run(source); }, 120);
      }).catch(function () {
        // A wrong password fails the GCM tag check -- indistinguishable from
        // tampering, which is exactly what we want to report.
        button.disabled = input.disabled = false;
        say('That is not the password.', 'bad');
        input.value = '';
        input.focus();
      });
    }, 30);
  });
})();
