// Authenticated encryption for adventure content at rest.
//
// The repository is public, so the ten real adventures are committed only as
// ciphertext (content/sealed/*.enc). The key lives in ADVENTURE_KEY — a
// Vercel environment variable in production and a GitHub Actions secret in
// CI — never in the repo. The plaintext fixture adventure stays readable so
// the content format is still documented by example.
//
// AES-256-GCM: confidentiality plus tamper detection, so a corrupted or
// edited .enc file fails loudly at decrypt instead of silently loading junk.
const crypto = require('crypto');

const IV_BYTES = 12;   // GCM standard nonce length
const KEY_BYTES = 32;  // AES-256

function keyFromEnv(env = process.env) {
  const hex = env.ADVENTURE_KEY;
  if (!hex) return null;
  const key = Buffer.from(hex.trim(), 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(`ADVENTURE_KEY must be ${KEY_BYTES} bytes of hex (got ${key.length})`);
  }
  return key;
}

function newKeyHex() {
  return crypto.randomBytes(KEY_BYTES).toString('hex');
}

// Envelope: v1.<iv hex>.<auth tag hex>.<ciphertext base64>
//
// The nonce is derived from the plaintext under the key (a synthetic IV)
// rather than drawn at random, so re-sealing unchanged content reproduces
// byte-identical output. That keeps `git diff` after `npm run seal` showing
// only the adventure actually edited instead of all ten. Distinct content
// still gets a distinct nonce, which is the property GCM needs.
function ivFor(plaintext, key) {
  return crypto.createHmac('sha256', key)
    .update(String(plaintext), 'utf8')
    .digest()
    .subarray(0, IV_BYTES);
}

function encrypt(plaintext, key) {
  const iv = ivFor(plaintext, key);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    body.toString('base64'),
  ].join('.');
}

function decrypt(envelope, key) {
  const [version, ivHex, tagHex, bodyB64] = String(envelope).trim().split('.');
  if (version !== 'v1' || !ivHex || !tagHex || !bodyB64) {
    throw new Error('sealed content is malformed');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', key, Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { keyFromEnv, newKeyHex, encrypt, decrypt };
