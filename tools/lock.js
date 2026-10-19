#!/usr/bin/env node
// Encrypts the game payload so the published page ships only ciphertext.
//
// This is deliberately not a "compare the typed string to a constant" gate.
// That kind only works on people who will not press View Source, because the
// game sits in the same file as the check. Here the key is derived from the
// password with PBKDF2 and the payload is sealed with AES-256-GCM, so a
// visitor without the password has nothing to run and nothing to read.
//
// What it still cannot do: stop someone who HAS the password from decrypting
// the payload once and passing it on. It is a lock on the door, not DRM.

const crypto = require('crypto');

const ITERATIONS = 250000;   // ~0.3-0.8s in a browser; brutal for brute force
const SALT_BYTES = 16;
const IV_BYTES = 12;

function seal(plaintext, password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  // WebCrypto's AES-GCM expects the tag appended to the ciphertext.
  const sealed = Buffer.concat([body, cipher.getAuthTag()]);

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: sealed.toString('base64'),
    iterations: ITERATIONS
  };
}

module.exports = { seal, ITERATIONS };

// Allow a quick round-trip check from the shell.
if (require.main === module) {
  const pw = process.argv[2] || 'test';
  const box = seal('hello payload', pw);
  const key = crypto.pbkdf2Sync(pw, Buffer.from(box.salt, 'base64'), box.iterations, 32, 'sha256');
  const raw = Buffer.from(box.data, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(raw.subarray(raw.length - 16));
  const out = Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString();
  console.log(out === 'hello payload' ? 'round-trip OK' : 'ROUND-TRIP FAILED');
}
