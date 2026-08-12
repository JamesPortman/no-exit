// Plaintext adventure registry — the fixture only.
//
// The ten real adventures are NOT here. They live encrypted in
// content/sealed/*.enc and are loaded by api/_lib/content.js using
// ADVENTURE_KEY; their plaintext working copies sit in content/source/,
// which is gitignored. This file exists so the engine and its tests still
// have one readable adventure in a clone with no key — and so the content
// format stays documented by a real, working example.
//
// Whatever is registered here contains ANSWERS: require it only from
// api/_lib/content.js, never from client-served code.
module.exports = {
  'test-adventure': require('./test-adventure/index.js'),
  'test-long': require('./test-long/index.js'),
};
