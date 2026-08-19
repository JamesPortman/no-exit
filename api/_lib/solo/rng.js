// Deterministic RNG for generated Solo runs.
//
// Everything about a run derives from its seed, so the same seed always
// produces byte-identical content. Never use Math.random() anywhere under
// api/_lib/solo — a single stray call would break that guarantee and the
// determinism test that guards it.

// xmur3 string hash → 32-bit seed material.
function hashSeed(str) {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// mulberry32 — small, fast, good enough for puzzle selection.
function makeRng(seed) {
  let a = hashSeed(seed)();
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const shuffle = (arr) => {
    const a2 = [...arr];
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  };
  // Draw n distinct items; falls back to fewer if the pool is small.
  const sample = (arr, n) => shuffle(arr).slice(0, Math.min(n, arr.length));
  return { next, int, pick, shuffle, sample };
}

// Seeds are server-side only and must never reach a client: the generator is
// public, so a seed is equivalent to the answer key.
function newSeed() {
  return require('crypto').randomBytes(16).toString('hex');
}

module.exports = { makeRng, newSeed };
