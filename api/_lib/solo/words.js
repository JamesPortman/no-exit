// Word pools for generated puzzles.
//
// TOKEN_WORDS is indexed by first letter: the "initials" finale needs a word
// starting with each letter of its target, and repeated letters need distinct
// words, so every entry carries at least three options.
const TOKEN_WORDS = {
  A: ['AMBER', 'ASHES', 'ANCHOR'],
  B: ['BRASS', 'BEACON', 'BRAMBLE'],
  C: ['CINDER', 'COPPER', 'CANVAS'],
  D: ['DAMSON', 'DRIFTWOOD', 'DUSK'],
  E: ['EMBER', 'ECHO', 'ELDER'],
  G: ['GRANITE', 'GLASS', 'GILT'],
  H: ['HOLLOW', 'HEATHER', 'HARROW'],
  I: ['IVORY', 'IRON', 'INKWELL'],
  L: ['LANTERN', 'LATCH', 'LICHEN'],
  M: ['MARROW', 'MOTH', 'MILLSTONE'],
  N: ['NETTLE', 'NORTH', 'NIMBUS'],
  O: ['OCHRE', 'ORCHID', 'OAKUM'],
  P: ['PEWTER', 'PLINTH', 'PITCH'],
  R: ['ROSIN', 'RUSHLIGHT', 'RIME'],
  S: ['SALT', 'SLATE', 'SEDGE'],
  T: ['TALLOW', 'THISTLE', 'TIDE'],
  V: ['VELLUM', 'VERDIGRIS', 'VESSEL'],
  W: ['WICK', 'WILLOW', 'WHARF'],
};

// Six-letter finales, every letter covered by TOKEN_WORDS above.
const TARGETS = [
  'CANDLE', 'CIPHER', 'SHADOW', 'MIRROR', 'WINTER',
  'GARDEN', 'SILVER', 'BRIDGE', 'MARBLE', 'VELVET', 'THREAD',
];

// Plain nouns for ciphers and anagrams: unambiguous, no proper nouns, and
// long enough that guessing is not a strategy.
const SECRETS = [
  'harbour', 'lantern', 'compass', 'thimble', 'kettle', 'mirror', 'anchor',
  'candle', 'ribbon', 'basket', 'copper', 'garden', 'window', 'pillow',
  'shadow', 'silver', 'winter', 'marble', 'velvet', 'thread', 'bucket',
  'ladder', 'saddle', 'hammer', 'button', 'pocket', 'cellar', 'tunnel',
];

// Grid cell names for the path puzzle — short, distinct, easy to type.
const PLACE_NAMES = [
  'Thornrock', 'Gullhaven', 'Mistfen', 'Kelpgate', 'Palebay', 'Saltmarsh',
  'Foghollow', 'Wreckpoint', 'Cinderkey', 'Lowlight', 'Brinemoor', 'Selkieshoal',
  'Duskharbor', 'Tidewrack', 'Emberledge', 'Coldspar', 'Marlhead', 'Runnelby',
  'Sootfield', 'Quillmoor', 'Ashencote', 'Bramblewick', 'Netherfold', 'Grimsett',
  'Harrowfen', 'Stillwater', 'Craghollow',
];

module.exports = { TOKEN_WORDS, TARGETS, SECRETS, PLACE_NAMES };
