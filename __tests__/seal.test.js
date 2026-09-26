import { describe, it, expect } from 'vitest';
const crypto = require('crypto');
const { encrypt, decrypt, newKeyHex } = require('../api/_lib/seal.js');

const key = Buffer.from(newKeyHex(), 'hex');

// The v1 format, kept here verbatim so the legacy decrypt path stays tested
// after every sealed file has been rewritten as v2.
function encryptV1(plaintext, k) {
  const iv = crypto.createHmac('sha256', k).update(plaintext, 'utf8').digest().subarray(0, 12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const body = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  return ['v1', iv.toString('hex'), c.getAuthTag().toString('hex'), body.toString('base64')].join('.');
}

describe('seal', () => {
  it('round-trips and writes v2 envelopes', () => {
    const env = encrypt('{"slug":"x"}', key);
    expect(env.startsWith('v2.')).toBe(true);
    expect(decrypt(env, key)).toBe('{"slug":"x"}');
  });

  it('is deterministic, so unchanged content re-seals byte-identically', () => {
    expect(encrypt('same', key)).toBe(encrypt('same', key));
    expect(encrypt('same', key)).not.toBe(encrypt('other', key));
  });

  it('still opens legacy v1 envelopes', () => {
    expect(decrypt(encryptV1('legacy', key), key)).toBe('legacy');
  });

  it('does not use the master key directly for AES or the IV', () => {
    const [, ivHex] = encrypt('p', key).split('.');
    const directIv = crypto.createHmac('sha256', key).update('p', 'utf8').digest().subarray(0, 12);
    expect(ivHex).not.toBe(directIv.toString('hex'));
    // A v2 body relabelled as v1 must not decrypt under the raw key.
    expect(() => decrypt(encrypt('p', key).replace(/^v2\./, 'v1.'), key)).toThrow();
  });

  it('rejects tampering, the wrong key and unknown versions', () => {
    const env = encrypt('secret', key);
    const parts = env.split('.');
    const body = Buffer.from(parts[3], 'base64'); body[0] ^= 1;
    expect(() => decrypt([parts[0], parts[1], parts[2], body.toString('base64')].join('.'), key)).toThrow();
    expect(() => decrypt(env, Buffer.from(newKeyHex(), 'hex'))).toThrow();
    expect(() => decrypt(env.replace(/^v2\./, 'v9.'), key)).toThrow(/malformed/);
  });
});
