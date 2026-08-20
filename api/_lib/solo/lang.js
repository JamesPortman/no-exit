// Prose for generated Solo runs, in every supported language.
//
// A generated room cannot be "translated" the way an authored one is: its
// sentences do not exist until a seed picks them. So the generator chooses
// DATA (which cipher, which sequence, which spot) exactly once, and each
// family renders that same data through one of these lexicons per language.
// Two consequences worth stating:
//
//   * the run is the same room in every language — same mechanic, same
//     numbers, same answer — because language never touches the rng;
//   * a missing phrase is a crash in tests, not a silent English fallback,
//     because every lexicon has to implement the same shape.
//
// What never localizes: the chain mark itself (the finale reads it back), the
// ciphertext and letter artefacts, and the place names on the chart.

// Spanish and Portuguese contract preposition + article. The theme vocabulary
// carries its own article ("el mostrador"), so templates write "de el
// mostrador" and this repairs it — which keeps the vocabulary lists simple.
const CONTRACTIONS = {
  en: [],
  es: [[/\bde el\b/g, 'del'], [/\ba el\b/g, 'al'], [/\bDe el\b/g, 'Del']],
  pt: [
    [/\bde o\b/g, 'do'], [/\bde a\b/g, 'da'], [/\bde os\b/g, 'dos'], [/\bde as\b/g, 'das'],
    [/\bDe o\b/g, 'Do'], [/\bDe a\b/g, 'Da'],
    [/\bem o\b/g, 'no'], [/\bem a\b/g, 'na'], [/\bem os\b/g, 'nos'], [/\bem as\b/g, 'nas'],
    [/\bEm o\b/g, 'No'], [/\bEm a\b/g, 'Na'],
    [/\bpor o\b/g, 'pelo'], [/\bpor a\b/g, 'pela'],
    [/\ba o\b/g, 'ao'], [/\ba a\b/g, 'à'], [/\bA o\b/g, 'Ao'],
  ],
};

function contract(lang, s) {
  let out = String(s);
  for (const [re, to] of CONTRACTIONS[lang] || []) out = out.replace(re, to);
  return out;
}

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const MONO = 'font-family:monospace;font-size:1.2rem;letter-spacing:0.1em';

const LEX = {
  en: {
    mark: ({ lead, spot, prop, token }) =>
      `${lead} Behind ${spot}, ${prop} reads “mark — ${token}”.`,
    cipher: {
      title: 'The Marked Line',
      how: {
        caesar: (k) => `every letter nudged <strong>${k} place${k > 1 ? 's' : ''} forward</strong> in the alphabet`,
        atbash: () => 'the alphabet folded end to end — A stands where Z should be',
        a1z26: () => 'each letter traded for its place in the alphabet',
        reverse: () => 'written to be read from the wrong end',
      },
      prompt: ({ keeper, how, shown }) =>
        `<p>${cap(keeper)} kept one line in a private hand — ${how}:</p>`
        + `<p style="${MONO}">${shown}</p><p>What does it say?</p>`,
      nudge: {
        caesar: (k) => `Step each letter back by ${k} and read it again.`,
        atbash: () => 'Write the alphabet forwards, then backwards underneath. Each letter swaps with the one below it.',
        a1z26: () => '1 is A, 2 is B, and so on. Count to each number.',
        reverse: () => 'Read it right to left, last letter first.',
      },
      nearly: {
        caesar: (a, b) => `The first letter steps back to ${a}, the second to ${b}.`,
        atbash: (a, b) => `Folded back, the first two letters are ${a} and ${b}.`,
        a1z26: (a, b) => `The first number gives ${a}, the second ${b}.`,
        reverse: (a, b) => `Reversed, it begins ${a}${b}.`,
      },
      solve: 'The line reads plainly once you turn it.',
    },
    sequence: {
      title: 'The Tally',
      prompt: ({ keeper, spot, seq }) =>
        `<p>A column of figures runs down ${spot}, in ${keeper}’s deliberate hand:</p>`
        + `<p style="${MONO}">${seq} &nbsp; ?</p><p>What comes next?</p>`,
      nudge: {
        arithmetic: () => 'The same amount is added every time.',
        geometric: () => 'Each entry is a multiple of the one before it.',
        gaps: () => 'Look at the gaps between the numbers, not the numbers themselves.',
        squares: () => 'Every entry is a number multiplied by itself.',
      },
      nearly: {
        arithmetic: (step) => `Each step adds ${step}.`,
        geometric: (r) => `Everything multiplies by ${r}.`,
        gaps: () => 'The gaps grow by one each time: +2, +3, +4, +5, then +6.',
        squares: (start) => `They are the squares counting up from ${start}.`,
      },
      solve: 'The column completes itself.',
    },
    story: {
      prompt: ({ spot, body }) => `<p>Chalked beside ${spot}:</p>${body}`,
      split: {
        title: 'The Two Vessels',
        body: ({ k, total }) =>
          `<ul><li>The larger holds <strong>${k} times</strong> as much as the smaller.</li>`
          + `<li>Together they hold <strong>${total}</strong> measures.</li></ul>`
          + '<p>How many measures are in the smaller one?</p>',
        nudge: () => 'Count everything in units of the smaller vessel.',
        nearly: ({ k, total }) => `That makes ${k + 1} small vessels in ${total} measures.`,
      },
      pond: {
        title: 'The Doubling',
        body: ({ day }) =>
          `<p><em>“It doubles what it covers every day, and on day ${day} it covered the whole surface.”</em></p>`
          + '<p>On which day was exactly half of it covered?</p>',
        nudge: () => 'Do not work forward from the start — work backward from the end.',
        nearly: () => 'If it doubles daily, one day earlier it was exactly half.',
      },
      gears: {
        title: 'The Meshed Wheels',
        body: ({ teeth, pinion }) =>
          `<p>The great wheel carries <strong>${teeth} teeth</strong>, the pinion <strong>${pinion}</strong>.</p>`
          + '<p>One full turn of the great wheel turns the pinion how many times?</p>',
        nudge: () => 'Every tooth of the big wheel pushes one tooth of the small one.',
        nearly: ({ teeth, pinion }) => `All ${teeth} teeth pass; the pinion swallows them ${pinion} at a time.`,
      },
      sumdiff: {
        title: 'The Uneven Pair',
        body: ({ s, d }) =>
          `<ul><li>Two counts come to <strong>${s}</strong> together.</li>`
          + `<li>One exceeds the other by <strong>${d}</strong>.</li></ul>`
          + '<p>What is the smaller count?</p>',
        nudge: () => 'Take the difference off the total first, then the rest splits evenly.',
        nearly: ({ s, d }) => `${s} minus ${d} is ${s - d}, shared equally between the two.`,
      },
      solve: 'The figures balance.',
    },
    odd: {
      title: 'The Labelled Row',
      prompt: ({ keeper, spot, shown }) =>
        `<p>${cap(keeper)} labelled eight things along ${spot} with words chosen for their `
        + '<em>shape</em> rather than their meaning. Seven follow the same rule. One does not.</p>'
        + `<p style="${MONO}">${shown}</p><p>Which word breaks the rule?</p>`,
      alpha: {
        nudge: () => 'Ignore what the words mean. Look at the order of the letters inside each one.',
        nearly: () => 'Seven of them run steadily A-to-Z from first letter to last, never doubling back.',
      },
      dbl: {
        nudge: () => 'Ignore what the words mean. Look for a letter that appears twice in a row.',
        nearly: () => 'Seven of them contain a doubled letter, side by side. One does not.',
      },
      solve: 'The odd label lifts away from its hook.',
    },
    ledger: {
      title: 'The Smudged Ledger',
      lineLabel: (i) => `line ${i}`,
      smudged: 'smudged',
      totalLabel: 'Total',
      prompt: ({ keeper, table }) =>
        `<p>${cap(keeper)}’s ledger balances to the figure at the foot of the page, `
        + 'but damp has taken one of the entries:</p>'
        + `${table}<p>What was the missing figure?</p>`,
      nudge: () => 'The entries have to add up to the total at the foot — so the gap is what is left over.',
      nearly: (total) => `Add the figures you can still read, then take that away from ${total}.`,
      solve: 'The column balances.',
    },
    path: {
      title: 'The Chart',
      bearings: { NORTH: 'NORTH', SOUTH: 'SOUTH', EAST: 'EAST', WEST: 'WEST' },
      prompt: ({ keeper, spot, bearings, table }) =>
        `<p>A chart is pinned above ${spot}. North is up. Start at the marked square (★) `
        + `and follow ${keeper}’s bearings, one square each:</p>`
        + `<p style="${MONO}">${bearings}</p>${table}<p>Where do you end up?</p>`,
      nudge: () => 'North is up, south is down, west is left, east is right — one square per bearing.',
      nearly: (a, b) => `From the star, the first two moves are ${a.toLowerCase()} then ${b.toLowerCase()}.`,
      solve: 'The chart gives up its corner.',
    },
    riddle: {
      title: 'The Old Question',
      prompt: ({ keeper, spot, q }) =>
        `<p>Scratched into ${spot}, the question ${keeper} asks everyone:</p><p><em>“${q}”</em></p>`,
      solve: 'The old question yields.',
    },
    anagram: {
      title: 'The Jumbled Tag',
      prompt: ({ spot, scrambled }) =>
        `<p>A tag has come loose at ${spot} and its letters have shaken out of order:</p>`
        + `<p style="${MONO}">${scrambled}</p><p>What did the tag say?</p>`,
      nudge: () => 'Every letter is used exactly once — nothing added, nothing missing.',
      nearly: ({ first, len }) => `It begins with ${first} and runs ${len} letters.`,
      solve: 'The letters settle.',
    },
    finale: {
      title: 'The Last Door',
      initials: {
        prompt: ({ keeper }) =>
          `<p>The way out carries six empty slots and a line in ${keeper}’s hand:</p>`
          + '<p><em>“Six marks, six letters. Take the first letter of each, in the order you '
          + 'found them, and say the word.”</em></p>',
        nudge: () => 'Your “Unlocked so far” list holds all six marks in order. Take each word’s first letter.',
        nearly: (a, b, c) => `It begins ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'The slots fill, the lock gives, and the door opens onto ordinary daylight. '
          + `Whatever happened to ${keeper}, it can wait until you are outside.`,
      },
      code: {
        prompt: () =>
          '<p>The way out has a six-figure dial and a line scratched beside it:</p>'
          + '<p><em>“Six marks, in the order you found them. Nothing else will turn it.”</em></p>',
        nudge: () => 'Your “Unlocked so far” list holds all six marks, in order.',
        nearly: (a, b, c) => `It begins ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'Six figures, one click, and the door swings wide onto ordinary daylight. '
          + `Whatever happened to ${keeper}, it can wait.`,
      },
    },
  },
  es: {
    mark: ({ lead, spot, prop, token }) =>
      `${lead} Detrás de ${spot}, ${prop} dice “marca — ${token}”.`,
    cipher: {
      title: 'La Línea Marcada',
      how: {
        caesar: (k) => `cada letra corrida <strong>${k} lugar${k > 1 ? 'es' : ''} hacia delante</strong> en el alfabeto`,
        atbash: () => 'el alfabeto doblado de punta a punta — la A ocupa el lugar de la Z',
        a1z26: () => 'cada letra cambiada por su lugar en el alfabeto',
        reverse: () => 'escrita para leerse desde el extremo equivocado',
      },
      prompt: ({ keeper, how, shown }) =>
        `<p>${cap(keeper)} guardaba una línea escrita de su puño — ${how}:</p>`
        + `<p style="${MONO}">${shown}</p><p>¿Qué dice?</p>`,
      nudge: {
        caesar: (k) => `Retrocede cada letra ${k} lugar${k > 1 ? 'es' : ''} y vuelve a leerla.`,
        atbash: () => 'Escribe el alfabeto hacia delante y luego al revés debajo. Cada letra se cambia por la de abajo.',
        a1z26: () => '1 es A, 2 es B, y así sucesivamente. Cuenta hasta cada número.',
        reverse: () => 'Léelo de derecha a izquierda, la última letra primero.',
      },
      nearly: {
        caesar: (a, b) => `La primera letra retrocede a ${a}, la segunda a ${b}.`,
        atbash: (a, b) => `Desdoblada, sus dos primeras letras son ${a} y ${b}.`,
        a1z26: (a, b) => `El primer número da ${a}, el segundo ${b}.`,
        reverse: (a, b) => `Al revés, empieza por ${a}${b}.`,
      },
      solve: 'La línea se lee sin más en cuanto la giras.',
    },
    sequence: {
      title: 'La Cuenta',
      prompt: ({ keeper, spot, seq }) =>
        `<p>Una columna de cifras baja por ${spot}, con la letra pausada de ${keeper}:</p>`
        + `<p style="${MONO}">${seq} &nbsp; ?</p><p>¿Qué viene después?</p>`,
      nudge: {
        arithmetic: () => 'Se suma la misma cantidad cada vez.',
        geometric: () => 'Cada entrada es un múltiplo de la anterior.',
        gaps: () => 'Fíjate en los saltos entre los números, no en los números.',
        squares: () => 'Cada entrada es un número multiplicado por sí mismo.',
      },
      nearly: {
        arithmetic: (step) => `Cada paso suma ${step}.`,
        geometric: (r) => `Todo se multiplica por ${r}.`,
        gaps: () => 'Los saltos crecen de uno en uno: +2, +3, +4, +5, y luego +6.',
        squares: (start) => `Son los cuadrados contando desde ${start}.`,
      },
      solve: 'La columna se completa sola.',
    },
    story: {
      prompt: ({ spot, body }) => `<p>Escrito con tiza junto a ${spot}:</p>${body}`,
      split: {
        title: 'Los Dos Recipientes',
        body: ({ k, total }) =>
          `<ul><li>El mayor contiene <strong>${k} veces</strong> lo que el menor.</li>`
          + `<li>Juntos contienen <strong>${total}</strong> medidas.</li></ul>`
          + '<p>¿Cuántas medidas hay en el menor?</p>',
        nudge: () => 'Cuéntalo todo en unidades del recipiente menor.',
        nearly: ({ k, total }) => `Eso hace ${k + 1} recipientes pequeños en ${total} medidas.`,
      },
      pond: {
        title: 'La Duplicación',
        body: ({ day }) =>
          `<p><em>“Duplica lo que cubre cada día, y el día ${day} cubrió toda la superficie.”</em></p>`
          + '<p>¿Qué día estaba cubierta exactamente la mitad?</p>',
        nudge: () => 'No avances desde el principio — retrocede desde el final.',
        nearly: () => 'Si se duplica a diario, un día antes estaba exactamente a la mitad.',
      },
      gears: {
        title: 'Las Ruedas Engranadas',
        body: ({ teeth, pinion }) =>
          `<p>La rueda grande lleva <strong>${teeth} dientes</strong>, el piñón <strong>${pinion}</strong>.</p>`
          + '<p>Una vuelta completa de la rueda grande, ¿cuántas vueltas da al piñón?</p>',
        nudge: () => 'Cada diente de la rueda grande empuja un diente de la pequeña.',
        nearly: ({ teeth, pinion }) => `Pasan los ${teeth} dientes; el piñón se los traga de ${pinion} en ${pinion}.`,
      },
      sumdiff: {
        title: 'El Par Desigual',
        body: ({ s, d }) =>
          `<ul><li>Dos cuentas suman <strong>${s}</strong> entre las dos.</li>`
          + `<li>Una supera a la otra en <strong>${d}</strong>.</li></ul>`
          + '<p>¿Cuál es la cuenta menor?</p>',
        nudge: () => 'Quita primero la diferencia del total, y lo que quede se reparte por igual.',
        nearly: ({ s, d }) => `${s} menos ${d} es ${s - d}, repartido a partes iguales entre las dos.`,
      },
      solve: 'Las cifras cuadran.',
    },
    odd: {
      title: 'La Fila Etiquetada',
      prompt: ({ keeper, spot, shown }) =>
        `<p>${cap(keeper)} etiquetó ocho cosas a lo largo de ${spot} con palabras elegidas por su `
        + '<em>forma</em> y no por su significado. Siete siguen la misma regla. Una no.</p>'
        + `<p style="${MONO}">${shown}</p><p>¿Qué palabra rompe la regla?</p>`,
      alpha: {
        nudge: () => 'Ignora lo que significan las palabras. Fíjate en el orden de las letras dentro de cada una.',
        nearly: () => 'Siete van de la A a la Z, de la primera letra a la última, sin retroceder nunca.',
      },
      dbl: {
        nudge: () => 'Ignora lo que significan las palabras. Busca una letra que aparezca dos veces seguidas.',
        nearly: () => 'Siete contienen una letra doblada, una junto a la otra. Una no.',
      },
      solve: 'La etiqueta rara se suelta de su gancho.',
    },
    ledger: {
      title: 'El Libro Manchado',
      lineLabel: (i) => `línea ${i}`,
      smudged: 'manchado',
      totalLabel: 'Total',
      prompt: ({ keeper, table }) =>
        `<p>El libro de ${keeper} cuadra con la cifra del pie de página, `
        + 'pero la humedad se ha llevado una de las entradas:</p>'
        + `${table}<p>¿Cuál era la cifra que falta?</p>`,
      nudge: () => 'Las entradas tienen que sumar el total del pie — así que el hueco es lo que sobra.',
      nearly: (total) => `Suma las cifras que todavía se leen y réstalas de ${total}.`,
      solve: 'La columna cuadra.',
    },
    path: {
      title: 'La Carta',
      bearings: { NORTH: 'NORTE', SOUTH: 'SUR', EAST: 'ESTE', WEST: 'OESTE' },
      prompt: ({ keeper, spot, bearings, table }) =>
        `<p>Hay una carta clavada sobre ${spot}. El norte está arriba. Empieza en la casilla `
        + `marcada (★) y sigue los rumbos de ${keeper}, una casilla cada uno:</p>`
        + `<p style="${MONO}">${bearings}</p>${table}<p>¿Dónde acabas?</p>`,
      nudge: () => 'El norte es arriba, el sur abajo, el oeste a la izquierda y el este a la derecha — una casilla por rumbo.',
      nearly: (a, b) => `Desde la estrella, los dos primeros movimientos son ${a.toLowerCase()} y luego ${b.toLowerCase()}.`,
      solve: 'La carta suelta su rincón.',
    },
    riddle: {
      title: 'La Vieja Pregunta',
      prompt: ({ keeper, spot, q }) =>
        `<p>Rayada en ${spot}, la pregunta que ${keeper} hace a todo el mundo:</p><p><em>“${q}”</em></p>`,
      solve: 'La vieja pregunta cede.',
    },
    anagram: {
      title: 'La Etiqueta Revuelta',
      prompt: ({ spot, scrambled }) =>
        `<p>Una etiqueta se ha soltado en ${spot} y sus letras se han desordenado:</p>`
        + `<p style="${MONO}">${scrambled}</p><p>¿Qué decía la etiqueta?</p>`,
      nudge: () => 'Cada letra se usa exactamente una vez — nada añadido, nada de menos.',
      nearly: ({ first, len }) => `Empieza por ${first} y tiene ${len} letras.`,
      solve: 'Las letras se asientan.',
    },
    finale: {
      title: 'La Última Puerta',
      initials: {
        prompt: ({ keeper }) =>
          `<p>La salida tiene seis ranuras vacías y una línea escrita por ${keeper}:</p>`
          + '<p><em>“Seis marcas, seis letras. Toma la primera letra de cada una, en el orden '
          + 'en que las encontraste, y di la palabra.”</em></p>',
        nudge: () => 'Tu lista de “Desbloqueado hasta ahora” tiene las seis marcas en orden. Toma la inicial de cada palabra.',
        nearly: (a, b, c) => `Empieza ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'Las ranuras se llenan, la cerradura cede y la puerta se abre a la luz corriente del día. '
          + `Lo que le haya pasado a ${keeper} puede esperar a que estés fuera.`,
      },
      code: {
        prompt: () =>
          '<p>La salida tiene un dial de seis cifras y una línea rayada al lado:</p>'
          + '<p><em>“Seis marcas, en el orden en que las encontraste. Nada más lo hará girar.”</em></p>',
        nudge: () => 'Tu lista de “Desbloqueado hasta ahora” tiene las seis marcas, en orden.',
        nearly: (a, b, c) => `Empieza ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'Seis cifras, un chasquido, y la puerta se abre de par en par a la luz corriente del día. '
          + `Lo que le haya pasado a ${keeper} puede esperar.`,
      },
    },
  },
  pt: {
    mark: ({ lead, spot, prop, token }) =>
      `${lead} Atrás de ${spot}, ${prop} diz “marca — ${token}”.`,
    cipher: {
      title: 'A Linha Marcada',
      how: {
        caesar: (k) => `cada letra empurrada <strong>${k} casa${k > 1 ? 's' : ''} para a frente</strong> no alfabeto`,
        atbash: () => 'o alfabeto dobrado de ponta a ponta — o A ocupa o lugar do Z',
        a1z26: () => 'cada letra trocada pelo seu lugar no alfabeto',
        reverse: () => 'escrita para ser lida pela ponta errada',
      },
      prompt: ({ keeper, how, shown }) =>
        `<p>${cap(keeper)} guardava uma linha escrita de próprio punho — ${how}:</p>`
        + `<p style="${MONO}">${shown}</p><p>O que ela diz?</p>`,
      nudge: {
        caesar: (k) => `Volte cada letra ${k} casa${k > 1 ? 's' : ''} e leia de novo.`,
        atbash: () => 'Escreva o alfabeto para a frente e depois de trás para frente embaixo. Cada letra troca com a de baixo.',
        a1z26: () => '1 é A, 2 é B, e assim por diante. Conte até cada número.',
        reverse: () => 'Leia da direita para a esquerda, a última letra primeiro.',
      },
      nearly: {
        caesar: (a, b) => `A primeira letra volta para ${a}, a segunda para ${b}.`,
        atbash: (a, b) => `Desdobrada, as duas primeiras letras são ${a} e ${b}.`,
        a1z26: (a, b) => `O primeiro número dá ${a}, o segundo ${b}.`,
        reverse: (a, b) => `Ao contrário, começa com ${a}${b}.`,
      },
      solve: 'A linha se lê sem esforço assim que você a vira.',
    },
    sequence: {
      title: 'A Contagem',
      prompt: ({ keeper, spot, seq }) =>
        `<p>Uma coluna de números desce por ${spot}, com a letra caprichada de ${keeper}:</p>`
        + `<p style="${MONO}">${seq} &nbsp; ?</p><p>O que vem depois?</p>`,
      nudge: {
        arithmetic: () => 'A mesma quantidade é somada todas as vezes.',
        geometric: () => 'Cada entrada é um múltiplo da anterior.',
        gaps: () => 'Olhe os saltos entre os números, não os números.',
        squares: () => 'Cada entrada é um número multiplicado por si mesmo.',
      },
      nearly: {
        arithmetic: (step) => `Cada passo soma ${step}.`,
        geometric: (r) => `Tudo se multiplica por ${r}.`,
        gaps: () => 'Os saltos crescem de um em um: +2, +3, +4, +5, e depois +6.',
        squares: (start) => `São os quadrados contando a partir de ${start}.`,
      },
      solve: 'A coluna se completa sozinha.',
    },
    story: {
      prompt: ({ spot, body }) => `<p>Escrito a giz ao lado de ${spot}:</p>${body}`,
      split: {
        title: 'Os Dois Recipientes',
        body: ({ k, total }) =>
          `<ul><li>O maior contém <strong>${k} vezes</strong> o que o menor contém.</li>`
          + `<li>Juntos contêm <strong>${total}</strong> medidas.</li></ul>`
          + '<p>Quantas medidas há no menor?</p>',
        nudge: () => 'Conte tudo em unidades do recipiente menor.',
        nearly: ({ k, total }) => `Isso dá ${k + 1} recipientes pequenos em ${total} medidas.`,
      },
      pond: {
        title: 'A Duplicação',
        body: ({ day }) =>
          `<p><em>“Dobra o que cobre a cada dia, e no dia ${day} cobriu a superfície inteira.”</em></p>`
          + '<p>Em que dia estava exatamente metade coberta?</p>',
        nudge: () => 'Não avance a partir do começo — volte a partir do fim.',
        nearly: () => 'Se dobra todo dia, um dia antes estava exatamente pela metade.',
      },
      gears: {
        title: 'As Rodas Engrenadas',
        body: ({ teeth, pinion }) =>
          `<p>A roda grande tem <strong>${teeth} dentes</strong>, o pinhão <strong>${pinion}</strong>.</p>`
          + '<p>Uma volta completa da roda grande faz o pinhão girar quantas vezes?</p>',
        nudge: () => 'Cada dente da roda grande empurra um dente da pequena.',
        nearly: ({ teeth, pinion }) => `Passam os ${teeth} dentes; o pinhão os engole de ${pinion} em ${pinion}.`,
      },
      sumdiff: {
        title: 'O Par Desigual',
        body: ({ s, d }) =>
          `<ul><li>Duas contagens somam <strong>${s}</strong> juntas.</li>`
          + `<li>Uma excede a outra em <strong>${d}</strong>.</li></ul>`
          + '<p>Qual é a contagem menor?</p>',
        nudge: () => 'Tire a diferença do total primeiro, e o resto se divide por igual.',
        nearly: ({ s, d }) => `${s} menos ${d} é ${s - d}, dividido igualmente entre as duas.`,
      },
      solve: 'Os números fecham.',
    },
    odd: {
      title: 'A Fileira Etiquetada',
      prompt: ({ keeper, spot, shown }) =>
        `<p>${cap(keeper)} etiquetou oito coisas ao longo de ${spot} com palavras escolhidas pela `
        + '<em>forma</em> e não pelo significado. Sete seguem a mesma regra. Uma não.</p>'
        + `<p style="${MONO}">${shown}</p><p>Que palavra quebra a regra?</p>`,
      alpha: {
        nudge: () => 'Ignore o que as palavras significam. Olhe a ordem das letras dentro de cada uma.',
        nearly: () => 'Sete correm de A a Z, da primeira letra à última, sem nunca voltar atrás.',
      },
      dbl: {
        nudge: () => 'Ignore o que as palavras significam. Procure uma letra que apareça duas vezes seguidas.',
        nearly: () => 'Sete contêm uma letra dobrada, uma ao lado da outra. Uma não.',
      },
      solve: 'A etiqueta estranha se solta do gancho.',
    },
    ledger: {
      title: 'O Livro Borrado',
      lineLabel: (i) => `linha ${i}`,
      smudged: 'borrado',
      totalLabel: 'Total',
      prompt: ({ keeper, table }) =>
        `<p>O livro de ${keeper} fecha com o número do pé da página, `
        + 'mas a umidade levou uma das entradas:</p>'
        + `${table}<p>Qual era o número que falta?</p>`,
      nudge: () => 'As entradas têm de somar o total do pé — então a lacuna é o que sobra.',
      nearly: (total) => `Some os números que ainda dá para ler e tire isso de ${total}.`,
      solve: 'A coluna fecha.',
    },
    path: {
      title: 'A Carta',
      bearings: { NORTH: 'NORTE', SOUTH: 'SUL', EAST: 'LESTE', WEST: 'OESTE' },
      prompt: ({ keeper, spot, bearings, table }) =>
        `<p>Uma carta está presa acima de ${spot}. O norte é para cima. Comece no quadrado `
        + `marcado (★) e siga as marcações de ${keeper}, um quadrado cada:</p>`
        + `<p style="${MONO}">${bearings}</p>${table}<p>Onde você termina?</p>`,
      nudge: () => 'Norte é para cima, sul para baixo, oeste para a esquerda e leste para a direita — um quadrado por marcação.',
      nearly: (a, b) => `A partir da estrela, os dois primeiros movimentos são ${a.toLowerCase()} e depois ${b.toLowerCase()}.`,
      solve: 'A carta entrega o seu canto.',
    },
    riddle: {
      title: 'A Velha Pergunta',
      prompt: ({ keeper, spot, q }) =>
        `<p>Riscada em ${spot}, a pergunta que ${keeper} faz a todo mundo:</p><p><em>“${q}”</em></p>`,
      solve: 'A velha pergunta cede.',
    },
    anagram: {
      title: 'A Etiqueta Embaralhada',
      prompt: ({ spot, scrambled }) =>
        `<p>Uma etiqueta se soltou em ${spot} e as letras dela saíram de ordem:</p>`
        + `<p style="${MONO}">${scrambled}</p><p>O que a etiqueta dizia?</p>`,
      nudge: () => 'Cada letra é usada exatamente uma vez — nada a mais, nada a menos.',
      nearly: ({ first, len }) => `Começa com ${first} e tem ${len} letras.`,
      solve: 'As letras se assentam.',
    },
    finale: {
      title: 'A Última Porta',
      initials: {
        prompt: ({ keeper }) =>
          `<p>A saída tem seis fendas vazias e uma linha escrita por ${keeper}:</p>`
          + '<p><em>“Seis marcas, seis letras. Pegue a primeira letra de cada uma, na ordem '
          + 'em que as encontrou, e diga a palavra.”</em></p>',
        nudge: () => 'Sua lista “Desbloqueado até agora” tem as seis marcas em ordem. Pegue a inicial de cada palavra.',
        nearly: (a, b, c) => `Começa ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'As fendas se enchem, a fechadura cede, e a porta se abre para a luz comum do dia. '
          + `O que quer que tenha acontecido com ${keeper}, pode esperar até você estar lá fora.`,
      },
      code: {
        prompt: () =>
          '<p>A saída tem um disco de seis algarismos e uma linha riscada ao lado:</p>'
          + '<p><em>“Seis marcas, na ordem em que as encontrou. Nada mais faz girar.”</em></p>',
        nudge: () => 'Sua lista “Desbloqueado até agora” tem as seis marcas, em ordem.',
        nearly: (a, b, c) => `Começa ${a}, ${b}, ${c}…`,
        solve: (keeper) =>
          'Seis algarismos, um clique, e a porta se escancara para a luz comum do dia. '
          + `O que quer que tenha acontecido com ${keeper}, pode esperar.`,
      },
    },
  },
};

const SOLO_LANGS = Object.keys(LEX);

module.exports = { LEX, SOLO_LANGS, contract, cap, MONO };
