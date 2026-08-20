// Themes for generated Solo runs.
//
// A run picks one theme by seed and every puzzle is dressed in it — the same
// mechanics read as one connected room rather than six unrelated exercises.
// Names are deliberately distinct from the ten authored adventures.
//
// Each theme supplies: a keeper (whose absence is the premise), `spots` (where
// things are found) and `props` (what carries a mark). Puzzle prompts and
// solve messages draw from these, so the vocabulary stays inside the fiction.
//
// The Spanish and Portuguese vocabulary lives in themes.i18n.js and is merged
// in below, so the English definitions here stay readable. Its `spots` and
// `props` arrays are parallel to the English ones — the generator picks an
// index with the seed and indexes every language with it.

const THEMES = [
  {
    key: 'drowned-library',
    title: 'The Drowned Library',
    intro:
      'The lower stacks flooded on Tuesday and the water has not gone down. '
      + 'Sub-librarian Wren waded in to save the catalogue and has not come '
      + 'back up. Her marks are still chalked on the shelves, and the door '
      + 'behind you has swollen shut.',
    es: { title: 'La Biblioteca Anegada',
          intro: 'Las estanterías bajas se inundaron el martes y el agua no ha bajado. La subbibliotecaria Wren entró para salvar el catálogo y no ha vuelto a salir. Sus marcas siguen escritas con tiza en los estantes, y la puerta se ha hinchado y no abre.' },
    pt: { title: 'A Biblioteca Inundada',
          intro: 'As estantes de baixo alagaram na terça e a água não baixou. A subbibliotecária Wren entrou para salvar o catálogo e não voltou. As marcas dela continuam a giz nas prateleiras, e a porta inchou e não abre.' },
    keeper: 'Wren',
    spots: ['the flooded stacks', 'the card catalogue', 'a swollen ledger',
            'the reading-room table', 'the returns trolley', 'a warped shelf'],
    props: ['a chalk mark', 'a pencilled slip', 'an index card',
            'a bookplate', 'a margin note'],
  },
  {
    key: 'night-market',
    title: 'The Night Market',
    intro:
      'The market closes at three and it is ten past. Every stall is still '
      + 'lit, every stallholder gone. The gate wants a word before it will '
      + 'lift, and the traders left their marks behind on the counters.',
    es: { title: 'El Mercado Nocturno',
          intro: 'El mercado cierra a las tres y son las tres y diez. Cada puesto sigue iluminado, cada vendedor se ha ido. La verja pide una palabra antes de levantarse, y los comerciantes dejaron sus marcas en los mostradores.' },
    pt: { title: 'O Mercado Noturno',
          intro: 'O mercado fecha às três e já passam dez. Cada barraca continua acesa, cada vendedor sumiu. O portão quer uma palavra antes de subir, e os feirantes deixaram suas marcas nos balcões.' },
    keeper: 'the spice trader',
    spots: ['the spice stall', 'a shuttered counter', 'the weighing table',
            'the flower cart', 'a stack of crates', 'the gatekeeper’s booth'],
    props: ['a price tag', 'a chalked board', 'a paper twist',
            'a brass weight', 'a folded receipt'],
  },
  {
    key: 'frozen-station',
    title: 'The Frozen Station',
    intro:
      'The last train left without you and the points have iced over. The '
      + 'stationmaster’s office is warm, his tea still steaming, and he is '
      + 'nowhere. His notes are pinned where the frost has not reached.',
    es: { title: 'La Estación Helada',
          intro: 'El último tren salió sin ti y las agujas se han congelado. La oficina del jefe de estación está caliente, su té aún humea, y él no está. Sus notas siguen clavadas donde la escarcha no ha llegado.' },
    pt: { title: 'A Estação Congelada',
          intro: 'O último trem partiu sem você e os desvios congelaram. O escritório do chefe da estação está quente, o chá dele ainda fumega, e ele não está em lugar nenhum. As anotações continuam presas onde a geada não chegou.' },
    keeper: 'the stationmaster',
    spots: ['the ticket window', 'the signal box', 'the waiting room',
            'the platform clock', 'a frosted timetable', 'the lost-property shelf'],
    props: ['a pinned note', 'a punched ticket', 'a chalk line',
            'a luggage label', 'a scratched plate'],
  },
  {
    key: 'orrery-room',
    title: 'The Orrery Room',
    intro:
      'The great orrery has stopped, and it only ever stops on purpose. Its '
      + 'keeper left mid-calculation — chair pushed back, pen still wet — and '
      + 'the room will not unlock until the model turns again.',
    es: { title: 'La Sala del Orrery',
          intro: 'El gran orrery se ha detenido, y solo se detiene a propósito. Su cuidador se marchó a mitad de un cálculo — la silla apartada, la pluma aún húmeda — y la sala no se abrirá hasta que el modelo vuelva a girar.' },
    pt: { title: 'A Sala do Orrery',
          intro: 'O grande orrery parou, e ele só para de propósito. O guardião saiu no meio de um cálculo — a cadeira afastada, a pena ainda úmida — e a sala não abre até o modelo voltar a girar.' },
    keeper: 'the keeper',
    spots: ['the brass armature', 'a drawer of gears', 'the calculation desk',
            'the planet cabinet', 'a dusty ephemeris', 'the counterweight well'],
    props: ['an engraved plate', 'a pencilled figure', 'a gear tag',
            'a slip of tracing paper', 'a stamped disc'],
  },
  {
    key: 'glasshouse',
    title: 'The Glasshouse',
    intro:
      'The heat is climbing and the vents will not answer. The head gardener '
      + 'labels everything twice and has labelled her way out of here once '
      + 'before — her tags are still tied to the benches.',
    es: { title: 'El Invernadero',
          intro: 'El calor sube y los respiraderos no responden. La jardinera jefe lo etiqueta todo dos veces y ya se etiquetó una salida de aquí antes — sus etiquetas siguen atadas a las mesas.' },
    pt: { title: 'A Estufa',
          intro: 'O calor sobe e as aberturas não respondem. A jardineira-chefe etiqueta tudo duas vezes e já etiquetou uma saída daqui antes — as etiquetas dela continuam amarradas às bancadas.' },
    keeper: 'the head gardener',
    spots: ['the propagation bench', 'a row of clay pots', 'the misting pipes',
            'the seed drawers', 'a fogged pane', 'the compost bay'],
    props: ['a tied tag', 'a seed packet', 'a pencilled stake',
            'a copper label', 'a pressed leaf'],
  },
  {
    key: 'bell-foundry',
    title: 'The Bell Foundry',
    intro:
      'The mould is cooling and once it sets, whatever is wrong with it is '
      + 'wrong forever. The founder stepped out to check a figure and the '
      + 'doors dropped behind him. His workings are chalked on everything.',
    es: { title: 'La Fundición de Campanas',
          intro: 'El molde se enfría y, cuando fragüe, lo que esté mal quedará mal para siempre. El fundidor salió a comprobar una cifra y las puertas cayeron tras él. Sus cuentas están escritas con tiza por todas partes.' },
    pt: { title: 'A Fundição de Sinos',
          intro: 'O molde está esfriando e, quando endurecer, o que estiver errado ficará errado para sempre. O fundidor saiu para conferir um número e as portas caíram atrás dele. As contas dele estão a giz em tudo.' },
    keeper: 'the founder',
    spots: ['the cooling mould', 'the tuning bench', 'a rack of clappers',
            'the crucible shelf', 'the tally board', 'a sand floor'],
    props: ['a chalked figure', 'a stamped band', 'a founder’s mark',
            'a scratched tally', 'a cooling tag'],
  },
  {
    key: 'salt-mine',
    title: 'The Salt Mine',
    intro:
      'Four hundred metres down, the cage stopped between levels and the '
      + 'lights went to emergency amber. The shift foreman marks every gallery '
      + 'he walks, and his marks are the only map left.',
    es: { title: 'La Mina de Sal',
          intro: 'A cuatrocientos metros, la jaula se detuvo entre niveles y las luces pasaron al ámbar de emergencia. El capataz marca cada galería que recorre, y sus marcas son el único mapa que queda.' },
    pt: { title: 'A Mina de Sal',
          intro: 'A quatrocentos metros, a gaiola parou entre níveis e as luzes passaram ao âmbar de emergência. O encarregado marca cada galeria por onde passa, e as marcas dele são o único mapa que restou.' },
    keeper: 'the foreman',
    spots: ['a worked-out gallery', 'the pump housing', 'the cage door',
            'a pillar of rock salt', 'the tool niche', 'the survey peg'],
    props: ['a crayon mark', 'a scratched plate', 'a survey tag',
            'a chalked arrow', 'a stamped token'],
  },
  {
    key: 'paper-mill',
    title: 'The Paper Mill',
    intro:
      'The beaters are still running and nobody is watching them. The mill '
      + 'has one door and it answers to the foreman’s marks — which are, '
      + 'inevitably, written on paper.',
    es: { title: 'El Molino de Papel',
          intro: 'Las pilas siguen funcionando y nadie las vigila. El molino tiene una sola puerta y responde a las marcas del capataz — que están, cómo no, escritas en papel.' },
    pt: { title: 'O Moinho de Papel',
          intro: 'Os batedores continuam ligados e ninguém os vigia. O moinho tem uma única porta e responde às marcas do encarregado — que estão, claro, escritas em papel.' },
    keeper: 'the foreman',
    spots: ['the drying loft', 'a vat of pulp', 'the press bed',
            'the rag store', 'a stack of deckles', 'the sizing tub'],
    props: ['a watermark', 'a pinned sheet', 'a pencilled corner',
            'a proof slip', 'a stamped edge'],
  },
];

const VOCAB = require('./themes.i18n.js');

// Merge the localized vocabulary onto each theme's existing es/pt block,
// which already carries its title and intro.
const LOCALIZED = THEMES.map((t) => {
  const v = VOCAB[t.key] || {};
  return {
    ...t,
    es: { ...(t.es || {}), ...(v.es || {}) },
    pt: { ...(t.pt || {}), ...(v.pt || {}) },
  };
});

// The vocabulary a run is dressed in, for one language. Falls back to English
// field by field, so a theme that is only half translated still renders.
function vocab(theme, lang) {
  const t = lang && lang !== 'en' ? theme[lang] : null;
  return {
    keeper: (t && t.keeper) || theme.keeper,
    spots: (t && t.spots && t.spots.length === theme.spots.length) ? t.spots : theme.spots,
    props: (t && t.props && t.props.length === theme.props.length) ? t.props : theme.props,
  };
}

module.exports = { THEMES: LOCALIZED, vocab };
